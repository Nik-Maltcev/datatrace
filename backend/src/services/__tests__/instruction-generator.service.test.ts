/**
 * Unit tests for InstructionGenerator service
 */

import { InstructionGenerator, instructionGenerator } from '../instruction-generator.service';

describe('InstructionGenerator', () => {
  let generator: InstructionGenerator;

  beforeEach(() => {
    generator = InstructionGenerator.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = InstructionGenerator.getInstance();
      const instance2 = InstructionGenerator.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should return the same instance as the exported singleton', () => {
      const instance = InstructionGenerator.getInstance();
      expect(instance).toBe(instructionGenerator);
    });
  });

  describe('generateInstructions', () => {
    it('should generate instructions for valid bot ID', () => {
      const instructions = generator.generateInstructions('dyxless');
      
      expect(instructions).not.toBeNull();
      expect(instructions?.botId).toBe('dyxless');
      expect(instructions?.encryptedName).toBe('Бот A');
      expect(instructions?.steps).toHaveLength(8);
      expect(instructions?.estimatedTime).toBe('5-10 минут');
      expect(instructions?.difficulty).toBe('Легко');
    });

    it('should generate instructions for all available bots', () => {
      const botIds = ['dyxless', 'itp', 'leak_osint', 'userbox', 'vektor'];
      
      botIds.forEach(botId => {
        const instructions = generator.generateInstructions(botId);
        expect(instructions).not.toBeNull();
        expect(instructions?.botId).toBe(botId);
        expect(instructions?.steps.length).toBeGreaterThan(0);
      });
    });

    it('should return null for invalid bot ID', () => {
      const instructions = generator.generateInstructions('invalid_bot');
      expect(instructions).toBeNull();
    });

    it('should handle case insensitive bot IDs', () => {
      const instructions1 = generator.generateInstructions('DYXLESS');
      const instructions2 = generator.generateInstructions('dyxless');
      
      expect(instructions1).not.toBeNull();
      expect(instructions2).not.toBeNull();
      expect(instructions1?.botId).toBe('DYXLESS');
      expect(instructions2?.botId).toBe('dyxless');
      expect(instructions1?.encryptedName).toBe(instructions2?.encryptedName);
    });

    it('should generate proper instruction steps with metadata', () => {
      const instructions = generator.generateInstructions('itp');
      
      expect(instructions).not.toBeNull();
      expect(instructions?.steps).toHaveLength(8);
      
      instructions?.steps.forEach((step, index) => {
        expect(step.stepNumber).toBe(index + 1);
        expect(step.description).toBeTruthy();
        expect(step.action).toBeTruthy();
        expect(step.estimatedTime).toBeTruthy();
        expect(['easy', 'medium', 'hard']).toContain(step.difficulty);
      });
    });

    it('should include proper metadata', () => {
      const instructions = generator.generateInstructions('vektor');
      
      expect(instructions).not.toBeNull();
      expect(instructions?.lastUpdated).toBeTruthy();
      expect(instructions?.version).toBe('1.0');
      expect(new Date(instructions?.lastUpdated || '').getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('getInstructionsByBotId', () => {
    it('should be an alias for generateInstructions', () => {
      const instructions1 = generator.generateInstructions('userbox');
      const instructions2 = generator.getInstructionsByBotId('userbox');
      
      expect(instructions1?.botId).toBe(instructions2?.botId);
      expect(instructions1?.encryptedName).toBe(instructions2?.encryptedName);
      expect(instructions1?.steps.length).toBe(instructions2?.steps.length);
    });
  });

  describe('getAvailableBots', () => {
    it('should return all available bots', () => {
      const bots = generator.getAvailableBots();
      
      expect(bots).toHaveLength(5);
      expect(bots.map(bot => bot.botId)).toContain('dyxless');
      expect(bots.map(bot => bot.botId)).toContain('itp');
      expect(bots.map(bot => bot.botId)).toContain('leak_osint');
      expect(bots.map(bot => bot.botId)).toContain('userbox');
      expect(bots.map(bot => bot.botId)).toContain('vektor');
    });

    it('should return bots with proper metadata', () => {
      const bots = generator.getAvailableBots();
      
      bots.forEach(bot => {
        expect(bot.botId).toBeTruthy();
        expect(bot.encryptedName).toBeTruthy();
        expect(bot.stepsCount).toBeGreaterThan(0);
        expect(typeof bot.hasAdditionalInfo).toBe('boolean');
        expect(bot.estimatedTime).toBeTruthy();
        expect(bot.difficulty).toBeTruthy();
        expect(typeof bot.gdprCompliant).toBe('boolean');
      });
    });

    it('should return bots sorted by encrypted name', () => {
      const bots = generator.getAvailableBots();
      const encryptedNames = bots.map(bot => bot.encryptedName);
      const sortedNames = [...encryptedNames].sort();
      
      expect(encryptedNames).toEqual(sortedNames);
    });
  });

  describe('updateBotTemplate', () => {
    it('should update existing bot template', () => {
      const originalInstructions = generator.generateInstructions('dyxless');
      const originalTime = originalInstructions?.estimatedTime;
      
      const updated = generator.updateBotTemplate('dyxless', {
        estimatedTime: '15-20 минут'
      });
      
      expect(updated).toBe(true);
      
      const updatedInstructions = generator.generateInstructions('dyxless');
      expect(updatedInstructions?.estimatedTime).toBe('15-20 минут');
      expect(updatedInstructions?.estimatedTime).not.toBe(originalTime);
    });

    it('should return false for non-existent bot', () => {
      const updated = generator.updateBotTemplate('invalid_bot', {
        estimatedTime: '10 минут'
      });
      
      expect(updated).toBe(false);
    });

    it('should handle partial updates', () => {
      const updated = generator.updateBotTemplate('itp', {
        difficulty: 'Средне'
      });
      
      expect(updated).toBe(true);
      
      const instructions = generator.generateInstructions('itp');
      expect(instructions?.difficulty).toBe('Средне');
      // Other properties should remain unchanged
      expect(instructions?.encryptedName).toBe('Бот B');
    });
  });

  describe('getBotTemplate', () => {
    it('should return bot template for valid bot ID', () => {
      const template = generator.getBotTemplate('leak_osint');
      
      expect(template).not.toBeNull();
      expect(template?.botName).toBe('LeakOsint');
      expect(template?.encryptedName).toBe('Бот C');
      expect(template?.telegramHandle).toBe('@leakosint_bot');
    });

    it('should return null for invalid bot ID', () => {
      const template = generator.getBotTemplate('invalid_bot');
      expect(template).toBeNull();
    });

    it('should handle case insensitive bot IDs', () => {
      const template1 = generator.getBotTemplate('VEKTOR');
      const template2 = generator.getBotTemplate('vektor');
      
      expect(template1).toEqual(template2);
    });
  });

  describe('hasBotTemplate', () => {
    it('should return true for existing bots', () => {
      expect(generator.hasBotTemplate('dyxless')).toBe(true);
      expect(generator.hasBotTemplate('itp')).toBe(true);
      expect(generator.hasBotTemplate('leak_osint')).toBe(true);
      expect(generator.hasBotTemplate('userbox')).toBe(true);
      expect(generator.hasBotTemplate('vektor')).toBe(true);
    });

    it('should return false for non-existent bots', () => {
      expect(generator.hasBotTemplate('invalid_bot')).toBe(false);
      expect(generator.hasBotTemplate('')).toBe(false);
    });

    it('should handle case insensitive bot IDs', () => {
      expect(generator.hasBotTemplate('DYXLESS')).toBe(true);
      expect(generator.hasBotTemplate('DyXlEsS')).toBe(true);
    });
  });

  describe('getTotalBotsCount', () => {
    it('should return correct number of bots', () => {
      expect(generator.getTotalBotsCount()).toBe(5);
    });
  });

  describe('Private helper methods', () => {
    it('should generate appropriate actions for steps', () => {
      const instructions = generator.generateInstructions('dyxless');
      const steps = instructions?.steps || [];
      
      // Check that different types of steps get appropriate actions
      const navigateStep = steps.find(step => step.description.includes('Откройте'));
      const clickStep = steps.find(step => step.description.includes('кнопку'));
      const inputStep = steps.find(step => step.description.includes('команду'));
      const confirmStep = steps.find(step => step.description.includes('Подтвердите'));
      const waitStep = steps.find(step => step.description.includes('Дождитесь'));
      
      expect(navigateStep?.action).toBe('navigate');
      expect(clickStep?.action).toBe('click');
      expect(inputStep?.action).toBe('input');
      expect(confirmStep?.action).toBe('confirm');
      expect(waitStep?.action).toBe('wait');
    });

    it('should estimate appropriate time for different step types', () => {
      const instructions = generator.generateInstructions('userbox');
      const steps = instructions?.steps || [];
      
      steps.forEach(step => {
        expect(step.estimatedTime).toBeTruthy();
        expect(step.estimatedTime).toMatch(/\d+(-\d+)?\s*(секунд|минут)/);
      });
    });

    it('should assess appropriate difficulty for different step types', () => {
      const instructions = generator.generateInstructions('vektor');
      const steps = instructions?.steps || [];
      
      steps.forEach(step => {
        expect(['easy', 'medium', 'hard']).toContain(step.difficulty);
      });
    });
  });

  describe('Error handling', () => {
    it('should handle errors gracefully in generateInstructions', () => {
      // Test with various invalid inputs
      expect(generator.generateInstructions('')).toBeNull();
      expect(generator.generateInstructions('   ')).toBeNull();
      expect(generator.generateInstructions('123')).toBeNull();
    });
  });

  describe('Bot-specific validations', () => {
    it('should have correct encrypted names for all bots', () => {
      const expectedNames = {
        'dyxless': 'Бот A',
        'itp': 'Бот B',
        'leak_osint': 'Бот C',
        'userbox': 'Бот D',
        'vektor': 'Бот E'
      };

      Object.entries(expectedNames).forEach(([botId, expectedName]) => {
        const instructions = generator.generateInstructions(botId);
        expect(instructions?.encryptedName).toBe(expectedName);
      });
    });

    it('should have proper Telegram handles for all bots', () => {
      const expectedHandles = {
        'dyxless': '@dyxless_bot',
        'itp': '@infotrackpeople_bot',
        'leak_osint': '@leakosint_bot',
        'userbox': '@userbox_bot',
        'vektor': '@vektor_search_bot'
      };

      Object.entries(expectedHandles).forEach(([botId, expectedHandle]) => {
        const template = generator.getBotTemplate(botId);
        expect(template?.telegramHandle).toBe(expectedHandle);
      });
    });

    it('should have GDPR compliance flags set correctly', () => {
      const gdprCompliantBots = ['itp', 'leak_osint', 'vektor'];
      const nonGdprBots = ['dyxless', 'userbox'];

      gdprCompliantBots.forEach(botId => {
        const template = generator.getBotTemplate(botId);
        expect(template?.gdprCompliant).toBe(true);
      });

      nonGdprBots.forEach(botId => {
        const template = generator.getBotTemplate(botId);
        expect(template?.gdprCompliant).toBe(false);
      });
    });
  });
});