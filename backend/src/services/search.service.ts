/**
 * Search Service
 * Coordinates search operations across all bot APIs and aggregates results
 */

import { SearchRequest, SearchResult, SearchResults, SearchType, FoundDataItem } from '../types/search';
import { ApiManagerService, BotSearchResult } from './api-manager.service';
import { ErrorRecoveryService } from './error-recovery.service';
import { logger } from '../utils/logger';
import { notificationService } from './notification.service';
import { monitoringService } from './monitoring.service';

export interface SearchServiceConfig {
  enableEncryption: boolean;
  maxSearchTime: number;
  enableResultAggregation: boolean;
  logSearches: boolean;
}

export interface AggregatedSearchResults {
  searchId: string;
  timestamp: Date;
  query: string;
  searchType: SearchType;
  results: SearchResult[];
  totalBotsSearched: number;
  totalBotsWithData: number;
  totalRecords: number;
  searchDuration: number;
  encryptionEnabled: boolean;
}

export class SearchService {
  private static instance: SearchService;
  private readonly apiManager: ApiManagerService;
  private readonly errorRecovery: ErrorRecoveryService;
  private readonly config: SearchServiceConfig;

  constructor(config?: Partial<SearchServiceConfig>) {
    this.config = {
      enableEncryption: config?.enableEncryption ?? true,
      maxSearchTime: config?.maxSearchTime ?? 60000, // 60 seconds
      enableResultAggregation: config?.enableResultAggregation ?? true,
      logSearches: config?.logSearches ?? true
    };

    this.apiManager = ApiManagerService.getInstance();
    this.errorRecovery = ErrorRecoveryService.getInstance();
  }

