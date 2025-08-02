import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { logger } from './utils/logger';

// Import routes
import searchRoutes from './routes/search.routes';
import instructionsRoutes from './routes/instructions.routes';
import tariffsRoutes from './routes/tariffs.routes';
import notificationsRoutes from './routes/notifications.routes';
import monitoringRoutes from './routes/monitoring.routes';

// Import middleware
import { generalRateLimit } from './middleware/rate-limit.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { 
  securityMiddleware, 
  securityMonitoringMiddleware,
  emergencyLockdownMiddleware 
} from './middleware/security.middleware';
import {
  requestMetricsMiddleware,
  errorTrackingMiddleware,
  healthCheckMiddleware,
  rateLimitMetricsMiddleware,
  memoryTrackingMiddleware
} from './middleware/monitoring.middleware';

// Загружаем переменные окружения
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security and basic middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ 
  limit: '1mb',
  type: 'application/json'
}));

app.use(express.urlencoded({ 
  extended: true,
  limit: '1mb'
}));

// Apply emergency lockdown check first
app.use(emergencyLockdownMiddleware);

// Apply comprehensive security middleware
app.use(securityMiddleware({
  enablePIISanitization: true,
  enableMemoryCleanup: true,
  enableDataEncryption: true,
  enableAdvancedRateLimit: true,
  enableThreatDetection: true,
  enableSecurityHeaders: true
}));

// Apply security monitoring
app.use(securityMonitoringMiddleware);

// Apply monitoring middleware
app.use(requestMetricsMiddleware);
app.use(healthCheckMiddleware);
app.use(rateLimitMetricsMiddleware);
app.use(memoryTrackingMiddleware);

// Apply general rate limiting (as backup)
app.use(generalRateLimit);

// Health check endpoint (before rate limiting)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'privacy-data-removal-backend',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/search', searchRoutes);
app.use('/api/instructions', instructionsRoutes);
app.use('/api/tariffs', tariffsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/monitoring', monitoringRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Privacy Data Removal Service API',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      search: '/api/search',
      instructions: '/api/instructions',
      tariffs: '/api/tariffs',
      health: '/health'
    }
  });
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'Privacy Data Removal Service API',
    version: '1.0.0',
    description: 'API for searching and removing personal data from Telegram bots',
    endpoints: [
      {
        path: '/api/search',
        method: 'POST',
        description: 'Search for personal data across all bots',
        parameters: {
          type: 'phone | email | inn | snils | passport',
          value: 'string - the value to search for'
        }
      },
      {
        path: '/api/search/specific',
        method: 'POST',
        description: 'Search with specific bots only',
        parameters: {
          type: 'phone | email | inn | snils | passport',
          value: 'string - the value to search for',
          botIds: 'array - list of bot IDs to search'
        }
      },
      {
        path: '/api/instructions/:botId',
        method: 'GET',
        description: 'Get removal instructions for a specific bot'
      },
      {
        path: '/api/tariffs',
        method: 'GET',
        description: 'Get all available tariff plans'
      }
    ]
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorTrackingMiddleware);
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
  process.exit(1);
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Запуск сервера
const server = app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3001'}`);
});

export default app;