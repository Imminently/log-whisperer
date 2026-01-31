/**
 * Secret redaction utilities
 */

/**
 * Common patterns that might indicate secrets
 */
const SECRET_PATTERNS = [
  // Connection strings
  /(?:connectionstring|connection_string|connstr)[=:]\s*([^\s;]+)/gi,
  // API keys
  /(?:apikey|api_key|apisecret|api_secret)[=:]\s*([^\s;]+)/gi,
  // Tokens
  /(?:token|bearer|authorization)[=:]\s*([^\s;]+)/gi,
  // Passwords
  /(?:password|pwd|passwd)[=:]\s*([^\s;]+)/gi,
  // Azure keys
  /(?:accountkey|account_key|storagekey)[=:]\s*([^\s;]+)/gi,
  // JWT tokens (basic pattern)
  /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  // Generic long hex/base64 strings that might be keys
  /[A-Za-z0-9+/]{40,}={0,2}/g,
];

/**
 * Redact secrets from a string
 */
export function redactSecrets(text: string): string {
  let redacted = text;

  for (const pattern of SECRET_PATTERNS) {
    redacted = redacted.replace(pattern, (match) => {
      // Keep first 4 chars and last 4 chars, redact the middle
      if (match.length > 12) {
        return `${match.substring(0, 4)}${'*'.repeat(Math.min(20, match.length - 8))}${match.substring(match.length - 4)}`;
      }
      return '***REDACTED***';
    });
  }

  return redacted;
}

/**
 * Redact secrets from an object recursively
 */
export function redactSecretsFromObject(obj: unknown): unknown {
  // Preserve Date objects
  if (obj instanceof Date) {
    return obj;
  }

  if (typeof obj === 'string') {
    return redactSecrets(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(redactSecretsFromObject);
  }

  if (obj && typeof obj === 'object') {
    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Preserve Date objects
      if (value instanceof Date) {
        redacted[key] = value;
      } else if (key.toLowerCase().includes('redacted') || key.toLowerCase().includes('hash')) {
        // Skip redaction for certain safe keys
        redacted[key] = value;
      } else {
        redacted[key] = redactSecretsFromObject(value);
      }
    }
    return redacted;
  }

  return obj;
}
