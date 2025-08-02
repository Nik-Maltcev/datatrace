/**
 * Search-related types and interfaces
 */

// Search input types
export type SearchType = 'phone' | 'email' | 'inn' | 'snils' | 'passport';

export interface SearchRequest {
  type: SearchType;
  value: string;
}

export interface UserInput {
  searchType: SearchType;
  searchValue: string;
}

// Search result types
export interface FoundDataItem {
  field: string;
  value: string;
  source?: string;
  confidence?: number;
}

export interface SearchResult {
  botId: string;
  botName: string; // зашифрованное название
  foundData: FoundDataItem[];
  hasData: boolean;
  status: SearchStatus;
  errorMessage?: string;
}

export interface SearchResults {
  searchId: string;
  timestamp: Date;
  results: SearchResult[];
  totalBotsSearched: number;
  totalBotsWithData: number;
}

export interface BotResult {
  botId: string;
  encryptedName: string; // "Бот A", "Бот B", etc.
  status: SearchStatus;
  foundFields: DataField[];
  errorMessage?: string;
}

export interface DataField {
  fieldName: string;
  fieldValue: string;
  confidence?: number;
}

// Search status enum
export enum SearchStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  NO_DATA = 'no_data',
  PENDING = 'pending',
  TIMEOUT = 'timeout'
}