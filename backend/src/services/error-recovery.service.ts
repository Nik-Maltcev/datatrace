/**
 * Error Recovery Service
 * Implements graceful degradation strategies for API failures
 */

import { SearchRequest, SearchType } from '../types/search';
import { ApiManagerService, BotSearchResult } from './api-manager.service';
import { logger } from '../utils/logger';

export interface RecoveryStrategy {
  name: string;
  description: string;
  canApply: (error: Error, context: RecoveryContext) => boolean;
  apply: (error: Error, context: RecoveryContext) => Promise<RecoveryResult>;
}

export interface RecoveryContext {
  searchRequest: SearchRequest;
  failedBots: string[];
  availableBots: string[];
  attemptCount: number;
  maxAttempts: number;
  originalError: Error;
}

export interface RecoveryResult {
  success: boolean;
  strategy: string;
  results?: any;
  partialResults?: BotSearchResult[];
  message: string;
  suggestions: string[];
}

export class ErrorRecoveryService {
  private static instance: ErrorRecoveryService;
  private readonly apiManager: ApiManagerService;
  private readonly recoveryStrategies: RecoveryStrategy[];

  constructor() {
    this.apiManager = ApiManagerService.getInstance();
    this.recoveryStrategies = this.initializeRecoveryStrategies();
  }

  public static getInstance(): ErrorRecoveryService {
    if (!ErrorRecoveryService.instance) {
      ErrorRecoveryService.instance = new ErrorRecoveryService();
    }
    return ErrorRecoveryService.instance;
  }

  /**
   * Initialize recovery strategies
   */
  private initializeRecoveryStrategies(): RecoveryStrategy[] {
    return [
      {
        name: 'partial_search',
        description: 'Search with available bots only',
        canApply: (error, context) => {
          return context.availableBots.length > 0 && 
                 context.failedBots.length < context.availableBots.length + context.failedBots.length;
        },
        apply: this.applyPartialSearchStrategy.bind(this)
      },
      {
        name: 'retry_with_delay',
        description: 'Retry failed bots with exponential backoff',
        canApply: (error, context) => {
          return context.attemptCount < context.maxAttempts &&
                 (error.message.includes('timeout') || error.message.includes('network'));
        },
        apply: this.applyRetryStrategy.bind(this)
      },
      {
        name: 'fallback_search_type',
        description: 'Try alternative search approaches',
        canApply: (error, context) => {
          return context.searchRequest.type === 'phone' || context.searchRequest.type === 'email';
        },
        apply: this.applyFallbackSearchStrategy.bind(this)
      },
      {
        name: 'cached_results',
        description: 'Return cached results if available',
        canApply: (error, context) => {
          // This would check if we have cached results for this query
          return false; // Disabled for now, would need cache implementation
        },
        apply: this.applyCachedResultsStrategy.bind(this)
      },
      {
        name: 'degraded_service',
        description: 'Provide limited functionality with clear messaging',
        canApply: (error, context) => {
          return true; // Always applicable as last resort
        },
        apply: this.applyDegradedServiceStrategy.bind(this)
      }
    ];
  }

