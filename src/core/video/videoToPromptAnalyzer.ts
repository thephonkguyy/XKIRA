/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VideoToPromptResult } from "./types";
import { safeParseApiResponse } from "../../lib/safeResponseParser";

export class VideoToPromptAnalyzer {
  /**
   * Reconstructs a structured cinematic prompt and technical analysis from video descriptions or metadata.
   */
  public async analyzeVideoToPrompt(
    videoDescriptionOrUrl: string,
    providedContext?: string
  ): Promise<VideoToPromptResult> {
    try {
      const res = await fetch("/api/agnes/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "agnes-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are an expert AI Cinematographer and Director of Photography for XKIRA Video Intelligence Engine.
Analyze the video input description/metadata and reverse-engineer a full cinematic production breakdown.
Strictly return a JSON object without markdown fences:
{
  "sceneSummary": "Concise summary of the scene",
  "subject": "Core subject description",
  "action": "Physical action and dynamics occurring",
  "characters": ["character details"],
  "environment": "Location and set design",
  "cameraMovement": "Camera motion (e.g. Steadicam tracking, slow crane down)",
  "lensType": "Focal length (e.g. 35mm prime, Anamorphic)",
  "lighting": "Lighting scheme (e.g. High contrast low-key moonlight with cold rim)",
  "visualStyle": "Color grade and visual aesthetic",
  "atmosphere": "Environmental elements (e.g. wet reflections, smoke haze)",
  "extractedPrompt": "A single, highly detailed, photorealistic prompt suitable for video re-generation",
  "audioObservations": "Audio / soundscape design recommendations"
}`
            },
            {
              role: "user",
              content: `Video Context/Description:\n${videoDescriptionOrUrl}\n${providedContext ? `Additional Context: ${providedContext}` : ""}`
            }
          ]
        })
      });

      const parsed = await safeParseApiResponse(res, "Failed to analyze video prompt");
      if (parsed.success && parsed.data?.choices?.[0]?.message?.content) {
        const text = parsed.data.choices[0].message.content;
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          const data = JSON.parse(match[0]);
          return {
            sceneSummary: data.sceneSummary || "Cinematic video scene",
            subject: data.subject || "Scene subject",
            action: data.action || "Dynamic scene action",
            characters: Array.isArray(data.characters) ? data.characters : [],
            environment: data.environment || "Cinematic location",
            cameraMovement: data.cameraMovement || "Cinematic tracking shot",
            lensType: data.lensType || "35mm prime",
            lighting: data.lighting || "Dramatic volumetric lighting",
            visualStyle: data.visualStyle || "Cinematic 4K",
            atmosphere: data.atmosphere || "Atmospheric depth",
            extractedPrompt: data.extractedPrompt || `Photorealistic 4K scene: ${data.action || videoDescriptionOrUrl}. Volumetric lighting, 35mm lens, atmospheric depth.`,
            audioObservations: data.audioObservations || "Ambient spatial room tone with subtle environmental sound effects",
          };
        }
      }
    } catch (e) {
      console.warn("[VideoToPromptAnalyzer] AI analysis fallback:", e);
    }

    // Heuristic fallback
    return {
      sceneSummary: "Cinematic sequence reverse-engineered from source",
      subject: "Central visual subject",
      action: videoDescriptionOrUrl,
      characters: ["Primary protagonist"],
      environment: "Cinematic environment",
      cameraMovement: "Smooth tracking movement with subtle parallax",
      lensType: "35mm cinematic lens",
      lighting: "Volumetric cinematic lighting with rich contrast",
      visualStyle: "Photorealistic cinematic grade",
      atmosphere: "Atmospheric depth and particle diffusion",
      extractedPrompt: `Photorealistic cinematic shot: ${videoDescriptionOrUrl}. Shot on 35mm lens, volumetric lighting, rich color grade.`,
      audioObservations: "Spatial environmental ambience and synchronized foley cues",
    };
  }
}

export const videoToPromptAnalyzer = new VideoToPromptAnalyzer();
