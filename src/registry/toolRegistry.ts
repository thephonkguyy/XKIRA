import { 
  Wrench, Edit3, Type, Sparkles, Terminal, FileCode2, Database, SearchCode, Languages, AlignLeft,
  Wand2, RefreshCw, FileText, CheckSquare, Calculator, Globe, Calendar, TrendingUp, Percent,
  ShieldAlert, GitFork, Bug, Scale, Search, Compass, HelpCircle, CheckCircle, FileSpreadsheet, Eye
} from "lucide-react";
import React from "react";

export type ToolCategory = "Writing" | "Coding" | "Prompt Engineering" | "Studio" | "Research" | "Productivity";
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
    description: "Rewrite text to improve flow, grammar, and clarity.",
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
    description: "Summarize text into concise key points.",
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
    description: "Translate text accurately across languages.",
    icon: Languages,
    systemPrompt: "You are a polyglot translator. Translate the user's text accurately to the requested language. If no language is specified, ask for one.",
    outputType: "text",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@translator"
  },
  "grammar-checker": {
    id: "grammar-checker",
    name: "Grammar Checker",
    category: "Writing",
    description: "Analyze, correct, and explain grammar issues.",
    icon: CheckCircle,
    systemPrompt: "You are an elite grammar expert. Analyze the provided text, highlight grammar, punctuation, and structural issues, and explain why each change should be made alongside a corrected copy.",
    outputType: "text",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@grammar"
  },
  "proofreader": {
    id: "proofreader",
    name: "Proofreader",
    category: "Writing",
    description: "Meticulously proofread and polish text.",
    icon: FileText,
    systemPrompt: "You are a professional proofreader. Check spelling, typos, consistency, and syntax. Highlight corrections and output the clean, optimized copy.",
    outputType: "text",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@proofread"
  },
  "paraphraser": {
    id: "paraphraser",
    name: "Paraphraser",
    category: "Writing",
    description: "Paraphrase text while keeping the exact meaning.",
    icon: RefreshCw,
    systemPrompt: "You are a paraphrasing master. Rephrase the provided text into a completely fresh vocabulary and structural style, preserving the exact original core meaning.",
    outputType: "text",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@paraphrase"
  },
  "expander": {
    id: "expander",
    name: "Content Expander",
    category: "Writing",
    description: "Elaborate ideas with vivid detail and vocabulary.",
    icon: Compass,
    systemPrompt: "You are an expert content builder. Expand the user's brief notes or simple concepts into fully formed, descriptive paragraphs with high-vocabulary prose and vivid depth.",
    outputType: "text",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@expand"
  },
  "shortener": {
    id: "shortener",
    name: "Content Shortener",
    category: "Writing",
    description: "Condense verbose content into clean, punchy prose.",
    icon: AlignLeft,
    systemPrompt: "You are a master of brevity. Edit and shorten verbose paragraphs into highly compressed, punchy, and clear statements without losing crucial details.",
    outputType: "text",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@shorten"
  },
  "email-writer": {
    id: "email-writer",
    name: "Email Writer",
    category: "Writing",
    description: "Compose professional business and marketing emails.",
    icon: FileText,
    systemPrompt: "You are a corporate communication and marketing copywriter. Compose professional, engaging, and clear business or marketing emails with optimized Subject Lines and clear Call-To-Actions (CTAs).",
    outputType: "text",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@email"
  },
  "blog-writer": {
    id: "blog-writer",
    name: "Blog Post Writer",
    category: "Writing",
    description: "Generate structured, SEO-friendly blog content.",
    icon: Edit3,
    systemPrompt: "You are an SEO blogging specialist. Generate structured, engaging, SEO-friendly blog posts complete with catchy headings (H1, H2), meta descriptions, introduction, structured body, and a summary.",
    outputType: "text",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@blog"
  },
  "social-writer": {
    id: "social-writer",
    name: "Social Media Copier",
    category: "Writing",
    description: "Draft engaging posts for Twitter, LinkedIn, etc.",
    icon: Sparkles,
    systemPrompt: "You are a social media copywriter. Compose short, punchy, engaging posts tailored to the requested platform (e.g. professional LinkedIn, high-conversion X, creative Instagram) complete with relevant hashtags.",
    outputType: "text",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@social"
  },
  "resume-writer": {
    id: "resume-writer",
    name: "Resume Architect",
    category: "Writing",
    description: "Polish resume points and highlight achievements.",
    icon: FileText,
    systemPrompt: "You are an executive resume architect. Write, align, or optimize professional resume sections, bullet points, and summaries using action-oriented verbs and highlighting quantifiable achievements.",
    outputType: "text",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@resume"
  },
  "content-planner": {
    id: "content-planner",
    name: "Content Planner",
    category: "Writing",
    description: "Formulate complete content planning schedules.",
    icon: Calendar,
    systemPrompt: "You are an editorial director. Create a structured content strategy plan or editorial calendar based on the target topic, complete with content types, platforms, titles, and publishing cadences.",
    outputType: "text",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@plan"
  },
  "tone-changer": {
    id: "tone-changer",
    name: "Tone Changer",
    category: "Writing",
    description: "Adjust writing style to formal, casual, etc.",
    icon: RefreshCw,
    systemPrompt: "You are a tone stylist. Transform the user's provided text to match a specified tone (e.g. professional, sarcastic, enthusiastic, dramatic, academic, sympathetic) while preserving facts.",
    outputType: "text",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@tone"
  },

  // CODING
  "code-generator": {
    id: "code-generator",
    name: "Code Generator",
    category: "Coding",
    description: "Write production-ready, clean code.",
    icon: Terminal,
    systemPrompt: "You are an expert senior software engineer. Write production-ready, highly optimized, and thoroughly commented code in the specified programming language.",
    outputType: "code",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@code"
  },
  "code-explainer": {
    id: "code-explainer",
    name: "Code Explainer",
    category: "Coding",
    description: "Explain code snippets line-by-line.",
    icon: FileCode2,
    systemPrompt: "You are an expert developer. Explain the provided code line-by-line in simple terms, highlighting key concepts, complexity, and structural patterns.",
    outputType: "code",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@explain"
  },
  "debugger": {
    id: "debugger",
    name: "Debugger",
    category: "Coding",
    description: "Identify syntax and structural bugs and fix them.",
    icon: Bug,
    systemPrompt: "You are a debugging expert. Identify errors, exceptions, or security flaws in the provided code, and return a clean, corrected code block alongside an explanation of the fixes.",
    outputType: "code",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@debugger"
  },
  "sql-assistant": {
    id: "sql-assistant",
    name: "SQL Assistant",
    category: "Coding",
    description: "Write highly optimized SQL queries.",
    icon: Database,
    systemPrompt: "You are an elite database administrator. Write highly optimized, standard-compliant SQL queries for the specified database system based on the provided table schema or description.",
    outputType: "code",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@sql"
  },
  "code-refactor": {
    id: "code-refactor",
    name: "Code Refactorer",
    category: "Coding",
    description: "Refactor code to improve architecture and clean design.",
    icon: RefreshCw,
    systemPrompt: "You are a software architect. Refactor the provided code to improve readability, eliminate duplicates, modularize operations, and follow industry standard design patterns (SOLID, DRY).",
    outputType: "code",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@refactor"
  },
  "code-optimizer": {
    id: "code-optimizer",
    name: "Performance Optimizer",
    category: "Coding",
    description: "Optimize time and space complexity of code.",
    icon: TrendingUp,
    systemPrompt: "You are an algorithms specialist. Optimize the provided code's time (Big O) and space complexity. Highlight performance bottlenecks and document the optimized parts.",
    outputType: "code",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@optimize"
  },
  "code-reviewer": {
    id: "code-reviewer",
    name: "Code Reviewer",
    category: "Coding",
    description: "Conduct professional peer code reviews.",
    icon: SearchCode,
    systemPrompt: "You are a lead code reviewer. Perform a detailed peer-level review of the code. Evaluate readability, efficiency, error handling, edge cases, and safety. Assign a final readiness rating.",
    outputType: "text",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@review"
  },
  "regex-generator": {
    id: "regex-generator",
    name: "Regex Builder",
    category: "Coding",
    description: "Construct precise Regular Expressions.",
    icon: Terminal,
    systemPrompt: "You are a regular expression compiler. Construct precise, safe regex patterns for matching requested rules. Explain each part of the expression with examples.",
    outputType: "code",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@regex"
  },
  "git-helper": {
    id: "git-helper",
    name: "Git Helper",
    category: "Coding",
    description: "Generate Git commands and structure commits.",
    icon: GitFork,
    systemPrompt: "You are an expert in Git version control. Provide precise Git commands, workflows (branching, merging, rebasing, stash), and compose elegant commit messages using standard guidelines (conventional commits).",
    outputType: "text",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@git"
  },
  "readme-generator": {
    id: "readme-generator",
    name: "README Architect",
    category: "Coding",
    description: "Create standard, informative project READMEs.",
    icon: FileText,
    systemPrompt: "You are a technical documentation specialist. Create a standard, structured, informative Markdown README for a repository based on user description, covering prerequisites, setup, usage, API, and license.",
    outputType: "text",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@readme"
  },
  "unit-test-generator": {
    id: "unit-test-generator",
    name: "Unit Test Builder",
    category: "Coding",
    description: "Generate comprehensive suite of unit tests.",
    icon: CheckCircle,
    systemPrompt: "You are a Quality Assurance (QA) engineer. Generate a comprehensive suite of unit tests using standard test frameworks (Jest, PyTest, JUnit) covering standard paths, null values, edge cases, and boundaries.",
    outputType: "code",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@unittest"
  },
  "security-checker": {
    id: "security-checker",
    name: "Security Auditing",
    category: "Coding",
    description: "Scan code for OWASP, XSS, injections, flaws.",
    icon: ShieldAlert,
    systemPrompt: "You are a DevSecOps auditing engineer. Scan the provided code for OWASP vulnerabilities, XSS, SQL injection, logic bypasses, and hardcoded secrets. Point out weaknesses and provide secure refactoring.",
    outputType: "text",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@security"
  },

  // RESEARCH
  "web-search": {
    id: "web-search",
    name: "Live Web Search",
    category: "Research",
    description: "Ground responses using dynamic real-time web results.",
    icon: Search,
    systemPrompt: "You are a search grounding agent. When the query requires real-time information, use search data to synthesize a precise answer. Cite URLs and source websites inline with clear numbering.",
    outputType: "text",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@search"
  },
  "deep-research": {
    id: "deep-research",
    name: "Deep Agentic Research",
    category: "Research",
    description: "Multi-layered investigation and report synthesis.",
    icon: Compass,
    systemPrompt: "You are a research analyst. Synthesize a comprehensive, multi-section deep research report containing historical context, current state, key players, metrics, citations, and critical evaluations.",
    outputType: "text",
    defaultModel: "agnes-2.5-pro",
    chatTrigger: "@research"
  },
  "source-summarizer": {
    id: "source-summarizer",
    name: "Source Summarizer",
    category: "Research",
    description: "Process text sources and extract core claims.",
    icon: AlignLeft,
    systemPrompt: "You are an analytical researcher. Summarize major reference sources. Identify core claims, supporting evidence, potential biases, and extract data matrices or statistics.",
    outputType: "text",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@sources"
  },
  "fact-checker": {
    id: "fact-checker",
    name: "Fact Checker",
    category: "Research",
    description: "Audit claims and cross-reference logical data.",
    icon: Scale,
    systemPrompt: "You are a logical auditor and fact-checker. Evaluate the provided statement or claims. Audit them against known history or logical consistencies. Classify statements as verified, false, misleading, or unproven.",
    outputType: "text",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@factcheck"
  },

  // PRODUCTIVITY
  "calculator": {
    id: "calculator",
    name: "Scientific Calculator",
    category: "Productivity",
    description: "Perform math, scientific formulas, equations.",
    icon: Calculator,
    systemPrompt: "You are a scientific computing engine. Solve complex math equations, scientific formulas, statistical distributions, or geometry step-by-step with clear markdown formatting and inline code.",
    outputType: "text",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@calc"
  },
  "unit-converter": {
    id: "unit-converter",
    name: "Unit Converter",
    category: "Productivity",
    description: "Convert metrics, temperature, data rates, speeds.",
    icon: Globe,
    systemPrompt: "You are a physical units indexer. Perform accurate physical metric conversions (length, weight, temperature, energy, data rates, speeds) complete with calculation formulas and exact ratios.",
    outputType: "text",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@convert"
  },
  "currency-converter": {
    id: "currency-converter",
    name: "Currency Exchange",
    category: "Productivity",
    description: "Calculate currency exchanges with step-by-step rates.",
    icon: TrendingUp,
    systemPrompt: "You are a financial exchange rate indexer. Calculate foreign exchange math given target values or mock current market exchange rates. Detail conversion rates and commissions.",
    outputType: "text",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@currency"
  },
  "time-zone-converter": {
    id: "time-zone-converter",
    name: "Timezone Coordinator",
    category: "Productivity",
    description: "Translate time zones and schedule globally.",
    icon: Calendar,
    systemPrompt: "You are a temporal scheduler. Coordinate and translate times between multiple zones (UTC, EST, PST, CET, IST). Provide a side-by-side timeline of standard business operating hours.",
    outputType: "text",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@timezone"
  },
  "csv-analyzer": {
    id: "csv-analyzer",
    name: "CSV Data Analyzer",
    category: "Productivity",
    description: "Process flat CSV files and extract stats, columns.",
    icon: FileSpreadsheet,
    systemPrompt: "You are a data analyst. Process flat CSV or comma-separated rows. Compute standard statistics (mean, median, count, sum), extract row summaries, identify outliers, and return clean Markdown tables.",
    outputType: "text",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@csv"
  },
  "checklist-generator": {
    id: "checklist-generator",
    name: "Checklist Generator",
    category: "Productivity",
    description: "Generate structured markdown operational checklists.",
    icon: CheckSquare,
    systemPrompt: "You are a master checklist planner. Generate structured markdown checklists (`[ ]`) for tasks, events, development roadmaps, audits, or emergencies, complete with priority levels.",
    outputType: "text",
    defaultModel: "agnes-2.5-flash",
    chatTrigger: "@checklist"
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
    defaultModel: "agnes-image-2.5-flash",
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
    defaultModel: "agnes-video-2.5-flash",
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
