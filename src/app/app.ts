import { Component, OnDestroy, inject, signal } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { CXWebSocketService } from './core/services/cx-websocket.service';
import { ImportProcessingService } from './core/services/import-processing.service';
import { OllamaLoader } from './core/components/ollama-loader/ollama-loader';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, OllamaLoader],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnDestroy {
  protected readonly title = signal('sentimenter-cx');
  protected readonly routeLoading = signal(false);
  private readonly websocket = inject(CXWebSocketService);
  private readonly importProcessing = inject(ImportProcessingService);
  private readonly router = inject(Router);
  private readonly routerSub: Subscription;

  constructor() {
    // Start once at app bootstrap so all routes receive live updates.
    this.websocket.start();
    this.importProcessing.syncFromApi();
    this.routerSub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.routeLoading.set(true);
      }
      if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
        this.routeLoading.set(false);
      }
    });
  }

  ngOnDestroy(): void {
    this.routerSub.unsubscribe();
  }
}
