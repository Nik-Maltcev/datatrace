/**
 * Footer Component
 * Site footer with links and information
 */

import React from 'react';
import { Link } from 'react-router-dom';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h4>Сервис</h4>
          <ul>
            <li><Link to="/">Поиск данных</Link></li>
            <li><Link to="/tariffs">Тарифы</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Поддержка</h4>
          <ul>
            <li><a href="#help">Помощь</a></li>
            <li><a href="#contact">Контакты</a></li>
            <li><a href="#faq">FAQ</a></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Правовая информация</h4>
          <ul>
            <li><a href="#privacy">Политика конфиденциальности</a></li>
            <li><a href="#terms">Условия использования</a></li>
            <li><a href="#gdpr">GDPR</a></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>О проекте</h4>
          <p>
            Сервис помогает найти и удалить вашу личную информацию 
            из телеграм ботов для защиты приватности.
          </p>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-container">
          <p>&copy; {currentYear} DataRemoval. Все права защищены.</p>
          <p className="footer-disclaimer">
            Сервис не сохраняет и не передает ваши персональные данные третьим лицам.
          </p>
        </div>
      </div>
    </footer>
  );
}