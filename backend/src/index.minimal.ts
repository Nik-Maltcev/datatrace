/**
 * Minimal server for Railway deployment testing
 * Absolutely minimal setup with no custom imports
 */

import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

// Minimal middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'privacy-data-removal-backend-minimal',
    version: '1.0.0',
    port: PORT,
    message: 'Minimal server is running'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'DataTrace API - Minimal Version',
    status: 'running',
    endpoints: {
      health: '/health',
      test: '/test'
    }
  });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({
    message: 'Test endpoint working',
    timestamp: new Date().toISOString(),
    headers: req.headers,
    method: req.method,
    url: req.url
  });
});

// Catch all other routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    availableEndpoints: ['/health', '/', '/test']
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`✅ Minimal server running on port ${PORT}`);
  console.log(`✅ Health: http://localhost:${PORT}/health`);
  console.log(`✅ Test: http://localhost:${PORT}/test`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('SIGINT received');
  server.close(() => process.exit(0));
});

export default app;