/**
 * Search API Routes
 * Handles search requests and coordinates with SearchService
 */

import { Router, Request, Response } from 'express';
import { SearchService } from '../services/search.service';
import { SearchRequest, SearchType } from '../types/search';
import { logger } from '../utils/logger';
import { validateSearchRequest } from '../middleware/validation.middleware';
import { rateLimitMiddleware } from '../middleware/rate-limit.middleware';
import { searchMetricsMiddleware, apiPerformanceMiddleware } from '../middleware/monitoring.middleware';

const router = Router();
const searchService = SearchService.getInstance();

/**
 * POST /api/search
 * Main search endpoint for finding data across all bots
 */
router.post('/search', 
  rateLimitMiddleware,
  validateSearchRequest,
  searchMetricsMiddleware,
  apiPerformanceMiddleware('search'),
  async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const searchRequest: SearchRequest = {
        type: req.body.type as SearchType,
        value: req.body.value
      };

      logger.info('Search request received', {
        searchType: searchRequest.type,
        queryLength: searchRequest.value.length,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });

      // Get user ID from headers
      const userId = req.headers['x-user-id'] as string || 'anonymous';

      // Execute search
      const results = await searchService.searchAllBots(searchRequest, userId);

      // Log successful search
      const duration = Date.now() - startTime;
      logger.info('Search completed successfully', {
        searchId: results.searchId,
        totalBotsSearched: results.totalBotsSearched,
        totalBotsWithData: results.totalBotsWithData,
        totalRecords: results.totalRecords,
        duration
      });

      res.status(200).json({
        success: true,
        data: results,
        meta: {
          requestId: results.searchId,
          timestamp: new Date().toISOString(),
          processingTime: duration
        }
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Search request failed', {
        error: errorMessage,
        duration,
        searchType: req.body.type,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });

      // Determine appropriate status code
      let statusCode = 500;
      if (errorMessage.includes('Invalid') || errorMessage.includes('format')) {
        statusCode = 400;
      } else if (errorMessage.includes('timeout')) {
        statusCode = 408;
      } else if (errorMessage.includes('No active bot')) {
        statusCode = 503;
      }

      res.status(statusCode).json({
        success: false,
        error: {
          message: errorMessage,
          code: statusCode,
          type: 'SEARCH_ERROR'
        },
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: duration
        }
      });
    }
  }
);

/**
 * POST /api/search/specific
 * Search with specific bots only
 */
router.post('/search/specific',
  rateLimitMiddleware,
  validateSearchRequest,
  async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const searchRequest: SearchRequest = {
        type: req.body.type as SearchType,
        value: req.body.value
      };

      const botIds: string[] = req.body.botIds || [];

      if (!Array.isArray(botIds) || botIds.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            message: 'botIds array is required and must not be empty',
            code: 400,
            type: 'VALIDATION_ERROR'
          }
        });
        return;
      }

      logger.info('Specific bot search request received', {
        searchType: searchRequest.type,
        botIds,
        queryLength: searchRequest.value.length
      });

      const results = await searchService.searchWithSpecificBots(searchRequest, botIds);

      const duration = Date.now() - startTime;
      logger.info('Specific bot search completed', {
        searchId: results.searchId,
        botIds,
        totalBotsWithData: results.totalBotsWithData,
        duration
      });

      res.status(200).json({
        success: true,
        data: results,
        meta: {
          requestId: results.searchId,
          timestamp: new Date().toISOString(),
          processingTime: duration
        }
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Specific bot search failed', {
        error: errorMessage,
        duration,
        botIds: req.body.botIds
      });

      res.status(500).json({
        success: false,
        error: {
          message: errorMessage,
          code: 500,
          type: 'SEARCH_ERROR'
        },
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: duration
        }
      });
    }
  }
);

/**
 * GET /api/search/statistics
 * Get search system statistics
 */
router.get('/statistics',
  async (req: Request, res: Response) => {
    try {
      const stats = await searchService.getSearchStatistics();
      
      res.status(200).json({
        success: true,
        data: stats,
        meta: {
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Failed to get search statistics', { error: errorMessage });

      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve statistics',
          code: 500,
          type: 'STATISTICS_ERROR'
        }
      });
    }
  }
);

/**
 * GET /api/search/health
 * Health check for search service
 */
router.get('/health',
  async (req: Request, res: Response) => {
    try {
      const health = await searchService.healthCheck();
      
      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 206 : 503;

      res.status(statusCode).json({
        success: true,
        data: health,
        meta: {
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Health check failed', { error: errorMessage });

      res.status(503).json({
        success: false,
        error: {
          message: 'Health check failed',
          code: 503,
          type: 'HEALTH_CHECK_ERROR'
        }
      });
    }
  }
);

export default router;