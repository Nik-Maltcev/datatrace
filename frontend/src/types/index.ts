// Re-export all types from api.ts
export * from './api';
export * from './components';

// Additional frontend-specific types
export interface FormErrors {
  [key: string]: string | undefined;
}

export interface LoadingState {
  [key: string]: boolean;
}

export interface UIState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  loading: LoadingState;
  errors: FormErrors;
}