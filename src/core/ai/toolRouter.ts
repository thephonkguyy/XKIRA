import { TOOL_REGISTRY, ToolDefinition } from "../../registry/toolRegistry";
import { ToolExecutionOptions, ToolExecutionResult } from "./types";
import { defaultChatMemoryManager } from "./chatMemory";
import { safeExtractError } from "../../lib/utils";
import { useJobStore } from "../../store/jobStore";
import { safeParseApiResponse, extractValidImageUrl } from "../../lib/safeResponseParser";

export class ToolRouter {
  /**
   * Dispatches and executes a tool action by tool ID and query.
   */
  public async executeTool(options: ToolExecutionOptions): Promise<ToolExecutionResult> {
    const { toolId, userPrompt, modelOverride, systemPromptOverride, signal } = options;
    const tool = TOOL_REGISTRY[toolId];

    if (!tool) {
      return {
        toolId,
        toolName: "Unknown Tool",
        status: "FAILED",
        error: `Tool with ID "${toolId}" was not found in the XKIRA Tool Registry.`,
      };
    }

    // 1. If tool requires user confirmation and hasn't been explicitly confirmed, WAIT!
    if (tool.requiresConfirmation && !options.confirmed) {
      if (options.onStatusChange) {
        options.onStatusChange("AWAITING_CONFIRMATION");
      }
      return {
        toolId,
        toolName: tool.name,
        status: "AWAITING_CONFIRMATION",
        result: `Confirmation required to run ${tool.name}.`,
      };
    }

    // 2. Route by category / outputType
    if (tool.id === "image-studio" || tool.outputType === "image") {
      return this.executeImageStudioTool(tool, userPrompt, signal);
    }

    if (tool.id === "video-studio" || tool.outputType === "video") {
      return this.executeVideoStudioTool(tool, userPrompt, signal);
    }

    // 3. Text, Coding, and Prompt Engineering Tools
    return this.executeTextTool(tool, userPrompt, {
      modelOverride,
      systemPromptOverride,
      signal,
    });
  }

  /**
   * Executes text / code / prompt generation tools via Agnes Chat Completions.
   */
  private async executeTextTool(
    tool: ToolDefinition,
    userPrompt: string,
    opts: { modelOverride?: string; systemPromptOverride?: string; signal?: AbortSignal }
  ): Promise<ToolExecutionResult> {
    const model = opts.modelOverride || tool.defaultModel || "agnes-2.5-flash";
    const systemPrompt = opts.systemPromptOverride || tool.systemPrompt || "You are an expert AI assistant.";

    const messages = defaultChatMemoryManager.prepareChatPayload(
      [{ role: "user", content: userPrompt }],
      { systemPrompt }
    );

    try {
      const res = await fetch("/api/agnes/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
        }),
        signal: opts.signal,
      });

      const parsed = await safeParseApiResponse(res, `Failed to execute ${tool.name}.`);
      if (!parsed.success || !parsed.data) {
        throw new Error(parsed.error || `Tool execution failed with HTTP ${res.status}`);
      }

      const textResult = parsed.data.choices?.[0]?.message?.content?.trim();

      if (!textResult) {
        throw new Error("No output received from Agnes AI model.");
      }

      return {
        toolId: tool.id,
        toolName: tool.name,
        status: "COMPLETED",
        result: textResult,
        rawData: parsed.data,
      };
    } catch (err: any) {
      return {
        toolId: tool.id,
        toolName: tool.name,
        status: "FAILED",
        error: err.message || "Failed to execute AI tool.",
      };
    }
  }

  /**
   * Executes Image Studio generation.
   */
  public async executeImageStudioTool(
    tool: ToolDefinition,
    prompt: string,
    signal?: AbortSignal
  ): Promise<ToolExecutionResult> {
    try {
      const res = await fetch("/api/agnes/images/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: tool.defaultModel || "agnes-image-2.5-flash",
          prompt,
          n: 1,
          size: "1024x1024",
        }),
        signal,
      });

      const parsed = await safeParseApiResponse(res, "Image generation failed.");
      if (!parsed.success || !parsed.data) {
        throw new Error(parsed.error || `Image generation failed with HTTP ${res.status}`);
      }

      const imageUrl = extractValidImageUrl(parsed.data);

      if (!imageUrl) {
        throw new Error("No image URL was returned by Agnes Image Studio.");
      }

      return {
        toolId: tool.id,
        toolName: tool.name,
        status: "COMPLETED",
        result: `![Generated Image](${imageUrl})`,
        mediaUrl: imageUrl,
        rawData: parsed.data,
      };
    } catch (err: any) {
      return {
        toolId: tool.id,
        toolName: tool.name,
        status: "FAILED",
        error: err.message || "Image generation failed.",
      };
    }
  }

  /**
   * Executes Video Studio generation and attaches job tracking in JobStore.
   */
  public async executeVideoStudioTool(
    tool: ToolDefinition,
    prompt: string,
    signal?: AbortSignal
  ): Promise<ToolExecutionResult> {
    const { createJob, updateJob } = useJobStore.getState();

    const model = tool.defaultModel || "agnes-video-2.5-flash";

    const jobId = createJob({
      type: "video",
      tool: tool.name,
      model,
      prompt,
      status: "QUEUED",
      progress: "Initializing video rendering pipeline...",
    });

    try {
      const res = await fetch("/api/agnes/videos/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt,
          mode: "text",
          seconds: 5,
          size: "720P",
          aspect_ratio: "16:9",
          n: 1,
          jobId,
        }),
        signal,
      });

      const parsed = await safeParseApiResponse(res, "Video generation failed.");
      if (!parsed.success || !parsed.data) {
        const errorMsg = parsed.error || `Video generation failed with HTTP ${res.status}`;
        updateJob(jobId, { status: "FAILED", error: errorMsg });
        throw new Error(errorMsg);
      }

      const data = parsed.data;
      const videoId = data.id || data.videoId || data.generation_id || jobId;

      updateJob(jobId, {
        videoId,
        status: "PROCESSING",
        progress: "Video generation job dispatched to server...",
      });

      return {
        toolId: tool.id,
        toolName: tool.name,
        status: "COMPLETED",
        jobId,
        result: `Video generation started (Job ID: ${jobId}). Track progress in Generation Center or Video Studio.`,
        rawData: data,
      };
    } catch (err: any) {
      return {
        toolId: tool.id,
        toolName: tool.name,
        status: "FAILED",
        jobId,
        error: err.message || "Video generation failed.",
      };
    }
  }
}

export const defaultToolRouter = new ToolRouter();

