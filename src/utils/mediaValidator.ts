/**
 * XKIRA Media Validator & Continuity Asset Helper
 * Validates, downloads, and converts reference images and video keyframes
 * via the server-side preparation pipeline.
 */

const memoryCache = new Map<string, { dataUri: string; imageUrl: string; timestamp: number }>();

export interface PreparedReferenceAsset {
  ok: boolean;
  dataUri?: string;
  imageUrl?: string;
  format?: string;
  source?: string;
  byteSize?: number;
  error?: string;
  errorCode?: string;
}

export async function prepareReferenceAsset(
  sourceUrl: string, 
  sceneNumber?: number
): Promise<PreparedReferenceAsset> {
  if (!sourceUrl || typeof sourceUrl !== "string" || !sourceUrl.trim()) {
    return {
      ok: false,
      errorCode: "INVALID_IMAGE_FORMAT",
      error: "No source URL provided for reference asset."
    };
  }

  const trimmed = sourceUrl.trim();

  // Check in-memory cache first (valid for 1 hour)
  if (memoryCache.has(trimmed)) {
    const cached = memoryCache.get(trimmed)!;
    if (Date.now() - cached.timestamp < 3600000) {
      return {
        ok: true,
        dataUri: cached.dataUri,
        imageUrl: cached.imageUrl,
        source: "memory_cache"
      };
    }
  }

  try {
    const res = await fetch("/api/media/prepare-reference-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceUrl: trimmed,
        sceneNumber
      })
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      return {
        ok: false,
        errorCode: data.errorCode || "IMAGE_DOWNLOAD_FAILED",
        error: data.error || `Failed to prepare reference asset (HTTP ${res.status}).`
      };
    }

    if (data.dataUri && data.imageUrl) {
      memoryCache.set(trimmed, {
        dataUri: data.dataUri,
        imageUrl: data.imageUrl,
        timestamp: Date.now()
      });
    }

    return {
      ok: true,
      dataUri: data.dataUri,
      imageUrl: data.imageUrl,
      format: data.format,
      source: data.source,
      byteSize: data.byteSize
    };
  } catch (err: any) {
    return {
      ok: false,
      errorCode: "NETWORK_TIMEOUT",
      error: `Network error while preparing reference asset: ${err.message || err}`
    };
  }
}
