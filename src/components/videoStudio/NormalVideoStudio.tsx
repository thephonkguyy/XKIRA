import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  Video, 
  RefreshCw, 
  Play, 
  AlertCircle, 
  Film, 
  Maximize2
} from "lucide-react";
import { useJobStore } from "../../store/jobStore";
import { useProjectStore } from "../../store/projectStore";
import { safeExtractError } from "../../lib/utils";
import { prepareReferenceAsset } from "../../utils/mediaValidator";
import { 
  AspectRatio, 
  Resolution, 
  FrameRate, 
  CameraMovement, 
  VisualStyle, 
  LightingStyle, 
  MotionSpeed 
} from "../../types/videoStudio";
import VideoPlayer from "../media/VideoPlayer";
import VideoActionToolbar from "../media/VideoActionToolbar";
import ImageUploadZone from "../media/ImageUploadZone";
import FullscreenMediaModal, { FullscreenMediaItem } from "../media/FullscreenMediaModal";

const ASPECT_RATIOS: { id: AspectRatio; label: string; icon: string; ratio: string }[] = [
  { id: "16:9", label: "Landscape (16:9)", icon: "▭", ratio: "YouTube / TV" },
  { id: "9:16", label: "Portrait (9:16)", icon: "▯", ratio: "TikTok / Reels" },
  { id: "1:1", label: "Square (1:1)", icon: "◻", ratio: "Feed / Post" },
  { id: "4:3", label: "Classic (4:3)", icon: "▱", ratio: "Retro / Classic" },
  { id: "21:9", label: "Cinema (21:9)", icon: "▰", ratio: "Anamorphic Cinema" },
];

const VISUAL_STYLES: VisualStyle[] = [
  "Cinematic",
  "Photorealistic",
  "Anime",
  "Cyberpunk",
  "3D Render",
  "Sci-Fi",
  "Fantasy",
  "Documentary",
  "Horror"
];

const CAMERA_MOVEMENTS: CameraMovement[] = [
  "Cinematic",
  "Orbit",
  "Drone",
  "Pan",
  "Tilt",
  "Dolly",
  "Tracking",
  "Handheld",
  "Static"
];

const LIGHTING_STYLES: LightingStyle[] = [
  "Dramatic",
  "Golden Hour",
  "Neon",
  "Studio",
  "Natural",
  "Night",
  "Low Key",
  "Volumetric"
];

