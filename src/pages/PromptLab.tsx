import { useState } from "react";
import { motion } from "framer-motion";
import { Wand2, Copy, RefreshCw, Check } from "lucide-react";
import { aiCore } from "../core/ai";

export default function PromptLab() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleEnhance = async () => {
    if (!input.trim()) return;
    setIsGenerating(true);
    
    try {
      const text = await aiCore.chat({
        model: "agnes-2.5-flash",
        stream: false,
        systemPrompt: "You are an expert prompt engineer. Return ONLY the enhanced prompt text, without any conversational filler, introductory remarks, or quotation marks.",
        messages: [{ role: "user", content: `Enhance the following prompt into a highly detailed, cinematic, and descriptive generation prompt: "${input}".` }]
      });

      setOutput(text);
    } catch (err: any) {
      setOutput(`Error enhancing prompt: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full relative w-full">
      <header className="flex-shrink-0 border-b border-white/5 pb-4 mb-4 z-10">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">Prompt Lab</h1>
          <p className="text-xs sm:text-sm text-zinc-400">Engineer and optimize prompts for generative AI</p>
        </div>
      </header>
      
      <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
        <div className="max-w-4xl mx-auto py-2 sm:py-6 flex flex-col gap-6 sm:gap-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
            
            {/* Input Side */}
            <div className="flex flex-col gap-3">
              <h2 className="text-xs sm:text-sm font-semibold text-zinc-400 uppercase tracking-wider">Original Concept</h2>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Enter a simple idea (e.g. 'a car in the rain')..."
                className="w-full h-48 sm:h-64 bg-black/40 border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white placeholder-zinc-500 resize-none outline-none focus:border-amber-500/50 focus:bg-black/60 transition-all text-xs sm:text-sm leading-relaxed"
              />
              <button 
                onClick={handleEnhance}
                disabled={!input.trim() || isGenerating}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-white rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold transition-all shadow-lg shadow-amber-500/20 active:scale-98 min-h-[44px]"
              >
                {isGenerating ? <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <Wand2 className="w-4 h-4 sm:w-5 sm:h-5" />}
                {isGenerating ? "Enhancing Prompt..." : "Enhance Prompt"}
              </button>
            </div>

            {/* Output Side */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs sm:text-sm font-semibold text-zinc-400 uppercase tracking-wider">Engineered Prompt</h2>
                {output && (
                  <button 
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-zinc-300 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                )}
              </div>
              <div className="relative group w-full h-48 sm:h-64 bg-white/[0.02] border border-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-6 overflow-y-auto text-xs sm:text-sm transition-all leading-relaxed">
                {output ? (
                  <p className="text-white whitespace-pre-wrap">{output}</p>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600 flex-col gap-3">
                    <Wand2 className="w-6 h-6 sm:w-8 sm:h-8 opacity-50" />
                    <p className="text-xs sm:text-sm">Enhanced prompt will appear here.</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
