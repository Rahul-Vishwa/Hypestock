import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { finalize, from, switchMap } from 'rxjs';
import { environment } from '../../environments/environment.development';
import { LoaderService } from '../../shared/services/loader.service';

export const httpInterceptor: HttpInterceptorFn = (req, next) => {
  const loaderService = inject(LoaderService);
  const authService = inject(AuthService);

  const noLoaderUrls = ['order', 'event/isRunning'];
  if (!noLoaderUrls.includes(req.url)){
    loaderService.show();
  }

  return from(authService.getAccessTokenSilently()).pipe(
    switchMap((token) => {
      const authRequest = req.clone({
        url: `${environment.apiUrl}/${req.url}`,
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
      });

      return next(authRequest);
    }),
    finalize(() => loaderService.hide())
  );
};
