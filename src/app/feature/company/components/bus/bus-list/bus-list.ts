// bus-list.component.ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BusService } from '../../../service/bus/bus.service';
import { RouteService } from '../../../service/route/route.service';
import { Bus } from '../../../models/buses.model';
import { RouteResponse } from '../../../models/route.model';
import { BusDeleteModal } from '../bus-delete-modal/bus-delete-modal';
import { BusFilter, BusFilterCriteria } from '../bus-filter/bus-filter';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-bus-list',
  standalone: true,
  imports: [CommonModule, FormsModule, BusDeleteModal],
  templateUrl: './bus-list.html',
})
export class BusList implements OnInit {
  private busService = inject(BusService);
  private routeService = inject(RouteService);

  // Signals para el estado
  allBuses = signal<Bus[]>([]);
  rutas = signal<RouteResponse[]>([]);
  loading = signal(false);
  rutasLoading = signal(false);
  filterCriteria = signal<BusFilterCriteria>({ search: '' });

  // Buses filtrados (computed signal)
  buses = computed(() => {
    const buses = this.allBuses();
    const criteria = this.filterCriteria();

    return buses.filter((bus) => {
      // Filtro por búsqueda
      if (criteria.search) {
        const searchTerm = criteria.search.toLowerCase();
        const matchesSearch =
          bus.placa.toLowerCase().includes(searchTerm) ||
          bus.modelo.toLowerCase().includes(searchTerm) ||
          (bus.marca && bus.marca.toLowerCase().includes(searchTerm)) ||
          bus.id.toString().includes(searchTerm);

        if (!matchesSearch) return false;
      }

      // Filtro por estado
      if (criteria.estado && bus.estado !== criteria.estado) {
        return false;
      }

      return true;
    });
  });

  // Stats computados
  totalBuses = computed(() => this.allBuses().length);
  filteredCount = computed(() => this.buses().length);
  activeBuses = computed(
    () => this.allBuses().filter((b) => b.estado === 'ACTIVO').length
  );

  // Estado de paginación
  currentPage = signal(0);
  pageSize = signal(10);

  // Buses paginados
  paginatedBuses = computed(() => {
    const buses = this.buses();
    const page = this.currentPage();
    const size = this.pageSize();
    const start = page * size;
    return buses.slice(start, start + size);
  });

  totalPages = computed(() => Math.ceil(this.buses().length / this.pageSize()));

  // Estado del modal
  showDeleteModal = signal(false);
  selectedBus = signal<Bus | null>(null);
  updatingId = signal<number | null>(null);
  updatingRutaId = signal<number | null>(null);

  readonly ESTADOS = [
    'ACTIVO',
    'INACTIVO',
    'EN_RUTA',
    'MANTENIMIENTO',
  ] as const;

  readonly estadoBadgeMap: Record<string, string> = {
    ACTIVO: 'bg-green-100 text-green-800',
    INACTIVO: 'bg-red-100 text-red-800',
    EN_RUTA: 'bg-blue-100 text-blue-800',
    MANTENIMIENTO: 'bg-yellow-100 text-yellow-800',
  };

  Math = Math;

  ngOnInit() {
    this.loadRutas();
    this.loadBuses();
  }

  // Manejo de filtros
  onFilterChange(criteria: BusFilterCriteria) {
    this.filterCriteria.set(criteria);
    this.currentPage.set(0); // Reset a primera página
  }

  trackByBusId(index: number, bus: Bus): number {
    return bus.id;
  }

  getSelectValue(event: Event): number | null {
    const target = event.target as HTMLSelectElement;
    const value = target.value;
    return value && value !== '' ? +value : null;
  }

  loadBuses() {
    this.loading.set(true);

    // Cargar todos los buses sin paginación para filtrado local
    this.busService.getBuses(0, 1000).subscribe({
      next: (res) => {
        this.allBuses.set(res.content);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
      },
    });
  }

  loadRutas() {
    this.rutasLoading.set(true);

    this.routeService.getRoutes().subscribe({
      next: (rutas) => {
        const rutasActivas = rutas.filter((ruta) => ruta.estado === 'ACTIVA');
        this.rutas.set(rutasActivas);
        this.rutasLoading.set(false);
      },
      error: (error) => {
        this.rutas.set([]);
        this.rutasLoading.set(false);
      },
    });
  }

  onPageChange(page: number) {
    if (page >= 0 && page < this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  onPageSizeChange(size: number) {
    this.pageSize.set(size);
    this.currentPage.set(0);
  }

  getPages(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i);
  }

  openDeleteModal(bus: Bus) {
    this.selectedBus.set(bus);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal() {
    this.showDeleteModal.set(false);
    this.selectedBus.set(null);
  }

  onBusDeleted() {
    this.closeDeleteModal();
    this.loadBuses();
  }

  onEstadoChange(bus: Bus, nuevoEstado: string) {
    if (!nuevoEstado || nuevoEstado === bus.estado) return;

    const anterior = bus.estado;
    this.updatingId.set(bus.id);
    bus.estado = nuevoEstado;

    this.busService.updateBusStatus(bus.id, nuevoEstado).subscribe({
      next: () => {
        this.updatingId.set(null);
        // Actualizar en la lista local
        this.allBuses.update((buses) =>
          buses.map((b) =>
            b.id === bus.id ? { ...b, estado: nuevoEstado } : b
          )
        );
      },
      error: () => {
        bus.estado = anterior;
        this.updatingId.set(null);
      },
    });
  }

  onRutaChange(bus: Bus, rutaId: number | null) {
    if (this.updatingRutaId() === bus.id) return;

    this.updatingRutaId.set(bus.id);

    const operation = rutaId
      ? this.busService.asignarRuta(bus.id, rutaId)
      : this.busService.removerRuta(bus.id);

    operation.subscribe({
      next: (updatedBus) => {
        this.allBuses.update((buses) =>
          buses.map((b) => (b.id === bus.id ? updatedBus : b))
        );
        this.updatingRutaId.set(null);
      },
      error: (error) => {
        this.updatingRutaId.set(null);
      },
    });
  }

  getEstadoBadge(estado: string): string {
    return this.estadoBadgeMap[estado] || 'bg-gray-100 text-gray-800';
  }

  getEstadoLabel(estado: string): string {
    const labels: Record<string, string> = {
      ACTIVO: '🟢 Activo',
      INACTIVO: '🔴 Inactivo',
      EN_RUTA: '🚌 En Ruta',
      MANTENIMIENTO: '🔧 Mantenimiento',
    };
    return labels[estado] || estado;
  }

  recargarRutas() {
    this.loadRutas();
  }
}
