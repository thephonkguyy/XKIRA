import fs from "fs";
const file = "src/pages/Chat.tsx";
let content = fs.readFileSync(file, "utf8");

content = content.replace(
  `                if (isNearBottomRef.current) {\n                  scrollToBottom("auto");\n              }\n            } catch (e) {`,
  `                if (isNearBottomRef.current) {\n                  scrollToBottom("auto");\n                }\n              }\n            } catch (e) {`
);

fs.writeFileSync(file, content);
