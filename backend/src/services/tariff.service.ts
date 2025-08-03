/**
 * Tariff Service
 * Manages tariff plans, user subscriptions, and usage tracking
 */

import { logger } from '../utils/logger';

export interface TariffPlan {
  id: string;
  name: string;
  description: string;
  price: number | string;
  currency: string;
  period: string;
  features: string[];
  limitations: string[];
  searchLimit: number;
  isActive: boolean;
  isPopular: boolean;
  isFree: boolean;
  order: number;
}

export interface UserSubscription {
  userId: string;
  planId: string;
  status: 'active' | 'inactive' | 'expired' | 'cancelled';
  startDate: Date;
  endDate: Date;
  autoRenew: boolean;
  paymentMethod?: string;
}

export interface UsageStats {
  userId: string;
  planId: string;
  searchesUsed: number;
  searchesLimit: number;
  resetDate: Date;
  lastUsage: Date;
}

export interface PaymentIntegration {
  provider: 'stripe' | 'paypal' | 'yookassa' | 'sberbank';
  isEnabled: boolean;
  configuration: Record<string, any>;
}

export class TariffService {
  private static instance: TariffService;
  private tariffPlans: Map<string, TariffPlan>;
  private userSubscriptions: Map<string, UserSubscription>;
  private usageStats: Map<string, UsageStats>;
  private paymentIntegrations: Map<string, PaymentIntegration>;

  private constructor() {
    this.tariffPlans = new Map();
    this.userSubscriptions = new Map();
    this.usageStats = new Map();
    this.paymentIntegrations = new Map();
    
    this.initializeTariffPlans();
    this.initializePaymentIntegrations();
    
    logger.info('Tariff service initialized');
  }

  public static getInstance(): TariffService {
    if (!TariffService.instance) {
      TariffService.instance = new TariffService();
    }
    return TariffService.instance;
  }

  /**
   * Initialize default tariff plans
   */
  private initializeTariffPlans(): void {
    const plans: TariffPlan[] = [
      {
        id: 'free',
        name: 'Бесплатный',
        description: 'Базовый доступ к сервису удаления персональных данных',
        price: 0,
        currency: 'RUB',
        period: 'навсегда',
        features: [
          'Поиск по 5 телеграм ботам',
          'До 3 поисковых запросов в день',
          'Базовые инструкции по удалению',
          'Техподдержка через email'
        ],
        limitations: [
          'Ограничение 3 запроса в день',
          'Базовая техподдержка',
          'Без приоритетной обработки'
        ],
        searchLimit: 3,
        isActive: true,
        isPopular: false,
        isFree: true,
        order: 1
      },
      {
        id: 'basic',
        name: 'Базовый',
        description: 'Расширенный доступ для регулярного использования',
        price: 299,
        currency: 'RUB',
        period: 'месяц',
        features: [
          'Поиск по 5 телеграм ботам',
          'До 50 поисковых запросов в месяц',
          'Подробные инструкции по удалению',
          'Приоритетная техподдержка',
          'История поисковых запросов',
          'Уведомления о статусе удаления'
        ],
        limitations: [
          'Ограничение 50 запросов в месяц'
        ],
        searchLimit: 50,
        isActive: true,
        isPopular: true,
        isFree: false,
        order: 2
      },
      {
        id: 'premium',
        name: 'Премиум',
        description: 'Полный доступ для профессионального использования',
        price: 799,
        currency: 'RUB',
        period: 'месяц',
        features: [
          'Поиск по 5 телеграм ботам',
          'Неограниченные поисковые запросы',
          'Персональные инструкции по удалению',
          'Приоритетная техподдержка 24/7',
          'Расширенная история запросов',
          'Автоматические уведомления',
          'API доступ для интеграций',
          'Персональный менеджер'
        ],
        limitations: [],
        searchLimit: -1, // Unlimited
        isActive: true,
        isPopular: false,
        isFree: false,
        order: 3
      },
      {
        id: 'enterprise',
        name: 'Корпоративный',
        description: 'Решение для организаций и крупных компаний',
        price: 'По запросу',
        currency: 'RUB',
        period: 'год',
        features: [
          'Поиск по 5 телеграм ботам',
          'Неограниченные поисковые запросы',
          'Корпоративные инструкции',
          'Выделенная техподдержка',
          'Корпоративная панель управления',
          'Массовые операции',
          'Интеграция с корпоративными системами',
          'SLA гарантии',
          'Обучение сотрудников',
          'Персональный аккаунт-менеджер'
        ],
        limitations: [],
        searchLimit: -1, // Unlimited
        isActive: true,
        isPopular: false,
        isFree: false,
        order: 4
      }
    ];

    plans.forEach(plan => {
      this.tariffPlans.set(plan.id, plan);
      logger.debug('Initialized tariff plan', { 
        planId: plan.id, 
        name: plan.name,
        price: plan.price 
      });
    });

    logger.info('Tariff plans initialized', { 
      totalPlans: this.tariffPlans.size 
    });
  }

