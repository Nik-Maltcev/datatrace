/**
 * API Types for Frontend
 * Types that match the backend API responses
 */

// Search types
export type SearchType = 'phone' | 'email' | 'inn' | 'snils' | 'passport';

export interface SearchRequest {
  type: SearchType;
  value: string;
  botIds?: string[];
}

export interface FoundDataItem {
  field: string;
  value: string;
  source?: string;
  confidence?: number;
}

export interface SearchResult {
  botId: string;
  botName: string; // зашифрованное название
  foundData: FoundDataItem[];
  hasData: boolean;
  status: 'success' | 'error' | 'no_data' | 'timeout' | 'circuit_open';
  errorMessage?: string;
}

export interface SearchResults {
  searchId: string;
  timestamp: string;
  query: string;
  searchType: SearchType;
  results: SearchResult[];
  totalBotsSearched: number;
  totalBotsWithData: number;
  totalRecords: number;
  searchDuration: number;
  encryptionEnabled: boolean;
  isDegraded?: boolean;
}

// API Response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    userMessage?: string;
    code: number;
    type: string;
    isOperational?: boolean;
    details?: any;
    suggestions?: string[];
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    processingTime?: number;
    searchType?: SearchType;
    botId?: string;
  };
}

// Instructions types
export interface BotInstructions {
  botId: string;
  botName: string;
  instructions: {
    title: string;
    steps: string[];
    additionalInfo?: string;
    estimatedTime: string;
    difficulty: string;
  };
  meta: {
    lastUpdated: string;
    version: string;
  };
}

export interface AvailableBot {
  botId: string;
  encryptedName: string;
  stepsCount: number;
  hasAdditionalInfo: boolean;
}

// Tariff types
export interface TariffPlan {
  id: string;
  name: string;
  description: string;
  price: number | string;
  currency: string;
  period: string;
  features: string[];
  limitations: string[];
  isActive: boolean;
  isPopular: boolean;
}

export interface TariffResponse {
  currentPlans: TariffPlan[];
  upcomingPlans: TariffPlan[];
  paymentStatus: {
    available: boolean;
    message: string;
    expectedDate?: string;
  };
  totalPlans: number;
}

// Error types
export interface ApiError {
  message: string;
  userMessage?: string;
  code: number;
  type: string;
  suggestions?: string[];
  details?: any;
}

// Health check types
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  details: {
    apiManager: boolean;
    botStatuses: Array<{
      botId: string;
      isActive: boolean;
      isAvailable: boolean;
    }>;
  };
}

// Statistics types
export interface SearchStatistics {
  totalBots: number;
  activeBots: number;
  availableBots: number;
  circuitBreakerStatus: Record<string, boolean>;
}

// Notification types
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  priority: NotificationPriority;
  status: NotificationStatus;
  channels: NotificationChannel[];
  createdAt: string;
  updatedAt: string;
  readAt?: string;
  deliveredAt?: string;
  expiresAt?: string;
  metadata?: {
    searchId?: string;
    botId?: string;
    actionRequired?: boolean;
    category?: string;
    tags?: string[];
  };
}

export type NotificationType = 
  | 'search_started'
  | 'search_completed'
  | 'search_failed'
  | 'data_found'
  | 'removal_instructions'
  | 'removal_completed'
  | 'system_maintenance'
  | 'security_alert'
  | 'subscription_update'
  | 'payment_reminder'
  | 'welcome'
  | 'info'
  | 'warning'
  | 'error';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export type NotificationStatus = 'pending' | 'delivered' | 'read' | 'failed' | 'expired';

export type NotificationChannel = 'in_app' | 'email' | 'push' | 'sms' | 'telegram';

export interface NotificationPreferences {
  userId: string;
  channels: {
    in_app: boolean;
    email: boolean;
    push: boolean;
    sms: boolean;
    telegram: boolean;
  };
  types: {
    search_updates: boolean;
    security_alerts: boolean;
    system_notifications: boolean;
    marketing: boolean;
  };
  quietHours?: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
}

export interface NotificationListResponse {
  notifications: Notification[];
  pagination: {
    total: number;
    unread: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}