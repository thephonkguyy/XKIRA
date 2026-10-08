import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function safeExtractError(resText: string, status?: number, requestId?: string): string {
  if (!resText || typeof resText !== "string") {
    return status ? `HTTP ${status} Error` : "AI service returned an invalid response.";
  }
  const trimmed = resText.trim();
  const lower = trimmed.toLowerCase();
  
  if (
    lower.startsWith("<!doctype") || 
    lower.startsWith("<html") || 
    lower.includes("<body") || 
    lower.includes("</html>") || 
    lower.includes("cloudflare") ||
    lower.includes("unexpected token '<'") ||
    lower.includes("unexpected token <") ||
    lower.includes("is not valid json")
  ) {
    let msg = "AI service returned an invalid response.";
    if (status === 502) msg = "AI service error 502: Bad Gateway / Upstream service temporarily unavailable. Please retry.";
    else if (status === 503) msg = "AI service error 503: Service temporarily unavailable. Please retry.";
    else if (status === 504) msg = "AI service error 504: Gateway timeout. Please retry.";
    else if (status === 429) msg = "AI service rate limit reached. Please wait a moment before retrying.";
    else if (status === 401) msg = "AI service authentication error. AGNES_API_KEY is missing or invalid.";
    else if (status) msg = `AI service returned HTTP ${status} error.`;

    if (requestId) {
      msg += ` Request ID: ${requestId}`;
    }
    return msg;
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed.error) {
      const errStr = typeof parsed.error === "string" ? parsed.error : parsed.error.message;
      if (errStr) {
        return safeExtractError(errStr, status, requestId);
      }
    }
    if (parsed.message && typeof parsed.message === "string") {
      return safeExtractError(parsed.message, status, requestId);
    }
  } catch (e) {}

  let cleanMsg = trimmed.substring(0, 250);
  if (requestId && !cleanMsg.includes(requestId)) {
    cleanMsg += ` (Request ID: ${requestId})`;
  }
  return cleanMsg;
}
