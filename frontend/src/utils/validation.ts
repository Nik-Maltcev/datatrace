/**
 * Validation utilities for form inputs
 */

import { SearchType } from '../types/api';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  suggestions?: string[];
}

/**
 * Validate search value based on type
 */
export function validateSearchInput(type: SearchType, value: string): ValidationResult {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return {
      isValid: false,
      error: 'Поле не может быть пустым'
    };
  }

  switch (type) {
    case 'phone':
      return validatePhone(trimmedValue);
    case 'email':
      return validateEmail(trimmedValue);
    case 'inn':
      return validateINN(trimmedValue);
    case 'snils':
      return validateSNILS(trimmedValue);
    case 'passport':
      return validatePassport(trimmedValue);
    default:
      return {
        isValid: false,
        error: 'Неизвестный тип поиска'
      };
  }
}

/**
 * Validate phone number
 */
function validatePhone(value: string): ValidationResult {
  // Remove all non-digit characters except +
  const cleanValue = value.replace(/[^\d+]/g, '');
  
  // Check basic format
  if (!/^\+?[1-9]\d{7,14}$/.test(cleanValue)) {
    return {
      isValid: false,
      error: 'Неверный формат номера телефона',
      suggestions: [
        'Номер должен содержать от 7 до 15 цифр',
        'Можно использовать форматы: +7 999 123 45 67, 8(999)123-45-67',
        'Номер должен начинаться с цифры от 1 до 9'
      ]
    };
  }

  // Check Russian phone number format
  if (cleanValue.startsWith('+7') || cleanValue.startsWith('7')) {
    const digits = cleanValue.replace(/^\+?7/, '');
    if (digits.length !== 10) {
      return {
        isValid: false,
        error: 'Российский номер должен содержать 10 цифр после кода страны',
        suggestions: [
          'Формат: +7 999 123 45 67',
          'Или: 8 999 123 45 67'
        ]
      };
    }
  }

  return { isValid: true };
}

/**
 * Validate email address
 */
function validateEmail(value: string): ValidationResult {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(value)) {
    return {
      isValid: false,
      error: 'Неверный формат email адреса',
      suggestions: [
        'Формат: user@domain.com',
        'Email должен содержать символ @',
        'После @ должен быть домен с точкой'
      ]
    };
  }

  // Additional checks
  if (value.length > 254) {
    return {
      isValid: false,
      error: 'Email адрес слишком длинный (максимум 254 символа)'
    };
  }

  const [localPart, domain] = value.split('@');
  
  if (localPart.length > 64) {
    return {
      isValid: false,
      error: 'Часть email до @ слишком длинная (максимум 64 символа)'
    };
  }

  if (domain.length > 253) {
    return {
      isValid: false,
      error: 'Доменная часть email слишком длинная (максимум 253 символа)'
    };
  }

  return { isValid: true };
}

/**
 * Validate INN (Individual Taxpayer Number)
 */
function validateINN(value: string): ValidationResult {
  const cleanValue = value.replace(/\D/g, '');
  
  if (!/^\d{10}$/.test(cleanValue) && !/^\d{12}$/.test(cleanValue)) {
    return {
      isValid: false,
      error: 'ИНН должен содержать 10 или 12 цифр',
      suggestions: [
        'ИНН физического лица: 12 цифр',
        'ИНН юридического лица: 10 цифр',
        'Вводите только цифры'
      ]
    };
  }

  // Validate checksum for 10-digit INN
  if (cleanValue.length === 10) {
    const coefficients = [2, 4, 10, 3, 5, 9, 4, 6, 8];
    let sum = 0;
    
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanValue[i]) * coefficients[i];
    }
    
    const checksum = (sum % 11) % 10;
    
    if (checksum !== parseInt(cleanValue[9])) {
      return {
        isValid: false,
        error: 'Неверная контрольная сумма ИНН',
        suggestions: [
          'Проверьте правильность введенных цифр',
          'ИНН содержит контрольную цифру для проверки'
        ]
      };
    }
  }

  // Validate checksum for 12-digit INN
  if (cleanValue.length === 12) {
    const coefficients1 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
    const coefficients2 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
    
    let sum1 = 0;
    let sum2 = 0;
    
    for (let i = 0; i < 10; i++) {
      sum1 += parseInt(cleanValue[i]) * coefficients1[i];
    }
    
    for (let i = 0; i < 11; i++) {
      sum2 += parseInt(cleanValue[i]) * coefficients2[i];
    }
    
    const checksum1 = (sum1 % 11) % 10;
    const checksum2 = (sum2 % 11) % 10;
    
    if (checksum1 !== parseInt(cleanValue[10]) || checksum2 !== parseInt(cleanValue[11])) {
      return {
        isValid: false,
        error: 'Неверная контрольная сумма ИНН',
        suggestions: [
          'Проверьте правильность введенных цифр',
          'ИНН содержит контрольные цифры для проверки'
        ]
      };
    }
  }

  return { isValid: true };
}

