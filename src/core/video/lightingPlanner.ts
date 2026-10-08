/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LightingPreset } from "./types";

export interface LightingPlanRequest {
  requestedLighting?: string;
  environment?: string;
  timeOfDay?: string;
  weather?: string;
  mood?: string;
  action?: string;
  inheritedLighting?: string; // from previous scene in same location/time
  isLocationContinuous?: boolean;
}

export interface LightingPlanResult {
  preset: LightingPreset | string;
  keyLight: string;
  fillLight: string;
  contrast: "low" | "medium" | "high";
  atmosphere: string;
  promptFragment: string;
  reasoning: string;
}

export class LightingIntelligencePlanner {
  /**
   * Evaluates environment, mood, and previous scene context to plan cinematic lighting
   * while strictly enforcing continuity across sequential scenes in the same environment.
   */
  public planLighting(request: LightingPlanRequest): LightingPlanResult {
    // 1. Inherited continuity check: if same location and time, preserve previous lighting
    if (request.isLocationContinuous && request.inheritedLighting) {
      return {
        preset: request.inheritedLighting,
        keyLight: `Continuous key lighting matching established scene state: ${request.inheritedLighting}`,
        fillLight: "Subtle continuous ambient fill",
        contrast: "medium",
        atmosphere: "Consistent atmospheric density matching previous scene",
        promptFragment: `${request.inheritedLighting}, consistent environmental illumination`,
        reasoning: "Preserved exact lighting continuity from previous scene in same location and time.",
      };
    }

    const envLower = (request.environment || "").toLowerCase();
    const timeLower = (request.timeOfDay || "").toLowerCase();
    const moodLower = (request.mood || "").toLowerCase();
    const reqLightLower = (request.requestedLighting || "").toLowerCase();
    const actionLower = (request.action || "").toLowerCase();

    // 2. Explicit requested lighting match
    if (reqLightLower.includes("golden")) {
      return {
        preset: "golden hour",
        keyLight: "Warm amber sun rays skimming low across surfaces",
        fillLight: "Soft warm sky bounce",
        contrast: "medium",
        atmosphere: "Dust motes and warm atmospheric glow",
        promptFragment: "golden hour lighting, warm amber sunbeams, soft rim highlights",
        reasoning: "Explicit golden hour request applied with optical warmth.",
      };
    }

    if (reqLightLower.includes("neon") || envLower.includes("cyber") || envLower.includes("arcade")) {
      return {
        preset: "neon",
        keyLight: "Vibrant cyan and magenta neon signage illumination",
        fillLight: "Reflective specular bounce on wet surfaces",
        contrast: "high",
        atmosphere: "Atmospheric haze scattering colored light",
        promptFragment: "vivid neon illumination, high contrast shadows, specular surface reflections",
        reasoning: "Neon lighting selected for cyberpunk/urban nighttime atmosphere.",
      };
    }

    // 3. Hospital / Industrial / Fluorescent corridors
    if (
      envLower.includes("hospital") ||
      envLower.includes("corridor") ||
      envLower.includes("hallway") ||
      envLower.includes("laboratory") ||
      envLower.includes("bunker")
    ) {
      if (timeLower.includes("night") || moodLower.includes("horror") || moodLower.includes("suspense") || actionLower.includes("silhouette")) {
        return {
          preset: "fluorescent",
          keyLight: "Flickering pale cool fluorescent fixtures casting long harsh shadows",
          fillLight: "Very low ambient fill with deep dark corners",
          contrast: "high",
          atmosphere: "Cold atmospheric fog diffusion with volumetric green-cyan tint",
          promptFragment: "dim flickering fluorescent lighting, cold green-cyan volumetric shadows, high contrast low key corridor lighting",
          reasoning: "Abandoned hospital/hallway nighttime aesthetic requires eerie low-key fluorescent illumination.",
        };
      }
    }

    // 4. Night / Moonlight / Exterior
    if (timeLower.includes("night") || timeLower.includes("2 am") || timeLower.includes("midnight") || envLower.includes("night")) {
      return {
        preset: "moonlight",
        keyLight: "Cool desaturated moonlight cutting through darkness",
        fillLight: "Deep blue shadow fill",
        contrast: "high",
        atmosphere: "Volumetric night fog and subtle light beams",
        promptFragment: "cold moonlight, volumetric light beams cutting through darkness, dramatic rim lighting",
        reasoning: "Night scene requires high contrast cool moonlight with soft volumetric diffusion.",
      };
    }

    // 5. Sunset / Twilight / Blue Hour
    if (timeLower.includes("twilight") || timeLower.includes("dusk") || timeLower.includes("blue hour")) {
      return {
        preset: "blue hour",
        keyLight: "Deep royal blue twilight skylight",
        fillLight: "Warm practical window glows",
        contrast: "medium",
        atmosphere: "Soft atmospheric evening haze",
        promptFragment: "cinematic blue hour skylight, complementary warm interior practicals",
        reasoning: "Blue hour balanced with warm practicals for rich color harmony.",
      };
    }

    // 6. Candlelight / Firelight / Primitive
    if (envLower.includes("cave") || envLower.includes("dungeon") || reqLightLower.includes("candle") || reqLightLower.includes("fire")) {
      return {
        preset: "candlelight",
        keyLight: "Dynamic flickering orange flame light",
        fillLight: "Dark warm shadows",
        contrast: "high",
        atmosphere: "Smoke plumes and floating embers",
        promptFragment: "warm flickering firelight, rich amber key shadows, deep warm contrast",
        reasoning: "Firelight/candlelight selected for organic warm flicker dynamics.",
      };
    }

    // Default: Natural Cinematic Dramatic Lighting
    return {
      preset: "volumetric light",
      keyLight: "Motivated directional cinematic light source",
      fillLight: "Balanced ambient fill preserving shadow details",
      contrast: "medium",
      atmosphere: "Subtle atmospheric depth and particle diffusion",
      promptFragment: "cinematic volumetric lighting, balanced key and fill, subtle atmosphere",
      reasoning: "Balanced cinematic lighting supporting depth and visual clarity.",
    };
  }
}

export const lightingPlanner = new LightingIntelligencePlanner();
