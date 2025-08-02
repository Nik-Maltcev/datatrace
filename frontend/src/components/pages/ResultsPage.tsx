/**
 * Results Page Component
 * Displays search results from all bots
 */

import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';
import { useSearch } from '../../hooks/useApi';
import { ResultsDisplay } from '../results/ResultsDisplay';
import { SearchType } from '../../types/api';

export function ResultsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { state, addNotification } = useAppContext();
  const { searchResults, loading, error, search, clearResults } = useSearch();

  // Check if we have search results or need to perform a search
  useEffect(() => {
    // If we have results from the context, use them
    if (state.currentSearch.results) {
      return;
    }

    // If we have URL parameters, perform search
    const type = searchParams.get('type') as SearchType;
    const value = searchParams.get('value');

    if (type && value) {
      const searchRequest = { type, value };
      search(searchRequest);
    } else if (!state.currentSearch.type || !state.currentSearch.value) {
      // No search parameters and no current search, redirect to home
      addNotification({
        type: 'warning',
        title: 'Нет данных для поиска',
        message: 'Пожалуйста, выполните поиск на главной странице',
        autoClose: true
      });
      navigate('/');
    } else {
      // Use current search from context
      const searchRequest = {
        type: state.currentSearch.type,
        value: state.currentSearch.value
      };
      search(searchRequest);
    }
  }, [searchParams, state.currentSearch, search, navigate, addNotification]);

  // Handle retry search
  const handleRetry = () => {
    if (state.currentSearch.type && state.currentSearch.value) {
      const searchRequest = {
        type: state.currentSearch.type,
        value: state.currentSearch.value
      };
      search(searchRequest);
    }
  };

  // Handle new search
  const handleNewSearch = () => {
    clearResults();
    navigate('/');
  };

  // Loading state
  if (loading) {
    return (
      <div className="results-page">
        <div className="loading-container">
          <div className="loading-spinner-large"></div>
          <h2>Выполняется поиск...</h2>
          <p>Проверяем все доступные боты на наличие ваших данных</p>
          <div className="loading-progress">
            <div className="progress-bar">
              <div className="progress-fill"></div>
            </div>
            <p className="progress-text">Это может занять несколько секунд</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !searchResults) {
    return (
      <div className="results-page">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h2>Ошибка поиска</h2>
          <p className="error-message">{error}</p>
          <div className="error-actions">
            <button onClick={handleRetry} className="btn btn-primary">
              🔄 Повторить поиск
            </button>
            <button onClick={handleNewSearch} className="btn btn-secondary">
              🔍 Новый поиск
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Results state
  const results = searchResults || state.currentSearch.results;
  
  if (!results) {
    return (
      <div className="results-page">
        <div className="no-results-container">
          <div className="no-results-icon">🔍</div>
          <h2>Нет результатов</h2>
          <p>Не найдено данных для отображения</p>
          <button onClick={handleNewSearch} className="btn btn-primary">
            🔍 Выполнить поиск
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="results-page">
      <div className="results-actions">
        <button onClick={handleNewSearch} className="btn btn-secondary">
          🔍 Новый поиск
        </button>
        <button onClick={handleRetry} className="btn btn-secondary">
          🔄 Обновить результаты
        </button>
      </div>
      
      <ResultsDisplay 
        results={results} 
        onRetry={handleRetry}
      />
    </div>
  );
}