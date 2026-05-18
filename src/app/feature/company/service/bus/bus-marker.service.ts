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
    if (distance < 0.00001) return; // Umbral más pequeño para mayor precisión

    const duration = 1500; // Duración de la transición en ms
    const start = performance.now();
    const startLat = currentPos.lat;
    const startLng = currentPos.lng;

    const animate = (time: number) => {
      let timeFraction = (time - start) / duration;
      if (timeFraction > 1) timeFraction = 1;

      // Función de easing (suavizado) para que el inicio y fin sean naturales
      const progress = timeFraction < 0.5 
        ? 2 * timeFraction * timeFraction 
        : 1 - Math.pow(-2 * timeFraction + 2, 2) / 2;

      marker.position = {
        lat: startLat + (newPosition.lat - startLat) * progress,
        lng: startLng + (newPosition.lng - startLng) * progress,
      };

      if (timeFraction < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
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
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;

    // Estilo para el efecto de pulso si está activo
    const pulseStyle = bus.activo ? `
      @keyframes pulse-ring {
        0% { transform: scale(.33); opacity: 0.8; }
        80%, 100% { opacity: 0; }
      }
      .pulse::before {
        content: '';
        position: absolute;
        width: 300%;
        height: 300%;
        border-radius: 50%;
        background-color: ${color};
        animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        z-index: -1;
      }
    ` : '';

    const styleTag = document.createElement('style');
    styleTag.textContent = pulseStyle;
    container.appendChild(styleTag);

    const iconWrapper = document.createElement('div');
    iconWrapper.className = bus.activo ? 'pulse' : '';
    iconWrapper.style.cssText = 'position: relative; display: flex; justify-content: center; align-items: center;';

    iconWrapper.innerHTML = `
      <svg width="40" height="40" viewBox="0 0 24 24" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.3));">
        <circle cx="12" cy="12" r="10" fill="white" stroke="${color}" stroke-width="1.5"/>
        <path d="M17 11V16M17 16H7M7 16V11M17 11L15.5 7H8.5L7 11M17 11H7" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="9" y="12" width="2" height="2" rx="0.5" fill="${color}"/>
        <rect x="13" y="12" width="2" height="2" rx="0.5" fill="${color}"/>
      </svg>
    `;

    const label = document.createElement('div');
    label.style.cssText = `
      background: ${color};
      color: white;
      padding: 1px 6px;
      border-radius: 10px;
      font-size: 9px;
      font-weight: 800;
      margin-top: -8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      border: 1px solid white;
      z-index: 10;
      letter-spacing: 0.5px;
    `;
    label.textContent = bus.placa;

    container.appendChild(iconWrapper);
    container.appendChild(label);

    container.addEventListener('mouseenter', () => {
      container.style.transform = 'scale(1.2) translateY(-4px)';
    });

    container.addEventListener('mouseleave', () => {
      container.style.transform = 'scale(1) translateY(0)';
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
