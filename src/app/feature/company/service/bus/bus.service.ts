import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpParams } from '@angular/common/http';
import { HttpClientService } from '../../../../core/service/http-client.service';
import { Bus, BusesStats } from '../../models/buses.model';

@Injectable({ providedIn: 'root' })
export class BusService {
  private httpClient = inject(HttpClientService);

  createBus(data: any): Observable<Bus> {
    return this.httpClient.post<Bus>('buses', data);
  }

  getBusStats(): Observable<BusesStats> {
    return this.httpClient.get<BusesStats>('buses/stats');
  }

  getBuses(page = 0, size = 10, rutaId?: number): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (rutaId !== undefined && rutaId !== null) {
      params = params.set('rutaId', rutaId.toString());
    }

    return this.httpClient.get<any>('buses', params);
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
    console.log(
      `[BusService] Obteniendo QR para bus ${busId} y empresa ${empresaId}`
    );
    return this.httpClient.getBlob(`qr/${busId}/${empresaId}`);
  }

  getBusQRUrl(busId: number, empresaId: number): string {
    const url = `${this.httpClient.getBaseUrl()}/qr/${busId}/${empresaId}`;
    const token = localStorage.getItem('authToken');
    return token ? `${url}?token=${token}` : url;
  }
}
