import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  toolCall?: { toolId: string; toolName: string; status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'AWAITING_CONFIRMATION' | 'CANCELLED'; result?: string; error?: string; };
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  addMessage: (conversationId: string, message: Message) => void;
  createConversation: (title?: string) => string;
  setActiveConversation: (id: string) => void;
  updateMessageStream: (conversationId: string, messageId: string, chunk: string) => void;
  updateToolCall: (conversationId: string, messageId: string, updates: Partial<NonNullable<Message['toolCall']>>) => void;
  editUserMessageAndTruncate: (conversationId: string, messageId: string, newContent: string) => void;
  truncateAfterMessage: (conversationId: string, messageId: string) => void;
  deleteConversation: (conversationId: string) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      conversations: [],
      activeConversationId: null,
      createConversation: (title = 'New Conversation') => {
        const id = Date.now().toString();
        const newConv: Conversation = { id, title, messages: [], updatedAt: Date.now() };
        set((state) => ({
          conversations: [newConv, ...state.conversations],
          activeConversationId: id,
        }));
        return id;
      },
      setActiveConversation: (id) => set({ activeConversationId: id }),
      addMessage: (conversationId, message) => set((state) => ({
        conversations: state.conversations.map(c => 
          c.id === conversationId 
            ? { ...c, messages: [...c.messages, message], updatedAt: Date.now() }
            : c
        )
      })),
      updateMessageStream: (conversationId, messageId, chunk) => set((state) => ({
        conversations: state.conversations.map(c => 
          c.id === conversationId 
            ? {
                ...c,
                messages: c.messages.map(m => 
                  m.id === messageId 
                    ? { ...m, content: m.content + chunk }
                    : m
                ),
                updatedAt: Date.now()
              }
            : c
        )
      })),
      updateToolCall: (conversationId, messageId, updates) => set((state) => ({
        conversations: state.conversations.map(c => 
          c.id === conversationId 
            ? {
                ...c,
                messages: c.messages.map(m => 
                  m.id === messageId 
                    ? { ...m, toolCall: m.toolCall ? { ...m.toolCall, ...updates } : { ...updates } as any }
                    : m
                ),
                updatedAt: Date.now()
              }
            : c
        )
      })),
      editUserMessageAndTruncate: (conversationId, messageId, newContent) => set((state) => ({
        conversations: state.conversations.map(c => {
          if (c.id !== conversationId) return c;
          const idx = c.messages.findIndex(m => m.id === messageId);
          if (idx === -1) return c;
          const updated = [...c.messages.slice(0, idx + 1)];
          updated[idx] = { ...updated[idx], content: newContent, timestamp: Date.now() };
          return { ...c, messages: updated, updatedAt: Date.now() };
        })
      })),
      truncateAfterMessage: (conversationId, messageId) => set((state) => ({
        conversations: state.conversations.map(c => {
          if (c.id !== conversationId) return c;
          const idx = c.messages.findIndex(m => m.id === messageId);
          if (idx === -1) return c;
          return { ...c, messages: c.messages.slice(0, idx), updatedAt: Date.now() };
        })
      })),
      deleteConversation: (conversationId) => set((state) => ({
        conversations: state.conversations.filter(c => c.id !== conversationId),
        activeConversationId: state.activeConversationId === conversationId 
          ? (state.conversations.find(c => c.id !== conversationId)?.id || null)
          : state.activeConversationId
      }))
    }),
    {
      name: 'xkira-chat-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