  /**
   * Attempt to recover from search errors using available strategies
   */
  async attemptRecovery(
    error: Error,
    searchRequest: SearchRequest,
    failedBots: string[] = [],
    attemptCount: number = 1
  ): Promise<RecoveryResult> {
    try {
      // Get current bot statuses
      const botStatuses = await this.apiManager.getBotStatuses();
      const availableBots = botStatuses
        .filter(bot => bot.isActive && bot.isAvailable && !failedBots.includes(bot.botId))
        .map(bot => bot.botId);

      const context: RecoveryContext = {
        searchRequest,
        failedBots,
        availableBots,
        attemptCount,
        maxAttempts: 3,
        originalError: error
      };

      logger.info('Attempting error recovery', {
        strategy: 'evaluating',
        failedBots: failedBots.length,
        availableBots: availableBots.length,
        attemptCount,
        searchType: searchRequest.type
      });

      // Try each recovery strategy in order
      for (const strategy of this.recoveryStrategies) {
        if (strategy.canApply(error, context)) {
          logger.info('Applying recovery strategy', {
            strategy: strategy.name,
            description: strategy.description
          });

          try {
            const result = await strategy.apply(error, context);
            
            if (result.success) {
              logger.info('Recovery strategy succeeded', {
                strategy: strategy.name,
                hasResults: !!result.results,
                hasPartialResults: !!result.partialResults
              });
              return result;
            } else {
              logger.warn('Recovery strategy failed', {
                strategy: strategy.name,
                message: result.message
              });
            }
          } catch (strategyError) {
            logger.error('Recovery strategy error', {
              strategy: strategy.name,
              error: strategyError instanceof Error ? strategyError.message : 'Unknown error'
            });
          }
        }
      }

      // If no strategy worked, return failure
      return {
        success: false,
        strategy: 'none_applicable',
        message: 'Не удалось восстановить работу сервиса',
        suggestions: [
          'Попробуйте позже',
          'Проверьте подключение к интернету',
          'Обратитесь в техподдержку если проблема повторяется'
        ]
      };

    } catch (recoveryError) {
      logger.error('Error recovery failed', {
        error: recoveryError instanceof Error ? recoveryError.message : 'Unknown error',
        originalError: error.message
      });

      return {
        success: false,
        strategy: 'recovery_failed',
        message: 'Ошибка при попытке восстановления сервиса',
        suggestions: ['Попробуйте позже', 'Обратитесь в техподдержку']
      };
    }
  }

  /**
   * Partial search strategy - search with available bots only
   */
  private async applyPartialSearchStrategy(
    error: Error,
    context: RecoveryContext
  ): Promise<RecoveryResult> {
    try {
      if (context.availableBots.length === 0) {
        return {
          success: false,
          strategy: 'partial_search',
          message: 'Нет доступных ботов для поиска',
          suggestions: ['Попробуйте позже когда сервисы будут доступны']
        };
      }

      const results = await this.apiManager.searchWithBots(
        context.searchRequest,
        context.availableBots
      );

      return {
        success: true,
        strategy: 'partial_search',
        results,
        message: `Поиск выполнен по ${context.availableBots.length} из ${context.availableBots.length + context.failedBots.length} доступных ботов`,
        suggestions: [
          'Некоторые боты временно недоступны',
          'Попробуйте повторить поиск позже для полных результатов'
        ]
      };
    } catch (partialError) {
      return {
        success: false,
        strategy: 'partial_search',
        message: 'Не удалось выполнить частичный поиск',
        suggestions: ['Попробуйте позже']
      };
    }
  }

  /**
   * Retry strategy with exponential backoff
   */
  private async applyRetryStrategy(
    error: Error,
    context: RecoveryContext
  ): Promise<RecoveryResult> {
    const delay = Math.min(1000 * Math.pow(2, context.attemptCount - 1), 10000); // Max 10 seconds
    
    logger.info('Retrying with delay', {
      attempt: context.attemptCount,
      delay,
      failedBots: context.failedBots
    });

    await this.sleep(delay);

    try {
      // Reset circuit breakers for failed bots
      for (const botId of context.failedBots) {
        this.apiManager.resetBotCircuitBreaker(botId);
      }

      const results = await this.apiManager.searchAll(context.searchRequest);

      return {
        success: true,
        strategy: 'retry_with_delay',
        results,
        message: `Поиск успешно выполнен после ${context.attemptCount} попыток`,
        suggestions: []
      };
    } catch (retryError) {
      return {
        success: false,
        strategy: 'retry_with_delay',
        message: `Повторная попытка ${context.attemptCount} не удалась`,
        suggestions: ['Попробуйте позже']
      };
    }
  }

  /**
   * Fallback search strategy - try alternative search methods
   */
  private async applyFallbackSearchStrategy(
    error: Error,
    context: RecoveryContext
  ): Promise<RecoveryResult> {
    // For now, this is a placeholder for more sophisticated fallback logic
    // Could include things like:
    // - Searching with relaxed validation
    // - Using alternative data formats
    // - Searching related data types

    return {
      success: false,
      strategy: 'fallback_search_type',
      message: 'Альтернативные методы поиска пока не реализованы',
      suggestions: [
        'Попробуйте изменить формат поискового запроса',
        'Используйте другой тип поиска'
      ]
    };
  }

