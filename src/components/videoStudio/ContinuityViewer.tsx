import React from "react";
import { 
  GitCommit, 
  Layers, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Lock, 
  ShieldCheck, 
  Eye
} from "lucide-react";
import { useVideoStudioStore } from "../../store/videoStudioStore";

export default function ContinuityViewer() {
  const { currentProject } = useVideoStudioStore();

  if (!currentProject || currentProject.scenes.length === 0) {
    return (
      <div className="p-8 text-center text-zinc-400 bg-zinc-900/40 rounded-2xl border border-zinc-800/60 backdrop-blur-md">
        No scenes available for continuity analysis. Generate a scene breakdown first.
      </div>
    );
  }

  const scenes = currentProject.scenes;

  return (
    <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-6 space-y-6 shadow-2xl">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-teal-500/20 to-emerald-500/20 rounded-xl border border-teal-500/30 text-teal-400">
            <GitCommit className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Inter-Scene Continuity Engine</h3>
            <p className="text-xs text-zinc-400">Analyzes Scene N-1 keyframes and descriptors to enforce unbroken transition continuity</p>
          </div>
        </div>

        <span className="text-xs px-3 py-1 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/30 font-mono">
          Lock: Active
        </span>
      </div>

      <div className="space-y-4">
        {scenes.map((scene, idx) => {
          const prevScene = idx > 0 ? scenes[idx - 1] : null;

          return (
            <div key={scene.sceneId} className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2 text-xs">
                <span className="font-bold text-white flex items-center gap-2">
                  <span className="text-teal-400">Scene {scene.sceneNumber < 10 ? `0${scene.sceneNumber}` : scene.sceneNumber}:</span>
                  {scene.title}
                </span>

                <span className="text-zinc-400 text-[11px] flex items-center gap-1">
                  <Lock className="w-3 h-3 text-teal-400" />
                  {idx === 0 ? "Opening Scene Anchor" : `Linked to Scene ${prevScene?.sceneNumber}`}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Scene N-1 reference */}
                <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800 space-y-2">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">
                    {idx === 0 ? "Initial World State" : `Preceding Context (Scene 0${idx})`}
                  </span>
                  
                  {prevScene ? (
                    <div className="space-y-1">
                      <p className="text-zinc-300 font-medium">{prevScene.title}</p>
                      <p className="text-zinc-400 text-[11px]">{prevScene.action}</p>
                      {prevScene.videoUrl && (
                        <div className="pt-2">
                          <span className="text-[10px] text-teal-400 font-semibold block mb-1">Keyframe Reference Frame:</span>
                          <video src={prevScene.videoUrl} className="w-full h-24 object-cover rounded-lg border border-zinc-800" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-zinc-500 text-[11px] italic">Establishes project world baseline, weather, and character visual anchors.</p>
                  )}
                </div>

                {/* Continuity prompt generated */}
                <div className="bg-teal-950/20 p-3 rounded-xl border border-teal-500/30 space-y-2">
                  <span className="text-[10px] text-teal-400 uppercase tracking-wider block font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Calculated Continuity Descriptor
                  </span>
                  <p className="text-teal-200 text-[11px]">
                    {scene.continuityPrompt || `Enforces consistent clothing, character identity, environment lighting (${scene.lighting}), camera motion (${scene.camera}), and logical sequence progression.`}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
