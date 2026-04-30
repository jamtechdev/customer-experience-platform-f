import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CXWebSocketService } from './core/services/cx-websocket.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('sentimenter-cx');
  private readonly websocket = inject(CXWebSocketService);

  constructor() {
    // Start once at app bootstrap so all routes receive live updates.
    this.websocket.start();
  }
}
