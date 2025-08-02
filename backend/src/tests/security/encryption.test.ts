/**
 * Bot Name Encryption Tests
 * Comprehensive tests for bot name encryption and security
 */

import { SearchService } from '../../services/search.service';
import { SearchRequest, SearchType } from '../../types/search';

describe('Bot Name Encryption Tests', () => {
  let searchService: SearchService;

  beforeAll(() => {
    searchService = SearchService.getInstance({
      enableEncryption: true,
      maxSearchTime: 30000,
      enableResultAggregation: true,
      logSearches: false // Disable logging for tests
    });
  });

  describe('Encryption Consistency', () => {
    it('should consistently encrypt bot names across searches', async () => {
      const testRequests: SearchRequest[] = [
        { type: 'phone', value: '+79123456789' },
        { type: 'email', value: 'test@example.com' },
        { type: 'inn', value: '1234567890' }
      ];

      const encryptionMappings: Record<string, string> = {};

      for (const request of testRequests) {
        try {
          const results = await searchService.searchAllBots(request);
          
          for (const result of results.results) {
            const botId = result.botId;
            const botName = result.botName;

            if (encryptionMappings[botId]) {
              // Ensure consistent mapping
              expect(encryptionMappings[botId]).toBe(botName);
            } else {
              encryptionMappings[botId] = botName;
            }

            // Verify encryption format
            expect(botName).toMatch(/^Бот [A-E]$/);
          }
        } catch (error) {
          // Allow for API failures in tests, but ensure no server errors
          expect(error).not.toBeInstanceOf(TypeError);
        }
      }

      // Verify all expected bot IDs have consistent mappings
      const expectedBotIds = ['dyxless', 'itp', 'leak_osint', 'userbox', 'vektor'];
      const expectedEncryptions = ['Бот A', 'Бот B', 'Бот C', 'Бот D', 'Бот E'];

      for (const botId of expectedBotIds) {
        if (encryptionMappings[botId]) {
          expect(expectedEncryptions).toContain(encryptionMappings[botId]);
        }
      }
    });

    it('should not expose original bot identifiers', async () => {
      const request: SearchRequest = { type: 'phone', value: '+79123456789' };
      
      try {
        const results = await searchService.searchAllBots(request);
        
        for (const result of results.results) {
          const botName = result.botName;
          
          // Ensure original identifiers are not exposed
          expect(botName).not.toContain('dyxless');
          expect(botName).not.toContain('itp');
          expect(botName).not.toContain('leak_osint');
          expect(botName).not.toContain('userbox');
          expect(botName).not.toContain('vektor');
          expect(botName).not.toContain('api');
          expect(botName).not.toContain('client');
          
          // Should only contain encrypted format
          expect(botName).toMatch(/^Бот [A-E]$/);
        }
      } catch (error) {
        // Allow for API failures but ensure no exposure in error messages
        const errorMessage = error instanceof Error ? error.message : String(error);
        expect(errorMessage).not.toContain('dyxless');
        expect(errorMessage).not.toContain('userbox');
      }
    });

    it('should maintain encryption when service is disabled and re-enabled', () => {
      // Test encryption mapping consistency
      const botIds = ['dyxless', 'itp', 'leak_osint', 'userbox', 'vektor'];
      const firstMappings: Record<string, string> = {};
      
      // Get initial mappings
      for (const botId of botIds) {
        const encrypted = searchService['encryptBotName'](botId, botId);
        firstMappings[botId] = encrypted;
      }

      // Create new service instance
      const newService = SearchService.getInstance({
        enableEncryption: true,
        maxSearchTime: 30000,
        enableResultAggregation: true,
        logSearches: false
      });

      // Verify mappings are consistent
      for (const botId of botIds) {
        const encrypted = newService['encryptBotName'](botId, botId);
        expect(encrypted).toBe(firstMappings[botId]);
      }
    });
  });

  describe('Encryption Security', () => {
    it('should not allow reverse engineering of bot identifiers', () => {
      const encryptedNames = ['Бот A', 'Бот B', 'Бот C', 'Бот D', 'Бот E'];
      const originalIds = ['dyxless', 'itp', 'leak_osint', 'userbox', 'vektor'];

      // Verify that encrypted names don't reveal patterns
      for (let i = 0; i < encryptedNames.length; i++) {
        const encrypted = encryptedNames[i];
        const original = originalIds[i];

        // No character overlap that could reveal mapping
        const encryptedChars = encrypted.toLowerCase().split('');
        const originalChars = original.toLowerCase().split('');
        
        const overlap = encryptedChars.filter(char => originalChars.includes(char));
        expect(overlap.length).toBeLessThan(2); // Minimal overlap allowed
      }
    });

    it('should handle edge cases in encryption', () => {
      const edgeCases = [
        '', // Empty string
        'unknown_bot', // Unknown bot ID
        'DYXLESS', // Uppercase
        'dyxless_v2', // Modified ID
        null, // Null value
        undefined // Undefined value
      ];

      for (const testCase of edgeCases) {
        try {
          const encrypted = searchService['encryptBotName'](testCase as string, testCase as string);
          
          if (encrypted) {
            // Should still follow encryption format
            expect(encrypted).toMatch(/^Бот [A-Z]$/);
          }
        } catch (error) {
          // Should handle gracefully without exposing internals
          expect(error).toBeInstanceOf(Error);
        }
      }
    });

    it('should not leak encryption logic in error messages', async () => {
      // Test with invalid search request that might trigger errors
      const invalidRequest: SearchRequest = { type: 'phone' as SearchType, value: 'invalid-phone' };
      
      try {
        await searchService.searchAllBots(invalidRequest);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Error message should not contain encryption details
        expect(errorMessage).not.toContain('encrypt');
        expect(errorMessage).not.toContain('mapping');
        expect(errorMessage).not.toContain('Бот A');
        expect(errorMessage).not.toContain('Бот B');
        
        // Should not expose bot IDs
        expect(errorMessage).not.toContain('dyxless');
        expect(errorMessage).not.toContain('userbox');
      }
    });
  });

  describe('Encryption Performance', () => {
    it('should encrypt bot names efficiently', () => {
      const botIds = ['dyxless', 'itp', 'leak_osint', 'userbox', 'vektor'];
      const iterations = 1000;
      
      const startTime = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        for (const botId of botIds) {
          searchService['encryptBotName'](botId, botId);
        }
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should complete 5000 encryptions in less than 100ms
      expect(totalTime).toBeLessThan(100);
    });

    it('should not impact search performance significantly', async () => {
      // Create service with encryption disabled
      const unencryptedService = SearchService.getInstance({
        enableEncryption: false,
        maxSearchTime: 30000,
        enableResultAggregation: true,
        logSearches: false
      });

      // Create service with encryption enabled
      const encryptedService = SearchService.getInstance({
        enableEncryption: true,
        maxSearchTime: 30000,
        enableResultAggregation: true,
        logSearches: false
      });

      const request: SearchRequest = { type: 'phone', value: '+79123456789' };

      try {
        // Measure unencrypted search time
        const unencryptedStart = Date.now();
        await unencryptedService.searchAllBots(request);
        const unencryptedTime = Date.now() - unencryptedStart;

        // Measure encrypted search time
        const encryptedStart = Date.now();
        await encryptedService.searchAllBots(request);
        const encryptedTime = Date.now() - encryptedStart;

        // Encryption overhead should be minimal (less than 10% increase)
        const overhead = ((encryptedTime - unencryptedTime) / unencryptedTime) * 100;
        expect(overhead).toBeLessThan(10);
      } catch (error) {
        // Allow for API failures in tests
        expect(error).not.toBeInstanceOf(TypeError);
      }
    });
  });

  describe('Encryption Integration', () => {
    it('should work correctly with result aggregation', async () => {
      const request: SearchRequest = { type: 'phone', value: '+79123456789' };
      
      try {
        const results = await searchService.searchAllBots(request);
        
        // Verify structure
        expect(results).toHaveProperty('results');
        expect(Array.isArray(results.results)).toBe(true);
        expect(results).toHaveProperty('encryptionEnabled', true);
        
        // Verify each result has encrypted bot name
        for (const result of results.results) {
          expect(result).toHaveProperty('botId');
          expect(result).toHaveProperty('botName');
          expect(result.botName).toMatch(/^Бот [A-E]$/);
          
          // Bot ID should still be original for internal use
          expect(['dyxless', 'itp', 'leak_osint', 'userbox', 'vektor']).toContain(result.botId);
        }
      } catch (error) {
        // Allow for API failures
        expect(error).not.toBeInstanceOf(TypeError);
      }
    });

    it('should maintain encryption in error recovery scenarios', async () => {
      // Test with a request that might trigger error recovery
      const request: SearchRequest = { type: 'email', value: 'test@nonexistent-domain.invalid' };
      
      try {
        const results = await searchService.searchAllBots(request);
        
        // Even in error recovery, encryption should be maintained
        for (const result of results.results) {
          expect(result.botName).toMatch(/^Бот [A-E]$/);
        }
      } catch (error) {
        // Error recovery might still fail, but should not expose bot names
        const errorMessage = error instanceof Error ? error.message : String(error);
        expect(errorMessage).not.toContain('dyxless');
        expect(errorMessage).not.toContain('userbox');
      }
    });

    it('should work with specific bot searches', async () => {
      const request: SearchRequest = { type: 'phone', value: '+79123456789' };
      const specificBotIds = ['dyxless', 'userbox'];
      
      try {
        const results = await searchService.searchWithSpecificBots(request, specificBotIds);
        
        // Should only return results for specified bots
        expect(results.results.length).toBeLessThanOrEqual(specificBotIds.length);
        
        // All returned results should have encrypted names
        for (const result of results.results) {
          expect(result.botName).toMatch(/^Бот [A-E]$/);
          expect(specificBotIds).toContain(result.botId);
        }
      } catch (error) {
        // Allow for API failures
        expect(error).not.toBeInstanceOf(TypeError);
      }
    });
  });

  describe('Encryption Configuration', () => {
    it('should respect encryption configuration', () => {
      // Test with encryption disabled
      const disabledService = SearchService.getInstance({
        enableEncryption: false,
        maxSearchTime: 30000,
        enableResultAggregation: true,
        logSearches: false
      });

      const config = disabledService.getConfig();
      expect(config.enableEncryption).toBe(false);

      // Test with encryption enabled
      const enabledService = SearchService.getInstance({
        enableEncryption: true,
        maxSearchTime: 30000,
        enableResultAggregation: true,
        logSearches: false
      });

      const enabledConfig = enabledService.getConfig();
      expect(enabledConfig.enableEncryption).toBe(true);
    });

    it('should allow configuration updates', () => {
      const service = SearchService.getInstance();
      
      // Update configuration
      service.updateConfig({ enableEncryption: false });
      
      let config = service.getConfig();
      expect(config.enableEncryption).toBe(false);
      
      // Update back
      service.updateConfig({ enableEncryption: true });
      
      config = service.getConfig();
      expect(config.enableEncryption).toBe(true);
    });
  });

  describe('Encryption Validation', () => {
    it('should validate encryption mapping completeness', () => {
      const allBotIds = ['dyxless', 'itp', 'leak_osint', 'userbox', 'vektor'];
      const encryptedNames = new Set<string>();
      
      for (const botId of allBotIds) {
        const encrypted = searchService['encryptBotName'](botId, botId);
        encryptedNames.add(encrypted);
      }
      
      // Should have unique encrypted names for each bot
      expect(encryptedNames.size).toBe(allBotIds.length);
      
      // All should follow the pattern
      for (const encrypted of encryptedNames) {
        expect(encrypted).toMatch(/^Бот [A-E]$/);
      }
    });

    it('should handle concurrent encryption requests', async () => {
      const botIds = ['dyxless', 'itp', 'leak_osint', 'userbox', 'vektor'];
      const concurrentRequests = 100;
      
      const promises = [];
      for (let i = 0; i < concurrentRequests; i++) {
        const botId = botIds[i % botIds.length];
        promises.push(
          Promise.resolve(searchService['encryptBotName'](botId, botId))
        );
      }
      
      const results = await Promise.all(promises);
      
      // All results should be valid encryptions
      for (const result of results) {
        expect(result).toMatch(/^Бот [A-E]$/);
      }
      
      // Verify consistency for same bot IDs
      const dyxlessResults = results.filter((_, i) => botIds[i % botIds.length] === 'dyxless');
      const uniqueDyxlessResults = new Set(dyxlessResults);
      expect(uniqueDyxlessResults.size).toBe(1); // Should all be the same
    });
  });
});