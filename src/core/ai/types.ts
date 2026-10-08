export type UserIntent =
  | 'GENERAL_CHAT'
  | 'WRITING'
  | 'REWRITING'
  | 'SUMMARIZATION'
  | 'TRANSLATION'
  | 'CODE_GENERATION'
  | 'CODE_EXPLANATION'
  | 'DEBUGGING'
  | 'SQL_ASSISTANCE'
  | 'PROMPT_ENHANCEMENT'
  | 'PROMPT_GENERATION'
  | 'IMAGE_PROMPT_GENERATION'
  | 'VIDEO_PROMPT_GENERATION'
  | 'CINEMATIC_PROMPT'
  | 'NEGATIVE_PROMPT'
  | 'CHARACTER_DESIGN'
  | 'SCENE_DESIGN'
  | 'STORYBOARD_CREATION'
  | 'IMAGE_GENERATION'
  | 'VIDEO_GENERATION'
  | 'STORY_GENERATION';

export type AIModelType = 'text' | 'image' | 'video' | 'multimodal';

export interface AIModelCapability {
  id: string;
  label: string;
  description?: string;
}

export interface AIModelInfo {
  id: string;
  name: string;
  type: AIModelType;
  description: string;
  speed: 'Ultra Fast' | 'Fast' | 'Standard' | 'Rendering';
  status: 'Available' | 'Pro Tier Required' | 'Beta';
  contextWindow?: number;
  maxOutputTokens?: number;
  capabilities: string[];
  defaultParams?: Record<string, any>;
  isDefault?: boolean;
}

export interface IntentDetectionResult {
  intent: UserIntent;
  confidence: number; // 0.0 to 1.0
  matchedToolId?: string;
  matchedToolName?: string;
  trigger?: string;
  cleanQuery: string;
  extractedParams?: Record<string, any>;
  requiresConfirmation?: boolean;
  explanation?: string;
}

export interface ChatMessagePayload {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
}

export interface ChatCompletionOptions {
  model?: string;
  messages: ChatMessagePayload[];
  systemPrompt?: string;
  projectId?: string;
  includeKnowledge?: boolean;
  includeMemory?: boolean;
  stream?: boolean;
  temperature?: number;
  signal?: AbortSignal;
  onChunk?: (chunk: string, accumulated: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
}

export interface ImageGenerationOptions {
  model?: string;
  prompt: string;
  n?: number;
  size?: '1024x1024' | '1280x720' | '720x1280' | '1920x1080';
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  projectId?: string;
  characterName?: string;
  worldLocation?: string;
  negativePrompt?: string;
  signal?: AbortSignal;
}

export interface VideoGenerationOptions {
  model?: string;
  prompt: string;
  duration?: number;
  fps?: number;
  resolution?: '1280x720' | '1920x1080' | '720x1280';
  inputUri?: string;
  imageUri?: string;
  jobId?: string;
  projectId?: string;
  characterNames?: string[];
  worldLocation?: string;
  continuityPrompt?: string;
  signal?: AbortSignal;
}

export interface ToolExecutionOptions {
  conversationId?: string;
  projectId?: string;
  userPrompt: string;
  toolId: string;
  modelOverride?: string;
  systemPromptOverride?: string;
  includeKnowledge?: boolean;
  includeMemory?: boolean;
  stream?: boolean;
  signal?: AbortSignal;
  onStatusChange?: (status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'AWAITING_CONFIRMATION' | 'CANCELLED') => void;
  onChunk?: (chunk: string) => void;
  confirmed?: boolean;
}

export interface ToolExecutionResult {
  toolId: string;
  toolName: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'AWAITING_CONFIRMATION' | 'CANCELLED';
  result?: string;
  error?: string;
  jobId?: string;
  mediaUrl?: string;
  rawData?: any;
}
