/**
 * Tests for ErrorRecoveryService
 */

import { ErrorRecoveryService } from '../error-recovery.service';
import { ApiManagerService } from '../api-manager.service';
import { SearchRequest } from '../../types/search';

// Mock the ApiManagerService
jest.mock('../api-manager.service');
jest.mock('../../utils/logger');

const mockApiManager = {
  getBotStatuses: jest.fn(),
  searchWithBots: jest.fn(),
  searchAll: jest.fn(),
  resetBotCircuitBreaker: jest.fn(),
  getCircuitBreakerStates: jest.fn()
};

describe('ErrorRecoveryService', () => {
  let errorRecoveryService: ErrorRecoveryService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock ApiManagerService.getInstance
    (ApiManagerService.getInstance as jest.Mock).mockReturnValue(mockApiManager);

    errorRecoveryService = new ErrorRecoveryService();
  });

  describe('attemptRecovery', () => {
    const mockSearchRequest: SearchRequest = {
      type: 'email',
      value: 'test@example.com'
    };

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
        name: 'InfoTrackPeople',
        encryptedName: 'Бот B',
        isActive: true,
        isAvailable: false,
        circuitBreakerOpen: true,
        priority: 2
      },
      {
        botId: 'vektor',
        name: 'Vektor',
        encryptedName: 'Бот E',
        isActive: true,
        isAvailable: true,
        circuitBreakerOpen: false,
        priority: 5
      }
    ];

    beforeEach(() => {
      mockApiManager.getBotStatuses.mockResolvedValue(mockBotStatuses);
    });

    it('should apply partial search strategy when some bots are available', async () => {
      const error = new Error('Some bots failed');
      const failedBots = ['itp'];

      const mockSearchResults = {
        searchId: 'partial_search_123',
        timestamp: new Date(),
        query: 'test@example.com',
        searchType: 'email',
        results: [
          {
            botId: 'dyxless',
            encryptedName: 'Бот A',
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

      mockApiManager.searchWithBots.mockResolvedValue(mockSearchResults);

      const result = await errorRecoveryService.attemptRecovery(
        error,
        mockSearchRequest,
        failedBots
      );

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('partial_search');
      expect(result.results).toEqual(mockSearchResults);
      expect(mockApiManager.searchWithBots).toHaveBeenCalledWith(
        mockSearchRequest,
        ['dyxless', 'vektor'] // Available bots excluding failed ones
      );
    });

    it('should apply retry strategy for timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      
      // Mock successful retry
      const mockRetryResults = {
        searchId: 'retry_123',
        timestamp: new Date(),
        results: [],
        totalBotsSearched: 3,
        totalBotsWithData: 0,
        totalRecords: 0,
        searchDuration: 2000
      };

      mockApiManager.searchAll.mockResolvedValue(mockRetryResults);

      const result = await errorRecoveryService.attemptRecovery(
        timeoutError,
        mockSearchRequest,
        [],
        1 // First attempt
      );

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('retry_with_delay');
      expect(result.results).toEqual(mockRetryResults);
      expect(mockApiManager.resetBotCircuitBreaker).toHaveBeenCalled();
    });

    it('should apply degraded service strategy as last resort', async () => {
      const error = new Error('All services failed');
      
      // Mock no available bots
      mockApiManager.getBotStatuses.mockResolvedValue([
        {
          botId: 'dyxless',
          isActive: true,
          isAvailable: false,
          circuitBreakerOpen: true
        }
      ]);

      const result = await errorRecoveryService.attemptRecovery(
        error,
        mockSearchRequest,
        ['dyxless']
      );

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('degraded_service');
      expect(result.results.isDegraded).toBe(true);
      expect(result.suggestions).toContain('Все боты временно недоступны');
    });

    it('should return failure when no strategies are applicable', async () => {
      const error = new Error('Unrecoverable error');
      
      // Mock getBotStatuses to throw error
      mockApiManager.getBotStatuses.mockRejectedValue(new Error('Status check failed'));

      const result = await errorRecoveryService.attemptRecovery(
        error,
        mockSearchRequest
      );

      expect(result.success).toBe(false);
      expect(result.strategy).toBe('recovery_failed');
      expect(result.suggestions).toContain('Попробуйте позже');
    });

    it('should not retry beyond max attempts', async () => {
      const error = new Error('Network timeout');
      
      const result = await errorRecoveryService.attemptRecovery(
        error,
        mockSearchRequest,
        [],
        5 // Exceeds max attempts
      );

      // Should skip retry strategy and go to next available strategy
      expect(result.strategy).not.toBe('retry_with_delay');
    });
  });

  describe('getRecoveryRecommendations', () => {
    it('should provide timeout-specific recommendations', () => {
      const timeoutError = new Error('Request timeout');
      
      const recommendations = errorRecoveryService.getRecoveryRecommendations(
        timeoutError,
        'email'
      );

      expect(recommendations).toContain('Проверьте стабильность интернет-соединения');
      expect(recommendations).toContain('Попробуйте повторить запрос через несколько секунд');
    });

    it('should provide circuit breaker recommendations', () => {
      const circuitError = new Error('Circuit breaker is open');
      
      const recommendations = errorRecoveryService.getRecoveryRecommendations(
        circuitError
      );

      expect(recommendations).toContain('Один или несколько сервисов временно недоступны');
      expect(recommendations).toContain('Попробуйте позже когда сервисы восстановятся');
    });

    it('should provide validation-specific recommendations', () => {
      const validationError = new Error('Invalid phone format');
      
      const recommendations = errorRecoveryService.getRecoveryRecommendations(
        validationError,
        'phone'
      );

      expect(recommendations).toContain('Проверьте правильность формата введенных данных');
      expect(recommendations).toContain('Номер телефона должен содержать от 7 до 15 цифр');
    });

    it('should provide generic recommendations for unknown errors', () => {
      const unknownError = new Error('Unknown error');
      
      const recommendations = errorRecoveryService.getRecoveryRecommendations(
        unknownError
      );

      expect(recommendations).toContain('Попробуйте повторить операцию позже');
      expect(recommendations).toContain('Обратитесь в техподдержку если проблема повторяется');
    });
  });

  describe('getSystemHealthStatus', () => {
    it('should return healthy status when all bots are available', async () => {
      const healthyBotStatuses = [
        { botId: 'dyxless', isActive: true, isAvailable: true },
        { botId: 'itp', isActive: true, isAvailable: true }
      ];

      const circuitBreakerStates = {
        dyxless: { isOpen: false },
        itp: { isOpen: false }
      };

      mockApiManager.getBotStatuses.mockResolvedValue(healthyBotStatuses);
      mockApiManager.getCircuitBreakerStates.mockReturnValue(circuitBreakerStates);

      const health = await errorRecoveryService.getSystemHealthStatus();

      expect(health.status).toBe('healthy');
      expect(health.availableBots).toBe(2);
      expect(health.totalBots).toBe(2);
      expect(health.circuitBreakersOpen).toBe(0);
      expect(health.canRecover).toBe(true);
    });

    it('should return degraded status when some bots are unavailable', async () => {
      const degradedBotStatuses = [
        { botId: 'dyxless', isActive: true, isAvailable: true },
        { botId: 'itp', isActive: true, isAvailable: false }
      ];

      const circuitBreakerStates = {
        dyxless: { isOpen: false },
        itp: { isOpen: true }
      };

      mockApiManager.getBotStatuses.mockResolvedValue(degradedBotStatuses);
      mockApiManager.getCircuitBreakerStates.mockReturnValue(circuitBreakerStates);

      const health = await errorRecoveryService.getSystemHealthStatus();

      expect(health.status).toBe('degraded');
      expect(health.availableBots).toBe(1);
      expect(health.totalBots).toBe(2);
      expect(health.circuitBreakersOpen).toBe(1);
      expect(health.canRecover).toBe(true);
    });

    it('should return critical status when no bots are available', async () => {
      const criticalBotStatuses = [
        { botId: 'dyxless', isActive: true, isAvailable: false },
        { botId: 'itp', isActive: true, isAvailable: false }
      ];

      const circuitBreakerStates = {
        dyxless: { isOpen: true },
        itp: { isOpen: true }
      };

      mockApiManager.getBotStatuses.mockResolvedValue(criticalBotStatuses);
      mockApiManager.getCircuitBreakerStates.mockReturnValue(circuitBreakerStates);

      const health = await errorRecoveryService.getSystemHealthStatus();

      expect(health.status).toBe('critical');
      expect(health.availableBots).toBe(0);
      expect(health.totalBots).toBe(2);
      expect(health.circuitBreakersOpen).toBe(2);
      expect(health.canRecover).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      mockApiManager.getBotStatuses.mockRejectedValue(new Error('Status check failed'));

      const health = await errorRecoveryService.getSystemHealthStatus();

      expect(health.status).toBe('critical');
      expect(health.availableBots).toBe(0);
      expect(health.totalBots).toBe(0);
      expect(health.canRecover).toBe(false);
    });
  });

  describe('canProvideDegradedService', () => {
    it('should return true when at least one bot is available', async () => {
      const botStatuses = [
        { botId: 'dyxless', isActive: true, isAvailable: true },
        { botId: 'itp', isActive: true, isAvailable: false }
      ];

      mockApiManager.getBotStatuses.mockResolvedValue(botStatuses);

      const canProvide = await errorRecoveryService.canProvideDegradedService();

      expect(canProvide).toBe(true);
    });

    it('should return false when no bots are available', async () => {
      const botStatuses = [
        { botId: 'dyxless', isActive: true, isAvailable: false },
        { botId: 'itp', isActive: true, isAvailable: false }
      ];

      mockApiManager.getBotStatuses.mockResolvedValue(botStatuses);

      const canProvide = await errorRecoveryService.canProvideDegradedService();

      expect(canProvide).toBe(false);
    });

    it('should return false on error', async () => {
      mockApiManager.getBotStatuses.mockRejectedValue(new Error('Failed'));

      const canProvide = await errorRecoveryService.canProvideDegradedService();

      expect(canProvide).toBe(false);
    });
  });
});