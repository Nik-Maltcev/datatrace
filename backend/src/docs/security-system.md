# Security System Documentation

## Overview

The Privacy Data Removal Service implements a comprehensive security system designed to protect personally identifiable information (PII), prevent abuse, and ensure data privacy compliance. The security system consists of multiple layers of protection working together to create a robust defense against various threats.

## Components

### 1. SecurityService

The core security service provides encryption, PII sanitization, and memory management capabilities.

#### Features:
- **Data Encryption**: AES-256-GCM encryption for sensitive data in memory
- **PII Sanitization**: Automatic detection and masking of personal information in logs
- **Memory Cleanup**: Forced garbage collection and sensitive data cleanup
- **Registry Management**: Tracking and cleanup of encrypted data entries

#### Usage:
```typescript
import { securityService } from '../services/security.service';

// Encrypt sensitive data
const encrypted = securityService.encryptSensitiveData('sensitive info');

// Sanitize data for logging
const sanitized = securityService.sanitizeForLogging(userData);

// Force memory cleanup
securityService.forceMemoryCleanup();
```

### 2. AdvancedRateLimitService

Sophisticated rate limiting with IP tracking, suspicious activity detection, and dynamic adjustments.

#### Features:
- **IP-based Rate Limiting**: Track requests per IP address
- **Suspicious Activity Detection**: Identify and block malicious patterns
- **Dynamic Blocking**: Automatic IP blocking for suspicious behavior
- **Pattern Analysis**: Detect rapid requests, multiple endpoints, unusual user agents

#### Configuration:
```typescript
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000,     // 15 minutes
  maxRequests: 20,              // Max requests per window
  suspiciousThreshold: 0.7,     // Suspicion score threshold
  blockDuration: 60 * 60 * 1000, // 1 hour block
  enableSuspiciousDetection: true
};
```

### 3. Security Middleware

Comprehensive middleware that orchestrates all security features.

#### Components:
- **PII Sanitization Middleware**: Removes PII from request/response logs
- **Memory Cleanup Middleware**: Cleans sensitive data after request processing
- **Data Encryption Middleware**: Encrypts sensitive request data
- **Security Headers Middleware**: Sets security-related HTTP headers
- **Threat Detection**: Detects SQL injection, XSS, path traversal attempts

#### Configuration:
```typescript
app.use(securityMiddleware({
  enablePIISanitization: true,
  enableMemoryCleanup: true,
  enableDataEncryption: true,
  enableAdvancedRateLimit: true,
  enableThreatDetection: true,
  enableSecurityHeaders: true
}));
```

## Security Features

### 1. PII Protection

#### Automatic Detection:
The system automatically detects and protects the following types of PII:
- Phone numbers (various formats)
- Email addresses
- INN (Russian tax identification numbers)
- SNILS (Russian social security numbers)
- Passport numbers
- Any field containing sensitive keywords

#### Sanitization Methods:
- **Masking**: Shows first 2 and last 2 characters, masks the rest
- **Replacement**: Replaces patterns with `[TYPE_MASKED]` placeholders
- **Field-based**: Identifies sensitive fields by name patterns

### 2. Memory Security

#### Features:
- **Automatic Cleanup**: Scheduled cleanup of sensitive data
- **Force Cleanup**: Manual cleanup on demand
- **Registry Tracking**: Tracks all encrypted data for cleanup
- **Process Exit Handlers**: Cleanup on application shutdown

#### Cleanup Schedule:
- **Immediate**: After request processing
- **Periodic**: Every 10 minutes for old entries
- **On Exit**: When process terminates

### 3. Threat Detection

#### Detected Threats:
- **SQL Injection**: Pattern matching for SQL injection attempts
- **XSS Attacks**: Detection of cross-site scripting attempts
- **Path Traversal**: Directory traversal attack detection
- **Malicious User Agents**: Known attack tool user agents
- **Suspicious Patterns**: Unusual request characteristics

#### Response Actions:
- **Block Request**: Immediate 403 response for detected threats
- **Log Incident**: Detailed logging of security events
- **IP Tracking**: Track suspicious IPs for future blocking

