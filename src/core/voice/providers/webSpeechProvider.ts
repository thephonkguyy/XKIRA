import {
  StreamingSTTProvider,
  StreamingTTSProvider,
  STTTranscriptEvent,
} from "../types";

// Types for Web Speech Recognition API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

/**
 * High-performance Web Speech API STT provider.
 * Delivers streaming, zero-latency word-by-word interim transcripts.
 */
export class WebSpeechSTTProvider implements StreamingSTTProvider {
  public readonly id = "web-speech-stt";
  public readonly name = "Web Speech Recognition";

  private recognition: any = null;
  private isConnected = false;
  private shouldKeepListening = false;
  private transcriptCallback: ((event: STTTranscriptEvent) => void) | null = null;
  private errorCallback: ((error: Error) => void) | null = null;
  private restartTimeout: any = null;

  public isSupported(): boolean {
    return typeof window !== "undefined" && (!!window.SpeechRecognition || !!window.webkitSpeechRecognition);
  }

  public async connect(): Promise<void> {
    if (!this.isSupported()) {
      throw new Error("Web Speech Recognition is not supported in this browser.");
    }

    if (this.isConnected && this.recognition) {
      return;
    }

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognitionClass();

    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;
    this.recognition.lang = typeof navigator !== "undefined" ? navigator.language || "en-US" : "en-US";

    this.recognition.onresult = (event: any) => {
      let interimText = "";
      let finalText = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        const transcript = item[0]?.transcript || "";
        if (item.isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }

      const cleanInterim = interimText.trim();
      const cleanFinal = finalText.trim();

      if (cleanFinal) {
        this.transcriptCallback?.({
          text: cleanFinal,
          isFinal: true,
          confidence: event.results[event.results.length - 1]?.[0]?.confidence,
          timestamp: Date.now(),
        });
      } else if (cleanInterim) {
        this.transcriptCallback?.({
          text: cleanInterim,
          isFinal: false,
          timestamp: Date.now(),
        });
      }
    };

    this.recognition.onerror = (event: any) => {
      const errType = event.error;
      // 'no-speech' is normal during silent pauses
      if (errType === "no-speech") return;
      if (errType === "aborted") return;

      console.warn("[WebSpeechSTT] Recognition error:", errType);
      if (errType === "not-allowed") {
        this.errorCallback?.(new Error("Microphone permission denied for speech recognition."));
      } else {
        this.errorCallback?.(new Error(`Speech recognition error: ${errType}`));
      }
    };

    this.recognition.onend = () => {
      if (this.shouldKeepListening && this.isConnected) {
        clearTimeout(this.restartTimeout);
        this.restartTimeout = setTimeout(() => {
          if (this.shouldKeepListening && this.isConnected && this.recognition) {
            try {
              this.recognition.start();
            } catch {}
          }
        }, 150);
      }
    };

    this.shouldKeepListening = true;
    this.isConnected = true;

    try {
      this.recognition.start();
    } catch (e: any) {
      if (!e.message?.includes("already started")) {
        console.warn("[WebSpeechSTT] Start warning:", e);
      }
    }
  }

  public sendAudio(_chunk: ArrayBuffer | Float32Array): void {
    // Web Speech API consumes directly from the OS/Browser microphone stream
  }

  public onTranscript(callback: (event: STTTranscriptEvent) => void): void {
    this.transcriptCallback = callback;
  }

  public onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  public async stop(): Promise<void> {
    this.shouldKeepListening = false;
    this.isConnected = false;
    clearTimeout(this.restartTimeout);

    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {}
      this.recognition = null;
    }
  }
}

/**
 * Ultra low-latency Web Speech Synthesis TTS provider.
 * Synthesizes and speaks sentence chunks instantaneously without network roundtrips.
 */
export class WebSpeechTTSProvider implements StreamingTTSProvider {
  public readonly id = "web-speech-tts";
  public readonly name = "Web Speech Synthesis";

  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private speechRate = 1.05;
  private speechPitch = 1.0;
  private keepAliveInterval: any = null;

  constructor() {
    this.initVoice();
  }

  public isSupported(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  private initVoice() {
    if (!this.isSupported()) return;

    const pickBestVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return;

      // Prefer high quality English voices
      const preferred = voices.find(
        (v) =>
          (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha") || v.name.includes("Jenny")) &&
          v.lang.startsWith("en")
      );

      this.selectedVoice = preferred || voices.find((v) => v.lang.startsWith("en")) || voices[0];
    };

    pickBestVoice();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = pickBestVoice;
    }
  }

  public setVoice(voice: SpeechSynthesisVoice) {
    this.selectedVoice = voice;
  }

  public setRate(rate: number) {
    this.speechRate = Math.max(0.5, Math.min(2.0, rate));
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.isSupported()) return [];
    return window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en"));
  }

  public async speakChunk(
    text: string,
    options?: { onStart?: () => void; onEnd?: () => void; onBoundary?: (charIndex: number) => void }
  ): Promise<void> {
    if (!this.isSupported() || !text.trim()) {
      options?.onEnd?.();
      return;
    }

    return new Promise<void>((resolve) => {
      // Chrome audio unlock & reset
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }
      utterance.rate = this.speechRate;
      utterance.pitch = this.speechPitch;
      utterance.lang = this.selectedVoice?.lang || "en-US";

      this.currentUtterance = utterance;

      let hasFinished = false;
      const finish = () => {
        if (hasFinished) return;
        hasFinished = true;
        clearInterval(this.keepAliveInterval);
        this.currentUtterance = null;
        options?.onEnd?.();
        resolve();
      };

      utterance.onstart = () => {
        options?.onStart?.();
      };

      utterance.onboundary = (e) => {
        options?.onBoundary?.(e.charIndex);
      };

      utterance.onend = finish;
      utterance.onerror = (e) => {
        if (e.error !== "canceled" && e.error !== "interrupted") {
          console.warn("[WebSpeechTTS] Utterance error:", e.error);
        }
        finish();
      };

      // Workaround for Chrome's 15s pause bug: pulse resume()
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = setInterval(() => {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }, 5000);

      window.speechSynthesis.speak(utterance);

      // Safety timeout for chunk (max 25s for an individual phrase)
      setTimeout(() => {
        if (!hasFinished) {
          finish();
        }
      }, 25000);
    });
  }

  public stop(): void {
    if (!this.isSupported()) return;
    clearInterval(this.keepAliveInterval);
    try {
      window.speechSynthesis.cancel();
    } catch {}
    this.currentUtterance = null;
  }
}
