import { HttpErrorResponse } from '@angular/common/http';
import { throwError, from } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

export function handleHttpError(error: HttpErrorResponse) {
  if (error.error instanceof Blob && error.error.type === 'application/json') {
    return from(error.error.text()).pipe(
      switchMap((text) => {
        try {
          const json = JSON.parse(text);
          const newError = new HttpErrorResponse({
            error: json,
            headers: error.headers,
            status: error.status,
            statusText: error.statusText,
            url: error.url || undefined,
          });
          return throwError(() => newError);
        } catch {
          const newError = new HttpErrorResponse({
            error: { message: text },
            headers: error.headers,
            status: error.status,
            statusText: error.statusText,
            url: error.url || undefined,
          });
          return throwError(() => newError);
        }
      })
    );
  }

  return throwError(() => error);
}
