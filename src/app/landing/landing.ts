import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslationService } from '../core/services/translation.service';
import { LanguageSwitcher } from '../core/components/language-switcher/language-switcher';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, LanguageSwitcher],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})
export class Landing {
  private translationService = inject(TranslationService);

  // Translation getter
  t = (key: string): string => this.translationService.translate(key);

  currentYear = new Date().getFullYear();

  features = [
    {
      icon: 'analytics',
      titleKey: 'sentimentAnalysis',
      descriptionKey: 'sentimentAnalysisDesc'
    },
    {
      icon: 'trending_up',
      titleKey: 'npsAnalysis',
      descriptionKey: 'npsAnalysisDesc'
    },
    {
      icon: 'search',
      titleKey: 'rootCauseAnalysis',
      descriptionKey: 'rootCauseAnalysisDesc'
    },
    {
      icon: 'compare',
      titleKey: 'competitorAnalysis',
      descriptionKey: 'competitorAnalysisDesc'
    },
    {
      icon: 'map',
      titleKey: 'customerJourney',
      descriptionKey: 'customerJourneyDesc'
    },
    {
      icon: 'notifications',
      titleKey: 'detailedReports',
      descriptionKey: 'detailedReportsDesc'
    }
  ];
}
