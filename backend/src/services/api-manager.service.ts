/**
 * API Manager Service
 * Manages all bot API clients and coordinates parallel searches
 */

import { BotApiClient, ApiResponse, ErrorType } from '../types/api';
import { SearchType, SearchRequest } from '../types/search';
import { 
  DyxlessClient, 
  ITPClient, 
  LeakOsintClient, 
  UserboxClient, 
  VektorClient 
} from '../clients';

export interface BotConfig {
  id: string;
  name: string;
  encryptedName: string;
  isActive: boolean;
  priority: number;
  client: BotApiClient;
}

export interface ApiManagerConfig {
  maxConcurrentRequests: number;
  defaultTimeout: number;
  retryAttempts: number;
  retryDelay: number;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
}

export interface SearchResults {
  searchId: string;
  timestamp: Date;
  query: string;
  searchType: SearchType;
  results: BotSearchResult[];
  totalBotsSearched: number;
  totalBotsWithData: number;
  totalRecords: number;
  searchDuration: number;
}

export interface BotSearchResult {
  botId: string;
  encryptedName: string;
  status: 'success' | 'error' | 'no_data' | 'timeout' | 'circuit_open';
  foundFields: any[];
  totalRecords: number;
  hasData: boolean;
  responseTime: number;
  errorMessage?: string;
  rawResponse?: any;
}

export interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: Date | null;
  nextAttemptTime: Date | null;
}

export class ApiManagerService {
  private static instance: ApiManagerService;
  private readonly config: ApiManagerConfig;
  private readonly botClients: Map<string, BotConfig> = new Map();
  private readonly circuitBreakers: Map<string, CircuitBreakerState> = new Map();

  constructor(config?: Partial<ApiManagerConfig>) {
    this.config = {
      maxConcurrentRequests: config?.maxConcurrentRequests || 5,
      defaultTimeout: config?.defaultTimeout || 30000,
      retryAttempts: config?.retryAttempts || 2,
      retryDelay: config?.retryDelay || 1000,
      circuitBreakerThreshold: config?.circuitBreakerThreshold || 3,
      circuitBreakerTimeout: config?.circuitBreakerTimeout || 60000
    };

    this.initializeBotClients();
  }

  public static getInstance(config?: Partial<ApiManagerConfig>): ApiManagerService {
    if (!ApiManagerService.instance) {
      ApiManagerService.instance = new ApiManagerService(config);
    }
    return ApiManagerService.instance;
  }

  /**
   * Initialize all bot clients with their configurations
   */
  private initializeBotClients(): void {
    const botConfigs: Omit<BotConfig, 'client'>[] = [
      {
        id: 'dyxless',
        name: 'Dyxless',
        encryptedName: 'Бот A',
        isActive: true,
        priority: 1
      },
      {
        id: 'itp',
        name: 'InfoTrackPeople',
        encryptedName: 'Бот B',
        isActive: true,
        priority: 2
      },
      {
        id: 'leak_osint',
        name: 'LeakOsint',
        encryptedName: 'Бот C',
        isActive: true,
        priority: 3
      },
      {
        id: 'userbox',
        name: 'Userbox',
        encryptedName: 'Бот D',
        isActive: true,
        priority: 4
      },
      {
        id: 'vektor',
        name: 'Vektor',
        encryptedName: 'Бот E',
        isActive: true,
        priority: 5
      }
    ];

    // Initialize clients
    botConfigs.forEach(config => {
      try {
        let client: BotApiClient;

        switch (config.id) {
          case 'dyxless':
            client = new DyxlessClient();
            break;
          case 'itp':
            client = new ITPClient();
            break;
          case 'leak_osint':
            client = new LeakOsintClient();
            break;
          case 'userbox':
            client = new UserboxClient();
            break;
          case 'vektor':
            client = new VektorClient();
            break;
          default:
            throw new Error(`Unknown bot client: ${config.id}`);
        }

        this.botClients.set(config.id, {
          ...config,
          client
        });

        // Initialize circuit breaker state
        this.circuitBreakers.set(config.id, {
          isOpen: false,
          failureCount: 0,
          lastFailureTime: null,
          nextAttemptTime: null
        });

      } catch (error) {
        console.warn(`Failed to initialize ${config.id} client:`, error instanceof Error ? error.message : error);
        // Mark as inactive if initialization fails but still add to the map
        this.botClients.set(config.id, {
          ...config,
          isActive: false,
          client: null as any
        });
        
        // Still initialize circuit breaker state
        this.circuitBreakers.set(config.id, {
          isOpen: false,
          failureCount: 0,
          lastFailureTime: null,
          nextAttemptTime: null
        });
      }
    });
  }

