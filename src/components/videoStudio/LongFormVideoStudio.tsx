import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  Film, 
  Sparkles, 
  Layers, 
  SlidersHorizontal, 
  Volume2, 
  Download, 
  Play, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Clapperboard, 
  Clock,
  ShieldCheck,
  Video
} from "lucide-react";
import StoryScenePlanner from "./StoryScenePlanner";
import TimelineEditor from "./TimelineEditor";
import AudioStudioPanel from "./AudioStudioPanel";
import ExportModal from "./ExportModal";
import { useVideoStudioStore } from "../../store/videoStudioStore";

export default function LongFormVideoStudio() {
  const [activeSubTab, setActiveSubTab] = useState<"planner" | "timeline" | "audio">("planner");
  const [showExportModal, setShowExportModal] = useState(false);

  const { currentProject, stitchMasterVideo } = useVideoStudioStore();

  const completedCount = currentProject?.scenes.filter(s => s.status === "READY").length || 0;
  const totalCount = currentProject?.scenes.length || 0;

  return (
    <div className="space-y-6">
      {/* Informative Banner explaining the Scene-Based Long-Form Pipeline */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-900 border border-zinc-800/80 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-300 border border-purple-500/30">
                30+ Min Long-Form Production Pipeline
              </span>
              <span className="px-3 py-1 rounded-full text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
                Scene-Based Assembly
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Feature-Length & Episodic Video Maker
            </h2>
            <p className="text-xs text-zinc-400 max-w-3xl leading-relaxed">
              <strong className="text-zinc-300">Architecture Notice:</strong> Individual AI video requests operate at Agnes's native clip lengths (5–10s). The 30+ Min Pipeline divides long scripts into structured scenes, locks visual continuity, manages API rate limits with automatic queue pacing, and assembles clips on a multi-track audio timeline with master FFmpeg normalization.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 px-5 py-3 text-xs font-bold rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-xl shadow-purple-600/20 transition-all transform hover:-translate-y-0.5"
            >
              <Download className="w-4 h-4" />
              <span>Export Master Production</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-2 gap-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          <button
            onClick={() => setActiveSubTab("planner")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
              activeSubTab === "planner"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
            }`}
          >
            <Clapperboard className="w-4 h-4 flex-shrink-0" />
            <span>1. Scene Chunk Planner ({completedCount}/{totalCount})</span>
          </button>

          <button
            onClick={() => setActiveSubTab("timeline")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
              activeSubTab === "timeline"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 flex-shrink-0" />
            <span>2. Multi-Scene Timeline</span>
          </button>

          <button
            onClick={() => setActiveSubTab("audio")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
              activeSubTab === "audio"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
            }`}
          >
            <Volume2 className="w-4 h-4 flex-shrink-0" />
            <span>3. Audio Mixing</span>
          </button>
        </div>

        {completedCount > 0 && (
          <button
            onClick={() => stitchMasterVideo()}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30 transition-all self-stretch sm:self-auto min-h-[36px]"
          >
            <Video className="w-3.5 h-3.5" />
            <span>Quick Stitch ({completedCount} Clips)</span>
          </button>
        )}
      </div>

      {/* Active Sub-Tab View */}
      {activeSubTab === "planner" && <StoryScenePlanner />}
      {activeSubTab === "timeline" && <TimelineEditor />}
      {activeSubTab === "audio" && <AudioStudioPanel />}

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal onClose={() => setShowExportModal(false)} />
      )}
    </div>
  );
}
