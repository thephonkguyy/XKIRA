import fs from "fs";
const file = "src/pages/Chat.tsx";
let content = fs.readFileSync(file, "utf8");

content = content.replace(
  'const msg = currentConv.messages.find(m => m.id === messageId);',
  'const msgIdx = currentConv.messages.findIndex(m => m.id === messageId);\n    const msg = currentConv.messages[msgIdx];\n    const prevUserMsg = msgIdx > 0 ? currentConv.messages[msgIdx - 1] : null;\n    const userPrompt = prevUserMsg?.content.replace(/^@\\w+\\s+/, "") || "Generate";'
);

content = content.replace(
  'prompt: msg.content || "An image"',
  'prompt: userPrompt'
);

content = content.replace(
  'prompt: msg.content || "A video"',
  'prompt: userPrompt'
);
content = content.replace(
  'prompt: msg.content || "A video"',
  'prompt: userPrompt'
);

fs.writeFileSync(file, content);
