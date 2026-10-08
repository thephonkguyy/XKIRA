/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CharacterContext, WorldContext, ContinuityCheckpoint, StructuredVideoPlan } from "./types";
import { aiCore } from "../ai/aiCore";

export interface ContinuityAuditResult {
  isConsistent: boolean;
  characterDiscrepancies: string[];
  worldDiscrepancies: string[];
  lightingDiscrepancies: string[];
  correctedContinuityPrompt: string;
  recommendedKeyframeRef?: string;
}

export class CinematicContinuityEngine {
  private checkpoints: Map<string, ContinuityCheckpoint[]> = new Map(); // projectId -> checkpoints

  /**
   * Saves a structured continuity checkpoint after a scene completes successfully.
   */
  public saveSceneCheckpoint(
    projectId: string,
    checkpoint: Omit<ContinuityCheckpoint, "timestamp">
  ): ContinuityCheckpoint {
    const fullCheckpoint: ContinuityCheckpoint = {
      ...checkpoint,
      timestamp: Date.now(),
    };

    const existing = this.checkpoints.get(projectId) || [];
    const filtered = existing.filter((c) => c.sceneId !== checkpoint.sceneId);
    filtered.push(fullCheckpoint);
    filtered.sort((a, b) => a.sceneNumber - b.sceneNumber);
    this.checkpoints.set(projectId, filtered);

    // Save to local storage for persistence across reloads
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(
          `xkira_checkpoints_${projectId}`,
          JSON.stringify(filtered)
        );
      }
    } catch (e) {
      console.warn("[ContinuityEngine] Failed persisting checkpoint:", e);
    }

    return fullCheckpoint;
  }

  /**
   * Retrieves all checkpoints for a project.
   */
  public getProjectCheckpoints(projectId: string): ContinuityCheckpoint[] {
    if (!this.checkpoints.has(projectId)) {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          const raw = window.localStorage.getItem(`xkira_checkpoints_${projectId}`);
          if (raw) {
            this.checkpoints.set(projectId, JSON.parse(raw));
          }
        }
      } catch (e) {}
    }
    return this.checkpoints.get(projectId) || [];
  }

  /**
   * Retrieves the latest completed scene checkpoint prior to a given scene number.
   */
  public getPreviousCheckpoint(projectId: string, beforeSceneNumber: number): ContinuityCheckpoint | null {
    const list = this.getProjectCheckpoints(projectId);
    const prior = list.filter((c) => c.sceneNumber < beforeSceneNumber).sort((a, b) => b.sceneNumber - a.sceneNumber);
    return prior[0] || null;
  }

  /**
   * Resolves character contexts from Memory Manager or explicit bibles.
   */
  public resolveCharacterContexts(
    projectId: string,
    characterIds: string[],
    fallbackBibles: CharacterContext[] = []
  ): CharacterContext[] {
    const results: CharacterContext[] = [];

    for (const charId of characterIds) {
      // 1. Try MemoryManager
      const mem = aiCore.memoryManager.getCharacter(charId);
      if (mem) {
        results.push({
          id: mem.id || mem.characterId,
          name: mem.name,
          appearance: mem.appearance,
          hair: mem.hair,
          eyes: mem.eyes,
          clothing: mem.clothing,
          personality: mem.personality,
          visualAnchor: mem.visualAnchor,
          referenceImage: mem.referenceImage,
        });
        continue;
      }

      // 2. Fallback to provided project character bible
      const fromBible = fallbackBibles.find((c) => c.id === charId);
      if (fromBible) {
        results.push(fromBible);
      }
    }

    return results;
  }

  /**
   * Resolves world/location context from Memory Manager or explicit bibles.
   */
  public resolveWorldContext(
    projectId: string,
    locationId?: string,
    fallbackBibles: WorldContext[] = []
  ): WorldContext | null {
    if (!locationId) return null;

    const mem = aiCore.memoryManager.getWorld(locationId);
    if (mem) {
      return {
        id: mem.id || mem.worldId,
        location: mem.location,
        architecture: mem.architecture,
        timePeriod: mem.timePeriod,
        weather: mem.weather,
        lighting: mem.lighting,
        colorPalette: mem.colorPalette,
        environment: mem.environment,
        importantObjects: mem.importantObjects,
        visualStyle: mem.visualStyle,
        referenceImage: mem.referenceImage,
      };
    }

    return fallbackBibles.find((w) => w.id === locationId) || null;
  }

  /**
   * Compares Scene N with Scene N-1 and previous checkpoint to detect continuity anomalies
   * and automatically synthesizes a corrective continuity prompt.
   */
  public auditSceneContinuity(
    currentSceneNumber: number,
    currentLocation: string,
    currentCharacters: CharacterContext[],
    currentLighting: string,
    previousCheckpoint: ContinuityCheckpoint | null,
    previousSceneData?: {
      sceneNumber: number;
      action: string;
      location?: string;
      lighting?: string;
      weather?: string;
      keyframeUrl?: string;
      videoUrl?: string;
    }
  ): ContinuityAuditResult {
    const characterDiscrepancies: string[] = [];
    const worldDiscrepancies: string[] = [];
    const lightingDiscrepancies: string[] = [];
    const continuityNotes: string[] = [];

    if (!previousCheckpoint && !previousSceneData) {
      // First scene or no prior context
      return {
        isConsistent: true,
        characterDiscrepancies: [],
        worldDiscrepancies: [],
        lightingDiscrepancies: [],
        correctedContinuityPrompt: "",
      };
    }

    const prevLoc = previousCheckpoint?.locationState.environment || previousSceneData?.location || "";
    const prevLight = previousCheckpoint?.locationState.lighting || previousSceneData?.lighting || "";

    // 1. World & Location continuity check
    const isSameLocation = prevLoc && currentLocation && (
      currentLocation.toLowerCase().includes(prevLoc.toLowerCase()) ||
      prevLoc.toLowerCase().includes(currentLocation.toLowerCase())
    );

    if (isSameLocation) {
      continuityNotes.push(`Maintain identical location architecture and environment from Scene ${previousSceneData?.sceneNumber || currentSceneNumber - 1}`);
      
      // Check lighting continuity in same location
      if (prevLight && currentLighting && !currentLighting.toLowerCase().includes(prevLight.toLowerCase())) {
        lightingDiscrepancies.push(`Lighting shifted from '${prevLight}' to '${currentLighting}' in same location.`);
        continuityNotes.push(`Preserve established ambient lighting (${prevLight})`);
      }
    }

    // 2. Character attire & visual anchor continuity check
    for (const char of currentCharacters) {
      const priorState = previousCheckpoint?.characterStates[char.id];
      if (priorState) {
        if (char.clothing && priorState.clothing && char.clothing !== priorState.clothing) {
          characterDiscrepancies.push(`Character ${char.name} clothing mismatch with Scene ${previousCheckpoint.sceneNumber}`);
        }
      }

      const visualAnchor = char.visualAnchor || (char.clothing ? `wearing ${char.clothing}` : "");
      if (visualAnchor) {
        continuityNotes.push(`Character ${char.name}: ${visualAnchor}, exact same facial structure and hair (${char.hair || "matching previous scene"})`);
      }
    }

    // 3. Recommended keyframe reference for image-to-video / keyframe continuity
    const recommendedKeyframe =
      previousCheckpoint?.keyframeImageUrl ||
      previousSceneData?.keyframeUrl ||
      previousCheckpoint?.videoUrl ||
      previousSceneData?.videoUrl;

    const isConsistent = characterDiscrepancies.length === 0 && lightingDiscrepancies.length === 0;

    const correctedContinuityPrompt = continuityNotes.length > 0
      ? `Cinematic continuity locked with Scene ${(previousSceneData?.sceneNumber || currentSceneNumber - 1)}: ${continuityNotes.join(". ")}.`
      : "";

    return {
      isConsistent,
      characterDiscrepancies,
      worldDiscrepancies,
      lightingDiscrepancies,
      correctedContinuityPrompt,
      recommendedKeyframeRef: recommendedKeyframe,
    };
  }
}

export const continuityEngine = new CinematicContinuityEngine();
