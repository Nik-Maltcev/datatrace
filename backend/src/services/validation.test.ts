/**
 * Unit tests for ValidationService
 * Using a simpler approach to avoid module import issues
 */

// Import the validation service directly
import { ValidationService } from './validation.service';
import { ValidationErrorCode } from '../types/validation';

describe('ValidationService', () => {
  let validationService: ValidationService;

  beforeEach(() => {
    validationService = ValidationService.getInstance();
  });

  describe('Phone validation', () => {
    test('should validate correct Russian phone numbers', () => {
      const testCases = [
        '+79123456789',
        '+7 912 345 67 89',
        '89123456789',
        '79123456789'
      ];

      testCases.forEach(phone => {
        const result = validationService.validate(phone, 'phone');
        expect(result.isValid).toBe(true);
        expect(result.sanitizedValue).toMatch(/^\+7\d{10}$/);
      });
    });

    test('should reject invalid phone numbers', () => {
      const testCases = [
        '123',
        '+7',
        'abc123',
        '0123456789'
      ];

      testCases.forEach(phone => {
        const result = validationService.validate(phone, 'phone');
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Email validation', () => {
    test('should validate correct email addresses', () => {
      const testCases = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org'
      ];

      testCases.forEach(email => {
        const result = validationService.validate(email, 'email');
        expect(result.isValid).toBe(true);
      });
    });

    test('should reject invalid email addresses', () => {
      const testCases = [
        'invalid-email',
        '@domain.com',
        'user@'
      ];

      testCases.forEach(email => {
        const result = validationService.validate(email, 'email');
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('General validation', () => {
    test('should reject empty values', () => {
      const result = validationService.validate('', 'phone');
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe(ValidationErrorCode.REQUIRED);
    });

    test('should handle multiple validation', () => {
      const inputs = [
        { value: '+79123456789', type: 'phone' as const },
        { value: 'test@example.com', type: 'email' as const }
      ];

      const results = validationService.validateMultiple(inputs);
      expect(Object.keys(results)).toHaveLength(2);
      expect(validationService.areAllValid(results)).toBe(true);
    });
  });
});