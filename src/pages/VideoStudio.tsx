import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Video, 
  Clapperboard, 
  Film,
  FileCheck,
  Download, 
  Sparkles, 
  RefreshCw,
  AlertCircle,
  SlidersHorizontal,
  Settings2,
  CheckCircle2,
  Layers
} from "lucide-react";

import { useJobStore } from "../store/jobStore";
import { useVideoStudioStore } from "../store/videoStudioStore";
import { useProjectStore } from "../store/projectStore";

import NormalVideoStudio from "../components/videoStudio/NormalVideoStudio";
import StoryCreatorStudio from "../components/videoStudio/StoryCreatorStudio";
import LongFormVideoStudio from "../components/videoStudio/LongFormVideoStudio";
import StudioAuditReport from "../components/videoStudio/StudioAuditReport";
import VideoSettingsPanel from "../components/videoStudio/VideoSettingsPanel";
import ExportModal from "../components/videoStudio/ExportModal";
import ProjectWorkspaceBar from "../components/common/ProjectWorkspaceBar";
import VersionHistoryModal from "../components/common/VersionHistoryModal";

type MainStudioMode = "normal" | "story-creator" | "long-form" | "audit";

export default function VideoStudio() {
  // DEFAULT MODE: Normal Video
  const [studioMode, setStudioMode] = useState<MainStudioMode>("normal");
  const [showExportModal, setShowExportModal] = useState(false);
  const [isVersionsOpen, setIsVersionsOpen] = useState(false);

  const { jobs } = useJobStore();
  const { 
    currentProject, 
    createNewProject, 
    syncWithJobStore 
  } = useVideoStudioStore();

  const { getActiveProject, ensureActiveProject } = useProjectStore();
  const globalProject = getActiveProject("Video Studio", "video");

  // Safely initialize global project in effect
  useEffect(() => {
    ensureActiveProject("Video Studio", "video");
  }, [ensureActiveProject]);

  // Initialize a default production project if none exists
  useEffect(() => {
    if (!currentProject) {
      createNewProject(
        "XKIRA Cyberpunk Saga",
        "long-form",
        2,
        "Two brothers fight in a rain-slicked cyber alleyway at midnight. As thunder cracks, Marcus opens a glowing red doorway while Cipher prepares his pulse rifle..."
      );
    }
  }, [currentProject, createNewProject]);

  // Sync background Agnes job completions with Video Studio scenes
  useEffect(() => {
    const interval = setInterval(() => {
      syncWithJobStore();
    }, 3000);
    return () => clearInterval(interval);
  }, [syncWithJobStore]);

  const MODES = [
    { 
      id: "normal", 
      icon: Video, 
      label: "Normal Video", 
      badge: "Default",
      desc: "Direct prompt-to-video with camera physics & image reference" 
    },
    { 
      id: "story-creator", 
      icon: Clapperboard, 
      label: "Story Creator", 
      badge: "Continuity",
      desc: "Multi-scene scripting, character & world bibles, keyframe locks" 
    },
    { 
      id: "long-form", 
      icon: Film, 
      label: "30+ Min Video", 
      badge: "Master Pipeline",
      desc: "Chunk-based scene assembly with multi-track audio & master stitch" 
    },
    { 
      id: "audit", 
      icon: FileCheck, 
      label: "Audit Report", 
      desc: "Architecture verification & pipeline health" 
    },
  ];

  return (
    <div className="w-full pb-16 space-y-5 sm:space-y-6 max-w-7xl mx-auto min-w-0">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-900 border border-zinc-800/80 rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 sm:px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 border border-indigo-500/30">
                XKIRA Flagship Engine
              </span>
              <span className="px-2.5 sm:px-3 py-1 rounded-full text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
                Agnes Video V2.0
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              AI Video Production Studio
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
              Professional cinematography suite with Direct Video Creation, Story Scene Continuity, and Master Long-Form FFmpeg Assembly.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 text-xs font-bold rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-xl shadow-indigo-600/25 transition-all transform hover:-translate-y-0.5 min-h-[44px]"
            >
              <Download className="w-4 h-4" />
              <span>Master Export Modal</span>
            </button>
          </div>
        </div>
      </div>

      {/* Project Workspace Session Bar */}
      {globalProject && (
        <ProjectWorkspaceBar
          tool="Video Studio"
          type="video"
          currentProject={globalProject}
          onOpenVersionsModal={() => setIsVersionsOpen(true)}
        />
      )}

      {/* Top Level 4-Mode Primary Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {MODES.map((mode) => {
          const Icon = mode.icon;
          const isActive = studioMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => setStudioMode(mode.id as MainStudioMode)}
              className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all relative overflow-hidden group min-h-[96px] ${
                isActive
                  ? "bg-gradient-to-br from-indigo-950/70 via-zinc-900 to-zinc-900 border-indigo-500/80 shadow-xl shadow-indigo-600/15"
                  : "bg-zinc-900/60 border-zinc-800/80 hover:bg-zinc-800/60 hover:border-zinc-700"
              }`}
            >
              {isActive && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
              )}

              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 sm:p-2.5 rounded-xl border ${
                  isActive 
                    ? "bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/20" 
                    : "bg-zinc-800 text-zinc-400 border-zinc-700 group-hover:text-white"
                }`}>
                  <Icon className="w-4 h-4" />
                </div>

                {mode.badge && (
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    isActive
                      ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                      : "bg-zinc-800 text-zinc-400 border-zinc-700"
                  }`}>
                    {mode.badge}
                  </span>
                )}
              </div>

              <div className="text-xs sm:text-sm font-bold text-white tracking-tight">{mode.label}</div>
              <div className="text-[11px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                {mode.desc}
              </div>
            </button>
          );
        })}
      </div>

      {/* Global Settings Panel Collapsible */}
      <VideoSettingsPanel />

      {/* Studio Active View */}
      <AnimatePresence mode="wait">
        <motion.div
          key={studioMode}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {studioMode === "normal" && <NormalVideoStudio />}
          {studioMode === "story-creator" && <StoryCreatorStudio />}
          {studioMode === "long-form" && <LongFormVideoStudio />}
          {studioMode === "audit" && <StudioAuditReport />}
        </motion.div>
      </AnimatePresence>

      {/* Export & Master Stitching Modal */}
      {showExportModal && (
        <ExportModal onClose={() => setShowExportModal(false)} />
      )}

      {/* Version History Modal */}
      {globalProject && (
        <VersionHistoryModal
          isOpen={isVersionsOpen}
          project={globalProject}
          onClose={() => setIsVersionsOpen(false)}
        />
      )}
    </div>
  );
}
