import { Injectable, inject } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  catchError,
  finalize,
  firstValueFrom,
  of,
  tap,
  map,
} from 'rxjs';
import { RouteService, EstadoRuta } from './route.service';
import { RouteResponse, RouteStopResponse } from '../../models/route.model';

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
    { 
      polyline?: google.maps.Polyline; 
      animatedPolyline?: google.maps.Polyline;
      origin?: AnyMarker; 
      dest?: AnyMarker;
      stops?: google.maps.Marker[];
    }
  >();

  private animations = new Map<number, number>();

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
    let animatedPolyline: google.maps.Polyline | undefined;

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
        const routeColor = route.color_hex || '#3367d6';

        // 1. Línea de fondo (sombra/brillo)
        polyline = new google.maps.Polyline({
          path,
          strokeColor: routeColor,
          strokeOpacity: 0.3,
          strokeWeight: 8,
          map,
        });

        // 2. Línea principal animada (puntos moviéndose)
        const lineSymbol = {
          path: google.maps.SymbolPath.CIRCLE,
          fillOpacity: 1,
          scale: 3,
          fillColor: routeColor,
          strokeWeight: 0
        };

        animatedPolyline = new google.maps.Polyline({
          path,
          strokeColor: routeColor,
          strokeOpacity: 0, // Ocultar la línea base, solo ver los puntos
          icons: [{
            icon: lineSymbol,
            offset: '0',
            repeat: '20px'
          }],
          map,
        });

        // 3. Animación del flujo
        this.animateRouteFlow(route.id, animatedPolyline);

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

    // Utiliza los iconos personalizados para origen y destino
    const origin = await this.createCustomIconMarker(
      map,
      start,
      'A',
      '#10B981', // Color verde para el origen
      'Origen'
    );
    const dest = await this.createCustomIconMarker(
      map,
      end,
      'B',
      '#EF4444', // Color rojo para el destino
      'Destino'
    );

    if (!bounds.isEmpty()) map.fitBounds(bounds);

    this.rendered.set(route.id, { polyline, animatedPolyline, origin, dest });
  }

  async showRouteStopsOnMap(
    route: RouteResponse,
    map: google.maps.Map
  ): Promise<void> {
    const stops = await firstValueFrom(this.api.getRouteStops(route.id));
    this.renderStopsOnMap(route.id, stops, map, route.color_hex || '#7C3AED');
  }

  clearRouteFromMap(routeId: number): void {
    const r = this.rendered.get(routeId);
    if (r) {
      r.polyline?.setMap(null);
      r.animatedPolyline?.setMap(null);
      
      const animationFrame = this.animations.get(routeId);
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        this.animations.delete(routeId);
      }

      if ((r.origin as any)?.map !== undefined) (r.origin as any).map = null;
      else (r.origin as google.maps.Marker | undefined)?.setMap(null);
      if ((r.dest as any)?.map !== undefined) (r.dest as any).map = null;
      else (r.dest as google.maps.Marker | undefined)?.setMap(null);
      r.stops?.forEach((marker) => marker.setMap(null));
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

  private animateRouteFlow(
    routeId: number,
    animatedPolyline: google.maps.Polyline
  ): void {
    const pixelsPerSecond = 48;
    const repeatPixels = 20;
    const startedAt = performance.now();

    const tick = (now: number) => {
      const icons = animatedPolyline.get('icons');

      if (icons && icons[0]) {
        const elapsedSeconds = (now - startedAt) / 1000;
        const offset = (elapsedSeconds * pixelsPerSecond) % repeatPixels;
        icons[0].offset = `${offset}px`;
        animatedPolyline.set('icons', icons);
      }

      const frame = requestAnimationFrame(tick);
      this.animations.set(routeId, frame);
    };

    const frame = requestAnimationFrame(tick);
    this.animations.set(routeId, frame);
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
    const style = `
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 4px;
    max-width: 180px;
    color: #333;
    background: white;
    border-radius: 6px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    font-family: Arial, sans-serif;
    text-align: center;
  `;

    const contentStyle = `
    margin: 2px 0;
    font-size: 12px;
    line-height: 1.2;
  `;

    this.infoWindow!.setContent(
      `<div style="${style}">
       <div style="font-weight: bold; margin-bottom: 4px;">${title}</div>
       <div style="${contentStyle}">${address}</div>
     </div>`
    );
    this.infoWindow!.setPosition(pos);
    this.infoWindow!.open(
      ((marker as any).map as google.maps.Map | null) || undefined
    );
  }

  private async createCustomIconMarker(
    map: google.maps.Map,
    position: google.maps.LatLng | google.maps.LatLngLiteral,
    glyph: string,
    bg: string,
    title: string
  ): Promise<AnyMarker> {
    const svgIcon = `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24'>
      <defs><filter id='s' x='-50%' y='-50%' width='200%' height='200%'><feDropShadow dx='0' dy='1' stdDeviation='1' flood-color='rgba(0,0,0,0.25)'/></filter></defs>
      <path filter='url(#s)' d='M12 2c-3.9 0-7 3.1-7 7 0 5.3 7 13 7 13s7-7.7 7-13c0-3.9-3.1-7-7-7z' fill='${bg}' stroke='white' stroke-width='1.2'/>
      <text x='12' y='11.6' fill='white' font-size='7' text-anchor='middle' font-weight='bold'>${glyph}</text>
    </svg>`;
    const icon = {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgIcon)}`,
      scaledSize: new google.maps.Size(36, 36),
      anchor: new google.maps.Point(18, 34),
    };

    const marker = new google.maps.Marker({
      map,
      position,
      title,
      icon: icon,
    });

    marker.addListener('click', () =>
      this.showAddressOnMarkerClick(marker, title)
    );
    return marker;
  }

  private renderStopsOnMap(
    routeId: number,
    stops: RouteStopResponse[],
    map: google.maps.Map,
    fallbackColor: string
  ): void {
    const renderedRoute = this.rendered.get(routeId);
    if (!renderedRoute) {
      return;
    }

    renderedRoute.stops?.forEach((marker) => marker.setMap(null));

    const stopMarkers = stops
      .sort((a, b) => a.orden - b.orden)
      .map((stop) => {
        const marker = new google.maps.Marker({
          map,
          position: { lat: stop.latitud, lng: stop.longitud },
          title: stop.nombre || stop.direccion || `Parada ${stop.orden}`,
          icon: this.createStopMarkerIcon(
            stop.color_hex || fallbackColor,
            stop.orden
          ),
          zIndex: 20 + stop.orden,
        });

        marker.addListener('click', () => {
          this.showRouteStopInfo(marker, stop);
        });

        return marker;
      });

    this.rendered.set(routeId, { ...renderedRoute, stops: stopMarkers });
  }

  private createStopMarkerIcon(color: string, order: number): google.maps.Icon {
    const label = String(order).slice(-2);
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 36 36'>
      <circle cx='18' cy='18' r='14' fill='${color}' stroke='white' stroke-width='3'/>
      <text x='18' y='22' text-anchor='middle' font-size='13' font-weight='700' fill='white'>${label}</text>
    </svg>`;

    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new google.maps.Size(36, 36),
      anchor: new google.maps.Point(18, 18),
    };
  }

  private showRouteStopInfo(
    marker: google.maps.Marker,
    stop: RouteStopResponse
  ): void {
    this.ensureInfoHelpers();
    const title = stop.nombre || `Parada ${stop.orden}`;
    const detail =
      stop.direccion ||
      `Lat ${stop.latitud.toFixed(6)}, Lng ${stop.longitud.toFixed(6)}`;

    this.infoWindow!.setContent(
      `<div style="padding: 4px; max-width: 190px; color: #1f2937; font-family: Arial, sans-serif;">
        <div style="font-weight: 700; font-size: 12px; margin-bottom: 4px;">${title}</div>
        <div style="font-size: 11px; line-height: 1.35;">${detail}</div>
      </div>`
    );
    this.infoWindow!.open({
      anchor: marker,
      map: marker.getMap() as google.maps.Map,
    });
  }
}
