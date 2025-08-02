/**
 * Tests for Search Routes
 */

import request from 'supertest';
import express from 'express';
import searchRoutes from '../search.routes';
import { SearchService } from '../../services/search.service';

// Mock the SearchService
jest.mock('../../services/search.service');
jest.mock('../../utils/logger');

const mockSearchService = {
  searchAllBots: jest.fn(),
  searchWithSpecificBots: jest.fn(),
  getSearchStatistics: jest.fn(),
  healthCheck: jest.fn()
};

describe('Search Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock SearchService.getInstance
    (SearchService.getInstance as jest.Mock).mockReturnValue(mockSearchService);

    // Create test app
    app = express();
    app.use(express.json());
    app.use('/api/search', searchRoutes);
  });

  describe('POST /api/search', () => {
    const validSearchRequest = {
      type: 'email',
      value: 'test@example.com'
    };

    const mockSearchResults = {
      searchId: 'search_123',
      timestamp: new Date(),
      query: '[17 characters]',
      searchType: 'email',
      results: [
        {
          botId: 'dyxless',
          botName: 'Бот A',
          foundData: [
            { field: 'email', value: 'test@example.com', source: 'dyxless' }
          ],
          hasData: true,
          status: 'success'
        }
      ],
      totalBotsSearched: 1,
      totalBotsWithData: 1,
      totalRecords: 1,
      searchDuration: 1500,
      encryptionEnabled: true
    };

    it('should successfully process valid search request', async () => {
      mockSearchService.searchAllBots.mockResolvedValue(mockSearchResults);

      const response = await request(app)
        .post('/api/search')
        .send(validSearchRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockSearchResults);
      expect(response.body.meta).toHaveProperty('requestId');
      expect(response.body.meta).toHaveProperty('timestamp');
      expect(response.body.meta).toHaveProperty('processingTime');
      
      expect(mockSearchService.searchAllBots).toHaveBeenCalledWith(validSearchRequest);
    });

    it('should return 400 for invalid search type', async () => {
      const invalidRequest = {
        type: 'invalid',
        value: 'test@example.com'
      };

      const response = await request(app)
        .post('/api/search')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
      expect(mockSearchService.searchAllBots).not.toHaveBeenCalled();
    });

    it('should return 400 for missing search value', async () => {
      const invalidRequest = {
        type: 'email'
      };

      const response = await request(app)
        .post('/api/search')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid email format', async () => {
      const invalidRequest = {
        type: 'email',
        value: 'invalid-email'
      };

      const response = await request(app)
        .post('/api/search')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('FORMAT_VALIDATION_ERROR');
    });

    it('should handle search service errors', async () => {
      mockSearchService.searchAllBots.mockRejectedValue(new Error('Search failed'));

      const response = await request(app)
        .post('/api/search')
        .send(validSearchRequest)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Search failed');
      expect(response.body.error.type).toBe('SEARCH_ERROR');
    });

    it('should handle timeout errors with appropriate status code', async () => {
      mockSearchService.searchAllBots.mockRejectedValue(new Error('Search timeout after 60000ms'));

      const response = await request(app)
        .post('/api/search')
        .send(validSearchRequest)
        .expect(408);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(408);
    });
  });

  describe('POST /api/search/specific', () => {
    const validSpecificRequest = {
      type: 'phone',
      value: '+1234567890',
      botIds: ['dyxless', 'itp']
    };

    it('should successfully process specific bot search', async () => {
      const mockResults = {
        searchId: 'search_456',
        timestamp: new Date(),
        results: [],
        totalBotsSearched: 2,
        totalBotsWithData: 0,
        totalRecords: 0,
        searchDuration: 1000
      };

      mockSearchService.searchWithSpecificBots.mockResolvedValue(mockResults);

      const response = await request(app)
        .post('/api/search/specific')
        .send(validSpecificRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockSearchService.searchWithSpecificBots).toHaveBeenCalledWith(
        { type: 'phone', value: '+1234567890' },
        ['dyxless', 'itp']
      );
    });

    it('should return 400 for missing botIds', async () => {
      const invalidRequest = {
        type: 'phone',
        value: '+1234567890'
      };

      const response = await request(app)
        .post('/api/search/specific')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('botIds array is required');
    });

    it('should return 400 for empty botIds array', async () => {
      const invalidRequest = {
        type: 'phone',
        value: '+1234567890',
        botIds: []
      };

      const response = await request(app)
        .post('/api/search/specific')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('must not be empty');
    });
  });

  describe('GET /api/search/statistics', () => {
    it('should return search statistics', async () => {
      const mockStats = {
        totalBots: 5,
        activeBots: 4,
        availableBots: 3,
        circuitBreakerStatus: {
          dyxless: false,
          itp: true
        }
      };

      mockSearchService.getSearchStatistics.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/search/statistics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStats);
    });

    it('should handle statistics errors', async () => {
      mockSearchService.getSearchStatistics.mockRejectedValue(new Error('Stats failed'));

      const response = await request(app)
        .get('/api/search/statistics')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('STATISTICS_ERROR');
    });
  });

  describe('GET /api/search/health', () => {
    it('should return healthy status', async () => {
      const mockHealth = {
        status: 'healthy' as const,
        details: {
          apiManager: true,
          botStatuses: [
            { botId: 'dyxless', isActive: true, isAvailable: true }
          ]
        }
      };

      mockSearchService.healthCheck.mockResolvedValue(mockHealth);

      const response = await request(app)
        .get('/api/search/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
    });

    it('should return degraded status with 206', async () => {
      const mockHealth = {
        status: 'degraded' as const,
        details: {
          apiManager: true,
          botStatuses: []
        }
      };

      mockSearchService.healthCheck.mockResolvedValue(mockHealth);

      const response = await request(app)
        .get('/api/search/health')
        .expect(206);

      expect(response.body.data.status).toBe('degraded');
    });

    it('should return unhealthy status with 503', async () => {
      const mockHealth = {
        status: 'unhealthy' as const,
        details: {
          apiManager: false,
          botStatuses: []
        }
      };

      mockSearchService.healthCheck.mockResolvedValue(mockHealth);

      const response = await request(app)
        .get('/api/search/health')
        .expect(503);

      expect(response.body.data.status).toBe('unhealthy');
    });
  });
});