/**
 * Security Service
 * Handles data encryption, memory cleanup, and PII protection
 */

import crypto from 'crypto';
import { logger } from '../utils/logger';

export interface EncryptedData {
  encryptedValue: string;
  iv: string;
  tag: string;
}

export interface SecurityConfig {
  encryptionKey: string;
  algorithm: string;
  keyLength: number;
  ivLength: number;
  tagLength: number;
}

export class SecurityService {
  private static instance: SecurityService;
  private config: SecurityConfig;
  private memoryCleanupTasks: Set<NodeJS.Timeout>;
  private sensitiveDataRegistry: Map<string, any>;

  private constructor() {
    this.config = {
      encryptionKey: process.env.ENCRYPTION_KEY || this.generateEncryptionKey(),
      algorithm: 'aes-256-gcm',
      keyLength: 32,
      ivLength: 16,
      tagLength: 16
    };
    this.memoryCleanupTasks = new Set();
    this.sensitiveDataRegistry = new Map();
    
    this.initializeSecurityFeatures();
  }

  public static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  /**
   * Initialize security features
   */
  private initializeSecurityFeatures(): void {
    // Set up periodic memory cleanup
    this.schedulePeriodicCleanup();
    
    // Set up process exit handlers for cleanup
    this.setupExitHandlers();
    
    logger.info('Security service initialized', {
      algorithm: this.config.algorithm,
      keyLength: this.config.keyLength
    });
  }

