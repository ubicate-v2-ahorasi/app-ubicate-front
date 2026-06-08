import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { RouteMapService } from '../../service/route/route-map.service';
import { RouteResponse } from '../../models/route.model';
import { IconsModule } from '../../icons.module';
import {
  RouteManagementMapComponent,
  RouteManagementMode,
} from './route-management-map';
import {
  AnimatedSelectComponent,
  AnimatedSelectOption,
} from '../shared/animated-select/animated-select';

type RouteStatusFilter = 'TODAS' | 'ACTIVA' | 'INACTIVA';

@Component({
  selector: 'app-route-management-table',
  standalone: true,
  imports: [CommonModule, FormsModule, IconsModule, RouteManagementMapComponent, AnimatedSelectComponent],
  templateUrl: './route-management-table.html',
})
export class RouteManagementTable implements OnInit {
  private routeMapService = inject(RouteMapService);
  private cdr = inject(ChangeDetectorRef);

  routes: RouteResponse[] = [];
  loading = false;
  error: string | null = null;
  searchTerm = '';
  selectedEstado: RouteStatusFilter = 'TODAS';
  currentPage = 1;
  pageSize = 10;
  activeView: 'table' | RouteManagementMode = 'table';
  selectedRoute: RouteResponse | null = null;
  readonly estadoOptions: AnimatedSelectOption<RouteStatusFilter>[] = [
    { label: 'Todas las rutas', value: 'TODAS' },
    { label: 'Activas', value: 'ACTIVA' },
    { label: 'Inactivas', value: 'INACTIVA' },
  ];
  readonly pageSizeOptions: AnimatedSelectOption<number>[] = [
    { label: '10', value: 10 },
    { label: '25', value: 25 },
    { label: '50', value: 50 },
    { label: '100', value: 100 },
  ];

  ngOnInit() {
    this.loadRoutes();
  }

  loadRoutes() {
    this.loading = true;
    this.error = null;
    this.routeMapService
      .loadRoutes()
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (routes) => {
          this.routes = [...routes].sort(
            (a, b) =>
              new Date(b.fecha_creacion).getTime() -
              new Date(a.fecha_creacion).getTime()
          );
          this.syncCurrentPage();
        },
        error: () => {
          this.error = 'No se pudieron cargar las rutas.';
        },
      });
  }

  get filteredRoutes(): RouteResponse[] {
    const term = this.normalize(this.searchTerm);

    return this.routes.filter((route) => {
      const matchesSearch =
        !term ||
        this.normalize(
          [
            route.nombre,
            route.codigo,
            route.descripcion,
            route.origen,
            route.destino,
          ]
            .filter(Boolean)
            .join(' ')
        ).includes(term);

      const matchesStatus =
        this.selectedEstado === 'TODAS' || route.estado === this.selectedEstado;

      return matchesSearch && matchesStatus;
    });
  }

  get paginatedRoutes(): RouteResponse[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredRoutes.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRoutes.length / this.pageSize));
  }

  hasActiveFilters(): boolean {
    return !!(
      this.searchTerm.trim() || this.selectedEstado !== 'TODAS'
    );
  }

  onSearchChange(value: string) {
    this.searchTerm = value;
    this.currentPage = 1;
  }

  onEstadoChange(value: RouteStatusFilter) {
    this.selectedEstado = value;
    this.currentPage = 1;
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedEstado = 'TODAS';
    this.currentPage = 1;
  }

  onToggleStatus(route: RouteResponse) {
    this.routeMapService.toggleRouteActive(route.id).subscribe(() => {
      this.loadRoutes();
    });
  }

  onDelete(route: RouteResponse) {
    if (confirm(`Estas seguro de eliminar la ruta ${route.nombre}?`)) {
      this.routeMapService.deleteRoute(route.id).subscribe(() => {
        this.loadRoutes();
      });
    }
  }

  onCreateRoute() {
    this.selectedRoute = null;
    this.activeView = 'create';
  }

  onEditRoute(route: RouteResponse) {
    this.selectedRoute = route;
    this.activeView = 'edit';
  }

  onManageStops(route: RouteResponse) {
    this.selectedRoute = route;
    this.activeView = 'stops';
  }

  onMapClosed() {
    this.activeView = 'table';
    this.selectedRoute = null;
    this.cdr.markForCheck();
  }

  onMapSaved() {
    this.activeView = 'table';
    this.selectedRoute = null;
    this.loadRoutes();
  }

  onPageChange(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  onPageSizeChange(value: number) {
    this.pageSize = Number(value);
    this.currentPage = 1;
  }

  getBusCount(route: RouteResponse): number {
    return route.total_buses ?? route.buses?.length ?? route.bus_ids?.length ?? 0;
  }

  getEstadoBadge(estado: string): string {
    return estado === 'ACTIVA'
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800';
  }

  getRouteSummary(route: RouteResponse): string {
    if (route.descripcion?.trim()) {
      return route.descripcion;
    }

    return `${this.formatCoordinate(route.origen)} -> ${this.formatCoordinate(route.destino)}`;
  }

  formatDate(value: string): string {
    try {
      return new Date(value).toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return 'Fecha invalida';
    }
  }

  private syncCurrentPage() {
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
  }

  private formatCoordinate(value: string): string {
    const parts = value.split(',').map((part) => Number(part.trim()));
    if (parts.length !== 2 || parts.some((part) => Number.isNaN(part))) {
      return value || 'Sin ubicacion';
    }

    return `${parts[0].toFixed(3)}, ${parts[1].toFixed(3)}`;
  }

  private normalize(value: string | null | undefined): string {
    return (value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}
