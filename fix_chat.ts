import fs from "fs";
const file = "src/pages/Chat.tsx";
let content = fs.readFileSync(file, "utf8");

content = content.replace(
  `                if (isNearBottomRef.current) {\n                  scrollToBottom("auto");// inline onkeydown replaced              }\n            } catch (e) {\n              // Ignore partial JSON parsing chunks`,
  `                if (isNearBottomRef.current) {\n                  scrollToBottom("auto");\n                }\n              }\n            } catch (e) {\n              // Ignore partial JSON parsing chunks`
);

fs.writeFileSync(file, content);
