/**
 * Not Found Page Component
 * 404 error page
 */

import React from 'react';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="not-found-page">
      <div className="not-found-content">
        <h1>404</h1>
        <h2>Страница не найдена</h2>
        <p>Запрашиваемая страница не существует или была перемещена.</p>
        
        <div className="not-found-actions">
          <Link to="/" className="btn btn-primary">
            Вернуться на главную
          </Link>
        </div>
      </div>
    </div>
  );
}