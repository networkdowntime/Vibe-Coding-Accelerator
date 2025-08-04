const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// In-memory storage for processing jobs (in production, use Redis or database)
const processingJobs = new Map();

// Job status constants
const JOB_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

/**
 * Load OpenAPI settings from environment variables
 */
const getOpenAPISettings = () => {
  const endpoint = process.env.OPENAPI_ENDPOINT;
  const apiKey = process.env.OPENAPI_API_KEY;
  
  if (!endpoint || !apiKey) {
    throw new Error('OpenAPI endpoint and API key must be configured');
  }
  
  return { endpoint, apiKey };
};

/**
 * Create HTTP client for LLM API calls
 */
const createLLMClient = () => {
  const { endpoint, apiKey } = getOpenAPISettings();
  
  return axios.create({
    baseURL: endpoint,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    timeout: 30000 // 30 second timeout
  });
};

/**
 * Get list of files to process for a project
 */
const getProjectFiles = async (projectId) => {
  try {
    const projectPath = path.join(process.cwd(), '..', '..', 'projects', projectId);
    const files = [];
    
    // Recursively get all relevant files
    const scanDirectory = async (dirPath, relativePath = '') => {
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          const relPath = path.join(relativePath, entry.name);
          
          if (entry.isDirectory()) {
            // Skip node_modules, .git, and other common ignore patterns
            if (!['node_modules', '.git', 'dist', 'build', '.angular'].includes(entry.name)) {
              await scanDirectory(fullPath, relPath);
            }
          } else if (entry.isFile()) {
            // Include relevant file types
            const ext = path.extname(entry.name).toLowerCase();
            const relevantExtensions = ['.js', '.ts', '.json', '.md', '.yml', '.yaml', '.html', '.css', '.scss'];
            
            if (relevantExtensions.includes(ext)) {
              const content = await fs.readFile(fullPath, 'utf-8');
              files.push({
                path: relPath,
                content,
                size: content.length
              });
            }
          }
        }
      } catch (error) {
        console.warn(`Warning: Could not scan directory ${dirPath}:`, error.message);
      }
    };
    
    await scanDirectory(projectPath);
    return files;
  } catch (error) {
    throw new Error(`Failed to get project files: ${error.message}`);
  }
};

/**
 * Process a single file with the LLM
 */
const processFileWithLLM = async (file, llmClient) => {
  try {
    const prompt = `Please analyze and improve this ${path.extname(file.path)} file according to best practices:

File: ${file.path}
Content:
${file.content}

Please provide:
1. Analysis of the current code/content
2. Suggestions for improvements
3. Updated version following best practices
4. Explanation of changes made

Format your response as JSON with keys: analysis, suggestions, updatedContent, explanation`;

    const response = await llmClient.post('/v1/chat/completions', {
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert software engineer who provides detailed code analysis and improvements.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 4000,
      temperature: 0.1
    });

    if (!response.data?.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from LLM API');
    }

    // Parse LLM response
    let llmContent = response.data.choices[0].message.content;
    
    // Try to extract JSON from the response
    let processedResult;
    try {
      // Look for JSON in the response
      const jsonMatch = llmContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        processedResult = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: create structured response from plain text
        processedResult = {
          analysis: 'LLM provided analysis',
          suggestions: ['See updated content for improvements'],
          updatedContent: llmContent,
          explanation: 'LLM provided improvements'
        };
      }
    } catch (parseError) {
      // Fallback for non-JSON responses
      processedResult = {
        analysis: 'LLM analysis provided',
        suggestions: ['See updated content for improvements'],
        updatedContent: llmContent,
        explanation: 'LLM provided content improvements'
      };
    }

    return {
      originalFile: file,
      processedResult,
      processingTime: new Date().toISOString()
    };
  } catch (error) {
    if (error.response?.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    } else if (error.response?.status === 401) {
      throw new Error('Invalid API key. Please check your OpenAPI configuration.');
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. The LLM API took too long to respond.');
    } else {
      throw new Error(`LLM processing failed: ${error.message}`);
    }
  }
};

/**
 * Save processed files to export directory
 */
const saveProcessedFiles = async (jobId, processedFiles) => {
  try {
    const exportDir = path.join(process.cwd(), 'exports', jobId);
    await fs.mkdir(exportDir, { recursive: true });
    
    const results = [];
    
    for (const processedFile of processedFiles) {
      const { originalFile, processedResult } = processedFile;
      
      // Save original file
      const originalPath = path.join(exportDir, 'original', originalFile.path);
      await fs.mkdir(path.dirname(originalPath), { recursive: true });
      await fs.writeFile(originalPath, originalFile.content, 'utf-8');
      
      // Save processed file
      const processedPath = path.join(exportDir, 'processed', originalFile.path);
      await fs.mkdir(path.dirname(processedPath), { recursive: true });
      await fs.writeFile(processedPath, processedResult.updatedContent, 'utf-8');
      
      // Save analysis report
      const reportPath = path.join(exportDir, 'reports', `${originalFile.path}.json`);
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify(processedResult, null, 2), 'utf-8');
      
      results.push({
        originalPath,
        processedPath,
        reportPath,
        fileName: originalFile.path
      });
    }
    
    // Create summary report
    const summaryPath = path.join(exportDir, 'summary.json');
    const summary = {
      jobId,
      totalFiles: processedFiles.length,
      completedAt: new Date().toISOString(),
      files: results
    };
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');
    
    return { exportDir, summary };
  } catch (error) {
    throw new Error(`Failed to save processed files: ${error.message}`);
  }
};

