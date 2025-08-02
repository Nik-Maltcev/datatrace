/**
 * Dyxless API Client
 * Handles communication with the Dyxless bot API
 */

import axios, { AxiosResponse, AxiosError } from 'axios';
import { BotApiClient } from '../types/api';
import { ApiResponse, ErrorType } from '../types/api';
import { SearchType } from '../types/search';

export interface DyxlessApiResponse {
  status: boolean;
  counts: number;
  data: any[];
}

export interface DyxlessConfig {
  baseUrl: string;
  token: string;
  timeout: number;
}

export class DyxlessClient implements BotApiClient {
  private readonly config: DyxlessConfig;
  private readonly botId = 'dyxless';

  constructor(config?: Partial<DyxlessConfig>) {
    this.config = {
      baseUrl: config?.baseUrl || process.env.DYXLESS_BASE_URL || 'https://api-dyxless.cfd',
      token: config?.token || process.env.DYXLESS_TOKEN || '',
      timeout: config?.timeout || 30000
    };

    if (!this.config.token) {
      throw new Error('Dyxless API token is required');
    }
  }

  /**
   * Search for data using Dyxless API
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
      const requestData = {
        query: query.trim(),
        token: this.config.token
      };

      // Make API request
      const response: AxiosResponse<DyxlessApiResponse> = await axios.post(
        `${this.config.baseUrl}/query`,
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
          error: 'Rate limit exceeded',
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

      // Parse response data
      const apiResponse = response.data;

      // Check if API returned success status
      if (!apiResponse.status) {
        return {
          success: false,
          error: 'API returned failure status',
          errorCode: ErrorType.API_UNAVAILABLE,
          timestamp: new Date(),
          botId: this.botId
        };
      }

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
        `${this.config.baseUrl}/query`,
        {
          query: 'test',
          token: this.config.token
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
   * Transform Dyxless API response to standardized format
   */
  private transformResponseData(apiResponse: DyxlessApiResponse, searchType: SearchType) {
    return {
      botId: this.botId,
      searchType,
      totalRecords: apiResponse.counts || 0,
      records: apiResponse.data || [],
      hasData: (apiResponse.counts || 0) > 0,
      rawResponse: apiResponse
    };
  }

  /**
   * Get API configuration (for debugging/monitoring)
   */
  getConfig(): Omit<DyxlessConfig, 'token'> & { token: string } {
    return {
      baseUrl: this.config.baseUrl,
      token: '***masked***',
      timeout: this.config.timeout
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<DyxlessConfig>): void {
    Object.assign(this.config, newConfig);
  }
}