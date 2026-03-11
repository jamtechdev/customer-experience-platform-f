import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SocialMediaService, Methodology as MethodologyData } from '../../../core/services/social-media.service';

@Component({
  selector: 'app-methodology',
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './methodology.html',
  styleUrl: './methodology.css',
})
export class Methodology implements OnInit {
  private socialMediaService = inject(SocialMediaService);

  loading = signal(true);
  methodology = signal<MethodologyData | null>(null);

  ngOnInit(): void {
    this.socialMediaService.getMethodology().subscribe({
      next: (res) => {
        if (res.success && res.data) this.methodology.set(res.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}
