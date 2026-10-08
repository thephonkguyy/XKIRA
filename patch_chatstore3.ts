import fs from "fs";
const file = "src/store/chatStore.ts";
let content = fs.readFileSync(file, "utf8");

content = content.replace(
  "status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'",
  "status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'AWAITING_CONFIRMATION'"
);

fs.writeFileSync(file, content);
