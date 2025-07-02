import * as fs from 'fs/promises';
import * as path from 'path';
import { ipcMain } from 'electron';
import { claudeAIService } from './claude-ai-service';
import { vectorStore, VectorDocument } from './vector-store-simple';
import * as tiktoken from 'tiktoken';

export interface CodeChunk {
  id: string;
  filePath: string;
  content: string;
  type: 'function' | 'class' | 'interface' | 'component' | 'config' | 'other';
  language: string;
  startLine: number;
  endLine: number;
  embedding?: number[];
  metadata: {
    projectPath: string;
    lastModified: Date;
    size: number;
    imports: string[];
    exports: string[];
    dependencies: string[];
  };
}

export interface SearchResult {
  chunk: CodeChunk;
  relevanceScore: number;
  contextSnippet: string;
}

export interface ProjectKnowledge {
  projectPath: string;
  totalFiles: number;
  totalChunks: number;
  languages: string[];
  frameworks: string[];
  patterns: string[];
  lastIndexed: Date;
}

class RAGSystem {
  private codeIndex: Map<string, CodeChunk[]> = new Map(); // projectPath -> chunks
  private projectKnowledge: Map<string, ProjectKnowledge> = new Map();
  private supportedExtensions = new Set([
    '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rs', '.cpp', '.c',
    '.php', '.rb', '.swift', '.kt', '.scala', '.cs', '.dart', '.vue', '.svelte'
  ]);

  async initialize(): Promise<boolean> {
    try {
      // Initialize vector store
      await vectorStore.initialize();
      
      this.registerIpcHandlers();
      console.log('RAG system initialized with vector store');
      return true;
    } catch (error) {
      console.error('Failed to initialize RAG system:', error);
      return false;
    }
  }

  async indexProject(projectPath: string): Promise<boolean> {
    try {
      console.log(`Starting to index project: ${projectPath}`);
      
      const chunks: CodeChunk[] = [];
      const languages = new Set<string>();
      const frameworks = new Set<string>();
      
      // Recursively scan project files
      await this.scanDirectory(projectPath, projectPath, chunks, languages);
      
      // Convert chunks to vector documents
      const vectorDocs = await this.chunksToVectorDocuments(chunks);
      
      // Store in vector database
      await vectorStore.addDocuments(projectPath, vectorDocs);
      
      // Detect frameworks and patterns
      const detectedFrameworks = await this.detectFrameworks(projectPath);
      detectedFrameworks.forEach(fw => frameworks.add(fw));
      
      // Analyze patterns
      const patterns = await this.analyzePatterns(chunks);
      
      // Store in local index (for quick access)
      this.codeIndex.set(projectPath, chunks);
      
      // Update project knowledge
      this.projectKnowledge.set(projectPath, {
        projectPath,
        totalFiles: await this.countFiles(projectPath),
        totalChunks: chunks.length,
        languages: Array.from(languages),
        frameworks: Array.from(frameworks),
        patterns,
        lastIndexed: new Date(),
      });

      console.log(`Indexed ${chunks.length} code chunks from ${projectPath}`);
      return true;
    } catch (error) {
      console.error(`Failed to index project ${projectPath}:`, error);
      return false;
    }
  }

  private async scanDirectory(
    dirPath: string, 
    projectPath: string, 
    chunks: CodeChunk[], 
    languages: Set<string>
  ): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        // Skip common ignore patterns
        if (this.shouldIgnore(entry.name)) {
          continue;
        }
        
