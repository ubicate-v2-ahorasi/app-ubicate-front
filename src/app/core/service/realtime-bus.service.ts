import { Injectable, inject } from '@angular/core';
import { RealtimeService, BusLocation } from './realtime.service';
import { BehaviorSubject, Observable } from 'rxjs';
import { BusWithPosition } from '../../feature/company/service/bus/bus-marker.service';

@Injectable({
  providedIn: 'root'
})
export class RealtimeBusService {
  private realtimeService = inject(RealtimeService);
  private busesMap = new Map<number, BusWithPosition>();
  private busesSubject = new BehaviorSubject<BusWithPosition[]>([]);

  /**
   * Escuchar buses de una empresa y mantener una lista actualizada (State Management)
   */
  streamBuses(empresaId: number, rutaId?: number): Observable<BusWithPosition[]> {
    // Limpiar estado previo
    this.busesMap.clear();
    this.busesSubject.next([]);

    this.realtimeService.watchBusesByEmpresa(empresaId).subscribe((update: BusLocation) => {
      // Filtrar por empresa (seguridad extra)
      if (update.empresaId !== empresaId) return;
      
      // Filtrar por ruta si es necesario
      if (rutaId && update.rutaId !== rutaId) {
          // Si el bus cambió a otra ruta, lo eliminamos de la vista actual
          if (this.busesMap.has(update.busId)) {
              this.busesMap.delete(update.busId);
              this.busesSubject.next(Array.from(this.busesMap.values()));
          }
          return;
      }
      
      const busIdNum = typeof update.busId === 'string' ? parseInt(update.busId) : update.busId;

      const busWithPos: BusWithPosition = {
        id: update.busId.toString(),
        placa: update.placa,
        modelo: '', // Añadido para cumplir con la interfaz
        latitud: update.latitud,
        longitud: update.longitud,
        velocidad: update.velocidad,
        estado: update.estado,
        activo: true,
        ruta: update.rutaId ? { id: update.rutaId, nombre: '', codigo: '', color_hex: '' } : undefined,
        position: { lat: update.latitud, lng: update.longitud }
      };

      this.busesMap.set(busIdNum, busWithPos);
      this.busesSubject.next(Array.from(this.busesMap.values()));
    });

    return this.busesSubject.asObservable();
  }
}
