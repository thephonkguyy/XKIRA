import { IntentDetectionResult, UserIntent } from "./types";
import { TOOL_REGISTRY, ToolDefinition } from "../../registry/toolRegistry";

interface IntentRule {
  intent: UserIntent;
  toolId?: string;
  patterns: RegExp[];
  confidence: number;
  requiresConfirmation?: boolean;
}

const INTENT_RULES: IntentRule[] = [
  // 1. Explicit Image Generation
  {
    intent: "IMAGE_GENERATION",
    toolId: "image-studio",
    patterns: [
      /^(generate|create|render|make|draw|paint)\s+(an?\s+)?(image|picture|photo|illustration|concept\s*art|render|artwork|portrait|wallpaper)/i,
      /^(image|picture|photo)\s+of\s+/i,
      /\b(photorealistic|hyperrealistic|cinematic\s+shot|render\s+in\s+4k)\b/i,
    ],
    confidence: 0.92,
    requiresConfirmation: true,
  },
  // 2. Explicit Video Generation
  {
    intent: "VIDEO_GENERATION",
    toolId: "video-studio",
    patterns: [
      /^(generate|create|render|make|animate)\s+(an?\s+)?(video|clip|animation|footage|cinematic\s+sequence|movie\s+scene)/i,
      /^(video|clip)\s+of\s+/i,
      /\b(animate\s+this|camera\s+pan|slow\s+motion\s+video|cinematic\s+video)\b/i,
    ],
    confidence: 0.92,
    requiresConfirmation: true,
  },
  // 3. Summarization
  {
    intent: "SUMMARIZATION",
    toolId: "summarizer",
    patterns: [
      /^(summarize|give\s+a\s+summary\s+of|tldr|tl;dr|key\s+takeaways\s+from|condense)\b/i,
      /\b(in\s+bullet\s+points|summarize\s+the\s+following)\b/i,
    ],
    confidence: 0.95,
  },
  // 4. Translation
  {
    intent: "TRANSLATION",
    toolId: "translator",
    patterns: [
      /^(translate|convert\s+language)\b/i,
      /\btranslate\s+(this\s+)?(to|into)\s+([a-zA-Z\s]+)/i,
    ],
    confidence: 0.95,
  },
  // 5. Code Debugging & Fixing
  {
    intent: "DEBUGGING",
    toolId: "debugger",
    patterns: [
      /^(debug|fix\s+this\s+code|find\s+the\s+bug|why\s+is\s+this\s+failing|troubleshoot\s+this\s+error)\b/i,
      /\b(runtime\s+error|syntax\s+error|stack\s*trace|typeerror|uncaught\s+exception)\b/i,
    ],
    confidence: 0.9,
  },
  // 6. Code Generation
  {
    intent: "CODE_GENERATION",
    toolId: "code-generator",
    patterns: [
      /^(write|generate|implement|build|create)\s+(a\s+|an\s+)?(typescript|javascript|python|react|html|css|rust|go|c\+\+|node|function|script|api\s+endpoint|algorithm|component)\b/i,
      /\b(code\s+for|in\s+typescript|in\s+python|in\s+javascript|in\s+react)\b/i,
    ],
    confidence: 0.88,
  },
  // 7. Code Explanation
  {
    intent: "CODE_EXPLANATION",
    toolId: "code-explainer",
    patterns: [
      /^(explain\s+this\s+code|how\s+does\s+this\s+code\s+work|walk\s+me\s+through\s+this\s+code|break\s+down\s+this\s+function)\b/i,
    ],
    confidence: 0.92,
  },
  // 8. SQL Assistance
  {
    intent: "SQL_ASSISTANCE",
    toolId: "sql-assistant",
    patterns: [
      /^(write|generate|create|optimize)\s+(a\s+|an\s+)?(sql|query|postgres|database\s+query|join\s+query)\b/i,
      /\b(select\s+\*\s+from|sql\s+statement|group\s+by|inner\s+join)\b/i,
    ],
    confidence: 0.95,
  },
  // 9. Prompt Engineering / Enhancer
  {
    intent: "PROMPT_ENHANCEMENT",
    toolId: "prompt-enhancer",
    patterns: [
      /^(enhance|improve|expand|optimize)\s+(this\s+)?(prompt|idea)\b/i,
      /\b(make\s+this\s+prompt\s+better|turn\s+this\s+into\s+a\s+prompt)\b/i,
    ],
    confidence: 0.9,
  },
  // 10. Cinematic Prompt Generation
  {
    intent: "CINEMATIC_PROMPT",
    toolId: "cinematic-prompt-generator",
    patterns: [
      /^(generate|create|write)\s+(a\s+)?(cinematic\s+prompt|prompt\s+for\s+a\s+movie|hollywood\s+shot\s+prompt)\b/i,
      /\b(cinematic\s+lighting|anamorphic\s+lens\s+prompt|movie\s+scene\s+prompt)\b/i,
    ],
    confidence: 0.92,
  },
  // 11. Image Prompt Generator
  {
    intent: "IMAGE_PROMPT_GENERATION",
    toolId: "image-prompt-generator",
    patterns: [
      /^(generate|create|write)\s+(an?\s+)?(image\s+prompt|midjourney\s+prompt|stable\s+diffusion\s+prompt|agnes\s+image\s+prompt)\b/i,
    ],
    confidence: 0.92,
  },
  // 12. Video Prompt Generator
  {
    intent: "VIDEO_PROMPT_GENERATION",
    toolId: "video-prompt-generator",
    patterns: [
      /^(generate|create|write)\s+(an?\s+)?(video\s+prompt|prompt\s+for\s+video|runway\s+prompt|sora\s+prompt)\b/i,
    ],
    confidence: 0.92,
  },
  // 13. Character Design
  {
    intent: "CHARACTER_DESIGN",
    toolId: "character-prompt",
    patterns: [
      /^(design|create|generate)\s+(a\s+)?(character|protagonist|antagonist|hero|heroine|npc|persona)\b/i,
      /\b(character\s+sheet|character\s+design|character\s+prompt)\b/i,
    ],
    confidence: 0.88,
  },
  // 14. Scene / World Design
  {
    intent: "SCENE_DESIGN",
    toolId: "scene-prompt",
    patterns: [
      /^(design|create|generate)\s+(a\s+)?(scene|environment|world|landscape|setting|backdrop)\b/i,
      /\b(world\s*building|environment\s+concept|scenery\s+prompt)\b/i,
    ],
    confidence: 0.88,
  },
  // 15. Storyboard Generation
  {
    intent: "STORYBOARD_CREATION",
    toolId: "storyboard-generator",
    patterns: [
      /^(create|generate|break\s+down)\s+(a\s+)?(storyboard|shot\s+list|scene\s+by\s+scene\s+breakdown)\b/i,
      /\b(storyboard\s+for|frame\s+by\s+frame\s+plan)\b/i,
    ],
    confidence: 0.94,
  },
  // 16. Rewriting
  {
    intent: "REWRITING",
    toolId: "rewriter",
    patterns: [
      /^(rewrite|rephrase|paraphrase|improve\s+the\s+flow\s+of|polish\s+this\s+text)\b/i,
    ],
    confidence: 0.9,
  },
  // 17. Writing
  {
    intent: "WRITING",
    toolId: "writer",
    patterns: [
      /^(write|compose|draft)\s+(a\s+|an\s+)?(story|blog\s+post|article|essay|script|email|letter|poem|narrative)\b/i,
    ],
    confidence: 0.85,
  },
];

