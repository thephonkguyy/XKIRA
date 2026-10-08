import {
  ChatCompletionOptions,
  ImageGenerationOptions,
  VideoGenerationOptions,
  ToolExecutionOptions,
  ToolExecutionResult,
  IntentDetectionResult,
  AIModelInfo,
} from "./types";
import { ModelRegistry, defaultModelRegistry } from "./modelRegistry";
import { IntentDetector, defaultIntentDetector } from "./intentDetector";
import { StreamingEngine } from "./streamingEngine";
import { ChatMemoryManager, defaultChatMemoryManager } from "./chatMemory";
import { ToolRouter, defaultToolRouter } from "./toolRouter";
import { KnowledgeManager, defaultKnowledgeManager } from "../knowledge";
import { MemoryManager, defaultMemoryManager } from "../memory";
import { TOOL_REGISTRY, ToolDefinition } from "../../registry/toolRegistry";
import { safeExtractError } from "../../lib/utils";
import { safeParseApiResponse, extractValidImageUrl } from "../../lib/safeResponseParser";
import { useAuthStore } from "../../store/authStore";
import { authenticatedFetch } from "../../utils/authenticatedFetch";

export class AICore {
  public readonly models: ModelRegistry;
  public readonly intentDetector: IntentDetector;
  public readonly memory: ChatMemoryManager;
  public readonly toolRouter: ToolRouter;
  public readonly knowledge: KnowledgeManager;
  public readonly memoryManager: MemoryManager;

  constructor(
    models: ModelRegistry = defaultModelRegistry,
    intentDetector: IntentDetector = defaultIntentDetector,
    memory: ChatMemoryManager = defaultChatMemoryManager,
    toolRouter: ToolRouter = defaultToolRouter,
    knowledge: KnowledgeManager = defaultKnowledgeManager,
    memoryManager: MemoryManager = defaultMemoryManager
  ) {
    this.models = models;
    this.intentDetector = intentDetector;
    this.memory = memory;
    this.toolRouter = toolRouter;
    this.knowledge = knowledge;
    this.memoryManager = memoryManager;
  }

  /**
   * Executes a multi-turn chat completion with contextual memory, knowledge retrieval, and optional SSE streaming.
   */
  public async chat(options: ChatCompletionOptions): Promise<string> {
    const model = options.model || this.models.getDefaultModel("text").id;

    // 1. Extract last user query for retrieval
    const lastUserMsg = [...options.messages].reverse().find((m) => m.role === "user")?.content || "";

    // 2. Retrieve relevant context blocks
    const contextPreambleParts: string[] = [];

    if (options.systemPrompt) {
      contextPreambleParts.push(options.systemPrompt);
    }

    // 3. Relevant Knowledge Retrieval (only if relevant)
    if (options.includeKnowledge !== false && lastUserMsg) {
      const knowledgePreamble = await this.knowledge.getRelevantContextPreamble(lastUserMsg);
      if (knowledgePreamble) {
        contextPreambleParts.push(knowledgePreamble);
      }
    }

    // 4. Project & Conversational Memory Retrieval (only relevant slices)
    if (options.includeMemory !== false && lastUserMsg) {
      const memoryPreamble = this.memoryManager.buildContextPreamble(lastUserMsg, options.projectId);
      if (memoryPreamble) {
        contextPreambleParts.push(memoryPreamble);
      }
    }

    const unifiedSystemPrompt = contextPreambleParts.join("\n\n---\n\n");

    const messages = this.memory.prepareChatPayload(options.messages, {
      systemPrompt: unifiedSystemPrompt || undefined,
    });

    const isStream = options.stream !== false;

    const payload = {
      model,
      messages,
      stream: isStream,
      temperature: options.temperature ?? 0.7,
    };

    const res = await authenticatedFetch("/api/agnes/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: options.signal,
    });

