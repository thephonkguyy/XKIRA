import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Square,
  X,
  Sparkles,
  Volume2,
  AlertCircle,
  HelpCircle,
  Check,
  ChevronRight,
} from "lucide-react";
import { useVoiceStore } from "../../store/voiceStore";
import { VoiceVisualizer } from "./VoiceVisualizer";

export const LiveVoiceModal: React.FC = () => {
  const {
    isOpen,
    sessionState,
    interimTranscript,
    finalTranscript,
    currentSentence,
    audioLevel,
    frequencyData,
    isMuted,
    pendingConfirmation,
    errorMessage,
    closeVoiceSession,
    toggleMute,
    interrupt,
    confirmPendingAction,
    cancelPendingAction,
    clearError,
  } = useVoiceStore();

  if (!isOpen) return null;

  const getStateBadge = () => {
    switch (sessionState) {
      case "CONNECTING":
        return {
          icon: <Sparkles className="w-4 h-4 animate-spin text-indigo-400" />,
          label: "Connecting...",
          color: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30",
        };
      case "LISTENING":
        return {
          icon: <Mic className="w-4 h-4 text-emerald-400 animate-pulse" />,
          label: isMuted ? "Mic Muted" : "Listening",
          color: isMuted
            ? "bg-zinc-800 text-zinc-400 border-zinc-700"
            : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
        };
      case "THINKING":
        return {
          icon: <Sparkles className="w-4 h-4 animate-pulse text-purple-400" />,
          label: "Thinking...",
          color: "bg-purple-500/10 text-purple-300 border-purple-500/30",
        };
      case "SPEAKING":
        return {
          icon: <Volume2 className="w-4 h-4 text-sky-400 animate-bounce" />,
          label: "Speaking",
          color: "bg-sky-500/10 text-sky-300 border-sky-500/30",
        };
      case "INTERRUPTED":
        return {
          icon: <Square className="w-3.5 h-3.5 text-amber-400 fill-current" />,
          label: "Interrupted",
          color: "bg-amber-500/10 text-amber-300 border-amber-500/30",
        };
      case "ERROR":
        return {
          icon: <AlertCircle className="w-4 h-4 text-red-400" />,
          label: "Error",
          color: "bg-red-500/10 text-red-300 border-red-500/30",
        };
      default:
        return {
          icon: <Mic className="w-4 h-4 text-zinc-400" />,
          label: "Standby",
          color: "bg-zinc-800 text-zinc-400 border-zinc-700",
        };
    }
  };

  const badge = getStateBadge();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-lg bg-zinc-950/90 border border-zinc-800/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-indigo-500/15 via-purple-500/5 to-transparent pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/5 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-inner">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  XKIRA Live Voice
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Live
                  </span>
                </h3>
                <p className="text-xs text-zinc-400">Real-time voice streaming with Agnes AI</p>
              </div>
            </div>

            <button
              onClick={closeVoiceSession}
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              aria-label="Close voice mode"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-4 sm:p-6 flex flex-col gap-4 relative z-10">
            {/* Error banner if present */}
            {errorMessage && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
                <button
                  onClick={clearError}
                  className="text-xs hover:text-white font-bold px-2 py-1"
                >
                  ✕
                </button>
              </div>
            )}

            {/* State Pill & Barge-In Reminder */}
            <div className="flex items-center justify-between">
              <div
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${badge.color}`}
              >
                {badge.icon}
                <span>{badge.label}</span>
              </div>

              <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                <span>Talk over to interrupt</span>
                <ChevronRight className="w-3 h-3 text-zinc-600" />
              </span>
            </div>

            {/* Live Audio Visualizer */}
            <VoiceVisualizer
              state={sessionState}
              audioLevel={audioLevel}
              frequencyData={frequencyData}
              isMuted={isMuted}
            />

            {/* Live Transcript & Spoken Content Box */}
            <div className="min-h-[110px] max-h-48 overflow-y-auto rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-3.5 sm:p-4 flex flex-col justify-center">
              {sessionState === "SPEAKING" && currentSentence ? (
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Speaking</span>
                  </div>
                  <p className="text-sm sm:text-base text-zinc-100 font-medium leading-relaxed">
                    "{currentSentence}"
                  </p>
                </div>
              ) : interimTranscript ? (
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5" />
                    <span>Live Transcript</span>
                  </div>
                  <p className="text-sm sm:text-base text-white font-medium">
                    {interimTranscript}
                    <span className="inline-block w-1.5 h-4 ml-1 bg-emerald-400 animate-pulse align-middle" />
                  </p>
                </div>
              ) : finalTranscript ? (
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    You Said
                  </div>
                  <p className="text-sm sm:text-base text-zinc-200">{finalTranscript}</p>
                </div>
              ) : sessionState === "THINKING" ? (
                <div className="flex items-center gap-3 text-zinc-400 py-3">
                  <Sparkles className="w-4 h-4 text-purple-400 animate-spin" />
                  <span className="text-sm">Synthesizing streaming answer...</span>
                </div>
              ) : (
                <div className="text-center py-3 text-zinc-500 text-xs sm:text-sm">
                  {sessionState === "CONNECTING"
                    ? "Acquiring audio stream..."
                    : isMuted
                    ? "Microphone is muted. Unmute to speak."
                    : "Listening... start speaking to ask anything or invoke creative tools."}
                </div>
              )}
            </div>

            {/* Interactive Confirmation Card (if tool needs confirmation) */}
            {pendingConfirmation && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex flex-col gap-2.5"
              >
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-xl bg-indigo-500/20 text-indigo-300 mt-0.5">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-indigo-300">
                      Confirmation Required
                    </div>
                    <div className="text-sm text-white font-medium mt-0.5">
                      {pendingConfirmation.confirmationQuestion}
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-1">
                      Say <span className="text-emerald-400 font-semibold">"Yes"</span> or{" "}
                      <span className="text-red-400 font-semibold">"Cancel"</span>, or click below:
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/5">
                  <button
                    onClick={cancelPendingAction}
                    className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmPendingAction}
                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all active:scale-95"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm</span>
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="p-4 sm:p-5 bg-black/40 border-t border-white/5 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              {/* Mic Mute Toggle */}
              <button
                onClick={toggleMute}
                className={`p-3 rounded-2xl flex items-center gap-2 text-xs font-semibold transition-all ${
                  isMuted
                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                    : "bg-white/5 text-zinc-300 hover:text-white hover:bg-white/10 border border-white/10"
                }`}
                aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span className="hidden sm:inline">{isMuted ? "Unmute" : "Mute"}</span>
              </button>

              {/* Instant Interrupt Button */}
              {(sessionState === "SPEAKING" || sessionState === "THINKING") && (
                <button
                  onClick={interrupt}
                  className="px-3 py-2.5 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 rounded-2xl flex items-center gap-1.5 text-xs font-semibold transition-all active:scale-95"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Interrupt</span>
                </button>
              )}
            </div>

            {/* End Session */}
            <button
              onClick={closeVoiceSession}
              className="px-4 py-2.5 bg-white/10 hover:bg-red-600 text-zinc-200 hover:text-white rounded-2xl text-xs font-semibold transition-all border border-white/10 hover:border-red-500 shadow-md active:scale-95"
            >
              End Voice Chat
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
