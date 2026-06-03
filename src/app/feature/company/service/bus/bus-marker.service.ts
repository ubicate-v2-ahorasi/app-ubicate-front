import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

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
  conductor?: string;
}

export interface SelectedBusDetails extends BusWithPosition {
  address: string;
}

@Injectable({ providedIn: 'root' })
export class BusMarkerService {
  private busMarkers = new Map<string, google.maps.Marker>();
  private geocoder: google.maps.Geocoder | null = null;
  private addressCache = new Map<string, string>();
  private selectedBusSubject = new BehaviorSubject<SelectedBusDetails | null>(null);
  private tooltipWindow: google.maps.InfoWindow | null = null;

  selectedBus$ = this.selectedBusSubject.asObservable();

  async upsertBusMarkers(buses: BusWithPosition[], map: google.maps.Map) {
    console.log('[BusMarkerService] upsertBusMarkers llamado con', buses.length, 'buses');

    buses.forEach((bus, index) => {
      console.log('[BusMarkerService] Procesando bus', index, ':', bus.id, bus.placa, 'position:', bus.position);
    });

    for (const bus of buses) {
      if (!bus.position) {
        console.log('[BusMarkerService] Skip bus sin position');
        continue;
      }
      const key = String(bus.id);
      const existing = this.busMarkers.get(key);

      if (existing) {
        console.log('[BusMarkerService] Actualizando marker existente:', key);
        this.animateMarkerToPosition(existing, bus.position);
        this.updateMarkerInfo(existing, bus);
        existing.setIcon(this.createBusIcon(bus));
        existing.set('busData', bus);
      } else {
        console.log('[BusMarkerService] Creando nuevo marker para:', bus.placa, 'en position:', bus.position);
        const marker = new google.maps.Marker({
          map: map,
          position: bus.position,
          title: bus.placa,
          icon: this.createBusIcon(bus),
        });

        marker.set('busData', bus);
        marker.addListener('click', () => {
          const currentBus = marker.get('busData') as BusWithPosition | undefined;
          if (currentBus) {
            void this.selectBus(currentBus);
          }
        });

        marker.addListener('mouseover', () => {
          const currentBus = marker.get('busData') as BusWithPosition | undefined;
          if (currentBus) {
            this.showBusTooltip(marker, currentBus, map);
          }
        });

        marker.addListener('mouseout', () => {
          this.hideBusTooltip();
        });

        this.busMarkers.set(key, marker);
        console.log('[BusMarkerService] Marker creado exitosamente');
      }

      const selectedBus = this.selectedBusSubject.value;
      if (selectedBus && String(selectedBus.id) === key) {
        void this.selectBus(bus);
      }
    }
  }

