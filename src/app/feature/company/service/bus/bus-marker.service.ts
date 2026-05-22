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
  private busMarkers = new Map<string, google.maps.Marker>();
  private infoWindow = new google.maps.InfoWindow();

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
} else {
          console.log('[BusMarkerService] Creando nuevo marker para:', bus.placa, 'en position:', bus.position);
          const marker = new google.maps.Marker({
            map: map,
            position: bus.position,
            title: bus.placa,
            icon: this.createBusIcon(bus),
          });

          marker.addListener('click', () => {
            this.showBusInfo(bus, map);
          });

          this.busMarkers.set(key, marker);
          console.log('[BusMarkerService] Marker creado exitosamente');
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
    marker.setTitle(`${bus.placa} - ${bus.modelo} - ${bus.estado}`);
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
    const estadoLabel = bus.estado || 'DESCONOCIDO';
    const velocidad = bus.velocidad ? `${bus.velocidad} km/h` : '—';
    const modelo = bus.modelo || '—';

    const html = `
    <div style="
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      width: 280px;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    ">
      <div style="
        background: linear-gradient(135deg, ${color} 0%, ${color}dd 100%);
        padding: 20px;
        position: relative;
      ">
        <button id="closeBusInfoBtn" style="
          position: absolute;
          top: 12px;
          right: 12px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          font-size: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        " onmouseover="this.style.background='rgba(255,255,255,0.35)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">×</button>

        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="
            width: 44px;
            height: 44px;
            background: white;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          ">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="8" width="18" height="10" rx="3" stroke="${color}" stroke-width="2"/>
              <circle cx="7" cy="18" r="2" fill="${color}"/>
              <circle cx="17" cy="18" r="2" fill="${color}"/>
              <path d="M7 8V6a2 2 0 012-2h6a2 2 0 012 2v2" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <div>
            <div style="
              font-size: 22px;
              font-weight: 700;
              color: white;
              letter-spacing: 0.5px;
              text-shadow: 0 1px 2px rgba(0,0,0,0.1);
            ">${bus.placa}</div>
            <div style="
              font-size: 11px;
              color: rgba(255,255,255,0.85);
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-top: 2px;
            ">ID Bus ${bus.id}</div>
          </div>
        </div>

        <div style="
          position: absolute;
          top: 20px;
          right: 52px;
          background: ${bus.activo ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)'};
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          color: white;
          letter-spacing: 0.5px;
        ">${estadoLabel}</div>
      </div>

      <div style="padding: 20px; background: #f8fafc;">
        <div style="
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        ">
          <div style="
            background: white;
            padding: 14px 16px;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
            border: 1px solid #e2e8f0;
          ">
            <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Modelo</div>
            <div style="font-size: 14px; font-weight: 600; color: #334155;">${modelo}</div>
          </div>
          <div style="
            background: white;
            padding: 14px 16px;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
            border: 1px solid #e2e8f0;
          ">
            <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Velocidad</div>
            <div style="font-size: 14px; font-weight: 600; color: #334155;">${velocidad}</div>
          </div>
        </div>

        <div style="
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: ${bus.activo ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' : 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'};
          border-radius: 12px;
          border: 1px solid ${bus.activo ? '#10b98130' : '#ef444430'};
        ">
          <div style="
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: ${bus.activo ? '#10b981' : '#ef4444'};
            box-shadow: 0 0 0 3px ${bus.activo ? '#10b98130' : '#ef444430'};
          "></div>
          <span style="
            font-size: 13px;
            font-weight: 500;
            color: ${bus.activo ? '#065f46' : '#991b1b'};
          ">${bus.activo ? 'Bus activo y operando' : 'Bus inactivo'}</span>
        </div>

        ${bus.ruta?.nombre ? `
        <div style="
          margin-top: 12px;
          padding: 14px 16px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          border-left: 4px solid ${bus.ruta.color_hex};
        ">
          <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Ruta asignada</div>
          <div style="font-size: 14px; font-weight: 600; color: #334155;">${bus.ruta.nombre}</div>
          ${bus.ruta.codigo ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">Código: ${bus.ruta.codigo}</div>` : ''}
        </div>
        ` : ''}

        <div style="
          margin-top: 12px;
          padding: 12px 16px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          border: 1px solid #e2e8f0;
        ">
          <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Ubicación</div>
          <div style="font-size: 12px; font-family: monospace; color: #64748b;">
            ${bus.position.lat.toFixed(6)}, ${bus.position.lng.toFixed(6)}
          </div>
        </div>
      </div>
    </div>
    `;

    this.infoWindow.setContent(html);
    this.infoWindow.setPosition(bus.position);
    const marker = this.busMarkers.get(String(bus.id));
    if (marker) {
      this.infoWindow.open({ map, anchor: marker });
    } else {
      this.infoWindow.open({ map });
    }

    setTimeout(() => {
      const closeBtn = document.getElementById('closeBusInfoBtn');
      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.infoWindow.close();
        });
      }
    }, 0);

    const closeOnClickOutside = () => {
      this.infoWindow.close();
      google.maps.event.removeListener(listener);
    };
    const listener = map.addListener('click', closeOnClickOutside);
  }

  clearMarkers() {
    for (const marker of this.busMarkers.values()) {
      marker.setMap(null);
    }
    this.busMarkers.clear();
    this.infoWindow.close();
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
