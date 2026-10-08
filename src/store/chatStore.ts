import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  attachmentIds?: string[]; // References to IndexedDB files
  toolCall?: { 
    toolId: string; 
    toolName: string; 
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'AWAITING_CONFIRMATION' | 'CANCELLED'; 
    result?: string; 
    error?: string; 
  };
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
  isPinned?: boolean;
  isArchived?: boolean;
  folderId?: string | null;
}

export interface Folder {
  id: string;
  name: string;
  createdAt: number;
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  folders: Folder[];
  searchQuery: string;
  currentComposerAttachmentIds: string[]; // Files currently attached to message box

  // Conversation operations
  addMessage: (conversationId: string, message: Message) => void;
  createConversation: (title?: string) => string;
  setActiveConversation: (id: string) => void;
  updateMessageStream: (conversationId: string, messageId: string, chunk: string) => void;
  updateToolCall: (conversationId: string, messageId: string, updates: Partial<NonNullable<Message['toolCall']>>) => void;
  editUserMessageAndTruncate: (conversationId: string, messageId: string, newContent: string) => void;
  truncateAfterMessage: (conversationId: string, messageId: string) => void;
  deleteConversation: (conversationId: string) => void;
  renameConversation: (conversationId: string, title: string) => void;
  clearConversationMessages: (conversationId: string) => void;

  // Pin & Archive
  pinConversation: (conversationId: string) => void;
  unpinConversation: (conversationId: string) => void;
  archiveConversation: (conversationId: string) => void;
  unarchiveConversation: (conversationId: string) => void;
  moveConversationToFolder: (conversationId: string, folderId: string | null) => void;

  // Folder Operations
  createFolder: (name: string) => void;
  renameFolder: (folderId: string, name: string) => void;
  deleteFolder: (folderId: string) => void;

  // Filters & Composer attachments
  setSearchQuery: (query: string) => void;
  addAttachmentToComposer: (fileId: string) => void;
  removeAttachmentFromComposer: (fileId: string) => void;
  clearComposerAttachments: () => void;

  // Export/Import
  exportConversations: () => string;
  importConversations: (jsonStr: string) => boolean;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeConversationId: null,
      folders: [],
      searchQuery: '',
      currentComposerAttachmentIds: [],

      createFolder: (name) => {
        const id = 'folder_' + Date.now().toString();
        const newFolder: Folder = { id, name, createdAt: Date.now() };
        set((state) => ({ folders: [...state.folders, newFolder] }));
      },

      renameFolder: (id, name) => set((state) => ({
        folders: state.folders.map(f => f.id === id ? { ...f, name } : f)
      })),

      deleteFolder: (id) => set((state) => ({
        folders: state.folders.filter(f => f.id !== id),
        // Reset conversations inside deleted folder to root
        conversations: state.conversations.map(c => c.folderId === id ? { ...c, folderId: null } : c)
      })),

      pinConversation: (id) => set((state) => ({
        conversations: state.conversations.map(c => c.id === id ? { ...c, isPinned: true } : c)
      })),

      unpinConversation: (id) => set((state) => ({
        conversations: state.conversations.map(c => c.id === id ? { ...c, isPinned: false } : c)
      })),

      archiveConversation: (id) => set((state) => ({
        conversations: state.conversations.map(c => c.id === id ? { ...c, isArchived: true, isPinned: false } : c)
      })),

      unarchiveConversation: (id) => set((state) => ({
        conversations: state.conversations.map(c => c.id === id ? { ...c, isArchived: false } : c)
      })),

      moveConversationToFolder: (id, folderId) => set((state) => ({
        conversations: state.conversations.map(c => c.id === id ? { ...c, folderId } : c)
      })),

      renameConversation: (id, title) => set((state) => ({
        conversations: state.conversations.map(c => c.id === id ? { ...c, title } : c)
      })),

      clearConversationMessages: (id) => set((state) => ({
        conversations: state.conversations.map(c => c.id === id ? { ...c, messages: [], updatedAt: Date.now() } : c)
      })),

      createConversation: (title = 'New Conversation') => {
        const id = Date.now().toString();
        const newConv: Conversation = { 
          id, 
          title, 
          messages: [], 
          updatedAt: Date.now(),
          isPinned: false,
          isArchived: false,
          folderId: null
        };
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
      })),

      setSearchQuery: (query) => set({ searchQuery: query }),

      addAttachmentToComposer: (fileId) => set((state) => ({
        currentComposerAttachmentIds: [...state.currentComposerAttachmentIds.filter(id => id !== fileId), fileId]
      })),

      removeAttachmentFromComposer: (fileId) => set((state) => ({
        currentComposerAttachmentIds: state.currentComposerAttachmentIds.filter(id => id !== fileId)
      })),

      clearComposerAttachments: () => set({ currentComposerAttachmentIds: [] }),

      exportConversations: () => {
        const state = get();
        const data = {
          conversations: state.conversations,
          folders: state.folders,
        };
        return JSON.stringify(data, null, 2);
      },

      importConversations: (jsonStr) => {
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed && (Array.isArray(parsed.conversations) || Array.isArray(parsed.folders))) {
            set((state) => ({
              conversations: Array.isArray(parsed.conversations) 
                ? [...parsed.conversations, ...state.conversations.filter(c => !parsed.conversations.some((pc: any) => pc.id === c.id))]
                : state.conversations,
              folders: Array.isArray(parsed.folders)
                ? [...parsed.folders, ...state.folders.filter(f => !parsed.folders.some((pf: any) => pf.id === f.id))]
                : state.folders
            }));
            return true;
          }
          return false;
        } catch (e) {
          console.error("Failed to import conversations", e);
          return false;
        }
      }
    }),
    {
      name: 'xkira-chat-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
