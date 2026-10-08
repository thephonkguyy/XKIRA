import React, { useState } from "react";
import { 
  Download, 
  Share2, 
  Copy, 
  Edit3, 
  Film, 
  RefreshCw, 
  Maximize2, 
  Bookmark, 
  BookmarkCheck, 
  Check, 
  Sparkles,
  AlertCircle
} from "lucide-react";
import { downloadMedia, generateImageFilename } from "../../utils/downloadService";
import { shareMedia, copyImageToClipboard } from "../../utils/shareService";

export interface ImageActionToolbarProps {
  imageUrl: string;
  prompt?: string;
  title?: string;
  onEdit?: () => void;
  onRegenerate?: () => void;
  onUseAsVideoRef?: () => void;
  onOpenFullscreen?: () => void;
  className?: string;
  compact?: boolean;
}

export default function ImageActionToolbar({
  imageUrl,
  prompt,
  title,
  onEdit,
  onRegenerate,
  onUseAsVideoRef,
  onOpenFullscreen,
  className = "",
  compact = false,
}: ImageActionToolbarProps) {
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
    const filename = generateImageFilename("png");
    const res = await downloadMedia(imageUrl, filename, "image");
    setIsDownloading(false);
    if (res.ok) {
      setDownloadSuccess(true);
      showStatus("Downloaded ✓");
      setTimeout(() => setDownloadSuccess(false), 2500);
    } else {
      showStatus(res.error || "Download failed");
    }
  };

  const handleCopy = async () => {
    const res = await copyImageToClipboard(imageUrl);
    if (res.ok) {
      setCopied(true);
      showStatus("Copied to clipboard ✓");
      setTimeout(() => setCopied(false), 2000);
    } else {
      showStatus(res.message);
    }
  };

  const handleShare = async () => {
    const res = await shareMedia({
      title: title || "XKIRA AI Image",
      text: prompt || "Created with XKIRA AI workstation",
      url: imageUrl.startsWith("http") ? imageUrl : window.location.origin + imageUrl,
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
        {/* Download */}
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all active:scale-95 min-h-[40px]"
          title="Download Image"
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

        {/* Copy Image */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all active:scale-95 min-h-[40px]"
          title="Copy Image to Clipboard"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {!compact && <span>Copy</span>}
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all active:scale-95 min-h-[40px]"
          title="Share Image"
        >
          <Share2 className="w-3.5 h-3.5" />
          {!compact && <span>Share</span>}
        </button>

        {/* Edit in Studio */}
        {onEdit && (
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white border border-indigo-500/30 transition-all active:scale-95 min-h-[40px]"
            title="Edit in Image Studio"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>
        )}

        {/* Use as Video Ref */}
        {onUseAsVideoRef && (
          <button
            onClick={onUseAsVideoRef}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-purple-600/80 hover:bg-purple-600 text-white border border-purple-500/30 transition-all active:scale-95 min-h-[40px]"
            title="Use as Video Reference"
          >
            <Film className="w-3.5 h-3.5" />
            <span>Animate to Video</span>
          </button>
        )}

        {/* Regenerate */}
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all active:scale-95 min-h-[40px]"
            title="Regenerate Image"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {!compact && <span>Regenerate</span>}
          </button>
        )}

        {/* Bookmark / Save */}
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
      </div>
    </div>
  );
}
