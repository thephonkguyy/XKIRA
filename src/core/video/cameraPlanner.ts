/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CameraLensChoice, CinematicShotType } from "./types";

export interface CameraPlanRequest {
  shotType: CinematicShotType;
  style?: string;
  environment?: string;
  action?: string;
  requestedLens?: string;
  requestedMovement?: string;
}

export interface CameraPlanResult {
  lens: CameraLensChoice;
  focalLengthDescription: string;
  movement: string;
  angle: string;
  depthOfField: string;
  compositionNotes: string;
  promptFragment: string;
}

export class CameraIntelligencePlanner {
  /**
   * Plans optics, focal length, depth of field, and camera trajectory.
   * Avoids blindly inserting lens buzzwords into every prompt; applies purposeful optical physics.
   */
  public planCamera(request: CameraPlanRequest): CameraPlanResult {
    const shot = request.shotType;
    const actionLower = (request.action || "").toLowerCase();
    const styleLower = (request.style || "").toLowerCase();

    // 1. Lens selection logic based on shot geometry
    let lens: CameraLensChoice = "35mm";
    let focalDesc = "35mm prime lens: classic cinematic field of view combining subject fidelity with environmental context";

    if (request.requestedLens) {
      const rl = request.requestedLens.toLowerCase();
      if (rl.includes("24")) lens = "24mm";
      else if (rl.includes("35")) lens = "35mm";
      else if (rl.includes("50")) lens = "50mm";
      else if (rl.includes("85")) lens = "85mm";
      else if (rl.includes("anamorphic")) lens = "Anamorphic";
    } else {
      switch (shot) {
        case "ESTABLISHING":
        case "EXTREME_WIDE":
        case "WIDE":
          lens = "24mm";
          focalDesc = "24mm wide angle lens: expansive environmental rendering with deep spatial perspective";
          break;
        case "CLOSEUP":
        case "EXTREME_CLOSEUP":
          lens = "85mm";
          focalDesc = "85mm telephoto portrait lens: compressed background plane with shallow depth of field";
          break;
        case "OVER_SHOULDER":
        case "MEDIUM_CLOSEUP":
          lens = "50mm";
          focalDesc = "50mm standard prime: natural human optical perspective with balanced depth falloff";
          break;
        default:
          if (styleLower.includes("cinema") || styleLower.includes("anamorphic") || styleLower.includes("film")) {
            lens = "Anamorphic";
            focalDesc = "Anamorphic cinema glass: widescreen horizontal flare and oval bokeh characteristics";
          } else {
            lens = "35mm";
            focalDesc = "35mm environmental prime: balanced cinematic perspective";
          }
      }
    }

    // 2. Camera movement logic
    let movement = request.requestedMovement || "Cinematic steady glide";
    if (!request.requestedMovement) {
      if (shot === "TRACKING" || actionLower.includes("walk") || actionLower.includes("run")) {
        movement = "Smooth forward tracking shot maintaining steady camera distance";
      } else if (actionLower.includes("stops") || actionLower.includes("stands") || actionLower.includes("looks around")) {
        movement = "Slow creeping dolly in with subtle parallax drift";
      } else if (actionLower.includes("approaches") || actionLower.includes("enters")) {
        movement = "Slow forward dolly pushing toward the subject";
      } else if (actionLower.includes("reveals") || actionLower.includes("appears")) {
        movement = "Slow pan reveal with steady elevation hold";
      } else if (shot === "CLOSEUP") {
        movement = "Subtle handheld micro-float adding organic human presence";
      } else if (shot === "ESTABLISHING") {
        movement = "Slow sweeping cinematic crane elevation";
      }
    }

    // 3. Depth of field and angles
    let dof = "Medium depth of field";
    let angle = "Eye-level cinematic angle";

    if (shot === "CLOSEUP" || shot === "EXTREME_CLOSEUP" || lens === "85mm") {
      dof = "Shallow depth of field with soft creamy background bokeh falloff";
    } else if (shot === "ESTABLISHING" || shot === "WIDE" || lens === "24mm") {
      dof = "Deep depth of field with sharp foreground and background clarity";
    }

    if (shot === "LOW_ANGLE") {
      angle = "Low camera position tilted upward at 20 degrees";
    } else if (shot === "HIGH_ANGLE") {
      angle = "High camera position tilted downward at 30 degrees";
    } else if (shot === "DUTCH_ANGLE") {
      angle = "Canting Dutch tilt angle creating psychological instability";
    }

    const compositionNotes = `${focalDesc}. ${movement}, ${angle}, ${dof}.`;
    const promptFragment = `${movement}, ${lens} lens, ${dof}`.trim();

    return {
      lens,
      focalLengthDescription: focalDesc,
      movement,
      angle,
      depthOfField: dof,
      compositionNotes,
      promptFragment,
    };
  }
}

export const cameraPlanner = new CameraIntelligencePlanner();
