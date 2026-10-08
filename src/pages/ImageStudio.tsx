import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ImageIcon, 
  Wand2, 
  Scissors, 
  ScanSearch, 
  RefreshCw, 
  AlertCircle, 
  Sparkles,
  Maximize2,
  UploadCloud,
  Film
} from "lucide-react";
import { useJobStore } from "../store/jobStore";
import { useProjectStore } from "../store/projectStore";
import { safeExtractError } from "../lib/utils";
import { safeParseApiResponse, extractValidImageUrl } from "../lib/safeResponseParser";
import { authenticatedFetch } from "../utils/authenticatedFetch";
import ImageActionToolbar from "../components/media/ImageActionToolbar";
import ImageUploadZone from "../components/media/ImageUploadZone";
import FullscreenMediaModal, { FullscreenMediaItem } from "../components/media/FullscreenMediaModal";
import ProjectWorkspaceBar from "../components/common/ProjectWorkspaceBar";
import VersionHistoryModal from "../components/common/VersionHistoryModal";

type Tab = "generate" | "edit" | "analyze";

function extractImageUrl(data: any): string | null {
  if (!data) return null;
  if (data.data && Array.isArray(data.data) && data.data.length > 0) {
    const item = data.data[0];
    if (item.url) return item.url;
    if (item.b64_json) {
      return item.b64_json.startsWith('data:') 
        ? item.b64_json 
        : `data:image/png;base64,${item.b64_json}`;
    }
  }
  if (typeof data.url === 'string') return data.url;
  if (data.result?.url) return data.result.url;
  if (Array.isArray(data.images) && data.images.length > 0) return data.images[0];
  return null;
}

