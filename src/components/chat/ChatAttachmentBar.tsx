import React, { useState, useEffect } from "react";
import { X, FileText, Image as ImageIcon, Video as VideoIcon, Music as AudioIcon, FileSpreadsheet } from "lucide-react";
import { useChatStore } from "../../store/chatStore";
import { IndexedDBManager, AttachmentFile } from "../../utils/indexedDb";

export default function ChatAttachmentBar() {
  const { currentComposerAttachmentIds, removeAttachmentFromComposer } = useChatStore();
  const [attachedFiles, setAttachedFiles] = useState<AttachmentFile[]>([]);

  useEffect(() => {
    const fetchFiles = async () => {
      const files: AttachmentFile[] = [];
      for (const id of currentComposerAttachmentIds) {
        try {
          const file = await IndexedDBManager.getFile(id);
          if (file) {
            files.push(file);
          }
        } catch (e) {
          console.error("Failed to load attached file metadata for ID:", id, e);
        }
      }
      setAttachedFiles(files);
    };

    fetchFiles();
  }, [currentComposerAttachmentIds]);

  if (currentComposerAttachmentIds.length === 0) return null;

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />;
    if (type.startsWith("video/")) return <VideoIcon className="w-3.5 h-3.5 text-pink-400" />;
    if (type.startsWith("audio/")) return <AudioIcon className="w-3.5 h-3.5 text-violet-400" />;
    if (type.includes("pdf") || type.includes("word") || type.includes("text") || type.includes("markdown")) {
      return <FileText className="w-3.5 h-3.5 text-indigo-400" />;
    }
    if (type.includes("excel") || type.includes("spreadsheet") || type.includes("csv") || type.includes("sheet")) {
      return <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />;
    }
    return <FileText className="w-3.5 h-3.5 text-zinc-400" />;
  };

  return (
    <div className="flex items-center gap-2 p-2.5 bg-zinc-950/40 border border-white/5 rounded-2xl overflow-x-auto max-w-full no-scrollbar mb-2 animate-fadeIn flex-wrap">
      {attachedFiles.map((file) => (
        <div 
          key={file.id}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-xl max-w-[180px] shrink-0"
        >
          {getFileIcon(file.type)}
          <span className="text-[11px] text-zinc-300 font-medium truncate select-none flex-1">
            {file.name}
          </span>
          <button
            onClick={() => removeAttachmentFromComposer(file.id)}
            className="p-0.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            title="Remove attachment"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
