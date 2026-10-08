export type VoiceSessionState = 
  | "IDLE"
  | "CONNECTING"
  | "LISTENING"
  | "THINKING"
  | "SPEAKING"
  | "INTERRUPTED"
  | "ERROR"
  | "DISCONNECTED";

export interface STTTranscriptEvent {
  text: string;
  isFinal: boolean;
  confidence?: number;
  timestamp: number;
}

export interface AudioQueueItem {
  id: string;
  text: string;
  status: "queued" | "synthesizing" | "playing" | "completed" | "interrupted";
  audioUrl?: string;
  audioBuffer?: AudioBuffer;
  abort?: () => void;
}

export interface VoiceSessionConfig {
  model?: string;
  continuous?: boolean;
  voiceName?: string;
  speechRate?: number;
  speechPitch?: number;
  bargeInThreshold?: number;
  silenceDurationMs?: number;
  echoSuppressionMargin?: number;
}

export interface PendingConfirmationAction {
  tool: {
    id: string;
    name: string;
    category?: string;
    chatTrigger?: string;
    description?: string;
  };
  query: string;
  originalPrompt: string;
  confirmationQuestion: string;
}

export interface AudioVisualizationData {
  volume: number; // 0.0 - 1.0
  frequencies: Uint8Array | number[];
  isSpeaking: boolean;
  isListening: boolean;
}

export interface StreamingSTTProvider {
  id: string;
  name: string;
  connect(): Promise<void>;
  sendAudio(chunk: ArrayBuffer | Float32Array): void;
  onTranscript(callback: (event: STTTranscriptEvent) => void): void;
  onError?(callback: (error: Error) => void): void;
  stop(): Promise<void>;
  isSupported(): boolean;
}

export interface StreamingTTSProvider {
  id: string;
  name: string;
  synthesizeStream?(text: string): AsyncIterable<ArrayBuffer> | Promise<ArrayBuffer>;
  speakChunk(
    text: string, 
    options?: { onStart?: () => void; onEnd?: () => void; onBoundary?: (charIndex: number) => void }
  ): Promise<void>;
  stop(): void;
  isSupported(): boolean;
}

export interface VoiceProvider {
  stt: StreamingSTTProvider;
  tts: StreamingTTSProvider;
}