    if (isStream) {
      return StreamingEngine.processSSEStream(
        res,
        {
          onChunk: options.onChunk,
          onComplete: (fullText) => {
            options.onComplete?.(fullText);
          },
          onError: options.onError,
        },
        options.signal
      );
    } else {
      const parsed = await safeParseApiResponse(res);
      if (!parsed.success || !parsed.data) {
        const errMsg = parsed.error || `AI chat failed (HTTP ${res.status})`;
        const err = new Error(errMsg);
        options.onError?.(err);
        throw err;
      }

      const text = parsed.data.choices?.[0]?.message?.content?.trim() || "";
      options.onComplete?.(text);
      return text;
    }
  }

  /**
   * Generates images using the Agnes Image generation API and stores generation memory.
   */
  public async generateImage(options: ImageGenerationOptions): Promise<{ url: string; rawData: any }> {
    const model = options.model || this.models.getDefaultModel("image").id;

    // Optional character or world visual consistency injection
    let refinedPrompt = options.prompt;
    if (options.characterName && options.projectId) {
      const chars = this.memoryManager.getCharacters(options.projectId);
      const char = chars.find((c) => c.name.toLowerCase() === options.characterName?.toLowerCase());
      if (char && char.visualAnchor && !refinedPrompt.includes(char.visualAnchor)) {
        refinedPrompt = `${refinedPrompt}, featuring character ${char.name} (${char.visualAnchor})`;
      }
    }

    const payload = {
      model,
      prompt: refinedPrompt,
      n: options.n || 1,
      size: options.size || "1024x1024",
    };

    const res = await authenticatedFetch("/api/agnes/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: options.signal,
    });

    const parsed = await safeParseApiResponse(res, "Failed to generate image.");
    if (!parsed.success || !parsed.data) {
      throw new Error(parsed.error || `Image generation failed with HTTP ${res.status}`);
    }

    const url = extractValidImageUrl(parsed.data);
    if (!url) {
      throw new Error("Agnes Image API did not return a valid image URL in response.");
    }

    // Save in Generation Memory
    this.memoryManager.saveGeneration({
      type: "image",
      prompt: refinedPrompt,
      url,
      model,
      tool: "Image Studio",
      projectId: options.projectId,
      aspectRatio: options.aspectRatio || "1:1",
    });

    return { url, rawData: parsed.data };
  }

  /**
   * Dispatches a video generation request to the Agnes Video API and stores generation memory.
   */
  public async generateVideo(options: VideoGenerationOptions): Promise<{ videoId: string; jobId?: string; rawData: any }> {
    const model = options.model || this.models.getDefaultModel("video").id;

    // Build continuity enriched prompt if available
    let refinedPrompt = options.prompt;
    if (options.continuityPrompt && !refinedPrompt.includes(options.continuityPrompt)) {
      refinedPrompt = `${refinedPrompt}. Continuity direction: ${options.continuityPrompt}`;
    }

    const isImg2Video = !!options.inputUri || !!options.imageUri;
    const payload = {
      model,
      prompt: refinedPrompt,
      mode: isImg2Video ? "img2video" : "text",
      seconds: options.duration || 5,
      size: "720P",
      aspect_ratio: "16:9",
      n: 1,
      ...(isImg2Video ? { first_frame: options.inputUri || options.imageUri } : {}),
      jobId: options.jobId,
    };

    const res = await authenticatedFetch("/api/agnes/videos/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: options.signal,
    });

    const parsed = await safeParseApiResponse(res, "Failed to dispatch video generation.");
    if (!parsed.success || !parsed.data) {
      throw new Error(parsed.error || `Video generation failed with HTTP ${res.status}`);
    }

    const data = parsed.data;
    const videoId = data.id || data.videoId || data.generation_id || options.jobId || `vid_${Date.now()}`;

    // Save in Generation Memory
    this.memoryManager.saveGeneration({
      type: "video",
      prompt: refinedPrompt,
      url: "",
      model,
      tool: "Video Studio",
      jobId: options.jobId || videoId,
      projectId: options.projectId,
      duration: options.duration || 5,
    });

    return { videoId, jobId: options.jobId, rawData: data };
  }

  /**
   * Classifies user input into structured intents.
   */
  public detectIntent(input: string): IntentDetectionResult {
    return this.intentDetector.detectIntent(input);
  }

  /**
   * Helper to detect single tool for suggestion popovers.
   */
  public detectToolFromIntent(input: string): ToolDefinition | null {
    return this.intentDetector.detectToolFromIntent(input);
  }

  /**
   * Helper to detect explicit @command tool triggers.
   */
  public detectExplicitTrigger(input: string): { tool: ToolDefinition; query: string } | null {
    return this.intentDetector.detectExplicitTrigger(input);
  }

  /**
   * Unified tool execution entry point.
   */
  public async executeTool(options: ToolExecutionOptions): Promise<ToolExecutionResult> {
    return this.toolRouter.executeTool(options);
  }

  /**
   * List all available models.
   */
  public getModels(): AIModelInfo[] {
    return this.models.getAllModels();
  }

  /**
   * Look up a model by ID.
   */
  public getModel(id: string): AIModelInfo | undefined {
    return this.models.getModel(id);
  }

  /**
   * List all registered tools in the registry.
   */
  public getTools(): Record<string, ToolDefinition> {
    return TOOL_REGISTRY;
  }
}

export const aiCore = new AICore();

