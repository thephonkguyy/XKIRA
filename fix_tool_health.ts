import fs from "fs";
const file = "src/components/common/ToolHealthDiagnostics.tsx";
let content = fs.readFileSync(file, "utf8");

content = content.replace(
  "latency = \\`\\${((latestSuccess.completedAt - latestSuccess.startedAt) / 1000).toFixed(1)}s\\`;",
  "latency = `${((latestSuccess.completedAt - latestSuccess.startedAt) / 1000).toFixed(1)}s`;"
);

fs.writeFileSync(file, content);
