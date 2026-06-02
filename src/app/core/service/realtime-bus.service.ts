import { Injectable, inject } from '@angular/core';
import { RealtimeService, BusLocation } from './realtime.service';
import { BehaviorSubject, Observable } from 'rxjs';
import { BusWithPosition } from '../../feature/company/service/bus/bus-marker.service';

@Injectable({
  providedIn: 'root'
})
export class RealtimeBusService {
  private realtimeService = inject(RealtimeService);
  private busesSubject = new BehaviorSubject<BusWithPosition[]>([]);

  streamBuses(empresaId: number, rutaId?: number): Observable<BusWithPosition[]> {
    console.log('[RealtimeBusService] Suscribiendo a buses - empresaId:', empresaId, 'rutaId:', rutaId);

    this.realtimeService.watchBusesByEmpresa(empresaId).subscribe({
      next: (update: BusLocation) => {
        console.log('[RealtimeBusService] Mensaje recibido:', update);

        const busId = (update as any).bus_id ?? update.busId;
        const placa = (update as any).placa ?? update.placa;
        const latitud = (update as any).latitud ?? update.latitud;
        const longitud = (update as any).longitud ?? update.longitud;
        const velocidad = (update as any).velocidad ?? update.velocidad;
        const estado = (update as any).estado ?? update.estado;
        const rutaId = (update as any).ruta_id ?? update.rutaId;
        const timestamp = (update as any).timestamp ?? update.timestamp;

        if (!busId) {
          console.warn('[RealtimeBusService] Mensaje sin busId, ignorando');
          return;
        }

        const busIdStr = String(busId);
        const currentBuses = this.busesSubject.getValue();
        const existingIndex = currentBuses.findIndex(b => b.id === busIdStr);

        const busWithPos: BusWithPosition = {
          id: busIdStr,
          placa: placa || '',
          modelo: '',
          latitud: latitud || 0,
          longitud: longitud || 0,
          velocidad: velocidad,
          estado: estado || 'DESCONOCIDO',
          activo: true,
          ruta: rutaId ? { id: rutaId, nombre: '', codigo: '', color_hex: '' } : undefined,
          position: { lat: latitud || 0, lng: longitud || 0 },
          timestamp: timestamp ? Date.parse(timestamp) : Date.now(),
          lastUpdate: timestamp ? Date.parse(timestamp) : Date.now()
        };

        let updatedBuses: BusWithPosition[];
        if (existingIndex >= 0) {
          updatedBuses = [...currentBuses];
          updatedBuses[existingIndex] = busWithPos;
        } else {
          updatedBuses = [...currentBuses, busWithPos];
        }

        console.log('[RealtimeBusService] Total buses:', updatedBuses.length);
        this.busesSubject.next(updatedBuses);
      },
      error: (err) => {
        console.error('[RealtimeBusService] Error:', err);
      }
    });

    return this.busesSubject.asObservable();
  }
}
