import { Component, OnInit, inject } from '@angular/core';
import { Stats } from '../../components/dashboard/stats/stats';
import { MapContainerComponent } from '../../components/dashboard/map-container/map-container';
import { CommonModule } from '@angular/common';
import { BusDetailPanelComponent } from '../../components/dashboard/bus-detail-panel/bus-detail-panel';
import { BusStopEventsPanelComponent } from '../../components/dashboard/bus-stop-events-panel/bus-stop-events-panel';
import { BusMarkerService, SelectedBusDetails } from '../../service/bus/bus-marker.service';
import { RouteMapService } from '../../service/route/route-map.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    Stats,
    MapContainerComponent,
    CommonModule,
    BusDetailPanelComponent,
    BusStopEventsPanelComponent,
  ],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  private busMarkerService = inject(BusMarkerService);
  private routeMapService = inject(RouteMapService);

  showMetrics = true;
  selectedBus: SelectedBusDetails | null = null;
  selectedRouteId: number | null = null;

  ngOnInit() {
    // Cargar configuración guardada
    const savedMetrics = localStorage.getItem('dashboardShowMetrics');

    if (savedMetrics !== null) {
      this.showMetrics = savedMetrics === 'true';
    }

    this.busMarkerService.selectedBus$.subscribe((bus) => {
      this.selectedBus = bus;
    });

    this.routeMapService.selectedRouteId$.subscribe((routeId) => {
      this.selectedRouteId = routeId;
    });
  }

  toggleMetrics() {
    this.showMetrics = !this.showMetrics;
    localStorage.setItem('dashboardShowMetrics', String(this.showMetrics));
  }

  closeSelectedBus(): void {
    this.busMarkerService.clearSelectedBus();
  }
}

