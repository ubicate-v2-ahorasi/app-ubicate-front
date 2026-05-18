import { Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';

export const COMPANY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./main-layout/main-layout').then((m) => m.MainLayout),
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard').then((m) => m.Dashboard),
        title: 'Dashboard',
        data: { animation: 'DashboardPage' }
      },
      {
        path: 'buses',
        loadComponent: () =>
          import('./pages/bus/bus').then((m) => m.Bus),
        title: 'Buses',
        data: { animation: 'BusesPage' }
      },
      {
        path: 'routes',
        loadComponent: () =>
          import('./pages/routes/routes').then((m) => m.RoutesPage),
        title: 'Gestión de Rutas',
        data: { animation: 'RoutesPage' }
      },
      {
        path: 'comments',
        loadComponent: () =>
          import('./pages/comments/comments').then((m) => m.Comments),
        title: 'Comentarios',
        data: { animation: 'CommentsPage' }
      },
      {
        path: 'users',
        loadComponent: () => import('./pages/users/users').then((m) => m.Users),
        title: 'Gestión de Usuarios',
        data: { animation: 'UsersPage' }
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/settings/settings').then((m) => m.Settings),
        title: 'Configuración',
        data: { animation: 'SettingsPage' }
      },
    ],
  },
];
