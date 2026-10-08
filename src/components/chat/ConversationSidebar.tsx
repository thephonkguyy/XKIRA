import React, { useState } from "react";
import { 
  Plus, Pin, Folder, Archive, Trash2, Edit3, Check, X, 
  Search, Download, Upload, Eye, HelpCircle, ChevronRight, FolderPlus,
  MoreVertical, RefreshCw, FolderOpen, ChevronDown, Compass
} from "lucide-react";
import { useChatStore, Conversation, Folder as FolderType } from "../../store/chatStore";

interface ConversationSidebarProps {
  onClose?: () => void;
}

export default function ConversationSidebar({ onClose }: ConversationSidebarProps) {
  const {
    conversations,
    activeConversationId,
    folders,
    searchQuery,
    setSearchQuery,
    createConversation,
    setActiveConversation,
    renameConversation,
    deleteConversation,
    clearConversationMessages,
    pinConversation,
    unpinConversation,
    archiveConversation,
    unarchiveConversation,
    moveConversationToFolder,
    createFolder,
    renameFolder,
    deleteFolder,
    exportConversations,
    importConversations
  } = useChatStore();

  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");

  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingConvTitle, setEditingConvTitle] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [activeMenuConvId, setActiveMenuConvId] = useState<string | null>(null);

  // Search Filter logic
  const filteredConversations = conversations.filter(c => {
    if (c.isArchived) return false;
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.messages.some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const pinnedConversations = filteredConversations.filter(c => c.isPinned);
  const unpinnedConversations = filteredConversations.filter(c => !c.isPinned);

  // Group conversations by folders or Root
  const getConversationsInFolder = (folderId: string | null) => {
    return unpinnedConversations.filter(c => c.folderId === folderId);
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    createFolder(newFolderName.trim());
    setNewFolderName("");
    setIsCreatingFolder(false);
  };

  const startRenameFolder = (folder: FolderType, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFolderId(folder.id);
    setEditingFolderName(folder.name);
  };

  const handleSaveRenameFolder = (id: string) => {
    if (!editingFolderName.trim()) return;
    renameFolder(id, editingFolderName.trim());
    setEditingFolderId(null);
  };

  const startRenameConv = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingConvId(conv.id);
    setEditingConvTitle(conv.title);
    setActiveMenuConvId(null);
  };

  const handleSaveRenameConv = (id: string) => {
    if (!editingConvTitle.trim()) return;
    renameConversation(id, editingConvTitle.trim());
    setEditingConvId(null);
  };

  const handleExport = () => {
    try {
      const dataStr = exportConversations();
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `XKIRA_Conversations_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed", e);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      const success = importConversations(text);
      if (success) {
        alert("Conversations imported successfully!");
      } else {
        alert("Failed to import. Invalid backup file structure.");
      }
    };
    reader.readAsText(file);
  };

  const toggleFolderExpanded = (folderId: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  const renderConvItem = (conv: Conversation) => {
    const isActive = conv.id === activeConversationId;
    const isEditing = conv.id === editingConvId;

    return (
      <div
        key={conv.id}
        onClick={() => {
          setActiveConversation(conv.id);
          onClose?.();
        }}
        className={`group relative flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer select-none ${
          isActive 
            ? "bg-indigo-600/25 border border-indigo-500/30 text-white" 
            : "hover:bg-white/5 text-zinc-300 border border-transparent hover:text-white"
        }`}
      >
        <div className="flex-1 flex items-center gap-2 min-w-0">
          {conv.isPinned ? (
            <Pin className="w-3.5 h-3.5 text-indigo-400 shrink-0 rotate-45" />
          ) : (
            <FolderOpen className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          )}

          {isEditing ? (
            <input
              type="text"
              value={editingConvTitle}
              onChange={(e) => setEditingConvTitle(e.target.value)}
              onBlur={() => handleSaveRenameConv(conv.id)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveRenameConv(conv.id)}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-indigo-500/50 rounded px-1.5 py-0.5 text-xs text-white outline-none w-full font-sans"
              autoFocus
            />
          ) : (
            <span className="text-xs font-semibold truncate flex-1">
              {conv.title}
            </span>
          )}
        </div>

        {/* Action Menu Popover or Trigger */}
        {!isEditing && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenuConvId(activeMenuConvId === conv.id ? null : conv.id);
              }}
              className="p-1 text-zinc-400 hover:text-white rounded-md hover:bg-white/10"
              title="More Actions"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {/* Quick Popover Menu */}
            {activeMenuConvId === conv.id && (
              <div 
                className="absolute right-2 top-full mt-1 w-44 bg-zinc-900/95 border border-zinc-800 rounded-xl shadow-2xl z-50 py-1.5 backdrop-blur-md"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Pin/Unpin */}
                <button
                  onClick={() => {
                    conv.isPinned ? unpinConversation(conv.id) : pinConversation(conv.id);
                    setActiveMenuConvId(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs text-zinc-300 hover:bg-indigo-600 hover:text-white transition-colors"
                >
                  <Pin className="w-3.5 h-3.5" />
                  <span>{conv.isPinned ? "Unpin Chat" : "Pin Chat"}</span>
                </button>

                {/* Inline Rename */}
                <button
                  onClick={(e) => startRenameConv(conv, e)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs text-zinc-300 hover:bg-indigo-600 hover:text-white transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Rename</span>
                </button>

                {/* Move to Folder */}
                <div className="border-t border-zinc-800 my-1" />
                <div className="px-3 py-1 text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Move to Folder</div>
                <button
                  onClick={() => {
                    moveConversationToFolder(conv.id, null);
                    setActiveMenuConvId(null);
                  }}
                  className={`w-full flex items-center gap-2 px-3.5 py-1 text-left text-xs hover:bg-indigo-600 hover:text-white transition-colors ${!conv.folderId ? "text-indigo-400 font-bold" : "text-zinc-300"}`}
                >
                  <span>Root (No Folder)</span>
                </button>
                {folders.map(f => (
                  <button
                    key={f.id}
                    onClick={() => {
                      moveConversationToFolder(conv.id, f.id);
                      setActiveMenuConvId(null);
                    }}
                    className={`w-full flex items-center gap-2 px-3.5 py-1 text-left text-xs hover:bg-indigo-600 hover:text-white transition-colors ${conv.folderId === f.id ? "text-indigo-400 font-bold" : "text-zinc-300"}`}
                  >
                    <span>{f.name}</span>
                  </button>
                ))}

                <div className="border-t border-zinc-800 my-1" />

                {/* Clear messages */}
                <button
                  onClick={() => {
                    if (confirm("Are you sure you want to clear all messages in this conversation?")) {
                      clearConversationMessages(conv.id);
                    }
                    setActiveMenuConvId(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs text-zinc-400 hover:bg-indigo-600 hover:text-white transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Clear History</span>
                </button>

                {/* Archive */}
                <button
                  onClick={() => {
                    archiveConversation(conv.id);
                    setActiveMenuConvId(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs text-zinc-400 hover:bg-indigo-600 hover:text-white transition-colors"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Archive Chat</span>
                </button>

                {/* Delete */}
                <button
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this conversation?")) {
                      deleteConversation(conv.id);
                    }
                    setActiveMenuConvId(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs text-red-400 hover:bg-red-600 hover:text-white transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Chat</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col bg-zinc-950 border-r border-white/5">
      {/* Top Banner with Search */}
      <div className="p-4 border-b border-white/5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-white tracking-wider uppercase">XKIRA</span>
            <span className="text-[10px] bg-indigo-500/15 border border-indigo-500/20 text-indigo-300 font-semibold px-2 py-0.5 rounded-full">Core v3</span>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={handleExport}
              className="p-1.5 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-lg border border-white/5 transition-colors"
              title="Export Backups"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <label className="p-1.5 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-lg border border-white/5 transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <input type="file" accept=".json" className="hidden" onChange={handleImport} />
            </label>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search active chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 focus:border-indigo-500/50 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 outline-none transition-colors"
          />
        </div>
      </div>

      {/* Main List Scroller */}
      <div className="flex-1 overflow-y-auto p-3 no-scrollbar flex flex-col gap-5">
        {/* Pinned Chats */}
        {pinnedConversations.length > 0 && (
          <div>
            <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Pin className="w-3 h-3 text-indigo-400 shrink-0 rotate-45" />
              <span>Pinned Conversations</span>
            </h3>
            <div className="flex flex-col gap-1.5">
              {pinnedConversations.map(renderConvItem)}
            </div>
          </div>
        )}

        {/* Custom Folders Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
              <Folder className="w-3 h-3 text-indigo-400 shrink-0" />
              <span>Folders</span>
            </h3>
            <button
              onClick={() => setIsCreatingFolder(!isCreatingFolder)}
              className="p-1 text-zinc-500 hover:text-white rounded-md hover:bg-white/5"
              title="Add New Folder"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Folder Creator Input Box */}
          {isCreatingFolder && (
            <div className="flex items-center gap-1.5 p-1.5 bg-zinc-900/50 border border-zinc-800 rounded-xl mb-3">
              <input
                type="text"
                placeholder="Folder name..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="flex-1 bg-transparent border-none text-xs text-white outline-none pl-1"
                autoFocus
              />
              <button onClick={handleCreateFolder} className="p-1 bg-indigo-600 text-white rounded-md">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setIsCreatingFolder(false)} className="p-1 text-zinc-500 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Folders List */}
          <div className="flex flex-col gap-1.5">
            {folders.map(folder => {
              const isEditingFolder = folder.id === editingFolderId;
              const isExpanded = !!expandedFolders[folder.id];
              const folderConv = getConversationsInFolder(folder.id);

              return (
                <div key={folder.id} className="flex flex-col border border-white/[0.02] rounded-xl bg-white/[0.01] overflow-hidden">
                  <div
                    onClick={() => toggleFolderExpanded(folder.id)}
                    className="flex items-center justify-between p-2 hover:bg-white/5 rounded-xl cursor-pointer select-none group"
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      )}
                      <Folder className="w-3.5 h-3.5 text-indigo-400 shrink-0" />

                      {isEditingFolder ? (
                        <input
                          type="text"
                          value={editingFolderName}
                          onChange={(e) => setEditingFolderName(e.target.value)}
                          onBlur={() => handleSaveRenameFolder(folder.id)}
                          onKeyDown={(e) => e.key === "Enter" && handleSaveRenameFolder(folder.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-zinc-900 border border-indigo-500/50 rounded px-1 py-0.5 text-xs text-white outline-none w-full"
                          autoFocus
                        />
                      ) : (
                        <span className="text-xs font-semibold text-zinc-200 truncate flex-1">
                          {folder.name}
                          <span className="text-[10px] text-zinc-600 ml-1 font-semibold">({folderConv.length})</span>
                        </span>
                      )}
                    </div>

                    {!isEditingFolder && (
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => startRenameFolder(folder, e)}
                          className="p-1 text-zinc-500 hover:text-white"
                          title="Rename Folder"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete folder "${folder.name}"? Conversations will be moved to Root.`)) {
                              deleteFolder(folder.id);
                            }
                          }}
                          className="p-1 text-zinc-500 hover:text-red-400"
                          title="Delete Folder"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Children under Folders */}
                  {isExpanded && (
                    <div className="pl-3.5 pr-2.5 pb-2 pt-0.5 flex flex-col gap-1 border-t border-white/[0.02]">
                      {folderConv.length === 0 ? (
                        <div className="text-[10px] text-zinc-600 italic p-2 text-center select-none">
                          Empty folder. Drag or move chats here.
                        </div>
                      ) : (
                        folderConv.map(renderConvItem)
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Conversations list (Root Conversations - unpinned & not in folder) */}
        <div>
          <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Compass className="w-3 h-3 text-indigo-400 shrink-0" />
            <span>Root Conversations</span>
          </h3>
          <div className="flex flex-col gap-1.5">
            {getConversationsInFolder(null).map(renderConvItem)}
          </div>
        </div>
      </div>

      {/* Bottom Footer Actions */}
      <div className="p-4 border-t border-white/5 bg-zinc-950 flex flex-col gap-2 flex-shrink-0">
        <button
          onClick={() => createConversation()}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Conversation</span>
        </button>
      </div>
    </div>
  );
}