        if (entry.isDirectory()) {
          await this.scanDirectory(fullPath, projectPath, chunks, languages);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (this.supportedExtensions.has(ext)) {
            const language = this.getLanguageFromExtension(ext);
            languages.add(language);
            
            const fileChunks = await this.processFile(fullPath, projectPath, language);
            chunks.push(...fileChunks);
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dirPath}:`, error);
    }
  }

  private shouldIgnore(name: string): boolean {
    const ignorePatterns = [
      'node_modules', '.git', 'dist', 'build', '.next', '.nuxt',
      'coverage', '.nyc_output', 'target', 'vendor', '__pycache__',
      '.pytest_cache', '.vscode', '.idea', 'logs'
    ];
    
    return ignorePatterns.includes(name) || name.startsWith('.');
  }

  private getLanguageFromExtension(ext: string): string {
    const extMap: Record<string, string> = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.jsx': 'javascript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.go': 'go',
      '.rs': 'rust',
      '.cpp': 'cpp',
      '.c': 'c',
      '.php': 'php',
      '.rb': 'ruby',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.cs': 'csharp',
      '.dart': 'dart',
      '.vue': 'vue',
      '.svelte': 'svelte',
    };
    
    return extMap[ext] || 'unknown';
  }

  private async processFile(filePath: string, projectPath: string, language: string): Promise<CodeChunk[]> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const stats = await fs.stat(filePath);
      
      // Split content into logical chunks
      const chunks = this.splitIntoChunks(content, filePath, projectPath, language);
      
      // Analyze file for imports/exports
      const { imports, exports, dependencies } = this.analyzeFile(content, language);
      
      // Add metadata to each chunk
      chunks.forEach(chunk => {
        chunk.metadata = {
          projectPath,
          lastModified: stats.mtime,
          size: stats.size,
          imports,
          exports,
          dependencies,
        };
      });
      
      return chunks;
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error);
      return [];
    }
  }

  private splitIntoChunks(content: string, filePath: string, projectPath: string, language: string): CodeChunk[] {
    const lines = content.split('\n');
    const chunks: CodeChunk[] = [];
    let currentChunk = '';
    let chunkStartLine = 0;
    let chunkType: CodeChunk['type'] = 'other';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Detect chunk boundaries based on language patterns
      const isChunkBoundary = this.isChunkBoundary(line, language);
      const newChunkType = this.detectChunkType(line);
      
      if (isChunkBoundary && currentChunk.trim()) {
        // Save current chunk
        chunks.push({
          id: `${filePath}:${chunkStartLine}-${i}`,
          filePath,
          content: currentChunk.trim(),
          type: chunkType,
          language,
          startLine: chunkStartLine,
          endLine: i,
          metadata: {
            projectPath,
            lastModified: new Date(),
            size: 0,
            imports: [],
            exports: [],
            dependencies: [],
          },
        });
        
        // Start new chunk
        currentChunk = line + '\n';
        chunkStartLine = i;
        chunkType = newChunkType;
      } else {
        currentChunk += line + '\n';
        if (newChunkType !== 'other') {
          chunkType = newChunkType;
        }
      }
    }
    
    // Add final chunk
    if (currentChunk.trim()) {
      chunks.push({
        id: `${filePath}:${chunkStartLine}-${lines.length}`,
        filePath,
        content: currentChunk.trim(),
        type: chunkType,
        language,
        startLine: chunkStartLine,
        endLine: lines.length,
        metadata: {
          projectPath,
          lastModified: new Date(),
          size: 0,
          imports: [],
          exports: [],
          dependencies: [],
        },
      });
    }
    
    return chunks;
  }

  private isChunkBoundary(line: string, language: string): boolean {
    const trimmed = line.trim();
    
    switch (language) {
      case 'javascript':
      case 'typescript':
        return trimmed.startsWith('function ') ||
               trimmed.startsWith('class ') ||
               trimmed.startsWith('const ') ||
               trimmed.startsWith('export ') ||
               trimmed.startsWith('interface ') ||
               trimmed.startsWith('type ');
      
      case 'python':
        return trimmed.startsWith('def ') ||
               trimmed.startsWith('class ') ||
               trimmed.startsWith('async def ');
      
      case 'java':
        return trimmed.includes('public class ') ||
               trimmed.includes('public interface ') ||
               trimmed.includes('public void ') ||
               trimmed.includes('private void ');
      
      default:
        return false;
    }
  }


  private analyzeFile(content: string, language: string): { imports: string[]; exports: string[]; dependencies: string[] } {
    const imports: string[] = [];
    const exports: string[] = [];
    const dependencies: string[] = [];
    
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Extract imports
      if (trimmed.startsWith('import ')) {
        const match = trimmed.match(/from ['"]([^'"]+)['"]/);
        if (match) {
          imports.push(match[1]);
          if (!match[1].startsWith('.')) {
            dependencies.push(match[1].split('/')[0]);
          }
        }
      }
      
      // Extract exports
      if (trimmed.startsWith('export ')) {
        const exportMatch = trimmed.match(/export\s+(?:default\s+)?(?:function|class|const|interface|type)\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
        if (exportMatch) {
          exports.push(exportMatch[1]);
        }
      }
    }
    
    return { imports, exports, dependencies: Array.from(new Set(dependencies)) };
  }

  private async detectFrameworks(projectPath: string): Promise<string[]> {
    const frameworks: string[] = [];
    
    try {
      // Check package.json for common frameworks
      const packageJsonPath = path.join(projectPath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      if (allDeps.react) frameworks.push('React');
      if (allDeps.vue) frameworks.push('Vue');
      if (allDeps.angular) frameworks.push('Angular');
      if (allDeps.electron) frameworks.push('Electron');
      if (allDeps.express) frameworks.push('Express');
      if (allDeps.nextjs || allDeps['next']) frameworks.push('Next.js');
      if (allDeps.nuxt) frameworks.push('Nuxt.js');
      if (allDeps.svelte) frameworks.push('Svelte');
      if (allDeps.fastapi) frameworks.push('FastAPI');
      if (allDeps.django) frameworks.push('Django');
      if (allDeps.flask) frameworks.push('Flask');
    } catch {
      // No package.json or error reading it
    }
    
    return frameworks;
  }

  private async analyzePatterns(chunks: CodeChunk[]): Promise<string[]> {
    try {
      // Use Claude to analyze code patterns
      const sampleChunks = chunks.slice(0, 10).map(c => c.content).join('\n\n---\n\n');
      
      const response = await claudeAIService.sendMessage(`
Analyze these code samples and identify common patterns, architectural decisions, and coding styles:

${sampleChunks}

Respond with a JSON array of pattern descriptions.
Example: ["Uses React functional components", "Follows MVC architecture", "Uses TypeScript strict mode"]
`);

      try {
        return JSON.parse(response.content);
      } catch {
        return ['Standard patterns detected'];
      }
    } catch {
      return [];
    }
  }

  private async countFiles(projectPath: string): Promise<number> {
    let count = 0;
    
    const countInDir = async (dirPath: string): Promise<void> => {
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          if (this.shouldIgnore(entry.name)) continue;
          
          const fullPath = path.join(dirPath, entry.name);
          
          if (entry.isDirectory()) {
            await countInDir(fullPath);
          } else if (entry.isFile() && this.supportedExtensions.has(path.extname(entry.name))) {
            count++;
          }
        }
      } catch {
        // Ignore errors
      }
    };
    
    await countInDir(projectPath);
    return count;
  }

  async searchCode(query: string, projectPath?: string): Promise<SearchResult[]> {
    try {
      const results: SearchResult[] = [];
      
      if (projectPath) {
        // Search specific project using vector store
        const vectorResults = await vectorStore.semanticSearch(projectPath, query, undefined, {
          limit: 10,
          threshold: 0.7,
        });
        
        for (const vResult of vectorResults) {
          const chunk = this.vectorDocumentToCodeChunk(vResult.document);
          results.push({
            chunk,
            relevanceScore: vResult.relevanceScore,
            contextSnippet: this.generateContextSnippet(chunk, query),
          });
        }
      } else {
        // Search all projects
        const projectPaths = Array.from(this.codeIndex.keys());
        
        for (const path of projectPaths) {
          const vectorResults = await vectorStore.semanticSearch(path, query, undefined, {
            limit: 5,
            threshold: 0.7,
          });
          
          for (const vResult of vectorResults) {
            const chunk = this.vectorDocumentToCodeChunk(vResult.document);
            results.push({
              chunk,
              relevanceScore: vResult.relevanceScore,
              contextSnippet: this.generateContextSnippet(chunk, query),
            });
          }
        }
      }
      
      return results.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 10);
    } catch (error) {
      console.error('Error searching code:', error);
      // Fallback to local search
      return await this.fallbackSearch(query, projectPath);
    }
  }

  private calculateRelevance(query: string, chunk: CodeChunk): number {
    const queryLower = query.toLowerCase();
    const contentLower = chunk.content.toLowerCase();
    
    let score = 0;
    
    // Exact matches get high score
    if (contentLower.includes(queryLower)) {
      score += 0.8;
    }
    
    // Word matches
    const queryWords = queryLower.split(/\s+/);
    const contentWords = contentLower.split(/\s+/);
    
    for (const word of queryWords) {
      if (contentWords.includes(word)) {
        score += 0.2;
      }
    }
    
    // Type-specific bonuses
    if (chunk.type === 'function' && queryLower.includes('function')) score += 0.1;
    if (chunk.type === 'class' && queryLower.includes('class')) score += 0.1;
    
    return Math.min(score, 1.0);
  }

  private generateContextSnippet(chunk: CodeChunk, query: string): string {
    const lines = chunk.content.split('\n');
    const queryLower = query.toLowerCase();
    
    // Find the most relevant line
    let bestLineIndex = 0;
    let bestScore = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      const score = queryLower.split(/\s+/).reduce((acc, word) => {
        return acc + (line.includes(word) ? 1 : 0);
      }, 0);
      
      if (score > bestScore) {
        bestScore = score;
        bestLineIndex = i;
      }
    }
    
    // Return context around the best line
    const start = Math.max(0, bestLineIndex - 2);
    const end = Math.min(lines.length, bestLineIndex + 3);
    
    return lines.slice(start, end).join('\n');
  }

  async getProjectKnowledge(projectPath: string): Promise<ProjectKnowledge | null> {
    return this.projectKnowledge.get(projectPath) || null;
  }

  async getAllProjects(): Promise<ProjectKnowledge[]> {
    return Array.from(this.projectKnowledge.values());
  }

  private async chunksToVectorDocuments(chunks: CodeChunk[]): Promise<VectorDocument[]> {
    return chunks.map(chunk => ({
      id: chunk.id,
      content: chunk.content,
      metadata: {
        filePath: chunk.filePath,
        projectPath: chunk.metadata.projectPath,
        chunkIndex: 0,
        language: chunk.language,
        type: chunk.type,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        lastModified: chunk.metadata.lastModified,
        size: chunk.metadata.size,
      },
    }));
  }

  private vectorDocumentToCodeChunk(doc: VectorDocument): CodeChunk {
    return {
      id: doc.id,
      filePath: doc.metadata.filePath,
      content: doc.content,
      type: doc.metadata.type,
      language: doc.metadata.language,
      startLine: doc.metadata.startLine,
      endLine: doc.metadata.endLine,
      embedding: undefined,
      metadata: {
        projectPath: doc.metadata.projectPath,
        lastModified: doc.metadata.lastModified,
        size: doc.metadata.size,
        imports: [],
        exports: [],
        dependencies: [],
      },
    };
  }

  private async fallbackSearch(query: string, projectPath?: string): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const searchTargets: CodeChunk[] = projectPath ? 
      (this.codeIndex.get(projectPath) || []) : 
      Array.from(this.codeIndex.values()).flat();
    
    for (const chunk of searchTargets) {
      const relevanceScore = this.calculateRelevance(query, chunk);
      
      if (relevanceScore > 0.3) {
        results.push({
          chunk,
          relevanceScore,
          contextSnippet: this.generateContextSnippet(chunk, query),
        });
      }
    }
    
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 10);
  }

  async indexFile(filePath: string, projectPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      const content = await fs.readFile(filePath, 'utf-8');
      const ext = path.extname(filePath);
      
      if (!this.supportedExtensions.has(ext)) {
        return false;
      }

      const chunks = await this.createChunksFromContent(
        content,
        filePath,
        projectPath,
        stats
      );

      const vectorDocs = await this.chunksToVectorDocuments(chunks);

      const existingDocs = await vectorStore.getFileChunks(projectPath, filePath);
      for (const existingDoc of existingDocs) {
        await vectorStore.deleteDocument(projectPath, existingDoc.document.id);
      }

      await vectorStore.addDocuments(projectPath, vectorDocs);

      console.log(`Indexed file: ${filePath} (${chunks.length} chunks)`);
      return true;
    } catch (error) {
      console.error(`Failed to index file ${filePath}:`, error);
      return false;
    }
  }

  private async createChunksFromContent(
    content: string,
    filePath: string,
    projectPath: string,
    stats: any
  ): Promise<CodeChunk[]> {
    const chunks: CodeChunk[] = [];
    const language = this.getLanguageFromExtension(path.extname(filePath));
    const lines = content.split('\n');

    const chunkSize = 50;
    const overlap = 5;

    for (let i = 0; i < lines.length; i += chunkSize - overlap) {
      const endLine = Math.min(i + chunkSize, lines.length);
      const chunkContent = lines.slice(i, endLine).join('\n');
      
      if (chunkContent.trim().length === 0) continue;

      chunks.push({
        id: `${filePath}:${i}:${endLine}`,
        filePath,
        content: chunkContent,
        type: this.detectChunkType(chunkContent),
        language,
        startLine: i + 1,
        endLine,
        metadata: {
          projectPath,
          lastModified: stats.mtime,
          size: stats.size,
          imports: [],
          exports: [],
          dependencies: [],
        },
      });
    }

    return chunks;
  }

  private detectChunkType(content: string): CodeChunk['type'] {
    const trimmed = content.trim();
    
    if (/^(export\s+)?(class|interface)\s+\w+/m.test(trimmed)) {
      return trimmed.includes('interface') ? 'interface' : 'class';
    }
    
    if (/^(export\s+)?(function|const\s+\w+\s*=|\w+\s*:\s*\()/m.test(trimmed)) {
      return 'function';
    }
    
    if (/^(export\s+)?(default\s+)?function\s+(\w+)?/m.test(trimmed)) {
      return 'component';
    }
    
    if (/(module\.exports|export\s+(default\s+)?{|import\s+.+from)/m.test(trimmed)) {
      return 'config';
    }
    
    return 'other';
  }

  registerIpcHandlers(): void {
    ipcMain.handle('rag:indexProject', async (_, projectPath: string) => {
      return await this.indexProject(projectPath);
    });

    ipcMain.handle('rag:indexFile', async (_, filePath: string, projectPath: string) => {
      return await this.indexFile(filePath, projectPath);
    });

    ipcMain.handle('rag:searchCode', async (_, query: string, projectPath?: string) => {
      return await this.searchCode(query, projectPath);
    });

    ipcMain.handle('rag:getProjectKnowledge', async (_, projectPath: string) => {
      return await this.getProjectKnowledge(projectPath);
    });

    ipcMain.handle('rag:getAllProjects', async () => {
      return await this.getAllProjects();
    });

    ipcMain.handle('rag:getStats', async (_, projectPath: string) => {
      return await vectorStore.getCollectionStats(projectPath);
    });
  }
}

export const ragSystem = new RAGSystem();