/**
 * Search Form Component
 * Main search form with validation and different search types
 */

import React, { useState, useCallback } from 'react';
import './SearchForm.css';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';
import { useSearch, useFormValidation } from '../../hooks/useApi';
import { SearchType } from '../../types/api';
import { 
  getSearchTypeLabel, 
  getSearchTypePlaceholder, 
  getSearchTypeDescription,
  formatSearchValue 
} from '../../utils/helpers';

interface SearchFormProps {
  onSearchStart?: () => void;
  onSearchComplete?: () => void;
  className?: string;
}

export function SearchForm({ onSearchStart, onSearchComplete, className = '' }: SearchFormProps) {
  const navigate = useNavigate();
  const { setSearchParams, addNotification } = useAppContext();
  const { search, loading, error } = useSearch();
  const { validateSearchValue } = useFormValidation();

  // Form state
  const [searchType, setSearchType] = useState<SearchType>('phone');
  const [searchValue, setSearchValue] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [selectedBots, setSelectedBots] = useState<string[]>([]);

  // Available search types
  const searchTypes: SearchType[] = ['phone', 'email', 'inn', 'snils', 'passport'];

  // Available bots for advanced search
  const availableBots = [
    { id: 'dyxless', name: 'Бот A', description: 'Быстрый поиск по базовым данным' },
    { id: 'itp', name: 'Бот B', description: 'Расширенный поиск по документам' },
    { id: 'leak_osint', name: 'Бот C', description: 'Поиск в утечках данных' },
    { id: 'userbox', name: 'Бот D', description: 'Поиск в социальных сетях' },
    { id: 'vektor', name: 'Бот E', description: 'Комплексный поиск' }
  ];

  // Handle search type change
  const handleSearchTypeChange = useCallback((type: SearchType) => {
    setSearchType(type);
    setSearchValue('');
    setValidationError(null);
  }, []);

  // Handle search value change with real-time validation
  const handleSearchValueChange = useCallback((value: string) => {
    setSearchValue(value);
    
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError(null);
    }
  }, [validationError]);

  // Handle bot selection for advanced mode
  const handleBotToggle = useCallback((botId: string) => {
    setSelectedBots(prev => 
      prev.includes(botId) 
        ? prev.filter(id => id !== botId)
        : [...prev, botId]
    );
  }, []);

  // Validate form before submission
  const validateForm = useCallback((): boolean => {
    const error = validateSearchValue(searchType, searchValue);
    if (error) {
      setValidationError(error);
      return false;
    }

    if (isAdvancedMode && selectedBots.length === 0) {
      setValidationError('Выберите хотя бы один бот для поиска');
      return false;
    }

    return true;
  }, [searchType, searchValue, isAdvancedMode, selectedBots, validateSearchValue]);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      onSearchStart?.();

      // Store search parameters in global state
      setSearchParams(searchType, searchValue);

      // Perform search
      const searchRequest = { type: searchType, value: searchValue.trim() };
      
      if (isAdvancedMode && selectedBots.length > 0) {
        // Search with specific bots
        await search(searchRequest);
      } else {
        // Search all bots
        await search(searchRequest);
      }

      // Navigate to results page
      navigate('/results');

      // Show success notification
      addNotification({
        type: 'info',
        title: 'Поиск запущен',
        message: `Выполняется поиск по ${getSearchTypeLabel(searchType).toLowerCase()}`,
        autoClose: true
      });

      onSearchComplete?.();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка при выполнении поиска';
      
      addNotification({
        type: 'error',
        title: 'Ошибка поиска',
        message: errorMessage,
        autoClose: false
      });
    }
  }, [
    validateForm, 
    onSearchStart, 
    setSearchParams, 
    searchType, 
    searchValue, 
    isAdvancedMode, 
    selectedBots, 
    search, 
    navigate, 
    addNotification, 
    onSearchComplete
  ]);

  // Handle example value insertion
  const handleExampleClick = useCallback(() => {
    const examples: Record<SearchType, string> = {
      phone: '+7 (999) 123-45-67',
      email: 'example@domain.com',
      inn: '1234567890',
      snils: '123-456-789 01',
      passport: '1234 567890'
    };
    
    setSearchValue(examples[searchType]);
    setValidationError(null);
  }, [searchType]);

  // Clear form
  const handleClear = useCallback(() => {
    setSearchValue('');
    setValidationError(null);
    setSelectedBots([]);
  }, []);

  return (
    <div className={`search-form ${className}`}>
      <form onSubmit={handleSubmit} className="search-form-container">
        {/* Search Type Selection */}
        <div className="form-section">
          <h3 className="form-section-title">Тип поиска</h3>
          <div className="search-type-grid">
            {searchTypes.map(type => (
              <label key={type} className="search-type-option">
                <input
                  type="radio"
                  name="searchType"
                  value={type}
                  checked={searchType === type}
                  onChange={() => handleSearchTypeChange(type)}
                  className="search-type-radio"
                />
                <div className="search-type-card">
                  <div className="search-type-icon">
                    {type === 'phone' && '📱'}
                    {type === 'email' && '📧'}
                    {type === 'inn' && '🏢'}
                    {type === 'snils' && '🆔'}
                    {type === 'passport' && '📄'}
                  </div>
                  <div className="search-type-label">
                    {getSearchTypeLabel(type)}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Search Value Input */}
        <div className="form-section">
          <h3 className="form-section-title">Данные для поиска</h3>
          <div className="search-input-container">
            <div className="form-group">
              <label htmlFor="searchValue" className="form-label">
                {getSearchTypeLabel(searchType)}
              </label>
              <input
                id="searchValue"
                type="text"
                value={searchValue}
                onChange={(e) => handleSearchValueChange(e.target.value)}
                placeholder={getSearchTypePlaceholder(searchType)}
                className={`form-input ${validationError ? 'error' : ''}`}
                disabled={loading}
                autoComplete="off"
              />
              <div className="form-help">
                {getSearchTypeDescription(searchType)}
              </div>
              {validationError && (
                <div className="form-error">
                  {validationError}
                </div>
              )}
            </div>

            <div className="input-actions">
              <button
                type="button"
                onClick={handleExampleClick}
                className="btn-link"
                disabled={loading}
              >
                Вставить пример
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="btn-link"
                disabled={loading || !searchValue}
              >
                Очистить
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Search Options */}
        <div className="form-section">
          <div className="advanced-toggle">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={isAdvancedMode}
                onChange={(e) => setIsAdvancedMode(e.target.checked)}
                className="toggle-checkbox"
                disabled={loading}
              />
              <span className="toggle-slider"></span>
              Расширенный поиск
            </label>
          </div>

          {isAdvancedMode && (
            <div className="advanced-options">
              <h4 className="advanced-title">Выберите боты для поиска</h4>
              <div className="bot-selection-grid">
                {availableBots.map(bot => (
                  <label key={bot.id} className="bot-option">
                    <input
                      type="checkbox"
                      checked={selectedBots.includes(bot.id)}
                      onChange={() => handleBotToggle(bot.id)}
                      className="bot-checkbox"
                      disabled={loading}
                    />
                    <div className="bot-card">
                      <div className="bot-name">{bot.name}</div>
                      <div className="bot-description">{bot.description}</div>
                    </div>
                  </label>
                ))}
              </div>
              {selectedBots.length > 0 && (
                <div className="selected-bots-info">
                  Выбрано ботов: {selectedBots.length} из {availableBots.length}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="form-section">
            <div className="search-error">
              <div className="error-icon">⚠️</div>
              <div className="error-content">
                <div className="error-title">Ошибка поиска</div>
                <div className="error-message">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="form-section">
          <div className="submit-container">
            <button
              type="submit"
              className="btn btn-primary btn-large"
              disabled={loading || !searchValue.trim()}
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Поиск...
                </>
              ) : (
                <>
                  🔍 Найти данные
                </>
              )}
            </button>
            
            <div className="submit-help">
              {isAdvancedMode && selectedBots.length > 0 
                ? `Поиск будет выполнен по ${selectedBots.length} выбранным ботам`
                : 'Поиск будет выполнен по всем доступным ботам'
              }
            </div>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="form-section">
          <div className="privacy-notice">
            <div className="privacy-icon">🔒</div>
            <div className="privacy-text">
              <strong>Конфиденциальность:</strong> Ваши данные не сохраняются на наших серверах 
              и используются только для выполнения поиска. После получения результатов 
              все данные автоматически удаляются.
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}