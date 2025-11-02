import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./../auth/pages/login/login').then((m) => m.Login),
    title: 'Iniciar Sesión',
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./../auth/pages/register/register').then((m) => m.Register),
    title: 'Registro de Empresa',
  },
];
