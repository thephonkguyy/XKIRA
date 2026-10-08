/**
 * Centralized Agnes AI Multi-API Key Pool & Smart Auto Failover Manager
 * 
 * Responsibilities:
 * - Loads configured keys from AGNES_API_KEY_1, AGNES_API_KEY_2, AGNES_API_KEY_3,
 *   with fallback to legacy AGNES, AGNES_II, AGNES_API_KEY.
 * - Tracks key health and states: ACTIVE, RATE_LIMITED, QUOTA_EXHAUSTED,
 *   TEMPORARILY_UNAVAILABLE, INVALID, DISABLED.
 * - Deterministic priority order: Key 1 -> Key 2 -> Key 3 -> automatic recovery.
 * - Zero pre-flight overhead: Directly uses selected healthy key without extra ping requests.
 * - Intelligent error handling:
 *   * 429 Rate Limit / Quota: Failover immediately to next healthy key.
 *   * 401 Unauthorized: Mark key permanently INVALID, try next key.
 *   * 5xx / Timeout: Mark TEMPORARILY_UNAVAILABLE, controlled failover.
 *   * 400 Bad Request / 404: DO NOT ROTATE (application/parameter issue).
 * - Automatic recovery: Keys in cooldown automatically recover when cooldown expires.
 * - Thread/event-loop safe in Node.js.
 * - Zero secret leakage: Never logs or returns raw secret keys in diagnostics or API responses.
 */

export type AgnesKeyState =
  | "ACTIVE"
  | "RATE_LIMITED"
  | "QUOTA_EXHAUSTED"
  | "TEMPORARILY_UNAVAILABLE"
  | "INVALID"
  | "DISABLED";

export interface AgnesKeyStats {
  totalRequests: number;
  successCount: number;
  rateLimitCount: number;
  quotaExhaustedCount: number;
  serverErrorCount: number;
  invalidCount: number;
}

export interface AgnesKeySlot {
  id: string; // e.g. "key-1", "key-2", "key-3"
  index: number; // 0, 1, 2...
  sourceEnv: string; // Environment variable name source
  secret: string; // Normalized secret API key (internal only, NEVER serialized to client)
  configured: boolean;
  state: AgnesKeyState;
  cooldownUntil: number | null; // Timestamp in milliseconds
  lastUsedAt: number | null;
  consecutiveFailures: number;
  stats: AgnesKeyStats;
}

export interface SafeKeySummary {
  id: string;
  index: number;
  sourceEnv: string;
  configured: boolean;
  state: AgnesKeyState;
  cooldownRemainingSeconds: number | null;
  lastUsedAt: number | null;
  consecutiveFailures: number;
  stats: AgnesKeyStats;
}

export interface PoolHealthReport {
  configuredKeys: number;
  activeKeys: number;
  rateLimitedKeys: number;
  quotaExhaustedKeys: number;
  temporarilyUnavailableKeys: number;
  invalidKeys: number;
  keys: SafeKeySummary[];
  timestamp: number;
}

export class AgnesKeyManager {
  private static instance: AgnesKeyManager | null = null;
  private slots: AgnesKeySlot[] = [];

  private constructor() {
    this.reloadKeys();
  }

