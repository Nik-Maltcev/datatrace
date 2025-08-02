/**
 * Validation types and schemas
 */

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  sanitizedValue?: string;
}

// Validation error interface
export interface ValidationError {
  field: string;
  message: string;
  code: ValidationErrorCode;
}

// Validation error codes
export enum ValidationErrorCode {
  REQUIRED = 'required',
  INVALID_FORMAT = 'invalid_format',
  TOO_SHORT = 'too_short',
  TOO_LONG = 'too_long',
  INVALID_CHARACTERS = 'invalid_characters',
  INVALID_CHECKSUM = 'invalid_checksum'
}

// Input validation patterns
export interface ValidationPatterns {
  phone: RegExp;
  email: RegExp;
  inn: RegExp;
  snils: RegExp;
  passport: RegExp;
}

// Validation schema for different search types
export interface ValidationSchema {
  type: string;
  pattern: RegExp;
  minLength?: number;
  maxLength?: number;
  required: boolean;
  sanitize?: (value: string) => string;
  customValidator?: (value: string) => boolean;
}

// Sanitization options
export interface SanitizationOptions {
  removeSpaces: boolean;
  removeDashes: boolean;
  toLowerCase: boolean;
  removeSpecialChars: boolean;
  allowedChars?: string;
}

// Input sanitization result
export interface SanitizationResult {
  original: string;
  sanitized: string;
  changes: string[];
}