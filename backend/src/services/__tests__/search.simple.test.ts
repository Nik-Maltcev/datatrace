/**
 * Simple test for SearchService
 */

describe('SearchService Simple Test', () => {
  it('should be able to import SearchService', () => {
    // Use dynamic import to avoid TypeScript compilation issues
    const searchModule = require('../search.service.ts');
    expect(searchModule).toBeDefined();
    expect(searchModule.SearchService).toBeDefined();
  });

  it('should create SearchService instance', () => {
    const searchModule = require('../search.service.ts');
    const service = searchModule.SearchService.getInstance();
    expect(service).toBeDefined();
    expect(typeof service.searchAllBots).toBe('function');
    expect(typeof service.getBotNameMapping).toBe('function');
  });

  it('should provide bot name mapping', () => {
    const searchModule = require('../search.service.ts');
    const service = searchModule.SearchService.getInstance();
    const mapping = service.getBotNameMapping();
    
    expect(mapping['dyxless']).toBe('Бот A');
    expect(mapping['itp']).toBe('Бот B');
    expect(mapping['leak_osint']).toBe('Бот C');
    expect(mapping['userbox']).toBe('Бот D');
    expect(mapping['vektor']).toBe('Бот E');
  });
});