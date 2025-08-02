/**
 * Unit tests for ITPClient
 */

import axios from 'axios';
import { ITPClient } from '../itp.client';
import { ErrorType } from '../../types/api';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ITPClient', () => {
  let client: ITPClient;
  const mockApiKey = 'test-api-key-123';
  const mockBaseUrl = 'https://test-itp-api.example.com';

  beforeEach(() => {
    client = new ITPClient({
      apiKey: mockApiKey,
      baseUrl: mockBaseUrl,
      timeout: 5000
    });
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create client with provided config', () => {
      const config = client.getConfig();
      expect(config.baseUrl).toBe(mockBaseUrl);
      expect(config.timeout).toBe(5000);
      expect(config.apiKey).toBe('***masked***');
    });

    it('should throw error if API key is not provided', () => {
      expect(() => {
        new ITPClient({ apiKey: '' });
      }).toThrow('ITP API key is required');
    });

    it('should use environment variables as defaults', () => {
      process.env.ITP_TOKEN = 'env-api-key';
      process.env.ITP_BASE_URL = 'https://env-itp-api.com';
      
      const envClient = new ITPClient();
      const config = envClient.getConfig();
      
      expect(config.baseUrl).toBe('https://env-itp-api.com');
    });
  });

  describe('search', () => {
    it('should make successful API request', async () => {
      const mockResponse = {
        status: 200,
        data: {
          data: {
            'База клиентов': {
              data: [
                { name: 'John Doe', phone: '+79123456789' },
                { name: 'Jane Smith', phone: '+79987654321' }
              ]
            },
            'ФССП': {
              data: [
                { name: 'John Doe', address: 'Moscow' }
              ]
            }
          },
          records: 3,
          searchId: 1234
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await client.search('+79123456789', 'phone');

      expect(result.success).toBe(true);
      expect(result.data?.totalRecords).toBe(3);
      expect(result.data?.hasData).toBe(true);
      expect(result.data?.databases).toEqual(['База клиентов', 'ФССП']);
      expect(result.data?.records).toHaveLength(3);
      expect(result.data?.searchId).toBe(1234);
      expect(result.botId).toBe('itp');
      
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${mockBaseUrl}/public-api/data/search`,
        {
          searchOptions: [
            {
              type: 'phone',
              query: '+79123456789'
            }
          ]
        },
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': mockApiKey,
            'User-Agent': 'Privacy-Data-Removal-Service/1.0'
          },
          timeout: 5000
        })
      );
    });

    it('should handle empty query', async () => {
      const result = await client.search('', 'phone');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorType.VALIDATION_ERROR);
      expect(result.error).toBe('Query parameter is required');
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should handle unsupported search type', async () => {
      const result = await client.search('test', 'unsupported' as any);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorType.VALIDATION_ERROR);
      expect(result.error).toBe('Unsupported search type: unsupported');
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should handle 400 validation error', async () => {
      const mockResponse = {
        status: 400,
        data: {
          error: {
            key: 'validation.error',
            message: 'Invalid search type'
          }
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await client.search('test', 'phone');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorType.VALIDATION_ERROR);
      expect(result.error).toBe('Validation error: Invalid search type');
    });

    it('should handle 403 access denied', async () => {
      const mockResponse = {
        status: 403,
        data: {
          error: {
            key: 'general.error.forbidden',
            message: 'API key is deactivated'
          }
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await client.search('test', 'phone');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorType.INVALID_TOKEN);
      expect(result.error).toBe('Access denied: API key is deactivated');
    });

    it('should handle 429 rate limit', async () => {
      const mockResponse = {
        status: 429,
        data: {
          error: {
            key: 'general.error.limitExceeded',
            message: 'Rate limit exceeded'
          }
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await client.search('test', 'phone');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorType.RATE_LIMIT);
      expect(result.error).toBe('Rate limit exceeded: Rate limit exceeded');
    });

    it('should handle timeout error', async () => {
      const timeoutError = new Error('timeout');
      (timeoutError as any).code = 'ECONNABORTED';
      mockedAxios.post.mockRejectedValueOnce(timeoutError);

      const result = await client.search('test', 'phone');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorType.TIMEOUT_ERROR);
      expect(result.error).toBe('Request timeout');
    });

    it('should handle network error', async () => {
      const networkError = new Error('Network Error');
      (networkError as any).code = 'ENOTFOUND';
      mockedAxios.post.mockRejectedValueOnce(networkError);

      const result = await client.search('test', 'phone');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorType.API_UNAVAILABLE);
      expect(result.error).toBe('API service unavailable');
    });

    it('should handle unknown error', async () => {
      const unknownError = new Error('Something went wrong');
      mockedAxios.post.mockRejectedValueOnce(unknownError);

      const result = await client.search('test', 'phone');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorType.UNKNOWN_ERROR);
      expect(result.error).toBe('Unexpected error: Something went wrong');
    });
  });

  describe('searchMultiple', () => {
    it('should make successful multiple search request', async () => {
      const mockResponse = {
        status: 200,
        data: {
          data: {
            'База клиентов': {
              data: [
                { name: 'John Doe', phone: '+79123456789', email: 'john@example.com' }
              ]
            }
          },
          records: 1,
          searchId: 5678
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const searchOptions = [
        { query: '+79123456789', type: 'phone' as const },
        { query: 'john@example.com', type: 'email' as const }
      ];

      const result = await client.searchMultiple(searchOptions);

      expect(result.success).toBe(true);
      expect(result.data?.totalRecords).toBe(1);
      expect(result.data?.searchId).toBe(5678);
      
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${mockBaseUrl}/public-api/data/search`,
        {
          searchOptions: [
            { type: 'phone', query: '+79123456789' },
            { type: 'email', query: 'john@example.com' }
          ]
        },
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': mockApiKey,
            'User-Agent': 'Privacy-Data-Removal-Service/1.0'
          }
        })
      );
    });

    it('should handle empty search options', async () => {
      const result = await client.searchMultiple([]);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorType.VALIDATION_ERROR);
      expect(result.error).toBe('Search options are required');
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should handle unsupported search type in multiple search', async () => {
      const searchOptions = [
        { query: 'test', type: 'unsupported' as any }
      ];

      const result = await client.searchMultiple(searchOptions);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorType.UNKNOWN_ERROR);
      expect(result.error).toContain('Unsupported search type: unsupported');
    });
  });

  describe('isAvailable', () => {
    it('should return true when API is available', async () => {
      const mockResponse = {
        status: 200,
        data: { records: 0 }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await client.isAvailable();

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${mockBaseUrl}/public-api/data/search`,
        {
          searchOptions: [
            {
              type: 'phone',
              query: 'test'
            }
          ]
        },
        expect.objectContaining({
          timeout: 5000
        })
      );
    });

    it('should return false when API is unavailable', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.isAvailable();

      expect(result).toBe(false);
    });

    it('should return true for 4xx errors (API is responding)', async () => {
      const mockResponse = {
        status: 400,
        data: {}
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await client.isAvailable();

      expect(result).toBe(true);
    });

    it('should return false for 5xx errors', async () => {
      const mockResponse = {
        status: 500,
        data: {}
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await client.isAvailable();

      expect(result).toBe(false);
    });
  });

  describe('getBotId', () => {
    it('should return correct bot ID', () => {
      expect(client.getBotId()).toBe('itp');
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      client.updateConfig({ timeout: 10000 });
      const config = client.getConfig();
      expect(config.timeout).toBe(10000);
    });
  });

  describe('transformResponseData', () => {
    it('should transform API response correctly', async () => {
      const mockResponse = {
        status: 200,
        data: {
          data: {
            'База 1': {
              data: [
                { name: 'John', phone: '+1234567890' },
                { name: 'Jane', phone: '+0987654321' }
              ]
            },
            'База 2': {
              data: [
                { name: 'Bob', email: 'bob@example.com' }
              ]
            }
          },
          records: 3,
          searchId: 9999
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await client.search('test', 'phone');

      expect(result.success).toBe(true);
      expect(result.data?.botId).toBe('itp');
      expect(result.data?.searchType).toBe('phone');
      expect(result.data?.totalRecords).toBe(3);
      expect(result.data?.records).toHaveLength(3);
      expect(result.data?.hasData).toBe(true);
      expect(result.data?.databases).toEqual(['База 1', 'База 2']);
      expect(result.data?.searchId).toBe(9999);
      
      // Check that source_database is added to each record
      expect(result.data?.records[0]).toHaveProperty('source_database', 'База 1');
      expect(result.data?.records[1]).toHaveProperty('source_database', 'База 1');
      expect(result.data?.records[2]).toHaveProperty('source_database', 'База 2');
    });

    it('should handle empty response data', async () => {
      const mockResponse = {
        status: 200,
        data: {
          data: {},
          records: 0,
          searchId: 1111
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await client.search('test', 'phone');

      expect(result.success).toBe(true);
      expect(result.data?.totalRecords).toBe(0);
      expect(result.data?.hasData).toBe(false);
      expect(result.data?.records).toEqual([]);
      expect(result.data?.databases).toEqual([]);
    });
  });
});