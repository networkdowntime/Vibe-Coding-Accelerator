const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

// Utility function to read .env file and parse it
async function readEnvFile() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    const envContent = await fs.readFile(envPath, 'utf8');
    
    const envVars = {};
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim();
        }
      }
    }
    
    return envVars;
  } catch (error) {
    console.error('Error reading .env file:', error);
    return {};
  }
}

// Utility function to write .env file
async function writeEnvFile(envVars) {
  try {
    const envPath = path.join(process.cwd(), '.env');
    
    // Read existing content to preserve comments and structure
    let existingContent = '';
    try {
      existingContent = await fs.readFile(envPath, 'utf8');
    } catch (error) {
      // File doesn't exist, start fresh
      existingContent = '# Environment variables for Vibe Coding Accelerator\n';
    }
    
    let updatedContent = existingContent;
    
    // Update or add each environment variable
    Object.entries(envVars).forEach(([key, value]) => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      const newLine = `${key}=${value}`;
      
      if (regex.test(updatedContent)) {
        // Update existing line
        updatedContent = updatedContent.replace(regex, newLine);
      } else {
        // Add new line
        updatedContent += `\n${newLine}`;
      }
    });
    
    await fs.writeFile(envPath, updatedContent, 'utf8');
    
    // Update process.env for immediate use
    Object.entries(envVars).forEach(([key, value]) => {
      process.env[key] = value;
    });
    
    return true;
  } catch (error) {
    console.error('Error writing .env file:', error);
    throw error;
  }
}

// Get current OpenAPI settings
const getOpenApiSettings = async (req, res) => {
  try {
    const envVars = await readEnvFile();
    
    const settings = {
      endpoint: envVars.OPENAPI_ENDPOINT || '',
      hasApiKey: !!(envVars.OPENAPI_API_KEY && envVars.OPENAPI_API_KEY.trim()),
      isConfigured: !!(envVars.OPENAPI_ENDPOINT && envVars.OPENAPI_API_KEY)
    };
    
    res.json(settings);
  } catch (error) {
    console.error('Error getting OpenAPI settings:', error);
    res.status(500).json({ error: 'Failed to load OpenAPI settings' });
  }
};

// Update OpenAPI settings
const updateOpenApiSettings = async (req, res) => {
  try {
    const { endpoint, apiKey } = req.body;
    
    // Validate required fields
    if (!endpoint || !endpoint.trim()) {
      return res.status(400).json({ error: 'OpenAPI endpoint is required' });
    }
    
    if (!apiKey || !apiKey.trim()) {
      return res.status(400).json({ error: 'API key is required' });
    }
    
    // Validate URL format
    try {
      new URL(endpoint);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid endpoint URL format' });
    }
    
    // Update .env file
    const envUpdates = {
      OPENAPI_ENDPOINT: endpoint.trim(),
      OPENAPI_API_KEY: apiKey.trim()
    };
    
    await writeEnvFile(envUpdates);
    
    res.json({ 
      message: 'OpenAPI settings updated successfully',
      settings: {
        endpoint: endpoint.trim(),
        hasApiKey: true,
        isConfigured: true
      }
    });
  } catch (error) {
    console.error('Error updating OpenAPI settings:', error);
    res.status(500).json({ error: 'Failed to update OpenAPI settings' });
  }
};

// Test OpenAPI connectivity
const testOpenApiConnection = async (req, res) => {
  try {
    const envVars = await readEnvFile();
    const endpoint = envVars.OPENAPI_ENDPOINT;
    const apiKey = envVars.OPENAPI_API_KEY;
    
    if (!endpoint || !apiKey) {
      return res.status(400).json({ 
        error: 'OpenAPI endpoint and API key must be configured before testing',
        success: false
      });
    }
    
    // Test the connection with a simple request
    // This is a generic test that should work with most OpenAPI-compatible LLM services
    const testPayload = {
      messages: [
        {
          role: "user",
          content: "Hello, this is a connectivity test. Please respond with 'Connection successful'."
        }
      ],
      max_tokens: 50,
      temperature: 0.1
    };
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
    
    // Add timeout for the test request
    const axiosConfig = {
      timeout: 30000, // 30 seconds
      headers
    };
    
    console.log(`Testing OpenAPI connection to: ${endpoint}`);
    
    const response = await axios.post(endpoint, testPayload, axiosConfig);
    
    if (response.status === 200 && response.data) {
      console.log('OpenAPI connection test successful');
      res.json({
        success: true,
        message: 'Connection successful',
        response: {
          status: response.status,
          hasData: !!response.data
        }
      });
    } else {
      console.error('OpenAPI connection test failed: Unexpected response');
      res.status(400).json({
        success: false,
        error: 'Unexpected response from OpenAPI endpoint',
        details: `Status: ${response.status}`
      });
    }
  } catch (error) {
    console.error('Error testing OpenAPI connection:', error);
    
    let errorMessage = 'Failed to connect to OpenAPI endpoint';
    let statusCode = 500;
    
    if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused - endpoint may be unreachable';
      statusCode = 400;
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'Endpoint not found - check the URL';
      statusCode = 400;
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      errorMessage = 'Connection timeout - endpoint may be slow or unreachable';
      statusCode = 408;
    } else if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const status = error.response.status;
      if (status === 401) {
        errorMessage = 'Authentication failed - check your API key';
      } else if (status === 403) {
        errorMessage = 'Access forbidden - API key may not have required permissions';
      } else if (status === 404) {
        errorMessage = 'Endpoint not found - check the URL path';
      } else {
        errorMessage = `Server responded with error: ${status}`;
      }
      statusCode = 400;
    }
    
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: error.message
    });
  }
};

module.exports = {
  getOpenApiSettings,
  updateOpenApiSettings,
  testOpenApiConnection
};