### 4. Rate Limiting

#### Multi-tier Approach:
- **General API**: 100 requests per 15 minutes
- **Search Endpoints**: 20 requests per 15 minutes
- **Strict Operations**: 5 requests per hour
- **Health Checks**: 1000 requests per 15 minutes

#### Advanced Features:
- **Suspicious Activity Scoring**: Behavioral analysis
- **Dynamic Blocking**: Automatic IP blocking
- **Pattern Recognition**: Detect bot-like behavior
- **Whitelist Support**: Skip rate limiting for specific paths

## Security Headers

The system automatically sets the following security headers:

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Cache-Control: no-store, no-cache, must-revalidate, private
```

## Environment Variables

### Required:
```env
ENCRYPTION_KEY=<32-byte-hex-key>  # Optional: auto-generated if not provided
```

### Optional:
```env
EMERGENCY_LOCKDOWN=true           # Enable emergency lockdown mode
NODE_ENV=production              # Environment mode
LOG_LEVEL=info                   # Logging level
```

## Monitoring and Metrics

### Security Metrics:
- Registry size (encrypted data entries)
- Active cleanup tasks
- Encryption algorithm in use
- Rate limit statistics
- Blocked IPs count
- Suspicious activity patterns

### Logging:
All security events are logged with appropriate detail levels:
- **INFO**: Normal security operations
- **WARN**: Suspicious activity, rate limits exceeded
- **ERROR**: Security failures, encryption errors
- **DEBUG**: Detailed security operations (development only)

## Emergency Features

### Emergency Lockdown:
Set `EMERGENCY_LOCKDOWN=true` to immediately block all requests with a 503 response.

### Manual IP Management:
```typescript
// Block IP manually
advancedRateLimitService.manuallyBlockIP('192.168.1.1', 3600000);

// Unblock IP manually
advancedRateLimitService.manuallyUnblockIP('192.168.1.1');

// Get blocked IPs
const blockedIPs = advancedRateLimitService.getBlockedIPs();
```

## Best Practices

### 1. Data Handling:
- Never log raw PII data
- Always use sanitized versions for logging
- Encrypt sensitive data before processing
- Clean up memory after operations

### 2. Rate Limiting:
- Use appropriate limits for different endpoints
- Monitor for suspicious patterns
- Implement progressive penalties
- Provide clear error messages

### 3. Threat Detection:
- Keep threat patterns updated
- Log all security events
- Implement automated responses
- Regular security audits

### 4. Memory Management:
- Force cleanup after sensitive operations
- Monitor memory usage
- Use automatic cleanup schedules
- Handle process exits gracefully

## Testing

The security system includes comprehensive unit tests covering:
- Encryption/decryption functionality
- PII sanitization accuracy
- Memory cleanup effectiveness
- Rate limiting behavior
- Threat detection patterns
- Error handling scenarios

Run tests with:
```bash
npm test -- --testPathPattern=security
```

## Compliance

The security system helps ensure compliance with:
- **GDPR**: Right to be forgotten, data minimization
- **Russian Data Protection Laws**: Local data handling requirements
- **Industry Standards**: Security best practices
- **Privacy Regulations**: PII protection and cleanup

## Performance Impact

The security system is designed for minimal performance impact:
- **Encryption**: ~1-2ms per operation
- **Sanitization**: ~0.5ms per log entry
- **Rate Limiting**: ~0.1ms per request
- **Memory Cleanup**: Background operations
- **Threat Detection**: Pattern matching optimized

## Troubleshooting

### Common Issues:

1. **High Memory Usage**:
   - Check registry size in metrics
   - Force memory cleanup
   - Verify cleanup schedules

2. **False Positive Threat Detection**:
   - Review threat patterns
   - Check request content
   - Adjust detection sensitivity

3. **Rate Limit Issues**:
   - Monitor IP activity patterns
   - Check suspicious activity scores
   - Review rate limit configurations

4. **Encryption Errors**:
   - Verify encryption key format
   - Check data integrity
   - Review error logs

### Debug Mode:
Set `LOG_LEVEL=debug` to enable detailed security logging for troubleshooting.