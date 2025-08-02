/**
 * API-related types and interfaces
 */

// Generic API response structure
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: ErrorType;
  timestamp: Date;
  botId?: string;
}

// Raw API result from individual bot APIs
export interface RawApiResult {
  botId: string;
  success: boolean;
  data?: any;
  error?: string;
  responseTime: number;
}

// Error types enum
export enum ErrorType {
  API_UNAVAILABLE = 'api_unavailable',
  INVALID_TOKEN = 'invalid_token',
  RATE_LIMIT = 'rate_limit',
  VALIDATION_ERROR = 'validation_error',
  NETWORK_ERROR = 'network_error',
  TIMEOUT_ERROR = 'timeout_error',
  PARSING_ERROR = 'parsing_error',
  UNKNOWN_ERROR = 'unknown_error'
}

// HTTP status codes for API responses
export enum HttpStatus {
  OK = 200,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504
}

// API client interface that all bot clients must implement
export interface BotApiClient {
  search(query: string, type: string): Promise<ApiResponse>;
  isAvailable(): Promise<boolean>;
  getBotId(): string;
}

// Request configuration for API calls
export interface ApiRequestConfig {
  timeout: number;
  retries: number;
  retryDelay: number;
  headers?: Record<string, string>;
}