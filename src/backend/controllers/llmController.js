import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import settingsController from './settingsController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class LLMController {
  constructor() {
    // Bind methods to maintain 'this' context
    this.processFiles = this.processFiles.bind(this);
    this.getProcessingStatus = this.getProcessingStatus.bind(this);
    this.cancelProcessing = this.cancelProcessing.bind(this);
    
    // Store active processing sessions
    this.processingJobs = new Map();
  }

  /**
   * Process files with LLM
   */
  async processFiles(req, res) {
    try {
      const { projectId, fileIds, aiAgentConfig } = req.body;

      if (!projectId || !fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'Project ID and file IDs array are required'
        });
      }

      if (!aiAgentConfig) {
        return res.status(400).json({
          success: false,
          error: 'Missing AI agent configuration',
          message: 'AI agent configuration is required for processing'
        });
      }

      // Check if LLM is configured
      const settings = await settingsController.readEnvSettings();
      if (!settings.LLM_ENDPOINT || !settings.LLM_API_KEY) {
        return res.status(400).json({
          success: false,
          error: 'LLM not configured',
          message: 'Please configure LLM settings before processing files'
        });
      }

      // Generate unique job ID
      const jobId = `${projectId}_${Date.now()}`;
      
      // Create processing job
      const job = {
        id: jobId,
        projectId,
        fileIds,
        aiAgentConfig,
        status: 'starting',
        progress: 0,
        totalFiles: fileIds.length,
        processedFiles: 0,
        results: [],
        errors: [],
        startTime: new Date(),
        cancelled: false
      };

      this.processingJobs.set(jobId, job);

      // Start processing asynchronously
      this.startProcessing(jobId, settings)
        .catch(error => {
          console.error('Processing error:', error);
          const job = this.processingJobs.get(jobId);
          if (job) {
            job.status = 'error';
            job.error = error.message;
          }
        });

      res.json({
        success: true,
        jobId,
        message: 'Processing started',
        data: {
          jobId,
          status: job.status,
          progress: job.progress,
          totalFiles: job.totalFiles
        }
      });
    } catch (error) {
      console.error('Error starting LLM processing:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start processing',
        message: error.message
      });
    }
  }

  /**
   * Get processing status
   */
  async getProcessingStatus(req, res) {
    try {
      const { jobId } = req.params;

      if (!jobId) {
        return res.status(400).json({
          success: false,
          error: 'Missing job ID',
          message: 'Job ID is required'
        });
      }

      const job = this.processingJobs.get(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Job not found',
          message: 'Processing job not found'
        });
      }

      res.json({
        success: true,
        data: {
          jobId: job.id,
          status: job.status,
          progress: job.progress,
          totalFiles: job.totalFiles,
          processedFiles: job.processedFiles,
          results: job.results,
          errors: job.errors,
          startTime: job.startTime,
          endTime: job.endTime
        }
      });
    } catch (error) {
      console.error('Error getting processing status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get status',
        message: error.message
      });
    }
  }

  /**
   * Cancel processing
   */
  async cancelProcessing(req, res) {
    try {
      const { jobId } = req.params;

      if (!jobId) {
        return res.status(400).json({
          success: false,
          error: 'Missing job ID',
          message: 'Job ID is required'
        });
      }

      const job = this.processingJobs.get(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Job not found',
          message: 'Processing job not found'
        });
      }

      if (job.status === 'completed' || job.status === 'error') {
        return res.status(400).json({
          success: false,
          error: 'Cannot cancel',
          message: 'Job is already completed or failed'
        });
      }

      job.cancelled = true;
      job.status = 'cancelled';
      job.endTime = new Date();

      res.json({
        success: true,
        message: 'Processing cancelled',
        data: {
          jobId: job.id,
          status: job.status
        }
      });
    } catch (error) {
      console.error('Error cancelling processing:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel',
        message: error.message
      });
    }
  }

  /**
   * Start the actual processing workflow
   */
  async startProcessing(jobId, settings) {
    const job = this.processingJobs.get(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    try {
      job.status = 'processing';
      
      // Create export directory
      const exportDir = path.join(__dirname, '../../projects', job.projectId, 'output');
      await fs.mkdir(exportDir, { recursive: true });

      // Process each file
      for (let i = 0; i < job.fileIds.length; i++) {
        if (job.cancelled) {
          break;
        }

        const fileId = job.fileIds[i];
        
        try {
          // Read the file
          const filePath = path.join(__dirname, '../../projects', job.projectId, 'files', fileId);
          const fileContent = await fs.readFile(filePath, 'utf8');
          const fileName = path.basename(filePath);

          // Process with LLM
          const result = await this.processFileWithLLM(
            fileContent,
            fileName,
            job.aiAgentConfig,
            settings
          );

          // Save processed file
          const outputPath = path.join(exportDir, `processed_${fileName}`);
          await fs.writeFile(outputPath, result.content, 'utf8');

          job.results.push({
            fileId,
            fileName,
            outputPath: `output/processed_${fileName}`,
            status: 'success',
            processedAt: new Date()
          });

          job.processedFiles++;
          job.progress = Math.round((job.processedFiles / job.totalFiles) * 100);

        } catch (error) {
          console.error(`Error processing file ${fileId}:`, error);
          
          job.errors.push({
            fileId,
            fileName: fileId,
            error: error.message,
            timestamp: new Date()
          });

          // Continue processing other files
        }
      }

      if (!job.cancelled) {
        if (job.errors.length === 0) {
          job.status = 'completed';
        } else if (job.results.length === 0) {
          job.status = 'error';
        } else {
          job.status = 'completed_with_errors';
        }
        
        job.endTime = new Date();
        job.progress = 100;
      }

    } catch (error) {
      job.status = 'error';
      job.error = error.message;
      job.endTime = new Date();
      throw error;
    }
  }

  /**
   * Process a single file with LLM
   */
  async processFileWithLLM(fileContent, fileName, aiAgentConfig, settings) {
    // Detect if this is an Azure OpenAI endpoint or standard OpenAI
    const isAzureOpenAI = settings.LLM_ENDPOINT.includes('openai.azure.com');
    
    // Create the prompt based on AI agent configuration
    const prompt = this.createPrompt(fileContent, fileName, aiAgentConfig);
    
    let requestUrl;
    let headers;
    let requestBody;

    if (isAzureOpenAI) {
      requestUrl = settings.LLM_ENDPOINT;
      headers = {
        'api-key': settings.LLM_API_KEY,
        'Content-Type': 'application/json'
      };
      requestBody = {
        messages: [
          {
            role: 'system',
            content: 'You are an expert software architect and developer assistant.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.1
      };
    } else {
      requestUrl = `${settings.LLM_ENDPOINT}/v1/chat/completions`;
      headers = {
        'Authorization': `Bearer ${settings.LLM_API_KEY}`,
        'Content-Type': 'application/json'
      };
      requestBody = {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert software architect and developer assistant.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.1
      };
    }

    const response = await axios.post(requestUrl, requestBody, {
      headers,
      timeout: 30000 // 30 second timeout for processing
    });

    if (response.status === 200 && response.data.choices && response.data.choices[0]) {
      return {
        content: response.data.choices[0].message.content,
        usage: response.data.usage
      };
    } else {
      throw new Error('Invalid response from LLM');
    }
  }

  /**
   * Create prompt for LLM based on file content and AI agent config
   */
  createPrompt(fileContent, fileName, aiAgentConfig) {
    const basePrompt = `Please analyze and improve the following file according to best practices and the specified requirements.

File: ${fileName}
AI Agent Configuration: ${JSON.stringify(aiAgentConfig, null, 2)}

File Content:
${fileContent}

Instructions:
1. Apply the coding standards and best practices specified in the AI agent configuration
2. Ensure the code follows security guidelines and performance optimization
3. Maintain the original functionality while improving code quality
4. Add appropriate comments and documentation
5. Return only the improved file content without any explanatory text

Improved file content:`;

    return basePrompt;
  }

  /**
   * Clean up old processing jobs (call periodically)
   */
  cleanupOldJobs() {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [jobId, job] of this.processingJobs.entries()) {
      if (job.endTime && job.endTime < cutoffTime) {
        this.processingJobs.delete(jobId);
      }
    }
  }
}

export default new LLMController();
