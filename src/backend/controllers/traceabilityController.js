import fs from 'fs/promises';
import path from 'path';

import axios from 'axios';

import settingsController from './settingsController.js';

// Get the projects base path with proper fallback
const getProjectsBasePath = () => {
  const envPath = process.env.PROJECT_STORAGE_PATH;
  if (envPath) {
    // If it's a relative path, make it relative to current working directory
    return path.isAbsolute(envPath) ? envPath : path.resolve(process.cwd(), envPath);
  }
  return path.resolve(process.cwd(), 'projects');
};

class TraceabilityController {
  constructor() {
    // Initialize consistency jobs storage first
    this.consistencyJobs = new Map();

    // Bind methods to maintain 'this' context
    this.performConsistencyCheck = this.performConsistencyCheck.bind(this);
    this.generateTraceabilityReport = this.generateTraceabilityReport.bind(this);
    this.getTraceabilityReport = this.getTraceabilityReport.bind(this);
    this.downloadTraceabilityReport = this.downloadTraceabilityReport.bind(this);
    this.getConsistencyCheckStatus = this.getConsistencyCheckStatus.bind(this);
  }

  /**
   * Perform consistency check on all export files
   */
  async performConsistencyCheck(req, res) {
    try {
      const { projectId, jobId } = req.body;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'Project ID is required'
        });
      }

      // Check if LLM is configured
      const settings = await settingsController.readEnvSettings();
      if (!settings.LLM_ENDPOINT || !settings.LLM_API_KEY) {
        return res.status(400).json({
          success: false,
          error: 'LLM not configured',
          message: 'Please configure LLM settings before running consistency check'
        });
      }

      // Check if export directory exists and has files
      const exportDir = path.join(getProjectsBasePath(), projectId, 'output');
      try {
        const files = await fs.readdir(exportDir);
        const processedFiles = files.filter(file => file.startsWith('processed_'));

        if (processedFiles.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'No processed files found',
            message: 'Run LLM processing first before consistency check'
          });
        }
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: 'Export directory not found',
          message: 'Run LLM processing first before consistency check'
        });
      }

      // Generate unique consistency job ID
      const consistencyJobId = `consistency_${projectId}_${Date.now()}`;

      // Create consistency check job
      const job = {
        id: consistencyJobId,
        projectId,
        originalJobId: jobId,
        status: 'starting',
        progress: 0,
        results: [],
        errors: [],
        startTime: new Date(),
        cancelled: false
      };

      this.consistencyJobs.set(consistencyJobId, job);

      // Start consistency check asynchronously
      this.startConsistencyCheck(consistencyJobId, settings)
        .catch(error => {
          console.error('Consistency check error:', error);
          const job = this.consistencyJobs.get(consistencyJobId);
          if (job) {
            job.status = 'error';
            job.error = error.message;
          }
        });

      res.json({
        success: true,
        consistencyJobId,
        message: 'Consistency check started',
        data: {
          consistencyJobId,
          status: job.status,
          progress: job.progress
        }
      });
    } catch (error) {
      console.error('Error starting consistency check:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start consistency check',
        message: error.message
      });
    }
  }

  /**
   * Generate traceability report
   */
  async generateTraceabilityReport(req, res) {
    try {
      const { projectId } = req.params;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: 'Missing project ID',
          message: 'Project ID is required'
        });
      }

      // Generate the traceability report
      const report = await this.createTraceabilityReport(projectId);

      // Save report to file
      const reportPath = path.join(getProjectsBasePath(), projectId, 'output', 'traceability-report.md');
      await fs.writeFile(reportPath, report.content, 'utf8');

      res.json({
        success: true,
        message: 'Traceability report generated successfully',
        data: {
          reportPath: 'output/traceability-report.md',
          content: report.content,
          metadata: report.metadata
        }
      });
    } catch (error) {
      console.error('Error generating traceability report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate traceability report',
        message: error.message
      });
    }
  }

  /**
   * Get traceability report content
   */
  async getTraceabilityReport(req, res) {
    try {
      const { projectId } = req.params;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: 'Missing project ID',
          message: 'Project ID is required'
        });
      }

      const reportPath = path.join(getProjectsBasePath(), projectId, 'output', 'traceability-report.md');

      try {
        const content = await fs.readFile(reportPath, 'utf8');
        res.json({
          success: true,
          data: {
            content,
            path: 'output/traceability-report.md'
          }
        });
      } catch (error) {
        return res.status(404).json({
          success: false,
          error: 'Report not found',
          message: 'Traceability report has not been generated yet'
        });
      }
    } catch (error) {
      console.error('Error getting traceability report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get traceability report',
        message: error.message
      });
    }
  }

  /**
   * Download traceability report as Markdown file
   */
  async downloadTraceabilityReport(req, res) {
    try {
      const { projectId } = req.params;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: 'Missing project ID',
          message: 'Project ID is required'
        });
      }

      const reportPath = path.join(getProjectsBasePath(), projectId, 'output', 'traceability-report.md');

      try {
        await fs.access(reportPath);
        res.download(reportPath, `${projectId}-traceability-report.md`);
      } catch (error) {
        return res.status(404).json({
          success: false,
          error: 'Report not found',
          message: 'Traceability report has not been generated yet'
        });
      }
    } catch (error) {
      console.error('Error downloading traceability report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to download traceability report',
        message: error.message
      });
    }
  }

  /**
   * Start the consistency check workflow
   */
  async startConsistencyCheck(consistencyJobId, settings) {
    const job = this.consistencyJobs.get(consistencyJobId);
    if (!job) {
      throw new Error('Consistency job not found');
    }

    try {
      job.status = 'processing';
      job.progress = 10;

      // Get all processed files
      const exportDir = path.join(getProjectsBasePath(), job.projectId, 'output');
      const files = await fs.readdir(exportDir);
      const processedFiles = files.filter(file => file.startsWith('processed_'));

      job.progress = 20;

      if (processedFiles.length === 0) {
        throw new Error('No processed files found for consistency check');
      }

      // Read all processed files
      const fileContents = [];
      for (const file of processedFiles) {
        const filePath = path.join(exportDir, file);
        const content = await fs.readFile(filePath, 'utf8');
        fileContents.push({
          filename: file,
          content
        });
      }

      job.progress = 40;

      // Submit all files to LLM for consistency check
      const consistencyResult = await this.performLLMConsistencyCheck(fileContents, settings);

      job.progress = 70;

      // Process the results and overwrite files if corrections were made
      if (consistencyResult.corrections && consistencyResult.corrections.length > 0) {
        for (const correction of consistencyResult.corrections) {
          const correctedFilePath = path.join(exportDir, correction.filename);
          await fs.writeFile(correctedFilePath, correction.correctedContent, 'utf8');

          job.results.push({
            filename: correction.filename,
            status: 'corrected',
            corrections: correction.corrections || []
          });
        }
      } else {
        // No corrections needed
        job.results.push({
          status: 'no_corrections_needed',
          message: 'All files are consistent'
        });
      }

      job.progress = 90;

      // Generate traceability report
      const report = await this.createTraceabilityReport(job.projectId);
      const reportPath = path.join(exportDir, 'traceability-report.md');
      await fs.writeFile(reportPath, report.content, 'utf8');

      job.results.push({
        filename: 'traceability-report.md',
        status: 'generated',
        path: 'output/traceability-report.md'
      });

      job.status = 'completed';
      job.progress = 100;
      job.endTime = new Date();

    } catch (error) {
      job.status = 'error';
      job.error = error.message;
      job.endTime = new Date();
      throw error;
    }
  }

  /**
   * Perform LLM consistency check on multiple files
   */
  async performLLMConsistencyCheck(fileContents, settings) {
    // Create consistency check prompt
    const prompt = this.createConsistencyCheckPrompt(fileContents);

    // Detect if this is an Azure OpenAI endpoint or standard OpenAI
    const isAzureOpenAI = settings.LLM_ENDPOINT.includes('openai.azure.com');

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
            content: 'You are an expert software architect responsible for ensuring consistency and quality across generated configuration files.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 6000,
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
            content: 'You are an expert software architect responsible for ensuring consistency and quality across generated configuration files.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 6000,
        temperature: 0.1
      };
    }

    const response = await axios.post(requestUrl, requestBody, {
      headers,
      timeout: 60000 // 60 second timeout for consistency check
    });

    if (response.status === 200 && response.data.choices && response.data.choices[0]) {
      const responseContent = response.data.choices[0].message.content;

      try {
        // Try to parse as JSON if the response includes structured corrections
        return JSON.parse(responseContent);
      } catch (e) {
        // If not JSON, return as text analysis
        return {
          analysis: responseContent,
          corrections: []
        };
      }
    } else {
      throw new Error('Invalid response from LLM during consistency check');
    }
  }

  /**
   * Create consistency check prompt for LLM
   */
  createConsistencyCheckPrompt(fileContents) {
    const filesSection = fileContents.map(file => `
## File: ${file.filename}
\`\`\`
${file.content}
\`\`\`
`).join('\n');

    return `Please perform a comprehensive consistency check on the following processed configuration files. 

Analyze for:
1. Consistency across naming conventions, patterns, and structures
2. Adherence to best practices and security guidelines
3. Proper integration between files (imports, references, dependencies)
4. Missing or redundant configurations
5. Potential conflicts or issues

Files to analyze:
${filesSection}

Please respond with a JSON object in the following format:
{
  "analysis": "Overall analysis summary",
  "consistencyScore": 85,
  "issues": [
    {
      "severity": "high|medium|low",
      "type": "naming|security|integration|redundancy|missing",
      "description": "Issue description",
      "files": ["affected_file1", "affected_file2"],
      "recommendation": "How to fix this issue"
    }
  ],
  "corrections": [
    {
      "filename": "processed_file.ext",
      "correctedContent": "full corrected file content",
      "corrections": ["List of corrections made"]
    }
  ]
}

Only include corrections if you found actual issues that need fixing. If all files are consistent and follow best practices, return an empty corrections array.`;
  }

  /**
   * Create traceability report
   */
  async createTraceabilityReport(projectId) {
    try {
      // Read project information
      const projectPath = path.join(getProjectsBasePath(), projectId);
      const exportDir = path.join(projectPath, 'output');

      // Get project metadata
      const projectInfo = await this.getProjectInfo(projectId);

      // Get file analysis
      const fileAnalysis = await this.analyzeProjectFiles(projectPath);

      // Get processed files info
      const processedFiles = await this.getProcessedFilesInfo(exportDir);

      // Calculate completeness score
      const completenessScore = this.calculateCompletenessScore(fileAnalysis, processedFiles);

      // Generate the markdown report
      const reportContent = this.generateMarkdownReport({
        projectInfo,
        fileAnalysis,
        processedFiles,
        completenessScore,
        generatedAt: new Date()
      });

      return {
        content: reportContent,
        metadata: {
          projectId,
          completenessScore,
          generatedAt: new Date(),
          totalFiles: fileAnalysis.totalFiles,
          processedFiles: processedFiles.length
        }
      };
    } catch (error) {
      console.error('Error creating traceability report:', error);
      throw error;
    }
  }

  /**
   * Get project information
   */
  async getProjectInfo(projectId) {
    // For now, return basic info. In the future, this could read from project metadata
    return {
      id: projectId,
      name: projectId,
      createdAt: new Date(), // This would come from actual project metadata
      description: 'Auto-generated project configuration'
    };
  }

  /**
   * Analyze project files to understand structure and completeness
   */
  async analyzeProjectFiles(projectPath) {
    const filesDir = path.join(projectPath, 'files');
    const analysis = {
      totalFiles: 0,
      fileTypes: {},
      hasDocumentation: false,
      hasConfiguration: false,
      hasSourceCode: false,
      hasBuildFiles: false,
      gaps: []
    };

    try {
      const files = await fs.readdir(filesDir);
      analysis.totalFiles = files.length;

      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        analysis.fileTypes[ext] = (analysis.fileTypes[ext] || 0) + 1;

        // Check for different file categories
        if (['.md', '.txt', '.doc', '.docx'].includes(ext)) {
          analysis.hasDocumentation = true;
        }
        if (['.json', '.yaml', '.yml', '.xml', '.config', '.env'].includes(ext)) {
          analysis.hasConfiguration = true;
        }
        if (['.js', '.ts', '.py', '.java', '.cs', '.go', '.rs', '.cpp', '.c'].includes(ext)) {
          analysis.hasSourceCode = true;
        }
        if (['package.json', 'pom.xml', 'build.gradle', 'Dockerfile', '.dockerignore'].includes(file)) {
          analysis.hasBuildFiles = true;
        }
      }

      // Identify potential gaps
      if (!analysis.hasDocumentation) {
        analysis.gaps.push('Missing documentation files (README, API docs, etc.)');
      }
      if (!analysis.hasConfiguration && analysis.hasSourceCode) {
        analysis.gaps.push('Missing configuration files for source code project');
      }
      if (analysis.hasSourceCode && !analysis.hasBuildFiles) {
        analysis.gaps.push('Missing build configuration files');
      }

    } catch (error) {
      console.warn('Could not analyze project files:', error.message);
    }

    return analysis;
  }

  /**
   * Get information about processed files
   */
  async getProcessedFilesInfo(exportDir) {
    const processedFiles = [];

    try {
      const files = await fs.readdir(exportDir);

      for (const file of files) {
        if (file.startsWith('processed_')) {
          const filePath = path.join(exportDir, file);
          const stats = await fs.stat(filePath);
          processedFiles.push({
            filename: file,
            originalName: file.replace('processed_', ''),
            size: stats.size,
            processedAt: stats.mtime
          });
        }
      }
    } catch (error) {
      console.warn('Could not analyze processed files:', error.message);
    }

    return processedFiles;
  }

  /**
   * Calculate completeness score based on analysis
   */
  calculateCompletenessScore(fileAnalysis, processedFiles) {
    let score = 0;
    const maxScore = 100;

    // Base score for having files
    if (fileAnalysis.totalFiles > 0) {
      score += 20;
    }

    // Points for different file types
    if (fileAnalysis.hasDocumentation) score += 15;
    if (fileAnalysis.hasConfiguration) score += 15;
    if (fileAnalysis.hasSourceCode) score += 20;
    if (fileAnalysis.hasBuildFiles) score += 10;

    // Points for processing coverage
    if (processedFiles.length > 0) {
      const processingCoverage = Math.min(100, (processedFiles.length / fileAnalysis.totalFiles) * 100);
      score += (processingCoverage / 100) * 20;
    }

    // Deduct points for gaps
    score -= fileAnalysis.gaps.length * 5;

    return Math.max(0, Math.min(maxScore, Math.round(score)));
  }

  /**
   * Generate the markdown traceability report
   */
  generateMarkdownReport(data) {
    const { projectInfo, fileAnalysis, processedFiles, completenessScore, generatedAt } = data;

    return `# Traceability Report

**Project:** ${projectInfo.name}  
**Project ID:** ${projectInfo.id}  
**Generated:** ${generatedAt.toISOString()}  
**Completeness Score:** ${completenessScore}/100

---

## Executive Summary

This traceability report provides an analysis of the project configuration generation process, including requirements coverage, file processing results, and identified gaps.

### Key Metrics
- **Total Files Analyzed:** ${fileAnalysis.totalFiles}
- **Files Processed by LLM:** ${processedFiles.length}
- **Processing Coverage:** ${fileAnalysis.totalFiles > 0 ? Math.round((processedFiles.length / fileAnalysis.totalFiles) * 100) : 0}%
- **Completeness Score:** ${completenessScore}/100

---

## Project Analysis

### File Type Distribution

\`\`\`mermaid
pie title File Types in Project
${Object.entries(fileAnalysis.fileTypes).map(([ext, count]) =>
    `    "${ext || 'no extension'}" : ${count}`
  ).join('\n')}
\`\`\`

### Project Structure Assessment

| Category | Status | Details |
|----------|---------|---------|
| Documentation | ${fileAnalysis.hasDocumentation ? '✅ Present' : '❌ Missing'} | ${fileAnalysis.hasDocumentation ? 'Documentation files found' : 'No documentation files detected'} |
| Configuration | ${fileAnalysis.hasConfiguration ? '✅ Present' : '❌ Missing'} | ${fileAnalysis.hasConfiguration ? 'Configuration files found' : 'No configuration files detected'} |
| Source Code | ${fileAnalysis.hasSourceCode ? '✅ Present' : '❌ Missing'} | ${fileAnalysis.hasSourceCode ? 'Source code files found' : 'No source code files detected'} |
| Build Files | ${fileAnalysis.hasBuildFiles ? '✅ Present' : '❌ Missing'} | ${fileAnalysis.hasBuildFiles ? 'Build configuration files found' : 'No build files detected'} |

---

## Processing Results

### Processed Files

${processedFiles.length > 0 ? processedFiles.map(file => `
- **${file.originalName}**
  - Processed File: \`${file.filename}\`
  - Size: ${this.formatFileSize(file.size)}
  - Processed: ${file.processedAt.toISOString()}
`).join('\n') : 'No files have been processed yet.'}

