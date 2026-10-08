/**
 * Universal XKIRA AI Media Manifest Export Service
 * Generates structured, schema-compliant JSON manifest archives of past AI-generated media projects,
 * scenes, prompts, jobs, media assets, and chat histories for local archiving.
 */

import { useProjectStore } from "../store/projectStore";
import { useVideoStudioStore } from "../store/videoStudioStore";
import { useChatStore } from "../store/chatStore";
import { useJobStore } from "../store/jobStore";
import { continuityEngine } from "../core/video";
import { getDateString, getTimeString } from "./downloadService";
import { RecentItem, XKIRAProject } from "../types/project";
import { VideoProject } from "../types/videoStudio";

export interface MediaManifestSummary {
  totalProjectsCount: number;
  totalMediaItemsCount: number;
  totalVideoProjectsCount: number;
  totalImageProjectsCount: number;
  totalChatsCount: number;
  totalJobsCount: number;
}

export interface MediaManifest {
  manifestVersion: string;
  exportDate: string;
  exportedBy: string;
  appMetadata: {
    name: string;
    version: string;
    engine: string;
    description: string;
  };
  summary: MediaManifestSummary;
  projects: Array<XKIRAProject | VideoProject | any>;
  mediaItems: RecentItem[];
  jobs: any[];
  conversations?: any[];
  continuityCheckpoints?: Record<string, any[]>;
}

export interface ExportManifestOptions {
  includeProjects?: boolean;
  includeMediaJobs?: boolean;
  includeChats?: boolean;
  includeContinuity?: boolean;
  filterType?: "all" | "projects" | "images" | "videos" | "files" | "chats";
  searchQuery?: string;
  singleProjectId?: string;
  singleItemId?: string;
  prettyPrint?: boolean;
  customFileName?: string;
}

/**
 * Builds the MediaManifest object based on export options
 */
export function buildMediaManifest(options: ExportManifestOptions = {}): MediaManifest {
  const {
    includeProjects = true,
    includeMediaJobs = true,
    includeChats = true,
    includeContinuity = true,
    filterType = "all",
    searchQuery = "",
    singleProjectId,
    singleItemId,
  } = options;

  const projectState = useProjectStore.getState();
  const videoState = useVideoStudioStore.getState();
  const chatState = useChatStore.getState();
  const jobState = useJobStore.getState();

  // 1. Gather all projects
  let projectList: any[] = [];
  if (includeProjects && filterType !== "images" && filterType !== "files" && filterType !== "chats") {
    // XKIRA General Projects
    const generalProjects = Object.values(projectState.projects);
    // Video Studio Projects
    const videoProjects = videoState.savedProjects || [];
    if (videoState.currentProject && !videoProjects.some(p => p.id === videoState.currentProject?.id)) {
      videoProjects.push(videoState.currentProject);
    }

    projectList = [...generalProjects, ...videoProjects];

    // Single Project filter
    if (singleProjectId) {
      projectList = projectList.filter(
        (p) => p.projectId === singleProjectId || p.id === singleProjectId
      );
    }

    // Filter by type
    if (filterType === "videos") {
      projectList = projectList.filter(
        (p) => p.type === "video" || p.type === "story" || p.type === "long-form-video" || p.mode
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      projectList = projectList.filter(
        (p) =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.title && p.title.toLowerCase().includes(q)) ||
          (p.prompt && p.prompt.toLowerCase().includes(q)) ||
          (p.script && p.script.toLowerCase().includes(q))
      );
    }
  }

  // 2. Gather Media Recent Items
  let mediaList: RecentItem[] = [];
  if (includeMediaJobs && filterType !== "chats" && filterType !== "projects") {
    mediaList = [...projectState.recentItems];

    if (singleItemId) {
      mediaList = mediaList.filter((m) => m.itemId === singleItemId);
    }

    if (filterType === "images") {
      mediaList = mediaList.filter((m) => m.type === "image");
    } else if (filterType === "videos") {
      mediaList = mediaList.filter((m) => m.type === "video");
    } else if (filterType === "files") {
      mediaList = mediaList.filter((m) => m.type === "file");
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      mediaList = mediaList.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          (m.prompt && m.prompt.toLowerCase().includes(q)) ||
          (m.tool && m.tool.toLowerCase().includes(q))
      );
    }
  }

  // 3. Gather Jobs
  let jobsList: any[] = [];
  if (includeMediaJobs && filterType !== "chats" && filterType !== "projects") {
    jobsList = Object.values(jobState.jobs);

    if (singleItemId) {
      jobsList = jobsList.filter((j) => j.jobId === singleItemId);
    }

    if (filterType === "images") {
      jobsList = jobsList.filter((j) => j.type === "image");
    } else if (filterType === "videos") {
      jobsList = jobsList.filter((j) => j.type === "video");
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      jobsList = jobsList.filter(
        (j) =>
          (j.prompt && j.prompt.toLowerCase().includes(q)) ||
          (j.tool && j.tool.toLowerCase().includes(q)) ||
          (j.model && j.model.toLowerCase().includes(q))
      );
    }
  }

  // 4. Gather Conversations
  let conversationsList: any[] = [];
  if (includeChats && (filterType === "all" || filterType === "chats")) {
    conversationsList = chatState.conversations || [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      conversationsList = conversationsList.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.messages?.some((m: any) => m.content && m.content.toLowerCase().includes(q))
      );
    }
  }

  // 5. Gather Inter-scene Continuity Checkpoints
  const continuityMap: Record<string, any[]> = {};
  if (includeContinuity && projectList.length > 0) {
    projectList.forEach((p) => {
      const pId = p.projectId || p.id;
      if (pId) {
        const cps = continuityEngine.getProjectCheckpoints(pId);
        if (cps && cps.length > 0) {
          continuityMap[pId] = cps;
        }
      }
    });
  }

  // 6. Calculate Summary
  const videoCount = projectList.filter((p) => p.type === "video" || p.type === "story" || p.mode).length +
    mediaList.filter((m) => m.type === "video").length;
  const imageCount = projectList.filter((p) => p.type === "image").length +
    mediaList.filter((m) => m.type === "image").length;

  const manifest: MediaManifest = {
    manifestVersion: "1.0.0",
    exportDate: new Date().toISOString(),
    exportedBy: "XKIRA AI Studio User",
    appMetadata: {
      name: "XKIRA AI Studio",
      version: "2.5.0",
      engine: "Agnes-2.5-Flash & Cinematic Intelligence Engine",
      description: "Complete AI-generated media projects, shot scripts, scenes, jobs, and chat history archive manifest.",
    },
    summary: {
      totalProjectsCount: projectList.length,
      totalMediaItemsCount: mediaList.length,
      totalVideoProjectsCount: videoCount,
      totalImageProjectsCount: imageCount,
      totalChatsCount: conversationsList.length,
      totalJobsCount: jobsList.length,
    },
    projects: projectList,
    mediaItems: mediaList,
    jobs: jobsList,
  };

  if (includeChats) {
    manifest.conversations = conversationsList;
  }

  if (includeContinuity && Object.keys(continuityMap).length > 0) {
    manifest.continuityCheckpoints = continuityMap;
  }

  return manifest;
}

