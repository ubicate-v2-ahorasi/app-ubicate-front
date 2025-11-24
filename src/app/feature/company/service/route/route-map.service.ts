// src/app/feature/company/service/route/route-map.service.ts
import { Injectable, inject } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  catchError,
  finalize,
  of,
  tap,
  map,
} from 'rxjs';
import { RouteService, EstadoRuta } from './route.service';
import { RouteResponse } from '../../models/route.model';

type AnyMarker = google.maps.marker.AdvancedMarkerElement | google.maps.Marker;

@Injectable({ providedIn: 'root' })
export class RouteMapService {
  private api = inject(RouteService);

  private routesSubject = new BehaviorSubject<RouteResponse[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  routes$ = this.routesSubject.asObservable();
  loading$ = this.loadingSubject.asObservable();
  error$ = this.errorSubject.asObservable();

  private rendered = new Map<
    number,
    { polyline?: google.maps.Polyline; origin?: AnyMarker; dest?: AnyMarker }
  >();

  private infoWindow: google.maps.InfoWindow | null = null;
  private geocoder: google.maps.Geocoder | null = null;
  private addressCache = new Map<string, string>();
  private geometryLoaded?: Promise<void>;

  loadRoutes(estado?: EstadoRuta): Observable<RouteResponse[]> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    return this.api.getRoutes(estado).pipe(
      tap((routes) => this.routesSubject.next(routes)),
      catchError(() => {
        this.routesSubject.next([]);
        this.errorSubject.next('Error al cargar las rutas');
        return of([]);
      }),
      finalize(() => this.loadingSubject.next(false))
    );
  }

  getById(id: number): Observable<RouteResponse> {
    return this.api.getRouteById(id);
  }

  updateRoute(id: number, body: Partial<RouteResponse>) {
    return this.api.updateRoute(id, body as any);
  }

  deleteRoute(id: number) {
    return this.api.deleteRoute(id);
  }

  updateRoutesList(routes: RouteResponse[]): void {
    this.routesSubject.next(routes);
  }

  toggleRouteActive(routeId: number): Observable<RouteResponse | null> {
    const current = this.routesSubject.value;
    const found = current.find((r) => r.id === routeId);
    if (!found) return of(null);
    const nextEstado = (
      found.estado === 'ACTIVA' ? 'INACTIVA' : 'ACTIVA'
    ) as EstadoRuta;
    return this.updateRoute(routeId, { estado: nextEstado } as any).pipe(
      map((updated) => {
        const list = current.map((r) => (r.id === routeId ? updated : r));
        this.routesSubject.next(list);
        return updated;
      }),
      catchError(() => {
        this.errorSubject.next('Error al actualizar la ruta');
        return of(null);
      })
    );
  }

  async showRouteOnMap(
    route: RouteResponse,
    map: google.maps.Map
  ): Promise<void> {
    this.clearRouteFromMap(route.id);

    const bounds = new google.maps.LatLngBounds();
    let start: google.maps.LatLng | null = null;
    let end: google.maps.LatLng | null = null;
    let polyline: google.maps.Polyline | undefined;

    if (route.polyline) {
      if (!this.geometryLoaded) {
        this.geometryLoaded = google.maps
          .importLibrary('geometry')
          .then(() => undefined);
      }
      await this.geometryLoaded;

      const path =
        google.maps.geometry.encoding.decodePath(route.polyline) || [];
      if (path.length > 0) {
        polyline = new google.maps.Polyline({
          path,
          strokeColor: route.color_hex || '#3367d6',
          strokeOpacity: 0.9,
          strokeWeight: 5,
          map,
        });
        start = path[0];
        end = path[path.length - 1];
        path.forEach((p) => bounds.extend(p));
      }
    }

    if (!start || !end) {
      const [olat, olng] = route.origen.split(',').map(Number);
      const [dlat, dlng] = route.destino.split(',').map(Number);
      start = new google.maps.LatLng(olat, olng);
      end = new google.maps.LatLng(dlat, dlng);
      bounds.extend(start);
      bounds.extend(end);
    }

    const origin = await this.createLabeledMarker(
      map,
      start,
      'A',
      '#10B981',
      'Origen'
    );
    const dest = await this.createLabeledMarker(
      map,
      end,
      'B',
      '#EF4444',
      'Destino'
    );

    if (!bounds.isEmpty()) map.fitBounds(bounds);

    this.rendered.set(route.id, { polyline, origin, dest });
  }

