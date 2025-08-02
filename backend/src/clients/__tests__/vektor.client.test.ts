/**
 * Unit tests for VektorClient
 */

import axios from 'axios';
import { VektorClient } from '../vektor.client';
import { ErrorType } from '../../types/api';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('VektorClient', () => {
  let client: VektorClient;
  const mockToken = 'test-vektor-token-123';
  const mockBaseUrl = 'https://test-vektor-api.example.com';

  beforeEach(() => {
    client = new VektorClient({
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
      expect(config.token).toBe('***masked***');
    });

    it('should throw error if token is not provided', () => {
      expect(() => {
        new VektorClient({ token: '' });
      }).toThrow('Vektor API token is required');
    });

    it('should use environment variables as defaults', () => {
      process.env.VEKTOR_TOKEN = 'env-vektor-token';
      process.env.VEKTOR_BASE_URL = 'https://env-vektor-api.com';
      
      const envClient = new VektorClient();
      const config = envClient.getConfig();
      
      expect(config.baseUrl).toBe('https://env-vektor-api.com');
    });
  });

  describe('search', () => {
    it('should make successful API request', async () => {
      const mockResponse = {
        status: 200,
        data: {
          result: {
            '0': {
              'ФИО': 'Иванов Иван Иванович',
              'ДАТА РОЖДЕНИЯ': '24.07.1949',
              'ТЕЛЕФОН': '79037797417',
              'database': '🇷🇺 clients sportmaster.ru 2013-05.2018'
            },
            '1': {
              'ФИО': 'Петров Петр Петрович',
              'EMAIL': 'petrov@example.com',
              'ТЕЛЕФОН': '79123456789',
              'database': '🇷🇺 users database 2020'
            }
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await client.search('+79123456789', 'phone');

      expect(result.success).toBe(true);
      expect(result.data?.totalRecords).toBe(2);
      expect(result.data?.hasData).toBe(true);
      expect(result.data?.databases).toEqual([
        '🇷🇺 clients sportmaster.ru 2013-05.2018',
        '🇷🇺 users database 2020'
      ]);
      expect(result.data?.records).toHaveLength(2);
      expect(result.botId).toBe('vektor');
      
      // Check that source_database and record_index are added to each record
      expect(result.data?.records[0]).toHaveProperty('source_database', '🇷🇺 clients sportmaster.ru 2013-05.2018');
      expect(result.data?.records[0]).toHaveProperty('record_index', 0);
      expect(result.data?.records[1]).toHaveProperty('source_database', '🇷🇺 users database 2020');
      expect(result.data?.records[1]).toHaveProperty('record_index', 1);
      
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${mockBaseUrl}/api/${mockToken}/extended_search/${encodeURIComponent('+79123456789')}`,
        {
          headers: {
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

    it('should handle URL encoding for special characters', async () => {
      const mockResponse = {
        status: 200,
        data: {
          result: {}
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const specialQuery = 'test@example.com+special chars';
      await client.search(specialQuery, 'email');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${mockBaseUrl}/api/${mockToken}/extended_search/${encodeURIComponent(specialQuery)}`,
        expect.any(Object)
      );
    });

    it('should handle API error response', async () => {
      const mockResponse = {
        status: 200,
        data: {
          error: 'Some API error occurred'
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await client.search('test', 'phone');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorType.API_UNAVAILABLE);
      expect(result.error).toBe('API Error: Some API error occurred');
    });

    it('should handle unauthorized error (with typo)', async () => {
      const mockResponse = {
        status: 200,
        data: {
          error: 'Unothorized' // Note the typo in the API response
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await client.search('test', 'phone');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorType.INVALID_TOKEN);
      expect(result.error).toBe('Unauthorized access - invalid API token');
    });

    it('should handle unauthorized error (correct spelling)', async () => {
      const mockResponse = {
        status: 200,
        data: {
          error: 'Unauthorized'
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await client.search('test', 'phone');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorType.INVALID_TOKEN);
      expect(result.error).toBe('Unauthorized access - invalid API token');
    });

    it('should handle 401 unauthorized', async () => {
      const mockResponse = {
        status: 401,
        statusText: 'Unauthorized',
        data: {}
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

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

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await client.search('test', 'phone');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorType.RATE_LIMIT);
      expect(result.error).toBe('Rate limit exceeded');
    });

    it('should handle invalid response format', async () => {
      const mockResponse = {
        status: 200,
        data: {
          // Missing result field
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await client.search('test', 'phone');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorType.PARSING_ERROR);
      expect(result.error).toBe('Invalid API response format');
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

    it('should handle unknown error', async () => {
      const unknownError = new Error('Something went wrong');
      mockedAxios.get.mockRejectedValueOnce(unknownError);

      const result = await client.search('test', 'phone');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorType.UNKNOWN_ERROR);
      expect(result.error).toBe('Unexpected error: Something went wrong');
    });
  });

  describe('basicSearch', () => {
    it('should make successful basic search request', async () => {
      const mockResponse = {
        status: 200,
        data: {
          result: {
            '0': {
              'ФИО': 'Сидоров Сидор Сидорович',
              'ТЕЛЕФОН': '79999999999',
              'database': '🇷🇺 basic database'
            }
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await client.basicSearch('test', 'phone');

      expect(result.success).toBe(true);
      expect(result.data?.totalRecords).toBe(1);
      
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${mockBaseUrl}/api/${mockToken}/search/${encodeURIComponent('test')}`,
        {
          headers: {
            'User-Agent': 'Privacy-Data-Removal-Service/1.0'
          },
          timeout: 5000,
          validateStatus: expect.any(Function)
        }
      );
    });

    it('should handle empty query in basic search', async () => {
      const result = await client.basicSearch('', 'phone');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorType.VALIDATION_ERROR);
      expect(result.error).toBe('Query parameter is required');
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('should get profile information successfully', async () => {
      const mockResponse = {
        status: 200,
        data: {
          profile: {
            name: 'Test Vektor App',
            creation_date: '2025-02-24 16:25:03.853672',
            balance: 150.5
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await client.getProfile();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        name: 'Test Vektor App',
        creation_date: '2025-02-24 16:25:03.853672',
        balance: 150.5
      });
      
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${mockBaseUrl}/api/${mockToken}/profile`,
        {
          headers: {
            'User-Agent': 'Privacy-Data-Removal-Service/1.0'
          },
          timeout: 5000,
          validateStatus: expect.any(Function)
        }
      );
    });

    it('should handle profile error response', async () => {
      const mockResponse = {
        status: 200,
        data: {
          error: 'Unothorized'
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await client.getProfile();

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorType.INVALID_TOKEN);
      expect(result.error).toBe('Unauthorized access - invalid API token');
    });
  });

  describe('isAvailable', () => {
    it('should return true when API is available', async () => {
      const mockResponse = {
        status: 200,
        data: {
          profile: {
            name: 'Test App',
            balance: 100
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await client.isAvailable();

      expect(result).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${mockBaseUrl}/api/${mockToken}/profile`,
        {
          headers: {
            'User-Agent': 'Privacy-Data-Removal-Service/1.0'
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
      expect(client.getBotId()).toBe('vektor');
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
          result: {
            '0': {
              'ФИО': 'Тестов Тест Тестович',
              'ТЕЛЕФОН': '79111111111',
              'database': '🇷🇺 test database 1'
            },
            '1': {
              'EMAIL': 'test@example.com',
              'ФИО': 'Другой Пользователь',
              'database': '🇷🇺 test database 2'
            },
            '2': {
              'ТЕЛЕФОН': '79222222222',
              'database': '🇷🇺 test database 1'
            }
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await client.search('test', 'phone');

      expect(result.success).toBe(true);
      expect(result.data?.botId).toBe('vektor');
      expect(result.data?.searchType).toBe('phone');
      expect(result.data?.totalRecords).toBe(3);
      expect(result.data?.records).toHaveLength(3);
      expect(result.data?.hasData).toBe(true);
      expect(result.data?.databases).toEqual(['🇷🇺 test database 1', '🇷🇺 test database 2']);
      
      // Check that source_database and record_index are added to each record
      expect(result.data?.records[0]).toHaveProperty('source_database', '🇷🇺 test database 1');
      expect(result.data?.records[0]).toHaveProperty('record_index', 0);
      expect(result.data?.records[1]).toHaveProperty('source_database', '🇷🇺 test database 2');
      expect(result.data?.records[1]).toHaveProperty('record_index', 1);
      expect(result.data?.records[2]).toHaveProperty('source_database', '🇷🇺 test database 1');
      expect(result.data?.records[2]).toHaveProperty('record_index', 2);
    });

    it('should handle empty response data', async () => {
      const mockResponse = {
        status: 200,
        data: {
          result: {}
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await client.search('test', 'phone');

      expect(result.success).toBe(true);
      expect(result.data?.totalRecords).toBe(0);
      expect(result.data?.hasData).toBe(false);
      expect(result.data?.records).toEqual([]);
      expect(result.data?.databases).toEqual([]);
    });

    it('should handle records without database field', async () => {
      const mockResponse = {
        status: 200,
        data: {
          result: {
            '0': {
              'ФИО': 'Тест без базы',
              'ТЕЛЕФОН': '79333333333'
              // Missing database field
            }
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await client.search('test', 'phone');

      expect(result.success).toBe(true);
      expect(result.data?.totalRecords).toBe(1);
      expect(result.data?.records[0]).toHaveProperty('source_database', 'Unknown Database');
      expect(result.data?.databases).toEqual(['Unknown Database']);
    });
  });
});