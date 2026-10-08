import React, { useState, useRef, useEffect } from "react";
import { 
  UploadCloud, 
  Camera, 
  Image as ImageIcon, 
  X, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Crop,
  Sparkles
} from "lucide-react";

interface ImageUploadZoneProps {
  onImageSelected: (data: { file: File; dataUrl: string; width: number; height: number }) => void;
  onImageRemoved?: () => void;
  initialImageUrl?: string;
  maxSizeBytes?: number; // default 25MB
  label?: string;
  className?: string;
}

export default function ImageUploadZone({
  onImageSelected,
  onImageRemoved,
  initialImageUrl,
  maxSizeBytes = 25 * 1024 * 1024,
  label = "Upload Reference Image",
  className = "",
}: ImageUploadZoneProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImageUrl || null);
  const [imageMeta, setImageMeta] = useState<{ name: string; size: string; dimensions: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  // Sync initial URL if updated externally
  useEffect(() => {
    if (initialImageUrl && initialImageUrl !== previewUrl) {
      setPreviewUrl(initialImageUrl);
    }
  }, [initialImageUrl]);

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

  const processFile = (file: File) => {
    setError(null);
    setIsValidating(true);

    // 1. Validate MIME type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setError("Unsupported format. Please upload JPG, PNG, or WEBP.");
      setIsValidating(false);
      return;
    }

    // 2. Validate File Size
    if (file.size > maxSizeBytes) {
      setError(`File is too large (${formatFileSize(file.size)}). Max allowed is ${formatFileSize(maxSizeBytes)}.`);
      setIsValidating(false);
      return;
    }

    // 3. Validate image integrity by loading it
    const objectUrl = URL.createObjectURL(file);
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    objectUrlRef.current = objectUrl;

    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;

      if (width < 32 || height < 32) {
        setError("Image dimensions are too small (minimum 32x32px).");
        setIsValidating(false);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setPreviewUrl(objectUrl);
        setImageMeta({
          name: file.name,
          size: formatFileSize(file.size),
          dimensions: `${width}×${height}`,
        });
        setIsValidating(false);
        onImageSelected({ file, dataUrl, width, height });
      };
      reader.onerror = () => {
        setError("Failed to read image data.");
        setIsValidating(false);
      };
      reader.readAsDataURL(file);
    };

    img.onerror = () => {
      setError("Corrupted or unreadable image file.");
      setIsValidating(false);
      URL.revokeObjectURL(objectUrl);
    };

    img.src = objectUrl;
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
    setImageMeta(null);
    setError(null);
    if (onImageRemoved) onImageRemoved();
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && <label className="text-xs font-semibold text-zinc-300">{label}</label>}

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Preview Card If Selected */}
      {previewUrl ? (
        <div className="relative rounded-2xl border border-white/10 bg-zinc-900/80 p-3 flex items-center gap-3 group backdrop-blur-md">
          <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-black flex-shrink-0 border border-white/10">
            <img
              src={previewUrl}
              alt="Reference Preview"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white truncate">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span className="truncate">{imageMeta?.name || "Attached Reference"}</span>
            </div>
            {imageMeta && (
              <div className="text-[11px] font-mono text-zinc-400 mt-1 flex items-center gap-2">
                <span>{imageMeta.dimensions}</span>
                <span>•</span>
                <span>{imageMeta.size}</span>
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
              ? "border-indigo-400 bg-indigo-500/10"
              : "border-white/15 bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.05]"
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          {isValidating ? (
            <div className="flex flex-col items-center gap-2 py-3">
              <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
              <span className="text-xs font-semibold text-zinc-300">Validating image integrity...</span>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-lg">
                <UploadCloud className="w-6 h-6" />
              </div>

              <div>
                <p className="text-xs font-semibold text-white">
                  Drop image here, or <span className="text-indigo-400 underline">browse</span>
                </p>
                <p className="text-[10px] text-zinc-400 mt-0.5">JPG, PNG, WEBP up to 25MB</p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors flex items-center gap-1.5 min-h-[36px]"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Choose File</span>
                </button>

                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors flex items-center gap-1.5 min-h-[36px]"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Camera</span>
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
