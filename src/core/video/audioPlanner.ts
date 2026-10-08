/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AudioPlan } from "./types";

export interface MultiSceneAudioTrack {
  id: string;
  type: "dialogue" | "voiceover" | "music" | "sfx" | "ambience";
  title: string;
  url: string;
  volume: number;
  startTimeSeconds: number;
  durationSeconds: number;
  loop?: boolean;
  fadeInSeconds?: number;
  fadeOutSeconds?: number;
}

export class CinematicAudioPlanner {
  /**
   * Plans the auditory soundscape for an individual scene without conflating it
   * with video model output.
   */
  public planSceneAudio(
    action: string,
    environment: string,
    dialogueText?: string,
    speakerName?: string,
    requestedMood?: string
  ): AudioPlan {
    const actLower = (action || "").toLowerCase();
    const envLower = (environment || "").toLowerCase();
    const moodLower = (requestedMood || "").toLowerCase();

    // 1. Ambience & Room Tone
    let ambientSound = "Quiet interior room tone with subtle air circulation";
    let roomTone = "50Hz subtle low-frequency atmospheric hum";

    if (envLower.includes("corridor") || envLower.includes("hospital") || envLower.includes("hallway")) {
      ambientSound = "Distant eerie HVAC ventilation hum, subtle water drip echoing off tile walls";
      roomTone = "Cold hollow reverberant corridor acoustic tone";
    } else if (envLower.includes("cyber") || envLower.includes("city") || envLower.includes("street")) {
      ambientSound = "Heavy rain slicking on asphalt, distant police siren echo, neon electric buzz";
      roomTone = "Urban wet pavement ambient resonance";
    } else if (envLower.includes("forest") || envLower.includes("woods")) {
      ambientSound = "Wind rustling through canopy leaves, distant nocturnal wildlife calls";
      roomTone = "Open natural field acoustic tone";
    }

    // 2. Sound Effects (Foley)
    const soundEffects: string[] = [];
    if (actLower.includes("walk") || actLower.includes("footstep")) {
      soundEffects.push("Slow deliberate leather boot footsteps on hard floor");
    }
    if (actLower.includes("stops") || actLower.includes("hears")) {
      soundEffects.push("Sudden floor creak, sharp metallic click in distance");
    }
    if (actLower.includes("door") || actLower.includes("opens")) {
      soundEffects.push("Heavy rusted metal door latch creaking open slowly");
    }
    if (actLower.includes("silhouette") || actLower.includes("shadow")) {
      soundEffects.push("Low sub-bass suspense drone swell, faint cloth rustle");
    }
    if (actLower.includes("approaches")) {
      soundEffects.push("Tense accelerating footsteps, shallow anxious breathing");
    }

    // 3. Music Mood
    let musicMood = "Subtle cinematic ambient pulse";
    if (moodLower.includes("horror") || actLower.includes("silhouette") || actLower.includes("dark")) {
      musicMood = "Low dissonant cello drone with suspenseful bowing texture";
    } else if (actLower.includes("fight") || actLower.includes("chase") || moodLower.includes("action")) {
      musicMood = "Driving 130 BPM cinematic percussion with heavy analog synth bass";
    } else if (moodLower.includes("golden") || moodLower.includes("emotional")) {
      musicMood = "Warm melancholic piano progression with soft string quartet pad";
    }

    return {
      dialogue: dialogueText,
      speakerCharacterId: speakerName,
      ambientSound,
      soundEffects: soundEffects.length > 0 ? soundEffects : ["Subtle environmental foley"],
      musicMood,
      roomTone,
      silenceDurationSeconds: actLower.includes("stops") ? 1.5 : 0,
    };
  }

  /**
   * Builds default high-quality ambient and score tracks across a timeline
   */
  public generateProjectAudioMasterPlan(
    totalDurationSeconds: number,
    theme: string = "suspense"
  ): MultiSceneAudioTrack[] {
    const isSuspense = theme.toLowerCase().includes("suspense") || theme.toLowerCase().includes("corridor") || theme.toLowerCase().includes("hospital");
    
    return [
      {
        id: `ambience_${Date.now()}_1`,
        type: "ambience",
        title: isSuspense ? "Atmospheric Echo Corridor Ambience" : "Cinematic Environmental Ambience",
        url: "https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg",
        volume: 0.35,
        startTimeSeconds: 0,
        durationSeconds: totalDurationSeconds,
        loop: true,
        fadeInSeconds: 1.5,
        fadeOutSeconds: 2.0,
      },
      {
        id: `score_${Date.now()}_2`,
        type: "music",
        title: isSuspense ? "Low Tension Suspense Strings" : "Master Cinematic Soundtrack",
        url: "https://actions.google.com/sounds/v1/ambiences/outdoor_rain_light.ogg",
        volume: 0.45,
        startTimeSeconds: 0,
        durationSeconds: totalDurationSeconds,
        loop: true,
        fadeInSeconds: 2.0,
        fadeOutSeconds: 3.0,
      }
    ];
  }
}

export const audioPlanner = new CinematicAudioPlanner();
