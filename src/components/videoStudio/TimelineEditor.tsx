import React, { useState, useRef } from "react";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Film, 
  Users, 
  MessageSquare, 
  Mic, 
  Music, 
  Radio, 
  Sliders, 
  ZoomIn, 
  ZoomOut, 
  Scissors, 
  Layers 
} from "lucide-react";
import { useVideoStudioStore } from "../../store/videoStudioStore";

export default function TimelineEditor() {
  const { currentProject, updateScene, updateAudioTrack } = useVideoStudioStore();

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);

  if (!currentProject) return null;

  const scenes = currentProject.scenes;
  const totalDurationSeconds = scenes.reduce((acc, s) => acc + s.durationSeconds, 0) || 30;

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-6 space-y-6 shadow-2xl">
      {/* Timeline Controls Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-4">
          <button
            onClick={handleTogglePlay}
            className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/25 transition-all"
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
          </button>

          <button
            onClick={() => setCurrentTime(0)}
            className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl"
            title="Reset Scrubber"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="text-xs font-mono font-bold text-white bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800">
            00:{currentTime < 10 ? `0${Math.floor(currentTime)}` : Math.floor(currentTime)} / 00:{totalDurationSeconds < 10 ? `0${totalDurationSeconds}` : totalDurationSeconds}
          </div>
        </div>

        {/* Zoom & Track Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-zinc-800/80 p-1 rounded-xl border border-zinc-700">
            <button
              onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
              className="p-1 text-zinc-400 hover:text-white"
              title="Zoom Out Timeline"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[10px] text-zinc-300 px-2 font-mono">{Math.round(zoomLevel * 100)}%</span>
            <button
              onClick={() => setZoomLevel(Math.min(2.5, zoomLevel + 0.25))}
              className="p-1 text-zinc-400 hover:text-white"
              title="Zoom In Timeline"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Multi-Track Timeline Canvas Container */}
      <div className="space-y-3 overflow-x-auto pb-4">
        
        {/* Scrubber / Ruler */}
        <div className="flex items-center h-8 bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 relative">
          <div className="w-32 flex-shrink-0 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
            Timecode
          </div>
          <div className="flex-1 relative flex items-center h-full">
            {Array.from({ length: Math.ceil(totalDurationSeconds / 5) + 1 }).map((_, i) => (
              <div 
                key={i} 
                className="absolute text-[10px] font-mono text-zinc-500 flex flex-col items-center"
                style={{ left: `${(i * 5 / totalDurationSeconds) * 100}%` }}
              >
                <span>00:{i * 5 < 10 ? `0${i * 5}` : i * 5}s</span>
                <div className="w-0.5 h-2 bg-zinc-700 mt-0.5" />
              </div>
            ))}
          </div>
        </div>

        {/* TRACK 1: VIDEO SCENES */}
        <div className="flex items-center bg-zinc-950/60 border border-zinc-800 rounded-2xl p-2 min-h-[64px]">
          <div className="w-32 flex-shrink-0 flex items-center gap-2 text-xs font-semibold text-indigo-400 px-2">
            <Film className="w-4 h-4" />
            <span>VIDEO</span>
          </div>
          <div className="flex-1 flex gap-2 overflow-x-auto py-1">
            {scenes.map((scene) => (
              <div
                key={scene.sceneId}
                className="h-12 bg-indigo-950/40 border border-indigo-500/40 rounded-xl p-2 flex flex-col justify-between flex-shrink-0 relative group hover:border-indigo-400 transition-all cursor-pointer"
                style={{ width: `${Math.max(80, scene.durationSeconds * 20 * zoomLevel)}px` }}
              >
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-indigo-300 truncate">Scene 0{scene.sceneNumber}</span>
                  <span className="text-zinc-400 font-mono">{scene.durationSeconds}s</span>
                </div>
                <span className="text-[9px] text-zinc-400 truncate">{scene.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* TRACK 2: CHARACTERS */}
        <div className="flex items-center bg-zinc-950/60 border border-zinc-800 rounded-2xl p-2 min-h-[52px]">
          <div className="w-32 flex-shrink-0 flex items-center gap-2 text-xs font-semibold text-emerald-400 px-2">
            <Users className="w-4 h-4" />
            <span>CHARACTERS</span>
          </div>
          <div className="flex-1 flex gap-2 overflow-x-auto py-1">
            {currentProject.characterBible.map((char) => (
              <div
                key={char.id}
                className="h-9 bg-emerald-950/30 border border-emerald-500/30 rounded-xl px-3 flex items-center justify-between flex-shrink-0"
                style={{ width: `${140 * zoomLevel}px` }}
              >
                <span className="text-[11px] font-medium text-emerald-300 truncate">{char.name}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">Active</span>
              </div>
            ))}
          </div>
        </div>

        {/* TRACK 3: DIALOGUE */}
        <div className="flex items-center bg-zinc-950/60 border border-zinc-800 rounded-2xl p-2 min-h-[52px]">
          <div className="w-32 flex-shrink-0 flex items-center gap-2 text-xs font-semibold text-purple-400 px-2">
            <MessageSquare className="w-4 h-4" />
            <span>DIALOGUE</span>
          </div>
          <div className="flex-1 flex gap-2 overflow-x-auto py-1">
            {scenes.filter(s => s.dialogue).map((s) => (
              <div
                key={`dial_${s.sceneId}`}
                className="h-9 bg-purple-950/30 border border-purple-500/30 rounded-xl px-3 flex items-center justify-between flex-shrink-0"
                style={{ width: `${Math.max(120, s.durationSeconds * 18 * zoomLevel)}px` }}
              >
                <span className="text-[10px] text-purple-200 truncate italic">"{s.dialogue}"</span>
              </div>
            ))}
          </div>
        </div>

        {/* TRACK 4: MUSIC */}
        <div className="flex items-center bg-zinc-950/60 border border-zinc-800 rounded-2xl p-2 min-h-[52px]">
          <div className="w-32 flex-shrink-0 flex items-center gap-2 text-xs font-semibold text-amber-400 px-2">
            <Music className="w-4 h-4" />
            <span>MUSIC</span>
          </div>
          <div className="flex-1 flex gap-2 overflow-x-auto py-1">
            {currentProject.audioTracks.filter(t => t.type === "music").map((track) => (
              <div
                key={track.id}
                className="h-9 bg-amber-950/30 border border-amber-500/30 rounded-xl px-3 flex items-center justify-between w-full"
              >
                <span className="text-[11px] font-medium text-amber-300">{track.title}</span>
                <span className="text-[9px] text-amber-400/80 font-mono">Continuous Loop</span>
              </div>
            ))}
          </div>
        </div>

        {/* TRACK 5: SFX / AMBIENCE */}
        <div className="flex items-center bg-zinc-950/60 border border-zinc-800 rounded-2xl p-2 min-h-[52px]">
          <div className="w-32 flex-shrink-0 flex items-center gap-2 text-xs font-semibold text-cyan-400 px-2">
            <Radio className="w-4 h-4" />
            <span>AMBIENCE</span>
          </div>
          <div className="flex-1 flex gap-2 overflow-x-auto py-1">
            <div className="h-9 bg-cyan-950/30 border border-cyan-500/30 rounded-xl px-3 flex items-center justify-between w-full">
              <span className="text-[11px] font-medium text-cyan-300">Environmental Atmospheric Audio</span>
              <span className="text-[9px] text-cyan-400/80 font-mono">Spatial Mix</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
