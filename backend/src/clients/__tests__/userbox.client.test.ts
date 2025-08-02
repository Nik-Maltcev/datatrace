/**
 * Unit tests for UserboxClient
 */

import axios from 'axios';
import { UserboxClient } from '../userbox.client';
import { ErrorType } from '../../types/api';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('UserboxClient', () => {
  let client: UserboxClient;
  const mockToken = 'Bearer test-jwt-token-123';
  const mockBaseUrl = 'https://test-userbox-api.example.com/v1';

  beforeEach(() => {
    client = new UserboxClient({
      token: mockToken,
      baseUrl: mockBaseUrl,
      timeout: 5000,
      defaultCount: 25
    });
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create client with provided config', () => {
      const config = client.getConfig();
      expect(config.baseUrl).toBe(mockBaseUrl);
      expect(config.timeout).toBe(5000);
      expect(config.defaultCount).toBe(25);
      expect(config.token).toBe('***masked***');
    });

    it('should throw error if token is not provided', () => {
      expect(() => {
        new UserboxClient({ token: '' });
      }).toThrow('Userbox API token is required');
    });

    it('should use environment variables as defaults', () => {
      process.env.USERBOX_TOKEN = 'env-jwt-token';
      process.env.USERBOX_BASE_URL = 'https://env-userbox-api.com/v1';
      
      const envClient = new UserboxClient();
      const config = envClient.getConfig();
      
      expect(config.baseUrl).toBe('https://env-userbox-api.com/v1');
    });
  });

  describe('search', () => {
    it('should make successful API request', async () => {
      const mockResponse = {
        status: 200,
        data: {
          status: 'success',
          data: {
            count: 2,
            items: [
              {
                source: {
                  database: 'yandex',
                  collection: 'eda'
                },
                hits: {
                  hitsCount: 5,
                  count: 2,
                  items: [
                    { user_id: 123, phone: '+79123456789', first_name: 'John' },
                    { user_id: 456, phone: '+79987654321', first_name: 'Jane' }
                  ]
                }
              },
              {
                source: {
                  database: 'delivery_club',
                  collection: 'users'
                },
                hits: {
                  hitsCount: 1,
                  count: 1,
                  items: [
                    { id: 789, phone: '+79123456789', name: 'John Doe' }
                  ]
                }
              }
            ]
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await client.search('+79123456789', 'phone');

      expect(result.success).toBe(true);
      expect(result.data?.totalRecords).toBe(3);
      expect(result.data?.hasData).toBe(true);
      expect(result.data?.databases).toEqual(['yandex/eda', 'delivery_club/users']);
      expect(result.data?.records).toHaveLength(3);
      expect(result.data?.totalSources).toBe(2);
      expect(result.botId).toBe('userbox');
      
      // Check that source_database and source_info are added to each record
      expect(result.data?.records[0]).toHaveProperty('source_database', 'yandex/eda');
      expect(result.data?.records[0]).toHaveProperty('source_info');
      expect(result.data?.records[0].source_info).toEqual({
        database: 'yandex',
        collection: 'eda',
        hitsCount: 5
      });
      
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${mockBaseUrl}/search`,
        {
          params: {
            q: '+79123456789'
          },
          headers: {
            'Authorization': mockToken,
            'User-Agent': 'Privacy-Data-Removal-Service/1.0'
          },
          timeout: 5000,
          validateStatus: expect.any(Function)
        }
      );
    });

    it('should handle empty query', async () => {
      const result = await client.search('', 'phone');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorType.VALIDATION_ERROR);
      expect(result.error).toBe('Query parameter is required');
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should handle API error response', async () => {
      const mockResponse = {
        status: 200,
        data: {
          status: 'error',
          error: {
            code: 1,
            message: 'Invalid access token'
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await client.search('test', 'phone');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorType.INVALID_TOKEN);
      expect(result.error).toBe('Invalid access token');
    });

    it('should handle 401 unauthorized', async () => {
      const mockResponse = {
        status: 401,
        data: {
          status: 'error',
          error: {
            code: 2,
            message: 'Missing access token'
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await client.search('test', 'phone');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorType.INVALID_TOKEN);
      expect(result.error).toBe('Invalid or missing access token');
    });

    it('should handle 429 rate limit', async () => {
      const mockResponse = {
        status: 429,
        data: {
          status: 'error',
          error: {
            code: 3,
            message: 'Rate limit exceeded. Retry after 60 seconds'
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await client.search('test', 'phone');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorType.RATE_LIMIT);
      expect(result.error).toBe('Rate limit exceeded');
    });

    it('should handle insufficient balance error', async () => {
      const mockResponse = {
        status: 200,
        data: {
          status: 'error',
          error: {
            code: 4,
            message: 'Not enough requests'
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await client.search('test', 'phone');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorType.API_UNAVAILABLE);
      expect(result.error).toBe('Not enough requests (insufficient balance)');
    });

    it('should handle timeout error', async () => {
      const timeoutError = new Error('timeout');
      (timeoutError as any).code = 'ECONNABORTED';
      mockedAxios.get.mockRejectedValueOnce(timeoutError);

      const result = await client.search('test', 'phone');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorType.TIMEOUT_ERROR);
      expect(result.error).toBe('Request timeout');
    });

    it('should handle network error', async () => {
      const networkError = new Error('Network Error');
      (networkError as any).code = 'ENOTFOUND';
      mockedAxios.get.mockRejectedValueOnce(networkError);

      const result = await client.search('test', 'phone');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorType.API_UNAVAILABLE);
      expect(result.error).toBe('API service unavailable');
    });

    it('should handle invalid response format', async () => {
      const mockResponse = {
        status: 200,
        data: {
          status: 'success'
          // Missing data field
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await client.search('test', 'phone');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorType.PARSING_ERROR);
      expect(result.error).toBe('Invalid API response format');
    });
  });

  describe('searchInSource', () => {
    it('should make successful search in specific source', async () => {
      const mockResponse = {
        status: 200,
        data: {
          status: 'success',
          data: {
            count: 2,
            items: [
              { user_id: 123, phone: '+79123456789', first_name: 'John' },
              { user_id: 456, phone: '+79987654321', first_name: 'Jane' }
            ]
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await client.searchInSource('yandex', 'eda', '+79123456789', 50);

      expect(result.success).toBe(true);
      expect(result.data?.totalRecords).toBe(2);
      expect(result.data?.hasData).toBe(true);
      expect(result.data?.databases).toEqual(['yandex/eda']);
      expect(result.data?.records).toHaveLength(2);
      expect(result.data?.source).toEqual({ database: 'yandex', collection: 'eda' });
      
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${mockBaseUrl}/yandex/eda/search`,
        {
          params: {
            q: '+79123456789',
            count: 50
          },
          headers: {
            'Authorization': mockToken,
            'User-Agent': 'Privacy-Data-Removal-Service/1.0'
          },
          timeout: 5000,
          validateStatus: expect.any(Function)
        }
      );
    });

    it('should validate count parameter range', async () => {
      const result = await client.searchInSource('yandex', 'eda', 'test', 10); // Below minimum

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorType.VALIDATION_ERROR);
      expect(result.error).toBe('Count must be between 25 and 500');
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should validate maximum count parameter', async () => {
      const result = await client.searchInSource('yandex', 'eda', 'test', 600); // Above maximum

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorType.VALIDATION_ERROR);
      expect(result.error).toBe('Count must be between 25 and 500');
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should use default count when not provided', async () => {
      const mockResponse = {
        status: 200,
        data: {
          status: 'success',
          data: {
            count: 0,
            items: []
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await client.searchInSource('yandex', 'eda', 'test');

      expect(result.success).toBe(true);
      
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${mockBaseUrl}/yandex/eda/search`,
        expect.objectContaining({
          params: {
            q: 'test',
            count: 25 // Default count
          }
        })
      );
    });
  });

  describe('getMe', () => {
    it('should get application information successfully', async () => {
      const mockResponse = {
        status: 200,
        data: {
          status: 'success',
          data: {
            _id: 'app123',
            title: 'Test App',
            balance: 150.5,
            is_active: true
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await client.getMe();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        _id: 'app123',
        title: 'Test App',
        balance: 150.5,
        is_active: true
      });
      
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${mockBaseUrl}/getMe`,
        {
          headers: {
            'Authorization': mockToken,
            'User-Agent': 'Privacy-Data-Removal-Service/1.0'
          },
          timeout: 5000,
          validateStatus: expect.any(Function)
        }
      );
    });
  });

  describe('getSources', () => {
    it('should get sources list successfully', async () => {
      const mockResponse = {
        status: 200,
        data: {
          status: 'success',
          data: {
            count: 2,
            items: [
              {
                database: 'yandex',
                collection: 'eda',
                size: 1000000,
                count: 500000,
                title: 'Yandex Eda Database'
              },
              {
                database: 'delivery_club',
                collection: 'users',
                size: 2000000,
                count: 1000000,
                title: 'Delivery Club Users'
              }
            ]
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await client.getSources();

      expect(result.success).toBe(true);
      expect(result.data?.count).toBe(2);
      expect(result.data?.items).toHaveLength(2);
      
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${mockBaseUrl}/sources`,
        {
          headers: {
            'Authorization': mockToken,
            'User-Agent': 'Privacy-Data-Removal-Service/1.0'
          },
          timeout: 5000,
          validateStatus: expect.any(Function)
        }
      );
    });
  });

  describe('isAvailable', () => {
    it('should return true when API is available', async () => {
      const mockResponse = {
        status: 200,
        data: {
          status: 'success',
          data: { is_active: true }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await client.isAvailable();

      expect(result).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${mockBaseUrl}/getMe`,
        {
          headers: {
            'Authorization': mockToken
          },
          timeout: 5000,
          validateStatus: expect.any(Function)
        }
      );
    });

    it('should return false when API is unavailable', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.isAvailable();

      expect(result).toBe(false);
    });

    it('should return true for 4xx errors (API is responding)', async () => {
      const mockResponse = {
        status: 401,
        data: {}
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await client.isAvailable();

      expect(result).toBe(true);
    });

    it('should return false for 5xx errors', async () => {
      const mockResponse = {
        status: 500,
        data: {}
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await client.isAvailable();

      expect(result).toBe(false);
    });
  });

  describe('getBotId', () => {
    it('should return correct bot ID', () => {
      expect(client.getBotId()).toBe('userbox');
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      client.updateConfig({ timeout: 10000, defaultCount: 50 });
      const config = client.getConfig();
      expect(config.timeout).toBe(10000);
      expect(config.defaultCount).toBe(50);
    });
  });

  describe('error handling', () => {
    it('should handle all error codes correctly', async () => {
      const errorCodes = [
        { code: 1, expectedType: ErrorType.INVALID_TOKEN },
        { code: 2, expectedType: ErrorType.INVALID_TOKEN },
        { code: 3, expectedType: ErrorType.RATE_LIMIT },
        { code: 4, expectedType: ErrorType.API_UNAVAILABLE },
        { code: 100, expectedType: ErrorType.VALIDATION_ERROR },
        { code: 101, expectedType: ErrorType.VALIDATION_ERROR },
        { code: 102, expectedType: ErrorType.VALIDATION_ERROR },
        { code: 1000, expectedType: ErrorType.API_UNAVAILABLE },
        { code: 9999, expectedType: ErrorType.API_UNAVAILABLE } // Unknown error code
      ];

      for (const { code, expectedType } of errorCodes) {
        const mockResponse = {
          status: 200,
          data: {
            status: 'error',
            error: {
              code,
              message: `Test error ${code}`
            }
          }
        };

        mockedAxios.get.mockResolvedValueOnce(mockResponse);

        const result = await client.search('test', 'phone');

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe(expectedType);
      }
    });
  });
});