const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetRegex = /const imgRes = await fetch\(trimmed, \{\s+headers: \{\s+"User-Agent": "Mozilla\/5\.0 \([^)]+\) AppleWebKit\/537\.36 \(KHTML, like Gecko\) Chrome\/120\.0\.0\.0 Safari\/537\.36"\s+\}\s+\}\);\s+if \(!imgRes\.ok\) \{\s+return res\.status\(400\)\.json\(\{\s+ok: false,\s+errorCode: "IMAGE_DOWNLOAD_FAILED",\s+error: \`Could not fetch reference image from remote URL \(HTTP \${imgRes\.status}\)\. The URL may have expired or is blocked\.\`\s+\}\);\s+\}\s+const imgBuffer = Buffer\.from\(await imgRes\.arrayBuffer\(\)\);/g;

const replacement = `let imgBuffer;
      if (trimmed.startsWith("/")) {
        const localTarget = path.join(process.cwd(), "public", trimmed);
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

if (code.match(targetRegex)) {
    console.log("Found image target");
    code = code.replace(targetRegex, replacement);
} else {
    console.log("Could not find image target");
}

fs.writeFileSync('server.ts', code);
