import React, { useState } from "react";
import { 
  Globe, 
  MapPin, 
  Plus, 
  Trash2, 
  Sparkles, 
  Sun, 
  Building2, 
  CloudRain, 
  X,
  Palette
} from "lucide-react";
import { useVideoStudioStore } from "../../store/videoStudioStore";
import { WorldProfile } from "../../types/videoStudio";

export default function WorldBiblePanel() {
  const { currentProject, addWorldProfile, removeWorldProfile } = useVideoStudioStore();

  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<Omit<WorldProfile, "id">>({
    location: "Neon Cyber Alleyway",
    architecture: "High-density brutalist towers with neon holographic signage",
    timePeriod: "Near Future (2088)",
    weather: "Heavy nocturnal rain, reflective wet asphalt",
    lighting: "High-contrast cyan & magenta neon accents",
    colorPalette: "Deep obsidian, electric blue, crimson neon",
    environment: "Urban metropolis alley, steam rising from grates",
    importantObjects: "Glow-lit red doorway, vending kiosk",
    visualStyle: "Anamorphic lens flare, photorealistic cinematic render",
    referenceImage: "",
  });

  if (!currentProject) return null;

  const handleSubmitNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.location.trim()) return;
    addWorldProfile(form);
    setIsAdding(false);
    setForm({
      location: "",
      architecture: "Modern",
      timePeriod: "Present",
      weather: "Clear",
      lighting: "Natural",
      colorPalette: "Warm tones",
      environment: "Indoor",
      importantObjects: "None",
      visualStyle: "Cinematic",
      referenceImage: "",
    });
  };

  return (
    <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-6 space-y-6 shadow-2xl">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl border border-cyan-500/30 text-cyan-400">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">World & Location Bible</h3>
            <p className="text-xs text-zinc-400">Lock architecture, weather, lighting, and environments for scene continuity</p>
          </div>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add World Setting
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmitNew} className="p-5 bg-zinc-800/60 border border-cyan-500/40 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-700/60 pb-3">
            <h4 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Add Location Profile
            </h4>
            <button type="button" onClick={() => setIsAdding(false)} className="text-zinc-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-zinc-300 font-medium block mb-1">Location Name *</label>
              <input
                type="text"
                required
                value={form.location}
                onChange={e => setForm({...form, location: e.target.value})}
                placeholder="e.g. Rain-slicked Neon Alley"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-zinc-300 font-medium block mb-1">Architecture / Setting</label>
              <input
                type="text"
                value={form.architecture}
                onChange={e => setForm({...form, architecture: e.target.value})}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-zinc-300 font-medium block mb-1">Time Period & Atmosphere</label>
              <input
                type="text"
                value={form.timePeriod}
                onChange={e => setForm({...form, timePeriod: e.target.value})}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-zinc-300 font-medium block mb-1">Weather & Atmosphere</label>
              <input
                type="text"
                value={form.weather}
                onChange={e => setForm({...form, weather: e.target.value})}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-zinc-300 font-medium block mb-1">Lighting & Reflections</label>
              <input
                type="text"
                value={form.lighting}
                onChange={e => setForm({...form, lighting: e.target.value})}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-zinc-300 font-medium block mb-1">Color Palette</label>
              <input
                type="text"
                value={form.colorPalette}
                onChange={e => setForm({...form, colorPalette: e.target.value})}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white focus:border-cyan-500 focus:outline-none"
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
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-cyan-600 text-white hover:bg-cyan-500"
            >
              Save World Profile
            </button>
          </div>
        </form>
      )}

      {/* World Cards */}
      {currentProject.worldBible.length === 0 ? (
        <div className="text-center py-10 sm:py-12 border-2 border-dashed border-zinc-800 rounded-2xl p-4 sm:p-6">
          <Globe className="w-8 h-8 sm:w-10 sm:h-10 text-zinc-600 mx-auto mb-2 sm:mb-3" />
          <p className="text-xs sm:text-sm font-medium text-zinc-300">No World Profiles Defined</p>
          <p className="text-[11px] sm:text-xs text-zinc-500 max-w-md mx-auto mt-1">
            Store location environments to keep background architecture, weather, and color palettes synchronized.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {currentProject.worldBible.map((world) => (
            <div 
              key={world.id}
              className="bg-zinc-800/40 border border-zinc-700/60 rounded-2xl p-3.5 sm:p-4 space-y-3 relative group hover:border-cyan-500/50 transition-all"
            >
              <div className="flex items-center justify-between border-b border-zinc-700/50 pb-2">
                <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2 truncate">
                  <MapPin className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <span className="truncate">{world.location}</span>
                </h4>
                <button
                  onClick={() => removeWorldProfile(world.id)}
                  className="text-zinc-500 hover:text-red-400 p-1 min-h-[32px] min-w-[32px] flex items-center justify-center flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-300">
                <div className="bg-zinc-900/50 p-2 rounded-xl min-w-0">
                  <span className="text-[10px] text-zinc-500 block">Architecture</span>
                  <span className="line-clamp-2">{world.architecture}</span>
                </div>
                <div className="bg-zinc-900/50 p-2 rounded-xl min-w-0">
                  <span className="text-[10px] text-zinc-500 block">Weather</span>
                  <span className="line-clamp-2">{world.weather}</span>
                </div>
                <div className="bg-zinc-900/50 p-2 rounded-xl min-w-0">
                  <span className="text-[10px] text-zinc-500 block">Lighting</span>
                  <span className="line-clamp-2">{world.lighting}</span>
                </div>
                <div className="bg-zinc-900/50 p-2 rounded-xl min-w-0">
                  <span className="text-[10px] text-zinc-500 block">Palette</span>
                  <span className="line-clamp-2">{world.colorPalette}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
