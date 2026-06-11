import { ApplicationConfig, importProvidersFrom, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MAT_SNACK_BAR_DEFAULT_OPTIONS, MatSnackBarModule } from '@angular/material/snack-bar';
import { provideToastr } from 'ngx-toastr';

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
    provideNoopAnimations(),
    provideToastr({
      timeOut: 4500,
      extendedTimeOut: 1500,
      positionClass: 'toast-top-right',
      preventDuplicates: true,
      progressBar: true,
      newestOnTop: true,
      closeButton: true,
    }),
    importProvidersFrom(MatSnackBarModule),
    {
      provide: MAT_SNACK_BAR_DEFAULT_OPTIONS,
      useValue: {
        duration: 3000,
        verticalPosition: 'top',
        horizontalPosition: 'right'
      }
    },
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
