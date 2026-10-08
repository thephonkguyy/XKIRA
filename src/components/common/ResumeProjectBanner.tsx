import React, { useState } from "react";
import { Sparkles, ArrowRight, X, RotateCcw, Clock } from "lucide-react";
import { XKIRAProject } from "../../types/project";
import { formatDistanceToNow } from "date-fns";

interface ResumeProjectBannerProps {
  project: XKIRAProject;
  onResume: () => void;
  onStartNew: () => void;
  onDismiss?: () => void;
}

export default function ResumeProjectBanner({
  project,
  onResume,
  onStartNew,
  onDismiss,
}: ResumeProjectBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="p-4 bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-zinc-900/80 border border-indigo-500/30 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-md animate-fadeIn mb-4">
      
      <div className="flex items-start sm:items-center gap-3">
        <div className="p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 flex-shrink-0">
          <RotateCcw className="w-5 h-5 animate-spin-slow" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-mono">
              Auto-Resume Active
            </span>
            <span className="text-[11px] text-zinc-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(project.lastOpenedAt, { addSuffix: true })}
            </span>
          </div>
          <h4 className="text-sm font-bold text-white mt-0.5">
            Continue "{project.name}"?
          </h4>
          <p className="text-xs text-zinc-300/80 line-clamp-1 mt-0.5">
            {project.prompt ? `Prompt: "${project.prompt}"` : `Tool: ${project.tool} • Status: ${project.status}`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
        <button
          onClick={onStartNew}
          className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium border border-zinc-700 transition-all"
        >
          Start New Work
        </button>

        <button
          onClick={onResume}
          className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all"
        >
          <span>Resume Work</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        {onDismiss && (
          <button
            onClick={() => {
              setDismissed(true);
              onDismiss();
            }}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-white/5"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

    </div>
  );
}
