import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, NgZone } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../../shared/services/toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
    const toast = inject(ToastService);
    const zone = inject(NgZone);
    
    return next(req).pipe(
        catchError((error:HttpErrorResponse)=>{
            let errorMessage = 'An unexpected error occurred.';

            if (error.status === 0) {
                errorMessage = 'Unable to connect to the server. Please check your network.';
            } else if (typeof error.error === 'string') {
                errorMessage = error.error;
            } else if (error.error?.message) {
                errorMessage = error.error.message;
            } 

            zone.run(() => {
                toast.error(`<div>${errorMessage}</div>`);
            });
            return throwError(() => error);
        })
    );
};
