/**
 * Home Page Component
 * Main landing page with search functionality
 */

import React from 'react';
import { SearchForm } from '../forms/SearchForm';

export function HomePage() {
  return (
    <div className="home-page">
      <div className="hero-section">
        <h1>Сервис удаления личной информации</h1>
        <p>Проверьте наличие ваших данных в телеграм ботах и получите инструкции по их удалению</p>
      </div>
      
      <div className="search-section">
        <SearchForm />
      </div>
      
      <div className="features-section">
        <div className="feature">
          <h3>Быстрый поиск</h3>
          <p>Проверьте наличие ваших данных во всех доступных ботах одновременно</p>
        </div>
        
        <div className="feature">
          <h3>Подробные инструкции</h3>
          <p>Получите пошаговые инструкции по удалению данных из каждого бота</p>
        </div>
        
        <div className="feature">
          <h3>Безопасность</h3>
          <p>Ваши данные не сохраняются и не передаются третьим лицам</p>
        </div>
      </div>
    </div>
  );
}