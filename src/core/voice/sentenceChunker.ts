/**
 * Cleans markdown formatting and symbols so text-to-speech speaks natural phrases.
 */
export function cleanTextForSpeech(text: string): string {
  if (!text) return "";

  return text
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, "")
    // Remove inline code
    .replace(/`([^`]+)`/g, "$1")
    // Remove bold/italics
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    // Remove links [title](url) -> title
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove image tags ![alt](url)
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "")
    // Remove headers #, ##, etc.
    .replace(/^#{1,6}\s+/gm, "")
    // Remove blockquotes >
    .replace(/^>\s+/gm, "")
    // Remove list markers -, *, 1.
    .replace(/^[\s]*[-*+]\s+/gm, "")
    .replace(/^[\s]*\d+\.\s+/gm, "")
    // Remove emoji/icon patterns if redundant or repetitive
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "")
    // Collapse excess spaces & newlines
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Intelligent Sentence Chunker for streaming AI tokens.
 * Emits natural phrase / sentence chunks to allow low-latency TTS without waiting
 * for full response completion.
 */
export class SentenceChunker {
  private buffer = "";
  private onChunkCallback: (chunk: string) => void;
  private minChunkLength: number;
  private maxChunkLength: number;

  constructor(
    onChunk: (chunk: string) => void,
    options: { minChunkLength?: number; maxChunkLength?: number } = {}
  ) {
    this.onChunkCallback = onChunk;
    this.minChunkLength = options.minChunkLength ?? 18;
    this.maxChunkLength = options.maxChunkLength ?? 120;
  }

  /**
   * Push newly arrived streaming text delta from SSE.
   */
  public push(delta: string) {
    if (!delta) return;
    this.buffer += delta;
    this.processBuffer();
  }

  private processBuffer() {
    let search = true;

    while (search && this.buffer.length >= this.minChunkLength) {
      // 1. Look for terminal sentence boundaries: . ! ? \n followed by space or end
      const match = this.buffer.match(/([.!?\n]+)(\s+|$)/);

      if (match && match.index !== undefined) {
        const boundaryEnd = match.index + match[0].length;
        const candidate = this.buffer.slice(0, boundaryEnd);
        const cleaned = cleanTextForSpeech(candidate);

        if (cleaned.length >= 3) {
          this.onChunkCallback(cleaned);
          this.buffer = this.buffer.slice(boundaryEnd);
          continue;
        }
      }

      // 2. Look for intermediate clause boundaries (, ; : -) if chunk is moderately long
      if (this.buffer.length >= 40) {
        const clauseMatch = this.buffer.match(/([,;:—]+)(\s+)/);
        if (clauseMatch && clauseMatch.index !== undefined && clauseMatch.index >= 20) {
          const boundaryEnd = clauseMatch.index + clauseMatch[0].length;
          const candidate = this.buffer.slice(0, boundaryEnd);
          const cleaned = cleanTextForSpeech(candidate);

          if (cleaned.length >= 3) {
            this.onChunkCallback(cleaned);
            this.buffer = this.buffer.slice(boundaryEnd);
            continue;
          }
        }
      }

      // 3. Fallback: If buffer exceeds maxChunkLength, split at the last space
      if (this.buffer.length >= this.maxChunkLength) {
        const lastSpace = this.buffer.lastIndexOf(" ", this.maxChunkLength);
        if (lastSpace > 20) {
          const candidate = this.buffer.slice(0, lastSpace);
          const cleaned = cleanTextForSpeech(candidate);

          if (cleaned.length >= 3) {
            this.onChunkCallback(cleaned);
            this.buffer = this.buffer.slice(lastSpace + 1);
            continue;
          }
        }
      }

      search = false;
    }
  }

  /**
   * Flush any remaining text in the buffer when the AI stream completes.
   */
  public flush() {
    if (this.buffer.trim().length > 0) {
      const cleaned = cleanTextForSpeech(this.buffer);
      if (cleaned.length > 0) {
        this.onChunkCallback(cleaned);
      }
      this.buffer = "";
    }
  }

  /**
   * Clear buffer without emitting (e.g. on interruption).
   */
  public reset() {
    this.buffer = "";
  }
}