  public static getInstance(): AgnesKeyManager {
    if (!AgnesKeyManager.instance) {
      AgnesKeyManager.instance = new AgnesKeyManager();
    }
    return AgnesKeyManager.instance;
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
  public reloadKeys(): void {
    const rawConfigs: Array<{ envName: string; value: string | undefined }> = [
      { envName: "AGNES_API_KEY_1", value: process.env.AGNES_API_KEY_1 || process.env.AGNES_KEY_1 || process.env.AGNES_1 || process.env.AGNES },
      { envName: "AGNES_API_KEY_2", value: process.env.AGNES_API_KEY_2 || process.env.AGNES_KEY_2 || process.env.AGNES_2 || process.env.AGNES_II },
      { envName: "AGNES_API_KEY_3", value: process.env.AGNES_API_KEY_3 || process.env.AGNES_KEY_3 || process.env.AGNES_3 || process.env.AGNES_III },
      { envName: "AGNES_API_KEY_4", value: process.env.AGNES_API_KEY_4 || process.env.AGNES_KEY_4 || process.env.AGNES_4 || process.env.AGNES_IV },
      { envName: "AGNES_API_KEY_5", value: process.env.AGNES_API_KEY_5 || process.env.AGNES_KEY_5 || process.env.AGNES_5 || process.env.AGNES_V },
    ];

    const seenSecrets = new Set<string>();
    const newSlots: AgnesKeySlot[] = [];

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
            invalidCount: 0,
          },
        });
      }
    });

    // Check generic AGNES_API_KEY fallback
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
          invalidCount: 0,
        },
      });
    }

    this.slots = newSlots;
    console.log(`[AgnesKeyManager] Initialized key pool with ${this.slots.length} configured keys.`);
  }

  private cleanKey(val: string | undefined): string {
    if (!val || typeof val !== "string") return "";
    return val
      .replace(/^Bearer\s+/i, "")
      .replace(/^["'\s]+|["'\s]+$/g, "")
      .trim();
  }

  /**
   * Checks if at least one key is configured.
   */
  public hasConfiguredKeys(): boolean {
    return this.slots.length > 0;
  }

  /**
   * Returns total count of configured keys.
   */
  public getConfiguredKeyCount(): number {
    return this.slots.length;
  }

  /**
   * Checks for expired cooldowns and automatically recovers keys back to ACTIVE state.
   */
  public updateCooldowns(): void {
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
  public selectKey(excludeKeyIds: Set<string> = new Set()): AgnesKeySlot | null {
    this.updateCooldowns();

    // Priority 1: First healthy ACTIVE key in deterministic order
    for (const slot of this.slots) {
      if (excludeKeyIds.has(slot.id)) continue;
      if (slot.state === "ACTIVE") {
        return slot;
      }
    }

    // Priority 2: If none is ACTIVE, check if any has reached expired cooldown just now
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
  public getShortestRemainingCooldownSeconds(excludeKeyIds: Set<string> = new Set()): number {
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

    if (minMs === Infinity) return 15; // default fallback
    return Math.max(1, Math.ceil(minMs / 1000));
  }

  /**
   * Retrieves a specific key slot by ID (e.g. for video polling).
   */
  public getKeySlotById(keyId: string): AgnesKeySlot | null {
    this.updateCooldowns();
    return this.slots.find((s) => s.id === keyId) || null;
  }

  /**
   * Records a successful request on a key slot.
   */
  public recordSuccess(keyId: string): void {
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
  public recordRateLimit(
    keyId: string,
    options?: {
      retryAfterHeader?: string | number | null;
      errorText?: string;
      status?: number;
    }
  ): void {
    const slot = this.slots.find((s) => s.id === keyId);
    if (!slot) return;

    slot.lastUsedAt = Date.now();
    slot.consecutiveFailures++;
    slot.stats.totalRequests++;

    const lower = (options?.errorText || "").toLowerCase();
    const isQuotaExhausted =
      lower.includes("token plan") ||
      lower.includes("free users") ||
      lower.includes("insufficient quota") ||
      lower.includes("credit balance") ||
      lower.includes("quota exceeded") ||
      lower.includes("account quota");

    if (isQuotaExhausted) {
      slot.state = "QUOTA_EXHAUSTED";
      slot.stats.quotaExhaustedCount++;
      // Quota exhaustion cooldown: 30 minutes (or longer if Retry-After specified)
      const quotaCooldownMs = this.parseRetryAfter(options?.retryAfterHeader) || 30 * 60 * 1000;
      slot.cooldownUntil = Date.now() + quotaCooldownMs;
      console.warn(
        `[AgnesKeyManager] ${slot.id} (${slot.sourceEnv}) marked QUOTA_EXHAUSTED. Cooldown until ${new Date(
          slot.cooldownUntil
        ).toLocaleTimeString()}`
      );
    } else {
      slot.state = "RATE_LIMITED";
      slot.stats.rateLimitCount++;
      // Rate limit backoff: use Retry-After if provided, else exponential backoff (15s, 30s, 60s, 120s...)
      const parsedRetryAfter = this.parseRetryAfter(options?.retryAfterHeader);
      const backoffMs =
        parsedRetryAfter ||
        Math.min(15000 * Math.pow(2, Math.max(0, slot.consecutiveFailures - 1)), 300000);
      slot.cooldownUntil = Date.now() + backoffMs;
      console.warn(
        `[AgnesKeyManager] ${slot.id} (${slot.sourceEnv}) marked RATE_LIMITED. Cooldown: ${Math.round(
          backoffMs / 1000
        )}s.`
      );
    }
  }

  /**
   * Records temporary server errors (500, 502, 503, 504, 520, timeout).
   */
  public recordServerError(keyId: string, status = 500): void {
    const slot = this.slots.find((s) => s.id === keyId);
    if (!slot) return;

    slot.lastUsedAt = Date.now();
    slot.consecutiveFailures++;
    slot.stats.totalRequests++;
    slot.stats.serverErrorCount++;

    // Controlled cooldown for upstream transient instability (15 seconds)
    slot.state = "TEMPORARILY_UNAVAILABLE";
    slot.cooldownUntil = Date.now() + 15000;
    console.warn(
      `[AgnesKeyManager] ${slot.id} marked TEMPORARILY_UNAVAILABLE (HTTP ${status}). Short cooldown 15s.`
    );
  }

  /**
   * Records permanent key invalidation (HTTP 401).
   */
  public recordInvalidKey(keyId: string): void {
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
  public recordDisabledKey(keyId: string, reason?: string): void {
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
  public recordGenericError(keyId: string): void {
    const slot = this.slots.find((s) => s.id === keyId);
    if (!slot) return;

    slot.lastUsedAt = Date.now();
    slot.stats.totalRequests++;
    // Do not rotate or penalize key for 400 Bad Request
  }

  private parseRetryAfter(headerVal?: string | number | null): number | null {
    if (!headerVal) return null;
    if (typeof headerVal === "number") {
      return headerVal > 0 ? headerVal * 1000 : null;
    }
    const num = Number(headerVal);
    if (!isNaN(num) && num > 0) {
      return num * 1000;
    }
    // Check if HTTP-date
    const parsedDate = Date.parse(headerVal);
    if (!isNaN(parsedDate) && parsedDate > Date.now()) {
      return parsedDate - Date.now();
    }
    return null;
  }

  /**
   * Returns safe pool health report without exposing secrets.
   */
  public getPoolHealth(): PoolHealthReport {
    this.updateCooldowns();
    const now = Date.now();

    const safeSummaries: SafeKeySummary[] = this.slots.map((s) => {
      let remainingSec: number | null = null;
      if (s.cooldownUntil && s.cooldownUntil > now) {
        remainingSec = Math.ceil((s.cooldownUntil - now) / 1000);
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
        stats: { ...s.stats },
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
      timestamp: now,
    };
  }

  /**
   * Helper that executes an operation using the healthy key pool with automatic failover.
   */
  public async executeWithFailover<T>(
    operation: (key: AgnesKeySlot) => Promise<{
      response?: Response;
      data?: T;
      status: number;
      errorText?: string;
      retryAfter?: string | null;
    }>,
    context = "Request"
  ): Promise<{ data: T; keyId: string; status: number }> {
    const triedKeyIds = new Set<string>();
    let lastError: any = null;

    while (triedKeyIds.size < this.slots.length) {
      const key = this.selectKey(triedKeyIds);
      if (!key) {
        break;
      }

      triedKeyIds.add(key.id);

      try {
        const result = await operation(key);
        const { status, errorText, retryAfter, data } = result;

        // 1. Success (HTTP 2xx)
        if (status >= 200 && status < 300) {
          this.recordSuccess(key.id);
          return { data: data as T, keyId: key.id, status };
        }

        // 2. HTTP 429 Rate Limit / Quota Exhausted
        if (status === 429) {
          this.recordRateLimit(key.id, {
            retryAfterHeader: retryAfter,
            errorText,
            status,
          });

          // Check if another key is available before looping
          const nextAvailable = this.selectKey(triedKeyIds);
          if (nextAvailable) {
            console.log(
              `[AgnesKeyManager] [${context}] Failover from ${key.id} to ${nextAvailable.id} due to rate limit.`
            );
            continue;
          } else {
            lastError = {
              status: 429,
              error:
                errorText ||
                "Agnes AI rate limit reached across all configured API keys.",
              code: "rate_limit_exceeded",
              keyId: key.id,
            };
            break;
          }
        }

        // 3. HTTP 401 Invalid Key
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
              keyId: key.id,
            };
            break;
          }
        }

        // 4. Upstream Server Errors (500, 502, 503, 504, 520)
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
              keyId: key.id,
            };
            break;
          }
        }

        // 5. Client errors (400 Bad Request, 404, 422, etc.)
        // DO NOT ROTATE! This is a client/request parameter problem, not a key limit problem.
        this.recordGenericError(key.id);
        throw {
          status,
          error: errorText || `Request failed with HTTP ${status}.`,
          code: status === 400 ? "bad_request" : "client_error",
          keyId: key.id,
        };
      } catch (err: any) {
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
      cooldownSeconds: shortestCooldown,
    };
  }
}

// Canonical singleton export
export const agnesKeyManager = AgnesKeyManager.getInstance();
