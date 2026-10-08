import fs from "fs";
const file = "src/pages/Chat.tsx";
let content = fs.readFileSync(file, "utf8");

content = content.replace(
  'import { useChatStore, Message } from "../store/chatStore";',
  'import { useChatStore, Message } from "../store/chatStore";\nimport { TOOL_REGISTRY } from "../registry/toolRegistry";\nimport { detectToolFromCommand, detectToolFromIntent } from "../utils/toolExecutor";\nimport { useJobStore } from "../store/jobStore";'
);

content = content.replace(
  '  const scrollContainerRef = useRef<HTMLDivElement>(null);',
  '  const { createJob } = useJobStore();\n  const scrollContainerRef = useRef<HTMLDivElement>(null);\n  const [showToolSuggestions, setShowToolSuggestions] = useState(false);\n  const [toolSuggestions, setToolSuggestions] = useState<any[]>([]);\n  const [selectedToolIndex, setSelectedToolIndex] = useState(0);\n  const [suggestedTool, setSuggestedTool] = useState<any | null>(null);\n  const inputRef = useRef<HTMLTextAreaElement>(null);'
);

const handleInputChange = `
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    
    // Check for @ tool suggestions
    const match = val.match(/(^|\\s)@(\\w*)$/);
    if (match) {
      const query = match[2].toLowerCase();
      const tools = Object.values(TOOL_REGISTRY).filter(t => t.chatTrigger.startsWith("@" + query));
      setToolSuggestions(tools);
      setShowToolSuggestions(tools.length > 0);
      setSelectedToolIndex(0);
    } else {
      setShowToolSuggestions(false);
      
      // Intent detection
      if (val.trim().length > 10) {
        const detected = detectToolFromIntent(val);
        setSuggestedTool(detected);
      } else {
        setSuggestedTool(null);
      }
    }
  };

  const insertToolSuggestion = (tool: any) => {
    const newVal = input.replace(/(^|\\s)@\\w*$/, \`$1\${tool.chatTrigger} \`);
    setInput(newVal);
    setShowToolSuggestions(false);
    inputRef.current?.focus();
  };
`;

content = content.replace(
  '  // Clean up abort controller on unmount',
  handleInputChange + '\n  // Clean up abort controller on unmount'
);

const handleKeyDown = `
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showToolSuggestions && toolSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedToolIndex((prev) => (prev + 1) % toolSuggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedToolIndex((prev) => (prev - 1 + toolSuggestions.length) % toolSuggestions.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertToolSuggestion(toolSuggestions[selectedToolIndex]);
        return;
      }
      if (e.key === "Escape") {
        setShowToolSuggestions(false);
        return;
      }
    }
    
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
`;

content = content.replace(
  '              onChange={(e) => setInput(e.target.value)}',
  '              onChange={handleInputChange}'
);

content = content.replace(
  '              onKeyDown={(e) => {',
  '              onKeyDown={handleKeyDown} // replaced inline onKeyDown'
);
content = content.replace(
  '                if (e.key === "Enter" && !e.shiftKey) {',
  '// inline onkeydown replaced'
);
content = content.replace(
  '                  e.preventDefault();',
  '// inline onkeydown replaced'
);
content = content.replace(
  '                  handleSend();',
  '// inline onkeydown replaced'
);
content = content.replace(
  '                }',
  '// inline onkeydown replaced'
);
content = content.replace(
  '              }}',
  '// inline onkeydown replaced'
);
content = content.replace(
  '              className="flex-1 max-h-32 min-h-[44px] bg-transparent text-white text-xs sm:text-sm font-sans placeholder-zinc-500 resize-none outline-none overflow-y-auto leading-relaxed py-3 px-1"',
  '              ref={inputRef}\n              className="flex-1 max-h-32 min-h-[44px] bg-transparent text-white text-xs sm:text-sm font-sans placeholder-zinc-500 resize-none outline-none overflow-y-auto leading-relaxed py-3 px-1"'
);

fs.writeFileSync(file, content);
