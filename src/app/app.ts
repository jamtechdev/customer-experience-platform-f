import { Component, signal, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { LoaderComponent } from './core/components/loader/loader.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LoaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('sentimenter-cx');
  private platformId = inject(PLATFORM_ID);

  ngOnInit(): void {
    // Suppress WebSocket/Pusher errors from browser extensions or cached scripts
    if (isPlatformBrowser(this.platformId)) {
      // Override console.error to filter out Pusher/WebSocket connection errors
      const originalError = console.error;
      console.error = (...args: any[]) => {
        const errorMessage = args.join(' ');
        // Filter out Pusher/Laravel Echo WebSocket connection errors
        if (
          errorMessage.includes('WebSocket connection') &&
          (errorMessage.includes('pusher') || 
           errorMessage.includes('Pusher') || 
           errorMessage.includes('127.0.0.1:8080') ||
           errorMessage.includes('laravel-echo'))
        ) {
          // Silently ignore these errors - they're from browser extensions or cached scripts
          return;
        }
        // Log all other errors normally
        originalError.apply(console, args);
      };

      // Also suppress WebSocket errors at the window level
      window.addEventListener('error', (event) => {
        if (
          event.message &&
          (event.message.includes('WebSocket') || 
           event.message.includes('pusher') || 
           event.message.includes('Pusher') ||
           event.message.includes('127.0.0.1:8080'))
        ) {
          event.preventDefault();
        }
      }, true);
    }
  }
}
