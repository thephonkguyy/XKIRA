import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { XKIRAProject, RecentItem, ProjectType, ProjectVersion, ProjectFileRef } from '../types/project';
import { aiCore } from '../core/ai';

interface ProjectState {
  // All projects indexed by projectId
  projects: Record<string, XKIRAProject>;
  
  // Active project ID per tool/workflow type (e.g. { image: 'proj_1', video: 'proj_2' })
  activeProjectIds: Record<string, string | null>;
  
  // Overall global last opened project ID for instant auto-resume
  lastActiveProjectId: string | null;
  
  // Global Recent Items feed
  recentItems: RecentItem[];

  // Actions
  createProject: (type: ProjectType, tool: string, name?: string, initialData?: Partial<XKIRAProject>) => XKIRAProject;
  getActiveProject: (tool: string, type: ProjectType) => XKIRAProject | null;
  ensureActiveProject: (tool: string, type: ProjectType) => XKIRAProject;
  getOrCreateActiveProject: (tool: string, type: ProjectType) => XKIRAProject;
  saveProject: (projectId: string, updates: Partial<XKIRAProject>) => void;
  setActiveProject: (tool: string, projectId: string) => void;
  deleteProject: (projectId: string) => void;
  
  // Versions
  addProjectVersion: (projectId: string, version: Omit<ProjectVersion, 'versionId' | 'createdAt'>) => void;
  restoreProjectVersion: (projectId: string, versionId: string) => void;
  deleteProjectVersion: (projectId: string, versionId: string) => void;
  
  // Recents Management
  addRecentItem: (item: Omit<RecentItem, 'createdAt' | 'updatedAt' | 'lastOpenedAt'>) => void;
  updateRecentItem: (itemId: string, updates: Partial<RecentItem>) => void;
  deleteRecentItem: (itemId: string) => void;
  touchRecentItem: (itemId: string) => void;
  
  // Recent Files Management
  addRecentFile: (file: ProjectFileRef) => void;
  deleteRecentFile: (fileId: string) => void;
  
  // Deletion Safety Helper
  checkAssetUsageInProjects: (assetUrl: string) => XKIRAProject[];
  
  // Import / Export
  exportProjectJson: (projectId: string) => string | null;
  importProjectJson: (jsonStr: string) => XKIRAProject | null;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: {},
      activeProjectIds: {},
      lastActiveProjectId: null,
      recentItems: [],

      createProject: (type, tool, name, initialData = {}) => {
        const now = Date.now();
        const count = Object.values(get().projects).filter(p => p.type === type).length + 1;
        const defaultName = name || `${tool} Work #${count}`;
        const projectId = `proj_${type}_${now}_${Math.random().toString(36).substring(2, 7)}`;

        const newProject: XKIRAProject = {
          projectId,
          name: defaultName,
          type,
          tool,
          createdAt: now,
          updatedAt: now,
          lastOpenedAt: now,
          status: 'DRAFT',
          versions: [],
          referenceImages: [],
          referenceVideos: [],
          referenceAudio: [],
          referenceFiles: [],
          jobIds: [],
          ...initialData,
        };

        const newRecentItem: RecentItem = {
          itemId: projectId,
          type: 'project',
          title: newProject.name,
          status: newProject.status,
          projectId: projectId,
          tool: tool,
          prompt: newProject.prompt,
          model: newProject.selectedModel,
          createdAt: now,
          updatedAt: now,
          lastOpenedAt: now,
        };

        set((state) => ({
          projects: { ...state.projects, [projectId]: newProject },
          activeProjectIds: { ...state.activeProjectIds, [type]: projectId, [tool]: projectId },
          lastActiveProjectId: projectId,
          recentItems: [newRecentItem, ...state.recentItems.filter(r => r.itemId !== projectId)].slice(0, 200),
        }));

        return newProject;
      },

      // Pure getter - ZERO side effects during React component render
      getActiveProject: (tool, type) => {
        const state = get();
        const activeId = state.activeProjectIds[tool] || state.activeProjectIds[type];
        
        if (activeId && state.projects[activeId]) {
          return state.projects[activeId];
        }

        // Check if there are existing projects of this type
        const existing = Object.values(state.projects)
          .filter(p => p.type === type || p.tool === tool)
          .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);

        if (existing.length > 0) {
          return existing[0];
        }

