/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { videoPlanner, VideoPlanRequest } from "./videoPlanner";
import { cinematicShotPlanner } from "./shotPlanner";
import { cameraPlanner } from "./cameraPlanner";
import { lightingPlanner } from "./lightingPlanner";
import { continuityEngine } from "./continuityEngine";
import { videoPromptOptimizer } from "./videoPromptOptimizer";
import { imageToVideoAnalyzer } from "./imageToVideoAnalyzer";
import { videoToPromptAnalyzer } from "./videoToPromptAnalyzer";
import { audioPlanner } from "./audioPlanner";
import { videoValidator } from "./videoValidator";
import { createTheLastCorridorProject } from "./testProject";
import { StructuredVideoPlan, VideoValidationResult } from "./types";
import { aiCore } from "../ai/aiCore";
import { useJobStore } from "../../store/jobStore";

export class CinematicVideoIntelligenceEngine {
  public planner = videoPlanner;
  public shotPlanner = cinematicShotPlanner;
  public camera = cameraPlanner;
  public lighting = lightingPlanner;
  public continuity = continuityEngine;
  public promptOptimizer = videoPromptOptimizer;
  public imageToVideo = imageToVideoAnalyzer;
  public videoToPrompt = videoToPromptAnalyzer;
  public audio = audioPlanner;
  public validator = videoValidator;

  /**
   * Complete End-to-End Cinematic Video Execution Flow:
   * USER IDEA
   * ↓
   * AGNES AI CORE
   * ↓
   * INTENT UNDERSTANDING
   * ↓
   * VIDEO PLANNER
   * ↓
   * SCRIPT / SCENE ANALYSIS
   * ↓
   * CHARACTER + WORLD CONTEXT
   * ↓
   * SHOT PLANNER
   * ↓
   * CAMERA PLANNER
   * ↓
   * LIGHTING PLANNER
   * ↓
   * MOTION PLANNER
   * ↓
   * AUDIO PLAN
   * ↓
   * CONTINUITY ENGINE
   * ↓
   * PROMPT OPTIMIZER
   * ↓
   * EXISTING AGNES VIDEO GENERATOR
   * ↓
   * BACKGROUND JOB
   * ↓
   * VALIDATION
   * ↓
   * GENERATION CENTER
   * ↓
   * FINAL VIDEO
   */
  public async planAndDispatchScene(
    request: VideoPlanRequest,
    onProgress?: (msg: string) => void
  ): Promise<{
    plan: StructuredVideoPlan;
    jobId: string;
    videoId: string;
  }> {
    onProgress?.("🧠 Analyzing narrative intent & scene dynamics...");

    // 1. Compile structured internal video plan
    const plan = this.planner.planVideoScene(request);

    onProgress?.("🎬 Planning optics, lighting continuity & camera motion...");

    // 2. Dispatch to Agnes Video generator via existing AI Core backend proxy
    onProgress?.("🚀 Submitting cinematic generation payload to Agnes Video V2.0...");

    const mappedRes: "1280x720" | "720x1280" | "1920x1080" = 
      plan.providerPayload.resolution === "1920x1080" ? "1920x1080" :
      plan.providerPayload.resolution === "720x1280" ? "720x1280" : "1280x720";

    const genRes = await aiCore.generateVideo({
      prompt: plan.optimizedPrompt,
      duration: plan.duration,
      fps: plan.providerPayload.fps || 30,
      resolution: mappedRes,
      imageUri: plan.providerPayload.image,
      projectId: plan.projectId,
      continuityPrompt: plan.continuity.continuityPrompt,
    });

    const vId = genRes.videoId;

    // 3. Register job in global JobStore
    const jobId = useJobStore.getState().createJob({
      jobId: vId,
      videoId: vId,
      taskId: vId,
      projectId: plan.projectId,
      type: "video",
      tool: "Video Studio",
      model: "agnes-video-v2.0",
      prompt: plan.optimizedPrompt,
      duration: plan.duration,
      status: "PROCESSING",
      progress: `Generating ${plan.title} (${plan.duration}s)...`,
    });

    onProgress?.("⏳ Queued in background Job Manager.");

    return { plan, jobId, videoId: vId };
  }

  /**
   * Validates a completed video asset
   */
  public async validateCompletedScene(
    videoUrl: string,
    expectedDuration: number
  ): Promise<VideoValidationResult> {
    return this.validator.validateVideoAsset(videoUrl, expectedDuration);
  }

  /**
   * Instantiates "The Last Corridor" flagship test project
   */
  public getTheLastCorridorProject() {
    return createTheLastCorridorProject();
  }
}

export const videoIntelligence = new CinematicVideoIntelligenceEngine();
