/**
 * Unit tests for ValidationService
 */

import { ValidationService } from '../validation.service';
import { ValidationErrorCode } from '../../types/validation';
import { SearchType } from '../../types/search';

describe('ValidationService', () => {
    let validationService: ValidationService;

    beforeEach(() => {
        validationService = ValidationService.getInstance();
    });

    describe('Phone validation', () => {
        it('should validate correct Russian phone numbers', () => {
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

        it('should validate international phone numbers', () => {
            const testCases = [
                '+1234567890',
                '+44123456789',
                '+33123456789'
            ];

            testCases.forEach(phone => {
                const result = validationService.validate(phone, 'phone');
                expect(result.isValid).toBe(true);
            });
        });

        it('should reject invalid phone numbers', () => {
            const testCases = [
                '123',
                '+7',
                'abc123',
                '0123456789',
                '+712345678901234567890'
            ];

            testCases.forEach(phone => {
                const result = validationService.validate(phone, 'phone');
                expect(result.isValid).toBe(false);
                expect(result.errors.length).toBeGreaterThan(0);
            });
        });

        it('should sanitize phone numbers correctly', () => {
            const testCases = [
                { input: '8 (912) 345-67-89', expected: '+79123456789' },
                { input: '7-912-345-67-89', expected: '+79123456789' },
                { input: '+7 912 345 67 89', expected: '+79123456789' }
            ];

            testCases.forEach(({ input, expected }) => {
                const result = validationService.validate(input, 'phone');
                expect(result.sanitizedValue).toBe(expected);
            });
        });
    });

    describe('Email validation', () => {
        it('should validate correct email addresses', () => {
            const testCases = [
                'test@example.com',
                'user.name@domain.co.uk',
                'user+tag@example.org',
                'user123@test-domain.com'
            ];

            testCases.forEach(email => {
                const result = validationService.validate(email, 'email');
                expect(result.isValid).toBe(true);
            });
        });

        it('should reject invalid email addresses', () => {
            const testCases = [
                'invalid-email',
                '@domain.com',
                'user@',
                'user@domain',
                'user..name@domain.com'
            ];

            testCases.forEach(email => {
                const result = validationService.validate(email, 'email');
                expect(result.isValid).toBe(false);
            });
        });

        it('should sanitize email addresses', () => {
            const result = validationService.validate('  TEST@EXAMPLE.COM  ', 'email');
            expect(result.sanitizedValue).toBe('test@example.com');
        });
    });

    describe('INN validation', () => {
        it('should validate correct 10-digit INN', () => {
            // Valid 10-digit INN with correct checksum
            const result = validationService.validate('7707083893', 'inn');
            expect(result.isValid).toBe(true);
        });

        it('should validate correct 12-digit INN', () => {
            // Valid 12-digit INN with correct checksum
            const result = validationService.validate('500100732259', 'inn');
            expect(result.isValid).toBe(true);
        });

        it('should reject invalid INN', () => {
            const testCases = [
                '123456789', // too short
                '12345678901234', // too long
                '1234567890', // invalid checksum
                'abc1234567' // contains letters
            ];

            testCases.forEach(inn => {
                const result = validationService.validate(inn, 'inn');
                expect(result.isValid).toBe(false);
            });
        });

        it('should sanitize INN correctly', () => {
            const result = validationService.validate('770-708-38-93', 'inn');
            expect(result.sanitizedValue).toBe('7707083893');
        });
    });

    describe('SNILS validation', () => {
        it('should validate correct SNILS', () => {
            // Valid SNILS with correct checksum
            const result = validationService.validate('11223344595', 'snils');
            expect(result.isValid).toBe(true);
        });

        it('should reject invalid SNILS', () => {
            const testCases = [
                '1122334459', // too short
                '112233445955', // too long
                '11223344594', // invalid checksum
                'abc23344595' // contains letters
            ];

            testCases.forEach(snils => {
                const result = validationService.validate(snils, 'snils');
                expect(result.isValid).toBe(false);
            });
        });

        it('should sanitize SNILS correctly', () => {
            const result = validationService.validate('112-233-445 95', 'snils');
            expect(result.sanitizedValue).toBe('11223344595');
        });
    });

    describe('Passport validation', () => {
        it('should validate correct passport numbers', () => {
            const testCases = [
                '1234 567890',
                '1234567890'
            ];

            testCases.forEach(passport => {
                const result = validationService.validate(passport, 'passport');
                expect(result.isValid).toBe(true);
                expect(result.sanitizedValue).toBe('1234 567890');
            });
        });

        it('should reject invalid passport numbers', () => {
            const testCases = [
                '123456789', // too short
                '12345678901', // too long
                'abc4567890', // contains letters
                '1234 56789' // wrong format
            ];

            testCases.forEach(passport => {
                const result = validationService.validate(passport, 'passport');
                expect(result.isValid).toBe(false);
            });
        });

        it('should sanitize passport numbers correctly', () => {
            const testCases = [
                { input: '1234-567890', expected: '1234 567890' },
                { input: '1234567890', expected: '1234 567890' },
                { input: '1234  567890', expected: '1234 567890' }
            ];

            testCases.forEach(({ input, expected }) => {
                const result = validationService.validate(input, 'passport');
                expect(result.sanitizedValue).toBe(expected);
            });
        });
    });

    describe('General validation', () => {
        it('should reject empty values', () => {
            const types: SearchType[] = ['phone', 'email', 'inn', 'snils', 'passport'];

            types.forEach(type => {
                const result = validationService.validate('', type);
                expect(result.isValid).toBe(false);
                expect(result.errors[0].code).toBe(ValidationErrorCode.REQUIRED);
            });
        });

        it('should reject whitespace-only values', () => {
            const result = validationService.validate('   ', 'phone');
            expect(result.isValid).toBe(false);
            expect(result.errors[0].code).toBe(ValidationErrorCode.REQUIRED);
        });

        it('should handle unsupported types gracefully', () => {
            // This test requires casting to bypass TypeScript checking
            const result = validationService.validate('test', 'unsupported' as SearchType);
            expect(result.isValid).toBe(false);
            expect(result.errors[0].code).toBe(ValidationErrorCode.INVALID_FORMAT);
        });
    });

    describe('Multiple validation', () => {
        it('should validate multiple inputs correctly', () => {
            const inputs = [
                { value: '+79123456789', type: 'phone' as SearchType },
                { value: 'test@example.com', type: 'email' as SearchType },
                { value: '7707083893', type: 'inn' as SearchType }
            ];

            const results = validationService.validateMultiple(inputs);

            expect(Object.keys(results)).toHaveLength(3);
            expect(results.phone.isValid).toBe(true);
            expect(results.email.isValid).toBe(true);
            expect(results.inn.isValid).toBe(true);
        });

        it('should check if all results are valid', () => {
            const validResults = {
                phone: { isValid: true, errors: [] },
                email: { isValid: true, errors: [] }
            };

            const invalidResults = {
                phone: { isValid: true, errors: [] },
                email: { isValid: false, errors: [{ field: 'email', message: 'Invalid', code: ValidationErrorCode.INVALID_FORMAT }] }
            };

            expect(validationService.areAllValid(validResults)).toBe(true);
            expect(validationService.areAllValid(invalidResults)).toBe(false);
        });
    });

    describe('Custom sanitization', () => {
        it('should sanitize with custom options', () => {
            const input = 'Test-Value 123!@#';
            const options = {
                removeSpaces: true,
                removeDashes: true,
                toLowerCase: true,
                removeSpecialChars: true,
                allowedChars: 'a-zA-Z0-9'
            };

            const result = validationService.sanitizeWithOptions(input, options);

            expect(result.original).toBe(input);
            expect(result.sanitized).toBe('testvalue123');
            expect(result.changes).toContain('Удалены пробелы');
            expect(result.changes).toContain('Удалены дефисы');
            expect(result.changes).toContain('Приведено к нижнему регистру');
            expect(result.changes).toContain('Удалены специальные символы');
        });

        it('should track no changes when input is already clean', () => {
            const input = 'cleanvalue123';
            const options = {
                removeSpaces: true,
                removeDashes: true,
                toLowerCase: true,
                removeSpecialChars: true
            };

            const result = validationService.sanitizeWithOptions(input, options);

            expect(result.sanitized).toBe(input);
            expect(result.changes).toHaveLength(0);
        });
    });

    describe('Singleton pattern', () => {
        it('should return the same instance', () => {
            const instance1 = ValidationService.getInstance();
            const instance2 = ValidationService.getInstance();

            expect(instance1).toBe(instance2);
        });
    });
});