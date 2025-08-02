/**
 * Custom hooks for API interactions
 */

import { useState, useEffect, useCallback } from 'react';
import { searchAPI, instructionsAPI, tariffsAPI, notificationsAPI } from '../services/api';
import { 
  SearchRequest, 
  SearchResults, 
  BotInstructions, 
  TariffResponse,
  ApiResponse,
  SearchStatistics,
  HealthStatus,
  Notification,
  NotificationPreferences,
  NotificationListResponse
} from '../types/api';

// Generic API hook
export function useApi<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiCall();
      
      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.error?.userMessage || response.error?.message || 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    execute();
  }, [execute]);

  return { data, loading, error, refetch: execute };
}

// Search hooks
export function useSearch() {
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (request: SearchRequest) => {
    try {
      setLoading(true);
      setError(null);
      const response = await searchAPI.search(request);
      
      if (response.success && response.data) {
        setSearchResults(response.data);
      } else {
        setError(response.error?.userMessage || response.error?.message || 'Search failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const searchSpecific = useCallback(async (request: SearchRequest, botIds: string[]) => {
    try {
      setLoading(true);
      setError(null);
      const response = await searchAPI.searchSpecific(request, botIds);
      
      if (response.success && response.data) {
        setSearchResults(response.data);
      } else {
        setError(response.error?.userMessage || response.error?.message || 'Search failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setSearchResults(null);
    setError(null);
  }, []);

  return {
    searchResults,
    loading,
    error,
    search,
    searchSpecific,
    clearResults
  };
}

// Instructions hooks
export function useInstructions(botId?: string) {
  const [instructions, setInstructions] = useState<BotInstructions | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInstructions = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await instructionsAPI.getInstructions(id);
      
      if (response.success && response.data) {
        setInstructions(response.data);
      } else {
        setError(response.error?.userMessage || response.error?.message || 'Failed to load instructions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load instructions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (botId) {
      fetchInstructions(botId);
    }
  }, [botId, fetchInstructions]);

  return {
    instructions,
    loading,
    error,
    refetch: botId ? () => fetchInstructions(botId) : undefined
  };
}

// Available bots hook
export function useAvailableBots() {
  return useApi(() => instructionsAPI.getAvailableBots());
}

// Tariffs hooks
export function useTariffs() {
  return useApi(() => tariffsAPI.getTariffs());
}

// Search statistics hook
export function useSearchStatistics() {
  return useApi(() => searchAPI.getStatistics());
}

// Health status hook
export function useHealthStatus() {
  const [status, setStatus] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await searchAPI.getHealthStatus();
      
      if (response.success && response.data) {
        setStatus(response.data);
      } else {
        setError('Health check failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Health check failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    
    // Check health every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    
    return () => clearInterval(interval);
  }, [checkHealth]);

  return {
    status,
    loading,
    error,
    refetch: checkHealth
  };
}

// Form validation hook
export function useFormValidation() {
  const validateSearchValue = useCallback((type: string, value: string): string | null => {
    if (!value.trim()) {
      return 'Поле не может быть пустым';
    }

    switch (type) {
      case 'phone':
        const phoneRegex = /^\+?[1-9]\d{7,14}$/;
        const cleanPhone = value.replace(/[\s\-\(\)]/g, '');
        if (!phoneRegex.test(cleanPhone)) {
          return 'Неверный формат номера телефона (7-15 цифр)';
        }
        break;
      
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return 'Неверный формат email адреса';
        }
        break;
      
      case 'inn':
        const innRegex = /^\d{10,12}$/;
        if (!innRegex.test(value)) {
          return 'ИНН должен содержать 10 или 12 цифр';
        }
        break;
      
      case 'snils':
        const snilsRegex = /^\d{11}$/;
        const cleanSnils = value.replace(/[\s\-]/g, '');
        if (!snilsRegex.test(cleanSnils)) {
          return 'СНИЛС должен содержать 11 цифр';
        }
        break;
      
      case 'passport':
        const passportRegex = /^\d{4}\s?\d{6}$/;
        if (!passportRegex.test(value)) {
          return 'Неверный формат паспорта (4 цифры + пробел + 6 цифр)';
        }
        break;
      
      default:
        return 'Неизвестный тип поиска';
    }

    return null;
  }, []);

  return { validateSearchValue };
}

// Local storage hook
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue] as const;
}

// Notifications hook
export function useNotifications(params?: {
  limit?: number;
  offset?: number;
  status?: string;
  type?: string;
  unreadOnly?: boolean;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await notificationsAPI.getNotifications({
        ...params,
        unread_only: params?.unreadOnly
      });
      
      if (response.success && response.data) {
        setNotifications(response.data.notifications);
        setUnreadCount(response.data.pagination.unread);
      } else {
        setError(response.error?.userMessage || response.error?.message || 'Failed to load notifications');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [params?.limit, params?.offset, params?.status, params?.type, params?.unreadOnly]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await notificationsAPI.getUnreadCount();
      if (response.success && response.data) {
        setUnreadCount(response.data.count);
      }
    } catch (err) {
      console.warn('Failed to fetch unread count:', err);
    }
  }, []);

  const fetchPreferences = useCallback(async () => {
    try {
      const response = await notificationsAPI.getPreferences();
      if (response.success && response.data) {
        setPreferences(response.data);
      }
    } catch (err) {
      console.warn('Failed to fetch preferences:', err);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await notificationsAPI.markAsRead(notificationId);
      if (response.success) {
        // Update local state
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === notificationId 
              ? { ...notification, readAt: new Date().toISOString(), status: 'read' }
              : notification
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      return response.success;
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      return false;
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await notificationsAPI.markAllAsRead();
      if (response.success) {
        // Update local state
        setNotifications(prev => 
          prev.map(notification => ({
            ...notification,
            readAt: notification.readAt || new Date().toISOString(),
            status: 'read' as const
          }))
        );
        setUnreadCount(0);
      }
      return response.success;
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      return false;
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const response = await notificationsAPI.deleteNotification(notificationId);
      if (response.success) {
        // Update local state
        const deletedNotification = notifications.find(n => n.id === notificationId);
        setNotifications(prev => prev.filter(notification => notification.id !== notificationId));
        
        // Update unread count if deleted notification was unread
        if (deletedNotification && !deletedNotification.readAt) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
      return response.success;
    } catch (err) {
      console.error('Failed to delete notification:', err);
      return false;
    }
  }, [notifications]);

  const updatePreferences = useCallback(async (newPreferences: Partial<NotificationPreferences>) => {
    try {
      const response = await notificationsAPI.updatePreferences(newPreferences);
      if (response.success && response.data) {
        setPreferences(response.data);
      }
      return response.success;
    } catch (err) {
      console.error('Failed to update preferences:', err);
      return false;
    }
  }, []);

  const subscribeToPush = useCallback(async (subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    userAgent?: string;
  }) => {
    try {
      const response = await notificationsAPI.subscribeToPush(subscription);
      return response.success;
    } catch (err) {
      console.error('Failed to subscribe to push notifications:', err);
      return false;
    }
  }, []);

  const unsubscribeFromPush = useCallback(async (endpoint: string) => {
    try {
      const response = await notificationsAPI.unsubscribeFromPush(endpoint);
      return response.success;
    } catch (err) {
      console.error('Failed to unsubscribe from push notifications:', err);
      return false;
    }
  }, []);

  const createTestNotification = useCallback(async (data: {
    type?: string;
    title?: string;
    message?: string;
    data?: Record<string, any>;
  }) => {
    try {
      const response = await notificationsAPI.createTestNotification(data);
      if (response.success) {
        await fetchNotifications(); // Refresh notifications
      }
      return response.success;
    } catch (err) {
      console.error('Failed to create test notification:', err);
      return false;
    }
  }, [fetchNotifications]);

  const refreshNotifications = useCallback(async () => {
    await Promise.all([
      fetchNotifications(),
      fetchUnreadCount(),
      fetchPreferences()
    ]);
  }, [fetchNotifications, fetchUnreadCount, fetchPreferences]);

  // Initial load
  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  // Auto-refresh unread count every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    preferences,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updatePreferences,
    subscribeToPush,
    unsubscribeFromPush,
    createTestNotification,
    refreshNotifications
  };
}