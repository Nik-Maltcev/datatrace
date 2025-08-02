/**
 * TariffInfo Component
 * Displays tariff plans with payment placeholder
 */

import React, { useState, useEffect } from 'react';
import { useTariffs } from '../../hooks/useApi';
import { TariffPlan } from '../../types/api';
import { formatDate } from '../../utils/helpers';
import './TariffInfo.css';

interface TariffCardProps {
  plan: TariffPlan;
  isPopular?: boolean;
  onSelectPlan: (planId: string) => void;
  paymentAvailable: boolean;
}

function TariffCard({ plan, isPopular, onSelectPlan, paymentAvailable }: TariffCardProps) {
  const handleSelectPlan = () => {
    if (plan.isFree) {
      onSelectPlan(plan.id);
    } else {
      // Show payment placeholder
      alert('Оплата будет доступна позже. Пока все функции доступны бесплатно.');
    }
  };

  const formatPrice = (price: number | string) => {
    if (typeof price === 'string') {
      return price;
    }
    return price === 0 ? 'Бесплатно' : `${price} ₽`;
  };

  return (
    <div className={`tariff-card ${isPopular ? 'popular' : ''} ${plan.isFree ? 'free' : ''}`}>
      {isPopular && (
        <div className="popular-badge">
          🔥 Популярный
        </div>
      )}
      
      <div className="tariff-header">
        <h3 className="tariff-name">{plan.name}</h3>
        <div className="tariff-price">
          <span className="price">{formatPrice(plan.price)}</span>
          {!plan.isFree && (
            <span className="period">/{plan.period}</span>
          )}
        </div>
        <p className="tariff-description">{plan.description}</p>
      </div>

      <div className="tariff-features">
        <h4>Возможности:</h4>
        <ul className="features-list">
          {plan.features.map((feature, index) => (
            <li key={index} className="feature-item">
              <span className="feature-icon">✓</span>
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {plan.limitations && plan.limitations.length > 0 && (
        <div className="tariff-limitations">
          <h4>Ограничения:</h4>
          <ul className="limitations-list">
            {plan.limitations.map((limitation, index) => (
              <li key={index} className="limitation-item">
                <span className="limitation-icon">⚠</span>
                {limitation}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="tariff-footer">
        <button
          className={`select-plan-btn ${plan.isFree ? 'free-btn' : 'premium-btn'}`}
          onClick={handleSelectPlan}
          disabled={!paymentAvailable && !plan.isFree}
        >
          {plan.isFree ? 'Начать бесплатно' : 'Выбрать план'}
        </button>
        
        {!plan.isFree && !paymentAvailable && (
          <p className="payment-notice">
            Оплата будет доступна позже
          </p>
        )}
      </div>
    </div>
  );
}

interface ComparisonTableProps {
  plans: TariffPlan[];
  features: string[];
  comparison: Record<string, Record<string, boolean | string>>;
}

function ComparisonTable({ plans, features, comparison }: ComparisonTableProps) {
  return (
    <div className="comparison-table-container">
      <h3>Сравнение тарифов</h3>
      <div className="comparison-table">
        <table>
          <thead>
            <tr>
              <th className="feature-column">Возможности</th>
              {plans.map(plan => (
                <th key={plan.id} className={`plan-column ${plan.isPopular ? 'popular' : ''}`}>
                  <div className="plan-header">
                    <div className="plan-name">{plan.name}</div>
                    <div className="plan-price">
                      {typeof plan.price === 'string' ? plan.price : 
                       plan.price === 0 ? 'Бесплатно' : `${plan.price} ₽`}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {features.map(feature => (
              <tr key={feature}>
                <td className="feature-name">{feature}</td>
                {plans.map(plan => (
                  <td key={`${plan.id}-${feature}`} className="feature-value">
                    {comparison[plan.id][feature] === true ? (
                      <span className="check-mark">✓</span>
                    ) : comparison[plan.id][feature] === false ? (
                      <span className="cross-mark">✗</span>
                    ) : (
                      <span className="text-value">{comparison[plan.id][feature]}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TariffInfo() {
  const { data: tariffsData, loading, error, refetch } = useTariffs();
  const [showComparison, setShowComparison] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
    
    // For now, just show a message since payment is not available
    if (planId === 'free') {
      alert('Бесплатный план уже активен! Вы можете пользоваться всеми функциями.');
    } else {
      alert('Спасибо за интерес! Платные планы будут доступны в ближайшее время. Пока все функции доступны бесплатно.');
    }
  };

  const toggleComparison = () => {
    setShowComparison(!showComparison);
  };

  if (loading) {
    return (
      <div className="tariff-info">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h2>Загружаем тарифы...</h2>
          <p>Подготавливаем информацию о доступных планах</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tariff-info">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h2>Ошибка загрузки тарифов</h2>
          <p className="error-message">{error}</p>
          <div className="error-actions">
            <button onClick={refetch} className="btn btn-primary">
              🔄 Попробовать снова
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!tariffsData) {
    return (
      <div className="tariff-info">
        <div className="no-data-container">
          <div className="no-data-icon">📋</div>
          <h2>Тарифы временно недоступны</h2>
          <p>Информация о тарифах будет доступна позже</p>
        </div>
      </div>
    );
  }

  const { currentPlans, paymentStatus } = tariffsData;

  return (
    <div className="tariff-info">
      {/* Header */}
      <div className="tariff-header-section">
        <div className="header-content">
          <h1 className="page-title">Тарифные планы</h1>
          <p className="page-subtitle">
            Выберите подходящий план для удаления ваших персональных данных
          </p>
          
          {!paymentStatus.available && (
            <div className="payment-notice-banner">
              <div className="notice-icon">🚧</div>
              <div className="notice-content">
                <h3>Временно бесплатно!</h3>
                <p>{paymentStatus.message}</p>
                {paymentStatus.expectedDate && (
                  <p className="expected-date">
                    Ожидаемая дата запуска платных планов: {formatDate(paymentStatus.expectedDate)}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tariff Cards */}
      <div className="tariff-cards-section">
        <div className="tariff-cards-container">
          {currentPlans.map(plan => (
            <TariffCard
              key={plan.id}
              plan={plan}
              isPopular={plan.isPopular}
              onSelectPlan={handleSelectPlan}
              paymentAvailable={paymentStatus.available}
            />
          ))}
        </div>
      </div>

      {/* Comparison Toggle */}
      <div className="comparison-section">
        <div className="comparison-toggle">
          <button
            className="comparison-btn"
            onClick={toggleComparison}
          >
            {showComparison ? 'Скрыть сравнение' : 'Сравнить планы'}
          </button>
        </div>

        {showComparison && (
          <ComparisonTable
            plans={currentPlans}
            features={[
              'Поиск по телеграм ботам',
              'Поисковые запросы',
              'Инструкции по удалению',
              'Техподдержка',
              'История запросов',
              'Уведомления',
              'API доступ',
              'Персональный менеджер'
            ]}
            comparison={{
              free: {
                'Поиск по телеграм ботам': '5 ботов',
                'Поисковые запросы': '3 в день',
                'Инструкции по удалению': true,
                'Техподдержка': 'Email',
                'История запросов': false,
                'Уведомления': false,
                'API доступ': false,
                'Персональный менеджер': false
              },
              basic: {
                'Поиск по телеграм ботам': '5 ботов',
                'Поисковые запросы': '50 в месяц',
                'Инструкции по удалению': true,
                'Техподдержка': 'Приоритетная',
                'История запросов': true,
                'Уведомления': true,
                'API доступ': false,
                'Персональный менеджер': false
              },
              premium: {
                'Поиск по телеграм ботам': '5 ботов',
                'Поисковые запросы': 'Неограничено',
                'Инструкции по удалению': true,
                'Техподдержка': '24/7',
                'История запросов': true,
                'Уведомления': true,
                'API доступ': true,
                'Персональный менеджер': true
              },
              enterprise: {
                'Поиск по телеграм ботам': '5 ботов',
                'Поисковые запросы': 'Неограничено',
                'Инструкции по удалению': true,
                'Техподдержка': 'Выделенная',
                'История запросов': true,
                'Уведомления': true,
                'API доступ': true,
                'Персональный менеджер': true
              }
            }}
          />
        )}
      </div>

      {/* FAQ Section */}
      <div className="faq-section">
        <h3>Часто задаваемые вопросы</h3>
        <div className="faq-list">
          <div className="faq-item">
            <h4>Когда будут доступны платные планы?</h4>
            <p>
              Мы работаем над интеграцией платежных систем. Ожидаемая дата запуска - 
              {paymentStatus.expectedDate ? formatDate(paymentStatus.expectedDate) : 'в ближайшее время'}.
              До этого времени все функции доступны бесплатно.
            </p>
          </div>
          
          <div className="faq-item">
            <h4>Какие способы оплаты будут поддерживаться?</h4>
            <p>
              Планируется поддержка следующих способов оплаты: банковские карты, 
              ЮKassa, Сбербанк Онлайн, PayPal и другие популярные платежные системы.
            </p>
          </div>
          
          <div className="faq-item">
            <h4>Можно ли изменить план после покупки?</h4>
            <p>
              Да, вы сможете изменить тарифный план в любое время. При переходе на более 
              дорогой план доплата будет рассчитана пропорционально оставшемуся периоду.
            </p>
          </div>
          
          <div className="faq-item">
            <h4>Есть ли возврат средств?</h4>
            <p>
              Мы предоставляем 14-дневную гарантию возврата средств для всех платных планов. 
              Если сервис вам не подойдет, мы вернем деньги без лишних вопросов.
            </p>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="contact-section">
        <h3>Нужна помощь с выбором?</h3>
        <p>
          Свяжитесь с нами, и мы поможем выбрать подходящий тарифный план
        </p>
        <div className="contact-methods">
          <div className="contact-method">
            <span className="contact-icon">📧</span>
            <span>support@privacy-removal.com</span>
          </div>
          <div className="contact-method">
            <span className="contact-icon">💬</span>
            <span>Telegram: @privacy_support</span>
          </div>
        </div>
      </div>
    </div>
  );
}