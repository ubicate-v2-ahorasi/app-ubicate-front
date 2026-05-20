import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, finalize } from 'rxjs/operators';
import { throwError } from 'rxjs';

let activeRequests = 0;

export const httpInterceptor: HttpInterceptorFn = (req, next) => {
  activeRequests++;

  const isExternalApi = req.url.includes('router.project-osrm.org') ||
                        req.url.includes('maps.googleapis.com');

  let modifiedRequest = req.clone({
    setHeaders: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  if (!isExternalApi) {
    const token = getAuthToken();
    if (token) {
      modifiedRequest = modifiedRequest.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
  }

  return next(modifiedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      handleError(error);
      return throwError(() => error);
    }),
    finalize(() => {
      activeRequests--;
    })
  );
};

function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

function handleError(error: HttpErrorResponse): void {
  let errorMessage = 'Error desconocido';

  switch (error.status) {
    case 400: errorMessage = 'Solicitud incorrecta'; break;
    case 401: errorMessage = 'No autorizado - Inicia sesión nuevamente'; break;
    case 403: errorMessage = 'Acceso prohibido'; break;
    case 500: errorMessage = 'Error interno del servidor'; break;
    default: errorMessage = `Error ${error.status}: ${error.message}`;
  }
}

export function hasActiveRequests(): boolean {
  return activeRequests > 0;
}
