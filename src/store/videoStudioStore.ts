import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { 
  VideoProject, 
  VideoMode, 
  VideoSettings, 
  CharacterProfile, 
  WorldProfile, 
  Scene, 
  AudioTrack, 
  ExportConfig,
  SceneStatus 
} from "../types/videoStudio";
import { useJobStore } from "./jobStore";
import { safeExtractError } from "../lib/utils";
import { prepareReferenceAsset } from "../utils/mediaValidator";
import { aiCore } from "../core/ai";
import { continuityEngine, createTheLastCorridorProject } from "../core/video";

const DEFAULT_SETTINGS: VideoSettings = {
  aspectRatio: "16:9",
  resolution: "1080p",
  fps: 30,
  quality: "High",
  camera: "Cinematic",
  motion: "Normal",
  style: "Cinematic",
  lighting: "Dramatic",
  lens: "35mm",
  depthOfField: "Medium",
  durationSeconds: 5,
};

const DEFAULT_EXPORT_CONFIG: ExportConfig = {
  preset: "YouTube",
  resolution: "1080p",
  fps: 30,
  bitrateKbps: 8000,
  audioBitrateKbps: 192,
  codec: "h264",
  transition: "cut",
  transitionDurationSeconds: 0.5,
};

interface VideoStudioState {
  currentProject: VideoProject | null;
  savedProjects: VideoProject[];
  activeTab: string;
  selectedSceneId: string | null;

  // Actions
  setActiveTab: (tab: string) => void;
  setSelectedSceneId: (id: string | null) => void;
  createNewProject: (title: string, mode: VideoMode, targetDurationMinutes: number, script?: string) => void;
  loadTheLastCorridorProject: () => void;
  loadProject: (projectId: string) => void;
  deleteProject: (projectId: string) => void;
  updateProjectSettings: (settings: Partial<VideoSettings>) => void;
  
  // Character Bible
  addCharacter: (character: Omit<CharacterProfile, "id">) => void;
  updateCharacter: (id: string, updates: Partial<CharacterProfile>) => void;
  removeCharacter: (id: string) => void;
  generateCharacterAvatar: (characterId: string) => Promise<void>;

  // World Bible
  addWorldProfile: (world: Omit<WorldProfile, "id">) => void;
  updateWorldProfile: (id: string, updates: Partial<WorldProfile>) => void;
  removeWorldProfile: (id: string) => void;

  // Story / Scene Breakdown
  generateScenesFromScript: (scriptText: string, targetDurationMinutes: number) => Promise<void>;
  cancelScriptAnalysis: () => void;
  addScene: (scene: Omit<Scene, "sceneId" | "sceneNumber" | "status" | "retries">) => void;
  updateScene: (sceneId: string, updates: Partial<Scene>) => void;
  deleteScene: (sceneId: string) => void;
  reorderScenes: (fromIndex: number, toIndex: number) => void;
  duplicateScene: (sceneId: string) => void;
  extendScene: (sceneId: string, extraSeconds: number) => void;

  // Generation & Continuity
  queueSceneGeneration: (sceneId: string) => Promise<void>;
  queueAllScenesGeneration: () => Promise<void>;
  retryFailedScene: (sceneId: string) => Promise<void>;
  regenerateFromScene: (sceneIndex: number) => Promise<void>;
  syncWithJobStore: () => void;

  // Audio Tracks
  addAudioTrack: (track: Omit<AudioTrack, "id">) => void;
  updateAudioTrack: (id: string, updates: Partial<AudioTrack>) => void;
  removeAudioTrack: (id: string) => void;

  // Stitching & Export
  updateExportConfig: (config: Partial<ExportConfig>) => void;
  stitchMasterVideo: () => Promise<void>;
}

function isValidImageRef(url?: string): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (trimmed.startsWith("data:image/")) return true;
  if (trimmed.endsWith(".mp4") || trimmed.endsWith(".webm") || trimmed.endsWith(".mov") || trimmed.endsWith(".m4v")) return false;
  const clean = trimmed.split("?")[0].toLowerCase();
  return clean.endsWith(".png") || clean.endsWith(".jpg") || clean.endsWith(".jpeg") || clean.endsWith(".webp") || clean.endsWith(".gif") || clean.endsWith(".svg");
}

function parseScriptLocally(scriptText: string, targetSceneCount: number, totalSeconds: number): any[] {
  const paragraphs = scriptText.split(/\n+/).map(p => p.trim()).filter(p => p.length > 0);
  let chunks: string[] = [];
  
  if (paragraphs.length >= targetSceneCount) {
    chunks = paragraphs.slice(0, targetSceneCount);
  } else {
    const sentences = scriptText.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 5);
    chunks = sentences;
  }

  if (chunks.length === 0) {
    chunks = [scriptText];
  }

  const durationPerScene = Math.max(4, Math.round(totalSeconds / Math.max(1, chunks.length)));

  return chunks.map((chunk, idx) => {
    const cleanChunk = chunk.replace(/^(Scene \d+:?|\[\d+\]:?)/i, "").trim();
    return {
      sceneNumber: idx + 1,
      title: `Scene ${idx + 1}: ${cleanChunk.substring(0, 25)}${cleanChunk.length > 25 ? "..." : ""}`,
      durationSeconds: durationPerScene,
      action: cleanChunk,
      dialogue: null,
      camera: idx % 3 === 0 ? "Tracking Shot" : idx % 3 === 1 ? "Dolly In" : "Pan Right",
      lighting: "Cinematic Lighting",
      soundCue: "Ambient Sound",
      musicCue: "Cinematic Score",
      visualPrompt: `Photorealistic 4K cinematic scene: ${cleanChunk}. Volumetric lighting, 35mm lens, atmospheric depth, cinematic color grade.`
    };
  });
}

