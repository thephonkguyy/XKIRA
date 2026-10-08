/**
 * Universal XKIRA Download Service
 * Handles cross-platform, CORS-safe, validated media downloads for Images, Videos, Audio, and Documents.
 */

// Generate timestamp string YYYY-MM-DD
export function getDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Generate time string HH-MM or HH-mm-ss
export function getTimeString(withSeconds = false): string {
  const d = new Date();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  if (withSeconds) {
    const seconds = String(d.getSeconds()).padStart(2, "0");
    return `${hours}-${minutes}-${seconds}`;
  }
  return `${hours}-${minutes}`;
}

export function generateImageFilename(extension = "png"): string {
  const cleanExt = extension.replace(/^\./, "").toLowerCase() || "png";
  return `XKIRA_Image_${getDateString()}_${getTimeString(true)}.${cleanExt}`;
}

export function generateVideoFilename(extension = "mp4"): string {
  const cleanExt = extension.replace(/^\./, "").toLowerCase() || "mp4";
  return `XKIRA_Video_${getDateString()}_${getTimeString()}.${cleanExt}`;
}

export function generateAudioFilename(extension = "mp3"): string {
  const cleanExt = extension.replace(/^\./, "").toLowerCase() || "mp3";
  return `XKIRA_Audio_${getDateString()}_${getTimeString()}.${cleanExt}`;
}

export interface DownloadResult {
  ok: boolean;
  filename: string;
  error?: string;
}

export interface DownloadOptions {
  url: string;
  suggestedFilename?: string;
  fileType?: "image" | "video" | "audio" | "file";
  extension?: string;
  prefix?: string;
  prompt?: string;
}

/**
 * Triggers a client-side browser file save using an object URL or download link
 */
function triggerBrowserDownload(blobOrUrl: Blob | string, filename: string): void {
  const link = document.createElement("a");
  link.style.display = "none";
  link.download = filename;

  let objectUrl = "";
  if (blobOrUrl instanceof Blob) {
    objectUrl = URL.createObjectURL(blobOrUrl);
    link.href = objectUrl;
  } else {
    link.href = blobOrUrl;
  }

  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    document.body.removeChild(link);
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }, 1000);
}

/**
 * Universal media download handler supporting both argument styles
 */
export async function downloadMedia(
  urlOrOptions: string | DownloadOptions,
  suggestedFilename?: string,
  mediaType: "image" | "video" | "audio" | "file" = "image"
): Promise<DownloadResult> {
  let url = "";
  let finalFilename = "";
  let finalType: "image" | "video" | "audio" | "file" = mediaType;

  if (typeof urlOrOptions === "object" && urlOrOptions !== null) {
    url = urlOrOptions.url;
    finalType = urlOrOptions.fileType || "image";
    if (urlOrOptions.suggestedFilename) {
      finalFilename = urlOrOptions.suggestedFilename;
    } else if (urlOrOptions.prefix) {
      const ext = urlOrOptions.extension || (finalType === "video" ? "mp4" : finalType === "audio" ? "mp3" : "png");
      finalFilename = `${urlOrOptions.prefix}_${getDateString()}_${getTimeString()}.${ext}`;
    }
  } else if (typeof urlOrOptions === "string") {
    url = urlOrOptions;
    finalFilename = suggestedFilename || "";
  }

  if (!url || typeof url !== "string") {
    return { ok: false, filename: "", error: "Invalid or missing media URL." };
  }

  const trimmedUrl = url.trim();

  // Determine fallback filename if still empty
  if (!finalFilename) {
    if (finalType === "video") {
      finalFilename = generateVideoFilename("mp4");
    } else if (finalType === "audio") {
      finalFilename = generateAudioFilename("mp3");
    } else {
      finalFilename = generateImageFilename("png");
    }
  }

  try {
    // 1. Data URI Handling
    if (trimmedUrl.startsWith("data:")) {
      const res = await fetch(trimmedUrl);
      const blob = await res.blob();
      triggerBrowserDownload(blob, finalFilename);
      return { ok: true, filename: finalFilename };
    }

    // 2. Blob URL Handling
    if (trimmedUrl.startsWith("blob:")) {
      triggerBrowserDownload(trimmedUrl, finalFilename);
      return { ok: true, filename: finalFilename };
    }

    // 3. Local Export URL Handling (e.g. /exports/...)
    if (trimmedUrl.startsWith("/exports/") || trimmedUrl.startsWith("/")) {
      const proxyUrl = `/api/download?url=${encodeURIComponent(trimmedUrl)}&filename=${encodeURIComponent(finalFilename)}`;
      triggerBrowserDownload(proxyUrl, finalFilename);
      return { ok: true, filename: finalFilename };
    }

    // 4. Remote HTTP/HTTPS URL Handling
    try {
      const directResponse = await fetch(trimmedUrl, { mode: "cors" });
      if (directResponse.ok) {
        const contentType = directResponse.headers.get("content-type") || "";
        if (!contentType.includes("text/html") && !contentType.includes("application/json")) {
          const blob = await directResponse.blob();
          if (blob.size > 0) {
            triggerBrowserDownload(blob, finalFilename);
            return { ok: true, filename: finalFilename };
          }
        }
      }
    } catch (corsErr) {
      console.log("[Downloader] Direct fetch CORS error, using backend download proxy:", corsErr);
    }

    // 5. Fallback via Backend Proxy for guaranteed CORS bypass and attachment headers
    const proxyUrl = `/api/download?url=${encodeURIComponent(trimmedUrl)}&filename=${encodeURIComponent(finalFilename)}`;
    triggerBrowserDownload(proxyUrl, finalFilename);
    return { ok: true, filename: finalFilename };

  } catch (err: any) {
    console.error("[Downloader] Download execution failed:", err);
    return {
      ok: false,
      filename: finalFilename,
      error: err.message || "Failed to download media file."
    };
  }
}
