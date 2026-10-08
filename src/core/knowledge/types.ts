export interface KnowledgeDocument {
  id: string;
  title: string;
  category: 
    | 'system'
    | 'cinematography'
    | 'filmmaking'
    | 'storytelling'
    | 'prompting'
    | 'programming'
    | 'character_design'
    | 'world_building'
    | 'user_doc';
  tags: string[];
  content: string;
  summary?: string;
  source?: string;
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, any>;
}

export interface KnowledgeSearchOptions {
  category?: string;
  tags?: string[];
  limit?: number;
  minScore?: number;
}

export interface KnowledgeSearchResult {
  document: KnowledgeDocument;
  score: number;
  matchedSnippets: string[];
}

export interface KnowledgeProvider {
  search(query: string, options?: KnowledgeSearchOptions): Promise<KnowledgeSearchResult[]>;
  getDocument(id: string): Promise<KnowledgeDocument | null>;
  addDocument(doc: Omit<KnowledgeDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<KnowledgeDocument>;
  updateDocument(id: string, updates: Partial<KnowledgeDocument>): Promise<KnowledgeDocument | null>;
  removeDocument(id: string): Promise<boolean>;
  listDocuments(category?: string): Promise<KnowledgeDocument[]>;
}
