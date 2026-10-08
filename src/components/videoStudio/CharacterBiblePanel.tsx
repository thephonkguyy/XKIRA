import React, { useState } from "react";
import { 
  Users, 
  UserPlus, 
  Sparkles, 
  Trash2, 
  Edit3, 
  Image, 
  Check, 
  X, 
  RefreshCw,
  Mic,
  UserCheck
} from "lucide-react";
import { useVideoStudioStore } from "../../store/videoStudioStore";
import { CharacterProfile } from "../../types/videoStudio";

export default function CharacterBiblePanel() {
  const { 
    currentProject, 
    addCharacter, 
    updateCharacter, 
    removeCharacter, 
    generateCharacterAvatar 
  } = useVideoStudioStore();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<Omit<CharacterProfile, "id">>({
    name: "",
    appearance: "Tall athletic build, sharp features",
    ageRange: "25-30",
    hair: "Dark wavy hair",
    eyes: "Deep hazel",
    skinTone: "Warm olive",
    clothing: "Dark futuristic leather jacket with silver trim",
    accessories: "Cybernetic earpiece, pendant necklace",
    personality: "Confident, strategic, protective",
    voice: "Deep resonant tone, calm pace",
    referenceImage: "",
  });

  if (!currentProject) return null;

  const handleSubmitNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    addCharacter(form);
    setIsAdding(false);
    setForm({
      name: "",
      appearance: "Athletic build",
      ageRange: "20s",
      hair: "Black hair",
      eyes: "Brown",
      skinTone: "Medium",
      clothing: "Casual jacket",
      accessories: "Watch",
      personality: "Determined",
      voice: "Clear and expressive",
      referenceImage: "",
    });
  };

  return (
    <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-6 space-y-6 shadow-2xl">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl border border-emerald-500/30 text-emerald-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Character Bible & Visual Consistency</h3>
            <p className="text-xs text-zinc-400">Maintain identical faces, hair, attire, and voices across all scenes</p>
          </div>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Add Character
        </button>
      </div>

      {/* Character Form Modal / Inline */}
      {isAdding && (
        <form onSubmit={handleSubmitNew} className="p-5 bg-zinc-800/60 border border-emerald-500/40 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-700/60 pb-3">
            <h4 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
              <UserCheck className="w-4 h-4" /> Create Character Profile
            </h4>
            <button type="button" onClick={() => setIsAdding(false)} className="text-zinc-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-zinc-300 font-medium block mb-1">Character Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                placeholder="e.g. Marcus Vance"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-zinc-300 font-medium block mb-1">Age Range</label>
              <input
                type="text"
                value={form.ageRange}
                onChange={e => setForm({...form, ageRange: e.target.value})}
                placeholder="e.g. Late 20s"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-zinc-300 font-medium block mb-1">Voice Profile</label>
              <input
                type="text"
                value={form.voice}
                onChange={e => setForm({...form, voice: e.target.value})}
                placeholder="e.g. Deep baritone, steady tone"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="md:col-span-3">
              <label className="text-zinc-300 font-medium block mb-1">Overall Appearance & Build</label>
              <input
                type="text"
                value={form.appearance}
                onChange={e => setForm({...form, appearance: e.target.value})}
                placeholder="e.g. Tall, athletic physique, slight scar on jaw"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-zinc-300 font-medium block mb-1">Hair Details</label>
              <input
                type="text"
                value={form.hair}
                onChange={e => setForm({...form, hair: e.target.value})}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-zinc-300 font-medium block mb-1">Eyes & Skin</label>
              <input
                type="text"
                value={form.eyes}
                onChange={e => setForm({...form, eyes: e.target.value})}
                placeholder="Hazel eyes, warm olive skin"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-zinc-300 font-medium block mb-1">Signature Clothing</label>
              <input
                type="text"
                value={form.clothing}
                onChange={e => setForm({...form, clothing: e.target.value})}
                placeholder="Dark leather jacket, obsidian shirt"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white focus:border-emerald-500 focus:outline-none"
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
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-500"
            >
              Save Character
            </button>
          </div>
        </form>
      )}

      {/* Character Cards List */}
      {currentProject.characterBible.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-zinc-800 rounded-2xl p-6">
          <Users className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-300">No Characters Defined in Bible</p>
          <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1">
            Add character profiles to ensure facial structure, clothing, and voice continuity across long productions.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {currentProject.characterBible.map((char) => (
            <div 
              key={char.id}
              className="bg-zinc-800/40 border border-zinc-700/60 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row gap-3 sm:gap-4 relative group hover:border-emerald-500/50 transition-all"
            >
              {/* Reference Avatar Container */}
              <div className="w-full sm:w-28 h-40 sm:h-36 bg-zinc-900 rounded-xl overflow-hidden border border-zinc-700/80 flex-shrink-0 flex flex-col items-center justify-center relative group/img">
                {char.referenceImage ? (
                  <img 
                    src={char.referenceImage} 
                    alt={char.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-2">
                    <Image className="w-6 h-6 text-zinc-600 mx-auto mb-1" />
                    <span className="text-[10px] text-zinc-500 block">No Concept Art</span>
                  </div>
                )}

                <button
                  onClick={() => generateCharacterAvatar(char.id)}
                  disabled={char.isGeneratingImage}
                  className="absolute bottom-1 right-1 left-1 bg-emerald-600/90 hover:bg-emerald-500 text-white text-[10px] font-semibold py-1 rounded-lg backdrop-blur-md flex items-center justify-center gap-1 shadow-lg"
                >
                  {char.isGeneratingImage ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Generating
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3" />
                      {char.referenceImage ? "Regen Art" : "Agnes AI Art"}
                    </>
                  )}
                </button>
              </div>

              {/* Character Details */}
              <div className="flex-1 space-y-1.5 text-xs min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5 truncate">
                    {char.name}
                    <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                      {char.ageRange}
                    </span>
                  </h4>

                  <button
                    onClick={() => removeCharacter(char.id)}
                    className="text-zinc-500 hover:text-red-400 p-1 min-h-[32px] min-w-[32px] flex items-center justify-center"
                    title="Delete Character"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-zinc-300 text-[11px] line-clamp-2">{char.appearance}</p>

                <div className="space-y-1 text-[11px] text-zinc-400 pt-1">
                  <div className="truncate"><span className="text-zinc-500">Hair/Eyes:</span> {char.hair}, {char.eyes}</div>
                  <div className="truncate"><span className="text-zinc-500">Wearing:</span> {char.clothing}</div>
                  <div className="flex items-center gap-1 text-emerald-400/90 truncate">
                    <Mic className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">Voice: {char.voice}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
