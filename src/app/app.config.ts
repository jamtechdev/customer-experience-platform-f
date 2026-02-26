import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { 
  apiUrlInterceptor, 
  authInterceptor, 
  errorInterceptor, 
  languageInterceptor 
} from './core/interceptors/http.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      // Use component input binding instead of blocking navigation
      // Guards will handle async auth initialization properly
      withComponentInputBinding()
    ),
    provideClientHydration(withEventReplay()),
    provideHttpClient(
      withFetch(), // Enable fetch API for better SSR performance
      withInterceptors([
        apiUrlInterceptor,
        authInterceptor,
        languageInterceptor,
        errorInterceptor
      ])
    )
  ]
};
