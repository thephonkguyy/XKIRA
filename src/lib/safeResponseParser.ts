/**
 * Shared Safe Response Parser for XKIRA
 * Safely parses API responses, inspects Content-Type, detects HTML error pages (e.g. 502, Cloudflare),
 * extracts requestId, and prevents "Unexpected token <" JSON parsing crashes.
 */

export interface NormalizedAIResult<T = any> {
  success: boolean;
  status: number;
  data?: T;
  error?: string;
  requestId?: string;
  isHtml?: boolean;
  contentType?: string;
}

export interface InternalGenerationResult {
  success: boolean;
  type: 'image' | 'video' | 'chat' | 'prompt';
  model: string;
  outputUrl?: string;
  requestId?: string;
  createdAt: number;
  error?: string;
  rawData?: any;
}

/**
 * Safely parses a fetch Response object. Never throws JSON parsing errors on HTML or invalid bodies.
 */
export async function safeParseApiResponse<T = any>(
  response: Response,
  fallbackErrMsg = "AI service returned an invalid response."
): Promise<NormalizedAIResult<T>> {
  const status = response.status;
  const contentType = response.headers.get("content-type") || "";
  const requestId = response.headers.get("x-request-id") || response.headers.get("request-id") || undefined;

  let text = "";
  try {
    text = await response.text();
  } catch (readErr: any) {
    return {
      success: false,
      status,
      error: `Failed to read server response: ${readErr.message || "Unknown error"}`,
      requestId,
      contentType,
    };
  }

  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  // Detect HTML/non-JSON error pages
  if (
    lower.startsWith("<!doctype") ||
    lower.startsWith("<html") ||
    lower.includes("<body") ||
    lower.includes("</html>") ||
    lower.includes("<head>") ||
    lower.includes("cloudflare")
  ) {
    let msg = fallbackErrMsg;
    if (status === 502) msg = "AI service error 502: Bad Gateway / Upstream Service Unavailable. Please try again.";
    else if (status === 503) msg = "AI service error 503: Service Temporarily Unavailable. Please try again.";
    else if (status === 504) msg = "AI service error 504: Gateway Timeout. Please try again.";
    else if (status === 429) msg = "AI service rate limit reached. Please wait a moment before retrying.";
    else if (status === 401) msg = "AI service authentication error. AGNES_API_KEY is missing or invalid.";
    else if (status === 404) msg = `AI service endpoint not found (HTTP 404).`;
    else if (status >= 400) msg = `AI service returned HTTP ${status} error.`;

    if (requestId) {
      msg += ` Request ID: ${requestId}`;
    }

    return {
      success: false,
      status,
      error: msg,
      requestId,
      isHtml: true,
      contentType,
    };
  }

  // Attempt JSON parsing safely
  try {
    const parsed = JSON.parse(trimmed);
    
    // Check if body is an error payload
    if (parsed.error || parsed.message) {
      let errStr = "";
      if (typeof parsed.error === "string") errStr = parsed.error;
      else if (parsed.error && typeof parsed.error.message === "string") errStr = parsed.error.message;
      else if (typeof parsed.message === "string") errStr = parsed.message;

      if (!response.ok || errStr) {
        if (requestId && errStr && !errStr.includes(requestId)) {
          errStr += ` (Request ID: ${requestId})`;
        }
        return {
          success: false,
          status,
          error: errStr || fallbackErrMsg,
          data: parsed,
          requestId,
          contentType,
        };
      }
    }

    if (!response.ok) {
      return {
        success: false,
        status,
        error: `AI service returned HTTP ${status}. ${requestId ? `Request ID: ${requestId}` : ""}`.trim(),
        data: parsed,
        requestId,
        contentType,
      };
    }

    return {
      success: true,
      status,
      data: parsed,
      requestId,
      contentType,
    };
  } catch {
    // If not HTML and not valid JSON
    let err = trimmed.length > 0 ? trimmed.substring(0, 200) : fallbackErrMsg;
    if (requestId) err += ` (Request ID: ${requestId})`;
    return {
      success: false,
      status,
      error: err,
      requestId,
      contentType,
    };
  }
}

/**
 * Extracts and validates an image URL from any provider response structure.
 */
export function extractValidImageUrl(data: any): string | null {
  if (!data) return null;
  
  if (data.data && Array.isArray(data.data) && data.data.length > 0) {
    const item = data.data[0];
    if (typeof item === 'string' && item.startsWith('http')) return item;
    if (item?.url && typeof item.url === 'string') return item.url;
    if (item?.b64_json && typeof item.b64_json === 'string') {
      return item.b64_json.startsWith('data:') 
        ? item.b64_json 
        : `data:image/png;base64,${item.b64_json}`;
    }
  }

  if (typeof data.url === 'string' && data.url.startsWith('http')) return data.url;
  if (data.result?.url && typeof data.result.url === 'string') return data.result.url;
  if (Array.isArray(data.images) && data.images.length > 0 && typeof data.images[0] === 'string') return data.images[0];
  if (typeof data.outputUrl === 'string' && data.outputUrl.startsWith('http')) return data.outputUrl;

  return null;
}
