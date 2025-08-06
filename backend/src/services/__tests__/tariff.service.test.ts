/**
 * Unit tests for TariffService
 */

import { TariffService, tariffService } from '../tariff.service';

describe('TariffService', () => {
  let service: TariffService;

  beforeEach(() => {
    service = TariffService.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = TariffService.getInstance();
      const instance2 = TariffService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should return the same instance as the exported singleton', () => {
      const instance = TariffService.getInstance();
      expect(instance).toBe(tariffService);
    });
  });

  describe('Tariff Plans Management', () => {
    it('should return all active tariff plans', () => {
      const plans = service.getAllTariffPlans();
      
      expect(Array.isArray(plans)).toBe(true);
      expect(plans.length).toBeGreaterThan(0);
      
      // Check that all returned plans are active
      plans.forEach(plan => {
        expect(plan.isActive).toBe(true);
      });
      
      // Check that plans are sorted by order
      for (let i = 1; i < plans.length; i++) {
        expect(plans[i].order).toBeGreaterThanOrEqual(plans[i - 1].order);
      }
    });

    it('should include all expected default plans', () => {
      const plans = service.getAllTariffPlans();
      const planIds = plans.map(plan => plan.id);
      
      expect(planIds).toContain('free');
      expect(planIds).toContain('basic');
      expect(planIds).toContain('premium');
      expect(planIds).toContain('enterprise');
    });

    it('should return correct plan details for free plan', () => {
      const freePlan = service.getTariffPlan('free');
      
      expect(freePlan).not.toBeNull();
      expect(freePlan?.id).toBe('free');
      expect(freePlan?.name).toBe('Бесплатный');
      expect(freePlan?.price).toBe(0);
      expect(freePlan?.isFree).toBe(true);
      expect(freePlan?.isActive).toBe(true);
      expect(freePlan?.searchLimit).toBe(3);
      expect(freePlan?.features).toContain('Поиск по 5 телеграм ботам');
    });

    it('should return correct plan details for premium plan', () => {
      const premiumPlan = service.getTariffPlan('premium');
      
      expect(premiumPlan).not.toBeNull();
      expect(premiumPlan?.id).toBe('premium');
      expect(premiumPlan?.name).toBe('Премиум');
      expect(premiumPlan?.price).toBe(799);
      expect(premiumPlan?.isFree).toBe(false);
      expect(premiumPlan?.isActive).toBe(true);
      expect(premiumPlan?.searchLimit).toBe(-1); // Unlimited
      expect(premiumPlan?.features).toContain('Неограниченные поисковые запросы');
    });

    it('should return null for non-existent plan', () => {
      const plan = service.getTariffPlan('non-existent');
      expect(plan).toBeNull();
    });

    it('should identify popular plans correctly', () => {
      const plans = service.getAllTariffPlans();
      const popularPlans = plans.filter(plan => plan.isPopular);
      
      expect(popularPlans.length).toBeGreaterThan(0);
      
      // Basic plan should be popular
      const basicPlan = plans.find(plan => plan.id === 'basic');
      expect(basicPlan?.isPopular).toBe(true);
    });
  });

  describe('Payment Status', () => {
    it('should return payment status with correct structure', () => {
      const paymentStatus = service.getPaymentStatus();
      
      expect(paymentStatus).toHaveProperty('available');
      expect(paymentStatus).toHaveProperty('message');
      expect(paymentStatus).toHaveProperty('expectedDate');
      expect(paymentStatus).toHaveProperty('supportedProviders');
      
      expect(typeof paymentStatus.available).toBe('boolean');
      expect(typeof paymentStatus.message).toBe('string');
      expect(Array.isArray(paymentStatus.supportedProviders)).toBe(true);
    });

    it('should indicate payment is not available', () => {
      const paymentStatus = service.getPaymentStatus();
      
      expect(paymentStatus.available).toBe(false);
      expect(paymentStatus.message).toContain('Оплата будет доступна позже');
    });

    it('should list supported payment providers', () => {
      const paymentStatus = service.getPaymentStatus();
      
      expect(paymentStatus.supportedProviders).toContain('yookassa');
      expect(paymentStatus.supportedProviders).toContain('sberbank');
      expect(paymentStatus.supportedProviders).toContain('stripe');
      expect(paymentStatus.supportedProviders).toContain('paypal');
    });
  });

  describe('Tariff Comparison', () => {
    it('should return comparison data with correct structure', () => {
      const comparison = service.getTariffComparison();
      
      expect(comparison).toHaveProperty('plans');
      expect(comparison).toHaveProperty('features');
      expect(comparison).toHaveProperty('comparison');
      
      expect(Array.isArray(comparison.plans)).toBe(true);
      expect(Array.isArray(comparison.features)).toBe(true);
      expect(typeof comparison.comparison).toBe('object');
    });

    it('should include all active plans in comparison', () => {
      const comparison = service.getTariffComparison();
      const allPlans = service.getAllTariffPlans();
      
      expect(comparison.plans.length).toBe(allPlans.length);
      
      allPlans.forEach(plan => {
        expect(comparison.plans.find(p => p.id === plan.id)).toBeDefined();
      });
    });

    it('should have comparison data for all plans and features', () => {
      const comparison = service.getTariffComparison();
      
      comparison.plans.forEach(plan => {
        expect(comparison.comparison[plan.id]).toBeDefined();
        
        comparison.features.forEach(feature => {
          expect(comparison.comparison[plan.id][feature]).toBeDefined();
        });
      });
    });
  });

  describe('User Subscriptions', () => {
    it('should create subscription placeholder', () => {
      const result = service.createSubscription('user123', 'premium');
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(result.success).toBe(false);
      expect(result.message).toContain('недоступны');
    });

    it('should return free subscription for any user', () => {
      const subscription = service.getUserSubscription('user123');
      
      expect(subscription).not.toBeNull();
      expect(subscription?.planId).toBe('free');
      expect(subscription?.status).toBe('active');
      expect(subscription?.userId).toBe('user123');
    });

    it('should allow unlimited searches during free period', () => {
      const canSearch = service.canUserSearch('user123');
      
      expect(canSearch.allowed).toBe(true);
      expect(canSearch.remaining).toBe(-1); // Unlimited
      expect(canSearch.message).toContain('Бесплатный период');
    });

    it('should return usage stats', () => {
      const stats = service.getUsageStats('user123');
      
      expect(stats).not.toBeNull();
      expect(stats?.userId).toBe('user123');
      expect(stats?.planId).toBe('free');
      expect(stats?.searchesLimit).toBe(-1); // Unlimited during free period
    });

    it('should record search usage without errors', () => {
      expect(() => {
        service.recordSearchUsage('user123');
      }).not.toThrow();
    });
  });

  describe('Plan Management', () => {
    it('should update existing tariff plan', () => {
      const originalPlan = service.getTariffPlan('free');
      expect(originalPlan).not.toBeNull();
      
      const originalPrice = originalPlan!.price;
      const newPrice = 99;
      
      const updated = service.updateTariffPlan('free', { price: newPrice });
      expect(updated).toBe(true);
      
      const updatedPlan = service.getTariffPlan('free');
      expect(updatedPlan?.price).toBe(newPrice);
      expect(updatedPlan?.price).not.toBe(originalPrice);
      
      // Restore original price
      service.updateTariffPlan('free', { price: originalPrice });
    });

    it('should not update non-existent plan', () => {
      const updated = service.updateTariffPlan('non-existent', { price: 100 });
      expect(updated).toBe(false);
    });

    it('should partially update plan properties', () => {
      const originalPlan = service.getTariffPlan('basic');
      expect(originalPlan).not.toBeNull();
      
      const originalName = originalPlan!.name;
      const newName = 'Updated Basic';
      
      const updated = service.updateTariffPlan('basic', { name: newName });
      expect(updated).toBe(true);
      
      const updatedPlan = service.getTariffPlan('basic');
      expect(updatedPlan?.name).toBe(newName);
      expect(updatedPlan?.price).toBe(originalPlan!.price); // Should remain unchanged
      
      // Restore original name
      service.updateTariffPlan('basic', { name: originalName });
    });
  });

  describe('Payment Provider Configuration', () => {
    it('should configure existing payment provider', () => {
      const configured = service.configurePaymentProvider('stripe', true, {
        testKey: 'test_value'
      });
      
      expect(configured).toBe(true);
    });

    it('should not configure non-existent payment provider', () => {
      const configured = service.configurePaymentProvider('unknown', true);
      expect(configured).toBe(false);
    });

    it('should enable and disable payment providers', () => {
      // Enable
      let configured = service.configurePaymentProvider('paypal', true);
      expect(configured).toBe(true);
      
      // Disable
      configured = service.configurePaymentProvider('paypal', false);
      expect(configured).toBe(true);
    });
  });

  describe('Service Statistics', () => {
    it('should return service statistics', () => {
      const stats = service.getServiceStatistics();
      
      expect(stats).toHaveProperty('totalPlans');
      expect(stats).toHaveProperty('activePlans');
      expect(stats).toHaveProperty('paymentProviders');
      expect(stats).toHaveProperty('enabledProviders');
      
      expect(typeof stats.totalPlans).toBe('number');
      expect(typeof stats.activePlans).toBe('number');
      expect(typeof stats.paymentProviders).toBe('number');
      expect(typeof stats.enabledProviders).toBe('number');
      
      expect(stats.totalPlans).toBeGreaterThan(0);
      expect(stats.activePlans).toBeGreaterThan(0);
      expect(stats.paymentProviders).toBeGreaterThan(0);
      expect(stats.activePlans).toBeLessThanOrEqual(stats.totalPlans);
      expect(stats.enabledProviders).toBeLessThanOrEqual(stats.paymentProviders);
    });

    it('should have correct number of default plans', () => {
      const stats = service.getServiceStatistics();
      
      // Should have 4 default plans: free, basic, premium, enterprise
      expect(stats.totalPlans).toBe(4);
      expect(stats.activePlans).toBe(4); // All should be active by default
    });

    it('should have correct number of payment providers', () => {
      const stats = service.getServiceStatistics();
      
      // Should have 4 payment providers: yookassa, sberbank, stripe, paypal
      expect(stats.paymentProviders).toBe(4);
      expect(stats.enabledProviders).toBe(0); // None enabled by default
    });
  });

  describe('Plan Features Validation', () => {
    it('should have required properties for all plans', () => {
      const plans = service.getAllTariffPlans();
      
      plans.forEach(plan => {
        expect(plan).toHaveProperty('id');
        expect(plan).toHaveProperty('name');
        expect(plan).toHaveProperty('description');
        expect(plan).toHaveProperty('price');
        expect(plan).toHaveProperty('currency');
        expect(plan).toHaveProperty('period');
        expect(plan).toHaveProperty('features');
        expect(plan).toHaveProperty('limitations');
        expect(plan).toHaveProperty('searchLimit');
        expect(plan).toHaveProperty('isActive');
        expect(plan).toHaveProperty('isPopular');
        expect(plan).toHaveProperty('isFree');
        expect(plan).toHaveProperty('order');
        
        expect(typeof plan.id).toBe('string');
        expect(typeof plan.name).toBe('string');
        expect(typeof plan.description).toBe('string');
        expect(['number', 'string']).toContain(typeof plan.price);
        expect(typeof plan.currency).toBe('string');
        expect(typeof plan.period).toBe('string');
        expect(Array.isArray(plan.features)).toBe(true);
        expect(Array.isArray(plan.limitations)).toBe(true);
        expect(typeof plan.searchLimit).toBe('number');
        expect(typeof plan.isActive).toBe('boolean');
        expect(typeof plan.isPopular).toBe('boolean');
        expect(typeof plan.isFree).toBe('boolean');
        expect(typeof plan.order).toBe('number');
      });
    });

    it('should have non-empty features for all plans', () => {
      const plans = service.getAllTariffPlans();
      
      plans.forEach(plan => {
        expect(plan.features.length).toBeGreaterThan(0);
        plan.features.forEach(feature => {
          expect(typeof feature).toBe('string');
          expect(feature.length).toBeGreaterThan(0);
        });
      });
    });

    it('should have consistent pricing structure', () => {
      const plans = service.getAllTariffPlans();
      
      const freePlan = plans.find(p => p.id === 'free');
      const basicPlan = plans.find(p => p.id === 'basic');
      const premiumPlan = plans.find(p => p.id === 'premium');
      
      expect(freePlan?.price).toBe(0);
      expect(typeof basicPlan?.price).toBe('number');
      expect(typeof premiumPlan?.price).toBe('number');
      
      if (typeof basicPlan?.price === 'number' && typeof premiumPlan?.price === 'number') {
        expect(premiumPlan.price).toBeGreaterThan(basicPlan.price);
      }
    });
  });
});