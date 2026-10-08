import { 
  Wrench, Edit3, Type, Sparkles, Terminal, FileCode2, Database, SearchCode, Languages, AlignLeft,
  Wand2, RefreshCw
} from "lucide-react";
import React from "react";

export type ToolCategory = "Writing" | "Coding" | "Prompt Engineering" | "Studio";
export type ToolOutputType = "text" | "code" | "image" | "video";

export interface ToolDefinition {
  id: string;
  name: string;
  category: ToolCategory;
  description: string;
  icon: React.ElementType;
  systemPrompt?: string;
  outputType: ToolOutputType;
  defaultModel: string;
  chatTrigger: string;
  requiresConfirmation?: boolean;
}

export const TOOL_REGISTRY: Record<string, ToolDefinition> = {
  // WRITING
  "writer": {
    id: "writer",
    name: "Writer",
    category: "Writing",
    description: "Write high-quality content.",
    icon: Edit3,
    systemPrompt: "You are an expert copywriter. Write high-quality content based on the user's request.",
    outputType: "text",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@writer"
  },
  "rewriter": {
    id: "rewriter",
    name: "Rewriter",
    category: "Writing",
    description: "Rewrite text to improve flow.",
    icon: RefreshCw,
    systemPrompt: "You are an expert editor. Rewrite the user's text to improve flow, grammar, and clarity.",
    outputType: "text",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@rewriter"
  },
  "summarizer": {
    id: "summarizer",
    name: "Summarizer",
    category: "Writing",
    description: "Summarize text into key points.",
    icon: AlignLeft,
    systemPrompt: "You are an expert summarizer. Summarize the user's text into concise, key bullet points.",
    outputType: "text",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@summarizer"
  },
  "translator": {
    id: "translator",
    name: "Translator",
    category: "Writing",
    description: "Translate text accurately.",
    icon: Languages,
    systemPrompt: "You are a polyglot translator. Translate the user's text accurately to the requested language. If no language is specified, ask for one.",
    outputType: "text",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@translator"
  },

  // CODING
  "code-generator": {
    id: "code-generator",
    name: "Code Generator",
    category: "Coding",
    description: "Write production-ready code.",
    icon: Terminal,
    systemPrompt: "You are an expert senior software engineer. Write production-ready, highly optimized code based on the user's request.",
    outputType: "code",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@code"
  },
  "code-explainer": {
    id: "code-explainer",
    name: "Code Explainer",
    category: "Coding",
    description: "Explain code line-by-line.",
    icon: FileCode2,
    systemPrompt: "You are an expert developer. Explain the provided code line-by-line in simple terms.",
    outputType: "code",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@explain"
  },
  "debugger": {
    id: "debugger",
    name: "Debugger",
    category: "Coding",
    description: "Identify bugs and provide fixes.",
    icon: SearchCode,
    systemPrompt: "You are a debugging expert. Identify the bug in the provided code and provide the exact fix.",
    outputType: "code",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@debugger"
  },
  "sql-assistant": {
    id: "sql-assistant",
    name: "SQL Assistant",
    category: "Coding",
    description: "Write optimized SQL queries.",
    icon: Database,
    systemPrompt: "You are a database administrator. Write highly optimized SQL queries based on the user's request.",
    outputType: "code",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@sql"
  },

  // PROMPT ENGINEERING
  "prompt-enhancer": {
    id: "prompt-enhancer",
    name: "Prompt Enhancer",
    category: "Prompt Engineering",
    description: "Expand a simple prompt into a detailed one.",
    icon: Sparkles,
    systemPrompt: "You are an expert prompt engineer. Take the user's simple prompt and expand it into a highly detailed, professional prompt.",
    outputType: "text",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@enhance"
  },
  "prompt-generator": {
    id: "prompt-generator",
    name: "Prompt Generator",
    category: "Prompt Engineering",
    description: "Generate the perfect prompt.",
    icon: Wand2,
    systemPrompt: "You are an AI whisperer. Ask the user what they want to achieve, and generate the perfect prompt for them to use.",
    outputType: "text",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@prompt"
  },
  "prompt-rewriter": {
    id: "prompt-rewriter",
    name: "Prompt Rewriter",
    category: "Prompt Engineering",
    description: "Rewrite a prompt for clarity.",
    icon: RefreshCw,
    systemPrompt: "You are an expert prompt rewriter. Rewrite the user's prompt to optimize structure, clarity, and precision.",
    outputType: "text",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@rewrite"
  },
  "image-prompt-generator": {
    id: "image-prompt-generator",
    name: "Image Prompt Generator",
    category: "Prompt Engineering",
    description: "Generate vivid image prompts.",
    icon: Sparkles,
    systemPrompt: "You are a master Midjourney and Agnes AI image prompt engineer. Generate vivid, highly detailed, photorealistic image prompts with lighting, camera angles, and style parameters.",
    outputType: "text",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@imageprompt"
  },
  "video-prompt-generator": {
    id: "video-prompt-generator",
    name: "Video Prompt Generator",
    category: "Prompt Engineering",
    description: "Write detailed prompts for video.",
    icon: Sparkles,
    systemPrompt: "You are a cinematic video prompt generator. Write detailed prompts for video generation models, specifying camera movement, subject action, environment, lighting, and pacing.",
    outputType: "text",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@videoprompt"
  },
  "cinematic-prompt-generator": {
    id: "cinematic-prompt-generator",
    name: "Cinematic Prompt Generator",
    category: "Prompt Engineering",
    description: "Craft cinematic scene prompts.",
    icon: Sparkles,
    systemPrompt: "You are a Hollywood film director and cinematographer. Craft cinematic scene prompts focusing on anamorphic lenses, color grading, dramatic atmosphere, and lighting.",
    outputType: "text",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@cinematic"
  },
  "negative-prompt-generator": {
    id: "negative-prompt-generator",
    name: "Negative Prompt Generator",
    category: "Prompt Engineering",
    description: "Generate negative prompts to eliminate artifacts.",
    icon: Sparkles,
    systemPrompt: "You are a Stable Diffusion / Agnes AI negative prompt generator. Generate comprehensive negative prompts to eliminate unwanted artifacts, blur, distortion, and anatomical errors.",
    outputType: "text",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@negative"
  },
  "character-prompt": {
    id: "character-prompt",
    name: "Character Prompt",
    category: "Prompt Engineering",
    description: "Generate detailed character prompts.",
    icon: Sparkles,
    systemPrompt: "You are a character designer. Generate detailed character creation prompts covering appearance, outfit, expression, personality traits, and art style.",
    outputType: "text",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@character"
  },
  "scene-prompt": {
    id: "scene-prompt",
    name: "Scene Prompt",
    category: "Prompt Engineering",
    description: "Generate atmospheric scene prompts.",
    icon: Sparkles,
    systemPrompt: "You are an environmental concept artist. Generate atmospheric world-building and scene creation prompts with detailed depth, backdrop, and ambient lighting.",
    outputType: "text",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@scene"
  },
  "storyboard-generator": {
    id: "storyboard-generator",
    name: "Storyboard Generator",
    category: "Prompt Engineering",
    description: "Break down concept into a storyboard.",
    icon: Sparkles,
    systemPrompt: "You are a movie storyboard director. Break down the user's concept into a structured frame-by-frame storyboard with shot types, camera moves, and scene descriptions.",
    outputType: "text",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@storyboard"
  },

  // STUDIO Integrations
  "image-studio": {
    id: "image-studio",
    name: "Image Studio",
    category: "Studio",
    description: "Generate images with Agnes Image models.",
    icon: Sparkles,
    outputType: "image",
    defaultModel: "agnes-image-v2",
    chatTrigger: "@image",
    requiresConfirmation: true
  },
  "video-studio": {
    id: "video-studio",
    name: "Video Studio",
    category: "Studio",
    description: "Generate video with Agnes Video models.",
    icon: Sparkles,
    outputType: "video",
    defaultModel: "agnes-video-v2.0",
    chatTrigger: "@video",
    requiresConfirmation: true
  }
};

export const getToolsByCategory = () => {
  const categories: Record<string, ToolDefinition[]> = {};
  Object.values(TOOL_REGISTRY).forEach(tool => {
    if (!categories[tool.category]) {
      categories[tool.category] = [];
    }
    categories[tool.category].push(tool);
  });
  return categories;
};
