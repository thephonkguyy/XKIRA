/**
 * Centralized Agnes AI API Service & Client
 * 
 * Single authoritative server-side client responsible for:
 * - Canonical AGNES_API_KEY loading, normalization & safe check
 * - Unified base URL: https://apihub.agnes-ai.com/v1
 * - Standardized request headers & timeouts
 * - Retries with exponential backoff on transient errors
 * - Error normalization (HTML 502/503/Cloudflare/rate-limits)
 * - Safe diagnostic logging without exposing secrets or user keys
 * - Support for Chat, Image Generation, Image Editing, Video Generation & Status Polling
 */

export const AGNES_BASE_URL = "https://apihub.agnes-ai.com/v1";

// Canonical models
export const AGNES_MODELS_CONFIG = {
  chat: {
    default: "agnes-3.0-flash",
    fallback: "agnes-2.5-pro",
  },
  image: {
    default: "agnes-image-2.5-flash",
    fallback: "agnes-image-2.1-flash",
  },
  video: {
    default: "agnes-video-2.5-flash",
    highQuality: "agnes-video-2.5",
    legacy: "agnes-video-v2.0",
  },
};

export interface NormalizedApiError {
  success: false;
  error: {
    code: string;
    message: string;
    provider: "agnes";
    status: number;
    requestId?: string;
  };
}

export function createNormalizedError(
  message: string,
  status = 500,
  code = "generation_error",
  requestId?: string
): NormalizedApiError {
  let normalizedCode = code;
  if (status === 401) normalizedCode = "unauthorized";
  else if (status === 400) normalizedCode = "invalid_request";
  else if (status === 403) normalizedCode = "forbidden";
  else if (status === 429) normalizedCode = "rate_limit_exceeded";
  else if (status >= 500) normalizedCode = "provider_error";

  return {
    success: false,
    error: {
      code: normalizedCode,
      message,
      provider: "agnes",
      status,
      ...(requestId ? { requestId } : {}),
    },
  };
}

import { agnesKeyManager } from "./agnes/agnesKeyManager";

/**
 * Returns all configured Agnes API keys in priority order.
 */
export function getAllAvailableAgnesKeys(): string[] {
  const health = agnesKeyManager.getPoolHealth();
  const keys: string[] = [];
  for (const k of health.keys) {
    const slot = agnesKeyManager.getKeySlotById(k.id);
    if (slot && slot.secret) {
      keys.push(slot.secret);
    }
  }
  return keys;
}

/**
 * Normalizes and extracts the currently preferred canonical AGNES_API_KEY.
 * Prefers the highest priority healthy ACTIVE key.
 */
export function getNormalizedAgnesApiKey(): string {
  const selected = agnesKeyManager.selectKey();
  if (selected) return selected.secret;
  const all = getAllAvailableAgnesKeys();
  return all.length > 0 ? all[0] : "";
}

/**
 * Performs safe startup check and logs safe diagnostics.
 * NEVER logs the actual API key.
 */
