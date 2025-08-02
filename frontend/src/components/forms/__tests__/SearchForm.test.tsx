/**
 * Tests for SearchForm Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { SearchForm } from '../SearchForm';
import { AppProvider } from '../../../contexts/AppContext';

// Mock the hooks
jest.mock('../../../hooks/useApi', () => ({
  useSearch: () => ({
    search: jest.fn(),
    loading: false,
    error: null
  }),
  useFormValidation: () => ({
    validateSearchValue: jest.fn().mockReturnValue(null)
  })
}));

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <AppProvider>
      {children}
    </AppProvider>
  </BrowserRouter>
);

describe('SearchForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all search type options', () => {
    render(
      <TestWrapper>
        <SearchForm />
      </TestWrapper>
    );

    expect(screen.getByText('Номер телефона')).toBeInTheDocument();
    expect(screen.getByText('Email адрес')).toBeInTheDocument();
    expect(screen.getByText('ИНН')).toBeInTheDocument();
    expect(screen.getByText('СНИЛС')).toBeInTheDocument();
    expect(screen.getByText('Паспорт')).toBeInTheDocument();
  });

  it('updates search type when option is selected', () => {
    render(
      <TestWrapper>
        <SearchForm />
      </TestWrapper>
    );

    const emailOption = screen.getByLabelText('Email адрес');
    fireEvent.click(emailOption);

    expect(emailOption).toBeChecked();
    expect(screen.getByPlaceholderText('example@domain.com')).toBeInTheDocument();
  });

  it('updates search value when input changes', () => {
    render(
      <TestWrapper>
        <SearchForm />
      </TestWrapper>
    );

    const input = screen.getByPlaceholderText('+7 (999) 123-45-67');
    fireEvent.change(input, { target: { value: '+7 999 123 45 67' } });

    expect(input).toHaveValue('+7 999 123 45 67');
  });

  it('shows example value when example button is clicked', () => {
    render(
      <TestWrapper>
        <SearchForm />
      </TestWrapper>
    );

    const exampleButton = screen.getByText('Вставить пример');
    fireEvent.click(exampleButton);

    const input = screen.getByPlaceholderText('+7 (999) 123-45-67');
    expect(input).toHaveValue('+7 (999) 123-45-67');
  });

  it('clears input when clear button is clicked', () => {
    render(
      <TestWrapper>
        <SearchForm />
      </TestWrapper>
    );

    const input = screen.getByPlaceholderText('+7 (999) 123-45-67');
    fireEvent.change(input, { target: { value: '+7 999 123 45 67' } });
    
    const clearButton = screen.getByText('Очистить');
    fireEvent.click(clearButton);

    expect(input).toHaveValue('');
  });

  it('shows advanced options when toggle is enabled', () => {
    render(
      <TestWrapper>
        <SearchForm />
      </TestWrapper>
    );

    const advancedToggle = screen.getByLabelText('Расширенный поиск');
    fireEvent.click(advancedToggle);

    expect(screen.getByText('Выберите боты для поиска')).toBeInTheDocument();
    expect(screen.getByText('Бот A')).toBeInTheDocument();
    expect(screen.getByText('Бот B')).toBeInTheDocument();
  });

  it('allows bot selection in advanced mode', () => {
    render(
      <TestWrapper>
        <SearchForm />
      </TestWrapper>
    );

    // Enable advanced mode
    const advancedToggle = screen.getByLabelText('Расширенный поиск');
    fireEvent.click(advancedToggle);

    // Select a bot
    const botOption = screen.getByLabelText('Бот A Быстрый поиск по базовым данным');
    fireEvent.click(botOption);

    expect(screen.getByText('Выбрано ботов: 1 из 5')).toBeInTheDocument();
  });

  it('disables submit button when input is empty', () => {
    render(
      <TestWrapper>
        <SearchForm />
      </TestWrapper>
    );

    const submitButton = screen.getByRole('button', { name: /найти данные/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when input has value', () => {
    render(
      <TestWrapper>
        <SearchForm />
      </TestWrapper>
    );

    const input = screen.getByPlaceholderText('+7 (999) 123-45-67');
    fireEvent.change(input, { target: { value: '+7 999 123 45 67' } });

    const submitButton = screen.getByRole('button', { name: /найти данные/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('shows privacy notice', () => {
    render(
      <TestWrapper>
        <SearchForm />
      </TestWrapper>
    );

    expect(screen.getByText(/Конфиденциальность:/)).toBeInTheDocument();
    expect(screen.getByText(/Ваши данные не сохраняются/)).toBeInTheDocument();
  });

  it('calls onSearchStart callback when form is submitted', async () => {
    const onSearchStart = jest.fn();
    
    render(
      <TestWrapper>
        <SearchForm onSearchStart={onSearchStart} />
      </TestWrapper>
    );

    const input = screen.getByPlaceholderText('+7 (999) 123-45-67');
    fireEvent.change(input, { target: { value: '+7 999 123 45 67' } });

    const submitButton = screen.getByRole('button', { name: /найти данные/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onSearchStart).toHaveBeenCalled();
    });
  });

  it('shows loading state when search is in progress', () => {
    // Mock loading state
    jest.doMock('../../../hooks/useApi', () => ({
      useSearch: () => ({
        search: jest.fn(),
        loading: true,
        error: null
      }),
      useFormValidation: () => ({
        validateSearchValue: jest.fn().mockReturnValue(null)
      })
    }));

    render(
      <TestWrapper>
        <SearchForm />
      </TestWrapper>
    );

    expect(screen.getByText('Поиск...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /поиск/i })).toBeDisabled();
  });

  it('displays error message when search fails', () => {
    // Mock error state
    jest.doMock('../../../hooks/useApi', () => ({
      useSearch: () => ({
        search: jest.fn(),
        loading: false,
        error: 'Ошибка подключения к серверу'
      }),
      useFormValidation: () => ({
        validateSearchValue: jest.fn().mockReturnValue(null)
      })
    }));

    render(
      <TestWrapper>
        <SearchForm />
      </TestWrapper>
    );

    expect(screen.getByText('Ошибка поиска')).toBeInTheDocument();
    expect(screen.getByText('Ошибка подключения к серверу')).toBeInTheDocument();
  });

  it('validates input format for different search types', () => {
    const mockValidate = jest.fn();
    
    jest.doMock('../../../hooks/useApi', () => ({
      useSearch: () => ({
        search: jest.fn(),
        loading: false,
        error: null
      }),
      useFormValidation: () => ({
        validateSearchValue: mockValidate.mockReturnValue('Неверный формат email')
      })
    }));

    render(
      <TestWrapper>
        <SearchForm />
      </TestWrapper>
    );

    // Switch to email type
    const emailOption = screen.getByLabelText('Email адрес');
    fireEvent.click(emailOption);

    // Enter invalid email
    const input = screen.getByPlaceholderText('example@domain.com');
    fireEvent.change(input, { target: { value: 'invalid-email' } });

    // Try to submit
    const submitButton = screen.getByRole('button', { name: /найти данные/i });
    fireEvent.click(submitButton);

    expect(screen.getByText('Неверный формат email')).toBeInTheDocument();
  });

  it('shows different placeholders for different search types', () => {
    render(
      <TestWrapper>
        <SearchForm />
      </TestWrapper>
    );

    // Test phone placeholder (default)
    expect(screen.getByPlaceholderText('+7 (999) 123-45-67')).toBeInTheDocument();

    // Switch to email
    const emailOption = screen.getByLabelText('Email адрес');
    fireEvent.click(emailOption);
    expect(screen.getByPlaceholderText('example@domain.com')).toBeInTheDocument();

    // Switch to INN
    const innOption = screen.getByLabelText('ИНН');
    fireEvent.click(innOption);
    expect(screen.getByPlaceholderText('1234567890')).toBeInTheDocument();
  });

  it('updates help text for different search types', () => {
    render(
      <TestWrapper>
        <SearchForm />
      </TestWrapper>
    );

    // Test phone help text (default)
    expect(screen.getByText('Введите номер телефона в любом формате')).toBeInTheDocument();

    // Switch to email
    const emailOption = screen.getByLabelText('Email адрес');
    fireEvent.click(emailOption);
    expect(screen.getByText('Введите полный email адрес')).toBeInTheDocument();
  });
});