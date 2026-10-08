import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, FileText, Image as ImageIcon, Video as VideoIcon, 
  Music as AudioIcon, Upload, Trash2, Search, Link2, Unlink, FileSpreadsheet
} from "lucide-react";
import { IndexedDBManager, AttachmentFile } from "../../utils/indexedDb";
import { useChatStore } from "../../store/chatStore";

interface FileManagerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FileManagerDrawer({ isOpen, onClose }: FileManagerDrawerProps) {
  const [files, setFiles] = useState<AttachmentFile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "images" | "docs" | "media">("all");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { 
    currentComposerAttachmentIds, 
    addAttachmentToComposer, 
    removeAttachmentFromComposer 
  } = useChatStore();

  const loadFiles = async () => {
    try {
      const allFiles = await IndexedDBManager.getAllFiles();
      setFiles(allFiles.sort((a, b) => b.timestamp - a.timestamp));
    } catch (e) {
      console.error("Error loading files from IndexedDB:", e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadFiles();
    }
  }, [isOpen]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    const uploadedCount = fileList.length;
    let completedCount = 0;

    for (let i = 0; i < uploadedCount; i++) {
      const f = fileList[i];
      
      // Limit file size to 10MB
      if (f.size > 10 * 1024 * 1024) {
        setUploadError(`File "${f.name}" exceeds 10MB limit.`);
        continue;
      }

      try {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(f);
        });

        const newAttachment: AttachmentFile = {
          id: "file_" + Date.now().toString() + "_" + Math.random().toString(36).substr(2, 5),
          name: f.name,
          type: f.type || "application/octet-stream",
          size: f.size,
          data: base64Data,
          timestamp: Date.now(),
        };

        await IndexedDBManager.saveFile(newAttachment);
        addAttachmentToComposer(newAttachment.id);
        completedCount++;
      } catch (err: any) {
        console.error("Upload error for file", f.name, err);
        setUploadError(`Failed to parse file "${f.name}".`);
      }
    }

    setIsUploading(false);
    loadFiles();
  };

  const handleDeleteFile = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await IndexedDBManager.deleteFile(id);
      removeAttachmentFromComposer(id);
      loadFiles();
    } catch (err) {
      console.error("Failed to delete file", err);
    }
  };

  const toggleAttachment = (id: string) => {
    if (currentComposerAttachmentIds.includes(id)) {
      removeAttachmentFromComposer(id);
    } else {
      addAttachmentToComposer(id);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="w-4 h-4 text-emerald-400" />;
    if (type.startsWith("video/")) return <VideoIcon className="w-4 h-4 text-pink-400" />;
    if (type.startsWith("audio/")) return <AudioIcon className="w-4 h-4 text-violet-400" />;
    if (type.includes("pdf") || type.includes("word") || type.includes("text") || type.includes("markdown")) {
      return <FileText className="w-4 h-4 text-indigo-400" />;
    }
    if (type.includes("excel") || type.includes("spreadsheet") || type.includes("csv") || type.includes("sheet")) {
      return <FileSpreadsheet className="w-4 h-4 text-amber-400" />;
    }
    return <FileText className="w-4 h-4 text-zinc-400" />;
  };

  const getFormatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Filter and Search logic
  const filteredFiles = files.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (filterType === "images") return f.type.startsWith("image/");
    if (filterType === "docs") {
      return f.type.includes("pdf") || f.type.includes("word") || f.type.includes("text") || f.type.includes("sheet") || f.type.includes("csv") || f.type.includes("markdown");
    }
    if (filterType === "media") return f.type.startsWith("video/") || f.type.startsWith("audio/");
    return true;
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Sliding Drawer Container */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-zinc-950/95 border-l border-white/10 z-50 flex flex-col h-full shadow-2xl backdrop-blur-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h2 className="text-sm sm:text-base font-bold text-white">File Manager</h2>
              </div>
              <button 
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drag & Drop Upload Zone */}
            <div className="p-4 border-b border-white/5">
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-zinc-800 hover:border-indigo-500/40 rounded-xl cursor-pointer bg-zinc-900/40 hover:bg-zinc-900/80 transition-all text-center">
                <div className="flex flex-col items-center justify-center pt-3 pb-3">
                  <Upload className="w-6 h-6 text-zinc-500 mb-1.5" />
                  <p className="text-xs text-zinc-300 font-semibold">Upload Files</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">PDF, DOCX, TXT, CSV, Sheets, Audio, Images (Max 10MB)</p>
                </div>
                <input 
                  type="file" 
                  multiple 
                  className="hidden" 
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
              </label>
              {isUploading && (
                <div className="mt-2 text-center text-xs text-indigo-400 animate-pulse font-medium">
                  Uploading and processing files...
                </div>
              )}
              {uploadError && (
                <div className="mt-2 text-center text-xs text-red-400 font-semibold bg-red-500/10 py-1.5 px-2.5 rounded-lg border border-red-500/20">
                  {uploadError}
                </div>
              )}
            </div>

            {/* Controls: Search & Category Filter */}
            <div className="p-4 flex flex-col gap-3 border-b border-white/5">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search files by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-indigo-500/50 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 outline-none transition-colors"
                />
              </div>

              {/* Segmented Category Filter Tabs */}
              <div className="flex items-center gap-1 p-1 bg-zinc-900/80 rounded-xl border border-zinc-800">
                {(["all", "images", "docs", "media"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`flex-1 text-center py-1.5 text-[10px] sm:text-xs font-semibold rounded-lg capitalize transition-colors ${
                      filterType === type 
                        ? "bg-indigo-600 text-white shadow-sm" 
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {type === "docs" ? "Docs" : type === "media" ? "Media" : type}
                  </button>
                ))}
              </div>
            </div>

            {/* Files List */}
            <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
              {filteredFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center h-48 text-zinc-600 gap-2">
                  <FileText className="w-10 h-10 opacity-30" />
                  <p className="text-xs font-semibold">No files found</p>
                  <p className="text-[10px] text-zinc-600 max-w-xs">Upload items above to persist and attach them directly to your AI conversations.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {filteredFiles.map((file) => {
                    const isAttached = currentComposerAttachmentIds.includes(file.id);
                    return (
                      <div
                        key={file.id}
                        onClick={() => toggleAttachment(file.id)}
                        className={`flex items-center gap-3 p-3 bg-zinc-900/50 border rounded-xl hover:bg-zinc-900/90 hover:border-zinc-700 transition-all cursor-pointer group ${
                          isAttached ? "border-indigo-500/50 bg-indigo-500/5" : "border-zinc-800/80"
                        }`}
                      >
                        {/* File Icon wrapper */}
                        <div className="w-9 h-9 rounded-lg bg-zinc-950/60 flex items-center justify-center flex-shrink-0 border border-white/5">
                          {getFileIcon(file.type)}
                        </div>

                        {/* Title & Metadata */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-zinc-200 truncate group-hover:text-white transition-colors">
                            {file.name}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mt-0.5">
                            <span>{getFormatSize(file.size)}</span>
                            <span>·</span>
                            <span className="capitalize">{file.type.split("/")[1] || "File"}</span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          {isAttached ? (
                            <div className="p-1.5 text-indigo-400 hover:text-indigo-300" title="Attached">
                              <Link2 className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <div className="p-1.5 text-zinc-500 hover:text-zinc-300" title="Attach to Chat">
                              <Unlink className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <button
                            onClick={(e) => handleDeleteFile(file.id, e)}
                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Delete file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Summary */}
            <div className="p-4 border-t border-white/10 bg-zinc-950/80 flex items-center justify-between text-xs text-zinc-400 flex-shrink-0">
              <span>{filteredFiles.length} file{filteredFiles.length !== 1 && "s"} listed</span>
              <span className="text-[10px] bg-indigo-500/15 border border-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full font-semibold">
                {currentComposerAttachmentIds.length} attached to Composer
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
