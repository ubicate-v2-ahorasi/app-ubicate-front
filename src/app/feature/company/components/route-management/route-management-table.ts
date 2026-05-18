import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouteMapService } from '../../service/route/route-map.service';
import { RouteResponse } from '../../models/route.model';
import { IconsModule } from '../../icons.module';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-route-management-table',
  standalone: true,
  imports: [CommonModule, IconsModule],
  templateUrl: './route-management-table.html',
})
export class RouteManagementTable implements OnInit {
  private routeMapService = inject(RouteMapService);
  private cdr = inject(ChangeDetectorRef);

  routes: RouteResponse[] = [];
  loading = false;
  error: string | null = null;

  ngOnInit() {
    this.loadRoutes();
  }

  loadRoutes() {
    this.loading = true;
    this.routeMapService.loadRoutes()
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe(routes => {
        this.routes = routes;
      });
  }

  onToggleStatus(route: RouteResponse) {
    this.routeMapService.toggleRouteActive(route.id).subscribe();
  }

  onDelete(route: RouteResponse) {
    if (confirm(`¿Estás seguro de eliminar la ruta ${route.nombre}?`)) {
      this.routeMapService.deleteRoute(route.id).subscribe(() => {
        this.loadRoutes();
      });
    }
  }

  getBusCount(route: RouteResponse): number {
    return route.bus_ids?.length || 0;
  }
}
