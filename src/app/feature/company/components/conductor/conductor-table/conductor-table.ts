import { Component, OnInit, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConductorDeleteModal } from '../conductor-delete-modal/conductor-delete-modal';
import { ConductorEditModal } from '../conductor-edit-modal/conductor-edit-modal';
import { ConductorFilters } from '../conductor-filters/conductor-filters';
import { ConductorService } from '../../../service/chofer/chofer.service';
import { BusService } from '../../../service/bus/bus.service';

type Estado = 'ACTIVO' | 'INACTIVO' | 'VACACIONES' | 'SUSPENDIDO';

interface ConductorVM {
  id: number;
  nombreCompleto: string;
  dni: string;
  telefono: string | null;
  numeroLicencia: string;
  categoriaLicencia: string;
  estado: Estado;
  busAsignadoId: number | null;
  placaBusAsignado: string | null;
  licenciaVencida: boolean;
  licenciaPorVencer: boolean;
}

interface BusVM {
  id: number;
  placa: string;
  modelo?: string | null;
  conductorAsignadoId?: number | null;
}

@Component({
  selector: 'app-conductor-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ConductorDeleteModal,
    ConductorEditModal,
    ConductorFilters,
  ],
  templateUrl: './conductor-table.html',
})
export class ConductorTable implements OnInit {
  private conductorService = inject(ConductorService);
  private busService = inject(BusService);

  @Output() onCreateNew = new EventEmitter<void>();
  @Output() onDataChanged = new EventEmitter<void>();

  conductores: ConductorVM[] = [];
  allConductores: ConductorVM[] = [];
  paginatedConductores: ConductorVM[] = [];
  busesDisponibles: BusVM[] = [];
  selectedBusByConductor: Record<number, number | null> = {};
  loading = false;
  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  filteredCount = 0;
  totalConductores = 0;
  loadingBusAssignment: Record<number, boolean> = {};
  currentSearchTerm = '';
  currentEstado: 'Todos' | Estado = 'Todos';
  currentCategoria = 'Todas';
  showDeleteModal = false;
  showEditModal = false;
  selectedConductor: ConductorVM | null = null;

  Math = Math;

  ngOnInit() {
    this.loadConductores();
    this.loadBusesDisponibles();
  }

  private toConductorVM = (c: any): ConductorVM => ({
    id: c.id,
    nombreCompleto: c.nombreCompleto ?? c.nombre_completo ?? '',
    dni: c.dni,
    telefono: c.telefono ?? null,
    numeroLicencia: c.numeroLicencia ?? c.numero_licencia,
    categoriaLicencia: c.categoriaLicencia ?? c.categoria_licencia,
    estado: c.estado as Estado,
    busAsignadoId: c.busAsignadoId ?? c.bus_asignado_id ?? null,
    placaBusAsignado: (() => {
      const p = c.placaBusAsignado ?? c.placa_bus_asignado ?? null;
      if (!p) return null;
      const s = String(p);
      return s.toLowerCase() === 'sin asignar' ? null : s;
    })(),
    licenciaVencida: c.licenciaVencida ?? c.licencia_vencida ?? false,
    licenciaPorVencer: c.licenciaPorVencer ?? c.licencia_por_vencer ?? false,
  });

  private toBusVM = (b: any): BusVM => ({
    id: b.id,
    placa: b.placa,
    modelo: b.modelo ?? null,
    conductorAsignadoId:
      b.conductorAsignadoId ?? b.conductor_asignado_id ?? null,
  });

  private reconcileSelectedBus() {
    for (const c of this.conductores) {
      let selectedId: number | null = c.busAsignadoId ?? null;
      if (selectedId == null && c.placaBusAsignado) {
        const match =
          this.busesDisponibles.find((b) => b.placa === c.placaBusAsignado) ??
          null;
        if (match) {
          selectedId = match.id;
          c.busAsignadoId = match.id;
        }
      }
      this.selectedBusByConductor[c.id] = selectedId;
    }
  }

  loadBusesDisponibles() {
    this.busService.getBuses(0, 100).subscribe({
      next: (response) => {
        const arr = response?.content ?? response ?? [];
        this.busesDisponibles = (arr as any[]).map(this.toBusVM);
        this.reconcileSelectedBus();
      },
      error: () => {},
    });
  }

  loadConductores() {
    this.loading = true;
    const handlePage = (res: any) => {
      const content = res?.content ?? res ?? [];
      this.allConductores = content.map(this.toConductorVM);
      this.totalConductores = this.allConductores.length;
      this.applyFiltersAndPagination();
      this.reconcileSelectedBus();
      this.loading = false;
    };

    this.conductorService
      .getConductores(0, 200)
      .subscribe({
        next: handlePage,
        error: () => {
          this.loading = false;
        },
      });
  }

  applyFiltersAndPagination() {
    this.conductores = this.applyLocalFilters(this.allConductores);
    this.filteredCount = this.conductores.length;
    this.totalPages = Math.ceil(this.filteredCount / this.pageSize);
    this.updatePaginatedConductores();
  }

  updatePaginatedConductores() {
    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedConductores = this.conductores.slice(start, end);
  }

