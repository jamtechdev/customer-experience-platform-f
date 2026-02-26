import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoaderService } from '../../services/loader.service';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (loaderService.isLoading()) {
      <div class="loader-overlay">
        <div class="loader-container">
          <div class="spinner"></div>
          @if (loaderService.loadingMessage()) {
            <p class="loader-message">{{ loaderService.loadingMessage() }}</p>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .loader-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      backdrop-filter: blur(2px);
    }

    .loader-container {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      min-width: 200px;
    }

    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid #e5e7eb;
      border-top-color: #059669;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .loader-message {
      margin: 0;
      color: #374151;
      font-size: 14px;
      font-weight: 500;
      text-align: center;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class LoaderComponent {
  readonly loaderService = inject(LoaderService);
}
