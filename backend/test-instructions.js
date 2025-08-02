/**
 * Simple test script to verify instructions API functionality
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Bot instruction templates (same as in TypeScript version)
const instructionTemplates = {
  dyxless: {
    botName: 'Dyxless',
    encryptedName: 'Бот A',
    steps: [
      'Откройте Telegram и найдите бота @dyxless_bot',
      'Отправьте команду /start для начала работы с ботом',
      'Выберите опцию "Удалить мои данные" или отправьте команду /delete',
      'Подтвердите свою личность, предоставив запрашиваемую информацию',
      'Дождитесь подтверждения удаления данных от бота',
      'Сохраните номер заявки для отслеживания статуса'
    ],
    additionalInfo: 'Обработка запроса может занять до 24 часов. Вы получите уведомление о завершении процесса.'
  },
  itp: {
    botName: 'InfoTrackPeople',
    encryptedName: 'Бот B',
    steps: [
      'Перейдите в Telegram и найдите бота @infotrackpeople_bot',
      'Нажмите "Старт" или отправьте команду /start',
      'В главном меню выберите "Управление данными"',
      'Нажмите "Запросить удаление данных"',
      'Введите данные, которые необходимо удалить',
      'Подтвердите запрос и дождитесь обработки'
    ],
    additionalInfo: 'Для подтверждения личности может потребоваться дополнительная верификация.'
  },
  leak_osint: {
    botName: 'LeakOsint',
    encryptedName: 'Бот C',
    steps: [
      'Найдите в Telegram бота @leakosint_bot',
      'Запустите бота командой /start',
      'Отправьте команду /privacy для доступа к настройкам приватности',
      'Выберите "Удалить персональные данные"',
      'Укажите тип данных для удаления (телефон, email, документы)',
      'Подтвердите операцию и получите номер заявки'
    ],
    additionalInfo: 'Удаление данных происходит в течение 48 часов с момента подтверждения заявки.'
  },
  userbox: {
    botName: 'Userbox',
    encryptedName: 'Бот D',
    steps: [
      'Откройте Telegram и перейдите к боту @userbox_bot',
      'Отправьте /start для активации бота',
      'В меню выберите "Настройки аккаунта"',
      'Нажмите "Удаление данных"',
      'Выберите категории данных для удаления',
      'Подтвердите удаление и сохраните ID заявки'
    ],
    additionalInfo: 'После подтверждения удаления восстановление данных будет невозможно.'
  },
  vektor: {
    botName: 'Vektor',
    encryptedName: 'Бот E',
    steps: [
      'В Telegram найдите и откройте бота @vektor_search_bot',
      'Активируйте бота командой /start',
      'Отправьте команду /gdpr для доступа к правам на данные',
      'Выберите "Право на забвение"',
      'Укажите персональные данные, подлежащие удалению',
      'Дождитесь подтверждения и номера заявки на удаление'
    ],
    additionalInfo: 'Согласно GDPR, обработка запроса займет не более 30 дней.'
  }
};

// Instructions routes
app.get('/api/instructions/:botId', (req, res) => {
  try {
    const { botId } = req.params;
    
    console.log('Instructions requested for bot:', botId);

    // Validate botId
    if (!botId || typeof botId !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Bot ID is required',
          code: 400,
          type: 'VALIDATION_ERROR'
        }
      });
    }

    // Get instructions for the bot
    const instructions = instructionTemplates[botId.toLowerCase()];
    
    if (!instructions) {
      console.log('Instructions not found for bot:', botId);
      
      return res.status(404).json({
        success: false,
        error: {
          message: `Instructions not found for bot: ${botId}`,
          code: 404,
          type: 'NOT_FOUND_ERROR'
        }
      });
    }

    // Return instructions with encrypted bot name
    const response = {
      botId,
      botName: instructions.encryptedName, // Use encrypted name for privacy
      instructions: {
        title: `Инструкция по удалению данных из ${instructions.encryptedName}`,
        steps: instructions.steps,
        additionalInfo: instructions.additionalInfo,
        estimatedTime: '5-10 минут',
        difficulty: 'Легко'
      },
      meta: {
        lastUpdated: '2024-01-01T00:00:00Z',
        version: '1.0'
      }
    };

    console.log('Instructions provided for:', instructions.encryptedName);

    res.status(200).json({
      success: true,
      data: response,
      meta: {
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Failed to get instructions:', error.message);

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

app.get('/api/instructions', (req, res) => {
  try {
    console.log('All instructions list requested');

    const botsList = Object.entries(instructionTemplates).map(([botId, template]) => ({
      botId,
      encryptedName: template.encryptedName,
      stepsCount: template.steps.length,
      hasAdditionalInfo: !!template.additionalInfo
    }));

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
    console.error('Failed to get instructions list:', error.message);

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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'instructions-test' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Instructions test server running on port ${PORT}`);
  console.log(`Test endpoints:`);
  console.log(`- GET http://localhost:${PORT}/api/instructions`);
  console.log(`- GET http://localhost:${PORT}/api/instructions/dyxless`);
  console.log(`- GET http://localhost:${PORT}/api/instructions/itp`);
  console.log(`- GET http://localhost:${PORT}/health`);
});