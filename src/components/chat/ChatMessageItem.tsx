import React, { useState, useEffect } from "react";
import { 
  Copy, 
  Check, 
  Edit3, 
  RotateCw, 
  Share2, 
  CheckCheck,
  Code2,
  Sparkles,
  AlertCircle,
  FileText
} from "lucide-react";
import { Message } from "../../store/chatStore";
import { shareMedia } from "../../utils/shareService";
import { IndexedDBManager, AttachmentFile } from "../../utils/indexedDb";

export interface ChatMessageItemProps {
  key?: React.Key;
  message: Message;
  isLastAssistant: boolean;
  isGenerating: boolean;
  onEditUserMessage: (messageId: string, newContent: string) => void;
  onConfirmTool?: (messageId: string) => void;
  onCancelTool?: (messageId: string) => void;
  onRegenerate: () => void;
}

export default function ChatMessageItem({
  message,
  isLastAssistant,
  isGenerating,
  onEditUserMessage,
  onRegenerate,
  onConfirmTool,
  onCancelTool
}: ChatMessageItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [copied, setCopied] = useState(false);
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [msgFiles, setMsgFiles] = useState<AttachmentFile[]>([]);

  useEffect(() => {
    if (message.attachmentIds && message.attachmentIds.length > 0) {
      const fetchFiles = async () => {
        const loaded: AttachmentFile[] = [];
        for (const id of message.attachmentIds!) {
          try {
            const f = await IndexedDBManager.getFile(id);
            if (f) loaded.push(f);
          } catch (e) {
            console.error("Failed to load message attachment:", id, e);
          }
        }
        setMsgFiles(loaded);
      };
      fetchFiles();
    }
  }, [message.attachmentIds]);

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn("Failed to copy message", e);
    }
  };

  const handleCopyCodeBlock = async (code: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCodeIdx(idx);
      setTimeout(() => setCopiedCodeIdx(null), 2000);
    } catch (e) {
      console.warn("Failed to copy code block", e);
    }
  };

  const handleShareMessage = async () => {
    const res = await shareMedia({
      title: "XKIRA Chat Response",
      text: message.content,
    });
    if (!res.cancelled) {
      setShareFeedback(res.message);
      setTimeout(() => setShareFeedback(null), 2500);
    }
  };

  const handleSaveEdit = () => {
    if (!editContent.trim()) return;
    setIsEditing(false);
    onEditUserMessage(message.id, editContent.trim());
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(message.content);
  };


  const renderFormattedContent = (content: string) => {
    // If there is a tool call, render its UI instead of or in addition to content
    if (message.toolCall) {
      return (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 p-2.5 bg-zinc-950/50 rounded-xl border border-indigo-500/30 w-full max-w-sm">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0 animate-pulse">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[11px] text-indigo-300 font-semibold uppercase tracking-wider truncate">✨ {message.toolCall.toolName}</span>

              <span className="text-xs text-zinc-300 truncate">
                {message.toolCall.status === 'RUNNING' ? 'Running tool...' : 
                 message.toolCall.status === 'COMPLETED' ? 'Done' : 
                 message.toolCall.status === 'FAILED' ? 'Failed' : 
                 message.toolCall.status === 'AWAITING_CONFIRMATION' ? 'Requires Confirmation' : 'Pending'}
              </span>
            </div>
          </div>
          
          {message.toolCall.status === 'AWAITING_CONFIRMATION' && (
            <div className="p-4 bg-zinc-900 border border-indigo-500/30 rounded-xl shadow-lg flex flex-col gap-3">
              <p className="text-xs text-zinc-300">This operation may take longer and use studio credits. Do you want to proceed?</p>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => onCancelTool?.(message.id)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => onConfirmTool?.(message.id)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-all active:scale-95"
                >
                  Confirm & Start
                </button>
              </div>
            </div>
          )}
          
          {message.toolCall.status === 'COMPLETED' && message.toolCall.result && (() => {
            const imgMatch = message.toolCall.result.match(/!\[.*?\]\((https?:\/\/[^\s)]+|data:image\/[^\s)]+)\)/);
            if (imgMatch) {
              const imgUrl = imgMatch[1];
              return (
                <div className="flex flex-col gap-2 my-2">
                  <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950/60 shadow-xl max-w-md">
                    <img src={imgUrl} alt="Generated Art" className="w-full h-auto object-cover max-h-96" />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <a href={imgUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                      Open full resolution
                    </a>
                  </div>
                </div>
              );
            }
            return (
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 text-sm whitespace-pre-wrap font-mono overflow-x-auto">
                {message.toolCall.result}
              </div>
            );
          })()}
          {message.toolCall.status === 'FAILED' && message.toolCall.error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{message.toolCall.error}</span>
            </div>
          )}
        </div>
      );
    }

    if (!content) return null;


    // Check for markdown code fences ```lang ... ```
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let blockIndex = 0;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const precedingText = content.substring(lastIndex, match.index);
      if (precedingText) {
        parts.push(
          <span key={`text-${lastIndex}`} className="whitespace-pre-wrap">
            {precedingText}
          </span>
        );
      }

      const lang = match[1] || "code";
      const codeSnippet = match[2].replace(/\n$/, "");
      const currentBlockIdx = blockIndex++;

      parts.push(
        <div 
          key={`code-block-${currentBlockIdx}`}
          className="my-3 rounded-2xl overflow-hidden border border-zinc-700/80 bg-zinc-950 shadow-xl"
        >
          <div className="flex items-center justify-between px-3.5 py-1.5 bg-zinc-900 border-b border-zinc-800 text-[11px] font-mono text-zinc-400">
            <span className="uppercase font-semibold text-zinc-300">{lang}</span>
            <button
              onClick={() => handleCopyCodeBlock(codeSnippet, currentBlockIdx)}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
              title="Copy code"
            >
              {copiedCodeIdx === currentBlockIdx ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 text-[10px]">Copied ✓</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="text-[10px]">Copy Code</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-3.5 text-xs sm:text-[13px] font-mono text-zinc-100 overflow-x-auto leading-relaxed">
            <code>{codeSnippet}</code>
          </pre>
        </div>
      );

      lastIndex = match.index + match[0].length;
    }

    const remainingText = content.substring(lastIndex);
    if (remainingText) {
      parts.push(
        <span key={`text-end`} className="whitespace-pre-wrap">
          {remainingText}
        </span>
      );
    }

    return parts;
  };

  const isUser = message.role === "user";

  return (
    <div className={`flex gap-2.5 sm:gap-3.5 w-full ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(99,102,241,0.3)] mt-0.5">
          <span className="text-[10px] sm:text-xs font-bold text-white">X</span>
        </div>
      )}

      <div className={`flex flex-col gap-1 max-w-[90%] sm:max-w-[84%] min-w-0 ${isUser ? "items-end" : "items-start"}`}>
        <div className="flex items-center gap-2 px-1 text-[10px] sm:text-[11px] font-medium text-zinc-400">
          <span>{isUser ? "You" : "XKIRA"}</span>
        </div>

        {/* Message Bubble or Inline Editor */}
        {isEditing ? (
          <div className="w-full bg-zinc-900 border border-indigo-500/50 rounded-2xl p-3 flex flex-col gap-2 shadow-2xl">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full bg-transparent text-white text-xs sm:text-sm font-sans outline-none resize-none min-h-[70px]"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2 pt-1 border-t border-zinc-800">
              <button
                onClick={handleCancelEdit}
                className="px-3 py-1 text-xs text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editContent.trim()}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                Save & Resubmit
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`p-3.5 sm:p-4 text-xs sm:text-sm leading-relaxed break-anywhere rounded-2xl sm:rounded-3xl relative group transition-all ${
              isUser
                ? "bg-indigo-600 text-white rounded-br-sm shadow-md"
                : "bg-zinc-900/90 text-zinc-100 rounded-tl-sm border border-zinc-800 backdrop-blur-sm shadow-xl"
            }`}
          >
            {renderFormattedContent(message.content)}

            {/* Render message attachments if present */}
            {msgFiles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-white/5">
                {msgFiles.map(f => (
                  <div 
                    key={f.id} 
                    className="flex items-center gap-1 px-2 py-0.5 bg-black/40 border border-white/5 rounded-lg text-[10px] text-zinc-300 font-semibold"
                  >
                    <FileText className="w-3 h-3 text-indigo-400 shrink-0" />
                    <span className="truncate max-w-[120px]" title={f.name}>{f.name}</span>
                    <span className="text-[9px] text-zinc-500 font-medium shrink-0">({(f.size/1024).toFixed(0)}KB)</span>
                  </div>
                ))}
              </div>
            )}

            {/* Pulsing cursor while generating empty response */}
            {isGenerating && isLastAssistant && message.content === "" && (
              <span className="inline-block w-2 h-4 bg-indigo-400 animate-pulse ml-1 align-middle rounded-sm" />
            )}

            {/* Quick Hover / Touch Action Bar */}
            {message.content && !isGenerating && (
              <div
                className={`mt-2 pt-2 border-t flex items-center gap-2 flex-wrap text-xs ${
                  isUser ? "border-indigo-500/40 text-indigo-100" : "border-zinc-800 text-zinc-400"
                }`}
              >
                {/* Copy Text */}
                <button
                  onClick={handleCopyMessage}
                  className="flex items-center gap-1 hover:text-white px-2 py-1 rounded-md hover:bg-white/10 transition-colors"
                  title="Copy message text"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[10px] text-emerald-400 font-semibold">Copied ✓</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span className="text-[10px]">Copy</span>
                    </>
                  )}
                </button>

                {/* Edit (For User Message) */}
                {isUser && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1 hover:text-white px-2 py-1 rounded-md hover:bg-white/10 transition-colors"
                    title="Edit & Resubmit"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span className="text-[10px]">Edit</span>
                  </button>
                )}

                {/* Regenerate (For Assistant Message) */}
                {!isUser && (
                  <button
                    onClick={onRegenerate}
                    className="flex items-center gap-1 hover:text-white px-2 py-1 rounded-md hover:bg-white/10 transition-colors"
                    title="Regenerate response"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span className="text-[10px]">Regenerate</span>
                  </button>
                )}

                {/* Share */}
                <button
                  onClick={handleShareMessage}
                  className="flex items-center gap-1 hover:text-white px-2 py-1 rounded-md hover:bg-white/10 transition-colors"
                  title="Share message"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="text-[10px]">Share</span>
                </button>

                {shareFeedback && (
                  <span className="text-[10px] text-indigo-300 font-medium animate-fadeIn">
                    {shareFeedback}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
