/**
 * NotificationCenter Component
 * Displays and manages user notifications
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNotifications } from '../../hooks/useApi';
import { Notification, NotificationPreferences } from '../../types/api';
import { formatDate, formatRelativeTime } from '../../utils/helpers';
import './NotificationCenter.css';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

function NotificationItem({ notification, onMarkAsRead, onDelete }: NotificationItemProps) {
  const handleMarkAsRead = () => {
    if (!notification.readAt) {
      onMarkAsRead(notification.id);
    }
  };

  const handleDelete = () => {
    onDelete(notification.id);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'search_started': return '🔍';
      case 'search_completed': return '✅';
      case 'search_failed': return '❌';
      case 'data_found': return '🎯';
      case 'removal_instructions': return '📋';
      case 'removal_completed': return '🗑️';
      case 'system_maintenance': return '🔧';
      case 'security_alert': return '🚨';
      case 'subscription_update': return '💳';
      case 'payment_reminder': return '💰';
      case 'welcome': return '👋';
      case 'info': return 'ℹ️';
      case 'warning': return '⚠️';
      case 'error': return '🚫';
      default: return '📢';
    }
  };

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'priority-urgent';
      case 'high': return 'priority-high';
      case 'normal': return 'priority-normal';
      case 'low': return 'priority-low';
      default: return 'priority-normal';
    }
  };

  return (
    <div 
      className={`notification-item ${
        notification.readAt ? 'read' : 'unread'
      } ${getPriorityClass(notification.priority)}`}
      onClick={handleMarkAsRead}
    >
      <div className="notification-icon">
        {getNotificationIcon(notification.type)}
      </div>
      
      <div className="notification-content">
        <div className="notification-header">
          <h4 className="notification-title">{notification.title}</h4>
          <div className="notification-meta">
            <span className="notification-time">
              {formatRelativeTime(notification.createdAt)}
            </span>
            {notification.metadata?.actionRequired && (
              <span className="action-required">Требует действий</span>
            )}
          </div>
        </div>
        
        <p className="notification-message">{notification.message}</p>
        
        {notification.metadata?.category && (
          <div className="notification-tags">
            <span className={`tag tag-${notification.metadata.category}`}>
              {notification.metadata.category}
            </span>
            {notification.metadata.tags?.map((tag, index) => (
              <span key={index} className="tag tag-secondary">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      
      <div className="notification-actions">
        {!notification.readAt && (
          <button 
            className="action-btn mark-read-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleMarkAsRead();
            }}
            title="Отметить как прочитанное"
          >
            ✓
          </button>
        )}
        <button 
          className="action-btn delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          title="Удалить уведомление"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

interface NotificationFiltersProps {
  filters: {
    status: string;
    type: string;
    unreadOnly: boolean;
  };
  onFiltersChange: (filters: any) => void;
}

function NotificationFilters({ filters, onFiltersChange }: NotificationFiltersProps) {
  const handleFilterChange = (key: string, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  return (
    <div className="notification-filters">
      <div className="filter-group">
        <label htmlFor="status-filter">Статус:</label>
        <select 
          id="status-filter"
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
        >
          <option value="">Все</option>
          <option value="pending">Ожидающие</option>
          <option value="delivered">Доставленные</option>
          <option value="read">Прочитанные</option>
        </select>
      </div>
      
      <div className="filter-group">
        <label htmlFor="type-filter">Тип:</label>
        <select 
          id="type-filter"
          value={filters.type}
          onChange={(e) => handleFilterChange('type', e.target.value)}
        >
          <option value="">Все типы</option>
          <option value="search_started">Поиск начат</option>
          <option value="search_completed">Поиск завершен</option>
          <option value="data_found">Данные найдены</option>
          <option value="removal_instructions">Инструкции</option>
          <option value="security_alert">Безопасность</option>
          <option value="system_maintenance">Система</option>
        </select>
      </div>
      
      <div className="filter-group">
        <label className="checkbox-label">
          <input 
            type="checkbox"
            checked={filters.unreadOnly}
            onChange={(e) => handleFilterChange('unreadOnly', e.target.checked)}
          />
          Только непрочитанные
        </label>
      </div>
    </div>
  );
}

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  preferences: NotificationPreferences | null;
  onClose: () => void;
  onSave: (preferences: Partial<NotificationPreferences>) => void;
}

function NotificationPreferencesModal({ 
  isOpen, 
  preferences, 
  onClose, 
  onSave 
}: NotificationPreferencesModalProps) {
  const [localPreferences, setLocalPreferences] = useState<Partial<NotificationPreferences>>({});

  useEffect(() => {
    if (preferences) {
      setLocalPreferences(preferences);
    }
  }, [preferences]);

  const handleSave = () => {
    onSave(localPreferences);
    onClose();
  };

  const updateChannelPreference = (channel: string, enabled: boolean) => {
    setLocalPreferences(prev => ({
      ...prev,
      channels: {
        ...prev.channels,
        [channel]: enabled
      }
    }));
  };

  const updateTypePreference = (type: string, enabled: boolean) => {
    setLocalPreferences(prev => ({
      ...prev,
      types: {
        ...prev.types,
        [type]: enabled
      }
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Настройки уведомлений</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-body">
          <div className="preferences-section">
            <h4>Каналы доставки</h4>
            <div className="preferences-grid">
              <label className="preference-item">
                <input 
                  type="checkbox"
                  checked={localPreferences.channels?.in_app ?? true}
                  onChange={(e) => updateChannelPreference('in_app', e.target.checked)}
                />
                <span>В приложении</span>
              </label>
              
              <label className="preference-item">
                <input 
                  type="checkbox"
                  checked={localPreferences.channels?.email ?? true}
                  onChange={(e) => updateChannelPreference('email', e.target.checked)}
                />
                <span>Email</span>
              </label>
              
              <label className="preference-item">
                <input 
                  type="checkbox"
                  checked={localPreferences.channels?.push ?? true}
                  onChange={(e) => updateChannelPreference('push', e.target.checked)}
                />
                <span>Push-уведомления</span>
              </label>
              
              <label className="preference-item">
                <input 
                  type="checkbox"
                  checked={localPreferences.channels?.sms ?? false}
                  onChange={(e) => updateChannelPreference('sms', e.target.checked)}
                />
                <span>SMS</span>
              </label>
            </div>
          </div>
          
          <div className="preferences-section">
            <h4>Типы уведомлений</h4>
            <div className="preferences-grid">
              <label className="preference-item">
                <input 
                  type="checkbox"
                  checked={localPreferences.types?.search_updates ?? true}
                  onChange={(e) => updateTypePreference('search_updates', e.target.checked)}
                />
                <span>Обновления поиска</span>
              </label>
              
              <label className="preference-item">
                <input 
                  type="checkbox"
                  checked={localPreferences.types?.security_alerts ?? true}
                  onChange={(e) => updateTypePreference('security_alerts', e.target.checked)}
                />
                <span>Предупреждения безопасности</span>
              </label>
              
              <label className="preference-item">
                <input 
                  type="checkbox"
                  checked={localPreferences.types?.system_notifications ?? true}
                  onChange={(e) => updateTypePreference('system_notifications', e.target.checked)}
                />
                <span>Системные уведомления</span>
              </label>
              
              <label className="preference-item">
                <input 
                  type="checkbox"
                  checked={localPreferences.types?.marketing ?? false}
                  onChange={(e) => updateTypePreference('marketing', e.target.checked)}
                />
                <span>Маркетинговые</span>
              </label>
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Отмена
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

export interface NotificationCenterProps {
  className?: string;
}

export default function NotificationCenter({ className = '' }: NotificationCenterProps) {
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    unreadOnly: false
  });
  const [showPreferences, setShowPreferences] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 20;

  const {
    notifications,
    unreadCount,
    preferences,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updatePreferences,
    refreshNotifications
  } = useNotifications({
    limit: pageSize,
    offset: currentPage * pageSize,
    ...filters
  });

  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
      await refreshNotifications();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, [markAsRead, refreshNotifications]);

  const handleDelete = useCallback(async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
      await refreshNotifications();
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  }, [deleteNotification, refreshNotifications]);

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllAsRead();
      await refreshNotifications();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, [markAllAsRead, refreshNotifications]);

  const handlePreferencesSave = useCallback(async (newPreferences: Partial<NotificationPreferences>) => {
    try {
      await updatePreferences(newPreferences);
    } catch (error) {
      console.error('Failed to update preferences:', error);
    }
  }, [updatePreferences]);

  const handleFiltersChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
    setCurrentPage(0);
  }, []);

  const handleLoadMore = useCallback(() => {
    setCurrentPage(prev => prev + 1);
  }, []);

  if (error) {
    return (
      <div className={`notification-center error ${className}`}>
        <div className="error-message">
          <h3>Ошибка загрузки уведомлений</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={refreshNotifications}>
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`notification-center ${className}`}>
      <div className="notification-header">
        <div className="header-title">
          <h2>Уведомления</h2>
          {unreadCount > 0 && (
            <span className="unread-badge">{unreadCount}</span>
          )}
        </div>
        
        <div className="header-actions">
          {unreadCount > 0 && (
            <button 
              className="btn btn-secondary"
              onClick={handleMarkAllAsRead}
              disabled={loading}
            >
              Отметить все как прочитанные
            </button>
          )}
          
          <button 
            className="btn btn-secondary"
            onClick={() => setShowPreferences(true)}
          >
            Настройки
          </button>
          
          <button 
            className="btn btn-primary"
            onClick={refreshNotifications}
            disabled={loading}
          >
            Обновить
          </button>
        </div>
      </div>

      <NotificationFilters 
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />

      <div className="notification-list">
        {loading && notifications.length === 0 ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Загрузка уведомлений...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>Нет уведомлений</h3>
            <p>
              {filters.unreadOnly 
                ? 'У вас нет непрочитанных уведомлений'
                : 'У вас пока нет уведомлений'
              }
            </p>
          </div>
        ) : (
          <>
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
                onDelete={handleDelete}
              />
            ))}
            
            {notifications.length >= pageSize && (
              <div className="load-more-container">
                <button 
                  className="btn btn-secondary load-more-btn"
                  onClick={handleLoadMore}
                  disabled={loading}
                >
                  {loading ? 'Загрузка...' : 'Загрузить еще'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <NotificationPreferencesModal
        isOpen={showPreferences}
        preferences={preferences}
        onClose={() => setShowPreferences(false)}
        onSave={handlePreferencesSave}
      />
    </div>
  );
}