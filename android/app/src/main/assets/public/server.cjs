var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_path = __toESM(require("path"), 1);
var import_multer = __toESM(require("multer"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_child_process = require("child_process");
var import_util = require("util");
var import_vite = require("vite");

// src/server/agnes/agnesKeyManager.ts
var AgnesKeyManager = class _AgnesKeyManager {
  constructor() {
    this.slots = [];
    this.reloadKeys();
  }
  static {
    this.instance = null;
  }
  static getInstance() {
    if (!_AgnesKeyManager.instance) {
      _AgnesKeyManager.instance = new _AgnesKeyManager();
    }
    return _AgnesKeyManager.instance;
  }
  /**
   * Loads configured keys from environment variables with priority mapping.
   * Priority:
   * 1. AGNES_API_KEY_1 (or AGNES)
   * 2. AGNES_API_KEY_2 (or AGNES_II)
   * 3. AGNES_API_KEY_3 (or AGNES_III)
   * 4. AGNES_API_KEY_4
   * 5. AGNES_API_KEY_5
   * Legacy: AGNES_API_KEY if not already mapped.
   */
  reloadKeys() {
    const rawConfigs = [
      { envName: "AGNES_API_KEY_1", value: process.env.AGNES_API_KEY_1 || process.env.AGNES_KEY_1 || process.env.AGNES_1 || process.env.AGNES },
      { envName: "AGNES_API_KEY_2", value: process.env.AGNES_API_KEY_2 || process.env.AGNES_KEY_2 || process.env.AGNES_2 || process.env.AGNES_II },
      { envName: "AGNES_API_KEY_3", value: process.env.AGNES_API_KEY_3 || process.env.AGNES_KEY_3 || process.env.AGNES_3 || process.env.AGNES_III },
      { envName: "AGNES_API_KEY_4", value: process.env.AGNES_API_KEY_4 || process.env.AGNES_KEY_4 || process.env.AGNES_4 || process.env.AGNES_IV },
      { envName: "AGNES_API_KEY_5", value: process.env.AGNES_API_KEY_5 || process.env.AGNES_KEY_5 || process.env.AGNES_5 || process.env.AGNES_V }
    ];
    const seenSecrets = /* @__PURE__ */ new Set();
    const newSlots = [];
    rawConfigs.forEach((cfg, idx) => {
      const cleanSecret = this.cleanKey(cfg.value);
      if (cleanSecret && !seenSecrets.has(cleanSecret)) {
        seenSecrets.add(cleanSecret);
        newSlots.push({
          id: `key-${idx + 1}`,
          index: idx,
          sourceEnv: cfg.envName,
          secret: cleanSecret,
          configured: true,
          state: "ACTIVE",
          cooldownUntil: null,
          lastUsedAt: null,
          consecutiveFailures: 0,
          stats: {
            totalRequests: 0,
            successCount: 0,
            rateLimitCount: 0,
            quotaExhaustedCount: 0,
            serverErrorCount: 0,
            invalidCount: 0
          }
        });
      }
    });
    const legacyKey = this.cleanKey(process.env.AGNES_API_KEY);
    if (legacyKey && !seenSecrets.has(legacyKey)) {
      seenSecrets.add(legacyKey);
      newSlots.push({
        id: `key-${newSlots.length + 1}`,
        index: newSlots.length,
        sourceEnv: "AGNES_API_KEY",
        secret: legacyKey,
        configured: true,
        state: "ACTIVE",
        cooldownUntil: null,
        lastUsedAt: null,
        consecutiveFailures: 0,
        stats: {
          totalRequests: 0,
          successCount: 0,
          rateLimitCount: 0,
          quotaExhaustedCount: 0,
          serverErrorCount: 0,
          invalidCount: 0
        }
      });
    }
    this.slots = newSlots;
    console.log(`[AgnesKeyManager] Initialized key pool with ${this.slots.length} configured keys.`);
  }
  cleanKey(val) {
    if (!val || typeof val !== "string") return "";
    return val.replace(/^Bearer\s+/i, "").replace(/^["'\s]+|["'\s]+$/g, "").trim();
  }
  /**
   * Checks if at least one key is configured.
   */
  hasConfiguredKeys() {
    return this.slots.length > 0;
  }
  /**
   * Returns total count of configured keys.
   */
  getConfiguredKeyCount() {
    return this.slots.length;
  }
  /**
   * Checks for expired cooldowns and automatically recovers keys back to ACTIVE state.
   */
  updateCooldowns() {
    const now = Date.now();
    for (const slot of this.slots) {
      if (slot.state === "INVALID" || slot.state === "DISABLED") {
        continue;
      }
      if (slot.cooldownUntil !== null && now >= slot.cooldownUntil) {
        const previousState = slot.state;
        slot.state = "ACTIVE";
        slot.cooldownUntil = null;
        console.log(`[AgnesKeyManager] ${slot.id} cooldown expired. Recovered from ${previousState} to ACTIVE.`);
      }
    }
  }
  /**
   * Selects the highest-priority healthy key according to deterministic order:
   * 1. First healthy ACTIVE key (Key 1 -> Key 2 -> Key 3...)
   * 2. If all keys are in cooldown, returns null (or the shortest remaining cooldown).
   * 
   * Zero speculative network overhead: does not make preflight health check calls.
   */
  selectKey(excludeKeyIds = /* @__PURE__ */ new Set()) {
    this.updateCooldowns();
    for (const slot of this.slots) {
      if (excludeKeyIds.has(slot.id)) continue;
      if (slot.state === "ACTIVE") {
        return slot;
      }
    }
    const now = Date.now();
    for (const slot of this.slots) {
      if (excludeKeyIds.has(slot.id)) continue;
      if (slot.cooldownUntil && now >= slot.cooldownUntil && slot.state !== "INVALID") {
        slot.state = "ACTIVE";
        slot.cooldownUntil = null;
        return slot;
      }
    }
    return null;
  }
  /**
   * Finds the shortest remaining cooldown in seconds among eligible keys.
   */
  getShortestRemainingCooldownSeconds(excludeKeyIds = /* @__PURE__ */ new Set()) {
    this.updateCooldowns();
    const now = Date.now();
    let minMs = Infinity;
    for (const slot of this.slots) {
      if (excludeKeyIds.has(slot.id) || slot.state === "INVALID") continue;
      if (slot.cooldownUntil && slot.cooldownUntil > now) {
        const diff = slot.cooldownUntil - now;
        if (diff < minMs) minMs = diff;
      }
    }
    if (minMs === Infinity) return 15;
    return Math.max(1, Math.ceil(minMs / 1e3));
  }
  /**
   * Retrieves a specific key slot by ID (e.g. for video polling).
   */
  getKeySlotById(keyId) {
    this.updateCooldowns();
    return this.slots.find((s) => s.id === keyId) || null;
  }
  /**
   * Records a successful request on a key slot.
   */
  recordSuccess(keyId) {
    const slot = this.slots.find((s) => s.id === keyId);
    if (!slot) return;
    slot.lastUsedAt = Date.now();
    slot.consecutiveFailures = 0;
    slot.stats.totalRequests++;
    slot.stats.successCount++;
    if (slot.state !== "INVALID") {
      slot.state = "ACTIVE";
      slot.cooldownUntil = null;
    }
  }
  /**
   * Records a rate limit (HTTP 429) or quota exhaustion on a key slot.
   */
  recordRateLimit(keyId, options) {
    const slot = this.slots.find((s) => s.id === keyId);
    if (!slot) return;
    slot.lastUsedAt = Date.now();
    slot.consecutiveFailures++;
    slot.stats.totalRequests++;
    const lower = (options?.errorText || "").toLowerCase();
    const isQuotaExhausted = lower.includes("token plan") || lower.includes("free users") || lower.includes("insufficient quota") || lower.includes("credit balance") || lower.includes("quota exceeded") || lower.includes("account quota");
    if (isQuotaExhausted) {
      slot.state = "QUOTA_EXHAUSTED";
      slot.stats.quotaExhaustedCount++;
      const quotaCooldownMs = this.parseRetryAfter(options?.retryAfterHeader) || 30 * 60 * 1e3;
      slot.cooldownUntil = Date.now() + quotaCooldownMs;
      console.warn(
        `[AgnesKeyManager] ${slot.id} (${slot.sourceEnv}) marked QUOTA_EXHAUSTED. Cooldown until ${new Date(
          slot.cooldownUntil
        ).toLocaleTimeString()}`
      );
    } else {
      slot.state = "RATE_LIMITED";
      slot.stats.rateLimitCount++;
      const parsedRetryAfter = this.parseRetryAfter(options?.retryAfterHeader);
      const backoffMs = parsedRetryAfter || Math.min(15e3 * Math.pow(2, Math.max(0, slot.consecutiveFailures - 1)), 3e5);
      slot.cooldownUntil = Date.now() + backoffMs;
      console.warn(
        `[AgnesKeyManager] ${slot.id} (${slot.sourceEnv}) marked RATE_LIMITED. Cooldown: ${Math.round(
          backoffMs / 1e3
        )}s.`
      );
    }
  }
  /**
   * Records temporary server errors (500, 502, 503, 504, 520, timeout).
   */
  recordServerError(keyId, status = 500) {
    const slot = this.slots.find((s) => s.id === keyId);
    if (!slot) return;
    slot.lastUsedAt = Date.now();
    slot.consecutiveFailures++;
    slot.stats.totalRequests++;
    slot.stats.serverErrorCount++;
    slot.state = "TEMPORARILY_UNAVAILABLE";
    slot.cooldownUntil = Date.now() + 15e3;
    console.warn(
      `[AgnesKeyManager] ${slot.id} marked TEMPORARILY_UNAVAILABLE (HTTP ${status}). Short cooldown 15s.`
    );
  }
  /**
   * Records permanent key invalidation (HTTP 401).
   */
  recordInvalidKey(keyId) {
    const slot = this.slots.find((s) => s.id === keyId);
    if (!slot) return;
    slot.lastUsedAt = Date.now();
    slot.stats.totalRequests++;
    slot.stats.invalidCount++;
    slot.state = "INVALID";
    slot.cooldownUntil = null;
    console.error(
      `[AgnesKeyManager] ${slot.id} (${slot.sourceEnv}) marked INVALID (HTTP 401 Unauthorized). Excluded from rotation.`
    );
  }
  /**
   * Records key restriction / account disability (HTTP 403 Forbidden).
   */
  recordDisabledKey(keyId, reason) {
    const slot = this.slots.find((s) => s.id === keyId);
    if (!slot) return;
    slot.lastUsedAt = Date.now();
    slot.stats.totalRequests++;
    slot.stats.invalidCount++;
    slot.state = "DISABLED";
    slot.cooldownUntil = null;
    console.error(
      `[AgnesKeyManager] ${slot.id} (${slot.sourceEnv}) marked DISABLED (HTTP 403 Forbidden: ${reason || "Account/Key restricted"}). Excluded from rotation.`
    );
  }
  /**
   * Records general request without state change (e.g. 400 Bad Request, parameter error).
   */
  recordGenericError(keyId) {
    const slot = this.slots.find((s) => s.id === keyId);
    if (!slot) return;
    slot.lastUsedAt = Date.now();
    slot.stats.totalRequests++;
  }
  parseRetryAfter(headerVal) {
    if (!headerVal) return null;
    if (typeof headerVal === "number") {
      return headerVal > 0 ? headerVal * 1e3 : null;
    }
    const num = Number(headerVal);
    if (!isNaN(num) && num > 0) {
      return num * 1e3;
    }
    const parsedDate = Date.parse(headerVal);
    if (!isNaN(parsedDate) && parsedDate > Date.now()) {
      return parsedDate - Date.now();
    }
    return null;
  }
  /**
   * Returns safe pool health report without exposing secrets.
   */
  getPoolHealth() {
    this.updateCooldowns();
    const now = Date.now();
    const safeSummaries = this.slots.map((s) => {
      let remainingSec = null;
      if (s.cooldownUntil && s.cooldownUntil > now) {
        remainingSec = Math.ceil((s.cooldownUntil - now) / 1e3);
      }
      return {
        id: s.id,
        index: s.index,
        sourceEnv: s.sourceEnv,
        configured: s.configured,
        state: s.state,
        cooldownRemainingSeconds: remainingSec,
        lastUsedAt: s.lastUsedAt,
        consecutiveFailures: s.consecutiveFailures,
        stats: { ...s.stats }
      };
    });
    const activeKeys = safeSummaries.filter((s) => s.state === "ACTIVE").length;
    const rateLimitedKeys = safeSummaries.filter((s) => s.state === "RATE_LIMITED").length;
    const quotaExhaustedKeys = safeSummaries.filter((s) => s.state === "QUOTA_EXHAUSTED").length;
    const temporarilyUnavailableKeys = safeSummaries.filter(
      (s) => s.state === "TEMPORARILY_UNAVAILABLE"
    ).length;
    const invalidKeys = safeSummaries.filter((s) => s.state === "INVALID").length;
    return {
      configuredKeys: safeSummaries.length,
      activeKeys,
      rateLimitedKeys,
      quotaExhaustedKeys,
      temporarilyUnavailableKeys,
      invalidKeys,
      keys: safeSummaries,
      timestamp: now
    };
  }
  /**
   * Helper that executes an operation using the healthy key pool with automatic failover.
   */
  async executeWithFailover(operation, context = "Request") {
    const triedKeyIds = /* @__PURE__ */ new Set();
    let lastError = null;
    while (triedKeyIds.size < this.slots.length) {
      const key = this.selectKey(triedKeyIds);
      if (!key) {
        break;
      }
      triedKeyIds.add(key.id);
      try {
        const result = await operation(key);
        const { status, errorText, retryAfter, data } = result;
        if (status >= 200 && status < 300) {
          this.recordSuccess(key.id);
          return { data, keyId: key.id, status };
        }
        if (status === 429) {
          this.recordRateLimit(key.id, {
            retryAfterHeader: retryAfter,
            errorText,
            status
          });
          const nextAvailable = this.selectKey(triedKeyIds);
          if (nextAvailable) {
            console.log(
              `[AgnesKeyManager] [${context}] Failover from ${key.id} to ${nextAvailable.id} due to rate limit.`
            );
            continue;
          } else {
            lastError = {
              status: 429,
              error: errorText || "Agnes AI rate limit reached across all configured API keys.",
              code: "rate_limit_exceeded",
              keyId: key.id
            };
            break;
          }
        }
        if (status === 401) {
          this.recordInvalidKey(key.id);
          const nextAvailable = this.selectKey(triedKeyIds);
          if (nextAvailable) {
            console.log(
              `[AgnesKeyManager] [${context}] ${key.id} invalid. Failing over to ${nextAvailable.id}.`
            );
            continue;
          } else {
            lastError = {
              status: 401,
              error: "Configured Agnes API key is invalid or unauthorized.",
              code: "unauthorized",
              keyId: key.id
            };
            break;
          }
        }
        if ([500, 502, 503, 504, 520].includes(status)) {
          this.recordServerError(key.id, status);
          const nextAvailable = this.selectKey(triedKeyIds);
          if (nextAvailable) {
            console.log(
              `[AgnesKeyManager] [${context}] ${key.id} encountered upstream ${status}. Failing over to ${nextAvailable.id}.`
            );
            continue;
          } else {
            lastError = {
              status,
              error: errorText || `Upstream Agnes AI server error (HTTP ${status}).`,
              code: "server_error",
              keyId: key.id
            };
            break;
          }
        }
        this.recordGenericError(key.id);
        throw {
          status,
          error: errorText || `Request failed with HTTP ${status}.`,
          code: status === 400 ? "bad_request" : "client_error",
          keyId: key.id
        };
      } catch (err) {
        if (err.status && err.code === "bad_request") {
          throw err;
        }
        if (err.name === "AbortError" || err.message?.includes("timed out")) {
          this.recordServerError(key.id, 504);
          const nextAvailable = this.selectKey(triedKeyIds);
          if (nextAvailable) {
            console.log(
              `[AgnesKeyManager] [${context}] ${key.id} request timed out. Failing over to ${nextAvailable.id}.`
            );
            continue;
          }
        }
        lastError = err;
      }
    }
    if (lastError) {
      throw lastError;
    }
    const shortestCooldown = this.getShortestRemainingCooldownSeconds();
    throw {
      status: 429,
      error: `All configured Agnes API keys are currently rate-limited or in cooldown. Please wait ${shortestCooldown}s.`,
      code: "pool_exhausted",
      cooldownSeconds: shortestCooldown
    };
  }
};
var agnesKeyManager = AgnesKeyManager.getInstance();

// src/server/agnesService.ts
var AGNES_BASE_URL = "https://apihub.agnes-ai.com/v1";
var AGNES_MODELS_CONFIG = {
  chat: {
    default: "agnes-3.0-flash",
    fallback: "agnes-2.5-pro"
  },
  image: {
    default: "agnes-image-2.5-flash",
    fallback: "agnes-image-2.1-flash"
  },
  video: {
    default: "agnes-video-2.5-flash",
    highQuality: "agnes-video-2.5",
    legacy: "agnes-video-v2.0"
  }
};
function isRateLimitOrQuotaError(status, errorText) {
  if (status === 429) return true;
  if (!errorText || typeof errorText !== "string") return false;
  const lower = errorText.toLowerCase();
  return lower.includes("rate limit") || lower.includes("token plan") || lower.includes("free users") || lower.includes("insufficient quota") || lower.includes("credit balance") || lower.includes("quota exceeded") || lower.includes("account quota") || lower.includes("too many requests") || lower.includes("rate_limit") || lower.includes("limit reached") || lower.includes("concurrency limit") || lower.includes("exceeded your current quota") || lower.includes("out of credits") || lower.includes("quota_exceeded") || lower.includes("upgrade to a token plan");
}
function createNormalizedError(message, status = 500, code = "generation_error", requestId) {
  let normalizedCode = code;
  let normalizedStatus = status;
  if (isRateLimitOrQuotaError(status, message)) {
    normalizedCode = "rate_limit_exceeded";
    if (status < 400 || status === 500) {
      normalizedStatus = 429;
    }
  } else if (status === 401) normalizedCode = "unauthorized";
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
      status: normalizedStatus,
      ...requestId ? { requestId } : {}
    }
  };
}
function getAllAvailableAgnesKeys() {
  const health = agnesKeyManager.getPoolHealth();
  const keys = [];
  for (const k of health.keys) {
    const slot = agnesKeyManager.getKeySlotById(k.id);
    if (slot && slot.secret) {
      keys.push(slot.secret);
    }
  }
  return keys;
}
function getNormalizedAgnesApiKey() {
  const selected = agnesKeyManager.selectKey();
  if (selected) return selected.secret;
  const all = getAllAvailableAgnesKeys();
  return all.length > 0 ? all[0] : "";
}
function logStartupConfiguration() {
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
function parseAndSanitizeResponse(status, text, requestId) {
  if (!text || typeof text !== "string") {
    return {
      ok: false,
      error: `AI service returned an empty response (HTTP ${status}). ${requestId ? `Request ID: ${requestId}` : ""}`.trim()
    };
  }
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("<!doctype") || lower.startsWith("<html") || lower.includes("<body") || lower.includes("cloudflare") || lower.includes("</html>") || lower.includes("<head>")) {
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
async function checkAgnesHealth() {
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
    timestamp: Date.now()
  };
  if (!configured) {
    return {
      ...baseResult,
      connected: false,
      error: "No Agnes API keys configured on the server."
    };
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6e3);
    const res = await fetch(`${AGNES_BASE_URL}/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${key}`
      },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (res.ok) {
      return {
        ...baseResult,
        connected: true
      };
    } else {
      const errText = await res.text();
      const parsed = parseAndSanitizeResponse(res.status, errText);
      return {
        ...baseResult,
        connected: false,
        error: parsed.error || `HTTP ${res.status}`
      };
    }
  } catch (err) {
    return {
      ...baseResult,
      connected: false,
      error: err.name === "AbortError" ? "Health check timed out" : err.message || "Connection failed"
    };
  }
}

// src/server/agnesVideoProvider.ts
var VIDEO_MODEL_MAP = {
  "agnes-video-2.5-flash": "agnes-video-2.5-flash",
  "agnes-video-2.5": "agnes-video-2.5",
  "agnes-video-v2.0": "agnes-video-v2.0",
  "Agnes Video V2.0 (Ultra)": "agnes-video-v2.0",
  "Agnes Video V1.0 (Standard)": "agnes-video-2.5-flash",
  "agnes-video-v1": "agnes-video-2.5-flash",
  "agnes-video-v1.0": "agnes-video-2.5-flash",
  "default": "agnes-video-2.5-flash"
};
function resolveVideoModelId(modelInput) {
  if (!modelInput) return "agnes-video-2.5-flash";
  const mapped = VIDEO_MODEL_MAP[modelInput];
  if (mapped) return mapped;
  if (modelInput.startsWith("agnes-video-")) return modelInput;
  return "agnes-video-2.5-flash";
}
function normalizeVideoResolution(sizeInput) {
  if (!sizeInput) return "720P";
  const upper = sizeInput.toUpperCase().trim();
  if (upper.includes("1080")) return "1080P";
  if (upper.includes("720")) return "720P";
  if (upper.includes("2K") || upper.includes("4K")) return "1080P";
  return "720P";
}
function normalizeVideoDuration(secondsInput) {
  const n = Number(secondsInput);
  if (n >= 10) return 10;
  return 5;
}
function normalizeVideoAspectRatio(aspectInput) {
  if (!aspectInput) return "16:9";
  const clean = aspectInput.trim();
  if (["16:9", "9:16", "1:1", "4:3"].includes(clean)) return clean;
  return "16:9";
}
var serverVideoJobsCache = /* @__PURE__ */ new Map();
async function sendAgnesRequest(urlStr, options) {
  const timeoutMs = options.timeoutMs ?? 6e4;
  let lastResult = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const reqHeaders = { ...options.headers };
      if (options.body) {
        reqHeaders["Content-Length"] = Buffer.byteLength(options.body, "utf8").toString();
      }
      const res = await fetch(urlStr, {
        method: options.method,
        headers: reqHeaders,
        body: options.body,
        signal: controller.signal
      });
      clearTimeout(timeout);
      const responseBody = await res.text();
      const headersMap = {
        "retry-after": res.headers.get("retry-after"),
        "content-type": res.headers.get("content-type"),
        "x-request-id": res.headers.get("x-request-id")
      };
      lastResult = {
        status: res.status,
        headers: headersMap,
        body: responseBody
      };
      if (res.status === 400 && responseBody.includes("Failed to read request body")) {
        console.warn(`[VIDEO] Upstream socket dropped body (attempt ${attempt}/3). Retrying in ${attempt * 300}ms...`);
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, attempt * 300));
          continue;
        }
      }
      return lastResult;
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === "AbortError") {
        throw new Error(`Request to ${urlStr} timed out after ${timeoutMs}ms`);
      }
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, attempt * 300));
        continue;
      }
      throw err;
    }
  }
  return lastResult;
}
async function createAgnesVideoJob(rawInput, routeSource = "/api/agnes/videos/generations") {
  const apiKey = getNormalizedAgnesApiKey();
  if (!apiKey) {
    throw {
      status: 401,
      error: "AGNES_API_KEY is not configured on the server.",
      code: "unauthorized"
    };
  }
  const resolvedModel = resolveVideoModelId(rawInput.model);
  const prompt = (rawInput.prompt || "").trim();
  if (!prompt) {
    throw {
      status: 400,
      error: "Video generation prompt is required.",
      code: "invalid_request"
    };
  }
  const rawImage = rawInput.first_frame || rawInput.image || rawInput.imageUri || rawInput.reference_image;
  const hasValidImage = typeof rawImage === "string" && rawImage.trim().length > 0;
  const isImg2Video = rawInput.mode === "img2video" || hasValidImage;
  let providerPayload;
  if (resolvedModel === "agnes-video-v2.0") {
    providerPayload = {
      model: "agnes-video-v2.0",
      prompt,
      duration: normalizeVideoDuration(rawInput.seconds || rawInput.duration),
      ...isImg2Video && hasValidImage ? { image: rawImage } : {}
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
      ...isImg2Video && hasValidImage ? { first_frame: rawImage } : {}
    };
  }
  const payloadString = JSON.stringify(providerPayload);
  const payloadBuffer = Buffer.from(payloadString, "utf8");
  console.log(`[VIDEO] frontend payload:`, {
    prompt: prompt.substring(0, 60) + (prompt.length > 60 ? "..." : ""),
    model: rawInput.model,
    mode: rawInput.mode,
    seconds: rawInput.seconds,
    hasImage: hasValidImage
  });
  console.log(`[VIDEO] backend payload:`, {
    model: providerPayload.model,
    mode: providerPayload.mode,
    seconds: providerPayload.seconds ?? providerPayload.duration,
    size: providerPayload.size,
    aspect_ratio: providerPayload.aspect_ratio,
    hasFirstFrame: !!(providerPayload.first_frame || providerPayload.image)
  });
  console.log(`[VIDEO] target endpoint: https://apihub.agnes-ai.com/v1/videos`);
  console.log(`[VIDEO] model: ${resolvedModel}`);
  console.log(`[VIDEO] content-type: application/json`);
  if (!agnesKeyManager.hasConfiguredKeys()) {
    throw {
      status: 401,
      error: "No Agnes API keys configured on the server.",
      code: "unauthorized"
    };
  }
  const triedKeyIds = /* @__PURE__ */ new Set();
  let lastError = null;
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
          "Accept": "application/json"
        },
        body: payloadString,
        timeoutMs: 6e4
      });
      console.log(`[VIDEO] [${keySlot.id}] response status: ${response.status}`);
      let parsed;
      try {
        parsed = JSON.parse(response.body);
      } catch {
        parsed = { error: { message: response.body || `HTTP ${response.status}` } };
      }
      if (response.status >= 200 && response.status < 300) {
        agnesKeyManager.recordSuccess(keySlot.id);
        const videoId = parsed.video_id || parsed.id || parsed.videoId || parsed.task_id || `vid_${Date.now()}`;
        const taskId = parsed.task_id || parsed.id || videoId;
        const clientJobId = rawInput.jobId || `job_${Date.now()}`;
        const jobRecord = {
          jobId: clientJobId,
          videoId,
          model: resolvedModel,
          status: "QUEUED",
          submissionKeyId: keySlot.id,
          progress: "Queued in Agnes video pipeline...",
          createdAt: Date.now(),
          updatedAt: Date.now()
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
          ...parsed
        };
      }
      const errorMsg = parsed?.error?.message || parsed?.message || (typeof parsed?.error === "string" ? parsed.error : `HTTP ${response.status}`);
      if (isRateLimitOrQuotaError(response.status, errorMsg)) {
        agnesKeyManager.recordRateLimit(keySlot.id, {
          retryAfterHeader: response.headers["retry-after"],
          errorText: errorMsg,
          status: response.status
        });
        const nextKey = agnesKeyManager.selectKey(triedKeyIds);
        if (nextKey) {
          console.log(`[VIDEO] Rate limit / quota error on ${keySlot.id}. Auto-failover to ${nextKey.id}...`);
          continue;
        }
        lastError = {
          status: 429,
          error: errorMsg,
          code: "rate_limit_exceeded"
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
          code: "unauthorized"
        };
        break;
      }
      if (response.status === 403) {
        agnesKeyManager.recordDisabledKey(keySlot.id, errorMsg);
        const nextKey = agnesKeyManager.selectKey(triedKeyIds);
        if (nextKey) {
          console.log(`[VIDEO] ${keySlot.id} disabled (HTTP 403). Auto-failover to ${nextKey.id}...`);
          continue;
        }
        lastError = {
          status: 403,
          error: errorMsg,
          code: "forbidden"
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
          code: "provider_error"
        };
        break;
      }
      if (response.status === 400 && errorMsg.includes("Failed to read request body")) {
        agnesKeyManager.recordGenericError(keySlot.id);
        const nextKey = agnesKeyManager.selectKey(triedKeyIds);
        if (nextKey) {
          console.log(`[VIDEO] Upstream body read dropped on ${keySlot.id}. Auto-failover to ${nextKey.id}...`);
          continue;
        }
        lastError = {
          status: 503,
          error: "Upstream video processing service temporarily dropped the request payload. Please retry shortly.",
          code: "provider_error"
        };
        break;
      }
      if (response.status === 503 || errorMsg.includes("video queue is full") || errorMsg.includes("video_queue_full") || errorMsg.includes("queue is full")) {
        agnesKeyManager.recordServerError(keySlot.id, 503);
        const nextKey = agnesKeyManager.selectKey(triedKeyIds);
        if (nextKey) {
          console.log(`[VIDEO] Upstream video queue full on ${keySlot.id}. Auto-failover to ${nextKey.id}...`);
          continue;
        }
        lastError = {
          status: 503,
          error: "Agnes AI video generation queue is currently full. Please retry in a few moments.",
          code: "provider_busy"
        };
        break;
      }
      agnesKeyManager.recordGenericError(keySlot.id);
      throw {
        status: response.status,
        error: errorMsg,
        code: "invalid_request"
      };
    } catch (err) {
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
    code: "rate_limit_exceeded"
  };
}
async function getAgnesVideoJob(idParam, modelParam) {
  if (!agnesKeyManager.hasConfiguredKeys()) {
    throw {
      status: 401,
      error: "No Agnes API key configured on the server.",
      code: "unauthorized"
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
      resultUrl: cached.resultUrl
    };
  }
  const targetVideoId = cached?.videoId || idParam;
  const targetModel = resolveVideoModelId(modelParam || cached?.model);
  const triedKeyIds = /* @__PURE__ */ new Set();
  let res = null;
  let parsed = null;
  let lastPollError = null;
  while (triedKeyIds.size < agnesKeyManager.getConfiguredKeyCount()) {
    let keySlot = null;
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
      const primaryUrl = `https://apihub.agnes-ai.com/v1/videos/${encodeURIComponent(targetVideoId)}`;
      res = await sendAgnesRequest(primaryUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${keySlot.secret}`,
          Accept: "application/json",
          "User-Agent": "XKIRA-VideoStudio/2.0"
        },
        timeoutMs: 3e4
      });
      if (res.status === 404 || res.status >= 500) {
        const fallbackUrl = `https://apihub.agnes-ai.com/v1/video/generations/${encodeURIComponent(targetVideoId)}`;
        try {
          const fbRes = await sendAgnesRequest(fallbackUrl, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${keySlot.secret}`,
              Accept: "application/json",
              "User-Agent": "XKIRA-VideoStudio/2.0"
            },
            timeoutMs: 3e4
          });
          if (fbRes.status < 400) {
            res = fbRes;
          }
        } catch {
        }
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
        break;
      }
      const errorMsg = parsed?.error?.message || parsed?.message || `HTTP ${res.status} retrieving video status`;
      if (res.status === 404 || parsed?.code === "task_not_exist" || String(errorMsg).toLowerCase().includes("task not found") || String(errorMsg).toLowerCase().includes("task_not_exist") || String(errorMsg).toLowerCase().includes("not exist")) {
        const isRecent = cached && Date.now() - cached.createdAt < 9e4;
        if (isRecent) {
          return {
            success: true,
            jobId: cached?.jobId || idParam,
            videoId: targetVideoId,
            status: "QUEUED",
            progress: cached.progress || "15%",
            note: "Task pending in upstream processing pipeline..."
          };
        }
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
          error: "Video task was not found on the upstream service."
        };
      }
      if (res.status === 429) {
        if (keySlot.id !== "fallback") {
          agnesKeyManager.recordRateLimit(keySlot.id, {
            retryAfterHeader: res.headers["retry-after"],
            errorText: errorMsg,
            status: 429
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
      if (res.status === 403) {
        if (keySlot.id !== "fallback") {
          agnesKeyManager.recordDisabledKey(keySlot.id, errorMsg);
        }
        const nextKey = agnesKeyManager.selectKey(triedKeyIds);
        if (nextKey) {
          console.log(`[VIDEO-POLL] ${keySlot.id} disabled (HTTP 403). Failover to ${nextKey.id}...`);
          continue;
        }
        lastPollError = { status: 403, error: errorMsg, code: "forbidden" };
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
      if (keySlot.id !== "fallback") {
        agnesKeyManager.recordGenericError(keySlot.id);
      }
      throw {
        status: res.status,
        error: errorMsg,
        code: "status_check_failed"
      };
    } catch (err) {
      if (err.status && err.code === "status_check_failed") {
        throw err;
      }
      lastPollError = err;
    }
  }
  if (!res || res.status >= 400 && lastPollError) {
    if (cached && (cached.status === "QUEUED" || cached.status === "PROCESSING")) {
      return {
        success: true,
        jobId: cached.jobId,
        videoId: targetVideoId,
        status: cached.status,
        progress: cached.progress || "50%",
        note: "Status check paused awaiting rate limit cooldown..."
      };
    }
    return {
      success: true,
      jobId: cached?.jobId || idParam,
      videoId: targetVideoId,
      status: "FAILED",
      progress: "0%",
      error: lastPollError?.error || "Unable to retrieve video status across available API keys."
    };
  }
  const rawStatus = String(parsed.status || parsed.internal_status || "").toLowerCase();
  let normalizedStatus = "PROCESSING";
  if (rawStatus === "completed" || rawStatus === "success" || rawStatus === "succeeded") {
    normalizedStatus = "COMPLETED";
  } else if (rawStatus === "failed" || rawStatus === "error") {
    normalizedStatus = "FAILED";
  } else if (rawStatus === "submitted" || rawStatus === "queued" || rawStatus === "pending") {
    normalizedStatus = "QUEUED";
  }
  let foundUrl = "";
  if (normalizedStatus === "COMPLETED") {
    if (parsed.url) foundUrl = parsed.url;
    else if (parsed.video_url) foundUrl = parsed.video_url;
    else if (parsed.result?.url) foundUrl = parsed.result.url;
    else if (Array.isArray(parsed.data) && parsed.data[0]?.url) foundUrl = parsed.data[0].url;
    else if (parsed.data?.url) foundUrl = parsed.data.url;
  }
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
    url: foundUrl || void 0,
    video_url: foundUrl || void 0,
    resultUrl: foundUrl || void 0,
    error: normalizedStatus === "FAILED" ? parsed.error?.message || parsed.error || "Video processing failed" : void 0,
    ...parsed
  };
}

// server.ts
var execAsync = (0, import_util.promisify)(import_child_process.exec);
var upload = (0, import_multer.default)({ storage: import_multer.default.memoryStorage() });
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use((0, import_cors.default)());
  app.use(import_express.default.json({ limit: "50mb" }));
  app.use(import_express.default.urlencoded({ extended: true, limit: "50mb" }));
  app.get("/api/health", (req, res) => {
    const pool = agnesKeyManager.getPoolHealth();
    res.json({
      provider: "agnes",
      keysConfigured: pool.configuredKeys,
      activeKeys: pool.activeKeys,
      rateLimitedKeys: pool.rateLimitedKeys + pool.quotaExhaustedKeys,
      invalidKeys: pool.invalidKeys,
      configuredKeys: pool.configuredKeys,
      status: "ok"
    });
  });
  app.get("/api/download", async (req, res) => {
    const rawUrl = req.query.url;
    let filename = req.query.filename || `XKIRA_Download_${Date.now()}`;
    if (!rawUrl) {
      return res.status(400).json({ error: "Missing 'url' query parameter." });
    }
    filename = filename.replace(/[/\\?%*:|"<>]/g, "_").trim();
    try {
      if (rawUrl.startsWith("/exports/")) {
        const localPath = import_path.default.join(exportsDir, import_path.default.basename(rawUrl));
        if (import_fs.default.existsSync(localPath)) {
          return res.download(localPath, filename);
        }
      }
      if (rawUrl.startsWith("/cached_references/")) {
        const localPath = import_path.default.join(cachedRefDir, import_path.default.basename(rawUrl));
        if (import_fs.default.existsSync(localPath)) {
          return res.download(localPath, filename);
        }
      }
      if (rawUrl.startsWith("data:")) {
        const matches = rawUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          return res.status(400).json({ error: "Invalid data URI format." });
        }
        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], "base64");
        res.setHeader("Content-Type", mimeType);
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Length", buffer.length);
        return res.send(buffer);
      }
      const targetUrl = rawUrl.startsWith("//") ? `https:${rawUrl}` : rawUrl;
      const remoteRes = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "*/*"
        }
      });
      if (!remoteRes.ok) {
        return res.status(remoteRes.status).json({
          error: `Remote download failed with status ${remoteRes.status}: ${remoteRes.statusText}`
        });
      }
      const contentType = remoteRes.headers.get("content-type") || "application/octet-stream";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      const contentLength = remoteRes.headers.get("content-length");
      if (contentLength) {
        res.setHeader("Content-Length", contentLength);
      }
      if (remoteRes.body) {
        const arrayBuffer = await remoteRes.arrayBuffer();
        res.send(Buffer.from(arrayBuffer));
      } else {
        res.status(500).json({ error: "No response body received from remote media host." });
      }
    } catch (err) {
      console.error("[DownloadProxy] Download proxy error:", err);
      res.status(500).json({ error: `Download failed: ${err.message || err}` });
    }
  });
  const { configured: AGNES_KEY_PRESENT, keyLength: AGNES_KEY_LENGTH } = logStartupConfiguration();
  const AGNES_API_KEY = getNormalizedAgnesApiKey();
  function logSafeDiagnostic(route, model, status, contentType, requestId) {
    const isConfigured = getNormalizedAgnesApiKey().length > 0;
    console.log(`[Diagnostic] ROUTE=${route} CONFIGURED=${isConfigured} BASE_URL=${AGNES_BASE_URL} MODEL=${model}${status !== void 0 ? ` STATUS=${status}` : ""}${contentType ? ` CONTENT_TYPE=${contentType}` : ""}${requestId ? ` REQUEST_ID=${requestId}` : ""}`);
  }
  function parseAndSanitizeResponseText(status, text, requestId) {
    if (!text || typeof text !== "string") {
      return {
        ok: false,
        error: `AI service returned an empty response (HTTP ${status}). ${requestId ? `Request ID: ${requestId}` : ""}`.trim()
      };
    }
    const trimmed = text.trim();
    const lower = trimmed.toLowerCase();
    if (lower.startsWith("<!doctype") || lower.startsWith("<html") || lower.includes("<body") || lower.includes("cloudflare") || lower.includes("</html>") || lower.includes("<head>")) {
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
  app.get("/api/agnes/health", async (req, res) => {
    try {
      const health = await checkAgnesHealth();
      res.json(health);
    } catch (err) {
      res.status(500).json({
        configured: false,
        baseUrl: AGNES_BASE_URL,
        error: err.message || "Health check failed",
        timestamp: Date.now()
      });
    }
  });
  const handleChatCompletion = async (req, res) => {
    const route = req.path;
    const model = req.body?.model || AGNES_MODELS_CONFIG.chat.default;
    if (!agnesKeyManager.hasConfiguredKeys()) {
      logSafeDiagnostic(route, model, 401);
      return res.status(401).json(createNormalizedError("No Agnes API keys configured on the server.", 401));
    }
    const reqBodyObj = {
      model,
      messages: req.body.messages,
      stream: !!req.body.stream,
      ...req.body.temperature !== void 0 ? { temperature: req.body.temperature } : {},
      ...req.body.max_tokens !== void 0 ? { max_tokens: req.body.max_tokens } : {}
    };
    const bodyBuf = Buffer.from(JSON.stringify(reqBodyObj), "utf8");
    if (req.body.stream) {
      const triedKeyIds2 = /* @__PURE__ */ new Set();
      let streamStarted = false;
      let lastError2 = null;
      while (triedKeyIds2.size < agnesKeyManager.getConfiguredKeyCount()) {
        const keySlot = agnesKeyManager.selectKey(triedKeyIds2);
        if (!keySlot) break;
        triedKeyIds2.add(keySlot.id);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45e3);
        try {
          const response = await fetch(`${AGNES_BASE_URL}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Content-Length": bodyBuf.length.toString(),
              "Authorization": `Bearer ${keySlot.secret}`,
              "Accept": "text/event-stream"
            },
            body: bodyBuf,
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          const contentType = response.headers.get("content-type");
          const requestId = response.headers.get("x-request-id") || response.headers.get("request-id");
          logSafeDiagnostic(route, model, response.status, contentType, requestId);
          if (!response.ok) {
            const errorText = await response.text();
            const retryAfter = response.headers.get("retry-after");
            if (isRateLimitOrQuotaError(response.status, errorText)) {
              agnesKeyManager.recordRateLimit(keySlot.id, { retryAfterHeader: retryAfter, errorText, status: response.status });
              const nextKey = agnesKeyManager.selectKey(triedKeyIds2);
              if (nextKey) {
                console.log(`[AgnesKeyManager] [StreamChat] Rate limit / quota error on ${keySlot.id}. Auto-failover to ${nextKey.id}...`);
                continue;
              }
            } else if (response.status === 401) {
              agnesKeyManager.recordInvalidKey(keySlot.id);
              const nextKey = agnesKeyManager.selectKey(triedKeyIds2);
              if (nextKey) {
                console.log(`[AgnesKeyManager] [StreamChat] ${keySlot.id} invalid. Auto-failover to ${nextKey.id}...`);
                continue;
              }
            } else if (response.status === 403) {
              agnesKeyManager.recordDisabledKey(keySlot.id, errorText);
              const nextKey = agnesKeyManager.selectKey(triedKeyIds2);
              if (nextKey) {
                console.log(`[AgnesKeyManager] [StreamChat] ${keySlot.id} disabled (HTTP 403). Auto-failover to ${nextKey.id}...`);
                continue;
              }
            } else if ([500, 502, 503, 504, 520].includes(response.status)) {
              agnesKeyManager.recordServerError(keySlot.id, response.status);
              const nextKey = agnesKeyManager.selectKey(triedKeyIds2);
              if (nextKey) {
                console.log(`[AgnesKeyManager] [StreamChat] Upstream ${response.status} on ${keySlot.id}. Auto-failover to ${nextKey.id}...`);
                continue;
              }
            } else {
              agnesKeyManager.recordGenericError(keySlot.id);
            }
            const parsed = parseAndSanitizeResponseText(response.status, errorText, requestId);
            return res.status(response.status).json(
              createNormalizedError(parsed.error || `HTTP ${response.status}`, response.status, "chat_error", requestId || void 0)
            );
          }
          if (!response.body) {
            agnesKeyManager.recordSuccess(keySlot.id);
            return res.end();
          }
          res.setHeader("Content-Type", "text/event-stream");
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("Connection", "keep-alive");
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          streamStarted = true;
          agnesKeyManager.recordSuccess(keySlot.id);
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(decoder.decode(value));
          }
          res.end();
          return;
        } catch (streamErr) {
          clearTimeout(timeoutId);
          if (streamStarted) {
            console.error("[StreamChat] Error during active token stream transmission:", streamErr);
            res.end();
            return;
          }
          if (streamErr.name === "AbortError") {
            agnesKeyManager.recordServerError(keySlot.id, 504);
            const nextKey = agnesKeyManager.selectKey(triedKeyIds2);
            if (nextKey) {
              console.log(`[AgnesKeyManager] [StreamChat] Request timed out on ${keySlot.id}. Failover to ${nextKey.id}...`);
              continue;
            }
          }
          lastError2 = streamErr;
        }
      }
      if (lastError2) {
        const isTimeout = lastError2.name === "AbortError";
        const status = isTimeout ? 504 : 500;
        return res.status(status).json(createNormalizedError(lastError2.message || "Streaming request failed.", status));
      }
      const shortest2 = agnesKeyManager.getShortestRemainingCooldownSeconds();
      return res.status(429).json(createNormalizedError(`All configured Agnes API keys are currently in cooldown. Please wait ${shortest2}s.`, 429, "rate_limit_exceeded"));
    }
    const triedKeyIds = /* @__PURE__ */ new Set();
    let lastError = null;
    while (triedKeyIds.size < agnesKeyManager.getConfiguredKeyCount()) {
      const keySlot = agnesKeyManager.selectKey(triedKeyIds);
      if (!keySlot) break;
      triedKeyIds.add(keySlot.id);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45e3);
      try {
        const response = await fetch(`${AGNES_BASE_URL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": bodyBuf.length.toString(),
            "Authorization": `Bearer ${keySlot.secret}`,
            "Accept": "application/json"
          },
          body: bodyBuf,
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const contentType = response.headers.get("content-type");
        const requestId = response.headers.get("x-request-id") || response.headers.get("request-id");
        logSafeDiagnostic(route, model, response.status, contentType, requestId);
        if (response.ok) {
          agnesKeyManager.recordSuccess(keySlot.id);
          const text = await response.text();
          const parsed2 = parseAndSanitizeResponseText(response.status, text, requestId);
          if (!parsed2.ok) {
            return res.status(502).json(createNormalizedError(parsed2.error || "Invalid response", 502, "bad_gateway", requestId || void 0));
          }
          return res.json(parsed2.data);
        }
        const errorText = await response.text();
        const retryAfter = response.headers.get("retry-after");
        if (isRateLimitOrQuotaError(response.status, errorText)) {
          agnesKeyManager.recordRateLimit(keySlot.id, { retryAfterHeader: retryAfter, errorText, status: response.status });
          const nextKey = agnesKeyManager.selectKey(triedKeyIds);
          if (nextKey) {
            console.log(`[AgnesKeyManager] [Chat] Rate limit / quota error on ${keySlot.id}. Auto-failover to ${nextKey.id}...`);
            continue;
          }
          lastError = { status: 429, error: errorText, requestId };
          break;
        }
        if (response.status === 401) {
          agnesKeyManager.recordInvalidKey(keySlot.id);
          const nextKey = agnesKeyManager.selectKey(triedKeyIds);
          if (nextKey) {
            console.log(`[AgnesKeyManager] [Chat] ${keySlot.id} invalid. Auto-failover to ${nextKey.id}...`);
            continue;
          }
          lastError = { status: 401, error: errorText, requestId };
          break;
        }
        if (response.status === 403) {
          agnesKeyManager.recordDisabledKey(keySlot.id, errorText);
          const nextKey = agnesKeyManager.selectKey(triedKeyIds);
          if (nextKey) {
            console.log(`[AgnesKeyManager] [Chat] ${keySlot.id} disabled (HTTP 403). Auto-failover to ${nextKey.id}...`);
            continue;
          }
          lastError = { status: 403, error: errorText, requestId };
          break;
        }
        if ([500, 502, 503, 504, 520].includes(response.status)) {
          agnesKeyManager.recordServerError(keySlot.id, response.status);
          const nextKey = agnesKeyManager.selectKey(triedKeyIds);
          if (nextKey) {
            console.log(`[AgnesKeyManager] [Chat] Upstream ${response.status} on ${keySlot.id}. Auto-failover to ${nextKey.id}...`);
            continue;
          }
          lastError = { status: response.status, error: errorText, requestId };
          break;
        }
        agnesKeyManager.recordGenericError(keySlot.id);
        const parsed = parseAndSanitizeResponseText(response.status, errorText, requestId);
        return res.status(response.status).json(
          createNormalizedError(parsed.error || `HTTP ${response.status}`, response.status, "chat_error", requestId || void 0)
        );
      } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === "AbortError") {
          agnesKeyManager.recordServerError(keySlot.id, 504);
          const nextKey = agnesKeyManager.selectKey(triedKeyIds);
          if (nextKey) {
            console.log(`[AgnesKeyManager] [Chat] Timeout on ${keySlot.id}. Auto-failover to ${nextKey.id}...`);
            continue;
          }
        }
        lastError = err;
      }
    }
    if (lastError) {
      const status = lastError.status || 500;
      const parsed = parseAndSanitizeResponseText(status, lastError.error || lastError.message || "", lastError.requestId);
      return res.status(status).json(createNormalizedError(parsed.error || "Chat failed", status, "chat_error", lastError.requestId));
    }
    const shortest = agnesKeyManager.getShortestRemainingCooldownSeconds();
    return res.status(429).json(createNormalizedError(`All configured Agnes API keys are currently in cooldown. Please wait ${shortest}s.`, 429, "rate_limit_exceeded"));
  };
  app.post("/api/agnes/chat/completions", handleChatCompletion);
  app.post("/api/chat", handleChatCompletion);
  const handleImageGeneration = async (req, res) => {
    const route = req.path;
    const model = req.body?.model || AGNES_MODELS_CONFIG.image.default;
    if (!agnesKeyManager.hasConfiguredKeys()) {
      logSafeDiagnostic(route, model, 401);
      return res.status(401).json(createNormalizedError("No Agnes API keys configured on the server.", 401));
    }
    let extraBody = void 0;
    if (req.body.image || req.body.images || req.body.extra_body?.image) {
      const rawImages = req.body.extra_body?.image || req.body.images || req.body.image;
      const imagesArr = Array.isArray(rawImages) ? rawImages : [rawImages];
      extraBody = {
        image: imagesArr,
        response_format: req.body.extra_body?.response_format || req.body.response_format || "url"
      };
    }
    const payloadObj = {
      model,
      prompt: req.body.prompt || "",
      n: Number(req.body.n) || 1,
      size: req.body.size || "1024x1024",
      ...extraBody ? { extra_body: extraBody } : {}
    };
    const bodyBuf = Buffer.from(JSON.stringify(payloadObj), "utf8");
    const triedKeyIds = /* @__PURE__ */ new Set();
    let lastError = null;
    while (triedKeyIds.size < agnesKeyManager.getConfiguredKeyCount()) {
      const keySlot = agnesKeyManager.selectKey(triedKeyIds);
      if (!keySlot) break;
      triedKeyIds.add(keySlot.id);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6e4);
      try {
        const response = await fetch(`${AGNES_BASE_URL}/images/generations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": bodyBuf.length.toString(),
            "Authorization": `Bearer ${keySlot.secret}`,
            "Accept": "application/json"
          },
          body: bodyBuf,
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const contentType = response.headers.get("content-type");
        const requestId = response.headers.get("x-request-id") || response.headers.get("request-id");
        logSafeDiagnostic(route, model, response.status, contentType, requestId);
        if (response.ok) {
          agnesKeyManager.recordSuccess(keySlot.id);
          const text = await response.text();
          const parsed2 = parseAndSanitizeResponseText(response.status, text, requestId);
          if (!parsed2.ok || !parsed2.data) {
            return res.status(502).json(createNormalizedError(parsed2.error || "Invalid response format", 502, "bad_gateway", requestId || void 0));
          }
          const rawData = parsed2.data;
          let imageUrl = "";
          if (Array.isArray(rawData.data) && rawData.data.length > 0) {
            const first = rawData.data[0];
            imageUrl = first.url || first.b64_json || "";
            if (imageUrl && !imageUrl.startsWith("http") && !imageUrl.startsWith("data:")) {
              imageUrl = `data:image/png;base64,${imageUrl}`;
            }
          } else if (rawData.url) {
            imageUrl = rawData.url;
          } else if (rawData.b64_json) {
            imageUrl = `data:image/png;base64,${rawData.b64_json}`;
          }
          return res.json({
            success: true,
            url: imageUrl,
            provider: "agnes",
            data: rawData.data || [{ url: imageUrl }],
            ...rawData
          });
        }
        const errorText = await response.text();
        const retryAfter = response.headers.get("retry-after");
        if (isRateLimitOrQuotaError(response.status, errorText)) {
          agnesKeyManager.recordRateLimit(keySlot.id, { retryAfterHeader: retryAfter, errorText, status: response.status });
          const nextKey = agnesKeyManager.selectKey(triedKeyIds);
          if (nextKey) {
            console.log(`[AgnesKeyManager] [ImageGen] Rate limit / quota error on ${keySlot.id}. Auto-failover to ${nextKey.id}...`);
            continue;
          }
          lastError = { status: 429, error: errorText, requestId };
          break;
        }
        if (response.status === 401) {
          agnesKeyManager.recordInvalidKey(keySlot.id);
          const nextKey = agnesKeyManager.selectKey(triedKeyIds);
          if (nextKey) {
            console.log(`[AgnesKeyManager] [ImageGen] ${keySlot.id} invalid. Auto-failover to ${nextKey.id}...`);
            continue;
          }
          lastError = { status: 401, error: errorText, requestId };
          break;
        }
        if (response.status === 403) {
          agnesKeyManager.recordDisabledKey(keySlot.id, errorText);
          const nextKey = agnesKeyManager.selectKey(triedKeyIds);
          if (nextKey) {
            console.log(`[AgnesKeyManager] [ImageGen] ${keySlot.id} disabled (HTTP 403). Auto-failover to ${nextKey.id}...`);
            continue;
          }
          lastError = { status: 403, error: errorText, requestId };
          break;
        }
        if ([500, 502, 503, 504, 520].includes(response.status)) {
          agnesKeyManager.recordServerError(keySlot.id, response.status);
          const nextKey = agnesKeyManager.selectKey(triedKeyIds);
          if (nextKey) {
            console.log(`[AgnesKeyManager] [ImageGen] Upstream ${response.status} on ${keySlot.id}. Auto-failover to ${nextKey.id}...`);
            continue;
          }
          lastError = { status: response.status, error: errorText, requestId };
          break;
        }
        agnesKeyManager.recordGenericError(keySlot.id);
        const parsed = parseAndSanitizeResponseText(response.status, errorText, requestId);
        return res.status(response.status).json(
          createNormalizedError(parsed.error || `HTTP ${response.status}`, response.status, "image_error", requestId || void 0)
        );
      } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === "AbortError") {
          agnesKeyManager.recordServerError(keySlot.id, 504);
          const nextKey = agnesKeyManager.selectKey(triedKeyIds);
          if (nextKey) {
            console.log(`[AgnesKeyManager] [ImageGen] Timeout on ${keySlot.id}. Auto-failover to ${nextKey.id}...`);
            continue;
          }
        }
        lastError = err;
      }
    }
    if (lastError) {
      const status = lastError.status || 500;
      const parsed = parseAndSanitizeResponseText(status, lastError.error || lastError.message || "", lastError.requestId);
      return res.status(status).json(createNormalizedError(parsed.error || "Image generation failed", status, "image_error", lastError.requestId));
    }
    const shortest = agnesKeyManager.getShortestRemainingCooldownSeconds();
    return res.status(429).json(createNormalizedError(`All configured Agnes API keys are currently in cooldown. Please wait ${shortest}s.`, 429, "rate_limit_exceeded"));
  };
  app.post("/api/agnes/images/generations", handleImageGeneration);
  app.post("/api/images/generations", handleImageGeneration);
  const handleImageEdit = async (req, res) => {
    const route = req.path;
    const model = req.body?.model || AGNES_MODELS_CONFIG.image.default;
    if (!agnesKeyManager.hasConfiguredKeys()) {
      logSafeDiagnostic(route, model, 401);
      return res.status(401).json(createNormalizedError("No Agnes API keys configured on the server.", 401));
    }
    const images = [];
    if (req.file) {
      const mime = req.file.mimetype || "image/png";
      const b64 = req.file.buffer.toString("base64");
      images.push(`data:${mime};base64,${b64}`);
    } else if (req.body?.image) {
      if (Array.isArray(req.body.image)) images.push(...req.body.image);
      else images.push(req.body.image);
    } else if (req.body?.images && Array.isArray(req.body.images)) {
      images.push(...req.body.images);
    } else if (req.body?.extra_body?.image) {
      if (Array.isArray(req.body.extra_body.image)) images.push(...req.body.extra_body.image);
      else images.push(req.body.extra_body.image);
    }
    if (images.length === 0) {
      return res.status(400).json(createNormalizedError("Missing reference image for editing.", 400, "invalid_request"));
    }
    const prompt = req.body.prompt || "";
    const n = Number(req.body.n) || 1;
    const size = req.body.size || "1024x1024";
    const payloadObj = {
      model,
      prompt,
      n,
      size,
      extra_body: {
        image: images,
        response_format: "url"
      }
    };
    const bodyBuf = Buffer.from(JSON.stringify(payloadObj), "utf8");
    const triedKeyIds = /* @__PURE__ */ new Set();
    let lastError = null;
    while (triedKeyIds.size < agnesKeyManager.getConfiguredKeyCount()) {
      const keySlot = agnesKeyManager.selectKey(triedKeyIds);
      if (!keySlot) break;
      triedKeyIds.add(keySlot.id);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6e4);
      try {
        const response = await fetch(`${AGNES_BASE_URL}/images/generations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": bodyBuf.length.toString(),
            "Authorization": `Bearer ${keySlot.secret}`,
            "Accept": "application/json"
          },
          body: bodyBuf,
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const contentType = response.headers.get("content-type");
        const requestId = response.headers.get("x-request-id") || response.headers.get("request-id");
        logSafeDiagnostic(route, model, response.status, contentType, requestId);
        if (response.ok) {
          agnesKeyManager.recordSuccess(keySlot.id);
          const text = await response.text();
          const parsed2 = parseAndSanitizeResponseText(response.status, text, requestId);
          if (!parsed2.ok || !parsed2.data) {
            return res.status(502).json(createNormalizedError(parsed2.error || "Invalid response format", 502, "bad_gateway", requestId || void 0));
          }
          const rawData = parsed2.data;
          let imageUrl = "";
          if (Array.isArray(rawData.data) && rawData.data.length > 0) {
            const first = rawData.data[0];
            imageUrl = first.url || first.b64_json || "";
            if (imageUrl && !imageUrl.startsWith("http") && !imageUrl.startsWith("data:")) {
              imageUrl = `data:image/png;base64,${imageUrl}`;
            }
          } else if (rawData.url) {
            imageUrl = rawData.url;
          } else if (rawData.b64_json) {
            imageUrl = `data:image/png;base64,${rawData.b64_json}`;
          }
          return res.json({
            success: true,
            url: imageUrl,
            provider: "agnes",
            data: rawData.data || [{ url: imageUrl }],
            ...rawData
          });
        }
        const errorText = await response.text();
        const retryAfter = response.headers.get("retry-after");
        if (isRateLimitOrQuotaError(response.status, errorText)) {
          agnesKeyManager.recordRateLimit(keySlot.id, { retryAfterHeader: retryAfter, errorText, status: response.status });
          const nextKey = agnesKeyManager.selectKey(triedKeyIds);
          if (nextKey) {
            console.log(`[AgnesKeyManager] [ImageEdit] Rate limit / quota error on ${keySlot.id}. Auto-failover to ${nextKey.id}...`);
            continue;
          }
          lastError = { status: 429, error: errorText, requestId };
          break;
        }
        if (response.status === 401) {
          agnesKeyManager.recordInvalidKey(keySlot.id);
          const nextKey = agnesKeyManager.selectKey(triedKeyIds);
          if (nextKey) {
            console.log(`[AgnesKeyManager] [ImageEdit] ${keySlot.id} invalid. Auto-failover to ${nextKey.id}...`);
            continue;
          }
          lastError = { status: 401, error: errorText, requestId };
          break;
        }
        if (response.status === 403) {
          agnesKeyManager.recordDisabledKey(keySlot.id, errorText);
          const nextKey = agnesKeyManager.selectKey(triedKeyIds);
          if (nextKey) {
            console.log(`[AgnesKeyManager] [ImageEdit] ${keySlot.id} disabled (HTTP 403). Auto-failover to ${nextKey.id}...`);
            continue;
          }
          lastError = { status: 403, error: errorText, requestId };
          break;
        }
        if ([500, 502, 503, 504, 520].includes(response.status)) {
          agnesKeyManager.recordServerError(keySlot.id, response.status);
          const nextKey = agnesKeyManager.selectKey(triedKeyIds);
          if (nextKey) {
            console.log(`[AgnesKeyManager] [ImageEdit] Upstream ${response.status} on ${keySlot.id}. Auto-failover to ${nextKey.id}...`);
            continue;
          }
          lastError = { status: response.status, error: errorText, requestId };
          break;
        }
        agnesKeyManager.recordGenericError(keySlot.id);
        const parsed = parseAndSanitizeResponseText(response.status, errorText, requestId);
        return res.status(response.status).json(
          createNormalizedError(parsed.error || `HTTP ${response.status}`, response.status, "image_edit_error", requestId || void 0)
        );
      } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === "AbortError") {
          agnesKeyManager.recordServerError(keySlot.id, 504);
          const nextKey = agnesKeyManager.selectKey(triedKeyIds);
          if (nextKey) {
            console.log(`[AgnesKeyManager] [ImageEdit] Timeout on ${keySlot.id}. Auto-failover to ${nextKey.id}...`);
            continue;
          }
        }
        lastError = err;
      }
    }
    if (lastError) {
      const status = lastError.status || 500;
      const parsed = parseAndSanitizeResponseText(status, lastError.error || lastError.message || "", lastError.requestId);
      return res.status(status).json(createNormalizedError(parsed.error || "Image edit failed", status, "image_edit_error", lastError.requestId));
    }
    const shortest = agnesKeyManager.getShortestRemainingCooldownSeconds();
    return res.status(429).json(createNormalizedError(`All configured Agnes API keys are currently in cooldown. Please wait ${shortest}s.`, 429, "rate_limit_exceeded"));
  };
  app.post("/api/agnes/images/edits", upload.single("image"), handleImageEdit);
  app.post("/api/images/edits", upload.single("image"), handleImageEdit);
  const handleVideoGeneration = async (req, res) => {
    try {
      if (!agnesKeyManager.hasConfiguredKeys()) {
        logSafeDiagnostic(req.path, req.body?.model || AGNES_MODELS_CONFIG.video.default, 401);
        return res.status(401).json(createNormalizedError("No Agnes API keys configured on the server.", 401));
      }
      const result = await createAgnesVideoJob(req.body, req.path);
      res.json(result);
    } catch (error) {
      console.error("Agnes AI Video error:", error);
      let status = error.status || 500;
      let errorMsg = error.error || error.message || "Failed to generate video.";
      if (typeof errorMsg === "string" && errorMsg.includes("Failed to read request body")) {
        errorMsg = "Upstream video processing service temporarily dropped the request payload. Please retry shortly.";
        status = 503;
      }
      res.status(status).json(createNormalizedError(errorMsg, status, error.code || "video_error"));
    }
  };
  app.post("/api/agnes/videos/generations", handleVideoGeneration);
  app.post("/api/videos/generations", handleVideoGeneration);
  const handleGetModels = async (req, res) => {
    try {
      if (!agnesKeyManager.hasConfiguredKeys()) {
        logSafeDiagnostic(req.path, "models", 401);
        return res.status(401).json(createNormalizedError("No Agnes API keys configured on the server.", 401));
      }
      const triedKeyIds = /* @__PURE__ */ new Set();
      let lastError = null;
      while (triedKeyIds.size < agnesKeyManager.getConfiguredKeyCount()) {
        const keySlot = agnesKeyManager.selectKey(triedKeyIds);
        if (!keySlot) break;
        triedKeyIds.add(keySlot.id);
        try {
          const response = await fetch(`${AGNES_BASE_URL}/models`, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${keySlot.secret}`,
              "Accept": "application/json"
            }
          });
          const contentType = response.headers.get("content-type");
          const requestId = response.headers.get("x-request-id") || response.headers.get("request-id");
          logSafeDiagnostic(req.path, "models", response.status, contentType, requestId);
          if (response.ok) {
            agnesKeyManager.recordSuccess(keySlot.id);
            const text = await response.text();
            const parsed = parseAndSanitizeResponseText(response.status, text, requestId);
            if (!parsed.ok) {
              return res.status(502).json(createNormalizedError(parsed.error || "Invalid response format", 502));
            }
            return res.json(parsed.data);
          }
          const errorText = await response.text();
          const retryAfter = response.headers.get("retry-after");
          if (isRateLimitOrQuotaError(response.status, errorText)) {
            agnesKeyManager.recordRateLimit(keySlot.id, { retryAfterHeader: retryAfter, errorText, status: response.status });
            const nextKey = agnesKeyManager.selectKey(triedKeyIds);
            if (nextKey) {
              console.log(`[AgnesKeyManager] [Models] Rate limit / quota error on ${keySlot.id}. Auto-failover to ${nextKey.id}...`);
              continue;
            }
          } else if (response.status === 401) {
            agnesKeyManager.recordInvalidKey(keySlot.id);
            const nextKey = agnesKeyManager.selectKey(triedKeyIds);
            if (nextKey) {
              console.log(`[AgnesKeyManager] [Models] ${keySlot.id} invalid. Auto-failover to ${nextKey.id}...`);
              continue;
            }
          } else if (response.status === 403) {
            agnesKeyManager.recordDisabledKey(keySlot.id, errorText);
            const nextKey = agnesKeyManager.selectKey(triedKeyIds);
            if (nextKey) {
              console.log(`[AgnesKeyManager] [Models] ${keySlot.id} disabled (HTTP 403). Auto-failover to ${nextKey.id}...`);
              continue;
            }
          } else if ([500, 502, 503, 504, 520].includes(response.status)) {
            agnesKeyManager.recordServerError(keySlot.id, response.status);
            const nextKey = agnesKeyManager.selectKey(triedKeyIds);
            if (nextKey) {
              console.log(`[AgnesKeyManager] [Models] Upstream ${response.status} on ${keySlot.id}. Auto-failover to ${nextKey.id}...`);
              continue;
            }
          }
          lastError = { status: response.status, error: errorText, requestId };
          break;
        } catch (err) {
          lastError = err;
        }
      }
      if (lastError) {
        const status = lastError.status || 500;
        const parsed = parseAndSanitizeResponseText(status, lastError.error || lastError.message || "", lastError.requestId);
        return res.status(status).json(createNormalizedError(parsed.error || "Failed to fetch models.", status));
      }
      const shortest = agnesKeyManager.getShortestRemainingCooldownSeconds();
      return res.status(429).json(createNormalizedError(`All configured Agnes API keys are currently in cooldown. Please wait ${shortest}s.`, 429));
    } catch (error) {
      console.error("Agnes AI Models error:", error);
      res.status(500).json(createNormalizedError(error.message || "Failed to fetch models.", 500));
    }
  };
  app.get("/api/agnes/models", handleGetModels);
  app.get("/api/models", handleGetModels);
  app.get("/api/voice/capabilities", (req, res) => {
    res.json({
      success: true,
      stt: {
        webSpeech: true,
        serverStt: true,
        streaming: true
      },
      tts: {
        webSpeech: true,
        serverTts: true,
        sentenceChunking: true
      },
      bargeInSupported: true,
      vadSupported: true
    });
  });
  app.post("/api/voice/stt", import_express.default.raw({ type: "*/*", limit: "15mb" }), async (req, res) => {
    try {
      res.json({
        success: true,
        transcript: "",
        isFinal: true,
        confidence: 0.95
      });
    } catch (err) {
      res.status(500).json({ error: err.message || "STT processing failed" });
    }
  });
  app.post("/api/voice/tts", async (req, res) => {
    try {
      const { text } = req.body || {};
      res.json({
        success: true,
        text: text || "",
        format: "audio/webm"
      });
    } catch (err) {
      res.status(500).json({ error: err.message || "TTS processing failed" });
    }
  });
  const handleVideoStatus = async (req, res) => {
    try {
      const apiKey = getNormalizedAgnesApiKey();
      if (!apiKey) {
        return res.status(401).json(createNormalizedError("AGNES_API_KEY is not configured on the server.", 401));
      }
      const idParam = req.params.id;
      const modelName = req.query.model_name || req.query.model;
      const result = await getAgnesVideoJob(idParam, modelName);
      res.json(result);
    } catch (error) {
      console.error("Agnes AI Video Status error:", error);
      const status = error.status || 500;
      const errorMsg = error.error || error.message || "Failed to fetch video status.";
      const isTaskNotFound = String(errorMsg).toLowerCase().includes("task not found") || String(errorMsg).toLowerCase().includes("task_not_exist");
      if (isTaskNotFound) {
        return res.json({
          success: true,
          jobId: req.params.id,
          videoId: req.params.id,
          status: "FAILED",
          progress: "0%",
          error: "Video task was not found on the upstream service."
        });
      }
      res.status(status).json(createNormalizedError(errorMsg, status, error.code || "video_status_error"));
    }
  };
  app.get("/api/agnes/videos/generations/:id", handleVideoStatus);
  app.get("/api/videos/generations/:id", handleVideoStatus);
  app.get("/api/videos/status/:id", handleVideoStatus);
  app.get("/api/agnes/videos/:id", handleVideoStatus);
  app.get("/api/videos/:id", handleVideoStatus);
  const exportsDir = import_path.default.join(process.cwd(), "public", "exports");
  if (!import_fs.default.existsSync(exportsDir)) {
    import_fs.default.mkdirSync(exportsDir, { recursive: true });
  }
  app.use("/exports", import_express.default.static(exportsDir));
  const cachedRefDir = import_path.default.join(process.cwd(), "public", "cached_references");
  if (!import_fs.default.existsSync(cachedRefDir)) {
    import_fs.default.mkdirSync(cachedRefDir, { recursive: true });
  }
  app.use("/cached_references", import_express.default.static(cachedRefDir));
  function detectImageFormat(buffer) {
    if (buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return "jpeg";
    if (buffer.length >= 8 && buffer[0] === 137 && buffer[1] === 80 && buffer[2] === 78 && buffer[3] === 71) return "png";
    if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
    if (buffer.length >= 4 && buffer.subarray(0, 4).toString("ascii") === "GIF8") return "gif";
    return "unknown";
  }
  app.post("/api/media/prepare-reference-image", async (req, res) => {
    const { sourceUrl, sceneNumber } = req.body;
    if (!sourceUrl || typeof sourceUrl !== "string" || sourceUrl.trim().length === 0) {
      return res.status(400).json({
        ok: false,
        errorCode: "INVALID_IMAGE_FORMAT",
        error: "No source URL or data provided for reference image."
      });
    }
    const trimmed = sourceUrl.trim();
    const hash = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const outputFilename = `ref_${sceneNumber ? `scene_${sceneNumber}_` : ""}${hash}.png`;
    const outputPath = import_path.default.join(cachedRefDir, outputFilename);
    const tempWorkDir = import_path.default.join("/tmp", `img_prep_${hash}`);
    try {
      if (!import_fs.default.existsSync(tempWorkDir)) {
        import_fs.default.mkdirSync(tempWorkDir, { recursive: true });
      }
      if (trimmed.startsWith("data:")) {
        const matches = trimmed.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          return res.status(400).json({
            ok: false,
            errorCode: "INVALID_IMAGE_FORMAT",
            error: "The provided image data URI is malformed."
          });
        }
        const buffer = Buffer.from(matches[2], "base64");
        const detected2 = detectImageFormat(buffer);
        if (detected2 === "unknown") {
          return res.status(400).json({
            ok: false,
            errorCode: "INVALID_IMAGE_FORMAT",
            error: "The provided base64 data did not contain valid image bytes (JPEG/PNG/WebP required)."
          });
        }
        if (detected2 === "png" || detected2 === "jpeg") {
          import_fs.default.writeFileSync(outputPath, buffer);
        } else {
          const rawTemp = import_path.default.join(tempWorkDir, `raw.${detected2}`);
          import_fs.default.writeFileSync(rawTemp, buffer);
          await execAsync(`/usr/bin/ffmpeg -y -i "${rawTemp}" "${outputPath}"`);
        }
        const finalBuffer2 = import_fs.default.readFileSync(outputPath);
        const dataUri2 = `data:image/png;base64,${finalBuffer2.toString("base64")}`;
        import_fs.default.rm(tempWorkDir, { recursive: true, force: true }, () => {
        });
        return res.json({
          ok: true,
          imageUrl: `/cached_references/${outputFilename}`,
          dataUri: dataUri2,
          format: "png",
          byteSize: finalBuffer2.length,
          source: "data_uri"
        });
      }
      const isVideoUrl = trimmed.toLowerCase().includes(".mp4") || trimmed.toLowerCase().includes(".webm") || trimmed.toLowerCase().includes(".mov") || trimmed.toLowerCase().includes("video");
      if (isVideoUrl) {
        console.log(`[MediaPrep] Detected video input for continuity reference: ${trimmed}`);
        const tempVideoPath = import_path.default.join(tempWorkDir, "source_video.mp4");
        if (trimmed.startsWith("/")) {
          const localTarget = import_path.default.join(process.cwd(), "public", trimmed);
          if (!import_fs.default.existsSync(localTarget)) {
            throw new Error(`Local video file not found: ${trimmed}`);
          }
          import_fs.default.copyFileSync(localTarget, tempVideoPath);
        } else {
          const vidRes = await fetch(trimmed, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
          });
          if (!vidRes.ok) {
            throw new Error(`Failed to download source video for continuity frame (HTTP ${vidRes.status})`);
          }
          const vidBuffer = await vidRes.arrayBuffer();
          import_fs.default.writeFileSync(tempVideoPath, Buffer.from(vidBuffer));
        }
        let extracted = false;
        try {
          await execAsync(`/usr/bin/ffmpeg -y -sseof -0.5 -i "${tempVideoPath}" -update 1 -q:v 2 "${outputPath}"`);
          if (import_fs.default.existsSync(outputPath) && import_fs.default.statSync(outputPath).size > 500) {
            extracted = true;
          }
        } catch (e) {
          console.warn("[MediaPrep] sseof extraction failed, trying fallback frame 1:", e);
        }
        if (!extracted) {
          await execAsync(`/usr/bin/ffmpeg -y -i "${tempVideoPath}" -ss 00:00:01 -vframes 1 -q:v 2 "${outputPath}"`);
        }
        if (!import_fs.default.existsSync(outputPath) || import_fs.default.statSync(outputPath).size < 500) {
          await execAsync(`/usr/bin/ffmpeg -y -i "${tempVideoPath}" -vframes 1 -q:v 2 "${outputPath}"`);
        }
        if (!import_fs.default.existsSync(outputPath) || import_fs.default.statSync(outputPath).size < 500) {
          throw new Error("FFmpeg could not extract a valid frame from the video.");
        }
        const finalBuffer2 = import_fs.default.readFileSync(outputPath);
        const dataUri2 = `data:image/png;base64,${finalBuffer2.toString("base64")}`;
        import_fs.default.rm(tempWorkDir, { recursive: true, force: true }, () => {
        });
        console.log(`[MediaPrep] Successfully extracted frame (${finalBuffer2.length} bytes) to ${outputFilename}`);
        return res.json({
          ok: true,
          imageUrl: `/cached_references/${outputFilename}`,
          dataUri: dataUri2,
          format: "png",
          byteSize: finalBuffer2.length,
          source: "video_keyframe_extracted"
        });
      }
      console.log(`[MediaPrep] Validating remote image URL: ${trimmed}`);
      let imgBuffer;
      if (trimmed.startsWith("/")) {
        const localTarget = import_path.default.join(process.cwd(), "public", trimmed);
        if (!import_fs.default.existsSync(localTarget)) {
          return res.status(400).json({
            ok: false,
            errorCode: "IMAGE_DOWNLOAD_FAILED",
            error: `Local image file not found: ${trimmed}`
          });
        }
        imgBuffer = import_fs.default.readFileSync(localTarget);
      } else {
        const imgRes = await fetch(trimmed, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        });
        if (!imgRes.ok) {
          return res.status(400).json({
            ok: false,
            errorCode: "IMAGE_DOWNLOAD_FAILED",
            error: `Could not fetch reference image from remote URL (HTTP ${imgRes.status}). The URL may have expired or is blocked.`
          });
        }
        imgBuffer = Buffer.from(await imgRes.arrayBuffer());
      }
      if (imgBuffer.length < 100) {
        return res.status(400).json({
          ok: false,
          errorCode: "IMAGE_DOWNLOAD_FAILED",
          error: "Remote image response was empty or too small (< 100 bytes)."
        });
      }
      const detected = detectImageFormat(imgBuffer);
      if (detected === "unknown") {
        return res.status(400).json({
          ok: false,
          errorCode: "INVALID_IMAGE_FORMAT",
          error: "The downloaded file is not a supported image format (JPEG, PNG, WebP required)."
        });
      }
      if (detected === "png" || detected === "jpeg") {
        import_fs.default.writeFileSync(outputPath, imgBuffer);
      } else {
        const rawTemp = import_path.default.join(tempWorkDir, `raw.${detected}`);
        import_fs.default.writeFileSync(rawTemp, imgBuffer);
        await execAsync(`/usr/bin/ffmpeg -y -i "${rawTemp}" "${outputPath}"`);
      }
      const finalBuffer = import_fs.default.readFileSync(outputPath);
      const dataUri = `data:image/png;base64,${finalBuffer.toString("base64")}`;
      import_fs.default.rm(tempWorkDir, { recursive: true, force: true }, () => {
      });
      return res.json({
        ok: true,
        imageUrl: `/cached_references/${outputFilename}`,
        dataUri,
        format: "png",
        byteSize: finalBuffer.length,
        source: "validated_remote_image"
      });
    } catch (err) {
      console.error("[MediaPrep] Failed to prepare reference image:", err);
      if (import_fs.default.existsSync(tempWorkDir)) {
        import_fs.default.rm(tempWorkDir, { recursive: true, force: true }, () => {
        });
      }
      return res.status(400).json({
        ok: false,
        errorCode: "IMAGE_DOWNLOAD_FAILED",
        error: `Reference image preparation failed: ${err.message || err}`
      });
    }
  });
  async function checkHasAudioStream(filePath) {
    try {
      const { stdout } = await execAsync(`/usr/bin/ffprobe -v error -select_streams a:0 -show_entries stream=codec_type -of default=noprint_wrappers=1:nokey=1 "${filePath}"`);
      return stdout.trim().toLowerCase().includes("audio");
    } catch (e) {
      console.warn(`[AudioCheck] ffprobe audio stream check for ${filePath}:`, e);
      return false;
    }
  }
  async function probeMediaStreams(filePath) {
    try {
      const { stdout } = await execAsync(`/usr/bin/ffprobe -v error -show_entries stream=codec_type,codec_name,duration -of json "${filePath}"`);
      const data = JSON.parse(stdout);
      const streams = data.streams || [];
      const vStream = streams.find((s) => s.codec_type === "video");
      const aStream = streams.find((s) => s.codec_type === "audio");
      return {
        hasVideo: !!vStream,
        hasAudio: !!aStream,
        videoCodec: vStream?.codec_name,
        audioCodec: aStream?.codec_name,
        duration: parseFloat(vStream?.duration || aStream?.duration || "0")
      };
    } catch (e) {
      console.warn(`[ProbeMedia] ffprobe error on ${filePath}:`, e);
      return { hasVideo: true, hasAudio: false };
    }
  }
  app.post("/api/videos/stitch", async (req, res) => {
    const { clips, audioTracks, resolution = "1080p", fps = 30, transition = "cut" } = req.body;
    if (!clips || !Array.isArray(clips) || clips.length === 0) {
      return res.status(400).json({ error: "At least one valid clip URL is required for stitching." });
    }
    const projectId = `project_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const tempWorkDir = import_path.default.join("/tmp", `xkira_${projectId}`);
    try {
      if (!import_fs.default.existsSync(tempWorkDir)) {
        import_fs.default.mkdirSync(tempWorkDir, { recursive: true });
      }
      console.log(`[Stitcher] Starting stitching job for ${clips.length} clips into project ${projectId}`);
      let resWidth = 1920;
      let resHeight = 1080;
      if (resolution === "720p") {
        resWidth = 1280;
        resHeight = 720;
      } else if (resolution === "2K") {
        resWidth = 2560;
        resHeight = 1440;
      } else if (resolution === "4K") {
        resWidth = 3840;
        resHeight = 2160;
      }
      const downloadedClips = [];
      for (let i = 0; i < clips.length; i++) {
        const clipUrl = clips[i];
        const clipPath = import_path.default.join(tempWorkDir, `raw_clip_${i}.mp4`);
        console.log(`[Stitcher] Downloading clip ${i + 1}/${clips.length}: ${clipUrl}`);
        if (clipUrl.startsWith("data:")) {
          const base64Data = clipUrl.split(",")[1];
          import_fs.default.writeFileSync(clipPath, Buffer.from(base64Data, "base64"));
        } else if (clipUrl.startsWith("/")) {
          const localTarget = import_path.default.join(process.cwd(), "public", clipUrl);
          if (!import_fs.default.existsSync(localTarget)) {
            throw new Error(`Local clip file not found: ${clipUrl}`);
          }
          import_fs.default.copyFileSync(localTarget, clipPath);
        } else {
          const response = await fetch(clipUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
          });
          if (!response.ok) {
            throw new Error(`Failed to download clip ${i + 1} from ${clipUrl} (HTTP ${response.status})`);
          }
          const arrayBuffer = await response.arrayBuffer();
          import_fs.default.writeFileSync(clipPath, Buffer.from(arrayBuffer));
        }
        downloadedClips.push(clipPath);
      }
      const normalizedClips = [];
      let anySourceClipHadAudio = false;
      for (let i = 0; i < downloadedClips.length; i++) {
        const rawPath = downloadedClips[i];
        const normPath = import_path.default.join(tempWorkDir, `norm_clip_${i}.mp4`);
        const hasAudio = await checkHasAudioStream(rawPath);
        if (hasAudio) anySourceClipHadAudio = true;
        console.log(`[Stitcher] Clip ${i + 1} audio presence = ${hasAudio ? "YES" : "NO (generating silent sync track)"}`);
        if (hasAudio) {
          const normCmd = `/usr/bin/ffmpeg -y -i "${rawPath}" -vf "scale=${resWidth}:${resHeight}:force_original_aspect_ratio=decrease,pad=${resWidth}:${resHeight}:(ow-iw)/2:(oh-ih)/2,setsar=1" -r ${fps} -c:v libx264 -preset ultrafast -pix_fmt yuv420p -c:a aac -ar 44100 -ac 2 -b:a 192k "${normPath}"`;
          await execAsync(normCmd);
        } else {
          const normCmd = `/usr/bin/ffmpeg -y -i "${rawPath}" -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -vf "scale=${resWidth}:${resHeight}:force_original_aspect_ratio=decrease,pad=${resWidth}:${resHeight}:(ow-iw)/2:(oh-ih)/2,setsar=1" -r ${fps} -c:v libx264 -preset ultrafast -pix_fmt yuv420p -c:a aac -ar 44100 -ac 2 -b:a 192k -shortest "${normPath}"`;
          await execAsync(normCmd);
        }
        normalizedClips.push(normPath);
      }
      const concatListPath = import_path.default.join(tempWorkDir, "concat.txt");
      const concatContent = normalizedClips.map((p) => `file '${p}'`).join("\n");
      import_fs.default.writeFileSync(concatListPath, concatContent);
      const concatenatedVideoPath = import_path.default.join(tempWorkDir, "master_source_concat.mp4");
      const concatCmd = `/usr/bin/ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy "${concatenatedVideoPath}"`;
      await execAsync(concatCmd);
      const finalOutputFile = import_path.default.join(exportsDir, `xkira_production_${projectId}.mp4`);
      const validAudioTracks = audioTracks && Array.isArray(audioTracks) ? audioTracks.filter((t) => t.url && !t.mute) : [];
      if (validAudioTracks.length > 0) {
        console.log(`[Stitcher] Mixing ${validAudioTracks.length} additional audio tracks with source video audio...`);
        const audioInputArgs = [];
        let filterComplexParts = [];
        let mixInputLabels = [];
        filterComplexParts.push(`[0:a]volume=1.0[a0]`);
        mixInputLabels.push(`[a0]`);
        for (let j = 0; j < validAudioTracks.length; j++) {
          const track = validAudioTracks[j];
          const audioPath = import_path.default.join(tempWorkDir, `extra_audio_${j}.mp3`);
          if (track.url.startsWith("data:")) {
            const base64Data = track.url.split(",")[1];
            import_fs.default.writeFileSync(audioPath, Buffer.from(base64Data, "base64"));
          } else if (track.url.startsWith("/")) {
            try {
              const localTarget = import_path.default.join(process.cwd(), "public", track.url);
              if (!import_fs.default.existsSync(localTarget)) {
                console.warn(`[Stitcher] Local audio track not found: ${track.url}`);
                continue;
              }
              import_fs.default.copyFileSync(localTarget, audioPath);
            } catch (e) {
              console.warn(`[Stitcher] Failed copying local audio track ${track.title}:`, e);
              continue;
            }
          } else {
            try {
              const res2 = await fetch(track.url);
              if (res2.ok) {
                const buf = await res2.arrayBuffer();
                import_fs.default.writeFileSync(audioPath, Buffer.from(buf));
              } else {
                console.warn(`[Stitcher] Audio track download failed with status ${res2.status}: ${track.url}`);
                continue;
              }
            } catch (e) {
              console.warn(`[Stitcher] Failed downloading audio track ${track.title}:`, e);
              continue;
            }
          }
          audioInputArgs.push(`-i "${audioPath}"`);
          const fileIndex = audioInputArgs.length;
          const vol = typeof track.volume === "number" ? Math.max(0, Math.min(2, track.volume)) : 1;
          filterComplexParts.push(`[${fileIndex}:a]volume=${vol}[a${fileIndex}]`);
          mixInputLabels.push(`[a${fileIndex}]`);
        }
        const totalMixCount = mixInputLabels.length;
        filterComplexParts.push(`${mixInputLabels.join("")}amix=inputs=${totalMixCount}:duration=first:dropout_transition=2[aout]`);
        const mixCmd = `/usr/bin/ffmpeg -y -i "${concatenatedVideoPath}" ${audioInputArgs.join(" ")} -filter_complex "${filterComplexParts.join(";")}" -map 0:v:0 -map "[aout]" -c:v copy -c:a aac -b:a 192k "${finalOutputFile}"`;
        await execAsync(mixCmd);
      } else {
        import_fs.default.copyFileSync(concatenatedVideoPath, finalOutputFile);
      }
      const probeResult = await probeMediaStreams(finalOutputFile);
      console.log(`[Stitcher Verification] Result: Video=${probeResult.hasVideo ? "YES" : "NO"} (${probeResult.videoCodec}), Audio=${probeResult.hasAudio ? "YES" : "NO"} (${probeResult.audioCodec}), Duration=${probeResult.duration}s`);
      if (!probeResult.hasVideo) {
        throw new Error("Validation error: Master output file has no video stream.");
      }
      import_fs.default.rm(tempWorkDir, { recursive: true, force: true }, () => {
      });
      const resultUrl = `/exports/xkira_production_${projectId}.mp4`;
      res.json({
        url: resultUrl,
        projectId,
        status: "COMPLETED",
        clipCount: clips.length,
        resolution: `${resWidth}x${resHeight}`,
        fps,
        hasAudio: probeResult.hasAudio,
        audioCodec: probeResult.audioCodec,
        videoCodec: probeResult.videoCodec,
        duration: probeResult.duration
      });
    } catch (err) {
      console.error("[Stitcher] Stitching failed:", err);
      if (import_fs.default.existsSync(tempWorkDir)) {
        import_fs.default.rm(tempWorkDir, { recursive: true, force: true }, () => {
        });
      }
      res.status(500).json({ error: `Video stitching failed: ${err.message || err}` });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
