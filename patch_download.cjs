const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `      if (rawUrl.startsWith("/exports/")) {
        const localPath = path.join(exportsDir, path.basename(rawUrl));
        if (fs.existsSync(localPath)) {
          return res.download(localPath, filename);
        }
      }`;

const replacement = `      if (rawUrl.startsWith("/exports/")) {
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
      }`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('server.ts', code);
    console.log("Patched download API");
} else {
    console.log("Could not patch download API");
}
