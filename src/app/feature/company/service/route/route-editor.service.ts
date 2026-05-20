import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { RouteService } from './route.service';
import { RouteResponse, UpdateRouteRequest } from '../../models/route.model';

@Injectable({ providedIn: 'root' })
export class RouteEditorService {
  private api = inject(RouteService);

  private directionsService = new google.maps.DirectionsService();
  private directionsRenderer!: google.maps.DirectionsRenderer;
  private geometryEncoding: any = null;

  private editingRouteIdSubject = new BehaviorSubject<number | null>(null);
  private hasChangesSubject = new BehaviorSubject<boolean>(false);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);

  editingRouteId$ = this.editingRouteIdSubject.asObservable();
  hasChanges$ = this.hasChangesSubject.asObservable();
  isLoading$ = this.isLoadingSubject.asObservable();

  private originalPolyline: string | null = null;
  private markers: google.maps.Marker[] = [];
  private routeColor: string = '#3367d6';
  private currentMap: google.maps.Map | null = null;

  private lastValidDirections: google.maps.DirectionsResult | null = null;
  private reverting = false;

  async startEditing(route: RouteResponse, map: google.maps.Map): Promise<void> {
    this.stopEditing();
    this.currentMap = map;

    this.editingRouteIdSubject.next(route.id);
    this.originalPolyline = route.polyline;
    this.hasChangesSubject.next(false);
    this.isLoadingSubject.next(false);
    this.routeColor = route.color_hex || '#3367d6';

    await google.maps.importLibrary('geometry');
    this.geometryEncoding = (google.maps.geometry as any)?.encoding;

    this.directionsRenderer = new google.maps.DirectionsRenderer({
      map,
      suppressMarkers: true,
      draggable: true,
      polylineOptions: {
        strokeColor: this.routeColor,
        strokeWeight: 5,
        strokeOpacity: 0.9,
      },
    });

    this.createEditMarkers(route);
    this.setupDirectionsChangedListener();
    this.calculateDirectionsFromRoute(route);
  }

  private createEditMarkers(route: RouteResponse): void {
    this.markers.forEach(m => m.setMap(null));

    if (!route.polyline || !this.geometryEncoding) return;

    const path = this.geometryEncoding.decodePath(route.polyline);
    if (!path || path.length < 2) return;

    const start = path[0];
    const end = path[path.length - 1];

    const startMarker = new google.maps.Marker({
      position: start,
      map: this.currentMap!,
      icon: this.createMarkerIcon('#10B981', 'A'),
      draggable: true,
      title: 'Origen',
    });

    const endMarker = new google.maps.Marker({
      position: end,
      map: this.currentMap!,
      icon: this.createMarkerIcon('#EF4444', 'B'),
      draggable: true,
      title: 'Destino',
    });

    google.maps.event.addListener(startMarker, 'dragend', () => {
      this.calculateDirectionsFromMarkers();
    });

    google.maps.event.addListener(endMarker, 'dragend', () => {
      this.calculateDirectionsFromMarkers();
    });

    this.markers = [startMarker, endMarker];
  }

  private setupDirectionsChangedListener(): void {
    google.maps.event.addListener(this.directionsRenderer, 'directions_changed', () => {
      if (this.reverting) return;

      const directions = this.directionsRenderer.getDirections();
      if (!directions?.routes?.length) return;

      const path = this.extractOverviewPath(directions);

      if (this.hasSelfIntersection(path)) {
        if (this.lastValidDirections) {
          this.reverting = true;
          this.directionsRenderer.setDirections(this.lastValidDirections);
          this.reverting = false;
        }
        return;
      }

      this.lastValidDirections = directions;
      this.syncMarkersToPath(path);
      this.hasChangesSubject.next(true);
    });
  }

  private calculateDirectionsFromRoute(route: RouteResponse): void {
    if (!route.polyline || !this.geometryEncoding) return;

    const path = this.geometryEncoding.decodePath(route.polyline);
    if (!path || path.length < 2) return;

    const origin = path[0];
    const destination = path[path.length - 1];

    this.isLoadingSubject.next(true);

    const request: google.maps.DirectionsRequest = {
      origin,
      destination,
      travelMode: google.maps.TravelMode.DRIVING,
    };

    this.directionsService.route(request, (result, status) => {
      this.isLoadingSubject.next(false);

      if (status === google.maps.DirectionsStatus.OK && result?.routes?.length) {
        this.lastValidDirections = result;
        this.reverting = true;
        this.directionsRenderer.setOptions({
          polylineOptions: {
            strokeColor: this.routeColor,
            strokeWeight: 5,
            strokeOpacity: 0.9,
          },
        });
        this.directionsRenderer.setDirections(result);
        this.reverting = false;
        this.syncMarkersToPath(this.extractOverviewPath(result));
      }
    });
  }

  private calculateDirectionsFromMarkers(): void {
    if (this.markers.length < 2) return;

    const origin = this.markers[0].getPosition();
    const destination = this.markers[1].getPosition();

    if (!origin || !destination) return;

    this.isLoadingSubject.next(true);

    const request: google.maps.DirectionsRequest = {
      origin,
      destination,
      travelMode: google.maps.TravelMode.DRIVING,
    };

    this.directionsService.route(request, (result, status) => {
      this.isLoadingSubject.next(false);

      if (status === google.maps.DirectionsStatus.OK && result?.routes?.length) {
        this.lastValidDirections = result;
        this.reverting = true;
        this.directionsRenderer.setDirections(result);
        this.reverting = false;
      }
    });
  }

  private extractOverviewPath(d: google.maps.DirectionsResult): google.maps.LatLngLiteral[] {
    const r = d.routes?.[0] as any;
    const p = r?.overview_path as google.maps.LatLng[] | undefined;
    if (!p?.length) return [];
    return p.map((ll) => ({ lat: ll.lat(), lng: ll.lng() }));
  }

  private syncMarkersToPath(path: google.maps.LatLngLiteral[]): void {
    if (!path.length || this.markers.length < 2) return;
    if (this.markers[0]) this.markers[0].setPosition(path[0]);
    if (this.markers[1]) this.markers[1].setPosition(path[path.length - 1]);
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

  private createMarkerIcon(bg: string, glyph: string): google.maps.Icon {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 24 24'>
      <defs><filter id='s' x='-50%' y='-50%' width='200%' height='200%'><feDropShadow dx='0' dy='1' stdDeviation='1' flood-color='rgba(0,0,0,0.25)'/></filter></defs>
      <path filter='url(#s)' d='M12 2c-3.9 0-7 3.1-7 7 0 5.3 7 13 7 13s7-7.7 7-13c0-3.9-3.1-7-7-7z' fill='${bg}' stroke='white' stroke-width='1.2'/>
      <text x='12' y='11.6' fill='white' font-size='7' text-anchor='middle' font-weight='bold'>${glyph}</text>
    </svg>`;
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      scaledSize: new google.maps.Size(36, 36),
      anchor: new google.maps.Point(18, 34),
    };
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

  saveChanges(): Observable<RouteResponse> | null {
    if (!this.editingRouteIdSubject.value) {
      console.error('Save failed: no editing route');
      return null;
    }

    const directions = this.directionsRenderer.getDirections();
    if (!directions?.routes?.length) {
      console.error('Save failed: no directions');
      return null;
    }

    const path = this.extractOverviewPath(directions);
    if (path.length < 2) {
      console.error('Save failed: path too short');
      return null;
    }

    const origin = path[0];
    const destination = path[path.length - 1];
    const polyline = this.encodePolyline(path);

    this.isLoadingSubject.next(true);

    const payload: UpdateRouteRequest = {
      polyline,
      origen: `${origin.lat},${origin.lng}`,
      destino: `${destination.lat},${destination.lng}`,
    };

    console.log('=== SAVE ROUTE ===');
    console.log('Payload:', payload);

    return new Observable(observer => {
      this.api.updateRoute(this.editingRouteIdSubject.value!, payload).subscribe({
        next: (route) => {
          console.log('Save SUCCESS');
          this.isLoadingSubject.next(false);
          this.hasChangesSubject.next(false);
          observer.next(route);
          observer.complete();
        },
        error: (err) => {
          console.error('Save FAILED:', err);
          this.isLoadingSubject.next(false);
          observer.error(err);
        }
      });
    });
  }

  discardChanges(): void {
    if (this.originalPolyline && this.currentMap) {
      this.calculateDirectionsFromRoute({
        id: this.editingRouteIdSubject.value!,
        polyline: this.originalPolyline,
        color_hex: this.routeColor,
      } as RouteResponse);
    }
    this.hasChangesSubject.next(false);
  }

  stopEditing(): void {
    if (this.directionsRenderer && this.currentMap) {
      this.directionsRenderer.setMap(null);
    }

    this.markers.forEach(m => m.setMap(null));
    this.markers = [];

    this.editingRouteIdSubject.next(null);
    this.hasChangesSubject.next(false);
    this.isLoadingSubject.next(false);
    this.originalPolyline = null;
    this.currentMap = null;
    this.lastValidDirections = null;
  }

  isEditing(): boolean {
    return this.editingRouteIdSubject.value !== null;
  }

  getEditingRouteId(): number | null {
    return this.editingRouteIdSubject.value;
  }

  hasUnsavedChanges(): boolean {
    return this.hasChangesSubject.value;
  }
}
