import React, { useState } from "react";
import { 
  Clapperboard, 
  Sparkles, 
  Play, 
  RefreshCw, 
  Trash2, 
  Copy, 
  Plus, 
  ArrowUp, 
  ArrowDown, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Film, 
  Wand2, 
  RotateCcw,
  Video,
  FileText
} from "lucide-react";
import { useVideoStudioStore } from "../../store/videoStudioStore";
import { useJobStore } from "../../store/jobStore";
import { Scene } from "../../types/videoStudio";

export default function StoryScenePlanner() {
  const { 
    currentProject, 
    generateScenesFromScript, 
    cancelScriptAnalysis,
    loadTheLastCorridorProject,
    queueSceneGeneration,
    queueAllScenesGeneration,
    retryFailedScene,
    regenerateFromScene,
    deleteScene,
    reorderScenes,
    duplicateScene,
    extendScene,
    updateScene,
    stitchMasterVideo
  } = useVideoStudioStore();

  const { jobs } = useJobStore();

  const [scriptInput, setScriptInput] = useState(currentProject?.script || "");
  const [durationVal, setDurationVal] = useState<number>(currentProject?.targetDurationMinutes || 2);
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);

  if (!currentProject) return null;

  // Find active script analysis job for this project
  const analysisJob = Object.values(jobs).find(j => 
    j.type === 'analysis' && 
    j.projectId === currentProject.id && 
    (j.status === 'PROCESSING' || j.status === 'QUEUED' || j.status === 'STARTING')
  );

  const isAnalyzingScript = !!analysisJob;
  
  // Find most recent failed or stale analysis job for this project
  const failedAnalysisJob = Object.values(jobs)
    .filter(j => 
      j.type === 'analysis' && 
      j.projectId === currentProject.id && 
      (j.status === 'FAILED' || j.status === 'STALE' || j.status === 'EXPIRED' || j.status === 'CANCELLED')
    )
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];

  const scriptAnalysisError = failedAnalysisJob?.status === 'CANCELLED' 
    ? 'Analysis cancelled.' 
    : (failedAnalysisJob?.error || null);

  const handleAnalyze = () => {
    if (!scriptInput.trim()) return;
    generateScenesFromScript(scriptInput, durationVal);
  };

  const handleCancel = () => {
    cancelScriptAnalysis();
  };

  const completedCount = currentProject.scenes.filter(s => s.status === "READY").length;
  const totalCount = currentProject.scenes.length;

  return (
    <div className="space-y-6">
      {/* Script & Duration Input Header */}
      <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-4 sm:p-6 space-y-4 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-800/80 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl border border-indigo-500/30 text-indigo-400 flex-shrink-0">
              <Clapperboard className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-white">Story Breakdown & Scene Planner</h3>
              <p className="text-[11px] sm:text-xs text-zinc-400">Agnes AI analyzes your story and plans cinematic multi-scene clip sequences</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <label className="text-xs font-medium text-zinc-300 whitespace-nowrap">Target Duration:</label>
            <select
              value={durationVal}
              onChange={(e) => setDurationVal(parseFloat(e.target.value))}
              className="bg-zinc-800 border border-zinc-700/80 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value={0.5}>30 Seconds (Short)</option>
              <option value={1}>1 Minute</option>
              <option value={2}>2 Minutes (Standard)</option>
              <option value={5}>5 Minutes (Extended)</option>
              <option value={10}>10 Minutes (Mini Short)</option>
              <option value={20}>20 Minutes (Episode)</option>
              <option value={30}>30 Minutes (Feature)</option>
            </select>
          </div>
        </div>

        {/* Script Area */}
        <div className="space-y-2">
          <textarea
            rows={4}
            value={scriptInput}
            onChange={(e) => setScriptInput(e.target.value)}
            placeholder="Enter your story script, treatment, or outline here... (e.g. 'Two brothers fight in a rain-slicked cyber alleyway at midnight. As thunder cracks, Marcus opens a glowing red doorway while Cipher prepares his pulse rifle...')"
            className="w-full bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-3 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/80 transition-all resize-none"
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
            <div className="text-[11px] text-zinc-400 flex items-center gap-2">
              <Film className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
              <span>Agnes-2.5-Flash reasoning engine divides long scripts into ~5-10s scenes</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => loadTheLastCorridorProject()}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-teal-300 border border-teal-500/30 transition-all min-h-[40px]"
                title="Loads the 4-scene test project 'The Last Corridor' with character and world continuity"
              >
                <Clapperboard className="w-3.5 h-3.5 text-teal-400" />
                <span>Load "The Last Corridor" (4 Scenes)</span>
              </button>

              {isAnalyzingScript && (
                <button
                  onClick={handleCancel}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-all min-h-[40px]"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzingScript || !scriptInput.trim()}
                className="flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50 min-h-[40px]"
              >
                {isAnalyzingScript ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Analyzing Script...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Generate Scene Breakdown
                  </>
                )}
              </button>
            </div>
          </div>

          {scriptAnalysisError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{scriptAnalysisError}</span>
            </div>
          )}
        </div>
      </div>

      {/* Scene Production List Header */}
      {totalCount > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 gap-3">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
              <span className="font-semibold text-white text-sm">
                Production Timeline ({totalCount} Scenes)
              </span>
              <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                {completedCount} / {totalCount} Completed
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => queueAllScenesGeneration()}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all min-h-[36px]"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Generate All Pending
              </button>

              <button
                onClick={() => stitchMasterVideo()}
                disabled={completedCount === 0}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 min-h-[36px]"
              >
                <Video className="w-3.5 h-3.5" />
                Stitch Master Video
              </button>
            </div>
          </div>

          {/* Scene Cards List */}
          <div className="space-y-4">
            {currentProject.scenes.map((scene, idx) => (
              <div
                key={scene.sceneId}
                className={`bg-zinc-900/70 border rounded-2xl p-5 space-y-3 transition-all ${
                  scene.status === "READY"
                    ? "border-emerald-500/40 bg-emerald-950/10"
                    : scene.status === "FAILED"
                    ? "border-red-500/40 bg-red-950/10"
                    : scene.status === "GENERATING" || scene.status === "QUEUED"
                    ? "border-indigo-500/60 shadow-lg shadow-indigo-500/10 animate-pulse"
                    : "border-zinc-800/80"
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700/80 flex items-center justify-center font-bold text-xs text-indigo-400">
                      {scene.sceneNumber < 10 ? `0${scene.sceneNumber}` : scene.sceneNumber}
                    </span>
                    <div>
                      <h4 className="text-sm font-semibold text-white">{scene.title}</h4>
                      <p className="text-[11px] text-zinc-400 flex items-center gap-2">
                        <Clock className="w-3 h-3 text-zinc-500" />
                        <span>{scene.durationSeconds}s clip duration</span>
                        <span>•</span>
                        <span>Camera: {scene.camera}</span>
                        <span>•</span>
                        <span>Lighting: {scene.lighting}</span>
                      </p>
                    </div>
                  </div>

                  {/* Status Badge & Control Buttons */}
                  <div className="flex items-center gap-2">
                    {/* Status indicator */}
                    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
                      scene.status === "READY"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                        : scene.status === "FAILED"
                        ? "bg-red-500/20 text-red-300 border-red-500/30"
                        : scene.status === "GENERATING" || scene.status === "QUEUED"
                        ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30 animate-pulse"
                        : "bg-zinc-800 text-zinc-400 border-zinc-700"
                    }`}>
                      {scene.status}
                    </span>

                    {/* Move Up/Down */}
                    <button
                      disabled={idx === 0}
                      onClick={() => reorderScenes(idx, idx - 1)}
                      className="p-1.5 text-zinc-500 hover:text-white disabled:opacity-30"
                      title="Move Scene Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={idx === totalCount - 1}
                      onClick={() => reorderScenes(idx, idx + 1)}
                      className="p-1.5 text-zinc-500 hover:text-white disabled:opacity-30"
                      title="Move Scene Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>

                    {/* Duplicate */}
                    <button
                      onClick={() => duplicateScene(scene.sceneId)}
                      className="p-1.5 text-zinc-500 hover:text-white"
                      title="Duplicate Scene"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {/* Extend +5s */}
                    <button
                      disabled={scene.durationSeconds >= 30}
                      onClick={() => extendScene(scene.sceneId, 5)}
                      className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-300 rounded-lg border border-zinc-700 disabled:opacity-50 disabled:hover:bg-zinc-800"
                      title={scene.durationSeconds >= 30 ? "Maximum clip duration (30s) reached" : "Extend Scene Duration (+5s)"}
                    >
                      {scene.durationSeconds >= 30 ? "Max 30s" : "+5s"}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => deleteScene(scene.sceneId)}
                      className="p-1.5 text-zinc-500 hover:text-red-400"
                      title="Delete Scene"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Scene Content Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="md:col-span-2 space-y-2">
                    <div>
                      <span className="text-[10px] text-zinc-500 block font-medium">Action Description</span>
                      <p className="text-zinc-200">{scene.action}</p>
                    </div>

                    {scene.dialogue && (
                      <div className="p-2.5 bg-indigo-950/20 border border-indigo-500/20 rounded-xl">
                        <span className="text-[10px] text-indigo-400 block font-semibold">Character Dialogue</span>
                        <p className="text-indigo-200 italic">"{scene.dialogue}"</p>
                      </div>
                    )}

                    <div>
                      <span className="text-[10px] text-zinc-500 block font-medium">Visual Prompt for Agnes Video V2.0</span>
                      <p className="text-zinc-400 text-[11px] font-mono bg-zinc-950/60 p-2 rounded-lg border border-zinc-800/80">
                        {scene.visualPrompt}
                      </p>
                    </div>

                    {scene.continuityPrompt && (
                      <div className="text-[11px] text-teal-400/90 bg-teal-950/20 border border-teal-500/20 p-2 rounded-lg">
                        <span className="font-semibold text-[10px] block text-teal-300">Continuity Lock:</span>
                        {scene.continuityPrompt}
                      </div>
                    )}

                    {scene.error && (
                      <div className="text-[11px] text-red-400 bg-red-950/30 p-2 rounded-lg border border-red-500/30">
                        Error: {scene.error}
                      </div>
                    )}
                  </div>

                  {/* Right side: Video Result / Generation Trigger */}
                  <div className="flex flex-col items-center justify-center bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 min-h-[160px] relative">
                    {scene.videoUrl ? (
                      <div className="w-full h-full flex flex-col items-center">
                        <video
                          src={scene.videoUrl}
                          controls
                          className="w-full h-32 object-cover rounded-lg border border-zinc-800 mb-2"
                        />
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> Ready
                        </span>
                      </div>
                    ) : (
                      <div className="text-center p-3 space-y-2">
                        {scene.status === "GENERATING" || scene.status === "QUEUED" ? (
                          <div className="space-y-2">
                            <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin mx-auto" />
                            <p className="text-[11px] text-indigo-300 animate-pulse">
                              {scene.progressMessage || "Processing in Agnes queue..."}
                            </p>
                          </div>
                        ) : (
                          <>
                            <Film className="w-8 h-8 text-zinc-600 mx-auto" />
                            <p className="text-[11px] text-zinc-400">Clip Pending</p>
                            
                            <div className="flex flex-col gap-1.5 w-full pt-1">
                              {scene.status === "FAILED" ? (
                                <button
                                  onClick={() => retryFailedScene(scene.sceneId)}
                                  className="w-full py-1.5 px-3 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-500 text-white shadow-md flex items-center justify-center gap-1"
                                >
                                  <RotateCcw className="w-3 h-3" /> Retry Scene {scene.sceneNumber}
                                </button>
                              ) : (
                                <button
                                  onClick={() => queueSceneGeneration(scene.sceneId)}
                                  className="w-full py-1.5 px-3 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md flex items-center justify-center gap-1"
                                >
                                  <Sparkles className="w-3 h-3" /> Generate Scene
                                </button>
                              )}

                              <button
                                onClick={() => regenerateFromScene(idx)}
                                className="w-full py-1 px-2 text-[10px] text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700"
                                title="Preserves scenes before this index and regenerates onward"
                              >
                                Regenerate From Here
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
