import fs from "fs";
const file = "src/store/chatStore.ts";
let content = fs.readFileSync(file, "utf8");

content = content.replace(
  "status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'AWAITING_CONFIRMATION'",
  "status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'AWAITING_CONFIRMATION' | 'CANCELLED'"
);

fs.writeFileSync(file, content);
