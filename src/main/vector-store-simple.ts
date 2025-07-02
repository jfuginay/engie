export interface VectorDocument {
  id: string;
  content: string;
  metadata: {
    filePath: string;
    projectPath: string;
    chunkIndex: number;
    language: string;
    type: 'function' | 'class' | 'interface' | 'component' | 'config' | 'other';
    startLine: number;
    endLine: number;
    lastModified: Date;
    size: number;
  };
}

export interface SearchOptions {
  limit?: number;
  threshold?: number;
  filter?: Record<string, any>;
}

export interface SearchResult {
  document: VectorDocument;
  distance: number;
  relevanceScore: number;
}

class VectorStore {
  private inMemoryDocs: Map<string, VectorDocument[]> = new Map();
  private isInitialized = false;

  async initialize(): Promise<boolean> {
    console.log('Vector store initialized with in-memory fallback');
    this.isInitialized = true;
    return true;
  }

  async getOrCreateCollection(projectPath: string, metadata?: any): Promise<any> {
    if (!this.inMemoryDocs.has(projectPath)) {
      this.inMemoryDocs.set(projectPath, []);
    }
    return { projectPath };
  }

  async addDocuments(projectPath: string, documents: VectorDocument[]): Promise<boolean> {
    if (!this.isInitialized) return false;
    
    const existing = this.inMemoryDocs.get(projectPath) || [];
    this.inMemoryDocs.set(projectPath, [...existing, ...documents]);
    
    console.log(`Added ${documents.length} documents to in-memory store for ${projectPath}`);
    return true;
  }

  async search(
    projectPath: string,
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    if (!this.isInitialized) return [];
    
    const documents = this.inMemoryDocs.get(projectPath) || [];
    const { limit = 10, threshold = 0.7 } = options;
    
    // Simple text-based search for demo
    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();
    
    for (const doc of documents) {
      const contentLower = doc.content.toLowerCase();
      let score = 0;
      
      if (contentLower.includes(queryLower)) {
        score = 0.9;
      } else {
        const queryWords = queryLower.split(/\s+/);
        const contentWords = contentLower.split(/\s+/);
        const matchingWords = queryWords.filter(word => contentWords.includes(word));
        score = matchingWords.length / queryWords.length;
      }
      
      if (score >= threshold) {
        results.push({
          document: doc,
          distance: 1 - score,
          relevanceScore: score,
        });
      }
    }
    
    return results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  }

  async updateDocument(projectPath: string, document: VectorDocument): Promise<boolean> {
    const documents = this.inMemoryDocs.get(projectPath) || [];
    const index = documents.findIndex(d => d.id === document.id);
    
    if (index >= 0) {
      documents[index] = document;
      return true;
    }
    
    return false;
  }

  async deleteDocument(projectPath: string, documentId: string): Promise<boolean> {
    const documents = this.inMemoryDocs.get(projectPath) || [];
    const index = documents.findIndex(d => d.id === documentId);
    
    if (index >= 0) {
      documents.splice(index, 1);
      return true;
    }
    
    return false;
  }

  async deleteProject(projectPath: string): Promise<boolean> {
    return this.inMemoryDocs.delete(projectPath);
  }

  async getCollectionStats(projectPath: string): Promise<{ count: number; metadata: any } | null> {
    const documents = this.inMemoryDocs.get(projectPath) || [];
    return {
      count: documents.length,
      metadata: { projectPath },
    };
  }

  async listCollections(): Promise<string[]> {
    return Array.from(this.inMemoryDocs.keys());
  }

  async close(): Promise<void> {
    this.inMemoryDocs.clear();
    this.isInitialized = false;
  }

  // Additional methods for compatibility
  async semanticSearch(
    projectPath: string,
    query: string,
    context?: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const enhancedQuery = context ? `${context} ${query}` : query;
    return await this.search(projectPath, enhancedQuery, options);
  }

  async findSimilarCode(
    projectPath: string,
    codeSnippet: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    return await this.search(projectPath, codeSnippet, {
      ...options,
      threshold: options.threshold || 0.8,
    });
  }

  async getFileChunks(projectPath: string, filePath: string): Promise<SearchResult[]> {
    const documents = this.inMemoryDocs.get(projectPath) || [];
    const fileChunks = documents.filter(d => d.metadata.filePath === filePath);
    
    return fileChunks.map(doc => ({
      document: doc,
      distance: 0,
      relevanceScore: 1,
    }));
  }
}

export const vectorStore = new VectorStore();