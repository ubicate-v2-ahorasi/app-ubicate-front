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
import { Subject, Subscription, finalize } from 'rxjs';
import { MapControlsComponent } from '../map-controls/map-controls';
import { BusListComponent } from '../../bus-mapa/bus-list/bus-list';
import { RouteListComponent } from '../route-list/route-list';
import { LocationService } from '../../../service/location/location.service';
import { RouteMapService } from '../../../service/route/route-map.service';
import {
  BusMarkerService,
  BusWithPosition,
} from '../../../service/bus/bus-marker.service';
import { Bus } from '../../../models/buses.model';
import { RouteCreator } from '../route-creator/route-creator';
import { RouteResponse } from '../../../models/route.model';
import { IconsModule } from '../../../icons.module';
import { FirebaseService } from '../../../../../core/service/firebase.service';
import { SessionService } from '../../../../../core/service/session.service';

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
  private locationService = inject(LocationService);
  private routeMapService = inject(RouteMapService);
  private cdr = inject(ChangeDetectorRef);

  googleMapReady = false;
  mapInitialized = false;
  private readonly mapThemeStorageKey = 'dashboard-map-dark-mode';

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
  showBuses = false; // ✅ CAMBIAR A FALSE - No mostrar buses por defecto

  buses: BusWithPosition[] = [];
  routes: RouteResponse[] = [];
  selectedRouteId: number | null = null;
  isDarkMapStyle = false;

  constructor(
    private firebaseService: FirebaseService,
    private sessionService: SessionService
  ) {}

  ngOnInit() {
    this.restoreMapThemePreference();

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
    return this.map?.googleMap ?? null;
  }

  get isMapReady(): boolean {
    return !!this.map?.googleMap && this.googleMapReady;
  }

  darkMapStyles: google.maps.MapTypeStyle[] = [
    { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
    {
      featureType: 'administrative.locality',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#d59563' }],
    },
    {
      featureType: 'poi',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#d59563' }],
    },
    {
      featureType: 'poi.park',
      elementType: 'geometry',
      stylers: [{ color: '#263c3f' }],
    },
    {
      featureType: 'poi.park',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#6b9a76' }],
    },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: '#38414e' }],
    },
    {
      featureType: 'road',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#212a37' }],
    },
    {
      featureType: 'road',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#9ca5b3' }],
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry',
      stylers: [{ color: '#746855' }],
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#1f2835' }],
    },
    {
      featureType: 'road.highway',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#f3d19c' }],
    },
    {
      featureType: 'transit',
      elementType: 'geometry',
      stylers: [{ color: '#2f3948' }],
    },
    {
      featureType: 'transit.station',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#d59563' }],
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#17263c' }],
    },
    {
      featureType: 'water',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#515c6d' }],
    },
    {
      featureType: 'water',
      elementType: 'labels.text.stroke',
      stylers: [{ color: '#17263c' }],
    },
  ];

  mapOptions: google.maps.MapOptions = {
    disableDefaultUI: true,
    zoomControl: true,
    gestureHandling: 'greedy',
    mapTypeId: 'roadmap',
    minZoom: 10,
    maxZoom: 20,
    center: this.center,
    zoom: this.zoom,
    mapId: undefined,
    styles: [],
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
    this.applyMapStyle();
    this.setupBasicListeners();
    this.subscribeToServices();
    this.loadInitialData();

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

  toggleMapStyle() {
    this.isDarkMapStyle = !this.isDarkMapStyle;
    this.persistMapThemePreference();
    this.syncMapOptionsWithMapTheme();
    this.applyMapStyle();
    this.cdr.markForCheck();
  }

  private loadInitialData() {
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

    this.cdr.markForCheck();
  }

  getBusCount(): number {
    return this.buses.filter((b) => b.activo).length;
  }

  getActiveRoutesCount(): number {
    return this.routes.filter((r) => r.estado === 'ACTIVA').length;
  }

  private applyMapStyle() {
    if (!this.safeGoogleMap) {
      return;
    }

    const mapId = this.isDarkMapStyle
      ? 'YOUR_DARK_MAP_ID'
      : 'YOUR_LIGHT_MAP_ID';
    this.safeGoogleMap.setOptions({
      styles: this.isDarkMapStyle ? this.darkMapStyles : [],
      mapId, // <- aquí pasas el Map ID
    });
  }

  private syncMapOptionsWithMapTheme() {
    this.mapOptions = {
      ...this.mapOptions,
      styles: this.isDarkMapStyle ? this.darkMapStyles : [],
    };
  }

  private restoreMapThemePreference() {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    const saved = localStorage.getItem(this.mapThemeStorageKey);
    if (saved === null) {
      return;
    }

    this.isDarkMapStyle = saved === 'true';
    this.syncMapOptionsWithMapTheme();
  }

  private persistMapThemePreference() {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(
      this.mapThemeStorageKey,
      this.isDarkMapStyle ? 'true' : 'false'
    );
  }
}
