import fs from "fs";
const file = "src/pages/ImageStudio.tsx";
let content = fs.readFileSync(file, "utf8");

// We need to change handleGenerateEditVariation to NOT setActiveTab("generate")
content = content.replace(
  'setActiveTab("generate");',
  '// setActiveTab("generate"); // Stay on edit tab to show before/after'
);

const beforeAfterBlock = `                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 flex-wrap">
                    <button 
                      onClick={() => handleEnhancePrompt(editPrompt, setEditPrompt)}
                      disabled={!editPrompt.trim() || isGenerating}
                      className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-medium text-zinc-300 transition-colors disabled:opacity-50 min-h-[38px] flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>Enhance Prompt</span>
                    </button>
                    
                    <button 
                      onClick={handleGenerateEditVariation}
                      disabled={!editPrompt.trim() || isGenerating}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-lg shadow-purple-500/25 min-h-[40px] active:scale-95"
                    >
                      {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                      <span>Generate Edit</span>
                    </button>
                  </div>
                </div>

                {/* Before / After Comparison */}
                {editReferenceUrl && generatedImage && !isGenerating && (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-zinc-900/40 rounded-2xl border border-white/5 overflow-hidden flex flex-col relative aspect-square">
                        <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-bold text-white uppercase tracking-wider z-10 border border-white/10">Before</div>
                        <img src={editReferenceUrl} alt="Original" className="w-full h-full object-contain" />
                      </div>
                      <div className="bg-zinc-900/40 rounded-2xl border border-white/5 overflow-hidden flex flex-col relative aspect-square">
                        <div className="absolute top-3 left-3 px-2.5 py-1 bg-indigo-500/80 backdrop-blur-md rounded-lg text-[10px] font-bold text-white uppercase tracking-wider z-10 border border-white/10 shadow-[0_0_15px_rgba(99,102,241,0.5)]">After</div>
                        <img src={generatedImage} alt="Edited" className="w-full h-full object-contain" />
                      </div>
                    </div>
                    <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-3 sm:p-4 backdrop-blur-md">
                      <ImageActionToolbar 
                        imageUrl={generatedImage} 
                        prompt={editPrompt} 
                        title="Edited Image"
                        onEdit={() => handleEditThisImage(generatedImage)}
                        onRegenerate={handleGenerateEditVariation}
                        onUseAsVideoRef={() => handleUseAsVideoRef(generatedImage)}
                        onOpenFullscreen={() => handleOpenFullscreen(generatedImage)}
                      />
                    </div>
                  </div>
                )}`;

// We replace the buttons div block with the new one.
const oldButtons = `                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 flex-wrap">
                    <button 
                      onClick={() => handleEnhancePrompt(editPrompt, setEditPrompt)}
                      disabled={!editPrompt.trim() || isGenerating}
                      className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-medium text-zinc-300 transition-colors disabled:opacity-50 min-h-[38px] flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>Enhance Prompt</span>
                    </button>
                    
                    <button 
                      onClick={handleGenerateEditVariation}
                      disabled={!editPrompt.trim() || isGenerating}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-lg shadow-purple-500/25 min-h-[40px] active:scale-95"
                    >
                      {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                      <span>Generate Variation</span>
                    </button>
                  </div>
                </div>`;

content = content.replace(oldButtons, beforeAfterBlock);

fs.writeFileSync(file, content);