  clearRouteFromMap(routeId: number): void {
    const r = this.rendered.get(routeId);
    if (r) {
      r.polyline?.setMap(null);
      if ((r.origin as any)?.map !== undefined) (r.origin as any).map = null;
      else (r.origin as google.maps.Marker | undefined)?.setMap(null);
      if ((r.dest as any)?.map !== undefined) (r.dest as any).map = null;
      else (r.dest as google.maps.Marker | undefined)?.setMap(null);
      this.rendered.delete(routeId);
    }
  }

  clearAllRoutesFromMap(): void {
    Array.from(this.rendered.keys()).forEach((id) =>
      this.clearRouteFromMap(id)
    );
  }

  getRoutes(): RouteResponse[] {
    return this.routesSubject.value;
  }

  private ensureInfoHelpers() {
    if (!this.infoWindow) this.infoWindow = new google.maps.InfoWindow();
    if (!this.geocoder) this.geocoder = new google.maps.Geocoder();
  }

  private getMarkerLatLng(m: AnyMarker): google.maps.LatLng {
    const pos: any =
      (m as any).position ?? (m as google.maps.Marker).getPosition?.();
    if (pos?.lat && typeof pos.lat === 'function')
      return pos as google.maps.LatLng;
    if (pos && typeof pos.lat === 'number' && typeof pos.lng === 'number') {
      return new google.maps.LatLng(pos.lat, pos.lng);
    }
    return pos as google.maps.LatLng;
  }

  private async showAddressOnMarkerClick(marker: AnyMarker, title: string) {
    this.ensureInfoHelpers();
    const pos = this.getMarkerLatLng(marker);
    const key = `${pos.lat().toFixed(6)},${pos.lng().toFixed(6)}`;

    if (!this.addressCache.has(key)) {
      const res = await this.geocoder!.geocode({ location: pos });
      const addr =
        res.results?.[0]?.formatted_address ||
        `Lat ${pos.lat().toFixed(6)}, Lng ${pos.lng().toFixed(6)}`;
      this.addressCache.set(key, addr);
    }

    const address = this.addressCache.get(key)!;
    this.infoWindow!.setContent(
      `<div style="min-width:220px">
         <div style="font-weight:600;margin-bottom:4px">${title}</div>
         <div style="font-size:12px;line-height:1.3">${address}</div>
       </div>`
    );
    this.infoWindow!.setPosition(pos);
    this.infoWindow!.open(
      ((marker as any).map as google.maps.Map | null) || undefined
    );
  }

  private async createLabeledMarker(
    map: google.maps.Map,
    position: google.maps.LatLng | google.maps.LatLngLiteral,
    glyph: string,
    bg: string,
    title: string
  ): Promise<AnyMarker> {
    const hasVectorMapId = !!(map as any)?.get?.('mapId');

    if (hasVectorMapId) {
      const { AdvancedMarkerElement, PinElement } =
        (await google.maps.importLibrary(
          'marker'
        )) as google.maps.MarkerLibrary;

      const pin = new PinElement({
        background: bg,
        borderColor: '#ffffff',
        glyphColor: '#ffffff',
        glyph,
        scale: 1.5,
      });

      const adv = new AdvancedMarkerElement({
        map,
        position,
        title,
        content: pin.element,
      });

      (adv as any).addListener('gmp-click', () =>
        this.showAddressOnMarkerClick(adv, title)
      );
      return adv;
    } else {
      const marker = new google.maps.Marker({
        map,
        position,
        title,
        icon: {
          url: 'https://maps.gstatic.com/mapfiles/api-3/images/spotlight-poi2_hdpi.png',
          scaledSize: new google.maps.Size(28, 28),
          anchor: new google.maps.Point(14, 28),
          labelOrigin: new google.maps.Point(14, 10),
        },
        label: {
          text: glyph,
          color: '#ffffff',
          fontSize: '12px',
          fontWeight: '700',
        },
      });

      marker.addListener('click', () =>
        this.showAddressOnMarkerClick(marker, title)
      );
      return marker;
    }
  }
}