  public static getInstance(config?: Partial<SearchServiceConfig>): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService(config);
    }
    return SearchService.instance;
  }

  /**
   * Main search method that coordinates search across all bots with error recovery
   */
  async searchAllBots(request: SearchRequest, userId?: string): Promise<AggregatedSearchResults> {
    const startTime = Date.now();
    const searchId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Log search request (without PII)
      if (this.config.logSearches) {
        logger.info('Search initiated', {
          searchId,
          searchType: request.type,
          queryLength: request.value.length,
          timestamp: new Date().toISOString()
        });
      }

      // Create search started notification
      if (userId) {
        await notificationService.createNotification(
          userId,
          'search_started',
          {
            searchId,
            searchType: request.type,
            queryLength: request.value.length
          }
        );
      }

      // Validate search request
      this.validateSearchRequest(request);

      // Execute parallel search through API manager
      const searchResults = await Promise.race([
        this.apiManager.searchAll(request),
        this.createTimeoutPromise(this.config.maxSearchTime)
      ]);

      // Aggregate and transform results
      const aggregatedResults = this.aggregateResults(searchResults, request);

      // Log search completion
      if (this.config.logSearches) {
        logger.info('Search completed', {
          searchId: aggregatedResults.searchId,
          totalBotsSearched: aggregatedResults.totalBotsSearched,
          totalBotsWithData: aggregatedResults.totalBotsWithData,
          totalRecords: aggregatedResults.totalRecords,
          searchDuration: aggregatedResults.searchDuration
        });
      }

      // Record search metrics
      const botsWithData = aggregatedResults.results.filter(r => r.hasData).map(r => r.botId);
      monitoringService.recordSearch(
        request.type,
        aggregatedResults.searchDuration,
        true,
        botsWithData
      );

      // Record individual bot API metrics
      for (const result of aggregatedResults.results) {
        monitoringService.recordApiRequest(
          result.botId,
          aggregatedResults.searchDuration / aggregatedResults.totalBotsSearched, // Approximate per-bot time
          result.status === 'success'
        );
      }

      // Create search completed notification
      if (userId) {
        await notificationService.createNotification(
          userId,
          'search_completed',
          {
            searchId: aggregatedResults.searchId,
            totalBotsSearched: aggregatedResults.totalBotsSearched,
            totalBotsWithData: aggregatedResults.totalBotsWithData,
            totalRecords: aggregatedResults.totalRecords,
            searchDuration: aggregatedResults.searchDuration,
            count: aggregatedResults.totalRecords
          }
        );

        // Create data found notifications for each bot with data
        for (const result of aggregatedResults.results) {
          if (result.hasData && result.foundData.length > 0) {
            await notificationService.createNotification(
              userId,
              'data_found',
              {
                searchId: aggregatedResults.searchId,
                botId: result.botId,
                botName: result.botName,
                foundDataCount: result.foundData.length,
                foundFields: result.foundData.map(d => d.field)
              }
            );
          }
        }
      }

      return aggregatedResults;

    } catch (error) {
      const searchDuration = Date.now() - startTime;
      
      logger.error('Search failed, attempting recovery', {
        searchId,
        searchType: request.type,
        error: error instanceof Error ? error.message : 'Unknown error',
        searchDuration
      });

      // Create search failed notification
      if (userId) {
        await notificationService.createNotification(
          userId,
          'search_failed',
          {
            searchId,
            searchType: request.type,
            error: error instanceof Error ? error.message : 'Unknown error',
            searchDuration
          }
        );
      }

      // Attempt error recovery with graceful degradation
      return await this.handleSearchErrorWithRecovery(error as Error, request, startTime, userId);
    }
  }

  /**
   * Handle search errors with recovery strategies
   */
  private async handleSearchErrorWithRecovery(
    error: Error,
    request: SearchRequest,
    startTime: number,
    userId?: string
  ): Promise<AggregatedSearchResults> {
    try {
      // Attempt error recovery
      const recoveryResult = await this.errorRecovery.attemptRecovery(error, request);

      if (recoveryResult.success && recoveryResult.results) {
        // Recovery succeeded, return recovered results
        logger.info('Search recovered successfully', {
          strategy: recoveryResult.strategy,
          searchType: request.type,
          hasResults: !!recoveryResult.results
        });

        // If results are already in the correct format, return them
        if (recoveryResult.results.searchId) {
          return {
            ...recoveryResult.results,
            searchDuration: Date.now() - startTime,
            encryptionEnabled: this.config.enableEncryption
          };
        }

        // Otherwise, aggregate the results
        return this.aggregateResults(recoveryResult.results, request);
      } else if (recoveryResult.success && recoveryResult.partialResults) {
        // Partial recovery - create results from partial data
        const partialSearchResults = {
          searchId: `partial_${Date.now()}`,
          timestamp: new Date(startTime),
          query: request.value,
          searchType: request.type,
          results: recoveryResult.partialResults,
          totalBotsSearched: recoveryResult.partialResults.length,
          totalBotsWithData: recoveryResult.partialResults.filter(r => r.hasData).length,
          totalRecords: recoveryResult.partialResults.reduce((sum, r) => sum + r.totalRecords, 0),
          searchDuration: Date.now() - startTime
        };

        return this.aggregateResults(partialSearchResults, request);
      } else {
        // Recovery failed, throw enhanced error with suggestions
        const enhancedError = new Error(recoveryResult.message) as any;
        enhancedError.type = 'SEARCH_RECOVERY_FAILED';
        enhancedError.suggestions = recoveryResult.suggestions;
        enhancedError.recoveryStrategy = recoveryResult.strategy;
        enhancedError.isOperational = true;
        
        throw enhancedError;
      }
    } catch (recoveryError) {
      // Recovery itself failed, throw original error with recovery context
      const contextualError = new Error(`Search failed: ${error.message}`) as any;
      contextualError.type = 'SEARCH_ERROR_WITH_RECOVERY_FAILURE';
      contextualError.originalError = error.message;
      contextualError.recoveryError = recoveryError instanceof Error ? recoveryError.message : 'Unknown recovery error';
      contextualError.suggestions = this.errorRecovery.getRecoveryRecommendations(error, request.type);
      contextualError.isOperational = true;
      
      throw contextualError;
    }
  }

  /**
   * Search with specific bots only
   */
  async searchWithSpecificBots(
    request: SearchRequest, 
    botIds: string[]
  ): Promise<AggregatedSearchResults> {
    const startTime = Date.now();
    
    try {
      if (this.config.logSearches) {
        logger.info('Specific bot search initiated', {
          searchType: request.type,
          botIds,
          queryLength: request.value.length
        });
      }

      this.validateSearchRequest(request);

      const searchResults = await Promise.race([
        this.apiManager.searchWithBots(request, botIds),
        this.createTimeoutPromise(this.config.maxSearchTime)
      ]);

      const aggregatedResults = this.aggregateResults(searchResults, request);

      if (this.config.logSearches) {
        logger.info('Specific bot search completed', {
          searchId: aggregatedResults.searchId,
          botIds,
          totalBotsWithData: aggregatedResults.totalBotsWithData
        });
      }

      return aggregatedResults;

    } catch (error) {
      const searchDuration = Date.now() - startTime;
      
      logger.error('Specific bot search failed', {
        searchType: request.type,
        botIds,
        error: error instanceof Error ? error.message : 'Unknown error',
        searchDuration
      });

      throw error;
    }
  }

  /**
   * Aggregate and transform raw API results into user-friendly format
   */
  private aggregateResults(
    rawResults: SearchResults, 
    originalRequest: SearchRequest
  ): AggregatedSearchResults {
    const transformedResults: SearchResult[] = rawResults.results.map(botResult => 
      this.transformBotResult(botResult)
    );

    // Apply encryption to bot names if enabled
    const finalResults = this.config.enableEncryption 
      ? this.applyBotNameEncryption(transformedResults)
      : transformedResults;

    // Sort results by priority (bots with data first, then by bot priority)
    const sortedResults = this.sortResultsByPriority(finalResults);

    return {
      searchId: rawResults.searchId,
      timestamp: rawResults.timestamp,
      query: this.sanitizeQueryForLogging(originalRequest.value),
      searchType: rawResults.searchType,
      results: sortedResults,
      totalBotsSearched: rawResults.totalBotsSearched,
      totalBotsWithData: rawResults.totalBotsWithData,
      totalRecords: rawResults.totalRecords,
      searchDuration: rawResults.searchDuration,
      encryptionEnabled: this.config.enableEncryption
    };
  }

  /**
   * Transform bot search result to user-friendly format
   */
  private transformBotResult(botResult: BotSearchResult): SearchResult {
    // Transform found fields to FoundDataItem format
    const foundData: FoundDataItem[] = botResult.foundFields.map(field => ({
      field: field.fieldName || field.field || 'unknown',
      value: field.fieldValue || field.value || '',
      source: botResult.botId,
      confidence: field.confidence
    }));

    return {
      botId: botResult.botId,
      botName: botResult.encryptedName,
      foundData,
      hasData: botResult.hasData,
      status: botResult.status as any, // Type conversion from BotSearchResult status
      errorMessage: botResult.errorMessage
    };
  }

  /**
   * Apply bot name encryption (already done in ApiManager, but can be overridden here)
   */
  private applyBotNameEncryption(results: SearchResult[]): SearchResult[] {
    // Bot names are already encrypted in ApiManager, but we can add additional encryption here if needed
    return results.map(result => ({
      ...result,
      botName: this.encryptBotName(result.botId, result.botName)
    }));
  }

  /**
   * Encrypt bot name based on bot ID
   */
  private encryptBotName(botId: string, currentName: string): string {
    // If already encrypted (contains "Бот"), return as is
    if (currentName.includes('Бот')) {
      return currentName;
    }

    // Map bot IDs to encrypted names
    const encryptionMap: Record<string, string> = {
      'dyxless': 'Бот A',
      'itp': 'Бот B', 
      'leak_osint': 'Бот C',
      'userbox': 'Бот D',
      'vektor': 'Бот E'
    };

    return encryptionMap[botId] || `Бот ${botId.charAt(0).toUpperCase()}`;
  }

  /**
   * Sort results by priority (bots with data first, then by response time)
   */
  private sortResultsByPriority(results: SearchResult[]): SearchResult[] {
    return results.sort((a, b) => {
      // First priority: bots with data
      if (a.hasData && !b.hasData) return -1;
      if (!a.hasData && b.hasData) return 1;

      // Second priority: successful status
      if (a.status === 'success' && b.status !== 'success') return -1;
      if (a.status !== 'success' && b.status === 'success') return 1;

      // Third priority: number of found records
      const aRecords = a.foundData.length;
      const bRecords = b.foundData.length;
      if (aRecords !== bRecords) return bRecords - aRecords;

      // Default: maintain original order (by bot priority)
      return 0;
    });
  }

  /**
   * Validate search request
   */
  private validateSearchRequest(request: SearchRequest): void {
    if (!request.type || !request.value) {
      throw new Error('Search request must include type and value');
    }

    const validTypes: SearchType[] = ['phone', 'email', 'inn', 'snils', 'passport'];
    if (!validTypes.includes(request.type)) {
      throw new Error(`Invalid search type: ${request.type}`);
    }

    if (request.value.trim().length === 0) {
      throw new Error('Search value cannot be empty');
    }

    // Additional validation based on type
    this.validateSearchValue(request.type, request.value);
  }

  /**
   * Validate search value based on type
   */
  private validateSearchValue(type: SearchType, value: string): void {
    const trimmedValue = value.trim();

    switch (type) {
      case 'phone':
        if (!/^\+?[1-9]\d{1,14}$/.test(trimmedValue.replace(/[\s\-\(\)]/g, ''))) {
          throw new Error('Invalid phone number format');
        }
        break;
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue)) {
          throw new Error('Invalid email format');
        }
        break;
      case 'inn':
        if (!/^\d{10,12}$/.test(trimmedValue)) {
          throw new Error('Invalid INN format (must be 10-12 digits)');
        }
        break;
      case 'snils':
        if (!/^\d{11}$/.test(trimmedValue.replace(/[\s\-]/g, ''))) {
          throw new Error('Invalid SNILS format (must be 11 digits)');
        }
        break;
      case 'passport':
        if (!/^\d{4}\s?\d{6}$/.test(trimmedValue)) {
          throw new Error('Invalid passport format (must be 4 digits, space, 6 digits)');
        }
        break;
    }
  }

  /**
   * Create timeout promise for search operations
   */
  private createTimeoutPromise(timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Search timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  /**
   * Sanitize query for logging (remove PII)
   */
  private sanitizeQueryForLogging(query: string): string {
    // Don't log the actual query value for privacy
    return `[${query.length} characters]`;
  }

  /**
   * Get search statistics
   */
  async getSearchStatistics(): Promise<{
    totalBots: number;
    activeBots: number;
    availableBots: number;
    circuitBreakerStatus: Record<string, boolean>;
  }> {
    const botStatuses = await this.apiManager.getBotStatuses();
    const circuitBreakerStates = this.apiManager.getCircuitBreakerStates();

    return {
      totalBots: botStatuses.length,
      activeBots: botStatuses.filter(bot => bot.isActive).length,
      availableBots: botStatuses.filter(bot => bot.isAvailable).length,
      circuitBreakerStatus: Object.fromEntries(
        Object.entries(circuitBreakerStates).map(([botId, state]) => [botId, state.isOpen])
      )
    };
  }

  /**
   * Get service configuration
   */
  getConfig(): SearchServiceConfig {
    return { ...this.config };
  }

  /**
   * Update service configuration
   */
  updateConfig(newConfig: Partial<SearchServiceConfig>): void {
    Object.assign(this.config, newConfig);
  }

  /**
   * Health check for the search service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      apiManager: boolean;
      botStatuses: Array<{
        botId: string;
        isActive: boolean;
        isAvailable: boolean;
      }>;
    };
  }> {
    try {
      const botStatuses = await this.apiManager.getBotStatuses();
      const activeBots = botStatuses.filter(bot => bot.isActive);
      const availableBots = botStatuses.filter(bot => bot.isAvailable);

      let status: 'healthy' | 'degraded' | 'unhealthy';
      
      if (availableBots.length === activeBots.length && activeBots.length > 0) {
        status = 'healthy';
      } else if (availableBots.length > 0) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }

      return {
        status,
        details: {
          apiManager: true,
          botStatuses: botStatuses.map(bot => ({
            botId: bot.botId,
            isActive: bot.isActive,
            isAvailable: bot.isAvailable
          }))
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          apiManager: false,
          botStatuses: []
        }
      };
    }
  }
}