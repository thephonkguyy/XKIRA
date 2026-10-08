/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VideoProject } from "../../types/videoStudio";

/**
 * Creates the flagship test project "The Last Corridor" with 4 connected scenes,
 * locked Character & World Bibles, audio cues, and continuity checkpoints.
 */
export function createTheLastCorridorProject(): VideoProject {
  const now = Date.now();
  const projectId = `project_last_corridor_${now}`;

  const characterId = `char_protagonist_${now}`;
  const worldId = `world_hospital_${now}`;

  return {
    id: projectId,
    title: "The Last Corridor",
    mode: "story-to-video",
    targetDurationMinutes: 0.5,
    targetDurationLabel: "30 Seconds",
    script: `Scene 1: A lone man in a weathered dark jacket walks cautiously down an abandoned hospital corridor at night. Flickering green-tinted fluorescent tubes cast long ominous shadows on peeling walls.

Scene 2: Suddenly, he hears a sharp metallic sound echoing from the darkness ahead. He stops dead in his tracks, body tense, eyes fixed forward.

Scene 3: At the far end of the corridor, a tall, motionless dark silhouette slowly emerges from the deep darkness under a flickering light fixture.

Scene 4: Heart pounding, he slowly steps forward into the cold mist, cautiously approaching the mysterious silhouette.`,
    settings: {
      aspectRatio: "16:9",
      resolution: "1080p",
      fps: 30,
      quality: "High",
      camera: "Cinematic",
      motion: "Normal",
      style: "Cinematic",
      lighting: "Low Key",
      lens: "35mm",
      depthOfField: "Medium",
      durationSeconds: 5,
    },
    characterBible: [
      {
        id: characterId,
        name: "David Vance",
        appearance: "Tall male protagonist, 30s, rugged stubble, determined anxious gaze",
        ageRange: "32-36",
        hair: "Short disheveled dark brown hair",
        eyes: "Intense hazel eyes",
        skinTone: "Fair with dust smudges",
        clothing: "Weathered dark charcoal bomber jacket over charcoal crewneck, dark tactical jeans, worn leather combat boots",
        accessories: "Vintage analog steel wristwatch on left wrist",
        personality: "Cautious, observant, resolute under extreme tension",
        voice: "Low raspy whisper",
        referenceImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80",
      }
    ],
    worldBible: [
      {
        id: worldId,
        location: "Abandoned St. Jude Hospital Corridor",
        architecture: "1970s brutalist institutional architecture with peeling paint, linoleum tile floor, water-damaged ceilings",
        timePeriod: "Present day midnight (2:15 AM)",
        weather: "Heavy exterior rainstorm, light misty humidity drifting inside",
        lighting: "Dim, cold flickering fluorescent tubes (cyan-green tint), deep pitch-black shadows at far end of hallway",
        colorPalette: "Desaturated teal, slate gray, pale hospital green, deep shadow black",
        environment: "Scattered medical gurneys, fallen ceiling tiles, wet floor reflections",
        importantObjects: "Rusted IV drip stand, broken exit sign glowing faint red",
        visualStyle: "Photorealistic 4K cinematic thriller grade, anamorphic lens flare, atmospheric haze",
      }
    ],
    scenes: [
      {
        sceneId: `scene_${now}_1`,
        sceneNumber: 1,
        title: "Scene 1: The Corridor Walk",
        durationSeconds: 5,
        characterIds: [characterId],
        locationId: worldId,
        action: "Male protagonist David Vance in dark jacket walks cautiously down abandoned hospital corridor at night.",
        camera: "Tracking",
        lighting: "Low Key",
        soundCue: "Deliberate heavy boot steps on wet linoleum, distant HVAC hum",
        musicCue: "Low atmospheric suspense cello drone",
        visualPrompt: "Photorealistic 4K cinematic shot: A lone man wearing a weathered dark charcoal jacket walks down a dim abandoned hospital corridor at night. Flickering green-tinted fluorescent tubes cast long shadows on peeling walls. Smooth tracking steadicam shot, 35mm lens, volumetric atmospheric mist.",
        negativePrompt: "bright daylight, smiling faces, modern clean hospital, cartoon, anime, blurry, low resolution",
        status: "IDLE",
        retries: 0,
      },
      {
        sceneId: `scene_${now}_2`,
        sceneNumber: 2,
        title: "Scene 2: Sudden Sound",
        durationSeconds: 5,
        characterIds: [characterId],
        locationId: worldId,
        action: "David stops dead in his tracks upon hearing a distant metallic crash, turning his head with intense focus.",
        camera: "Dolly",
        lighting: "Low Key",
        soundCue: "Sharp metallic clang reverberating down corridor, sudden silence",
        musicCue: "Dissonant high string pitch bending upward",
        visualPrompt: "Photorealistic 4K cinematic shot: The same man in dark jacket stops abruptly in the abandoned hospital hallway, turning his head sharply toward the darkness ahead. Slow creeping dolly push-in to medium closeup, intense nervous expression, 50mm prime lens, dim fluorescent rim light.",
        continuityPrompt: "Maintain exact continuity with Scene 1: same abandoned hospital corridor, same man in dark charcoal jacket, matching cold fluorescent lighting.",
        negativePrompt: "smiling, sunny, modern lights, clean room, anime, blurry",
        status: "IDLE",
        retries: 0,
      },
      {
        sceneId: `scene_${now}_3`,
        sceneNumber: 3,
        title: "Scene 3: The Silhouette",
        durationSeconds: 5,
        characterIds: [characterId],
        locationId: worldId,
        action: "A menacing dark humanoid silhouette appears at the far end of the corridor under a dying flickering light.",
        camera: "Static",
        lighting: "Low Key",
        soundCue: "Deep low-frequency bass rumble, subtle electrical buzzing",
        musicCue: "Pulsing sub-bass suspense chord",
        visualPrompt: "Photorealistic 4K cinematic shot: Down the long hallway in deep shadow, a mysterious tall human silhouette stands motionless at the far end. Atmospheric fog rolls across the floor under a single dying fluorescent light. 85mm compressed telephoto perspective, high contrast.",
        continuityPrompt: "Maintain exact continuity with Scene 2: same hallway, matching green-tinted lighting, dark corridor depth.",
        negativePrompt: "bright daylight, sunny, clean, colorful, cartoon, blurry",
        status: "IDLE",
        retries: 0,
      },
      {
        sceneId: `scene_${now}_4`,
        sceneNumber: 4,
        title: "Scene 4: The Approach",
        durationSeconds: 5,
        characterIds: [characterId],
        locationId: worldId,
        action: "David Vance takes a deep breath and slowly steps forward toward the dark silhouette at the end of the corridor.",
        camera: "Tracking",
        lighting: "Low Key",
        soundCue: "Accelerating tense boot steps, heavy nervous breathing",
        musicCue: "Building orchestral suspense crescendo",
        visualPrompt: "Photorealistic 4K cinematic shot: David Vance wearing dark jacket slowly advances down the eerie hospital corridor toward the distant shadowy silhouette. Low-angle tracking shot from behind shoulder, cold volumetric mist, 35mm lens, high cinematic tension.",
        continuityPrompt: "Maintain exact continuity with Scene 3: same hospital corridor, same man in jacket approaching the silhouette, matching lighting.",
        negativePrompt: "daylight, colorful, sunny, smiling, cartoon, blurry",
        status: "IDLE",
        retries: 0,
      }
    ],
    audioTracks: [
      {
        id: `track_amb_${now}`,
        type: "ambience",
        title: "Abandoned Hospital Rain & Echo",
        url: "https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg",
        volume: 0.4,
        mute: false,
        solo: false,
        fadeInSeconds: 1.5,
        fadeOutSeconds: 2.0,
        startTimeSeconds: 0,
        durationSeconds: 20,
        loop: true,
        gain: 1.0,
      },
      {
        id: `track_score_${now}`,
        type: "music",
        title: "Dark Corridor Tension Drone",
        url: "https://actions.google.com/sounds/v1/ambiences/outdoor_rain_light.ogg",
        volume: 0.5,
        mute: false,
        solo: false,
        fadeInSeconds: 2.0,
        fadeOutSeconds: 3.0,
        startTimeSeconds: 0,
        durationSeconds: 20,
        loop: true,
        gain: 1.0,
      }
    ],
    exportConfig: {
      preset: "YouTube",
      resolution: "1080p",
      fps: 30,
      bitrateKbps: 8000,
      audioBitrateKbps: 192,
      codec: "h264",
      transition: "cut",
      transitionDurationSeconds: 0.5,
    },
    createdAt: now,
    updatedAt: now,
  };
}