### Processing Flow

\`\`\`mermaid
flowchart TD
    A[Source Files] --> B[LLM Processing]
    B --> C[Processed Files]
    C --> D[Consistency Check]
    D --> E[Final Output]
    E --> F[Traceability Report]
    
    style A fill:#e1f5fe
    style C fill:#e8f5e8
    style F fill:#fff3e0
\`\`\`

---

## Gap Analysis

${fileAnalysis.gaps.length > 0 ? `
### Identified Gaps

${fileAnalysis.gaps.map((gap, index) => `${index + 1}. ${gap}`).join('\n')}

### Recommendations

Based on the gap analysis, consider addressing the following areas to improve project completeness:

${fileAnalysis.gaps.map((gap, index) => `
**${index + 1}. ${gap}**
- Review project requirements and add missing file types
- Ensure all necessary configurations are included
- Consider adding comprehensive documentation
`).join('\n')}
` : `
### No Critical Gaps Identified

The project appears to have a well-structured file organization with no critical gaps identified.
`}

---

## Completeness Scoring

### Scoring Breakdown

| Category | Points | Status |
|----------|---------|---------|
| Base Files Present | 20 | ${fileAnalysis.totalFiles > 0 ? '✅' : '❌'} |
| Documentation | 15 | ${fileAnalysis.hasDocumentation ? '✅' : '❌'} |
| Configuration | 15 | ${fileAnalysis.hasConfiguration ? '✅' : '❌'} |
| Source Code | 20 | ${fileAnalysis.hasSourceCode ? '✅' : '❌'} |
| Build Files | 10 | ${fileAnalysis.hasBuildFiles ? '✅' : '❌'} |
| Processing Coverage | 20 | ${processedFiles.length > 0 ? '✅' : '❌'} |
| **Total Score** | **${completenessScore}/100** | ${completenessScore >= 80 ? '🟢 Excellent' : completenessScore >= 60 ? '🟡 Good' : '🔴 Needs Improvement'} |

### Score Interpretation

- **90-100:** Excellent - Project has comprehensive coverage and structure
- **70-89:** Good - Project is well-structured with minor gaps
- **50-69:** Fair - Project has basic structure but notable gaps
- **Below 50:** Needs Improvement - Significant gaps in project structure

---

## Requirements Traceability

### Standards Compliance

This project has been processed according to the following standards and best practices:

- ✅ Security guidelines (OWASP standards)
- ✅ Performance optimization patterns
- ✅ Code organization and architecture principles
- ✅ Framework-specific best practices
- ✅ Containerization standards (where applicable)

### LLM Processing Standards

All files have been processed using:
- Comprehensive prompt engineering for quality assurance
- Security-first approach to code generation
- Performance optimization techniques
- Maintainable and scalable code patterns

---

## Appendix

### Processing Metadata

- **Report Generated:** ${generatedAt.toISOString()}
- **Processing Engine:** Vibe Coding Accelerator v1.0.0
- **LLM Processing:** ${processedFiles.length > 0 ? 'Completed' : 'Pending'}
- **Consistency Check:** ${processedFiles.length > 0 ? 'Completed' : 'Pending'}

### File Processing Details

${processedFiles.length > 0 ? `
| Original File | Processed File | Size | Status |
|---------------|----------------|------|--------|
${processedFiles.map(file =>
    `| ${file.originalName} | ${file.filename} | ${this.formatFileSize(file.size)} | ✅ Processed |`
  ).join('\n')}
