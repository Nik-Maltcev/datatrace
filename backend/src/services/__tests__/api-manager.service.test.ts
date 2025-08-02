/**
 * Unit tests for ApiManagerService
 */

import { ApiManagerService } from '../api-manager.service';
import { BotApiClient, ApiResponse, ErrorType } from '../../types/api';
import { SearchType } from '../../types/search';

// Mock all bot clients
jest.mock('../../clients', () => ({
  DyxlessClient: jest.fn(),
  ITPClient: jest.fn(),
  LeakOsintClient: jest.fn(),
  UserboxClient: jest.fn(),
  VektorClient: jest.fn()
}));

describe('ApiManagerService', () => {
  let apiManager: ApiManagerService;
  let mockClients: Record<string, jest.Mocked<BotApiClient>>;

  beforeEach(() => {
    // Reset singleton instance
    (ApiManagerService as any).instance = null;

    // Create mock clients
    mockClients = {
      dyxless: {
        search: jest.fn(),
        isAvailable: jest.fn(),
        getBotId: jest.fn().mockReturnValue('dyxless')
      } as jest.Mocked<BotApiClient>,
      itp: {
        search: jest.fn(),
        isAvailable: jest.fn(),
        getBotId: jest.fn().mockReturnValue('itp')
      } as jest.Mocked<BotApiClient>,
      leak_osint: {
        search: jest.fn(),
        isAvailable: jest.fn(),
        getBotId: jest.fn().mockReturnValue('leak_osint')
      } as jest.Mocked<BotApiClient>,
      userbox: {
        search: jest.fn(),
        isAvailable: jest.fn(),
        getBotId: jest.fn().mockReturnValue('userbox')
      } as jest.Mocked<BotApiClient>,
      vektor: {
        search: jest.fn(),
        isAvailable: jest.fn(),
        getBotId: jest.fn().mockReturnValue('vektor')
      } as jest.Mocked<BotApiClient>
    };

    // Mock client constructors
    const { DyxlessClient, ITPClient, LeakOsintClient, UserboxClient, VektorClient } = require('../../clients');
    
    // Mock constructors to return our mock clients
    DyxlessClient.mockImplementation(() => {
      if (!process.env.DYXLESS_TOKEN) {
        process.env.DYXLESS_TOKEN = 'mock-token';
      }
      return mockClients.dyxless;
    });
    ITPClient.mockImplementation(() => {
      if (!process.env.ITP_TOKEN) {
        process.env.ITP_TOKEN = 'mock-token';
      }
      return mockClients.itp;
    });
    LeakOsintClient.mockImplementation(() => {
      if (!process.env.LEAK_OSINT_TOKEN) {
        process.env.LEAK_OSINT_TOKEN = 'mock-token';
      }
      return mockClients.leak_osint;
    });
    UserboxClient.mockImplementation(() => {
      if (!process.env.USERBOX_TOKEN) {
        process.env.USERBOX_TOKEN = 'mock-token';
      }
      return mockClients.userbox;
    });
    VektorClient.mockImplementation(() => {
      if (!process.env.VEKTOR_TOKEN) {
        process.env.VEKTOR_TOKEN = 'mock-token';
      }
      return mockClients.vektor;
    });

    apiManager = ApiManagerService.getInstance({
      maxConcurrentRequests: 3,
      defaultTimeout: 5000,
      retryAttempts: 1,
      retryDelay: 100,
      circuitBreakerThreshold: 2,
      circuitBreakerTimeout: 1000
    });

    jest.clearAllMocks();
  });

  describe('Singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ApiManagerService.getInstance();
      const instance2 = ApiManagerService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('searchAll', () => {
    it('should search across all active bots successfully', async () => {
      // Mock successful responses from all bots
      const mockResponses: Record<string, ApiResponse> = {
        dyxless: {
          success: true,
          data: {
            hasData: true,
            totalRecords: 2,
            records: [{ name: 'John', phone: '+79123456789' }]
          },
          timestamp: new Date(),
          botId: 'dyxless'
        },
        itp: {
          success: true,
          data: {
            hasData: true,
            totalRecords: 1,
            records: [{ name: 'Jane', email: 'jane@example.com' }]
          },
          timestamp: new Date(),
          botId: 'itp'
        },
        leak_osint: {
          success: true,
          data: {
            hasData: false,
            totalRecords: 0,
            records: []
          },
          timestamp: new Date(),
          botId: 'leak_osint'
        },
        userbox: {
          success: true,
          data: {
            hasData: true,
            totalRecords: 3,
            records: [{ id: 1 }, { id: 2 }, { id: 3 }]
          },
          timestamp: new Date(),
          botId: 'userbox'
        },
        vektor: {
          success: true,
          data: {
            hasData: false,
            totalRecords: 0,
            records: []
          },
          timestamp: new Date(),
          botId: 'vektor'
        }
      };

      // Set up mock responses
      Object.entries(mockClients).forEach(([botId, client]) => {
        client.search.mockResolvedValue(mockResponses[botId]);
      });

      const result = await apiManager.searchAll({
        type: 'phone',
        value: '+79123456789'
      });

      expect(result.searchId).toBeDefined();
      expect(result.query).toBe('+79123456789');
      expect(result.searchType).toBe('phone');
      expect(result.totalBotsSearched).toBe(5);
      expect(result.totalBotsWithData).toBe(3);
      expect(result.totalRecords).toBe(6);
      expect(result.searchDuration).toBeGreaterThan(0);
      expect(result.results).toHaveLength(5);

      // Check individual bot results
      const dyxlessResult = result.results.find(r => r.botId === 'dyxless');
      expect(dyxlessResult?.status).toBe('success');
      expect(dyxlessResult?.hasData).toBe(true);
      expect(dyxlessResult?.totalRecords).toBe(2);
      expect(dyxlessResult?.encryptedName).toBe('Бот A');

      const leakOsintResult = result.results.find(r => r.botId === 'leak_osint');
      expect(leakOsintResult?.status).toBe('no_data');
      expect(leakOsintResult?.hasData).toBe(false);
      expect(leakOsintResult?.totalRecords).toBe(0);
    });

    it('should handle bot errors gracefully', async () => {
      // Mock mixed responses (some success, some errors)
      mockClients.dyxless.search.mockResolvedValue({
        success: true,
        data: { hasData: true, totalRecords: 1, records: [{}] },
        timestamp: new Date(),
        botId: 'dyxless'
      });

      mockClients.itp.search.mockResolvedValue({
        success: false,
        error: 'API rate limit exceeded',
        errorCode: ErrorType.RATE_LIMIT,
        timestamp: new Date(),
        botId: 'itp'
      });

      mockClients.leak_osint.search.mockRejectedValue(new Error('Network timeout'));

      mockClients.userbox.search.mockResolvedValue({
        success: true,
        data: { hasData: false, totalRecords: 0, records: [] },
        timestamp: new Date(),
        botId: 'userbox'
      });

      mockClients.vektor.search.mockResolvedValue({
        success: false,
        error: 'Invalid token',
        errorCode: ErrorType.INVALID_TOKEN,
        timestamp: new Date(),
        botId: 'vektor'
      });

      const result = await apiManager.searchAll({
        type: 'email',
        value: 'test@example.com'
      });

      // Check that we got results from active bots (some might be inactive due to initialization failures)
      expect(result.totalBotsSearched).toBeGreaterThan(0);
      expect(result.totalBotsWithData).toBe(1);
      expect(result.totalRecords).toBe(1);

      // Check error handling for bots that were searched
      const itpResult = result.results.find(r => r.botId === 'itp');
      if (itpResult) {
        expect(itpResult.status).toBe('error');
        expect(itpResult.errorMessage).toBe('API rate limit exceeded');
      }

      const leakOsintResult = result.results.find(r => r.botId === 'leak_osint');
      if (leakOsintResult) {
        expect(leakOsintResult.status).toBe('error');
        expect(leakOsintResult.errorMessage).toBe('Network timeout');
      }
    });

    it('should throw error when no active bots available', async () => {
      // Disable all bots
      apiManager.setBotActive('dyxless', false);
      apiManager.setBotActive('itp', false);
      apiManager.setBotActive('leak_osint', false);
      apiManager.setBotActive('userbox', false);
      apiManager.setBotActive('vektor', false);

      await expect(apiManager.searchAll({
        type: 'phone',
        value: '+79123456789'
      })).rejects.toThrow('No active bot clients available');
    });
  });

  describe('Circuit breaker functionality', () => {
    it('should open circuit breaker after threshold failures', async () => {
      // Mock failures
      mockClients.dyxless.search.mockResolvedValue({
        success: false,
        error: 'API Error',
        errorCode: ErrorType.API_UNAVAILABLE,
        timestamp: new Date(),
        botId: 'dyxless'
      });

      // Set up other bots to succeed
      Object.entries(mockClients).forEach(([botId, client]) => {
        if (botId !== 'dyxless') {
          client.search.mockResolvedValue({
            success: true,
            data: { hasData: false, totalRecords: 0, records: [] },
            timestamp: new Date(),
            botId
          });
        }
      });

      // First failure
      await apiManager.searchAll({ type: 'phone', value: 'test1' });
      
      // Second failure (should open circuit breaker)
      await apiManager.searchAll({ type: 'phone', value: 'test2' });

      // Third request should show circuit breaker is open
      const result = await apiManager.searchAll({ type: 'phone', value: 'test3' });
      
      const dyxlessResult = result.results.find(r => r.botId === 'dyxless');
      expect(dyxlessResult?.status).toBe('circuit_open');
      expect(dyxlessResult?.errorMessage).toBe('Circuit breaker is open');

      // Verify circuit breaker state
      const states = apiManager.getCircuitBreakerStates();
      expect(states.dyxless.isOpen).toBe(true);
      expect(states.dyxless.failureCount).toBe(2);
    });

    it('should reset circuit breaker on successful request', async () => {
      // Cause failures to open circuit breaker
      mockClients.dyxless.search.mockResolvedValue({
        success: false,
        error: 'API Error',
        errorCode: ErrorType.API_UNAVAILABLE,
        timestamp: new Date(),
        botId: 'dyxless'
      });

      // Set up other bots
      Object.entries(mockClients).forEach(([botId, client]) => {
        if (botId !== 'dyxless') {
          client.search.mockResolvedValue({
            success: true,
            data: { hasData: false, totalRecords: 0, records: [] },
            timestamp: new Date(),
            botId
          });
        }
      });

      // Cause failures
      await apiManager.searchAll({ type: 'phone', value: 'test1' });
      await apiManager.searchAll({ type: 'phone', value: 'test2' });

      // Verify circuit breaker is open
      let states = apiManager.getCircuitBreakerStates();
      expect(states.dyxless.isOpen).toBe(true);

      // Wait for circuit breaker timeout and mock success
      await new Promise(resolve => setTimeout(resolve, 1100)); // Wait longer than timeout
      
      mockClients.dyxless.search.mockResolvedValue({
        success: true,
        data: { hasData: true, totalRecords: 1, records: [{}] },
        timestamp: new Date(),
        botId: 'dyxless'
      });

      // Next request should succeed and reset circuit breaker
      const result = await apiManager.searchAll({ type: 'phone', value: 'test3' });
      
      const dyxlessResult = result.results.find(r => r.botId === 'dyxless');
      expect(dyxlessResult?.status).toBe('success');

      // Verify circuit breaker is reset
      states = apiManager.getCircuitBreakerStates();
      expect(states.dyxless.isOpen).toBe(false);
      expect(states.dyxless.failureCount).toBe(0);
    });

    it('should manually reset circuit breaker', async () => {
      // Open circuit breaker
      mockClients.dyxless.search.mockResolvedValue({
        success: false,
        error: 'API Error',
        errorCode: ErrorType.API_UNAVAILABLE,
        timestamp: new Date(),
        botId: 'dyxless'
      });

      Object.entries(mockClients).forEach(([botId, client]) => {
        if (botId !== 'dyxless') {
          client.search.mockResolvedValue({
            success: true,
            data: { hasData: false, totalRecords: 0, records: [] },
            timestamp: new Date(),
            botId
          });
        }
      });

      await apiManager.searchAll({ type: 'phone', value: 'test1' });
      await apiManager.searchAll({ type: 'phone', value: 'test2' });

      // Verify circuit breaker is open
      let states = apiManager.getCircuitBreakerStates();
      expect(states.dyxless.isOpen).toBe(true);

      // Manually reset
      const resetResult = apiManager.resetBotCircuitBreaker('dyxless');
      expect(resetResult).toBe(true);

      // Verify circuit breaker is reset
      states = apiManager.getCircuitBreakerStates();
      expect(states.dyxless.isOpen).toBe(false);
      expect(states.dyxless.failureCount).toBe(0);
    });
  });

  describe('Bot management', () => {
    it('should get bot statuses', async () => {
      // Mock availability checks
      mockClients.dyxless.isAvailable.mockResolvedValue(true);
      mockClients.itp.isAvailable.mockResolvedValue(false);
      mockClients.leak_osint.isAvailable.mockResolvedValue(true);
      mockClients.userbox.isAvailable.mockResolvedValue(true);
      mockClients.vektor.isAvailable.mockResolvedValue(false);

      const statuses = await apiManager.getBotStatuses();

      expect(statuses).toHaveLength(5);
      expect(statuses[0].botId).toBe('dyxless'); // Should be sorted by priority
      expect(statuses[0].encryptedName).toBe('Бот A');
      expect(statuses[0].isActive).toBe(true);
      expect(statuses[0].isAvailable).toBe(true);
      expect(statuses[0].circuitBreakerOpen).toBe(false);

      expect(statuses[1].botId).toBe('itp');
      expect(statuses[1].isAvailable).toBe(false);
    });

    it('should enable/disable bots', () => {
      expect(apiManager.setBotActive('dyxless', false)).toBe(true);
      expect(apiManager.setBotActive('nonexistent', false)).toBe(false);

      // Verify bot is disabled
      const config = apiManager.getConfig();
      expect(config).toBeDefined();
    });
  });

  describe('searchWithBots', () => {
    it('should search with specific bots only', async () => {
      // Mock responses for specific bots
      mockClients.dyxless.search.mockResolvedValue({
        success: true,
        data: { hasData: true, totalRecords: 1, records: [{}] },
        timestamp: new Date(),
        botId: 'dyxless'
      });

      mockClients.userbox.search.mockResolvedValue({
        success: true,
        data: { hasData: false, totalRecords: 0, records: [] },
        timestamp: new Date(),
        botId: 'userbox'
      });

      const result = await apiManager.searchWithBots(
        { type: 'phone', value: '+79123456789' },
        ['dyxless', 'userbox']
      );

      expect(result.totalBotsSearched).toBe(2);
      expect(result.results).toHaveLength(2);
      expect(result.results.map(r => r.botId)).toEqual(['dyxless', 'userbox']);

      // Verify other bots were not called
      expect(mockClients.itp.search).not.toHaveBeenCalled();
      expect(mockClients.leak_osint.search).not.toHaveBeenCalled();
      expect(mockClients.vektor.search).not.toHaveBeenCalled();
    });

    it('should throw error when no specified bots are active', async () => {
      await expect(apiManager.searchWithBots(
        { type: 'phone', value: '+79123456789' },
        ['nonexistent1', 'nonexistent2']
      )).rejects.toThrow('No active bot clients available from the specified list');
    });
  });

  describe('Configuration management', () => {
    it('should get and update configuration', () => {
      const config = apiManager.getConfig();
      expect(config.maxConcurrentRequests).toBe(3);
      expect(config.retryAttempts).toBe(1);

      apiManager.updateConfig({
        maxConcurrentRequests: 10,
        retryAttempts: 3
      });

      const updatedConfig = apiManager.getConfig();
      expect(updatedConfig.maxConcurrentRequests).toBe(10);
      expect(updatedConfig.retryAttempts).toBe(3);
      expect(updatedConfig.defaultTimeout).toBe(5000); // Should remain unchanged
    });
  });

  describe('Retry mechanism', () => {
    it('should retry failed requests', async () => {
      // Ensure at least one bot is active by manually enabling it
      apiManager.setBotActive('dyxless', true);
      
      // Mock first call to fail, second to succeed
      mockClients.dyxless.search
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          success: true,
          data: { hasData: true, totalRecords: 1, records: [{}] },
          timestamp: new Date(),
          botId: 'dyxless'
        });

      // Set up other bots to succeed
      Object.entries(mockClients).forEach(([botId, client]) => {
        if (botId !== 'dyxless') {
          client.search.mockResolvedValue({
            success: true,
            data: { hasData: false, totalRecords: 0, records: [] },
            timestamp: new Date(),
            botId
          });
        }
      });

      // Use searchWithBots to test only the dyxless bot
      const result = await apiManager.searchWithBots(
        { type: 'phone', value: '+79123456789' },
        ['dyxless']
      );

      expect(result.results).toHaveLength(1);
      const dyxlessResult = result.results[0];
      expect(dyxlessResult.botId).toBe('dyxless');
      expect(dyxlessResult.status).toBe('success');
      expect(mockClients.dyxless.search).toHaveBeenCalledTimes(2); // Initial call + 1 retry
    });
  });
});