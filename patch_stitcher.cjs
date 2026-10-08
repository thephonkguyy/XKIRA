const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Patch 1: Clips
const clipsTarget = `        if (clipUrl.startsWith("data:")) {
          const base64Data = clipUrl.split(",")[1];
          fs.writeFileSync(clipPath, Buffer.from(base64Data, "base64"));
        } else {
          const response = await fetch(clipUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
          });
          if (!response.ok) {
            throw new Error(\`Failed to download clip \${i + 1} from \${clipUrl} (HTTP \${response.status})\`);
          }
          const arrayBuffer = await response.arrayBuffer();
          fs.writeFileSync(clipPath, Buffer.from(arrayBuffer));
        }`;

const clipsReplacement = `        if (clipUrl.startsWith("data:")) {
          const base64Data = clipUrl.split(",")[1];
          fs.writeFileSync(clipPath, Buffer.from(base64Data, "base64"));
        } else if (clipUrl.startsWith("/")) {
          const localTarget = path.join(process.cwd(), "public", clipUrl);
          if (!fs.existsSync(localTarget)) {
            throw new Error(\`Local clip file not found: \${clipUrl}\`);
          }
          fs.copyFileSync(localTarget, clipPath);
        } else {
          const response = await fetch(clipUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
          });
          if (!response.ok) {
            throw new Error(\`Failed to download clip \${i + 1} from \${clipUrl} (HTTP \${response.status})\`);
          }
          const arrayBuffer = await response.arrayBuffer();
          fs.writeFileSync(clipPath, Buffer.from(arrayBuffer));
        }`;

if (code.includes(clipsTarget)) {
    console.log("Found clips target");
    code = code.replace(clipsTarget, clipsReplacement);
} else {
    console.log("Could not find clips target");
}

// Patch 2: Audio
const audioTarget = `          if (track.url.startsWith("data:")) {
            const base64Data = track.url.split(",")[1];
            fs.writeFileSync(audioPath, Buffer.from(base64Data, "base64"));
          } else {
            try {
              const res = await fetch(track.url);
              if (res.ok) {
                const buf = await res.arrayBuffer();
                fs.writeFileSync(audioPath, Buffer.from(buf));
              } else {
                console.warn(\`[Stitcher] Audio track download failed with status \${res.status}: \${track.url}\`);
                continue;
              }
            } catch (e) {
              console.warn(\`[Stitcher] Failed downloading audio track \${track.title}:\`, e);
              continue;
            }
          }`;

const audioReplacement = `          if (track.url.startsWith("data:")) {
            const base64Data = track.url.split(",")[1];
            fs.writeFileSync(audioPath, Buffer.from(base64Data, "base64"));
          } else if (track.url.startsWith("/")) {
            try {
              const localTarget = path.join(process.cwd(), "public", track.url);
              if (!fs.existsSync(localTarget)) {
                console.warn(\`[Stitcher] Local audio track not found: \${track.url}\`);
                continue;
              }
              fs.copyFileSync(localTarget, audioPath);
            } catch (e) {
              console.warn(\`[Stitcher] Failed copying local audio track \${track.title}:\`, e);
              continue;
            }
          } else {
            try {
              const res = await fetch(track.url);
              if (res.ok) {
                const buf = await res.arrayBuffer();
                fs.writeFileSync(audioPath, Buffer.from(buf));
              } else {
                console.warn(\`[Stitcher] Audio track download failed with status \${res.status}: \${track.url}\`);
                continue;
              }
            } catch (e) {
              console.warn(\`[Stitcher] Failed downloading audio track \${track.title}:\`, e);
              continue;
            }
          }`;

if (code.includes(audioTarget)) {
    console.log("Found audio target");
    code = code.replace(audioTarget, audioReplacement);
} else {
    console.log("Could not find audio target");
}

fs.writeFileSync('server.ts', code);
