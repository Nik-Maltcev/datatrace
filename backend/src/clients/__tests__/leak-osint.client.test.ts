/**
 * Unit tests for LeakOsintClient
 */

import axios from 'axios';
import { LeakOsintClient } from '../leak-osint.client';
import { ErrorType } from '../../types/api';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('LeakOsintClient', () => {
  let client: LeakOsintClient;
  const mockToken = 'test-token-123:abcdef';
  const mockBaseUrl = 'https://test-leakosint-api.example.com';

  beforeEach(() => {
    client = new LeakOsintClient({
      token: mockToken,
      baseUrl: mockBaseUrl,
      timeout: 5000,
      defaultLimit: 100,
      defaultLang: 'ru'
    });
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create client with provided config', () => {
      const config = client.getConfig();
      expect(config.baseUrl).toBe(mockBaseUrl);
      expect(config.timeout).toBe(5000);
      expect(config.defaultLimit).toBe(100);
      expect(config.defaultLang).toBe('ru');
      expect(config.token).toBe('***masked***');
    });

    it('should throw error if token is not provided', () => {
      expect(() => {
        new LeakOsintClient({ token: '' });
      }).toThrow('LeakOsint API token is required');
    });

    it('should use environment variables as defaults', () => {
      process.env.LEAK_OSINT_TOKEN = 'env-token:xyz';
      process.env.LEAK_OSINT_BASE_URL = 'https://env-leakosint-api.com';
      
      const envClient = new LeakOsintClient();
      const config = envClient.getConfig();
      
      expect(config.baseUrl).toBe('https://env-leakosint-api.com');
    });
  });

  describe('search', () => {
    it('should make successful API request', async () => {
      const mockResponse = {
        status: 200,
        data: {
          List: {
            'Database 1': {
              InfoLeak: 'Data breach from 2020',
              Data: [
                { email: 'john@example.com', password: 'hash123' },
                { email: 'jane@example.com', password: 'hash456' }
              ]
            },
            'Database 2': {
              InfoLeak: 'Social media leak',
              Data: [
                { username: 'john_doe', phone: '+79123456789' }
              ]
            }
          }
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await client.search('john@example.com', 'email');

      expect(result.success).toBe(true);
      expect(result.data?.totalRecords).toBe(3);
      expect(result.data?.hasData).toBe(true);
      expect(result.data?.databases).toEqual(['Database 1', 'Database 2']);
      expect(result.data?.records).toHaveLength(3);
      expect(result.botId).toBe('leak_osint');
      
      // Check that source_database and info_leak are added to each record
      expect(result.data?.records[0]).toHaveProperty('source_database', 'Database 1');
      expect(result.data?.records[0]).toHaveProperty('info_leak', 'Data breach from 2020');
      
      expect(mockedAxios.post).toHaveBeenCalledWith(
        mockBaseUrl,
        {
          token: mockToken,
          request: 'john@example.com',
          limit: 100,
          lang: 'ru',
          type: 'json'
        },
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Privacy-Data-Removal-Service/1.0'
          },
          timeout: 5000
        })
      );
    });

    it('should handle empty query', async () => {
      const result = await client.search('', 'email');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorType.VALIDATION_ERROR);
      expect(result.error).toBe('Query parameter is required');
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should handle API error response', async () => {
      const mockResponse = {
        status: 200,
        data: {
          'Error code': 'Invalid token or insufficient balance'
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await client.search('test', 'email');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorType.API_UNAVAILABLE);
      expect(result.error).toBe('API Error: Invalid token or insufficient balance');
    });

    it('should handle 401 unauthorized', async () => {
      const mockResponse = {
        status: 401,
        statusText: 'Unauthorized',
        data: {}
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await client.search('test', 'email');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorType.INVALID_TOKEN);
      expect(result.error).toBe('Invalid API token');
    });

    it('should handle 429 rate limit', async () => {
      const mockResponse = {
        status: 429,
        statusText: 'Too Many Requests',
        data: {}
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await client.search('test', 'email');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorType.RATE_LIMIT);
      expect(result.error).toBe('Rate limit exceeded (max 1 request per second)');
    });

    it('should handle timeout error', async () => {
      const timeoutError = new Error('timeout');
      (timeoutError as any).code = 'ECONNABORTED';
      mockedAxios.post.mockRejectedValueOnce(timeoutError);

      const result = await client.search('test', 'email');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorType.TIMEOUT_ERROR);
      expect(result.error).toBe('Request timeout');
    });

    it('should handle network error', async () => {
      const networkError = new Error('Network Error');
      (networkError as any).code = 'ENOTFOUND';
      mockedAxios.post.mockRejectedValueOnce(networkError);

      const result = await client.search('test', 'email');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorType.API_UNAVAILABLE);
      expect(result.error).toBe('API service unavailable');
    });

    it('should handle unknown error', async () => {
      const unknownError = new Error('Something went wrong');
      mockedAxios.post.mockRejectedValueOnce(unknownError);

      const result = await client.search('test', 'email');

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
          List: {
            'Combined Results': {
              InfoLeak: 'Multiple sources',
              Data: [
                { email: 'john@example.com', phone: '+79123456789' }
              ]
            }
          }
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const queries = ['john@example.com', '+79123456789'];
      const result = await client.searchMultiple(queries, 'email');

      expect(result.success).toBe(true);
      expect(result.data?.totalRecords).toBe(1);
      
      expect(mockedAxios.post).toHaveBeenCalledWith(
        mockBaseUrl,
        {
          token: mockToken,
          request: queries,
          limit: 100,
          lang: 'ru',
          type: 'json'
        },
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Privacy-Data-Removal-Service/1.0'
          }
        })
      );
    });

    it('should handle empty queries array', async () => {
      const result = await client.searchMultiple([], 'email');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorType.VALIDATION_ERROR);
      expect(result.error).toBe('Queries array is required');
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should handle array with only empty queries', async () => {
      const result = await client.searchMultiple(['', '   ', ''], 'email');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorType.VALIDATION_ERROR);
      expect(result.error).toBe('At least one valid query is required');
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should filter out empty queries', async () => {
      const mockResponse = {
        status: 200,
        data: {
          List: {
            'Results': {
              InfoLeak: 'Test data',
              Data: []
            }
          }
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const queries = ['john@example.com', '', '   ', 'valid@query.com'];
      const result = await client.searchMultiple(queries, 'email');

      expect(result.success).toBe(true);
      
      expect(mockedAxios.post).toHaveBeenCalledWith(
        mockBaseUrl,
        expect.objectContaining({
          request: ['john@example.com', 'valid@query.com']
        }),
        expect.any(Object)
      );
    });
  });

  describe('searchWithOptions', () => {
    it('should make successful search with custom options', async () => {
      const mockResponse = {
        status: 200,
        data: {
          List: {
            'Custom Search': {
              InfoLeak: 'Custom results',
              Data: [
                { field: 'value' }
              ]
            }
          }
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await client.searchWithOptions('test', 'email', {
        limit: 500,
        lang: 'en'
      });

      expect(result.success).toBe(true);
      
      expect(mockedAxios.post).toHaveBeenCalledWith(
        mockBaseUrl,
        {
          token: mockToken,
          request: 'test',
          limit: 500,
          lang: 'en',
          type: 'json'
        },
        expect.any(Object)
      );
    });

    it('should validate limit range', async () => {
      const result = await client.searchWithOptions('test', 'email', {
        limit: 50 // Below minimum
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorType.VALIDATION_ERROR);
      expect(result.error).toBe('Limit must be between 100 and 10000');
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should validate maximum limit', async () => {
      const result = await client.searchWithOptions('test', 'email', {
        limit: 15000 // Above maximum
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorType.VALIDATION_ERROR);
      expect(result.error).toBe('Limit must be between 100 and 10000');
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });

  describe('isAvailable', () => {
    it('should return true when API is available', async () => {
      const mockResponse = {
        status: 200,
        data: { List: {} }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await client.isAvailable();

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        mockBaseUrl,
        {
          token: mockToken,
          request: 'test',
          limit: 10,
          type: 'json'
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
      expect(client.getBotId()).toBe('leak_osint');
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      client.updateConfig({ timeout: 10000, defaultLimit: 200 });
      const config = client.getConfig();
      expect(config.timeout).toBe(10000);
      expect(config.defaultLimit).toBe(200);
    });
  });

  describe('transformResponseData', () => {
    it('should transform API response correctly', async () => {
      const mockResponse = {
        status: 200,
        data: {
          List: {
            'Database A': {
              InfoLeak: 'Leak info A',
              Data: [
                { email: 'test1@example.com' },
                { email: 'test2@example.com' }
              ]
            },
            'Database B': {
              InfoLeak: 'Leak info B',
              Data: [
                { phone: '+79123456789' }
              ]
            }
          }
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await client.search('test', 'email');

      expect(result.success).toBe(true);
      expect(result.data?.botId).toBe('leak_osint');
      expect(result.data?.searchType).toBe('email');
      expect(result.data?.totalRecords).toBe(3);
      expect(result.data?.records).toHaveLength(3);
      expect(result.data?.hasData).toBe(true);
      expect(result.data?.databases).toEqual(['Database A', 'Database B']);
      
      // Check that source_database and info_leak are added to each record
      expect(result.data?.records[0]).toHaveProperty('source_database', 'Database A');
      expect(result.data?.records[0]).toHaveProperty('info_leak', 'Leak info A');
      expect(result.data?.records[2]).toHaveProperty('source_database', 'Database B');
      expect(result.data?.records[2]).toHaveProperty('info_leak', 'Leak info B');
    });

    it('should handle "No results found" database', async () => {
      const mockResponse = {
        status: 200,
        data: {
          List: {
            'No results found': {
              InfoLeak: 'No data available',
              Data: []
            }
          }
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await client.search('test', 'email');

      expect(result.success).toBe(true);
      expect(result.data?.totalRecords).toBe(0);
      expect(result.data?.hasData).toBe(false);
      expect(result.data?.records).toEqual([]);
      expect(result.data?.databases).toEqual(['No results found']);
    });

    it('should handle empty response data', async () => {
      const mockResponse = {
        status: 200,
        data: {
          List: {}
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await client.search('test', 'email');

      expect(result.success).toBe(true);
      expect(result.data?.totalRecords).toBe(0);
      expect(result.data?.hasData).toBe(false);
      expect(result.data?.records).toEqual([]);
      expect(result.data?.databases).toEqual([]);
    });
  });
});