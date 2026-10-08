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
import { initializeJobManager } from "./store/jobStore";

export default function App() {
  useEffect(() => {
    initializeJobManager();
  }, []);

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
      </Route>
    </Routes>
  );
}
