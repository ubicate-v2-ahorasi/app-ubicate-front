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

  isVerticalLayout = false;
  sidebarWidth = 400; // Ancho inicial en píxeles
  isResizing = false;
  selectedBus: SelectedBusDetails | null = null;
  selectedRouteId: number | null = null;

  ngOnInit() {
    // Cargar configuración guardada
    const savedLayout = localStorage.getItem('dashboardLayout');
    const savedWidth = localStorage.getItem('dashboardSidebarWidth');
    
    if (savedLayout) {
      this.isVerticalLayout = savedLayout === 'vertical';
    }
    
    if (savedWidth) {
      this.sidebarWidth = parseInt(savedWidth, 10);
    }

    this.busMarkerService.selectedBus$.subscribe((bus) => {
      this.selectedBus = bus;
    });

    this.routeMapService.selectedRouteId$.subscribe((routeId) => {
      this.selectedRouteId = routeId;
    });
  }

  toggleLayout() {
    this.isVerticalLayout = !this.isVerticalLayout;
    localStorage.setItem('dashboardLayout', this.isVerticalLayout ? 'vertical' : 'horizontal');
  }

  onMouseDown(event: MouseEvent) {
    if (!this.isVerticalLayout) return;
    
    this.isResizing = true;
    event.preventDefault();
    
    const startX = event.clientX;
    const startWidth = this.sidebarWidth;

    const onMouseMove = (e: MouseEvent) => {
      if (!this.isResizing) return;
      
      const deltaX = startX - e.clientX;
      const newWidth = Math.max(280, Math.min(600, startWidth + deltaX));
      this.sidebarWidth = newWidth;
    };

    const onMouseUp = () => {
      this.isResizing = false;
      localStorage.setItem('dashboardSidebarWidth', this.sidebarWidth.toString());
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  closeSelectedBus(): void {
    this.busMarkerService.clearSelectedBus();
  }
}
