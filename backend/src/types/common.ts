/**
 * Common types and enums used across the application
 */

// Application status enum
export enum AppStatus {
  INITIALIZING = 'initializing',
  READY = 'ready',
  MAINTENANCE = 'maintenance',
  ERROR = 'error'
}

// Log levels
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  VERBOSE = 'verbose'
}

// Request status for tracking
export enum RequestStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// Environment types
export enum Environment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  TEST = 'test'
}

// Generic response wrapper
export interface ResponseWrapper<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: Date;
  requestId?: string;
}

// Pagination interface
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Paginated response
export interface PaginatedResponse<T> extends ResponseWrapper<T[]> {
  pagination: Pagination;
}

// Configuration interface
export interface AppConfig {
  port: number;
  environment: Environment;
  logLevel: LogLevel;
  apiTimeout: number;
  maxConcurrentRequests: number;
  rateLimitWindow: number;
  rateLimitMax: number;
}

// Health check interface
export interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: Date;
  uptime: number;
  version: string;
  services: ServiceHealth[];
}

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'unhealthy';
  responseTime?: number;
  error?: string;
}