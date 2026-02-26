import { Injectable, signal, computed } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {
  private readonly _loading = signal<boolean>(false);
  private readonly _loadingMessage = signal<string | null>(null);
  
  readonly isLoading = computed(() => this._loading());
  readonly loadingMessage = computed(() => this._loadingMessage());

  show(message?: string): void {
    this._loadingMessage.set(message || null);
    this._loading.set(true);
  }

  hide(): void {
    this._loading.set(false);
    this._loadingMessage.set(null);
  }

  setMessage(message: string | null): void {
    this._loadingMessage.set(message);
  }
}
