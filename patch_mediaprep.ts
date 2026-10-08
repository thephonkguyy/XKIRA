import fs from "fs";
const file = "server.ts";
let content = fs.readFileSync(file, "utf8");

const oldCode = `      // Case 2: Video File URL (Extract keyframe for Story continuity)
      const isVideoUrl = 
         trimmed.toLowerCase().includes(".mp4") || 
         trimmed.toLowerCase().includes(".webm") || 
         trimmed.toLowerCase().includes(".mov") ||
        trimmed.toLowerCase().includes("video");

      if (isVideoUrl) {
        console.log(\`[MediaPrep] Detected video input for continuity reference: \${trimmed}\`);
        const tempVideoPath = path.join(tempWorkDir, "source_video.mp4");

        const vidRes = await fetch(trimmed, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        });

        if (!vidRes.ok) {
          throw new Error(\`Failed to download source video for continuity frame (HTTP \${vidRes.status})\`);
        }
        const vidBuffer = await vidRes.arrayBuffer();
        fs.writeFileSync(tempVideoPath, Buffer.from(vidBuffer));`;

const newCode = `      // Case 2: Video File URL (Extract keyframe for Story continuity)
      const isVideoUrl = 
         trimmed.toLowerCase().includes(".mp4") || 
         trimmed.toLowerCase().includes(".webm") || 
         trimmed.toLowerCase().includes(".mov") ||
        trimmed.toLowerCase().includes("video");

      if (isVideoUrl) {
        console.log(\`[MediaPrep] Detected video input for continuity reference: \${trimmed}\`);
        const tempVideoPath = path.join(tempWorkDir, "source_video.mp4");

        if (trimmed.startsWith("/")) {
            // Local file (like /exports/xkira_production_123.mp4)
            let localTarget = path.join(process.cwd(), "public", trimmed);
            if (!fs.existsSync(localTarget)) {
                throw new Error(\`Local video file not found: \${trimmed}\`);
            }
            fs.copyFileSync(localTarget, tempVideoPath);
        } else {
            const vidRes = await fetch(trimmed, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
              }
            });

            if (!vidRes.ok) {
              throw new Error(\`Failed to download source video for continuity frame (HTTP \${vidRes.status})\`);
            }
            const vidBuffer = await vidRes.arrayBuffer();
            fs.writeFileSync(tempVideoPath, Buffer.from(vidBuffer));
        }`;

content = content.replace(oldCode, newCode);

const oldRemoteImage = `      // Case 3: Remote Image URL
      console.log(\`[MediaPrep] Validating remote image URL: \${trimmed}\`);
      const imgRes = await fetch(trimmed, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });`;

const newRemoteImage = `      // Case 3: Remote/Local Image URL
      console.log(\`[MediaPrep] Validating image URL: \${trimmed}\`);
      let imgBuffer: Buffer;
      if (trimmed.startsWith("/")) {
          let localTarget = path.join(process.cwd(), "public", trimmed);
          if (!fs.existsSync(localTarget)) {
              return res.status(400).json({
                ok: false,
                errorCode: "IMAGE_DOWNLOAD_FAILED",
                error: \`Local image file not found: \${trimmed}\`
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
              error: \`Could not fetch reference image from remote URL (HTTP \${imgRes.status}). The URL may have expired or is blocked.\`
            });
          }
          imgBuffer = Buffer.from(await imgRes.arrayBuffer());
      }`;

content = content.replace(oldRemoteImage + '\n      if (!imgRes.ok) {\n        return res.status(400).json({\n          ok: false,\n          errorCode: "IMAGE_DOWNLOAD_FAILED",\n          error: `Could not fetch reference image from remote URL (HTTP ${imgRes.status}). The URL may have expired or is blocked.`\n        });\n      }\n      const imgBuffer = Buffer.from(await imgRes.arrayBuffer());', newRemoteImage);

fs.writeFileSync(file, content);
