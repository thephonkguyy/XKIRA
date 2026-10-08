import { motion } from "framer-motion";
import { Cpu, CheckCircle2, Zap, Brain, MessageSquare, ImageIcon, Video } from "lucide-react";
import { aiCore, AIModelInfo } from "../core/ai";

const getModelIcons = (model: AIModelInfo) => {
  if (model.type === "video") return [Video];
  if (model.type === "image") return [ImageIcon];
  if (model.id.includes("pro")) return [MessageSquare, Brain];
  return [MessageSquare];
};

export default function ModelHub() {
  const models = aiCore.getModels();

  return (
    <div className="flex flex-col h-full relative w-full">
      <header className="flex-shrink-0 border-b border-white/5 pb-4 mb-4 z-10">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">Model Hub</h1>
          <p className="text-xs sm:text-sm text-zinc-400">Available Agnes AI foundation models</p>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
        <div className="flex flex-col gap-6 max-w-5xl mx-auto py-2 sm:py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {models.map((model, i) => {
              const icons = getModelIcons(model);
              const typeLabel = model.type === "video" ? "Video" : model.type === "image" ? "Vision / Image" : "Text & Reasoning";

              return (
                <motion.div
                  key={model.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl border flex flex-col gap-3 sm:gap-4 transition-all ${
                    model.status === "Available"
                      ? "bg-white/[0.02] border-white/10 hover:border-indigo-500/30 hover:bg-white/[0.04]"
                      : "bg-black/40 border-white/5 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap sm:flex-nowrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          model.status === "Available" ? "bg-indigo-500/20 text-indigo-400" : "bg-white/5 text-zinc-500"
                        }`}
                      >
                        <Cpu className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-white text-base sm:text-lg tracking-tight truncate">{model.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <p className="text-[11px] sm:text-xs font-medium text-zinc-400">{typeLabel}</p>
                          <span className="w-1 h-1 rounded-full bg-white/20" />
                          <code className="text-[9px] sm:text-[10px] text-indigo-300 font-mono bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 break-all">
                            {model.id}
                          </code>
                        </div>
                      </div>
                    </div>
                    {model.status === "Available" ? (
                      <span className="flex items-center gap-1 text-[11px] sm:text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 sm:py-1 rounded-full flex-shrink-0">
                        <CheckCircle2 className="w-3 h-3" /> Ready
                      </span>
                    ) : (
                      <span className="text-[11px] sm:text-xs font-medium text-zinc-500 bg-white/5 px-2 py-0.5 sm:py-1 rounded-full border border-white/5 flex-shrink-0">
                        Pro Tier Required
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed min-h-[36px]">
                    {model.description}
                  </p>

                  <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-white/5">
                    <div className="flex gap-1.5 sm:gap-2">
                      {icons.map((Icon, idx) => (
                        <div key={idx} className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/5 flex items-center justify-center text-zinc-400" title="Capability">
                          <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                      <Zap className="w-3.5 h-3.5" />
                      {model.speed}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
