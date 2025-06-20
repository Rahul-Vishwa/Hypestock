import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAuth0 } from '@auth0/auth0-angular';
import { routes } from './routes/app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { httpInterceptor } from './core/interceptors/http.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes),
    provideAuth0({
      domain: 'codeaux.us.auth0.com',
      clientId: '1fl0gGRv1Bxm0onMMX5Etbk4ODu2bJQK',
      authorizationParams: {
        redirect_uri: 'https://dev.hypestock.local/auth/callback',
        audience: 'https://api.hypestock.local/'
      },
      cacheLocation: 'localstorage'
    }),
    provideHttpClient(
      withInterceptors([httpInterceptor, errorInterceptor])
    ),
  ]
};