export default function ImageStudio() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refImageParam = searchParams.get("refImage");
  const promptParam = searchParams.get("prompt");
  const editPromptParam = searchParams.get("editPrompt");

  const [activeTab, setActiveTab] = useState<Tab>("generate");
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reference image for Edit tab
  const [editReferenceUrl, setEditReferenceUrl] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState("");

  // Fullscreen & Version modals
  const [fullscreenMedia, setFullscreenMedia] = useState<FullscreenMediaItem | null>(null);
  const [isVersionsOpen, setIsVersionsOpen] = useState(false);

  const { createJob, updateJob, jobs } = useJobStore();
  const { getActiveProject, ensureActiveProject, saveProject, addProjectVersion, addRecentItem } = useProjectStore();

  const currentProject = getActiveProject("Image Studio", "image");
  const isHydratedRef = React.useRef<string | null>(null);

  // Safely ensure project exists in effect
  useEffect(() => {
    ensureActiveProject("Image Studio", "image");
  }, [ensureActiveProject]);

  // Restore project state on load/switch
  useEffect(() => {
    if (currentProject && isHydratedRef.current !== currentProject.projectId) {
      isHydratedRef.current = currentProject.projectId;
      setPrompt(currentProject.prompt || "");
      setGeneratedImage(currentProject.activeResultUrl || null);
      setEditReferenceUrl(currentProject.referenceImages?.[0] || null);
    }
  }, [currentProject?.projectId]);

  // Handle URL query parameters if navigated from another page
  useEffect(() => {
    if (refImageParam) {
      setEditReferenceUrl(refImageParam);
      setActiveTab("edit");
    }
    if (editPromptParam) {
      setEditPrompt(editPromptParam);
    } else if (promptParam && !prompt) {
      setPrompt(promptParam);
    }
  }, [refImageParam, promptParam, editPromptParam]);

  // Auto-save project fields safely
  useEffect(() => {
    if (currentProject && isHydratedRef.current === currentProject.projectId) {
      const p = prompt;
      const img = generatedImage || undefined;
      const refImgs = editReferenceUrl ? [editReferenceUrl] : [];

      const promptChanged = p !== (currentProject.prompt || "");
      const resultChanged = img !== currentProject.activeResultUrl;
      const refChanged = JSON.stringify(refImgs) !== JSON.stringify(currentProject.referenceImages || []);

      if (promptChanged || resultChanged || refChanged) {
        saveProject(currentProject.projectId, {
          prompt: p,
          activeResultUrl: img || currentProject.activeResultUrl,
          referenceImages: refImgs,
          status: img ? 'COMPLETED' : 'DRAFT',
        });
      }
    }
  }, [prompt, generatedImage, editReferenceUrl, currentProject?.projectId]);

  // Find latest completed or running image job for Image Studio
  const imageJobs = Object.values(jobs)
    .filter(j => j.type === 'image' && j.tool === 'Image Studio')
    .sort((a, b) => b.createdAt - a.createdAt);
  
  const latestJob = imageJobs[0];
  const activeImageUrl = generatedImage || (latestJob?.status === 'COMPLETED' ? latestJob.resultUrl : null);

  // Vision Analysis states
  const [analysisUrl, setAnalysisUrl] = useState("");
  const [analysisPrompt, setAnalysisPrompt] = useState("Describe this image in detail. Identify the main subjects, environment, lighting, colors, composition, and important objects.");
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleEnhancePrompt = async (targetPrompt: string, setter: (val: string) => void) => {
    if (!targetPrompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const payload = {
        model: "agnes-3.0-flash",
        messages: [{ role: "user", content: `Enhance the following prompt to make it a highly detailed, cinematic, and descriptive image generation prompt: "${targetPrompt}". Return ONLY the enhanced prompt text, without any conversational filler or introductory text.` }]
      };

      const res = await authenticatedFetch("/api/agnes/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const parsed = await safeParseApiResponse(res, "Failed to enhance prompt.");
      if (!parsed.success || !parsed.data) {
        throw new Error(parsed.error || `HTTP ${res.status}`);
      }
      
      const data = parsed.data;
      if (data.choices && data.choices[0] && data.choices[0].message) {
        setter(data.choices[0].message.content.trim());
      }
    } catch (e: any) {
      setErrorMsg("Failed to enhance prompt: " + (e.message || "Unknown error"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    // Duplicate check
    const activeRunningJob = imageJobs.find(j => j.status === 'PROCESSING' || j.status === 'QUEUED');
    if (activeRunningJob && activeRunningJob.prompt === prompt) {
      return; // Already generating this exact prompt
    }

    setIsGenerating(true);
    setErrorMsg(null);
    setGeneratedImage(null);

    const jobId = createJob({
      type: 'image',
      tool: 'Image Studio',
      model: 'agnes-image-2.5-flash',
      prompt: prompt,
      status: 'PROCESSING',
      progress: 'Rendering image...'
    });

    try {
      const res = await authenticatedFetch("/api/agnes/images/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "agnes-image-2.5-flash",
          prompt: prompt,
          n: 1,
          size: "1024x1024"
        })
      });

      const parsed = await safeParseApiResponse(res, "Failed to generate image.");
      if (!parsed.success || !parsed.data) {
        throw new Error(parsed.error || `Image generation failed with HTTP ${res.status}`);
      }

      const imageUrl = extractValidImageUrl(parsed.data) || extractImageUrl(parsed.data);
      if (imageUrl) {
        setGeneratedImage(imageUrl);
        updateJob(jobId, {
          status: 'COMPLETED',
          resultUrl: imageUrl,
          progress: '100%'
        });

        // Add version & recent item
        if (currentProject) {
          addProjectVersion(currentProject.projectId, {
            prompt,
            resultUrl: imageUrl,
            thumbnail: imageUrl,
            model: 'agnes-image-2.5-flash',
          });
          addRecentItem({
            itemId: `img_${Date.now()}`,
            type: 'image',
            title: prompt.substring(0, 40),
            thumbnail: imageUrl,
            status: 'COMPLETED',
            projectId: currentProject.projectId,
            tool: 'Image Studio',
            prompt: prompt,
            remoteReference: imageUrl,
            model: 'agnes-image-2.5-flash',
          });
        }
      } else {
        throw new Error("No image URL returned in response.");
      }
    } catch (e: any) {
      console.error("Image Generation Error:", e);
      const cleaned = e.message || "Failed to generate image.";
      setErrorMsg(cleaned);
      updateJob(jobId, {
        status: 'FAILED',
        error: cleaned
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateEditVariation = async () => {
    const trimmedEditPrompt = editPrompt.trim();
    if (!trimmedEditPrompt || isGenerating) return;
    setIsGenerating(true);
    setErrorMsg(null);

    const jobId = createJob({
      type: 'image',
      tool: 'Image Studio',
      model: 'agnes-image-2.5-flash',
      prompt: trimmedEditPrompt,
      inputUri: editReferenceUrl || undefined,
      status: 'PROCESSING',
      progress: 'Generating edited image variation...'
    });

    try {
      const endpoint = editReferenceUrl ? "/api/agnes/images/edits" : "/api/agnes/images/generations";
      const payload: any = {
        model: "agnes-image-2.5-flash",
        prompt: trimmedEditPrompt,
        n: 1,
        size: "1024x1024"
      };
      if (editReferenceUrl) {
        payload.image = editReferenceUrl;
      }

      const res = await authenticatedFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const parsed = await safeParseApiResponse(res, "Failed to generate image variation.");
      if (!parsed.success || !parsed.data) {
        throw new Error(parsed.error || `Image generation failed with HTTP ${res.status}`);
      }

      const imageUrl = extractValidImageUrl(parsed.data) || extractImageUrl(parsed.data);
      if (imageUrl) {
        setGeneratedImage(imageUrl);
        updateJob(jobId, {
          status: 'COMPLETED',
          resultUrl: imageUrl,
          progress: '100%'
        });

        // Add version & recent item for this new edit record (preserving original generation history)
        if (currentProject) {
          addProjectVersion(currentProject.projectId, {
            prompt: trimmedEditPrompt,
            resultUrl: imageUrl,
            thumbnail: imageUrl,
            model: 'agnes-image-2.5-flash',
          });
          addRecentItem({
            itemId: `img_edit_${Date.now()}`,
            type: 'image',
            title: trimmedEditPrompt.substring(0, 40),
            thumbnail: imageUrl,
            status: 'COMPLETED',
            projectId: currentProject.projectId,
            tool: 'Image Studio',
            prompt: trimmedEditPrompt,
            remoteReference: imageUrl,
            model: 'agnes-image-2.5-flash',
          });
        }
      } else {
        throw new Error("No image URL returned in response.");
      }
    } catch (e: any) {
      console.error("Image Edit Generation Error:", e);
      const cleaned = e.message || "Failed to generate image variation.";
      setErrorMsg(cleaned);
      updateJob(jobId, {
        status: 'FAILED',
        error: cleaned
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!analysisUrl.trim() || isAnalyzing) return;
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setErrorMsg(null);

    try {
      const payload = {
        model: "agnes-3.0-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: analysisPrompt },
              { type: "image_url", image_url: { url: analysisUrl.trim() } }
            ]
          }
        ]
      };

      const res = await authenticatedFetch("/api/agnes/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const parsed = await safeParseApiResponse(res, "Vision analysis failed.");
      if (!parsed.success || !parsed.data) {
        throw new Error(parsed.error || `Vision analysis failed with HTTP ${res.status}`);
      }

      const data = parsed.data;
      if (data.choices && data.choices[0] && data.choices[0].message) {
        setAnalysisResult(data.choices[0].message.content.trim());
      } else {
        throw new Error("Invalid vision analysis response structure");
      }
    } catch (e: any) {
      console.error("Vision Error:", e);
      setErrorMsg("Vision Analysis Error: " + (e.message || "Unknown error"));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Open the existing Image Edit workflow with the selected image attached as source
  const handleEditThisImage = (url: string) => {
    if (!url) return;
    setEditReferenceUrl(url);
    // Preserve the user's existing prompt exactly.
    // Do NOT prepend "Modify:" or append instructions.
    // Do NOT mutate original prompt.
    // Preserve editPrompt if the user has already entered one.
    setActiveTab("edit");
  };

  // Switch to Video Studio with this image pre-loaded
  const handleUseAsVideoRef = (url: string) => {
    navigate(`/video-studio?refImage=${encodeURIComponent(url)}&prompt=${encodeURIComponent(prompt || "Cinematic camera movement")}`);
  };

  const handleOpenFullscreen = (url: string) => {
    setFullscreenMedia({
      type: "image",
      url,
      title: "Generated Image",
      prompt: activeTab === "edit" ? (editPrompt || prompt) : (prompt || latestJob?.prompt),
    });
  };

  return (
    <div className="flex flex-col h-full relative w-full">
      {/* Header */}
      <header className="flex flex-col gap-3 border-b border-white/5 pb-4 mb-4 z-10 relative flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">Image Studio</h1>
            <p className="text-xs sm:text-sm text-zinc-400">Generate, edit, and analyze high-fidelity imagery using Agnes AI</p>
          </div>
          <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md self-start sm:self-auto overflow-x-auto no-scrollbar">
            {[
              { id: "generate", icon: Wand2, label: "Generate" },
              { id: "edit", icon: Scissors, label: "Edit & Variations" },
              { id: "analyze", icon: ScanSearch, label: "Analyze" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as Tab); setErrorMsg(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap min-h-[36px] ${
                  activeTab === tab.id 
                    ? "bg-white/10 text-white shadow-sm" 
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Project Workspace Session Bar */}
        {currentProject && (
          <ProjectWorkspaceBar
            tool="Image Studio"
            type="image"
            currentProject={currentProject}
            onOpenVersionsModal={() => setIsVersionsOpen(true)}
          />
        )}
      </header>

      {errorMsg && (
        <div className="p-3 sm:p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs sm:text-sm flex items-center gap-3 mb-4">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
          <p className="flex-1">{errorMsg}</p>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto no-scrollbar pb-10 flex flex-col gap-6 relative z-0">
        <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 mt-1">
          
          <AnimatePresence mode="wait">
            {/* Generate Tab */}
            {activeTab === "generate" && (
              <motion.div 
                key="generate"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="flex flex-col gap-4"
              >
                {/* Prompt Box */}
                <div className="bg-black/40 border border-white/10 rounded-2xl p-3 sm:p-4 focus-within:border-purple-500/50 transition-all flex flex-col gap-3">
                  <textarea 
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="Describe the image you want to create (e.g. A cinematic futuristic city at night, heavy rain, neon lights, 8k resolution, Unreal Engine 5 render...)"
                    className="w-full bg-transparent text-white placeholder-zinc-500 resize-none outline-none text-xs sm:text-sm min-h-[90px] sm:min-h-[110px]"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5">
                    <button 
                      onClick={() => handleEnhancePrompt(prompt, setPrompt)}
                      disabled={!prompt.trim() || isGenerating}
                      className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-medium text-zinc-300 transition-colors disabled:opacity-50 min-h-[38px] flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>Enhance Prompt</span>
                    </button>
                    <button 
                      onClick={handleGenerate}
                      disabled={!prompt.trim() || isGenerating}
                      className="flex items-center gap-2 px-4 sm:px-5 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-lg shadow-purple-500/25 min-h-[38px] active:scale-95"
                    >
                      {isGenerating ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Wand2 className="w-4 h-4" />
                      )}
                      {isGenerating ? "Generating..." : "Generate"}
                    </button>
                  </div>
                </div>

                {/* Preview Area */}
                <div className="w-full aspect-square sm:aspect-video bg-black/20 border border-white/5 rounded-2xl sm:rounded-3xl overflow-hidden relative flex flex-col items-center justify-center backdrop-blur-sm shadow-xl group">
                  {isGenerating || (latestJob && (latestJob.status === 'PROCESSING' || latestJob.status === 'QUEUED')) ? (
                    <div className="flex flex-col items-center gap-3 p-4 text-center">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-white/10 border-t-purple-500 rounded-full animate-spin" />
                      <p className="text-zinc-400 text-xs sm:text-sm animate-pulse">{latestJob?.progress || "Rendering image via Agnes Image 2.1 Flash..."}</p>
                    </div>
                  ) : activeImageUrl ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                      <img 
                        src={activeImageUrl} 
                        alt="Generated" 
                        className="w-full h-full object-contain cursor-pointer"
                        onClick={() => handleOpenFullscreen(activeImageUrl)}
                      />
                      
                      {/* Top Corner Quick Fullscreen Badge */}
                      <button
                        onClick={() => handleOpenFullscreen(activeImageUrl)}
                        className="absolute top-3 right-3 p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white border border-white/10 backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 min-h-[36px] min-w-[36px] flex items-center justify-center"
                        title="View Fullscreen"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-zinc-500 gap-2 p-4 text-center">
                      <ImageIcon className="w-10 h-10 sm:w-12 sm:h-12 opacity-50" />
                      <p className="text-xs sm:text-sm">No image generated yet.</p>
                      <p className="text-[11px] text-zinc-600">Enter a description above to create your image.</p>
                    </div>
                  )}
                </div>

                {/* Complete Image Action Toolbar */}
                {activeImageUrl && (
                  <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-3 sm:p-4 backdrop-blur-md">
                    <ImageActionToolbar
                      imageUrl={activeImageUrl}
                      prompt={prompt || latestJob?.prompt}
                      title="XKIRA Generated Image"
                      onEdit={() => handleEditThisImage(activeImageUrl)}
                      onRegenerate={handleGenerate}
                      onUseAsVideoRef={() => handleUseAsVideoRef(activeImageUrl)}
                      onOpenFullscreen={() => handleOpenFullscreen(activeImageUrl)}
                    />
                  </div>
                )}
              </motion.div>
            )}

            {/* Edit / Variations Tab */}
            {activeTab === "edit" && (
              <motion.div 
                key="edit"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="flex flex-col gap-5"
              >
                <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4 flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-purple-400" />
                    <span>Image Reference & Variation Studio</span>
                  </h3>
                  
                  {/* Upload reference zone */}
                  <ImageUploadZone
                    label="Attach Reference Image"
                    initialImageUrl={editReferenceUrl || undefined}
                    onImageSelected={(data) => setEditReferenceUrl(data.dataUrl)}
                    onImageRemoved={() => setEditReferenceUrl(null)}
                  />

                  {/* Variation Instructions */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-zinc-300">Editing / Variation Prompt</label>
                    <textarea 
                      value={editPrompt}
                      onChange={e => setEditPrompt(e.target.value)}
                      placeholder="Describe what to change, add, or transform (e.g., Change daytime lighting to sunset golden hour, add rain reflections on pavement...)"
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-3 sm:p-4 text-white placeholder-zinc-500 resize-none outline-none focus:border-purple-500/50 transition-all text-xs sm:text-sm min-h-[90px]"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 flex-wrap">
                    <button 
                      onClick={() => handleEnhancePrompt(editPrompt, setEditPrompt)}
                      disabled={!editPrompt.trim() || isGenerating}
                      className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-medium text-zinc-300 transition-colors disabled:opacity-50 min-h-[38px] flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>Enhance Prompt</span>
                    </button>
                    
                    <button 
                      onClick={handleGenerateEditVariation}
                      disabled={!editPrompt.trim() || isGenerating}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-lg shadow-purple-500/25 min-h-[40px] active:scale-95"
                    >
                      {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                      <span>Generate Edit</span>
                    </button>
                  </div>
                </div>

                {/* Before / After Comparison */}
                {editReferenceUrl && generatedImage && !isGenerating && (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-zinc-900/40 rounded-2xl border border-white/5 overflow-hidden flex flex-col relative aspect-square">
                        <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-bold text-white uppercase tracking-wider z-10 border border-white/10">Before</div>
                        <img src={editReferenceUrl} alt="Original" className="w-full h-full object-contain" />
                      </div>
                      <div className="bg-zinc-900/40 rounded-2xl border border-white/5 overflow-hidden flex flex-col relative aspect-square">
                        <div className="absolute top-3 left-3 px-2.5 py-1 bg-indigo-500/80 backdrop-blur-md rounded-lg text-[10px] font-bold text-white uppercase tracking-wider z-10 border border-white/10 shadow-[0_0_15px_rgba(99,102,241,0.5)]">After</div>
                        <img src={generatedImage} alt="Edited" className="w-full h-full object-contain" />
                      </div>
                    </div>
                    <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-3 sm:p-4 backdrop-blur-md">
                      <ImageActionToolbar 
                        imageUrl={generatedImage} 
                        prompt={editPrompt} 
                        title="Edited Image"
                        onEdit={() => handleEditThisImage(generatedImage)}
                        onRegenerate={handleGenerateEditVariation}
                        onUseAsVideoRef={() => handleUseAsVideoRef(generatedImage)}
                        onOpenFullscreen={() => handleOpenFullscreen(generatedImage)}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Analyze Tab */}
            {activeTab === "analyze" && (
              <motion.div 
                key="analyze"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="flex flex-col gap-4 sm:gap-6"
              >
                <div className="flex flex-col gap-3 sm:gap-4 bg-zinc-900/60 border border-white/10 rounded-2xl p-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ScanSearch className="w-4 h-4 text-purple-400" />
                    <span>Vision Analysis Studio</span>
                  </h3>

                  {/* Reference Image Upload */}
                  <ImageUploadZone
                    label="Upload Image for Vision Inspection"
                    initialImageUrl={analysisUrl || undefined}
                    onImageSelected={(data) => setAnalysisUrl(data.dataUrl)}
                    onImageRemoved={() => setAnalysisUrl("")}
                  />

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-zinc-300">Or Paste Remote Image URL</label>
                    <input 
                      type="url"
                      value={analysisUrl}
                      onChange={(e) => setAnalysisUrl(e.target.value)}
                      placeholder="Paste image URL (e.g. https://.../image.png)"
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-3.5 sm:px-4 py-2.5 text-white placeholder-zinc-500 outline-none focus:border-purple-500/50 transition-all text-xs sm:text-sm"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-zinc-300">Analysis Prompt</label>
                    <textarea 
                      value={analysisPrompt}
                      onChange={(e) => setAnalysisPrompt(e.target.value)}
                      placeholder="Analysis instructions..."
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-3.5 sm:p-4 text-white placeholder-zinc-500 resize-none outline-none focus:border-purple-500/50 transition-all text-xs sm:text-sm min-h-[80px]"
                    />
                  </div>

                  <button 
                    onClick={handleAnalyzeImage}
                    disabled={!analysisUrl.trim() || isAnalyzing}
                    className="self-end flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-lg shadow-purple-500/20 active:scale-95 min-h-[40px]"
                  >
                    {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ScanSearch className="w-4 h-4" />}
                    {isAnalyzing ? "Analyzing..." : "Analyze Image"}
                  </button>
                </div>

                {/* Analysis Output */}
                {analysisResult && (
                  <div className="bg-white/[0.02] border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col gap-3">
                    <h4 className="text-xs sm:text-sm font-semibold text-purple-300 flex items-center gap-2">
                      <ScanSearch className="w-4 h-4" /> Vision Analysis Report
                    </h4>
                    <div className="text-xs sm:text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                      {analysisResult}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>

      {/* Fullscreen Lightbox Modal */}
      <FullscreenMediaModal
        media={fullscreenMedia}
        isOpen={!!fullscreenMedia}
        onClose={() => setFullscreenMedia(null)}
        onEditImage={(item) => handleEditThisImage(item.url)}
        onUseAsVideoRef={(item) => handleUseAsVideoRef(item.url)}
      />

      {/* Version History Modal */}
      {currentProject && (
        <VersionHistoryModal
          isOpen={isVersionsOpen}
          project={currentProject}
          onClose={() => setIsVersionsOpen(false)}
        />
      )}
    </div>
  );
}
