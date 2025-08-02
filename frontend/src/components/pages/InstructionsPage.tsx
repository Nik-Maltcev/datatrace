/**
 * Instructions Page Component
 * Displays step-by-step removal instructions for a specific bot
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';
import { useInstructions } from '../../hooks/useApi';
import { BotInstructions } from '../../types/api';
import { formatDate } from '../../utils/helpers';
import './InstructionsPage.css';

interface StepProps {
  step: string;
  index: number;
  isCompleted: boolean;
  onToggleComplete: (index: number) => void;
}

function InstructionStep({ step, index, isCompleted, onToggleComplete }: StepProps) {
  return (
    <div className={`instruction-step ${isCompleted ? 'completed' : ''}`}>
      <div className="step-header">
        <div className="step-number">
          {isCompleted ? '✅' : index + 1}
        </div>
        <div className="step-content">
          <p className="step-text">{step}</p>
        </div>
        <div className="step-actions">
          <button
            className={`step-toggle ${isCompleted ? 'completed' : ''}`}
            onClick={() => onToggleComplete(index)}
            aria-label={isCompleted ? 'Отметить как невыполненное' : 'Отметить как выполненное'}
          >
            {isCompleted ? 'Отменить' : 'Выполнено'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function InstructionsPage() {
  const { botId } = useParams<{ botId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addNotification } = useAppContext();
  
  // Get instructions for the specific bot
  const { instructions, loading, error, refetch } = useInstructions(botId);
  
  // Local state for tracking completion
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [showAllSteps, setShowAllSteps] = useState(false);
  const [isBulkMode, setBulkMode] = useState(false);
  const [bulkBots, setBulkBots] = useState<string[]>([]);

  // Check if this is bulk mode (multiple bots)
  useEffect(() => {
    const bulk = searchParams.get('bulk');
    if (bulk) {
      setBulkMode(true);
      setBulkBots(bulk.split(','));
    }
  }, [searchParams]);

  // Toggle step completion
  const toggleStepCompletion = useCallback((stepIndex: number) => {
    setCompletedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepIndex)) {
        newSet.delete(stepIndex);
      } else {
        newSet.add(stepIndex);
      }
      return newSet;
    });
  }, []);

  // Mark all steps as completed
  const markAllCompleted = useCallback(() => {
    if (!instructions) return;
    
    const allSteps = new Set(instructions.instructions.steps.map((_, index) => index));
    setCompletedSteps(allSteps);
    
    addNotification({
      type: 'success',
      title: 'Все шаги отмечены',
      message: 'Все инструкции отмечены как выполненные',
      autoClose: true
    });
  }, [instructions, addNotification]);

  // Clear all completions
  const clearAllCompleted = useCallback(() => {
    setCompletedSteps(new Set());
    
    addNotification({
      type: 'info',
      title: 'Отметки сброшены',
      message: 'Все отметки о выполнении сброшены',
      autoClose: true
    });
  }, [addNotification]);

  // Copy instructions to clipboard
  const copyInstructions = useCallback(async () => {
    if (!instructions) return;

    const text = [
      `Инструкции по удалению данных из ${instructions.botName}`,
      '',
      ...instructions.instructions.steps.map((step, index) => `${index + 1}. ${step}`),
      '',
      instructions.instructions.additionalInfo ? `Дополнительная информация: ${instructions.instructions.additionalInfo}` : '',
      `Время выполнения: ${instructions.instructions.estimatedTime}`,
      `Сложность: ${instructions.instructions.difficulty}`
    ].filter(Boolean).join('\n');

    try {
      await navigator.clipboard.writeText(text);
      addNotification({
        type: 'success',
        title: 'Инструкции скопированы',
        message: 'Инструкции скопированы в буфер обмена',
        autoClose: true
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Ошибка копирования',
        message: 'Не удалось скопировать инструкции',
        autoClose: true
      });
    }
  }, [instructions, addNotification]);

  // Handle navigation back to results
  const handleBackToResults = useCallback(() => {
    navigate('/results');
  }, [navigate]);

  // Loading state
  if (loading) {
    return (
      <div className="instructions-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h2>Загружаем инструкции...</h2>
          <p>Подготавливаем пошаговые инструкции по удалению данных</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="instructions-page">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h2>Ошибка загрузки инструкций</h2>
          <p className="error-message">{error}</p>
          <div className="error-actions">
            <button onClick={refetch} className="btn btn-primary">
              🔄 Попробовать снова
            </button>
            <button onClick={handleBackToResults} className="btn btn-secondary">
              ← Вернуться к результатам
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No instructions found
  if (!instructions) {
    return (
      <div className="instructions-page">
        <div className="no-instructions-container">
          <div className="no-instructions-icon">📋</div>
          <h2>Инструкции не найдены</h2>
          <p>Инструкции для бота {botId} не найдены или временно недоступны</p>
          <div className="no-instructions-actions">
            <button onClick={handleBackToResults} className="btn btn-primary">
              ← Вернуться к результатам
            </button>
          </div>
        </div>
      </div>
    );
  }

  const completionPercentage = Math.round((completedSteps.size / instructions.instructions.steps.length) * 100);
  const isAllCompleted = completedSteps.size === instructions.instructions.steps.length;

  return (
    <div className="instructions-page">
      {/* Header */}
      <div className="instructions-header">
        <div className="header-content">
          <div className="breadcrumb">
            <Link to="/results" className="breadcrumb-link">
              Результаты поиска
            </Link>
            <span className="breadcrumb-separator">→</span>
            <span className="breadcrumb-current">Инструкции</span>
          </div>

          <h1 className="page-title">
            {instructions.instructions.title}
          </h1>

          {isBulkMode && (
            <div className="bulk-mode-notice">
              <span className="bulk-icon">📦</span>
              Массовое удаление для {bulkBots.length} ботов
            </div>
          )}

          <div className="bot-info">
            <div className="bot-name-badge">
              {instructions.botName}
            </div>
            <div className="instruction-meta">
              <span className="meta-item">
                ⏱️ {instructions.instructions.estimatedTime}
              </span>
              <span className="meta-item">
                📊 {instructions.instructions.difficulty}
              </span>
              <span className="meta-item">
                📝 {instructions.instructions.steps.length} шагов
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="progress-section">
          <div className="progress-header">
            <span className="progress-label">
              Прогресс выполнения: {completedSteps.size} из {instructions.instructions.steps.length}
            </span>
            <span className="progress-percentage">
              {completionPercentage}%
            </span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          {isAllCompleted && (
            <div className="completion-message">
              🎉 Все шаги выполнены! Ваши данные должны быть удалены.
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="header-actions">
          <button
            onClick={copyInstructions}
            className="btn btn-secondary"
            title="Скопировать инструкции"
          >
            📋 Копировать
          </button>
          
          {completedSteps.size > 0 ? (
            <button
              onClick={clearAllCompleted}
              className="btn btn-secondary"
            >
              ↩️ Сбросить отметки
            </button>
          ) : (
            <button
              onClick={markAllCompleted}
              className="btn btn-secondary"
            >
              ✅ Отметить все
            </button>
          )}

          <button
            onClick={handleBackToResults}
            className="btn btn-primary"
          >
            ← К результатам
          </button>
        </div>
      </div>

      {/* Instructions Content */}
      <div className="instructions-content">
        <div className="instructions-container">
          {/* Important Notice */}
          <div className="important-notice">
            <div className="notice-icon">⚠️</div>
            <div className="notice-content">
              <h3>Важная информация</h3>
              <ul>
                <li>Следуйте инструкциям точно в указанном порядке</li>
                <li>Сохраните номера заявок для отслеживания статуса</li>
                <li>Процесс удаления может занять от нескольких часов до нескольких дней</li>
                <li>После удаления восстановление данных будет невозможно</li>
              </ul>
            </div>
          </div>

          {/* Steps */}
          <div className="steps-container">
            <h2 className="steps-title">Пошаговые инструкции</h2>
            
            <div className="steps-list">
              {instructions.instructions.steps.map((step, index) => (
                <InstructionStep
                  key={index}
                  step={step}
                  index={index}
                  isCompleted={completedSteps.has(index)}
                  onToggleComplete={toggleStepCompletion}
                />
              ))}
            </div>
          </div>

          {/* Additional Information */}
          {instructions.instructions.additionalInfo && (
            <div className="additional-info">
              <h3>Дополнительная информация</h3>
              <div className="info-content">
                <div className="info-icon">💡</div>
                <p>{instructions.instructions.additionalInfo}</p>
              </div>
            </div>
          )}

          {/* Support Section */}
          <div className="support-section">
            <h3>Нужна помощь?</h3>
            <div className="support-content">
              <div className="support-item">
                <div className="support-icon">❓</div>
                <div className="support-text">
                  <strong>Возникли вопросы?</strong>
                  <p>Если у вас возникли сложности с выполнением инструкций, обратитесь в техподдержку</p>
                </div>
              </div>
              <div className="support-item">
                <div className="support-icon">📞</div>
                <div className="support-text">
                  <strong>Контакты поддержки</strong>
                  <p>Email: support@example.com | Telegram: @support_bot</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bulk Mode Instructions */}
          {isBulkMode && (
            <div className="bulk-instructions">
              <h3>Массовое удаление</h3>
              <div className="bulk-content">
                <p>
                  Вы выбрали массовое удаление данных из {bulkBots.length} ботов. 
                  Повторите эти инструкции для каждого из следующих ботов:
                </p>
                <div className="bulk-bots-list">
                  {bulkBots.map((botId, index) => (
                    <div key={botId} className="bulk-bot-item">
                      <span className="bulk-bot-number">{index + 1}</span>
                      <span className="bulk-bot-name">Бот {String.fromCharCode(65 + index)}</span>
                      <Link 
                        to={`/instructions/${botId}`}
                        className="bulk-bot-link"
                      >
                        Открыть инструкции →
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="instructions-footer">
        <div className="footer-content">
          <div className="footer-info">
            <p>
              <strong>Последнее обновление:</strong> {formatDate(instructions.meta.lastUpdated)}
            </p>
            <p>
              <strong>Версия инструкций:</strong> {instructions.meta.version}
            </p>
          </div>
          
          <div className="footer-actions">
            <button
              onClick={handleBackToResults}
              className="btn btn-secondary"
            >
              ← Вернуться к результатам
            </button>
            
            {!isAllCompleted && (
              <button
                onClick={() => setShowAllSteps(!showAllSteps)}
                className="btn btn-secondary"
              >
                {showAllSteps ? 'Скрыть детали' : 'Показать все детали'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}