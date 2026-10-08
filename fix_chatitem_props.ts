import fs from "fs";
const file = "src/components/chat/ChatMessageItem.tsx";
let content = fs.readFileSync(file, "utf8");

content = content.replace(
  '  onRegenerate\n}: ChatMessageItemProps) => {',
  '  onRegenerate,\n  onConfirmTool,\n  onCancelTool\n}: ChatMessageItemProps) => {'
);

fs.writeFileSync(file, content);
