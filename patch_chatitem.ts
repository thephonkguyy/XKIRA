import fs from "fs";
const file = "src/components/chat/ChatMessageItem.tsx";
let content = fs.readFileSync(file, "utf8");

const renderFormattedContent = `
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
                 message.toolCall.status === 'FAILED' ? 'Failed' : 'Pending'}
              </span>
            </div>
          </div>
          
          {message.toolCall.status === 'COMPLETED' && message.toolCall.result && (
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 text-sm whitespace-pre-wrap font-mono overflow-x-auto">
              {message.toolCall.result}
            </div>
          )}
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
`;

content = content.replace(
  '  // Helper to render message content with formatted code blocks\n  const renderFormattedContent = (content: string) => {\n    if (!content) return null;',
  renderFormattedContent
);

fs.writeFileSync(file, content);
