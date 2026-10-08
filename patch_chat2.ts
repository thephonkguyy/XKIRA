import fs from "fs";
const file = "src/pages/Chat.tsx";
let content = fs.readFileSync(file, "utf8");

const handleSendReplacement = `
  const executeToolCommand = async (conversationId: string, tool: any, query: string) => {
    // Basic tool execution for chat
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: \`\${tool.chatTrigger} \${query}\`,
      timestamp: Date.now(),
    };
    addMessage(conversationId, userMessage);
    setInput("");
    scrollToBottom("smooth");

    setIsGenerating(true);
    setErrorMessage(null);

    const assistantMsgId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      toolCall: {
        toolId: tool.id,
        toolName: tool.name,
        status: 'RUNNING'
      }
    };
    addMessage(conversationId, assistantMessage);
    scrollToBottom("smooth");

    // If it's a Studio tool, create a job in jobStore instead of a fast chat completion
    if (tool.category === "Studio") {
      const { createJob } = useJobStore.getState();
      const jobId = createJob({
        type: tool.outputType,
        tool: tool.name,
        model: tool.defaultModel,
        prompt: query,
        status: "QUEUED",
        progress: \`Starting \${tool.name} job...\`
      });
      useChatStore.getState().updateToolCall(conversationId, assistantMsgId, {
        status: 'COMPLETED',
        result: \`Job submitted to \${tool.name}. Open Generation Center to view progress.\`
      });
      setIsGenerating(false);
      return;
    }

    try {
      const payload = {
        model: tool.defaultModel,
        messages: [
          { role: "system", content: tool.systemPrompt },
          { role: "user", content: query }
        ],
        stream: false
      };
      
      const res = await fetch("/api/agnes/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      const resText = await res.text();
      if (!res.ok) {
        throw new Error(safeExtractError(resText, res.status));
      }
      
      let data = JSON.parse(resText);
      if (data.choices && data.choices[0] && data.choices[0].message) {
        useChatStore.getState().updateToolCall(conversationId, assistantMsgId, {
          status: 'COMPLETED',
          result: data.choices[0].message.content.trim()
        });
      } else {
        throw new Error("Invalid tool response");
      }
    } catch (err: any) {
      useChatStore.getState().updateToolCall(conversationId, assistantMsgId, {
        status: 'FAILED',
        error: err.message
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !activeConversationId || isGenerating) return;
    const currentInput = input.trim();
    
    // Check explicit tool commands
    const explicitTool = detectToolFromCommand(currentInput);
    if (explicitTool) {
      await executeToolCommand(activeConversationId, explicitTool.tool, explicitTool.query);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: currentInput,
      timestamp: Date.now(),
    };
    addMessage(activeConversationId, userMessage);
    setInput("");

    const currentMessages = activeConversation?.messages || [];
    const history = currentMessages
      .filter(m => m.role !== "system")
      .map(m => ({ role: m.role, content: m.content }));
      
    await streamChatCompletion(activeConversationId, [...history, { role: "user", content: currentInput }]);
  };
`;

content = content.replace(/const handleSend = async \(\) => \{[\s\S]*?\n  \};\n/m, handleSendReplacement + "\n");

const suggestionsUI = `
      {/* Suggestions and Tool UI */}
      <div className="flex-shrink-0 pt-2 max-w-4xl mx-auto w-full z-20 relative">
        <AnimatePresence>
          {showToolSuggestions && toolSuggestions.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full left-0 w-full mb-2 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl z-30"
            >
              <div className="p-2 text-xs font-semibold text-zinc-400 border-b border-zinc-800 uppercase tracking-wider">
                Select Tool
              </div>
              <div className="max-h-48 overflow-y-auto">
                {toolSuggestions.map((tool, idx) => (
                  <button
                    key={tool.id}
                    className={\`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors \${idx === selectedToolIndex ? 'bg-indigo-600/20 text-white' : 'text-zinc-300 hover:bg-zinc-800'}\`}
                    onClick={() => insertToolSuggestion(tool)}
                    onMouseEnter={() => setSelectedToolIndex(idx)}
                  >
                    <tool.icon className="w-4 h-4 flex-shrink-0 text-indigo-400" />
                    <div>
                      <div className="text-sm font-semibold">{tool.name}</div>
                      <div className="text-xs text-zinc-500">{tool.description}</div>
                    </div>
                    <div className="ml-auto text-xs font-mono text-zinc-600 bg-black/20 px-1.5 py-0.5 rounded">{tool.chatTrigger}</div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {suggestedTool && !showToolSuggestions && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute bottom-full left-0 w-full mb-2 p-3 bg-zinc-900 border border-indigo-500/30 rounded-xl shadow-2xl z-20 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <suggestedTool.icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-indigo-300 font-semibold mb-0.5">✨ Recommended Tool</div>
                  <div className="text-sm text-white">{suggestedTool.name}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSuggestedTool(null)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => {
                    if (activeConversationId) {
                      executeToolCommand(activeConversationId, suggestedTool, input);
                      setSuggestedTool(null);
                    }
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-md transition-all active:scale-95"
                >
                  Use Tool
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* Input composer area - Pinned at bottom */}
`;

content = content.replace(
  '{/* Input composer area - Pinned at bottom */}',
  suggestionsUI
);

// We need to also add imports for the icons? Wait, they are imported inside toolRegistry.ts, but we use tool.icon in Chat.tsx.
// It should work since tool.icon is a React ElementType.

fs.writeFileSync(file, content);
