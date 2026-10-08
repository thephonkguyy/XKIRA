import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send, 
  Square, 
  Plus, 
  ArrowDown, 
  Sparkles, 
  Bot, 
  Trash2,
  AlertCircle
} from "lucide-react";
import { useChatStore, Message } from "../store/chatStore";
import { TOOL_REGISTRY } from "../registry/toolRegistry";
import { detectToolFromCommand, detectToolFromIntent } from "../utils/toolExecutor";
import { useJobStore } from "../store/jobStore";
import { safeExtractError } from "../lib/utils";
import { aiCore } from "../core/ai";
import ChatMessageItem from "../components/chat/ChatMessageItem";
import { VoiceTriggerButton } from "../components/voice/VoiceTriggerButton";
import { LiveVoiceModal } from "../components/voice/LiveVoiceModal";

export default function Chat() {
  const { 
    conversations, 
    activeConversationId, 
    createConversation, 
    setActiveConversation, 
    addMessage,
    updateMessageStream,
    editUserMessageAndTruncate,
    truncateAfterMessage,
    deleteConversation
  } = useChatStore();

  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState<"agnes-3.0-flash" | "agnes-2.5-pro" | "agnes-2.5-flash">("agnes-3.0-flash");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { createJob } = useJobStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showToolSuggestions, setShowToolSuggestions] = useState(false);
  const [toolSuggestions, setToolSuggestions] = useState<any[]>([]);
  const [selectedToolIndex, setSelectedToolIndex] = useState(0);
  const [suggestedTool, setSuggestedTool] = useState<any | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isNearBottomRef = useRef(true);

  // Auto-create initial conversation if none exists
  useEffect(() => {
    if (!activeConversationId && conversations.length === 0) {
      createConversation();
    } else if (!activeConversationId && conversations.length > 0) {
      setActiveConversation(conversations[0].id);
    }
  }, [activeConversationId, conversations, createConversation, setActiveConversation]);

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  // Scroll listener to track if user is near bottom
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isNear = distanceToBottom < 100;
    isNearBottomRef.current = isNear;
    setShowScrollBottomBtn(!isNear && (activeConversation?.messages.length || 0) > 2);
  }, [activeConversation?.messages.length]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    isNearBottomRef.current = true;
    setShowScrollBottomBtn(false);
  }, []);

  // Auto-scroll on new messages ONLY if user was already near bottom
  useEffect(() => {
    if (isNearBottomRef.current) {
      scrollToBottom("smooth");
    }
  }, [activeConversation?.messages, scrollToBottom]);


  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    
    // Check for @ tool suggestions
    const match = val.match(/(^|\s)@(\w*)$/);
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
    const newVal = input.replace(/(^|\s)@\w*$/, `$1${tool.chatTrigger} `);
    setInput(newVal);
    setShowToolSuggestions(false);
    inputRef.current?.focus();
  };

  // Clean up abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Core stream runner
  const streamChatCompletion = async (convId: string, messagesToSend: Array<{ role: string; content: string }>) => {
    setIsGenerating(true);
    setErrorMessage(null);

    const assistantMsgId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    };
    addMessage(convId, assistantMessage);

    setTimeout(() => scrollToBottom("smooth"), 50);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await aiCore.chat({
        model: selectedModel,
        messages: messagesToSend.map(m => ({ role: m.role as any, content: m.content })),
        stream: true,
        signal: controller.signal,
        onChunk: (chunk) => {
          updateMessageStream(convId, assistantMsgId, chunk);
          if (isNearBottomRef.current) {
            scrollToBottom("auto");
          }
        },
        onError: (err) => {
          if (err.name !== "AbortError") {
            const errStr = err.message || "Failed to generate AI response.";
            setErrorMessage(errStr);
            updateMessageStream(convId, assistantMsgId, `\n\n[Error: ${errStr}]`);
          }
        }
      });
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("Chat generation stopped by user.");
      } else {
        const errStr = err.message || "Failed to generate AI response.";
        setErrorMessage(errStr);
        updateMessageStream(convId, assistantMsgId, `\n\n[Error: ${errStr}]`);
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  
  const executeToolCommand = async (conversationId: string, tool: any, query: string) => {
    // Basic tool execution for chat
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: `${tool.chatTrigger} ${query}`,
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

    // If it's a Studio tool, ask for confirmation
    if (tool.category === "Studio" && tool.requiresConfirmation) {
      useChatStore.getState().updateToolCall(conversationId, assistantMsgId, {
        status: 'AWAITING_CONFIRMATION'
      });
      setIsGenerating(false);
      return;
    }

    try {
      const result = await aiCore.executeTool({
        toolId: tool.id,
        userPrompt: query,
        conversationId,
      });

      if (result.status === "COMPLETED" && result.result) {
        useChatStore.getState().updateToolCall(conversationId, assistantMsgId, {
          status: 'COMPLETED',
          result: result.result
        });
      } else {
        throw new Error(result.error || "Invalid tool response");
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


  const handleConfirmTool = async (messageId: string) => {
    if (!activeConversationId) return;
    const currentConv = useChatStore.getState().conversations.find(c => c.id === activeConversationId);
    if (!currentConv) return;
    const msgIdx = currentConv.messages.findIndex(m => m.id === messageId);
    const msg = currentConv.messages[msgIdx];
    const prevUserMsg = msgIdx > 0 ? currentConv.messages[msgIdx - 1] : null;
    const userPrompt = prevUserMsg?.content.replace(/^@\w+\s+/, "") || "Generate";
    if (!msg || !msg.toolCall) return;

    useChatStore.getState().updateToolCall(activeConversationId, messageId, { status: 'RUNNING' });
    setIsGenerating(true);

    try {
      const result = await aiCore.executeTool({
        toolId: msg.toolCall.toolId,
        userPrompt,
        conversationId: activeConversationId,
        confirmed: true,
      });

      if (result.status === "COMPLETED" && result.result) {
        useChatStore.getState().updateToolCall(activeConversationId, messageId, {
          status: 'COMPLETED',
          result: result.result
        });
      } else {
        throw new Error(result.error || "Tool execution failed.");
      }
    } catch (err: any) {
      useChatStore.getState().updateToolCall(activeConversationId, messageId, {
        status: 'FAILED',
        error: err.message
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCancelTool = (messageId: string) => {
    if (!activeConversationId) return;
    useChatStore.getState().updateToolCall(activeConversationId, messageId, {
      status: 'CANCELLED' as any
    });
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

    // Check natural language intents (e.g. generate image, make a picture, create video, animate image, edit image)
    const naturalTool = detectToolFromIntent(currentInput);
    if (naturalTool && (naturalTool.id === "image-studio" || naturalTool.id === "video-studio")) {
      await executeToolCommand(activeConversationId, naturalTool, currentInput);
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


  // User message edit & resubmit handler
  const handleEditUserMessage = async (messageId: string, newContent: string) => {
    if (!activeConversationId || isGenerating) return;

    // Truncate and update store
    editUserMessageAndTruncate(activeConversationId, messageId, newContent);

    // Get current updated messages
    const currentConv = useChatStore.getState().conversations.find(c => c.id === activeConversationId);
    if (!currentConv) return;

    const history = currentConv.messages
      .filter(m => m.role !== "system")
      .map(m => ({ role: m.role, content: m.content }));

    await streamChatCompletion(activeConversationId, history);
  };

  // Assistant message regenerate handler
  const handleRegenerate = async (assistantMsgIndex: number) => {
    if (!activeConversationId || isGenerating) return;
    const currentConv = activeConversation;
    if (!currentConv || currentConv.messages.length === 0) return;

    // Truncate everything after the prompt that generated this message
    const targetMsg = currentConv.messages[assistantMsgIndex];
    if (!targetMsg) return;

    truncateAfterMessage(activeConversationId, targetMsg.id);

    const updatedConv = useChatStore.getState().conversations.find(c => c.id === activeConversationId);
    if (!updatedConv) return;

    const history = updatedConv.messages
      .filter(m => m.role !== "system")
      .map(m => ({ role: m.role, content: m.content }));

    await streamChatCompletion(activeConversationId, history);
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 relative w-full">
      {/* Header with Model Selector & New Chat */}
      <header className="flex-shrink-0 flex items-center justify-between border-b border-white/5 pb-3 mb-2 z-10 gap-2 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">AI Chat</h1>
            <p className="text-[10px] sm:text-xs text-zinc-400">Powered exclusively by Agnes AI</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Model Switcher */}
          <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setSelectedModel("agnes-3.0-flash")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all min-h-[32px] ${
                selectedModel === "agnes-3.0-flash"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              3.0 Flash
            </button>
            <button
              onClick={() => setSelectedModel("agnes-2.5-pro")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all min-h-[32px] ${
                selectedModel === "agnes-2.5-pro"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              2.5 Pro
            </button>
            <button
              onClick={() => setSelectedModel("agnes-2.5-flash")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all min-h-[32px] ${
                selectedModel === "agnes-2.5-flash"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              2.5 Flash
            </button>
          </div>

          <VoiceTriggerButton conversationId={activeConversationId} variant="header" />

          <button
            onClick={() => createConversation()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-zinc-200 hover:text-white rounded-xl text-xs font-semibold border border-white/10 transition-all min-h-[36px]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>
      </header>

      {errorMessage && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs flex items-center justify-between gap-3 mb-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-xs hover:text-white font-bold">✕</button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto no-scrollbar min-h-0 py-2 sm:py-4 px-0.5 relative"
      >
        <div className="flex flex-col gap-3.5 sm:gap-5 max-w-4xl mx-auto w-full">
          <AnimatePresence>
            {(!activeConversation || activeConversation.messages.length === 0) && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center text-center text-zinc-500 my-16 text-xs sm:text-sm px-4 gap-3"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-lg">
                  <Sparkles className="w-6 h-6" />
                </div>
                <p className="font-medium text-zinc-300">Welcome to XKIRA AI Chat</p>
                <p className="text-zinc-500 max-w-md text-xs">
                  Ask questions, formulate complex scripts, brainstorm cinematic scenes, or generate creative workflows with Agnes AI.
                </p>
              </motion.div>
            )}
            
            {activeConversation?.messages.map((m, idx) => (
              <ChatMessageItem
                key={m.id}
                message={m}
                isLastAssistant={idx === activeConversation.messages.length - 1}
                isGenerating={isGenerating}
                onEditUserMessage={handleEditUserMessage}
                onRegenerate={() => handleRegenerate(idx)}
                onConfirmTool={handleConfirmTool}
                onCancelTool={handleCancelTool}
              />
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Floating Jump-to-Bottom Button */}
      {showScrollBottomBtn && (
        <button
          onClick={() => scrollToBottom("smooth")}
          className="absolute bottom-20 right-4 sm:right-8 z-30 p-2.5 bg-indigo-600/90 hover:bg-indigo-600 text-white rounded-full shadow-2xl border border-indigo-400/30 flex items-center gap-1.5 text-xs font-semibold backdrop-blur-md transition-all active:scale-95"
        >
          <ArrowDown className="w-4 h-4" />
          <span className="hidden sm:inline">Jump to latest</span>
        </button>
      )}

      
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
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${idx === selectedToolIndex ? 'bg-indigo-600/20 text-white' : 'text-zinc-300 hover:bg-zinc-800'}`}
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

      <div className="flex-shrink-0 pt-2 pb-safe max-w-4xl mx-auto w-full z-20">
        <div className="bg-zinc-900/95 backdrop-blur-2xl border border-zinc-800 p-1.5 sm:p-2 rounded-2xl sm:rounded-3xl flex items-end gap-1.5 sm:gap-2 shadow-2xl transition-all focus-within:border-indigo-500/50 focus-within:shadow-[0_0_30px_rgba(99,102,241,0.15)]">
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message XKIRA..."
            className="flex-1 bg-transparent text-white placeholder-zinc-500 resize-none outline-none max-h-32 min-h-[40px] sm:min-h-[44px] py-2 px-3 text-xs sm:text-sm font-sans min-w-0"
            rows={1}
          />
          <VoiceTriggerButton conversationId={activeConversationId} variant="composer" />
          {isGenerating ? (
            <button 
              onClick={handleStop}
              className="p-2.5 sm:p-3 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-xl sm:rounded-2xl transition-colors flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Stop generation"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button 
              onClick={handleSend}
              disabled={!input.trim()}
              className="p-2.5 sm:p-3 bg-white text-black hover:bg-zinc-200 disabled:opacity-40 disabled:hover:bg-white rounded-xl sm:rounded-2xl transition-colors shadow-lg flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* XKIRA Live Voice Session Modal */}
      <LiveVoiceModal />
    </div>
  );
}
