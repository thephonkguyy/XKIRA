/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PromptOptimizationOptions {
  prompt: string;
  style?: string;
  cameraMovement?: string;
  lens?: string;
  lighting?: string;
  continuityNote?: string;
  characterDescriptions?: string[];
  worldDescription?: string;
  duration?: number;
}

export class VideoPromptOptimizer {
  /**
   * Optimizes a natural-language video prompt into a high-clarity, cinematic prompt
   * adhering strictly to visual cinematography principles without spamming artificial buzzwords.
   */
  public optimizePrompt(options: PromptOptimizationOptions): string {
    const raw = (options.prompt || "").trim();
    if (!raw) return "";

    // Clean extraneous phrases like "generate a video of", "make a clip showing", "i want a video where"
    const cleanedSubject = raw
      .replace(/^(please\s+)?(generate|create|make|produce)\s+(a\s+)?(video|clip|scene|movie)\s+(of|showing|where|about)?/i, "")
      .replace(/^(can\s+you\s+)?(show|animate)\s+/i, "")
      .replace(/^(a\s+video\s+of\s+)/i, "")
      .trim();

    const parts: string[] = [];

    // 1. Core Subject & Action
    parts.push(cleanedSubject);

    // 2. Character specifications if available
    if (options.characterDescriptions && options.characterDescriptions.length > 0) {
      const charStr = options.characterDescriptions.filter(Boolean).join(". ");
      if (charStr && !parts.some(p => p.includes(charStr))) {
        parts.push(charStr);
      }
    }

    // 3. World / Environment specifications
    if (options.worldDescription && !parts.some(p => p.includes(options.worldDescription!))) {
      parts.push(`Setting: ${options.worldDescription}`);
    }

    // 4. Lighting & Atmosphere
    if (options.lighting && !parts.some(p => p.toLowerCase().includes(options.lighting!.toLowerCase()))) {
      parts.push(`Lighting: ${options.lighting}`);
    }

    // 5. Camera Optics & Movement
    const cameraParts: string[] = [];
    if (options.cameraMovement) cameraParts.push(options.cameraMovement);
    if (options.lens && !cameraParts.some(c => c.includes(options.lens!))) cameraParts.push(`${options.lens} lens`);

    if (cameraParts.length > 0) {
      parts.push(`Camera: ${cameraParts.join(", ")}`);
    }

    // 6. Style Grade
    if (options.style && !parts.some(p => p.toLowerCase().includes(options.style!.toLowerCase()))) {
      parts.push(`Visual style: ${options.style}`);
    }

    // 7. Continuity note (if applicable)
    if (options.continuityNote) {
      parts.push(options.continuityNote);
    }

    // Join with clean periods, ensuring no duplicate punctuation
    return parts
      .map(p => p.replace(/\.+$/, "").trim())
      .filter(Boolean)
      .join(". ") + ".";
  }

  /**
   * Fast, lightweight enhancement for simple prompts
   */
  public fastEnhance(rawPrompt: string, style: string = "Cinematic"): string {
    return this.optimizePrompt({
      prompt: rawPrompt,
      style,
      cameraMovement: "Smooth cinematic camera motion",
      lighting: "Volumetric atmospheric lighting",
    });
  }
}

export const videoPromptOptimizer = new VideoPromptOptimizer();
