/**
 * Unit tests for SearchService
 */

import { SearchService, AggregatedSearchResults } from '../search.service';
import { ApiManagerService, SearchResults, BotSearchResult } from '../api-manager.service';
import { SearchRequest, SearchType } from '../../types/search';
import { logger } from '../../utils/logger';

// Mock the ApiManagerService
jest.mock('../api-manager.service');
jest.mock('../../utils/logger');

const MockedApiManagerService = ApiManagerService as jest.MockedClass<typeof ApiManagerService>;
const mockedLogger = logger as jest.Mocked<typeof logger>;

describe('SearchService', () => {
  let searchService: SearchService;
  let mockApiManager: jest.Mocked<ApiManagerService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock API manager instance
    mockApiManager = {
      searchAll: jest.fn(),
      searchWithBots: jest.fn(),
      getBotStatuses: jest.fn(),
      getCircuitBreakerStates: jest.fn(),
    } as any;

    MockedApiManagerService.getInstance.mockReturnValue(mockApiManager);
    
    searchService = new SearchService({
      enableEncryption: true,
      maxSearchTime: 30000,
      enableResultAggregation: true,
      logSearches: true
    });
  });

  describe('searchAllBots', () => {
    const validSearchRequest: SearchRequest = {
      type: 'phone',
      value: '+79123456789'
    };

    const mockSearchResults: SearchResults = {
      searchId: 'test_search_123',
      timestamp: new Date('2024-01-01T10:00:00Z'),
      query: '+79123456789',
      searchType: 'phone',
      results: [
        {
          botId: 'dyxless',
          encryptedName: 'Бот A',
          status: 'success',
          foundFields: [
            { fieldName: 'phone', fieldValue: '+79123456789' },
            { fieldName: 'name', fieldValue: 'Test User' }
          ],
          totalRecords: 2,
          hasData: true,
          responseTime: 1500
        },
        {
          botId: 'itp',
          encryptedName: 'Бот B',
          status: 'no_data',
          foundFields: [],
          totalRecords: 0,
          hasData: false,
          responseTime: 800
        }
      ],
      totalBotsSearched: 2,
      totalBotsWithData: 1,
      totalRecords: 2,
      searchDuration: 2000
    };

    it('should successfully search all bots and return aggregated results', async () => {
      mockApiManager.searchAll.mockResolvedValue(mockSearchResults);

      const result = await searchService.searchAllBots(validSearchRequest);

      expect(mockApiManager.searchAll).toHaveBeenCalledWith(validSearchRequest);
      expect(result).toMatchObject({
        searchId: 'test_search_123',
        searchType: 'phone',
        totalBotsSearched: 2,
        totalBotsWithData: 1,
        totalRecords: 2,
        encryptionEnabled: true
      });

      expect(result.results).toHaveLength(2);
      expect(result.results[0]).toMatchObject({
        botId: 'dyxless',
        botName: 'Бот A',
        hasData: true,
        status: 'success'
      });

      expect(result.results[0].foundData).toHaveLength(2);
      expect(result.results[0].foundData[0]).toMatchObject({
        field: 'phone',
        value: '+79123456789',
        source: 'dyxless'
      });
    });

    it('should log search initiation and completion', async () => {
      mockApiManager.searchAll.mockResolvedValue(mockSearchResults);

      await searchService.searchAllBots(validSearchRequest);

      expect(mockedLogger.info).toHaveBeenCalledWith('Search initiated', {
        searchType: 'phone',
        queryLength: 13,
        timestamp: expect.any(String)
      });

      expect(mockedLogger.info).toHaveBeenCalledWith('Search completed', {
        searchId: 'test_search_123',
        totalBotsSearched: 2,
        totalBotsWithData: 1,
        totalRecords: 2,
        searchDuration: 2000
      });
    });

    it('should validate search request and throw error for invalid type', async () => {
      const invalidRequest = {
        type: 'invalid' as SearchType,
        value: 'test'
      };

      await expect(searchService.searchAllBots(invalidRequest))
        .rejects.toThrow('Invalid search type: invalid');
    });

    it('should validate search request and throw error for empty value', async () => {
      const invalidRequest = {
        type: 'phone' as SearchType,
        value: ''
      };

      await expect(searchService.searchAllBots(invalidRequest))
        .rejects.toThrow('Search value cannot be empty');
    });

    it('should validate phone number format', async () => {
      const invalidPhoneRequest = {
        type: 'phone' as SearchType,
        value: 'invalid-phone'
      };

      await expect(searchService.searchAllBots(invalidPhoneRequest))
        .rejects.toThrow('Invalid phone number format');
    });

    it('should validate email format', async () => {
      const invalidEmailRequest = {
        type: 'email' as SearchType,
        value: 'invalid-email'
      };

      await expect(searchService.searchAllBots(invalidEmailRequest))
        .rejects.toThrow('Invalid email format');
    });

    it('should validate INN format', async () => {
      const invalidINNRequest = {
        type: 'inn' as SearchType,
        value: '123'
      };

      await expect(searchService.searchAllBots(invalidINNRequest))
        .rejects.toThrow('Invalid INN format (must be 10-12 digits)');
    });

    it('should validate SNILS format', async () => {
      const invalidSNILSRequest = {
        type: 'snils' as SearchType,
        value: '123'
      };

      await expect(searchService.searchAllBots(invalidSNILSRequest))
        .rejects.toThrow('Invalid SNILS format (must be 11 digits)');
    });

    it('should validate passport format', async () => {
      const invalidPassportRequest = {
        type: 'passport' as SearchType,
        value: '123'
      };

      await expect(searchService.searchAllBots(invalidPassportRequest))
        .rejects.toThrow('Invalid passport format (must be 4 digits, space, 6 digits)');
    });

    it('should handle API manager errors and log them', async () => {
      const error = new Error('API Manager failed');
      mockApiManager.searchAll.mockRejectedValue(error);

      await expect(searchService.searchAllBots(validSearchRequest))
        .rejects.toThrow('API Manager failed');

      expect(mockedLogger.error).toHaveBeenCalledWith('Search failed', {
        searchType: 'phone',
        error: 'API Manager failed',
        searchDuration: expect.any(Number)
      });
    });

    it('should handle search timeout', async () => {
      // Create a service with very short timeout
      const shortTimeoutService = new SearchService({
        maxSearchTime: 100
      });

      // Mock a slow API response
      mockApiManager.searchAll.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockSearchResults), 200))
      );

      await expect(shortTimeoutService.searchAllBots(validSearchRequest))
        .rejects.toThrow('Search timeout after 100ms');
    });

    it('should sort results with data first', async () => {
      const resultsWithMixedData: SearchResults = {
        ...mockSearchResults,
        results: [
          {
            botId: 'itp',
            encryptedName: 'Бот B',
            status: 'no_data',
            foundFields: [],
            totalRecords: 0,
            hasData: false,
            responseTime: 800
          },
          {
            botId: 'dyxless',
            encryptedName: 'Бот A',
            status: 'success',
            foundFields: [{ fieldName: 'phone', fieldValue: '+79123456789' }],
            totalRecords: 1,
            hasData: true,
            responseTime: 1500
          }
        ]
      };

      mockApiManager.searchAll.mockResolvedValue(resultsWithMixedData);

      const result = await searchService.searchAllBots(validSearchRequest);

      // Results with data should come first
      expect(result.results[0].hasData).toBe(true);
      expect(result.results[0].botId).toBe('dyxless');
      expect(result.results[1].hasData).toBe(false);
      expect(result.results[1].botId).toBe('itp');
    });
  });

  describe('searchWithSpecificBots', () => {
    const validSearchRequest: SearchRequest = {
      type: 'email',
      value: 'test@example.com'
    };

    const botIds = ['dyxless', 'itp'];

    it('should search with specific bots only', async () => {
      const mockResults: SearchResults = {
        searchId: 'specific_search_123',
        timestamp: new Date(),
        query: 'test@example.com',
        searchType: 'email',
        results: [
          {
            botId: 'dyxless',
            encryptedName: 'Бот A',
            status: 'success',
            foundFields: [{ fieldName: 'email', fieldValue: 'test@example.com' }],
            totalRecords: 1,
            hasData: true,
            responseTime: 1000
          }
        ],
        totalBotsSearched: 1,
        totalBotsWithData: 1,
        totalRecords: 1,
        searchDuration: 1200
      };

      mockApiManager.searchWithBots.mockResolvedValue(mockResults);

      const result = await searchService.searchWithSpecificBots(validSearchRequest, botIds);

      expect(mockApiManager.searchWithBots).toHaveBeenCalledWith(validSearchRequest, botIds);
      expect(result.totalBotsSearched).toBe(1);
      expect(result.results[0].botId).toBe('dyxless');
    });

    it('should log specific bot search operations', async () => {
      const mockResults: SearchResults = {
        searchId: 'specific_search_123',
        timestamp: new Date(),
        query: 'test@example.com',
        searchType: 'email',
        results: [],
        totalBotsSearched: 0,
        totalBotsWithData: 0,
        totalRecords: 0,
        searchDuration: 500
      };

      mockApiManager.searchWithBots.mockResolvedValue(mockResults);

      await searchService.searchWithSpecificBots(validSearchRequest, botIds);

      expect(mockedLogger.info).toHaveBeenCalledWith('Specific bot search initiated', {
        searchType: 'email',
        botIds,
        queryLength: 16
      });

      expect(mockedLogger.info).toHaveBeenCalledWith('Specific bot search completed', {
        searchId: 'specific_search_123',
        botIds,
        totalBotsWithData: 0
      });
    });
  });

  describe('bot name encryption', () => {
    it('should apply bot name encryption when enabled', async () => {
      const mockResults: SearchResults = {
        searchId: 'test_search',
        timestamp: new Date(),
        query: 'test',
        searchType: 'phone',
        results: [
          {
            botId: 'dyxless',
            encryptedName: 'Dyxless', // Not encrypted in API manager
            status: 'success',
            foundFields: [],
            totalRecords: 0,
            hasData: false,
            responseTime: 1000
          }
        ],
        totalBotsSearched: 1,
        totalBotsWithData: 0,
        totalRecords: 0,
        searchDuration: 1000
      };

      mockApiManager.searchAll.mockResolvedValue(mockResults);

      const result = await searchService.searchAllBots({
        type: 'phone',
        value: '+79123456789'
      });

      expect(result.results[0].botName).toBe('Бот A');
      expect(result.encryptionEnabled).toBe(true);
    });

    it('should not modify already encrypted bot names', async () => {
      const mockResults: SearchResults = {
        searchId: 'test_search',
        timestamp: new Date(),
        query: 'test',
        searchType: 'phone',
        results: [
          {
            botId: 'dyxless',
            encryptedName: 'Бот A', // Already encrypted
            status: 'success',
            foundFields: [],
            totalRecords: 0,
            hasData: false,
            responseTime: 1000
          }
        ],
        totalBotsSearched: 1,
        totalBotsWithData: 0,
        totalRecords: 0,
        searchDuration: 1000
      };

      mockApiManager.searchAll.mockResolvedValue(mockResults);

      const result = await searchService.searchAllBots({
        type: 'phone',
        value: '+79123456789'
      });

      expect(result.results[0].botName).toBe('Бот A');
    });

    it('should disable encryption when configured', async () => {
      const serviceWithoutEncryption = new SearchService({
        enableEncryption: false
      });

      const mockResults: SearchResults = {
        searchId: 'test_search',
        timestamp: new Date(),
        query: 'test',
        searchType: 'phone',
        results: [
          {
            botId: 'dyxless',
            encryptedName: 'Dyxless',
            status: 'success',
            foundFields: [],
            totalRecords: 0,
            hasData: false,
            responseTime: 1000
          }
        ],
        totalBotsSearched: 1,
        totalBotsWithData: 0,
        totalRecords: 0,
        searchDuration: 1000
      };

      mockApiManager.searchAll.mockResolvedValue(mockResults);

      const result = await serviceWithoutEncryption.searchAllBots({
        type: 'phone',
        value: '+79123456789'
      });

      expect(result.results[0].botName).toBe('Dyxless');
      expect(result.encryptionEnabled).toBe(false);
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
        },
        {
          botId: 'itp',
          name: 'ITP',
          encryptedName: 'Бот B',
          isActive: true,
          isAvailable: false,
          circuitBreakerOpen: true,
          priority: 2
        }
      ];

      const mockCircuitBreakerStates = {
        dyxless: { isOpen: false, failureCount: 0, lastFailureTime: null, nextAttemptTime: null },
        itp: { isOpen: true, failureCount: 3, lastFailureTime: new Date(), nextAttemptTime: new Date() }
      };

      mockApiManager.getBotStatuses.mockResolvedValue(mockBotStatuses);
      mockApiManager.getCircuitBreakerStates.mockReturnValue(mockCircuitBreakerStates);

      const stats = await searchService.getSearchStatistics();

      expect(stats).toEqual({
        totalBots: 2,
        activeBots: 2,
        availableBots: 1,
        circuitBreakerStatus: {
          dyxless: false,
          itp: true
        }
      });
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when all active bots are available', async () => {
      const mockBotStatuses = [
        {
          botId: 'dyxless',
          name: 'Dyxless',
          encryptedName: 'Бот A',
          isActive: true,
          isAvailable: true,
          circuitBreakerOpen: false,
          priority: 1
        },
        {
          botId: 'itp',
          name: 'ITP',
          encryptedName: 'Бот B',
          isActive: false,
          isAvailable: false,
          circuitBreakerOpen: false,
          priority: 2
        }
      ];

      mockApiManager.getBotStatuses.mockResolvedValue(mockBotStatuses);

      const health = await searchService.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.details.apiManager).toBe(true);
      expect(health.details.botStatuses).toHaveLength(2);
    });

    it('should return degraded status when some bots are unavailable', async () => {
      const mockBotStatuses = [
        {
          botId: 'dyxless',
          name: 'Dyxless',
          encryptedName: 'Бот A',
          isActive: true,
          isAvailable: true,
          circuitBreakerOpen: false,
          priority: 1
        },
        {
          botId: 'itp',
          name: 'ITP',
          encryptedName: 'Бот B',
          isActive: true,
          isAvailable: false,
          circuitBreakerOpen: true,
          priority: 2
        }
      ];

      mockApiManager.getBotStatuses.mockResolvedValue(mockBotStatuses);

      const health = await searchService.healthCheck();

      expect(health.status).toBe('degraded');
    });

    it('should return unhealthy status when no bots are available', async () => {
      const mockBotStatuses = [
        {
          botId: 'dyxless',
          name: 'Dyxless',
          encryptedName: 'Бот A',
          isActive: true,
          isAvailable: false,
          circuitBreakerOpen: true,
          priority: 1
        }
      ];

      mockApiManager.getBotStatuses.mockResolvedValue(mockBotStatuses);

      const health = await searchService.healthCheck();

      expect(health.status).toBe('unhealthy');
    });

    it('should return unhealthy status when API manager fails', async () => {
      mockApiManager.getBotStatuses.mockRejectedValue(new Error('API Manager error'));

      const health = await searchService.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.details.apiManager).toBe(false);
      expect(health.details.botStatuses).toEqual([]);
    });
  });

  describe('configuration', () => {
    it('should return current configuration', () => {
      const config = searchService.getConfig();

      expect(config).toEqual({
        enableEncryption: true,
        maxSearchTime: 30000,
        enableResultAggregation: true,
        logSearches: true
      });
    });

    it('should update configuration', () => {
      searchService.updateConfig({
        enableEncryption: false,
        maxSearchTime: 60000
      });

      const config = searchService.getConfig();

      expect(config.enableEncryption).toBe(false);
      expect(config.maxSearchTime).toBe(60000);
      expect(config.enableResultAggregation).toBe(true); // Should remain unchanged
      expect(config.logSearches).toBe(true); // Should remain unchanged
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = SearchService.getInstance();
      const instance2 = SearchService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});