// Global in-memory queue state for scene generation
const pendingSceneQueue: string[] = [];
let isQueueWorkerRunning = false;
let nextAllowedSceneDispatchTimestamp = 0;

async function runSceneQueueWorker(storeGet: () => VideoStudioState) {
  if (isQueueWorkerRunning) return;
  isQueueWorkerRunning = true;

  try {
    while (pendingSceneQueue.length > 0) {
      const sceneId = pendingSceneQueue[0];
      const state = storeGet();
      const proj = state.currentProject;
      if (!proj) {
        pendingSceneQueue.shift();
        continue;
      }

      const sceneIndex = proj.scenes.findIndex(s => s.sceneId === sceneId);
      if (sceneIndex === -1) {
        pendingSceneQueue.shift();
        continue;
      }

      const scene = proj.scenes[sceneIndex];
      // If scene is already READY, shift and continue
      if (scene.status === "READY") {
        pendingSceneQueue.shift();
        continue;
      }

      // Check if we need to wait for rate-limit pacing window
      const now = Date.now();
      if (now < nextAllowedSceneDispatchTimestamp) {
        let remainingMs = nextAllowedSceneDispatchTimestamp - now;
        while (remainingMs > 0 && pendingSceneQueue.includes(sceneId)) {
          const secs = Math.ceil(remainingMs / 1000);
          state.updateScene(sceneId, {
            status: "QUEUED",
            progressMessage: `⏳ Agnes queue pacing (1 req/min). Next clip dispatch in ${secs}s...`
          });
          const sleepStep = Math.min(1000, remainingMs);
          await new Promise(r => setTimeout(r, sleepStep));
          remainingMs = nextAllowedSceneDispatchTimestamp - Date.now();
        }
      }

      // Refresh state after wait
      const freshState = storeGet();
      const freshProj = freshState.currentProject;
      if (!freshProj) {
        pendingSceneQueue.shift();
        continue;
      }
      const freshSceneIndex = freshProj.scenes.findIndex(s => s.sceneId === sceneId);
      if (freshSceneIndex === -1) {
        pendingSceneQueue.shift();
        continue;
      }
      const freshScene = freshProj.scenes[freshSceneIndex];

      // 1. Build Continuity Prompt from Scene N-1
      let continuityPrompt = "";
      let inputImageRef: string | undefined = undefined;

      if (freshSceneIndex > 0) {
        const prevScene = freshProj.scenes[freshSceneIndex - 1];
        continuityPrompt = `Maintain cinematic continuity with Scene ${prevScene.sceneNumber}: location '${prevScene.locationId || "same location"}', matching character attire, lighting '${prevScene.lighting}', seamless progression from action '${prevScene.action}'.`;

        const potentialSource = freshScene.continuityImageRef || prevScene.continuityImageRef || prevScene.videoUrl;
        if (potentialSource) {
          freshState.updateScene(sceneId, {
            status: "VALIDATING",
            progressMessage: "Preparing & validating continuity reference asset..."
          });

          try {
            const prepResult = await prepareReferenceAsset(potentialSource, prevScene.sceneNumber);
            if (prepResult.ok && prepResult.dataUri) {
              inputImageRef = prepResult.dataUri;
              freshState.updateScene(sceneId, {
                continuityImageRef: prepResult.imageUrl || prepResult.dataUri
              });
            }
          } catch (e) {
            console.warn(`[Continuity] Error preparing reference asset:`, e);
          }
        }
      }

      // Fallback to Character Bible avatar if no scene continuity image
      if (!inputImageRef) {
        const charWithAvatar = freshProj.characterBible.find(c => freshScene.characterIds.includes(c.id) && c.referenceImage);
        if (charWithAvatar && charWithAvatar.referenceImage) {
          try {
            const charPrep = await prepareReferenceAsset(charWithAvatar.referenceImage);
            if (charPrep.ok && charPrep.dataUri) {
              inputImageRef = charPrep.dataUri;
            }
          } catch (e) {}
        }
      }

      // 2. Build full prompt combining character & world bible
      const characterDescriptors = freshProj.characterBible
        .filter(c => freshScene.characterIds.includes(c.id))
        .map(c => `Character ${c.name}: ${c.appearance}, hair ${c.hair}, wearing ${c.clothing}`)
        .join(". ");

      const worldDescriptor = freshProj.worldBible
        .find(w => w.id === freshScene.locationId)?.visualStyle || "";

      const fullPrompt = `${freshScene.visualPrompt}. Style: ${freshProj.settings.style}, Camera: ${freshScene.camera}, Lighting: ${freshScene.lighting}. ${characterDescriptors} ${worldDescriptor} ${continuityPrompt}`.trim();

      freshState.updateScene(sceneId, {
        status: "QUEUED",
        continuityPrompt,
        progressMessage: "Submitting clip to Agnes Video V2.0..."
      });

      try {
        const payload: any = {
          model: "agnes-video-v2.0",
          prompt: fullPrompt,
          duration: freshScene.durationSeconds
        };

        console.log(`[Diagnostic] StoryCreator starting scene generation. Job params:`, {
          sceneId: sceneId,
          duration: freshScene.durationSeconds,
          model: payload.model,
          prompt: fullPrompt.substring(0, 50) + "...",
        });

        if (inputImageRef) {
          payload.image = inputImageRef;
        }

        const res = await fetch("/api/agnes/videos/generations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const resText = await res.text();
        if (!res.ok) {
          throw new Error(safeExtractError(resText, res.status));
        }

        const data = JSON.parse(resText);
        const vId = data.video_id || data.id || data.task_id || `vid_${Date.now()}`;
        const tId = data.task_id || data.id || data.video_id || vId;

        // Register in global jobStore
        const jobId = useJobStore.getState().createJob({
          jobId: vId,
          videoId: vId,
          taskId: tId,
          type: "video",
          tool: "Video Studio",
          model: "agnes-video-v2.0",
          prompt: fullPrompt,
          duration: freshScene.durationSeconds,
          status: "PROCESSING",
          progress: `Processing Scene ${freshScene.sceneNumber}: ${freshScene.title}`
        });

        // Link scene to jobId
        freshState.updateScene(sceneId, {
          status: "GENERATING",
          jobId,
          videoId: vId,
          error: undefined,
          progressMessage: "Processing in Agnes background queue..."
        });

        // Enforce 63s interval before next clip dispatch to adhere to 1 req/min
        nextAllowedSceneDispatchTimestamp = Date.now() + 63000;
        pendingSceneQueue.shift();

      } catch (err: any) {
        console.error(`Failed to queue scene ${freshScene.sceneNumber}:`, err);
        const errMsg = err.message || "Generation request failed.";
        const errLower = errMsg.toLowerCase();
        const isTransientError = 
          errLower.includes("rate limit") || 
          errLower.includes("2 requests per 1 minute") || 
          errLower.includes("1 requests per 1 minute") || 
          errLower.includes("429") ||
          errLower.includes("queue is full") ||
          errLower.includes("502") ||
          errLower.includes("503") ||
          errLower.includes("504") ||
          errLower.includes("bad gateway") ||
          errLower.includes("html error response") ||
          errLower.includes("unexpected token");

        if (isTransientError && (freshScene.retries || 0) < 10) {
          const backoff = errLower.includes("queue is full") ? 60000 : 30000;
          nextAllowedSceneDispatchTimestamp = Date.now() + backoff;
          freshState.updateScene(sceneId, {
            status: "QUEUED",
            retries: (freshScene.retries || 0) + 1,
            error: undefined,
            progressMessage: `⏳ Agnes video queue busy. Retrying in ${Math.round(backoff / 1000)}s...`
          });
          // Keep in queue at index 0 to retry cleanly after countdown
        } else {
          freshState.updateScene(sceneId, {
            status: "FAILED",
            error: errMsg,
            progressMessage: "Generation failed."
          });
          pendingSceneQueue.shift();
        }
      }
    }
  } finally {
    isQueueWorkerRunning = false;
  }
}

export const useVideoStudioStore = create<VideoStudioState>()(
  persist(
    (set, get) => ({
      currentProject: null,
      savedProjects: [],
      activeTab: "text-to-video",
      selectedSceneId: null,

      setActiveTab: (tab) => set({ activeTab: tab }),
      setSelectedSceneId: (id) => set({ selectedSceneId: id }),

      createNewProject: (title, mode, targetDurationMinutes, script = "") => {
        const now = Date.now();
        const projectId = `project_${now}_${Math.random().toString(36).substring(2, 6)}`;
        
        let targetLabel = `${targetDurationMinutes} Minute${targetDurationMinutes > 1 ? "s" : ""}`;
        if (targetDurationMinutes === 0.5) targetLabel = "30 Seconds";

        const newProj: VideoProject = {
          id: projectId,
          title: title || "Untitled Production",
          mode,
          script,
          targetDurationMinutes,
          targetDurationLabel: targetLabel,
          settings: { ...DEFAULT_SETTINGS },
          characterBible: [],
          worldBible: [],
          scenes: [],
          audioTracks: [
            {
              id: "bg_music_1",
              type: "music",
              title: "Cinematic Background Score",
              url: "https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg",
              volume: 0.4,
              mute: false,
              solo: false,
              fadeInSeconds: 2,
              fadeOutSeconds: 2,
              startTimeSeconds: 0,
              durationSeconds: targetDurationMinutes * 60,
              loop: true,
              gain: 1.0,
            }
          ],
          exportConfig: { ...DEFAULT_EXPORT_CONFIG },
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          currentProject: newProj,
          savedProjects: [newProj, ...state.savedProjects.filter(p => p.id !== newProj.id)]
        }));
      },

      loadTheLastCorridorProject: () => {
        const lastCorridorProj = createTheLastCorridorProject();
        set((state) => ({
          currentProject: lastCorridorProj,
          savedProjects: [lastCorridorProj, ...state.savedProjects.filter(p => p.id !== lastCorridorProj.id)]
        }));
      },

      loadProject: (projectId) => {
        const proj = get().savedProjects.find(p => p.id === projectId);
        if (proj) {
          set({ currentProject: proj });
        }
      },

      deleteProject: (projectId) => {
        set((state) => ({
          savedProjects: state.savedProjects.filter(p => p.id !== projectId),
          currentProject: state.currentProject?.id === projectId ? null : state.currentProject
        }));
      },

      updateProjectSettings: (settings) => {
        set((state) => {
          if (!state.currentProject) return state;
          const updated = {
            ...state.currentProject,
            settings: { ...state.currentProject.settings, ...settings },
            updatedAt: Date.now()
          };
          return {
            currentProject: updated,
            savedProjects: state.savedProjects.map(p => p.id === updated.id ? updated : p)
          };
        });
      },

      // CHARACTER BIBLE
      addCharacter: (characterData) => {
        set((state) => {
          if (!state.currentProject) return state;
          const charId = `char_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
          const newChar: CharacterProfile = { id: charId, ...characterData };
          const updated = {
            ...state.currentProject,
            characterBible: [...state.currentProject.characterBible, newChar],
            updatedAt: Date.now()
          };

          // Synchronize with AI Memory Manager
          aiCore.memoryManager.saveCharacter({
            id: charId,
            characterId: charId,
            projectId: state.currentProject.id,
            name: newChar.name,
            appearance: newChar.appearance,
            ageRange: newChar.ageRange,
            hair: newChar.hair,
            eyes: newChar.eyes,
            clothing: newChar.clothing,
            personality: newChar.personality,
            voice: newChar.voice,
            referenceImage: newChar.referenceImage,
            visualAnchor: newChar.clothing || newChar.appearance,
          });

          return {
            currentProject: updated,
            savedProjects: state.savedProjects.map(p => p.id === updated.id ? updated : p)
          };
        });
      },

      updateCharacter: (id, updates) => {
        set((state) => {
          if (!state.currentProject) return state;
          const updatedBible = state.currentProject.characterBible.map(c => 
            c.id === id ? { ...c, ...updates } : c
          );
          const updated = {
            ...state.currentProject,
            characterBible: updatedBible,
            updatedAt: Date.now()
          };

          const targetChar = updatedBible.find(c => c.id === id);
          if (targetChar) {
            aiCore.memoryManager.saveCharacter({
              id: targetChar.id,
              characterId: targetChar.id,
              projectId: state.currentProject.id,
              name: targetChar.name,
              appearance: targetChar.appearance,
              ageRange: targetChar.ageRange,
              hair: targetChar.hair,
              eyes: targetChar.eyes,
              clothing: targetChar.clothing,
              personality: targetChar.personality,
              voice: targetChar.voice,
              referenceImage: targetChar.referenceImage,
              visualAnchor: targetChar.clothing || targetChar.appearance,
            });
          }

          return {
            currentProject: updated,
            savedProjects: state.savedProjects.map(p => p.id === updated.id ? updated : p)
          };
        });
      },

      removeCharacter: (id) => {
        set((state) => {
          if (!state.currentProject) return state;
          aiCore.memoryManager.deleteCharacter(id);
          const updated = {
            ...state.currentProject,
            characterBible: state.currentProject.characterBible.filter(c => c.id !== id),
            updatedAt: Date.now()
          };
          return {
            currentProject: updated,
            savedProjects: state.savedProjects.map(p => p.id === updated.id ? updated : p)
          };
        });
      },

      generateCharacterAvatar: async (characterId) => {
        const proj = get().currentProject;
        if (!proj) return;
        const char = proj.characterBible.find(c => c.id === characterId);
        if (!char) return;

        get().updateCharacter(characterId, { isGeneratingImage: true });

        try {
          const prompt = `Full body portrait character concept art of ${char.name}, ${char.ageRange}, ${char.appearance}. Hair: ${char.hair}, Eyes: ${char.eyes}, Skin tone: ${char.skinTone}, Wearing: ${char.clothing}, Accessories: ${char.accessories}. Photorealistic cinematic character lighting, studio background, high details.`;
          
          const res = await fetch("/api/agnes/images/generations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "agnes-image-2.1-flash",
              prompt,
            }),
          });

          const resText = await res.text();
          if (!res.ok) throw new Error(safeExtractError(resText, res.status));

          const data = JSON.parse(resText);
          let imageUrl = "";
          if (data.data && data.data[0] && data.data[0].url) {
            imageUrl = data.data[0].url;
          }

          if (imageUrl) {
            get().updateCharacter(characterId, { referenceImage: imageUrl, isGeneratingImage: false });
          } else {
            throw new Error("No image URL returned from Agnes API");
          }
        } catch (err: any) {
          console.error("Failed to generate character avatar:", err);
          get().updateCharacter(characterId, { isGeneratingImage: false });
        }
      },

      // WORLD BIBLE
      addWorldProfile: (worldData) => {
        set((state) => {
          if (!state.currentProject) return state;
          const worldId = `world_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
          const newWorld: WorldProfile = { id: worldId, ...worldData };
          const updated = {
            ...state.currentProject,
            worldBible: [...state.currentProject.worldBible, newWorld],
            updatedAt: Date.now()
          };

          // Synchronize with AI Memory Manager
          aiCore.memoryManager.saveWorld({
            id: worldId,
            worldId: worldId,
            projectId: state.currentProject.id,
            location: newWorld.location,
            architecture: newWorld.architecture,
            timePeriod: newWorld.timePeriod,
            weather: newWorld.weather,
            lighting: newWorld.lighting,
            colorPalette: newWorld.colorPalette,
            environment: newWorld.environment,
            importantObjects: newWorld.importantObjects,
            visualStyle: newWorld.visualStyle,
            referenceImage: newWorld.referenceImage,
          });

          return {
            currentProject: updated,
            savedProjects: state.savedProjects.map(p => p.id === updated.id ? updated : p)
          };
        });
      },

      updateWorldProfile: (id, updates) => {
        set((state) => {
          if (!state.currentProject) return state;
          const updatedBible = state.currentProject.worldBible.map(w => 
            w.id === id ? { ...w, ...updates } : w
          );
          const updated = {
            ...state.currentProject,
            worldBible: updatedBible,
            updatedAt: Date.now()
          };

          const targetWorld = updatedBible.find(w => w.id === id);
          if (targetWorld) {
            aiCore.memoryManager.saveWorld({
              id: targetWorld.id,
              worldId: targetWorld.id,
              projectId: state.currentProject.id,
              location: targetWorld.location,
              architecture: targetWorld.architecture,
              timePeriod: targetWorld.timePeriod,
              weather: targetWorld.weather,
              lighting: targetWorld.lighting,
              colorPalette: targetWorld.colorPalette,
              environment: targetWorld.environment,
              importantObjects: targetWorld.importantObjects,
              visualStyle: targetWorld.visualStyle,
              referenceImage: targetWorld.referenceImage,
            });
          }

          return {
            currentProject: updated,
            savedProjects: state.savedProjects.map(p => p.id === updated.id ? updated : p)
          };
        });
      },

      removeWorldProfile: (id) => {
        set((state) => {
          if (!state.currentProject) return state;
          aiCore.memoryManager.deleteWorld(id);
          const updated = {
            ...state.currentProject,
            worldBible: state.currentProject.worldBible.filter(w => w.id !== id),
            updatedAt: Date.now()
          };
          return {
            currentProject: updated,
            savedProjects: state.savedProjects.map(p => p.id === updated.id ? updated : p)
          };
        });
      },

      // STORY → SCENE BREAKDOWN
      generateScenesFromScript: async (scriptText, targetDurationMinutes) => {
        const proj = get().currentProject;
        if (!proj) return;

        // Create a job in jobStore to track analysis
        const jobId = useJobStore.getState().createJob({
          projectId: proj.id,
          type: "analysis",
          tool: "Video Studio",
          model: "agnes-2.5-flash",
          prompt: "Analyze script and breakdown into scenes",
          status: "PROCESSING",
          progress: "Analyzing script structure..."
        });

        try {
          const totalSeconds = targetDurationMinutes * 60;
          const approxSceneCount = Math.max(3, Math.min(30, Math.ceil(totalSeconds / 6)));

          const systemPrompt = `You are an expert Hollywood AI Director & Screenwriter for XKIRA Video Production Studio.
Break down the user's script/story into EXACTLY ${approxSceneCount} sequential scenes that total approximately ${totalSeconds} seconds (${targetDurationMinutes} minutes).

Return a JSON array of scene objects strictly in the following JSON format without Markdown formatting or surrounding backticks:
[
  {
    "sceneNumber": 1,
    "title": "Scene Title",
    "durationSeconds": 5,
    "action": "Detailed description of action in scene",
    "dialogue": "Character dialogue if applicable or null",
    "camera": "Cinematic camera movement (e.g. Dolly In, Pan Left, Tracking)",
    "lighting": "Lighting setup (e.g. Golden Hour, Neon, Low Key)",
    "soundCue": "Sound effect cue",
    "musicCue": "Music tone cue",
    "visualPrompt": "A highly detailed, cinematic prompt for Agnes Video V2.0 generator describing the visual subject, environment, lighting, camera angle, motion, and style."
  }
]`;

          let parsedScenes: any[] = [];

          const res = await fetch("/api/agnes/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "agnes-2.5-flash",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Story/Script to break down:\n\n${scriptText}` }
              ]
            })
          });

          const resText = await res.text();
          if (!res.ok) throw new Error(safeExtractError(resText, res.status));

          const data = JSON.parse(resText);
          const rawContent = data.choices?.[0]?.message?.content || "";
          const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            parsedScenes = JSON.parse(jsonMatch[0]);
          }

          if (!parsedScenes || parsedScenes.length === 0) {
            parsedScenes = parseScriptLocally(scriptText, approxSceneCount, totalSeconds);
          }

          const newScenes: Scene[] = parsedScenes.map((s: any, idx: number) => ({
            sceneId: `scene_${Date.now()}_${idx + 1}`,
            sceneNumber: idx + 1,
            title: s.title || `Scene ${idx + 1}`,
            durationSeconds: s.durationSeconds || Math.max(4, Math.round(totalSeconds / approxSceneCount)),
            characterIds: [],
            action: s.action || "",
            dialogue: s.dialogue || undefined,
            camera: s.camera || proj.settings.camera,
            lighting: s.lighting || proj.settings.lighting,
            soundCue: s.soundCue || undefined,
            musicCue: s.musicCue || undefined,
            visualPrompt: s.visualPrompt || `Cinematic scene ${idx + 1}: ${s.action || scriptText}`,
            negativePrompt: "blurry, low resolution, distorted faces, artifacting, text watermark",
            status: "IDLE",
            retries: 0,
          }));

          // Final check: did user cancel while we were waiting?
          const currentJob = useJobStore.getState().jobs[jobId];
          if (currentJob?.status === 'CANCELLED') return;

          set((state) => {
            if (!state.currentProject) return state;
            const updated = {
              ...state.currentProject,
              script: scriptText,
              scenes: newScenes,
              updatedAt: Date.now()
            };
            return {
              currentProject: updated,
              savedProjects: state.savedProjects.map(p => p.id === updated.id ? updated : p)
            };
          });

          useJobStore.getState().updateJob(jobId, { status: 'COMPLETED', progress: 'Analysis complete.' });

        } catch (err: any) {
          console.error("Script breakdown failed:", err);
          useJobStore.getState().updateJob(jobId, { status: 'FAILED', error: err.message || "Failed to analyze script." });
        }
      },

      cancelScriptAnalysis: () => {
        const jobs = useJobStore.getState().jobs;
        const activeAnalysisJob = Object.values(jobs).find(j => 
          j.type === 'analysis' && 
          j.status === 'PROCESSING' && 
          j.projectId === get().currentProject?.id
        );
        if (activeAnalysisJob) {
          useJobStore.getState().cancelJob(activeAnalysisJob.jobId);
        }
      },

      addScene: (sceneData) => {
        set((state) => {
          if (!state.currentProject) return state;
          const nextNumber = state.currentProject.scenes.length + 1;
          const sceneId = `scene_${Date.now()}_${nextNumber}`;
          const newScene: Scene = {
            sceneId,
            sceneNumber: nextNumber,
            status: "IDLE",
            retries: 0,
            ...sceneData
          };
          const updated = {
            ...state.currentProject,
            scenes: [...state.currentProject.scenes, newScene],
            updatedAt: Date.now()
          };
          return {
            currentProject: updated,
            savedProjects: state.savedProjects.map(p => p.id === updated.id ? updated : p)
          };
        });
      },

      updateScene: (sceneId, updates) => {
        set((state) => {
          if (!state.currentProject) return state;
          const updatedScenes = state.currentProject.scenes.map(s => 
            s.sceneId === sceneId ? { ...s, ...updates } : s
          );
          const updated = {
            ...state.currentProject,
            scenes: updatedScenes,
            updatedAt: Date.now()
          };
          return {
            currentProject: updated,
            savedProjects: state.savedProjects.map(p => p.id === updated.id ? updated : p)
          };
        });
      },

      deleteScene: (sceneId) => {
        set((state) => {
          if (!state.currentProject) return state;
          const filtered = state.currentProject.scenes
            .filter(s => s.sceneId !== sceneId)
            .map((s, idx) => ({ ...s, sceneNumber: idx + 1 }));
          const updated = {
            ...state.currentProject,
            scenes: filtered,
            updatedAt: Date.now()
          };
          return {
            currentProject: updated,
            savedProjects: state.savedProjects.map(p => p.id === updated.id ? updated : p)
          };
        });
      },

      reorderScenes: (fromIndex, toIndex) => {
        set((state) => {
          if (!state.currentProject) return state;
          const scenes = [...state.currentProject.scenes];
          const [moved] = scenes.splice(fromIndex, 1);
          scenes.splice(toIndex, 0, moved);

          const reordered = scenes.map((s, idx) => ({ ...s, sceneNumber: idx + 1 }));
          const updated = {
            ...state.currentProject,
            scenes: reordered,
            updatedAt: Date.now()
          };
          return {
            currentProject: updated,
            savedProjects: state.savedProjects.map(p => p.id === updated.id ? updated : p)
          };
        });
      },

      duplicateScene: (sceneId) => {
        const proj = get().currentProject;
        if (!proj) return;
        const targetIdx = proj.scenes.findIndex(s => s.sceneId === sceneId);
        if (targetIdx === -1) return;

        const target = proj.scenes[targetIdx];
        const newSceneId = `scene_${Date.now()}_dup`;
        const dupScene: Scene = {
          ...target,
          sceneId: newSceneId,
          title: `${target.title} (Copy)`,
          status: "IDLE",
          videoUrl: undefined,
          videoId: undefined,
          jobId: undefined,
          retries: 0,
        };

        const newScenes = [...proj.scenes];
        newScenes.splice(targetIdx + 1, 0, dupScene);
        const renumbered = newScenes.map((s, idx) => ({ ...s, sceneNumber: idx + 1 }));

        set((state) => {
          if (!state.currentProject) return state;
          const updated = {
            ...state.currentProject,
            scenes: renumbered,
            updatedAt: Date.now()
          };
          return {
            currentProject: updated,
            savedProjects: state.savedProjects.map(p => p.id === updated.id ? updated : p)
          };
        });
      },

      extendScene: (sceneId, extraSeconds) => {
        const proj = get().currentProject;
        if (!proj) return;
        const target = proj.scenes.find(s => s.sceneId === sceneId);
        if (!target) return;

        get().updateScene(sceneId, {
          durationSeconds: Math.min(30, target.durationSeconds + extraSeconds)
        });
      },

      // GENERATION & CONTINUITY ENGINE
      queueSceneGeneration: async (sceneId) => {
        const proj = get().currentProject;
        if (!proj) return;
        const sceneIndex = proj.scenes.findIndex(s => s.sceneId === sceneId);
        if (sceneIndex === -1) return;

        if (!pendingSceneQueue.includes(sceneId)) {
          pendingSceneQueue.push(sceneId);
        }

        get().updateScene(sceneId, {
          status: "QUEUED",
          error: undefined,
          progressMessage: "⏳ In production queue..."
        });

        runSceneQueueWorker(get);
      },

      queueAllScenesGeneration: async () => {
        const proj = get().currentProject;
        if (!proj) return;

        for (const scene of proj.scenes) {
          if (scene.status !== "READY") {
            if (!pendingSceneQueue.includes(scene.sceneId)) {
              pendingSceneQueue.push(scene.sceneId);
            }
            get().updateScene(scene.sceneId, {
              status: "QUEUED",
              error: undefined,
              progressMessage: "⏳ Queued in production queue..."
            });
          }
        }

        runSceneQueueWorker(get);
      },

      retryFailedScene: async (sceneId) => {
        const proj = get().currentProject;
        if (!proj) return;
        const target = proj.scenes.find(s => s.sceneId === sceneId);
        if (!target) return;

        get().updateScene(sceneId, {
          status: "QUEUED",
          retries: (target.retries || 0) + 1,
          error: undefined,
          progressMessage: "⏳ Queued for retry..."
        });

        if (!pendingSceneQueue.includes(sceneId)) {
          pendingSceneQueue.push(sceneId);
        }

        runSceneQueueWorker(get);
      },

      regenerateFromScene: async (sceneIndex) => {
        const proj = get().currentProject;
        if (!proj) return;

        // Keep scenes before sceneIndex intact; reset scenes from sceneIndex onward to QUEUED
        proj.scenes.forEach((scene, idx) => {
          if (idx >= sceneIndex) {
            get().updateScene(scene.sceneId, {
              status: "QUEUED",
              videoUrl: undefined,
              videoId: undefined,
              jobId: undefined,
              error: undefined,
              progressMessage: "⏳ In queue for regeneration..."
            });
            if (!pendingSceneQueue.includes(scene.sceneId)) {
              pendingSceneQueue.push(scene.sceneId);
            }
          }
        });

        runSceneQueueWorker(get);
      },

      syncWithJobStore: () => {
        const proj = get().currentProject;
        if (!proj) return;
        const jobs = useJobStore.getState().jobs;

        let modified = false;
        const updatedScenes = proj.scenes.map(scene => {
          if (!scene.jobId) return scene;
          const job = jobs[scene.jobId];
          if (!job) return scene;

          // Prevent old project results from updating new project
          if (job.projectId && job.projectId !== proj.id) return scene;

          let newStatus = scene.status;
          let newVideoUrl = scene.videoUrl;
          let newError = scene.error;
          let newProgress = scene.progressMessage;

          if (job.status === "COMPLETED" && job.resultUrl) {
            newStatus = "READY";
            newVideoUrl = job.resultUrl;
            newProgress = "Clip generation ready!";
            modified = true;

            // Trigger background keyframe extraction for continuity
            if (!scene.continuityImageRef && job.resultUrl) {
              prepareReferenceAsset(job.resultUrl, scene.sceneNumber).then(res => {
                if (res.ok && res.imageUrl) {
                  get().updateScene(scene.sceneId, {
                    continuityImageRef: res.imageUrl
                  });
                }
              }).catch(() => {});
            }

            // Save continuity checkpoint to Cinematic Continuity Engine
            continuityEngine.saveSceneCheckpoint(proj.id, {
              checkpointId: `cp_${scene.sceneId}`,
              sceneId: scene.sceneId,
              sceneNumber: scene.sceneNumber,
              videoUrl: job.resultUrl,
              keyframeImageUrl: scene.continuityImageRef,
              characterStates: {},
              locationState: {
                locationId: scene.locationId || "",
                environment: scene.action,
                weather: "Clear",
                timeOfDay: "Night",
                lighting: scene.lighting,
              },
              audioState: {
                ambienceTheme: scene.soundCue,
                musicTrackTheme: scene.musicCue,
              },
              metadata: {
                duration: scene.durationSeconds,
                visualPrompt: scene.visualPrompt,
              }
            });
          } else if (job.status === "FAILED" || job.status === "STALE" || job.status === "EXPIRED") {
            newStatus = "FAILED";
            newError = job.error || "Generation failed.";
            newProgress = job.status === "STALE" ? "Job stale" : "Failed";
            modified = true;
          } else if (job.status === "CANCELLED") {
            newStatus = "IDLE";
            newProgress = "Cancelled";
            modified = true;
          } else if (job.status === "PROCESSING" || job.status === "QUEUED" || job.status === "STARTING") {
            newStatus = "GENERATING";
            newProgress = job.progress || "Processing clip...";
          }

          if (newStatus !== scene.status || newVideoUrl !== scene.videoUrl || newError !== scene.error || newProgress !== scene.progressMessage) {
            modified = true;
            return {
              ...scene,
              status: newStatus,
              videoUrl: newVideoUrl,
              error: newError,
              progressMessage: newProgress
            };
          }
          return scene;
        });

        if (modified) {
          set((state) => {
            if (!state.currentProject) return state;
            const updated = { ...state.currentProject, scenes: updatedScenes, updatedAt: Date.now() };
            return {
              currentProject: updated,
              savedProjects: state.savedProjects.map(p => p.id === updated.id ? updated : p)
            };
          });
        }
      },

      // AUDIO TRACKS
      addAudioTrack: (trackData) => {
        set((state) => {
          if (!state.currentProject) return state;
          const trackId = `track_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
          const newTrack: AudioTrack = { id: trackId, ...trackData };
          const updated = {
            ...state.currentProject,
            audioTracks: [...state.currentProject.audioTracks, newTrack],
            updatedAt: Date.now()
          };
          return {
            currentProject: updated,
            savedProjects: state.savedProjects.map(p => p.id === updated.id ? updated : p)
          };
        });
      },

      updateAudioTrack: (id, updates) => {
        set((state) => {
          if (!state.currentProject) return state;
          const updatedTracks = state.currentProject.audioTracks.map(t => 
            t.id === id ? { ...t, ...updates } : t
          );
          const updated = {
            ...state.currentProject,
            audioTracks: updatedTracks,
            updatedAt: Date.now()
          };
          return {
            currentProject: updated,
            savedProjects: state.savedProjects.map(p => p.id === updated.id ? updated : p)
          };
        });
      },

      removeAudioTrack: (id) => {
        set((state) => {
          if (!state.currentProject) return state;
          const updated = {
            ...state.currentProject,
            audioTracks: state.currentProject.audioTracks.filter(t => t.id !== id),
            updatedAt: Date.now()
          };
          return {
            currentProject: updated,
            savedProjects: state.savedProjects.map(p => p.id === updated.id ? updated : p)
          };
        });
      },

      // STITCHING & EXPORT
      updateExportConfig: (config) => {
        set((state) => {
          if (!state.currentProject) return state;
          const updated = {
            ...state.currentProject,
            exportConfig: { ...state.currentProject.exportConfig, ...config },
            updatedAt: Date.now()
          };
          return {
            currentProject: updated,
            savedProjects: state.savedProjects.map(p => p.id === updated.id ? updated : p)
          };
        });
      },

      stitchMasterVideo: async () => {
        const proj = get().currentProject;
        if (!proj) return;

        // Collect completed scene video URLs
        const completedClips = proj.scenes
          .filter(s => s.status === "READY" && s.videoUrl)
          .map(s => s.videoUrl!);

        if (completedClips.length === 0) {
          throw new Error("No completed scene clips available to stitch.");
        }

        set((state) => {
          if (!state.currentProject) return state;
          const updated = {
            ...state.currentProject,
            stitchingStatus: "STITCHING" as const,
            stitchingProgress: "Downloading clips and encoding master video with FFmpeg...",
            stitchingError: undefined
          };
          return {
            currentProject: updated,
            savedProjects: state.savedProjects.map(p => p.id === updated.id ? updated : p)
          };
        });

        try {
          const res = await fetch("/api/videos/stitch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clips: completedClips,
              audioTracks: proj.audioTracks,
              resolution: proj.exportConfig.resolution,
              fps: proj.exportConfig.fps,
              transition: proj.exportConfig.transition,
            })
          });

          const resText = await res.text();
          if (!res.ok) throw new Error(safeExtractError(resText, res.status));

          const data = JSON.parse(resText);
          if (!data.url) throw new Error("Stitching failed to return output video URL.");

          set((state) => {
            if (!state.currentProject) return state;
            const updated = {
              ...state.currentProject,
              masterVideoUrl: data.url,
              stitchingStatus: "COMPLETED" as const,
              stitchingProgress: "Master video compilation complete!",
              updatedAt: Date.now()
            };
            return {
              currentProject: updated,
              savedProjects: state.savedProjects.map(p => p.id === updated.id ? updated : p)
            };
          });

        } catch (err: any) {
          console.error("Stitching error:", err);
          set((state) => {
            if (!state.currentProject) return state;
            const updated = {
              ...state.currentProject,
              stitchingStatus: "FAILED" as const,
              stitchingError: err.message || "Failed to stitch video.",
              stitchingProgress: "Failed"
            };
            return {
              currentProject: updated,
              savedProjects: state.savedProjects.map(p => p.id === updated.id ? updated : p)
            };
          });
        }
      }
    }),
    {
      name: "xkira-video-studio-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
