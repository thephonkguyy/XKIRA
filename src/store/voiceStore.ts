import { create } from "zustand";
import {
  VoiceSessionState,
  PendingConfirmationAction,
  voiceSessionManager,
} from "../core/voice";

interface VoiceStoreState {
  isOpen: boolean;
  sessionState: VoiceSessionState;
  interimTranscript: string;
  finalTranscript: string;
  currentSentence: string;
  audioLevel: number;
  frequencyData: number[];
  isMuted: boolean;
  pendingConfirmation: PendingConfirmationAction | null;
  errorMessage: string | null;

  // Actions
  openVoiceSession: (conversationId?: string) => Promise<void>;
  closeVoiceSession: () => Promise<void>;
  toggleMute: () => void;
  interrupt: () => void;
  confirmPendingAction: () => Promise<void>;
  cancelPendingAction: () => Promise<void>;
  clearError: () => void;
}

export const useVoiceStore = create<VoiceStoreState>((set, get) => {
  // Bind voiceSessionManager listener
  voiceSessionManager.addListener({
    onStateChange: (sessionState) => {
      set({ sessionState });
      if (sessionState === "DISCONNECTED") {
        set({ isOpen: false, interimTranscript: "", currentSentence: "" });
      }
    },
    onInterimTranscript: (interimTranscript) => {
      set({ interimTranscript });
    },
    onFinalTranscript: (finalTranscript) => {
      set({ finalTranscript });
    },
    onCurrentSentence: (currentSentence) => {
      set({ currentSentence });
    },
    onAudioLevel: (audioLevel, frequencies) => {
      // Sample 32 frequency bins for lightweight UI rendering
      const step = Math.max(1, Math.floor(frequencies.length / 32));
      const sampled: number[] = [];
      for (let i = 0; i < frequencies.length && sampled.length < 32; i += step) {
        sampled.push(frequencies[i]);
      }
      set({ audioLevel, frequencyData: sampled });
    },
    onPendingConfirmation: (pendingConfirmation) => {
      set({ pendingConfirmation });
    },
    onError: (error) => {
      set({ errorMessage: error.message, sessionState: "ERROR" });
    },
  });

  return {
    isOpen: false,
    sessionState: "IDLE",
    interimTranscript: "",
    finalTranscript: "",
    currentSentence: "",
    audioLevel: 0,
    frequencyData: new Array(32).fill(0),
    isMuted: false,
    pendingConfirmation: null,
    errorMessage: null,

    openVoiceSession: async (conversationId?: string) => {
      set({ isOpen: true, errorMessage: null });
      await voiceSessionManager.connect(conversationId);
    },

    closeVoiceSession: async () => {
      await voiceSessionManager.disconnect();
      set({
        isOpen: false,
        sessionState: "DISCONNECTED",
        interimTranscript: "",
        currentSentence: "",
        pendingConfirmation: null,
      });
    },

    toggleMute: () => {
      const isMuted = voiceSessionManager.toggleMute();
      set({ isMuted });
    },

    interrupt: () => {
      voiceSessionManager.interrupt();
    },

    confirmPendingAction: async () => {
      const pending = get().pendingConfirmation;
      if (pending) {
        await voiceSessionManager.speak("Yes, go ahead.");
      }
    },

    cancelPendingAction: async () => {
      const pending = get().pendingConfirmation;
      if (pending) {
        await voiceSessionManager.speak("Cancel that.");
      }
    },

    clearError: () => {
      set({ errorMessage: null });
    },
  };
});
