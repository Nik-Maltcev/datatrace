/**
 * Validation service for user input data
 * Handles validation and sanitization of phone numbers, emails, INN, SNILS, and passport data
 */

import { 
  ValidationResult, 
  ValidationError, 
  ValidationErrorCode, 
  ValidationSchema,
  SanitizationOptions,
  SanitizationResult 
} from '../types/validation';
import { SearchType } from '../types/search';

export class ValidationService {
  private static instance: ValidationService;
  
  // Validation patterns for different data types
  private readonly validationSchemas: Record<SearchType, ValidationSchema> = {
    phone: {
      type: 'phone',
      pattern: /^\+?[1-9]\d{1,14}$/,
      minLength: 10,
      maxLength: 15,
      required: true,
      sanitize: this.sanitizePhone.bind(this),
      customValidator: this.validatePhoneChecksum.bind(this)
    },
    email: {
      type: 'email',
      pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      minLength: 5,
      maxLength: 254,
      required: true,
      sanitize: this.sanitizeEmail.bind(this)
    },
    inn: {
      type: 'inn',
      pattern: /^\d{10,12}$/,
      minLength: 10,
      maxLength: 12,
      required: true,
      sanitize: this.sanitizeNumeric.bind(this),
      customValidator: this.validateINNChecksum.bind(this)
    },
    snils: {
      type: 'snils',
      pattern: /^\d{11}$/,
      minLength: 11,
      maxLength: 11,
      required: true,
      sanitize: this.sanitizeNumeric.bind(this),
      customValidator: this.validateSNILSChecksum.bind(this)
    },
    passport: {
      type: 'passport',
      pattern: /^\d{4}\s?\d{6}$/,
      minLength: 10,
      maxLength: 11,
      required: true,
      sanitize: this.sanitizePassport.bind(this)
    }
  };

  public static getInstance(): ValidationService {
    if (!ValidationService.instance) {
      ValidationService.instance = new ValidationService();
    }
    return ValidationService.instance;
  }

