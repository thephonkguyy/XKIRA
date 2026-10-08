/**
 * Universal XKIRA Share Service
 * Provides platform-native Web Share API with seamless clipboard fallback.
 */

export interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
  file?: File | Blob;
  filename?: string;
}

export interface ShareResult {
  shared: boolean;
  copied: boolean;
  cancelled?: boolean;
  message: string;
}

export async function shareMedia(options: ShareOptions): Promise<ShareResult> {
  const { title = "XKIRA Creative Media", text = "Created with XKIRA AI workstation", url, file, filename } = options;

  // 1. Try Native Web Share with file if provided
  if (navigator.share) {
    try {
      if (file && navigator.canShare) {
        let shareFile: File;
        if (file instanceof File) {
          shareFile = file;
        } else {
          const name = filename || "xkira_media";
          shareFile = new File([file], name, { type: file.type || "application/octet-stream" });
        }

        if (navigator.canShare({ files: [shareFile] })) {
          await navigator.share({
            title,
            text,
            files: [shareFile],
            url: url || window.location.href,
          });
          return { shared: true, copied: false, message: "Shared successfully!" };
        }
      }

      // If no file or canShare files is not supported, share text/url
      const shareData: ShareData = {
        title,
        text,
        url: url || window.location.href,
      };

      await navigator.share(shareData);
      return { shared: true, copied: false, message: "Shared successfully!" };
    } catch (err: any) {
      if (err.name === "AbortError") {
        // User cancelled share dialog
        return { shared: false, copied: false, cancelled: true, message: "Share cancelled." };
      }
      console.warn("[ShareService] Web Share error, falling back to clipboard:", err);
    }
  }

  // 2. Fallback: Copy URL or text to clipboard
  const contentToCopy = url || text || window.location.href;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(contentToCopy);
      return { shared: false, copied: true, message: "Link copied to clipboard!" };
    } else {
      // Fallback for older browsers / insecure contexts
      const textArea = document.createElement("textarea");
      textArea.value = contentToCopy;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      return { shared: false, copied: true, message: "Link copied to clipboard!" };
    }
  } catch (clipErr) {
    console.error("[ShareService] Clipboard copy failed:", clipErr);
    return { shared: false, copied: false, message: "Unable to share or access clipboard." };
  }
}

/**
 * Copies an image blob directly to the system clipboard (PNG)
 */
export async function copyImageToClipboard(imageUrl: string): Promise<{ ok: boolean; message: string }> {
  try {
    let blob: Blob;

    if (imageUrl.startsWith("data:")) {
      const res = await fetch(imageUrl);
      blob = await res.blob();
    } else if (imageUrl.startsWith("blob:")) {
      const res = await fetch(imageUrl);
      blob = await res.blob();
    } else {
      // Fetch via download proxy to avoid CORS
      const proxyUrl = `/api/download?url=${encodeURIComponent(imageUrl)}&filename=image.png`;
      const res = await fetch(proxyUrl);
      blob = await res.blob();
    }

    // Ensure blob is image/png as required by navigator.clipboard.write
    if (blob.type !== "image/png") {
      // Convert to png using canvas
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = URL.createObjectURL(blob);
      });

      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not create canvas context");
      ctx.drawImage(img, 0, 0);

      blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error("Canvas toBlob failed"));
        }, "image/png");
      });
    }

    if (navigator.clipboard && window.ClipboardItem) {
      const item = new ClipboardItem({ "image/png": blob });
      await navigator.clipboard.write([item]);
      return { ok: true, message: "Image copied to clipboard!" };
    } else {
      // If image copy not supported, copy URL as fallback
      await navigator.clipboard.writeText(imageUrl);
      return { ok: true, message: "Image link copied to clipboard!" };
    }
  } catch (err: any) {
    console.warn("[CopyImage] Clipboard error, falling back to copying link:", err);
    try {
      await navigator.clipboard.writeText(imageUrl);
      return { ok: true, message: "Image link copied to clipboard!" };
    } catch (e) {
      return { ok: false, message: "Unable to copy image to clipboard." };
    }
  }
}
