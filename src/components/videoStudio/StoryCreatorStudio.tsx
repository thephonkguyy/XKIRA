import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  Clapperboard, 
  Users, 
  Globe, 
  GitCommit, 
  SlidersHorizontal, 
  FileText,
  Sparkles,
  Download,
  Video
} from "lucide-react";
import StoryScenePlanner from "./StoryScenePlanner";
import CharacterBiblePanel from "./CharacterBiblePanel";
import WorldBiblePanel from "./WorldBiblePanel";
import ContinuityViewer from "./ContinuityViewer";
import TimelineEditor from "./TimelineEditor";
import ExportModal from "./ExportModal";
import { useVideoStudioStore } from "../../store/videoStudioStore";

export default function StoryCreatorStudio() {
  const [subTab, setSubTab] = useState<"planner" | "characters" | "worlds" | "continuity" | "timeline">("planner");
  const [showExportModal, setShowExportModal] = useState(false);

  const { currentProject } = useVideoStudioStore();
  const completedCount = currentProject?.scenes.filter(s => s.status === "READY").length || 0;
  const totalCount = currentProject?.scenes.length || 0;

  return (
    <div className="space-y-6">
      {/* Story Creator Banner */}
      <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-gradient-to-r from-indigo-500/20 to-teal-500/20 text-teal-300 border border-teal-500/30">
                Story Creator Engine
              </span>
              <span className="px-3 py-1 rounded-full text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
                Continuity Locked
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Multi-Scene Story & Continuity Studio
            </h2>
            <p className="text-xs text-zinc-400 max-w-2xl">
              Script-to-scene planning with persistent Character and World Bibles. Each generated scene extracts validated keyframes to maintain flawless visual continuity in subsequent scenes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Export Story Video</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none bg-zinc-900/40 p-2 rounded-2xl border border-zinc-800/60">
        <button
          onClick={() => setSubTab("planner")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
            subTab === "planner"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
          }`}
        >
          <Clapperboard className="w-4 h-4" />
          <span>Scene Planner ({completedCount}/{totalCount})</span>
        </button>

        <button
          onClick={() => setSubTab("characters")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
            subTab === "characters"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Character Bible ({currentProject?.characterBible.length || 0})</span>
        </button>

        <button
          onClick={() => setSubTab("worlds")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
            subTab === "worlds"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>World Bible ({currentProject?.worldBible.length || 0})</span>
        </button>

        <button
          onClick={() => setSubTab("continuity")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
            subTab === "continuity"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
          }`}
        >
          <GitCommit className="w-4 h-4" />
          <span>Continuity Pipeline</span>
        </button>

        <button
          onClick={() => setSubTab("timeline")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
            subTab === "timeline"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Story Timeline</span>
        </button>
      </div>

      {/* Sub-Tab View */}
      {subTab === "planner" && <StoryScenePlanner />}
      {subTab === "characters" && <CharacterBiblePanel />}
      {subTab === "worlds" && <WorldBiblePanel />}
      {subTab === "continuity" && <ContinuityViewer />}
      {subTab === "timeline" && <TimelineEditor />}

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal onClose={() => setShowExportModal(false)} />
      )}
    </div>
  );
}
