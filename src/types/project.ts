export type ProjectType = 
  | 'image'
  | 'video'
  | 'story'
  | 'long-form-video'
  | 'chat'
  | 'prompt'
  | 'file-workspace';

export type AssetType = 'file' | 'image' | 'video' | 'audio' | 'chat' | 'prompt' | 'project';

export interface RecentItem {
  itemId: string;
  type: AssetType;
  title: string;
  thumbnail?: string;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt: number;
  status: 'COMPLETED' | 'PROCESSING' | 'FAILED' | 'DRAFT' | 'ACTIVE';
  projectId?: string;
  tool: string; // e.g. 'Image Studio', 'Video Studio', 'Story Creator', 'Chat', 'Tools'
  metadata?: Record<string, any>;
  localReference?: string;
  remoteReference?: string;
  sizeBytes?: number;
  mimeType?: string;
  prompt?: string;
  model?: string;
}

export interface ProjectVersion {
  versionId: string;
  createdAt: number;
  note?: string;
  prompt?: string;
  settings?: Record<string, any>;
  resultUrl?: string;
  thumbnail?: string;
  model?: string;
}

export interface ProjectFileRef {
  fileId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  url?: string;
  thumbnail?: string;
  uploadedAt: number;
  sourceTool?: string;
}

export interface XKIRAProject {
  projectId: string;
  name: string;
  type: ProjectType;
  tool: string;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt: number;
  thumbnail?: string;
  status: 'DRAFT' | 'ACTIVE' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  
  // Work payload state
  prompt?: string;
  selectedModel?: string;
  settings?: Record<string, any>;
  
  // References
  referenceImages?: string[];
  referenceVideos?: string[];
  referenceAudio?: string[];
  referenceFiles?: ProjectFileRef[];
  
  // Studio specific payloads
  scenes?: any[]; // Story Creator / Long-Form
  currentSceneId?: string;
  timelineState?: {
    zoom?: number;
    positionSeconds?: number;
    audioTracks?: any[];
    selectedClipId?: string;
  };
  
  // Versions
  versions?: ProjectVersion[];
  
  // Output result URL
  activeResultUrl?: string;
  
  // Linked jobs
  jobIds?: string[];
}
