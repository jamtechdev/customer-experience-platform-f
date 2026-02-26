import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { TranslationService, Language } from '../../services/translation.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule
  ],
  templateUrl: './language-switcher.html',
  styleUrl: './language-switcher.css'
})
export class LanguageSwitcher {
  translationService = inject(TranslationService);

  readonly currentLang = computed(() => this.translationService.currentLang());
  readonly availableLanguages = this.translationService.getAvailableLanguages();
  readonly isRTL = computed(() => this.translationService.isRTL());

  getCurrentLanguageInfo() {
    const lang = this.currentLang();
    return this.availableLanguages.find(l => l.code === lang) || this.availableLanguages[0];
  }

  getLanguageFlag(lang: Language): string {
    const flags: Record<Language, string> = {
      en: '🇬🇧',
      tr: '🇹🇷',
      ar: '🇸🇦'
    };
    return flags[lang] || '🌐';
  }

  getLanguageName(lang: Language): string {
    const langInfo = this.availableLanguages.find(l => l.code === lang);
    return langInfo?.nativeName || lang.toUpperCase();
  }

  switchLanguage(lang: Language): void {
    this.translationService.setLanguage(lang);
  }
}
