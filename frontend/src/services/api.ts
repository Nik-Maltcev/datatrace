/**
 * API Service
 * Handles all communication with the backend API
 */

import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import { 
  SearchRequest, 
  SearchResults, 
  ApiResponse, 
  BotInstructions, 
  TariffResponse,
  HealthStatus,
  SearchStatistics,
  AvailableBot,
  Notification,
  NotificationPreferences,
  NotificationListResponse
} from '../types/api';

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

// Create axios instance with default configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth tokens if needed
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add request ID for tracking
    config.headers['X-Request-ID'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    // Handle common HTTP errors
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login if needed
      localStorage.removeItem('authToken');
    } else if (error.response?.status === 429) {
      // Handle rate limiting
      console.warn('Rate limit exceeded. Please try again later.');
    }
    
    return Promise.reject(error);
  }
);

// Search API methods
export const searchAPI = {
  /**
   * Search for data across all bots
   */
  search: async (request: SearchRequest): Promise<ApiResponse<SearchResults>> => {
    try {
      const response = await apiClient.post<ApiResponse<SearchResults>>('/api/search', request);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * Search with specific bots only
   */
  searchSpecific: async (request: SearchRequest, botIds: string[]): Promise<ApiResponse<SearchResults>> => {
    try {
      const response = await apiClient.post<ApiResponse<SearchResults>>('/api/search/specific', {
        ...request,
        botIds
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * Get search statistics
   */
  getStatistics: async (): Promise<ApiResponse<SearchStatistics>> => {
    try {
      const response = await apiClient.get<ApiResponse<SearchStatistics>>('/api/search/statistics');
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * Get search service health status
   */
  getHealthStatus: async (): Promise<ApiResponse<HealthStatus>> => {
    try {
      const response = await apiClient.get<ApiResponse<HealthStatus>>('/api/search/health');
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  }
};

// Instructions API methods
export const instructionsAPI = {
  /**
   * Get removal instructions for a specific bot
   */
  getInstructions: async (botId: string): Promise<ApiResponse<BotInstructions>> => {
    try {
      const response = await apiClient.get<ApiResponse<BotInstructions>>(`/api/instructions/${botId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * Get list of all available bots with instructions
   */
  getAvailableBots: async (): Promise<ApiResponse<{ availableBots: AvailableBot[]; totalBots: number }>> => {
    try {
      const response = await apiClient.get<ApiResponse<{ availableBots: AvailableBot[]; totalBots: number }>>('/api/instructions');
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  }
};

// Tariffs API methods
export const tariffsAPI = {
  /**
   * Get all available tariff plans
   */
  getTariffs: async (): Promise<ApiResponse<TariffResponse>> => {
    try {
      const response = await apiClient.get<ApiResponse<TariffResponse>>('/api/tariffs');
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * Get specific tariff plan details
   */
  getTariffPlan: async (planId: string): Promise<ApiResponse<any>> => {
    try {
      const response = await apiClient.get<ApiResponse<any>>(`/api/tariffs/${planId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * Get tariff comparison data
   */
  getTariffComparison: async (): Promise<ApiResponse<any>> => {
    try {
      const response = await apiClient.get<ApiResponse<any>>('/api/tariffs/compare/all');
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  }
};

// Notifications API methods
export const notificationsAPI = {
  /**
   * Get user notifications with pagination and filtering
   */
  getNotifications: async (params?: {
    limit?: number;
    offset?: number;
    status?: string;
    type?: string;
    unread_only?: boolean;
  }): Promise<ApiResponse<NotificationListResponse>> => {
    try {
      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      if (params?.offset) searchParams.append('offset', params.offset.toString());
      if (params?.status) searchParams.append('status', params.status);
      if (params?.type) searchParams.append('type', params.type);
      if (params?.unread_only) searchParams.append('unread_only', params.unread_only.toString());
      
      const queryString = searchParams.toString();
      const response = await apiClient.get<ApiResponse<NotificationListResponse>>(
        `/api/notifications${queryString ? `?${queryString}` : ''}`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * Get unread notifications count
   */
  getUnreadCount: async (): Promise<ApiResponse<{ count: number }>> => {
    try {
      const response = await apiClient.get<ApiResponse<{ count: number }>>('/api/notifications/unread/count');
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * Mark notification as read
   */
  markAsRead: async (notificationId: string): Promise<ApiResponse<{ notificationId: string; status: string }>> => {
    try {
      const response = await apiClient.post<ApiResponse<{ notificationId: string; status: string }>>(
        `/api/notifications/${notificationId}/read`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (): Promise<ApiResponse<{ markedCount: number }>> => {
    try {
      const response = await apiClient.post<ApiResponse<{ markedCount: number }>>('/api/notifications/read-all');
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * Delete notification
   */
  deleteNotification: async (notificationId: string): Promise<ApiResponse<{ notificationId: string; status: string }>> => {
    try {
      const response = await apiClient.delete<ApiResponse<{ notificationId: string; status: string }>>(
        `/api/notifications/${notificationId}`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * Get user notification preferences
   */
  getPreferences: async (): Promise<ApiResponse<NotificationPreferences>> => {
    try {
      const response = await apiClient.get<ApiResponse<NotificationPreferences>>('/api/notifications/preferences');
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * Update user notification preferences
   */
  updatePreferences: async (preferences: Partial<NotificationPreferences>): Promise<ApiResponse<NotificationPreferences>> => {
    try {
      const response = await apiClient.put<ApiResponse<NotificationPreferences>>('/api/notifications/preferences', preferences);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * Subscribe to push notifications
   */
  subscribeToPush: async (subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    userAgent?: string;
  }): Promise<ApiResponse<{ subscribed: boolean; endpoint: string }>> => {
    try {
      const response = await apiClient.post<ApiResponse<{ subscribed: boolean; endpoint: string }>>(
        '/api/notifications/push/subscribe', 
        subscription
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * Unsubscribe from push notifications
   */
  unsubscribeFromPush: async (endpoint: string): Promise<ApiResponse<{ unsubscribed: boolean; endpoint: string }>> => {
    try {
      const response = await apiClient.post<ApiResponse<{ unsubscribed: boolean; endpoint: string }>>(
        '/api/notifications/push/unsubscribe', 
        { endpoint }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * Create test notification (development only)
   */
  createTestNotification: async (data: {
    type?: string;
    title?: string;
    message?: string;
    data?: Record<string, any>;
  }): Promise<ApiResponse<Notification>> => {
    try {
      const response = await apiClient.post<ApiResponse<Notification>>('/api/notifications/test', data);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  }
};

// Error handling utility
function handleApiError(error: AxiosError): Error {
  if (error.response?.data) {
    const apiError = error.response.data as ApiResponse;
    if (apiError.error) {
      const customError = new Error(apiError.error.userMessage || apiError.error.message);
      (customError as any).code = apiError.error.code;
      (customError as any).type = apiError.error.type;
      (customError as any).suggestions = apiError.error.suggestions;
      return customError;
    }
  }
  
  // Fallback for network errors
  if (error.code === 'ECONNABORTED') {
    return new Error('Превышено время ожидания. Проверьте подключение к интернету.');
  } else if (error.code === 'ERR_NETWORK') {
    return new Error('Ошибка сети. Проверьте подключение к интернету.');
  }
  
  return new Error(error.message || 'Произошла неизвестная ошибка');
}

// Utility functions
export const apiUtils = {
  /**
   * Check if API is available
   */
  checkHealth: async (): Promise<boolean> => {
    try {
      const response = await apiClient.get('/health');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  },

  /**
   * Get API base URL
   */
  getBaseUrl: (): string => {
    return API_BASE_URL;
  },

  /**
   * Set auth token
   */
  setAuthToken: (token: string): void => {
    localStorage.setItem('authToken', token);
  },

  /**
   * Clear auth token
   */
  clearAuthToken: (): void => {
    localStorage.removeItem('authToken');
  }
};

export default apiClient;