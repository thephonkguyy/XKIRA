import React, { useState, useRef, useEffect, useCallback } from "react";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  RotateCw, 
  Sliders, 
  Download, 
  Share2, 
  ExternalLink,
  Sparkles,
  Check,
  AlertCircle
} from "lucide-react";
import { downloadMedia, generateVideoFilename } from "../../utils/downloadService";
import { shareMedia } from "../../utils/shareService";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  className?: string;
  title?: string;
  onEnded?: () => void;
  showDownload?: boolean;
  showShare?: boolean;
}

export default function VideoPlayer({
  src,
  poster,
  autoPlay = false,
  loop = false,
  muted = false,
  className = "",
  title,
  onEnded,
  showDownload = true,
  showShare = true,
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(muted);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return "00:00";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
    }
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Trigger controls auto-hide
  const triggerShowControls = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2500);
    }
  }, [isPlaying]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch((e) => console.warn("Video playback error:", e));
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    triggerShowControls();
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!videoRef.current || !progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newTime = pos * duration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    triggerShowControls();
  };

  const cyclePlaybackRate = () => {
    const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    setPlaybackRate(nextRate);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextRate;
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          await (containerRef.current as any).webkitRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (e) {
      console.warn("Fullscreen toggle error:", e);
    }
  };

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    setError(null);
    const filename = generateVideoFilename("mp4");
    const result = await downloadMedia(src, filename, "video");
    setIsDownloading(false);
    if (result.ok) {
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } else {
      setError(result.error || "Unable to download video.");
      setTimeout(() => setError(null), 4000);
    }
  };

  const handleShare = async () => {
    const result = await shareMedia({
      title: title || "XKIRA AI Video",
      text: "Watch this AI video generated with XKIRA",
      url: src.startsWith("http") ? src : window.location.origin + src,
    });
    if (!result.cancelled) {
      setShareFeedback(result.message);
      setTimeout(() => setShareFeedback(null), 2500);
    }
  };

  // Double tap handler for mobile seek (+/- 5s)
  const handleTouchTap = (e: React.TouchEvent<HTMLDivElement>) => {
    const now = Date.now();
    const touchX = e.changedTouches[0].clientX;
    const rect = containerRef.current?.getBoundingClientRect();

    if (now - lastTapRef.current.time < 300 && rect) {
      const isRightSide = touchX > rect.left + rect.width / 2;
      if (videoRef.current) {
        if (isRightSide) {
          videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 5);
        } else {
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
        }
      }
    }
    lastTapRef.current = { time: now, x: touchX };
    triggerShowControls();
  };

  // Keyboard controls when focused
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current || document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
      if (e.key === " " || e.key === "k") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "m") {
        toggleMute();
      } else if (e.key === "f") {
        toggleFullscreen();
      } else if (e.key === "ArrowLeft") {
        if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
      } else if (e.key === "ArrowRight") {
        if (videoRef.current) videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 5);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, duration]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={triggerShowControls}
      onTouchStart={handleTouchTap}
      className={`relative group bg-black rounded-2xl overflow-hidden select-none flex items-center justify-center ${className}`}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        playsInline
        preload="metadata"
        loop={loop}
        muted={isMuted}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
        onLoadedMetadata={() => videoRef.current && setDuration(videoRef.current.duration)}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onEnded={() => {
          setIsPlaying(false);
          if (onEnded) onEnded();
        }}
        onError={() => setError("Error loading video playback.")}
        onClick={togglePlay}
        className="w-full h-full object-contain cursor-pointer"
      />

      {/* Center Big Play/Pause / Buffering Indicator */}
      <div 
        onClick={togglePlay}
        className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${
          !isPlaying || isBuffering ? "opacity-100" : "opacity-0"
        }`}
      >
        {isBuffering ? (
          <div className="w-14 h-14 rounded-full bg-black/70 backdrop-blur-md border border-white/20 flex items-center justify-center text-indigo-400 animate-spin">
            <RotateCw className="w-7 h-7" />
          </div>
        ) : !isPlaying ? (
          <div className="w-16 h-16 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-2xl backdrop-blur-md border border-white/20 transform group-hover:scale-110 transition-transform">
            <Play className="w-7 h-7 fill-current ml-1" />
          </div>
        ) : null}
      </div>

      {/* Top Action Bar (Title, Download, Share) */}
      <div
        className={`absolute top-0 inset-x-0 p-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between transition-opacity duration-300 z-20 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="text-xs font-semibold text-white/90 truncate max-w-[60%] drop-shadow">
          {title || "XKIRA Video Preview"}
        </div>

        <div className="flex items-center gap-1.5">
          {showShare && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleShare();
              }}
              className="p-2 rounded-xl bg-black/50 hover:bg-black/80 text-white/90 hover:text-white border border-white/10 backdrop-blur-md transition-all min-h-[36px] min-w-[36px] flex items-center justify-center"
              title="Share Video"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}

          {showDownload && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
              disabled={isDownloading}
              className={`p-2 rounded-xl border backdrop-blur-md transition-all min-h-[36px] min-w-[36px] flex items-center justify-center ${
                downloadSuccess
                  ? "bg-emerald-500/80 text-white border-emerald-400"
                  : "bg-black/50 hover:bg-black/80 text-white/90 hover:text-white border-white/10"
              }`}
              title="Download MP4"
            >
              {downloadSuccess ? (
                <Check className="w-4 h-4 text-white" />
              ) : isDownloading ? (
                <RotateCw className="w-4 h-4 animate-spin text-indigo-400" />
              ) : (
                <Download className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Feedback & Error Toasts */}
      {(shareFeedback || error) && (
        <div className="absolute top-14 inset-x-4 flex justify-center z-30 pointer-events-none">
          <div className={`px-4 py-2 rounded-xl text-xs font-medium backdrop-blur-md border shadow-xl flex items-center gap-2 ${
            error ? "bg-red-500/90 text-white border-red-400" : "bg-indigo-600/90 text-white border-indigo-400"
          }`}>
            {error ? <AlertCircle className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            <span>{error || shareFeedback}</span>
          </div>
        </div>
      )}

      {/* Bottom Control Bar */}
      <div
        className={`absolute bottom-0 inset-x-0 p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col gap-2 transition-opacity duration-300 z-20 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Seek Bar / Progress Bar */}
        <div
          ref={progressBarRef}
          onClick={handleSeek}
          className="w-full h-2.5 sm:h-2 bg-white/20 hover:h-3.5 sm:hover:h-3 rounded-full cursor-pointer relative transition-all flex items-center"
        >
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full relative"
            style={{ width: `${progressPercent}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md transform translate-x-1/2" />
          </div>
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between text-xs text-white">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Play/Pause Button */}
            <button
              onClick={togglePlay}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </button>

            {/* Volume / Mute */}
            <div className="flex items-center gap-1.5 group/vol">
              <button
                onClick={toggleMute}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-14 sm:w-20 h-1.5 accent-indigo-500 rounded-lg cursor-pointer hidden sm:inline-block"
              />
            </div>

            {/* Time Stamp */}
            <div className="text-[11px] sm:text-xs font-mono text-zinc-300">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Speed Selector */}
            <button
              onClick={cyclePlaybackRate}
              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-mono font-semibold transition-colors min-h-[36px]"
              title="Playback Speed"
            >
              {playbackRate}x
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
              aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
