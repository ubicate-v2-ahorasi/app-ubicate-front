import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  OnDestroy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { interval, Subject, switchMap, takeUntil } from 'rxjs';
import { BusService } from '../../../service/bus/bus.service';

@Component({
  selector: 'app-bus-layer',
  standalone: true,
  imports: [CommonModule],
  template: '',
})
export class BusLayerComponent implements OnChanges, OnDestroy {
  @Input() map: google.maps.Map | null = null;
  @Input() enabled: boolean = true;
  @Input() refreshMs: number = 5000;

  private busService = inject(BusService);
  private stop$ = new Subject<void>();
  private started = false;

  private infoWindow = new google.maps.InfoWindow();
  private busMarkers = new Map<
    number,
    google.maps.marker.AdvancedMarkerElement
  >();

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['map'] || changes['enabled']) && this.map && this.enabled) {
      this.start();
    }
    if (
      (changes['map'] || changes['enabled']) &&
      (!this.map || !this.enabled)
    ) {
      this.stop();
    }
  }

  ngOnDestroy(): void {
    this.stop();
    for (const m of this.busMarkers.values()) {
      m.map = null;
    }
    this.busMarkers.clear();
  }

  focusBus(busId: number) {
    const mk = this.busMarkers.get(busId);
    if (mk && this.map) {
      const pos = mk.position as google.maps.LatLngLiteral;
      if (pos) {
        this.map.setCenter(pos);
        this.map.setZoom(15);
      }
    }
  }

  private start() {
    if (this.started || !this.map) return;
    this.started = true;

    this.fetchOnce();

    interval(this.refreshMs)
      .pipe(
        switchMap(() => this.busService.getBusLocations()),
        takeUntil(this.stop$)
      )
      .subscribe({
        next: (list) => this.syncMarkers(list),
        error: (err) => console.error('[BusLayer] error ubicaciones:', err),
      });
  }

  private stop() {
    if (!this.started) return;
    this.stop$.next();
    this.started = false;
  }

  private fetchOnce() {
    this.busService.getBusLocations().subscribe({
      next: (list) => this.syncMarkers(list),
      error: (err) => console.error('[BusLayer] error inicial:', err),
    });
  }

  private async syncMarkers(list: any[]) {
    if (!this.map) return;

    const { AdvancedMarkerElement } = (await google.maps.importLibrary(
      'marker'
    )) as google.maps.MarkerLibrary;

    const seen = new Set<number>();

    for (const b of list ?? []) {
      if (!Number.isFinite(b?.latitud) || !Number.isFinite(b?.longitud))
        continue;
      if (Math.abs(b.latitud) > 90 || Math.abs(b.longitud) > 180) continue;

      const id = Number(b.id);
      seen.add(id);

      const pos = { lat: b.latitud, lng: b.longitud };
      const existing = this.busMarkers.get(id);

      if (existing) {
        existing.position = pos;
        if (!existing.map) existing.map = this.map;
        continue;
      }

      const content = this.createBusMarkerElement(b);

      const marker = new AdvancedMarkerElement({
        map: this.map,
        position: pos,
        title: `${b?.placa || 'Bus'} • ${b?.modelo || ''}`.trim(),
        content: content,
      });

      marker.addListener('click', () => {
        this.showBusInfo(b);
      });

      this.busMarkers.set(id, marker);
    }

    for (const [id, mk] of this.busMarkers.entries()) {
      if (!seen.has(id)) {
        mk.map = null;
        this.busMarkers.delete(id);
      }
    }
  }

  private createBusMarkerElement(bus: any): HTMLElement {
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
        <!-- Cuerpo principal -->
        <rect x="6" y="7" width="12" height="11" rx="1.5"
          fill="${color}"
          stroke="white"
          stroke-width="2"/>

        <!-- Parabrisas -->
        <rect x="8" y="9" width="8" height="4" rx="0.5"
          fill="white"
          fill-opacity="0.9"/>

        <!-- Ruedas -->
        <circle cx="9" cy="18" r="1.2"
          fill="#000"
          stroke="white"
          stroke-width="1"/>
        <circle cx="15" cy="18" r="1.2"
          fill="#000"
          stroke="white"
          stroke-width="1"/>
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
        ${bus?.placa || 'N/A'}
      </div>
    `;

    return container;
  }

  private getBusColor(bus: any): string {
    if (bus?.ruta?.color_hex) {
      return bus.ruta.color_hex;
    }

    if (bus?.activo === false) return '#9CA3AF';

    switch (bus?.estado) {
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

  private showBusInfo(bus: any) {
    const color = this.getBusColor(bus);

    const html = `
      <div style="padding: 12px; min-width: 220px;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">
          ${bus?.placa ?? '—'}
        </h3>
        <p style="margin: 4px 0; font-size: 13px;">
          <strong>Modelo:</strong> ${bus?.modelo || '—'}
        </p>
        <p style="margin: 4px 0; font-size: 13px;">
          <strong>Estado:</strong>
          <span style="background: ${color}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">
            ${bus?.estado ?? '—'}
          </span>
        </p>
        ${
          bus?.ruta
            ? `
          <p style="margin: 4px 0; font-size: 13px;">
            <strong>Ruta:</strong> ${bus.ruta.nombre} (${bus.ruta.codigo})
          </p>
        `
            : ''
        }
        ${
          bus?.velocidad
            ? `
          <p style="margin: 4px 0; font-size: 13px;">
            <strong>Velocidad:</strong> ${bus.velocidad} km/h
          </p>
        `
            : ''
        }
      </div>
    `;

    this.infoWindow.setContent(html);
    this.infoWindow.open(this.map!);
    this.infoWindow.setPosition({ lat: bus.latitud, lng: bus.longitud });
  }
}