  /**
   * Initialize payment integrations (placeholders for future implementation)
   */
  private initializePaymentIntegrations(): void {
    const integrations: PaymentIntegration[] = [
      {
        provider: 'yookassa',
        isEnabled: false,
        configuration: {
          shopId: process.env.YOOKASSA_SHOP_ID || '',
          secretKey: process.env.YOOKASSA_SECRET_KEY || '',
          returnUrl: process.env.YOOKASSA_RETURN_URL || '',
          webhookUrl: process.env.YOOKASSA_WEBHOOK_URL || ''
        }
      },
      {
        provider: 'sberbank',
        isEnabled: false,
        configuration: {
          userName: process.env.SBERBANK_USERNAME || '',
          password: process.env.SBERBANK_PASSWORD || '',
          apiUrl: process.env.SBERBANK_API_URL || 'https://securepayments.sberbank.ru',
          returnUrl: process.env.SBERBANK_RETURN_URL || ''
        }
      },
      {
        provider: 'stripe',
        isEnabled: false,
        configuration: {
          publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
          secretKey: process.env.STRIPE_SECRET_KEY || '',
          webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || ''
        }
      },
      {
        provider: 'paypal',
        isEnabled: false,
        configuration: {
          clientId: process.env.PAYPAL_CLIENT_ID || '',
          clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
          environment: process.env.PAYPAL_ENVIRONMENT || 'sandbox'
        }
      }
    ];

    integrations.forEach(integration => {
      this.paymentIntegrations.set(integration.provider, integration);
    });

    logger.info('Payment integrations initialized', {
      providers: Array.from(this.paymentIntegrations.keys())
    });
  }

  /**
   * Get all active tariff plans
   */
  public getAllTariffPlans(): TariffPlan[] {
    const plans = Array.from(this.tariffPlans.values())
      .filter(plan => plan.isActive)
      .sort((a, b) => a.order - b.order);

    logger.debug('Retrieved tariff plans', { count: plans.length });
    return plans;
  }

  /**
   * Get tariff plan by ID
   */
  public getTariffPlan(planId: string): TariffPlan | null {
    const plan = this.tariffPlans.get(planId);
    
    if (!plan) {
      logger.warn('Tariff plan not found', { planId });
      return null;
    }

    return plan;
  }

  /**
   * Get payment status information
   */
  public getPaymentStatus(): {
    available: boolean;
    message: string;
    expectedDate?: string;
    supportedProviders: string[];
  } {
    const enabledProviders = Array.from(this.paymentIntegrations.values())
      .filter(integration => integration.isEnabled)
      .map(integration => integration.provider);

    return {
      available: false, // Currently disabled
      message: 'Оплата будет доступна позже. Пока все функции доступны бесплатно.',
      expectedDate: '2024-03-01', // Placeholder date
      supportedProviders: ['yookassa', 'sberbank', 'stripe', 'paypal']
    };
  }