  private createBusIcon(bus: BusWithPosition): google.maps.Icon {
    const color = this.getBusColor(bus);
    const size = 40;
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}">
          <circle cx="12" cy="12" r="11" fill="${color}" stroke="white" stroke-width="2"/>
          <path d="M17 11V16M17 16H7M7 16V11M17 11L15.5 7H8.5L7 11M17 11H7" stroke="white" stroke-width="1.5" stroke-linecap="round" fill="none"/>
          <circle cx="9" cy="13" r="1.5" fill="white"/>
          <circle cx="15" cy="13" r="1.5" fill="white"/>
        </svg>
      `)}`,
      scaledSize: new google.maps.Size(size, size),
      anchor: new google.maps.Point(size / 2, size / 2),
    };
  }

  private animateMarkerToPosition(
    marker: google.maps.Marker,
    newPosition: { lat: number; lng: number }
  ) {
    const currentPos = marker.getPosition();
    if (!currentPos) {
      marker.setPosition(newPosition);
      return;
    }

    const distance = this.calculateDistance(
      { lat: currentPos.lat(), lng: currentPos.lng() },
      newPosition
    );
    if (distance < 0.00001) return;

    const duration = 1500;
    const start = performance.now();
    const startLat = currentPos.lat();
    const startLng = currentPos.lng();

    const animate = (time: number) => {
      let timeFraction = (time - start) / duration;
      if (timeFraction > 1) timeFraction = 1;

      const progress = timeFraction < 0.5
        ? 2 * timeFraction * timeFraction
        : 1 - Math.pow(-2 * timeFraction + 2, 2) / 2;

      marker.setPosition({
        lat: startLat + (newPosition.lat - startLat) * progress,
        lng: startLng + (newPosition.lng - startLng) * progress,
      });

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
    marker: google.maps.Marker,
    bus: BusWithPosition
  ) {
    marker.setTitle(`${bus.placa} - ${this.getDriverName(bus)}`);
  }

  private getDriverName(bus: BusWithPosition): string {
    return bus.conductor?.trim() || 'Sin conductor asignado';
  }

  private showBusTooltip(
    marker: google.maps.Marker,
    bus: BusWithPosition,
    map: google.maps.Map
  ): void {
    if (!this.tooltipWindow) {
      this.tooltipWindow = new google.maps.InfoWindow({
        disableAutoPan: true,
      });
    }

    this.tooltipWindow.setContent(`
      <div style="
        min-width: 180px;
        max-width: 220px;
        box-sizing: border-box;
        padding: 10px 12px;
        border-radius: 14px;
        background: rgba(15, 23, 42, 0.96);
        border: 1px solid rgba(148, 163, 184, 0.25);
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.28);
        font-family: Arial, sans-serif;
        line-height: 1.3;
        color: #F8FAFC;
      ">
        <div style="
          font-size: 15px;
          font-weight: 800;
          white-space: nowrap;
          letter-spacing: .02em;
        ">${this.escapeHtml(bus.placa || 'Sin placa')}</div>
        <div style="
          margin-top: 4px;
          color: #CBD5E1;
          font-size: 12px;
          font-weight: 500;
          white-space: normal;
          word-break: break-word;
        ">${this.escapeHtml(this.getDriverName(bus))}</div>
      </div>
    `);
    this.tooltipWindow.open({ map, anchor: marker });
  }

  private hideBusTooltip(): void {
    this.tooltipWindow?.close();
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (char) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };
      return entities[char];
    });
  }

  private ensureGeocoder(): void {
    if (!this.geocoder) {
      this.geocoder = new google.maps.Geocoder();
    }
  }

  private getAddressCacheKey(position: { lat: number; lng: number }): string {
    return `${position.lat.toFixed(5)},${position.lng.toFixed(5)}`;
  }

  private async resolveAddress(position: { lat: number; lng: number }): Promise<string> {
    const key = this.getAddressCacheKey(position);
    if (this.addressCache.has(key)) {
      return this.addressCache.get(key)!;
    }

    this.ensureGeocoder();

    try {
      const result = await this.geocoder!.geocode({ location: position });
      const address =
        result.results?.[0]?.formatted_address ??
        `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`;
      this.addressCache.set(key, address);
      return address;
    } catch {
      return `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`;
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

  async selectBus(bus: BusWithPosition): Promise<void> {
    const selectedBus: SelectedBusDetails = {
      ...bus,
      address: 'Obteniendo direccion...'
    };

    this.selectedBusSubject.next(selectedBus);

    const address = await this.resolveAddress(bus.position);
    const latestSelected = this.selectedBusSubject.value;
    if (latestSelected && String(latestSelected.id) === String(bus.id)) {
      this.selectedBusSubject.next({
        ...selectedBus,
        address
      });
    }
  }

  clearSelectedBus(): void {
    this.selectedBusSubject.next(null);
  }

  clearMarkers() {
    for (const marker of this.busMarkers.values()) {
      marker.setMap(null);
    }
    this.busMarkers.clear();
    this.clearSelectedBus();
  }

  getMarkers() {
    return this.busMarkers;
  }

  focusBus(busId: string | number) {
    const marker = this.busMarkers.get(String(busId));
    const map = marker?.getMap() as google.maps.Map | null;
    if (marker && map) {
      const pos = marker.getPosition();
      if (pos) {
        map.setCenter(pos);
        map.setZoom(16);
      }
    }
  }
}
