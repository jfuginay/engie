import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { watch } from 'chokidar';
import { ipcMain } from 'electron';
import { mcpTaskMasterClient } from './mcp-taskmaster-client';
import { claudeAIService } from './claude-ai-service';

const execAsync = promisify(exec);

export interface GitCommit {
  hash: string;
  author: string;
  date: Date;
  message: string;
  files: string[];
}

export interface ProjectAnalysis {
  recentCommits: GitCommit[];
  changedFiles: string[];
  projectType: string;
  complexity: 'low' | 'medium' | 'high';
  suggestedTasks: string[];
}

class GitMonitor {
  private watchers: Map<string, any> = new Map();
  private projectPaths: Set<string> = new Set();
  private lastCommitHash: Map<string, string> = new Map();
  private isMonitoring = false;

  async initialize(): Promise<boolean> {
    try {
      this.registerIpcHandlers();
      console.log('Git monitor initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize Git monitor:', error);
      return false;
    }
  }

  async addProject(projectPath: string): Promise<boolean> {
    try {
      // Check if it's a git repository
      const isGitRepo = await this.isGitRepository(projectPath);
      if (!isGitRepo) {
        console.warn(`${projectPath} is not a git repository`);
        return false;
      }

      this.projectPaths.add(projectPath);
      
      // Set up file watching
      await this.setupFileWatcher(projectPath);
      
      // Set up git hooks
      await this.setupGitHooks(projectPath);
      
      // Get initial commit hash
      const lastCommit = await this.getLastCommitHash(projectPath);
      if (lastCommit) {
        this.lastCommitHash.set(projectPath, lastCommit);
      }

      console.log(`Added project monitoring for: ${projectPath}`);
      return true;
    } catch (error) {
      console.error(`Failed to add project ${projectPath}:`, error);
      return false;
    }
  }

  async removeProject(projectPath: string): Promise<boolean> {
    try {
      const watcher = this.watchers.get(projectPath);
      if (watcher) {
        await watcher.close();
        this.watchers.delete(projectPath);
      }

      this.projectPaths.delete(projectPath);
      this.lastCommitHash.delete(projectPath);

      console.log(`Removed project monitoring for: ${projectPath}`);
      return true;
    } catch (error) {
      console.error(`Failed to remove project ${projectPath}:`, error);
      return false;
    }
  }

  private async isGitRepository(projectPath: string): Promise<boolean> {
    try {
      await execAsync('git rev-parse --git-dir', { cwd: projectPath });
      return true;
    } catch {
      return false;
    }
  }

  private async setupFileWatcher(projectPath: string): Promise<void> {
    const watcher = watch(projectPath, {
      ignored: [
        /(^|[\/\\])\../, // Ignore dotfiles
        /node_modules/,
        /\.git/,
        /dist/,
        /build/,
        /coverage/,
      ],
      persistent: true,
      ignoreInitial: true,
    });

    watcher.on('change', (filePath) => {
      this.handleFileChange(projectPath, filePath);
    });

    watcher.on('add', (filePath) => {
      this.handleFileChange(projectPath, filePath);
    });

    watcher.on('unlink', (filePath) => {
      this.handleFileChange(projectPath, filePath);
    });

    this.watchers.set(projectPath, watcher);
  }

  private async setupGitHooks(projectPath: string): Promise<void> {
    try {
      const hooksDir = path.join(projectPath, '.git', 'hooks');
      
      // Create post-commit hook
      const postCommitHook = `#!/bin/sh
# ENGIE auto-generated hook
node -e "
const http = require('http');
const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/git-hook/post-commit',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

const req = http.request(options, (res) => {
  console.log('ENGIE notified of commit');
});

req.on('error', (e) => {
  // Fail silently if ENGIE is not running
});

req.write(JSON.stringify({
  projectPath: '${projectPath}',
  type: 'post-commit'
}));
req.end();
"
`;

      const hookPath = path.join(hooksDir, 'post-commit');
      await fs.writeFile(hookPath, postCommitHook, { mode: 0o755 });
      
      console.log(`Git hooks set up for ${projectPath}`);
    } catch (error) {
      console.error(`Failed to set up git hooks for ${projectPath}:`, error);
    }
  }

