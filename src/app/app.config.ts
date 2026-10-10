import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, withXsrfConfiguration } from '@angular/common/http';
import { localBrowserBoundary } from './services/local-browser.interceptor';
import { localBrowserProviders } from './services/local-browser.providers';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(
      withXsrfConfiguration({ cookieName: 'M4C-XSRF', headerName: 'X-M4C-XSRF' }),
      withInterceptors([localBrowserBoundary]),
    ),
    ...localBrowserProviders(),
  ],
};
