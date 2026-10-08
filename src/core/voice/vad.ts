export interface VADCallbacks {
  onSpeechStart?: () => void;
  onSpeechContinuing?: (volume: number) => void;
  onSpeechEnd?: () => void;
  onBargeIn?: () => void;
  onAudioData?: (volume: number, frequencies: Uint8Array) => void;
  onError?: (error: Error) => void;
}

export interface VADOptions {
  silenceDurationMs?: number; // Time of silence before emitting onSpeechEnd (default 750ms)
  speechOnsetDurationMs?: number; // Time above threshold before emitting onSpeechStart (default 80ms)
  bargeInThresholdMultiplier?: number; // Multiplier over normal threshold during TTS to avoid echo
  minSpeechVolume?: number; // Absolute minimum RMS to count as voice
}

export class VoiceActivityDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private animFrameId: number | null = null;
  private isRunning = false;

  // Adaptive noise floor & thresholds
  private ambientNoiseFloor = 0.008;
  private readonly noiseSmoothing = 0.98;
  private readonly minSpeechVolume: number;
  private readonly silenceDurationMs: number;
  private readonly speechOnsetDurationMs: number;
  private readonly bargeInThresholdMultiplier: number;

  // Speech timing state
  private isSpeaking = false;
  private speechStartTime = 0;
  private lastAboveThresholdTime = 0;
  private isSpeakerActive = false; // Set to true when XKIRA is speaking for echo suppression

  private callbacks: VADCallbacks = {};
  private frequencyData: Uint8Array<ArrayBuffer> | null = null;
  private timeDomainData: Float32Array<ArrayBuffer> | null = null;

  constructor(options: VADOptions = {}) {
    this.silenceDurationMs = options.silenceDurationMs ?? 750;
    this.speechOnsetDurationMs = options.speechOnsetDurationMs ?? 80;
    this.bargeInThresholdMultiplier = options.bargeInThresholdMultiplier ?? 1.45;
    this.minSpeechVolume = options.minSpeechVolume ?? 0.015;
  }

  public setCallbacks(callbacks: VADCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Notify VAD whether XKIRA speaker is currently playing audio (for echo suppression and barge-in detection).
   */
  public setSpeakerActive(active: boolean) {
    this.isSpeakerActive = active;
  }

  /**
   * Starts the VAD using an existing or newly requested MediaStream.
   */
  public async start(stream?: MediaStream): Promise<MediaStream> {
    if (this.isRunning && this.mediaStream) {
      return this.mediaStream;
    }

    try {
      if (stream) {
        this.mediaStream = stream;
      } else {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      }

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();

      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.4;

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.sourceNode.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      this.frequencyData = new Uint8Array(bufferLength);
      this.timeDomainData = new Float32Array(bufferLength);

      this.isRunning = true;
      this.isSpeaking = false;
      this.speechStartTime = 0;
      this.lastAboveThresholdTime = 0;

      this.processLoop();
      return this.mediaStream;
    } catch (err: any) {
      this.stop();
      this.callbacks.onError?.(err);
      throw err;
    }
  }

  private processLoop = () => {
    if (!this.isRunning || !this.analyser) return;

    this.analyser.getByteFrequencyData(this.frequencyData!);
    this.analyser.getFloatTimeDomainData(this.timeDomainData!);

    // 1. Calculate RMS volume
    let sumSquares = 0;
    for (let i = 0; i < this.timeDomainData!.length; i++) {
      const val = this.timeDomainData![i];
      sumSquares += val * val;
    }
    const rms = Math.sqrt(sumSquares / this.timeDomainData!.length);

    // 2. Adaptive noise floor calculation (smooth slowly towards lower values)
    if (rms < this.ambientNoiseFloor * 1.5) {
      this.ambientNoiseFloor = this.ambientNoiseFloor * this.noiseSmoothing + rms * (1 - this.noiseSmoothing);
    }
    // Floor clamp
    this.ambientNoiseFloor = Math.max(0.003, Math.min(0.05, this.ambientNoiseFloor));

    // 3. Compute dynamic threshold
    let threshold = Math.max(this.minSpeechVolume, this.ambientNoiseFloor * 2.8);
    if (this.isSpeakerActive) {
      // Scale threshold up to reject acoustic echo from device speaker
      threshold *= this.bargeInThresholdMultiplier;
    }

    const now = performance.now();
    const isAboveThreshold = rms >= threshold;

    // Normalize volume for UI visualization (0.0 to 1.0)
    const normalizedVolume = Math.min(1, Math.max(0, rms * 15));
    this.callbacks.onAudioData?.(normalizedVolume, this.frequencyData!);

    if (isAboveThreshold) {
      this.lastAboveThresholdTime = now;

      if (!this.isSpeaking) {
        if (this.speechStartTime === 0) {
          this.speechStartTime = now;
        } else if (now - this.speechStartTime >= this.speechOnsetDurationMs) {
          this.isSpeaking = true;

          // Check if this counts as a barge-in (user speaking while XKIRA is speaking)
          if (this.isSpeakerActive) {
            this.callbacks.onBargeIn?.();
          } else {
            this.callbacks.onSpeechStart?.();
          }
        }
      } else {
        // Continuing speech
        this.callbacks.onSpeechContinuing?.(normalizedVolume);
        if (this.isSpeakerActive) {
          // Continuous speech during output triggers barge-in
          this.callbacks.onBargeIn?.();
        }
      }
    } else {
      // Below threshold
      this.speechStartTime = 0;

      if (this.isSpeaking) {
        // Check if silence exceeded duration
        if (now - this.lastAboveThresholdTime >= this.silenceDurationMs) {
          this.isSpeaking = false;
          this.callbacks.onSpeechEnd?.();
        } else {
          // Silence within allowable pause duration
          this.callbacks.onSpeechContinuing?.(normalizedVolume);
        }
      }
    }

    this.animFrameId = requestAnimationFrame(this.processLoop);
  };

  /**
   * Release all media streams, audio context, and animation loops.
   */
  public stop() {
    this.isRunning = false;

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }

    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch {}
      this.analyser = null;
    }

    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((track) => track.stop());
      } catch {}
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== "closed") {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }

    this.isSpeaking = false;
    this.isSpeakerActive = false;
    this.speechStartTime = 0;
    this.lastAboveThresholdTime = 0;
  }
}
