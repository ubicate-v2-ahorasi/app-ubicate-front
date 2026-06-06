import {
  Component,
  ViewChild,
  OnDestroy,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnInit,
  ElementRef,
} from '@angular/core';
import { GoogleMapsModule, GoogleMap } from '@angular/google-maps';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, finalize } from 'rxjs';
import { MapControlsComponent } from '../map-controls/map-controls';
import { BusListComponent } from '../../bus-mapa/bus-list/bus-list';
import { RouteListComponent } from '../route-list/route-list';
import { LocationService } from '../../../service/location/location.service';
import { RouteMapService } from '../../../service/route/route-map.service';
import { RouteEditorService } from '../../../service/route/route-editor.service';
import {
  BusMarkerService,
  BusWithPosition,
} from '../../../service/bus/bus-marker.service';
import { Bus } from '../../../models/buses.model';
import { RouteResponse } from '../../../models/route.model';
import { IconsModule } from '../../../icons.module';
import { FirebaseService } from '../../../../../core/service/firebase.service';
import { SessionService } from '../../../../../core/service/session.service';
import { RealtimeBusService } from '../../../../../core/service/realtime-bus.service';
import { environment } from '../../../../../core/config/environment';
import { MapDarkModeComponent } from '../map-dark-mode/map-dark-mode';
import { MAP_DARK_STYLES } from '../map-dark-mode/map-dark-mode.styles';
import { BusDetailPanelComponent } from '../bus-detail-panel/bus-detail-panel';
import { SelectedBusDetails } from '../../../service/bus/bus-marker.service';

