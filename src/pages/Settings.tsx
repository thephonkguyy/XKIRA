import { motion } from "framer-motion";
import { Palette, Cpu, HardDrive, Shield, Info, Moon, Sun, Monitor, Trash2, CheckCircle, Smartphone, Server, Brain } from "lucide-react";
import { useChatStore } from "../store/chatStore";
import { useState } from "react";
import ResponsiveTabs from "../components/responsive/ResponsiveTabs";
import ToolHealthDiagnostics from "../components/common/ToolHealthDiagnostics";
import KnowledgeMemoryManager from "../components/common/KnowledgeMemoryManager";

export default function Settings() {
  const { conversations } = useChatStore();
  const [cleared, setCleared] = useState(false);
  const [activeSection, setActiveSection] = useState("appearance");
  const [selectedTheme, setSelectedTheme] = useState("dark");
  const [streamResponses, setStreamResponses] = useState(true);

  const handleClearHistory = () => {
    useChatStore.setState({ conversations: [], activeConversationId: null });
    setCleared(true);
    setTimeout(() => setCleared(false), 2000);
  };

  const SECTIONS = [
    { id: "appearance", icon: Palette, label: "Appearance" },
    { id: "ai", icon: Cpu, label: "AI Models" },
    { id: "memory", icon: Brain, label: "Knowledge & Memory" },
    { id: "storage", icon: HardDrive, label: "Storage" },
    { id: "privacy", icon: Shield, label: "Privacy" },
    { id: "about", icon: Info, label: "About XKIRA" },
    { id: "diagnostics", icon: Server, label: "Tool Diagnostics" },
  ];

  return (
    <div className="flex flex-col h-full relative w-full">
      <header className="flex-shrink-0 border-b border-white/5 pb-4 mb-4 z-10">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">Settings</h1>
          <p className="text-xs sm:text-sm text-zinc-400">Configure your XKIRA creative workstation</p>
        </div>
      </header>
      
      <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
        <div className="max-w-4xl mx-auto py-2 sm:py-6 flex flex-col md:flex-row gap-6 md:gap-10">
          
          {/* Settings Navigation Tabs */}
          <nav className="w-full md:w-56 flex flex-row md:flex-col gap-1 overflow-x-auto no-scrollbar pb-1 md:pb-0 flex-shrink-0">
            {SECTIONS.map((item) => (
              <button 
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors whitespace-nowrap min-h-[44px] ${
                  activeSection === item.id 
                    ? "bg-white/10 text-white shadow-sm" 
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                }`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Settings Content Panels */}
          <div className="flex-1 flex flex-col gap-6 sm:gap-8 min-w-0">
            {/* Appearance Section */}
            {activeSection === "appearance" && (
              <section className="flex flex-col gap-4 sm:gap-5">
                <h2 className="text-base sm:text-lg font-semibold text-white border-b border-white/5 pb-2">Appearance</h2>
                
                <div className="flex flex-col gap-3">
                  <label className="text-xs sm:text-sm font-medium text-zinc-300">Theme Preference</label>
                  <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
                    {[
                      { id: "system", icon: Monitor, label: "System" },
                      { id: "dark", icon: Moon, label: "Dark" },
                      { id: "light", icon: Sun, label: "Light" },
                    ].map((theme) => (
                      <button 
                        key={theme.id}
                        onClick={() => setSelectedTheme(theme.id)}
                        className={`flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all min-h-[70px] ${
                          selectedTheme === theme.id 
                            ? "bg-indigo-500/15 border-indigo-500/50 text-indigo-300 shadow-md" 
                            : "bg-white/[0.02] border-white/5 text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                        }`}
                      >
                        <theme.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                        <span className="text-xs sm:text-sm font-medium">{theme.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* AI Section */}
            {activeSection === "ai" && (
              <section className="flex flex-col gap-4 sm:gap-5">
                <h2 className="text-base sm:text-lg font-semibold text-white border-b border-white/5 pb-2">AI Configuration</h2>
                
                <div className="flex flex-col gap-3">
                  <label className="text-xs sm:text-sm font-medium text-zinc-300">Default Chat Model</label>
                  <select className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-white outline-none focus:border-indigo-500 text-xs sm:text-sm min-h-[44px]">
                    <option value="agnes-2.5-flash">Agnes 2.5 Flash (Ultra Fast)</option>
                    <option value="agnes-2.5-pro">Agnes 2.5 Pro (Deep Reasoning)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-3.5 sm:p-4 bg-white/[0.02] border border-white/5 rounded-2xl gap-4 flex-wrap sm:flex-nowrap">
                  <div className="min-w-0">
                    <h3 className="text-white font-medium text-xs sm:text-sm">Stream Responses</h3>
                    <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">Show AI responses smoothly as they are generated.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStreamResponses(!streamResponses)}
                    className={`w-12 h-7 rounded-full flex items-center px-1 transition-colors flex-shrink-0 ${
                      streamResponses ? "bg-indigo-600 justify-end" : "bg-zinc-700 justify-start"
                    }`}
                  >
                    <div className="w-5 h-5 bg-white rounded-full shadow-md" />
                  </button>
                </div>
              </section>
            )}

            {/* Knowledge & Memory Section */}
            {activeSection === "memory" && (
              <section className="flex flex-col gap-4 sm:gap-5">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-white border-b border-white/5 pb-2">Knowledge Base & AI Memory</h2>
                  <p className="text-xs text-zinc-400 mt-1">Manage Agnes domain intelligence, character profiles, world bibles, and project continuity memory.</p>
                </div>
                <KnowledgeMemoryManager />
              </section>
            )}

            {/* Storage Section */}
            {activeSection === "storage" && (
              <section className="flex flex-col gap-4 sm:gap-5">
                <h2 className="text-base sm:text-lg font-semibold text-white border-b border-white/5 pb-2">Local Storage</h2>
                
                <div className="flex items-center justify-between p-3.5 sm:p-4 bg-white/[0.02] border border-white/5 rounded-2xl gap-3 flex-wrap sm:flex-nowrap">
                  <div className="min-w-0">
                    <h3 className="text-white font-medium text-xs sm:text-sm">Clear Chat History</h3>
                    <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">Permanently delete local conversations ({conversations.length} items).</p>
                  </div>
                  <button 
                    onClick={handleClearHistory}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors flex-shrink-0 min-h-[40px] ${
                      cleared ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                    }`}
                  >
                    {cleared ? <CheckCircle className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                    {cleared ? "Cleared" : "Clear History"}
                  </button>
                </div>
              </section>
            )}

            {/* Privacy Section */}
            {activeSection === "privacy" && (
              <section className="flex flex-col gap-4 sm:gap-5">
                <h2 className="text-base sm:text-lg font-semibold text-white border-b border-white/5 pb-2">Privacy & Data</h2>
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-xs sm:text-sm text-zinc-300 leading-relaxed">
                  <p>All creative scripts, story structures, and local character bibles are persisted in your browser's local sandbox. Generation requests are securely sent directly to Agnes AI endpoints without intermediary third-party trackers.</p>
                </div>
              </section>
            )}

            {/* About Section */}
            
              {activeSection === "diagnostics" && (
                <motion.div
                  key="diagnostics"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col gap-8"
                >
                  <section className="flex flex-col gap-4">
                    <div>
                      <h2 className="text-sm font-semibold text-white tracking-tight">System Health & Diagnostics</h2>
                      <p className="text-xs text-zinc-400 mt-1">Real-time status of all configured AI tools and backend services. For developer use.</p>
                    </div>
                    <ToolHealthDiagnostics />
                  </section>
                </motion.div>
              )}

              {activeSection === "about" && (
              <section className="flex flex-col gap-4 sm:gap-5">
                <h2 className="text-base sm:text-lg font-semibold text-white border-b border-white/5 pb-2">About XKIRA</h2>
                <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-xs">X</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">XKIRA Creative Suite</h3>
                      <p className="text-xs text-zinc-400">Version 2.5 (Flagship Responsive Edition)</p>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Powered by Agnes AI foundation models: Agnes 2.5 Flash, Agnes 2.5 Pro, Agnes Image 2.1 Flash, and Agnes Video v2.0.
                  </p>
                </div>
              </section>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}
