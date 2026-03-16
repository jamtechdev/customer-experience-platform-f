import { Injectable, signal, computed } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {
  // Use an internal counter to support multiple concurrent requests
  private readonly _counter = signal<number>(0);
  private readonly _loadingMessage = signal<string | null>(null);
  
  readonly isLoading = computed(() => this._counter() > 0);
  readonly loadingMessage = computed(() => this._loadingMessage());

  show(message?: string): void {
    this._loadingMessage.set(message || null);
    this._counter.update(count => count + 1);
  }

  hide(): void {
    this._counter.update(count => Math.max(0, count - 1));
    this._loadingMessage.set(null);
  }

  setMessage(message: string | null): void {
    this._loadingMessage.set(message);
  }
}
