/**
 * Bot configuration and management types
 */

// Bot configuration interface
export interface BotConfig {
  id: string;
  name: string;
  encryptedName: string;
  apiClient: string;
  isActive: boolean;
  priority: number;
  baseUrl: string;
  timeout?: number;
  retries?: number;
}

// Bot status enum
export enum BotStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  MAINTENANCE = 'maintenance'
}

// Bot capabilities
export interface BotCapabilities {
  supportedSearchTypes: string[];
  maxRequestsPerMinute: number;
  requiresAuthentication: boolean;
  supportsParallelRequests: boolean;
}

// Extended bot configuration with capabilities
export interface ExtendedBotConfig extends BotConfig {
  status: BotStatus;
  capabilities: BotCapabilities;
  lastHealthCheck?: Date;
  errorCount: number;
  successRate: number;
}

// Bot health check result
export interface BotHealthCheck {
  botId: string;
  isHealthy: boolean;
  responseTime: number;
  lastChecked: Date;
  error?: string;
}

// Deletion instruction types
export interface InstructionStep {
  stepNumber: number;
  description: string;
  action?: string;
  screenshot?: string;
}

export interface DeletionInstruction {
  botId: string;
  encryptedName: string;
  steps: InstructionStep[];
  estimatedTime?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}