import {
  StreamingSTTProvider,
  StreamingTTSProvider,
  STTTranscriptEvent,
} from "../types";

export class ServerVoiceSTTProvider implements StreamingSTTProvider {
  public readonly id = "server-stt";
  public readonly name = "XKIRA Server STT";

  private isConnected = false;
  private transcriptCallback: ((event: STTTranscriptEvent) => void) | null = null;
  private errorCallback: ((error: Error) => void) | null = null;

  public isSupported(): boolean {
    return true;
  }

  public async connect(): Promise<void> {
    this.isConnected = true;
  }

  public async sendAudio(chunk: ArrayBuffer | Float32Array): Promise<void> {
    if (!this.isConnected) return;

    try {
      const res = await fetch("/api/voice/stt", {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: chunk instanceof Float32Array ? chunk.buffer : chunk,
      });

      if (!res.ok) return;

      const data = await res.json();
      if (data.transcript) {
        this.transcriptCallback?.({
          text: data.transcript,
          isFinal: !!data.isFinal,
          confidence: data.confidence ?? 0.95,
          timestamp: Date.now(),
        });
      }
    } catch (e: any) {
      this.errorCallback?.(e);
    }
  }

  public onTranscript(callback: (event: STTTranscriptEvent) => void): void {
    this.transcriptCallback = callback;
  }

  public onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  public async stop(): Promise<void> {
    this.isConnected = false;
  }
}

export class ServerVoiceTTSProvider implements StreamingTTSProvider {
  public readonly id = "server-tts";
  public readonly name = "XKIRA Server TTS";

  private currentAudio: HTMLAudioElement | null = null;

  public isSupported(): boolean {
    return typeof window !== "undefined";
  }

  public async speakChunk(
    text: string,
    options?: { onStart?: () => void; onEnd?: () => void }
  ): Promise<void> {
    if (!text.trim()) {
      options?.onEnd?.();
      return;
    }

    return new Promise<void>(async (resolve) => {
      try {
        const res = await fetch("/api/voice/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });

        if (!res.ok) {
          options?.onEnd?.();
          resolve();
          return;
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        this.currentAudio = audio;

        audio.onplay = () => {
          options?.onStart?.();
        };

        const cleanup = () => {
          URL.revokeObjectURL(url);
          this.currentAudio = null;
          options?.onEnd?.();
          resolve();
        };

        audio.onended = cleanup;
        audio.onerror = cleanup;

        await audio.play();
      } catch {
        options?.onEnd?.();
        resolve();
      }
    });
  }

  public stop(): void {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {}
      this.currentAudio = null;
    }
  }
}
