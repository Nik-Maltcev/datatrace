/**
 * Advanced Rate Limiting Service
 * Provides sophisticated rate limiting with IP tracking, suspicious activity detection,
 * and dynamic rate adjustments
 */

import { Request } from 'express';
import { logger } from '../utils/logger';

export interface RateLimitEntry {
  count: number;
  firstRequest: number;
  lastRequest: number;
  windowStart: number;
  suspiciousActivity: boolean;
  userAgent?: string;
  endpoints: Set<string>;
}

export interface SuspiciousActivityPattern {
  rapidRequests: boolean;
  multipleEndpoints: boolean;
  unusualUserAgent: boolean;
  patternScore: number;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  suspiciousThreshold: number;
  blockDuration: number;
  enableSuspiciousDetection: boolean;
}

export class AdvancedRateLimitService {
  private static instance: AdvancedRateLimitService;
  private ipRegistry: Map<string, RateLimitEntry>;
  private blockedIPs: Map<string, number>; // IP -> unblock timestamp
  private suspiciousIPs: Set<string>;
  private cleanupInterval: NodeJS.Timeout;

  private constructor() {
    this.ipRegistry = new Map();
    this.blockedIPs = new Map();
    this.suspiciousIPs = new Set();
    
    // Clean up old entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldEntries();
    }, 5 * 60 * 1000);

    logger.info('Advanced rate limit service initialized');
  }

  public static getInstance(): AdvancedRateLimitService {
    if (!AdvancedRateLimitService.instance) {
      AdvancedRateLimitService.instance = new AdvancedRateLimitService();
    }
    return AdvancedRateLimitService.instance;
  }

  /**
   * Check if request should be rate limited
   */
  public checkRateLimit(
    req: Request,
    config: RateLimitConfig
  ): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    reason?: string;
  } {
    const clientIP = this.getClientIP(req);
    const now = Date.now();
    const userAgent = req.get('User-Agent') || 'unknown';
    const endpoint = `${req.method} ${req.path}`;

    // Check if IP is blocked
    if (this.isIPBlocked(clientIP, now)) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: this.blockedIPs.get(clientIP) || now + config.blockDuration,
        reason: 'IP_BLOCKED'
      };
    }

    // Get or create rate limit entry
    let entry = this.ipRegistry.get(clientIP);
    if (!entry) {
      entry = {
        count: 0,
        firstRequest: now,
        lastRequest: now,
        windowStart: now,
        suspiciousActivity: false,
        userAgent,
        endpoints: new Set()
      };
      this.ipRegistry.set(clientIP, entry);
    }

    // Check if we need to reset the window
    if (now - entry.windowStart >= config.windowMs) {
      entry.count = 0;
      entry.windowStart = now;
      entry.endpoints.clear();
    }

    // Update entry
    entry.count++;
    entry.lastRequest = now;
    entry.endpoints.add(endpoint);
    entry.userAgent = userAgent;

    // Check for suspicious activity
    if (config.enableSuspiciousDetection) {
      const suspiciousPattern = this.detectSuspiciousActivity(entry, config);
      if (suspiciousPattern.patternScore > 0.7) {
        this.handleSuspiciousActivity(clientIP, suspiciousPattern, config);
        entry.suspiciousActivity = true;
      }
    }

    // Check rate limit
    const remaining = Math.max(0, config.maxRequests - entry.count);
    const resetTime = entry.windowStart + config.windowMs;

    if (entry.count > config.maxRequests) {
      // Apply additional penalties for suspicious activity
      if (entry.suspiciousActivity) {
        this.blockIP(clientIP, config.blockDuration * 2); // Double block time
        logger.warn('IP blocked due to suspicious activity', {
          ip: clientIP,
          count: entry.count,
          endpoints: Array.from(entry.endpoints),
          userAgent: entry.userAgent
        });
      }

      return {
        allowed: false,
        remaining: 0,
        resetTime,
        reason: entry.suspiciousActivity ? 'SUSPICIOUS_ACTIVITY' : 'RATE_LIMIT_EXCEEDED'
      };
    }

    return {
      allowed: true,
      remaining,
      resetTime
    };
  }

  /**
   * Detect suspicious activity patterns
   */
  private detectSuspiciousActivity(
    entry: RateLimitEntry,
    config: RateLimitConfig
  ): SuspiciousActivityPattern {
    const now = Date.now();
    let score = 0;

    // Check for rapid requests (more than 10 requests per minute)
    const rapidRequests = entry.count > 10 && (now - entry.windowStart) < 60000;
    if (rapidRequests) score += 0.3;

    // Check for multiple endpoints access
    const multipleEndpoints = entry.endpoints.size > 5;
    if (multipleEndpoints) score += 0.2;

    // Check for unusual user agent patterns
    const unusualUserAgent = this.isUnusualUserAgent(entry.userAgent || '');
    if (unusualUserAgent) score += 0.3;

    // Check for very high request frequency
    const requestFrequency = entry.count / ((now - entry.firstRequest) / 1000);
    if (requestFrequency > 5) score += 0.4; // More than 5 requests per second

    return {
      rapidRequests,
      multipleEndpoints,
      unusualUserAgent,
      patternScore: Math.min(score, 1.0)
    };
  }

  /**
   * Handle suspicious activity
   */
  private handleSuspiciousActivity(
    ip: string,
    pattern: SuspiciousActivityPattern,
    config: RateLimitConfig
  ): void {
    this.suspiciousIPs.add(ip);
    
    logger.warn('Suspicious activity detected', {
      ip,
      pattern,
      score: pattern.patternScore
    });

    // If pattern score is very high, block immediately
    if (pattern.patternScore > 0.8) {
      this.blockIP(ip, config.blockDuration);
    }
  }

  /**
   * Block IP address
   */
  private blockIP(ip: string, durationMs: number): void {
    const unblockTime = Date.now() + durationMs;
    this.blockedIPs.set(ip, unblockTime);
    
    logger.warn('IP address blocked', {
      ip,
      duration: durationMs,
      unblockTime: new Date(unblockTime).toISOString()
    });
  }

  /**
   * Check if IP is blocked
   */
  private isIPBlocked(ip: string, now: number): boolean {
    const unblockTime = this.blockedIPs.get(ip);
    if (!unblockTime) return false;

    if (now >= unblockTime) {
      this.blockedIPs.delete(ip);
      return false;
    }

    return true;
  }

  /**
   * Check for unusual user agent patterns
   */
  private isUnusualUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /java/i,
      /^$/,
      /test/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }

  /**
   * Get client IP address
   */
  private getClientIP(req: Request): string {
    return (
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    ).split(',')[0].trim();
  }

  /**
   * Clean up old entries
   */
  private cleanupOldEntries(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    let cleanedEntries = 0;
    let cleanedBlocks = 0;

    // Clean up rate limit entries
    for (const [ip, entry] of this.ipRegistry.entries()) {
      if (now - entry.lastRequest > maxAge) {
        this.ipRegistry.delete(ip);
        cleanedEntries++;
      }
    }

    // Clean up expired blocks
    for (const [ip, unblockTime] of this.blockedIPs.entries()) {
      if (now >= unblockTime) {
        this.blockedIPs.delete(ip);
        cleanedBlocks++;
      }
    }

    // Clean up suspicious IPs (reset after 24 hours)
    this.suspiciousIPs.clear();

    if (cleanedEntries > 0 || cleanedBlocks > 0) {
      logger.debug('Rate limit cleanup completed', {
        cleanedEntries,
        cleanedBlocks,
        activeEntries: this.ipRegistry.size,
        blockedIPs: this.blockedIPs.size
      });
    }
  }

  /**
   * Get rate limit statistics
   */
  public getStatistics(): {
    activeIPs: number;
    blockedIPs: number;
    suspiciousIPs: number;
    totalRequests: number;
  } {
    let totalRequests = 0;
    for (const entry of this.ipRegistry.values()) {
      totalRequests += entry.count;
    }

    return {
      activeIPs: this.ipRegistry.size,
      blockedIPs: this.blockedIPs.size,
      suspiciousIPs: this.suspiciousIPs.size,
      totalRequests
    };
  }

  /**
   * Manually block IP
   */
  public manuallyBlockIP(ip: string, durationMs: number): void {
    this.blockIP(ip, durationMs);
  }

  /**
   * Manually unblock IP
   */
  public manuallyUnblockIP(ip: string): void {
    this.blockedIPs.delete(ip);
    this.suspiciousIPs.delete(ip);
    
    logger.info('IP manually unblocked', { ip });
  }

  /**
   * Get blocked IPs list
   */
  public getBlockedIPs(): Array<{ ip: string; unblockTime: number }> {
    return Array.from(this.blockedIPs.entries()).map(([ip, unblockTime]) => ({
      ip,
      unblockTime
    }));
  }

  /**
   * Shutdown cleanup
   */
  public shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.ipRegistry.clear();
    this.blockedIPs.clear();
    this.suspiciousIPs.clear();
    
    logger.info('Advanced rate limit service shutdown');
  }
}

// Export singleton instance
export const advancedRateLimitService = AdvancedRateLimitService.getInstance();