export default function NormalVideoStudio() {
  const [searchParams] = useSearchParams();
  const { createJob, updateJob, jobs } = useJobStore();

  // Core generation parameters
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [resolution, setResolution] = useState<Resolution>("1080p");
  const [fps, setFps] = useState<FrameRate>(30);
  const [durationSeconds, setDurationSeconds] = useState<number>(5);
  const [camera, setCamera] = useState<CameraMovement>("Cinematic");
  const [style, setStyle] = useState<VisualStyle>("Cinematic");
  const [lighting, setLighting] = useState<LightingStyle>("Dramatic");
  const [motion, setMotion] = useState<MotionSpeed>("Normal");
  const [quality, setQuality] = useState<"Standard" | "High">("High");

  // Reference image state
  const [referenceImageUrl, setReferenceImageUrl] = useState("");
  const [referenceDataUri, setReferenceDataUri] = useState<string | null>(null);

  // Model selection
  const [selectedModel, setSelectedModel] = useState<string>("agnes-video-v2.0");

  // Status & execution states
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isQueueFullError, setIsQueueFullError] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  // Fullscreen modal state
  const [fullscreenMedia, setFullscreenMedia] = useState<FullscreenMediaItem | null>(null);

  // Countdown timer for automatic retry on queue-full
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (retryCountdown !== null && retryCountdown > 0) {
      timer = setTimeout(() => {
        setRetryCountdown(prev => (prev !== null && prev > 1 ? prev - 1 : 0));
      }, 1000);
    } else if (retryCountdown === 0) {
      setRetryCountdown(null);
      setIsQueueFullError(false);
      setErrorMsg(null);
      handleGenerate();
    }
    return () => clearTimeout(timer);
  }, [retryCountdown]);

  // Check URL params on mount (for "Use as Video Reference" from Image Studio)
  useEffect(() => {
    const urlRef = searchParams.get("refImage");
    const urlPrompt = searchParams.get("prompt");
    if (urlRef) {
      setReferenceImageUrl(urlRef);
      setReferenceDataUri(urlRef);
    }
    if (urlPrompt) {
      setPrompt(urlPrompt);
    }
  }, [searchParams]);

  // Recent jobs for Normal Video
  const videoJobs = Object.values(jobs)
    .filter(j => j.type === "video" && (j.tool === "Normal Video" || j.tool === "Video Studio"))
    .sort((a, b) => b.createdAt - a.createdAt);

  const activeJob = currentJobId ? jobs[currentJobId] : videoJobs[0];

  // Sync with project store on completion
  useEffect(() => {
    if (activeJob?.status === "COMPLETED" && activeJob.resultUrl) {
      const projectState = useProjectStore.getState();
      const activeProj = projectState.getOrCreateActiveProject("Video Studio", "video");
      
      // Check if this version already exists to avoid duplicates
      const versions = activeProj?.versions || [];
      const alreadyExists = versions.some(v => v.resultUrl === activeJob.resultUrl);

      if (activeProj && !alreadyExists) {
        projectState.addProjectVersion(activeProj.projectId, {
          prompt: activeJob.prompt,
          resultUrl: activeJob.resultUrl,
          thumbnail: activeJob.resultUrl,
          model: activeJob.model
        });
        projectState.addRecentItem({
          itemId: `vid_${Date.now()}`,
          type: 'video',
          title: activeJob.prompt.substring(0, 40),
          thumbnail: activeJob.resultUrl,
          status: 'COMPLETED',
          projectId: activeProj.projectId,
          tool: 'Video Studio',
          prompt: activeJob.prompt,
          remoteReference: activeJob.resultUrl,
          model: activeJob.model
        });
      }
    }
  }, [activeJob?.status, activeJob?.resultUrl]);

  const isGenerating = !!Object.values(jobs).find(j => 
    j.type === 'video' && 
    (j.tool === "Normal Video" || j.tool === "Video Studio") &&
    (j.status === 'STARTING' || j.status === 'QUEUED' || j.status === 'PROCESSING') &&
    (Date.now() - j.createdAt < 300000) // 5 mins max for button loading state
  );

  // Enhance prompt with Agnes AI
  const handleEnhancePrompt = async () => {
    if (!prompt.trim() || isEnhancingPrompt) return;
    setIsEnhancingPrompt(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/agnes/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "agnes-2.5-flash",
          messages: [
            {
              role: "system",
              content: "You are an expert Hollywood cinematographer and AI prompt engineer. Expand the user's video prompt into a rich, photorealistic, cinematic prompt with camera physics, lighting cues, texture details, and fluid motion. Return ONLY the enhanced prompt in 2-3 concise sentences. No explanations or quotes."
            },
            {
              role: "user",
              content: `Enhance this video concept: ${prompt}`
            }
          ],
          temperature: 0.7
        })
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(safeExtractError(err, res.status));
      }

      const data = await res.json();
      const enhanced = data.choices?.[0]?.message?.content?.trim();
      if (enhanced) {
        setPrompt(enhanced);
      }
    } catch (err: any) {
      console.warn("Prompt enhance error:", err);
      // Fallback enhancement
      setPrompt(`${prompt.trim()}, cinematic 35mm lens, atmospheric ${lighting.toLowerCase()} lighting, ${camera.toLowerCase()} camera movement, photorealistic textures, 8k resolution.`);
    } finally {
      setIsEnhancingPrompt(false);
    }
  };

  // Generate Normal Video
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setErrorMsg(null);
    setIsQueueFullError(false);

    // Construct unified prompt
    const fullPrompt = `${prompt.trim()}. Style: ${style}, Camera: ${camera}, Lighting: ${lighting}, Motion: ${motion}, Aspect Ratio: ${aspectRatio}. Photorealistic cinematic render.`.trim();

    try {
      const model = selectedModel || "agnes-video-2.5-flash";
      const isImg2Video = !!referenceDataUri || (!!referenceImageUrl && referenceImageUrl.startsWith("http"));
      const firstFrame = referenceDataUri || (referenceImageUrl?.trim() || undefined);

      const payload: any = {
        model,
        prompt: fullPrompt,
        mode: isImg2Video ? "img2video" : "text",
        seconds: durationSeconds,
        size: "720P",
        aspect_ratio: aspectRatio || "16:9",
        n: 1,
        ...(isImg2Video && firstFrame ? { first_frame: firstFrame } : {}),
      };

      console.log(`[Diagnostic] VideoStudio starting generation. Job params:`, {
        duration: durationSeconds,
        model: payload.model,
        mode: payload.mode,
        prompt: fullPrompt.substring(0, 50) + "...",
      });

      const res = await fetch("/api/agnes/videos/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const resText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(resText);
      } catch {}

      if (!res.ok) {
        const errorMsg = data?.error?.message || (typeof data?.error === "string" ? data.error : null) || data?.message || safeExtractError(resText, res.status);
        throw new Error(errorMsg);
      }
      const vId = data.video_id || data.id || data.task_id || `vid_${Date.now()}`;
      const tId = data.task_id || data.id || data.video_id || vId;

      const newJobId = createJob({
        type: "video",
        tool: "Normal Video",
        model,
        prompt: fullPrompt,
        duration: durationSeconds,
        inputUri: referenceDataUri || referenceImageUrl || undefined,
        status: "QUEUED",
        progress: "Queued in Agnes video pipeline...",
        taskId: tId,
        videoId: vId
      });

      setCurrentJobId(newJobId);
      setRetryCountdown(null);
    } catch (err: any) {
      console.error("Video Generation Error:", err);
      const rawErrMsg = err.message || "Failed to start video generation";
      const cleanErr = safeExtractError(rawErrMsg);
      const lower = cleanErr.toLowerCase();

      const isPlanQuota =
        lower.includes("token plan") ||
        lower.includes("free users") ||
        lower.includes("insufficient quota") ||
        lower.includes("credit balance");

      const isQueueFull = 
        !isPlanQuota && (
          lower.includes("queue is full") || 
          lower.includes("2 requests per 1 minute") || 
          lower.includes("1 requests per 1 minute") || 
          lower.includes("network capacity")
        );

      if (isQueueFull) {
        setIsQueueFullError(true);
        setErrorMsg("Agnes AI video queue is currently at peak capacity across the network. Auto-retrying slot...");
        setRetryCountdown(45);
      } else {
        setIsQueueFullError(false);
        setRetryCountdown(null);
        setErrorMsg(cleanErr);
      }
    }
  };

  const handleOpenFullscreen = (videoUrl: string) => {
    setFullscreenMedia({
      type: "video",
      url: videoUrl,
      title: "Generated Video",
      prompt: activeJob?.prompt || prompt,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Intro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Video className="w-5 h-5 text-indigo-400" />
            <span>Standalone Video Generation</span>
          </h3>
          <p className="text-xs text-zinc-400">
            Generate high-definition cinematic videos directly from text prompts or reference images
          </p>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Prompt & Controls */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl">
            
            {/* Prompt input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-300">Video Prompt</label>
                <button
                  onClick={handleEnhancePrompt}
                  disabled={isEnhancingPrompt || !prompt.trim()}
                  className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition-colors font-medium"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isEnhancingPrompt ? "animate-spin" : ""}`} />
                  <span>{isEnhancingPrompt ? "Enhancing with Agnes..." : "Enhance with Agnes"}</span>
                </button>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your scene in cinematic detail (e.g., A cybernetic samurai standing under neon rain in Neo-Tokyo, slow motion camera pull-back, volumetric fog, reflections on puddle...)"
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-2xl p-3.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-all resize-none min-h-[100px]"
              />
            </div>

            {/* Reference Image Input via ImageUploadZone */}
            <div className="space-y-1.5 pt-1">
              <ImageUploadZone
                label="Reference Image (Image-to-Video)"
                initialImageUrl={referenceImageUrl || undefined}
                onImageSelected={(data) => {
                  setReferenceImageUrl(data.file.name);
                  setReferenceDataUri(data.dataUrl);
                }}
                onImageRemoved={() => {
                  setReferenceImageUrl("");
                  setReferenceDataUri(null);
                }}
              />
            </div>

            {/* Aspect Ratio Selector */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold text-zinc-300">Aspect Ratio</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {ASPECT_RATIOS.map((item) => {
                  const isSelected = aspectRatio === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setAspectRatio(item.id)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-500/15 text-white shadow-lg shadow-indigo-500/10"
                          : "border-zinc-800/80 bg-zinc-950/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                      }`}
                    >
                      <div className="text-base font-bold mb-0.5">{item.icon}</div>
                      <div className="text-[11px] font-semibold truncate">{item.id}</div>
                      <div className="text-[8px] sm:text-[9px] text-zinc-500 truncate">{item.ratio}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Settings Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Visual Style</label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value as VisualStyle)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {VISUAL_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Camera Move</label>
                <select
                  value={camera}
                  onChange={(e) => setCamera(e.target.value as CameraMovement)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {CAMERA_MOVEMENTS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Model Engine</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="agnes-video-v2.0">Agnes Video V2.0 (Ultra)</option>
                  <option value="agnes-video-2.5-flash">Agnes Video V2.5 Flash</option>
                  <option value="agnes-video-v1">Agnes Video V1.0 (Standard)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Duration</label>
                <select
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(parseInt(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value={5}>5 Seconds</option>
                  <option value={10}>10 Seconds</option>
                  <option value={15}>15 Seconds</option>
                  <option value={20}>20 Seconds</option>
                  <option value={25}>25 Seconds</option>
                  <option value={30}>30 Seconds</option>
                </select>
              </div>
            </div>

            {/* Generate Action Button */}
            <div className="pt-2">
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-xl shadow-indigo-600/25 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Submitting to Agnes Video Queue...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>
                      Generate Video with{" "}
                      {selectedModel === "agnes-video-v2.0"
                        ? "Agnes V2.0 (Ultra)"
                        : selectedModel === "agnes-video-2.5-flash"
                        ? "Agnes V2.5 Flash"
                        : "Agnes Video"}
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Queue Capacity Notice & Auto-Retry Banner */}
            {isQueueFullError && retryCountdown !== null && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <RefreshCw className="w-4 h-4 text-amber-400 animate-spin mt-0.5 flex-shrink-0" />
                    <div>
                      <h5 className="text-xs font-bold text-amber-300">Agnes Video Queue Full</h5>
                      <p className="text-[11px] text-amber-200/80 mt-0.5 leading-relaxed">
                        Agnes GPU cluster is currently processing high traffic. Your prompt & reference settings are safely preserved.
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setRetryCountdown(null); setIsQueueFullError(false); setErrorMsg(null); }}
                    className="text-zinc-400 hover:text-white text-xs px-1.5 py-0.5 rounded-lg hover:bg-white/10"
                    title="Dismiss"
                  >
                    ✕
                  </button>
                </div>

                {/* Progress bar and countdown */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-amber-300 font-mono">
                    <span>Auto-retrying in {retryCountdown}s...</span>
                    <span>Slot Pacing</span>
                  </div>
                  <div className="w-full bg-amber-950/40 rounded-full h-1.5 overflow-hidden border border-amber-500/20">
                    <div 
                      className="bg-gradient-to-r from-amber-500 to-amber-300 h-full transition-all duration-1000 ease-linear"
                      style={{ width: `${((15 - retryCountdown) / 15) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => {
                      setRetryCountdown(null);
                      setIsQueueFullError(false);
                      handleGenerate();
                    }}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-bold rounded-xl shadow transition-all flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Retry Now</span>
                  </button>
                </div>
              </div>
            )}

            {/* General Error Notice */}
            {errorMsg && !isQueueFullError && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                  <span>{errorMsg}</span>
                </div>
                <button onClick={() => setErrorMsg(null)} className="font-bold hover:text-white">✕</button>
              </div>
            )}

            {/* Development Request Inspection */}
            <div className="p-3 rounded-2xl bg-black/40 border border-white/5 text-[11px] font-mono text-zinc-400 space-y-1.5">
              <div className="flex items-center justify-between text-zinc-300 font-semibold border-b border-white/5 pb-1">
                <span>VIDEO REQUEST</span>
                <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">DEV INSPECTOR</span>
              </div>
              <div className="space-y-0.5 text-[10px]">
                <div><span className="text-zinc-500">endpoint:</span> <span className="text-zinc-300">/api/agnes/videos/generations</span></div>
                <div><span className="text-zinc-500">model:</span> <span className="text-indigo-300">{selectedModel}</span></div>
                <div><span className="text-zinc-500">mode:</span> <span className="text-emerald-300">{referenceDataUri || referenceImageUrl ? "img2video" : "text"}</span></div>
                <div><span className="text-zinc-500">content-type:</span> <span className="text-amber-300">application/json</span></div>
                <div className="truncate"><span className="text-zinc-500">payload keys:</span> <span className="text-zinc-400">{["prompt", "model", "mode", "seconds", "size", "aspect_ratio", ...(referenceDataUri || referenceImageUrl ? ["first_frame"] : [])].join(", ")}</span></div>
              </div>
            </div>

          </div>
        </div>

        {/* Right 5 Cols: Live Player Output & Status */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Video Output Monitor</h4>
              {activeJob && (
                <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                  activeJob.status === "COMPLETED"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    : activeJob.status === "FAILED"
                    ? "bg-red-500/20 text-red-300 border-red-500/30"
                    : "bg-indigo-500/20 text-indigo-300 border-indigo-500/30 animate-pulse"
                }`}>
                  {activeJob.status}
                </span>
              )}
            </div>

            {/* Video Player Display */}
            <div className="aspect-video w-full bg-zinc-950 rounded-2xl border border-zinc-800/80 overflow-hidden flex flex-col items-center justify-center relative group">
              {activeJob?.resultUrl ? (
                <VideoPlayer
                  src={activeJob.resultUrl}
                  title="XKIRA Generated Video"
                  autoPlay={true}
                  loop={true}
                  className="w-full h-full object-cover"
                />
              ) : activeJob?.status === "PROCESSING" || activeJob?.status === "QUEUED" ? (
                <div className="text-center p-6 space-y-3">
                  <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
                  <div>
                    <p className="text-xs font-semibold text-white">Rendering Video Frames</p>
                    <p className="text-[11px] text-indigo-300 mt-1 animate-pulse">
                      {activeJob.progress || "Processing in Agnes background queue..."}
                    </p>
                  </div>
                  <p className="text-[10px] text-zinc-500 max-w-xs mx-auto">
                    You can safely navigate across XKIRA tools. Generation continues automatically in the background.
                  </p>
                </div>
              ) : activeJob?.status === "FAILED" ? (
                <div className="text-center p-6 space-y-2">
                  <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
                  <p className="text-xs font-semibold text-red-300">Generation Failed</p>
                  <p className="text-[11px] text-zinc-400 max-w-xs">{activeJob.error || "Upstream generation failure."}</p>
                </div>
              ) : (
                <div className="text-center p-6 space-y-2 text-zinc-600">
                  <Film className="w-10 h-10 mx-auto opacity-50" />
                  <p className="text-xs font-medium">No video generated yet</p>
                  <p className="text-[10px] text-zinc-500">Configure prompt and click Generate</p>
                </div>
              )}
            </div>

            {/* Actions for Completed Video */}
            {activeJob?.resultUrl && (
              <div className="pt-2">
                <VideoActionToolbar
                  videoUrl={activeJob.resultUrl}
                  prompt={activeJob.prompt}
                  title="XKIRA Generated Video"
                  onRegenerate={handleGenerate}
                  onOpenFullscreen={() => handleOpenFullscreen(activeJob.resultUrl!)}
                />
              </div>
            )}

            {/* Active Prompt Preview */}
            {activeJob?.prompt && (
              <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800/80 text-[11px] space-y-1">
                <span className="font-semibold text-zinc-400 block text-[10px] uppercase">Job Prompt:</span>
                <p className="text-zinc-300 font-mono text-[10px] leading-relaxed line-clamp-3">
                  {activeJob.prompt}
                </p>
              </div>
            )}

          </div>

          {/* Recent Generations Drawer */}
          {videoJobs.length > 1 && (
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-5 space-y-3">
              <h5 className="text-xs font-bold text-white">Recent Generations</h5>
              <div className="grid grid-cols-3 gap-2">
                {videoJobs.slice(0, 6).map((job) => (
                  <button
                    key={job.jobId}
                    onClick={() => setCurrentJobId(job.jobId)}
                    className={`p-1.5 rounded-xl border text-left transition-all ${
                      currentJobId === job.jobId
                        ? "border-indigo-500 bg-indigo-500/10"
                        : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                    }`}
                  >
                    {job.resultUrl ? (
                      <video src={job.resultUrl} className="w-full h-12 object-cover rounded-lg mb-1" />
                    ) : (
                      <div className="w-full h-12 bg-zinc-900 rounded-lg flex items-center justify-center mb-1">
                        <RefreshCw className="w-3 h-3 text-indigo-400 animate-spin" />
                      </div>
                    )}
                    <p className="text-[9px] text-zinc-400 truncate">{job.prompt}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Fullscreen Lightbox Modal */}
      <FullscreenMediaModal
        media={fullscreenMedia}
        isOpen={!!fullscreenMedia}
        onClose={() => setFullscreenMedia(null)}
      />
    </div>
  );
}