  /**
   * Encrypt sensitive data
   */
  public encryptSensitiveData(data: string): EncryptedData {
    try {
      const key = Buffer.from(this.config.encryptionKey, 'hex');
      const iv = crypto.randomBytes(this.config.ivLength);
      const cipher = crypto.createCipher(this.config.algorithm, key);
      cipher.setAAD(Buffer.from('privacy-data-removal', 'utf8'));

      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();

      const result: EncryptedData = {
        encryptedValue: encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex')
      };

      // Register for cleanup
      const registryId = this.generateRegistryId();
      this.sensitiveDataRegistry.set(registryId, { data, result });
      this.scheduleDataCleanup(registryId, 300000); // 5 minutes

      logger.debug('Data encrypted successfully', {
        dataLength: data.length,
        registryId
      });

      return result;
    } catch (error) {
      logger.error('Failed to encrypt sensitive data', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt sensitive data
   */
  public decryptSensitiveData(encryptedData: EncryptedData): string {
    try {
      const key = Buffer.from(this.config.encryptionKey, 'hex');
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const tag = Buffer.from(encryptedData.tag, 'hex');
      
      const decipher = crypto.createDecipher(this.config.algorithm, key);
      decipher.setAAD(Buffer.from('privacy-data-removal', 'utf8'));
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encryptedData.encryptedValue, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      logger.debug('Data decrypted successfully');

      return decrypted;
    } catch (error) {
      logger.error('Failed to decrypt sensitive data', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Decryption failed');
    }
  }

  /**
   * Sanitize data for logging (remove PII)
   */
  public sanitizeForLogging(data: any): any {
    if (typeof data === 'string') {
      return this.sanitizeString(data);
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeForLogging(item));
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      
      for (const [key, value] of Object.entries(data)) {
        if (this.isSensitiveField(key)) {
          sanitized[key] = this.maskSensitiveValue(value as string);
        } else {
          sanitized[key] = this.sanitizeForLogging(value);
        }
      }
      
      return sanitized;
    }
    
    return data;
  }

  /**
   * Force memory cleanup for sensitive data
   */
  public forceMemoryCleanup(): void {
    try {
      // Clear sensitive data registry
      this.sensitiveDataRegistry.clear();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        logger.debug('Forced garbage collection completed');
      }
      
      // Clear any remaining cleanup tasks
      this.memoryCleanupTasks.forEach(task => clearTimeout(task));
      this.memoryCleanupTasks.clear();
      
      logger.info('Memory cleanup completed', {
        registrySize: this.sensitiveDataRegistry.size,
        cleanupTasks: this.memoryCleanupTasks.size
      });
    } catch (error) {
      logger.error('Failed to perform memory cleanup', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Schedule data cleanup for specific registry entry
   */
  private scheduleDataCleanup(registryId: string, delayMs: number): void {
    const cleanupTask = setTimeout(() => {
      this.cleanupRegistryEntry(registryId);
      this.memoryCleanupTasks.delete(cleanupTask);
    }, delayMs);
    
    this.memoryCleanupTasks.add(cleanupTask);
  }

  /**
   * Schedule periodic memory cleanup
   */
  private schedulePeriodicCleanup(): void {
    const cleanupInterval = setInterval(() => {
      this.performPeriodicCleanup();
    }, 600000); // 10 minutes
    
    this.memoryCleanupTasks.add(cleanupInterval);
  }

  /**
   * Perform periodic cleanup
   */
  private performPeriodicCleanup(): void {
    const beforeSize = this.sensitiveDataRegistry.size;
    
    // Remove old entries (older than 30 minutes)
    const cutoffTime = Date.now() - 1800000;
    const entriesToRemove: string[] = [];
    
    this.sensitiveDataRegistry.forEach((value, key) => {
      if (value.timestamp && value.timestamp < cutoffTime) {
        entriesToRemove.push(key);
      }
    });
    
    entriesToRemove.forEach(key => {
      this.cleanupRegistryEntry(key);
    });
    
    logger.debug('Periodic cleanup completed', {
      beforeSize,
      afterSize: this.sensitiveDataRegistry.size,
      removedEntries: entriesToRemove.length
    });
  }

  /**
   * Clean up specific registry entry
   */
  private cleanupRegistryEntry(registryId: string): void {
    const entry = this.sensitiveDataRegistry.get(registryId);
    if (entry) {
      // Overwrite sensitive data with random bytes
      if (entry.data && typeof entry.data === 'string') {
        const randomData = crypto.randomBytes(entry.data.length).toString('hex');
        entry.data = randomData;
      }
      
      this.sensitiveDataRegistry.delete(registryId);
      
      logger.debug('Registry entry cleaned up', { registryId });
    }
  }

  /**
   * Setup process exit handlers for cleanup
   */
  private setupExitHandlers(): void {
    const cleanup = () => {
      logger.info('Process exit detected, performing security cleanup');
      this.forceMemoryCleanup();
    };

    process.on('exit', cleanup);
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('uncaughtException', cleanup);
  }

  /**
   * Generate encryption key
   */
  private generateEncryptionKey(): string {
    const key = crypto.randomBytes(this.config.keyLength).toString('hex');
    logger.warn('Generated new encryption key - store this securely', {
      keyLength: key.length
    });
    return key;
  }

  /**
   * Generate registry ID
   */
  private generateRegistryId(): string {
    return `reg_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Check if field contains sensitive data
   */
  private isSensitiveField(fieldName: string): boolean {
    const sensitiveFields = [
      'phone', 'email', 'inn', 'snils', 'passport',
      'phoneNumber', 'emailAddress', 'passportNumber',
      'value', 'query', 'searchValue', 'personalData',
      'userData', 'userInput', 'searchQuery'
    ];
    
    return sensitiveFields.some(field => 
      fieldName.toLowerCase().includes(field.toLowerCase())
    );
  }

  /**
   * Mask sensitive value for logging
   */
  private maskSensitiveValue(value: string): string {
    if (!value || typeof value !== 'string') {
      return '[MASKED]';
    }
    
    if (value.length <= 4) {
      return '*'.repeat(value.length);
    }
    
    // Show first 2 and last 2 characters, mask the rest
    const start = value.substring(0, 2);
    const end = value.substring(value.length - 2);
    const middle = '*'.repeat(Math.max(0, value.length - 4));
    
    return `${start}${middle}${end}`;
  }

  /**
   * Sanitize string for logging
   */
  private sanitizeString(str: string): string {
    // Remove potential phone numbers
    str = str.replace(/\+?[\d\s\-\(\)]{7,15}/g, '[PHONE_MASKED]');
    
    // Remove potential email addresses
    str = str.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_MASKED]');
    
    // Remove potential INN (10-12 digits)
    str = str.replace(/\b\d{10,12}\b/g, '[INN_MASKED]');
    
    // Remove potential SNILS (11 digits)
    str = str.replace(/\b\d{3}-\d{3}-\d{3}\s\d{2}\b/g, '[SNILS_MASKED]');
    str = str.replace(/\b\d{11}\b/g, '[SNILS_MASKED]');
    
    // Remove potential passport numbers
    str = str.replace(/\b\d{4}\s?\d{6}\b/g, '[PASSPORT_MASKED]');
    
    return str;
  }

  /**
   * Get security metrics
   */
  public getSecurityMetrics(): {
    registrySize: number;
    cleanupTasks: number;
    encryptionAlgorithm: string;
  } {
    return {
      registrySize: this.sensitiveDataRegistry.size,
      cleanupTasks: this.memoryCleanupTasks.size,
      encryptionAlgorithm: this.config.algorithm
    };
  }
}

// Export singleton instance
export const securityService = SecurityService.getInstance();