/**
 * Validate SNILS (Social Insurance Number)
 */
function validateSNILS(value: string): ValidationResult {
  const cleanValue = value.replace(/\D/g, '');
  
  if (!/^\d{11}$/.test(cleanValue)) {
    return {
      isValid: false,
      error: 'СНИЛС должен содержать 11 цифр',
      suggestions: [
        'Формат: 123-456-789 01',
        'Или: 12345678901',
        'Вводите только цифры'
      ]
    };
  }

  // Validate checksum
  const digits = cleanValue.slice(0, 9);
  const checksum = parseInt(cleanValue.slice(9, 11));
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i]) * (9 - i);
  }

  let expectedChecksum;
  if (sum < 100) {
    expectedChecksum = sum;
  } else if (sum > 101) {
    expectedChecksum = sum % 101;
    if (expectedChecksum === 100) {
      expectedChecksum = 0;
    }
  } else {
    expectedChecksum = 0;
  }

  if (expectedChecksum !== checksum) {
    return {
      isValid: false,
      error: 'Неверная контрольная сумма СНИЛС',
      suggestions: [
        'Проверьте правильность введенных цифр',
        'СНИЛС содержит контрольную сумму для проверки'
      ]
    };
  }

  return { isValid: true };
}

/**
 * Validate passport number
 */
function validatePassport(value: string): ValidationResult {
  const cleanValue = value.replace(/\D/g, '');
  
  if (!/^\d{10}$/.test(cleanValue)) {
    return {
      isValid: false,
      error: 'Паспорт должен содержать 10 цифр',
      suggestions: [
        'Формат: 1234 567890',
        'Серия: 4 цифры, номер: 6 цифр',
        'Вводите только цифры'
      ]
    };
  }

  // Check that series is not all zeros
  const series = cleanValue.slice(0, 4);
  if (series === '0000') {
    return {
      isValid: false,
      error: 'Серия паспорта не может быть 0000',
      suggestions: [
        'Проверьте серию паспорта',
        'Серия указана на первой странице паспорта'
      ]
    };
  }

  // Check that number is not all zeros
  const number = cleanValue.slice(4, 10);
  if (number === '000000') {
    return {
      isValid: false,
      error: 'Номер паспорта не может быть 000000',
      suggestions: [
        'Проверьте номер паспорта',
        'Номер указан на первой странице паспорта'
      ]
    };
  }

  return { isValid: true };
}

/**
 * Get input mask for different search types
 */
export function getInputMask(type: SearchType): string | null {
  switch (type) {
    case 'phone':
      return '+7 (999) 999-99-99';
    case 'snils':
      return '999-999-999 99';
    case 'passport':
      return '9999 999999';
    case 'inn':
      return '999999999999'; // 12 digits max
    default:
      return null;
  }
}

/**
 * Format value for display
 */
export function formatDisplayValue(type: SearchType, value: string): string {
  switch (type) {
    case 'phone':
      return formatPhoneDisplay(value);
    case 'snils':
      return formatSNILSDisplay(value);
    case 'passport':
      return formatPassportDisplay(value);
    default:
      return value;
  }
}

function formatPhoneDisplay(value: string): string {
  const cleanValue = value.replace(/\D/g, '');
  
  if (cleanValue.length === 11 && cleanValue.startsWith('7')) {
    return `+7 (${cleanValue.slice(1, 4)}) ${cleanValue.slice(4, 7)}-${cleanValue.slice(7, 9)}-${cleanValue.slice(9)}`;
  } else if (cleanValue.length === 10) {
    return `+7 (${cleanValue.slice(0, 3)}) ${cleanValue.slice(3, 6)}-${cleanValue.slice(6, 8)}-${cleanValue.slice(8)}`;
  }
  
  return value;
}

function formatSNILSDisplay(value: string): string {
  const cleanValue = value.replace(/\D/g, '');
  
  if (cleanValue.length === 11) {
    return `${cleanValue.slice(0, 3)}-${cleanValue.slice(3, 6)}-${cleanValue.slice(6, 9)} ${cleanValue.slice(9)}`;
  }
  
  return value;
}

function formatPassportDisplay(value: string): string {
  const cleanValue = value.replace(/\D/g, '');
  
  if (cleanValue.length === 10) {
    return `${cleanValue.slice(0, 4)} ${cleanValue.slice(4)}`;
  }
  
  return value;
}