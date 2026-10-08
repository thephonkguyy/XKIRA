import { AIModelInfo, AIModelType } from "./types";

export const AGNES_MODELS: Record<string, AIModelInfo> = {
  "agnes-2.5-flash": {
    id: "agnes-2.5-flash",
    name: "Agnes 2.5 Flash",
    type: "text",
    description: "High-speed flagship model optimized for rapid chat, text drafting, tool routing, and reasoning workflows.",
    speed: "Ultra Fast",
    status: "Available",
    contextWindow: 128000,
    maxOutputTokens: 8192,
    capabilities: ["chat", "streaming", "system-prompts", "fast-inference", "tool-use"],
    defaultParams: {
      temperature: 0.7,
      stream: true,
    },
    isDefault: true,
  },
  "agnes-2.5-pro": {
    id: "agnes-2.5-pro",
    name: "Agnes 2.5 Pro",
    type: "text",
    description: "Advanced flagship model for complex multi-step reasoning, deep analysis, code synthesis, and long-context processing.",
    speed: "Fast",
    status: "Available",
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    capabilities: ["chat", "streaming", "deep-reasoning", "complex-coding", "system-prompts", "tool-use"],
    defaultParams: {
      temperature: 0.6,
      stream: true,
    },
  },
  "agnes-image-2.1-flash": {
    id: "agnes-image-2.1-flash",
    name: "Agnes Image 2.1 Flash",
    type: "image",
    description: "Specialized high-fidelity model for rapid cinematic image generation and atmospheric concept art.",
    speed: "Standard",
    status: "Available",
    capabilities: ["text-to-image", "cinematic-rendering", "high-resolution", "custom-aspect-ratio"],
    defaultParams: {
      n: 1,
      size: "1024x1024",
    },
    isDefault: true,
  },
  "agnes-image-v2": {
    id: "agnes-image-v2",
    name: "Agnes Image Studio v2",
    type: "image",
    description: "High-precision image synthesis with advanced prompt comprehension and cinematic color science.",
    speed: "Standard",
    status: "Available",
    capabilities: ["text-to-image", "image-editing", "photorealism"],
    defaultParams: {
      n: 1,
      size: "1024x1024",
    },
  },
  "agnes-video-v2.0": {
    id: "agnes-video-v2.0",
    name: "Agnes Video v2.0",
    type: "video",
    description: "State-of-the-art cinematic video synthesis model for generating continuous motion sequences with camera controls.",
    speed: "Rendering",
    status: "Available",
    capabilities: ["text-to-video", "image-to-video", "camera-motion", "24fps-rendering", "async-job-polling"],
    defaultParams: {
      duration: 5,
      fps: 24,
      resolution: "1280x720",
    },
    isDefault: true,
  },
  "agnes-video-v2.1": {
    id: "agnes-video-v2.1",
    name: "Agnes Video v2.1",
    type: "video",
    description: "Enhanced video motion generation model with increased temporal coherence and physics fidelity.",
    speed: "Rendering",
    status: "Available",
    capabilities: ["text-to-video", "image-to-video", "continuity-rendering", "24fps-rendering"],
    defaultParams: {
      duration: 5,
      fps: 24,
      resolution: "1280x720",
    },
  },
};

export class ModelRegistry {
  private models: Record<string, AIModelInfo>;

  constructor(initialModels: Record<string, AIModelInfo> = AGNES_MODELS) {
    this.models = { ...initialModels };
  }

  public getAllModels(): AIModelInfo[] {
    return Object.values(this.models);
  }

  public getModel(id: string): AIModelInfo | undefined {
    return this.models[id];
  }

  public getModelsByType(type: AIModelType): AIModelInfo[] {
    return Object.values(this.models).filter((m) => m.type === type);
  }

  public getDefaultModel(type: AIModelType): AIModelInfo {
    const matching = this.getModelsByType(type);
    const def = matching.find((m) => m.isDefault);
    return def || matching[0] || this.models["agnes-2.5-flash"];
  }

  public hasModel(id: string): boolean {
    return !!this.models[id];
  }

  public registerModel(model: AIModelInfo): void {
    this.models[model.id] = model;
  }
}

export const defaultModelRegistry = new ModelRegistry();
