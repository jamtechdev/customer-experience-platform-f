import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { TranslationService } from '../../core/services/translation.service';

@Component({
  selector: 'app-footer',
  imports: [CommonModule, MatToolbarModule],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer {
  private readonly translationService = inject(TranslationService);
  currentYear = new Date().getFullYear();
  readonly t = (key: string, params?: Record<string, string>): string =>
    this.translationService.translate(key, params);
}
