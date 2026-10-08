import { ToolDefinition } from "../registry/toolRegistry";
import { aiCore } from "../core/ai";

export function detectToolFromCommand(input: string): { tool: ToolDefinition; query: string } | null {
  return aiCore.detectExplicitTrigger(input);
}

export function detectToolFromIntent(input: string): ToolDefinition | null {
  return aiCore.detectToolFromIntent(input);
}

