/**
 * Unit tests for Security Service
 */

import { SecurityService, getSecurityService } from '../security.service';

describe('SecurityService', () => {
  let service: SecurityService;

  beforeEach(() => {
    service = SecurityService.getInstance();
  });

  afterEach(() => {
    // Clean up after each test
    service.forceMemoryCleanup();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = SecurityService.getInstance();
      const instance2 = SecurityService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should return the same instance as the exported singleton', () => {
      const instance = SecurityService.getInstance();
      expect(instance).toBe(getSecurityService());
    });
  });

  describe('Data Encryption', () => {
    it('should encrypt and decrypt data correctly', () => {
      const originalData = 'sensitive personal information';
      
      const encrypted = service.encryptSensitiveData(originalData);
      expect(encrypted).toHaveProperty('encryptedValue');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('tag');
      expect(encrypted.encryptedValue).not.toBe(originalData);
      
      const decrypted = service.decryptSensitiveData(encrypted);
      expect(decrypted).toBe(originalData);
    });

    it('should generate different encrypted values for same data', () => {
      const data = 'test data';
      
      const encrypted1 = service.encryptSensitiveData(data);
      const encrypted2 = service.encryptSensitiveData(data);
      
      expect(encrypted1.encryptedValue).not.toBe(encrypted2.encryptedValue);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    it('should handle empty strings', () => {
      const encrypted = service.encryptSensitiveData('');
      const decrypted = service.decryptSensitiveData(encrypted);
      expect(decrypted).toBe('');
    });

    it('should handle special characters', () => {
      const specialData = '!@#$%^&*()_+{}|:"<>?[];\'\\,./`~';
      
      const encrypted = service.encryptSensitiveData(specialData);
      const decrypted = service.decryptSensitiveData(encrypted);
      
      expect(decrypted).toBe(specialData);
    });

    it('should handle unicode characters', () => {
      const unicodeData = 'Тест данные 测试数据 🔒🛡️';
      
      const encrypted = service.encryptSensitiveData(unicodeData);
      const decrypted = service.decryptSensitiveData(encrypted);
      
      expect(decrypted).toBe(unicodeData);
    });
  });

  describe('PII Sanitization', () => {
    it('should sanitize phone numbers', () => {
      const data = {
        phone: '+79123456789',
        message: 'Call me at +79123456789'
      };
      
      const sanitized = service.sanitizeForLogging(data);
      
      expect(sanitized.phone).toBe('+7**********89');
      expect(sanitized.message).toBe('Call me at [PHONE_MASKED]');
    });

    it('should sanitize email addresses', () => {
      const data = {
        email: 'user@example.com',
        text: 'Contact user@example.com for details'
      };
      
      const sanitized = service.sanitizeForLogging(data);
      
      expect(sanitized.email).toBe('us**********om');
      expect(sanitized.text).toBe('Contact [EMAIL_MASKED] for details');
    });

    it('should sanitize INN numbers', () => {
      const data = {
        inn: '1234567890',
        description: 'INN: 1234567890123'
      };
      
      const sanitized = service.sanitizeForLogging(data);
      
      expect(sanitized.inn).toBe('12******90');
      expect(sanitized.description).toBe('INN: [INN_MASKED]');
    });

    it('should sanitize SNILS numbers', () => {
      const data = {
        snils: '12345678901',
        formatted: '123-456-789 01'
      };
      
      const sanitized = service.sanitizeForLogging(data);
      
      expect(sanitized.snils).toBe('12*******01');
      expect(sanitized.formatted).toBe('[SNILS_MASKED]');
    });

    it('should sanitize passport numbers', () => {
      const data = {
        passport: '1234567890',
        text: 'Passport: 1234 567890'
      };
      
      const sanitized = service.sanitizeForLogging(data);
      
      expect(sanitized.passport).toBe('12******90');
      expect(sanitized.text).toBe('Passport: [PASSPORT_MASKED]');
    });

    it('should handle nested objects', () => {
      const data = {
        user: {
          personal: {
            phone: '+79123456789',
            email: 'test@example.com'
          },
          public: {
            name: 'John Doe'
          }
        }
      };
      
      const sanitized = service.sanitizeForLogging(data);
      
      expect(sanitized.user.personal.phone).toBe('+7**********89');
      expect(sanitized.user.personal.email).toBe('te**********om');
      expect(sanitized.user.public.name).toBe('John Doe');
    });

    it('should handle arrays', () => {
      const data = [
        { phone: '+79123456789' },
        { email: 'test@example.com' },
        { name: 'John Doe' }
      ];
      
      const sanitized = service.sanitizeForLogging(data);
      
      expect(sanitized[0].phone).toBe('+7**********89');
      expect(sanitized[1].email).toBe('te**********om');
      expect(sanitized[2].name).toBe('John Doe');
    });

    it('should handle null and undefined values', () => {
      const data = {
        phone: null,
        email: undefined,
        name: 'John Doe'
      };
      
      const sanitized = service.sanitizeForLogging(data);
      
      expect(sanitized.phone).toBeNull();
      expect(sanitized.email).toBeUndefined();
      expect(sanitized.name).toBe('John Doe');
    });

    it('should mask short sensitive values', () => {
      const data = {
        phone: '123',
        email: 'a@b'
      };
      
      const sanitized = service.sanitizeForLogging(data);
      
      expect(sanitized.phone).toBe('***');
      expect(sanitized.email).toBe('***');
    });
  });

  describe('Memory Cleanup', () => {
    it('should force memory cleanup', () => {
      // Add some data to registry
      service.encryptSensitiveData('test data 1');
      service.encryptSensitiveData('test data 2');
      
      const metricsBefore = service.getSecurityMetrics();
      expect(metricsBefore.registrySize).toBeGreaterThan(0);
      
      service.forceMemoryCleanup();
      
      const metricsAfter = service.getSecurityMetrics();
      expect(metricsAfter.registrySize).toBe(0);
    });

    it('should handle cleanup gracefully even when registry is empty', () => {
      service.forceMemoryCleanup();
      
      const metrics = service.getSecurityMetrics();
      expect(metrics.registrySize).toBe(0);
    });
  });

  describe('Security Metrics', () => {
    it('should return security metrics', () => {
      const metrics = service.getSecurityMetrics();
      
      expect(metrics).toHaveProperty('registrySize');
      expect(metrics).toHaveProperty('cleanupTasks');
      expect(metrics).toHaveProperty('encryptionAlgorithm');
      expect(typeof metrics.registrySize).toBe('number');
      expect(typeof metrics.cleanupTasks).toBe('number');
      expect(typeof metrics.encryptionAlgorithm).toBe('string');
    });

    it('should track registry size correctly', () => {
      const initialMetrics = service.getSecurityMetrics();
      const initialSize = initialMetrics.registrySize;
      
      service.encryptSensitiveData('test data');
      
      const afterEncryption = service.getSecurityMetrics();
      expect(afterEncryption.registrySize).toBe(initialSize + 1);
      
      service.forceMemoryCleanup();
      
      const afterCleanup = service.getSecurityMetrics();
      expect(afterCleanup.registrySize).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle encryption errors gracefully', () => {
      // Mock crypto to throw error
      const originalCrypto = require('crypto');
      jest.spyOn(originalCrypto, 'createCipher').mockImplementation(() => {
        throw new Error('Crypto error');
      });
      
      expect(() => {
        service.encryptSensitiveData('test');
      }).toThrow('Encryption failed');
      
      // Restore original implementation
      originalCrypto.createCipher.mockRestore();
    });

    it('should handle decryption errors gracefully', () => {
      const invalidEncryptedData = {
        encryptedValue: 'invalid',
        iv: 'invalid',
        tag: 'invalid'
      };
      
      expect(() => {
        service.decryptSensitiveData(invalidEncryptedData);
      }).toThrow('Decryption failed');
    });

    it('should handle sanitization of circular references', () => {
      const circularData: any = { name: 'test' };
      circularData.self = circularData;
      
      // Should not throw error
      expect(() => {
        service.sanitizeForLogging(circularData);
      }).not.toThrow();
    });
  });

  describe('Field Detection', () => {
    it('should detect sensitive field names correctly', () => {
      const sensitiveData = {
        phoneNumber: '+79123456789',
        emailAddress: 'test@example.com',
        personalData: 'sensitive info',
        userData: 'user info',
        searchValue: 'search term',
        regularField: 'not sensitive'
      };
      
      const sanitized = service.sanitizeForLogging(sensitiveData);
      
      expect(sanitized.phoneNumber).toBe('+7**********89');
      expect(sanitized.emailAddress).toBe('te**********om');
      expect(sanitized.personalData).toBe('se**********fo');
      expect(sanitized.userData).toBe('us*****fo');
      expect(sanitized.searchValue).toBe('se*****rm');
      expect(sanitized.regularField).toBe('not sensitive');
    });

    it('should handle case-insensitive field detection', () => {
      const data = {
        PHONE: '+79123456789',
        Email: 'test@example.com',
        PhoneNumber: '+79123456789'
      };
      
      const sanitized = service.sanitizeForLogging(data);
      
      expect(sanitized.PHONE).toBe('+7**********89');
      expect(sanitized.Email).toBe('te**********om');
      expect(sanitized.PhoneNumber).toBe('+7**********89');
    });
  });
});