  private async handleFileChange(projectPath: string, filePath: string): Promise<void> {
    try {
      // Debounce file changes
      setTimeout(async () => {
        await this.analyzeFileChange(projectPath, filePath);
      }, 1000);
    } catch (error) {
      console.error('Error handling file change:', error);
    }
  }

  private async analyzeFileChange(projectPath: string, filePath: string): Promise<void> {
    try {
      const analysis = await this.analyzeProject(projectPath);
      
      // Check if we should create tasks based on the changes
      if (analysis.suggestedTasks.length > 0) {
        for (const taskDescription of analysis.suggestedTasks) {
          try {
            await mcpTaskMasterClient.createTask(taskDescription, 'medium');
          } catch (error) {
            console.error('Failed to create auto-generated task:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error analyzing file change:', error);
    }
  }

  async handleCommit(projectPath: string): Promise<void> {
    try {
      const newCommitHash = await this.getLastCommitHash(projectPath);
      const oldCommitHash = this.lastCommitHash.get(projectPath);

      if (newCommitHash && newCommitHash !== oldCommitHash) {
        console.log(`New commit detected in ${projectPath}: ${newCommitHash}`);
        
        // Get commit details
        const commitDetails = await this.getCommitDetails(projectPath, newCommitHash);
        
        // Analyze the commit and potentially create tasks
        await this.analyzeCommit(projectPath, commitDetails);
        
        // Update stored commit hash
        this.lastCommitHash.set(projectPath, newCommitHash);
      }
    } catch (error) {
      console.error('Error handling commit:', error);
    }
  }

  private async getLastCommitHash(projectPath: string): Promise<string | null> {
    try {
      const { stdout } = await execAsync('git rev-parse HEAD', { cwd: projectPath });
      return stdout.trim();
    } catch {
      return null;
    }
  }

  private async getCommitDetails(projectPath: string, commitHash: string): Promise<GitCommit> {
    try {
      const { stdout: commitInfo } = await execAsync(
        `git show --format="%H|%an|%ad|%s" --name-only ${commitHash}`,
        { cwd: projectPath }
      );

      const lines = commitInfo.trim().split('\n');
      const [hash, author, date, message] = lines[0].split('|');
      const files = lines.slice(2).filter(line => line.trim() !== '');

      return {
        hash,
        author,
        date: new Date(date),
        message,
        files,
      };
    } catch (error) {
      console.error('Error getting commit details:', error);
      throw error;
    }
  }

  private async analyzeCommit(projectPath: string, commit: GitCommit): Promise<void> {
    try {
      // Use Claude to analyze the commit and suggest tasks
      const analysis = await claudeAIService.sendMessage(`
Analyze this git commit and suggest follow-up tasks if needed:

Project: ${projectPath}
Commit: ${commit.hash.slice(0, 8)}
Author: ${commit.author}
Message: ${commit.message}
Files changed: ${commit.files.join(', ')}

Based on this commit, suggest any follow-up tasks that might be needed:
- Testing requirements
- Documentation updates
- Code review items
- Integration considerations
- Deployment tasks

Respond with a JSON array of task descriptions, or an empty array if no tasks are needed.
Example: ["Add unit tests for new feature", "Update API documentation"]
`);

      try {
        const suggestions = JSON.parse(analysis.content);
        if (Array.isArray(suggestions) && suggestions.length > 0) {
          for (const taskDescription of suggestions) {
            await mcpTaskMasterClient.createTask(
              `${taskDescription} (Auto-generated from commit ${commit.hash.slice(0, 8)})`,
              'medium'
            );
          }
          console.log(`Created ${suggestions.length} tasks based on commit ${commit.hash.slice(0, 8)}`);
        }
      } catch (parseError) {
        console.error('Failed to parse Claude response for commit analysis:', parseError);
      }
    } catch (error) {
      console.error('Error analyzing commit:', error);
    }
  }

  async analyzeProject(projectPath: string): Promise<ProjectAnalysis> {
    try {
      // Get recent commits
      const recentCommits = await this.getRecentCommits(projectPath, 5);
      
      // Get changed files in working directory
      const changedFiles = await this.getChangedFiles(projectPath);
      
      // Determine project type
      const projectType = await this.detectProjectType(projectPath);
      
      // Calculate complexity
      const complexity = await this.calculateComplexity(projectPath);
      
      // Generate suggested tasks
      const suggestedTasks = await this.generateSuggestedTasks(projectPath, {
        recentCommits,
        changedFiles,
        projectType,
      });

      return {
        recentCommits,
        changedFiles,
        projectType,
        complexity,
        suggestedTasks,
      };
    } catch (error) {
      console.error('Error analyzing project:', error);
      return {
        recentCommits: [],
        changedFiles: [],
        projectType: 'unknown',
        complexity: 'low',
        suggestedTasks: [],
      };
    }
  }

  private async getRecentCommits(projectPath: string, count: number): Promise<GitCommit[]> {
    try {
      const { stdout } = await execAsync(
        `git log --format="%H|%an|%ad|%s" --name-only -${count}`,
        { cwd: projectPath }
      );

      const commits: GitCommit[] = [];
      const blocks = stdout.split('\n\n').filter(block => block.trim());

      for (const block of blocks) {
        const lines = block.trim().split('\n');
        if (lines.length > 0) {
          const [hash, author, date, message] = lines[0].split('|');
          const files = lines.slice(1).filter(line => line.trim() !== '');

          commits.push({
            hash,
            author,
            date: new Date(date),
            message,
            files,
          });
        }
      }

      return commits;
    } catch (error) {
      console.error('Error getting recent commits:', error);
      return [];
    }
  }

  private async getChangedFiles(projectPath: string): Promise<string[]> {
    try {
      const { stdout } = await execAsync('git status --porcelain', { cwd: projectPath });
      return stdout
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.slice(3)); // Remove status prefix
    } catch {
      return [];
    }
  }

  private async detectProjectType(projectPath: string): Promise<string> {
    try {
      const files = await fs.readdir(projectPath);
      
      if (files.includes('package.json')) {
        const packageJson = JSON.parse(
          await fs.readFile(path.join(projectPath, 'package.json'), 'utf-8')
        );
        
        if (packageJson.dependencies?.react) return 'react';
        if (packageJson.dependencies?.vue) return 'vue';
        if (packageJson.dependencies?.angular) return 'angular';
        if (packageJson.dependencies?.electron) return 'electron';
        return 'nodejs';
      }
      
      if (files.includes('Cargo.toml')) return 'rust';
      if (files.includes('go.mod')) return 'go';
      if (files.includes('requirements.txt') || files.includes('pyproject.toml')) return 'python';
      if (files.includes('pom.xml') || files.includes('build.gradle')) return 'java';
      
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  private async calculateComplexity(projectPath: string): Promise<'low' | 'medium' | 'high'> {
    try {
      const { stdout } = await execAsync('find . -type f -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.java" | wc -l', { cwd: projectPath });
      const fileCount = parseInt(stdout.trim());
      
      if (fileCount < 20) return 'low';
      if (fileCount < 100) return 'medium';
      return 'high';
    } catch {
      return 'low';
    }
  }

  private async generateSuggestedTasks(projectPath: string, context: any): Promise<string[]> {
    // This could be enhanced with Claude analysis
    const tasks: string[] = [];
    
    if (context.changedFiles.length > 5) {
      tasks.push('Review recent changes for consistency');
    }
    
    if (context.changedFiles.some((f: string) => f.includes('test'))) {
      tasks.push('Update related tests');
    }
    
    return tasks;
  }

  registerIpcHandlers(): void {
    ipcMain.handle('git:addProject', async (_, projectPath: string) => {
      return await this.addProject(projectPath);
    });

    ipcMain.handle('git:removeProject', async (_, projectPath: string) => {
      return await this.removeProject(projectPath);
    });

    ipcMain.handle('git:analyzeProject', async (_, projectPath: string) => {
      return await this.analyzeProject(projectPath);
    });

    ipcMain.handle('git:getProjects', async () => {
      return Array.from(this.projectPaths);
    });

    ipcMain.handle('git:handleCommit', async (_, projectPath: string) => {
      return await this.handleCommit(projectPath);
    });
  }
}

export const gitMonitor = new GitMonitor();