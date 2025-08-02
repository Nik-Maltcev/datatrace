/**
 * LeakOsint API Client
 * Handles communication with the LeakOsint bot API
 */

import axios, { AxiosResponse, AxiosError } from 'axios';
import { BotApiClient } from '../types/api';
import { ApiResponse, ErrorType } from '../types/api';
import { SearchType } from '../types/search';

export interface LeakOsintRequestBody {
  token: string;
  request: string | string[];
  limit?: number;
  lang?: string;
  type?: 'json' | 'short' | 'html';
  bot_name?: string;
}

export interface LeakOsintApiResponse {
  List: Record<string, {
    InfoLeak: string;
    Data: any[];
  }>;
  [key: string]: any;
}

export interface LeakOsintErrorResponse {
  'Error code': string;
  [key: string]: any;
}

export interface LeakOsintConfig {
  baseUrl: string;
  token: string;
  timeout: number;
  defaultLimit: number;
  defaultLang: string;
}

export class LeakOsintClient implements BotApiClient {
  private readonly config: LeakOsintConfig;
  private readonly botId = 'leak_osint';

  constructor(config?: Partial<LeakOsintConfig>) {
    this.config = {
      baseUrl: config?.baseUrl || process.env.LEAK_OSINT_BASE_URL || 'https://leakosintapi.com',
      token: config?.token || process.env.LEAK_OSINT_TOKEN || '',
      timeout: config?.timeout || 30000,
      defaultLimit: config?.defaultLimit || 100,
      defaultLang: config?.defaultLang || 'ru'
    };

    if (!this.config.token) {
      throw new Error('LeakOsint API token is required');
    }
  }

