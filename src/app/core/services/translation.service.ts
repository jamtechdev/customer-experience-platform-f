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
  private currentLanguage = signal<Language>('tr');
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

    // Load saved language preference
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('preferredLanguage') as Language;
      if (savedLang && (savedLang === 'en' || savedLang === 'tr' || savedLang === 'ar')) {
        this.currentLanguage.set(savedLang);
      }
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
    this.currentLanguage.set(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferredLanguage', lang);
    }
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
   * Fallback order: current language → Turkish → English → key itself
   */
  translate(key: string, params?: Record<string, string>): string {
    const lang = this.currentLanguage();
    const keys = key.split('.');
    
    // Try current language first
    let value = this.getNestedValue(this.translations[lang], keys);
    
    // Fallback to Turkish if not found
    if (value === undefined && lang !== 'tr') {
      value = this.getNestedValue(this.translations['tr'], keys);
    }
    
    // Fallback to English if still not found
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
        return params[paramKey] || match;
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