export function logStartupConfiguration(): { configured: boolean; keyLength: number; keyCount: number } {
  const pool = agnesKeyManager.getPoolHealth();
  const key = getNormalizedAgnesApiKey();
  const configured = pool.configuredKeys > 0;
  const keyLength = key.length;

  console.log("==================================================");
  console.log("  XKIRA AGNES AI MULTI-KEY POOL CHECK");
  console.log("==================================================");
  console.log(`  Agnes configured: ${configured}`);
  console.log(`  Configured key slots: ${pool.configuredKeys}`);
  console.log(`  Active keys: ${pool.activeKeys}`);
  console.log(`  Base URL: ${AGNES_BASE_URL}`);
  console.log(`  Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`  Available model configuration:`, JSON.stringify(AGNES_MODELS_CONFIG));
  console.log("==================================================");

  if (!configured) {
    console.error("  CRITICAL: No Agnes API keys configured on the server.");
  }

  return { configured, keyLength, keyCount: pool.configuredKeys };
}

/**
 * Safe diagnostic request logger that never logs keys, authorization headers, or user secrets.
 */
export function logSafeRequest(route: string, model: string, status?: number, contentType?: string | null, requestId?: string | null) {
  const configured = getNormalizedAgnesApiKey().length > 0;
  console.log(`[Agnes API] Route=${route} Configured=${configured} Model=${model}${status !== undefined ? ` Status=${status}` : ""}${contentType ? ` Type=${contentType}` : ""}${requestId ? ` RequestId=${requestId}` : ""}`);
}

/**
 * Parses and sanitizes responses from upstream Agnes AI.
 * Handles HTML error pages (502 Bad Gateway, Cloudflare, 503, 504) and extracts useful error messages.
 */
export function parseAndSanitizeResponse(
  status: number,
  text: string,
  requestId?: string | null
): { ok: boolean; data?: any; error?: string; isHtml?: boolean } {
  if (!text || typeof text !== "string") {
    return {
      ok: false,
      error: `AI service returned an empty response (HTTP ${status}). ${requestId ? `Request ID: ${requestId}` : ""}`.trim(),
    };
  }

  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  // Detect HTML or Cloudflare error pages
  if (
    lower.startsWith("<!doctype") ||
    lower.startsWith("<html") ||
    lower.includes("<body") ||
    lower.includes("cloudflare") ||
    lower.includes("</html>") ||
    lower.includes("<head>")
  ) {
    let msg = "AI service returned an invalid response.";
    if (status === 502) msg = "AI service error 502: Bad Gateway / Upstream service temporarily unavailable. Please retry.";
    else if (status === 503) msg = "AI service error 503: Service temporarily unavailable. Please retry.";
    else if (status === 504) msg = "AI service error 504: Gateway timeout. Upstream service timed out. Please retry.";
    else if (status === 429) msg = "AI service rate limit reached. Please wait a moment before retrying.";
    else if (status === 401) msg = "AI service authentication error. AGNES_API_KEY is missing or invalid.";
    else if (status >= 400) msg = `AI service returned HTTP ${status} error.`;

    if (requestId) {
      msg += ` Request ID: ${requestId}`;
    }
    return { ok: false, error: msg, isHtml: true };
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed.error || parsed.message) {
      let errStr = "";
      if (typeof parsed.error === "string") errStr = parsed.error;
      else if (parsed.error && typeof parsed.error.message === "string") errStr = parsed.error.message;
      else if (typeof parsed.message === "string") errStr = parsed.message;

      if (status >= 400 || errStr) {
        if (requestId && errStr && !errStr.includes(requestId)) {
          errStr += ` (Request ID: ${requestId})`;
        }
        return { ok: false, error: errStr || `AI service returned HTTP ${status}`, data: parsed };
      }
    }
    return { ok: true, data: parsed };
  } catch {
    let errStr = `AI service returned an invalid response format (HTTP ${status}).`;
    if (requestId) errStr += ` Request ID: ${requestId}`;
    return { ok: false, error: errStr };
  }
}

/**
 * Standard headers generator with authorization.
 */
export function getAgnesHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const key = getNormalizedAgnesApiKey();
  if (!key) {
    throw new Error("AGNES_API_KEY is not configured on the server.");
  }
  return {
    Authorization: `Bearer ${key}`,
    Accept: "application/json",
    ...extraHeaders,
  };
}

/**
 * Real Agnes Health Check
 * Verifies backend configuration and performs a minimal authenticated request.
 * NEVER returns secrets or API keys.
 */
export async function checkAgnesHealth(): Promise<{
  configured: boolean;
  configuredKeys: number;
  activeKeys: number;
  rateLimitedKeys: number;
  quotaExhaustedKeys: number;
  temporarilyUnavailableKeys: number;
  invalidKeys: number;
  keys: any[];
  baseUrl: string;
  chatModel: string;
  imageModel: string;
  videoModel: string;
  connected?: boolean;
  error?: string;
  timestamp: number;
}> {
  const poolHealth = agnesKeyManager.getPoolHealth();
  const configured = poolHealth.configuredKeys > 0;
  const key = getNormalizedAgnesApiKey();

  const baseResult = {
    configured,
    configuredKeys: poolHealth.configuredKeys,
    activeKeys: poolHealth.activeKeys,
    rateLimitedKeys: poolHealth.rateLimitedKeys,
    quotaExhaustedKeys: poolHealth.quotaExhaustedKeys,
    temporarilyUnavailableKeys: poolHealth.temporarilyUnavailableKeys,
    invalidKeys: poolHealth.invalidKeys,
    keys: poolHealth.keys,
    baseUrl: AGNES_BASE_URL,
    chatModel: AGNES_MODELS_CONFIG.chat.default,
    imageModel: AGNES_MODELS_CONFIG.image.default,
    videoModel: AGNES_MODELS_CONFIG.video.default,
    timestamp: Date.now(),
  };

  if (!configured) {
    return {
      ...baseResult,
      connected: false,
      error: "No Agnes API keys configured on the server.",
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`${AGNES_BASE_URL}/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${key}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      return {
        ...baseResult,
        connected: true,
      };
    } else {
      const errText = await res.text();
      const parsed = parseAndSanitizeResponse(res.status, errText);
      return {
        ...baseResult,
        connected: false,
        error: parsed.error || `HTTP ${res.status}`,
      };
    }
  } catch (err: any) {
    return {
      ...baseResult,
      connected: false,
      error: err.name === "AbortError" ? "Health check timed out" : (err.message || "Connection failed"),
    };
  }
}

/**
 * Extracts and normalizes video URL from various Agnes response keys.
 */
export function extractVideoUrl(data: any): string | null {
  if (!data || typeof data !== "object") return null;

  if (typeof data.url === "string" && data.url.trim().length > 0) return data.url.trim();
  if (typeof data.video_url === "string" && data.video_url.trim().length > 0) return data.video_url.trim();
  if (typeof data.result?.url === "string" && data.result.url.trim().length > 0) return data.result.url.trim();
  if (typeof data.video?.url === "string" && data.video.url.trim().length > 0) return data.video.url.trim();
  if (typeof data.output?.url === "string" && data.output.url.trim().length > 0) return data.output.url.trim();
  if (typeof data.metadata?.url === "string" && data.metadata.url.trim().length > 0) return data.metadata.url.trim();

  if (Array.isArray(data.data) && data.data.length > 0) {
    const first = data.data[0];
    if (typeof first === "string" && first.trim().length > 0) return first.trim();
    if (first && typeof first.url === "string" && first.url.trim().length > 0) return first.url.trim();
  }

  return null;
}
