import React, { useState } from "react";
import { 
  Download, 
  Video, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Share2
} from "lucide-react";
import { useVideoStudioStore } from "../../store/videoStudioStore";
import { ExportPreset, Resolution, FrameRate } from "../../types/videoStudio";
import ResponsiveDialog from "../responsive/ResponsiveDialog";
import VideoPlayer from "../media/VideoPlayer";
import { downloadMedia } from "../../utils/downloadService";
import { shareMedia } from "../../utils/shareService";

interface ExportModalProps {
  onClose: () => void;
}

export default function ExportModal({ onClose }: ExportModalProps) {
  const { currentProject, updateExportConfig, stitchMasterVideo } = useVideoStudioStore();
  const [downloading, setDownloading] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  if (!currentProject) return null;

  const cfg = currentProject.exportConfig;
  const isStitching = currentProject.stitchingStatus === "STITCHING";
  const isCompleted = currentProject.stitchingStatus === "COMPLETED";

  const handleApplyPreset = (preset: ExportPreset) => {
    if (preset === "Social") {
      updateExportConfig({ preset, resolution: "1080p", fps: 30, bitrateKbps: 6000 });
    } else if (preset === "YouTube") {
      updateExportConfig({ preset, resolution: "1080p", fps: 60, bitrateKbps: 12000 });
    } else if (preset === "Cinema") {
      updateExportConfig({ preset, resolution: "4K", fps: 24, bitrateKbps: 25000 });
    } else if (preset === "Mobile") {
      updateExportConfig({ preset, resolution: "720p", fps: 30, bitrateKbps: 4000 });
    }
  };

  const handleDownloadMaster = async () => {
    if (!currentProject.masterVideoUrl) return;
    setDownloading(true);
    try {
      await downloadMedia({
        url: currentProject.masterVideoUrl,
        fileType: "video",
        extension: "mp4",
        prefix: `XKIRA_Master_${currentProject.title.replace(/\s+/g, "_")}`
      });
    } catch (e) {
      console.error("Master download error", e);
    } finally {
      setDownloading(false);
    }
  };

  const handleShareMaster = async () => {
    if (!currentProject.masterVideoUrl) return;
    const res = await shareMedia({
      title: `Master Video - ${currentProject.title}`,
      text: `Watch ${currentProject.title} created with XKIRA Pro Studio`,
      url: currentProject.masterVideoUrl
    });
    if (!res.cancelled) {
      setShareFeedback(res.message);
      setTimeout(() => setShareFeedback(null), 3000);
    }
  };

  return (
    <ResponsiveDialog
      isOpen={true}
      onClose={onClose}
      title="Export & Stitch Master Video"
      subtitle="Compile scene clips and multi-track audio into a single MP4 file"
      icon={<Download className="w-5 h-5" />}
      size="lg"
    >
      <div className="space-y-5 min-w-0">
        {/* Preset Selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-300 block">Export Target Preset</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(["YouTube", "Social", "Cinema", "Mobile"] as ExportPreset[]).map((p) => (
              <button
                key={p}
                onClick={() => handleApplyPreset(p)}
                className={`px-3 py-2.5 text-xs rounded-xl font-semibold border transition-all min-h-[44px] ${
                  cfg.preset === p
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/25"
                    : "bg-zinc-800/60 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Detailed Config */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
          <div>
            <label className="text-zinc-400 block mb-1">Target Resolution</label>
            <select
              value={cfg.resolution}
              onChange={(e) => updateExportConfig({ resolution: e.target.value as Resolution })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 text-xs min-h-[44px]"
            >
              <option value="720p">720p HD</option>
              <option value="1080p">1080p Full HD</option>
              <option value="2K">2K Quad HD</option>
              <option value="4K">4K Ultra HD</option>
            </select>
          </div>

          <div>
            <label className="text-zinc-400 block mb-1">Target Frame Rate</label>
            <select
              value={cfg.fps}
              onChange={(e) => updateExportConfig({ fps: parseInt(e.target.value) as FrameRate })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 text-xs min-h-[44px]"
            >
              <option value="24">24 FPS (Cinematic)</option>
              <option value="25">25 FPS (PAL)</option>
              <option value="30">30 FPS (NTSC)</option>
              <option value="60">60 FPS (Fluid)</option>
            </select>
          </div>
        </div>

        {/* Status / Trigger */}
        <div className="bg-zinc-950/80 p-4 rounded-2xl border border-zinc-800 space-y-3">
          {isStitching ? (
            <div className="flex items-center gap-3 text-indigo-400 text-xs py-2">
              <RefreshCw className="w-5 h-5 animate-spin flex-shrink-0" />
              <span className="leading-relaxed">{currentProject.stitchingProgress || "Encoding and stitching master video with FFmpeg..."}</span>
            </div>
          ) : isCompleted && currentProject.masterVideoUrl ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>Master Video Stitched Successfully!</span>
              </div>
              <div className="aspect-video w-full rounded-xl overflow-hidden border border-zinc-800 bg-black">
                <VideoPlayer
                  src={currentProject.masterVideoUrl}
                  title={`Master Video: ${currentProject.title}`}
                  autoPlay={false}
                  loop={false}
                  className="w-full h-full"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleDownloadMaster}
                  disabled={downloading}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all min-h-[44px] active:scale-95 disabled:opacity-50"
                >
                  {downloading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Downloading MP4...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Download Master MP4 Video</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleShareMaster}
                  className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold border border-zinc-700 transition-colors flex items-center gap-1.5 min-h-[44px]"
                  title="Share Master Video"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </button>
              </div>

              {shareFeedback && (
                <p className="text-xs text-indigo-300 text-center font-medium animate-fadeIn">
                  {shareFeedback}
                </p>
              )}
            </div>
          ) : (
            <button
              onClick={() => stitchMasterVideo()}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all min-h-[44px]"
            >
              <Video className="w-4 h-4" /> Start FFmpeg Master Stitching
            </button>
          )}

          {currentProject.stitchingError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2 break-anywhere">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{currentProject.stitchingError}</span>
            </div>
          )}
        </div>
      </div>
    </ResponsiveDialog>
  );
}
