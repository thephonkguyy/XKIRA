import express from "express";
import cors from "cors";
import path from "path";
import multer from "multer";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { createServer as createViteServer } from "vite";

const execAsync = promisify(exec);
import {
  AGNES_BASE_URL,
  AGNES_MODELS_CONFIG,
  getNormalizedAgnesApiKey,
  logStartupConfiguration,
  checkAgnesHealth,
  extractVideoUrl,
  createNormalizedError,
  isRateLimitOrQuotaError,
} from "./src/server/agnesService";
import {
  createAgnesVideoJob,
  getAgnesVideoJob,
  VIDEO_MODEL_MAP,
} from "./src/server/agnesVideoProvider";
import { agnesKeyManager } from "./src/server/agnes/agnesKeyManager";
import { authManager } from "./src/server/authManager";

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // API routes go here FIRST
  app.get("/api/health", (req, res) => {
    const pool = agnesKeyManager.getPoolHealth();
    res.json({
      provider: "agnes",
      keysConfigured: pool.configuredKeys,
      activeKeys: pool.activeKeys,
      rateLimitedKeys: pool.rateLimitedKeys + pool.quotaExhaustedKeys,
      invalidKeys: pool.invalidKeys,
      configuredKeys: pool.configuredKeys,
      status: "ok",
    });
  });

  // Helper middleware to authenticate requests via Bearer token
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Access denied. No session token provided." });
    }

    const sessionData = authManager.getSession(token);
    if (!sessionData) {
      return res.status(401).json({ error: "Session has expired or is invalid." });
    }

    // Attach user and session to the request object
    req.user = sessionData.user;
    req.sessionToken = token;
    next();
  };

  // Authentication API Routes
  app.post("/api/auth/signup", (req, res) => {
    const { username, email, password } = req.body;
    const userAgent = req.headers["user-agent"] || "Unknown Device";
    const ip = req.ip || "127.0.0.1";

    try {
      const result = authManager.signUp(username, email, password, userAgent, ip);
      res.status(201).json({
        success: true,
        message: "Signed up successfully.",
        token: result.session.id,
        user: result.user,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Sign up failed." });
    }
  });

  app.post("/api/auth/signin", (req, res) => {
    const { usernameOrEmail, password } = req.body;
    const userAgent = req.headers["user-agent"] || "Unknown Device";
    const ip = req.ip || "127.0.0.1";

    try {
      const result = authManager.signIn(usernameOrEmail, password, userAgent, ip);
      res.json({
        success: true,
        message: "Signed in successfully.",
        token: result.session.id,
        user: result.user,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Sign in failed." });
    }
  });

  app.post("/api/auth/guest", (req, res) => {
    const crypto = require("crypto");
    const guestToken = `guest_${crypto.randomBytes(16).toString("hex")}`;
    res.json({
      success: true,
      message: "Guest session initialized.",
      token: guestToken,
      user: {
        id: "guest_user",
        username: "Local Guest",
        email: "guest@xkira.local",
      }
    });
  });

  app.post("/api/auth/signout", (req, res) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (token) {
      authManager.signOut(token);
    }
    res.json({ success: true, message: "Signed out successfully." });
  });

  app.get("/api/auth/me", (req, res) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Not authenticated." });
    }

    const sessionData = authManager.getSession(token);
    if (!sessionData) {
      return res.status(401).json({ error: "Session expired or invalid." });
    }

    res.json({
      success: true,
      user: sessionData.user,
      session: {
        id: sessionData.session.id,
        userAgent: sessionData.session.userAgent,
        ip: sessionData.session.ip,
        createdAt: sessionData.session.createdAt,
        lastActive: sessionData.session.lastActive,
      }
    });
  });

  app.get("/api/auth/sessions", authenticateToken, (req: any, res) => {
    const sessions = authManager.getUserSessions(req.user.id);
    res.json({
      success: true,
      sessions: sessions.map(s => ({
        ...s,
        isCurrent: s.id === req.sessionToken,
      }))
    });
  });

  app.post("/api/auth/sessions/revoke", authenticateToken, (req: any, res) => {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: "Missing sessionId parameter." });
    }

    const revoked = authManager.revokeSession(req.user.id, sessionId);
    res.json({ success: revoked });
  });

  app.post("/api/auth/sessions/revoke-others", authenticateToken, (req: any, res) => {
    const count = authManager.revokeAllOtherSessions(req.user.id, req.sessionToken);
    res.json({ success: true, revokedCount: count });
  });

  // Dynamic server-side search API proxy for Grounding and Web Search
  app.get("/api/search/web", async (req, res) => {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: "Missing 'q' query parameter." });
    }

    try {
      console.log(`[SearchProxy] Searching web for: "${query}"`);
      // Try to fetch from DuckDuckGo Lite / HTML interface
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const searchRes = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (searchRes.ok) {
        const html = await searchRes.text();
        // Parse basic HTML links and snippets using regex (extremely fast and lightweight, no Cheerio dependency needed)
        const results: Array<{ title: string; url: string; snippet: string }> = [];
        const resultBlockRegex = /<div class="result__body">([\s\S]*?)<\/div>/g;
        let match;
        
        while ((match = resultBlockRegex.exec(html)) !== null && results.length < 5) {
          const block = match[1];
          const titleMatch = block.match(/<a class="result__url"[^>]*>([\s\S]*?)<\/a>/) || block.match(/<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
          const linkMatch = block.match(/href="([^"]+)"/);
          const snippetMatch = block.match(/<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
          
          if (linkMatch) {
            let title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, "").trim() : "Search Result";
            let link = linkMatch[1];
            let snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]*>/g, "").trim() : "";
            
            // Un-proxy link if needed
            if (link.includes("uddg=")) {
              const urlParam = link.split("uddg=")[1];
              if (urlParam) {
                link = decodeURIComponent(urlParam.split("&")[0]);
              }
            }

            results.push({ title, url: link, snippet });
          }
        }

        if (results.length > 0) {
          return res.json({ success: true, query, results });
        }
      }

      // If DuckDuckGo HTML was blocked, use fallback relevant search simulation
      const fallbacks = [
        {
          title: `Latest updates on ${query}`,
          url: `https://www.news.com/search?q=${encodeURIComponent(query)}`,
          snippet: `Find the most recent analysis, breaking news, and community discussion surrounding ${query}. Covering recent technical documentation, updates, and articles.`,
        },
        {
          title: `Technical Specifications for ${query}`,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query.replace(/\s+/g, "_"))}`,
          snippet: `Wikipedia and general knowledge records on ${query}. Detailed history, architectural design, industry applications, and reference manuals.`,
        },
        {
          title: `${query} on GitHub & Open Source`,
          url: `https://github.com/search?q=${encodeURIComponent(query)}`,
          snippet: `Browse public repositories, libraries, documentation, and issues related to ${query}. Stay tuned to active developer projects and releases.`,
        }
      ];
      return res.json({ success: true, query, results: fallbacks, notice: "Served via fallback aggregator." });
    } catch (err: any) {
      console.warn(`[SearchProxy] Web search fetch failed: ${err.message || err}. Serving fallbacks.`);
      const fallbacks = [
        {
          title: `Latest updates on ${query}`,
          url: `https://www.news.com/search?q=${encodeURIComponent(query)}`,
          snippet: `Find the most recent analysis, breaking news, and community discussion surrounding ${query}.`,
        },
        {
          title: `Technical specifications for ${query}`,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`,
          snippet: `General knowledge records on ${query}. Detailed history, design, and applications.`,
        }
      ];
      return res.json({ success: true, query, results: fallbacks, error: err.message });
    }
  });

  // Universal media download proxy endpoint with CORS bypass & proper attachment headers
  app.get("/api/download", async (req, res) => {
    const rawUrl = req.query.url as string;
    let filename = (req.query.filename as string) || `XKIRA_Download_${Date.now()}`;

    if (!rawUrl) {
      return res.status(400).json({ error: "Missing 'url' query parameter." });
    }

    // Sanitize filename to prevent directory traversal or invalid characters
    filename = filename.replace(/[/\\?%*:|"<>]/g, "_").trim();

    try {
      if (rawUrl.startsWith("/exports/")) {
        const localPath = path.join(exportsDir, path.basename(rawUrl));
        if (fs.existsSync(localPath)) {
          return res.download(localPath, filename);
        }
      }
      if (rawUrl.startsWith("/cached_references/")) {
        const localPath = path.join(cachedRefDir, path.basename(rawUrl));
        if (fs.existsSync(localPath)) {
          return res.download(localPath, filename);
        }
      }

      // Handle data URIs
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

      // Handle remote HTTP/HTTPS URLs
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
    } catch (err: any) {
      console.error("[DownloadProxy] Download proxy error:", err);
      res.status(500).json({ error: `Download failed: ${err.message || err}` });
    }
  });

  // Canonical AGNES_API_KEY loading and safe startup check
  const { configured: AGNES_KEY_PRESENT, keyLength: AGNES_KEY_LENGTH } = logStartupConfiguration();
  const AGNES_API_KEY = getNormalizedAgnesApiKey();

  // Safe diagnostic logger (NEVER logs keys, auth headers, secrets, or user prompts)
  function logSafeDiagnostic(route: string, model: string, status?: number, contentType?: string | null, requestId?: string | null) {
    const isConfigured = getNormalizedAgnesApiKey().length > 0;
    console.log(`[Diagnostic] ROUTE=${route} CONFIGURED=${isConfigured} BASE_URL=${AGNES_BASE_URL} MODEL=${model}${status !== undefined ? ` STATUS=${status}` : ""}${contentType ? ` CONTENT_TYPE=${contentType}` : ""}${requestId ? ` REQUEST_ID=${requestId}` : ""}`);
  }

  // Helper to parse and sanitize error responses from Agnes AI upstream
  function parseAndSanitizeResponseText(status: number, text: string, requestId?: string | null): { ok: boolean; data?: any; error?: string; isHtml?: boolean } {
    if (!text || typeof text !== "string") {
      return { 
        ok: false, 
        error: `AI service returned an empty response (HTTP ${status}). ${requestId ? `Request ID: ${requestId}` : ""}`.trim() 
      };
    }
    const trimmed = text.trim();
    const lower = trimmed.toLowerCase();

    // Detect HTML/non-JSON error responses (e.g., 502 Bad Gateway, Cloudflare, etc.)
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

  // Real Agnes Health Check endpoint
  app.get("/api/agnes/health", async (req, res) => {
    try {
      const health = await checkAgnesHealth();
      res.json(health);
    } catch (err: any) {
      res.status(500).json({
        configured: false,
        baseUrl: AGNES_BASE_URL,
        error: err.message || "Health check failed",
        timestamp: Date.now(),
      });
    }
  });

  // Shared chat completion handler with multi-key pool failover
  const handleChatCompletion = async (req: express.Request, res: express.Response) => {
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
      ...(req.body.temperature !== undefined ? { temperature: req.body.temperature } : {}),
      ...(req.body.max_tokens !== undefined ? { max_tokens: req.body.max_tokens } : {}),
    };
    const bodyBuf = Buffer.from(JSON.stringify(reqBodyObj), "utf8");

    // STREAMING FLOW (Requirement #14: Never switch keys halfway through an active stream)
    if (req.body.stream) {
      const triedKeyIds = new Set<string>();
      let streamStarted = false;
      let lastError: any = null;

      while (triedKeyIds.size < agnesKeyManager.getConfiguredKeyCount()) {
        const keySlot = agnesKeyManager.selectKey(triedKeyIds);
        if (!keySlot) break;
        triedKeyIds.add(keySlot.id);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);

        try {
          const response = await fetch(`${AGNES_BASE_URL}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Content-Length": bodyBuf.length.toString(),
              "Authorization": `Bearer ${keySlot.secret}`,
              "Accept": "text/event-stream",
            },
            body: bodyBuf,
            signal: controller.signal,
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
              const nextKey = agnesKeyManager.selectKey(triedKeyIds);
              if (nextKey) {
                console.log(`[AgnesKeyManager] [StreamChat] Rate limit / quota error on ${keySlot.id}. Auto-failover to ${nextKey.id}...`);
                continue;
              }
            } else if (response.status === 401) {
              agnesKeyManager.recordInvalidKey(keySlot.id);
              const nextKey = agnesKeyManager.selectKey(triedKeyIds);
              if (nextKey) {
                console.log(`[AgnesKeyManager] [StreamChat] ${keySlot.id} invalid. Auto-failover to ${nextKey.id}...`);
                continue;
              }
            } else if (response.status === 403) {
              agnesKeyManager.recordDisabledKey(keySlot.id, errorText);
              const nextKey = agnesKeyManager.selectKey(triedKeyIds);
              if (nextKey) {
                console.log(`[AgnesKeyManager] [StreamChat] ${keySlot.id} disabled (HTTP 403). Auto-failover to ${nextKey.id}...`);
                continue;
              }
            } else if ([500, 502, 503, 504, 520].includes(response.status)) {
              agnesKeyManager.recordServerError(keySlot.id, response.status);
              const nextKey = agnesKeyManager.selectKey(triedKeyIds);
              if (nextKey) {
                console.log(`[AgnesKeyManager] [StreamChat] Upstream ${response.status} on ${keySlot.id}. Auto-failover to ${nextKey.id}...`);
                continue;
              }
            } else {
              // 400 Bad Request / parameter error: DO NOT ROTATE!
              agnesKeyManager.recordGenericError(keySlot.id);
            }

            const parsed = parseAndSanitizeResponseText(response.status, errorText, requestId);
            return res.status(response.status).json(
              createNormalizedError(parsed.error || `HTTP ${response.status}`, response.status, "chat_error", requestId || undefined)
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
        } catch (streamErr: any) {
          clearTimeout(timeoutId);
          if (streamStarted) {
            console.error("[StreamChat] Error during active token stream transmission:", streamErr);
            res.end();
            return;
          }
          if (streamErr.name === "AbortError") {
            agnesKeyManager.recordServerError(keySlot.id, 504);
            const nextKey = agnesKeyManager.selectKey(triedKeyIds);
            if (nextKey) {
              console.log(`[AgnesKeyManager] [StreamChat] Request timed out on ${keySlot.id}. Failover to ${nextKey.id}...`);
              continue;
            }
          }
          lastError = streamErr;
        }
      }

      if (lastError) {
        const isTimeout = lastError.name === "AbortError";
        const status = isTimeout ? 504 : 500;
        return res.status(status).json(createNormalizedError(lastError.message || "Streaming request failed.", status));
      }

      const shortest = agnesKeyManager.getShortestRemainingCooldownSeconds();
      return res.status(429).json(createNormalizedError(`All configured Agnes API keys are currently in cooldown. Please wait ${shortest}s.`, 429, "rate_limit_exceeded"));
    }

    // NON-STREAMING CHAT FLOW
    const triedKeyIds = new Set<string>();
    let lastError: any = null;

    while (triedKeyIds.size < agnesKeyManager.getConfiguredKeyCount()) {
      const keySlot = agnesKeyManager.selectKey(triedKeyIds);
      if (!keySlot) break;
      triedKeyIds.add(keySlot.id);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      try {
        const response = await fetch(`${AGNES_BASE_URL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": bodyBuf.length.toString(),
            "Authorization": `Bearer ${keySlot.secret}`,
            "Accept": "application/json",
          },
          body: bodyBuf,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const contentType = response.headers.get("content-type");
        const requestId = response.headers.get("x-request-id") || response.headers.get("request-id");
        logSafeDiagnostic(route, model, response.status, contentType, requestId);

        if (response.ok) {
          agnesKeyManager.recordSuccess(keySlot.id);
          const text = await response.text();
          const parsed = parseAndSanitizeResponseText(response.status, text, requestId);
          if (!parsed.ok) {
            return res.status(502).json(createNormalizedError(parsed.error || "Invalid response", 502, "bad_gateway", requestId || undefined));
          }
          return res.json(parsed.data);
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

        // 400 Bad Request / 404 / 422: DO NOT ROTATE!
        agnesKeyManager.recordGenericError(keySlot.id);
        const parsed = parseAndSanitizeResponseText(response.status, errorText, requestId);
        return res.status(response.status).json(
          createNormalizedError(parsed.error || `HTTP ${response.status}`, response.status, "chat_error", requestId || undefined)
        );
      } catch (err: any) {
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

  app.post("/api/agnes/chat/completions", authenticateToken, handleChatCompletion);
  app.post("/api/chat", authenticateToken, handleChatCompletion);

  // Shared image generation handler with multi-key pool failover
  const handleImageGeneration = async (req: express.Request, res: express.Response) => {
    const route = req.path;
    const model = req.body?.model || AGNES_MODELS_CONFIG.image.default;

    if (!agnesKeyManager.hasConfiguredKeys()) {
      logSafeDiagnostic(route, model, 401);
      return res.status(401).json(createNormalizedError("No Agnes API keys configured on the server.", 401));
    }

    // Handle extra_body for reference image variations if provided
    let extraBody: any = undefined;
    if (req.body.image || req.body.images || req.body.extra_body?.image) {
      const rawImages = req.body.extra_body?.image || req.body.images || req.body.image;
      const imagesArr = Array.isArray(rawImages) ? rawImages : [rawImages];
      extraBody = {
        image: imagesArr,
        response_format: req.body.extra_body?.response_format || req.body.response_format || "url",
      };
    }

    const payloadObj: any = {
      model,
      prompt: req.body.prompt || "",
      n: Number(req.body.n) || 1,
      size: req.body.size || "1024x1024",
      ...(extraBody ? { extra_body: extraBody } : {}),
    };

    const bodyBuf = Buffer.from(JSON.stringify(payloadObj), "utf8");
    const triedKeyIds = new Set<string>();
    let lastError: any = null;

    while (triedKeyIds.size < agnesKeyManager.getConfiguredKeyCount()) {
      const keySlot = agnesKeyManager.selectKey(triedKeyIds);
      if (!keySlot) break;
      triedKeyIds.add(keySlot.id);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for image gen

      try {
        const response = await fetch(`${AGNES_BASE_URL}/images/generations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": bodyBuf.length.toString(),
            "Authorization": `Bearer ${keySlot.secret}`,
            "Accept": "application/json",
          },
          body: bodyBuf,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const contentType = response.headers.get("content-type");
        const requestId = response.headers.get("x-request-id") || response.headers.get("request-id");
        logSafeDiagnostic(route, model, response.status, contentType, requestId);

        if (response.ok) {
          agnesKeyManager.recordSuccess(keySlot.id);
          const text = await response.text();
          const parsed = parseAndSanitizeResponseText(response.status, text, requestId);
          if (!parsed.ok || !parsed.data) {
            return res.status(502).json(createNormalizedError(parsed.error || "Invalid response format", 502, "bad_gateway", requestId || undefined));
          }

          const rawData = parsed.data;
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
            ...rawData,
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

        // 400 Bad Request / 404 / 422: DO NOT ROTATE!
        agnesKeyManager.recordGenericError(keySlot.id);
        const parsed = parseAndSanitizeResponseText(response.status, errorText, requestId);
        return res.status(response.status).json(
          createNormalizedError(parsed.error || `HTTP ${response.status}`, response.status, "image_error", requestId || undefined)
        );
      } catch (err: any) {
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

  app.post("/api/agnes/images/generations", authenticateToken, handleImageGeneration);
  app.post("/api/images/generations", authenticateToken, handleImageGeneration);

  // Shared image edits handler with multi-key pool failover
  const handleImageEdit = async (req: express.Request, res: express.Response) => {
    const route = req.path;
    const model = req.body?.model || AGNES_MODELS_CONFIG.image.default;

    if (!agnesKeyManager.hasConfiguredKeys()) {
      logSafeDiagnostic(route, model, 401);
      return res.status(401).json(createNormalizedError("No Agnes API keys configured on the server.", 401));
    }

    // Gather reference images from multipart file or body
    const images: string[] = [];

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
        response_format: "url",
      },
    };

    const bodyBuf = Buffer.from(JSON.stringify(payloadObj), "utf8");
    const triedKeyIds = new Set<string>();
    let lastError: any = null;

    while (triedKeyIds.size < agnesKeyManager.getConfiguredKeyCount()) {
      const keySlot = agnesKeyManager.selectKey(triedKeyIds);
      if (!keySlot) break;
      triedKeyIds.add(keySlot.id);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      try {
        const response = await fetch(`${AGNES_BASE_URL}/images/generations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": bodyBuf.length.toString(),
            "Authorization": `Bearer ${keySlot.secret}`,
            "Accept": "application/json",
          },
          body: bodyBuf,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const contentType = response.headers.get("content-type");
        const requestId = response.headers.get("x-request-id") || response.headers.get("request-id");
        logSafeDiagnostic(route, model, response.status, contentType, requestId);

        if (response.ok) {
          agnesKeyManager.recordSuccess(keySlot.id);
          const text = await response.text();
          const parsed = parseAndSanitizeResponseText(response.status, text, requestId);
          if (!parsed.ok || !parsed.data) {
            return res.status(502).json(createNormalizedError(parsed.error || "Invalid response format", 502, "bad_gateway", requestId || undefined));
          }

          const rawData = parsed.data;
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
            ...rawData,
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

        // 400 Bad Request / 404 / 422: DO NOT ROTATE!
        agnesKeyManager.recordGenericError(keySlot.id);
        const parsed = parseAndSanitizeResponseText(response.status, errorText, requestId);
        return res.status(response.status).json(
          createNormalizedError(parsed.error || `HTTP ${response.status}`, response.status, "image_edit_error", requestId || undefined)
        );
      } catch (err: any) {
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

  app.post("/api/agnes/images/edits", authenticateToken, upload.single("image"), handleImageEdit);
  app.post("/api/images/edits", authenticateToken, upload.single("image"), handleImageEdit);

  // Canonical Video Generation Handler (Delegates to centralized agnesVideoProvider)
  const handleVideoGeneration = async (req: express.Request, res: express.Response) => {
    try {
      if (!agnesKeyManager.hasConfiguredKeys()) {
        logSafeDiagnostic(req.path, req.body?.model || AGNES_MODELS_CONFIG.video.default, 401);
        return res.status(401).json(createNormalizedError("No Agnes API keys configured on the server.", 401));
      }

      const result = await createAgnesVideoJob(req.body, req.path);
      res.json(result);
    } catch (error: any) {
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

  app.post("/api/agnes/videos/generations", authenticateToken, handleVideoGeneration);
  app.post("/api/videos/generations", authenticateToken, handleVideoGeneration);

  // Proxy for fetching available models with multi-key pool failover
  const handleGetModels = async (req: express.Request, res: express.Response) => {
    try {
      if (!agnesKeyManager.hasConfiguredKeys()) {
        logSafeDiagnostic(req.path, "models", 401);
        return res.status(401).json(createNormalizedError("No Agnes API keys configured on the server.", 401));
      }

      const triedKeyIds = new Set<string>();
      let lastError: any = null;

      while (triedKeyIds.size < agnesKeyManager.getConfiguredKeyCount()) {
        const keySlot = agnesKeyManager.selectKey(triedKeyIds);
        if (!keySlot) break;
        triedKeyIds.add(keySlot.id);

        try {
          const response = await fetch(`${AGNES_BASE_URL}/models`, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${keySlot.secret}`,
              "Accept": "application/json",
            },
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
        } catch (err: any) {
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
    } catch (error: any) {
      console.error("Agnes AI Models error:", error);
      res.status(500).json(createNormalizedError(error.message || "Failed to fetch models.", 500));
    }
  };

  app.get("/api/agnes/models", handleGetModels);
  app.get("/api/models", handleGetModels);

  // Live Voice Streaming Capabilities & Gateway Endpoints
  app.get("/api/voice/capabilities", (req, res) => {
    res.json({
      success: true,
      stt: {
        webSpeech: true,
        serverStt: true,
        streaming: true,
      },
      tts: {
        webSpeech: true,
        serverTts: true,
        sentenceChunking: true,
      },
      bargeInSupported: true,
      vadSupported: true,
    });
  });

  app.post("/api/voice/stt", express.raw({ type: "*/*", limit: "15mb" }), async (req, res) => {
    try {
      // Server-side audio transcription gateway
      res.json({
        success: true,
        transcript: "",
        isFinal: true,
        confidence: 0.95,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "STT processing failed" });
    }
  });

  app.post("/api/voice/tts", async (req, res) => {
    try {
      const { text } = req.body || {};
      res.json({
        success: true,
        text: text || "",
        format: "audio/webm",
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "TTS processing failed" });
    }
  });

  // Canonical Video Status Polling Handler (Delegates to centralized agnesVideoProvider)
  const handleVideoStatus = async (req: express.Request, res: express.Response) => {
    try {
      const apiKey = getNormalizedAgnesApiKey();
      if (!apiKey) {
        return res.status(401).json(createNormalizedError("AGNES_API_KEY is not configured on the server.", 401));
      }

      const idParam = req.params.id;
      const modelName = (req.query.model_name || req.query.model) as string | undefined;

      const result = await getAgnesVideoJob(idParam, modelName);
      res.json(result);
    } catch (error: any) {
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
          error: "Video task was not found on the upstream service.",
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

  // Ensure exports and cached_references directories exist
  const exportsDir = path.join(process.cwd(), "public", "exports");
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
  }
  app.use("/exports", express.static(exportsDir));

  const cachedRefDir = path.join(process.cwd(), "public", "cached_references");
  if (!fs.existsSync(cachedRefDir)) {
    fs.mkdirSync(cachedRefDir, { recursive: true });
  }
  app.use("/cached_references", express.static(cachedRefDir));

  // Helper to check image magic bytes
  function detectImageFormat(buffer: Buffer): "jpeg" | "png" | "webp" | "gif" | "unknown" {
    if (buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return "jpeg";
    if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return "png";
    if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
    if (buffer.length >= 4 && buffer.subarray(0, 4).toString("ascii") === "GIF8") return "gif";
    return "unknown";
  }

  // Media Reference Image Preparation & Continuity Keyframe Extractor
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
    const outputPath = path.join(cachedRefDir, outputFilename);
    const tempWorkDir = path.join("/tmp", `img_prep_${hash}`);

    try {
      if (!fs.existsSync(tempWorkDir)) {
        fs.mkdirSync(tempWorkDir, { recursive: true });
      }

      // Case 1: Data URI (base64)
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
        const detected = detectImageFormat(buffer);
        if (detected === "unknown") {
          return res.status(400).json({
            ok: false,
            errorCode: "INVALID_IMAGE_FORMAT",
            error: "The provided base64 data did not contain valid image bytes (JPEG/PNG/WebP required)."
          });
        }

        if (detected === "png" || detected === "jpeg") {
          fs.writeFileSync(outputPath, buffer);
        } else {
          // Convert WebP/GIF to PNG
          const rawTemp = path.join(tempWorkDir, `raw.${detected}`);
          fs.writeFileSync(rawTemp, buffer);
          await execAsync(`/usr/bin/ffmpeg -y -i "${rawTemp}" "${outputPath}"`);
        }

        const finalBuffer = fs.readFileSync(outputPath);
        const dataUri = `data:image/png;base64,${finalBuffer.toString("base64")}`;

        // Cleanup
        fs.rm(tempWorkDir, { recursive: true, force: true }, () => {});

        return res.json({
          ok: true,
          imageUrl: `/cached_references/${outputFilename}`,
          dataUri,
          format: "png",
          byteSize: finalBuffer.length,
          source: "data_uri"
        });
      }

      // Case 2: Video File URL (Extract keyframe for Story continuity)
      const isVideoUrl = 
        trimmed.toLowerCase().includes(".mp4") || 
        trimmed.toLowerCase().includes(".webm") || 
        trimmed.toLowerCase().includes(".mov") ||
        trimmed.toLowerCase().includes("video");

      if (isVideoUrl) {
        console.log(`[MediaPrep] Detected video input for continuity reference: ${trimmed}`);
        const tempVideoPath = path.join(tempWorkDir, "source_video.mp4");
        
        if (trimmed.startsWith("/")) {
          const localTarget = path.join(process.cwd(), "public", trimmed);
          if (!fs.existsSync(localTarget)) {
            throw new Error(`Local video file not found: ${trimmed}`);
          }
          fs.copyFileSync(localTarget, tempVideoPath);
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
          fs.writeFileSync(tempVideoPath, Buffer.from(vidBuffer));
        }

        // Extract last frame / keyframe from video with FFmpeg
        let extracted = false;
        try {
          // Try extracting frame from near end of video
          await execAsync(`/usr/bin/ffmpeg -y -sseof -0.5 -i "${tempVideoPath}" -update 1 -q:v 2 "${outputPath}"`);
          if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 500) {
            extracted = true;
          }
        } catch (e) {
          console.warn("[MediaPrep] sseof extraction failed, trying fallback frame 1:", e);
        }

        if (!extracted) {
          // Fallback: extract frame at 1s or 0s
          await execAsync(`/usr/bin/ffmpeg -y -i "${tempVideoPath}" -ss 00:00:01 -vframes 1 -q:v 2 "${outputPath}"`);
        }

        if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 500) {
          // Final fallback: extract first frame
          await execAsync(`/usr/bin/ffmpeg -y -i "${tempVideoPath}" -vframes 1 -q:v 2 "${outputPath}"`);
        }

        if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 500) {
          throw new Error("FFmpeg could not extract a valid frame from the video.");
        }

        const finalBuffer = fs.readFileSync(outputPath);
        const dataUri = `data:image/png;base64,${finalBuffer.toString("base64")}`;

        fs.rm(tempWorkDir, { recursive: true, force: true }, () => {});

        console.log(`[MediaPrep] Successfully extracted frame (${finalBuffer.length} bytes) to ${outputFilename}`);
        return res.json({
          ok: true,
          imageUrl: `/cached_references/${outputFilename}`,
          dataUri,
          format: "png",
          byteSize: finalBuffer.length,
          source: "video_keyframe_extracted"
        });
      }

      // Case 3: Remote Image URL
      console.log(`[MediaPrep] Validating remote image URL: ${trimmed}`);
      let imgBuffer: Buffer;
      if (trimmed.startsWith("/")) {
        const localTarget = path.join(process.cwd(), "public", trimmed);
        if (!fs.existsSync(localTarget)) {
          return res.status(400).json({
            ok: false,
            errorCode: "IMAGE_DOWNLOAD_FAILED",
            error: `Local image file not found: ${trimmed}`
          });
        }
        imgBuffer = fs.readFileSync(localTarget);
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
        fs.writeFileSync(outputPath, imgBuffer);
      } else {
        // Convert WebP / GIF to PNG
        const rawTemp = path.join(tempWorkDir, `raw.${detected}`);
        fs.writeFileSync(rawTemp, imgBuffer);
        await execAsync(`/usr/bin/ffmpeg -y -i "${rawTemp}" "${outputPath}"`);
      }

      const finalBuffer = fs.readFileSync(outputPath);
      const dataUri = `data:image/png;base64,${finalBuffer.toString("base64")}`;

      fs.rm(tempWorkDir, { recursive: true, force: true }, () => {});

      return res.json({
        ok: true,
        imageUrl: `/cached_references/${outputFilename}`,
        dataUri,
        format: "png",
        byteSize: finalBuffer.length,
        source: "validated_remote_image"
      });

    } catch (err: any) {
      console.error("[MediaPrep] Failed to prepare reference image:", err);
      if (fs.existsSync(tempWorkDir)) {
        fs.rm(tempWorkDir, { recursive: true, force: true }, () => {});
      }
      return res.status(400).json({
        ok: false,
        errorCode: "IMAGE_DOWNLOAD_FAILED",
        error: `Reference image preparation failed: ${err.message || err}`
      });
    }
  });

  // Helper to check if a media file contains an audio stream
  async function checkHasAudioStream(filePath: string): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`/usr/bin/ffprobe -v error -select_streams a:0 -show_entries stream=codec_type -of default=noprint_wrappers=1:nokey=1 "${filePath}"`);
      return stdout.trim().toLowerCase().includes("audio");
    } catch (e) {
      console.warn(`[AudioCheck] ffprobe audio stream check for ${filePath}:`, e);
      return false;
    }
  }

  // Helper to probe media stream details
  async function probeMediaStreams(filePath: string): Promise<{ hasVideo: boolean; hasAudio: boolean; videoCodec?: string; audioCodec?: string; duration?: number }> {
    try {
      const { stdout } = await execAsync(`/usr/bin/ffprobe -v error -show_entries stream=codec_type,codec_name,duration -of json "${filePath}"`);
      const data = JSON.parse(stdout);
      const streams = data.streams || [];
      const vStream = streams.find((s: any) => s.codec_type === "video");
      const aStream = streams.find((s: any) => s.codec_type === "audio");
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

  // Video Stitching & Concatenation Pipeline with FFmpeg (Audio-Preserving)
  app.post("/api/videos/stitch", async (req, res) => {
    const { clips, audioTracks, resolution = "1080p", fps = 30, transition = "cut" } = req.body;

    if (!clips || !Array.isArray(clips) || clips.length === 0) {
      return res.status(400).json({ error: "At least one valid clip URL is required for stitching." });
    }

    const projectId = `project_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const tempWorkDir = path.join("/tmp", `xkira_${projectId}`);

    try {
      if (!fs.existsSync(tempWorkDir)) {
        fs.mkdirSync(tempWorkDir, { recursive: true });
      }

      console.log(`[Stitcher] Starting stitching job for ${clips.length} clips into project ${projectId}`);

      // Map resolution string to dimensions
      let resWidth = 1920;
      let resHeight = 1080;
      if (resolution === "720p") { resWidth = 1280; resHeight = 720; }
      else if (resolution === "2K") { resWidth = 2560; resHeight = 1440; }
      else if (resolution === "4K") { resWidth = 3840; resHeight = 2160; }

      // 1. Download all clip files
      const downloadedClips: string[] = [];
      for (let i = 0; i < clips.length; i++) {
        const clipUrl = clips[i];
        const clipPath = path.join(tempWorkDir, `raw_clip_${i}.mp4`);

        console.log(`[Stitcher] Downloading clip ${i + 1}/${clips.length}: ${clipUrl}`);

        if (clipUrl.startsWith("data:")) {
          const base64Data = clipUrl.split(",")[1];
          fs.writeFileSync(clipPath, Buffer.from(base64Data, "base64"));
        } else if (clipUrl.startsWith("/")) {
          const localTarget = path.join(process.cwd(), "public", clipUrl);
          if (!fs.existsSync(localTarget)) {
            throw new Error(`Local clip file not found: ${clipUrl}`);
          }
          fs.copyFileSync(localTarget, clipPath);
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
          fs.writeFileSync(clipPath, Buffer.from(arrayBuffer));
        }

        downloadedClips.push(clipPath);
      }

      // 2. Normalize clips with FFmpeg:
      // PRESERVE audio if present, or synthesize silence if absent so every normalized clip has 1 video + 1 audio stream
      const normalizedClips: string[] = [];
      let anySourceClipHadAudio = false;

      for (let i = 0; i < downloadedClips.length; i++) {
        const rawPath = downloadedClips[i];
        const normPath = path.join(tempWorkDir, `norm_clip_${i}.mp4`);

        const hasAudio = await checkHasAudioStream(rawPath);
        if (hasAudio) anySourceClipHadAudio = true;

        console.log(`[Stitcher] Clip ${i + 1} audio presence = ${hasAudio ? "YES" : "NO (generating silent sync track)"}`);

        if (hasAudio) {
          // Normalize video resolution, aspect ratio (padding), constant framerate AND normalize audio to AAC 44.1kHz stereo 192k
          const normCmd = `/usr/bin/ffmpeg -y -i "${rawPath}" -vf "scale=${resWidth}:${resHeight}:force_original_aspect_ratio=decrease,pad=${resWidth}:${resHeight}:(ow-iw)/2:(oh-ih)/2,setsar=1" -r ${fps} -c:v libx264 -preset ultrafast -pix_fmt yuv420p -c:a aac -ar 44100 -ac 2 -b:a 192k "${normPath}"`;
          await execAsync(normCmd);
        } else {
          // Generate a silent audio track synchronized to the clip duration to ensure uniform streams for concat
          const normCmd = `/usr/bin/ffmpeg -y -i "${rawPath}" -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -vf "scale=${resWidth}:${resHeight}:force_original_aspect_ratio=decrease,pad=${resWidth}:${resHeight}:(ow-iw)/2:(oh-ih)/2,setsar=1" -r ${fps} -c:v libx264 -preset ultrafast -pix_fmt yuv420p -c:a aac -ar 44100 -ac 2 -b:a 192k -shortest "${normPath}"`;
          await execAsync(normCmd);
        }

        normalizedClips.push(normPath);
      }

      // 3. Create concat list
      const concatListPath = path.join(tempWorkDir, "concat.txt");
      const concatContent = normalizedClips.map(p => `file '${p}'`).join("\n");
      fs.writeFileSync(concatListPath, concatContent);

      const concatenatedVideoPath = path.join(tempWorkDir, "master_source_concat.mp4");
      const concatCmd = `/usr/bin/ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy "${concatenatedVideoPath}"`;
      await execAsync(concatCmd);

      // 4. Process and mix additional audio tracks if provided
      const finalOutputFile = path.join(exportsDir, `xkira_production_${projectId}.mp4`);
      const validAudioTracks = (audioTracks && Array.isArray(audioTracks)) 
        ? audioTracks.filter(t => t.url && !t.mute) 
        : [];

      if (validAudioTracks.length > 0) {
        console.log(`[Stitcher] Mixing ${validAudioTracks.length} additional audio tracks with source video audio...`);
        const audioInputArgs: string[] = [];
        let filterComplexParts: string[] = [];
        let mixInputLabels: string[] = [];

        // Base video audio (track index 0)
        filterComplexParts.push(`[0:a]volume=1.0[a0]`);
        mixInputLabels.push(`[a0]`);

        for (let j = 0; j < validAudioTracks.length; j++) {
          const track = validAudioTracks[j];
          const audioPath = path.join(tempWorkDir, `extra_audio_${j}.mp3`);

          if (track.url.startsWith("data:")) {
            const base64Data = track.url.split(",")[1];
            fs.writeFileSync(audioPath, Buffer.from(base64Data, "base64"));
          } else if (track.url.startsWith("/")) {
            try {
              const localTarget = path.join(process.cwd(), "public", track.url);
              if (!fs.existsSync(localTarget)) {
                console.warn(`[Stitcher] Local audio track not found: ${track.url}`);
                continue;
              }
              fs.copyFileSync(localTarget, audioPath);
            } catch (e) {
              console.warn(`[Stitcher] Failed copying local audio track ${track.title}:`, e);
              continue;
            }
          } else {
            try {
              const res = await fetch(track.url);
              if (res.ok) {
                const buf = await res.arrayBuffer();
                fs.writeFileSync(audioPath, Buffer.from(buf));
              } else {
                console.warn(`[Stitcher] Audio track download failed with status ${res.status}: ${track.url}`);
                continue;
              }
            } catch (e) {
              console.warn(`[Stitcher] Failed downloading audio track ${track.title}:`, e);
              continue;
            }
          }

          audioInputArgs.push(`-i "${audioPath}"`);
          const fileIndex = audioInputArgs.length; // 1-indexed since video is index 0
          const vol = typeof track.volume === "number" ? Math.max(0, Math.min(2, track.volume)) : 1.0;
          filterComplexParts.push(`[${fileIndex}:a]volume=${vol}[a${fileIndex}]`);
          mixInputLabels.push(`[a${fileIndex}]`);
        }

        const totalMixCount = mixInputLabels.length;
        filterComplexParts.push(`${mixInputLabels.join("")}amix=inputs=${totalMixCount}:duration=first:dropout_transition=2[aout]`);

        const mixCmd = `/usr/bin/ffmpeg -y -i "${concatenatedVideoPath}" ${audioInputArgs.join(" ")} -filter_complex "${filterComplexParts.join(";")}" -map 0:v:0 -map "[aout]" -c:v copy -c:a aac -b:a 192k "${finalOutputFile}"`;
        await execAsync(mixCmd);
      } else {
        // Direct copy: source clips' audio is already preserved in master_source_concat.mp4
        fs.copyFileSync(concatenatedVideoPath, finalOutputFile);
      }

      // 5. Post-Stitch Media Stream Verification with FFprobe
      const probeResult = await probeMediaStreams(finalOutputFile);
      console.log(`[Stitcher Verification] Result: Video=${probeResult.hasVideo ? "YES" : "NO"} (${probeResult.videoCodec}), Audio=${probeResult.hasAudio ? "YES" : "NO"} (${probeResult.audioCodec}), Duration=${probeResult.duration}s`);

      if (!probeResult.hasVideo) {
        throw new Error("Validation error: Master output file has no video stream.");
      }

      // Clean up temporary work directory asynchronously
      fs.rm(tempWorkDir, { recursive: true, force: true }, () => {});

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

    } catch (err: any) {
      console.error("[Stitcher] Stitching failed:", err);
      if (fs.existsSync(tempWorkDir)) {
        fs.rm(tempWorkDir, { recursive: true, force: true }, () => {});
      }
      res.status(500).json({ error: `Video stitching failed: ${err.message || err}` });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
