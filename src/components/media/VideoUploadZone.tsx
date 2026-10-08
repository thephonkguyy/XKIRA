import React, { useState, useRef, useEffect } from "react";
import { 
  UploadCloud, 
  Video as VideoIcon, 
  X, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Play
} from "lucide-react";

interface VideoUploadZoneProps {
  onVideoSelected: (data: { file: File; objectUrl: string; duration: number }) => void;
  onVideoRemoved?: () => void;
  initialVideoUrl?: string;
  maxSizeBytes?: number; // default 100MB
  label?: string;
  className?: string;
}

export default function VideoUploadZone({
  onVideoSelected,
  onVideoRemoved,
  initialVideoUrl,
  maxSizeBytes = 100 * 1024 * 1024,
  label = "Upload Video Source",
  className = "",
}: VideoUploadZoneProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialVideoUrl || null);
  const [videoMeta, setVideoMeta] = useState<{ name: string; size: string; duration: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  // Sync initial URL if updated externally
  useEffect(() => {
    if (initialVideoUrl && initialVideoUrl !== previewUrl) {
      setPreviewUrl(initialVideoUrl);
    }
  }, [initialVideoUrl]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDuration = (secs: number) => {
    if (isNaN(secs)) return "00:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const processFile = (file: File) => {
    setError(null);
    setIsValidating(true);

    // 1. Validate MIME type
    const validTypes = ["video/mp4", "video/webm", "video/quicktime", "video/x-matroska"];
    const fileExt = file.name.split(".").pop()?.toLowerCase();
    if (!validTypes.includes(file.type.toLowerCase()) && !["mp4", "webm", "mov", "mkv"].includes(fileExt || "")) {
      setError("Unsupported video format. Please upload MP4, WEBM, or MOV.");
      setIsValidating(false);
      return;
    }

    // 2. Validate File Size
    if (file.size > maxSizeBytes) {
      setError(`Video file is too large (${formatFileSize(file.size)}). Max allowed is ${formatFileSize(maxSizeBytes)}.`);
      setIsValidating(false);
      return;
    }

    // 3. Validate video integrity and extract duration
    const objectUrl = URL.createObjectURL(file);
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    objectUrlRef.current = objectUrl;

    const tempVideo = document.createElement("video");
    tempVideo.preload = "metadata";

    tempVideo.onloadedmetadata = () => {
      const duration = tempVideo.duration;
      setPreviewUrl(objectUrl);
      setVideoMeta({
        name: file.name,
        size: formatFileSize(file.size),
        duration: formatDuration(duration),
      });
      setIsValidating(false);
      onVideoSelected({ file, objectUrl, duration });
    };

    tempVideo.onerror = () => {
      setError("Corrupted or unplayable video file.");
      setIsValidating(false);
      URL.revokeObjectURL(objectUrl);
    };

    tempVideo.src = objectUrl;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    if (e.target) e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleRemove = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPreviewUrl(null);
    setVideoMeta(null);
    setError(null);
    if (onVideoRemoved) onVideoRemoved();
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && <label className="text-xs font-semibold text-zinc-300">{label}</label>}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Preview Card If Selected */}
      {previewUrl ? (
        <div className="relative rounded-2xl border border-white/10 bg-zinc-900/80 p-3 flex items-center gap-3 group backdrop-blur-md">
          <div className="relative w-24 h-16 rounded-xl overflow-hidden bg-black flex-shrink-0 border border-white/10 flex items-center justify-center">
            <video
              src={previewUrl}
              className="w-full h-full object-cover"
              muted
              playsInline
              preload="metadata"
            />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
              <Play className="w-5 h-5 text-white/80 fill-current" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white truncate">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span className="truncate">{videoMeta?.name || "Attached Video"}</span>
            </div>
            {videoMeta && (
              <div className="text-[11px] font-mono text-zinc-400 mt-1 flex items-center gap-2">
                <span>Duration: {videoMeta.duration}</span>
                <span>•</span>
                <span>{videoMeta.size}</span>
              </div>
            )}
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 transition-colors flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Upload Area */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer backdrop-blur-md flex flex-col items-center justify-center gap-2.5 ${
            isDragging
              ? "border-purple-400 bg-purple-500/10"
              : "border-white/15 bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.05]"
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          {isValidating ? (
            <div className="flex flex-col items-center gap-2 py-3">
              <RefreshCw className="w-6 h-6 text-purple-400 animate-spin" />
              <span className="text-xs font-semibold text-zinc-300">Validating video stream...</span>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shadow-lg">
                <UploadCloud className="w-6 h-6" />
              </div>

              <div>
                <p className="text-xs font-semibold text-white">
                  Drop video here, or <span className="text-purple-400 underline">browse</span>
                </p>
                <p className="text-[10px] text-zinc-400 mt-0.5">MP4, WEBM, MOV up to 100MB</p>
              </div>

              <div className="flex items-center gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors flex items-center gap-1.5 min-h-[36px]"
                >
                  <VideoIcon className="w-3.5 h-3.5" />
                  <span>Choose Video</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
