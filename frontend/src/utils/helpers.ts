/**
 * Utility helper functions
 */

import { SearchType } from '../types/api';

// Date formatting utilities
export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatRelativeTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'только что';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} мин. назад`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} ч. назад`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} дн. назад`;
  }
};

// Search type utilities
export const getSearchTypeLabel = (type: SearchType): string => {
  const labels: Record<SearchType, string> = {
    phone: 'Номер телефона',
    email: 'Email адрес',
    inn: 'ИНН',
    snils: 'СНИЛС',
    passport: 'Паспорт',
  };
  return labels[type] || type;
};

export const getSearchTypePlaceholder = (type: SearchType): string => {
  const placeholders: Record<SearchType, string> = {
    phone: '+7 (999) 123-45-67',
    email: 'example@domain.com',
    inn: '1234567890',
    snils: '123-456-789 01',
    passport: '1234 567890',
  };
  return placeholders[type] || '';
};

export const getSearchTypeDescription = (type: SearchType): string => {
  const descriptions: Record<SearchType, string> = {
    phone: 'Введите номер телефона в любом формате',
    email: 'Введите полный email адрес',
    inn: 'Введите ИНН (10 или 12 цифр)',
    snils: 'Введите СНИЛС (11 цифр)',
    passport: 'Введите серию и номер паспорта',
  };
  return descriptions[type] || '';
};

// Data formatting utilities
export const formatSearchValue = (type: SearchType, value: string): string => {
  switch (type) {
    case 'phone':
      // Format phone number for display
      const cleanPhone = value.replace(/\D/g, '');
      if (cleanPhone.length === 11 && cleanPhone.startsWith('7')) {
        return `+7 (${cleanPhone.slice(1, 4)}) ${cleanPhone.slice(4, 7)}-${cleanPhone.slice(7, 9)}-${cleanPhone.slice(9)}`;
      } else if (cleanPhone.length === 10) {
        return `+7 (${cleanPhone.slice(0, 3)}) ${cleanPhone.slice(3, 6)}-${cleanPhone.slice(6, 8)}-${cleanPhone.slice(8)}`;
      }
      return value;
    
    case 'snils':
      // Format SNILS for display
      const cleanSnils = value.replace(/\D/g, '');
      if (cleanSnils.length === 11) {
        return `${cleanSnils.slice(0, 3)}-${cleanSnils.slice(3, 6)}-${cleanSnils.slice(6, 9)} ${cleanSnils.slice(9)}`;
      }
      return value;
    
    case 'passport':
      // Format passport for display
      const cleanPassport = value.replace(/\D/g, '');
      if (cleanPassport.length === 10) {
        return `${cleanPassport.slice(0, 4)} ${cleanPassport.slice(4)}`;
      }
      return value;
    
    default:
      return value;
  }
};

// Validation utilities
export const validateSearchValue = (type: SearchType, value: string): string | null => {
  if (!value.trim()) {
    return 'Поле не может быть пустым';
  }

  switch (type) {
    case 'phone':
      const phoneRegex = /^\+?[1-9]\d{7,14}$/;
      const cleanPhone = value.replace(/[\s\-\(\)]/g, '');
      if (!phoneRegex.test(cleanPhone)) {
        return 'Неверный формат номера телефона';
      }
      break;
    
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return 'Неверный формат email адреса';
      }
      break;
    
    case 'inn':
      const innRegex = /^\d{10,12}$/;
      if (!innRegex.test(value)) {
        return 'ИНН должен содержать 10 или 12 цифр';
      }
      break;
    
    case 'snils':
      const snilsRegex = /^\d{11}$/;
      const cleanSnils = value.replace(/[\s\-]/g, '');
      if (!snilsRegex.test(cleanSnils)) {
        return 'СНИЛС должен содержать 11 цифр';
      }
      break;
    
    case 'passport':
      const passportRegex = /^\d{4}\s?\d{6}$/;
      if (!passportRegex.test(value)) {
        return 'Неверный формат паспорта (4 цифры + 6 цифр)';
      }
      break;
  }

  return null;
};

// URL utilities
export const createSearchUrl = (type: SearchType, value: string): string => {
  const params = new URLSearchParams({
    type,
    value: encodeURIComponent(value),
  });
  return `/results?${params.toString()}`;
};

export const parseSearchUrl = (search: string): { type: SearchType; value: string } | null => {
  const params = new URLSearchParams(search);
  const type = params.get('type') as SearchType;
  const value = params.get('value');
  
  if (type && value) {
    return { type, value: decodeURIComponent(value) };
  }
  
  return null;
};

// Storage utilities
export const saveToLocalStorage = (key: string, data: any): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
  }
};

export const loadFromLocalStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn('Failed to load from localStorage:', error);
    return defaultValue;
  }
};

export const removeFromLocalStorage = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('Failed to remove from localStorage:', error);
  }
};

// Error handling utilities
export const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  if (error?.userMessage) {
    return error.userMessage;
  }
  
  return 'Произошла неизвестная ошибка';
};

export const getErrorSuggestions = (error: any): string[] => {
  if (error?.suggestions && Array.isArray(error.suggestions)) {
    return error.suggestions;
  }
  
  return ['Попробуйте еще раз', 'Обратитесь в техподдержку если проблема повторяется'];
};

// Performance utilities
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Copy to clipboard utility
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const result = document.execCommand('copy');
      textArea.remove();
      return result;
    }
  } catch (error) {
    console.warn('Failed to copy to clipboard:', error);
    return false;
  }
};

// Generate unique ID
export const generateId = (): string => {
  return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Check if device is mobile
export const isMobile = (): boolean => {
  return window.innerWidth <= 768;
};

// Check if device supports touch
export const isTouchDevice = (): boolean => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};