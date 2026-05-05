/**
 * Environment helper – reads from .env (loaded into process.env at build/serve).
 * No separate env files; use the single .env and use these values in the project.
 */

export function getEnv(key: string, defaultValue: string = ''): string {
  if (typeof window !== 'undefined') {
    if ((window as any).__env__?.[key]) return (window as any).__env__[key];
    if ((window as any).__env?.[key]) return (window as any).__env[key];
    if ((window as any)[key]) return (window as any)[key];
  }
  if (typeof process !== 'undefined' && process.env?.[key]) {
    return process.env[key];
  }
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
  if (getEnv('NG_APP_PRODUCTION', '') === 'true') return true;
  if (getEnv('NODE_ENV', '') === 'production') return true;
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const h = window.location.hostname.toLowerCase();
    if (h === 'sentimenter.ai' || h.endsWith('.sentimenter.ai')) return true;
  }
  return false;
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return !isProduction();
}