  /**
   * Cached results strategy
   */
  private async applyCachedResultsStrategy(
    error: Error,
    context: RecoveryContext
  ): Promise<RecoveryResult> {
    // Placeholder for cache implementation
    return {
      success: false,
      strategy: 'cached_results',
      message: 'Кэшированные результаты недоступны',
      suggestions: ['Попробуйте новый поиск']
    };
  }

  /**
   * Degraded service strategy - provide minimal functionality
   */
  private async applyDegradedServiceStrategy(
    error: Error,
    context: RecoveryContext
  ): Promise<RecoveryResult> {
    return {
      success: true,
      strategy: 'degraded_service',
      results: {
        searchId: `degraded_${Date.now()}`,
        timestamp: new Date(),
        query: '[REDACTED]',
        searchType: context.searchRequest.type,
        results: [],
        totalBotsSearched: 0,
        totalBotsWithData: 0,
        totalRecords: 0,
        searchDuration: 0,
        isDegraded: true
      },
      message: 'Сервис работает в ограниченном режиме',
      suggestions: [
        'Все боты временно недоступны',
        'Попробуйте позже когда сервисы восстановятся',
        'Обратитесь в техподдержку если проблема повторяется'
      ]
    };
  }

  /**
   * Get recovery recommendations based on error patterns
   */
  getRecoveryRecommendations(error: Error, searchType?: SearchType): string[] {
    const recommendations: string[] = [];

    if (error.message.includes('timeout')) {
      recommendations.push('Проверьте стабильность интернет-соединения');
      recommendations.push('Попробуйте повторить запрос через несколько секунд');
    }

    if (error.message.includes('Circuit breaker')) {
      recommendations.push('Один или несколько сервисов временно недоступны');
      recommendations.push('Попробуйте позже когда сервисы восстановятся');
    }

    if (error.message.includes('Rate limit')) {
      recommendations.push('Превышен лимит запросов');
      recommendations.push('Подождите перед следующим запросом');
      recommendations.push('Рассмотрите возможность обновления тарифного плана');
    }

    if (error.message.includes('validation') || error.message.includes('format')) {
      recommendations.push('Проверьте правильность формата введенных данных');
      
      if (searchType === 'phone') {
        recommendations.push('Номер телефона должен содержать от 7 до 15 цифр');
      } else if (searchType === 'email') {
        recommendations.push('Проверьте правильность email адреса');
      } else if (searchType === 'inn') {
        recommendations.push('ИНН должен содержать 10 или 12 цифр');
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Попробуйте повторить операцию позже');
      recommendations.push('Обратитесь в техподдержку если проблема повторяется');
    }

    return recommendations;
  }

  /**
   * Sleep utility function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if system can provide degraded service
   */
  async canProvideDegradedService(): Promise<boolean> {
    try {
      const botStatuses = await this.apiManager.getBotStatuses();
      const availableBots = botStatuses.filter(bot => bot.isActive && bot.isAvailable);
      
      // Can provide degraded service if at least one bot is available
      return availableBots.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get system health status for recovery decisions
   */
  async getSystemHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'critical';
    availableBots: number;
    totalBots: number;
    circuitBreakersOpen: number;
    canRecover: boolean;
  }> {
    try {
      const botStatuses = await this.apiManager.getBotStatuses();
      const circuitBreakerStates = this.apiManager.getCircuitBreakerStates();
      
      const totalBots = botStatuses.length;
      const availableBots = botStatuses.filter(bot => bot.isActive && bot.isAvailable).length;
      const circuitBreakersOpen = Object.values(circuitBreakerStates).filter(state => state.isOpen).length;
      
      let status: 'healthy' | 'degraded' | 'critical';
      if (availableBots === totalBots) {
        status = 'healthy';
      } else if (availableBots > 0) {
        status = 'degraded';
      } else {
        status = 'critical';
      }

      return {
        status,
        availableBots,
        totalBots,
        circuitBreakersOpen,
        canRecover: availableBots > 0 || circuitBreakersOpen < totalBots
      };
    } catch (error) {
      return {
        status: 'critical',
        availableBots: 0,
        totalBots: 0,
        circuitBreakersOpen: 0,
        canRecover: false
      };
    }
  }
}