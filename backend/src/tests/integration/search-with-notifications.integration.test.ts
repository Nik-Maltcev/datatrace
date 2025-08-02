/**
 * Search with Notifications Integration Tests
 * Tests the complete search flow including notification creation
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { SearchService } from '../../services/search.service';
import { notificationService } from '../../services/notification.service';
import { SearchRequest, SearchType } from '../../types/search';

// Mock the API clients
jest.mock('../../clients/dyxless.client');
jest.mock('../../clients/itp.client');
jest.mock('../../clients/leak-osint.client');
jest.mock('../../clients/userbox.client');
jest.mock('../../clients/vektor.client');

describe('Search with Notifications Integration Tests', () => {
  let searchService: SearchService;
  const testUserId = 'test-user-search-123';

  beforeEach(() => {
    searchService = SearchService.getInstance();
    // Clear any existing notifications
    notificationService.cleanupExpiredNotifications();
  });

  afterEach(() => {
    // Clean up after each test
    notificationService.cleanupExpiredNotifications();
  });

  describe('Search Flow with Notifications', () => {
    test('should create search started notification when search begins', async () => {
      const searchRequest: SearchRequest = {
        type: 'phone' as SearchType,
        value: '+79991234567'
      };

      // Mock successful search results
      const mockResults = {
        searchId: 'test-search-123',
        timestamp: new Date(),
        query: searchRequest.value,
        searchType: searchRequest.type,
        results: [
          {
            botId: 'dyxless',
            botName: 'Bot A',
            foundData: [
              { field: 'phone', value: '+79991234567', confidence: 0.95 }
            ],
            hasData: true,
            status: 'success' as const
          }
        ],
        totalBotsSearched: 5,
        totalBotsWithData: 1,
        totalRecords: 1,
        searchDuration: 1500,
        encryptionEnabled: true
      };

      // Mock the search service method
      jest.spyOn(searchService, 'searchAllBots').mockResolvedValue(mockResults);

      // Perform search with user ID
      const results = await searchService.searchAllBots(searchRequest, testUserId);

      // Verify search results
      expect(results).toBeDefined();
      expect(results.searchId).toBe('test-search-123');

      // Verify notifications were created
      const userNotifications = notificationService.getUserNotifications(testUserId);
      
      // Should have at least search_started and search_completed notifications
      expect(userNotifications.total).toBeGreaterThanOrEqual(2);
      
      const notificationTypes = userNotifications.notifications.map(n => n.type);
      expect(notificationTypes).toContain('search_started');
      expect(notificationTypes).toContain('search_completed');
      
      // If data was found, should also have data_found notification
      if (results.totalBotsWithData > 0) {
        expect(notificationTypes).toContain('data_found');
      }
    });

    test('should create search failed notification when search fails', async () => {
      const searchRequest: SearchRequest = {
        type: 'email' as SearchType,
        value: 'test@example.com'
      };

      // Mock search failure
      const searchError = new Error('Search service unavailable');
      jest.spyOn(searchService, 'searchAllBots').mockRejectedValue(searchError);

      // Attempt search and expect it to fail
      await expect(
        searchService.searchAllBots(searchRequest, testUserId)
      ).rejects.toThrow('Search service unavailable');

      // Verify search failed notification was created
      const userNotifications = notificationService.getUserNotifications(testUserId);
      
      const failedNotifications = userNotifications.notifications.filter(
        n => n.type === 'search_failed'
      );
      
      expect(failedNotifications).toHaveLength(1);
      expect(failedNotifications[0].data?.error).toContain('Search service unavailable');
    });

    test('should create data found notifications for each bot with data', async () => {
      const searchRequest: SearchRequest = {
        type: 'inn' as SearchType,
        value: '1234567890'
      };

      // Mock search results with multiple bots having data
      const mockResults = {
        searchId: 'test-search-multi-123',
        timestamp: new Date(),
        query: searchRequest.value,
        searchType: searchRequest.type,
        results: [
          {
            botId: 'dyxless',
            botName: 'Bot A',
            foundData: [
              { field: 'inn', value: '1234567890', confidence: 0.95 },
              { field: 'name', value: 'Test Company', confidence: 0.90 }
            ],
            hasData: true,
            status: 'success' as const
          },
          {
            botId: 'itp',
            botName: 'Bot B',
            foundData: [
              { field: 'inn', value: '1234567890', confidence: 0.88 }
            ],
            hasData: true,
            status: 'success' as const
          },
          {
            botId: 'userbox',
            botName: 'Bot C',
            foundData: [],
            hasData: false,
            status: 'no_data' as const
          }
        ],
        totalBotsSearched: 3,
        totalBotsWithData: 2,
        totalRecords: 3,
        searchDuration: 2000,
        encryptionEnabled: true
      };

      jest.spyOn(searchService, 'searchAllBots').mockResolvedValue(mockResults);

      // Perform search
      const results = await searchService.searchAllBots(searchRequest, testUserId);

      // Verify search results
      expect(results.totalBotsWithData).toBe(2);

      // Verify notifications
      const userNotifications = notificationService.getUserNotifications(testUserId);
      
      const dataFoundNotifications = userNotifications.notifications.filter(
        n => n.type === 'data_found'
      );
      
      // Should have one data_found notification for each bot with data
      expect(dataFoundNotifications).toHaveLength(2);
      
      // Verify notification data contains bot information
      const botIds = dataFoundNotifications.map(n => n.data?.botId);
      expect(botIds).toContain('dyxless');
      expect(botIds).toContain('itp');
      expect(botIds).not.toContain('userbox'); // This bot had no data
    });

    test('should include search metadata in notifications', async () => {
      const searchRequest: SearchRequest = {
        type: 'passport' as SearchType,
        value: '1234 567890'
      };

      const mockResults = {
        searchId: 'test-search-metadata-123',
        timestamp: new Date(),
        query: searchRequest.value,
        searchType: searchRequest.type,
        results: [
          {
            botId: 'vektor',
            botName: 'Bot V',
            foundData: [
              { field: 'passport', value: '1234 567890', confidence: 0.92 }
            ],
            hasData: true,
            status: 'success' as const
          }
        ],
        totalBotsSearched: 1,
        totalBotsWithData: 1,
        totalRecords: 1,
        searchDuration: 800,
        encryptionEnabled: true
      };

      jest.spyOn(searchService, 'searchAllBots').mockResolvedValue(mockResults);

      // Perform search
      await searchService.searchAllBots(searchRequest, testUserId);

      // Verify notification metadata
      const userNotifications = notificationService.getUserNotifications(testUserId);
      
      const searchStartedNotification = userNotifications.notifications.find(
        n => n.type === 'search_started'
      );
      
      expect(searchStartedNotification).toBeDefined();
      expect(searchStartedNotification?.data?.searchId).toBe('test-search-metadata-123');
      expect(searchStartedNotification?.data?.searchType).toBe('passport');
      expect(searchStartedNotification?.metadata?.searchId).toBe('test-search-metadata-123');
      expect(searchStartedNotification?.metadata?.category).toBe('search');

      const searchCompletedNotification = userNotifications.notifications.find(
        n => n.type === 'search_completed'
      );
      
      expect(searchCompletedNotification).toBeDefined();
      expect(searchCompletedNotification?.data?.totalBotsSearched).toBe(1);
      expect(searchCompletedNotification?.data?.totalRecords).toBe(1);
      expect(searchCompletedNotification?.data?.searchDuration).toBe(800);
    });

    test('should handle search without user ID (anonymous)', async () => {
      const searchRequest: SearchRequest = {
        type: 'phone' as SearchType,
        value: '+79991234567'
      };

      const mockResults = {
        searchId: 'test-search-anonymous-123',
        timestamp: new Date(),
        query: searchRequest.value,
        searchType: searchRequest.type,
        results: [],
        totalBotsSearched: 5,
        totalBotsWithData: 0,
        totalRecords: 0,
        searchDuration: 1000,
        encryptionEnabled: true
      };

      jest.spyOn(searchService, 'searchAllBots').mockResolvedValue(mockResults);

      // Perform search without user ID
      const results = await searchService.searchAllBots(searchRequest);

      // Verify search completed
      expect(results).toBeDefined();
      expect(results.searchId).toBe('test-search-anonymous-123');

      // Verify no notifications were created for anonymous user
      const anonymousNotifications = notificationService.getUserNotifications('anonymous');
      expect(anonymousNotifications.total).toBe(0);
    });
  });

  describe('Search Error Recovery with Notifications', () => {
    test('should create notifications during error recovery', async () => {
      const searchRequest: SearchRequest = {
        type: 'snils' as SearchType,
        value: '12345678901'
      };

      // Mock partial failure with recovery
      const mockRecoveryResults = {
        searchId: 'test-search-recovery-123',
        timestamp: new Date(),
        query: searchRequest.value,
        searchType: searchRequest.type,
        results: [
          {
            botId: 'dyxless',
            botName: 'Bot A',
            foundData: [],
            hasData: false,
            status: 'success' as const
          }
        ],
        totalBotsSearched: 1,
        totalBotsWithData: 0,
        totalRecords: 0,
        searchDuration: 3000,
        encryptionEnabled: true,
        isDegraded: true
      };

      // First call fails, second call (recovery) succeeds
      jest.spyOn(searchService, 'searchAllBots')
        .mockRejectedValueOnce(new Error('Initial search failed'))
        .mockResolvedValueOnce(mockRecoveryResults);

      // Perform search - should recover
      const results = await searchService.searchAllBots(searchRequest, testUserId);

      // Verify recovery succeeded
      expect(results).toBeDefined();
      expect(results.isDegraded).toBe(true);

      // Verify both failure and success notifications were created
      const userNotifications = notificationService.getUserNotifications(testUserId);
      const notificationTypes = userNotifications.notifications.map(n => n.type);
      
      // Should have both failed and completed notifications
      expect(notificationTypes).toContain('search_failed');
      expect(notificationTypes).toContain('search_completed');
    });
  });

  describe('Notification Timing and Order', () => {
    test('should create notifications in correct chronological order', async () => {
      const searchRequest: SearchRequest = {
        type: 'email' as SearchType,
        value: 'test@example.com'
      };

      const mockResults = {
        searchId: 'test-search-timing-123',
        timestamp: new Date(),
        query: searchRequest.value,
        searchType: searchRequest.type,
        results: [
          {
            botId: 'leak-osint',
            botName: 'Bot L',
            foundData: [
              { field: 'email', value: 'test@example.com', confidence: 0.99 }
            ],
            hasData: true,
            status: 'success' as const
          }
        ],
        totalBotsSearched: 1,
        totalBotsWithData: 1,
        totalRecords: 1,
        searchDuration: 1200,
        encryptionEnabled: true
      };

      jest.spyOn(searchService, 'searchAllBots').mockResolvedValue(mockResults);

      // Record start time
      const startTime = new Date();

      // Perform search
      await searchService.searchAllBots(searchRequest, testUserId);

      // Get notifications ordered by creation time
      const userNotifications = notificationService.getUserNotifications(testUserId);
      const sortedNotifications = userNotifications.notifications.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      // Verify order: search_started should be first
      expect(sortedNotifications[0].type).toBe('search_started');
      
      // All notifications should be created after search start
      sortedNotifications.forEach(notification => {
        expect(new Date(notification.createdAt).getTime()).toBeGreaterThanOrEqual(startTime.getTime());
      });

      // search_completed should come after search_started
      const startedIndex = sortedNotifications.findIndex(n => n.type === 'search_started');
      const completedIndex = sortedNotifications.findIndex(n => n.type === 'search_completed');
      
      if (startedIndex !== -1 && completedIndex !== -1) {
        expect(completedIndex).toBeGreaterThan(startedIndex);
      }
    });
  });

  describe('Notification Content Validation', () => {
    test('should create notifications with proper content and formatting', async () => {
      const searchRequest: SearchRequest = {
        type: 'phone' as SearchType,
        value: '+79991234567'
      };

      const mockResults = {
        searchId: 'test-search-content-123',
        timestamp: new Date(),
        query: searchRequest.value,
        searchType: searchRequest.type,
        results: [
          {
            botId: 'userbox',
            botName: 'Encrypted Bot Name',
            foundData: [
              { field: 'phone', value: '+79991234567', confidence: 0.95 },
              { field: 'name', value: 'John Doe', confidence: 0.88 }
            ],
            hasData: true,
            status: 'success' as const
          }
        ],
        totalBotsSearched: 5,
        totalBotsWithData: 1,
        totalRecords: 2,
        searchDuration: 1800,
        encryptionEnabled: true
      };

      jest.spyOn(searchService, 'searchAllBots').mockResolvedValue(mockResults);

      // Perform search
      await searchService.searchAllBots(searchRequest, testUserId);

      // Verify notification content
      const userNotifications = notificationService.getUserNotifications(testUserId);
      
      // Check search completed notification
      const completedNotification = userNotifications.notifications.find(
        n => n.type === 'search_completed'
      );
      
      expect(completedNotification).toBeDefined();
      expect(completedNotification?.title).toBe('Поиск завершен');
      expect(completedNotification?.message).toContain('Найдено результатов: 2');
      expect(completedNotification?.priority).toBe('high');

      // Check data found notification
      const dataFoundNotification = userNotifications.notifications.find(
        n => n.type === 'data_found'
      );
      
      expect(dataFoundNotification).toBeDefined();
      expect(dataFoundNotification?.title).toBe('Данные найдены');
      expect(dataFoundNotification?.message).toContain('Encrypted Bot Name');
      expect(dataFoundNotification?.priority).toBe('high');
      expect(dataFoundNotification?.metadata?.actionRequired).toBe(true);
    });
  });
});