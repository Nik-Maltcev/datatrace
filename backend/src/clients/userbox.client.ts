/**
 * Userbox API Client
 * Handles communication with the Userbox bot API
 */

import axios, { AxiosResponse, AxiosError } from 'axios';
import { BotApiClient } from '../types/api';
import { ApiResponse, ErrorType } from '../types/api';
import { SearchType } from '../types/search';

export interface UserboxApiResponse {
  status: 'success' | 'error';
  data?: {
    count: number;
    items: any[];
  };
  error?: {
    code: number;
    message: string;
  };
}

export interface UserboxSearchResponse extends UserboxApiResponse {
  data: {
    count: number;
    items: Array<{
      source: {
        database: string;
        collection: string;
      };
      hits: {
        hitsCount: number;
        count: number;
        items: any[];
      };
    }>;
  };
}

export interface UserboxConfig {
  baseUrl: string;
  token: string;
  timeout: number;
  defaultCount: number;
}

export class UserboxClient implements BotApiClient {
  private readonly config: UserboxConfig;
  private readonly botId = 'userbox';

  constructor(config?: Partial<UserboxConfig>) {
    this.config = {
      baseUrl: config?.baseUrl || process.env.USERBOX_BASE_URL || 'https://api.usersbox.ru/v1',
      token: config?.token || process.env.USERBOX_TOKEN || '',
      timeout: config?.timeout || 30000,
      defaultCount: config?.defaultCount || 25
    };

    if (!this.config.token) {
      throw new Error('Userbox API token is required');
    }
  }

  /**
   * Search for data using Userbox API
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

      // Make API request to search across all sources
      const response: AxiosResponse<UserboxSearchResponse> = await axios.get(
        `${this.config.baseUrl}/search`,
        {
          params: {
            q: query.trim()
          },
          headers: {
            'Authorization': this.config.token,
            'User-Agent': 'Privacy-Data-Removal-Service/1.0'
          },
          timeout: this.config.timeout,
          validateStatus: (status) => status < 500 // Accept 4xx as valid responses
        }
      );

      const responseTime = Date.now() - startTime;

      // Handle different response statuses
      if (response.status >= 400) {
        return this.handleErrorResponse(response.status, response.data);
      }

      // Check if API returned an error
      const responseData = response.data;
      if (responseData.status === 'error') {
        return this.handleApiError(responseData.error);
      }

      // Parse successful response
      if (!responseData.data) {
        return {
          success: false,
          error: 'Invalid API response format',
          errorCode: ErrorType.PARSING_ERROR,
          timestamp: new Date(),
          botId: this.botId
        };
      }

      // Transform API response to our format
      const transformedData = this.transformSearchResponseData(responseData.data, type);

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
      // Make a simple test request to getMe endpoint
      const response = await axios.get(
        `${this.config.baseUrl}/getMe`,
        {
          headers: {
            'Authorization': this.config.token
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
   * Handle HTTP error responses
   */
  private handleErrorResponse(status: number, data: any): ApiResponse {
    switch (status) {
      case 401:
        return {
          success: false,
          error: 'Invalid or missing access token',
          errorCode: ErrorType.INVALID_TOKEN,
          timestamp: new Date(),
          botId: this.botId
        };

      case 429:
        return {
          success: false,
          error: 'Rate limit exceeded',
          errorCode: ErrorType.RATE_LIMIT,
          timestamp: new Date(),
          botId: this.botId
        };

      default:
        return {
          success: false,
          error: `HTTP ${status}: ${data?.error?.message || 'Unknown error'}`,
          errorCode: ErrorType.API_UNAVAILABLE,
          timestamp: new Date(),
          botId: this.botId
        };
    }
  }

  /**
   * Handle API error responses
   */
  private handleApiError(error?: { code: number; message: string }): ApiResponse {
    if (!error) {
      return {
        success: false,
        error: 'Unknown API error',
        errorCode: ErrorType.UNKNOWN_ERROR,
        timestamp: new Date(),
        botId: this.botId
      };
    }

    switch (error.code) {
      case 1:
        return {
          success: false,
          error: 'Invalid access token',
          errorCode: ErrorType.INVALID_TOKEN,
          timestamp: new Date(),
          botId: this.botId
        };

      case 2:
        return {
          success: false,
          error: 'Missing access token',
          errorCode: ErrorType.INVALID_TOKEN,
          timestamp: new Date(),
          botId: this.botId
        };

      case 3:
        return {
          success: false,
          error: `Rate limit exceeded: ${error.message}`,
          errorCode: ErrorType.RATE_LIMIT,
          timestamp: new Date(),
          botId: this.botId
        };

      case 4:
        return {
          success: false,
          error: 'Not enough requests (insufficient balance)',
          errorCode: ErrorType.API_UNAVAILABLE,
          timestamp: new Date(),
          botId: this.botId
        };

      case 100:
        return {
          success: false,
          error: 'Missing query parameter',
          errorCode: ErrorType.VALIDATION_ERROR,
          timestamp: new Date(),
          botId: this.botId
        };

      case 101:
        return {
          success: false,
          error: 'Missing path parameter',
          errorCode: ErrorType.VALIDATION_ERROR,
          timestamp: new Date(),
          botId: this.botId
        };

      case 102:
        return {
          success: false,
          error: 'Source not found',
          errorCode: ErrorType.VALIDATION_ERROR,
          timestamp: new Date(),
          botId: this.botId
        };

      case 1000:
        return {
          success: false,
          error: 'Internal server error',
          errorCode: ErrorType.API_UNAVAILABLE,
          timestamp: new Date(),
          botId: this.botId
        };

      default:
        return {
          success: false,
          error: `API Error ${error.code}: ${error.message}`,
          errorCode: ErrorType.API_UNAVAILABLE,
          timestamp: new Date(),
          botId: this.botId
        };
    }
  }

