import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export type Language = 'en' | 'tr' | 'ar';

export interface Translations {
  [key: string]: string | Translations;
}

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private http = inject(HttpClient);
  private currentLanguage = signal<Language>('en');
  private translations: Record<Language, Translations> = {} as Record<Language, Translations>;
  private translationsLoaded = signal<boolean>(false);
  private loadingPromise: Promise<void> | null = null;
  
  readonly currentLang = computed(() => this.currentLanguage());
  readonly isRTL = computed(() => this.currentLanguage() === 'ar');
  readonly isLoaded = computed(() => this.translationsLoaded());

  constructor() {
    // Initialize with fallback translations
    this.translations = {
      en: {},
      tr: {},
      ar: {}
    };

    const storedLanguage = this.readStoredLanguage();
    if (storedLanguage) {
      this.currentLanguage.set(storedLanguage);
    }

    // Load translations on initialization
    this.loadTranslations();

    // Update document direction when language changes
    effect(() => {
      const lang = this.currentLanguage();
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
        document.documentElement.setAttribute('lang', lang);
      }
    });
  }

  /**
   * Load translations from JSON files
   */
  async loadTranslations(): Promise<void> {
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = (async () => {
      try {
        const languages: Language[] = ['en', 'tr', 'ar'];
        const loadPromises = languages.map(async (lang) => {
          try {
            const translations = await firstValueFrom(
              this.http.get<Translations>(`/assets/i18n/${lang}.json`)
            );
            this.translations[lang] = translations;
          } catch (error) {
            console.warn(`Failed to load translations for ${lang}:`, error);
            // Keep empty object if loading fails
            this.translations[lang] = {};
          }
        });

        await Promise.all(loadPromises);
        this.translationsLoaded.set(true);
      } catch (error) {
        console.error('Error loading translations:', error);
        this.translationsLoaded.set(true); // Set to true even on error to prevent infinite loading
      }
    })();

    return this.loadingPromise;
  }

  /**
   * Set the current language
   */
  setLanguage(lang: Language): void {
    const normalized = this.normalizeLanguage(lang) ?? 'en';
    this.currentLanguage.set(normalized);
    this.storeLanguage(normalized);
  }

  /**
   * Get the current language
   */
  getLanguage(): Language {
    return this.currentLanguage();
  }

  /**
   * Get available languages
   */
  getAvailableLanguages(): Array<{ code: Language; name: string; nativeName: string }> {
    return [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
      { code: 'ar', name: 'Arabic', nativeName: 'العربية' }
    ];
  }

  /**
   * Translate a key with optional parameters
   * Supports nested keys (e.g., 'app.name', 'nav.dashboard')
   * Fallback order: current language → English → key itself
   */
  translate(key: string, params?: Record<string, string | number>): string {
    // Read so templates re-run after async JSON load (SSR/hydration + first paint).
    this.translationsLoaded();
    const lang = this.currentLanguage();
    const keys = key.split('.');
    
    // Try current language first
    let value = this.getNestedValue(this.translations[lang], keys);
    
    // Fallback to English if not found
    if (value === undefined && lang !== 'en') {
      value = this.getNestedValue(this.translations['en'], keys);
    }
    
    // If still not found, return the key
    if (value === undefined || typeof value !== 'string') {
      return key;
    }

    // Replace parameters
    if (params) {
      return value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
        return params[paramKey] != null ? String(params[paramKey]) : match;
      });
    }

    return value;
  }

  /**
   * Get nested value from translations object
   */
  private getNestedValue(obj: Translations | undefined, keys: string[]): string | undefined {
    if (!obj) return undefined;
    
    let current: any = obj;
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }
    
    return typeof current === 'string' ? current : undefined;
  }

  private normalizeLanguage(value: unknown): Language | null {
    const normalized = String(value ?? '').trim().toLowerCase().replace('_', '-');
    if (normalized.startsWith('tr') || normalized.includes('turkish') || normalized.includes('türkçe')) {
      return 'tr';
    }
    if (normalized.startsWith('ar') || normalized.includes('arabic') || normalized.includes('العربية')) {
      return 'ar';
    }
    if (normalized.startsWith('en') || normalized.includes('english')) {
      return 'en';
    }
    return null;
  }

  private readStoredLanguage(): Language | null {
    try {
      if (typeof localStorage === 'undefined') return null;
      return this.normalizeLanguage(localStorage.getItem('sentimenter_language'));
    } catch {
      return null;
    }
  }

  private storeLanguage(lang: Language): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('sentimenter_language', lang);
      }
    } catch {
      // Storage can be unavailable in private browsing or SSR. Current session still updates.
    }
  }

  /**
   * Check if translations are loaded
   */
  async waitForTranslations(): Promise<void> {
    if (this.translationsLoaded()) {
      return;
    }
    await this.loadTranslations();
  }
}
