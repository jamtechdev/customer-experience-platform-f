import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { SettingsService } from './settings.service';

@Injectable({
  providedIn: 'root',
})
export class FirebaseNotificationService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly settingsService = inject(SettingsService);
  private readonly tokenStorageKey = 'sentimenter_fcm_token';
  private initialized = false;

  isConfigured(): boolean {
    const cfg = environment.firebase;
    return !!(cfg.apiKey && cfg.projectId && cfg.messagingSenderId && cfg.appId && cfg.vapidKey);
  }

  async enableAlertNotifications(): Promise<string | null> {
    if (!isPlatformBrowser(this.platformId) || !this.isConfigured()) return null;
    if (!('Notification' in window)) return null;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const [{ initializeApp, getApps }, { getMessaging, getToken, isSupported, onMessage }] = await Promise.all([
      import('firebase/app'),
      import('firebase/messaging'),
    ]);

    if (!(await isSupported())) return null;

    const app = getApps().length ? getApps()[0] : initializeApp(environment.firebase);
    const messaging = getMessaging(app);
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const token = await getToken(messaging, {
      vapidKey: environment.firebase.vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (!token) return null;
    localStorage.setItem(this.tokenStorageKey, token);

    if (!this.initialized) {
      this.initialized = true;
      onMessage(messaging, (payload) => {
        const title = payload.notification?.title || 'CX Alert';
        const body = payload.notification?.body || '';
        if (Notification.permission === 'granted') {
          new Notification(title, { body, icon: '/assets/images/logo-icon.svg' });
        }
      });
    }

    await new Promise<void>((resolve, reject) => {
      this.settingsService.registerAlertPushToken(token).subscribe({
        next: () => resolve(),
        error: reject,
      });
    });

    return token;
  }

  async disableAlertNotifications(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    const token = localStorage.getItem(this.tokenStorageKey);
    if (token) {
      await new Promise<void>((resolve) => {
        this.settingsService.unregisterAlertPushToken(token).subscribe({
          next: () => resolve(),
          error: () => resolve(),
        });
      });
      localStorage.removeItem(this.tokenStorageKey);
    }
  }
}
