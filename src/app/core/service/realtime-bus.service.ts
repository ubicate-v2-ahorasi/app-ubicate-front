import { Injectable, inject } from '@angular/core';
import { RealtimeService, BusLocation } from './realtime.service';
import { BehaviorSubject, Observable } from 'rxjs';
import { BusWithPosition } from '../../feature/company/service/bus/bus-marker.service';
import { BusService } from '../../feature/company/service/bus/bus.service';

@Injectable({
  providedIn: 'root'
})
export class RealtimeBusService {
  private realtimeService = inject(RealtimeService);
  private busService = inject(BusService);
  private busesSubject = new BehaviorSubject<BusWithPosition[]>([]);

  streamBuses(empresaId: number, requestedRutaId?: number): Observable<BusWithPosition[]> {
    console.log('[RealtimeBusService] Suscribiendo a buses - empresaId:', empresaId, 'rutaId:', requestedRutaId);

    this.loadLastKnownLocations(requestedRutaId);

    this.realtimeService.watchBusesByEmpresa(empresaId).subscribe({
      next: (update: BusLocation) => {
        console.log('[RealtimeBusService] Mensaje recibido:', update);

        const busId = (update as any).bus_id ?? update.busId ?? (update as any).id;
        const placa = (update as any).placa ?? update.placa;
        const latitud = (update as any).latitud ?? update.latitud;
        const longitud = (update as any).longitud ?? update.longitud;
        const velocidad = (update as any).velocidad ?? update.velocidad;
        const estado = (update as any).estado ?? update.estado;
        const messageRutaId = (update as any).ruta_id ?? update.rutaId;
        const timestamp =
          (update as any).timestamp ??
          update.timestamp ??
          (update as any).ultima_ubicacion ??
          (update as any).ultimaUbicacion;
        const conductor =
          (update as any).conductor ??
          (update as any).nombre_conductor ??
          (update as any).conductorNombre;
        const conductorId =
          (update as any).conductor_id ??
          (update as any).conductorId ??
          (update as any).conductor_asignado_id ??
          (update as any).conductorAsignadoId ??
          null;

        if (!busId) {
          console.warn('[RealtimeBusService] Mensaje sin busId, ignorando');
          return;
        }

        if (
          requestedRutaId !== undefined &&
          requestedRutaId !== null &&
          Number(messageRutaId) !== Number(requestedRutaId)
        ) {
          return;
        }

        const busWithPos = this.toBusWithPosition({
          busId,
          placa,
          latitud,
          longitud,
          velocidad,
          estado,
          rutaId: messageRutaId,
          timestamp,
          conductor,
          conductorId,
        });

        const updatedBuses = this.upsertBus(this.busesSubject.getValue(), busWithPos);

        console.log('[RealtimeBusService] Total buses:', updatedBuses.length);
        this.busesSubject.next(updatedBuses);
      },
      error: (err) => {
        console.error('[RealtimeBusService] Error:', err);
      }
    });

    return this.busesSubject.asObservable();
  }

  private loadLastKnownLocations(requestedRutaId?: number): void {
    this.busService.getBusLocations().subscribe({
      next: (locations) => {
        const mapped = locations
          .filter((location: any) => {
            const routeId = location.ruta_id ?? location.rutaId;
            return requestedRutaId === undefined || requestedRutaId === null || Number(routeId) === Number(requestedRutaId);
          })
          .map((location: any) =>
            this.toBusWithPosition({
              busId: location.bus_id ?? location.busId ?? location.id,
              placa: location.placa,
              latitud: location.latitud,
              longitud: location.longitud,
              velocidad: location.velocidad,
              estado: location.estado,
              rutaId: location.ruta_id ?? location.rutaId,
              timestamp: location.timestamp ?? location.ultima_ubicacion ?? location.ultimaUbicacion,
            })
          );

        const current = this.busesSubject.getValue();
        const merged = mapped.reduce(
          (acc, bus) => this.upsertBus(acc, bus),
          current
        );
        this.busesSubject.next(merged);
      },
      error: (err) => console.warn('[RealtimeBusService] No se pudo cargar última ubicación', err),
    });
  }

  private toBusWithPosition(input: {
    busId: string | number;
    placa?: string;
    latitud?: number;
    longitud?: number;
    velocidad?: number;
    estado?: string;
    rutaId?: number;
    timestamp?: string;
    conductor?: string;
    conductorId?: number | null;
  }): BusWithPosition {
    const parsedTimestamp = input.timestamp ? Date.parse(input.timestamp) : Date.now();
    const lastUpdate = Number.isNaN(parsedTimestamp) ? Date.now() : parsedTimestamp;
    const latitud = Number(input.latitud ?? 0);
    const longitud = Number(input.longitud ?? 0);

    return {
      id: String(input.busId),
      placa: input.placa || '',
      modelo: '',
      latitud,
      longitud,
      velocidad: input.velocidad,
      estado: input.estado || 'DESCONOCIDO',
      activo: input.estado !== 'INACTIVO',
      ruta: input.rutaId ? { id: input.rutaId, nombre: '', codigo: '', color_hex: '' } : undefined,
      position: { lat: latitud, lng: longitud },
      timestamp: lastUpdate,
      lastUpdate,
      conductor: input.conductor,
      conductorId: input.conductorId,
    };
  }

  private upsertBus(currentBuses: BusWithPosition[], bus: BusWithPosition): BusWithPosition[] {
    const busId = String(bus.id);
    const existingIndex = currentBuses.findIndex((item) => String(item.id) === busId);

    if (existingIndex >= 0) {
      const updated = [...currentBuses];
      updated[existingIndex] = bus;
      return updated;
    }

    return [...currentBuses, bus];
  }
}
