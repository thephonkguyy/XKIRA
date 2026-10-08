const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetRegex = /const tempVideoPath = path\.join\(tempWorkDir, "source_video\.mp4"\);\s+const vidRes = await fetch\(trimmed, \{\s+headers: \{\s+"User-Agent": "Mozilla\/5\.0 \([^)]+\) AppleWebKit\/537\.36 \(KHTML, like Gecko\) Chrome\/120\.0\.0\.0 Safari\/537\.36"\s+\}\s+\}\);\s+if \(!vidRes\.ok\) \{\s+throw new Error\(`Failed to download source video for continuity frame \(HTTP \${vidRes\.status}\)`\);\s+\}\s+const vidBuffer = await vidRes\.arrayBuffer\(\);\s+fs\.writeFileSync\(tempVideoPath, Buffer\.from\(vidBuffer\)\);/g;

const replacement = `const tempVideoPath = path.join(tempWorkDir, "source_video.mp4");
        
        if (trimmed.startsWith("/")) {
          const localTarget = path.join(process.cwd(), "public", trimmed);
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

if (code.match(targetRegex)) {
    console.log("Found video target");
    code = code.replace(targetRegex, replacement);
} else {
    console.log("Could not find video target");
}

fs.writeFileSync('server.ts', code);
