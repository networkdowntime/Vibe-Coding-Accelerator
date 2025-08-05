import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use promises for async file operations
const fsPromises = fs.promises;

/**
 * Controller for AI agents and tech stack management
 */
class AgentsController {
  /**
   * Get all available AI agents
   */
  async getAvailableAgents(req, res) {
    try {
      const agentsDir = path.join(__dirname, '../../../ai_agents');
      
      // For now, return predefined agents based on README
      // In the future, this could scan subdirectories dynamically
      const agents = [
        {
          id: 'coding-standards-enforcer',
          name: 'Coding Standards Enforcer',
          description: 'Ensures code follows project standards',
          type: 'code-quality'
        },
        {
          id: 'documentation-generator',
          name: 'Documentation Generator',
          description: 'Creates comprehensive documentation',
          type: 'documentation'
        },
        {
          id: 'code-reviewer',
          name: 'Code Reviewer',
          description: 'Provides intelligent code review feedback',
          type: 'review'
        },
        {
          id: 'architecture-advisor',
          name: 'Architecture Advisor',
          description: 'Suggests architectural improvements',
          type: 'architecture'
        }
      ];

      res.json({
        success: true,
        agents
      });
    } catch (error) {
      console.error('Error getting available agents:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve available agents'
      });
    }
  }

  /**
   * Get available tech stack options from instruction files
   */
  async getTechStackOptions(req, res) {
    try {
      const instructionsDir = path.join(__dirname, '../../../.github/instructions');
      
      // Read all instruction files
      const files = await fsPromises.readdir(instructionsDir);
      const instructionFiles = files.filter(file => file.endsWith('.instructions.md'));
      
      const techStacks = [];
      
      for (const file of instructionFiles) {
        // Simple implementation without helper methods for now
        let name = file.replace('.instructions.md', '').replace(/^tech-/, '');
        name = name.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        
        let category = 'Other';
        if (file.startsWith('tech-')) {
          if (file.includes('angular') || file.includes('react') || file.includes('ui-ux')) {
            category = 'Frontend';
          } else if (file.includes('java') || file.includes('spring') || file.includes('quarkus') || file.includes('python')) {
            category = 'Backend';
          } else if (file.includes('javascript') || file.includes('typescript')) {
            category = 'Language';
          } else if (file.includes('docker') || file.includes('performance')) {
            category = 'Infrastructure';
          } else {
            category = 'Development';
          }
        } else if (file.startsWith('security-')) {
          category = 'Security';
        } else if (file.startsWith('spec-workflow')) {
          category = 'Process';
        }
        
        techStacks.push({
          id: file.replace('.instructions.md', ''),
          name,
          description: 'Development standards and best practices',
          category,
          filename: file
        });
      }
      
      // Sort by category and name
      techStacks.sort((a, b) => {
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category);
        }
        return a.name.localeCompare(b.name);
      });

      res.json({
        success: true,
        techStacks
      });
    } catch (error) {
      console.error('Error getting tech stack options:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve tech stack options'
      });
    }
  }

  /**
   * Save tech stack selection to project
   */
  async saveTechStackSelection(req, res) {
    try {
      const { projectId } = req.params;
      const { selectedTechStacks, selectedAgent } = req.body;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          message: 'Project ID is required'
        });
      }

      if (!selectedTechStacks || !Array.isArray(selectedTechStacks)) {
        return res.status(400).json({
          success: false,
          message: 'Selected tech stacks must be an array'
        });
      }

      const projectsDir = path.join(__dirname, '../projects');
      const projectDir = path.join(projectsDir, projectId);

      // Check if project exists
      try {
        await fsPromises.access(projectDir);
      } catch {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      // Save tech stack selection to techstack.txt
      const techStackContent = selectedTechStacks.join('\n');
      const techStackPath = path.join(projectDir, 'techstack.txt');
      await fsPromises.writeFile(techStackPath, techStackContent, 'utf8');

      // Save agent selection to agent-config.json
      if (selectedAgent) {
        const agentConfig = {
          selectedAgent,
          selectedTechStacks,
          updatedAt: new Date().toISOString()
        };
        const agentConfigPath = path.join(projectDir, 'agent-config.json');
        await fsPromises.writeFile(agentConfigPath, JSON.stringify(agentConfig, null, 2), 'utf8');
      }

      res.json({
        success: true,
        message: 'Tech stack and agent configuration saved successfully',
        data: {
          selectedTechStacks,
          selectedAgent
        }
      });
    } catch (error) {
      console.error('Error saving tech stack selection:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save tech stack selection'
      });
    }
  }

  /**
   * Get saved tech stack selection for a project
   */
  async getTechStackSelection(req, res) {
    try {
      const { projectId } = req.params;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          message: 'Project ID is required'
        });
      }

      const projectsDir = path.join(__dirname, '../projects');
      const projectDir = path.join(projectsDir, projectId);
      const techStackPath = path.join(projectDir, 'techstack.txt');
      const agentConfigPath = path.join(projectDir, 'agent-config.json');

      let selectedTechStacks = [];
      let selectedAgent = null;

      // Read tech stack file if it exists
      try {
        const techStackContent = await fsPromises.readFile(techStackPath, 'utf8');
        selectedTechStacks = techStackContent.trim().split('\n').filter(line => line.trim());
      } catch {
        // File doesn't exist yet, that's okay
      }

      // Read agent config if it exists
      try {
        const agentConfigContent = await fsPromises.readFile(agentConfigPath, 'utf8');
        const agentConfig = JSON.parse(agentConfigContent);
        selectedAgent = agentConfig.selectedAgent;
        // Update tech stacks from agent config if available
        if (agentConfig.selectedTechStacks) {
          selectedTechStacks = agentConfig.selectedTechStacks;
        }
      } catch {
        // File doesn't exist yet, that's okay
      }

      res.json({
        success: true,
        data: {
          selectedTechStacks,
          selectedAgent
        }
      });
    } catch (error) {
      console.error('Error getting tech stack selection:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve tech stack selection'
      });
    }
  }

  /**
   * Extract tech stack name from filename and content
   */
  extractTechStackName(filename, content) {
    // Remove file extension and prefix
    let name = filename.replace('.instructions.md', '').replace(/^tech-/, '');
    
    // Convert kebab-case to title case
    name = name.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');

    // Special cases for better naming
    const nameMap = {
      'Angular': 'Angular',
      'Reactjs': 'React.js',
      'Springboot': 'Spring Boot',
      'Javascript': 'JavaScript',
      'Typescript': 'TypeScript',
      'Performance Optimization': 'Performance Optimization',
      'Code Commenting': 'Code Commenting',
      'General Coding': 'General Coding Standards',
      'Containerization Docker': 'Docker & Containerization',
      'Ui Ux Tailwind': 'UI/UX with Tailwind CSS'
    };

    return nameMap[name] || name;
  }

  /**
   * Extract description from file content
   */
  extractDescription(content) {
    // Try to extract description from front matter
    const frontMatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (frontMatterMatch) {
      const frontMatter = frontMatterMatch[1];
      const descMatch = frontMatter.match(/description:\s*["']?(.*?)["']?\s*$/m);
      if (descMatch) {
        return descMatch[1];
      }
    }

    // Fallback: extract first paragraph or header
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.startsWith('# ') && line.length > 2) {
        return line.substring(2).trim();
      }
    }

    return 'Development standards and best practices';
  }

  /**
   * Extract category from filename
   */
  extractCategory(filename) {
    if (filename.startsWith('tech-')) {
      if (filename.includes('angular') || filename.includes('react') || filename.includes('ui-ux')) {
        return 'Frontend';
      }
      if (filename.includes('java') || filename.includes('spring') || filename.includes('quarkus') || filename.includes('python')) {
        return 'Backend';
      }
      if (filename.includes('javascript') || filename.includes('typescript')) {
        return 'Language';
      }
      if (filename.includes('docker') || filename.includes('performance')) {
        return 'Infrastructure';
      }
      return 'Development';
    }
    if (filename.startsWith('security-')) {
      return 'Security';
    }
    if (filename.startsWith('spec-workflow')) {
      return 'Process';
    }
    return 'Other';
  }
}

export default new AgentsController();
