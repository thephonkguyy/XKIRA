import { KnowledgeDocument } from "./types";

export const DEFAULT_KNOWLEDGE_DOCUMENTS: KnowledgeDocument[] = [
  // 1. XKIRA System & Capabilities
  {
    id: "doc-xkira-overview",
    title: "XKIRA System Architecture & Capabilities",
    category: "system",
    tags: ["xkira", "system", "tools", "architecture", "overview"],
    summary: "Overview of XKIRA AI Studio modules, tool routing, and creative workspaces.",
    content: `XKIRA is a high-performance generative AI creative studio.
Core Workspaces:
1. Chat: Multi-turn natural language conversation, tool execution via @commands or natural language intent detection, and streaming responses.
2. Image Studio: High-fidelity image synthesis with aspect ratio controls, negative prompts, prompt enhancers, and before/after comparisons.
3. Video Studio: Multi-scene cinematic video generation, character bible consistency, world bible environment consistency, audio tracks, and master video stitching.
4. Tools: Specialized text processing, code generation, debugging, translation, and prompt synthesis.
5. Prompt Lab: Advanced prompt enhancement and cinematic prompt engineering.
6. Generation Center / Job Queue: Centralized background job tracking with automatic retry handling and status polling.`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    source: "xkira://system/overview",
  },

  // 2. Cinematography & Camera Moves
  {
    id: "doc-cinematography-guide",
    title: "Cinematography, Lenses & Camera Movement Guide",
    category: "cinematography",
    tags: ["cinematography", "camera", "lens", "lighting", "video", "shots"],
    summary: "Camera movement, focal lengths, depth of field, and lighting terminology for cinematic prompts.",
    content: `Cinematic Camera Movement & Terminology:
- Static Shot: Locked-off camera emphasizing subtle subject motion and stillness.
- Dolly In / Dolly Out: Smooth physical movement of the camera toward or away from the subject, creating spatial immersion.
- Tracking Shot: Camera follows subject movement horizontally or through complex environments.
- Pan & Tilt: Horizontal (pan) or vertical (tilt) rotation on a fixed axis.
- Orbit / Arc Shot: Circular 360-degree rotation around a central subject.
- Crane / Jib: High vertical sweeping movement revealing scale and environment.
- Handheld: Subtle organic shake conveying urgency, realism, or documentary style.
- Drone / Aerial: Wide overhead perspective establishing geography.

Focal Lengths & Lenses:
- 24mm: Wide angle with expansive field of view and deep depth of field.
- 35mm: Classic cinematic storytelling focal length, natural field of view.
- 50mm: Standard human eye perspective, zero optical distortion.
- 85mm: Portrait telephoto lens with shallow depth of field and beautiful bokeh.
- Anamorphic: 2.39:1 widescreen ratio, horizontal lens flares, oval bokeh.

Lighting Styles:
- Low-Key / Chiaroscuro: High contrast, deep shadows, dramatic edge lighting (ideal for thrillers, noir, horror).
- Golden Hour: Warm, low-angle natural sunlight with long soft shadows.
- Volumetric / God Rays: Light beams cutting through haze, fog, or dust.
- High-Key: Bright, even illumination with minimal shadows (clean sci-fi, commercial).
- Neon / Cyberpunk: Vivid saturated colored lights reflecting on wet surfaces.`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    source: "xkira://cinematography/camera-lenses",
  },

  // 3. Filmmaking & Storyboard Craft
  {
    id: "doc-storytelling-storyboard",
    title: "Story Structure, Scene Planning & Storyboard Continuity",
    category: "storytelling",
    tags: ["story", "storyboard", "screenplay", "scenes", "continuity", "characters"],
    summary: "Guidelines for multi-scene narrative pacing, character continuity, and visual scene breakdown.",
    content: `Story Pacing & Scene Breakdown:
1. Establishing Scene: Introduce the world, atmosphere, weather, architecture, and lighting tone.
2. Character Introduction: Establish physical appearance, key clothing, distinctive features, and emotional state.
3. Incident & Rising Action: Dynamic motion, shifting camera angles, and character interaction.
4. Climax / High-Tension Scene: Rapid framing changes, close-ups, intense lighting contrast, dramatic sound design.
5. Resolution / Aftermath: Slower camera motion, lingering wide shots, atmospheric depth.

Maintaining Visual Continuity Across Video Scenes:
- Keyframe Continuity: Use the final frame of Scene N as the reference keyframe image for Scene N+1.
- Character Bible Consistency: Explicitly maintain uniform hair, eye color, facial structure, skin tone, and wardrobe across every scene prompt.
- World Bible Consistency: Keep environmental constants (time of day, weather, architectural era, color palette) locked across scenes.`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    source: "xkira://filmmaking/story-structure",
  },

  // 4. Image Prompt Engineering
  {
    id: "doc-image-prompt-engineering",
    title: "Cinematic Image Prompt Engineering Framework",
    category: "prompting",
    tags: ["image", "prompting", "style", "photorealism", "lighting"],
    summary: "Structuring effective image generation prompts with subject, environment, lighting, and composition.",
    content: `Prompt Anatomy for High-Fidelity Image Generation:
[Subject & Character Details] + [Environment & Setting] + [Lighting & Atmosphere] + [Camera, Lens & Composition] + [Color Grade & Visual Style]

Formula:
1. Core Subject: Precise identity, pose, clothing, facial expression, and textures.
2. Background / Setting: Architectural style, atmospheric weather, spatial depth.
3. Lighting: Directional lighting source (e.g., golden hour rim light, moonlight through blinds, neon reflection).
4. Camera Specs: 35mm photography, shot on Arri Alexa, shallow depth of field, f/1.8 aperture.
5. Quality Modifiers: 8k resolution, photorealistic, intricate textures, cinematic color grade.

Negative Prompting Best Practices:
- Exclude: blurry, cartoonish (if aiming for realism), distorted hands, extra limbs, oversaturated, watermark, bad anatomy.`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    source: "xkira://prompting/image-guide",
  },

  // 5. Video Prompt Engineering
  {
    id: "doc-video-prompt-engineering",
    title: "Video Motion & Temporal Prompting Framework",
    category: "prompting",
    tags: ["video", "motion", "temporal", "prompting", "cinematic"],
    summary: "Formulating video generation prompts with clear camera movement, subject physics, and temporal flow.",
    content: `Video Prompt Structure:
[Subject Action] + [Camera Movement] + [Lighting & Atmosphere] + [Visual Style & Frame Rate]

Key Rules for AI Video Generation:
1. Focus on Motion: Clearly describe the kinetic action (e.g. 'a masked figure steps forward slowly, coat billowing in the wind').
2. Explicit Camera Direction: Specify camera trajectory (e.g. 'slow smooth dolly-in towards the subject's face').
3. Keep Scene Scope Focused: Avoid attempting complex multi-event scripts in a single 5-second clip. One primary action and camera move per scene.
4. Consistent Lighting State: Mention environmental lighting to maintain temporal coherence.`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    source: "xkira://prompting/video-guide",
  },

  // 6. Character Design & Consistency
  {
    id: "doc-character-design-framework",
    title: "Character Design & Identity Preservation",
    category: "character_design",
    tags: ["character", "bible", "consistency", "identity", "wardrobe"],
    summary: "Best practices for constructing character bibles that maintain identity across generative media.",
    content: `Character Bible Profile Dimensions:
- Name & Persona: Role in story, emotional baseline, mannerisms.
- Facial Features: Eye color, eyebrow shape, jawline, distinct scars or markings.
- Hair & Grooming: Exact style, color, length, and texture.
- Wardrobe & Silhouette: Primary outfit, signature jacket/coat, accessories, material textures.
- Color Motif: Signature accent colors associated with the character.
- Visual Anchor: One or two immutable details mentioned in every generation prompt (e.g. 'wearing an obsidian trench coat with silver buttons').`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    source: "xkira://character/design-framework",
  },

  // 7. World Building & Environmental Rules
  {
    id: "doc-world-building-framework",
    title: "World Building, Spatial Logic & Environmental Profiles",
    category: "world_building",
    tags: ["world", "locations", "environment", "architecture", "mood"],
    summary: "Creating world bibles with cohesive architecture, lighting rules, weather, and color science.",
    content: `World Bible Dimensions:
- Location Identity: Name, geographic setting, interior vs exterior.
- Architectural Style: Brutalist, Gothic, Futuristic Cyberpunk, Victorian, Modern Minimalist, Neo-Noir.
- Environmental Atmosphere: Foggy, rain-slicked asphalt, desert haze, snowy blizzard, dusty ruins.
- Dominant Color Palette: Monochromatic blues, warm amber tones, neon cyan and magenta, muted desaturated grays.
- Lighting Rules: Key light sources (e.g. flickering neon signs, moonlight through skylight, warm incandescent lamps).`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    source: "xkira://world/environment-framework",
  },

  // 8. Programming & Clean Architecture
  {
    id: "doc-programming-practices",
    title: "Software Engineering & Clean Architecture Standards",
    category: "programming",
    tags: ["code", "typescript", "react", "architecture", "debugging"],
    summary: "Best practices for clean TypeScript/React code, state management, and error resilience.",
    content: `Engineering Best Practices:
1. Modular Architecture: Separate state (Zustand), UI components, business logic, and API clients.
2. Error Handling & Recovery: Always catch network/API errors, provide user-facing error feedback, and support safe retries.
3. Memory Management: Avoid unbounded arrays in memory; limit history slices and sanitize user inputs.
4. Type Safety: Define strict TypeScript interfaces and avoid loose 'any' casting.`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    source: "xkira://engineering/standards",
  },
];
