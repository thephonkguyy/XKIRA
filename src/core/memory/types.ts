export type MemoryType = 
  | 'conversation' 
  | 'project' 
  | 'character' 
  | 'world' 
  | 'generation' 
  | 'instruction' 
  | 'decision';

export type MemorySource = 'user' | 'ai' | 'system' | 'studio' | 'imported';

export interface MemoryItem {
  id: string;
  type: MemoryType;
  projectId?: string;
  title: string;
  content: string;
  tags: string[];
  source: MemorySource;
  metadata?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export interface CharacterMemory {
  id: string;
  characterId: string;
  projectId?: string;
  name: string;
  ageRange?: string;
  appearance: string;
  hair?: string;
  eyes?: string;
  clothing?: string;
  personality?: string;
  voice?: string;
  colorPalette?: string;
  visualAnchor?: string;
  referenceImage?: string;
  updatedAt: number;
}

export interface WorldMemory {
  id: string;
  worldId: string;
  projectId?: string;
  location: string;
  architecture?: string;
  timePeriod?: string;
  weather?: string;
  lighting?: string;
  colorPalette?: string;
  environment?: string;
  visualStyle?: string;
  importantObjects?: string;
  referenceImage?: string;
  updatedAt: number;
}

export interface GenerationMemoryItem {
  id: string;
  type: 'image' | 'video';
  prompt: string;
  url: string;
  model: string;
  tool: string;
  projectId?: string;
  jobId?: string;
  aspectRatio?: string;
  duration?: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface MemorySearchOptions {
  projectId?: string;
  type?: MemoryType;
  types?: MemoryType[];
  tags?: string[];
  limit?: number;
  minScore?: number;
}

export interface MemorySearchResult {
  item: MemoryItem;
  score: number;
  matchedField: string;
}