  /**
   * Transform Userbox search API response to standardized format
   */
  private transformSearchResponseData(apiData: UserboxSearchResponse['data'], searchType: SearchType) {
    // Flatten all data from different sources
    const allRecords: any[] = [];
    const databases: string[] = [];
    let totalRecords = 0;

    apiData.items.forEach(sourceResult => {
      const sourceName = `${sourceResult.source.database}/${sourceResult.source.collection}`;
      databases.push(sourceName);
      
      if (sourceResult.hits.items && Array.isArray(sourceResult.hits.items)) {
        sourceResult.hits.items.forEach(record => {
          allRecords.push({
            ...record,
            source_database: sourceName,
            source_info: {
              database: sourceResult.source.database,
              collection: sourceResult.source.collection,
              hitsCount: sourceResult.hits.hitsCount
            }
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
      totalSources: apiData.count || 0,
      rawResponse: apiData
    };
  }

  /**
   * Get API configuration (for debugging/monitoring)
   */
  getConfig(): Omit<UserboxConfig, 'token'> & { token: string } {
    return {
      baseUrl: this.config.baseUrl,
      token: '***masked***',
      timeout: this.config.timeout,
      defaultCount: this.config.defaultCount
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<UserboxConfig>): void {
    Object.assign(this.config, newConfig);
  }

  /**
   * Get information about the current application
   */
  async getMe(): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<UserboxApiResponse> = await axios.get(
        `${this.config.baseUrl}/getMe`,
        {
          headers: {
            'Authorization': this.config.token,
            'User-Agent': 'Privacy-Data-Removal-Service/1.0'
          },
          timeout: this.config.timeout,
          validateStatus: (status) => status < 500
        }
      );

      if (response.status >= 400) {
        return this.handleErrorResponse(response.status, response.data);
      }

      const responseData = response.data;
      if (responseData.status === 'error') {
        return this.handleApiError(responseData.error);
      }

      return {
        success: true,
        data: responseData.data,
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
   * Get list of available data sources
   */
  async getSources(): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<UserboxApiResponse> = await axios.get(
        `${this.config.baseUrl}/sources`,
        {
          headers: {
            'Authorization': this.config.token,
            'User-Agent': 'Privacy-Data-Removal-Service/1.0'
          },
          timeout: this.config.timeout,
          validateStatus: (status) => status < 500
        }
      );

      if (response.status >= 400) {
        return this.handleErrorResponse(response.status, response.data);
      }

      const responseData = response.data;
      if (responseData.status === 'error') {
        return this.handleApiError(responseData.error);
      }

      return {
        success: true,
        data: responseData.data,
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
   * Search in a specific database/collection
   */
  async searchInSource(
    database: string, 
    collection: string, 
    query: string, 
    count?: number
  ): Promise<ApiResponse> {
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

      // Validate count parameter
      const searchCount = count || this.config.defaultCount;
      if (searchCount < 25 || searchCount > 500) {
        return {
          success: false,
          error: 'Count must be between 25 and 500',
          errorCode: ErrorType.VALIDATION_ERROR,
          timestamp: new Date(),
          botId: this.botId
        };
      }

      const response: AxiosResponse<UserboxApiResponse> = await axios.get(
        `${this.config.baseUrl}/${database}/${collection}/search`,
        {
          params: {
            q: query.trim(),
            count: searchCount
          },
          headers: {
            'Authorization': this.config.token,
            'User-Agent': 'Privacy-Data-Removal-Service/1.0'
          },
          timeout: this.config.timeout,
          validateStatus: (status) => status < 500
        }
      );

      if (response.status >= 400) {
        return this.handleErrorResponse(response.status, response.data);
      }

      const responseData = response.data;
      if (responseData.status === 'error') {
        return this.handleApiError(responseData.error);
      }

      // Transform response data
      const transformedData = {
        botId: this.botId,
        searchType: 'phone' as SearchType, // Default type for specific source search
        totalRecords: responseData.data?.count || 0,
        records: responseData.data?.items || [],
        databases: [`${database}/${collection}`],
        hasData: (responseData.data?.count || 0) > 0,
        source: { database, collection },
        rawResponse: responseData.data
      };

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