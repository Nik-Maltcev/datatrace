/**
 * Sidebar Component
 * Side navigation panel
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';
import { useHealthStatus } from '../../hooks/useApi';

export function Sidebar() {
  const { toggleSidebar } = useAppContext();
  const location = useLocation();
  const { status: healthStatus } = useHealthStatus();

  const isActive = (path: string) => {
    return location.pathname === path ? 'active' : '';
  };

  const getHealthStatusColor = () => {
    if (!healthStatus) return 'gray';
    switch (healthStatus.status) {
      case 'healthy': return 'green';
      case 'degraded': return 'orange';
      case 'unhealthy': return 'red';
      default: return 'gray';
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h3>Навигация</h3>
        <button 
          className="sidebar-close"
          onClick={toggleSidebar}
          aria-label="Close sidebar"
        >
          ×
        </button>
      </div>

      <nav className="sidebar-nav">
        <Link 
          to="/" 
          className={`sidebar-link ${isActive('/')}`}
          onClick={toggleSidebar}
        >
          🏠 Главная
        </Link>
        
        <Link 
          to="/tariffs" 
          className={`sidebar-link ${isActive('/tariffs')}`}
          onClick={toggleSidebar}
        >
          💳 Тарифы
        </Link>

        <div className="sidebar-divider"></div>

        <div className="sidebar-section">
          <h4>Статус системы</h4>
          <div className="system-status">
            <div className={`status-indicator ${getHealthStatusColor()}`}></div>
            <span className="status-text">
              {healthStatus ? (
                healthStatus.status === 'healthy' ? 'Все системы работают' :
                healthStatus.status === 'degraded' ? 'Ограниченная функциональность' :
                'Технические проблемы'
              ) : 'Проверка статуса...'}
            </span>
          </div>
          
          {healthStatus && (
            <div className="bot-status">
              <small>
                Доступно ботов: {healthStatus.details.botStatuses.filter(b => b.isAvailable).length} из {healthStatus.details.botStatuses.length}
              </small>
            </div>
          )}
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-section">
          <h4>Помощь</h4>
          <a href="#help" className="sidebar-link">
            ❓ Справка
          </a>
          <a href="#contact" className="sidebar-link">
            📧 Поддержка
          </a>
        </div>
      </div>
    </aside>
  );
}