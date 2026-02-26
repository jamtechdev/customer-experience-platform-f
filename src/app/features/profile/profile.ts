import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { TranslationService, Language } from '../../core/services/translation.service';
import { LanguageSwitcher } from '../../core/components/language-switcher/language-switcher';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    FormsModule,
    LanguageSwitcher
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile {
  private authService = inject(AuthService);
  private translationService = inject(TranslationService);

  currentUser = signal(this.authService.currentUser());
  selectedLanguage = signal<Language>(this.translationService.getLanguage());
  availableLanguages = this.translationService.getAvailableLanguages();

  // Translation getter
  t = (key: string): string => this.translationService.translate(key);

  onLanguageChange(lang: Language): void {
    this.selectedLanguage.set(lang);
    this.translationService.setLanguage(lang);
  }

  getLanguageName(lang: Language): string {
    const langInfo = this.availableLanguages.find(l => l.code === lang);
    return langInfo?.name || lang.toUpperCase();
  }
}
