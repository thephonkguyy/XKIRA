import { AIModelInfo, AIModelType } from "./types";

export const AGNES_MODELS: Record<string, AIModelInfo> = {
  "agnes-3.0-flash": {
    id: "agnes-3.0-flash",
    name: "Agnes 3.0 Flash",
    type: "text",
    description: "Next-generation flagship model optimized for high-speed multi-turn chat, creative storytelling, tool routing, and deep context reasoning.",
    speed: "Ultra Fast",
    status: "Available",
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    capabilities: ["chat", "streaming", "system-prompts", "fast-inference", "tool-use"],
    defaultParams: {
      temperature: 0.7,
      stream: true,
    },
    isDefault: true,
  },
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
    isDefault: false,
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
  "agnes-image-2.5-flash": {
    id: "agnes-image-2.5-flash",
    name: "Agnes Image 2.5 Flash",
    type: "image",
    description: "State-of-the-art cinematic image synthesis model for photorealistic scenes, character designs, and reference variations.",
    speed: "Fast",
    status: "Available",
    capabilities: ["text-to-image", "image-editing", "cinematic-rendering", "high-resolution", "custom-aspect-ratio"],
    defaultParams: {
      n: 1,
      size: "1024x1024",
    },
    isDefault: true,
  },
  "agnes-image-2.1-flash": {
    id: "agnes-image-2.1-flash",
    name: "Agnes Image 2.1 Flash",
    type: "image",
    description: "High-fidelity model for rapid cinematic image generation and atmospheric concept art.",
    speed: "Standard",
    status: "Available",
    capabilities: ["text-to-image", "cinematic-rendering", "high-resolution", "custom-aspect-ratio"],
    defaultParams: {
      n: 1,
      size: "1024x1024",
    },
    isDefault: false,
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
  "agnes-video-2.5-flash": {
    id: "agnes-video-2.5-flash",
    name: "Agnes Video 2.5 Flash",
    type: "video",
    description: "Next-generation high-speed video synthesis model for generating continuous motion sequences with prompt comprehension.",
    speed: "Fast",
    status: "Available",
    capabilities: ["text-to-video", "image-to-video", "camera-motion", "720P-rendering", "async-job-polling"],
    defaultParams: {
      seconds: 5,
      size: "720P",
      aspect_ratio: "16:9",
      n: 1,
    },
    isDefault: true,
  },
  "agnes-video-2.5": {
    id: "agnes-video-2.5",
    name: "Agnes Video 2.5 (High Quality)",
    type: "video",
    description: "High-definition cinematic video synthesis model for complex motion dynamics and photorealistic realism.",
    speed: "Rendering",
    status: "Available",
    capabilities: ["text-to-video", "image-to-video", "cinematic-lighting", "720P-rendering", "async-job-polling"],
    defaultParams: {
      seconds: 5,
      size: "720P",
      aspect_ratio: "16:9",
      n: 1,
    },
    isDefault: false,
  },
  "agnes-video-v2.0": {
    id: "agnes-video-v2.0",
    name: "Agnes Video v2.0 (Legacy)",
    type: "video",
    description: "Legacy video synthesis model for generating motion sequences.",
    speed: "Rendering",
    status: "Available",
    capabilities: ["text-to-video", "image-to-video", "camera-motion", "24fps-rendering", "async-job-polling"],
    defaultParams: {
      duration: 5,
      fps: 24,
      resolution: "1280x720",
    },
    isDefault: false,
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