  /**
   * Get tariff comparison data
   */
  public getTariffComparison(): {
    plans: TariffPlan[];
    features: string[];
    comparison: Record<string, Record<string, boolean | string | number>>;
  } {
    const plans = this.getAllTariffPlans();
    
    // Extract all unique features
    const allFeatures = new Set<string>();
    plans.forEach(plan => {
      plan.features.forEach(feature => allFeatures.add(feature));
    });
    
    const features = Array.from(allFeatures);
    
    // Create comparison matrix
    const comparison: Record<string, Record<string, boolean | string>> = {};
    
    plans.forEach(plan => {
      comparison[plan.id] = {};
      features.forEach(feature => {
        comparison[plan.id][feature] = plan.features.includes(feature);
      });
      
      // Add special fields
      comparison[plan.id]['price'] = String(plan.price);
      comparison[plan.id]['searchLimit'] = plan.searchLimit === -1 ? 'Неограничено' : plan.searchLimit.toString();
    });

    return {
      plans,
      features,
      comparison
    };
  }

  /**
   * Create user subscription (placeholder for future implementation)
   */
  public createSubscription(userId: string, planId: string): {
    success: boolean;
    message: string;
    subscriptionId?: string;
  } {
    logger.info('Subscription creation attempted', { userId, planId });
    
    return {
      success: false,
      message: 'Подписки пока недоступны. Все функции доступны бесплатно.'
    };
  }

  /**
   * Get user subscription status
   */
  public getUserSubscription(userId: string): UserSubscription | null {
    // For now, return free plan for all users
    return {
      userId,
      planId: 'free',
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      autoRenew: false
    };
  }

  /**
   * Check if user can perform search (usage limits)
   */
  public canUserSearch(userId: string): {
    allowed: boolean;
    remaining: number;
    resetDate: Date;
    message?: string;
  } {
    // For now, allow unlimited searches (free period)
    return {
      allowed: true,
      remaining: -1, // Unlimited
      resetDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      message: 'Бесплатный период - неограниченные поиски'
    };
  }

  /**
   * Record search usage
   */
  public recordSearchUsage(userId: string): void {
    logger.debug('Search usage recorded', { userId });
    // Placeholder for future implementation
  }

  /**
   * Get usage statistics
   */
  public getUsageStats(userId: string): UsageStats | null {
    // Placeholder implementation
    return {
      userId,
      planId: 'free',
      searchesUsed: 0,
      searchesLimit: -1, // Unlimited during free period
      resetDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      lastUsage: new Date()
    };
  }

  /**
   * Update tariff plan (admin function)
   */
  public updateTariffPlan(planId: string, updates: Partial<TariffPlan>): boolean {
    const plan = this.tariffPlans.get(planId);
    
    if (!plan) {
      logger.warn('Cannot update non-existent tariff plan', { planId });
      return false;
    }

    const updatedPlan = { ...plan, ...updates };
    this.tariffPlans.set(planId, updatedPlan);
    
    logger.info('Tariff plan updated', { planId, updates });
    return true;
  }

  /**
   * Enable/disable payment provider
   */
  public configurePaymentProvider(
    provider: string, 
    isEnabled: boolean, 
    configuration?: Record<string, any>
  ): boolean {
    const integration = this.paymentIntegrations.get(provider);
    
    if (!integration) {
      logger.warn('Unknown payment provider', { provider });
      return false;
    }

    integration.isEnabled = isEnabled;
    if (configuration) {
      integration.configuration = { ...integration.configuration, ...configuration };
    }

    logger.info('Payment provider configured', { provider, isEnabled });
    return true;
  }

  /**
   * Get service statistics
   */
  public getServiceStatistics(): {
    totalPlans: number;
    activePlans: number;
    paymentProviders: number;
    enabledProviders: number;
  } {
    const activePlans = Array.from(this.tariffPlans.values()).filter(plan => plan.isActive).length;
    const enabledProviders = Array.from(this.paymentIntegrations.values()).filter(p => p.isEnabled).length;

    return {
      totalPlans: this.tariffPlans.size,
      activePlans,
      paymentProviders: this.paymentIntegrations.size,
      enabledProviders
    };
  }
}

// Export singleton instance
export const tariffService = TariffService.getInstance();