        return null;
      },

      // Action to safely ensure active project exists (call inside useEffect or event handlers)
      ensureActiveProject: (tool, type) => {
        const active = get().getActiveProject(tool, type);
        if (active) return active;

        return get().createProject(type, tool);
      },

      getOrCreateActiveProject: (tool, type) => {
        const active = get().getActiveProject(tool, type);
        if (active) return active;

        return get().createProject(type, tool);
      },

      saveProject: (projectId, updates) => {
        set((state) => {
          const existing = state.projects[projectId];
          if (!existing) return state;

          // Check if anything actually changed
          let hasChange = false;
          for (const key of Object.keys(updates) as (keyof XKIRAProject)[]) {
            if (updates[key] !== existing[key]) {
              hasChange = true;
              break;
            }
          }

          if (!hasChange) return state;

          const now = Date.now();
          const updatedProject: XKIRAProject = {
            ...existing,
            ...updates,
            updatedAt: now,
            lastOpenedAt: updates.lastOpenedAt || existing.lastOpenedAt || now,
          };

          // Update recent item atomically in same state update
          const existingRecentIdx = state.recentItems.findIndex(r => r.itemId === projectId);
          let updatedRecentItems = [...state.recentItems];
          const newRecent: RecentItem = {
            itemId: projectId,
            type: 'project',
            title: updatedProject.name,
            thumbnail: updatedProject.thumbnail || updatedProject.activeResultUrl,
            status: updatedProject.status,
            projectId: projectId,
            tool: updatedProject.tool,
            prompt: updatedProject.prompt,
            model: updatedProject.selectedModel,
            createdAt: existingRecentIdx >= 0 ? updatedRecentItems[existingRecentIdx].createdAt : now,
            updatedAt: now,
            lastOpenedAt: updatedProject.lastOpenedAt,
          };

          if (existingRecentIdx >= 0) {
            updatedRecentItems[existingRecentIdx] = newRecent;
          } else {
            updatedRecentItems.unshift(newRecent);
          }

          updatedRecentItems.sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);

          return {
            projects: { ...state.projects, [projectId]: updatedProject },
            lastActiveProjectId: projectId,
            recentItems: updatedRecentItems.slice(0, 200),
          };
        });
      },

      setActiveProject: (tool, projectId) => {
        const proj = get().projects[projectId];
        if (!proj) return;

        set((state) => ({
          activeProjectIds: {
            ...state.activeProjectIds,
            [tool]: projectId,
            [proj.type]: projectId,
          },
          lastActiveProjectId: projectId,
        }));

        get().saveProject(projectId, { lastOpenedAt: Date.now() });
      },

      deleteProject: (projectId) => {
        aiCore.memoryManager.clearProjectMemory(projectId);
        set((state) => {
          const newProjects = { ...state.projects };
          const proj = newProjects[projectId];
          delete newProjects[projectId];

          // Clean active pointers
          const newActive = { ...state.activeProjectIds };
          if (proj) {
            if (newActive[proj.tool] === projectId) newActive[proj.tool] = null;
            if (newActive[proj.type] === projectId) newActive[proj.type] = null;
          }

          return {
            projects: newProjects,
            activeProjectIds: newActive,
            lastActiveProjectId: state.lastActiveProjectId === projectId ? null : state.lastActiveProjectId,
            recentItems: state.recentItems.filter(r => r.itemId !== projectId && r.projectId !== projectId),
          };
        });
      },

      addProjectVersion: (projectId, versionData) => {
        set((state) => {
          const proj = state.projects[projectId];
          if (!proj) return state;

          const newVersion: ProjectVersion = {
            versionId: `ver_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            createdAt: Date.now(),
            ...versionData,
          };

          const existingVersions = proj.versions || [];
          const updatedProject: XKIRAProject = {
            ...proj,
            updatedAt: Date.now(),
            versions: [newVersion, ...existingVersions],
            activeResultUrl: versionData.resultUrl || proj.activeResultUrl,
            thumbnail: versionData.thumbnail || versionData.resultUrl || proj.thumbnail,
          };

          return {
            projects: { ...state.projects, [projectId]: updatedProject }
          };
        });
      },

      restoreProjectVersion: (projectId, versionId) => {
        const proj = get().projects[projectId];
        if (!proj || !proj.versions) return;

        const target = proj.versions.find(v => v.versionId === versionId);
        if (!target) return;

        get().saveProject(projectId, {
          prompt: target.prompt || proj.prompt,
          settings: target.settings || proj.settings,
          activeResultUrl: target.resultUrl || proj.activeResultUrl,
          thumbnail: target.thumbnail || target.resultUrl || proj.thumbnail,
          selectedModel: target.model || proj.selectedModel,
        });
      },

      deleteProjectVersion: (projectId, versionId) => {
        set((state) => {
          const proj = state.projects[projectId];
          if (!proj || !proj.versions) return state;

          const updatedVersions = proj.versions.filter(v => v.versionId !== versionId);
          return {
            projects: {
              ...state.projects,
              [projectId]: { ...proj, versions: updatedVersions, updatedAt: Date.now() }
            }
          };
        });
      },

      addRecentItem: (item) => {
        const now = Date.now();
        set((state) => {
          const existingIdx = state.recentItems.findIndex(r => r.itemId === item.itemId);
          
          const newItem: RecentItem = {
            createdAt: now,
            updatedAt: now,
            lastOpenedAt: now,
            ...item,
          };

          let updated: RecentItem[];
          if (existingIdx >= 0) {
            updated = [...state.recentItems];
            updated[existingIdx] = {
              ...updated[existingIdx],
              ...item,
              updatedAt: now,
              lastOpenedAt: now,
            };
          } else {
            updated = [newItem, ...state.recentItems];
          }

          // Sort by lastOpenedAt descending
          updated.sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);

          // Keep up to 200 items in recents registry to prevent excessive memory usage
          return { recentItems: updated.slice(0, 200) };
        });
      },

      updateRecentItem: (itemId, updates) => {
        set((state) => ({
          recentItems: state.recentItems.map(r => 
            r.itemId === itemId 
              ? { ...r, ...updates, updatedAt: Date.now() }
              : r
          ).sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)
        }));
      },

      deleteRecentItem: (itemId) => {
        set((state) => ({
          recentItems: state.recentItems.filter(r => r.itemId !== itemId)
        }));
      },

      touchRecentItem: (itemId) => {
        const now = Date.now();
        set((state) => ({
          recentItems: state.recentItems.map(r => 
            r.itemId === itemId 
              ? { ...r, lastOpenedAt: now }
              : r
          ).sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)
        }));
      },

      addRecentFile: (file) => {
        get().addRecentItem({
          itemId: file.fileId,
          type: 'file',
          title: file.filename,
          thumbnail: file.thumbnail || file.url,
          status: 'COMPLETED',
          tool: file.sourceTool || 'Files',
          sizeBytes: file.sizeBytes,
          mimeType: file.mimeType,
          remoteReference: file.url,
        });
      },

      deleteRecentFile: (fileId) => {
        get().deleteRecentItem(fileId);
      },

      checkAssetUsageInProjects: (assetUrl) => {
        if (!assetUrl) return [];
        const cleanUrl = assetUrl.trim();
        const allProjs = Object.values(get().projects);

        return allProjs.filter(p => {
          if (p.activeResultUrl === cleanUrl || p.thumbnail === cleanUrl) return true;
          if (p.referenceImages?.includes(cleanUrl)) return true;
          if (p.referenceVideos?.includes(cleanUrl)) return true;
          if (p.versions?.some(v => v.resultUrl === cleanUrl || v.thumbnail === cleanUrl)) return true;
          if (p.scenes?.some((s: any) => s.videoUrl === cleanUrl || s.thumbnailUrl === cleanUrl || s.referenceImage === cleanUrl)) return true;
          return false;
        });
      },

      exportProjectJson: (projectId) => {
        const proj = get().projects[projectId];
        if (!proj) return null;
        try {
          return JSON.stringify(proj, null, 2);
        } catch (e) {
          console.error("Export project error:", e);
          return null;
        }
      },

      importProjectJson: (jsonStr) => {
        try {
          const parsed = JSON.parse(jsonStr);
          if (!parsed || !parsed.name || !parsed.type) {
            throw new Error("Invalid project format.");
          }
          const now = Date.now();
          const newProjectId = `proj_imported_${now}_${Math.random().toString(36).substring(2, 6)}`;
          
          const importedProj: XKIRAProject = {
            ...parsed,
            projectId: newProjectId,
            createdAt: now,
            updatedAt: now,
            lastOpenedAt: now,
          };

          set((state) => ({
            projects: { ...state.projects, [newProjectId]: importedProj },
            activeProjectIds: { ...state.activeProjectIds, [importedProj.tool || importedProj.type]: newProjectId },
            lastActiveProjectId: newProjectId,
          }));

          get().addRecentItem({
            itemId: newProjectId,
            type: 'project',
            title: importedProj.name,
            status: importedProj.status,
            projectId: newProjectId,
            tool: importedProj.tool,
            prompt: importedProj.prompt,
            model: importedProj.selectedModel,
          });

          return importedProj;
        } catch (e) {
          console.error("Import project error:", e);
          return null;
        }
      },
    }),
    {
      name: 'xkira-project-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