  /**
   * Search for data using LeakOsint API
   */
  async search(query: string, type: SearchType): Promise<ApiResponse> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!query || query.trim().length === 0) {
        return {
          success: false,
          error: 'Query parameter is required',
          errorCode: ErrorType.VALIDATION_ERROR,
          timestamp: new Date(),
          botId: this.botId
        };
      }

      // Prepare request data
      const requestData: LeakOsintRequestBody = {
        token: this.config.token,
        request: query.trim(),
        limit: this.config.defaultLimit,
        lang: this.config.defaultLang,
        type: 'json'
      };

      // Make API request
      const response: AxiosResponse<LeakOsintApiResponse | LeakOsintErrorResponse> = await axios.post(
        this.config.baseUrl,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Privacy-Data-Removal-Service/1.0'
          },
          timeout: this.config.timeout,
          validateStatus: (status) => status < 500 // Accept 4xx as valid responses
        }
      );

      const responseTime = Date.now() - startTime;

      // Handle different response statuses
      if (response.status === 401) {
        return {
          success: false,
          error: 'Invalid API token',
          errorCode: ErrorType.INVALID_TOKEN,
          timestamp: new Date(),
          botId: this.botId
        };
      }

      if (response.status === 429) {
        return {
          success: false,
          error: 'Rate limit exceeded (max 1 request per second)',
          errorCode: ErrorType.RATE_LIMIT,
          timestamp: new Date(),
          botId: this.botId
        };
      }

      if (response.status >= 400) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          errorCode: ErrorType.API_UNAVAILABLE,
          timestamp: new Date(),
          botId: this.botId
        };
      }

      // Check if API returned an error
      const responseData = response.data;
      if ('Error code' in responseData) {
        const errorResponse = responseData as LeakOsintErrorResponse;
        return {
          success: false,
          error: `API Error: ${errorResponse['Error code']}`,
          errorCode: ErrorType.API_UNAVAILABLE,
          timestamp: new Date(),
          botId: this.botId
        };
      }

      // Parse successful response
      const apiResponse = responseData as LeakOsintApiResponse;

      // Transform API response to our format
      const transformedData = this.transformResponseData(apiResponse, type);

      return {
        success: true,
        data: transformedData,
        timestamp: new Date(),
        botId: this.botId
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Check if it's an axios error
      if (error && typeof error === 'object' && 'code' in error) {
        const axiosError = error as any;
        
        if (axiosError.code === 'ECONNABORTED') {
          return {
            success: false,
            error: 'Request timeout',
            errorCode: ErrorType.TIMEOUT_ERROR,
            timestamp: new Date(),
            botId: this.botId
          };
        }

        if (axiosError.code === 'ENOTFOUND' || axiosError.code === 'ECONNREFUSED') {
          return {
            success: false,
            error: 'API service unavailable',
            errorCode: ErrorType.API_UNAVAILABLE,
            timestamp: new Date(),
            botId: this.botId
          };
        }

        return {
          success: false,
          error: `Network error: ${axiosError.message || 'Network error'}`,
          errorCode: ErrorType.NETWORK_ERROR,
          timestamp: new Date(),
          botId: this.botId
        };
      }

      return {
        success: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: ErrorType.UNKNOWN_ERROR,
        timestamp: new Date(),
        botId: this.botId
      };
    }
  }

  /**
   * Check if the API is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Make a simple test request with minimal data
      const response = await axios.post(
        this.config.baseUrl,
        {
          token: this.config.token,
          request: 'test',
          limit: 10,
          type: 'json'
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 5000,
          validateStatus: (status) => status < 500
        }
      );

      // Consider API available if we get any response (even if no data found)
      return response.status < 500;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get bot identifier
   */
  getBotId(): string {
    return this.botId;
  }

  /**
   * Transform LeakOsint API response to standardized format
   */
  private transformResponseData(apiResponse: LeakOsintApiResponse, searchType: SearchType) {
    // Flatten all data from different databases
    const allRecords: any[] = [];
    const databases: string[] = [];
    let totalRecords = 0;

    Object.entries(apiResponse.List || {}).forEach(([dbName, dbData]) => {
      databases.push(dbName);
      
      if (dbName !== 'No results found' && dbData.Data && Array.isArray(dbData.Data)) {
        dbData.Data.forEach(record => {
          allRecords.push({
            ...record,
            source_database: dbName,
            info_leak: dbData.InfoLeak
          });
          totalRecords++;
        });
      }
    });

    return {
      botId: this.botId,
      searchType,
      totalRecords,
      records: allRecords,
      databases,
      hasData: totalRecords > 0,
      rawResponse: apiResponse
    };
  }

  /**
   * Get API configuration (for debugging/monitoring)
   */
  getConfig(): Omit<LeakOsintConfig, 'token'> & { token: string } {
    return {
      baseUrl: this.config.baseUrl,
      token: '***masked***',
      timeout: this.config.timeout,
      defaultLimit: this.config.defaultLimit,
      defaultLang: this.config.defaultLang
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<LeakOsintConfig>): void {
    Object.assign(this.config, newConfig);
  }

  /**
   * Search with multiple queries (advanced feature)
   */
  async searchMultiple(queries: string[], type: SearchType): Promise<ApiResponse> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!queries || queries.length === 0) {
        return {
          success: false,
          error: 'Queries array is required',
          errorCode: ErrorType.VALIDATION_ERROR,
          timestamp: new Date(),
          botId: this.botId
        };
      }

      // Filter out empty queries
      const validQueries = queries.filter(q => q && q.trim().length > 0);
      if (validQueries.length === 0) {
        return {
          success: false,
          error: 'At least one valid query is required',
          errorCode: ErrorType.VALIDATION_ERROR,
          timestamp: new Date(),
          botId: this.botId
        };
      }

      // Prepare request data
      const requestData: LeakOsintRequestBody = {
        token: this.config.token,
        request: validQueries.map(q => q.trim()),
        limit: this.config.defaultLimit,
        lang: this.config.defaultLang,
        type: 'json'
      };

      // Make API request
      const response: AxiosResponse<LeakOsintApiResponse | LeakOsintErrorResponse> = await axios.post(
        this.config.baseUrl,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Privacy-Data-Removal-Service/1.0'
          },
          timeout: this.config.timeout,
          validateStatus: (status) => status < 500
        }
      );

      // Handle error responses
      if (response.status >= 400) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          errorCode: ErrorType.API_UNAVAILABLE,
          timestamp: new Date(),
          botId: this.botId
        };
      }

      // Check if API returned an error
      const responseData = response.data;
      if ('Error code' in responseData) {
        const errorResponse = responseData as LeakOsintErrorResponse;
        return {
          success: false,
          error: `API Error: ${errorResponse['Error code']}`,
          errorCode: ErrorType.API_UNAVAILABLE,
          timestamp: new Date(),
          botId: this.botId
        };
      }

      // Parse successful response
      const apiResponse = responseData as LeakOsintApiResponse;

      // Transform API response to our format
      const transformedData = this.transformResponseData(apiResponse, type);

      return {
        success: true,
        data: transformedData,
        timestamp: new Date(),
        botId: this.botId
      };

    } catch (error) {
      return {
        success: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: ErrorType.UNKNOWN_ERROR,
        timestamp: new Date(),
        botId: this.botId
      };
    }
  }

  /**
   * Search with custom limit and language
   */
  async searchWithOptions(
    query: string, 
    type: SearchType, 
    options: { limit?: number; lang?: string }
  ): Promise<ApiResponse> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!query || query.trim().length === 0) {
        return {
          success: false,
          error: 'Query parameter is required',
          errorCode: ErrorType.VALIDATION_ERROR,
          timestamp: new Date(),
          botId: this.botId
        };
      }

      // Validate limit
      const limit = options.limit || this.config.defaultLimit;
      if (limit < 100 || limit > 10000) {
        return {
          success: false,
          error: 'Limit must be between 100 and 10000',
          errorCode: ErrorType.VALIDATION_ERROR,
          timestamp: new Date(),
          botId: this.botId
        };
      }

      // Prepare request data
      const requestData: LeakOsintRequestBody = {
        token: this.config.token,
        request: query.trim(),
        limit,
        lang: options.lang || this.config.defaultLang,
        type: 'json'
      };

      // Make API request
      const response: AxiosResponse<LeakOsintApiResponse | LeakOsintErrorResponse> = await axios.post(
        this.config.baseUrl,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Privacy-Data-Removal-Service/1.0'
          },
          timeout: this.config.timeout,
          validateStatus: (status) => status < 500
        }
      );

      // Handle error responses
      if (response.status >= 400) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          errorCode: ErrorType.API_UNAVAILABLE,
          timestamp: new Date(),
          botId: this.botId
        };
      }

      // Check if API returned an error
      const responseData = response.data;
      if ('Error code' in responseData) {
        const errorResponse = responseData as LeakOsintErrorResponse;
        return {
          success: false,
          error: `API Error: ${errorResponse['Error code']}`,
          errorCode: ErrorType.API_UNAVAILABLE,
          timestamp: new Date(),
          botId: this.botId
        };
      }

      // Parse successful response
      const apiResponse = responseData as LeakOsintApiResponse;

      // Transform API response to our format
      const transformedData = this.transformResponseData(apiResponse, type);

      return {
        success: true,
        data: transformedData,
        timestamp: new Date(),
        botId: this.botId
      };

    } catch (error) {
      return {
        success: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: ErrorType.UNKNOWN_ERROR,
        timestamp: new Date(),
        botId: this.botId
      };
    }
  }
}