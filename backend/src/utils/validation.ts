import validator from 'validator';

// Allowed domains for scanning (whitelist approach for security)
const ALLOWED_SCAN_DOMAINS = [
  // Common test domains
  'example.com',
  'httpbin.org',
  // Add production domains as needed
];

// Blocked domains (security concerns)
const BLOCKED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '10.',
  '192.168.',
  '172.16.',
  '172.17.',
  '172.18.',
  '172.19.',
  '172.20.',
  '172.21.',
  '172.22.',
  '172.23.',
  '172.24.',
  '172.25.',
  '172.26.',
  '172.27.',
  '172.28.',
  '172.29.',
  '172.30.',
  '172.31.',
];

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitized?: any;
}

export class InputValidator {
  static validateUrl(url: string): ValidationResult {
    // Basic validation
    if (!url || typeof url !== 'string') {
      return { isValid: false, error: 'URL is required and must be a string' };
    }

    // Trim whitespace but don't escape URL (breaks URL format)
    const cleanUrl = url.trim();

    // Simple URL validation for development
    if (!validator.isURL(cleanUrl)) {
      return { isValid: false, error: 'Invalid URL format' };
    }

    try {
      const parsedUrl = new URL(cleanUrl);

      // Security checks
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return { isValid: false, error: 'Only HTTP and HTTPS protocols are allowed' };
      }

      // Check for blocked domains/IPs
      const hostname = parsedUrl.hostname.toLowerCase();
      for (const blocked of BLOCKED_DOMAINS) {
        if (hostname.includes(blocked)) {
          return { isValid: false, error: 'Cannot scan internal/private network addresses' };
        }
      }

      // Check for IP addresses (additional security)
      if (validator.isIP(hostname)) {
        return { isValid: false, error: 'Cannot scan IP addresses directly' };
      }

      // For production, you might want to enable domain whitelist
      // const isAllowedDomain = ALLOWED_SCAN_DOMAINS.some(domain => 
      //   hostname === domain || hostname.endsWith('.' + domain)
      // );
      // if (!isAllowedDomain) {
      //   return { isValid: false, error: 'Domain not in allowed list' };
      // }

      return { 
        isValid: true, 
        sanitized: parsedUrl.href 
      };
    } catch (error) {
      return { isValid: false, error: 'Invalid URL format' };
    }
  }

  static validateBrandColors(brandColors: any): ValidationResult {
    if (!brandColors) {
      return { isValid: true, sanitized: {} };
    }

    if (typeof brandColors !== 'object' || Array.isArray(brandColors)) {
      return { isValid: false, error: 'Brand colors must be an object' };
    }

    const sanitized: any = {};
    const allowedColors = ['primary', 'secondary', 'tertiary'];

    for (const [key, value] of Object.entries(brandColors)) {
      if (!allowedColors.includes(key)) {
        continue; // Skip unknown color keys
      }

      if (typeof value !== 'string') {
        continue; // Skip non-string values
      }

      // Validate hex color format
      const colorValue = value.toString().trim();
      if (validator.isHexColor(colorValue)) {
        sanitized[key] = colorValue;
      }
    }

    return { isValid: true, sanitized };
  }

  static validateSessionId(sessionId: string): ValidationResult {
    if (!sessionId || typeof sessionId !== 'string') {
      return { isValid: false, error: 'Session ID is required' };
    }

    // Check if it's a valid UUID
    if (!validator.isUUID(sessionId)) {
      return { isValid: false, error: 'Invalid session ID format' };
    }

    return { isValid: true, sanitized: sessionId };
  }

  static sanitizeString(input: string, maxLength: number = 1000): string {
    if (!input || typeof input !== 'string') return '';
    
    return validator.escape(
      validator.trim(input.slice(0, maxLength))
    );
  }
}