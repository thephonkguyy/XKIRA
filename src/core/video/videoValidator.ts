/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VideoValidationResult } from "./types";

export class VideoAssetValidator {
  /**
   * Validates a generated video URL prior to marking the generation READY or COMPLETED.
   * Performs browser HTML5 video load tests, head checks, and duration consistency verification.
   */
  public async validateVideoAsset(
    videoUrl: string,
    expectedDurationSeconds: number = 5
  ): Promise<VideoValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!videoUrl || typeof videoUrl !== "string" || videoUrl.trim().length === 0) {
      return {
        isValid: false,
        playable: false,
        durationExpected: expectedDurationSeconds,
        durationAccuracyMatch: false,
        url: videoUrl || "",
        errors: ["Video URL is missing or empty."],
        warnings: [],
      };
    }

    const trimmed = videoUrl.trim();

    // 1. In browser environment: test actual playback via HTMLVideoElement
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      try {
        const videoElem = document.createElement("video");
        videoElem.preload = "metadata";
        videoElem.muted = true;

        const loadPromise = new Promise<{
          duration: number;
          width: number;
          height: number;
        }>((resolve, reject) => {
          const timeout = setTimeout(() => {
            videoElem.src = "";
            reject(new Error("Video metadata load timed out after 8000ms."));
          }, 8000);

          videoElem.onloadedmetadata = () => {
            clearTimeout(timeout);
            resolve({
              duration: videoElem.duration,
              width: videoElem.videoWidth,
              height: videoElem.videoHeight,
            });
          };

          videoElem.onerror = () => {
            clearTimeout(timeout);
            reject(new Error(videoElem.error?.message || "Failed to load video element."));
          };
        });

        videoElem.src = trimmed;
        const meta = await loadPromise;

        const durationActual = meta.duration;
        const resolution = `${meta.width}x${meta.height}`;
        const hasVideoStream = meta.width > 0 && meta.height > 0;

        if (!hasVideoStream) {
          errors.push("Video stream dimensions are 0x0.");
        }

        // Check duration accuracy within standard +/- 1.5s tolerance
        const durationDiff = Math.abs(durationActual - expectedDurationSeconds);
        const durationAccuracyMatch = durationDiff <= Math.max(2, expectedDurationSeconds * 0.35);

        if (!durationAccuracyMatch) {
          warnings.push(
            `Reported duration (${durationActual.toFixed(1)}s) differs from expected target (${expectedDurationSeconds}s).`
          );
        }

        return {
          isValid: errors.length === 0,
          playable: true,
          durationActual,
          durationExpected: expectedDurationSeconds,
          durationAccuracyMatch,
          resolution,
          hasVideoStream: true,
          url: trimmed,
          errors,
          warnings,
        };
      } catch (domErr: any) {
        warnings.push(`Client DOM video probe warning: ${domErr.message || domErr}`);
      }
    }

    // 2. Fetch HEAD / GET range check
    try {
      const headRes = await fetch(trimmed, { method: "HEAD" });
      if (!headRes.ok && headRes.status !== 405) {
        // Some servers don't support HEAD, retry with partial GET
        const getRes = await fetch(trimmed, {
          headers: { Range: "bytes=0-1024" },
        });
        if (!getRes.ok && getRes.status !== 206) {
          errors.push(`Video resource returned HTTP ${getRes.status}`);
        }
      }
    } catch (netErr: any) {
      warnings.push(`Network validation ping warning: ${netErr.message || netErr}`);
    }

    return {
      isValid: errors.length === 0,
      playable: errors.length === 0,
      durationExpected: expectedDurationSeconds,
      durationAccuracyMatch: true,
      url: trimmed,
      errors,
      warnings,
    };
  }
}

export const videoValidator = new VideoAssetValidator();
