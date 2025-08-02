/**
 * Results Display Component
 * Displays search results grouped by bots with removal options
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';
import { SearchResults, SearchResult, FoundDataItem } from '../../types/api';
import { formatDate, formatRelativeTime, getSearchTypeLabel } from '../../utils/helpers';
import './ResultsDisplay.css';

interface ResultsDisplayProps {
  results: SearchResults;
  onRetry?: () => void;
  className?: string;
}

interface GroupedResults {
  withData: SearchResult[];
  withoutData: SearchResult[];
  withErrors: SearchResult[];
}

export function ResultsDisplay({ results, onRetry, className = '' }: ResultsDisplayProps) {
  const navigate = useNavigate();
  const { addNotification } = useAppContext();
  
  // Local state for UI interactions
  const [expandedBots, setExpandedBots] = useState<Set<string>>(new Set());
  const [selectedBots, setSelectedBots] = useState<Set<string>>(new Set());
  const [showAllBots, setShowAllBots] = useState(false);

  // Group results by data availability
  const groupedResults: GroupedResults = useMemo(() => {
    return results.results.reduce(
      (acc, result) => {
        if (result.status === 'error') {
          acc.withErrors.push(result);
        } else if (result.hasData) {
          acc.withData.push(result);
        } else {
          acc.withoutData.push(result);
        }
        return acc;
      },
      { withData: [], withoutData: [], withErrors: [] } as GroupedResults
    );
  }, [results.results]);

  // Toggle bot expansion
  const toggleBotExpansion = useCallback((botId: string) => {
    setExpandedBots(prev => {
      const newSet = new Set(prev);
      if (newSet.has(botId)) {
        newSet.delete(botId);
      } else {
        newSet.add(botId);
      }
      return newSet;
    });
  }, []);

  // Toggle bot selection for bulk actions
  const toggleBotSelection = useCallback((botId: string) => {
    setSelectedBots(prev => {
      const newSet = new Set(prev);
      if (newSet.has(botId)) {
        newSet.delete(botId);
      } else {
        newSet.add(botId);
      }
      return newSet;
    });
  }, []);

  // Select all bots with data
  const selectAllBotsWithData = useCallback(() => {
    const botsWithData = groupedResults.withData.map(result => result.botId);
    setSelectedBots(new Set(botsWithData));
  }, [groupedResults.withData]);

  // Clear all selections
  const clearAllSelections = useCallback(() => {
    setSelectedBots(new Set());
  }, []);

  // Handle removal instructions navigation
  const handleGetInstructions = useCallback((botId: string) => {
    navigate(`/instructions/${botId}`);
    
    addNotification({
      type: 'info',
      title: 'Переход к инструкциям',
      message: `Открываем инструкции по удалению данных из ${results.results.find(r => r.botId === botId)?.botName}`,
      autoClose: true
    });
  }, [navigate, addNotification, results.results]);

  // Handle bulk instructions
  const handleBulkInstructions = useCallback(() => {
    if (selectedBots.size === 0) {
      addNotification({
        type: 'warning',
        title: 'Выберите боты',
        message: 'Выберите хотя бы один бот для получения инструкций',
        autoClose: true
      });
      return;
    }

    // For now, navigate to the first selected bot's instructions
    // In a real app, this could open a bulk instructions page
    const firstBotId = Array.from(selectedBots)[0];
    navigate(`/instructions/${firstBotId}?bulk=${Array.from(selectedBots).join(',')}`);
  }, [selectedBots, navigate, addNotification]);

  // Copy data to clipboard
  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addNotification({
        type: 'success',
        title: 'Скопировано',
        message: 'Данные скопированы в буфер обмена',
        autoClose: true
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Ошибка копирования',
        message: 'Не удалось скопировать данные',
        autoClose: true
      });
    }
  }, [addNotification]);

  // Render data field
  const renderDataField = useCallback((field: FoundDataItem, botId: string) => {
    const fieldId = `${botId}-${field.field}`;
    
    return (
      <div key={fieldId} className="data-field">
        <div className="data-field-header">
          <span className="data-field-name">{field.field}</span>
          {field.confidence && (
            <span className={`confidence-badge confidence-${Math.floor(field.confidence * 100 / 25)}`}>
              {Math.round(field.confidence * 100)}%
            </span>
          )}
        </div>
        <div className="data-field-content">
          <span className="data-field-value">{field.value}</span>
          <button
            className="copy-button"
            onClick={() => copyToClipboard(field.value)}
            title="Скопировать значение"
          >
            📋
          </button>
        </div>
        {field.source && (
          <div className="data-field-source">
            Источник: {field.source}
          </div>
        )}
      </div>
    );
  }, [copyToClipboard]);

  // Render bot result card
  const renderBotResult = useCallback((result: SearchResult) => {
    const isExpanded = expandedBots.has(result.botId);
    const isSelected = selectedBots.has(result.botId);
    const hasData = result.hasData && result.foundData.length > 0;

    return (
      <div key={result.botId} className={`bot-result ${result.status} ${isSelected ? 'selected' : ''}`}>
        <div className="bot-result-header">
          <div className="bot-info">
            <div className="bot-selection">
              {hasData && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleBotSelection(result.botId)}
                  className="bot-checkbox"
                  aria-label={`Выбрать ${result.botName}`}
                />
              )}
            </div>
            
            <div className="bot-identity">
              <h3 className="bot-name">{result.botName}</h3>
              <div className="bot-status">
                <span className={`status-indicator status-${result.status}`}>
                  {result.status === 'success' && hasData && '✅ Данные найдены'}
                  {result.status === 'success' && !hasData && '❌ Данные не найдены'}
                  {result.status === 'no_data' && '❌ Данные не найдены'}
                  {result.status === 'error' && '⚠️ Ошибка поиска'}
                  {result.status === 'timeout' && '⏱️ Превышено время ожидания'}
                  {result.status === 'circuit_open' && '🔌 Сервис недоступен'}
                </span>
              </div>
            </div>
          </div>

          <div className="bot-actions">
            {hasData && (
              <>
                <button
                  className="btn btn-primary btn-small"
                  onClick={() => handleGetInstructions(result.botId)}
                >
                  🗑️ Удалить
                </button>
                
                {result.foundData.length > 1 && (
                  <button
                    className="btn btn-secondary btn-small"
                    onClick={() => toggleBotExpansion(result.botId)}
                  >
                    {isExpanded ? '▲ Свернуть' : `▼ Показать все (${result.foundData.length})`}
                  </button>
                )}
              </>
            )}
            
            {result.status === 'error' && onRetry && (
              <button
                className="btn btn-secondary btn-small"
                onClick={onRetry}
              >
                🔄 Повторить
              </button>
            )}
          </div>
        </div>

        {/* Data Display */}
        {hasData && (
          <div className="bot-data">
            <div className="data-summary">
              Найдено записей: <strong>{result.foundData.length}</strong>
            </div>
            
            <div className="data-fields">
              {(isExpanded ? result.foundData : result.foundData.slice(0, 3)).map(field =>
                renderDataField(field, result.botId)
              )}
              
              {!isExpanded && result.foundData.length > 3 && (
                <div className="data-field-more">
                  <button
                    className="btn-link"
                    onClick={() => toggleBotExpansion(result.botId)}
                  >
                    Показать еще {result.foundData.length - 3} записей...
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error Display */}
        {result.status === 'error' && result.errorMessage && (
          <div className="bot-error">
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {result.errorMessage}
            </div>
          </div>
        )}
      </div>
    );
  }, [
    expandedBots,
    selectedBots,
    toggleBotExpansion,
    toggleBotSelection,
    handleGetInstructions,
    onRetry,
    renderDataField
  ]);

  return (
    <div className={`results-display ${className}`}>
      {/* Results Header */}
      <div className="results-header">
        <div className="results-summary">
          <h2>Результаты поиска</h2>
          <div className="search-info">
            <div className="search-query">
              Поиск по {getSearchTypeLabel(results.searchType).toLowerCase()}: 
              <span className="query-value">{results.query}</span>
            </div>
            <div className="search-meta">
              <span className="search-time">
                {formatRelativeTime(results.timestamp)}
              </span>
              <span className="search-duration">
                Время поиска: {(results.searchDuration / 1000).toFixed(1)}с
              </span>
              {results.isDegraded && (
                <span className="degraded-notice">
                  ⚠️ Ограниченный режим
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="results-stats">
          <div className="stat-item">
            <span className="stat-value">{results.totalBotsSearched}</span>
            <span className="stat-label">Ботов проверено</span>
          </div>
          <div className="stat-item success">
            <span className="stat-value">{results.totalBotsWithData}</span>
            <span className="stat-label">Нашли данные</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{results.totalRecords}</span>
            <span className="stat-label">Всего записей</span>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {groupedResults.withData.length > 0 && (
        <div className="bulk-actions">
          <div className="bulk-selection">
            <button
              className="btn-link"
              onClick={selectAllBotsWithData}
              disabled={selectedBots.size === groupedResults.withData.length}
            >
              Выбрать все ({groupedResults.withData.length})
            </button>
            {selectedBots.size > 0 && (
              <button
                className="btn-link"
                onClick={clearAllSelections}
              >
                Снять выделение
              </button>
            )}
          </div>

          {selectedBots.size > 0 && (
            <div className="bulk-actions-buttons">
              <span className="selected-count">
                Выбрано: {selectedBots.size}
              </span>
              <button
                className="btn btn-primary"
                onClick={handleBulkInstructions}
              >
                🗑️ Получить инструкции для выбранных
              </button>
            </div>
          )}
        </div>
      )}

      {/* Results Content */}
      <div className="results-content">
        {/* Bots with Data */}
        {groupedResults.withData.length > 0 && (
          <div className="results-section">
            <h3 className="section-title success">
              ✅ Боты с найденными данными ({groupedResults.withData.length})
            </h3>
            <div className="results-grid">
              {groupedResults.withData.map(renderBotResult)}
            </div>
          </div>
        )}

        {/* Bots with Errors */}
        {groupedResults.withErrors.length > 0 && (
          <div className="results-section">
            <h3 className="section-title error">
              ⚠️ Боты с ошибками ({groupedResults.withErrors.length})
            </h3>
            <div className="results-grid">
              {groupedResults.withErrors.map(renderBotResult)}
            </div>
          </div>
        )}

        {/* Bots without Data */}
        {groupedResults.withoutData.length > 0 && (
          <div className="results-section">
            <div className="section-header">
              <h3 className="section-title neutral">
                ❌ Боты без данных ({groupedResults.withoutData.length})
              </h3>
              <button
                className="btn-link"
                onClick={() => setShowAllBots(!showAllBots)}
              >
                {showAllBots ? 'Скрыть' : 'Показать все'}
              </button>
            </div>
            
            {showAllBots && (
              <div className="results-grid">
                {groupedResults.withoutData.map(renderBotResult)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* No Results */}
      {results.totalBotsWithData === 0 && groupedResults.withErrors.length === 0 && (
        <div className="no-results">
          <div className="no-results-icon">🎉</div>
          <h3>Отличные новости!</h3>
          <p>
            Ваши данные не найдены ни в одном из проверенных ботов. 
            Это означает, что ваша информация не была скомпрометирована.
          </p>
          <div className="no-results-actions">
            <Link to="/" className="btn btn-primary">
              Выполнить новый поиск
            </Link>
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="results-footer">
        <div className="footer-info">
          <p>
            <strong>Важно:</strong> Данные отображаются в зашифрованном виде для защиты конфиденциальности. 
            Названия ботов заменены на условные обозначения.
          </p>
          {results.encryptionEnabled && (
            <p className="encryption-notice">
              🔒 Шифрование включено
            </p>
          )}
        </div>

        <div className="footer-actions">
          <Link to="/" className="btn btn-secondary">
            ← Новый поиск
          </Link>
          
          {results.totalBotsWithData > 0 && (
            <button
              className="btn btn-primary"
              onClick={() => {
                const botsWithData = groupedResults.withData.map(r => r.botId);
                navigate(`/instructions/${botsWithData[0]}?bulk=${botsWithData.join(',')}`);
              }}
            >
              Получить все инструкции →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}