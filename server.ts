import express from "express";
import cors from "cors";
import path from "path";
import multer from "multer";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { createServer as createViteServer } from "vite";

const execAsync = promisify(exec);

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API routes go here FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
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

  // Ensure AGNES_API_KEY is available or fail gracefully
  let rawKey = process.env.AGNES_API_KEY || process.env.AGNES || process.env.AGNES_II || "";
  rawKey = rawKey.replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '').replace(/^'|'$/g, '').trim();
  const AGNES_API_KEY = rawKey;
  
  const AGNES_KEY_PRESENT = !!AGNES_API_KEY;
  const AGNES_KEY_LENGTH = AGNES_API_KEY.length;

  // Safe diagnostic logger (NEVER logs keys, auth headers, secrets, or user prompts)
  function logSafeDiagnostic(route: string, model: string, status?: number, contentType?: string | null, requestId?: string | null) {
    console.log(`[Diagnostic] ROUTE=${route}`);
    console.log(`[Diagnostic] AGNES_KEY_PRESENT=${AGNES_KEY_PRESENT}`);
    console.log(`[Diagnostic] AGNES_KEY_LENGTH=${AGNES_KEY_LENGTH}`);
    console.log(`[Diagnostic] AGNES_BASE_URL=https://apihub.agnes-ai.com/v1`);
    console.log(`[Diagnostic] MODEL=${model}`);
    if (status !== undefined) console.log(`[Diagnostic] HTTP_STATUS=${status}`);
    if (contentType) console.log(`[Diagnostic] CONTENT_TYPE=${contentType}`);
    if (requestId) console.log(`[Diagnostic] REQUEST_ID=${requestId}`);
  }

  // Helper to parse and sanitize error responses from Agnes AI upstream
  function parseAndSanitizeResponseText(status: number, text: string, requestId?: string | null): { ok: boolean; data?: any; error?: string; isHtml?: boolean } {
    if (!text || typeof text !== 'string') {
      return { 
        ok: false, 
        error: `AI service returned an empty response (HTTP ${status}). ${requestId ? `Request ID: ${requestId}` : ''}`.trim() 
      };
    }
    const trimmed = text.trim();
    const lower = trimmed.toLowerCase();

    // Detect HTML/non-JSON error responses (e.g., 502 Bad Gateway, Cloudflare, etc.)
    if (
      lower.startsWith('<!doctype') || 
      lower.startsWith('<html') || 
      lower.includes('<body') || 
      lower.includes('cloudflare') || 
      lower.includes('</html>') ||
      lower.includes('<head>')
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
        if (typeof parsed.error === 'string') errStr = parsed.error;
        else if (parsed.error && typeof parsed.error.message === 'string') errStr = parsed.error.message;
        else if (typeof parsed.message === 'string') errStr = parsed.message;

        if (status >= 400 || errStr) {
          if (requestId && errStr && !errStr.includes(requestId)) {
            errStr += ` (Request ID: ${requestId})`;
          }
          return { ok: false, error: errStr || `AI service returned HTTP ${status}`, data: parsed };
        }
      }
      return { ok: true, data: parsed };
    } catch (e) {
      let errStr = `AI service returned an invalid response format (HTTP ${status}).`;
      if (requestId) errStr += ` Request ID: ${requestId}`;
      return { ok: false, error: errStr };
    }
  }

  // Shared chat completion handler
  const handleChatCompletion = async (req: express.Request, res: express.Response) => {
    const route = req.path;
    const model = req.body?.model || "agnes-2.5-flash";

    try {
      if (!AGNES_KEY_PRESENT) {
        logSafeDiagnostic(route, model, 401);
        return res.status(401).json({ error: "AGNES_API_KEY is not available to the current runtime." });
      }

      const response = await fetch("https://apihub.agnes-ai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${AGNES_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: req.body.messages,
          stream: !!req.body.stream,
          ...(req.body.temperature !== undefined ? { temperature: req.body.temperature } : {}),
          ...(req.body.max_tokens !== undefined ? { max_tokens: req.body.max_tokens } : {}),
        }),
      });

      const contentType = response.headers.get('content-type');
      const requestId = response.headers.get('x-request-id') || response.headers.get('request-id');
      logSafeDiagnostic(route, model, response.status, contentType, requestId);

      if (!response.ok) {
        const errorText = await response.text();
        const parsed = parseAndSanitizeResponseText(response.status, errorText, requestId);
        console.error(`[Chat Error] status=${response.status}:`, parsed.error);
        return res.status(response.status).json({ error: parsed.error || `AI service error HTTP ${response.status}`, requestId });
      }

      // Handle streaming
      if (req.body.stream) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        if (response.body) {
           const reader = response.body.getReader();
           const decoder = new TextDecoder();
           while (true) {
             const { done, value } = await reader.read();
             if (done) break;
             res.write(decoder.decode(value));
           }
           res.end();
        } else {
           res.end();
        }
      } else {
        const text = await response.text();
        const parsed = parseAndSanitizeResponseText(response.status, text, requestId);
        if (!parsed.ok) {
          return res.status(502).json({ error: parsed.error, requestId });
        }
        res.json(parsed.data);
      }
    } catch (error: any) {
      console.error("Agnes AI Chat error:", error);
      res.status(500).json({ error: error.message || "Failed to process chat request." });
    }
  };

  app.post("/api/agnes/chat/completions", handleChatCompletion);
  app.post("/api/chat", handleChatCompletion);

  // Shared image generation handler
  const handleImageGeneration = async (req: express.Request, res: express.Response) => {
    const route = req.path;
    const model = req.body?.model || "agnes-image-2.1-flash";

    try {
      if (!AGNES_KEY_PRESENT) {
        logSafeDiagnostic(route, model, 401);
        return res.status(401).json({ error: "AGNES_API_KEY is not available to the current runtime." });
      }

      let attempts = 0;
      const maxAttempts = 2;

      while (attempts < maxAttempts) {
        attempts++;
        try {
          const response = await fetch("https://apihub.agnes-ai.com/v1/images/generations", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${AGNES_API_KEY}`,
            },
            body: JSON.stringify({
              model,
              prompt: req.body.prompt,
              n: req.body.n || 1,
              size: req.body.size || "1024x1024",
              ...(req.body.response_format ? { response_format: req.body.response_format } : {})
            }),
          });

          const contentType = response.headers.get('content-type');
          const requestId = response.headers.get('x-request-id') || response.headers.get('request-id');
          logSafeDiagnostic(route, model, response.status, contentType, requestId);

          if (!response.ok) {
            const errorText = await response.text();
            const parsed = parseAndSanitizeResponseText(response.status, errorText, requestId);
            
            if ((response.status === 429 || response.status >= 500) && attempts < maxAttempts) {
              await new Promise(r => setTimeout(r, 2000 * attempts));
              continue;
            }
            return res.status(response.status).json({ error: parsed.error, requestId });
          }

          const text = await response.text();
          const parsed = parseAndSanitizeResponseText(response.status, text, requestId);
          if (!parsed.ok) {
            return res.status(502).json({ error: parsed.error, requestId });
          }
          return res.json(parsed.data);
        } catch (e: any) {
          if (attempts < maxAttempts) {
            await new Promise(r => setTimeout(r, 2000 * attempts));
            continue;
          }
          throw e;
        }
      }
    } catch (error: any) {
      console.error("Agnes AI Image error:", error);
      res.status(500).json({ error: error.message || "Failed to generate image." });
    }
  };

  app.post("/api/agnes/images/generations", handleImageGeneration);
  app.post("/api/images/generations", handleImageGeneration);

  // Shared image edits handler
  const handleImageEdit = async (req: express.Request, res: express.Response) => {
    const route = req.path;
    const model = req.body?.model || "agnes-image-2.1-flash";

    try {
      if (!AGNES_KEY_PRESENT) {
        logSafeDiagnostic(route, model, 401);
        return res.status(401).json({ error: "AGNES_API_KEY is not available to the current runtime." });
      }

      if (!req.file) {
         return res.status(400).json({ error: "Missing image file for editing." });
      }
      
      const formData = new FormData();
      const fileBlob = new Blob([req.file.buffer], { type: req.file.mimetype });
      formData.append("image", fileBlob, req.file.originalname);
      formData.append("prompt", req.body.prompt || "");
      formData.append("model", model);
      if (req.body.n) formData.append("n", req.body.n);
      if (req.body.size) formData.append("size", req.body.size);

      let attempts = 0;
      const maxAttempts = 2;

      while (attempts < maxAttempts) {
        attempts++;
        try {
          const response = await fetch("https://apihub.agnes-ai.com/v1/images/edits", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${AGNES_API_KEY}`,
            },
            body: formData as any,
          });

          const contentType = response.headers.get('content-type');
          const requestId = response.headers.get('x-request-id') || response.headers.get('request-id');
          logSafeDiagnostic(route, model, response.status, contentType, requestId);

          if (!response.ok) {
            const errorText = await response.text();
            const parsed = parseAndSanitizeResponseText(response.status, errorText, requestId);
            
            if ((response.status === 429 || response.status >= 500) && attempts < maxAttempts) {
              await new Promise(r => setTimeout(r, 2000 * attempts));
              continue;
            }
            return res.status(response.status).json({ error: parsed.error, requestId });
          }

          const text = await response.text();
          const parsed = parseAndSanitizeResponseText(response.status, text, requestId);
          if (!parsed.ok) {
            return res.status(502).json({ error: parsed.error, requestId });
          }
          return res.json(parsed.data);
        } catch (e: any) {
          if (attempts < maxAttempts) {
            await new Promise(r => setTimeout(r, 2000 * attempts));
            continue;
          }
          throw e;
        }
      }
    } catch (error: any) {
      console.error("Agnes AI Image Edit error:", error);
      res.status(500).json({ error: error.message || "Failed to edit image." });
    }
  };

  app.post("/api/agnes/images/edits", upload.single("image"), handleImageEdit);
  app.post("/api/images/edits", upload.single("image"), handleImageEdit);

  // Serial Video Request Queue to ensure proper pacing with Agnes API
  let lastVideoDispatchedAt = 0;
  let videoQueuePromise = Promise.resolve();
  const MIN_VIDEO_INTERVAL_MS = 10000; // 10s minimal pacing between dispatches

  async function scheduleAgnesVideoRequest(payload: any, route: string): Promise<any> {
    return new Promise((resolve, reject) => {
      videoQueuePromise = videoQueuePromise.then(async () => {
        const now = Date.now();
        const elapsed = now - lastVideoDispatchedAt;
        if (lastVideoDispatchedAt > 0 && elapsed < MIN_VIDEO_INTERVAL_MS) {
          const waitTime = MIN_VIDEO_INTERVAL_MS - elapsed;
          console.log(`[Agnes Rate Limiter] Pacing video request: waiting ${Math.round(waitTime / 1000)}s...`);
          await new Promise(r => setTimeout(r, waitTime));
        }

        let attempts = 0;
        const maxAttempts = 5;
        const model = payload.model || "agnes-video-v2.0";

        while (attempts < maxAttempts) {
          attempts++;
          try {
            console.log(`[Agnes Video] Dispatching attempt ${attempts}/${maxAttempts}...`);

            const response = await fetch("https://apihub.agnes-ai.com/v1/videos", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${AGNES_API_KEY}`,
              },
              body: JSON.stringify(payload),
            });

            lastVideoDispatchedAt = Date.now();
            const contentType = response.headers.get('content-type');
            const requestId = response.headers.get('x-request-id') || response.headers.get('request-id');
            logSafeDiagnostic(route, model, response.status, contentType, requestId);

            if (!response.ok) {
              const errorText = await response.text();
              const parsed = parseAndSanitizeResponseText(response.status, errorText, requestId);
              console.error(`[Diagnostic] Video Error Response:`, parsed.error);

              const lower = (parsed.error || "").toLowerCase();
              const isQueueFull = lower.includes("queue is full") || lower.includes("rate limit") || response.status === 429;
              
              if (isQueueFull && attempts < maxAttempts) {
                const backoffMs = (attempts === 1 ? 10000 : attempts === 2 ? 25000 : attempts === 3 ? 45000 : 60000) + (Math.random() * 5000);
                console.log(`[Agnes Video Queue Full] Retrying with ${Math.round(backoffMs/1000)}s backoff...`);
                await new Promise(r => setTimeout(r, backoffMs));
                continue;
              }

              reject({ 
                status: (isQueueFull || response.status === 200) ? 429 : response.status, 
                error: parsed.error,
                isQueueFull,
                retryAfter: 45
              });
              return;
            }

            const text = await response.text();
            const parsed = parseAndSanitizeResponseText(response.status, text, requestId);
            
            if (!parsed.ok) {
              reject({ status: 502, error: parsed.error });
              return;
            }

            const data = parsed.data;
            if (data.error || data.message) {
              const bodyMsg = String(data.error?.message || data.error || data.message || "");
              if (bodyMsg.toLowerCase().includes("queue is full") || bodyMsg.toLowerCase().includes("rate limit")) {
                if (attempts < maxAttempts) {
                  const backoffMs = (attempts === 1 ? 10000 : attempts === 2 ? 25000 : 45000) + (Math.random() * 5000);
                  console.log(`[Agnes Video Body Queue Full] Retrying with ${Math.round(backoffMs/1000)}s backoff...`);
                  await new Promise(r => setTimeout(r, backoffMs));
                  continue;
                }
                reject({
                  status: 429,
                  error: bodyMsg || "video queue is full, please retry later",
                  isQueueFull: true,
                  retryAfter: 45
                });
                return;
              }
            }
            resolve(data);
            return;
          } catch (netErr: any) {
            console.error(`[Agnes Video Network Error] attempt ${attempts}:`, netErr);
            if (attempts < maxAttempts) {
              const backoffMs = 5000 * attempts;
              await new Promise(r => setTimeout(r, backoffMs));
              continue;
            }
            reject({ status: 500, error: netErr.message || "Failed to communicate with Agnes Video API" });
            return;
          }
        }
      }).catch(err => {
        console.error("[Agnes Video Queue Error]:", err);
      });
    });
  }

  // Proxy for video generations
  const handleVideoGeneration = async (req: express.Request, res: express.Response) => {
    try {
      if (!AGNES_KEY_PRESENT) {
        logSafeDiagnostic(req.path, req.body?.model || "agnes-video-v2.0", 401);
        return res.status(401).json({ error: "AGNES_API_KEY is not available to the current runtime." });
      }

      const data = await scheduleAgnesVideoRequest(req.body, req.path);
      res.json(data);
    } catch (error: any) {
      console.error("Agnes AI Video error:", error);
      const status = error.status || 500;
      res.status(status).json({ error: error.error || error.message || "Failed to generate video." });
    }
  };

  app.post("/api/agnes/videos/generations", handleVideoGeneration);
  app.post("/api/videos/generations", handleVideoGeneration);

  // Proxy for fetching available models
  const handleGetModels = async (req: express.Request, res: express.Response) => {
    try {
      if (!AGNES_KEY_PRESENT) {
        logSafeDiagnostic(req.path, "models", 401);
        return res.status(401).json({ error: "AGNES_API_KEY is not available to the current runtime." });
      }

      const response = await fetch("https://apihub.agnes-ai.com/v1/models", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${AGNES_API_KEY}`,
        }
      });

      const contentType = response.headers.get('content-type');
      const requestId = response.headers.get('x-request-id') || response.headers.get('request-id');
      logSafeDiagnostic(req.path, "models", response.status, contentType, requestId);

      if (!response.ok) {
        const errorText = await response.text();
        const parsed = parseAndSanitizeResponseText(response.status, errorText, requestId);
        return res.status(response.status).json({ error: parsed.error });
      }

      const text = await response.text();
      const parsed = parseAndSanitizeResponseText(response.status, text, requestId);
      if (!parsed.ok) {
        return res.status(502).json({ error: parsed.error });
      }
      res.json(parsed.data);
    } catch (error: any) {
      console.error("Agnes AI Models error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch models." });
    }
  };

  app.get("/api/agnes/models", handleGetModels);
  app.get("/api/models", handleGetModels);

  // Video status polling proxy
  const handleVideoStatus = async (req: express.Request, res: express.Response) => {
    try {
      if (!AGNES_KEY_PRESENT) {
        return res.status(401).json({ error: "AGNES_API_KEY is not available to the current runtime." });
      }

      const videoId = req.params.id;
      const modelName = (req.query.model_name || req.query.model || "agnes-video-v2.0") as string;

      // Primary endpoint per Agnes API specification
      const agnesApiUrl = `https://apihub.agnes-ai.com/agnesapi?video_id=${encodeURIComponent(videoId)}&model_name=${encodeURIComponent(modelName)}`;
      
      let response = await fetch(agnesApiUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${AGNES_API_KEY}`,
        }
      });

      // Fallback endpoint if primary returns error or not ok
      if (!response.ok) {
        response = await fetch(`https://apihub.agnes-ai.com/v1/videos/${encodeURIComponent(videoId)}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${AGNES_API_KEY}`,
          }
        });
      }

      const contentType = response.headers.get('content-type');
      const requestId = response.headers.get('x-request-id') || response.headers.get('request-id');

      if (!response.ok) {
        const errorText = await response.text();
        const parsed = parseAndSanitizeResponseText(response.status, errorText, requestId);
        return res.status(response.status).json({ error: parsed.error });
      }

      const text = await response.text();
      const parsed = parseAndSanitizeResponseText(response.status, text, requestId);
      if (!parsed.ok) {
        return res.status(502).json({ error: parsed.error });
      }
      res.json(parsed.data);
    } catch (error: any) {
      console.error("Agnes AI Video Status error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch video status." });
    }
  };

  app.get("/api/agnes/videos/generations/:id", handleVideoStatus);
  app.get("/api/videos/generations/:id", handleVideoStatus);

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
