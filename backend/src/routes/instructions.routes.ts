/**
 * Instructions API Routes
 * Handles requests for bot-specific removal instructions
 */

import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { instructionGenerator } from '../services/instruction-generator.service';

const router = Router();

/**
 * GET /api/instructions/:botId
 * Get removal instructions for a specific bot
 */
router.get('/:botId', (req: Request, res: Response): void => {
  try {
    const { botId } = req.params;
    
    logger.info('Instructions requested', { 
      botId,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    // Validate botId
    if (!botId || typeof botId !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          message: 'Bot ID is required',
          code: 400,
          type: 'VALIDATION_ERROR'
        }
      });
    }

    // Generate instructions using the instruction generator
    const generatedInstructions = instructionGenerator.generateInstructions(botId);
    
    if (!generatedInstructions) {
      logger.warn('Instructions not found for bot', { botId });
      
      res.status(404).json({
        success: false,
        error: {
          message: `Instructions not found for bot: ${botId}`,
          code: 404,
          type: 'NOT_FOUND_ERROR'
        }
      });
    }

    // Return instructions with encrypted bot name
    if (!generatedInstructions) {
      res.status(404).json({
        success: false,
        error: {
          message: 'Instructions not found for this bot',
          code: 404,
          type: 'NOT_FOUND_ERROR',
          botId
        }
      });
      return;
    }

    const response = {
      botId: generatedInstructions.botId,
      botName: generatedInstructions.encryptedName, // Use encrypted name for privacy
      instructions: {
        title: `Инструкция по удалению данных из ${generatedInstructions.encryptedName}`,
        steps: generatedInstructions.steps.map(step => step.description),
        additionalInfo: generatedInstructions.additionalInfo,
        estimatedTime: generatedInstructions.estimatedTime,
        difficulty: generatedInstructions.difficulty
      },
      meta: {
        lastUpdated: generatedInstructions.lastUpdated,
        version: generatedInstructions.version
      }
    };

    logger.info('Instructions provided', { 
      botId,
      encryptedName: generatedInstructions.encryptedName,
      stepsCount: generatedInstructions.steps.length
    });

    res.status(200).json({
      success: true,
      data: response,
      meta: {
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error('Failed to get instructions', {
      botId: req.params.botId,
      error: errorMessage
    });

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve instructions',
        code: 500,
        type: 'INSTRUCTIONS_ERROR'
      }
    });
  }
});

/**
 * GET /api/instructions
 * Get list of all available bots with instructions
 */
router.get('/', (req: Request, res: Response) => {
  try {
    logger.info('All instructions list requested', {
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    const botsList = instructionGenerator.getAvailableBots();

    res.status(200).json({
      success: true,
      data: {
        availableBots: botsList,
        totalBots: botsList.length
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error('Failed to get instructions list', { error: errorMessage });

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve instructions list',
        code: 500,
        type: 'INSTRUCTIONS_LIST_ERROR'
      }
    });
  }
});

export default router;