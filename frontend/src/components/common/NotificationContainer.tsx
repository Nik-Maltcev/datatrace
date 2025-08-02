/**
 * Notification Container Component
 * Displays app-wide notifications
 */

import React, { useEffect } from 'react';
import { useAppContext } from '../../contexts/AppContext';

export function NotificationContainer() {
  const { state, removeNotification } = useAppContext();

  useEffect(() => {
    // Auto-remove notifications after 5 seconds
    const timers = state.ui.notifications.map(notification => {
      if (notification.autoClose !== false) {
        return setTimeout(() => {
          removeNotification(notification.id);
        }, 5000);
      }
      return null;
    });

    return () => {
      timers.forEach(timer => {
        if (timer) clearTimeout(timer);
      });
    };
  }, [state.ui.notifications, removeNotification]);

  if (state.ui.notifications.length === 0) {
    return null;
  }

  return (
    <div className="notification-container">
      {state.ui.notifications.map(notification => (
        <div
          key={notification.id}
          className={`notification notification-${notification.type}`}
        >
          <div className="notification-content">
            <div className="notification-header">
              <h4 className="notification-title">{notification.title}</h4>
              <button
                className="notification-close"
                onClick={() => removeNotification(notification.id)}
                aria-label="Close notification"
              >
                ×
              </button>
            </div>
            
            <p className="notification-message">{notification.message}</p>
            
            <div className="notification-timestamp">
              {notification.timestamp.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}