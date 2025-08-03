/**
 * Tariffs API Routes
 * Handles requests for tariff information and pricing plans
 */

import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { tariffService } from '../services/tariff.service';

const router = Router();

/**
 * GET /api/tariffs
 * Get all available tariff plans
 */
router.get('/', (req: Request, res: Response) => {
  try {
    logger.info('Tariffs information requested', {
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    const allPlans = tariffService.getAllTariffPlans();
    const paymentStatus = tariffService.getPaymentStatus();

    // Separate current and upcoming plans
    const currentPlans = allPlans.filter(plan => plan.isActive);
    const upcomingPlans: any[] = []; // No upcoming plans for now

    res.status(200).json({
      success: true,
      data: {
        currentPlans,
        upcomingPlans,
        paymentStatus,
        totalPlans: currentPlans.length + upcomingPlans.length
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0'
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error('Failed to get tariffs', { error: errorMessage });

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve tariff information',
        code: 500,
        type: 'TARIFFS_ERROR'
      }
    });
  }
});

/**
 * GET /api/tariffs/:planId
 * Get specific tariff plan details
 */
router.get('/:planId', (req: Request, res: Response) => {
  try {
    const { planId } = req.params;
    
    logger.info('Specific tariff requested', { 
      planId,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    if (!planId || typeof planId !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          message: 'Plan ID is required',
          code: 400,
          type: 'VALIDATION_ERROR'
        }
      });
      return;
    }

    const plan = tariffService.getTariffPlan(planId);
    
    if (!plan) {
      logger.warn('Tariff plan not found', { planId });
      
      res.status(404).json({
        success: false,
        error: {
          message: `Tariff plan not found: ${planId}`,
          code: 404,
          type: 'NOT_FOUND_ERROR'
        }
      });
      return;
    }

    const paymentStatus = tariffService.getPaymentStatus();

    res.status(200).json({
      success: true,
      data: {
        plan,
        paymentStatus: {
          available: plan.isActive && paymentStatus.available,
          message: plan.isActive 
            ? (paymentStatus.available ? 'Доступен для покупки' : paymentStatus.message)
            : 'Будет доступен позже',
          expectedDate: plan.isActive ? null : paymentStatus.expectedDate
        }
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error('Failed to get specific tariff', {
      planId: req.params.planId,
      error: errorMessage
    });

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve tariff plan',
        code: 500,
        type: 'TARIFF_ERROR'
      }
    });
  }
});

/**
 * GET /api/tariffs/compare/all
 * Get tariff comparison data
 */
router.get('/compare/all', (req: Request, res: Response) => {
  try {
    logger.info('Tariff comparison requested', {
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    const comparisonData = tariffService.getTariffComparison();

    res.status(200).json({
      success: true,
      data: comparisonData,
      meta: {
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error('Failed to get tariff comparison', { error: errorMessage });

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve tariff comparison',
        code: 500,
        type: 'COMPARISON_ERROR'
      }
    });
  }
});

/**
 * POST /api/tariffs/subscribe
 * Create or update user subscription (placeholder for future payment integration)
 */
router.post('/subscribe', (req: Request, res: Response) => {
  try {
    const { planId, userId } = req.body;
    
    logger.info('Subscription request', { 
      planId,
      userId,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    if (!planId || !userId) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Plan ID and User ID are required',
          code: 400,
          type: 'VALIDATION_ERROR'
        }
      });
      return;
    }

    const result = tariffService.createSubscription(userId, planId);
    
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: {
          message: result.message || 'Failed to create subscription',
          code: 400,
          type: 'SUBSCRIPTION_ERROR'
        }
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        message: planId === 'free' 
          ? 'Бесплатный план активирован'
          : 'Подписка будет активирована после настройки платежей',
        planId,
        userId
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error('Failed to create subscription', {
      error: errorMessage,
      planId: req.body?.planId,
      userId: req.body?.userId
    });

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to create subscription',
        code: 500,
        type: 'SUBSCRIPTION_ERROR'
      }
    });
  }
});

/**
 * GET /api/tariffs/user/:userId/subscription
 * Get user subscription status
 */
router.get('/user/:userId/subscription', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    logger.info('User subscription status requested', { 
      userId,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    if (!userId) {
      res.status(400).json({
        success: false,
        error: {
          message: 'User ID is required',
          code: 400,
          type: 'VALIDATION_ERROR'
        }
      });
      return;
    }

    const subscription = tariffService.getUserSubscription(userId);
    const currentPlan = subscription ? tariffService.getTariffPlan(subscription.planId) : null;
    const usageStats = tariffService.getUsageStats(userId);
    const canSearch = tariffService.canUserSearch(userId);

    res.status(200).json({
      success: true,
      data: {
        subscription,
        currentPlan,
        usageStats,
        canSearch
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error('Failed to get user subscription', {
      userId: req.params.userId,
      error: errorMessage
    });

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve subscription status',
        code: 500,
        type: 'SUBSCRIPTION_ERROR'
      }
    });
  }
});

export default router;