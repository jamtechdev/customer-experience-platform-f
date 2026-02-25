import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

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
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(
      withInterceptors([
        apiUrlInterceptor,
        authInterceptor,
        languageInterceptor,
        errorInterceptor
      ])
    )
  ]
};
