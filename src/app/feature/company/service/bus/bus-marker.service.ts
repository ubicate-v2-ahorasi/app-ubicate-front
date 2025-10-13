// src/app/feature/company/service/bus/bus-marker.service.ts
import { Injectable } from '@angular/core';

export interface BusWithPosition {
  id: string | number;
  placa: string;
  modelo: string;
  estado: string;
  activo: boolean;
  latitud: number;
  longitud: number;
  velocidad?: number;
  ruta?: { id: number; nombre: string; codigo: string; color_hex: string };
  position: { lat: number; lng: number };
}

@Injectable({ providedIn: 'root' })
export class BusMarkerService {
  private busMarkers = new Map<
    string,
    google.maps.marker.AdvancedMarkerElement
  >();
  private infoWindow = new google.maps.InfoWindow();

  async upsertBusMarkers(buses: BusWithPosition[], map: google.maps.Map) {
    const { AdvancedMarkerElement } = (await google.maps.importLibrary(
      'marker'
    )) as google.maps.MarkerLibrary;

    const incomingIds = new Set(buses.map((b) => String(b.id)));
    for (const [id, marker] of this.busMarkers.entries()) {
      if (!incomingIds.has(id)) {
        marker.map = null;
        this.busMarkers.delete(id);
      }
    }

    for (const bus of buses) {
      if (!bus.position) continue;
      const key = String(bus.id);
      const existing = this.busMarkers.get(key);
      if (existing) {
        (existing as any).position = bus.position;
        continue;
      }
      const content = this.createBusMarkerElement(bus);
      const marker = new AdvancedMarkerElement({
        map,
        position: bus.position,
        title: `${bus.placa} - ${bus.modelo}`,
        content,
      });
      marker.addListener('click', () => this.showBusInfo(bus, map));
      this.busMarkers.set(key, marker);
    }
  }

  private createBusMarkerElement(bus: BusWithPosition): HTMLElement {
    const color = this.getBusColor(bus);
    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
    `;
    container.innerHTML = `
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" style="filter: drop-shadow(0 2px 6px rgba(0,0,0,0.4));">
        <rect x="6" y="7" width="12" height="11" rx="1.5" fill="${color}" stroke="white" stroke-width="2"/>
        <rect x="8" y="9" width="8" height="4" rx="0.5" fill="white" fill-opacity="0.9"/>
        <circle cx="9" cy="18" r="1.2" fill="#000" stroke="white" stroke-width="1"/>
        <circle cx="15" cy="18" r="1.2" fill="#000" stroke="white" stroke-width="1"/>
      </svg>
      <div style="
        background: white;
        color: ${color};
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: bold;
        margin-top: -2px;
        border: 2px solid ${color};
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      ">
        ${bus.placa}
      </div>
    `;
    return container;
  }

  private getBusColor(bus: BusWithPosition): string {
    if (bus.ruta?.color_hex) return bus.ruta.color_hex;
    if (bus.activo === false) return '#9CA3AF';
    switch (bus.estado) {
      case 'ACTIVO':
      case 'EN_RUTA':
        return '#10B981';
      case 'MANTENIMIENTO':
        return '#F59E0B';
      case 'INACTIVO':
        return '#EF4444';
      default:
        return '#3B82F6';
    }
  }

  private showBusInfo(bus: BusWithPosition, map: google.maps.Map) {
    const color = this.getBusColor(bus);
    const html = `
      <div style="padding: 12px; min-width: 220px;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">
          ${bus.placa}
        </h3>
        <p style="margin: 4px 0; font-size: 13px;">
          <strong>Modelo:</strong> ${bus.modelo}
        </p>
        <p style="margin: 4px 0; font-size: 13px;">
          <strong>Estado:</strong>
          <span style="background: ${color}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">
            ${bus.estado}
          </span>
        </p>
        ${
          bus.ruta
            ? `<p style="margin: 4px 0; font-size: 13px;">
                 <strong>Ruta:</strong> ${bus.ruta.nombre} (${bus.ruta.codigo})
               </p>`
            : ''
        }
        ${
          bus.velocidad != null
            ? `<p style="margin: 4px 0; font-size: 13px;">
                 <strong>Velocidad:</strong> ${bus.velocidad} km/h
               </p>`
            : ''
        }
      </div>
    `;
    this.infoWindow.setContent(html);
    this.infoWindow.setPosition(bus.position);
    this.infoWindow.open({ map });
  }

  clearMarkers() {
    for (const marker of this.busMarkers.values()) {
      marker.map = null;
    }
    this.busMarkers.clear();
    this.infoWindow.close();
  }

  getMarkers() {
    return this.busMarkers;
  }
}