  applyLocalFilters(conductores: ConductorVM[]): ConductorVM[] {
    let filtered = [...conductores];

    if (this.currentCategoria !== 'Todas') {
      filtered = filtered.filter(
        (c) => c.categoriaLicencia === this.currentCategoria
      );
    }

    if (this.currentEstado !== 'Todos') {
      filtered = filtered.filter((c) => c.estado === this.currentEstado);
    }

    if (this.currentSearchTerm) {
      const searchTerm = this.currentSearchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.nombreCompleto.toLowerCase().includes(searchTerm) ||
          c.dni.includes(searchTerm) ||
          c.numeroLicencia.includes(searchTerm)
      );
    }

    return filtered;
  }

  onSearch(searchTerm: string) {
    this.currentSearchTerm = searchTerm;
    this.currentPage = 0;
    this.applyFiltersAndPagination();
  }

  onEstadoChange(estado: Estado | 'Todos') {
    this.currentEstado = estado;
    this.currentPage = 0;
    this.applyFiltersAndPagination();
  }

  onCategoriaChange(categoria: string) {
    this.currentCategoria = categoria;
    this.currentPage = 0;
    this.applyFiltersAndPagination();
  }

  onClearFilters() {
    this.currentSearchTerm = '';
    this.currentEstado = 'Todos';
    this.currentCategoria = 'Todas';
    this.currentPage = 0;
    this.applyFiltersAndPagination();
  }

  onPageChange(page: number) {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedConductores();
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 0;
    this.applyFiltersAndPagination();
  }

  getPages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i);
  }

  handleCreateNew() {
    this.onCreateNew.emit();
  }

  onBusAssignment(conductor: ConductorVM, newBusId: number | null) {
    const prevBusId = conductor.busAsignadoId ?? null;
    if ((prevBusId ?? null) === (newBusId ?? null)) return;
    if (this.loadingBusAssignment[conductor.id]) return;

    this.loadingBusAssignment[conductor.id] = true;

    const op$ = newBusId
      ? this.conductorService.asignarBus(conductor.id, newBusId)
      : this.conductorService.removerBus(conductor.id);

    op$.subscribe({
      next: () => {
        conductor.busAsignadoId = newBusId;
        const nuevoBus = newBusId
          ? this.busesDisponibles.find((b) => b.id === newBusId)
          : undefined;
        conductor.placaBusAsignado = nuevoBus?.placa ?? null;

        if (prevBusId) {
          const prevBus = this.busesDisponibles.find((b) => b.id === prevBusId);
          if (prevBus && prevBus.conductorAsignadoId === conductor.id)
            prevBus.conductorAsignadoId = null;
        }
        if (newBusId) {
          const nextBus = this.busesDisponibles.find((b) => b.id === newBusId);
          if (nextBus) nextBus.conductorAsignadoId = conductor.id;
        }

        this.selectedBusByConductor[conductor.id] = newBusId ?? null;
        this.loadingBusAssignment[conductor.id] = false;
      },
      error: () => {
        this.selectedBusByConductor[conductor.id] = prevBusId;
        this.loadingBusAssignment[conductor.id] = false;
      },
    });
  }

  onView(conductor: ConductorVM) {}
  
  onRowClick(conductor: ConductorVM, event: MouseEvent) {
    // Verificar si hay texto seleccionado (el usuario está seleccionando para copiar)
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      return; // No abrir modal si hay texto seleccionado
    }
    
    // Verificar si el clic fue en el select o sus hijos
    const target = event.target as HTMLElement;
    if (target.tagName === 'SELECT' || target.closest('select')) {
      return; // No abrir modal si se hace clic en el select
    }
    
    this.selectedConductor = conductor;
    this.showEditModal = true;
  }
  
  onEdit(conductor: ConductorVM) {
    this.selectedConductor = conductor;
    this.showEditModal = true;
  }
  onDelete(conductor: ConductorVM) {
    this.selectedConductor = conductor;
    this.showDeleteModal = true;
  }
  onCancelEdit() {
    this.showEditModal = false;
    this.selectedConductor = null;
  }
  onConfirmEdit() {
    this.showEditModal = false;
    this.selectedConductor = null;
    this.loadConductores();
    this.onDataChanged.emit(); // Notificar cambio
  }
  onDeleteFromEdit() {
    // Cerrar el modal de edición y abrir el de eliminación
    this.showEditModal = false;
    this.showDeleteModal = true;
  }
  onCancelDelete() {
    this.showDeleteModal = false;
    this.selectedConductor = null;
  }
  onConfirmDelete() {
    this.showDeleteModal = false;
    this.selectedConductor = null;
    this.loadConductores();
    this.onDataChanged.emit(); // Notificar cambio
  }

  getEstadoClass(estado: Estado): string {
    switch (estado) {
      case 'ACTIVO':
        return 'bg-green-100 text-green-800';
      case 'VACACIONES':
        return 'bg-orange-100 text-orange-800';
      case 'INACTIVO':
        return 'bg-red-100 text-red-800';
      case 'SUSPENDIDO':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
}
