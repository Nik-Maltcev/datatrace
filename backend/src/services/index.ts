/**
 * Services Index
 * Exports all services for easy importing
 */

export { ValidationService } from './validation.service';
export { ApiManagerService } from './api-manager.service';
export { SearchService } from './search.service';
export { InstructionGenerator, instructionGenerator } from './instruction-generator.service';
export { SecurityService, getSecurityService } from './security.service';
export { AdvancedRateLimitService, advancedRateLimitService } from './advanced-rate-limit.service';
export { TariffService, tariffService } from './tariff.service';

// Export types
export type { 
  ApiManagerConfig,
  BotConfig,
  BotSearchResults,
  BotSearchResult,
  CircuitBreakerState
} from './api-manager.service';

export type {
  ValidationResult,
  ValidationError,
  ValidationErrorCode,
  ValidationSchema,
  SanitizationOptions,
  SanitizationResult
} from '../types/validation';

export type {
  InstructionStep,
  DeletionInstruction,
  BotTemplate
} from './instruction-generator.service';

export type {
  EncryptedData,
  SecurityConfig
} from './security.service';

export type {
  RateLimitEntry,
  SuspiciousActivityPattern,
  RateLimitConfig
} from './advanced-rate-limit.service';

export type {
  TariffPlan,
  UserSubscription,
  UsageStats,
  PaymentIntegration
} from './tariff.service';