@Component({
  selector: 'app-map-container',
  standalone: true,
  imports: [
    GoogleMapsModule,
    CommonModule,
    FormsModule,
    MapControlsComponent,
    BusListComponent,
    RouteListComponent,
    BusDetailPanelComponent,
    IconsModule,
  ],
  templateUrl: './map-container.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapContainerComponent implements OnDestroy, OnInit {
  @ViewChild(GoogleMap) set googleMap(component: GoogleMap | undefined) {
    if (!component) {
      this.googleMapComponent = undefined;
      return;
    }

    this.googleMapComponent = component;
    void this.initializeGoogleMap();
  }

  @ViewChild('mapContainer') mapContainerRef?: ElementRef<HTMLDivElement>;

  empresaId!: number;
  rutaId?: number;

  private destroy$ = new Subject<void>();
  private busesSub?: Subscription;

  private busMarkerService = inject(BusMarkerService);
  private locationService = inject(LocationService);
  private routeMapService = inject(RouteMapService);
  private routeEditorService = inject(RouteEditorService);
  private cdr = inject(ChangeDetectorRef);
  private realtimeBusService = inject(RealtimeBusService);
  private servicesSubscribed = false;
  private initialDataLoaded = false;

  googleMapReady = false;
  mapInitialized = false;

  center: google.maps.LatLngLiteral = { lat: -8.1116, lng: -79.0288 };
  zoom = 15;
  mapWidth = '100%';
  mapHeight = '100%';

  isLocating = false;
  isCreatingRoute = false;
  isFullscreen = false;
  selectedBus: SelectedBusDetails | null = null;

  showBusList = false;
  showRouteList = false;
  isLoadingBuses = false;
  isLoadingRoutes = false;
  showBuses = false; // ✅ CAMBIAR A FALSE - No mostrar buses por defecto

  buses: BusWithPosition[] = [];
  busSearchTerm = '';
  routes: RouteResponse[] = [];
  selectedRouteId: number | null = null;
  constructor(
    private firebaseService: FirebaseService,
    private sessionService: SessionService
  ) {}

  ngOnInit() {
    if (typeof document !== 'undefined') {
      document.addEventListener('fullscreenchange', this.onFullscreenChange);
    }

    const sessionEmpresaId = this.sessionService.getEmpresaId();

    if (sessionEmpresaId) {
      this.empresaId = sessionEmpresaId;
      // ✅ NO subscribir buses automáticamente
    } else {
      this.firebaseService
        .findFirstEmpresaWithBuses()
        .subscribe((empresaId) => {
          if (empresaId) {
            this.empresaId = empresaId;
            // ✅ NO subscribir buses automáticamente
          }
        });
    }
  }

  get safeGoogleMap(): google.maps.Map | null {
    return this.googleMapComponent?.googleMap ?? null;
  }

  get isMapReady(): boolean {
    return !!this.googleMapComponent?.googleMap && this.googleMapReady;
  }

  private readonly themeStorageKey = 'dashboard-map-dark-mode';
  private readonly lightMapId = environment.googleMaps?.mapId;
  private readonly darkMapId = environment.googleMaps?.darkMapId;
  private googleMapComponent?: GoogleMap;

  mapOptions: google.maps.MapOptions = this.buildMapOptions(false);

  private async initializeGoogleMap(): Promise<void> {
    let attempts = 0;
    while (!this.googleMapComponent?.googleMap && attempts < 30) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }

    if (!this.googleMapComponent?.googleMap) {
      return;
    }

    this.googleMapReady = true;
    this.mapInitialized = true;
    this.setupBasicListeners();
    this.subscribeToServices();
    this.loadInitialData();
    this.restoreRenderedState();
    this.renderMapBuses();

    this.cdr.detectChanges();
  }

  ngOnDestroy() {
    if (typeof document !== 'undefined') {
      document.removeEventListener('fullscreenchange', this.onFullscreenChange);
    }
    this.destroy$.next();
    this.destroy$.complete();
    this.busesSub?.unsubscribe();
    this.busMarkerService.clearMarkers();
    this.locationService.clearLocationMarker();
    this.routeMapService.clearAllRoutesFromMap();
    this.routeEditorService.stopEditing();
  }

  private subscribeBusesStream(empresaId: number, rutaId?: number) {
    this.busesSub?.unsubscribe();
    this.busesSub = this.realtimeBusService
      .streamBuses(empresaId, rutaId)
      .subscribe((buses) => {
        this.buses = buses;
        console.log('[MapContainer] Buses recibidos:', buses.length, 'isMapReady:', this.isMapReady, 'showBuses:', this.showBuses);

        if (!this.isMapReady) {
          console.log('[MapContainer] Mapa no listo');
          this.cdr.markForCheck();
          return;
        }

        this.renderMapBuses();

        this.cdr.markForCheck();
      });
  }

  private getRenderableBuses(): BusWithPosition[] {
    return this.showBuses ? this.buses : [];
  }

  private renderMapBuses(): void {
    if (!this.isMapReady || !this.safeGoogleMap) {
      return;
    }

    const busesToRender = this.getRenderableBuses();
    console.log('[MapContainer] Renderizando buses en mapa:', busesToRender.length);
    void this.busMarkerService.upsertBusMarkers(busesToRender, this.safeGoogleMap);
  }

  get routeBuses(): BusWithPosition[] {
    if (!this.selectedRouteId || !this.showBuses) {
      return [];
    }

    return this.buses;
  }

  get filteredRouteBuses(): BusWithPosition[] {
    const term = this.normalizeSearch(this.busSearchTerm);
    const buses = this.routeBuses;

    if (!term) {
      return buses.slice(0, 6);
    }

    return buses
      .filter((bus) => {
        const searchable = [
          bus.placa,
          bus.conductor,
          bus.modelo,
          bus.estado,
        ]
          .filter(Boolean)
          .join(' ');

        return this.normalizeSearch(searchable).includes(term);
      })
      .slice(0, 6);
  }

  get hasBusSearchResults(): boolean {
    return this.filteredRouteBuses.length > 0;
  }

  onBusSearchChange(term: string): void {
    this.busSearchTerm = term;
  }

  clearBusSearch(): void {
    this.busSearchTerm = '';
  }

  selectBusFromSearch(bus: BusWithPosition): void {
    this.busSearchTerm = bus.placa;
    this.busMarkerService.focusBus(bus.id);
    void this.busMarkerService.selectBus(bus);
    this.cdr.markForCheck();
  }

  private normalizeSearch(value: string | undefined): string {
    return (value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private setupBasicListeners() {
    if (!this.safeGoogleMap) return;
    this.safeGoogleMap.addListener('click', () => {
      this.busMarkerService.clearSelectedBus();
      if (!this.isCreatingRoute && (this.showBusList || this.showRouteList)) {
        this.showBusList = false;
        this.showRouteList = false;
        this.cdr.markForCheck();
      }
    });
  }

  private subscribeToServices() {
    if (this.servicesSubscribed) {
      return;
    }

    this.servicesSubscribed = true;
    this.locationService.isLocating$.subscribe((v) => {
      this.isLocating = v;
      this.cdr.markForCheck();
    });

    this.routeMapService.routes$.subscribe((routes) => {
      this.routes = routes;
      this.cdr.markForCheck();
    });

    this.routeMapService.loading$.subscribe((loading) => {
      this.isLoadingRoutes = loading;
      this.cdr.markForCheck();
    });

    this.busMarkerService.selectedBus$.subscribe((bus) => {
      this.selectedBus = bus;
      this.cdr.markForCheck();
    });

  }

  private loadInitialData() {
    if (this.initialDataLoaded) {
      return;
    }

    this.initialDataLoaded = true;
    this.routeMapService.loadRoutes().subscribe();
  }

  private fitBoundsToBuses(buses: BusWithPosition[]) {
    if (!this.safeGoogleMap || buses.length === 0) return;

    if (buses.length === 1) {
      this.safeGoogleMap.setCenter(buses[0].position);
      this.safeGoogleMap.setZoom(
        Math.max(15, this.safeGoogleMap.getZoom() || 15)
      );
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    buses.forEach((b) => bounds.extend(b.position));
    this.safeGoogleMap.fitBounds(bounds);
  }

  getCurrentLocation() {
    if (this.isLocating) return;
    this.locationService.getCurrentLocation().then((location) => {
      if (this.safeGoogleMap) {
        this.locationService.createLocationMarker(this.safeGoogleMap, location);
      }
    });
  }

  toggleBusList() {
    this.showBusList = !this.showBusList;
    if (this.showBusList) this.showRouteList = false;
    this.cdr.markForCheck();
  }

  toggleRouteList() {
    this.showRouteList = !this.showRouteList;
    if (this.showRouteList) {
      this.showBusList = false;
      this.isCreatingRoute = false;
    }
    this.cdr.markForCheck();
  }

  onSelectBus(bus: Bus) {
    this.showBusList = false;
    const selectedBus = this.buses.find((item) => String(item.id) === String(bus.id));
    if (selectedBus) {
      this.busMarkerService.focusBus(selectedBus.id);
      void this.busMarkerService.selectBus(selectedBus);
    }
    this.cdr.markForCheck();
  }

  onSelectRouteId(routeId: number) {
    if (!this.safeGoogleMap) {
      this.showRouteList = false;
      this.cdr.markForCheck();
      return;
    }

    this.isLoadingRoutes = true;
    this.selectedRouteId = routeId;
    this.rutaId = routeId;
    this.showBuses = true; // ✅ ACTIVAR buses solo cuando selecciones una ruta

    // Mostrar la ruta en el mapa
    this.routeMapService
      .getById(routeId)
      .pipe(
        finalize(() => {
          this.isLoadingRoutes = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe((route) => {
        if (route) {
          this.routeMapService.showRouteOnMap(route, this.safeGoogleMap!);
        }
        this.showRouteList = false;
      });

    // ✅ MOSTRAR BUSES DE ESA RUTA ESPECÍFICA
    this.subscribeBusesStream(this.empresaId, routeId);
    this.cdr.markForCheck();
  }

  showAllBuses() {
    this.selectedRouteId = null;
    this.rutaId = undefined;
    this.showBuses = true; // ✅ Mostrar todos los buses
    this.subscribeBusesStream(this.empresaId, undefined);
    this.renderMapBuses();
    this.cdr.markForCheck();
  }

  onCloseBusList() {
    this.showBusList = false;
    this.cdr.markForCheck();
  }

  onCloseRouteList() {
    this.showRouteList = false;
    this.cdr.markForCheck();
  }

  startCreatingRoute() {
    this.showBusList = false;
    this.showRouteList = false;
    this.isCreatingRoute = true;
    this.cdr.markForCheck();
  }

  closeSelectedBus(): void {
    this.busMarkerService.clearSelectedBus();
  }

  onRouteCreated() {
    this.isCreatingRoute = false;
    this.routeMapService.loadRoutes().subscribe();
    this.cdr.markForCheck();
  }

  onCancelRouteCreation() {
    this.isCreatingRoute = false;
    this.cdr.markForCheck();
  }

  onRouteSaved() {
    this.routeMapService.loadRoutes().subscribe();
    this.routeEditorService.stopEditing();
    this.cdr.markForCheck();
  }

  centerOnTrujillo() {
    if (this.safeGoogleMap) {
      this.safeGoogleMap.setCenter(this.center);
      this.safeGoogleMap.setZoom(this.zoom);
    }
  }

  refreshData() {
    this.routeMapService.loadRoutes().subscribe();
    if (this.selectedRouteId) {
      this.subscribeBusesStream(this.empresaId, this.selectedRouteId);
    }
  }

  clearRouteAndBuses() {
    this.selectedRouteId = null;
    this.rutaId = undefined;
    this.showBuses = false; // ✅ OCULTAR buses al limpiar
    this.busesSub?.unsubscribe();
    this.busesSub = undefined;
    this.busMarkerService.clearMarkers();
    this.routeMapService.clearAllRoutesFromMap();
    this.buses = [];

    if (this.safeGoogleMap) {
      this.safeGoogleMap.setCenter(this.center);
      this.safeGoogleMap.setZoom(this.zoom);
    }

    this.renderMapBuses();
    this.cdr.markForCheck();
  }

  async toggleFullscreen(): Promise<void> {
    const container = this.mapContainerRef?.nativeElement;
    if (!container || typeof document === 'undefined') {
      return;
    }

    try {
      if (document.fullscreenElement === container) {
        await document.exitFullscreen();
      } else {
        await container.requestFullscreen();
      }
    } catch (error) {
      console.error('[MapContainer] No se pudo cambiar a pantalla completa', error);
    }
  }

  getBusCount(): number {
    return this.buses.filter((b) => b.activo).length;
  }

  getActiveRoutesCount(): number {
    return this.routes.filter((r) => r.estado === 'ACTIVA').length;
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

    const themeOptions: google.maps.MapOptions = useDarkMode
      ? this.getDarkThemeOptions()
      : this.getLightThemeOptions();

    return { ...baseOptions, ...themeOptions };
  }

  private getLightThemeOptions(): google.maps.MapOptions {
    if (this.lightMapId) {
      return { mapId: this.lightMapId, styles: [] };
    }
    return {
      styles: []
    };
  }

  private getDarkThemeOptions(): google.maps.MapOptions {
    if (this.darkMapId) {
      return { mapId: this.darkMapId, styles: [] };
    }

    return { styles: MAP_DARK_STYLES };
  }

  private loadStoredThemePreference(): boolean {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return false;
    }

    return localStorage.getItem(this.themeStorageKey) === 'true';
  }

  private persistThemePreference(value: boolean): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(this.themeStorageKey, value ? 'true' : 'false');
  }

  private recreateMap(): void {
    this.teardownActiveMapArtifacts();
    this.googleMapReady = false;
    this.mapInitialized = false;
    this.mapOptions = this.buildMapOptions(false);
    this.cdr.markForCheck();
  }

  private teardownActiveMapArtifacts(): void {
    this.busMarkerService.clearMarkers();
    this.locationService.clearLocationMarker();
    this.routeMapService.clearAllRoutesFromMap();
  }

  private restoreRenderedState(): void {
    if (!this.safeGoogleMap) {
      return;
    }

    this.renderMapBuses();

    if (this.showBuses && this.buses.length > 0) {
      this.fitBoundsToBuses(this.buses);
    }

    if (this.selectedRouteId && this.safeGoogleMap) {
      const cachedRoute = this.routes.find(
        (route) => route.id === this.selectedRouteId
      );

      if (cachedRoute) {
        this.routeMapService.showRouteOnMap(cachedRoute, this.safeGoogleMap);
      } else {
        this.routeMapService
          .getById(this.selectedRouteId)
          .subscribe((route) => {
            if (this.safeGoogleMap) {
              this.routeMapService.showRouteOnMap(route, this.safeGoogleMap);
            }
          });
      }
    }
  }

  private readonly onFullscreenChange = (): void => {
    const container = this.mapContainerRef?.nativeElement;
    this.isFullscreen =
      !!container &&
      typeof document !== 'undefined' &&
      document.fullscreenElement === container;
    this.cdr.markForCheck();
  };

}
