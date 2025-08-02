/**
 * Vektor API Client
 * Handles communication with the Vektor bot API
 */

import axios, { AxiosResponse, AxiosError } from 'axios';
import { BotApiClient } from '../types/api';
import { ApiResponse, ErrorType } from '../types/api';
import { SearchType } from '../types/search';

export interface VektorApiResponse {
  result?: Record<string, {
    [key: string]: string;
    database: string;
  }>;
  error?: string;
}

export interface VektorProfileResponse {
  profile?: {
    name: string;
    creation_date: string;
    balance: number;
  };
  error?: string;
}

export interface VektorConfig {
  baseUrl: string;
  token: string;
  timeout: number;
}

export class VektorClient implements BotApiClient {
  private readonly config: VektorConfig;
  private readonly botId = 'vektor';

  constructor(config?: Partial<VektorConfig>) {
    this.config = {
      baseUrl: config?.baseUrl || process.env.VEKTOR_BASE_URL || 'https://infosearch54321.xyz',
      token: config?.token || process.env.VEKTOR_TOKEN || '',
      timeout: config?.timeout || 30000
    };

    if (!this.config.token) {
      throw new Error('Vektor API token is required');
    }
  }

  /**
   * Search for data using Vektor API (extended search)
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

      // URL encode the query to handle special characters
      const encodedQuery = encodeURIComponent(query.trim());

      // Make API request using extended search
      const response: AxiosResponse<VektorApiResponse> = await axios.get(
        `${this.config.baseUrl}/api/${this.config.token}/extended_search/${encodedQuery}`,
        {
          headers: {
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

      // Check if API returned an error
      const responseData = response.data;
      if (responseData.error) {
        // Handle specific error messages
        if (responseData.error.toLowerCase().includes('unauthorized') || 
            responseData.error.toLowerCase().includes('unothorized')) {
          return {
            success: false,
            error: 'Unauthorized access - invalid API token',
            errorCode: ErrorType.INVALID_TOKEN,
            timestamp: new Date(),
            botId: this.botId
          };
        }

        return {
          success: false,
          error: `API Error: ${responseData.error}`,
          errorCode: ErrorType.API_UNAVAILABLE,
          timestamp: new Date(),
          botId: this.botId
        };
      }

      // Parse successful response
      if (!responseData.result) {
        return {
          success: false,
          error: 'Invalid API response format',
          errorCode: ErrorType.PARSING_ERROR,
          timestamp: new Date(),
          botId: this.botId
        };
      }

      // Transform API response to our format
      const transformedData = this.transformResponseData(responseData.result, type);

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
      // Make a simple test request to profile endpoint
      const response = await axios.get(
        `${this.config.baseUrl}/api/${this.config.token}/profile`,
        {
          headers: {
            'User-Agent': 'Privacy-Data-Removal-Service/1.0'
          },
          timeout: 5000,
          validateStatus: (status) => status < 500
        }
      );

      // Consider API available if we get any response (even if error)
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
   * Transform Vektor API response to standardized format
   */
  private transformResponseData(apiResult: Record<string, any>, searchType: SearchType) {
    // Convert the result object to an array of records
    const allRecords: any[] = [];
    const databases: string[] = [];

    Object.entries(apiResult).forEach(([index, record]) => {
      if (record && typeof record === 'object') {
        // Extract database name
        const database = record.database || 'Unknown Database';
        if (!databases.includes(database)) {
          databases.push(database);
        }

        // Add the record with additional metadata
        allRecords.push({
          ...record,
          source_database: database,
          record_index: parseInt(index, 10)
        });
      }
    });

    return {
      botId: this.botId,
      searchType,
      totalRecords: allRecords.length,
      records: allRecords,
      databases,
      hasData: allRecords.length > 0,
      rawResponse: apiResult
    };
  }

  /**
   * Get API configuration (for debugging/monitoring)
   */
  getConfig(): Omit<VektorConfig, 'token'> & { token: string } {
    return {
      baseUrl: this.config.baseUrl,
      token: '***masked***',
      timeout: this.config.timeout
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<VektorConfig>): void {
    Object.assign(this.config, newConfig);
  }

  /**
   * Get profile information
   */
  async getProfile(): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<VektorProfileResponse> = await axios.get(
        `${this.config.baseUrl}/api/${this.config.token}/profile`,
        {
          headers: {
            'User-Agent': 'Privacy-Data-Removal-Service/1.0'
          },
          timeout: this.config.timeout,
          validateStatus: (status) => status < 500
        }
      );

      if (response.status >= 400) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          errorCode: ErrorType.API_UNAVAILABLE,
          timestamp: new Date(),
          botId: this.botId
        };
      }

      const responseData = response.data;
      if (responseData.error) {
        if (responseData.error.toLowerCase().includes('unauthorized') || 
            responseData.error.toLowerCase().includes('unothorized')) {
          return {
            success: false,
            error: 'Unauthorized access - invalid API token',
            errorCode: ErrorType.INVALID_TOKEN,
            timestamp: new Date(),
            botId: this.botId
          };
        }

        return {
          success: false,
          error: `API Error: ${responseData.error}`,
          errorCode: ErrorType.API_UNAVAILABLE,
          timestamp: new Date(),
          botId: this.botId
        };
      }

      return {
        success: true,
        data: responseData.profile,
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
   * Search using basic search endpoint (non-extended)
   */
  async basicSearch(query: string, type: SearchType): Promise<ApiResponse> {
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

      // URL encode the query to handle special characters
      const encodedQuery = encodeURIComponent(query.trim());

      // Make API request using basic search
      const response: AxiosResponse<VektorApiResponse> = await axios.get(
        `${this.config.baseUrl}/api/${this.config.token}/search/${encodedQuery}`,
        {
          headers: {
            'User-Agent': 'Privacy-Data-Removal-Service/1.0'
          },
          timeout: this.config.timeout,
          validateStatus: (status) => status < 500
        }
      );

      // Handle different response statuses
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
      if (responseData.error) {
        if (responseData.error.toLowerCase().includes('unauthorized') || 
            responseData.error.toLowerCase().includes('unothorized')) {
          return {
            success: false,
            error: 'Unauthorized access - invalid API token',
            errorCode: ErrorType.INVALID_TOKEN,
            timestamp: new Date(),
            botId: this.botId
          };
        }

        return {
          success: false,
          error: `API Error: ${responseData.error}`,
          errorCode: ErrorType.API_UNAVAILABLE,
          timestamp: new Date(),
          botId: this.botId
        };
      }

      // Parse successful response
      if (!responseData.result) {
        return {
          success: false,
          error: 'Invalid API response format',
          errorCode: ErrorType.PARSING_ERROR,
          timestamp: new Date(),
          botId: this.botId
        };
      }

      // Transform API response to our format
      const transformedData = this.transformResponseData(responseData.result, type);

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