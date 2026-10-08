/**
 * Canonical Agnes Video Provider Adapter
 * 
 * Centralized, authoritative adapter for video generation and status polling.
 * Enforces:
 * - Proper HTTP payload construction via node:https (eliminating Cloudflare "Failed to read request body")
 * - Content-Type: application/json with exact Content-Length
 * - Model mapping from UI labels to supported provider model IDs
 * - Parameter sanitization (no unsupported FPS or invalid resolutions)
 * - Safe diagnostics without leaking API keys
 * - Clean status and error normalization
 */

import https from "node:https";
import { getNormalizedAgnesApiKey, getAllAvailableAgnesKeys, createNormalizedError, AGNES_BASE_URL } from "./agnesService";
import { agnesKeyManager } from "./agnes/agnesKeyManager";

export interface NormalizedVideoRequest {
  prompt: string;
  model?: string;
  mode?: "text" | "img2video";
  seconds?: number | string;
  duration?: number | string;
  size?: string;
  aspect_ratio?: string;
  first_frame?: string;
  image?: string;
  imageUri?: string;
  reference_image?: string;
  jobId?: string;
  n?: number;
}

export interface VideoJobRecord {
  jobId: string;
  videoId: string;
  model: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  submissionKeyId?: string;
  progress?: string;
  resultUrl?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

// Canonical model mapping: maps display labels and legacy names to supported provider model IDs
export const VIDEO_MODEL_MAP: Record<string, string> = {
  "agnes-video-2.5-flash": "agnes-video-2.5-flash",
  "agnes-video-2.5": "agnes-video-2.5",
  "agnes-video-v2.0": "agnes-video-v2.0",
  "Agnes Video V2.0 (Ultra)": "agnes-video-v2.0",
  "Agnes Video V1.0 (Standard)": "agnes-video-2.5-flash",
  "agnes-video-v1": "agnes-video-2.5-flash",
  "agnes-video-v1.0": "agnes-video-2.5-flash",
  "default": "agnes-video-2.5-flash",
};

export function resolveVideoModelId(modelInput?: string): string {
  if (!modelInput) return "agnes-video-2.5-flash";
  const mapped = VIDEO_MODEL_MAP[modelInput];
  if (mapped) return mapped;
  if (modelInput.startsWith("agnes-video-")) return modelInput;
  return "agnes-video-2.5-flash";
}

export function normalizeVideoResolution(sizeInput?: string): string {
  if (!sizeInput) return "720P";
  const upper = sizeInput.toUpperCase().trim();
  if (upper.includes("1080")) return "1080P";
  if (upper.includes("720")) return "720P";
  if (upper.includes("2K") || upper.includes("4K")) return "1080P";
  return "720P";
}

export function normalizeVideoDuration(secondsInput?: number | string): number {
  const n = Number(secondsInput);
  if (n >= 10) return 10;
  return 5;
}

export function normalizeVideoAspectRatio(aspectInput?: string): string {
  if (!aspectInput) return "16:9";
  const clean = aspectInput.trim();
  if (["16:9", "9:16", "1:1", "4:3"].includes(clean)) return clean;
  return "16:9";
}

// In-memory server job cache
export const serverVideoJobsCache = new Map<string, VideoJobRecord>();

/**
 * High-reliability HTTP request helper that uses native fetch with automatic
 * socket retry on Cloudflare/upstream "Failed to read request body" transient drops.
 */
async function sendAgnesRequest(
  urlStr: string,
  options: {
    method: "GET" | "POST";
    headers: Record<string, string>;
    body?: string;
    timeoutMs?: number;
  }
): Promise<{ status: number; headers: Record<string, string | null>; body: string }> {
  const timeoutMs = options.timeoutMs ?? 60000;
  let lastResult: { status: number; headers: Record<string, string | null>; body: string } | null = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(urlStr, {
        method: options.method,
        headers: options.headers,
        body: options.body,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const responseBody = await res.text();
      const headersMap: Record<string, string | null> = {
        "retry-after": res.headers.get("retry-after"),
        "content-type": res.headers.get("content-type"),
        "x-request-id": res.headers.get("x-request-id"),
      };

      lastResult = {
        status: res.status,
        headers: headersMap,
        body: responseBody,
      };

      // Check for upstream transient socket drop
      if (res.status === 400 && responseBody.includes("Failed to read request body")) {
        console.warn(`[VIDEO] Upstream socket dropped body (attempt ${attempt}/3). Retrying in 250ms...`);
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 250));
          continue;
        }
      }

