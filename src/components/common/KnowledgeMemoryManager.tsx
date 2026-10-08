import React, { useState, useEffect } from "react";
import { 
  Brain, 
  BookOpen, 
  Trash2, 
  Plus, 
  Search, 
  Layers, 
  User, 
  Globe, 
  Film, 
  Image as ImageIcon,
  CheckCircle,
  FileText,
  Tag,
  ShieldCheck,
  RefreshCw
} from "lucide-react";
import { aiCore, MemoryItem, CharacterMemory, WorldMemory, GenerationMemoryItem, KnowledgeDocument } from "../../core/ai";
import { useProjectStore } from "../../store/projectStore";

export default function KnowledgeMemoryManager() {
  const [activeTab, setActiveTab] = useState<"knowledge" | "memory" | "add-doc" | "add-memory">("knowledge");
  const [searchQuery, setSearchQuery] = useState("");
  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDocument[]>([]);
  const [characterMemories, setCharacterMemories] = useState<CharacterMemory[]>([]);
  const [worldMemories, setWorldMemories] = useState<WorldMemory[]>([]);
  const [generalMemories, setGeneralMemories] = useState<MemoryItem[]>([]);
  const [generationMemories, setGenerationMemories] = useState<GenerationMemoryItem[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states for adding custom knowledge
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocCategory, setNewDocCategory] = useState("creative");
  const [newDocContent, setNewDocContent] = useState("");
  const [newDocTags, setNewDocTags] = useState("");

  // Form states for adding custom memory
  const [newMemTitle, setNewMemTitle] = useState("");
  const [newMemType, setNewMemType] = useState<"decision" | "instruction" | "project">("decision");
  const [newMemContent, setNewMemContent] = useState("");
  const [newMemTags, setNewMemTags] = useState("");

  const { activeProjectIds } = useProjectStore();
  const currentProjectId = activeProjectIds["video"] || activeProjectIds["image"] || undefined;

  const refreshData = () => {
    setKnowledgeDocs(aiCore.knowledge.getAllDocuments());
    setCharacterMemories(aiCore.memoryManager.getCharacters());
    setWorldMemories(aiCore.memoryManager.getWorlds());
    setGeneralMemories(aiCore.memoryManager.getProjectMemories(currentProjectId || ""));
    setGenerationMemories(aiCore.memoryManager.getGenerations(undefined, 20));
  };

  useEffect(() => {
    refreshData();
  }, [currentProjectId]);

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  const handleAddKnowledge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim() || !newDocContent.trim()) return;

    aiCore.knowledge.addDocument({
      title: newDocTitle.trim(),
      category: newDocCategory,
      content: newDocContent.trim(),
      tags: newDocTags.split(",").map(t => t.trim()).filter(Boolean),
    });

    setNewDocTitle("");
    setNewDocContent("");
    setNewDocTags("");
    setActiveTab("knowledge");
    refreshData();
    showNotification("Custom knowledge document saved successfully.");
  };

  const handleAddMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemTitle.trim() || !newMemContent.trim()) return;

    aiCore.memoryManager.addMemory({
      type: newMemType,
      title: newMemTitle.trim(),
      content: newMemContent.trim(),
      tags: newMemTags.split(",").map(t => t.trim()).filter(Boolean),
      source: "user",
      projectId: currentProjectId,
    });

    setNewMemTitle("");
    setNewMemContent("");
    setNewMemTags("");
    setActiveTab("memory");
    refreshData();
    showNotification("Custom memory entry created.");
  };

  const handleDeleteMemory = (id: string) => {
    aiCore.memoryManager.deleteMemory(id);
    refreshData();
    showNotification("Memory item forgotten.");
  };

  const handleDeleteKnowledge = (id: string) => {
    aiCore.knowledge.deleteDocument(id);
    refreshData();
    showNotification("Custom knowledge document removed.");
  };

  const handleClearAllMemory = () => {
    if (window.confirm("Are you sure you want to clear all conversational, character, and generation memories?")) {
      aiCore.memoryManager.clearAll();
      refreshData();
      showNotification("All memory wiped clean.");
    }
  };

  const filteredKnowledge = knowledgeDocs.filter(d => 
    !searchQuery || 
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Header controls & tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full">
          <button
            onClick={() => setActiveTab("knowledge")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "knowledge"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Knowledge Base ({knowledgeDocs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("memory")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "memory"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>AI Memory</span>
          </button>

          <button
            onClick={() => setActiveTab("add-doc")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
              activeTab === "add-doc"
                ? "bg-white/20 text-white"
                : "bg-white/5 text-zinc-400 hover:text-white"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Knowledge</span>
          </button>

          <button
            onClick={() => setActiveTab("add-memory")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
              activeTab === "add-memory"
                ? "bg-white/20 text-white"
                : "bg-white/5 text-zinc-400 hover:text-white"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Memory</span>
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            onClick={refreshData}
            title="Refresh Knowledge & Memory Cache"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 animate-fadeIn">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 1. Knowledge Base Tab */}
      {activeTab === "knowledge" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Aggregated Agnes knowledge documents and filmmaking guides</span>
            <span className="flex items-center gap-1 text-indigo-400">
              <ShieldCheck className="w-3.5 h-3.5" /> Privacy Encrypted Local Storage
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredKnowledge.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-col justify-between p-4 bg-white/[0.02] border border-white/5 hover:border-white/15 rounded-2xl transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 font-mono text-[10px] uppercase font-bold tracking-wider">
                      {doc.category}
                    </span>
                    {doc.isDefault ? (
                      <span className="text-[10px] text-zinc-500 font-medium">Core Built-in</span>
                    ) : (
                      <button
                        onClick={() => handleDeleteKnowledge(doc.id)}
                        className="text-zinc-500 hover:text-red-400 p-1 transition-colors"
                        title="Delete custom knowledge"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <h4 className="text-sm font-semibold text-white mb-1.5">{doc.title}</h4>
                  <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">
                    {doc.content}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap mt-3 pt-3 border-t border-white/5">
                  {doc.tags.slice(0, 4).map((tag, idx) => (
                    <span key={idx} className="text-[10px] text-zinc-500 bg-white/5 px-2 py-0.5 rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. AI Memory Tab */}
      {activeTab === "memory" && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">Contextual continuity anchors across projects</span>
            <button
              onClick={handleClearAllMemory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-medium transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All Memories</span>
            </button>
          </div>

          {/* Character Profiles Section */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
              <User className="w-4 h-4 text-purple-400" />
              <span>Character Bible Memories ({characterMemories.length})</span>
            </div>
            {characterMemories.length === 0 ? (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-zinc-500 text-center">
                No character profiles registered yet. Create characters in Video Studio to sync visual continuity.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {characterMemories.map((char) => (
                  <div key={char.id} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-white">{char.name}</span>
                      {char.ageRange && (
                        <span className="text-[10px] text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded">{char.ageRange}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 line-clamp-2">{char.appearance}</p>
                    {char.visualAnchor && (
                      <div className="text-[10px] text-purple-400/90 font-mono bg-purple-500/10 p-1.5 rounded truncate">
                        Anchor: {char.visualAnchor}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* World Locations Section */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>World & Environment Profiles ({worldMemories.length})</span>
            </div>
            {worldMemories.length === 0 ? (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-zinc-500 text-center">
                No world locations logged. Add environments in Video Studio or below to retain environmental memory.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {worldMemories.map((world) => (
                  <div key={world.id} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-2">
                    <span className="font-semibold text-xs text-white">{world.location}</span>
                    <p className="text-[11px] text-zinc-400 line-clamp-2">{world.environment || world.visualStyle || "Custom setting"}</p>
                    {world.lighting && (
                      <span className="text-[10px] text-zinc-400 font-mono">Lighting: {world.lighting}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Generation Log Memories */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Recent Generation Prompts & Job Memory ({generationMemories.length})</span>
            </div>
            {generationMemories.length === 0 ? (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-zinc-500 text-center">
                No generation assets logged yet.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {generationMemories.slice(0, 6).map((gen) => (
                  <div key={gen.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      {gen.type === "video" ? (
                        <Film className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      )}
                      <span className="text-zinc-300 truncate font-mono text-[11px]">{gen.prompt}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono flex-shrink-0">{gen.tool}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Add Custom Knowledge Form */}
      {activeTab === "add-doc" && (
        <form onSubmit={handleAddKnowledge} className="flex flex-col gap-4 p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
          <h3 className="text-sm font-semibold text-white">Add Knowledge Document</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-400">Document Title</label>
              <input
                type="text"
                required
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                placeholder="e.g., Cyberpunk Lighting Rules"
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-400">Category</label>
              <select
                value={newDocCategory}
                onChange={(e) => setNewDocCategory(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="creative">Creative & Cinematography</option>
                <option value="storytelling">Storytelling & Structure</option>
                <option value="prompting">Prompt Engineering</option>
                <option value="system">System & Guidelines</option>
                <option value="custom">Custom Knowledge</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-400">Content / Knowledge Body</label>
            <textarea
              required
              rows={4}
              value={newDocContent}
              onChange={(e) => setNewDocContent(e.target.value)}
              placeholder="Enter detailed domain instructions, guidelines, technical rules or references..."
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 leading-relaxed"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-400">Tags (comma-separated)</label>
            <input
              type="text"
              value={newDocTags}
              onChange={(e) => setNewDocTags(e.target.value)}
              placeholder="e.g., lighting, neon, rain, sci-fi"
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            className="self-end px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors"
          >
            Save to Knowledge Base
          </button>
        </form>
      )}

      {/* 4. Add Custom Memory Form */}
      {activeTab === "add-memory" && (
        <form onSubmit={handleAddMemory} className="flex flex-col gap-4 p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
          <h3 className="text-sm font-semibold text-white">Add Project Memory / Instruction</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-400">Memory Title / Anchor</label>
              <input
                type="text"
                required
                value={newMemTitle}
                onChange={(e) => setNewMemTitle(e.target.value)}
                placeholder="e.g., Protagonist's jacket is always crimson red"
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-400">Memory Type</label>
              <select
                value={newMemType}
                onChange={(e) => setNewMemType(e.target.value as any)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="decision">Creative Decision</option>
                <option value="instruction">Persistent Rule</option>
                <option value="project">Project Note</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-400">Memory Details</label>
            <textarea
              required
              rows={3}
              value={newMemContent}
              onChange={(e) => setNewMemContent(e.target.value)}
              placeholder="Specify the exact context, decision, or continuity constraint..."
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 leading-relaxed"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-400">Tags (comma-separated)</label>
            <input
              type="text"
              value={newMemTags}
              onChange={(e) => setNewMemTags(e.target.value)}
              placeholder="e.g., wardrobe, protagonist, continuity"
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            className="self-end px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors"
          >
            Save Memory Anchor
          </button>
        </form>
      )}
    </div>
  );
}