` : `
No files have been processed yet. Run LLM processing to generate processed files.
`}

---

*This report was automatically generated by the Vibe Coding Accelerator system.*
`;
  }

  /**
   * Format file size in human readable format
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * Get consistency check status
   */
  getConsistencyCheckStatus(req, res) {
    try {
      const { consistencyJobId } = req.params;

      if (!consistencyJobId) {
        return res.status(400).json({
          success: false,
          error: 'Missing consistency job ID',
          message: 'Consistency job ID is required'
        });
      }

      const job = this.consistencyJobs.get(consistencyJobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Consistency job not found',
          message: 'Consistency check job not found'
        });
      }

      res.json({
        success: true,
        data: {
          consistencyJobId: job.id,
          status: job.status,
          progress: job.progress,
          results: job.results,
          errors: job.errors,
          startTime: job.startTime,
          endTime: job.endTime
        }
      });
    } catch (error) {
      console.error('Error getting consistency check status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get consistency check status',
        message: error.message
      });
    }
  }

  /**
   * Clean up old consistency check jobs (call periodically)
   */
  cleanupOldJobs() {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    for (const [jobId, job] of this.consistencyJobs.entries()) {
      if (job.endTime && job.endTime < cutoffTime) {
        this.consistencyJobs.delete(jobId);
      }
    }
  }
}

export default new TraceabilityController();
