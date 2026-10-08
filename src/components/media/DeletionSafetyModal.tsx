import React from "react";
import { AlertTriangle, Trash2, X, FolderKanban } from "lucide-react";
import { XKIRAProject } from "../../types/project";

interface DeletionSafetyModalProps {
  isOpen: boolean;
  assetTitle: string;
  referencedProjects: XKIRAProject[];
  onConfirmDelete: (mode: 'everywhere' | 'project-only') => void;
  onClose: () => void;
}

export default function DeletionSafetyModal({
  isOpen,
  assetTitle,
  referencedProjects,
  onConfirmDelete,
  onClose,
}: DeletionSafetyModalProps) {
  if (!isOpen) return null;

  const isReferenced = referencedProjects.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5">
        
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl border ${isReferenced ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
              {isReferenced ? <AlertTriangle className="w-6 h-6" /> : <Trash2 className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Delete Asset</h3>
              <p className="text-xs text-zinc-400 truncate max-w-[220px]">"{assetTitle}"</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Content */}
        {isReferenced ? (
          <div className="space-y-3">
            <p className="text-xs text-amber-200/90 leading-relaxed bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
              ⚠️ This asset is currently used in <strong>{referencedProjects.length} project(s)</strong>:
            </p>

            <div className="max-h-32 overflow-y-auto space-y-1.5 no-scrollbar pr-1">
              {referencedProjects.map(p => (
                <div key={p.projectId} className="flex items-center justify-between p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs">
                  <div className="flex items-center gap-2">
                    <FolderKanban className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                    <span className="text-white font-medium truncate max-w-[200px]">{p.name}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">{p.tool}</span>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-zinc-400">How would you like to proceed?</p>
          </div>
        ) : (
          <p className="text-xs text-zinc-300 leading-relaxed">
            Are you sure you want to delete this asset? This action cannot be undone.
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-2">
          {isReferenced ? (
            <>
              <button
                onClick={() => onConfirmDelete('everywhere')}
                className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Everywhere (All Projects)</span>
              </button>
              <button
                onClick={() => onConfirmDelete('project-only')}
                className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-xl border border-zinc-700 transition-all flex items-center justify-center gap-2"
              >
                <span>Remove from This Project Only</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => onConfirmDelete('everywhere')}
              className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Confirm Delete</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-transparent text-zinc-400 hover:text-white text-xs font-medium rounded-xl transition-all"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
}
