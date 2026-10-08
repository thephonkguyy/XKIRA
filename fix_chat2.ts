import fs from "fs";
const file = "src/pages/Chat.tsx";
let content = fs.readFileSync(file, "utf8");

content = content.replace(
  /scrollToBottom\("auto"\);\/\/ inline onkeydown replaced\s*\}\s*\} catch \(e\) \{/g,
  `scrollToBottom("auto");\n                }\n              }\n            } catch (e) {`
);

content = content.replace(/\/\/ inline onkeydown replaced/g, "");

fs.writeFileSync(file, content);
