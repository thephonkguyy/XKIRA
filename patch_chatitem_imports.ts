import fs from "fs";
const file = "src/components/chat/ChatMessageItem.tsx";
let content = fs.readFileSync(file, "utf8");

content = content.replace(
  'import { Copy, Check, Edit3, RotateCw, Share2 } from "lucide-react";',
  'import { Copy, Check, Edit3, RotateCw, Share2, Sparkles, AlertCircle } from "lucide-react";'
);

fs.writeFileSync(file, content);
