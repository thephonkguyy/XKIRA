import fs from "fs";
const file = "src/components/chat/ChatMessageItem.tsx";
let content = fs.readFileSync(file, "utf8");

content = content.replace(
  '  onEditUserMessage: (messageId: string, newContent: string) => void;',
  '  onEditUserMessage: (messageId: string, newContent: string) => void;\n  onConfirmTool?: (messageId: string) => void;\n  onCancelTool?: (messageId: string) => void;'
);

content = content.replace(
  '  onEditUserMessage,\n  onRegenerate\n}: ChatMessageItemProps) => {',
  '  onEditUserMessage,\n  onRegenerate,\n  onConfirmTool,\n  onCancelTool\n}: ChatMessageItemProps) => {'
);

const toolCallRender = `
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
          
          {message.toolCall.status === 'COMPLETED' && message.toolCall.result && (
`;

content = content.replace(
  /              <span className="text-xs text-zinc-300 truncate">\s*\{message\.toolCall\.status === 'RUNNING' \? 'Running tool\.\.\.' : \s*message\.toolCall\.status === 'COMPLETED' \? 'Done' : \s*message\.toolCall\.status === 'FAILED' \? 'Failed' : 'Pending'\}\s*<\/span>\s*<\/div>\s*<\/div>\s*\{message\.toolCall\.status === 'COMPLETED' && message\.toolCall\.result && \(/,
  toolCallRender
);

fs.writeFileSync(file, content);
