import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Download, 
  Share2, 
  Copy, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Edit3, 
  Film, 
  Check, 
  Sparkles,
  Maximize,
  AlertCircle
} from "lucide-react";
import VideoPlayer from "./VideoPlayer";
import { downloadMedia, generateImageFilename, generateVideoFilename } from "../../utils/downloadService";
import { shareMedia, copyImageToClipboard } from "../../utils/shareService";

export interface FullscreenMediaItem {
  type: "image" | "video";
  url: string;
  title?: string;
  prompt?: string;
  aspectRatio?: string;
  metadata?: any;
}

interface FullscreenMediaModalProps {
  media: FullscreenMediaItem | null;
  isOpen: boolean;
  onClose: () => void;
  onEditImage?: (item: FullscreenMediaItem) => void;
  onUseAsVideoRef?: (item: FullscreenMediaItem) => void;
}

export default function FullscreenMediaModal({
  media,
  isOpen,
  onClose,
  onEditImage,
  onUseAsVideoRef,
}: FullscreenMediaModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [isDownloading, setIsDownloading] = useState(false);

  // Reset zoom & pan on open/change
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
    }
  }, [isOpen, media?.url]);

  // Handle keyboard events (Escape to close, +/- for zoom)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "+" || e.key === "=") {
        setZoom((z) => Math.min(4, z + 0.25));
      } else if (e.key === "-") {
        setZoom((z) => Math.max(0.5, z - 0.25));
      } else if (e.key === "0") {
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleDownload = async () => {
    if (!media || isDownloading) return;
    setIsDownloading(true);
    const filename = media.type === "video" ? generateVideoFilename("mp4") : generateImageFilename("png");
    const res = await downloadMedia(media.url, filename, media.type);
    setIsDownloading(false);
    if (res.ok) {
      showToast(`Downloaded ${filename}`);
    } else {
      showToast(res.error || "Download failed", "error");
    }
  };

  const handleShare = async () => {
    if (!media) return;
    const res = await shareMedia({
      title: media.title || "XKIRA AI Creation",
      text: media.prompt || "Created with XKIRA AI workstation",
      url: media.url.startsWith("http") ? media.url : window.location.origin + media.url,
    });
    if (!res.cancelled) {
      showToast(res.message);
    }
  };

  const handleCopyImage = async () => {
    if (!media) return;
    if (media.type === "image") {
      const res = await copyImageToClipboard(media.url);
      showToast(res.message, res.ok ? "success" : "error");
    } else {
      await navigator.clipboard.writeText(media.url);
      showToast("Video link copied to clipboard!");
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (media?.type !== "image") return;
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoom((z) => Math.min(4, z + 0.15));
    } else {
      setZoom((z) => Math.max(0.5, z - 0.15));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPan({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (!isOpen || !media) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col justify-between overflow-hidden"
      >
        {/* Header Bar */}
        <div className="flex-shrink-0 flex items-center justify-between p-3 sm:p-5 bg-gradient-to-b from-black/90 to-transparent z-20 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[10px] sm:text-xs font-mono uppercase font-bold">
              {media.type}
            </span>
            <h3 className="text-xs sm:text-sm font-semibold text-white truncate max-w-[200px] sm:max-w-md">
              {media.title || media.prompt || "Fullscreen Media Viewer"}
            </h3>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Download */}
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95"
              title="Download File"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95"
              title="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {/* Copy */}
            <button
              onClick={handleCopyImage}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95"
              title={media.type === "image" ? "Copy Image" : "Copy Link"}
            >
              <Copy className="w-4 h-4" />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-red-500/30 text-zinc-300 hover:text-white border border-white/10 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Center Media Viewport */}
        <div 
          className="flex-1 relative flex items-center justify-center p-2 sm:p-6 overflow-hidden min-h-0"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {media.type === "image" ? (
            <div
              className="relative max-w-full max-h-full flex items-center justify-center select-none"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default",
                transition: isDragging ? "none" : "transform 0.15s ease-out",
              }}
            >
              <img
                src={media.url}
                alt={media.title || "XKIRA Fullscreen"}
                className="max-w-[92vw] max-h-[75vh] sm:max-h-[82vh] object-contain rounded-2xl shadow-2xl border border-white/10 pointer-events-none"
              />
            </div>
          ) : (
            <div className="w-full max-w-5xl h-[65vh] sm:h-[78vh] flex items-center justify-center">
              <VideoPlayer
                src={media.url}
                title={media.title || media.prompt}
                autoPlay={true}
                className="w-full h-full"
              />
            </div>
          )}

          {/* Toast Notification */}
          {toastMessage && (
            <div className="absolute top-4 inset-x-0 flex justify-center z-30 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold backdrop-blur-md border shadow-2xl flex items-center gap-2 ${
                  toastType === "error"
                    ? "bg-red-500/90 text-white border-red-400"
                    : "bg-indigo-600/90 text-white border-indigo-400"
                }`}
              >
                {toastType === "error" ? <AlertCircle className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                <span>{toastMessage}</span>
              </motion.div>
            </div>
          )}
        </div>

        {/* Bottom Toolbar */}
        <div className="flex-shrink-0 p-3 sm:p-5 bg-gradient-to-t from-black/90 to-transparent flex flex-wrap items-center justify-between gap-3 z-20">
          {/* Image Controls (Zoom, Rotate) */}
          {media.type === "image" ? (
            <div className="flex items-center gap-1 sm:gap-2 bg-white/10 p-1 rounded-2xl border border-white/10 backdrop-blur-md">
              <button
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
                className="px-2.5 py-1 text-xs font-mono font-semibold text-zinc-200 hover:text-white"
                title="Reset Zoom"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
                className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                title="Rotate 90°"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
          ) : <div />}

          {/* Workflow Action Buttons (Edit in Studio / Use as Video Ref) */}
          <div className="flex items-center gap-2 flex-wrap">
            {media.type === "image" && onEditImage && (
              <button
                onClick={() => {
                  onEditImage(media);
                  onClose();
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 border border-indigo-400/30 transition-all min-h-[44px]"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit in Image Studio</span>
              </button>
            )}

            {media.type === "image" && onUseAsVideoRef && (
              <button
                onClick={() => {
                  onUseAsVideoRef(media);
                  onClose();
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/20 border border-purple-400/30 transition-all min-h-[44px]"
              >
                <Film className="w-4 h-4" />
                <span>Use as Video Reference</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
