/**
 * Header Component
 * Main navigation header
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';

export function Header() {
  const { state, toggleSidebar, setTheme } = useAppContext();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path ? 'active' : '';
  };

  const handleThemeToggle = () => {
    setTheme(state.ui.theme === 'light' ? 'dark' : 'light');
  };

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-left">
          <button 
            className="sidebar-toggle"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
          
          <Link to="/" className="logo">
            <span className="logo-text">DataRemoval</span>
          </Link>
        </div>

        <nav className="header-nav">
          <Link to="/" className={`nav-link ${isActive('/')}`}>
            Главная
          </Link>
          <Link to="/tariffs" className={`nav-link ${isActive('/tariffs')}`}>
            Тарифы
          </Link>
        </nav>

        <div className="header-right">
          <button 
            className="theme-toggle"
            onClick={handleThemeToggle}
            aria-label="Toggle theme"
          >
            {state.ui.theme === 'light' ? '🌙' : '☀️'}
          </button>
          
          <div className="language-selector">
            <select 
              value={state.preferences.language}
              onChange={(e) => {
                // setLanguage will be implemented when needed
                console.log('Language change:', e.target.value);
              }}
            >
              <option value="ru">Русский</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
}