/**
 * ITP (InfoTrackPeople) API Client
 * Handles communication with the ITP bot API
 */

import axios, { AxiosResponse, AxiosError } from 'axios';
import { BotApiClient } from '../types/api';
import { ApiResponse, ErrorType } from '../types/api';
import { SearchType } from '../types/search';

export interface ITPSearchOption {
  type: ITPSearchType;
  query: string;
}

export interface ITPRequestBody {
  searchOptions: ITPSearchOption[];
}

export interface ITPApiResponse {
  data: Record<string, {
    data: any[];
  }>;
  records: number;
  searchId: number;
}

export interface ITPErrorResponse {
  error: {
    key: string;
    param?: string;
    message: string;
  };
}

export type ITPSearchType = 
  | 'full_text' 
  | 'phone' 
  | 'name' 
  | 'address' 
  | 'email' 
  | 'plate_number' 
  | 'vin' 
  | 'passport' 
  | 'snils' 
  | 'inn' 
  | 'username' 
  | 'password' 
  | 'telegram_id' 
  | 'tg_msg';

export interface ITPConfig {
  baseUrl: string;
  apiKey: string;
  timeout: number;
}

export class ITPClient implements BotApiClient {
  private readonly config: ITPConfig;
  private readonly botId = 'itp';

  // Mapping from our SearchType to ITP search types
  private readonly searchTypeMapping: Record<SearchType, ITPSearchType> = {
    phone: 'phone',
    email: 'email',
    inn: 'inn',
    snils: 'snils',
    passport: 'passport'
  };

  constructor(config?: Partial<ITPConfig>) {
    this.config = {
      baseUrl: config?.baseUrl || process.env.ITP_BASE_URL || 'https://datatech.work',
      apiKey: config?.apiKey || process.env.ITP_TOKEN || '',
      timeout: config?.timeout || 30000
    };

    if (!this.config.apiKey) {
      throw new Error('ITP API key is required');
    }
  }

  /**
   * Search for data using ITP API
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

      // Map our search type to ITP search type
      const itpSearchType = this.searchTypeMapping[type];
      if (!itpSearchType) {
        return {
          success: false,
          error: `Unsupported search type: ${type}`,
          errorCode: ErrorType.VALIDATION_ERROR,
          timestamp: new Date(),
          botId: this.botId
        };
      }

      // Prepare request data
      const requestData: ITPRequestBody = {
        searchOptions: [
          {
            type: itpSearchType,
            query: query.trim()
          }
        ]
      };

      // Make API request
      const response: AxiosResponse<ITPApiResponse | ITPErrorResponse> = await axios.post(
        `${this.config.baseUrl}/public-api/data/search`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.config.apiKey,
            'User-Agent': 'Privacy-Data-Removal-Service/1.0'
          },
          timeout: this.config.timeout,
          validateStatus: (status) => status < 500 // Accept 4xx as valid responses
        }
      );

      const responseTime = Date.now() - startTime;

      // Handle error responses
      if (response.status >= 400) {
        return this.handleErrorResponse(response as AxiosResponse<ITPErrorResponse>);
      }

      // Parse successful response
      const apiResponse = response.data as ITPApiResponse;

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
        `${this.config.baseUrl}/public-api/data/search`,
        {
          searchOptions: [
            {
              type: 'phone',
              query: 'test'
            }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.config.apiKey
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
   * Handle error responses from ITP API
   */
  private handleErrorResponse(response: AxiosResponse<ITPErrorResponse>): ApiResponse {
    const errorData = response.data as ITPErrorResponse;

    switch (response.status) {
      case 400:
        return {
          success: false,
          error: `Validation error: ${errorData.error?.message || 'Invalid request'}`,
          errorCode: ErrorType.VALIDATION_ERROR,
          timestamp: new Date(),
          botId: this.botId
        };

      case 403:
        return {
          success: false,
          error: `Access denied: ${errorData.error?.message || 'API key is deactivated'}`,
          errorCode: ErrorType.INVALID_TOKEN,
          timestamp: new Date(),
          botId: this.botId
        };

      case 429:
        return {
          success: false,
          error: `Rate limit exceeded: ${errorData.error?.message || 'Too many requests'}`,
          errorCode: ErrorType.RATE_LIMIT,
          timestamp: new Date(),
          botId: this.botId
        };

      default:
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorData.error?.message || response.statusText}`,
          errorCode: ErrorType.API_UNAVAILABLE,
          timestamp: new Date(),
          botId: this.botId
        };
    }
  }

  /**
   * Transform ITP API response to standardized format
   */
  private transformResponseData(apiResponse: ITPApiResponse, searchType: SearchType) {
    // Flatten all data from different databases
    const allRecords: any[] = [];
    const databases: string[] = [];

    Object.entries(apiResponse.data || {}).forEach(([dbName, dbData]) => {
      databases.push(dbName);
      if (dbData.data && Array.isArray(dbData.data)) {
        allRecords.push(...dbData.data.map(record => ({
          ...record,
          source_database: dbName
        })));
      }
    });

    return {
      botId: this.botId,
      searchType,
      totalRecords: apiResponse.records || 0,
      records: allRecords,
      databases,
      hasData: (apiResponse.records || 0) > 0,
      searchId: apiResponse.searchId,
      rawResponse: apiResponse
    };
  }

  /**
   * Get API configuration (for debugging/monitoring)
   */
  getConfig(): Omit<ITPConfig, 'apiKey'> & { apiKey: string } {
    return {
      baseUrl: this.config.baseUrl,
      apiKey: '***masked***',
      timeout: this.config.timeout
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ITPConfig>): void {
    Object.assign(this.config, newConfig);
  }

  /**
   * Search with multiple options (advanced feature)
   */
  async searchMultiple(searchOptions: Array<{ query: string; type: SearchType }>): Promise<ApiResponse> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!searchOptions || searchOptions.length === 0) {
        return {
          success: false,
          error: 'Search options are required',
          errorCode: ErrorType.VALIDATION_ERROR,
          timestamp: new Date(),
          botId: this.botId
        };
      }

      // Map search options to ITP format
      const itpSearchOptions: ITPSearchOption[] = searchOptions.map(option => {
        const itpType = this.searchTypeMapping[option.type];
        if (!itpType) {
          throw new Error(`Unsupported search type: ${option.type}`);
        }
        return {
          type: itpType,
          query: option.query.trim()
        };
      });

      // Prepare request data
      const requestData: ITPRequestBody = {
        searchOptions: itpSearchOptions
      };

      // Make API request
      const response: AxiosResponse<ITPApiResponse | ITPErrorResponse> = await axios.post(
        `${this.config.baseUrl}/public-api/data/search`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.config.apiKey,
            'User-Agent': 'Privacy-Data-Removal-Service/1.0'
          },
          timeout: this.config.timeout,
          validateStatus: (status) => status < 500
        }
      );

      // Handle error responses
      if (response.status >= 400) {
        return this.handleErrorResponse(response as AxiosResponse<ITPErrorResponse>);
      }

      // Parse successful response
      const apiResponse = response.data as ITPApiResponse;

      // Transform API response to our format (use first search type for compatibility)
      const transformedData = this.transformResponseData(apiResponse, searchOptions[0].type);

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