import * as fs from 'fs/promises';
import * as path from 'path';
import { ipcMain } from 'electron';
import { claudeAIService } from './claude-ai-service';
import { ragSystem } from './rag-system';

export interface Template {
  id: string;
  name: string;
  description: string;
  category: 'component' | 'function' | 'class' | 'config' | 'test' | 'documentation';
  language: string;
  framework?: string;
  content: string;
  variables: TemplateVariable[];
  usage: number;
  lastUpdated: Date;
  createdFrom?: string; // Source file or pattern
  tags: string[];
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  description: string;
  defaultValue?: any;
  required: boolean;
}

export interface GeneratedCode {
  content: string;
  filePath: string;
  explanation: string;
  relatedFiles: string[];
}

class TemplateSystem {
  private templates: Map<string, Template> = new Map();
  private templateStorage = path.join(process.cwd(), '.engie', 'templates');

  async initialize(): Promise<boolean> {
    try {
      await this.ensureStorageDirectory();
      await this.loadTemplates();
      await this.initializeDefaultTemplates();
      this.registerIpcHandlers();
      
      console.log('Template system initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize template system:', error);
      return false;
    }
  }

  private async ensureStorageDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.templateStorage, { recursive: true });
    } catch (error) {
      console.error('Failed to create template storage directory:', error);
    }
  }

  private async loadTemplates(): Promise<void> {
    try {
      const files = await fs.readdir(this.templateStorage);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.templateStorage, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const template = JSON.parse(content) as Template;
          this.templates.set(template.id, template);
        }
      }
      
      console.log(`Loaded ${this.templates.size} templates`);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  }

  private async saveTemplate(template: Template): Promise<void> {
    try {
      const filePath = path.join(this.templateStorage, `${template.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(template, null, 2));
      this.templates.set(template.id, template);
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  }

  private async initializeDefaultTemplates(): Promise<void> {
    const defaultTemplates: Template[] = [
      {
        id: 'react-functional-component',
        name: 'React Functional Component',
        description: 'A modern React functional component with TypeScript',
        category: 'component',
        language: 'typescript',
        framework: 'react',
        content: `import React from 'react';

interface {{componentName}}Props {
  {{#each props}}
  {{name}}: {{type}};
  {{/each}}
}

export const {{componentName}}: React.FC<{{componentName}}Props> = ({
  {{#each props}}{{name}}{{#unless @last}}, {{/unless}}{{/each}}
}) => {
  return (
    <div className="{{className}}">
      <h1>{{componentName}}</h1>
      {{content}}
    </div>
  );
};`,
        variables: [
          { name: 'componentName', type: 'string', description: 'Name of the component', required: true },
          { name: 'className', type: 'string', description: 'CSS class name', defaultValue: '', required: false },
          { name: 'props', type: 'array', description: 'Component props', defaultValue: [], required: false },
          { name: 'content', type: 'string', description: 'Component content', defaultValue: '<p>Hello World</p>', required: false },
        ],
        usage: 0,
        lastUpdated: new Date(),
        tags: ['react', 'component', 'typescript', 'functional'],
      },
      {
        id: 'express-route-handler',
        name: 'Express Route Handler',
        description: 'Express.js route handler with error handling',
        category: 'function',
        language: 'typescript',
        framework: 'express',
        content: `import { Request, Response, NextFunction } from 'express';

export const {{handlerName}} = async (
  req: Request<{{paramsType}}, {{responseType}}, {{bodyType}}>,
  res: Response<{{responseType}}>,
  next: NextFunction
): Promise<void> => {
  try {
    {{#if validation}}
    // Validate request
    {{validation}}
    {{/if}}
    
    // Process request
    {{implementation}}
    
    res.status({{statusCode}}).json({{response}});
  } catch (error) {
    next(error);
  }
};`,
        variables: [
          { name: 'handlerName', type: 'string', description: 'Name of the handler function', required: true },
          { name: 'paramsType', type: 'string', description: 'Request params type', defaultValue: 'any', required: false },
          { name: 'responseType', type: 'string', description: 'Response type', defaultValue: 'any', required: false },
          { name: 'bodyType', type: 'string', description: 'Request body type', defaultValue: 'any', required: false },
          { name: 'statusCode', type: 'number', description: 'HTTP status code', defaultValue: 200, required: false },
          { name: 'validation', type: 'string', description: 'Validation logic', defaultValue: '', required: false },
          { name: 'implementation', type: 'string', description: 'Main logic', defaultValue: '// TODO: Implement', required: false },
          { name: 'response', type: 'string', description: 'Response object', defaultValue: '{ success: true }', required: false },
        ],
        usage: 0,
        lastUpdated: new Date(),
        tags: ['express', 'route', 'handler', 'typescript', 'api'],
      },
      {
        id: 'python-class-template',
        name: 'Python Class',
        description: 'Python class with common methods',
        category: 'class',
        language: 'python',
        content: `class {{className}}:
    """{{description}}"""
    
    def __init__(self{{#each initParams}}, {{name}}: {{type}}{{/each}}):
        """Initialize {{className}}."""
        {{#each initParams}}
        self.{{name}} = {{name}}
        {{/each}}
    
    def __str__(self) -> str:
        """Return string representation."""
        return f"{{className}}({{#each initParams}}{{name}}={self.{{name}}}{{#unless @last}}, {{/unless}}{{/each}})"
    
    def __repr__(self) -> str:
        """Return detailed representation."""
        return self.__str__()
    
    {{#each methods}}
    def {{name}}(self{{#each params}}, {{name}}: {{type}}{{/each}}) -> {{returnType}}:
        """{{description}}"""
        {{implementation}}
    {{/each}}`,
        variables: [
          { name: 'className', type: 'string', description: 'Name of the class', required: true },
          { name: 'description', type: 'string', description: 'Class description', defaultValue: 'A Python class', required: false },
          { name: 'initParams', type: 'array', description: 'Constructor parameters', defaultValue: [], required: false },
          { name: 'methods', type: 'array', description: 'Class methods', defaultValue: [], required: false },
        ],
        usage: 0,
        lastUpdated: new Date(),
        tags: ['python', 'class', 'oop'],
      },
    ];

    for (const template of defaultTemplates) {
      if (!this.templates.has(template.id)) {
        await this.saveTemplate(template);
      }
    }
  }

  async generateCode(templateId: string, variables: Record<string, any>, projectPath?: string): Promise<GeneratedCode> {
    try {
      const template = this.templates.get(templateId);
      if (!template) {
        throw new Error(`Template ${templateId} not found`);
      }

      // Get project context if available
      let projectContext = '';
      if (projectPath) {
        const knowledge = await ragSystem.getProjectKnowledge(projectPath);
        if (knowledge) {
          projectContext = `Project context: ${knowledge.frameworks.join(', ')}, ${knowledge.languages.join(', ')}`;
        }
      }

      // Use Claude to enhance the template with intelligent variable substitution
      const enhancedContent = await this.enhanceTemplate(template, variables, projectContext);
      
      // Generate file path suggestion
      const suggestedPath = await this.suggestFilePath(template, variables, projectPath);
      
      // Generate explanation
      const explanation = await this.generateExplanation(template, variables, enhancedContent);
      
      // Find related files
      const relatedFiles = projectPath ? 
        await this.findRelatedFiles(enhancedContent, projectPath) : [];

      // Update usage count
      template.usage++;
      await this.saveTemplate(template);

      return {
        content: enhancedContent,
        filePath: suggestedPath,
        explanation,
        relatedFiles,
      };
    } catch (error) {
      console.error('Error generating code:', error);
      throw error;
    }
  }

  private async enhanceTemplate(
    template: Template, 
    variables: Record<string, any>, 
    projectContext: string
  ): Promise<string> {
    try {
      const prompt = `Enhance this code template with the provided variables and project context:

Template: ${template.name}
Description: ${template.description}
Language: ${template.language}
Framework: ${template.framework || 'none'}

Template Content:
${template.content}

Variables:
${JSON.stringify(variables, null, 2)}

Project Context:
${projectContext}

Please:
1. Replace template variables with provided values
2. Add appropriate imports based on the framework and language
3. Add proper error handling if applicable
4. Follow best practices for the language/framework
5. Add helpful comments
6. Ensure the code is production-ready

Return only the enhanced code without explanations.`;

      const response = await claudeAIService.sendMessage(prompt);
      return response.content;
    } catch (error) {
      console.error('Error enhancing template:', error);
      // Fallback to simple variable replacement
      return this.simpleTemplateReplacement(template.content, variables);
    }
  }

  private simpleTemplateReplacement(content: string, variables: Record<string, any>): string {
    let result = content;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    }
    
    return result;
  }

  private async suggestFilePath(
    template: Template, 
    variables: Record<string, any>, 
    projectPath?: string
  ): Promise<string> {
    try {
      let fileName = '';
      let directory = '';

      // Generate filename based on template type and variables
      switch (template.category) {
        case 'component':
          fileName = `${variables.componentName || 'Component'}`;
          directory = 'components';
          break;
        case 'function':
          fileName = `${variables.handlerName || variables.functionName || 'handler'}`;
          directory = template.framework === 'express' ? 'routes' : 'utils';
          break;
        case 'class':
          fileName = `${variables.className || 'Class'}`;
          directory = 'models';
          break;
        case 'test':
          fileName = `${variables.testName || 'test'}`;
          directory = 'tests';
          break;
        default:
          fileName = 'generated';
          directory = 'src';
      }

      // Add appropriate extension
      const extension = this.getExtensionForLanguage(template.language);
      fileName += extension;

      // Combine with project path if available
      if (projectPath) {
        return path.join(projectPath, directory, fileName);
      }

      return path.join(directory, fileName);
    } catch (error) {
      console.error('Error suggesting file path:', error);
      return 'generated.txt';
    }
  }

  private getExtensionForLanguage(language: string): string {
    const extensions: Record<string, string> = {
      'javascript': '.js',
      'typescript': '.ts',
      'python': '.py',
      'java': '.java',
      'go': '.go',
      'rust': '.rs',
      'cpp': '.cpp',
      'c': '.c',
    };
    
    return extensions[language] || '.txt';
  }

  private async generateExplanation(
    template: Template, 
    variables: Record<string, any>, 
    generatedCode: string
  ): Promise<string> {
    try {
      const prompt = `Explain this generated code in a helpful way:

Template: ${template.name}
Generated Code:
${generatedCode}

Please provide:
1. What this code does
2. How to use it
3. Any important considerations
4. Next steps or related tasks

Keep the explanation concise but helpful.`;

      const response = await claudeAIService.sendMessage(prompt);
      return response.content;
    } catch (error) {
      console.error('Error generating explanation:', error);
      return `Generated ${template.name} using template. Review the code and customize as needed.`;
    }
  }

  private async findRelatedFiles(content: string, projectPath: string): Promise<string[]> {
    try {
      // Extract imports and dependencies from generated code
      const imports = this.extractImports(content);
      const searchResults = await ragSystem.searchCode(imports.join(' '), projectPath);
      
      return searchResults.slice(0, 5).map(result => result.chunk.filePath);
    } catch (error) {
      console.error('Error finding related files:', error);
      return [];
    }
  }

  private extractImports(content: string): string[] {
    const imports: string[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
        imports.push(trimmed);
      }
    }
    
    return imports;
  }

  async createTemplateFromCode(
    code: string, 
    metadata: {
      name: string;
      description: string;
      category: Template['category'];
      language: string;
      framework?: string;
      tags: string[];
    }
  ): Promise<Template> {
    try {
      // Use Claude to analyze the code and create a template
      const prompt = `Analyze this code and create a reusable template:

Code:
${code}

Metadata:
${JSON.stringify(metadata, null, 2)}

Please:
1. Identify parts that should be variable (replace with {{variableName}})
2. Create appropriate template variables with types and descriptions
3. Keep the structure but make it reusable

Return a JSON object with:
- content (the templateized code)
- variables (array of variable definitions)`;

      const response = await claudeAIService.sendMessage(prompt);
      
      try {
        const analyzed = JSON.parse(response.content);
        
        const template: Template = {
          id: `custom-${Date.now()}`,
          name: metadata.name,
          description: metadata.description,
          category: metadata.category,
          language: metadata.language,
          framework: metadata.framework,
          content: analyzed.content,
          variables: analyzed.variables,
          usage: 0,
          lastUpdated: new Date(),
          createdFrom: 'user-code',
          tags: metadata.tags,
        };

        await this.saveTemplate(template);
        return template;
      } catch (parseError) {
        throw new Error('Failed to parse Claude response for template creation');
      }
    } catch (error) {
      console.error('Error creating template from code:', error);
      throw error;
    }
  }

  async updateTemplatesFromProject(projectPath: string): Promise<number> {
    try {
      const knowledge = await ragSystem.getProjectKnowledge(projectPath);
      if (!knowledge) {
        return 0;
      }

      let updatedCount = 0;

      // Search for patterns that could become templates
      const searchResults = await ragSystem.searchCode('function component class', projectPath);
      
      const patterns = new Map<string, string[]>();
      
      for (const result of searchResults) {
        const key = `${result.chunk.type}-${result.chunk.language}`;
        if (!patterns.has(key)) {
          patterns.set(key, []);
        }
        patterns.get(key)!.push(result.chunk.content);
      }

      // Analyze patterns for template opportunities
      for (const [patternKey, codes] of patterns) {
        if (codes.length >= 3) { // Need at least 3 similar patterns
          const newTemplate = await this.analyzePatternForTemplate(patternKey, codes, knowledge);
          if (newTemplate) {
            await this.saveTemplate(newTemplate);
            updatedCount++;
          }
        }
      }

      return updatedCount;
    } catch (error) {
      console.error('Error updating templates from project:', error);
      return 0;
    }
  }

  private async analyzePatternForTemplate(
    patternKey: string, 
    codes: string[], 
    knowledge: any
  ): Promise<Template | null> {
    try {
      const prompt = `Analyze these similar code patterns and create a reusable template:

Pattern Type: ${patternKey}
Project Info: ${knowledge.frameworks.join(', ')} - ${knowledge.languages.join(', ')}

Code Examples:
${codes.slice(0, 3).map((code, i) => `Example ${i + 1}:\n${code}`).join('\n\n---\n\n')}

Create a template that captures the common structure while making differences configurable.
Return JSON with template definition including content with {{variables}} and variable definitions.`;

      const response = await claudeAIService.sendMessage(prompt);
      
      try {
        const templateData = JSON.parse(response.content);
        
        return {
          id: `auto-${patternKey}-${Date.now()}`,
          name: templateData.name || `Auto-generated ${patternKey}`,
          description: templateData.description || `Template generated from project patterns`,
          category: this.inferCategory(patternKey),
          language: knowledge.languages[0] || 'unknown',
          framework: knowledge.frameworks[0],
          content: templateData.content,
          variables: templateData.variables || [],
          usage: 0,
          lastUpdated: new Date(),
          createdFrom: `pattern-analysis`,
          tags: ['auto-generated', ...knowledge.frameworks, ...knowledge.languages],
        };
      } catch {
        return null;
      }
    } catch (error) {
      console.error('Error analyzing pattern for template:', error);
      return null;
    }
  }

  private inferCategory(patternKey: string): Template['category'] {
    if (patternKey.includes('component')) return 'component';
    if (patternKey.includes('function')) return 'function';
    if (patternKey.includes('class')) return 'class';
    if (patternKey.includes('test')) return 'test';
    if (patternKey.includes('config')) return 'config';
    return 'component';
  }

  async getTemplates(category?: Template['category'], language?: string): Promise<Template[]> {
    const allTemplates = Array.from(this.templates.values());
    
    return allTemplates.filter(template => {
      if (category && template.category !== category) return false;
      if (language && template.language !== language) return false;
      return true;
    });
  }

  async deleteTemplate(templateId: string): Promise<boolean> {
    try {
      const filePath = path.join(this.templateStorage, `${templateId}.json`);
      await fs.unlink(filePath);
      this.templates.delete(templateId);
      return true;
    } catch (error) {
      console.error('Error deleting template:', error);
      return false;
    }
  }

  registerIpcHandlers(): void {
    ipcMain.handle('template:generate', async (_, templateId: string, variables: Record<string, any>, projectPath?: string) => {
      return await this.generateCode(templateId, variables, projectPath);
    });

    ipcMain.handle('template:getAll', async (_, category?: Template['category'], language?: string) => {
      return await this.getTemplates(category, language);
    });

    ipcMain.handle('template:create', async (_, code: string, metadata: any) => {
      return await this.createTemplateFromCode(code, metadata);
    });

    ipcMain.handle('template:updateFromProject', async (_, projectPath: string) => {
      return await this.updateTemplatesFromProject(projectPath);
    });

    ipcMain.handle('template:delete', async (_, templateId: string) => {
      return await this.deleteTemplate(templateId);
    });
  }
}

export const templateSystem = new TemplateSystem();