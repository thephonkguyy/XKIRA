import { ChatMessagePayload } from "./types";

export interface MemoryWindowOptions {
  maxMessages?: number;
  systemPrompt?: string;
  contextPreamble?: string;
}

export class ChatMemoryManager {
  private defaultMaxMessages: number;

  constructor(defaultMaxMessages: number = 10) {
    this.defaultMaxMessages = defaultMaxMessages;
  }

  /**
   * Prepares a clean, optimized message payload array for sending to the Agnes API.
   */
  public prepareChatPayload(
    rawMessages: Array<{ role: string; content: string }>,
    options?: MemoryWindowOptions
  ): ChatMessagePayload[] {
    const max = options?.maxMessages || this.defaultMaxMessages;
    
    // Filter out internal system messages from conversation history
    const userAndAssistantMessages = rawMessages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content || "",
      }));

    // Keep only the most recent N messages for network efficiency and fast response times
    const recentMessages = userAndAssistantMessages.slice(-max);

    const payload: ChatMessagePayload[] = [];

    // 1. Inject custom system prompt or context preamble if provided
    const systemContent = [
      options?.systemPrompt,
      options?.contextPreamble,
    ]
      .filter(Boolean)
      .join("\n\n")
      .trim();

    if (systemContent) {
      payload.push({
        role: "system",
        content: systemContent,
      });
    }

    // 2. Append recent conversational turns
    payload.push(...recentMessages);

    return payload;
  }
}

export const defaultChatMemoryManager = new ChatMemoryManager(12);
