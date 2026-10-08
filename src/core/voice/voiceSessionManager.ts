import {
  VoiceSessionState,
  VoiceSessionConfig,
  STTTranscriptEvent,
  PendingConfirmationAction,
  VoiceProvider,
} from "./types";
import { VoiceActivityDetector } from "./vad";
import { SentenceChunker } from "./sentenceChunker";
import { AudioQueue } from "./audioQueue";
import { createDefaultVoiceProvider } from "./providers/compositeVoiceProvider";
import { aiCore } from "../ai";
import { useChatStore, Message } from "../../store/chatStore";
import { detectToolFromCommand, detectToolFromIntent } from "../../utils/toolExecutor";
import { TOOL_REGISTRY } from "../../registry/toolRegistry";

export interface VoiceSessionStateListener {
  onStateChange?: (state: VoiceSessionState) => void;
  onInterimTranscript?: (text: string) => void;
  onFinalTranscript?: (text: string) => void;
  onCurrentSentence?: (sentence: string) => void;
  onAudioLevel?: (volume: number, frequencies: Uint8Array) => void;
  onPendingConfirmation?: (action: PendingConfirmationAction | null) => void;
  onError?: (error: Error) => void;
}

export class VoiceSessionManager {
  private static instance: VoiceSessionManager | null = null;

  public state: VoiceSessionState = "IDLE";
  private config: VoiceSessionConfig = {};
  private vad: VoiceActivityDetector;
  private audioQueue: AudioQueue;
  private provider: VoiceProvider;
  private chunker: SentenceChunker;

  private mediaStream: MediaStream | null = null;
  private isMuted = false;
  private pendingConfirmation: PendingConfirmationAction | null = null;
  private currentAIAbortController: AbortController | null = null;
  private conversationId: string | null = null;

  // Real-time transcripts
  private interimTranscript = "";
  private accumulatedSpeechText = "";

  private listeners: Set<VoiceSessionStateListener> = new Set();
  private deviceChangeListener: (() => void) | null = null;

  private constructor() {
    this.vad = new VoiceActivityDetector();
    this.provider = createDefaultVoiceProvider();
    this.audioQueue = new AudioQueue(this.provider.tts);

    this.chunker = new SentenceChunker((chunk) => {
      this.handleSentenceChunk(chunk);
    });

    this.setupInternalHandlers();
  }

  public static getInstance(): VoiceSessionManager {
    if (!VoiceSessionManager.instance) {
      VoiceSessionManager.instance = new VoiceSessionManager();
    }
    return VoiceSessionManager.instance;
  }

