import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SettingsController {
  constructor() {
    this.envPath = path.join(__dirname, '../../.env');
    
    // Bind methods to maintain 'this' context
    this.getSettings = this.getSettings.bind(this);
    this.updateSettings = this.updateSettings.bind(this);
    this.testLLMConnection = this.testLLMConnection.bind(this);
  }

  /**
   * Get current application settings
   */
  async getSettings(req, res) {
    try {
      const settings = await this.readEnvSettings();
      
      // Don't send sensitive data to frontend
      const safeSettings = {
        llmEndpoint: settings.LLM_ENDPOINT || '',
        hasApiKey: !!settings.LLM_API_KEY,
        isConfigured: !!(settings.LLM_ENDPOINT && settings.LLM_API_KEY)
      };

      res.json({
        success: true,
        data: safeSettings
      });
    } catch (error) {
      console.error('Error reading settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to read settings',
        message: error.message
      });
    }
  }

  /**
   * Update application settings
   */
  async updateSettings(req, res) {
    try {
      const { llmEndpoint, llmApiKey } = req.body;

      if (!llmEndpoint || !llmApiKey) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'Both LLM endpoint and API key are required'
        });
      }

      // Validate URL format
      try {
        new URL(llmEndpoint);
      } catch (urlError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid URL',
          message: 'LLM endpoint must be a valid URL'
        });
      }

      await this.updateEnvSettings({
        LLM_ENDPOINT: llmEndpoint,
        LLM_API_KEY: llmApiKey
      });

      res.json({
        success: true,
        message: 'Settings updated successfully'
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update settings',
        message: error.message
      });
    }
  }

  /**
   * Test LLM connection
   */
  async testLLMConnection(req, res) {
    try {
      const { llmEndpoint, llmApiKey } = req.body;

      if (!llmEndpoint || !llmApiKey) {
        return res.status(400).json({
          success: false,
          error: 'Missing credentials',
          message: 'Both LLM endpoint and API key are required for testing'
        });
      }

      // Validate URL format
      try {
        new URL(llmEndpoint);
      } catch (urlError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid URL',
          message: 'LLM endpoint must be a valid URL'
        });
      }

      // Test the connection
      const testResult = await this.performLLMTest(llmEndpoint, llmApiKey);

      if (testResult.success) {
        res.json({
          success: true,
          message: 'Connection test successful',
          data: testResult.data
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Connection test failed',
          message: testResult.message,
          details: testResult.details
        });
      }
    } catch (error) {
      console.error('Error testing LLM connection:', error);
      res.status(500).json({
        success: false,
        error: 'Connection test failed',
        message: error.message
      });
    }
  }

  /**
   * Read current environment settings
   */
  async readEnvSettings() {
    try {
      const envContent = await fs.readFile(this.envPath, 'utf8');
      const settings = {};
      
      envContent.split('\n').forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          if (key && valueParts.length > 0) {
            settings[key.trim()] = valueParts.join('=').trim();
          }
        }
      });
      
      return settings;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // .env file doesn't exist, return empty settings
        return {};
      }
      throw error;
    }
  }

  /**
   * Update environment settings
   */
  async updateEnvSettings(newSettings) {
    try {
      let existingSettings = {};
      
      try {
        existingSettings = await this.readEnvSettings();
      } catch (error) {
        // File doesn't exist, start with empty settings
        console.log('Creating new .env file');
      }

      // Merge settings
      const mergedSettings = { ...existingSettings, ...newSettings };
      
      // Convert to .env format
      const envContent = Object.entries(mergedSettings)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n') + '\n';

      await fs.writeFile(this.envPath, envContent, 'utf8');
      
      console.log('Settings updated successfully');
    } catch (error) {
      console.error('Error updating .env file:', error);
      throw new Error(`Failed to update environment settings: ${error.message}`);
    }
  }

  /**
   * Perform actual LLM connection test
   */
  async performLLMTest(endpoint, apiKey) {
    try {
      // Detect if this is an Azure OpenAI endpoint or standard OpenAI
      const isAzureOpenAI = endpoint.includes('openai.azure.com');
      
      let requestUrl;
      let headers;
      let requestBody;

      if (isAzureOpenAI) {
        // For Azure OpenAI, the endpoint should already contain the full path
        // e.g., https://your-resource.openai.azure.com/openai/deployments/your-model/chat/completions?api-version=2024-02-15-preview
        requestUrl = endpoint;
        headers = {
          'api-key': apiKey,
          'Content-Type': 'application/json'
        };
        // For Azure, we don't specify the model in the request body as it's in the URL
        requestBody = {
          messages: [
            {
              role: 'user',
              content: 'Test connection. Please respond with just "OK".'
            }
          ],
          max_tokens: 5,
          temperature: 0
        };
      } else {
        // Standard OpenAI API
        requestUrl = `${endpoint}/v1/chat/completions`;
        headers = {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        };
        requestBody = {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: 'Test connection. Please respond with just "OK".'
            }
          ],
          max_tokens: 5,
          temperature: 0
        };
      }

      // Test the connection
      const response = await axios.post(
        requestUrl,
        requestBody,
        {
          headers,
          timeout: 10000 // 10 second timeout
        }
      );

      if (response.status === 200 && response.data) {
        return {
          success: true,
          message: 'Connection successful',
          data: {
            status: response.status,
            model: response.data.model || (isAzureOpenAI ? 'Azure OpenAI Model' : 'Unknown'),
            usage: response.data.usage,
            provider: isAzureOpenAI ? 'Azure OpenAI' : 'OpenAI'
          }
        };
      } else {
        return {
          success: false,
          message: 'Unexpected response from LLM endpoint',
          details: `Status: ${response.status}`
        };
      }
    } catch (error) {
      console.error('LLM connection test failed:', error);
      
      if (error.code === 'ECONNREFUSED') {
        return {
          success: false,
          message: 'Connection refused',
          details: 'Unable to connect to the LLM endpoint. Please check the URL.'
        };
      } else if (error.code === 'ETIMEDOUT') {
        return {
          success: false,
          message: 'Connection timeout',
          details: 'The LLM endpoint did not respond within 10 seconds.'
        };
      } else if (error.response) {
        return {
          success: false,
          message: 'API Error',
          details: `HTTP ${error.response.status}: ${error.response.data?.error?.message || error.response.statusText}`
        };
      } else {
        return {
          success: false,
          message: 'Network error',
          details: error.message
        };
      }
    }
  }
}

export default new SettingsController();
