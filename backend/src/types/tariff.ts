/**
 * Tariff and monetization types
 */

// Tariff plan interface
export interface TariffPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  searchLimit: number;
  features: string[];
  isActive: boolean;
  description?: string;
  billingPeriod: BillingPeriod;
  trialDays?: number;
}

// Billing period enum
export enum BillingPeriod {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  ONE_TIME = 'one_time'
}

// User subscription interface
export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  startDate: Date;
  endDate?: Date;
  searchesUsed: number;
  searchesLimit: number;
  autoRenew: boolean;
}

// Subscription status enum
export enum SubscriptionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  TRIAL = 'trial'
}

// Payment status enum
export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled'
}

// Usage tracking interface
export interface UsageRecord {
  userId: string;
  searchType: string;
  timestamp: Date;
  success: boolean;
  botId?: string;
}

// Billing information
export interface BillingInfo {
  customerId: string;
  email: string;
  name?: string;
  address?: Address;
  paymentMethod?: PaymentMethod;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'bank_transfer';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
}