  public addListener(listener: VoiceSessionStateListener): () => void {
    this.listeners.add(listener);
    // Send immediate initial state
    listener.onStateChange?.(this.state);
    listener.onPendingConfirmation?.(this.pendingConfirmation);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setState(newState: VoiceSessionState) {
    if (this.state === newState) return;
    this.state = newState;
    this.vad.setSpeakerActive(newState === "SPEAKING");
    this.listeners.forEach((l) => l.onStateChange?.(newState));
  }

  private setupInternalHandlers() {
    // 1. VAD Callbacks
    this.vad.setCallbacks({
      onSpeechStart: () => {
        if (this.state === "LISTENING" || this.state === "IDLE") {
          this.setState("LISTENING");
        }
      },
      onSpeechContinuing: (_vol) => {
        if (this.state !== "SPEAKING" && this.state !== "THINKING") {
          // Continuous speech keeps state in LISTENING
          if (this.state !== "LISTENING") {
            this.setState("LISTENING");
          }
        }
      },
      onSpeechEnd: () => {
        // User finished speaking turn
        if (this.state === "LISTENING" && (this.accumulatedSpeechText || this.interimTranscript)) {
          this.finalizeUserSpeech();
        }
      },
      onBargeIn: () => {
        // User spoke while XKIRA is speaking -> Instant interruption!
        if (this.state === "SPEAKING") {
          this.interrupt();
        }
      },
      onAudioData: (volume, frequencies) => {
        this.listeners.forEach((l) => l.onAudioLevel?.(volume, frequencies));
      },
      onError: (err) => {
        this.handleError(err);
      },
    });

    // 2. STT Transcript Callbacks
    this.provider.stt.onTranscript((event: STTTranscriptEvent) => {
      this.handleSTTTranscript(event);
    });

    if (this.provider.stt.onError) {
      this.provider.stt.onError((err) => {
        if (this.state === "LISTENING") {
          console.warn("[VoiceSession] STT Notice:", err.message);
        }
      });
    }

    // 3. AudioQueue Callbacks
    this.audioQueue.setCallbacks({
      onPlaybackStart: () => {
        this.setState("SPEAKING");
      },
      onSentenceChange: (sentence) => {
        this.listeners.forEach((l) => l.onCurrentSentence?.(sentence));
      },
      onQueueEmpty: () => {
        // AI speech output has finished playing completely
        if (this.state === "SPEAKING") {
          this.setState("LISTENING");
        }
      },
      onError: (err) => {
        console.warn("[VoiceSession] TTS error:", err.message);
      },
    });
  }

  /**
   * Connect and start microphone + STT pipeline.
   */
  public async connect(conversationId?: string, config?: VoiceSessionConfig): Promise<void> {
    if (this.state !== "IDLE" && this.state !== "DISCONNECTED" && this.state !== "ERROR") {
      // Already running
      return;
    }

    this.setState("CONNECTING");
    this.config = config || {};
    this.conversationId = conversationId || useChatStore.getState().activeConversationId || null;

    try {
      // 1. Request microphone permission with high quality constraints
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Microphone access is not supported in this browser environment.");
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // 2. Handle hardware disconnect & device changes
      this.mediaStream.getAudioTracks().forEach((track) => {
        track.addEventListener("ended", () => {
          this.handleError(new Error("Microphone was disconnected by system or user."));
        });
      });

      this.deviceChangeListener = () => {
        console.log("[VoiceSession] Audio input devices changed.");
      };
      navigator.mediaDevices.addEventListener("devicechange", this.deviceChangeListener);

      // 3. Start VAD
      await this.vad.start(this.mediaStream);

      // 4. Connect STT
      await this.provider.stt.connect();

      // Ready and listening
      this.setState("LISTENING");
    } catch (err: any) {
      let friendlyMessage = err.message || "Failed to initialize microphone.";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        friendlyMessage = "Microphone access was denied. Please allow microphone permissions in your browser.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        friendlyMessage = "No microphone hardware found on this system.";
      }
      this.handleError(new Error(friendlyMessage));
    }
  }

  /**
   * Disconnect voice session and release all audio resources.
   */
  public async disconnect(): Promise<void> {
    this.interrupt();

    if (this.deviceChangeListener) {
      navigator.mediaDevices?.removeEventListener("devicechange", this.deviceChangeListener);
      this.deviceChangeListener = null;
    }

    try {
      await this.provider.stt.stop();
    } catch {}

    this.vad.stop();
    this.audioQueue.release();

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }

