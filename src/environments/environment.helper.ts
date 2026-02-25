/**
 * Environment Helper Utility
 * Provides helper functions to access environment variables
 * Works with both .env files and direct environment object
 */

/**
 * Get environment variable with fallback
 */
export function getEnv(key: string, defaultValue: string = ''): string {
  // In browser, use window object if available
  if (typeof window !== 'undefined') {
    // Check for window.__env (injected at runtime)
    if ((window as any).__env && (window as any).__env[key]) {
      return (window as any).__env[key];
    }
    // Check for NG_APP_ prefixed variables in window
    if ((window as any)[key]) {
      return (window as any)[key];
    }
  }
  
  // For build time, check process.env only if available (Node.js environment)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  
  // Return default value
  return defaultValue;
}

/**
 * Get boolean environment variable
 */
export function getEnvBoolean(key: string, defaultValue: boolean = false): boolean {
  const value = getEnv(key, String(defaultValue));
  return value === 'true' || value === '1' || value === 'yes';
}

/**
 * Get number environment variable
 */
export function getEnvNumber(key: string, defaultValue: number = 0): number {
  const value = getEnv(key, String(defaultValue));
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Get array from comma-separated environment variable
 */
export function getEnvArray(key: string, defaultValue: string[] = []): string[] {
  const value = getEnv(key, '');
  if (!value) return defaultValue;
  return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return getEnv('NG_APP_PRODUCTION', 'false') === 'true' || 
         getEnv('NODE_ENV', '') === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return !isProduction();
}