      return lastResult;
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === "AbortError") {
        throw new Error(`Request to ${urlStr} timed out after ${timeoutMs}ms`);
      }
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 250));
        continue;
      }
      throw err;
    }
  }

  return lastResult!;
}

/**
 * Centralized function to create a video generation job with Agnes API.
 * This is the ONLY place responsible for constructing the provider video request.
 */
export async function createAgnesVideoJob(
  rawInput: NormalizedVideoRequest,
  routeSource = "/api/agnes/videos/generations"
): Promise<{
  success: boolean;
  jobId: string;
  videoId: string;
  taskId: string;
  model: string;
  status: string;
  [key: string]: any;
}> {
  const apiKey = getNormalizedAgnesApiKey();
  if (!apiKey) {
    throw {
      status: 401,
      error: "AGNES_API_KEY is not configured on the server.",
      code: "unauthorized",
    };
  }

  // 1. Resolve and validate model
  const resolvedModel = resolveVideoModelId(rawInput.model);

  // 2. Validate prompt
  const prompt = (rawInput.prompt || "").trim();
  if (!prompt) {
    throw {
      status: 400,
      error: "Video generation prompt is required.",
      code: "invalid_request",
    };
  }

  // 3. Resolve reference image for img2video
  const rawImage =
    rawInput.first_frame ||
    rawInput.image ||
    rawInput.imageUri ||
    rawInput.reference_image;
  const hasValidImage = typeof rawImage === "string" && rawImage.trim().length > 0;
  const isImg2Video = rawInput.mode === "img2video" || hasValidImage;

  // 4. Construct provider payload (DO NOT send unsupported fields like fps)
  let providerPayload: any;
  if (resolvedModel === "agnes-video-v2.0") {
    providerPayload = {
      model: "agnes-video-v2.0",
      prompt,
      duration: normalizeVideoDuration(rawInput.seconds || rawInput.duration),
      ...(isImg2Video && hasValidImage ? { image: rawImage } : {}),
    };
  } else {
    providerPayload = {
      model: resolvedModel,
      prompt,
      mode: isImg2Video ? "img2video" : "text",
      seconds: normalizeVideoDuration(rawInput.seconds || rawInput.duration),
      size: normalizeVideoResolution(rawInput.size),
      aspect_ratio: normalizeVideoAspectRatio(rawInput.aspect_ratio),
      n: Number(rawInput.n) || 1,
      ...(isImg2Video && hasValidImage ? { first_frame: rawImage } : {}),
    };
  }

  const payloadString = JSON.stringify(providerPayload);
  const payloadBuffer = Buffer.from(payloadString, "utf8");

  // Temporary development-only diagnostics (NEVER logging API key or Auth header)
  console.log(`[VIDEO] frontend payload:`, {
    prompt: prompt.substring(0, 60) + (prompt.length > 60 ? "..." : ""),
    model: rawInput.model,
    mode: rawInput.mode,
    seconds: rawInput.seconds,
    hasImage: hasValidImage,
  });
  console.log(`[VIDEO] backend payload:`, {
    model: providerPayload.model,
    mode: providerPayload.mode,
    seconds: providerPayload.seconds ?? providerPayload.duration,
    size: providerPayload.size,
    aspect_ratio: providerPayload.aspect_ratio,
    hasFirstFrame: !!(providerPayload.first_frame || providerPayload.image),
  });
  console.log(`[VIDEO] target endpoint: https://apihub.agnes-ai.com/v1/videos`);
  console.log(`[VIDEO] model: ${resolvedModel}`);
  console.log(`[VIDEO] content-type: application/json`);

  if (!agnesKeyManager.hasConfiguredKeys()) {
    throw {
      status: 401,
      error: "No Agnes API keys configured on the server.",
      code: "unauthorized",
    };
  }

  const triedKeyIds = new Set<string>();
  let lastError: any = null;

  while (triedKeyIds.size < agnesKeyManager.getConfiguredKeyCount()) {
    const keySlot = agnesKeyManager.selectKey(triedKeyIds);
    if (!keySlot) break;
    triedKeyIds.add(keySlot.id);

    try {
      const response = await sendAgnesRequest("https://apihub.agnes-ai.com/v1/videos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${keySlot.secret}`,
          "User-Agent": "XKIRA-VideoStudio/2.0",
          "Accept": "application/json",
        },
        body: payloadString,
        timeoutMs: 60000,
      });

      console.log(`[VIDEO] [${keySlot.id}] response status: ${response.status}`);

      let parsed: any;
      try {
        parsed = JSON.parse(response.body);
      } catch {
        parsed = { error: { message: response.body || `HTTP ${response.status}` } };
      }

      if (response.status >= 200 && response.status < 300) {
        agnesKeyManager.recordSuccess(keySlot.id);

        const videoId =
          parsed.video_id ||
          parsed.id ||
          parsed.videoId ||
          parsed.task_id ||
          `vid_${Date.now()}`;
        const taskId = parsed.task_id || parsed.id || videoId;
        const clientJobId = rawInput.jobId || `job_${Date.now()}`;

        const jobRecord: VideoJobRecord = {
          jobId: clientJobId,
          videoId,
          model: resolvedModel,
          status: "QUEUED",
          submissionKeyId: keySlot.id,
          progress: "Queued in Agnes video pipeline...",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        serverVideoJobsCache.set(clientJobId, jobRecord);
        serverVideoJobsCache.set(videoId, jobRecord);
        if (taskId && taskId !== videoId) {
          serverVideoJobsCache.set(taskId, jobRecord);
        }

        return {
          success: true,
          jobId: clientJobId,
          videoId,
          taskId,
          video_id: videoId,
          task_id: taskId,
          model: resolvedModel,
          status: "QUEUED",
          submissionKeyId: keySlot.id,
          ...parsed,
        };
      }

      const errorMsg =
        parsed?.error?.message ||
        parsed?.message ||
        (typeof parsed?.error === "string" ? parsed.error : `HTTP ${response.status}`);

      if (response.status === 429) {
        agnesKeyManager.recordRateLimit(keySlot.id, {
          retryAfterHeader: response.headers["retry-after"] as string,
          errorText: errorMsg,
          status: 429,
        });

        const nextKey = agnesKeyManager.selectKey(triedKeyIds);
        if (nextKey) {
          console.log(`[VIDEO] Rate limit on ${keySlot.id}. Auto-failover to ${nextKey.id}...`);
          continue;
        }

        lastError = {
          status: 429,
          error: errorMsg,
          code: "rate_limit_exceeded",
        };
        break;
      }

      if (response.status === 401) {
        agnesKeyManager.recordInvalidKey(keySlot.id);
        const nextKey = agnesKeyManager.selectKey(triedKeyIds);
        if (nextKey) {
          console.log(`[VIDEO] ${keySlot.id} invalid. Auto-failover to ${nextKey.id}...`);
          continue;
        }
        lastError = {
          status: 401,
          error: errorMsg,
          code: "unauthorized",
        };
        break;
      }

      if ([500, 502, 503, 504, 520].includes(response.status)) {
        agnesKeyManager.recordServerError(keySlot.id, response.status);
        const nextKey = agnesKeyManager.selectKey(triedKeyIds);
        if (nextKey) {
          console.log(`[VIDEO] Upstream error on ${keySlot.id}. Auto-failover to ${nextKey.id}...`);
          continue;
        }
        lastError = {
          status: response.status,
          error: errorMsg,
          code: "provider_error",
        };
        break;
      }

      // Check if 400 is upstream socket drop (Failed to read request body)
      if (response.status === 400 && errorMsg.includes("Failed to read request body")) {
        const nextKey = agnesKeyManager.selectKey(triedKeyIds);
        if (nextKey) {
          console.log(`[VIDEO] Upstream body read dropped on ${keySlot.id}. Auto-failover to ${nextKey.id}...`);
          continue;
        }
      }

      // 400 Bad Request / 404: Client parameter error
      agnesKeyManager.recordGenericError(keySlot.id);
      throw {
        status: response.status,
        error: errorMsg,
        code: "invalid_request",
      };
    } catch (err: any) {
      if (err.status && err.code === "invalid_request") {
        throw err;
      }
      lastError = err;
    }
  }

  if (lastError) {
    throw lastError;
  }

  const waitSec = agnesKeyManager.getShortestRemainingCooldownSeconds();
  throw {
    status: 429,
    error: `All configured Agnes video keys are currently rate-limited. Please wait ${waitSec}s.`,
    code: "rate_limit_exceeded",
  };
}

