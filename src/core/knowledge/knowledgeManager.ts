import { KnowledgeDocument, KnowledgeProvider, KnowledgeSearchOptions, KnowledgeSearchResult } from "./types";
import { DEFAULT_KNOWLEDGE_DOCUMENTS } from "./defaultDocuments";

const STORAGE_KEY = "xkira_custom_knowledge_docs_v1";

export class KnowledgeManager implements KnowledgeProvider {
  private documents: Map<string, KnowledgeDocument> = new Map();

  constructor() {
    this.initialize();
  }

  private initialize() {
    // 1. Load built-in default knowledge
    for (const doc of DEFAULT_KNOWLEDGE_DOCUMENTS) {
      this.documents.set(doc.id, doc);
    }

    // 2. Load user-added custom documents from localStorage if available
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const customDocs: KnowledgeDocument[] = JSON.parse(stored);
          for (const doc of customDocs) {
            this.documents.set(doc.id, doc);
          }
        }
      }
    } catch (e) {
      console.warn("Failed to load custom knowledge documents from localStorage:", e);
    }
  }

  private persistCustomDocs() {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const customDocs = Array.from(this.documents.values()).filter(
          (d) => d.category === "user_doc" || !d.id.startsWith("doc-")
        );
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(customDocs));
      }
    } catch (e) {
      console.warn("Failed to persist custom knowledge documents:", e);
    }
  }

  public async getDocument(id: string): Promise<KnowledgeDocument | null> {
    return this.documents.get(id) || null;
  }

  public async listDocuments(category?: string): Promise<KnowledgeDocument[]> {
    const all = Array.from(this.documents.values());
    if (category) {
      return all.filter((d) => d.category === category);
    }
    return all;
  }

  public getAllDocuments(): KnowledgeDocument[] {
    return Array.from(this.documents.values());
  }

  public deleteDocument(id: string): boolean {
    const existed = this.documents.delete(id);
    if (existed) {
      this.persistCustomDocs();
    }
    return existed;
  }

  public async addDocument(
    doc: Omit<KnowledgeDocument, "id" | "createdAt" | "updatedAt">
  ): Promise<KnowledgeDocument> {
    const now = Date.now();
    const id = `user-doc-${now}-${Math.random().toString(36).substring(2, 7)}`;
    const fullDoc: KnowledgeDocument = {
      ...doc,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.documents.set(id, fullDoc);
    this.persistCustomDocs();
    return fullDoc;
  }

  public async updateDocument(
    id: string,
    updates: Partial<KnowledgeDocument>
  ): Promise<KnowledgeDocument | null> {
    const existing = this.documents.get(id);
    if (!existing) return null;

    const updated: KnowledgeDocument = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };

    this.documents.set(id, updated);
    this.persistCustomDocs();
    return updated;
  }

  public async removeDocument(id: string): Promise<boolean> {
    const existed = this.documents.delete(id);
    if (existed) {
      this.persistCustomDocs();
    }
    return existed;
  }

  /**
   * Search knowledge base with relevance scoring and keyword ranking.
   */
  public async search(
    query: string,
    options?: KnowledgeSearchOptions
  ): Promise<KnowledgeSearchResult[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const cleanQuery = query.toLowerCase().trim();
    const queryTokens = cleanQuery
      .split(/[\s,.;:!?\-+*/()[\]{}'"]+/)
      .filter((t) => t.length >= 2);

    if (queryTokens.length === 0) {
      return [];
    }

    const results: KnowledgeSearchResult[] = [];
    const limit = options?.limit || 4;
    const minScore = options?.minScore || 0.15;

    for (const doc of this.documents.values()) {
      if (options?.category && doc.category !== options.category) {
        continue;
      }

      if (options?.tags && options.tags.length > 0) {
        const hasTag = options.tags.some((t) => doc.tags.includes(t.toLowerCase()));
        if (!hasTag) continue;
      }

      let score = 0;
      const matchedSnippets: string[] = [];

      const titleLower = doc.title.toLowerCase();
      const contentLower = doc.content.toLowerCase();
      const tagsLower = doc.tags.map((t) => t.toLowerCase());

      // 1. Exact phrase match bonus
      if (titleLower.includes(cleanQuery)) {
        score += 2.0;
        matchedSnippets.push(`Title match: "${doc.title}"`);
      } else if (contentLower.includes(cleanQuery)) {
        score += 1.0;
      }

      // 2. Token match scoring
      for (const token of queryTokens) {
        if (titleLower.includes(token)) {
          score += 0.6;
        }
        if (tagsLower.includes(token)) {
          score += 0.5;
        }
        if (contentLower.includes(token)) {
          score += 0.2;
        }
      }

      if (score >= minScore) {
        // Extract relevant sentence snippets
        const sentences = doc.content.split(/(?<=[.!?\n])\s+/);
        for (const sentence of sentences) {
          const sLower = sentence.toLowerCase();
          if (queryTokens.some((t) => sLower.includes(t)) && matchedSnippets.length < 2) {
            matchedSnippets.push(sentence.trim());
          }
        }

        results.push({
          document: doc,
          score,
          matchedSnippets,
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  /**
   * Helper: Extracts concise relevant context string formatted for AI system preamble.
   */
  public async getRelevantContextPreamble(query: string, maxTokensRough: number = 800): Promise<string> {
    const results = await this.search(query, { limit: 2, minScore: 0.35 });
    if (results.length === 0) return "";

    const contextBlocks = results.map((res) => {
      // Summarize or truncate document content to avoid token blowup
      const content = res.document.content.trim();
      const truncated = content.length > 700 ? `${content.substring(0, 700)}...` : content;
      return `[Knowledge Reference: ${res.document.title}]\n${truncated}`;
    });

    return `Relevant Knowledge Context:\n${contextBlocks.join("\n\n")}`;
  }
}

export const defaultKnowledgeManager = new KnowledgeManager();
