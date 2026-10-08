import { safeExtractError } from "../../lib/utils";
import { safeParseApiResponse } from "../../lib/safeResponseParser";

export interface StreamEventCallbacks {
  onChunk?: (chunk: string, accumulated: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
}

export class StreamingEngine {
  /**
   * Consumes a Server-Sent Events (SSE) stream from Agnes AI chat completions endpoint.
   */
  public static async processSSEStream(
    response: Response,
    callbacks: StreamEventCallbacks,
    signal?: AbortSignal
  ): Promise<string> {
    const contentType = response.headers.get("content-type") || "";
    const requestId = response.headers.get("x-request-id") || response.headers.get("request-id") || undefined;

    if (!response.ok || contentType.includes("application/json") || contentType.includes("text/html")) {
      const parsed = await safeParseApiResponse(response);
      const errMsg = parsed.error || `AI service returned error HTTP ${response.status}`;
      const err = new Error(errMsg);
      callbacks.onError?.(err);
      throw err;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      const err = new Error("No readable response stream received from AI server.");
      callbacks.onError?.(err);
      throw err;
    }

    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let accumulatedText = "";

    try {
      while (true) {
        if (signal?.aborted) {
          throw new DOMException("Stream aborted by user", "AbortError");
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;

        while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);

          if (!line) continue;

          if (line.startsWith("data: ")) {
            const dataStr = line.replace(/^data:\s*/, "").trim();
            if (dataStr === "[DONE]") {
              callbacks.onComplete?.(accumulatedText);
              return accumulatedText;
            }

            try {
              const parsed = JSON.parse(dataStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                accumulatedText += content;
                callbacks.onChunk?.(content, accumulatedText);
              }
            } catch {
              // Ignore partial JSON parsing errors in chunks
            }
          }
        }
      }

      callbacks.onComplete?.(accumulatedText);
      return accumulatedText;
    } catch (err: any) {
      if (err.name === "AbortError") {
        callbacks.onComplete?.(accumulatedText);
        return accumulatedText;
      }
      callbacks.onError?.(err);
      throw err;
    } finally {
      reader.releaseLock();
    }
  }
}

