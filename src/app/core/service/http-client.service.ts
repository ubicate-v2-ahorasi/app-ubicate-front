import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { environment } from '../config/environment';
import { handleHttpError } from '../utils/http-error-handler.util';

@Injectable({ providedIn: 'root' })
export class HttpClientService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiCore;

  private getDefaultHeaders(isFormData: boolean = false): HttpHeaders {
    let headers = new HttpHeaders({
      Accept: 'application/json',
    });
    if (!isFormData) {
      headers = headers.set('Content-Type', 'application/json');
    }

    // AGREGADO: Token de autorización automático
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  get<T>(path: string, params?: HttpParams): Observable<T> {
    return this.http
      .get<T>(`${this.baseUrl}/${path}`, {
        headers: this.getDefaultHeaders(),
        params,
      })
      .pipe(retry(1), catchError(handleHttpError));
  }

  post<T>(path: string, body: unknown): Observable<T> {
    const isFormData = body instanceof FormData;
    return this.http
      .post<T>(`${this.baseUrl}/${path}`, body, {
        headers: this.getDefaultHeaders(isFormData),
      })
      .pipe(catchError(handleHttpError));
  }

  put<T>(path: string, body: unknown): Observable<T> {
    const isFormData = body instanceof FormData;
    return this.http
      .put<T>(`${this.baseUrl}/${path}`, body, {
        headers: this.getDefaultHeaders(isFormData),
      })
      .pipe(catchError(handleHttpError));
  }

  patch<T>(path: string, body: unknown, params?: HttpParams): Observable<T> {
    const isFormData = body instanceof FormData;
    return this.http
      .patch<T>(`${this.baseUrl}/${path}`, body, {
        headers: this.getDefaultHeaders(isFormData),
        params,
      })
      .pipe(catchError(handleHttpError));
  }

  delete<T>(path: string): Observable<T> {
    return this.http
      .delete<T>(`${this.baseUrl}/${path}`, {
        headers: this.getDefaultHeaders(),
      })
      .pipe(catchError(handleHttpError));
  }
  getBlob(endpoint: string, params?: HttpParams): Observable<Blob> {
    const url = `${this.baseUrl}/${endpoint}`;
    const token = localStorage.getItem('authToken');

    const headers = new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : '',
    });

    return this.http.get(url, {
      params,
      headers,
      responseType: 'blob',
    });
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}
