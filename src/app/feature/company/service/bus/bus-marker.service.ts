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
  lastUpdate?: number;
  timestamp?: number;
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
        this.animateMarkerToPosition(existing, bus.position);
        this.updateMarkerInfo(existing, bus);
      } else {
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
  }

  private animateMarkerToPosition(
    marker: google.maps.marker.AdvancedMarkerElement,
    newPosition: { lat: number; lng: number }
  ) {
    const currentPos = marker.position as google.maps.LatLngLiteral;
    if (!currentPos) {
      marker.position = newPosition;
      return;
    }

    const distance = this.calculateDistance(currentPos, newPosition);
    if (distance < 0.0001) return;

    const steps = 20;
    const stepLat = (newPosition.lat - currentPos.lat) / steps;
    const stepLng = (newPosition.lng - currentPos.lng) / steps;
    let step = 0;

    const animate = () => {
      if (step <= steps) {
        const interpolatedPos = {
          lat: currentPos.lat + stepLat * step,
          lng: currentPos.lng + stepLng * step,
        };
        marker.position = interpolatedPos;
        step++;
        setTimeout(animate, 50);
      }
    };

    animate();
  }

  private calculateDistance(
    pos1: { lat: number; lng: number },
    pos2: { lat: number; lng: number }
  ): number {
    const dLat = pos2.lat - pos1.lat;
    const dLng = pos2.lng - pos1.lng;
    return Math.sqrt(dLat * dLat + dLng * dLng);
  }

  private updateMarkerInfo(
    marker: google.maps.marker.AdvancedMarkerElement,
    bus: BusWithPosition
  ) {
    marker.title = `${bus.placa} - ${bus.modelo} - ${bus.estado}`;
  }

  private createBusMarkerElement(bus: BusWithPosition): HTMLElement {
    const color = this.getBusColor(bus);
    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      transition: transform 0.2s ease;
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

    container.addEventListener('mouseenter', () => {
      container.style.transform = 'scale(1.1)';
    });

    container.addEventListener('mouseleave', () => {
      container.style.transform = 'scale(1)';
    });

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
    <div style="
      padding: 12px;
      min-width: 200px;
      font-family: system-ui;
      background: white;
      border-radius: 8px;
      border: 2px solid ${color};
    ">
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      ">
        <h3 style="
          margin: 0;
          font-size: 16px;
          font-weight: bold;
          color: #1f2937;
        ">
          ${bus.placa}
        </h3>
        <span style="
          background: ${color};
          color: white;
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: bold;
        ">
          ${bus.estado}
        </span>
      </div>

      <p style="
        margin: 4px 0 0 0;
        font-size: 13px;
        color: #6b7280;
      ">
        <strong>Modelo:</strong> ${bus.modelo}
      </p>
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

  focusBus(busId: string | number) {
    const marker = this.busMarkers.get(String(busId));
    if (marker && marker.map) {
      const pos = marker.position as google.maps.LatLngLiteral;
      if (pos && marker.map instanceof google.maps.Map) {
        marker.map.setCenter(pos);
        marker.map.setZoom(16);
      }
    }
  }
}
