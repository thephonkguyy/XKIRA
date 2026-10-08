import React, { useState } from "react";
import { 
  Play, 
  Download, 
  Share2, 
  Copy, 
  RefreshCw, 
  Maximize2, 
  Bookmark, 
  BookmarkCheck, 
  Trash2, 
  Check, 
  Sparkles,
  AlertCircle
} from "lucide-react";
import { downloadMedia, generateVideoFilename } from "../../utils/downloadService";
import { shareMedia } from "../../utils/shareService";

export interface VideoActionToolbarProps {
  videoUrl: string;
  prompt?: string;
  title?: string;
  onPlay?: () => void;
  onRegenerate?: () => void;
  onOpenFullscreen?: () => void;
  onDelete?: () => void;
  className?: string;
  compact?: boolean;
}

export default function VideoActionToolbar({
  videoUrl,
  prompt,
  title,
  onPlay,
  onRegenerate,
  onOpenFullscreen,
  onDelete,
  className = "",
  compact = false,
}: VideoActionToolbarProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const showStatus = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 2500);
  };

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    const filename = generateVideoFilename("mp4");
    const res = await downloadMedia(videoUrl, filename, "video");
    setIsDownloading(false);
    if (res.ok) {
      setDownloadSuccess(true);
      showStatus("Downloaded MP4 ✓");
      setTimeout(() => setDownloadSuccess(false), 2500);
    } else {
      showStatus(res.error || "Download failed");
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(videoUrl);
      setCopied(true);
      showStatus("Video link copied ✓");
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      showStatus("Unable to access clipboard");
    }
  };

  const handleShare = async () => {
    const res = await shareMedia({
      title: title || "XKIRA AI Video",
      text: prompt || "Created with XKIRA AI workstation",
      url: videoUrl.startsWith("http") ? videoUrl : window.location.origin + videoUrl,
    });
    if (!res.cancelled) {
      showStatus(res.message);
    }
  };

  const handleSave = () => {
    setSaved(!saved);
    showStatus(!saved ? "Saved to History ✓" : "Removed bookmark");
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Toast banner if active */}
      {statusMsg && (
        <div className="text-[11px] font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-fadeIn">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>{statusMsg}</span>
        </div>
      )}

      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Play Button */}
        {onPlay && (
          <button
            onClick={onPlay}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all active:scale-95 min-h-[40px]"
            title="Play Video"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Play</span>
          </button>
        )}

        {/* Download */}
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all active:scale-95 min-h-[40px]"
          title="Download MP4"
        >
          {downloadSuccess ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : isDownloading ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          {!compact && <span>Download</span>}
        </button>

        {/* Copy Video Link */}
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all active:scale-95 min-h-[40px]"
          title="Copy Video URL"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {!compact && <span>Copy Link</span>}
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all active:scale-95 min-h-[40px]"
          title="Share Video"
        >
          <Share2 className="w-3.5 h-3.5" />
          {!compact && <span>Share</span>}
        </button>

        {/* Regenerate */}
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all active:scale-95 min-h-[40px]"
            title="Regenerate Video"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {!compact && <span>Regenerate</span>}
          </button>
        )}

        {/* Save / Bookmark */}
        <button
          onClick={handleSave}
          className={`p-2.5 rounded-xl border transition-all active:scale-95 min-h-[40px] min-w-[40px] flex items-center justify-center ${
            saved
              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
              : "bg-white/10 hover:bg-white/20 text-white border-white/10"
          }`}
          title="Save to History"
        >
          {saved ? <BookmarkCheck className="w-4 h-4 text-amber-400" /> : <Bookmark className="w-4 h-4" />}
        </button>

        {/* Fullscreen */}
        {onOpenFullscreen && (
          <button
            onClick={onOpenFullscreen}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all active:scale-95 min-h-[40px] min-w-[40px] flex items-center justify-center"
            title="Open Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}

        {/* Delete */}
        {onDelete && (
          <button
            onClick={onDelete}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-white/10 transition-all active:scale-95 min-h-[40px] min-w-[40px] flex items-center justify-center"
            title="Delete Video"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
