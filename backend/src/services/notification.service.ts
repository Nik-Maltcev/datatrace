/**
 * Notification Service
 * Simple stub for notification functionality
 */

import { logger } from '../utils/logger';

export interface NotificationData {
  searchId?: string;
  searchType?: string;
  queryLength?: number;
  totalBotsSearched?: number;
  totalBotsWithData?: number;
  totalRecords?: number;
  searchDuration?: number;
  count?: number;
  botId?: string;
  botName?: string;
  foundDataCount?: number;
  foundFields?: string[];
  error?: string;
}

export class NotificationService {
  private static instance: NotificationService;

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Create a notification (stub implementation)
   */
  async createNotification(
    userId: string,
    type: string,
    data: NotificationData
  ): Promise<void> {
    try {
      logger.info('Notification created', {
        userId,
        type,
        data: {
          ...data,
          // Remove sensitive data from logs
          searchId: data.searchId,
          searchType: data.searchType,
          count: data.count || data.totalRecords || data.foundDataCount
        }
      });
    } catch (error) {
      logger.error('Failed to create notification', {
        userId,
        type,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();