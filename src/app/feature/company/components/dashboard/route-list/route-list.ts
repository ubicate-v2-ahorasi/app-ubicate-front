// src/app/feature/company/components/dashboard/route-list/route-list.ts
import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, finalize } from 'rxjs';
import { RouteMapService } from '../../../service/route/route-map.service';
import { RouteResponse } from '../../../models/route.model';
import { IconsModule } from '../../../icons.module';
import { DeleteRouteModalComponent } from './delete-route-modal';
import { SuccessModalComponent } from './success-modal';

@Component({
  selector: 'app-route-list',
  standalone: true,
  imports: [CommonModule, IconsModule, DeleteRouteModalComponent, SuccessModalComponent],
  templateUrl: './route-list.html',
})
export class RouteListComponent implements OnInit, OnDestroy {
  @Input() isVisible = false;
  @Output() selectRouteId = new EventEmitter<number>();
  @Output() close = new EventEmitter<void>();

  private destroy$ = new Subject<void>();
  private routeMapService = inject(RouteMapService);
  private cdr = inject(ChangeDetectorRef);

  routes: RouteResponse[] = [];
  loading = false;
  error: string | null = null;
  
  showDeleteModal = false;
  showSuccessModal = false;
  routeToDelete: RouteResponse | null = null;
  isDeleting = false;
  deletedRouteName = '';

  ngOnInit() {
    this.routeMapService.routes$
      .pipe(takeUntil(this.destroy$))
      .subscribe((routes) => {
        this.routes = routes;
        this.cdr.detectChanges();
      });
    this.routeMapService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe((loading) => {
        this.loading = loading;
        this.cdr.detectChanges();
      });
    this.routeMapService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe((error) => {
        this.error = error;
        this.cdr.detectChanges();
      });
    this.loadRoutes();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadRoutes() {
    this.routeMapService
      .loadRoutes('ACTIVA')
      .subscribe(() => this.cdr.detectChanges());
  }

  onSelectRoute(route: RouteResponse) {
    this.selectRouteId.emit(route.id);
  }

  onToggleRoute(event: Event, route: RouteResponse) {
    event.stopPropagation();
    this.routeMapService.toggleRouteActive(route.id).subscribe();
  }

  onDeleteRoute(event: Event, route: RouteResponse) {
    event.stopPropagation();
    this.routeToDelete = route;
    this.showDeleteModal = true;
    this.cdr.detectChanges();
  }

  onConfirmDelete() {
    if (!this.routeToDelete) return;

    this.isDeleting = true;
    this.cdr.detectChanges();

    this.routeMapService.deleteRoute(this.routeToDelete.id)
      .pipe(
        finalize(() => {
          this.isDeleting = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.deletedRouteName = this.routeToDelete?.nombre || '';
          this.showDeleteModal = false;
          this.showSuccessModal = true;
          
          // Actualizar la lista eliminando la ruta del BehaviorSubject
          const updatedRoutes = this.routes.filter(r => r.id !== this.routeToDelete?.id);
          this.routeMapService.updateRoutesList(updatedRoutes);
          
          this.routeToDelete = null;
          this.cdr.detectChanges();
        },
        error: () => {
          this.showDeleteModal = false;
          this.routeToDelete = null;
          this.cdr.detectChanges();
        }
      });
  }

  onCancelDelete() {
    this.showDeleteModal = false;
    this.routeToDelete = null;
    this.cdr.detectChanges();
  }

  onCloseSuccess() {
    this.showSuccessModal = false;
    this.deletedRouteName = '';
    this.cdr.detectChanges();
  }

  onClose() {
    this.close.emit();
  }

  trackByRoute(_: number, route: RouteResponse): number {
    return route.id;
  }

  getOriginDestination(route: RouteResponse): string {
    if (route.descripcion?.trim()) return route.descripcion;
    try {
      const [olat, olng] = route.origen.split(',').map(parseFloat);
      const [dlat, dlng] = route.destino.split(',').map(parseFloat);
      if ([olat, olng, dlat, dlng].some((v) => Number.isNaN(v)))
        return 'Coordenadas inválidas';
      return `${olat.toFixed(3)}, ${olng.toFixed(3)} → ${dlat.toFixed(
        3
      )}, ${dlng.toFixed(3)}`;
    } catch {
      return 'Sin descripción';
    }
  }

  getRouteInfo(route: RouteResponse): string {
    const a: string[] = [];
    if (route.bus_ids?.length)
      a.push(
        `${route.bus_ids.length} bus${route.bus_ids.length !== 1 ? 'es' : ''}`
      );
    if (route.estado) a.push(`Estado: ${route.estado}`);
    return a.length ? a.join(' • ') : 'Sin información';
  }

  formatDate(dateString: string): string {
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return 'Fecha inválida';
    }
  }
}