/**
 * Start LLM processing for a project
 */
const startProcessing = async (req, res) => {
  try {
    const { projectId } = req.params;
    const jobId = uuidv4();
    
    // Validate project exists
    const projectPath = path.join(process.cwd(), '..', '..', 'projects', projectId);
    try {
      await fs.access(projectPath);
    } catch (error) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Initialize job
    const job = {
      id: jobId,
      projectId,
      status: JOB_STATUS.PENDING,
      createdAt: new Date().toISOString(),
      progress: {
        total: 0,
        completed: 0,
        failed: 0,
        current: null
      },
      files: [],
      processedFiles: [],
      errors: []
    };
    
    processingJobs.set(jobId, job);
    
    // Start processing asynchronously
    processProjectAsync(jobId);
    
    res.json({
      jobId,
      status: job.status,
      message: 'Processing started'
    });
  } catch (error) {
    console.error('Error starting LLM processing:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Asynchronous project processing
 */
const processProjectAsync = async (jobId) => {
  const job = processingJobs.get(jobId);
  if (!job) return;
  
  try {
    // Update status to processing
    job.status = JOB_STATUS.PROCESSING;
    job.startedAt = new Date().toISOString();
    
    // Get files to process
    const files = await getProjectFiles(job.projectId);
    job.files = files;
    job.progress.total = files.length;
    
    // Create LLM client
    const llmClient = createLLMClient();
    
    // Process files one by one with progress tracking
    for (let i = 0; i < files.length; i++) {
      // Check if job was cancelled
      if (job.status === JOB_STATUS.CANCELLED) {
        return;
      }
      
      const file = files[i];
      job.progress.current = file.path;
      
      try {
        const processedFile = await processFileWithLLM(file, llmClient);
        job.processedFiles.push(processedFile);
        job.progress.completed++;
      } catch (error) {
        job.errors.push({
          file: file.path,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        job.progress.failed++;
        
        // Continue processing other files even if one fails
        console.error(`Error processing file ${file.path}:`, error.message);
      }
      
      // Small delay to prevent overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Save processed files
    if (job.processedFiles.length > 0) {
      const exportResult = await saveProcessedFiles(jobId, job.processedFiles);
      job.exportPath = exportResult.exportDir;
      job.summary = exportResult.summary;
    }
    
    // Update final status
    job.status = job.progress.failed === job.progress.total ? JOB_STATUS.FAILED : JOB_STATUS.COMPLETED;
    job.completedAt = new Date().toISOString();
    job.progress.current = null;
    
  } catch (error) {
    job.status = JOB_STATUS.FAILED;
    job.error = error.message;
    job.completedAt = new Date().toISOString();
    console.error(`Job ${jobId} failed:`, error);
  }
};

/**
 * Get processing status
 */
const getStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = processingJobs.get(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    // Calculate progress percentage
    const progressPercentage = job.progress.total > 0 
      ? Math.round(((job.progress.completed + job.progress.failed) / job.progress.total) * 100)
      : 0;
    
    res.json({
      jobId: job.id,
      projectId: job.projectId,
      status: job.status,
      progress: {
        ...job.progress,
        percentage: progressPercentage
      },
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      error: job.error,
      errors: job.errors
    });
  } catch (error) {
    console.error('Error getting job status:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Cancel processing
 */
const cancelProcessing = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = processingJobs.get(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    if (job.status === JOB_STATUS.COMPLETED || job.status === JOB_STATUS.FAILED) {
      return res.status(400).json({ error: 'Cannot cancel completed or failed job' });
    }
    
    job.status = JOB_STATUS.CANCELLED;
    job.cancelledAt = new Date().toISOString();
    
    res.json({
      jobId: job.id,
      status: job.status,
      message: 'Processing cancelled'
    });
  } catch (error) {
    console.error('Error cancelling job:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Retry failed processing from specific step
 */
const retryProcessing = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = processingJobs.get(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    if (job.status !== JOB_STATUS.FAILED) {
      return res.status(400).json({ error: 'Can only retry failed jobs' });
    }
    
    // Reset job for retry
    job.status = JOB_STATUS.PENDING;
    job.error = null;
    job.errors = [];
    job.progress.completed = job.processedFiles.length;
    job.progress.failed = 0;
    job.retryCount = (job.retryCount || 0) + 1;
    
    // Start processing from where it left off
    processProjectAsync(jobId);
    
    res.json({
      jobId: job.id,
      status: job.status,
      message: 'Processing restarted',
      retryCount: job.retryCount
    });
  } catch (error) {
    console.error('Error retrying job:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get processed files and results
 */
const getResults = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = processingJobs.get(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    if (job.status !== JOB_STATUS.COMPLETED) {
      return res.status(400).json({ error: 'Job not completed yet' });
    }
    
    res.json({
      jobId: job.id,
      projectId: job.projectId,
      status: job.status,
      summary: job.summary,
      exportPath: job.exportPath,
      processedFiles: job.processedFiles.map(pf => ({
        fileName: pf.originalFile.path,
        analysis: pf.processedResult.analysis,
        suggestions: pf.processedResult.suggestions,
        explanation: pf.processedResult.explanation,
        processingTime: pf.processingTime
      }))
    });
  } catch (error) {
    console.error('Error getting job results:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  startProcessing,
  getStatus,
  cancelProcessing,
  retryProcessing,
  getResults
};
