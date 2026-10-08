import React, { useState, useMemo } from "react";
import { 
  Download, 
  FileJson, 
  Copy, 
  Check, 
  X, 
  Layers, 
  Film, 
  FolderKanban, 
  ImageIcon, 
  MessageSquare, 
  Sparkles,
  Upload,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { 
  buildMediaManifest, 
  exportManifestJson, 
  importManifestJson,
  ExportManifestOptions, 
  MediaManifest 
} from "../../utils/manifestExportService";

interface ExportManifestModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultFilterType?: "all" | "projects" | "images" | "videos" | "files" | "chats";
  searchQuery?: string;
}

export default function ExportManifestModal({
  isOpen,
  onClose,
  defaultFilterType = "all",
  searchQuery = "",
}: ExportManifestModalProps) {
  const [scope, setScope] = useState<"all" | "filtered" | "projects" | "media" | "chats">("all");
  const [includeContinuity, setIncludeContinuity] = useState(true);
  const [includeChats, setIncludeChats] = useState(true);
  const [prettyPrint, setPrettyPrint] = useState(true);
  const [copied, setCopied] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  // Import State
  const [showImport, setShowImport] = useState(false);
  const [importStatus, setImportStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  // Compute export options based on user selections
  const exportOptions = useMemo<ExportManifestOptions>(() => {
    let filterType: ExportManifestOptions["filterType"] = "all";
    let query = searchQuery;

    if (scope === "filtered") {
      filterType = defaultFilterType;
    } else if (scope === "projects") {
      filterType = "projects";
      query = "";
    } else if (scope === "media") {
      filterType = "images"; // or media jobs
      query = "";
    } else if (scope === "chats") {
      filterType = "chats";
      query = "";
    } else {
      query = "";
    }

    return {
      includeProjects: scope !== "chats" && scope !== "media",
      includeMediaJobs: scope !== "chats" && scope !== "projects",
      includeChats: includeChats && (scope === "all" || scope === "filtered" || scope === "chats"),
      includeContinuity,
      filterType,
      searchQuery: query,
      prettyPrint,
    };
  }, [scope, defaultFilterType, searchQuery, includeContinuity, includeChats, prettyPrint]);

  // Generate live preview manifest object
  const manifestData = useMemo<MediaManifest>(() => {
    return buildMediaManifest(exportOptions);
  }, [exportOptions]);

  const jsonPreviewStr = useMemo(() => {
    try {
      return JSON.stringify(manifestData, null, prettyPrint ? 2 : undefined);
    } catch {
      return "{}";
    }
  }, [manifestData, prettyPrint]);

  if (!isOpen) return null;

  const handleDownload = () => {
    const res = exportManifestJson(exportOptions);
    if (res.ok) {
      setExportSuccess(`Successfully downloaded "${res.filename}"`);
      setTimeout(() => setExportSuccess(null), 4000);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonPreviewStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const res = importManifestJson(content);
        if (res.ok) {
          setImportStatus({
            ok: true,
            msg: `Successfully imported manifest! Restored ${res.importedProjectsCount} projects and ${res.importedMediaCount} media items.`,
          });
        } else {
          setImportStatus({
            ok: false,
            msg: res.error || "Failed to import manifest file.",
          });
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <FileJson className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Export Media Manifest Archive</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono font-semibold border border-indigo-500/30">
                  JSON 1.0
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Archive past AI-generated projects, scenes, prompts, parameters, and media metadata.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success / Status Banner */}
        {exportSuccess && (
          <div className="px-5 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{exportSuccess}</span>
          </div>
        )}

        {importStatus && (
          <div className={`px-5 py-2.5 border-b text-xs flex items-center justify-between ${
            importStatus.ok 
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
              : "bg-red-500/10 border-red-500/20 text-red-300"
          }`}>
            <div className="flex items-center gap-2">
              {importStatus.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
              <span>{importStatus.msg}</span>
            </div>
            <button onClick={() => setImportStatus(null)} className="text-zinc-400 hover:text-white text-xs underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          
          {/* Scope Selector */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-2">
              1. Choose Export Scope
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: "all", label: "Full Creative Archive", icon: Layers, desc: "All projects, media & chats" },
                { id: "filtered", label: "Current View Filter", icon: Sparkles, desc: `Filter: ${defaultFilterType} ${searchQuery ? `("${searchQuery}")` : ""}` },
                { id: "projects", label: "Projects Only", icon: FolderKanban, desc: "Video & Image Studio" },
                { id: "media", label: "Media Items & Jobs", icon: ImageIcon, desc: "Prompts, media & parameters" },
                { id: "chats", label: "AI Conversations", icon: MessageSquare, desc: "Chat transcripts & prompts" },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = scope === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setScope(item.id as any)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1 ${
                      isSelected
                        ? "bg-indigo-600/15 border-indigo-500 text-white shadow-lg shadow-indigo-500/10"
                        : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <Icon className={`w-4 h-4 ${isSelected ? "text-indigo-400" : "text-zinc-500"}`} />
                      {isSelected && <span className="w-2 h-2 rounded-full bg-indigo-400" />}
                    </div>
                    <div>
                      <span className="text-xs font-bold block">{item.label}</span>
                      <span className="text-[10px] text-zinc-500 line-clamp-1">{item.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Configuration Checkboxes */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-2">
              2. Manifest Parameters & Options
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800/80">
              <label className="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeContinuity}
                  onChange={(e) => setIncludeContinuity(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Inter-Scene Continuity Checkpoints</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeChats}
                  onChange={(e) => setIncludeChats(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
                />
                <span>AI Chat Transcripts</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={prettyPrint}
                  onChange={(e) => setPrettyPrint(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Pretty Formatted JSON (2 Spaces)</span>
              </label>
            </div>
          </div>

          {/* Summary Badges & Live JSON Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                3. Live Manifest Preview Summary
              </label>

              {/* Summary Counts */}
              <div className="flex items-center gap-1.5 text-[11px] font-mono">
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-indigo-300 border border-zinc-700">
                  {manifestData.summary.totalProjectsCount} Projects
                </span>
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-emerald-300 border border-zinc-700">
                  {manifestData.summary.totalMediaItemsCount} Media Items
                </span>
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-amber-300 border border-zinc-700">
                  {manifestData.summary.totalJobsCount} Jobs
                </span>
                {includeChats && (
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-purple-300 border border-zinc-700">
                    {manifestData.summary.totalChatsCount} Chats
                  </span>
                )}
              </div>
            </div>

            {/* Code Box */}
            <div className="relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 font-mono text-[11px]">
              <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 text-zinc-400">
                <span>manifest.json ({Math.round(jsonPreviewStr.length / 1024 * 10) / 10} KB)</span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-[11px] text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-2 py-0.5 rounded transition-all"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? "Copied" : "Copy Raw JSON"}</span>
                </button>
              </div>

              <pre className="p-3 text-zinc-300 max-h-48 overflow-y-auto custom-scrollbar leading-relaxed">
                <code>{jsonPreviewStr.slice(0, 2500)}{jsonPreviewStr.length > 2500 ? "\n\n... [Truncated preview for UI - full JSON downloaded on export]" : ""}</code>
              </pre>
            </div>
          </div>

          {/* Import Section Accordion */}
          <div className="pt-2 border-t border-zinc-800/80">
            <button
              onClick={() => setShowImport(!showImport)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Already have an exported JSON manifest file? Import it back here</span>
            </button>

            {showImport && (
              <div className="mt-3 p-4 bg-zinc-950/80 border border-zinc-800 rounded-xl space-y-2">
                <p className="text-xs text-zinc-400">
                  Select an existing <code className="text-indigo-300 font-mono">.json</code> manifest archive from your local disk to restore projects and media records.
                </p>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                />
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-zinc-800 bg-zinc-900/90 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Compliant with XKIRA Open Archive Manifest Specification v1.0</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={handleDownload}
              className="flex-1 sm:flex-none px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Export Manifest JSON</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
