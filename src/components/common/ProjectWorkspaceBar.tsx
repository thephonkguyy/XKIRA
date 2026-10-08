import React, { useState, useRef } from "react";
import { 
  FolderKanban, 
  Plus, 
  ChevronDown, 
  Check, 
  Edit2, 
  History, 
  Download, 
  Upload, 
  Trash2, 
  Sparkles,
  Layers,
  Clock
} from "lucide-react";
import { useProjectStore } from "../../store/projectStore";
import { XKIRAProject, ProjectType, ProjectVersion } from "../../types/project";
import { format } from "date-fns";

interface ProjectWorkspaceBarProps {
  tool: string;
  type: ProjectType;
  currentProject: XKIRAProject;
  onOpenVersionsModal?: () => void;
  className?: string;
}

export default function ProjectWorkspaceBar({
  tool,
  type,
  currentProject,
  onOpenVersionsModal,
  className = "",
}: ProjectWorkspaceBarProps) {
  const { 
    projects, 
    createProject, 
    setActiveProject, 
    saveProject, 
    deleteProject, 
    exportProjectJson, 
    importProjectJson 
  } = useProjectStore();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(currentProject.name);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setNameInput(currentProject.name);
  }, [currentProject.projectId, currentProject.name]);

  // Filter all projects for this tool or type
  const toolProjects = Object.values(projects)
    .filter(p => p.tool === tool || p.type === type)
    .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);

  const handleCreateNewWork = () => {
    const newProj = createProject(type, tool);
    setIsDropdownOpen(false);
  };

  const handleSelectWork = (projectId: string) => {
    setActiveProject(tool, projectId);
    setIsDropdownOpen(false);
  };

  const handleSaveName = () => {
    if (nameInput.trim() && nameInput !== currentProject.name) {
      saveProject(currentProject.projectId, { name: nameInput.trim() });
    }
    setIsEditingName(false);
  };

  const handleExport = () => {
    const jsonStr = exportProjectJson(currentProject.projectId);
    if (!jsonStr) return;
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentProject.name.replace(/[^a-zA-Z0-9_-]/g, "_")}_project.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        importProjectJson(content);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 p-3 bg-zinc-900/80 backdrop-blur-md border border-zinc-800/80 rounded-2xl shadow-lg ${className}`}>
      
      {/* Left: Project Selector & Name Editor */}
      <div className="flex items-center gap-2 relative">
        <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
          <FolderKanban className="w-4 h-4" />
        </div>

        {/* Project Selector Dropdown Button */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/60 text-xs font-semibold text-white transition-all"
          >
            <span className="max-w-[140px] sm:max-w-[200px] truncate">{currentProject.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute left-0 top-full mt-2 w-72 bg-zinc-900 border border-zinc-800 rounded-2xl p-2 shadow-2xl z-50 space-y-1">
              <div className="flex items-center justify-between px-2 py-1.5 border-b border-zinc-800/80 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                <span>Recent Works ({toolProjects.length})</span>
                <button
                  onClick={handleCreateNewWork}
                  className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>New Work</span>
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1 no-scrollbar pt-1">
                {toolProjects.map(p => (
                  <div
                    key={p.projectId}
                    onClick={() => handleSelectWork(p.projectId)}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-all ${
                      p.projectId === currentProject.projectId
                        ? "bg-indigo-600/20 border border-indigo-500/40 text-white font-semibold"
                        : "hover:bg-zinc-800/60 text-zinc-300"
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="truncate">{p.name}</span>
                      <span className="text-[10px] text-zinc-500">
                        {format(p.lastOpenedAt, "MMM d, h:mm a")}
                      </span>
                    </div>

                    {p.projectId === currentProject.projectId && (
                      <Check className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rename Action */}
        {isEditingName ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
              className="bg-zinc-950 border border-indigo-500 rounded-lg px-2 py-1 text-xs text-white outline-none w-36"
              autoFocus
            />
            <button
              onClick={handleSaveName}
              className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded-lg"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setNameInput(currentProject.name);
              setIsEditingName(true);
            }}
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
            title="Rename Work"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Right: Actions (New Work, Versions, Export/Import, Autosave status) */}
      <div className="flex items-center gap-2">
        {/* Autosave status indicator */}
        <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Auto-Saved
        </span>

        {/* Version History Button */}
        {onOpenVersionsModal && (
          <button
            onClick={onOpenVersionsModal}
            className="px-2.5 py-1.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/60 text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 transition-all"
            title="Version History"
          >
            <History className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Versions ({currentProject.versions?.length || 0})</span>
          </button>
        )}

        {/* Export JSON */}
        <button
          onClick={handleExport}
          className="p-1.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-400 hover:text-white transition-all"
          title="Export Project JSON"
        >
          <Download className="w-3.5 h-3.5" />
        </button>

        {/* Import JSON */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-400 hover:text-white transition-all"
          title="Import Project JSON"
        >
          <Upload className="w-3.5 h-3.5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImportFile}
          className="hidden"
        />

        {/* New Work Button */}
        <button
          onClick={handleCreateNewWork}
          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Work</span>
        </button>
      </div>

    </div>
  );
}
