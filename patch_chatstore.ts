import fs from "fs";
const file = "src/store/chatStore.ts";
let content = fs.readFileSync(file, "utf8");

content = content.replace(
  "timestamp: number;\n}",
  "timestamp: number;\n  toolCall?: { toolId: string; toolName: string; status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'; result?: string; error?: string; };\n}"
);

content = content.replace(
  "updateMessageStream: (conversationId: string, messageId: string, chunk: string) => void;",
  "updateMessageStream: (conversationId: string, messageId: string, chunk: string) => void;\n  updateToolCall: (conversationId: string, messageId: string, updates: Partial<NonNullable<Message['toolCall']>>) => void;"
);

content = content.replace(
  "deleteConversation: (conversationId: string) => void;",
  "deleteConversation: (conversationId: string) => void;\n      updateToolCall: (conversationId, messageId, updates) => set((state) => ({\n        conversations: state.conversations.map(c => \n          c.id === conversationId \n            ? {\n                ...c,\n                messages: c.messages.map(m => \n                  m.id === messageId \n                    ? { ...m, toolCall: m.toolCall ? { ...m.toolCall, ...updates } : undefined }\n                    : m\n                ),\n                updatedAt: Date.now()\n              }\n            : c\n        )\n      })),\n      deleteConversation: (conversationId) => set((state) => ({"
);

fs.writeFileSync(file, content);
