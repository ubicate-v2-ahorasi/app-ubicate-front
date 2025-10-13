import {
  Component,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnInit,
} from '@angular/core';
import { GoogleMapsModule, GoogleMap } from '@angular/google-maps';
import { CommonModule } from '@angular/common';
import { Subject, Subscription, finalize, of, catchError } from 'rxjs';
import { MapControlsComponent } from '../map-controls/map-controls';
import { BusListComponent } from '../../bus-mapa/bus-list/bus-list';
import { RouteListComponent } from '../route-list/route-list';
import { LocationService } from '../../../service/location/location.service';
import { RouteMapService } from '../../../service/route/route-map.service';
import {
  BusMarkerService,
  BusWithPosition,
} from '../../../service/bus/bus-marker.service';
import { BusService } from '../../../service/bus/bus.service';
import { Bus } from '../../../models/buses.model';
import { RouteCreator } from '../route-creator/route-creator';
import { RouteResponse } from '../../../models/route.model';
import { IconsModule } from '../../../icons.module';
import { FirebaseService } from '../../../../../core/service/firebase.service';
import { SessionService } from '../../../../../core/service/session.service';
import { BusLayerComponent } from '../bus-layer/bus-layer';

@Component({
  selector: 'app-map-container',
  standalone: true,
  imports: [
    GoogleMapsModule,
    CommonModule,
    RouteCreator,
    MapControlsComponent,
    BusListComponent,
    RouteListComponent,
    IconsModule,
  ],
  templateUrl: './map-container.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapContainerComponent implements AfterViewInit, OnDestroy, OnInit {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;
  @ViewChild(GoogleMap, { static: false }) map!: GoogleMap;

  empresaId!: number;
  rutaId?: number;

  private destroy$ = new Subject<void>();
  private busesSub?: Subscription;

  private busMarkerService = inject(BusMarkerService);
  private busService = inject(BusService);
  private locationService = inject(LocationService);
  private routeMapService = inject(RouteMapService);
  private cdr = inject(ChangeDetectorRef);

  private selectedBusMarker: google.maps.Marker | null = null;

  googleMapReady = false;
  mapInitialized = false;

  center: google.maps.LatLngLiteral = { lat: -8.1116, lng: -79.0288 };
  zoom = 15;
  mapWidth = '100%';
  mapHeight = '100%';

  isLocating = false;
  isCreatingRoute = false;
  showBusList = false;
  showRouteList = false;
  isLoadingBuses = false;
  isLoadingRoutes = false;

  showBuses = true;

  buses: BusWithPosition[] = [];
  routes: RouteResponse[] = [];
  currentLocation: google.maps.LatLngLiteral | null = null;
  selectedRouteId: number | null = null;

  constructor(
    private firebaseService: FirebaseService,
    private sessionService: SessionService
  ) {}

  ngOnInit() {
    const empresaId = this.sessionService.getEmpresaId();
    if (!empresaId) return;
    this.empresaId = empresaId;
    this.subscribeBusesStream(this.empresaId, this.rutaId);
  }

  get safeGoogleMap(): google.maps.Map | null {
    return this.map?.googleMap ?? null;
  }

  get isMapReady(): boolean {
    return !!this.map?.googleMap && this.googleMapReady;
  }

  mapOptions: google.maps.MapOptions = {
    mapId: 'DEMO_MAP_ID',
    disableDefaultUI: true,
    zoomControl: true,
    gestureHandling: 'greedy',
    mapTypeId: 'roadmap',
    minZoom: 10,
    maxZoom: 20,
    center: this.center,
    zoom: this.zoom,
  };

  async ngAfterViewInit() {
    let attempts = 0;
    while (!this.map?.googleMap && attempts < 30) {
      await new Promise((r) => setTimeout(r, 100));
      attempts++;
    }
    if (!this.map?.googleMap) return;

    this.googleMapReady = true;
    this.mapInitialized = true;
    this.setupBasicListeners();
    this.subscribeToServices();
    this.loadInitialData();

    if (this.buses.length > 0 && this.showBuses) {
      this.busMarkerService.upsertBusMarkers(this.buses, this.safeGoogleMap!);
      this.fitBoundsToBuses(this.buses);
    }

    this.cdr.detectChanges();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.busesSub?.unsubscribe();
    this.busMarkerService.clearMarkers();
    this.locationService.clearLocationMarker();
    this.routeMapService.clearAllRoutesFromMap();
  }

  private subscribeBusesStream(empresaId: number, rutaId?: number) {
    this.busesSub?.unsubscribe();
    this.busesSub = this.firebaseService
      .streamBusesByEmpresaAndRoute(empresaId, rutaId)
      .subscribe((buses) => {
        this.buses = buses;

        if (!this.isMapReady) {
          this.cdr.markForCheck();
          return;
        }

        if (this.showBuses && this.buses.length > 0) {
          this.busMarkerService.upsertBusMarkers(
            this.buses,
            this.safeGoogleMap!
          );
          this.fitBoundsToBuses(this.buses);
        } else {
          this.busMarkerService.clearMarkers();
        }

        this.cdr.markForCheck();
      });
  }

  private setupBasicListeners() {
    if (!this.safeGoogleMap) return;
    this.safeGoogleMap.addListener('click', () => {
      if (!this.isCreatingRoute && (this.showBusList || this.showRouteList)) {
        this.showBusList = false;
        this.showRouteList = false;
        this.cdr.markForCheck();
      }
    });
  }

  private subscribeToServices() {
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
  }

  private loadInitialData() {
    this.routeMapService.loadRoutes().subscribe();
  }

  private loadBusesByRoute(rutaId: number) {
    this.busService
      .getBuses(0, 100, rutaId)
      .pipe(
        catchError(() => of({ content: [] })),
        finalize(() => {
          this.isLoadingBuses = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe((response) => {
        const buses = response.content || [];
        const busesWithPosition = buses
          .filter((b: any) => {
            const hasCoords =
              b.latitud !== null &&
              b.longitud !== null &&
              !isNaN(b.latitud) &&
              !isNaN(b.longitud);
            const isActive = b.activo === true && b.estado !== 'INACTIVO';
            return hasCoords && isActive;
          })
          .map((b: any) => ({
            ...b,
            position: { lat: b.latitud, lng: b.longitud },
          }));

        this.buses = busesWithPosition;

        if (this.isMapReady && this.showBuses && busesWithPosition.length > 0) {
          this.busMarkerService.upsertBusMarkers(
            busesWithPosition,
            this.safeGoogleMap!
          );
          this.fitBoundsToBuses(busesWithPosition);
        } else {
          this.busMarkerService.clearMarkers();
        }
      });
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
    if (this.showRouteList) this.showBusList = false;
    this.cdr.markForCheck();
  }

  onSelectBus(_: Bus) {
    this.showBusList = false;
    this.cdr.markForCheck();
  }

  onSelectRouteId(routeId: number) {
    if (!this.safeGoogleMap) {
      this.showRouteList = false;
      this.cdr.markForCheck();
      return;
    }

    this.isLoadingRoutes = true;
    this.isLoadingBuses = true;
    this.selectedRouteId = routeId;
    this.rutaId = routeId; // guarda filtro actual
    this.showBuses = true; // 4) enciende la capa

    this.routeMapService
      .getById(routeId)
      .pipe(
        finalize(() => {
          this.isLoadingRoutes = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe((route) => {
        if (route)
          this.routeMapService.showRouteOnMap(route, this.safeGoogleMap!);
        this.showRouteList = false;
      });

    this.subscribeBusesStream(this.empresaId, routeId); // 5) re-suscribe con filtro
    this.cdr.markForCheck();
  }
  showAllBuses() {
    this.selectedRouteId = null;
    this.rutaId = undefined;
    this.showBuses = true;
    this.subscribeBusesStream(this.empresaId, undefined);
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

  onRouteCreated() {
    this.isCreatingRoute = false;
    this.routeMapService.loadRoutes().subscribe();
    this.cdr.markForCheck();
  }

  onCancelRouteCreation() {
    this.isCreatingRoute = false;
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
      this.loadBusesByRoute(this.selectedRouteId);
    }
  }

  clearRouteAndBuses() {
    this.selectedRouteId = null;
    this.rutaId = undefined; // opcional: resetea filtro de ruta
    this.showBuses = false; // 1) apaga la capa
    this.busesSub?.unsubscribe(); // 2) corta el stream
    this.busesSub = undefined;
    this.busMarkerService.clearMarkers(); // 3) limpia marcadores
    this.routeMapService.clearAllRoutesFromMap(); // limpia rutas dibujadas
    this.buses = []; // limpia estado local

    // opcional: re-centra el mapa a tu posición por defecto
    if (this.safeGoogleMap) {
      this.safeGoogleMap.setCenter(this.center);
      this.safeGoogleMap.setZoom(this.zoom);
    }

    this.cdr.markForCheck();
  }

  getBusCount(): number {
    return this.buses.filter((b) => b.activo).length;
  }

  getActiveRoutesCount(): number {
    return this.routes.filter((r) => r.estado === 'ACTIVA').length;
  }
}
