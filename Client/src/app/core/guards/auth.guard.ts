import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { catchError, map, of } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  return inject(AuthService).isAuthenticated$
    .pipe(
      map(isAuthenticated => {
        if (!isAuthenticated){
          router.navigate(['/unauthorized']);
        }
        return isAuthenticated;
      }),
      catchError(err=>{
        console.log(err);
        router.navigate(['/unauthorized']);
        return of(err);
      })
    );
};
