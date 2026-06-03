import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GoogleMap, GoogleMapsModule } from '@angular/google-maps';
import { Subscription } from 'rxjs';
import {
  RouteResponse,
  RouteStopRequest,
  RouteStopResponse,
} from '../../models/route.model';
import { RouteService } from '../../service/route/route.service';
import { RouteMapService } from '../../service/route/route-map.service';
import { RouteEditorService } from '../../service/route/route-editor.service';
import { RouteCreator } from '../dashboard/route-creator/route-creator';
import { RouteEditControlComponent } from '../dashboard/route-edit-control/route-edit-control';
import { IconsModule } from '../../icons.module';
import { ThemeService } from '../../../../core/service/theme.service';
import { environment } from '../../../../core/config/environment';
import { MAP_DARK_STYLES } from '../dashboard/map-dark-mode/map-dark-mode.styles';

export type RouteManagementMode = 'create' | 'edit' | 'stops';

interface EditableRouteStop {
  clientId: string;
  id?: number;
  nombre: string;
  direccion: string;
  latitud: number;
  longitud: number;
  color_hex: string;
  orden: number;
  activo: boolean;
  pathIndex: number;
  isCollapsed: boolean;
}

@Component({
  selector: 'app-route-management-map',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GoogleMapsModule,
    RouteCreator,
    RouteEditControlComponent,
    IconsModule,
  ],
  templateUrl: './route-management-map.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteManagementMapComponent implements OnInit, OnDestroy {
  private readonly routeService = inject(RouteService);
  private readonly routeMapService = inject(RouteMapService);
  private readonly routeEditorService = inject(RouteEditorService);
  private readonly themeService = inject(ThemeService);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input({ required: true }) mode: RouteManagementMode = 'create';
  @Input() route: RouteResponse | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  @ViewChild(GoogleMap) set googleMap(component: GoogleMap | undefined) {
    if (!component) {
      this.googleMapComponent = undefined;
      return;
    }

    this.googleMapComponent = component;
    void this.initializeGoogleMap();
  }

  private googleMapComponent?: GoogleMap;
  private readonly lightMapId = environment.googleMaps?.mapId;
  private readonly darkMapId = environment.googleMaps?.darkMapId;
  private themeSub?: Subscription;
  private geocoder: google.maps.Geocoder | null = null;
  private stopClickListener: google.maps.MapsEventListener | null = null;
  private stopMarkers = new Map<string, google.maps.Marker>();
  private routePath: google.maps.LatLngLiteral[] = [];
  private stopSequence = 0;

  center: google.maps.LatLngLiteral = { lat: -8.1116, lng: -79.0288 };
  zoom = 15;
  mapWidth = '100%';
  mapHeight = '100%';
  googleMapReady = false;
  isBusy = false;
  stopError: string | null = null;
  stops: EditableRouteStop[] = [];
  isStopsPanelCollapsed = false;

  mapOptions: google.maps.MapOptions = this.buildMapOptions(false);

  ngOnInit(): void {
    this.themeSub = this.themeService.isDarkMode$.subscribe((isDark) => {
      this.mapOptions = this.buildMapOptions(isDark);
      this.safeGoogleMap?.setOptions(this.mapOptions);
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.themeSub?.unsubscribe();
    this.stopClickListener?.remove();
    this.routeEditorService.stopEditing();
    this.routeMapService.clearAllRoutesFromMap();
    this.clearStopMarkers();
  }

  get safeGoogleMap(): google.maps.Map | null {
    return this.googleMapComponent?.googleMap ?? null;
  }

  get title(): string {
    switch (this.mode) {
      case 'create':
        return 'Nueva Ruta';
      case 'edit':
        return `Editar Ruta${this.route ? `: ${this.route.nombre}` : ''}`;
      case 'stops':
        return `Gestionar Paradas${this.route ? `: ${this.route.nombre}` : ''}`;
    }
  }

  get subtitle(): string {
    switch (this.mode) {
      case 'create':
        return 'Usa el mapa para trazar la ruta y luego guarda.';
      case 'edit':
        return 'Ajusta la geometría arrastrando la ruta o los puntos A/B.';
      case 'stops':
        return 'Haz clic cerca del poliline para agregar paradas y ordenarlas.';
    }
  }

  get isStopsMode(): boolean {
    return this.mode === 'stops';
  }

  get orderedStops(): EditableRouteStop[] {
    return [...this.stops].sort((a, b) => a.orden - b.orden);
  }

  get layoutClass(): string {
    if (!this.isStopsMode) {
      return 'h-[72vh]';
    }

    return this.isStopsPanelCollapsed
      ? 'grid h-[72vh] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_88px]'
      : 'grid h-[72vh] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px]';
  }

  get stopsAsideClass(): string {
    const base =
      'border-t border-gray-200 bg-gray-50 p-4 transition-all duration-200 dark:border-gray-700 dark:bg-gray-900 lg:border-l lg:border-t-0';

    return this.isStopsPanelCollapsed
      ? `${base} flex flex-col items-center gap-4 px-3 py-4`
      : base;
  }

  trackByStop(_: number, stop: EditableRouteStop): string {
    return stop.clientId;
  }

  onCancel(): void {
    this.close.emit();
  }

  toggleStopsPanel(): void {
    this.isStopsPanelCollapsed = !this.isStopsPanelCollapsed;
    this.cdr.markForCheck();
  }

  onCreateCompleted(): void {
    this.saved.emit();
  }

  onEditCompleted(): void {
    this.saved.emit();
  }

  async saveStops(): Promise<void> {
    if (!this.route || this.isBusy) {
      return;
    }

    this.isBusy = true;
    this.stopError = null;
    this.cdr.markForCheck();

    const payload: RouteStopRequest[] = this.orderedStops.map((stop, index) => ({
      nombre: stop.nombre.trim() || stop.direccion.trim(),
      direccion: stop.direccion.trim(),
      latitud: stop.latitud,
      longitud: stop.longitud,
      color_hex: stop.color_hex || this.route?.color_hex || '#0F766E',
      orden: index + 1,
    }));

    this.routeService.saveRouteStops(this.route.id, payload).subscribe({
      next: (stops) => {
        this.stops = this.mapStopsToDrafts(stops);
        this.renderStopMarkers();
        this.isBusy = false;
        this.saved.emit();
      },
      error: () => {
        this.isBusy = false;
        this.stopError = 'No se pudieron guardar las paradas.';
        this.cdr.markForCheck();
      },
    });
  }

  removeStop(clientId: string): void {
    this.stops = this.stops.filter((stop) => stop.clientId !== clientId);
    this.reindexStops();
    this.renderStopMarkers();
    this.cdr.markForCheck();
  }

  toggleStopCollapse(clientId: string): void {
    this.stops = this.stops.map((stop) =>
      stop.clientId === clientId
        ? { ...stop, isCollapsed: !stop.isCollapsed }
        : stop
    );
    this.cdr.markForCheck();
  }

  onStopColorChange(clientId: string, rawColor: string): void {
    const normalizedColor = this.normalizeHexColor(rawColor);

    this.stops = this.stops.map((stop) =>
      stop.clientId === clientId
        ? { ...stop, color_hex: normalizedColor }
        : stop
    );

    this.updateStopMarker(clientId);
    this.cdr.markForCheck();
  }

  private async initializeGoogleMap(): Promise<void> {
    if (!this.safeGoogleMap || this.googleMapReady) {
      return;
    }

    this.googleMapReady = true;
    this.geocoder = new google.maps.Geocoder();

    if (this.route) {
      this.center = this.getRouteCenter(this.route);
      this.safeGoogleMap.setCenter(this.center);
      this.safeGoogleMap.setZoom(this.zoom);
    }

    await this.activateMode();
    this.cdr.markForCheck();
  }

  private async activateMode(): Promise<void> {
    if (!this.safeGoogleMap) {
      return;
    }

    this.routeMapService.clearAllRoutesFromMap();
    this.routeEditorService.stopEditing();
    this.clearStopMarkers();

    if (this.mode === 'create') {
      return;
    }

    if (!this.route) {
      this.stopError = 'No se encontró la ruta seleccionada.';
      return;
    }

    if (this.route.polyline) {
      await google.maps.importLibrary('geometry');
      this.routePath =
        google.maps.geometry.encoding.decodePath(this.route.polyline).map((point) => ({
          lat: point.lat(),
          lng: point.lng(),
        })) || [];
    }

    if (this.mode === 'edit') {
      await this.routeEditorService.startEditing(this.route, this.safeGoogleMap);
      return;
    }

    await this.routeMapService.showRouteOnMap(this.route, this.safeGoogleMap);
    this.loadStops();
    this.setupStopClickListener();
  }

  private loadStops(): void {
    if (!this.route) {
      return;
    }

    this.isBusy = true;
    this.stopError = null;
    this.cdr.markForCheck();

    this.routeService.getRouteStops(this.route.id).subscribe({
      next: (stops) => {
        this.stops = this.mapStopsToDrafts(stops);
        this.renderStopMarkers();
        this.isBusy = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isBusy = false;
        this.stopError = 'No se pudieron cargar las paradas de la ruta.';
        this.cdr.markForCheck();
      },
    });
  }

  private mapStopsToDrafts(stops: RouteStopResponse[]): EditableRouteStop[] {
    return stops
      .map((stop) => ({
        clientId: `stop-${stop.id}`,
        id: stop.id,
        nombre: stop.nombre ?? '',
        direccion: stop.direccion ?? this.formatCoordinateLabel(stop.latitud, stop.longitud),
        latitud: stop.latitud,
        longitud: stop.longitud,
        color_hex:
          stop.color_hex || this.route?.color_hex || '#0F766E',
        orden: stop.orden,
        activo: stop.activo,
        pathIndex: this.findNearestPathIndex({
          lat: stop.latitud,
          lng: stop.longitud,
        }).index,
        isCollapsed: false,
      }))
      .sort((a, b) => a.orden - b.orden);
  }

  private setupStopClickListener(): void {
    this.stopClickListener?.remove();

    if (!this.safeGoogleMap) {
      return;
    }

    this.stopClickListener = this.safeGoogleMap.addListener(
      'click',
      async (event: google.maps.MapMouseEvent) => {
        if (!event.latLng || !this.isStopsMode) {
          return;
        }

        await this.addStopFromClick({
          lat: event.latLng.lat(),
          lng: event.latLng.lng(),
        });
      }
    );
  }

  private async addStopFromClick(
    point: google.maps.LatLngLiteral
  ): Promise<void> {
    if (!this.routePath.length) {
      this.stopError = 'La ruta no tiene un poliline válido para ubicar paradas.';
      this.cdr.markForCheck();
      return;
    }

    const nearest = this.findNearestPathIndex(point);
    if (nearest.distanceMeters > 90) {
      this.stopError =
        'Selecciona un punto más cercano al poliline de la ruta para crear una parada.';
      this.cdr.markForCheck();
      return;
    }

    this.stopError = null;
    const snappedPoint = this.routePath[nearest.index];
    const address = await this.reverseGeocode(snappedPoint);

    this.stopSequence += 1;
    this.stops = [
      ...this.stops,
      {
        clientId: `new-stop-${this.stopSequence}`,
        nombre: '',
        direccion: address,
        latitud: snappedPoint.lat,
        longitud: snappedPoint.lng,
        color_hex: this.route?.color_hex || '#0F766E',
        orden: this.stops.length + 1,
        activo: true,
        pathIndex: nearest.index,
        isCollapsed: false,
      },
    ];

    this.reindexStops();
    this.renderStopMarkers();
    this.cdr.markForCheck();
  }

  private reverseGeocode(point: google.maps.LatLngLiteral): Promise<string> {
    if (!this.geocoder) {
      return Promise.resolve(
        this.formatCoordinateLabel(point.lat, point.lng)
      );
    }

    return new Promise((resolve) => {
      this.geocoder!.geocode({ location: point }, (results, status) => {
        if (
          status === google.maps.GeocoderStatus.OK &&
          results &&
          results.length > 0
        ) {
          resolve(results[0].formatted_address);
          return;
        }

        resolve(this.formatCoordinateLabel(point.lat, point.lng));
      });
    });
  }

  private renderStopMarkers(): void {
    if (!this.safeGoogleMap) {
      return;
    }

    this.clearStopMarkers();

    for (const stop of this.orderedStops) {
      const marker = new google.maps.Marker({
        map: this.safeGoogleMap,
        position: { lat: stop.latitud, lng: stop.longitud },
        title: stop.nombre || stop.direccion,
        icon: this.createStopMarkerIcon(stop.color_hex, stop.orden),
      });

      this.stopMarkers.set(stop.clientId, marker);
    }
  }

  private clearStopMarkers(): void {
    this.stopMarkers.forEach((marker) => marker.setMap(null));
    this.stopMarkers.clear();
  }

  private updateStopMarker(clientId: string): void {
    const marker = this.stopMarkers.get(clientId);
    const stop = this.stops.find((item) => item.clientId === clientId);

    if (!marker || !stop) {
      this.renderStopMarkers();
      return;
    }

    marker.setTitle(stop.nombre || stop.direccion);
    marker.setIcon(this.createStopMarkerIcon(stop.color_hex, stop.orden));
  }

  private reindexStops(): void {
    this.stops = [...this.stops]
      .sort((a, b) => a.pathIndex - b.pathIndex)
      .map((stop, index) => ({
        ...stop,
        orden: index + 1,
      }));
  }

  private findNearestPathIndex(point: google.maps.LatLngLiteral): {
    index: number;
    distanceMeters: number;
  } {
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    this.routePath.forEach((pathPoint, index) => {
      const distance = this.distanceMeters(
        point.lat,
        point.lng,
        pathPoint.lat,
        pathPoint.lng
      );

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    return { index: nearestIndex, distanceMeters: nearestDistance };
  }

  private createStopMarkerIcon(
    color: string,
    order: number
  ): google.maps.Icon {
    const markerColor = color || '#0F766E';
    const label = String(order).slice(-2);
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 36 36'>
      <circle cx='18' cy='18' r='15' fill='${markerColor}' stroke='white' stroke-width='3'/>
      <text x='18' y='22' text-anchor='middle' font-size='13' font-weight='700' fill='white'>${label}</text>
    </svg>`;

    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new google.maps.Size(36, 36),
      anchor: new google.maps.Point(18, 18),
    };
  }

  private getRouteCenter(route: RouteResponse): google.maps.LatLngLiteral {
    const [lat, lng] = route.origen.split(',').map(Number);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      return { lat, lng };
    }
    return this.center;
  }

  private buildMapOptions(useDarkMode: boolean): google.maps.MapOptions {
    const baseOptions: google.maps.MapOptions = {
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: 'greedy',
      mapTypeId: 'roadmap',
      minZoom: 10,
      maxZoom: 20,
      center: this.center,
      zoom: this.zoom,
    };

    if (useDarkMode) {
      if (this.darkMapId) {
        return { ...baseOptions, mapId: this.darkMapId, styles: [] };
      }

      return { ...baseOptions, styles: MAP_DARK_STYLES };
    }

    if (this.lightMapId) {
      return { ...baseOptions, mapId: this.lightMapId, styles: [] };
    }

    return { ...baseOptions, styles: [] };
  }

  private formatCoordinateLabel(lat: number, lng: number): string {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }

  private normalizeHexColor(color: string): string {
    const fallback = this.route?.color_hex || '#0F766E';
    const trimmedColor = (color || '').trim();

    if (!trimmedColor) {
      return fallback;
    }

    return trimmedColor.startsWith('#') ? trimmedColor : `#${trimmedColor}`;
  }

  private distanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const earthRadiusMeters = 6371000;
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusMeters * c;
  }

  private toRadians(value: number): number {
    return (value * Math.PI) / 180;
  }
}
