/**
 * Unit tests for DyxlessClient
 */

import axios from 'axios';
import { DyxlessClient } from '../dyxless.client';
import { ErrorType } from '../../types/api';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('DyxlessClient', () => {
  let client: DyxlessClient;
  const mockToken = 'test-token-123';
  const mockBaseUrl = 'https://test-api.example.com';

  beforeEach(() => {
    client = new DyxlessClient({
      token: mockToken,
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
    });

    it('should throw error if token is not provided', () => {
      expect(() => {
        new DyxlessClient({ token: '' });
      }).toThrow('Dyxless API token is required');
    });

    it('should use environment variables as defaults', () => {
      process.env.DYXLESS_TOKEN = 'env-token';
      process.env.DYXLESS_BASE_URL = 'https://env-api.com';
      
      const envClient = new DyxlessClient();
      const config = envClient.getConfig();
      
      expect(config.baseUrl).toBe('https://env-api.com');
    });
  });

  describe('search', () => {
    it('should make successful API request', async () => {
      const mockResponse = {
        status: 200,
        data: {
          status: true,
          counts: 2,
          data: [
            { field1: 'value1' },
            { field2: 'value2' }
          ]
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await client.search('+79123456789', 'phone');

      expect(result.success).toBe(true);
      expect(result.data?.totalRecords).toBe(2);
      expect(result.data?.hasData).toBe(true);
      expect(result.botId).toBe('dyxless');
      
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${mockBaseUrl}/query`,
        {
          query: '+79123456789',
          token: mockToken
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
      const result = await client.search('', 'phone');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorType.VALIDATION_ERROR);
      expect(result.error).toBe('Query parameter is required');
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should handle API returning false status', async () => {
      const mockResponse = {
        status: 200,
        data: {
          status: false,
          counts: 0,
          data: []
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await client.search('test', 'phone');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorType.API_UNAVAILABLE);
      expect(result.error).toBe('API returned failure status');
    });

    it('should handle 401 unauthorized', async () => {
      const mockResponse = {
        status: 401,
        statusText: 'Unauthorized',
        data: {}
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await client.search('test', 'phone');

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

      const result = await client.search('test', 'phone');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorType.RATE_LIMIT);
      expect(result.error).toBe('Rate limit exceeded');
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

  describe('isAvailable', () => {
    it('should return true when API is available', async () => {
      const mockResponse = {
        status: 200,
        data: { status: true }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await client.isAvailable();

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${mockBaseUrl}/query`,
        {
          query: 'test',
          token: mockToken
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
      expect(client.getBotId()).toBe('dyxless');
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
          status: true,
          counts: 3,
          data: [
            { name: 'John', phone: '+1234567890' },
            { name: 'Jane', phone: '+0987654321' },
            { name: 'Bob', phone: '+1122334455' }
          ]
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await client.search('test', 'phone');

      expect(result.success).toBe(true);
      expect(result.data?.botId).toBe('dyxless');
      expect(result.data?.searchType).toBe('phone');
      expect(result.data?.totalRecords).toBe(3);
      expect(result.data?.records).toHaveLength(3);
      expect(result.data?.hasData).toBe(true);
      expect(result.data?.rawResponse).toEqual(mockResponse.data);
    });

    it('should handle empty response data', async () => {
      const mockResponse = {
        status: 200,
        data: {
          status: true,
          counts: 0,
          data: []
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await client.search('test', 'phone');

      expect(result.success).toBe(true);
      expect(result.data?.totalRecords).toBe(0);
      expect(result.data?.hasData).toBe(false);
      expect(result.data?.records).toEqual([]);
    });
  });
});