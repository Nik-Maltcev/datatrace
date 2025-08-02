/**
 * Component Types for Frontend
 * Types specific to React components and UI state
 */

import { SearchType, SearchResult, SearchResults } from './api';

// Form types
export interface SearchFormData {
  type: SearchType;
  value: string;
}

export interface SearchFormErrors {
  type?: string;
  value?: string;
  general?: string;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: SearchFormErrors;
}

// UI State types
export interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
}

export interface ErrorState {
  hasError: boolean;
  message?: string;
  userMessage?: string;
  suggestions?: string[];
  canRetry?: boolean;
  isDismissible?: boolean;
}

export interface NotificationState {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  isVisible: boolean;
}

// Search component types
export interface SearchFormProps {
  onSubmit: (data: SearchFormData) => void;
  isLoading?: boolean;
  error?: ErrorState;
  initialValues?: Partial<SearchFormData>;
}

export interface SearchResultsProps {
  results: SearchResults;
  onRetry?: () => void;
  onBotInstructions?: (botId: string) => void;
  isLoading?: boolean;
}

export interface BotResultCardProps {
  result: SearchResult;
  onViewInstructions: (botId: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

// Instructions component types
export interface InstructionsProps {
  botId: string;
  onBack?: () => void;
}

export interface InstructionStepProps {
  step: string;
  stepNumber: number;
  isCompleted?: boolean;
  onToggleComplete?: (stepNumber: number) => void;
}

// Layout component types
export interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  actions?: React.ReactNode;
}

export interface FooterProps {
  showLinks?: boolean;
}

export interface LayoutProps {
  children: React.ReactNode;
  header?: HeaderProps;
  footer?: FooterProps;
  className?: string;
}

// Modal types
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  closeOnOverlayClick?: boolean;
}

// Button types
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  isLoading?: boolean;
  isDisabled?: boolean;
  fullWidth?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

// Input types
export interface InputProps {
  type?: 'text' | 'email' | 'tel' | 'password';
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export interface SelectProps {
  options: Array<{
    value: string;
    label: string;
    disabled?: boolean;
  }>;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  error?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

// Navigation types
export interface NavigationItem {
  path: string;
  label: string;
  icon?: React.ReactNode;
  isActive?: boolean;
}

export interface BreadcrumbItem {
  label: string;
  path?: string;
  isActive?: boolean;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
}

// Theme types
export interface ThemeColors {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  background: string;
  surface: string;
  text: {
    primary: string;
    secondary: string;
    disabled: string;
  };
  border: string;
}

export interface ThemeSpacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface Theme {
  colors: ThemeColors;
  spacing: ThemeSpacing;
  borderRadius: string;
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
  breakpoints: {
    mobile: string;
    tablet: string;
    desktop: string;
  };
}

// Context types
export interface AppContextValue {
  theme: Theme;
  isLoading: boolean;
  error: ErrorState | null;
  notification: NotificationState | null;
  setLoading: (loading: boolean, message?: string) => void;
  setError: (error: ErrorState | null) => void;
  showNotification: (notification: Omit<NotificationState, 'isVisible'>) => void;
  hideNotification: () => void;
}

export interface SearchContextValue {
  currentSearch: SearchResults | null;
  searchHistory: SearchResults[];
  isSearching: boolean;
  searchError: ErrorState | null;
  performSearch: (request: SearchFormData) => Promise<void>;
  clearSearch: () => void;
  retrySearch: () => Promise<void>;
}