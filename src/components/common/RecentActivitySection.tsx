import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Clock, 
  FolderKanban, 
  ImageIcon, 
  Video, 
  FileText, 
  MessageSquare, 
  Search, 
  Trash2, 
  Download, 
  Share2, 
  Maximize2, 
  ExternalLink,
  Sparkles,
  Play,
  Film,
  Music,
  ArrowRight,
  FileJson
} from "lucide-react";
import { useProjectStore } from "../../store/projectStore";
import { useChatStore } from "../../store/chatStore";
import { useJobStore } from "../../store/jobStore";
import { RecentItem, AssetType, XKIRAProject } from "../../types/project";
import { formatDistanceToNow } from "date-fns";
import { downloadMedia } from "../../utils/downloadService";
import { shareMedia } from "../../utils/shareService";
import { exportManifestJson } from "../../utils/manifestExportService";
import FullscreenMediaModal, { FullscreenMediaItem } from "../media/FullscreenMediaModal";
import DeletionSafetyModal from "../media/DeletionSafetyModal";
import ExportManifestModal from "../history/ExportManifestModal";

type FilterTab = "all" | "projects" | "images" | "videos" | "files" | "chats";

interface RecentActivitySectionProps {
  title?: string;
  subtitle?: string;
  maxItems?: number;
  className?: string;
}

