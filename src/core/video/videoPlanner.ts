/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  StructuredVideoPlan,
  CharacterContext,
  WorldContext,
  SceneTransitionType,
} from "./types";
import { cinematicShotPlanner } from "./shotPlanner";
import { cameraPlanner } from "./cameraPlanner";
import { lightingPlanner } from "./lightingPlanner";
import { audioPlanner } from "./audioPlanner";
import { continuityEngine } from "./continuityEngine";
import { videoPromptOptimizer } from "./videoPromptOptimizer";

export interface VideoPlanRequest {
  userPrompt: string;
  projectId?: string;
  sceneId?: string;
  sceneNumber?: number;
  duration?: number;
  aspectRatio?: "16:9" | "9:16" | "1:1" | "4:3" | "21:9";
  visualStyle?: string;
  requestedCamera?: string;
  requestedLighting?: string;
  requestedLens?: string;
  inputImageRef?: string;
  characterIds?: string[];
  locationId?: string;
  fallbackCharacters?: CharacterContext[];
  fallbackWorlds?: WorldContext[];
  dialogue?: string;
  previousSceneData?: {
    sceneNumber: number;
    action: string;
    location?: string;
    lighting?: string;
    weather?: string;
    keyframeUrl?: string;
    videoUrl?: string;
  };
}

export class VideoIntelligencePlanner {
  /**
   * Translates a natural language user request into a comprehensive, structured internal video plan.
   * Resolves optical choices, lighting continuity, character memory anchors, and audio cues.
   */
  public planVideoScene(request: VideoPlanRequest): StructuredVideoPlan {
    const projectId = request.projectId || `proj_${Date.now()}`;
    const sceneNumber = request.sceneNumber || 1;
    const sceneId = request.sceneId || `scene_${Date.now()}_${sceneNumber}`;
    const duration = request.duration || 5;
    const aspectRatio = request.aspectRatio || "16:9";
    const style = request.visualStyle || "Cinematic";

    // 1. Resolve Character Contexts from Memory
    const characters = continuityEngine.resolveCharacterContexts(
      projectId,
      request.characterIds || [],
      request.fallbackCharacters || []
    );

    // 2. Resolve World & Location Context from Memory
    const world = continuityEngine.resolveWorldContext(
      projectId,
      request.locationId,
      request.fallbackWorlds || []
    );

    const locationName = world?.location || "Cinematic Environment";
    const environmentDesc = world?.environment || world?.architecture || "";
    const weather = world?.weather || "Clear";
    const timeOfDay = world?.timePeriod || "Cinematic time";

    // 3. Plan Cinematic Shot
    const shotResult = cinematicShotPlanner.planShot({
      action: request.userPrompt,
      isFirstScene: sceneNumber === 1,
      sceneIndex: sceneNumber,
      characterCount: characters.length,
      environmentType: locationName,
    });

    // 4. Plan Camera & Lens Intelligence
    const cameraResult = cameraPlanner.planCamera({
      shotType: shotResult.shotType,
      style,
      environment: locationName,
      action: request.userPrompt,
      requestedLens: request.requestedLens,
      requestedMovement: request.requestedCamera,
    });

    // 5. Check Continuity with previous scene & checkpoint
    const prevCheckpoint = continuityEngine.getPreviousCheckpoint(projectId, sceneNumber);
    const continuityAudit = continuityEngine.auditSceneContinuity(
      sceneNumber,
      locationName,
      characters,
      request.requestedLighting || world?.lighting || "Dramatic",
      prevCheckpoint,
      request.previousSceneData
    );

    // 6. Plan Lighting Intelligence with Continuity Memory
    const lightingResult = lightingPlanner.planLighting({
      requestedLighting: request.requestedLighting || world?.lighting,
      environment: locationName,
      timeOfDay,
      weather,
      action: request.userPrompt,
      inheritedLighting: prevCheckpoint?.locationState.lighting || request.previousSceneData?.lighting,
      isLocationContinuous: continuityAudit.isConsistent,
    });

    // 7. Plan Audio Elements
    const audioPlan = audioPlanner.planSceneAudio(
      request.userPrompt,
      locationName,
      request.dialogue,
      characters[0]?.name,
      style
    );

    // 8. Optimize Final Provider Prompt
    const characterDescriptions = characters.map(
      (c) => `Character ${c.name}: ${c.appearance}${c.clothing ? `, wearing ${c.clothing}` : ""}`
    );

    const optimizedPrompt = videoPromptOptimizer.optimizePrompt({
      prompt: request.userPrompt,
      style,
      cameraMovement: cameraResult.movement,
      lens: cameraResult.lens,
      lighting: lightingResult.promptFragment,
      characterDescriptions,
      worldDescription: world?.visualStyle || environmentDesc,
      continuityNote: continuityAudit.correctedContinuityPrompt,
      duration,
    });

    // 9. Construct Provider Payload (Only send provider-supported parameters)
    const providerPayload: any = {
      model: "agnes-video-v2.0",
      prompt: optimizedPrompt,
      duration,
      fps: 30,
      resolution: aspectRatio === "9:16" ? "720x1280" : "1280x720",
    };

    if (request.inputImageRef || continuityAudit.recommendedKeyframeRef) {
      providerPayload.image = request.inputImageRef || continuityAudit.recommendedKeyframeRef;
    }

    return {
      projectId,
      sceneId,
      sceneNumber,
      title: `Scene ${sceneNumber}`,
      duration,
      aspectRatio,
      style,
      characters,
      environment: environmentDesc,
      location: locationName,
      action: request.userPrompt,
      shotType: shotResult.shotType,
      camera: {
        lens: cameraResult.lens,
        focalLength: cameraResult.focalLengthDescription,
        movement: cameraResult.movement,
        angle: cameraResult.angle,
        depthOfField: cameraResult.depthOfField,
        composition: shotResult.compositionGuide,
      },
      lighting: {
        preset: lightingResult.preset,
        keyLight: lightingResult.keyLight,
        fillLight: lightingResult.fillLight,
        contrast: lightingResult.contrast,
        atmosphere: lightingResult.atmosphere,
      },
      color: {
        palette: world?.colorPalette,
        grade: style,
      },
      weather,
      timeOfDay,
      audio: audioPlan,
      continuity: {
        previousSceneId: request.previousSceneData?.action,
        previousKeyframeRef: continuityAudit.recommendedKeyframeRef,
        continuityPrompt: continuityAudit.correctedContinuityPrompt,
      },
      transition: "CUT" as SceneTransitionType,
      optimizedPrompt,
      negativePrompt: "blurry, distorted faces, low resolution, artifacting, watermark, extra limbs",
      providerPayload,
    };
  }
}

export const videoPlanner = new VideoIntelligencePlanner();
