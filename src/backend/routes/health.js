import express from 'express';
import { createResponse } from '../utils/helpers.js';
import { directoryExists, getDirectorySize } from '../utils/fileSystem.js';

const router = express.Router();

/**
 * @route GET /api/v1/health
 * @description Health check endpoint
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    const startTime = process.hrtime();
    
    // Basic health check
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    };

    // Check filesystem access
    try {
      const projectsPath = process.env.PROJECT_STORAGE_PATH || './projects';
      const aiAgentsPath = process.env.AI_AGENTS_STORAGE_PATH || './ai_agents';
      
      health.storage = {
        projectsPath: {
          accessible: await directoryExists(projectsPath),
          path: projectsPath
        },
        aiAgentsPath: {
          accessible: await directoryExists(aiAgentsPath),
          path: aiAgentsPath
        }
      };
    } catch (error) {
      health.storage = {
        error: 'Unable to check storage access',
        message: error.message
      };
    }

    // Calculate response time
    const diff = process.hrtime(startTime);
    health.responseTime = diff[0] * 1e3 + diff[1] * 1e-6; // Convert to milliseconds

    res.json(createResponse(health, 'Health check successful'));
  } catch (error) {
    res.status(500).json(createResponse(
      null, 
      'Health check failed', 
      500, 
      { error: error.message }
    ));
  }
});

/**
 * @route GET /api/v1/health/detailed
 * @description Detailed health check with system information
 * @access Public
 */
router.get('/detailed', async (req, res) => {
  try {
    const startTime = process.hrtime();
    
    // Extended health information
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      
      // System information
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
        ppid: process.ppid
      },
      
      // Memory information
      memory: {
        ...process.memoryUsage(),
        formatted: {
          rss: (process.memoryUsage().rss / 1024 / 1024).toFixed(2) + ' MB',
          heapTotal: (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2) + ' MB',
          heapUsed: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + ' MB',
          external: (process.memoryUsage().external / 1024 / 1024).toFixed(2) + ' MB'
        }
      },
      
      // CPU information
      cpu: process.cpuUsage(),
      
      // Environment variables (non-sensitive)
      config: {
        port: process.env.PORT || 3001,
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4200',
        nodeEnv: process.env.NODE_ENV || 'development',
        logLevel: process.env.LOG_LEVEL || 'info'
      }
    };

    // Check storage access and sizes
    try {
      const projectsPath = process.env.PROJECT_STORAGE_PATH || './projects';
      const aiAgentsPath = process.env.AI_AGENTS_STORAGE_PATH || './ai_agents';
      
      health.storage = {
        projectsPath: {
          accessible: await directoryExists(projectsPath),
          path: projectsPath,
          size: await directoryExists(projectsPath) ? await getDirectorySize(projectsPath) : 0
        },
        aiAgentsPath: {
          accessible: await directoryExists(aiAgentsPath),
          path: aiAgentsPath,
          size: await directoryExists(aiAgentsPath) ? await getDirectorySize(aiAgentsPath) : 0
        }
      };
    } catch (error) {
      health.storage = {
        error: 'Unable to check storage access',
        message: error.message
      };
    }

    // Calculate response time
    const diff = process.hrtime(startTime);
    health.responseTime = diff[0] * 1e3 + diff[1] * 1e-6; // Convert to milliseconds

    res.json(createResponse(health, 'Detailed health check successful'));
  } catch (error) {
    res.status(500).json(createResponse(
      null, 
      'Detailed health check failed', 
      500, 
      { error: error.message }
    ));
  }
});

/**
 * @route GET /api/v1/health/readiness
 * @description Readiness probe for container orchestration
 * @access Public
 */
router.get('/readiness', async (req, res) => {
  try {
    // Check if the application is ready to serve requests
    const projectsPath = process.env.PROJECT_STORAGE_PATH || './projects';
    const aiAgentsPath = process.env.AI_AGENTS_STORAGE_PATH || './ai_agents';
    
    const projectsAccessible = await directoryExists(projectsPath);
    const aiAgentsAccessible = await directoryExists(aiAgentsPath);
    
    if (projectsAccessible && aiAgentsAccessible) {
      res.json(createResponse({ ready: true }, 'Application is ready'));
    } else {
      res.status(503).json(createResponse(
        { ready: false },
        'Application is not ready - storage not accessible',
        503
      ));
    }
  } catch (error) {
    res.status(503).json(createResponse(
      { ready: false },
      'Application is not ready',
      503,
      { error: error.message }
    ));
  }
});

/**
 * @route GET /api/v1/health/liveness
 * @description Liveness probe for container orchestration
 * @access Public
 */
router.get('/liveness', (req, res) => {
  // Simple liveness check - if this endpoint responds, the app is alive
  res.json(createResponse({ alive: true }, 'Application is alive'));
});

export default router;
