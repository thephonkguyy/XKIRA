/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CinematicShotType =
  | "ESTABLISHING"
  | "EXTREME_WIDE"
  | "WIDE"
  | "FULL"
  | "MEDIUM"
  | "MEDIUM_CLOSEUP"
  | "CLOSEUP"
  | "EXTREME_CLOSEUP"
  | "OVER_SHOULDER"
  | "POV"
  | "LOW_ANGLE"
  | "HIGH_ANGLE"
  | "DUTCH_ANGLE"
  | "TRACKING"
  | "DOLLY"
  | "PAN"
  | "TILT"
  | "CRANE"
  | "HANDHELD"
  | "STATIC";

export type CameraLensChoice =
  | "24mm"   // Wide environmental shot
  | "35mm"   // Environmental cinematic perspective
  | "50mm"   // Natural human perspective
  | "85mm"   // Portrait / compressed background
  | "Anamorphic"; // Cinematic widescreen flare & bokeh

export type LightingPreset =
  | "moonlight"
  | "sunlight"
  | "golden hour"
  | "blue hour"
  | "neon"
  | "practical lights"
  | "candlelight"
  | "firelight"
  | "fluorescent"
  | "rim lighting"
  | "backlighting"
  | "volumetric light"
  | "fog diffusion"
  | "high contrast"
  | "soft lighting"
  | "low key"
  | "high key";

export type SceneTransitionType =
  | "CUT"
  | "FADE"
  | "DISSOLVE"
  | "MATCH_CUT"
  | "WHIP_PAN"
  | "JUMP_CUT"
  | "CONTINUOUS"
  | "CROSSFADE";

export interface CharacterContext {
  id: string;
  name: string;
  appearance: string;
  hair?: string;
  eyes?: string;
  clothing?: string;
  accessories?: string;
  bodyProportions?: string;
  ageAppearance?: string;
  physicalCondition?: string;
  personality?: string;
  visualAnchor?: string;
  referenceImage?: string;
}

export interface WorldContext {
  id: string;
  location: string;
  architecture?: string;
  timePeriod?: string;
  weather?: string;
  lighting?: string;
  colorPalette?: string;
  environment?: string;
  importantObjects?: string;
  visualStyle?: string;
  referenceImage?: string;
}

export interface AudioPlan {
  dialogue?: string;
  speakerCharacterId?: string;
  voiceStyle?: string;
  ambientSound?: string;
  soundEffects?: string[];
  musicMood?: string;
  roomTone?: string;
  silenceDurationSeconds?: number;
}

export interface StructuredVideoPlan {
  projectId: string;
  sceneId: string;
  sceneNumber: number;
  title: string;
  duration: number; // 5, 10, 15, 20, 25, 30
  aspectRatio: "16:9" | "9:16" | "1:1" | "4:3" | "21:9";
  style: string;
  characters: CharacterContext[];
  environment: string;
  location: string;
  action: string;
  emotion?: string;
  shotType: CinematicShotType;
  camera: {
    lens: CameraLensChoice;
    focalLength?: string;
    movement: string;
    angle?: string;
    height?: string;
    distance?: string;
    depthOfField?: string;
    framing?: string;
    composition?: string;
  };
  lighting: {
    preset: LightingPreset | string;
    keyLight?: string;
    fillLight?: string;
    contrast?: "low" | "medium" | "high";
    atmosphere?: string;
  };
  color: {
    palette?: string;
    grade?: string;
    saturation?: string;
  };
  weather?: string;
  timeOfDay?: string;
  audio: AudioPlan;
  continuity: {
    previousSceneId?: string;
    previousKeyframeRef?: string;
    characterLocks?: string[];
    locationLocks?: string[];
    lightingLock?: string;
    weatherLock?: string;
    timeLock?: string;
    continuityPrompt?: string;
  };
  transition: SceneTransitionType;
  optimizedPrompt: string;
  negativePrompt?: string;
  providerPayload: {
    model: string;
    prompt: string;
    duration: number;
    image?: string;
    fps?: number;
    resolution?: string;
  };
}

export interface ContinuityCheckpoint {
  checkpointId: string;
  sceneId: string;
  sceneNumber: number;
  timestamp: number;
  videoUrl?: string;
  keyframeImageUrl?: string;
  characterStates: Record<string, {
    clothing: string;
    physicalState: string;
    position: string;
  }>;
  locationState: {
    locationId: string;
    environment: string;
    weather: string;
    timeOfDay: string;
    lighting: string;
  };
  audioState: {
    ambienceTheme?: string;
    musicTrackTheme?: string;
  };
  metadata: Record<string, any>;
}

export interface VideoValidationResult {
  isValid: boolean;
  playable: boolean;
  durationActual?: number;
  durationExpected: number;
  durationAccuracyMatch: boolean;
  resolution?: string;
  fps?: number;
  hasAudioStream?: boolean;
  hasVideoStream?: boolean;
  fileSizeBytes?: number;
  url: string;
  errors: string[];
  warnings: string[];
}

export interface ImageToVideoAnalysis {
  subject: string;
  composition: string;
  environment: string;
  lighting: string;
  cameraPerspective: string;
  dominantColors: string[];
  characters: string[];
  objects: string[];
  suggestedMotion: string;
  suggestedCameraMovement: string;
  suggestedAtmosphere: string;
}

export interface VideoToPromptResult {
  sceneSummary: string;
  subject: string;
  action: string;
  characters: string[];
  environment: string;
  cameraMovement: string;
  lensType: string;
  lighting: string;
  visualStyle: string;
  atmosphere: string;
  extractedPrompt: string;
  audioObservations?: string;
}