    this.interimTranscript = "";
    this.accumulatedSpeechText = "";
    this.pendingConfirmation = null;
    this.setState("DISCONNECTED");
  }

  /**
   * Handle incoming STT event.
   */
  private handleSTTTranscript(event: STTTranscriptEvent) {
    if (this.isMuted) return;

    // Barge-in check: If text arrives while XKIRA is speaking, trigger immediate barge-in!
    if (this.state === "SPEAKING") {
      this.interrupt();
    }

    if (event.isFinal) {
      this.accumulatedSpeechText = (this.accumulatedSpeechText + " " + event.text).trim();
      this.interimTranscript = "";
      this.listeners.forEach((l) => {
        l.onInterimTranscript?.("");
        l.onFinalTranscript?.(this.accumulatedSpeechText);
      });
    } else {
      this.interimTranscript = event.text;
      this.listeners.forEach((l) => l.onInterimTranscript?.(event.text));
    }
  }

  /**
   * Called when VAD detects speech turn has ended.
   */
  private async finalizeUserSpeech() {
    const finalUtterance = (this.accumulatedSpeechText || this.interimTranscript).trim();
    this.accumulatedSpeechText = "";
    this.interimTranscript = "";
    this.listeners.forEach((l) => {
      l.onInterimTranscript?.("");
    });

    if (!finalUtterance || finalUtterance.length < 2) {
      return;
    }

    this.listeners.forEach((l) => l.onFinalTranscript?.(finalUtterance));

    // 1. Check if user is responding to a pending confirmation
    if (this.pendingConfirmation) {
      await this.handleConfirmationAnswer(finalUtterance);
      return;
    }

    // 2. Process turn
    await this.processUserUtterance(finalUtterance);
  }

  /**
   * Evaluates verbal confirmation for pending actions.
   */
  private async handleConfirmationAnswer(utterance: string) {
    const action = this.pendingConfirmation;
    this.pendingConfirmation = null;
    this.listeners.forEach((l) => l.onPendingConfirmation?.(null));

    const lower = utterance.toLowerCase().trim();
    const isAffirmative =
      /\b(yes|yeah|yep|sure|do it|generate it|go ahead|proceed|confirm|please|make it)\b/i.test(lower) &&
      !/\b(no|don't|cancel|stop)\b/i.test(lower);

    const isNegative = /\b(no|cancel|stop|nevermind|never mind|don't|abort|exit)\b/i.test(lower);

    if (isAffirmative && action) {
      await this.executeConfirmedTool(action);
    } else if (isNegative) {
      await this.speak("Action cancelled.");
    } else {
      // User said something else entirely, process as a new utterance
      await this.processUserUtterance(utterance);
    }
  }

  /**
   * Executes tool that was verbally confirmed by user.
   */
  private async executeConfirmedTool(action: PendingConfirmationAction) {
    this.setState("THINKING");
    await this.speak(`Generating your ${action.tool.name.toLowerCase()} now.`);

    const convId = this.conversationId || useChatStore.getState().activeConversationId;
    if (!convId) return;

    try {
      const result = await aiCore.executeTool({
        toolId: action.tool.id,
        userPrompt: action.query,
        conversationId: convId,
        confirmed: true,
      });

      if (result.status === "COMPLETED" && result.result) {
        // Record in conversation history
        const assistantMsgId = (Date.now() + 1).toString();
        const msg: Message = {
          id: assistantMsgId,
          role: "assistant",
          content: `Generated ${action.tool.name} successfully.`,
          timestamp: Date.now(),
          toolCall: {
            toolId: action.tool.id,
            toolName: action.tool.name,
            status: "COMPLETED",
            result: result.result,
          },
        };
        useChatStore.getState().addMessage(convId, msg);

        await this.speak(`Your ${action.tool.name.toLowerCase()} has been created.`);
      } else {
        throw new Error(result.error || "Tool execution failed.");
      }
    } catch (err: any) {
      const errMsg = err.message || "Failed to execute tool.";
      await this.speak(`I encountered an issue: ${errMsg}`);
    }
  }

  /**
   * Main speech pipeline:
   * Analyzes intent -> checks confirmation -> or streams directly from AICore.chat().
   */
  private async processUserUtterance(utterance: string) {
    const convId = this.conversationId || useChatStore.getState().activeConversationId;
    if (!convId) return;

    // 1. Add user message to persistent conversation history
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: utterance,
      timestamp: Date.now(),
    };
    useChatStore.getState().addMessage(convId, userMessage);

    // 2. Check for explicit or natural language tool commands
    const explicitTool = detectToolFromCommand(utterance);
    const naturalTool = explicitTool ? null : detectToolFromIntent(utterance);
    const detectedTool = explicitTool?.tool || (naturalTool && (naturalTool.id === "image-studio" || naturalTool.id === "video-studio") ? naturalTool : null);
    const query = explicitTool?.query || utterance;

    if (detectedTool) {
      if (detectedTool.category === "Studio" && detectedTool.requiresConfirmation) {
        // Require verbal confirmation
        const toolLabel = detectedTool.name.toLowerCase();
        const confirmationQuestion = `Do you want me to generate that ${toolLabel}?`;
        this.pendingConfirmation = {
          tool: detectedTool,
          query,
          originalPrompt: utterance,
          confirmationQuestion,
        };
        this.listeners.forEach((l) => l.onPendingConfirmation?.(this.pendingConfirmation));

        // Create AWAITING_CONFIRMATION message in chat store
        const assistantMsgId = (Date.now() + 1).toString();
        const assistantMessage: Message = {
          id: assistantMsgId,
          role: "assistant",
          content: confirmationQuestion,
          timestamp: Date.now(),
          toolCall: {
            toolId: detectedTool.id,
            toolName: detectedTool.name,
            status: "AWAITING_CONFIRMATION",
          },
        };
        useChatStore.getState().addMessage(convId, assistantMessage);

        await this.speak(confirmationQuestion);
        return;
      }
    }

    // 3. Normal turn: Low-latency streaming response via AICore
    this.setState("THINKING");
    this.chunker.reset();

    const currentConv = useChatStore.getState().conversations.find((c) => c.id === convId);
    const history = (currentConv?.messages || [])
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));

    const assistantMsgId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    };
    useChatStore.getState().addMessage(convId, assistantMessage);

    this.currentAIAbortController = new AbortController();
    let accumulatedAiResponse = "";

    try {
      await aiCore.chat({
        messages: history,
        model: this.config.model || "agnes-3.0-flash",
        stream: true,
        signal: this.currentAIAbortController.signal,
        onChunk: (delta) => {
          accumulatedAiResponse += delta;
          useChatStore.getState().updateMessageStream(convId, assistantMsgId, delta);
          this.chunker.push(delta);
        },
        onComplete: (fullText) => {
          this.chunker.flush();
        },
        onError: (err) => {
          if (err.name !== "AbortError") {
            console.error("[VoiceSession] AI Core streaming error:", err);
            this.handleError(err);
          }
        },
      });
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("[VoiceSession] AI turn failed:", err);
        await this.speak("I apologize, but I encountered an error processing that request.");
      }
    } finally {
      this.currentAIAbortController = null;
    }
  }

  /**
   * Sentence chunk emitted by SentenceChunker as tokens stream in.
   */
  private handleSentenceChunk(chunk: string) {
    if (!chunk.trim()) return;
    this.audioQueue.enqueue(chunk);
  }

  /**
   * CRITICAL BARGE-IN: Instantly stop speech and audio playback when user speaks.
   */
  public interrupt() {
    if (this.state === "SPEAKING" || this.state === "THINKING") {
      this.setState("INTERRUPTED");
    }

    // 1. Abort AI SSE stream immediately
    if (this.currentAIAbortController) {
      try {
        this.currentAIAbortController.abort();
      } catch {}
      this.currentAIAbortController = null;
    }

    // 2. Clear sentence buffer and audio queue
    this.chunker.reset();
    this.audioQueue.interrupt();

    // 3. Immediately transition to LISTENING
    setTimeout(() => {
      if (this.state === "INTERRUPTED") {
        this.setState("LISTENING");
      }
    }, 120);
  }

  /**
   * Speak a phrase directly (e.g. for confirmation or status alerts).
   */
  public async speak(text: string): Promise<void> {
    this.audioQueue.clear();
    this.chunker.reset();
    this.setState("SPEAKING");
    this.audioQueue.enqueue(text);
  }

  public stopSpeaking() {
    this.audioQueue.clear();
    if (this.state === "SPEAKING") {
      this.setState("LISTENING");
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = !this.isMuted;
      });
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  private handleError(error: Error) {
    console.error("[VoiceSession] Error:", error);
    this.setState("ERROR");
    this.listeners.forEach((l) => l.onError?.(error));
  }
}

export const voiceSessionManager = VoiceSessionManager.getInstance();