export default function RecentActivitySection({
  title = "Recent Activity & Media",
  subtitle = "Everything you created, uploaded, and worked on",
  maxItems = 100,
  className = "",
}: RecentActivitySectionProps) {
  const navigate = useNavigate();
  const { recentItems, deleteRecentItem, touchRecentItem, checkAssetUsageInProjects, projects, setActiveProject } = useProjectStore();
  const { conversations, deleteConversation, setActiveConversation } = useChatStore();
  const { jobs, removeJob } = useJobStore();

  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [fullscreenMedia, setFullscreenMedia] = useState<FullscreenMediaItem | null>(null);

  // Export Manifest Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Deletion Safety Modal State
  const [deleteTarget, setDeleteTarget] = useState<RecentItem | null>(null);
  const [referencedProjects, setReferencedProjects] = useState<XKIRAProject[]>([]);

  const handleExportSingleItemManifest = (item: RecentItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.type === 'project' && item.projectId) {
      exportManifestJson({ singleProjectId: item.projectId });
    } else {
      exportManifestJson({ singleItemId: item.itemId });
    }
  };

  // Aggregate jobs into recents if not already present
  const allJobs = Object.values(jobs).sort((a, b) => b.createdAt - a.createdAt);

  // Combine recents registry and jobs into a single deduplicated feed
  const combinedItems: RecentItem[] = [...recentItems];

  // Add jobs to recents if missing
  allJobs.forEach(j => {
    if (j.resultUrl && !combinedItems.some(r => r.itemId === j.jobId || r.remoteReference === j.resultUrl)) {
      combinedItems.push({
        itemId: j.jobId,
        type: j.type === 'video' ? 'video' : j.type === 'image' ? 'image' : 'file',
        title: j.prompt.substring(0, 40) + '...',
        thumbnail: j.resultUrl,
        createdAt: j.createdAt,
        updatedAt: j.updatedAt,
        lastOpenedAt: j.updatedAt,
        status: j.status === 'COMPLETED' ? 'COMPLETED' : j.status === 'FAILED' ? 'FAILED' : 'PROCESSING',
        tool: j.tool,
        prompt: j.prompt,
        model: j.model,
        remoteReference: j.resultUrl,
      });
    }
  });

  // Add chats to recents if missing
  conversations.forEach(c => {
    if (!combinedItems.some(r => r.itemId === c.id)) {
      combinedItems.push({
        itemId: c.id,
        type: 'chat',
        title: c.title,
        createdAt: c.updatedAt,
        updatedAt: c.updatedAt,
        lastOpenedAt: c.updatedAt,
        status: 'COMPLETED',
        tool: 'AI Chat',
        prompt: c.messages[c.messages.length - 1]?.content,
      });
    }
  });

  // Sort by lastOpenedAt descending
  combinedItems.sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);

  // Filter items
  const filteredItems = combinedItems.filter(item => {
    // Filter tab check
    if (activeTab === "projects" && item.type !== "project") return false;
    if (activeTab === "images" && item.type !== "image") return false;
    if (activeTab === "videos" && item.type !== "video") return false;
    if (activeTab === "files" && item.type !== "file") return false;
    if (activeTab === "chats" && item.type !== "chat") return false;

    // Search query check
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      (item.prompt && item.prompt.toLowerCase().includes(q)) ||
      (item.tool && item.tool.toLowerCase().includes(q)) ||
      (item.model && item.model.toLowerCase().includes(q))
    );
  }).slice(0, maxItems);

  const handleOpenItem = (item: RecentItem) => {
    touchRecentItem(item.itemId);

    if (item.type === 'project' && item.projectId) {
      const proj = projects[item.projectId];
      if (proj) {
        setActiveProject(proj.tool, proj.projectId);
        if (proj.type === 'video' || proj.type === 'story' || proj.type === 'long-form-video') {
          navigate('/video-studio');
        } else if (proj.type === 'image') {
          navigate('/image-studio');
        } else if (proj.type === 'chat') {
          navigate('/chat');
        } else {
          navigate('/video-studio');
        }
        return;
      }
    }

    if (item.type === 'chat') {
      setActiveConversation(item.itemId);
      navigate('/chat');
      return;
    }

    if (item.type === 'image') {
      setFullscreenMedia({
        title: item.title,
        type: 'image',
        url: item.remoteReference || item.thumbnail || '',
        prompt: item.prompt,
        tool: item.tool,
        model: item.model
      });
      return;
    }

    if (item.type === 'video') {
      setFullscreenMedia({
        title: item.title,
        type: 'video',
        url: item.remoteReference || item.thumbnail || '',
        prompt: item.prompt,
        tool: item.tool,
        model: item.model
      });
      return;
    }
  };

  const handleUseAsReference = (item: RecentItem, targetTool: 'image' | 'video') => {
    const mediaUrl = item.remoteReference || item.thumbnail;
    if (!mediaUrl) return;

    if (targetTool === 'video') {
      navigate(`/video-studio?refImage=${encodeURIComponent(mediaUrl)}&prompt=${encodeURIComponent(item.prompt || item.title)}`);
    } else {
      navigate(`/image-studio?refImage=${encodeURIComponent(mediaUrl)}&prompt=${encodeURIComponent(item.prompt || item.title)}`);
    }
  };

  const handleDeleteRequest = (item: RecentItem) => {
    const assetUrl = item.remoteReference || item.thumbnail || '';
    const refs = checkAssetUsageInProjects(assetUrl);
    setReferencedProjects(refs);
    setDeleteTarget(item);
  };

  const handleConfirmDelete = (mode: 'everywhere' | 'project-only') => {
    if (!deleteTarget) return;

    deleteRecentItem(deleteTarget.itemId);

    if (deleteTarget.type === 'chat') {
      deleteConversation(deleteTarget.itemId);
    } else {
      removeJob(deleteTarget.itemId);
    }

    setDeleteTarget(null);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      
      {/* Header & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-800/80">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
          <p className="text-xs text-zinc-400">{subtitle}</p>
        </div>

        {/* Search & Export Manifest Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects, prompts, files..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-1.5 pl-9 pr-3 text-xs text-white placeholder-zinc-500 outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/30 text-indigo-300 hover:text-white text-xs font-semibold transition-all whitespace-nowrap shadow-sm hover:shadow-indigo-500/20"
            title="Export past AI-generated media projects & history as a JSON manifest file"
          >
            <FileJson className="w-3.5 h-3.5 text-indigo-400 hover:text-white" />
            <span>Export Manifest (JSON)</span>
          </button>
        </div>
      </div>

      {/* Tabs / Filter Row */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {[
          { id: "all", label: "All Items", icon: Clock },
          { id: "projects", label: "Projects", icon: FolderKanban },
          { id: "images", label: "Images", icon: ImageIcon },
          { id: "videos", label: "Videos", icon: Video },
          { id: "files", label: "Files", icon: FileText },
          { id: "chats", label: "Chats", icon: MessageSquare },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as FilterTab)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800/80"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Items Feed Grid */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredItems.map(item => {
            const mediaUrl = item.remoteReference || item.thumbnail;
            const isVideo = item.type === 'video';
            const isImage = item.type === 'image';

            return (
              <div
                key={item.itemId}
                className="group bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700/80 rounded-2xl p-3.5 transition-all shadow-md hover:shadow-xl flex flex-col justify-between gap-3 relative"
              >
                {/* Media Preview or Icon Header */}
                {mediaUrl && (isImage || isVideo) ? (
                  <div 
                    onClick={() => handleOpenItem(item)}
                    className="aspect-video w-full bg-zinc-950 rounded-xl overflow-hidden relative cursor-pointer group-hover:brightness-105 transition-all border border-zinc-800/80"
                  >
                    {isVideo ? (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-950 relative">
                        <video src={mediaUrl} className="w-full h-full object-cover" muted preload="metadata" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-all">
                          <div className="p-2.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-lg">
                            <Play className="w-4 h-4 fill-white" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <img src={mediaUrl} alt={item.title} className="w-full h-full object-cover" />
                    )}

                    {/* Tool Badge overlay */}
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-semibold text-white">
                      {item.tool}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                        {item.type === 'project' ? <FolderKanban className="w-4 h-4" /> : item.type === 'chat' ? <MessageSquare className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                      </div>
                      <span className="text-xs font-semibold text-white">{item.tool}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">
                      {item.type.toUpperCase()}
                    </span>
                  </div>
                )}

                {/* Title & Prompt Details */}
                <div className="space-y-1">
                  <h4 
                    onClick={() => handleOpenItem(item)}
                    className="text-xs font-bold text-white hover:text-indigo-300 cursor-pointer truncate"
                  >
                    {item.title}
                  </h4>
                  {item.prompt && (
                    <p className="text-[11px] text-zinc-400 line-clamp-2 italic leading-relaxed">
                      "{item.prompt}"
                    </p>
                  )}
                  <p className="text-[10px] text-zinc-500 font-mono">
                    {formatDistanceToNow(item.lastOpenedAt || item.updatedAt, { addSuffix: true })}
                  </p>
                </div>

                {/* Action Toolbar */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 gap-1">
                  <button
                    onClick={() => handleOpenItem(item)}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-[11px] font-bold transition-all flex items-center gap-1"
                  >
                    <span>Open</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>

                  <div className="flex items-center gap-1">
                    {/* Use as Video Reference */}
                    {mediaUrl && (
                      <button
                        onClick={() => handleUseAsReference(item, 'video')}
                        className="p-1.5 text-zinc-400 hover:text-emerald-400 rounded-lg hover:bg-zinc-800"
                        title="Use in Video Studio"
                      >
                        <Video className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Download */}
                    {mediaUrl && (
                      <button
                        onClick={() => downloadMedia({
                          url: mediaUrl,
                          fileType: isVideo ? 'video' : 'image',
                          extension: isVideo ? 'mp4' : 'png',
                          prompt: item.prompt || item.title
                        })}
                        className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
                        title="Download Media File"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Export Single Item Manifest JSON */}
                    <button
                      onClick={(e) => handleExportSingleItemManifest(item, e)}
                      className="p-1.5 text-zinc-400 hover:text-indigo-300 rounded-lg hover:bg-zinc-800"
                      title="Export Item JSON Manifest"
                    >
                      <FileJson className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteRequest(item)}
                      className="p-1.5 text-zinc-400 hover:text-red-400 rounded-lg hover:bg-zinc-800"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-12 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl text-center space-y-2">
          <Clock className="w-8 h-8 text-zinc-600 mx-auto" />
          <p className="text-xs text-zinc-400">No recent activity or media found.</p>
        </div>
      )}

      {/* Fullscreen Media Viewer */}
      {fullscreenMedia && (
        <FullscreenMediaModal
          media={fullscreenMedia}
          isOpen={!!fullscreenMedia}
          onClose={() => setFullscreenMedia(null)}
        />
      )}

      {/* Deletion Safety Modal */}
      {deleteTarget && (
        <DeletionSafetyModal
          isOpen={!!deleteTarget}
          assetTitle={deleteTarget.title}
          referencedProjects={referencedProjects}
          onConfirmDelete={handleConfirmDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      {/* Export Manifest JSON Modal */}
      <ExportManifestModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        defaultFilterType={activeTab}
        searchQuery={search}
      />

    </div>
  );
}
