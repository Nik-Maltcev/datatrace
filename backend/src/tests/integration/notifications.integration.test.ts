/**
 * Notifications Integration Tests
 * Tests the complete notification system functionality
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { notificationService, NotificationType, NotificationPriority } from '../../services/notification.service';

describe('Notifications Integration Tests', () => {
  const testUserId = 'test-user-123';
  const testUserId2 = 'test-user-456';

  beforeEach(() => {
    // Clear any existing notifications
    notificationService.cleanupExpiredNotifications();
  });

  afterEach(() => {
    // Clean up after each test
    notificationService.cleanupExpiredNotifications();
  });

  describe('Notification Creation and Management', () => {
    test('should create and retrieve notifications', async () => {
      // Create a test notification
      const notification = await notificationService.createNotification(
        testUserId,
        'search_started',
        {
          searchId: 'test-search-123',
          searchType: 'phone'
        }
      );

      expect(notification).toBeDefined();
      expect(notification.userId).toBe(testUserId);
      expect(notification.type).toBe('search_started');
      expect(notification.title).toBe('Поиск запущен');
      expect(notification.status).toBe('pending');

      // Retrieve user notifications
      const userNotifications = notificationService.getUserNotifications(testUserId);
      
      expect(userNotifications.notifications).toHaveLength(1);
      expect(userNotifications.total).toBe(1);
      expect(userNotifications.unread).toBe(1);
      expect(userNotifications.notifications[0].id).toBe(notification.id);
    });

    test('should handle multiple notification types', async () => {
      const notificationTypes: NotificationType[] = [
        'search_started',
        'search_completed',
        'data_found',
        'security_alert',
        'welcome'
      ];

      // Create multiple notifications
      const notifications = [];
      for (const type of notificationTypes) {
        const notification = await notificationService.createNotification(
          testUserId,
          type,
          { testData: `data-for-${type}` }
        );
        notifications.push(notification);
      }

      // Verify all notifications were created
      const userNotifications = notificationService.getUserNotifications(testUserId);
      expect(userNotifications.notifications).toHaveLength(notificationTypes.length);
      expect(userNotifications.unread).toBe(notificationTypes.length);

      // Verify each notification type
      const retrievedTypes = userNotifications.notifications.map(n => n.type);
      notificationTypes.forEach(type => {
        expect(retrievedTypes).toContain(type);
      });
    });

    test('should handle notification priorities correctly', async () => {
      const priorities: NotificationPriority[] = ['low', 'normal', 'high', 'urgent'];

      // Create notifications with different priorities
      for (const priority of priorities) {
        await notificationService.createNotification(
          testUserId,
          'info',
          { priority },
          { priority }
        );
      }

      const userNotifications = notificationService.getUserNotifications(testUserId);
      expect(userNotifications.notifications).toHaveLength(priorities.length);

      // Verify priorities are set correctly
      const retrievedPriorities = userNotifications.notifications.map(n => n.priority);
      priorities.forEach(priority => {
        expect(retrievedPriorities).toContain(priority);
      });
    });
  });

  describe('Notification Reading and Deletion', () => {
    test('should mark notifications as read', async () => {
      // Create test notifications
      const notification1 = await notificationService.createNotification(
        testUserId,
        'search_completed',
        { searchId: 'test-1' }
      );
      
      const notification2 = await notificationService.createNotification(
        testUserId,
        'data_found',
        { searchId: 'test-2' }
      );

      // Initially both should be unread
      let userNotifications = notificationService.getUserNotifications(testUserId);
      expect(userNotifications.unread).toBe(2);

      // Mark first notification as read
      const success = notificationService.markAsRead(notification1.id, testUserId);
      expect(success).toBe(true);

      // Verify unread count decreased
      userNotifications = notificationService.getUserNotifications(testUserId);
      expect(userNotifications.unread).toBe(1);

      // Verify the specific notification is marked as read
      const readNotification = userNotifications.notifications.find(n => n.id === notification1.id);
      expect(readNotification?.readAt).toBeDefined();
      expect(readNotification?.status).toBe('read');
    });

    test('should mark all notifications as read', async () => {
      // Create multiple notifications
      await notificationService.createNotification(testUserId, 'search_started', {});
      await notificationService.createNotification(testUserId, 'search_completed', {});
      await notificationService.createNotification(testUserId, 'data_found', {});

      // Verify all are unread
      let userNotifications = notificationService.getUserNotifications(testUserId);
      expect(userNotifications.unread).toBe(3);

      // Mark all as read
      const markedCount = notificationService.markAllAsRead(testUserId);
      expect(markedCount).toBe(3);

      // Verify all are now read
      userNotifications = notificationService.getUserNotifications(testUserId);
      expect(userNotifications.unread).toBe(0);
      
      userNotifications.notifications.forEach(notification => {
        expect(notification.readAt).toBeDefined();
        expect(notification.status).toBe('read');
      });
    });

    test('should delete notifications', async () => {
      // Create test notification
      const notification = await notificationService.createNotification(
        testUserId,
        'welcome',
        { message: 'test' }
      );

      // Verify notification exists
      let userNotifications = notificationService.getUserNotifications(testUserId);
      expect(userNotifications.total).toBe(1);

      // Delete notification
      const success = notificationService.deleteNotification(notification.id, testUserId);
      expect(success).toBe(true);

      // Verify notification is deleted
      userNotifications = notificationService.getUserNotifications(testUserId);
      expect(userNotifications.total).toBe(0);
    });

    test('should not allow unauthorized access to notifications', async () => {
      // Create notification for user 1
      const notification = await notificationService.createNotification(
        testUserId,
        'search_started',
        {}
      );

      // Try to mark as read with different user
      const success = notificationService.markAsRead(notification.id, testUserId2);
      expect(success).toBe(false);

      // Try to delete with different user
      const deleteSuccess = notificationService.deleteNotification(notification.id, testUserId2);
      expect(deleteSuccess).toBe(false);

      // Verify notification still exists for original user
      const userNotifications = notificationService.getUserNotifications(testUserId);
      expect(userNotifications.total).toBe(1);
    });
  });

  describe('Notification Preferences', () => {
    test('should manage user preferences', async () => {
      // Get default preferences
      const defaultPrefs = notificationService.getUserPreferences(testUserId);
      expect(defaultPrefs.userId).toBe(testUserId);
      expect(defaultPrefs.channels.in_app).toBe(true);
      expect(defaultPrefs.channels.email).toBe(true);
      expect(defaultPrefs.types.search_updates).toBe(true);

      // Update preferences
      const updatedPrefs = notificationService.updateUserPreferences(testUserId, {
        channels: {
          ...defaultPrefs.channels,
          email: false,
          sms: true
        },
        types: {
          ...defaultPrefs.types,
          marketing: true
        }
      });

      expect(updatedPrefs.channels.email).toBe(false);
      expect(updatedPrefs.channels.sms).toBe(true);
      expect(updatedPrefs.types.marketing).toBe(true);

      // Verify preferences are persisted
      const retrievedPrefs = notificationService.getUserPreferences(testUserId);
      expect(retrievedPrefs.channels.email).toBe(false);
      expect(retrievedPrefs.channels.sms).toBe(true);
    });

    test('should filter notifications by user preferences', async () => {
      // Update preferences to disable email notifications
      notificationService.updateUserPreferences(testUserId, {
        channels: {
          in_app: true,
          email: false,
          push: true,
          sms: false,
          telegram: false
        }
      });

      // Create notification that would normally use email
      const notification = await notificationService.createNotification(
        testUserId,
        'search_completed',
        {}
      );

      // Verify email channel was filtered out
      expect(notification.channels).not.toContain('email');
      expect(notification.channels).toContain('in_app');
      expect(notification.channels).toContain('push');
    });
  });

  describe('Push Notifications', () => {
    test('should manage push subscriptions', async () => {
      const subscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
        keys: {
          p256dh: 'test-p256dh-key',
          auth: 'test-auth-key'
        },
        userAgent: 'Test Browser'
      };

      // Subscribe to push notifications
      const success = notificationService.subscribeToPush(testUserId, subscription);
      expect(success).toBe(true);

      // Try to unsubscribe
      const unsubscribeSuccess = notificationService.unsubscribeFromPush(
        testUserId, 
        subscription.endpoint
      );
      expect(unsubscribeSuccess).toBe(true);

      // Try to unsubscribe again (should fail)
      const secondUnsubscribe = notificationService.unsubscribeFromPush(
        testUserId, 
        subscription.endpoint
      );
      expect(secondUnsubscribe).toBe(false);
    });

    test('should handle multiple push subscriptions per user', async () => {
      const subscription1 = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/endpoint-1',
        keys: { p256dh: 'key1', auth: 'auth1' },
        userAgent: 'Chrome'
      };

      const subscription2 = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/endpoint-2',
        keys: { p256dh: 'key2', auth: 'auth2' },
        userAgent: 'Firefox'
      };

      // Add both subscriptions
      expect(notificationService.subscribeToPush(testUserId, subscription1)).toBe(true);
      expect(notificationService.subscribeToPush(testUserId, subscription2)).toBe(true);

      // Remove one subscription
      expect(notificationService.unsubscribeFromPush(testUserId, subscription1.endpoint)).toBe(true);

      // The other should still exist (we can't directly test this without exposing internal state)
      // But we can verify unsubscribing the second one works
      expect(notificationService.unsubscribeFromPush(testUserId, subscription2.endpoint)).toBe(true);
    });
  });

  describe('Notification Filtering and Pagination', () => {
    test('should filter notifications by status', async () => {
      // Create notifications
      const notification1 = await notificationService.createNotification(
        testUserId,
        'search_started',
        {}
      );
      
      const notification2 = await notificationService.createNotification(
        testUserId,
        'search_completed',
        {}
      );

      // Mark one as read
      notificationService.markAsRead(notification1.id, testUserId);

      // Filter by unread only
      const unreadNotifications = notificationService.getUserNotifications(testUserId, {
        unreadOnly: true
      });
      
      expect(unreadNotifications.notifications).toHaveLength(1);
      expect(unreadNotifications.notifications[0].id).toBe(notification2.id);

      // Filter by read status
      const readNotifications = notificationService.getUserNotifications(testUserId, {
        status: 'read'
      });
      
      expect(readNotifications.notifications).toHaveLength(1);
      expect(readNotifications.notifications[0].id).toBe(notification1.id);
    });

    test('should filter notifications by type', async () => {
      // Create different types of notifications
      await notificationService.createNotification(testUserId, 'search_started', {});
      await notificationService.createNotification(testUserId, 'search_completed', {});
      await notificationService.createNotification(testUserId, 'security_alert', {});

      // Filter by specific type
      const searchNotifications = notificationService.getUserNotifications(testUserId, {
        type: 'search_started'
      });
      
      expect(searchNotifications.notifications).toHaveLength(1);
      expect(searchNotifications.notifications[0].type).toBe('search_started');
    });

    test('should handle pagination', async () => {
      // Create multiple notifications
      for (let i = 0; i < 5; i++) {
        await notificationService.createNotification(
          testUserId,
          'info',
          { index: i }
        );
      }

      // Get first page
      const firstPage = notificationService.getUserNotifications(testUserId, {
        limit: 2,
        offset: 0
      });
      
      expect(firstPage.notifications).toHaveLength(2);
      expect(firstPage.total).toBe(5);

      // Get second page
      const secondPage = notificationService.getUserNotifications(testUserId, {
        limit: 2,
        offset: 2
      });
      
      expect(secondPage.notifications).toHaveLength(2);
      expect(secondPage.total).toBe(5);

      // Verify different notifications
      const firstPageIds = firstPage.notifications.map(n => n.id);
      const secondPageIds = secondPage.notifications.map(n => n.id);
      
      firstPageIds.forEach(id => {
        expect(secondPageIds).not.toContain(id);
      });
    });
  });

  describe('Notification Expiration', () => {
    test('should handle expired notifications', async () => {
      // Create notification with short expiration
      const notification = await notificationService.createNotification(
        testUserId,
        'info',
        {},
        { expiresInHours: 0.001 } // Very short expiration for testing
      );

      expect(notification.expiresAt).toBeDefined();

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));

      // Clean up expired notifications
      const cleanedCount = notificationService.cleanupExpiredNotifications();
      expect(cleanedCount).toBeGreaterThan(0);

      // Verify notification is no longer returned
      const userNotifications = notificationService.getUserNotifications(testUserId);
      expect(userNotifications.total).toBe(0);
    });
  });

  describe('Service Statistics', () => {
    test('should provide service statistics', async () => {
      // Create some test data
      await notificationService.createNotification(testUserId, 'search_started', {});
      await notificationService.createNotification(testUserId, 'search_completed', {});
      await notificationService.createNotification(testUserId2, 'welcome', {});

      // Subscribe to push notifications
      notificationService.subscribeToPush(testUserId, {
        endpoint: 'https://test.com/endpoint',
        keys: { p256dh: 'test', auth: 'test' },
        userAgent: 'Test'
      });

      const stats = notificationService.getStatistics();

      expect(stats.totalNotifications).toBeGreaterThanOrEqual(3);
      expect(stats.totalUsers).toBeGreaterThanOrEqual(2);
      expect(stats.pushSubscriptions).toBeGreaterThanOrEqual(1);
      expect(stats.pendingNotifications).toBeGreaterThanOrEqual(0);
      expect(stats.deliveredNotifications).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Event Emission', () => {
    test('should emit events for notification lifecycle', async () => {
      const events: string[] = [];

      // Listen to events
      notificationService.on('notification_created', () => events.push('created'));
      notificationService.on('notification_read', () => events.push('read'));
      notificationService.on('notification_deleted', () => events.push('deleted'));

      // Create notification
      const notification = await notificationService.createNotification(
        testUserId,
        'info',
        {}
      );

      // Mark as read
      notificationService.markAsRead(notification.id, testUserId);

      // Delete notification
      notificationService.deleteNotification(notification.id, testUserId);

      // Verify events were emitted
      expect(events).toContain('created');
      expect(events).toContain('read');
      expect(events).toContain('deleted');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid notification types', async () => {
      await expect(
        notificationService.createNotification(
          testUserId,
          'invalid_type' as NotificationType,
          {}
        )
      ).rejects.toThrow('Unknown notification type');
    });

    test('should handle invalid notification IDs', () => {
      const success = notificationService.markAsRead('invalid-id', testUserId);
      expect(success).toBe(false);

      const deleteSuccess = notificationService.deleteNotification('invalid-id', testUserId);
      expect(deleteSuccess).toBe(false);
    });
  });
});