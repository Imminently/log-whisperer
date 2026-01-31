/**
 * Tests for secret redaction
 */

import { describe, it, expect } from 'vitest';
import { redactSecrets, redactSecretsFromObject } from '../../src/utils/redaction.js';

describe('Secret Redaction', () => {
  it('should redact connection strings', () => {
    const text = 'ConnectionString=DefaultEndpointsProtocol=https;AccountName=test;AccountKey=abc123xyz';
    const redacted = redactSecrets(text);
    expect(redacted).toContain('***');
    expect(redacted).not.toContain('abc123xyz');
  });

  it('should redact API keys', () => {
    const text = 'api_key=sk-1234567890abcdef';
    const redacted = redactSecrets(text);
    expect(redacted).toContain('***');
    expect(redacted).not.toContain('sk-1234567890abcdef');
  });

  it('should redact JWT tokens', () => {
    const text = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const redacted = redactSecrets(text);
    expect(redacted).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
  });

  it('should redact passwords', () => {
    const text = 'password=superSecret123';
    const redacted = redactSecrets(text);
    expect(redacted).toContain('***');
    expect(redacted).not.toContain('superSecret123');
  });

  it('should handle objects with secrets', () => {
    const obj = {
      message: 'Error occurred',
      connectionString: 'DefaultEndpointsProtocol=https;AccountKey=secret123',
      user: 'testuser',
    };

    const redacted = redactSecretsFromObject(obj);
    expect(redacted).toBeDefined();
    expect(typeof redacted).toBe('object');
    const redactedObj = redacted as Record<string, unknown>;
    expect(redactedObj.connectionString).not.toContain('secret123');
  });

  it('should handle arrays', () => {
    const arr = [
      'api_key=test123',
      'normal message',
      'token=bearer abc123',
    ];

    const redacted = redactSecretsFromObject(arr);
    expect(Array.isArray(redacted)).toBe(true);
    const redactedArr = redacted as string[];
    expect(redactedArr[0]).not.toContain('test123');
    expect(redactedArr[1]).toBe('normal message'); // Should not be modified
  });

  it('should not modify text without secrets', () => {
    const text = 'This is a normal log message without any secrets';
    const redacted = redactSecrets(text);
    expect(redacted).toBe(text);
  });
});
