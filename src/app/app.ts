import { Component, OnDestroy, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnDestroy {
  protected readonly title = signal('sentimenter-cx');
  private readonly router = inject(Router);
  private readonly routerSub: Subscription;

  constructor() {
    this.routerSub = this.router.events.subscribe(() => {
      /* in-page loaders only — no global overlay */
    });
  }

  ngOnDestroy(): void {
    this.routerSub.unsubscribe();
  }
}