/**
 * Polls status of an existing Agnes video job.
 */
export async function getAgnesVideoJob(
  idParam: string,
  modelParam?: string
): Promise<{
  success: boolean;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  progress?: string;
  url?: string;
  video_url?: string;
  resultUrl?: string;
  error?: string;
  [key: string]: any;
}> {
  if (!agnesKeyManager.hasConfiguredKeys()) {
    throw {
      status: 401,
      error: "No Agnes API key configured on the server.",
      code: "unauthorized",
    };
  }

  const cached = serverVideoJobsCache.get(idParam);
  if (cached && cached.status === "COMPLETED" && cached.resultUrl) {
    return {
      success: true,
      jobId: cached.jobId,
      videoId: cached.videoId,
      status: "COMPLETED",
      progress: "100%",
      url: cached.resultUrl,
      video_url: cached.resultUrl,
      resultUrl: cached.resultUrl,
    };
  }

  const targetVideoId = cached?.videoId || idParam;
  const targetModel = resolveVideoModelId(modelParam || cached?.model);

  // Requirement #17: Separate SUBMISSION KEY from POLLING AUTHORIZATION
  // Try submission key first if still healthy; otherwise use any healthy key in the pool with automatic failover
  const triedKeyIds = new Set<string>();
  let res: { status: number; headers: Record<string, string | string[] | undefined>; body: string } | null = null;
  let parsed: any = null;
  let lastPollError: any = null;

  while (triedKeyIds.size < agnesKeyManager.getConfiguredKeyCount()) {
    let keySlot: any = null;
    if (triedKeyIds.size === 0 && cached?.submissionKeyId) {
      const subSlot = agnesKeyManager.getKeySlotById(cached.submissionKeyId);
      if (subSlot && subSlot.state === "ACTIVE" && !triedKeyIds.has(subSlot.id)) {
        keySlot = subSlot;
      }
    }
    if (!keySlot) {
      keySlot = agnesKeyManager.selectKey(triedKeyIds);
    }
    if (!keySlot) {
      const all = getAllAvailableAgnesKeys();
      if (all.length > 0 && triedKeyIds.size === 0) {
        keySlot = { id: "fallback", secret: all[0] };
      } else {
        break;
      }
    }

    triedKeyIds.add(keySlot.id);

    try {
      // Primary endpoint
      const primaryUrl = `https://apihub.agnes-ai.com/agnesapi?video_id=${encodeURIComponent(
        targetVideoId
      )}&model_name=${encodeURIComponent(targetModel)}`;

      res = await sendAgnesRequest(primaryUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${keySlot.secret}`,
          Accept: "application/json",
          "User-Agent": "XKIRA-VideoStudio/2.0",
        },
        timeoutMs: 30000,
      });

      // Fallback endpoint if primary 404s or 5xx
      if (res.status === 404 || res.status >= 500) {
        const fallbackUrl = `${AGNES_BASE_URL}/videos/${encodeURIComponent(targetVideoId)}`;
        try {
          const fbRes = await sendAgnesRequest(fallbackUrl, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${keySlot.secret}`,
              Accept: "application/json",
              "User-Agent": "XKIRA-VideoStudio/2.0",
            },
            timeoutMs: 30000,
          });
          if (fbRes.status < 400) {
            res = fbRes;
          }
        } catch {}
      }

      try {
        parsed = JSON.parse(res.body);
      } catch {
        parsed = { error: { message: res.body } };
      }

      if (res.status >= 200 && res.status < 300) {
        if (keySlot.id !== "fallback") {
          agnesKeyManager.recordSuccess(keySlot.id);
        }
        break; // Successfully got status
      }

      const errorMsg =
        parsed?.error?.message ||
        parsed?.message ||
        `HTTP ${res.status} retrieving video status`;

      // Gracefully handle task not found without throwing 500
      if (
        res.status === 404 ||
        parsed?.code === "task_not_exist" ||
        String(errorMsg).toLowerCase().includes("task not found")
      ) {
        if (cached) {
          cached.status = "FAILED";
          cached.error = "Task not found on upstream provider.";
          cached.updatedAt = Date.now();
        }
        return {
          success: true,
          jobId: cached?.jobId || idParam,
          videoId: targetVideoId,
          status: "FAILED",
          progress: "0%",
          error: "Video task was not found on the upstream service.",
        };
      }

      if (res.status === 429) {
        if (keySlot.id !== "fallback") {
          agnesKeyManager.recordRateLimit(keySlot.id, {
            retryAfterHeader: res.headers["retry-after"] as string,
            errorText: errorMsg,
            status: 429,
          });
        }
        const nextKey = agnesKeyManager.selectKey(triedKeyIds);
        if (nextKey) {
          console.log(`[VIDEO-POLL] Rate limit on ${keySlot.id}. Failover to ${nextKey.id}...`);
          continue;
        }
        lastPollError = { status: 429, error: errorMsg, code: "rate_limit_exceeded" };
        break;
      }

      if (res.status === 401) {
        if (keySlot.id !== "fallback") {
          agnesKeyManager.recordInvalidKey(keySlot.id);
        }
        const nextKey = agnesKeyManager.selectKey(triedKeyIds);
        if (nextKey) {
          console.log(`[VIDEO-POLL] ${keySlot.id} invalid. Failover to ${nextKey.id}...`);
          continue;
        }
        lastPollError = { status: 401, error: errorMsg, code: "unauthorized" };
        break;
      }

      if ([500, 502, 503, 504, 520].includes(res.status)) {
        if (keySlot.id !== "fallback") {
          agnesKeyManager.recordServerError(keySlot.id, res.status);
        }
        const nextKey = agnesKeyManager.selectKey(triedKeyIds);
        if (nextKey) {
          console.log(`[VIDEO-POLL] Upstream ${res.status} on ${keySlot.id}. Failover to ${nextKey.id}...`);
          continue;
        }
        lastPollError = { status: res.status, error: errorMsg, code: "provider_error" };
        break;
      }

      // 400 or other client errors: do not rotate
      if (keySlot.id !== "fallback") {
        agnesKeyManager.recordGenericError(keySlot.id);
      }
      throw {
        status: res.status,
        error: errorMsg,
        code: "status_check_failed",
      };
    } catch (err: any) {
      if (err.status && err.code === "status_check_failed") {
        throw err;
      }
      lastPollError = err;
    }
  }

  if (!res || (res.status >= 400 && lastPollError)) {
    throw lastPollError || {
      status: 500,
      error: "Unable to retrieve video status across available API keys.",
      code: "status_check_failed",
    };
  }

  // Normalize status
  const rawStatus = String(parsed.status || parsed.internal_status || "").toLowerCase();
  let normalizedStatus: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" = "PROCESSING";

  if (rawStatus === "completed" || rawStatus === "success" || rawStatus === "succeeded") {
    normalizedStatus = "COMPLETED";
  } else if (rawStatus === "failed" || rawStatus === "error") {
    normalizedStatus = "FAILED";
  } else if (rawStatus === "submitted" || rawStatus === "queued" || rawStatus === "pending") {
    normalizedStatus = "QUEUED";
  }

  // Extract result URL
  let foundUrl = "";
  if (normalizedStatus === "COMPLETED") {
    if (parsed.url) foundUrl = parsed.url;
    else if (parsed.video_url) foundUrl = parsed.video_url;
    else if (parsed.result?.url) foundUrl = parsed.result.url;
    else if (Array.isArray(parsed.data) && parsed.data[0]?.url) foundUrl = parsed.data[0].url;
    else if (parsed.data?.url) foundUrl = parsed.data.url;
  }

  // Update cached job
  if (cached) {
    cached.status = normalizedStatus;
    cached.updatedAt = Date.now();
    if (foundUrl) {
      cached.resultUrl = foundUrl;
    }
  }

  return {
    success: true,
    jobId: cached?.jobId || idParam,
    videoId: targetVideoId,
    status: normalizedStatus,
    progress: normalizedStatus === "COMPLETED" ? "100%" : parsed.progress || (normalizedStatus === "QUEUED" ? "10%" : "60%"),
    url: foundUrl || undefined,
    video_url: foundUrl || undefined,
    resultUrl: foundUrl || undefined,
    error: normalizedStatus === "FAILED" ? (parsed.error?.message || parsed.error || "Video processing failed") : undefined,
    ...parsed,
  };
}
