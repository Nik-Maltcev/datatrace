/**
 * Unit tests for SearchService
 */

import { SearchService } from '../search.service';
import { ApiManagerService } from '../api-manager.service';
import { SearchRequest, SearchType } from '../../types/search';
import { logger } from '../../utils/logger';

// Mock the ApiManagerService
jest.mock('../api-manager.service');
jest.mock('../../utils/logger');

const mockApiManager = {
  searchAll: jest.fn(),
  searchWithBots: jest.fn(),
  getBotStatuses: jest.fn(),
  getCircuitBreakerStates: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

describe('SearchService', () => {
  let searchService: SearchService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock ApiManagerService.getInstance
    (ApiManagerService.getInstance as jest.Mock).mockReturnValue(mockApiManager);
    (logger as any).info = mockLogger.info;
    (logger as any).error = mockLogger.error;

    searchService = new SearchService();
  });

  describe('searchAllBots', () => {
    const validSearchRequest: SearchRequest = {
      type: 'email',
      value: 'test@example.com'
    };

    const mockApiManagerResponse = {
      searchId: 'search_123',
      timestamp: new Date('2024-01-01T00:00:00Z'),
      query: 'test@example.com',
      searchType: 'email' as SearchType,
      results: [
        {
          botId: 'dyxless',
          encryptedName: 'Бот A',
          status: 'success' as const,
          foundFields: [
            { fieldName: 'email', fieldValue: 'test@example.com' },
            { fieldName: 'name', fieldValue: 'John Doe' }
          ],
          totalRecords: 2,
          hasData: true,
          responseTime: 1500
        }
      ],
      totalBotsSearched: 1,
      totalBotsWithData: 1,
      totalRecords: 2,
      searchDuration: 2000
    };

    it('should successfully search all bots and return aggregated results', async () => {
      mockApiManager.searchAll.mockResolvedValue(mockApiManagerResponse);

      const result = await searchService.searchAllBots(validSearchRequest);

      expect(mockApiManager.searchAll).toHaveBeenCalledWith(validSearchRequest);
      expect(result.searchId).toBe('search_123');
      expect(result.query).toBe('[17 characters]');
      expect(result.results).toHaveLength(1);
      expect(result.results[0].botId).toBe('dyxless');
      expect(result.results[0].hasData).toBe(true);
    });

    it('should validate search request and throw error for invalid type', async () => {
      const invalidRequest = {
        type: 'invalid' as SearchType,
        value: 'test@example.com'
      };

      await expect(searchService.searchAllBots(invalidRequest))
        .rejects.toThrow('Invalid search type: invalid');
    });

    it('should validate email format', async () => {
      const invalidEmailRequest = {
        type: 'email' as SearchType,
        value: 'invalid-email'
      };

      await expect(searchService.searchAllBots(invalidEmailRequest))
        .rejects.toThrow('Invalid email format');
    });
  });

  describe('getSearchStatistics', () => {
    it('should return search statistics', async () => {
      const mockBotStatuses = [
        {
          botId: 'dyxless',
          name: 'Dyxless',
          encryptedName: 'Бот A',
          isActive: true,
          isAvailable: true,
          circuitBreakerOpen: false,
          priority: 1
        }
      ];

      const mockCircuitBreakerStates = {
        dyxless: { isOpen: false, failureCount: 0, lastFailureTime: null, nextAttemptTime: null }
      };

      mockApiManager.getBotStatuses.mockResolvedValue(mockBotStatuses);
      mockApiManager.getCircuitBreakerStates.mockReturnValue(mockCircuitBreakerStates);

      const stats = await searchService.getSearchStatistics();

      expect(stats.totalBots).toBe(1);
      expect(stats.activeBots).toBe(1);
      expect(stats.availableBots).toBe(1);
    });
  });
});