/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Home from "./pages/Home";
import Chat from "./pages/Chat";
import ImageStudio from "./pages/ImageStudio";
import VideoStudio from "./pages/VideoStudio";
import PromptLab from "./pages/PromptLab";
import Tools from "./pages/Tools";
import ModelHub from "./pages/ModelHub";
import History from "./pages/History";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import { initializeJobManager } from "./store/jobStore";
import { useAuthStore } from "./store/authStore";

export default function App() {
  const checkAuth = useAuthStore(state => state.checkAuth);
  const isInitialized = useAuthStore(state => state.isInitialized);

  useEffect(() => {
    initializeJobManager();
    checkAuth();
  }, [checkAuth]);

  if (!isInitialized) {
    return (
      <div className="flex h-screen w-screen bg-zinc-950 items-center justify-center relative overflow-hidden">
        {/* Soft background ambiance matching XKIRA layout */}
        <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="flex flex-col items-center gap-4 text-center z-10">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.3)] animate-pulse">
            <span className="text-white font-bold text-lg">X</span>
          </div>
          <div className="space-y-1">
            <h3 className="text-xs font-semibold tracking-widest text-zinc-300 uppercase">Initializing XKIRA</h3>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Verifying Secure Workstation Connection</p>
          </div>
          
          <div className="w-6 h-6 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mt-2" />
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="chat" element={<Chat />} />
        <Route path="image-studio" element={<ImageStudio />} />
        <Route path="video-studio" element={<VideoStudio />} />
        <Route path="prompt-lab" element={<PromptLab />} />
        <Route path="tools" element={<Tools />} />
        <Route path="model-hub" element={<ModelHub />} />
        <Route path="history" element={<History />} />
        <Route path="settings" element={<Settings />} />
        <Route path="auth" element={<Auth />} />
      </Route>
    </Routes>
  );
}
