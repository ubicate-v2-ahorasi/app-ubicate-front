import { Routes } from '@angular/router';

export const LANDING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/home/home').then((m) => m.Home),
    title: 'Ubicate - Encuentra tu bus en tiempo real',
  },
];
