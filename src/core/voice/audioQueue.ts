import { AudioQueueItem, StreamingTTSProvider } from "./types";

export interface AudioQueueCallbacks {
  onPlaybackStart?: (item: AudioQueueItem) => void;
  onPlaybackEnd?: (item: AudioQueueItem) => void;
  onSentenceChange?: (sentence: string) => void;
  onQueueEmpty?: () => void;
  onError?: (err: Error) => void;
}

export class AudioQueue {
  private queue: AudioQueueItem[] = [];
  private currentItem: AudioQueueItem | null = null;
  private isPlaying = false;
  private ttsProvider: StreamingTTSProvider | null = null;
  private callbacks: AudioQueueCallbacks = {};
  private activeAbortController: AbortController | null = null;

  constructor(ttsProvider?: StreamingTTSProvider) {
    if (ttsProvider) {
      this.ttsProvider = ttsProvider;
    }
  }

  public setTTSProvider(provider: StreamingTTSProvider) {
    this.ttsProvider = provider;
  }

  public setCallbacks(callbacks: AudioQueueCallbacks) {
    this.callbacks = callbacks;
  }

  public get currentSentence(): string {
    return this.currentItem?.text || "";
  }

  public get currentAudio(): AudioQueueItem | null {
    return this.currentItem;
  }

  public get queuedAudio(): AudioQueueItem[] {
    return [...this.queue];
  }

  public get playbackState(): "idle" | "playing" | "interrupted" {
    if (this.isPlaying) return "playing";
    return "idle";
  }

  /**
   * Enqueues a chunk of text to be spoken sequentially.
   */
  public enqueue(text: string): AudioQueueItem {
    const item: AudioQueueItem = {
      id: `audio_chunk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      text,
      status: "queued",
    };

    this.queue.push(item);
    this.processQueue();
    return item;
  }

  private async processQueue() {
    if (this.isPlaying || this.queue.length === 0 || !this.ttsProvider) {
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    this.isPlaying = true;
    this.currentItem = item;
    item.status = "playing";

    this.activeAbortController = new AbortController();

    this.callbacks.onPlaybackStart?.(item);
    this.callbacks.onSentenceChange?.(item.text);

    try {
      await this.ttsProvider.speakChunk(item.text, {
        onStart: () => {
          item.status = "playing";
        },
        onEnd: () => {
          item.status = "completed";
        },
      });

      this.callbacks.onPlaybackEnd?.(item);
    } catch (err: any) {
      if (err.name !== "AbortError" && !err.message?.includes("interrupted") && !err.message?.includes("canceled")) {
        console.warn("[AudioQueue] Speech playback warning:", err.message);
        this.callbacks.onError?.(err);
      }
    } finally {
      this.activeAbortController = null;
      this.currentItem = null;
      this.isPlaying = false;

      if (this.queue.length > 0) {
        // Immediate playback of next queued sentence chunk
        this.processQueue();
      } else {
        this.callbacks.onSentenceChange?.("");
        this.callbacks.onQueueEmpty?.();
      }
    }
  }

  /**
   * Immediately stops current audio playback, cancels current utterance,
   * clears all queued chunks, and marks state as interrupted.
   */
  public interrupt() {
    this.isPlaying = false;

    if (this.activeAbortController) {
      try {
        this.activeAbortController.abort();
      } catch {}
      this.activeAbortController = null;
    }

    if (this.ttsProvider) {
      try {
        this.ttsProvider.stop();
      } catch {}
    }

    if (this.currentItem) {
      this.currentItem.status = "interrupted";
      this.currentItem = null;
    }

    // Clear upcoming items
    this.queue.forEach((q) => {
      q.status = "interrupted";
    });
    this.queue = [];

    this.callbacks.onSentenceChange?.("");
  }

  /**
   * Clears the queue and resets state.
   */
  public clear() {
    this.interrupt();
  }

  /**
   * Release resources when session disconnects.
   */
  public release() {
    this.interrupt();
    this.ttsProvider = null;
    this.callbacks = {};
  }
}
