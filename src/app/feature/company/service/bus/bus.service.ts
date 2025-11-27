import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpParams } from '@angular/common/http';
import { HttpClientService } from '../../../../core/service/http-client.service';
import { Bus, BusesStats } from '../../models/buses.model';

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

@Injectable({ providedIn: 'root' })
export class BusService {
  private httpClient = inject(HttpClientService);

  createBus(data: any): Observable<Bus> {
    return this.httpClient.post<Bus>('buses', data);
  }

  getBusStats(): Observable<BusesStats> {
    return this.httpClient.get<BusesStats>('buses/stats');
  }

  getBuses(
    page = 1,
    size = 10,
    rutaId?: number,
    search?: string,
    estado?: string,
    sort = 'id,desc'
  ): Observable<Page<Bus>> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size))
      .set('sort', sort);

    if (rutaId !== undefined && rutaId !== null) {
      params = params.set('rutaId', String(rutaId));
    }

    if (search && search.trim().length > 0) {
      params = params.set('search', search.trim());
    }

    if (estado && estado !== '') {
      params = params.set('estado', estado);
    }

    return this.httpClient.get<Page<Bus>>('buses', params);
  }

  getBusById(busId: number): Observable<Bus> {
    return this.httpClient.get<Bus>(`buses/${busId}`);
  }

  getBusLocations(): Observable<any[]> {
    return this.httpClient.get<any[]>('buses/con-ubicacion');
  }

  updateBus(id: number, data: any): Observable<Bus> {
    return this.httpClient.put<Bus>(`buses/${id}`, data);
  }

  updateBusStatus(id: number, estado: string): Observable<Bus> {
    return this.httpClient.patch<Bus>(
      `buses/${id}/estado?estado=${estado}`,
      null
    );
  }

  deleteBus(id: number): Observable<void> {
    return this.httpClient.delete<void>(`buses/${id}`);
  }

  asignarRuta(busId: number, rutaId: number): Observable<Bus> {
    return this.httpClient.patch<Bus>(
      `buses/${busId}/asignar-ruta?rutaId=${rutaId}`,
      null
    );
  }

  removerRuta(busId: number): Observable<Bus> {
    return this.httpClient.delete<Bus>(`buses/${busId}/ruta`);
  }

  getBusQR(busId: number, empresaId: number): Observable<Blob> {
    return this.httpClient.getBlob(`qr/${busId}/${empresaId}`);
  }

  getBusQRUrl(busId: number, empresaId: number): string {
    const url = `${this.httpClient.getBaseUrl()}/qr/${busId}/${empresaId}`;
    const token = localStorage.getItem('authToken');
    return token ? `${url}?token=${token}` : url;
  }
}
