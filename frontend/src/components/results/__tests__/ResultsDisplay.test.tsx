/**
 * Tests for ResultsDisplay Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ResultsDisplay } from '../ResultsDisplay';
import { AppProvider } from '../../../contexts/AppContext';
import { SearchResults } from '../../../types/api';

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

// Mock search results data
const mockResultsWithData: SearchResults = {
  searchId: 'search_123',
  timestamp: '2024-01-01T12:00:00Z',
  query: '[REDACTED]',
  searchType: 'email',
  results: [
    {
      botId: 'dyxless',
      botName: 'Бот A',
      foundData: [
        {
          field: 'email',
          value: 'user@example.com',
          source: 'dyxless',
          confidence: 0.95
        },
        {
          field: 'name',
          value: 'John Doe',
          source: 'dyxless',
          confidence: 0.8
        }
      ],
      hasData: true,
      status: 'success'
    },
    {
      botId: 'itp',
      botName: 'Бот B',
      foundData: [],
      hasData: false,
      status: 'no_data'
    },
    {
      botId: 'leak_osint',
      botName: 'Бот C',
      foundData: [],
      hasData: false,
      status: 'error',
      errorMessage: 'Connection timeout'
    }
  ],
  totalBotsSearched: 3,
  totalBotsWithData: 1,
  totalRecords: 2,
  searchDuration: 2500,
  encryptionEnabled: true
};

const mockResultsNoData: SearchResults = {
  searchId: 'search_456',
  timestamp: '2024-01-01T12:00:00Z',
  query: '[REDACTED]',
  searchType: 'phone',
  results: [
    {
      botId: 'dyxless',
      botName: 'Бот A',
      foundData: [],
      hasData: false,
      status: 'no_data'
    },
    {
      botId: 'itp',
      botName: 'Бот B',
      foundData: [],
      hasData: false,
      status: 'no_data'
    }
  ],
  totalBotsSearched: 2,
  totalBotsWithData: 0,
  totalRecords: 0,
  searchDuration: 1500,
  encryptionEnabled: true
};

describe('ResultsDisplay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Results with data', () => {
    it('renders search results summary correctly', () => {
      render(
        <TestWrapper>
          <ResultsDisplay results={mockResultsWithData} />
        </TestWrapper>
      );

      expect(screen.getByText('Результаты поиска')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // Total bots searched
      expect(screen.getByText('1')).toBeInTheDocument(); // Bots with data
      expect(screen.getByText('2')).toBeInTheDocument(); // Total records
    });

    it('displays bots with data in correct section', () => {
      render(
        <TestWrapper>
          <ResultsDisplay results={mockResultsWithData} />
        </TestWrapper>
      );

      expect(screen.getByText(/Боты с найденными данными \(1\)/)).toBeInTheDocument();
      expect(screen.getByText('Бот A')).toBeInTheDocument();
      expect(screen.getByText('✅ Данные найдены')).toBeInTheDocument();
    });

    it('displays found data fields correctly', () => {
      render(
        <TestWrapper>
          <ResultsDisplay results={mockResultsWithData} />
        </TestWrapper>
      );

      expect(screen.getByText('email')).toBeInTheDocument();
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
      expect(screen.getByText('name')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('shows confidence badges for data fields', () => {
      render(
        <TestWrapper>
          <ResultsDisplay results={mockResultsWithData} />
        </TestWrapper>
      );

      expect(screen.getByText('95%')).toBeInTheDocument();
      expect(screen.getByText('80%')).toBeInTheDocument();
    });

    it('displays delete buttons for bots with data', () => {
      render(
        <TestWrapper>
          <ResultsDisplay results={mockResultsWithData} />
        </TestWrapper>
      );

      const deleteButtons = screen.getAllByText(/🗑️ Удалить/);
      expect(deleteButtons).toHaveLength(1);
    });

    it('shows error section for bots with errors', () => {
      render(
        <TestWrapper>
          <ResultsDisplay results={mockResultsWithData} />
        </TestWrapper>
      );

      expect(screen.getByText(/Боты с ошибками \(1\)/)).toBeInTheDocument();
      expect(screen.getByText('Connection timeout')).toBeInTheDocument();
    });

    it('allows bot selection for bulk actions', () => {
      render(
        <TestWrapper>
          <ResultsDisplay results={mockResultsWithData} />
        </TestWrapper>
      );

      const checkbox = screen.getByLabelText('Выбрать Бот A');
      fireEvent.click(checkbox);

      expect(screen.getByText('Выбрано: 1')).toBeInTheDocument();
      expect(screen.getByText('🗑️ Получить инструкции для выбранных')).toBeInTheDocument();
    });

    it('navigates to instructions when delete button is clicked', () => {
      render(
        <TestWrapper>
          <ResultsDisplay results={mockResultsWithData} />
        </TestWrapper>
      );

      const deleteButton = screen.getByText('🗑️ Удалить');
      fireEvent.click(deleteButton);

      expect(mockNavigate).toHaveBeenCalledWith('/instructions/dyxless');
    });
  });

  describe('Results without data', () => {
    it('shows no results message when no data found', () => {
      render(
        <TestWrapper>
          <ResultsDisplay results={mockResultsNoData} />
        </TestWrapper>
      );

      expect(screen.getByText('Отличные новости!')).toBeInTheDocument();
      expect(screen.getByText(/Ваши данные не найдены/)).toBeInTheDocument();
    });

    it('shows correct statistics for no data results', () => {
      render(
        <TestWrapper>
          <ResultsDisplay results={mockResultsNoData} />
        </TestWrapper>
      );

      expect(screen.getByText('2')).toBeInTheDocument(); // Total bots searched
      expect(screen.getByText('0')).toBeInTheDocument(); // Bots with data
    });

    it('displays bots without data in collapsed section', () => {
      render(
        <TestWrapper>
          <ResultsDisplay results={mockResultsNoData} />
        </TestWrapper>
      );

      expect(screen.getByText(/Боты без данных \(2\)/)).toBeInTheDocument();
      expect(screen.getByText('Показать все')).toBeInTheDocument();
    });

    it('expands bots without data when show all is clicked', () => {
      render(
        <TestWrapper>
          <ResultsDisplay results={mockResultsNoData} />
        </TestWrapper>
      );

      const showAllButton = screen.getByText('Показать все');
      fireEvent.click(showAllButton);

      expect(screen.getByText('Скрыть')).toBeInTheDocument();
      expect(screen.getAllByText(/❌ Данные не найдены/)).toHaveLength(2);
    });
  });

  describe('Data field interactions', () => {
    it('copies data to clipboard when copy button is clicked', async () => {
      // Mock clipboard API
      const mockWriteText = jest.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText
        }
      });

      render(
        <TestWrapper>
          <ResultsDisplay results={mockResultsWithData} />
        </TestWrapper>
      );

      const copyButtons = screen.getAllByTitle('Скопировать значение');
      fireEvent.click(copyButtons[0]);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith('user@example.com');
      });
    });

    it('expands bot data when expand button is clicked', () => {
      const resultsWithManyFields: SearchResults = {
        ...mockResultsWithData,
        results: [
          {
            ...mockResultsWithData.results[0],
            foundData: [
              { field: 'field1', value: 'value1', source: 'bot' },
              { field: 'field2', value: 'value2', source: 'bot' },
              { field: 'field3', value: 'value3', source: 'bot' },
              { field: 'field4', value: 'value4', source: 'bot' },
              { field: 'field5', value: 'value5', source: 'bot' }
            ]
          }
        ]
      };

      render(
        <TestWrapper>
          <ResultsDisplay results={resultsWithManyFields} />
        </TestWrapper>
      );

      const expandButton = screen.getByText(/▼ Показать все \(5\)/);
      fireEvent.click(expandButton);

      expect(screen.getByText('▲ Свернуть')).toBeInTheDocument();
      expect(screen.getByText('field4')).toBeInTheDocument();
      expect(screen.getByText('field5')).toBeInTheDocument();
    });
  });

  describe('Bulk actions', () => {
    it('selects all bots with data when select all is clicked', () => {
      render(
        <TestWrapper>
          <ResultsDisplay results={mockResultsWithData} />
        </TestWrapper>
      );

      const selectAllButton = screen.getByText('Выбрать все (1)');
      fireEvent.click(selectAllButton);

      expect(screen.getByText('Выбрано: 1')).toBeInTheDocument();
    });

    it('clears all selections when clear selection is clicked', () => {
      render(
        <TestWrapper>
          <ResultsDisplay results={mockResultsWithData} />
        </TestWrapper>
      );

      // First select a bot
      const checkbox = screen.getByLabelText('Выбрать Бот A');
      fireEvent.click(checkbox);

      // Then clear selection
      const clearButton = screen.getByText('Снять выделение');
      fireEvent.click(clearButton);

      expect(screen.queryByText('Выбрано:')).not.toBeInTheDocument();
    });

    it('navigates to bulk instructions when bulk action is clicked', () => {
      render(
        <TestWrapper>
          <ResultsDisplay results={mockResultsWithData} />
        </TestWrapper>
      );

      // Select a bot
      const checkbox = screen.getByLabelText('Выбрать Бот A');
      fireEvent.click(checkbox);

      // Click bulk instructions
      const bulkButton = screen.getByText('🗑️ Получить инструкции для выбранных');
      fireEvent.click(bulkButton);

      expect(mockNavigate).toHaveBeenCalledWith('/instructions/dyxless?bulk=dyxless');
    });
  });

  describe('Footer actions', () => {
    it('shows encryption notice when encryption is enabled', () => {
      render(
        <TestWrapper>
          <ResultsDisplay results={mockResultsWithData} />
        </TestWrapper>
      );

      expect(screen.getByText('🔒 Шифрование включено')).toBeInTheDocument();
    });

    it('shows get all instructions button when there are results with data', () => {
      render(
        <TestWrapper>
          <ResultsDisplay results={mockResultsWithData} />
        </TestWrapper>
      );

      expect(screen.getByText('Получить все инструкции →')).toBeInTheDocument();
    });

    it('navigates to new search when new search button is clicked', () => {
      render(
        <TestWrapper>
          <ResultsDisplay results={mockResultsWithData} />
        </TestWrapper>
      );

      const newSearchButton = screen.getByText('← Новый поиск');
      fireEvent.click(newSearchButton);

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('Retry functionality', () => {
    it('calls onRetry when retry button is clicked', () => {
      const mockOnRetry = jest.fn();

      render(
        <TestWrapper>
          <ResultsDisplay results={mockResultsWithData} onRetry={mockOnRetry} />
        </TestWrapper>
      );

      const retryButton = screen.getByText('🔄 Повторить');
      fireEvent.click(retryButton);

      expect(mockOnRetry).toHaveBeenCalled();
    });
  });

  describe('Search metadata', () => {
    it('displays search duration correctly', () => {
      render(
        <TestWrapper>
          <ResultsDisplay results={mockResultsWithData} />
        </TestWrapper>
      );

      expect(screen.getByText('Время поиска: 2.5с')).toBeInTheDocument();
    });

    it('shows degraded notice when service is degraded', () => {
      const degradedResults: SearchResults = {
        ...mockResultsWithData,
        isDegraded: true
      };

      render(
        <TestWrapper>
          <ResultsDisplay results={degradedResults} />
        </TestWrapper>
      );

      expect(screen.getByText('⚠️ Ограниченный режим')).toBeInTheDocument();
    });
  });
});