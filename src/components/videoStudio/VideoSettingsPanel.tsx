import React from "react";
import { 
  Video, 
  Settings2, 
  Camera, 
  Sliders, 
  Sparkles, 
  Sun, 
  Aperture, 
  Film, 
  Eye, 
  Layers,
  Gauge
} from "lucide-react";
import { useVideoStudioStore } from "../../store/videoStudioStore";
import { 
  AspectRatio, 
  Resolution, 
  FrameRate, 
  QualityPreset, 
  CameraMovement, 
  MotionSpeed, 
  VisualStyle, 
  LightingStyle, 
  CameraLens, 
  DepthOfField 
} from "../../types/videoStudio";

export default function VideoSettingsPanel() {
  const { currentProject, updateProjectSettings } = useVideoStudioStore();

  if (!currentProject) {
    return (
      <div className="p-8 text-center text-zinc-400 bg-zinc-900/40 rounded-2xl border border-zinc-800/60 backdrop-blur-md">
        Please select or create a project to configure video settings.
      </div>
    );
  }

  const s = currentProject.settings;

  return (
    <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-6 space-y-6 shadow-2xl">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl border border-indigo-500/30 text-indigo-400">
            <Settings2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Cinematic Video Settings</h3>
            <p className="text-xs text-zinc-400">Configure engine rendering parameters and director preferences</p>
          </div>
        </div>
        <span className="text-xs px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-mono">
          Engine: Agnes Video V2.0
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Aspect Ratio */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-indigo-400" />
            Aspect Ratio
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(["16:9", "9:16", "1:1", "4:3", "21:9"] as AspectRatio[]).map((ar) => (
              <button
                key={ar}
                onClick={() => updateProjectSettings({ aspectRatio: ar })}
                className={`px-3 py-2 text-xs rounded-xl font-medium border transition-all ${
                  s.aspectRatio === ar
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/25"
                    : "bg-zinc-800/50 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                {ar}
              </button>
            ))}
          </div>
        </div>

        {/* Resolution */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            Resolution
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(["720p", "1080p", "2K", "4K"] as Resolution[]).map((res) => (
              <button
                key={res}
                onClick={() => updateProjectSettings({ resolution: res })}
                className={`px-2.5 py-2 text-xs rounded-xl font-medium border transition-all ${
                  s.resolution === res
                    ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/25"
                    : "bg-zinc-800/50 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                {res}
              </button>
            ))}
          </div>
        </div>

        {/* Frame Rate */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            Frame Rate (FPS)
          </label>
          <div className="grid grid-cols-4 gap-2">
            {([24, 25, 30, 60] as FrameRate[]).map((fps) => (
              <button
                key={fps}
                onClick={() => updateProjectSettings({ fps })}
                className={`px-2.5 py-2 text-xs rounded-xl font-medium border transition-all ${
                  s.fps === fps
                    ? "bg-cyan-600 border-cyan-500 text-white shadow-lg shadow-cyan-600/25"
                    : "bg-zinc-800/50 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                {fps} FPS
              </button>
            ))}
          </div>
        </div>

        {/* Quality Preset */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Quality Preset
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(["Draft", "Standard", "High", "Ultra"] as QualityPreset[]).map((q) => (
              <button
                key={q}
                onClick={() => updateProjectSettings({ quality: q })}
                className={`px-2.5 py-2 text-xs rounded-xl font-medium border transition-all ${
                  s.quality === q
                    ? "bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-600/25"
                    : "bg-zinc-800/50 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Camera Movement */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-emerald-400" />
            Camera Movement
          </label>
          <select
            value={s.camera}
            onChange={(e) => updateProjectSettings({ camera: e.target.value as CameraMovement })}
            className="w-full bg-zinc-800/70 border border-zinc-700/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            {[
              "Static", "Pan", "Tilt", "Dolly", "Tracking", "Orbit", "Crane", "Handheld", "Drone", "Cinematic"
            ].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Motion Speed */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-rose-400" />
            Motion Speed
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(["Slow", "Normal", "Fast", "Dynamic"] as MotionSpeed[]).map((m) => (
              <button
                key={m}
                onClick={() => updateProjectSettings({ motion: m })}
                className={`px-2 py-2 text-xs rounded-xl font-medium border transition-all ${
                  s.motion === m
                    ? "bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-600/25"
                    : "bg-zinc-800/50 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Visual Style */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-blue-400" />
            Visual Style
          </label>
          <select
            value={s.style}
            onChange={(e) => updateProjectSettings({ style: e.target.value as VisualStyle })}
            className="w-full bg-zinc-800/70 border border-zinc-700/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            {[
              "Photorealistic", "Cinematic", "Anime", "3D Render", "Animation", "Documentary", "Commercial", "Music Video", "Horror", "Sci-Fi", "Fantasy", "Cyberpunk", "Custom"
            ].map(st => <option key={st} value={st}>{st}</option>)}
          </select>
        </div>

        {/* Lighting Style */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
            <Sun className="w-3.5 h-3.5 text-yellow-400" />
            Lighting Atmosphere
          </label>
          <select
            value={s.lighting}
            onChange={(e) => updateProjectSettings({ lighting: e.target.value as LightingStyle })}
            className="w-full bg-zinc-800/70 border border-zinc-700/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            {[
              "Natural", "Golden Hour", "Night", "Neon", "Studio", "Dramatic", "Low Key", "High Key", "Volumetric"
            ].map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        {/* Lens */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
            <Aperture className="w-3.5 h-3.5 text-teal-400" />
            Lens Selection
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {(["24mm", "35mm", "50mm", "85mm", "Anamorphic"] as CameraLens[]).map((lens) => (
              <button
                key={lens}
                onClick={() => updateProjectSettings({ lens })}
                className={`px-1.5 py-2 text-[10px] rounded-xl font-medium border transition-all ${
                  s.lens === lens
                    ? "bg-teal-600 border-teal-500 text-white shadow-lg shadow-teal-600/25"
                    : "bg-zinc-800/50 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                {lens}
              </button>
            ))}
          </div>
        </div>

        {/* Depth of Field */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-orange-400" />
            Depth of Field
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(["None", "Low", "Medium", "Strong"] as DepthOfField[]).map((dof) => (
              <button
                key={dof}
                onClick={() => updateProjectSettings({ depthOfField: dof })}
                className={`px-2 py-2 text-xs rounded-xl font-medium border transition-all ${
                  s.depthOfField === dof
                    ? "bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-600/25"
                    : "bg-zinc-800/50 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                {dof}
              </button>
            ))}
          </div>
        </div>

        {/* Direct Clip Duration */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-300 flex items-center justify-between">
            <span>Direct Clip Length</span>
            <span className="text-[10px] text-zinc-400">Max 2 min direct / Long-form for 30m</span>
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[5, 10, 15, 30].map((sec) => (
              <button
                key={sec}
                onClick={() => updateProjectSettings({ durationSeconds: sec })}
                className={`px-2 py-2 text-xs rounded-xl font-medium border transition-all ${
                  s.durationSeconds === sec
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/25"
                    : "bg-zinc-800/50 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