  /**
   * Search across all active bot APIs in parallel
   */
  async searchAll(request: SearchRequest): Promise<SearchResults> {
    const searchId = this.generateSearchId();
    const startTime = Date.now();

    // Get active bots sorted by priority
    const activeBots = Array.from(this.botClients.values())
      .filter(bot => bot.isActive && bot.client)
      .sort((a, b) => a.priority - b.priority);

    if (activeBots.length === 0) {
      throw new Error('No active bot clients available');
    }

    // Execute searches in parallel with concurrency limit
    const searchPromises = activeBots.map(bot => 
      this.searchWithBot(bot, request.value, request.type)
    );

    const results = await this.executeWithConcurrencyLimit(
      searchPromises, 
      this.config.maxConcurrentRequests
    );

    const endTime = Date.now();
    const searchDuration = endTime - startTime;

    // Calculate statistics
    const totalBotsSearched = results.length;
    const totalBotsWithData = results.filter(r => r.hasData).length;
    const totalRecords = results.reduce((sum, r) => sum + r.totalRecords, 0);

    return {
      searchId,
      timestamp: new Date(startTime),
      query: request.value,
      searchType: request.type,
      results,
      totalBotsSearched,
      totalBotsWithData,
      totalRecords,
      searchDuration
    };
  }

