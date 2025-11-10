// src/app/feature/company/components/dashboard/route-creator/route-creator.ts
import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouteService } from '../../../service/route/route.service';
import { CreateRouteRequest } from '../../../models/route.model';
import { IconsModule } from '../../../icons.module';

interface RouteFormData {
  nombre: string;
  codigo: string;
  colorHex: string;
}

@Component({
  selector: 'app-route-creator',
  standalone: true,
  imports: [CommonModule, FormsModule, IconsModule],
  templateUrl: './route-creator.html',
})
export class RouteCreator implements OnInit, OnDestroy {
  @Input() map: google.maps.Map | null = null;
  @Output() routeCreated = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  private routeService = inject(RouteService);

  routeData: RouteFormData = { nombre: '', codigo: '', colorHex: '#3B82F6' };

  isCreatingRoute = false;
  hasOrigin = false;
  hasDestination = false;

  private originMarker: google.maps.Marker | null = null;
  private destinationMarker: google.maps.Marker | null = null;

  private directionsService = new google.maps.DirectionsService();
  private directionsRenderer!: google.maps.DirectionsRenderer;
  private directionsChangedListener: google.maps.MapsEventListener | null =
    null;
  private mapClickListener: google.maps.MapsEventListener | null = null;

  private lastValidDirections: google.maps.DirectionsResult | null = null;
  private reverting = false;

  ngOnInit() {
    if (!this.map) return;
    this.initializeDirectionsRenderer();
    this.setupMapClickListener();
    this.startCreatingRoute();
  }

  ngOnDestroy() {
    this.cleanup();
  }

