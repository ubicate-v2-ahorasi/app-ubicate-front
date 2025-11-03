import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/landing',
    pathMatch: 'full',
  },
  {
    path: 'landing',
    loadChildren: () =>
      import('./feature/landing/landing-routing.routes').then((m) => m.LANDING_ROUTES),
  },
  {
    path: 'auth',
    loadChildren: () =>
      import('./feature/auth/auth.routing').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'company',
    loadChildren: () =>
      import('./feature/company/company.routing').then((m) => m.COMPANY_ROUTES),
  },
  {
    path: '**',
    redirectTo: '/landing',
  },
];
