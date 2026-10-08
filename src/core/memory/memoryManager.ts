import {
  MemoryItem,
  MemoryType,
  CharacterMemory,
  WorldMemory,
  GenerationMemoryItem,
  MemorySearchOptions,
  MemorySearchResult,
} from "./types";

const MEMORY_STORAGE_KEY = "xkira_ai_memory_items_v2";
const CHARACTERS_STORAGE_KEY = "xkira_ai_character_memory_v2";
const WORLDS_STORAGE_KEY = "xkira_ai_world_memory_v2";
const GENERATIONS_STORAGE_KEY = "xkira_ai_generation_memory_v2";

export class MemoryManager {
  private memories: Map<string, MemoryItem> = new Map();
  private characters: Map<string, CharacterMemory> = new Map();
  private worlds: Map<string, WorldMemory> = new Map();
  private generations: Map<string, GenerationMemoryItem> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === "undefined" || !window.localStorage) return;

    try {
      // 1. Generic memories
      const storedMem = window.localStorage.getItem(MEMORY_STORAGE_KEY);
      if (storedMem) {
        const items: MemoryItem[] = JSON.parse(storedMem);
        for (const item of items) {
          this.memories.set(item.id, item);
        }
      }

      // 2. Character memory
      const storedChars = window.localStorage.getItem(CHARACTERS_STORAGE_KEY);
      if (storedChars) {
        const items: CharacterMemory[] = JSON.parse(storedChars);
        for (const item of items) {
          this.characters.set(item.id, item);
        }
      }

      // 3. World memory
      const storedWorlds = window.localStorage.getItem(WORLDS_STORAGE_KEY);
      if (storedWorlds) {
        const items: WorldMemory[] = JSON.parse(storedWorlds);
        for (const item of items) {
          this.worlds.set(item.id, item);
        }
      }

      // 4. Generation memory
      const storedGens = window.localStorage.getItem(GENERATIONS_STORAGE_KEY);
      if (storedGens) {
        const items: GenerationMemoryItem[] = JSON.parse(storedGens);
        for (const item of items) {
          this.generations.set(item.id, item);
        }
      }
    } catch (e) {
      console.warn("Recovered from corrupted memory storage; initializing clean memory state:", e);
    }
  }

  private persist() {
    if (typeof window === "undefined" || !window.localStorage) return;

    try {
      window.localStorage.setItem(
        MEMORY_STORAGE_KEY,
        JSON.stringify(Array.from(this.memories.values()))
      );
      window.localStorage.setItem(
        CHARACTERS_STORAGE_KEY,
        JSON.stringify(Array.from(this.characters.values()))
      );
      window.localStorage.setItem(
        WORLDS_STORAGE_KEY,
        JSON.stringify(Array.from(this.worlds.values()))
      );
      window.localStorage.setItem(
        GENERATIONS_STORAGE_KEY,
        JSON.stringify(Array.from(this.generations.values()))
      );
    } catch (e) {
      console.warn("Failed to persist memory state to localStorage:", e);
    }
  }

  /* =======================================================================
   * 1. Generic Memory Items (Decisions, Instructions, Project Premise, Notes)
   * ======================================================================= */

  public addMemory(item: Omit<MemoryItem, "id" | "createdAt" | "updatedAt">): MemoryItem {
    const now = Date.now();
    const id = `mem_${now}_${Math.random().toString(36).substring(2, 7)}`;
    const fullItem: MemoryItem = {
      ...item,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.memories.set(id, fullItem);
    this.persist();
    return fullItem;
  }

  public getMemory(id: string): MemoryItem | null {
    return this.memories.get(id) || null;
  }

  public updateMemory(id: string, updates: Partial<MemoryItem>): MemoryItem | null {
    const existing = this.memories.get(id);
    if (!existing) return null;

    const updated: MemoryItem = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };

    this.memories.set(id, updated);
    this.persist();
    return updated;
  }

  public deleteMemory(id: string): boolean {
    const existed = this.memories.delete(id);
    if (existed) this.persist();
    return existed;
  }

  public getProjectMemories(projectId: string, type?: MemoryType): MemoryItem[] {
    return Array.from(this.memories.values())
      .filter((m) => m.projectId === projectId && (!type || m.type === type))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /* =======================================================================
   * 2. Character Memory
   * ======================================================================= */

  public saveCharacter(char: Omit<CharacterMemory, "id" | "updatedAt"> & { id?: string }): CharacterMemory {
    const id = char.id || `char_mem_${char.characterId || Date.now()}`;
    const item: CharacterMemory = {
      ...char,
      id,
      characterId: char.characterId || id,
      updatedAt: Date.now(),
    };
    this.characters.set(id, item);
    this.persist();
    return item;
  }

  public getCharacters(projectId?: string): CharacterMemory[] {
    const all = Array.from(this.characters.values());
    if (projectId) {
      return all.filter((c) => !c.projectId || c.projectId === projectId);
    }
    return all;
  }

  public getCharacter(id: string): CharacterMemory | undefined {
    return this.characters.get(id) || Array.from(this.characters.values()).find((c) => c.characterId === id || c.id === id);
  }

  public deleteCharacter(id: string): boolean {
    const existed = this.characters.delete(id);
    if (existed) this.persist();
    return existed;
  }

  /* =======================================================================
   * 3. World / Location Memory
   * ======================================================================= */

  public saveWorld(world: Omit<WorldMemory, "id" | "updatedAt"> & { id?: string }): WorldMemory {
    const id = world.id || `world_mem_${world.worldId || Date.now()}`;
    const item: WorldMemory = {
      ...world,
      id,
      worldId: world.worldId || id,
      updatedAt: Date.now(),
    };
    this.worlds.set(id, item);
    this.persist();
    return item;
  }

  public getWorlds(projectId?: string): WorldMemory[] {
    const all = Array.from(this.worlds.values());
    if (projectId) {
      return all.filter((w) => !w.projectId || w.projectId === projectId);
    }
    return all;
  }

  public getWorld(id: string): WorldMemory | undefined {
    return this.worlds.get(id) || Array.from(this.worlds.values()).find((w) => w.worldId === id || w.id === id);
  }

  public deleteWorld(id: string): boolean {
    const existed = this.worlds.delete(id);
    if (existed) this.persist();
    return existed;
  }

  /* =======================================================================
   * 4. Generation Memory
   * ======================================================================= */

  public saveGeneration(gen: Omit<GenerationMemoryItem, "id" | "timestamp"> & { id?: string }): GenerationMemoryItem {
    const id = gen.id || `gen_mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const item: GenerationMemoryItem = {
      ...gen,
      id,
      timestamp: Date.now(),
    };
    this.generations.set(id, item);
    this.persist();
    return item;
  }

  public getGenerations(projectId?: string, limit: number = 30): GenerationMemoryItem[] {
    const all = Array.from(this.generations.values());
    const filtered = projectId ? all.filter((g) => g.projectId === projectId) : all;
    return filtered.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  }

  /* =======================================================================
   * 5. Context-Sensitive Search & Retrieval
   * ======================================================================= */

  public searchMemories(query: string, options?: MemorySearchOptions): MemorySearchResult[] {
    if (!query || query.trim().length === 0) return [];

    const cleanQuery = query.toLowerCase().trim();
    const tokens = cleanQuery.split(/[\s,.;:!?\-+*/()[\]{}'"]+/).filter((t) => t.length >= 2);
    if (tokens.length === 0) return [];

    const results: MemorySearchResult[] = [];
    const minScore = options?.minScore || 0.2;
    const limit = options?.limit || 5;

    for (const item of this.memories.values()) {
      if (options?.projectId && item.projectId && item.projectId !== options.projectId) {
        continue;
      }
      if (options?.type && item.type !== options.type) {
        continue;
      }
      if (options?.types && !options.types.includes(item.type)) {
        continue;
      }

      let score = 0;
      let matchedField = "content";

      const titleLower = item.title.toLowerCase();
      const contentLower = item.content.toLowerCase();

      if (titleLower.includes(cleanQuery)) {
        score += 2.0;
        matchedField = "title";
      } else if (contentLower.includes(cleanQuery)) {
        score += 1.0;
      }

      for (const t of tokens) {
        if (titleLower.includes(t)) score += 0.5;
        if (contentLower.includes(t)) score += 0.3;
        if (item.tags.some((tag) => tag.toLowerCase().includes(t))) score += 0.4;
      }

      if (score >= minScore) {
        results.push({ item, score, matchedField });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  /**
   * Builds an intelligent, minimal context preamble for an AI request based on
   * user query and optional active project context.
   */
  public buildContextPreamble(query: string, projectId?: string): string {
    const sections: string[] = [];

    // 1. Check for relevant characters
    const allChars = this.getCharacters(projectId);
    const matchedChars = allChars.filter((c) =>
      query.toLowerCase().includes(c.name.toLowerCase())
    );

    if (matchedChars.length > 0) {
      const charSnippets = matchedChars.map((c) => {
        const details = [
          c.appearance && `Appearance: ${c.appearance}`,
          c.hair && `Hair: ${c.hair}`,
          c.clothing && `Wardrobe: ${c.clothing}`,
          c.personality && `Personality: ${c.personality}`,
          c.visualAnchor && `Anchor: ${c.visualAnchor}`,
        ]
          .filter(Boolean)
          .join(" | ");
        return `- Character [${c.name}]: ${details || "Defined in Project Character Bible"}`;
      });
      sections.push(`Active Character Profiles:\n${charSnippets.join("\n")}`);
    }

    // 2. Check for relevant world locations
    const allWorlds = this.getWorlds(projectId);
    const matchedWorlds = allWorlds.filter((w) =>
      query.toLowerCase().includes(w.location.toLowerCase())
    );

    if (matchedWorlds.length > 0) {
      const worldSnippets = matchedWorlds.map((w) => {
        const details = [
          w.environment && `Environment: ${w.environment}`,
          w.lighting && `Lighting: ${w.lighting}`,
          w.architecture && `Architecture: ${w.architecture}`,
          w.visualStyle && `Style: ${w.visualStyle}`,
        ]
          .filter(Boolean)
          .join(" | ");
        return `- Location [${w.location}]: ${details || "Defined in Project World Bible"}`;
      });
      sections.push(`Active Location Profiles:\n${worldSnippets.join("\n")}`);
    }

    // 3. Search relevant project decisions / notes
    const relevantMemories = this.searchMemories(query, {
      projectId,
      limit: 3,
      minScore: 0.4,
    });

    if (relevantMemories.length > 0) {
      const memorySnippets = relevantMemories.map(
        (m) => `- [${m.item.type.toUpperCase()}] ${m.item.title}: ${m.item.content}`
      );
      sections.push(`Relevant Project Decisions & Notes:\n${memorySnippets.join("\n")}`);
    }

    if (sections.length === 0) return "";

    return `[Project Memory Context]\n${sections.join("\n\n")}`;
  }

  /**
   * Purges memories for a specific project.
   */
  public clearProjectMemory(projectId: string): void {
    for (const [id, item] of this.memories.entries()) {
      if (item.projectId === projectId) {
        this.memories.delete(id);
      }
    }
    for (const [id, char] of this.characters.entries()) {
      if (char.projectId === projectId) {
        this.characters.delete(id);
      }
    }
    for (const [id, world] of this.worlds.entries()) {
      if (world.projectId === projectId) {
        this.worlds.delete(id);
      }
    }
    for (const [id, gen] of this.generations.entries()) {
      if (gen.projectId === projectId) {
        this.generations.delete(id);
      }
    }
    this.persist();
  }

  /**
   * Full memory purge.
   */
  public clearAll(): void {
    this.memories.clear();
    this.characters.clear();
    this.worlds.clear();
    this.generations.clear();
    this.persist();
  }
}

export const defaultMemoryManager = new MemoryManager();
