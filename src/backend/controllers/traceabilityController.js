const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

/**
 * Get OpenAPI settings from environment
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
 * Create LLM client for consistency checks
 */
const createLLMClient = () => {
  const { endpoint, apiKey } = getOpenAPISettings();
  
  return axios.create({
    baseURL: endpoint,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    timeout: 60000 // 60 second timeout for consistency checks
  });
};

/**
 * Perform consistency check on all export files
 */
const performConsistencyCheck = async (req, res) => {
  try {
    const { jobId } = req.params;
    const exportDir = path.join(process.cwd(), 'exports', jobId);
    
    // Check if export directory exists
    try {
      await fs.access(exportDir);
    } catch (error) {
      return res.status(404).json({ error: 'Export directory not found' });
    }
    
    // Read all processed files
    const processedDir = path.join(exportDir, 'processed');
    const files = await readAllFiles(processedDir);
    
    if (files.length === 0) {
      return res.status(400).json({ error: 'No processed files found for consistency check' });
    }
    
    // Create LLM client
    const llmClient = createLLMClient();
    
    // Prepare consistency check prompt
    const prompt = createConsistencyPrompt(files);
    
    // Submit to LLM for consistency check
    const response = await llmClient.post('/v1/chat/completions', {
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert AI coding assistant. Review all files for consistency and correctness. Ensure there are no contradictions or conflicting requirements between files. Where conflicts exist, resolve them in favor of the project documents, then tech stack files. Ensure all diagrams are in Mermaid syntax. Make corrections as needed and return the updated files in the same structure.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 8000,
      temperature: 0.1
    });
    
    if (!response.data?.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from LLM API');
    }
    
    // Parse LLM response and extract corrected files
    const correctedFiles = await parseConsistencyResponse(response.data.choices[0].message.content);
    
    // Overwrite files with corrections if any
    const updatedFiles = [];
    for (const correctedFile of correctedFiles) {
      if (correctedFile.hasChanges) {
        const filePath = path.join(processedDir, correctedFile.path);
        await fs.writeFile(filePath, correctedFile.content, 'utf-8');
        updatedFiles.push(correctedFile.path);
      }
    }
    
    // Update summary with consistency check results
    const summaryPath = path.join(exportDir, 'summary.json');
    const summary = JSON.parse(await fs.readFile(summaryPath, 'utf-8'));
    summary.consistencyCheck = {
      completedAt: new Date().toISOString(),
      filesUpdated: updatedFiles,
      totalFilesChecked: files.length
    };
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');
    
    res.json({
      success: true,
      message: 'Consistency check completed',
      filesUpdated: updatedFiles,
      totalFilesChecked: files.length
    });
    
  } catch (error) {
    console.error('Consistency check error:', error);
    if (error.response?.status === 429) {
      res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    } else if (error.response?.status === 401) {
      res.status(401).json({ error: 'Invalid API key. Please check your OpenAPI configuration.' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};

/**
 * Generate traceability report
 */
const generateReport = async (req, res) => {
  try {
    const { jobId } = req.params;
    const exportDir = path.join(process.cwd(), 'exports', jobId);
    
    // Check if export directory exists
    try {
      await fs.access(exportDir);
    } catch (error) {
      return res.status(404).json({ error: 'Export directory not found' });
    }
    
    // Read summary and analyze project
    const summaryPath = path.join(exportDir, 'summary.json');
    const summary = JSON.parse(await fs.readFile(summaryPath, 'utf-8'));
    
    // Analyze project structure and completeness
    const analysis = await analyzeProjectCompleteness(jobId, summary);
    
    // Generate Markdown report
    const reportContent = generateMarkdownReport(analysis);
    
    // Save report to export directory
    const reportPath = path.join(exportDir, 'traceability-report.md');
    await fs.writeFile(reportPath, reportContent, 'utf-8');
    
    res.json({
      success: true,
      reportPath,
      analysis,
      message: 'Traceability report generated successfully'
    });
    
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get existing traceability report
 */
const getReport = async (req, res) => {
  try {
    const { jobId } = req.params;
    const reportPath = path.join(process.cwd(), 'exports', jobId, 'traceability-report.md');
    
    try {
      const reportContent = await fs.readFile(reportPath, 'utf-8');
      res.json({
        content: reportContent,
        jobId
      });
    } catch (error) {
      res.status(404).json({ error: 'Traceability report not found' });
    }
    
  } catch (error) {
    console.error('Error getting report:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Download traceability report as Markdown file
 */
const downloadReport = async (req, res) => {
  try {
    const { jobId } = req.params;
    const reportPath = path.join(process.cwd(), 'exports', jobId, 'traceability-report.md');
    
    try {
      await fs.access(reportPath);
      res.download(reportPath, `traceability-report-${jobId}.md`);
    } catch (error) {
      res.status(404).json({ error: 'Traceability report not found' });
    }
    
  } catch (error) {
    console.error('Error downloading report:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Read all files from a directory recursively
 */
const readAllFiles = async (dirPath) => {
  const files = [];
  
  const scanDirectory = async (currentPath, relativePath = '') => {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const relPath = path.join(relativePath, entry.name);
        
        if (entry.isDirectory()) {
          await scanDirectory(fullPath, relPath);
        } else if (entry.isFile()) {
          const content = await fs.readFile(fullPath, 'utf-8');
          files.push({
            path: relPath,
            content,
            size: content.length
          });
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not scan directory ${currentPath}:`, error.message);
    }
  };
  
  await scanDirectory(dirPath);
  return files;
};

/**
 * Create prompt for consistency check
 */
const createConsistencyPrompt = (files) => {
  let prompt = `Please review the following files for consistency and correctness:\n\n`;
  
  files.forEach((file, index) => {
    prompt += `=== File ${index + 1}: ${file.path} ===\n`;
    prompt += `${file.content}\n\n`;
  });
  
  prompt += `Please:\n`;
  prompt += `1. Check for contradictions or conflicts between files\n`;
  prompt += `2. Ensure all requirements are consistent\n`;
  prompt += `3. Verify all diagrams use Mermaid syntax\n`;
  prompt += `4. Return corrected files if changes are needed\n`;
  prompt += `5. Indicate which files were changed and why\n\n`;
  prompt += `Format your response as JSON with the structure:\n`;
  prompt += `{\n`;
  prompt += `  "files": [\n`;
  prompt += `    {\n`;
  prompt += `      "path": "relative/path/to/file",\n`;
  prompt += `      "content": "corrected content",\n`;
  prompt += `      "hasChanges": true|false,\n`;
  prompt += `      "changeReason": "explanation of changes"\n`;
  prompt += `    }\n`;
  prompt += `  ],\n`;
  prompt += `  "summary": "overall consistency analysis"\n`;
  prompt += `}`;
  
  return prompt;
};

/**
 * Parse LLM consistency response
 */
const parseConsistencyResponse = async (responseContent) => {
  try {
    // Try to extract JSON from the response
    const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.files || [];
    } else {
      // Fallback: assume no changes needed
      return [];
    }
  } catch (error) {
    console.warn('Could not parse consistency response:', error.message);
    return [];
  }
};

/**
 * Analyze project completeness for traceability report
 */
const analyzeProjectCompleteness = async (jobId, summary) => {
  const projectPath = path.join(process.cwd(), '..', '..', 'projects', summary.projectId || 'unknown');
  const exportDir = path.join(process.cwd(), 'exports', jobId);
  
  const analysis = {
    projectId: summary.projectId || 'unknown',
    jobId,
    totalFiles: summary.totalFiles || 0,
    completedAt: summary.completedAt,
    consistencyCheck: summary.consistencyCheck || null,
    projectDocuments: [],
    techStackFiles: [],
    processedFiles: [],
    gaps: [],
    completenessScore: 0
  };
  
  try {
    // Analyze project documents
    const projectFiles = await readAllFiles(projectPath);
    analysis.projectDocuments = projectFiles.map(f => ({
      name: f.path,
      size: f.size,
      type: getFileType(f.path)
    }));
    
    // Analyze processed files
    const processedDir = path.join(exportDir, 'processed');
    const processedFiles = await readAllFiles(processedDir);
    analysis.processedFiles = processedFiles.map(f => ({
      name: f.path,
      size: f.size,
      type: getFileType(f.path)
    }));
    
    // Calculate completeness score
    analysis.completenessScore = calculateCompletenessScore(analysis);
    
    // Identify gaps
    analysis.gaps = identifyGaps(analysis);
    
  } catch (error) {
    console.warn('Could not fully analyze project:', error.message);
  }
  
  return analysis;
};

/**
 * Get file type for analysis
 */
const getFileType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const fileName = path.basename(filePath).toLowerCase();
  
  if (ext === '.md') {
    if (fileName.includes('readme')) return 'Documentation';
    if (fileName.includes('requirements')) return 'Requirements';
    return 'Markdown';
  }
  if (ext === '.json') return 'Configuration';
  if (ext === '.yml' || ext === '.yaml') return 'Configuration';
  if (ext === '.js' || ext === '.ts') return 'Code';
  if (ext === '.html') return 'Template';
  if (ext === '.css' || ext === '.scss') return 'Styles';
  return 'Other';
};

/**
 * Calculate completeness score based on project analysis
 */
const calculateCompletenessScore = (analysis) => {
  let score = 0;
  const weights = {
    hasReadme: 20,
    hasRequirements: 15,
    hasConfiguration: 15,
    hasDocumentation: 10,
    processedFilesRatio: 30,
    consistencyCheck: 10
  };
  
  // Check for README
  if (analysis.projectDocuments.some(f => f.name.toLowerCase().includes('readme'))) {
    score += weights.hasReadme;
  }
  
  // Check for requirements documents
  if (analysis.projectDocuments.some(f => f.name.toLowerCase().includes('requirements'))) {
    score += weights.hasRequirements;
  }
  
  // Check for configuration files
  if (analysis.projectDocuments.some(f => f.type === 'Configuration')) {
    score += weights.hasConfiguration;
  }
  
  // Check for documentation
  if (analysis.projectDocuments.some(f => f.type === 'Documentation')) {
    score += weights.hasDocumentation;
  }
  
  // Processed files ratio
  if (analysis.totalFiles > 0) {
    const ratio = analysis.processedFiles.length / analysis.totalFiles;
    score += weights.processedFilesRatio * ratio;
  }
  
  // Consistency check completion
  if (analysis.consistencyCheck) {
    score += weights.consistencyCheck;
  }
  
  return Math.round(score);
};

/**
 * Identify gaps in project documentation/configuration
 */
const identifyGaps = (analysis) => {
  const gaps = [];
  
  // Check for missing README
  if (!analysis.projectDocuments.some(f => f.name.toLowerCase().includes('readme'))) {
    gaps.push({
      type: 'Documentation',
      description: 'Missing README.md file',
      impact: 'High',
      recommendation: 'Add a comprehensive README.md with project description, setup instructions, and usage examples'
    });
  }
  
  // Check for missing requirements
  if (!analysis.projectDocuments.some(f => f.name.toLowerCase().includes('requirements'))) {
    gaps.push({
      type: 'Requirements',
      description: 'Missing requirements documentation',
      impact: 'Medium',
      recommendation: 'Add requirements.txt, package.json, or equivalent dependency specification'
    });
  }
  
  // Check for missing configuration
  if (!analysis.projectDocuments.some(f => f.type === 'Configuration')) {
    gaps.push({
      type: 'Configuration',
      description: 'Missing configuration files',
      impact: 'Medium',
      recommendation: 'Add configuration files for build tools, linters, or framework settings'
    });
  }
  
  // Check consistency check status
  if (!analysis.consistencyCheck) {
    gaps.push({
      type: 'Quality Assurance',
      description: 'Consistency check not performed',
      impact: 'Low',
      recommendation: 'Run consistency check to ensure all files are aligned and conflict-free'
    });
  }
  
  return gaps;
};

/**
 * Generate Markdown traceability report
 */
const generateMarkdownReport = (analysis) => {
  const report = [];
  
  // Header
  report.push(`# Traceability Report`);
  report.push(`**Project ID:** ${analysis.projectId}`);
  report.push(`**Job ID:** ${analysis.jobId}`);
  report.push(`**Generated:** ${new Date().toISOString()}`);
  report.push(`**Completeness Score:** ${analysis.completenessScore}%`);
  report.push('');
  
  // Overview
  report.push('## Overview');
  report.push(`This traceability report provides a comprehensive analysis of project ${analysis.projectId}, including documentation coverage, file processing results, and identified gaps.`);
  report.push('');
  
  // Processing Summary
  report.push('## Processing Summary');
  report.push(`- **Total Files Processed:** ${analysis.totalFiles}`);
  report.push(`- **Processing Completed:** ${analysis.completedAt}`);
  if (analysis.consistencyCheck) {
    report.push(`- **Consistency Check:** Completed on ${analysis.consistencyCheck.completedAt}`);
    report.push(`- **Files Updated:** ${analysis.consistencyCheck.filesUpdated.length}`);
  } else {
    report.push(`- **Consistency Check:** Not performed`);
  }
  report.push('');
  
  // Project Structure Analysis
  report.push('## Project Structure Analysis');
  report.push('');
  
  // Project documents
  report.push('### Project Documents');
  if (analysis.projectDocuments.length > 0) {
    report.push('| File | Type | Size |');
    report.push('|------|------|------|');
    analysis.projectDocuments.forEach(doc => {
      report.push(`| ${doc.name} | ${doc.type} | ${doc.size} bytes |`);
    });
  } else {
    report.push('*No project documents found.*');
  }
  report.push('');
  
  // Processed files
  report.push('### Processed Files');
  if (analysis.processedFiles.length > 0) {
    report.push('| File | Type | Size |');
    report.push('|------|------|------|');
    analysis.processedFiles.forEach(file => {
      report.push(`| ${file.name} | ${file.type} | ${file.size} bytes |`);
    });
  } else {
    report.push('*No processed files found.*');
  }
  report.push('');
  
  // Requirements Traceability
  report.push('## Requirements Traceability');
  report.push('');
  report.push('### Requirements Sources');
  report.push('This analysis shows how requirements were sourced and implemented:');
  report.push('');
  
  // Create traceability matrix
  report.push('```mermaid');
  report.push('graph TD');
  report.push('    ProjectDocs[Project Documents] --> Analysis[LLM Analysis]');
  report.push('    TechStack[Tech Stack Guidelines] --> Analysis');
  report.push('    Analysis --> ProcessedFiles[Processed Files]');
  report.push('    ProcessedFiles --> ConsistencyCheck[Consistency Check]');
  report.push('    ConsistencyCheck --> Report[Traceability Report]');
  if (analysis.gaps.length > 0) {
    report.push('    Analysis --> Gaps[Identified Gaps]');
    report.push('    Gaps --> Recommendations[Recommendations]');
  }
  report.push('```');
  report.push('');
  
  // Completeness Analysis
  report.push('## Completeness Analysis');
  report.push('');
  report.push(`**Overall Score: ${analysis.completenessScore}%**`);
  report.push('');
  
  // Score breakdown
  report.push('### Score Breakdown');
  report.push('| Category | Weight | Status |');
  report.push('|----------|---------|--------|');
  report.push(`| README Documentation | 20% | ${analysis.projectDocuments.some(f => f.name.toLowerCase().includes('readme')) ? '✅ Present' : '❌ Missing'} |`);
  report.push(`| Requirements Documentation | 15% | ${analysis.projectDocuments.some(f => f.name.toLowerCase().includes('requirements')) ? '✅ Present' : '❌ Missing'} |`);
  report.push(`| Configuration Files | 15% | ${analysis.projectDocuments.some(f => f.type === 'Configuration') ? '✅ Present' : '❌ Missing'} |`);
  report.push(`| General Documentation | 10% | ${analysis.projectDocuments.some(f => f.type === 'Documentation') ? '✅ Present' : '❌ Missing'} |`);
  report.push(`| File Processing | 30% | ${analysis.totalFiles > 0 ? Math.round((analysis.processedFiles.length / analysis.totalFiles) * 100) : 0}% |`);
  report.push(`| Consistency Check | 10% | ${analysis.consistencyCheck ? '✅ Completed' : '❌ Not Performed'} |`);
  report.push('');
  
  // Identified Gaps
  if (analysis.gaps.length > 0) {
    report.push('## Identified Gaps');
    report.push('');
    analysis.gaps.forEach((gap, index) => {
      report.push(`### ${index + 1}. ${gap.description}`);
      report.push(`- **Type:** ${gap.type}`);
      report.push(`- **Impact:** ${gap.impact}`);
      report.push(`- **Recommendation:** ${gap.recommendation}`);
      report.push('');
    });
  }
  
  // Recommendations
  report.push('## Recommendations');
  report.push('');
  if (analysis.completenessScore >= 80) {
    report.push('✅ **Excellent**: Your project has comprehensive documentation and configuration coverage.');
  } else if (analysis.completenessScore >= 60) {
    report.push('⚠️ **Good**: Your project has decent coverage but could benefit from addressing the identified gaps.');
  } else {
    report.push('❌ **Needs Improvement**: Your project would significantly benefit from additional documentation and configuration.');
  }
  report.push('');
  
  if (analysis.gaps.length > 0) {
    report.push('### Priority Actions:');
    analysis.gaps
      .filter(gap => gap.impact === 'High')
      .forEach((gap, index) => {
        report.push(`${index + 1}. ${gap.recommendation}`);
      });
    report.push('');
  }
  
  // Footer
  report.push('---');
  report.push('*This report was generated automatically by the Vibe Coding Accelerator.*');
  
  return report.join('\n');
};

module.exports = {
  performConsistencyCheck,
  generateReport,
  getReport,
  downloadReport
};
