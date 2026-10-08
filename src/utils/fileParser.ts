import { AttachmentFile } from "./indexedDb";

/**
 * Extracts and prepares textual context from various attachment files
 * so that the Agnes AI model can read and reason over their contents.
 */
export async function extractFileContext(attachmentIds: string[]): Promise<string> {
  if (!attachmentIds || attachmentIds.length === 0) return "";

  const { IndexedDBManager } = await import("./indexedDb");
  const extractedContextParts: string[] = [];

  for (const id of attachmentIds) {
    try {
      const file = await IndexedDBManager.getFile(id);
      if (!file) continue;

      let extractedText = "";

      // 1. Text or Markdown files
      if (file.type.startsWith("text/") || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
        // Base64 to UTF-8 decoding
        const base64Data = file.data.split(",")[1] || file.data;
        try {
          extractedText = atob(base64Data);
        } catch {
          extractedText = "Binary data unable to decode.";
        }
      } 
      // 2. CSV / Tabular datasets
      else if (file.name.endsWith(".csv") || file.type.includes("csv")) {
        const base64Data = file.data.split(",")[1] || file.data;
        try {
          const raw = atob(base64Data);
          const rows = raw.split("\n").slice(0, 30); // Read first 30 rows for brief preview
          extractedText = `CSV dataset (First 30 rows):\n${rows.join("\n")}`;
        } catch {
          extractedText = "CSV binary raw text parse failed.";
        }
      }
      // 3. JSON metadata or configuration
      else if (file.name.endsWith(".json") || file.type.includes("json")) {
        const base64Data = file.data.split(",")[1] || file.data;
        try {
          extractedText = atob(base64Data);
        } catch {
          extractedText = "JSON data unable to decode.";
        }
      }
      // 4. Fallback for binary, media or PDFs (read metadata)
      else {
        const typeLabel = file.type.split("/")[0] || "Unknown";
        extractedText = `[Attached Binary ${typeLabel} file: "${file.name}" Size: ${(file.size / 1024).toFixed(1)} KB]`;
      }

      extractedContextParts.push(
        `--- ATTACHED FILE CONTEXT [Name: ${file.name}, Type: ${file.type}] ---\n${extractedText.trim()}\n--- END OF FILE "${file.name}" ---`
      );
    } catch (e) {
      console.warn("Failed to extract file context for ID:", id, e);
    }
  }

  return extractedContextParts.join("\n\n");
}