export class IntentDetector {
  /**
   * Detects explicit @command tool triggers from input.
   * e.g. "@writer write a story" -> { tool, query }
   */
  public detectExplicitTrigger(input: string): { tool: ToolDefinition; query: string } | null {
    const trimmed = input.trim();
    if (!trimmed.startsWith("@")) return null;

    const firstWord = trimmed.split(/\s+/)[0].toLowerCase();
    for (const tool of Object.values(TOOL_REGISTRY)) {
      if (tool.chatTrigger.toLowerCase() === firstWord) {
        const query = trimmed.substring(firstWord.length).trim();
        return { tool, query };
      }
    }
    return null;
  }

  /**
   * Performs full natural language intent classification on user input.
   */
  public detectIntent(input: string): IntentDetectionResult {
    const trimmed = input.trim();

    // 1. Check for explicit @command first
    const explicit = this.detectExplicitTrigger(trimmed);
    if (explicit) {
      const intentMap: Record<string, UserIntent> = {
        writer: "WRITING",
        rewriter: "REWRITING",
        summarizer: "SUMMARIZATION",
        translator: "TRANSLATION",
        "code-generator": "CODE_GENERATION",
        "code-explainer": "CODE_EXPLANATION",
        debugger: "DEBUGGING",
        "sql-assistant": "SQL_ASSISTANCE",
        "prompt-enhancer": "PROMPT_ENHANCEMENT",
        "prompt-generator": "PROMPT_GENERATION",
        "image-prompt-generator": "IMAGE_PROMPT_GENERATION",
        "video-prompt-generator": "VIDEO_PROMPT_GENERATION",
        "cinematic-prompt-generator": "CINEMATIC_PROMPT",
        "negative-prompt-generator": "NEGATIVE_PROMPT",
        "character-prompt": "CHARACTER_DESIGN",
        "scene-prompt": "SCENE_DESIGN",
        "storyboard-generator": "STORYBOARD_CREATION",
        "image-studio": "IMAGE_GENERATION",
        "video-studio": "VIDEO_GENERATION",
      };

      return {
        intent: intentMap[explicit.tool.id] || "GENERAL_CHAT",
        confidence: 1.0,
        matchedToolId: explicit.tool.id,
        matchedToolName: explicit.tool.name,
        trigger: explicit.tool.chatTrigger,
        cleanQuery: explicit.query,
        requiresConfirmation: explicit.tool.requiresConfirmation || false,
        explanation: `Explicit trigger ${explicit.tool.chatTrigger} detected for ${explicit.tool.name}.`,
      };
    }

    // 2. Evaluate heuristic rules
    for (const rule of INTENT_RULES) {
      for (const pattern of rule.patterns) {
        if (pattern.test(trimmed)) {
          const tool = rule.toolId ? TOOL_REGISTRY[rule.toolId] : undefined;
          return {
            intent: rule.intent,
            confidence: rule.confidence,
            matchedToolId: rule.toolId,
            matchedToolName: tool?.name,
            trigger: tool?.chatTrigger,
            cleanQuery: trimmed,
            requiresConfirmation: rule.requiresConfirmation || tool?.requiresConfirmation || false,
            explanation: `Matched natural language pattern for ${rule.intent}.`,
          };
        }
      }
    }

    // 3. Fallback: General Chat
    return {
      intent: "GENERAL_CHAT",
      confidence: 0.7,
      cleanQuery: trimmed,
      requiresConfirmation: false,
      explanation: "Standard conversational inquiry.",
    };
  }

  /**
   * Helper to detect single tool for suggestion popovers in UI.
   */
  public detectToolFromIntent(input: string): ToolDefinition | null {
    if (!input || input.trim().length < 8) return null;
    const res = this.detectIntent(input);
    if (res.matchedToolId && res.confidence >= 0.85) {
      return TOOL_REGISTRY[res.matchedToolId] || null;
    }
    return null;
  }
}

export const defaultIntentDetector = new IntentDetector();
