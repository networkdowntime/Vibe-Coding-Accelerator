import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';

// Import routes
import projectRoutes from './routes/projects.js';
import fileRoutes from './routes/files.js';
import healthRoutes from './routes/health.js';
import agentRoutes from './routes/agents.js';
import settingsRoutes from './routes/settings.js';
import llmRoutes from './routes/llm.js';
import traceabilityRoutes from './routes/traceability.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:']
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});
app.use(limiter);

// CORS configuration for Angular frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging middleware
app.use(morgan('combined'));
app.use(requestLogger);

// API routes
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/files', fileRoutes);
app.use('/api/v1/agents', agentRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/llm', llmRoutes);
app.use('/api/v1/traceability', traceabilityRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Vibe Coding Accelerator API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/v1/health',
      projects: '/api/v1/projects',
      files: '/api/v1/files',
      agents: '/api/v1/agents',
      settings: '/api/v1/settings',
      llm: '/api/v1/llm',
      traceability: '/api/v1/traceability'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: [
      '/api/v1/health',
      '/api/v1/projects',
      '/api/v1/files',
      '/api/v1/agents',
      '/api/v1/settings',
      '/api/v1/llm',
      '/api/v1/traceability'
    ]
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  if (server) {
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  if (server) {
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

// Only start server if not in test environment
let server;
if (process.env.NODE_ENV !== 'test') {
  // Start server
  server = app.listen(PORT, () => {
    console.log(`🚀 Vibe Coding Accelerator API server is running on port ${PORT}`);
    console.log(`📖 API Documentation: http://localhost:${PORT}/`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:4200'}`);
  });
}

export default app;