/**
 * Triggers a download of the JSON manifest file in browser
 */
export function exportManifestJson(
  options: ExportManifestOptions = {}
): { ok: boolean; filename: string; manifest: MediaManifest; error?: string } {
  try {
    const manifest = buildMediaManifest(options);
    const pretty = options.prettyPrint !== false;
    const jsonStr = JSON.stringify(manifest, null, pretty ? 2 : undefined);

    let filename = options.customFileName;
    if (!filename) {
      if (options.singleProjectId) {
        const proj = manifest.projects[0];
        const projName = (proj?.name || proj?.title || "Project").replace(/[^a-zA-Z0-9_-]/g, "_");
        filename = `XKIRA_Project_${projName}_Manifest_${getDateString()}.json`;
      } else if (options.singleItemId) {
        const item = manifest.mediaItems[0] || manifest.jobs[0];
        const title = (item?.title || item?.prompt || "Item").substring(0, 20).replace(/[^a-zA-Z0-9_-]/g, "_");
        filename = `XKIRA_Media_${title}_Manifest_${getDateString()}.json`;
      } else if (options.filterType && options.filterType !== "all") {
        filename = `XKIRA_${options.filterType.toUpperCase()}_Manifest_${getDateString()}_${getTimeString()}.json`;
      } else {
        filename = `XKIRA_Media_Manifest_${getDateString()}_${getTimeString()}.json`;
      }
    }

    // Trigger browser blob download
    const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });
    const link = document.createElement("a");
    const objectUrl = URL.createObjectURL(blob);
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    }, 1000);

    return { ok: true, filename, manifest };
  } catch (err: any) {
    console.error("[ManifestExport] Export failed:", err);
    return {
      ok: false,
      filename: "",
      manifest: null as any,
      error: err.message || "Failed to generate manifest JSON file.",
    };
  }
}

/**
 * Validates and parses an imported JSON manifest file
 */
export function importManifestJson(jsonString: string): {
  ok: boolean;
  importedProjectsCount: number;
  importedMediaCount: number;
  error?: string;
} {
  try {
    const data = JSON.parse(jsonString);
    if (!data || (typeof data !== "object")) {
      return { ok: false, importedProjectsCount: 0, importedMediaCount: 0, error: "Invalid JSON object." };
    }

    let projectsCount = 0;
    let mediaCount = 0;

    const projectStore = useProjectStore.getState();
    const videoStore = useVideoStudioStore.getState();

    // Import projects array
    if (Array.isArray(data.projects)) {
      data.projects.forEach((proj: any) => {
        if (proj.projectId || proj.id) {
          if (proj.mode || proj.scenes) {
            // Add to video studio saved projects
            const existing = videoStore.savedProjects.find((p) => p.id === proj.id);
            if (!existing) {
              videoStore.loadProject(proj.id);
            }
          } else {
            projectStore.importProjectJson(JSON.stringify(proj));
          }
          projectsCount++;
        }
      });
    } else if (data.projectId || data.id) {
      // Single project file
      if (data.mode || data.scenes) {
        const existing = videoStore.savedProjects.find((p) => p.id === data.id);
        if (!existing) {
          videoStore.loadProject(data.id);
        }
      } else {
        projectStore.importProjectJson(JSON.stringify(data));
      }
      projectsCount++;
    }

    // Import recent items array
    if (Array.isArray(data.mediaItems)) {
      data.mediaItems.forEach((item: RecentItem) => {
        if (item.itemId && item.title) {
          projectStore.addRecentItem(item);
          mediaCount++;
        }
      });
    }

    return { ok: true, importedProjectsCount: projectsCount, importedMediaCount: mediaCount };
  } catch (err: any) {
    return { ok: false, importedProjectsCount: 0, importedMediaCount: 0, error: err.message || "Failed to parse JSON file." };
  }
}
