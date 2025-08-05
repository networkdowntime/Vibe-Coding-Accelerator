const fs = require('fs').promises;
const path = require('path');

// Get the root path of the project (3 levels up from backend/controllers)
const rootPath = path.join(__dirname, '..', '..', '..');
const aiAgentsPath = path.join(rootPath, 'ai_agents');
const projectsPath = path.join(rootPath, 'projects');

/**
 * Convert camelCase to Title Case with spaces
 * e.g., "githubCopilot" -> "Github Copilot"
 */
function camelCaseToTitleCase(str) {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

/**
 * Extract tech stack name from filename
 * e.g., "tech-javascript.instructions.md" -> "javascript"
 */
function extractTechStackName(filename) {
  const match = filename.match(/^tech-(.+)\.instructions\.md$/);
  return match ? match[1] : null;
}

/**
 * Get all available AI agents from filesystem
 */
async function getAgents(req, res) {
  try {
    // Check if ai_agents directory exists
    try {
      await fs.access(aiAgentsPath);
    } catch (error) {
      return res.json({ agents: [] });
    }

    const entries = await fs.readdir(aiAgentsPath, { withFileTypes: true });
    const agents = entries
      .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
      .map(entry => ({
        id: entry.name,
        name: camelCaseToTitleCase(entry.name)
      }));

    res.json({ agents });
  } catch (error) {
    console.error('Error getting agents:', error);
    res.status(500).json({ error: 'Failed to load AI agents' });
  }
}

/**
 * Get tech stack options for a specific agent
 */
async function getTechStacks(req, res) {
  try {
    const { agentName } = req.params;
    const instructionsPath = path.join(aiAgentsPath, agentName, 'instructions');

    // Check if instructions directory exists
    try {
      await fs.access(instructionsPath);
    } catch (error) {
      return res.json({ techStacks: [] });
    }

    const files = await fs.readdir(instructionsPath);
    const techStacks = files
      .map(extractTechStackName)
      .filter(name => name !== null)
      .map(name => ({
        id: name,
        name: camelCaseToTitleCase(name),
        displayName: name
      }));

    res.json({ techStacks });
  } catch (error) {
    console.error('Error getting tech stacks:', error);
    res.status(500).json({ error: 'Failed to load tech stacks' });
  }
}

/**
 * Save tech stack and AI agent selection to project's project-config.json file
 */
async function saveTechStack(req, res) {
  try {
    const { projectName } = req.params;
    const { techStack, aiAgent } = req.body;

    if (!Array.isArray(techStack)) {
      return res.status(400).json({ error: 'Tech stack must be an array' });
    }

    const projectPath = path.join(projectsPath, projectName);
    const configFilePath = path.join(projectPath, 'project-config.json');

    // Ensure project directory exists
    await fs.mkdir(projectPath, { recursive: true });

    // Read existing config or create new one
    let config = {};
    try {
      const existingContent = await fs.readFile(configFilePath, 'utf8');
      config = JSON.parse(existingContent);
    } catch (error) {
      // File doesn't exist or is invalid JSON, start with empty config
      config = {};
    }

    // Update config with new values
    config['tech-stack'] = techStack;
    if (aiAgent) {
      config['ai-agent'] = aiAgent;
    }

    // Write config to file
    await fs.writeFile(configFilePath, JSON.stringify(config, null, 2), 'utf8');

    res.json({ 
      message: 'Project configuration saved successfully', 
      techStack, 
      aiAgent: config['ai-agent'] 
    });
  } catch (error) {
    console.error('Error saving project configuration:', error);
    res.status(500).json({ error: 'Failed to save project configuration' });
  }
}

/**
 * Get tech stack and AI agent for a project from project-config.json file
 * Provides backwards compatibility with techstack.txt files
 */
async function getTechStack(req, res) {
  try {
    const { projectName } = req.params;
    const projectPath = path.join(projectsPath, projectName);
    const configFilePath = path.join(projectPath, 'project-config.json');
    const legacyTechStackPath = path.join(projectPath, 'techstack.txt');

    try {
      // Try to read from new config file first
      const configContent = await fs.readFile(configFilePath, 'utf8');
      const config = JSON.parse(configContent);
      
      res.json({ 
        techStack: config['tech-stack'] || [],
        aiAgent: config['ai-agent'] || null
      });
    } catch (configError) {
      // Config file doesn't exist or is invalid, check for legacy file
      try {
        const legacyContent = await fs.readFile(legacyTechStackPath, 'utf8');
        const techStack = legacyContent
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
        
        // Migrate legacy file to new format
        const config = {
          'tech-stack': techStack
        };
        await fs.writeFile(configFilePath, JSON.stringify(config, null, 2), 'utf8');
        
        res.json({ 
          techStack,
          aiAgent: null
        });
      } catch (legacyError) {
        // Neither file exists
        if (legacyError.code === 'ENOENT' && configError.code === 'ENOENT') {
          res.json({ 
            techStack: [],
            aiAgent: null
          });
        } else {
          throw legacyError;
        }
      }
    }
  } catch (error) {
    console.error('Error getting project configuration:', error);
    res.status(500).json({ error: 'Failed to load project configuration' });
  }
}

/**
 * Save AI agent selection to project's project-config.json file
 */
async function saveAiAgent(req, res) {
  try {
    const { projectName } = req.params;
    const { aiAgent } = req.body;

    if (!aiAgent || typeof aiAgent !== 'string') {
      return res.status(400).json({ error: 'AI agent must be a non-empty string' });
    }

    const projectPath = path.join(projectsPath, projectName);
    const configFilePath = path.join(projectPath, 'project-config.json');

    // Ensure project directory exists
    await fs.mkdir(projectPath, { recursive: true });

    // Read existing config or create new one
    let config = {};
    try {
      const existingContent = await fs.readFile(configFilePath, 'utf8');
      config = JSON.parse(existingContent);
    } catch (error) {
      // File doesn't exist or is invalid JSON, start with empty config
      config = {};
    }

    // Update config with AI agent
    config['ai-agent'] = aiAgent;

    // Write config to file
    await fs.writeFile(configFilePath, JSON.stringify(config, null, 2), 'utf8');

    res.json({ 
      message: 'AI agent saved successfully', 
      aiAgent
    });
  } catch (error) {
    console.error('Error saving AI agent:', error);
    res.status(500).json({ error: 'Failed to save AI agent' });
  }
}

/**
 * Get AI agent for a project from project-config.json file
 */
async function getAiAgent(req, res) {
  try {
    const { projectName } = req.params;
    const projectPath = path.join(projectsPath, projectName);
    const configFilePath = path.join(projectPath, 'project-config.json');

    try {
      const configContent = await fs.readFile(configFilePath, 'utf8');
      const config = JSON.parse(configContent);
      
      res.json({ 
        aiAgent: config['ai-agent'] || null
      });
    } catch (error) {
      // Config file doesn't exist or is invalid
      if (error.code === 'ENOENT') {
        res.json({ aiAgent: null });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error getting AI agent:', error);
    res.status(500).json({ error: 'Failed to load AI agent' });
  }
}

module.exports = {
  getAgents,
  getTechStacks,
  saveTechStack,
  getTechStack,
  saveAiAgent,
  getAiAgent
};
