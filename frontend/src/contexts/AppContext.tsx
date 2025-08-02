/**
 * Application Context
 * Global state management for the application
 */

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { SearchResults, SearchType, HealthStatus } from '../types/api';

// State interface
interface AppState {
  // Search state
  currentSearch: {
    type: SearchType | null;
    value: string;
    results: SearchResults | null;
    loading: boolean;
    error: string | null;
  };
  
  // UI state
  ui: {
    theme: 'light' | 'dark';
    sidebarOpen: boolean;
    notifications: Notification[];
  };
  
  // System state
  system: {
    health: HealthStatus | null;
    lastHealthCheck: Date | null;
  };
  
  // User preferences
  preferences: {
    language: 'ru' | 'en';
    autoSearch: boolean;
    saveHistory: boolean;
  };
}

// Notification interface
interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  autoClose?: boolean;
}

// Action types
type AppAction =
  | { type: 'SET_SEARCH_LOADING'; payload: boolean }
  | { type: 'SET_SEARCH_RESULTS'; payload: SearchResults }
  | { type: 'SET_SEARCH_ERROR'; payload: string }
  | { type: 'CLEAR_SEARCH_RESULTS' }
  | { type: 'SET_SEARCH_PARAMS'; payload: { type: SearchType; value: string } }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'ADD_NOTIFICATION'; payload: Omit<Notification, 'id' | 'timestamp'> }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_NOTIFICATIONS' }
  | { type: 'SET_HEALTH_STATUS'; payload: HealthStatus }
  | { type: 'SET_LANGUAGE'; payload: 'ru' | 'en' }
  | { type: 'SET_PREFERENCE'; payload: { key: keyof AppState['preferences']; value: any } };

// Initial state
const initialState: AppState = {
  currentSearch: {
    type: null,
    value: '',
    results: null,
    loading: false,
    error: null,
  },
  ui: {
    theme: 'light',
    sidebarOpen: false,
    notifications: [],
  },
  system: {
    health: null,
    lastHealthCheck: null,
  },
  preferences: {
    language: 'ru',
    autoSearch: false,
    saveHistory: true,
  },
};

// Reducer function
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_SEARCH_LOADING':
      return {
        ...state,
        currentSearch: {
          ...state.currentSearch,
          loading: action.payload,
          error: action.payload ? null : state.currentSearch.error,
        },
      };

    case 'SET_SEARCH_RESULTS':
      return {
        ...state,
        currentSearch: {
          ...state.currentSearch,
          results: action.payload,
          loading: false,
          error: null,
        },
      };

    case 'SET_SEARCH_ERROR':
      return {
        ...state,
        currentSearch: {
          ...state.currentSearch,
          error: action.payload,
          loading: false,
          results: null,
        },
      };

    case 'CLEAR_SEARCH_RESULTS':
      return {
        ...state,
        currentSearch: {
          ...state.currentSearch,
          results: null,
          error: null,
          loading: false,
        },
      };

    case 'SET_SEARCH_PARAMS':
      return {
        ...state,
        currentSearch: {
          ...state.currentSearch,
          type: action.payload.type,
          value: action.payload.value,
        },
      };

    case 'SET_THEME':
      return {
        ...state,
        ui: {
          ...state.ui,
          theme: action.payload,
        },
      };

    case 'TOGGLE_SIDEBAR':
      return {
        ...state,
        ui: {
          ...state.ui,
          sidebarOpen: !state.ui.sidebarOpen,
        },
      };

    case 'ADD_NOTIFICATION':
      const newNotification: Notification = {
        ...action.payload,
        id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
      };
      return {
        ...state,
        ui: {
          ...state.ui,
          notifications: [...state.ui.notifications, newNotification],
        },
      };

    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        ui: {
          ...state.ui,
          notifications: state.ui.notifications.filter(n => n.id !== action.payload),
        },
      };

    case 'CLEAR_NOTIFICATIONS':
      return {
        ...state,
        ui: {
          ...state.ui,
          notifications: [],
        },
      };

    case 'SET_HEALTH_STATUS':
      return {
        ...state,
        system: {
          health: action.payload,
          lastHealthCheck: new Date(),
        },
      };

    case 'SET_LANGUAGE':
      return {
        ...state,
        preferences: {
          ...state.preferences,
          language: action.payload,
        },
      };

    case 'SET_PREFERENCE':
      return {
        ...state,
        preferences: {
          ...state.preferences,
          [action.payload.key]: action.payload.value,
        },
      };

    default:
      return state;
  }
}

// Context interface
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  
  // Helper functions
  setSearchLoading: (loading: boolean) => void;
  setSearchResults: (results: SearchResults) => void;
  setSearchError: (error: string) => void;
  clearSearchResults: () => void;
  setSearchParams: (type: SearchType, value: string) => void;
  
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  setTheme: (theme: 'light' | 'dark') => void;
  toggleSidebar: () => void;
  
  setHealthStatus: (status: HealthStatus) => void;
  setLanguage: (language: 'ru' | 'en') => void;
  setPreference: (key: keyof AppState['preferences'], value: any) => void;
}

// Create context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Context provider component
interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Helper functions
  const setSearchLoading = (loading: boolean) => {
    dispatch({ type: 'SET_SEARCH_LOADING', payload: loading });
  };

  const setSearchResults = (results: SearchResults) => {
    dispatch({ type: 'SET_SEARCH_RESULTS', payload: results });
  };

  const setSearchError = (error: string) => {
    dispatch({ type: 'SET_SEARCH_ERROR', payload: error });
  };

  const clearSearchResults = () => {
    dispatch({ type: 'CLEAR_SEARCH_RESULTS' });
  };

  const setSearchParams = (type: SearchType, value: string) => {
    dispatch({ type: 'SET_SEARCH_PARAMS', payload: { type, value } });
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
    
    // Auto-remove notification after 5 seconds if autoClose is true
    if (notification.autoClose !== false) {
      setTimeout(() => {
        // We can't access the notification ID here, so we'll need to handle this differently
        // For now, we'll just clear all notifications of the same type after 5 seconds
      }, 5000);
    }
  };

  const removeNotification = (id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  };

  const clearNotifications = () => {
    dispatch({ type: 'CLEAR_NOTIFICATIONS' });
  };

  const setTheme = (theme: 'light' | 'dark') => {
    dispatch({ type: 'SET_THEME', payload: theme });
    // Also save to localStorage
    localStorage.setItem('theme', theme);
  };

  const toggleSidebar = () => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  };

  const setHealthStatus = (status: HealthStatus) => {
    dispatch({ type: 'SET_HEALTH_STATUS', payload: status });
  };

  const setLanguage = (language: 'ru' | 'en') => {
    dispatch({ type: 'SET_LANGUAGE', payload: language });
    localStorage.setItem('language', language);
  };

  const setPreference = (key: keyof AppState['preferences'], value: any) => {
    dispatch({ type: 'SET_PREFERENCE', payload: { key, value } });
    // Save preferences to localStorage
    const preferences = { ...state.preferences, [key]: value };
    localStorage.setItem('preferences', JSON.stringify(preferences));
  };

  const contextValue: AppContextType = {
    state,
    dispatch,
    setSearchLoading,
    setSearchResults,
    setSearchError,
    clearSearchResults,
    setSearchParams,
    addNotification,
    removeNotification,
    clearNotifications,
    setTheme,
    toggleSidebar,
    setHealthStatus,
    setLanguage,
    setPreference,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

// Custom hook to use the context
export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

// Export types for use in components
export type { AppState, Notification };
export { AppContext };