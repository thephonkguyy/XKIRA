import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, X, ArrowRight } from "lucide-react";
import { TOOL_REGISTRY, getToolsByCategory, ToolDefinition } from "../registry/toolRegistry";
import { safeExtractError } from "../lib/utils";
import { useJobStore } from "../store/jobStore";
import { useNavigate } from "react-router-dom";
import { aiCore } from "../core/ai";

export default function Tools() {
  const [activeTool, setActiveTool] = useState<ToolDefinition | null>(null);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const navigate = useNavigate();

  const handleExecute = async () => {
    if (!input.trim() || !activeTool) return;
    setIsGenerating(true);
    setOutput("");
    
    try {
      const result = await aiCore.executeTool({
        toolId: activeTool.id,
        userPrompt: input,
      });

      if (result.status === "COMPLETED" && result.result) {
        setOutput(result.result);
      } else if (result.status === "FAILED") {
        setOutput(`Error executing tool: ${result.error || "Unknown error"}`);
      } else if (result.status === "AWAITING_CONFIRMATION") {
        setOutput(`Job submitted to ${activeTool.name}. Open Generation Center or Chat to view progress.`);
      } else {
        setOutput(result.result || "Tool execution completed.");
      }
    } catch (err: any) {
      setOutput(`Error executing tool: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const categories = getToolsByCategory();

  return (
    <div className="flex flex-col h-full w-full">
      <header className="flex-shrink-0 border-b border-white/5 pb-4 mb-4 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">AI Tools</h1>
            <p className="text-xs sm:text-sm text-zinc-400">Specialized AI utilities for writing, code, and prompts</p>
          </div>
          <button 
            onClick={() => navigate('/chat')}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg text-xs font-semibold transition-colors"
          >
            Use tools in Chat <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
        <AnimatePresence mode="wait">
          {activeTool ? (
            <motion.div 
              key="tool-editor"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col h-full bg-zinc-900/50 rounded-2xl border border-white/10 overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-zinc-950">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <activeTool.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold text-white">{activeTool.name}</h2>
                    <p className="text-xs text-zinc-400">Powered by {activeTool.defaultModel}</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setActiveTool(null); setInput(""); setOutput(""); }}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row gap-4 sm:gap-6 p-4 sm:p-5">
                 <div className="flex-1 flex flex-col gap-3 min-h-[300px]">
                    <label className="text-sm font-medium text-zinc-400">Input ({activeTool.chatTrigger})</label>
                    <textarea 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Enter your text or requirements here..."
                      className="flex-1 w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder-zinc-500 resize-none outline-none focus:border-indigo-500/50 transition-colors text-sm"
                    />
                    <button 
                      onClick={handleExecute}
                      disabled={!input.trim() || isGenerating}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-xl text-sm font-semibold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                    >
                      {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <activeTool.icon className="w-4 h-4" />}
                      {isGenerating ? "Processing..." : "Run Tool"}
                    </button>
                 </div>
                 <div className="flex-1 flex flex-col gap-3 min-h-[300px]">
                    <label className="text-sm font-medium text-zinc-400">Output</label>
                    <div className="flex-1 w-full bg-white/[0.02] border border-white/5 rounded-xl p-4 text-white overflow-y-auto whitespace-pre-wrap text-sm font-mono leading-relaxed">
                      {output || <span className="text-zinc-600 italic">Output will appear here...</span>}
                    </div>
                 </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="tool-grid"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="flex flex-col gap-8 sm:gap-10 max-w-5xl mx-auto py-2"
            >
              {Object.entries(categories).map(([categoryName, tools], i) => (
                <motion.div 
                  key={categoryName}
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: i * 0.1 }}
                >
                  <h2 className="text-sm sm:text-base font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    {categoryName}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    {tools.map(tool => (
                      <button 
                        key={tool.id}
                        onClick={() => setActiveTool(tool)}
                        className="flex flex-col items-center justify-center p-4 sm:p-6 bg-zinc-900 border border-zinc-800 rounded-2xl hover:bg-zinc-800 hover:border-zinc-700 active:scale-95 transition-all group cursor-pointer text-center"
                      >
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-zinc-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <tool.icon className="w-5 h-5 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                        </div>
                        <span className="text-xs sm:text-sm font-medium text-zinc-300 group-hover:text-white transition-colors line-clamp-1">{tool.name}</span>
                        <span className="mt-1 text-[10px] text-zinc-500 font-mono opacity-0 group-hover:opacity-100 transition-opacity">{tool.chatTrigger}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
