import { Routes } from '@angular/router';
import { authGuard } from '../core/guards/auth.guard';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('../feature/components/landing-page/landing-page.component').then(c => c.LandingPageComponent)
    },
    {
        path: 'auth/callback',
        loadComponent: () => import('../core/components/auth-callback/auth-callback.component').then(c => c.AuthCallbackComponent)
    },
    {
        path: 'unauhtorized',
        loadComponent: () => import('../core/components/unauthorized/unauthorized.component').then(c => c.UnauthorizedComponent)
    },
    {
        path: 'home',
        canActivate: [authGuard],
        loadComponent: () => import('../feature/components/home-page/home-page.component').then(c => c.HomePageComponent),
        loadChildren: () => import('./home.routes').then(r => r.home)
    },
    {
        path: '**',
        loadComponent: () =>  import('../core/components/not-found/not-found.component').then(c => c.NotFoundComponent)
    }
];
