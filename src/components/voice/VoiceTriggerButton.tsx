import React from "react";
import { Mic, Sparkles } from "lucide-react";
import { useVoiceStore } from "../../store/voiceStore";

interface VoiceTriggerButtonProps {
  conversationId?: string;
  variant?: "header" | "composer";
  className?: string;
}

export const VoiceTriggerButton: React.FC<VoiceTriggerButtonProps> = ({
  conversationId,
  variant = "composer",
  className = "",
}) => {
  const { isOpen, openVoiceSession } = useVoiceStore();

  const handleClick = () => {
    openVoiceSession(conversationId);
  };

  if (variant === "header") {
    return (
      <button
        onClick={handleClick}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all min-h-[36px] ${
          isOpen
            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
            : "bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 hover:border-indigo-500/50"
        } ${className}`}
        title="Start Live Voice Chat"
        aria-label="Start Live Voice Chat"
      >
        <div className="relative">
          <Mic className="w-3.5 h-3.5" />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-75" />
        </div>
        <span>Live Voice</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      type="button"
      className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition-all flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center relative group active:scale-95 ${
        isOpen
          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
          : "bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 hover:border-indigo-500/30"
      } ${className}`}
      title="Start Live Voice Chat"
      aria-label="Start Live Voice Chat"
    >
      <div className="relative">
        <Mic className="w-4 h-4 transition-transform group-hover:scale-110" />
        <Sparkles className="w-2.5 h-2.5 text-indigo-400 absolute -top-1.5 -right-2 opacity-80" />
      </div>
    </button>
  );
};
