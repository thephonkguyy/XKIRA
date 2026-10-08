import fs from "fs";
const file = "src/pages/Chat.tsx";
let content = fs.readFileSync(file, "utf8");

content = content.replace(
  /scrollToBottom\("auto"\);\s*\}\s*\}\s*catch \(e\)/,
  'scrollToBottom("auto");\n                }\n              }\n            } catch (e)'
);

content = content.replace(/Chat\}\n$/m, "Chat}");

fs.writeFileSync(file, content);
