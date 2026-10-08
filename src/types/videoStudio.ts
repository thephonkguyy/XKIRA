export type VideoMode = 
  | "text-to-video"
  | "image-to-video"
  | "multi-image"
  | "keyframe"
  | "script-to-video"
  | "story-to-video"
  | "long-form";

export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:3" | "21:9" | "Custom";
export type Resolution = "720p" | "1080p" | "2K" | "4K";
export type FrameRate = 24 | 25 | 30 | 60;
export type QualityPreset = "Draft" | "Standard" | "High" | "Ultra";

export type CameraMovement = 
  | "Static"
  | "Pan"
  | "Tilt"
  | "Dolly"
  | "Tracking"
  | "Orbit"
  | "Crane"
  | "Handheld"
  | "Drone"
  | "Cinematic";

export type MotionSpeed = "Slow" | "Normal" | "Fast" | "Dynamic";

export type VisualStyle = 
  | "Photorealistic"
  | "Cinematic"
  | "Anime"
  | "3D Render"
  | "Animation"
  | "Documentary"
  | "Commercial"
  | "Music Video"
  | "Horror"
  | "Sci-Fi"
  | "Fantasy"
  | "Cyberpunk"
  | "Custom";

export type LightingStyle = 
  | "Natural"
  | "Golden Hour"
  | "Night"
  | "Neon"
  | "Studio"
  | "Dramatic"
  | "Low Key"
  | "High Key"
  | "Volumetric";

export type CameraLens = "24mm" | "35mm" | "50mm" | "85mm" | "Anamorphic";
export type DepthOfField = "None" | "Low" | "Medium" | "Strong";

export interface VideoSettings {
  aspectRatio: AspectRatio;
  resolution: Resolution;
  fps: FrameRate;
  quality: QualityPreset;
  camera: CameraMovement;
  motion: MotionSpeed;
  style: VisualStyle;
  lighting: LightingStyle;
  lens: CameraLens;
  depthOfField: DepthOfField;
  durationSeconds: number; // e.g. 5, 10, 15 per clip
  customDurationLabel?: string;
}

export interface CharacterProfile {
  id: string;
  name: string;
  appearance: string;
  ageRange: string;
  hair: string;
  eyes: string;
  skinTone: string;
  clothing: string;
  accessories: string;
  personality: string;
  voice: string;
  referenceImage?: string;
  isGeneratingImage?: boolean;
}

export interface WorldProfile {
  id: string;
  location: string;
  architecture: string;
  timePeriod: string;
  weather: string;
  lighting: string;
  colorPalette: string;
  environment: string;
  importantObjects: string;
  visualStyle: string;
  referenceImage?: string;
}

export type SceneStatus = 
  | "IDLE"
  | "QUEUED"
  | "GENERATING"
  | "PROCESSING"
  | "DOWNLOADING"
  | "VALIDATING"
  | "READY"
  | "FAILED"
  | "RETRYING"
  | "CANCELLED";

export interface Scene {
  sceneId: string;
  sceneNumber: number;
  title: string;
  durationSeconds: number;
  characterIds: string[];
  locationId?: string;
  action: string;
  dialogue?: string;
  speakerCharacterId?: string;
  camera: CameraMovement;
  lighting: LightingStyle;
  soundCue?: string;
  musicCue?: string;
  visualPrompt: string;
  negativePrompt?: string;
  continuityPrompt?: string;
  continuityImageRef?: string;
  status: SceneStatus;
  progressMessage?: string;
  videoUrl?: string;
  videoId?: string;
  jobId?: string;
  retries: number;
  error?: string;
}

export type AudioTrackType = "dialogue" | "voiceover" | "music" | "sfx" | "ambience";

export interface AudioTrack {
  id: string;
  type: AudioTrackType;
  title: string;
  url: string;
  volume: number; // 0 to 1
  mute: boolean;
  solo: boolean;
  fadeInSeconds: number;
  fadeOutSeconds: number;
  startTimeSeconds: number;
  durationSeconds: number;
  loop: boolean;
  gain: number; // multiplier e.g. 1.0
  characterId?: string;
}

export type ExportPreset = "Social" | "YouTube" | "Cinema" | "Mobile" | "Custom";

export interface ExportConfig {
  preset: ExportPreset;
  resolution: Resolution;
  fps: FrameRate;
  bitrateKbps: number;
  audioBitrateKbps: number;
  codec: "h264" | "hevc" | "vp9";
  transition: "cut" | "fade" | "crossfade" | "dissolve";
  transitionDurationSeconds: number;
}

export interface VideoProject {
  id: string;
  title: string;
  mode: VideoMode;
  script: string;
  targetDurationMinutes: number; // 0.5, 1, 2, 5, 10, 20, 30, custom
  targetDurationLabel: string;
  settings: VideoSettings;
  characterBible: CharacterProfile[];
  worldBible: WorldProfile[];
  scenes: Scene[];
  audioTracks: AudioTrack[];
  exportConfig: ExportConfig;
  masterVideoUrl?: string;
  stitchingStatus?: "IDLE" | "STITCHING" | "COMPLETED" | "FAILED";
  stitchingProgress?: string;
  stitchingError?: string;
  createdAt: number;
  updatedAt: number;
}
