/**
 * Instruction Generator Service
 * Generates removal instructions for different bots with encrypted names
 */

import { logger } from '../utils/logger';

export interface InstructionStep {
  stepNumber: number;
  description: string;
  action?: string;
  screenshot?: string;
  estimatedTime?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface DeletionInstruction {
  botId: string;
  botName: string;
  encryptedName: string;
  steps: InstructionStep[];
  additionalInfo?: string;
  estimatedTime: string;
  difficulty: string;
  lastUpdated: string;
  version: string;
}

export interface BotTemplate {
  botName: string;
  encryptedName: string;
  telegramHandle: string;
  steps: string[];
  additionalInfo?: string;
  estimatedTime: string;
  difficulty: string;
  category: 'telegram_bot' | 'web_service' | 'api_service';
  gdprCompliant: boolean;
}

export class InstructionGenerator {
  private static instance: InstructionGenerator;
  private botTemplates: Map<string, BotTemplate>;

  private constructor() {
    this.botTemplates = new Map();
    this.initializeBotTemplates();
  }

  public static getInstance(): InstructionGenerator {
    if (!InstructionGenerator.instance) {
      InstructionGenerator.instance = new InstructionGenerator();
    }
    return InstructionGenerator.instance;
  }

  /**
   * Initialize bot templates with encrypted names and detailed instructions
   */
  private initializeBotTemplates(): void {
    // Try to load from config file first, fallback to hardcoded templates
    let templates: Record<string, BotTemplate>;
    
    try {
      const configPath = require('path').join(__dirname, '../config/bot-templates.json');
      const config = require(configPath);
      templates = config.bots;
      logger.info('Loaded bot templates from config file', { 
        version: config.version,
        totalBots: Object.keys(templates).length 
      });
    } catch (error) {
      logger.warn('Failed to load bot templates from config, using hardcoded templates', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      templates = this.getHardcodedTemplates();
    }

    // Initialize the templates map
    Object.entries(templates).forEach(([botId, template]) => {
      this.botTemplates.set(botId, template);
      logger.info('Initialized instruction template', { 
        botId, 
        encryptedName: template.encryptedName,
        stepsCount: template.steps.length 
      });
    });

    logger.info('Instruction generator initialized', { 
      totalTemplates: this.botTemplates.size 
    });
  }

  /**
   * Get hardcoded templates as fallback
   */
  private getHardcodedTemplates(): Record<string, BotTemplate> {
    return {
      dyxless: {
        botName: 'Dyxless',
        encryptedName: 'Бот A',
        telegramHandle: '@dyxless_bot',
        category: 'telegram_bot',
        gdprCompliant: false,
        estimatedTime: '5-10 минут',
        difficulty: 'Легко',
        steps: [
          'Откройте приложение Telegram на вашем устройстве',
          'В поиске найдите бота @dyxless_bot или перейдите по ссылке t.me/dyxless_bot',
          'Нажмите кнопку "Запустить" или отправьте команду /start',
          'В главном меню найдите опцию "Удалить мои данные" или отправьте команду /delete',
          'Подтвердите свою личность, предоставив запрашиваемую информацию (номер телефона или email)',
          'Выберите типы данных, которые необходимо удалить (телефон, email, документы)',
          'Подтвердите запрос на удаление, нажав соответствующую кнопку',
          'Дождитесь подтверждения от бота и сохраните номер заявки для отслеживания статуса'
        ],
        additionalInfo: 'Обработка запроса может занять до 24 часов. Вы получите уведомление о завершении процесса удаления. После удаления восстановление данных будет невозможно.'
      },
      itp: {
        botName: 'InfoTrackPeople',
        encryptedName: 'Бот B',
        telegramHandle: '@infotrackpeople_bot',
        category: 'telegram_bot',
        gdprCompliant: true,
        estimatedTime: '7-12 минут',
        difficulty: 'Легко',
        steps: [
          'Откройте Telegram и найдите бота @infotrackpeople_bot',
          'Нажмите "Старт" или отправьте команду /start для активации бота',
          'В главном меню выберите раздел "Управление данными" или "Настройки профиля"',
          'Найдите и нажмите опцию "Запросить удаление данных" или "Удалить профиль"',
          'Введите данные, которые необходимо удалить (телефон, email, ИНН, СНИЛС, паспорт)',
          'Выберите причину удаления из предложенного списка',
          'Подтвердите запрос, введя код подтверждения, который придет на ваш телефон',
          'Дождитесь обработки запроса и получите номер заявки'
        ],
        additionalInfo: 'Для подтверждения личности может потребоваться дополнительная верификация через SMS или email. Процесс удаления занимает 1-3 рабочих дня.'
      },
      leak_osint: {
        botName: 'LeakOsint',
        encryptedName: 'Бот C',
        telegramHandle: '@leakosint_bot',
        category: 'telegram_bot',
        gdprCompliant: true,
        estimatedTime: '5-8 минут',
        difficulty: 'Легко',
        steps: [
          'Найдите в Telegram бота @leakosint_bot и откройте чат',
          'Запустите бота командой /start',
          'Отправьте команду /privacy для доступа к настройкам приватности',
          'В меню приватности выберите "Удалить персональные данные"',
          'Укажите тип данных для удаления: телефон, email, документы или все сразу',
          'Подтвердите свою личность, предоставив один из документов',
          'Выберите причину удаления (по желанию)',
          'Подтвердите операцию и получите номер заявки на удаление'
        ],
        additionalInfo: 'Удаление данных происходит в течение 48 часов с момента подтверждения заявки. Бот работает в соответствии с требованиями GDPR.'
      },
      userbox: {
        botName: 'Userbox',
        encryptedName: 'Бот D',
        telegramHandle: '@userbox_bot',
        category: 'telegram_bot',
        gdprCompliant: false,
        estimatedTime: '10-15 минут',
        difficulty: 'Средне',
        steps: [
          'Откройте Telegram и перейдите к боту @userbox_bot',
          'Отправьте команду /start для активации бота',
          'В главном меню выберите "Настройки аккаунта" или отправьте /settings',
          'Найдите раздел "Управление данными" и нажмите на него',
          'Выберите опцию "Удаление данных" или "Закрыть аккаунт"',
          'Выберите категории данных для удаления (личные данные, история поиска, кэш)',
          'Подтвердите удаление, введя пароль или код подтверждения',
          'Дождитесь обработки и сохраните ID заявки для отслеживания'
        ],
        additionalInfo: 'После подтверждения удаления восстановление данных будет невозможно. Процесс может занять до 7 рабочих дней.'
      },
      vektor: {
        botName: 'Vektor',
        encryptedName: 'Бот E',
        telegramHandle: '@vektor_search_bot',
        category: 'telegram_bot',
        gdprCompliant: true,
        estimatedTime: '8-12 минут',
        difficulty: 'Легко',
        steps: [
          'В Telegram найдите и откройте бота @vektor_search_bot',
          'Активируйте бота командой /start',
          'Отправьте команду /gdpr для доступа к правам на данные',
          'В меню GDPR выберите "Право на забвение" (Right to be forgotten)',
          'Укажите персональные данные, подлежащие удалению',
          'Выберите основание для удаления согласно GDPR',
          'Подтвердите запрос цифровой подписью или SMS-кодом',
          'Дождитесь подтверждения и номера заявки на удаление'
        ],
        additionalInfo: 'Согласно GDPR, обработка запроса займет не более 30 дней. Вы получите уведомление о статусе обработки на каждом этапе.'
      }
    };
  }

  /**
   * Generate instructions for a specific bot
   */
  public generateInstructions(botId: string): DeletionInstruction | null {
    try {
      const template = this.botTemplates.get(botId.toLowerCase());
      
      if (!template) {
        logger.warn('Template not found for bot', { botId });
        return null;
      }

      // Convert template steps to instruction steps
      const instructionSteps: InstructionStep[] = template.steps.map((step, index) => ({
        stepNumber: index + 1,
        description: step,
        action: this.generateActionForStep(step),
        estimatedTime: this.estimateStepTime(step),
        difficulty: this.assessStepDifficulty(step)
      }));

      const instructions: DeletionInstruction = {
        botId,
        botName: template.botName,
        encryptedName: template.encryptedName,
        steps: instructionSteps,
        additionalInfo: template.additionalInfo,
        estimatedTime: template.estimatedTime,
        difficulty: template.difficulty,
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      };

      logger.info('Generated instructions', { 
        botId, 
        encryptedName: template.encryptedName,
        stepsCount: instructionSteps.length 
      });

      return instructions;
    } catch (error) {
      logger.error('Failed to generate instructions', { 
        botId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return null;
    }
  }

  /**
   * Get instructions by botId (alias for generateInstructions)
   */
  public getInstructionsByBotId(botId: string): DeletionInstruction | null {
    return this.generateInstructions(botId);
  }

  /**
   * Get all available bots with their encrypted names
   */
  public getAvailableBots(): Array<{
    botId: string;
    encryptedName: string;
    stepsCount: number;
    hasAdditionalInfo: boolean;
    estimatedTime: string;
    difficulty: string;
    gdprCompliant: boolean;
  }> {
    const bots: Array<{
      botId: string;
      encryptedName: string;
      stepsCount: number;
      hasAdditionalInfo: boolean;
      estimatedTime: string;
      difficulty: string;
      gdprCompliant: boolean;
    }> = [];

    this.botTemplates.forEach((template, botId) => {
      bots.push({
        botId,
        encryptedName: template.encryptedName,
        stepsCount: template.steps.length,
        hasAdditionalInfo: !!template.additionalInfo,
        estimatedTime: template.estimatedTime,
        difficulty: template.difficulty,
        gdprCompliant: template.gdprCompliant
      });
    });

    return bots.sort((a, b) => a.encryptedName.localeCompare(b.encryptedName));
  }

  /**
   * Update bot template (for future extensibility)
   */
  public updateBotTemplate(botId: string, template: Partial<BotTemplate>): boolean {
    try {
      const existingTemplate = this.botTemplates.get(botId.toLowerCase());
      
      if (!existingTemplate) {
        logger.warn('Cannot update non-existent template', { botId });
        return false;
      }

      const updatedTemplate: BotTemplate = {
        ...existingTemplate,
        ...template
      };

      this.botTemplates.set(botId.toLowerCase(), updatedTemplate);
      
      logger.info('Updated bot template', { 
        botId, 
        encryptedName: updatedTemplate.encryptedName 
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to update bot template', { 
        botId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }

  /**
   * Generate action hint for a step
   */
  private generateActionForStep(step: string): string {
    const stepLower = step.toLowerCase();
    
    if (stepLower.includes('откройте') || stepLower.includes('найдите')) {
      return 'navigate';
    } else if (stepLower.includes('нажмите') || stepLower.includes('выберите')) {
      return 'click';
    } else if (stepLower.includes('отправьте') || stepLower.includes('введите')) {
      return 'input';
    } else if (stepLower.includes('подтвердите')) {
      return 'confirm';
    } else if (stepLower.includes('дождитесь')) {
      return 'wait';
    }
    
    return 'action';
  }

  /**
   * Estimate time for individual step
   */
  private estimateStepTime(step: string): string {
    const stepLower = step.toLowerCase();
    
    if (stepLower.includes('дождитесь') || stepLower.includes('обработка')) {
      return '1-5 минут';
    } else if (stepLower.includes('подтвердите') || stepLower.includes('код')) {
      return '2-3 минуты';
    } else if (stepLower.includes('найдите') || stepLower.includes('откройте')) {
      return '30-60 секунд';
    }
    
    return '1-2 минуты';
  }

  /**
   * Assess difficulty of individual step
   */
  private assessStepDifficulty(step: string): 'easy' | 'medium' | 'hard' {
    const stepLower = step.toLowerCase();
    
    if (stepLower.includes('код') || stepLower.includes('подпись') || stepLower.includes('верификация')) {
      return 'medium';
    } else if (stepLower.includes('документ') || stepLower.includes('паспорт')) {
      return 'hard';
    }
    
    return 'easy';
  }

  /**
   * Get bot template by ID (for testing/debugging)
   */
  public getBotTemplate(botId: string): BotTemplate | null {
    return this.botTemplates.get(botId.toLowerCase()) || null;
  }

  /**
   * Check if bot exists
   */
  public hasBotTemplate(botId: string): boolean {
    return this.botTemplates.has(botId.toLowerCase());
  }

  /**
   * Get total number of available bots
   */
  public getTotalBotsCount(): number {
    return this.botTemplates.size;
  }
}

// Export singleton instance
export const instructionGenerator = InstructionGenerator.getInstance();