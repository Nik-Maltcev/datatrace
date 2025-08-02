/**
 * Simple test script to verify validation service works
 */

import { ValidationService } from './services/validation.service';

// Test the validation service
const service = ValidationService.getInstance();

console.log('Testing ValidationService...\n');

// Test phone validation
console.log('=== Phone Validation ===');
const phoneTests = [
  '+79123456789',
  '89123456789', 
  '123',
  'invalid'
];

phoneTests.forEach(phone => {
  const result = service.validate(phone, 'phone');
  console.log(`Phone: ${phone} -> Valid: ${result.isValid}, Sanitized: ${result.sanitizedValue || 'N/A'}`);
  if (!result.isValid) {
    console.log(`  Errors: ${result.errors.map(e => e.message).join(', ')}`);
  }
});

// Test email validation
console.log('\n=== Email Validation ===');
const emailTests = [
  'test@example.com',
  'INVALID@EXAMPLE.COM',
  'invalid-email',
  '@domain.com'
];

emailTests.forEach(email => {
  const result = service.validate(email, 'email');
  console.log(`Email: ${email} -> Valid: ${result.isValid}, Sanitized: ${result.sanitizedValue || 'N/A'}`);
  if (!result.isValid) {
    console.log(`  Errors: ${result.errors.map(e => e.message).join(', ')}`);
  }
});

// Test INN validation
console.log('\n=== INN Validation ===');
const innTests = [
  '7707083893', // Valid 10-digit INN
  '500100732259', // Valid 12-digit INN
  '1234567890', // Invalid checksum
  '123' // Too short
];

innTests.forEach(inn => {
  const result = service.validate(inn, 'inn');
  console.log(`INN: ${inn} -> Valid: ${result.isValid}, Sanitized: ${result.sanitizedValue || 'N/A'}`);
  if (!result.isValid) {
    console.log(`  Errors: ${result.errors.map(e => e.message).join(', ')}`);
  }
});

// Test multiple validation
console.log('\n=== Multiple Validation ===');
const multipleInputs = [
  { value: '+79123456789', type: 'phone' as const },
  { value: 'test@example.com', type: 'email' as const },
  { value: '7707083893', type: 'inn' as const }
];

const multipleResults = service.validateMultiple(multipleInputs);
console.log('Multiple validation results:');
Object.entries(multipleResults).forEach(([type, result]) => {
  console.log(`  ${type}: ${result.isValid ? 'Valid' : 'Invalid'}`);
});
console.log(`All valid: ${service.areAllValid(multipleResults)}`);

console.log('\n✅ Validation service test completed successfully!');