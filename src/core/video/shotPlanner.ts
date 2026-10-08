/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CinematicShotType } from "./types";

export interface ShotPlanRequest {
  action: string;
  emotion?: string;
  isFirstScene?: boolean;
  isClimaxScene?: boolean;
  sceneIndex?: number;
  totalScenes?: number;
  characterCount?: number;
  environmentType?: string;
}

export interface ShotPlanResult {
  shotType: CinematicShotType;
  framingDescription: string;
  compositionGuide: string;
  reasoning: string;
}

export class CinematicShotPlanner {
  /**
   * Automatically determines the most appropriate cinematic shot type and framing
   * based on narrative pacing, emotional intensity, and physical action.
   */
  public planShot(request: ShotPlanRequest): ShotPlanResult {
    const actionLower = (request.action || "").toLowerCase();
    const emotionLower = (request.emotion || "").toLowerCase();

    // 1. First Scene / Establishing shots
    if (request.isFirstScene || actionLower.includes("establishing") || actionLower.includes("skyline") || actionLower.includes("landscape") || actionLower.includes("overview")) {
      return {
        shotType: "ESTABLISHING",
        framingDescription: "Wide panoramic establishing perspective capturing environmental geography and atmosphere.",
        compositionGuide: "Rule-of-thirds horizon balance with deep field background layers.",
        reasoning: "First scenes and spatial introductions benefit from establishing shot geometry.",
      };
    }

    // 2. High Emotion / Intense Intimacy / Revelations
    if (
      emotionLower.includes("fear") ||
      emotionLower.includes("shock") ||
      emotionLower.includes("intense") ||
      emotionLower.includes("crying") ||
      actionLower.includes("eyes widen") ||
      actionLower.includes("whispers") ||
      actionLower.includes("tears")
    ) {
      return {
        shotType: "CLOSEUP",
        framingDescription: "Tight dramatic closeup focusing on character facial nuance and micro-expressions.",
        compositionGuide: "Centered eye-line framing with soft background bokeh blur.",
        reasoning: "High emotional stakes require intimate closeup to convey micro-expressions.",
      };
    }

    // 3. Movement / Tracking / Walking / Running
    if (
      actionLower.includes("walks") ||
      actionLower.includes("runs") ||
      actionLower.includes("navigates") ||
      actionLower.includes("chases") ||
      actionLower.includes("moves through") ||
      actionLower.includes("wanders")
    ) {
      return {
        shotType: "TRACKING",
        framingDescription: "Smooth tracking shot moving synchronously with character locomotion.",
        compositionGuide: "Lead-room framing in direction of movement with dynamic depth parallax.",
        reasoning: "Character locomotion is best communicated with steady tracking camera movement.",
      };
    }

    // 4. Mystery / Approaching Suspense / Silhouette
    if (
      actionLower.includes("silhouette") ||
      actionLower.includes("shadow") ||
      actionLower.includes("approaches") ||
      actionLower.includes("distance") ||
      actionLower.includes("lurking")
    ) {
      return {
        shotType: "MEDIUM",
        framingDescription: "Atmospheric medium shot balancing subject positioning with looming background mystery.",
        compositionGuide: "Negative space framing with high silhouette contrast.",
        reasoning: "Suspense moments require medium framing so environmental threats and subject reactions are both visible.",
      };
    }

    // 5. Tension / Power Dynamics
    if (actionLower.includes("menacing") || actionLower.includes("imposing") || actionLower.includes("giant")) {
      return {
        shotType: "LOW_ANGLE",
        framingDescription: "Low-angle heroic/imposing angle looking upwards at the subject.",
        compositionGuide: "Upward triangular vanishing lines conveying dominance.",
        reasoning: "Low angles magnify scale and psychological authority.",
      };
    }

    if (actionLower.includes("vulnerable") || actionLower.includes("trapped") || actionLower.includes("small")) {
      return {
        shotType: "HIGH_ANGLE",
        framingDescription: "High-angle perspective gazing downward upon the subject.",
        compositionGuide: "Top-down compression emphasizing vulnerability within the scene.",
        reasoning: "High angles emphasize isolation and emotional vulnerability.",
      };
    }

    // 6. Dialogue / Confrontation between two characters
    if ((request.characterCount || 0) >= 2 || actionLower.includes("confronts") || actionLower.includes("talks to")) {
      return {
        shotType: "OVER_SHOULDER",
        framingDescription: "Over-the-shoulder conversational framing establishing depth and spatial relationship.",
        compositionGuide: "Foreground shoulder framing the opposite subject's eyes and reactions.",
        reasoning: "Inter-character dialogue is enhanced by classic over-the-shoulder spatial grounding.",
      };
    }

    // Default: Cinematic Medium Shot
    return {
      shotType: "MEDIUM",
      framingDescription: "Balanced cinematic medium shot framing torso to head with visible immediate surroundings.",
      compositionGuide: "Golden ratio composition with natural depth layers.",
      reasoning: "Versatile foundational framing for general narrative actions.",
    };
  }
}

export const cinematicShotPlanner = new CinematicShotPlanner();