  /**
   * Validate input data based on search type
   */
  public validate(value: string, type: SearchType): ValidationResult {
    const errors: ValidationError[] = [];
    
    // Check if value is provided
    if (!value || value.trim().length === 0) {
      errors.push({
        field: type,
        message: 'Значение обязательно для заполнения',
        code: ValidationErrorCode.REQUIRED
      });
      return { isValid: false, errors };
    }

    const schema = this.validationSchemas[type];
    if (!schema) {
      errors.push({
        field: type,
        message: 'Неподдерживаемый тип данных',
        code: ValidationErrorCode.INVALID_FORMAT
      });
      return { isValid: false, errors };
    }

    // Sanitize the input
    const sanitized = schema.sanitize ? schema.sanitize(value.trim()) : value.trim();

    // Check length constraints
    if (schema.minLength && sanitized.length < schema.minLength) {
      errors.push({
        field: type,
        message: `Минимальная длина: ${schema.minLength} символов`,
        code: ValidationErrorCode.TOO_SHORT
      });
    }

    if (schema.maxLength && sanitized.length > schema.maxLength) {
      errors.push({
        field: type,
        message: `Максимальная длина: ${schema.maxLength} символов`,
        code: ValidationErrorCode.TOO_LONG
      });
    }

    // Check pattern match
    if (!schema.pattern.test(sanitized)) {
      errors.push({
        field: type,
        message: this.getFormatErrorMessage(type),
        code: ValidationErrorCode.INVALID_FORMAT
      });
    }

    // Run custom validation if provided
    if (schema.customValidator && !schema.customValidator(sanitized)) {
      errors.push({
        field: type,
        message: 'Неверная контрольная сумма',
        code: ValidationErrorCode.INVALID_CHECKSUM
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: sanitized
    };
  }

  /**
   * Sanitize phone number
   */
  private sanitizePhone(value: string): string {
    // Remove all non-digit characters except +
    let sanitized = value.replace(/[^\d+]/g, '');
    
    // If starts with 8, replace with +7 for Russian numbers
    if (sanitized.startsWith('8') && sanitized.length === 11) {
      sanitized = '+7' + sanitized.substring(1);
    }
    
    // If starts with 7 and no +, add +
    if (sanitized.startsWith('7') && sanitized.length === 11) {
      sanitized = '+' + sanitized;
    }
    
    return sanitized;
  }

  /**
   * Sanitize email
   */
  private sanitizeEmail(value: string): string {
    return value.toLowerCase().trim();
  }

  /**
   * Sanitize numeric values (INN, SNILS)
   */
  private sanitizeNumeric(value: string): string {
    return value.replace(/\D/g, '');
  }

  /**
   * Sanitize passport number
   */
  private sanitizePassport(value: string): string {
    // Remove all non-digits and spaces, then format as XXXX XXXXXX
    const digits = value.replace(/\D/g, '');
    if (digits.length === 10) {
      return digits.substring(0, 4) + ' ' + digits.substring(4);
    }
    return digits;
  }

  /**
   * Validate phone number checksum (basic validation)
   */
  private validatePhoneChecksum(value: string): boolean {
    // Basic phone validation - check if it's a valid international format
    const cleanPhone = value.replace(/\D/g, '');
    return cleanPhone.length >= 10 && cleanPhone.length <= 15;
  }

  /**
   * Validate INN checksum
   */
  private validateINNChecksum(value: string): boolean {
    if (value.length === 10) {
      return this.validateINN10(value);
    } else if (value.length === 12) {
      return this.validateINN12(value);
    }
    return false;
  }

  /**
   * Validate 10-digit INN
   */
  private validateINN10(inn: string): boolean {
    const coefficients = [2, 4, 10, 3, 5, 9, 4, 6, 8];
    let sum = 0;
    
    for (let i = 0; i < 9; i++) {
      sum += parseInt(inn[i]) * coefficients[i];
    }
    
    const checksum = (sum % 11) % 10;
    return checksum === parseInt(inn[9]);
  }

  /**
   * Validate 12-digit INN
   */
  private validateINN12(inn: string): boolean {
    const coefficients1 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
    const coefficients2 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
    
    let sum1 = 0;
    let sum2 = 0;
    
    for (let i = 0; i < 10; i++) {
      sum1 += parseInt(inn[i]) * coefficients1[i];
    }
    
    for (let i = 0; i < 11; i++) {
      sum2 += parseInt(inn[i]) * coefficients2[i];
    }
    
    const checksum1 = (sum1 % 11) % 10;
    const checksum2 = (sum2 % 11) % 10;
    
    return checksum1 === parseInt(inn[10]) && checksum2 === parseInt(inn[11]);
  }

  /**
   * Validate SNILS checksum
   */
  private validateSNILSChecksum(value: string): boolean {
    if (value.length !== 11) return false;
    
    const digits = value.substring(0, 9);
    const checksum = parseInt(value.substring(9, 11));
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(digits[i]) * (9 - i);
    }
    
    let calculatedChecksum = sum % 101;
    if (calculatedChecksum === 100) {
      calculatedChecksum = 0;
    }
    
    return calculatedChecksum === checksum;
  }

  /**
   * Get format error message for specific type
   */
  private getFormatErrorMessage(type: SearchType): string {
    const messages = {
      phone: 'Неверный формат номера телефона. Используйте формат: +7XXXXXXXXXX',
      email: 'Неверный формат email адреса',
      inn: 'ИНН должен содержать 10 или 12 цифр',
      snils: 'СНИЛС должен содержать 11 цифр',
      passport: 'Паспорт должен содержать 4 цифры серии и 6 цифр номера'
    };
    
    return messages[type] || 'Неверный формат данных';
  }

  /**
   * Sanitize input with custom options
   */
  public sanitizeWithOptions(value: string, options: SanitizationOptions): SanitizationResult {
    const original = value;
    let sanitized = value;
    const changes: string[] = [];

    if (options.removeSpaces) {
      const beforeSpaces = sanitized;
      sanitized = sanitized.replace(/\s/g, '');
      if (beforeSpaces !== sanitized) {
        changes.push('Удалены пробелы');
      }
    }

    if (options.removeDashes) {
      const beforeDashes = sanitized;
      sanitized = sanitized.replace(/-/g, '');
      if (beforeDashes !== sanitized) {
        changes.push('Удалены дефисы');
      }
    }

    if (options.toLowerCase) {
      const beforeCase = sanitized;
      sanitized = sanitized.toLowerCase();
      if (beforeCase !== sanitized) {
        changes.push('Приведено к нижнему регистру');
      }
    }

    if (options.removeSpecialChars) {
      const beforeSpecial = sanitized;
      const allowedChars = options.allowedChars || 'a-zA-Z0-9';
      const regex = new RegExp(`[^${allowedChars}]`, 'g');
      sanitized = sanitized.replace(regex, '');
      if (beforeSpecial !== sanitized) {
        changes.push('Удалены специальные символы');
      }
    }

    return {
      original,
      sanitized,
      changes
    };
  }

  /**
   * Validate multiple fields at once
   */
  public validateMultiple(inputs: Array<{ value: string; type: SearchType }>): Record<string, ValidationResult> {
    const results: Record<string, ValidationResult> = {};
    
    inputs.forEach(input => {
      results[input.type] = this.validate(input.value, input.type);
    });
    
    return results;
  }

  /**
   * Check if all validation results are valid
   */
  public areAllValid(results: Record<string, ValidationResult>): boolean {
    return Object.values(results).every(result => result.isValid);
  }
}