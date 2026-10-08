import fs from "fs";
const file = "src/components/chat/ChatMessageItem.tsx";
let content = fs.readFileSync(file, "utf8");

content = content.replace(
  '  Sparkles\n} from "lucide-react";',
  '  Sparkles,\n  AlertCircle\n} from "lucide-react";'
);

fs.writeFileSync(file, content);
