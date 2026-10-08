import React from "react";
import { X, History, RotateCcw, Trash2, Calendar } from "lucide-react";
import { XKIRAProject, ProjectVersion } from "../../types/project";
import { useProjectStore } from "../../store/projectStore";
import { format } from "date-fns";

interface VersionHistoryModalProps {
  isOpen: boolean;
  project: XKIRAProject;
  onClose: () => void;
}

export default function VersionHistoryModal({
  isOpen,
  project,
  onClose,
}: VersionHistoryModalProps) {
  const { restoreProjectVersion, deleteProjectVersion } = useProjectStore();

  if (!isOpen) return null;

  const versions = project.versions || [];

  const handleRestore = (versionId: string) => {
    restoreProjectVersion(project.projectId, versionId);
    onClose();
  };

  const handleDelete = (versionId: string) => {
    deleteProjectVersion(project.projectId, versionId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Version History</h3>
              <p className="text-xs text-zinc-400">Project: {project.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Versions List */}
        <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pr-1 py-1">
          {versions.length > 0 ? (
            versions.map((ver, idx) => (
              <div
                key={ver.versionId}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all"
              >
                <div className="flex items-start gap-3">
                  {ver.thumbnail || ver.resultUrl ? (
                    <img
                      src={ver.thumbnail || ver.resultUrl}
                      alt={`v${versions.length - idx}`}
                      className="w-16 h-16 object-cover rounded-lg bg-zinc-900 border border-zinc-800 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 font-mono text-xs flex-shrink-0">
                      v{versions.length - idx}
                    </div>
                  )}

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] font-bold">
                        Version #{versions.length - idx}
                      </span>
                      <span className="text-[10px] text-zinc-500 flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3" />
                        {format(ver.createdAt, "MMM d, h:mm a")}
                      </span>
                    </div>

                    {ver.prompt && (
                      <p className="text-xs text-zinc-300 line-clamp-2 italic">
                        "{ver.prompt}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                  <button
                    onClick={() => handleRestore(ver.versionId)}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-purple-600/20"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore Version</span>
                  </button>

                  <button
                    onClick={() => handleDelete(ver.versionId)}
                    className="p-1.5 text-zinc-500 hover:text-red-400 rounded-xl hover:bg-zinc-800"
                    title="Delete Version"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-zinc-500 space-y-2">
              <History className="w-8 h-8 opacity-40 mx-auto" />
              <p className="text-xs">No saved versions yet. Generations will automatically create versions here.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