  private initializeDirectionsRenderer() {
    if (this.directionsChangedListener) {
      google.maps.event.removeListener(this.directionsChangedListener);
      this.directionsChangedListener = null;
    }
    this.directionsRenderer = new google.maps.DirectionsRenderer({
      draggable: true,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: this.routeData.colorHex,
        strokeWeight: 5,
        strokeOpacity: 0.9,
      },
    });
    this.directionsRenderer.setMap(this.map!);
    this.directionsChangedListener = this.directionsRenderer.addListener(
      'directions_changed',
      () => {
        if (this.reverting) return;
        const d = this.directionsRenderer.getDirections();
        if (!d?.routes?.length) return;
        const path = this.extractOverviewPath(d);
        if (this.hasSelfIntersection(path)) {
          if (this.lastValidDirections) {
            this.reverting = true;
            this.directionsRenderer.setDirections(this.lastValidDirections);
            this.reverting = false;
          }
          return;
        }
        this.lastValidDirections = d;
        this.syncMarkersToPath(path);
      }
    );
  }

  private setupMapClickListener() {
    if (!this.map) return;
    if (this.mapClickListener) {
      google.maps.event.removeListener(this.mapClickListener);
      this.mapClickListener = null;
    }
    this.mapClickListener = this.map.addListener(
      'click',
      (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        if (!this.hasOrigin) {
          this.hasOrigin = true;
          this.originMarker = new google.maps.Marker({
            map: this.map!,
            position: e.latLng,
            draggable: true,
            icon: this.startIcon(),
          });
          this.originMarker.addListener('dragend', () => {
            if (this.hasDestination) this.calculateRoute();
          });
        } else if (!this.hasDestination) {
          this.hasDestination = true;
          this.destinationMarker = new google.maps.Marker({
            map: this.map!,
            position: e.latLng,
            draggable: true,
            icon: this.endIcon(),
          });
          this.destinationMarker.addListener('dragend', () =>
            this.calculateRoute()
          );
          this.calculateRoute();
        }
      }
    );
  }

  private startCreatingRoute() {
    this.isCreatingRoute = true;
    this.hasOrigin = false;
    this.hasDestination = false;
    this.clearMarkers();
  }

  private calculateRoute() {
    if (!this.originMarker || !this.destinationMarker) return;
    const origin = this.originMarker.getPosition()!;
    const destination = this.destinationMarker.getPosition()!;
    const req: google.maps.DirectionsRequest = {
      origin,
      destination,
      travelMode: google.maps.TravelMode.DRIVING,
      optimizeWaypoints: false,
    };
    this.directionsService.route(req, (result, status) => {
      if (status === google.maps.DirectionsStatus.OK && result) {
        this.reverting = true;
        this.directionsRenderer.setOptions({
          polylineOptions: {
            strokeColor: this.routeData.colorHex,
            strokeWeight: 5,
            strokeOpacity: 0.9,
          },
        });
        this.directionsRenderer.setDirections(result);
        this.lastValidDirections = result;
        this.syncMarkersToPath(this.extractOverviewPath(result));
        this.reverting = false;
      }
    });
  }

  onSave() {
    if (!this.isFormValid) return;
    const d = this.directionsRenderer.getDirections();
    if (!d?.routes?.length) return;
    const path = this.extractOverviewPath(d);
    if (path.length < 2) return;

    const origen = path[0];
    const destino = path[path.length - 1];
    const polyline = this.encodePolyline(path);

    let color = (this.routeData.colorHex || '').trim();
    if (color && !color.startsWith('#')) color = '#' + color.replace(/^#/, '');

    const payload: CreateRouteRequest = {
      nombre: this.routeData.nombre,
      codigo: this.routeData.codigo,
      descripcion: 'Ruta',
      origen: `${origen.lat},${origen.lng}`,
      destino: `${destino.lat},${destino.lng}`,
      color_hex: color,
      polyline,
      bus_ids: [],
    };

    this.routeService.createRoute(payload).subscribe({
      next: () => {
        this.cleanup();
        this.routeCreated.emit();
      },
      error: () => {},
    });
  }

  onClear() {
    this.clearMarkers();
    this.directionsRenderer.setDirections({ routes: [] } as any);
    this.lastValidDirections = null;
    this.hasOrigin = false;
    this.hasDestination = false;
  }

  onCancel() {
    this.cleanup();
    this.cancel.emit();
  }

  onColorChange() {
    if (this.routeData.colorHex && !this.routeData.colorHex.startsWith('#')) {
      this.routeData.colorHex = '#' + this.routeData.colorHex.replace(/^#/, '');
    }
    const d = this.directionsRenderer.getDirections();
    if (d?.routes?.length) {
      this.reverting = true;
      this.directionsRenderer.setOptions({
        polylineOptions: {
          strokeColor: this.routeData.colorHex,
          strokeWeight: 5,
          strokeOpacity: 0.9,
        },
      });
      this.directionsRenderer.setDirections(d);
      this.reverting = false;
    }
  }

  get isFormValid(): boolean {
    return !!(
      this.routeData.nombre &&
      this.routeData.codigo &&
      this.hasDestination
    );
  }

  private clearMarkers() {
    if (this.originMarker) this.originMarker.setMap(null);
    if (this.destinationMarker) this.destinationMarker.setMap(null);
    this.originMarker = null;
    this.destinationMarker = null;
  }

  private cleanup() {
    if (this.mapClickListener) {
      google.maps.event.removeListener(this.mapClickListener);
      this.mapClickListener = null;
    }
    if (this.directionsChangedListener) {
      google.maps.event.removeListener(this.directionsChangedListener);
      this.directionsChangedListener = null;
    }
    this.clearMarkers();
    if (this.directionsRenderer && this.map)
      this.directionsRenderer.setMap(null as any);
  }

  private extractOverviewPath(
    d: google.maps.DirectionsResult
  ): google.maps.LatLngLiteral[] {
    const r = d.routes?.[0] as any;
    const p = r?.overview_path as google.maps.LatLng[] | undefined;
    if (!p?.length) return [];
    return p.map((ll) => ({ lat: ll.lat(), lng: ll.lng() }));
  }

  private syncMarkersToPath(path: google.maps.LatLngLiteral[]) {
    if (!path.length) return;
    if (this.originMarker) this.originMarker.setPosition(path[0]);
    if (this.destinationMarker)
      this.destinationMarker.setPosition(path[path.length - 1]);
  }

  private hasSelfIntersection(path: google.maps.LatLngLiteral[]): boolean {
    const n = path.length;
    if (n < 4) return false;
    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 1; j < n - 1; j++) {
        if (Math.abs(i - j) <= 1) continue;
        if (i === 0 && j === n - 2) continue;
        if (this.segmentsIntersect(path[i], path[i + 1], path[j], path[j + 1]))
          return true;
      }
    }
    return false;
  }

  private segmentsIntersect(
    a: google.maps.LatLngLiteral,
    b: google.maps.LatLngLiteral,
    c: google.maps.LatLngLiteral,
    d: google.maps.LatLngLiteral
  ): boolean {
    const o1 = this.orientation(a, b, c);
    const o2 = this.orientation(a, b, d);
    const o3 = this.orientation(c, d, a);
    const o4 = this.orientation(c, d, b);
    if (o1 * o2 < 0 && o3 * o4 < 0) return true;
    if (o1 === 0 && this.onSegment(a, b, c)) return true;
    if (o2 === 0 && this.onSegment(a, b, d)) return true;
    if (o3 === 0 && this.onSegment(c, d, a)) return true;
    if (o4 === 0 && this.onSegment(c, d, b)) return true;
    return false;
  }

  private orientation(
    p: google.maps.LatLngLiteral,
    q: google.maps.LatLngLiteral,
    r: google.maps.LatLngLiteral
  ): number {
    const val =
      (q.lng - p.lng) * (r.lat - p.lat) - (q.lat - p.lat) * (r.lng - p.lng);
    const eps = 1e-12;
    if (Math.abs(val) < eps) return 0;
    return val > 0 ? 1 : -1;
  }

  private onSegment(
    p: google.maps.LatLngLiteral,
    q: google.maps.LatLngLiteral,
    r: google.maps.LatLngLiteral
  ): boolean {
    return (
      r.lat <= Math.max(p.lat, q.lat) + 1e-12 &&
      r.lat + 1e-12 >= Math.min(p.lat, q.lat) &&
      r.lng <= Math.max(p.lng, q.lng) + 1e-12 &&
      r.lng + 1e-12 >= Math.min(p.lng, q.lng)
    );
  }

  private encodePolyline(path: google.maps.LatLngLiteral[]): string {
    const enc = (v: number) => {
      v = Math.round(v);
      v <<= 1;
      if (v < 0) v = ~v;
      let out = '';
      while (v >= 0x20) {
        out += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
        v >>= 5;
      }
      out += String.fromCharCode(v + 63);
      return out;
    };
    let lastLat = 0,
      lastLng = 0,
      res = '';
    for (const p of path) {
      const lat = Math.round(p.lat * 1e5);
      const lng = Math.round(p.lng * 1e5);
      res += enc(lat - lastLat);
      res += enc(lng - lastLng);
      lastLat = lat;
      lastLng = lng;
    }
    return res;
  }

  private startIcon(): google.maps.Icon {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 24 24'>
      <defs><filter id='s' x='-50%' y='-50%' width='200%' height='200%'><feDropShadow dx='0' dy='1' stdDeviation='1' flood-color='rgba(0,0,0,0.25)'/></filter></defs>
      <path filter='url(#s)' d='M12 2c-3.9 0-7 3.1-7 7 0 5.3 7 13 7 13s7-7.7 7-13c0-3.9-3.1-7-7-7z' fill='#1E40AF' stroke='white' stroke-width='1.2'/>
      <circle cx='12' cy='10' r='3' fill='white' opacity='.9'/>
    </svg>`;
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      scaledSize: new google.maps.Size(36, 36),
      anchor: new google.maps.Point(18, 34),
    };
  }

  private endIcon(): google.maps.Icon {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 24 24'>
      <defs><filter id='s' x='-50%' y='-50%' width='200%' height='200%'><feDropShadow dx='0' dy='1' stdDeviation='1' flood-color='rgba(0,0,0,0.25)'/></filter></defs>
      <path filter='url(#s)' d='M12 2c-3.9 0-7 3.1-7 7 0 5.3 7 13 7 13s7-7.7 7-13c0-3.9-3.1-7-7-7z' fill='#B91C1C' stroke='white' stroke-width='1.2'/>
      <circle cx='12' cy='10' r='3' fill='white' opacity='.9'/>
    </svg>`;
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      scaledSize: new google.maps.Size(36, 36),
      anchor: new google.maps.Point(18, 34),
    };
  }
}
