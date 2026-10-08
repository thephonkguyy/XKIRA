import React, { useState } from "react";
import { 
  Volume2, 
  VolumeX, 
  Music, 
  Mic, 
  Radio, 
  Plus, 
  Trash2, 
  Sliders, 
  Activity, 
  RotateCw,
  Sparkles
} from "lucide-react";
import { useVideoStudioStore } from "../../store/videoStudioStore";
import { AudioTrack, AudioTrackType } from "../../types/videoStudio";

export default function AudioStudioPanel() {
  const { currentProject, addAudioTrack, updateAudioTrack, removeAudioTrack } = useVideoStudioStore();

  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<Omit<AudioTrack, "id">>({
    type: "music",
    title: "Cinematic Orchestral Theme",
    url: "https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg",
    volume: 0.5,
    mute: false,
    solo: false,
    fadeInSeconds: 2,
    fadeOutSeconds: 2,
    startTimeSeconds: 0,
    durationSeconds: 120,
    loop: true,
    gain: 1.0,
  });

  if (!currentProject) return null;

  const handleSubmitNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    addAudioTrack(form);
    setIsAdding(false);
  };

  return (
    <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-6 space-y-6 shadow-2xl">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-xl border border-amber-500/30 text-amber-400">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">5-Track Audio Production Studio</h3>
            <p className="text-xs text-zinc-400">Independent timeline mixing for Dialogue, Voiceover, Music, SFX, and Ambience</p>
          </div>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Audio Track
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmitNew} className="p-5 bg-zinc-800/60 border border-amber-500/40 rounded-2xl space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-zinc-300 font-medium block mb-1">Track Title</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={e => setForm({...form, title: e.target.value})}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-zinc-300 font-medium block mb-1">Track Category</label>
              <select
                value={form.type}
                onChange={e => setForm({...form, type: e.target.value as AudioTrackType})}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white focus:border-amber-500 focus:outline-none"
              >
                <option value="dialogue">Dialogue</option>
                <option value="voiceover">Voiceover</option>
                <option value="music">Music</option>
                <option value="sfx">SFX</option>
                <option value="ambience">Ambience</option>
              </select>
            </div>

            <div>
              <label className="text-zinc-300 font-medium block mb-1">Audio File URL</label>
              <input
                type="text"
                value={form.url}
                onChange={e => setForm({...form, url: e.target.value})}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-xs text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-amber-600 text-white hover:bg-amber-500"
            >
              Save Track
            </button>
          </div>
        </form>
      )}

      {/* Audio Tracks List */}
      <div className="space-y-4">
        {currentProject.audioTracks.map((track) => (
          <div 
            key={track.id}
            className="bg-zinc-800/40 border border-zinc-700/60 rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between border-b border-zinc-700/50 pb-2">
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                  track.type === "music" ? "bg-amber-500/20 text-amber-300 border-amber-500/30" :
                  track.type === "dialogue" ? "bg-purple-500/20 text-purple-300 border-purple-500/30" :
                  track.type === "voiceover" ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" :
                  "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                }`}>
                  {track.type}
                </span>
                <h4 className="text-sm font-semibold text-white">{track.title}</h4>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateAudioTrack(track.id, { mute: !track.mute })}
                  className={`p-1.5 rounded-lg border text-xs font-semibold ${
                    track.mute ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-zinc-800 text-zinc-300 border-zinc-700"
                  }`}
                >
                  {track.mute ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>

                <button
                  onClick={() => removeAudioTrack(track.id)}
                  className="p-1.5 text-zinc-500 hover:text-red-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Track Mixing Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                  <span>Track Volume</span>
                  <span>{Math.round(track.volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={track.volume}
                  onChange={(e) => updateAudioTrack(track.id, { volume: parseFloat(e.target.value) })}
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                  <span>Fade In / Fade Out</span>
                  <span>{track.fadeInSeconds}s / {track.fadeOutSeconds}s</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={track.fadeInSeconds}
                    onChange={(e) => updateAudioTrack(track.id, { fadeInSeconds: parseInt(e.target.value) || 0 })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-1 text-center text-white text-xs"
                  />
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={track.fadeOutSeconds}
                    onChange={(e) => updateAudioTrack(track.id, { fadeOutSeconds: parseInt(e.target.value) || 0 })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-1 text-center text-white text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-1.5 text-zinc-300 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={track.loop}
                    onChange={(e) => updateAudioTrack(track.id, { loop: e.target.checked })}
                    className="accent-amber-500 rounded"
                  />
                  <span>Continuous Project Loop</span>
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
