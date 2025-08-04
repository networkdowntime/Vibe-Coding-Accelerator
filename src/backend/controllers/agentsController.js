const fs = require('fs').promises;
const path = require('path');

// Get the root path of the project (4 levels up from backend/controllers)
const rootPath = path.join(__dirname, '..', '..', '..', '..');
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
 * Save tech stack selection to project's techstack.txt file
 */
async function saveTechStack(req, res) {
  try {
    const { projectName } = req.params;
    const { techStack } = req.body;

    if (!Array.isArray(techStack)) {
      return res.status(400).json({ error: 'Tech stack must be an array' });
    }

    const projectPath = path.join(projectsPath, projectName);
    const techStackFilePath = path.join(projectPath, 'techstack.txt');

    // Ensure project directory exists
    await fs.mkdir(projectPath, { recursive: true });

    // Write tech stack to file (one per line)
    const content = techStack.join('\n');
    await fs.writeFile(techStackFilePath, content, 'utf8');

    res.json({ message: 'Tech stack saved successfully', techStack });
  } catch (error) {
    console.error('Error saving tech stack:', error);
    res.status(500).json({ error: 'Failed to save tech stack' });
  }
}

/**
 * Get tech stack for a project from techstack.txt file
 */
async function getTechStack(req, res) {
  try {
    const { projectName } = req.params;
    const techStackFilePath = path.join(projectsPath, projectName, 'techstack.txt');

    try {
      const content = await fs.readFile(techStackFilePath, 'utf8');
      const techStack = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      res.json({ techStack });
    } catch (error) {
      // Check if it's a file not found error
      if (error.code === 'ENOENT') {
        // File doesn't exist - return empty array
        res.json({ techStack: [] });
      } else {
        // Other read errors - throw to outer catch
        throw error;
      }
    }
  } catch (error) {
    console.error('Error getting tech stack:', error);
    res.status(500).json({ error: 'Failed to load tech stack' });
  }
}

module.exports = {
  getAgents,
  getTechStacks,
  saveTechStack,
  getTechStack
};