  /**
   * Search with a specific bot client
   */
  private async searchWithBot(
    bot: BotConfig, 
    query: string, 
    type: SearchType
  ): Promise<BotSearchResult> {
    const startTime = Date.now();

    try {
      // Check circuit breaker
      if (this.isCircuitOpen(bot.id)) {
        return {
          botId: bot.id,
          encryptedName: bot.encryptedName,
          status: 'circuit_open',
          foundFields: [],
          totalRecords: 0,
          hasData: false,
          responseTime: 0,
          errorMessage: 'Circuit breaker is open'
        };
      }

      // Execute search with retry logic
      const response = await this.executeWithRetry(
        () => bot.client.search(query, type),
        this.config.retryAttempts + 1, // +1 because we want retryAttempts to be the number of retries, not total attempts
        this.config.retryDelay
      );

      const responseTime = Date.now() - startTime;

      if (response.success) {
        // Reset circuit breaker on success
        this.resetCircuitBreaker(bot.id);

        return {
          botId: bot.id,
          encryptedName: bot.encryptedName,
          status: response.data?.hasData ? 'success' : 'no_data',
          foundFields: response.data?.records || [],
          totalRecords: response.data?.totalRecords || 0,
          hasData: response.data?.hasData || false,
          responseTime,
          rawResponse: response.data
        };
      } else {
        // Handle error response
        this.recordFailure(bot.id);

        return {
          botId: bot.id,
          encryptedName: bot.encryptedName,
          status: 'error',
          foundFields: [],
          totalRecords: 0,
          hasData: false,
          responseTime,
          errorMessage: response.error
        };
      }

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.recordFailure(bot.id);

      return {
        botId: bot.id,
        encryptedName: bot.encryptedName,
        status: 'error',
        foundFields: [],
        totalRecords: 0,
        hasData: false,
        responseTime,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Execute promises with concurrency limit
   */
  private async executeWithConcurrencyLimit<T>(
    promises: Promise<T>[], 
    limit: number
  ): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (const promise of promises) {
      const p = promise.then(result => {
        results.push(result);
      });

      executing.push(p);

      if (executing.length >= limit) {
        await Promise.race(executing);
        executing.splice(executing.findIndex(p => p === p), 1);
      }
    }

    await Promise.all(executing);
    return results;
  }

  /**
   * Execute function with retry logic
   */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    maxAttempts: number,
    delay: number
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < maxAttempts) {
          await this.sleep(delay * attempt); // Exponential backoff
        }
      }
    }

    throw lastError!;
  }

  /**
   * Check if circuit breaker is open for a bot
   */
  private isCircuitOpen(botId: string): boolean {
    const state = this.circuitBreakers.get(botId);
    if (!state || !state.isOpen) {
      return false;
    }

    // Check if circuit breaker timeout has passed
    if (state.nextAttemptTime && new Date() > state.nextAttemptTime) {
      // Reset circuit breaker to half-open state
      state.isOpen = false;
      state.nextAttemptTime = null;
      return false;
    }

    return true;
  }

  /**
   * Record a failure for circuit breaker
   */
  private recordFailure(botId: string): void {
    const state = this.circuitBreakers.get(botId);
    if (!state) return;

    state.failureCount++;
    state.lastFailureTime = new Date();

    // Open circuit breaker if threshold is reached
    if (state.failureCount >= this.config.circuitBreakerThreshold) {
      state.isOpen = true;
      state.nextAttemptTime = new Date(
        Date.now() + this.config.circuitBreakerTimeout
      );
    }
  }

  /**
   * Reset circuit breaker on successful request
   */
  private resetCircuitBreaker(botId: string): void {
    const state = this.circuitBreakers.get(botId);
    if (!state) return;

    state.failureCount = 0;
    state.isOpen = false;
    state.lastFailureTime = null;
    state.nextAttemptTime = null;
  }

  /**
   * Get status of all bot clients
   */
  async getBotStatuses(): Promise<Array<{
    botId: string;
    name: string;
    encryptedName: string;
    isActive: boolean;
    isAvailable: boolean;
    circuitBreakerOpen: boolean;
    priority: number;
  }>> {
    const statuses = [];

    for (const [botId, config] of this.botClients) {
      let isAvailable = false;
      
      if (config.isActive && config.client) {
        try {
          isAvailable = await config.client.isAvailable();
        } catch (error) {
          isAvailable = false;
        }
      }

      statuses.push({
        botId,
        name: config.name,
        encryptedName: config.encryptedName,
        isActive: config.isActive,
        isAvailable,
        circuitBreakerOpen: this.isCircuitOpen(botId),
        priority: config.priority
      });
    }

    return statuses.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Enable or disable a specific bot
   */
  setBotActive(botId: string, isActive: boolean): boolean {
    const bot = this.botClients.get(botId);
    if (!bot) {
      return false;
    }

    bot.isActive = isActive;
    
    // Reset circuit breaker when enabling
    if (isActive) {
      this.resetCircuitBreaker(botId);
    }

    return true;
  }

  /**
   * Get configuration
   */
  getConfig(): ApiManagerConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ApiManagerConfig>): void {
    Object.assign(this.config, newConfig);
  }

  /**
   * Generate unique search ID
   */
  private generateSearchId(): string {
    return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sleep utility function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get circuit breaker states (for monitoring)
   */
  getCircuitBreakerStates(): Record<string, CircuitBreakerState> {
    const states: Record<string, CircuitBreakerState> = {};
    
    for (const [botId, state] of this.circuitBreakers) {
      states[botId] = { ...state };
    }

    return states;
  }

  /**
   * Manually reset circuit breaker for a specific bot
   */
  resetBotCircuitBreaker(botId: string): boolean {
    if (!this.circuitBreakers.has(botId)) {
      return false;
    }

    this.resetCircuitBreaker(botId);
    return true;
  }

  /**
   * Search with specific bots only
   */
  async searchWithBots(
    request: SearchRequest, 
    botIds: string[]
  ): Promise<SearchResults> {
    const searchId = this.generateSearchId();
    const startTime = Date.now();

    // Get specified bots that are active
    const selectedBots = botIds
      .map(id => this.botClients.get(id))
      .filter((bot): bot is BotConfig => 
        bot !== undefined && bot.isActive && bot.client !== null
      )
      .sort((a, b) => a.priority - b.priority);

    if (selectedBots.length === 0) {
      throw new Error('No active bot clients available from the specified list');
    }

    // Execute searches in parallel
    const searchPromises = selectedBots.map(bot => 
      this.searchWithBot(bot, request.value, request.type)
    );

    const results = await Promise.all(searchPromises);

    const endTime = Date.now();
    const searchDuration = endTime - startTime;

    // Calculate statistics
    const totalBotsSearched = results.length;
    const totalBotsWithData = results.filter(r => r.hasData).length;
    const totalRecords = results.reduce((sum, r) => sum + r.totalRecords, 0);

    return {
      searchId,
      timestamp: new Date(startTime),
      query: request.value,
      searchType: request.type,
      results,
      totalBotsSearched,
      totalBotsWithData,
      totalRecords,
      searchDuration
    };
  }
}