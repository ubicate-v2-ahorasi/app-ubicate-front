import { HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';

export function handleHttpError(error: HttpErrorResponse) {
  return throwError(() => new Error('Algo salió mal. Intenta nuevamente.'));
}
