import { Component, OnInit, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConductorDeleteModal } from '../conductor-delete-modal/conductor-delete-modal';
import { ConductorEditModal } from '../conductor-edit-modal/conductor-edit-modal';
import {
  ConductorFilters,
  SortDirection,
} from '../conductor-filters/conductor-filters';
import { ConductorService } from '../../../service/chofer/chofer.service';
import { BusService } from '../../../service/bus/bus.service';
import {
  AnimatedSelectComponent,
  AnimatedSelectOption,
} from '../../shared/animated-select/animated-select';

type Estado = 'ACTIVO' | 'INACTIVO' | 'VACACIONES' | 'SUSPENDIDO';

interface ConductorVM {
  id: number;
  nombreCompleto: string;
  dni: string;
  email: string | null;
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
    AnimatedSelectComponent,
  ],
  templateUrl: './conductor-table.html',
})
export class ConductorTable implements OnInit {
  private conductorService = inject(ConductorService);
  private busService = inject(BusService);

  @Output() onCreateNew = new EventEmitter<void>();
  @Output() onDataChanged = new EventEmitter<void>();

  formErrorMessage: string | null = null;
  conductores: ConductorVM[] = [];
  busesDisponibles: BusVM[] = [];
  selectedBusByConductor: Record<number, number | null> = {};
  loading = false;
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  totalElements = 0;
  loadingBusAssignment: Record<number, boolean> = {};
  currentSearchTerm = '';
  currentEstado: 'Todos' | Estado = 'Todos';
  currentCategoria = 'Todas';
  currentSortDirection: SortDirection = 'desc';
  showDeleteModal = false;
  showEditModal = false;
  selectedConductor: ConductorVM | null = null;
  readonly pageSizeOptions: AnimatedSelectOption<number>[] = [
    { label: '10', value: 10 },
    { label: '25', value: 25 },
    { label: '50', value: 50 },
    { label: '100', value: 100 },
  ];

  Math = Math;

  ngOnInit() {
    this.loadConductores();
    this.loadBusesDisponibles();
  }

  private toConductorVM = (c: any): ConductorVM => ({
    id: c.id,
    nombreCompleto: c.nombreCompleto ?? c.nombre_completo ?? '',
    dni: c.dni,
    email: c.email ?? c.correo ?? null,
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

  private sortConductores(conductores: ConductorVM[]): ConductorVM[] {
    const direction = this.currentSortDirection === 'desc' ? -1 : 1;
    return [...conductores].sort((a, b) => (a.id - b.id) * direction);
  }

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
    this.busService.getBuses(1, 1000).subscribe({
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
    const requestedPage = this.currentPage;

    this.conductorService
      .getConductores(
        requestedPage,
        this.pageSize,
        'fechaIngreso,desc',
        this.currentSearchTerm,
        this.currentEstado !== 'Todos' ? this.currentEstado : undefined,
        this.currentCategoria !== 'Todas' ? this.currentCategoria : undefined
      )
      .subscribe({
        next: (response: any) => {
          const content = response?.content ?? [];
          this.conductores = this.sortConductores(content.map(this.toConductorVM));

          this.totalElements =
            response?.total_elements ?? response?.totalElements ?? 0;
          this.totalPages = response?.total_pages ?? response?.totalPages ?? 1;

          if (typeof response?.number === 'number') {
            const respNumber = response.number;

            if (respNumber === requestedPage) {
              this.currentPage = respNumber;
            } else if (respNumber === requestedPage - 1) {
              this.currentPage = respNumber + 1;
            } else if (respNumber === 0 && requestedPage === 1) {
              this.currentPage = 1;
            } else {
              this.currentPage = respNumber + 1;
            }
          } else {
            this.currentPage = requestedPage;
          }

          this.reconcileSelectedBus();
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  onSearch(searchTerm: string) {
    this.currentSearchTerm = searchTerm;
    this.currentPage = 1;
    this.loadConductores();
  }

  onEstadoChange(estado: Estado | 'Todos') {
    this.currentEstado = estado;
    this.currentPage = 1;
    this.loadConductores();
  }

  onCategoriaChange(categoria: string) {
    this.currentCategoria = categoria;
    this.currentPage = 1;
    this.loadConductores();
  }

  onSortDirectionChange(direction: SortDirection) {
    this.currentSortDirection = direction;
    this.currentPage = 1;
    this.loadConductores();
  }

  onClearFilters() {
    this.currentSearchTerm = '';
    this.currentEstado = 'Todos';
    this.currentCategoria = 'Todas';
    this.currentPage = 1;
    this.loadConductores();
  }

  onPageChange(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadConductores();
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.loadConductores();
  }

  getBusOptions(conductor: ConductorVM): AnimatedSelectOption<number | null>[] {
    return [
      { label: 'Sin bus asignado', value: null },
      ...this.busesDisponibles.map((bus) => ({
        label: `${bus.placa} - ${bus.modelo || '-'}`,
        value: bus.id,
        disabled: !!(bus.conductorAsignadoId && bus.conductorAsignadoId !== conductor.id),
      })),
    ];
  }

  getPages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  getVisiblePages(): number[] {
    const maxVisible = 5;
    const pages: number[] = [];

    if (this.totalPages <= maxVisible) {
      return this.getPages();
    }

    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);

    if (end === this.totalPages) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
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
          if (prevBus && prevBus.conductorAsignadoId === conductor.id) {
            prevBus.conductorAsignadoId = null;
          }
        }
        if (newBusId) {
          const nextBus = this.busesDisponibles.find((b) => b.id === newBusId);
          if (nextBus) nextBus.conductorAsignadoId = conductor.id;
        }

        this.selectedBusByConductor[conductor.id] = newBusId ?? null;
        this.loadingBusAssignment[conductor.id] = false;
      },
      error: (err) => {
        this.formErrorMessage = err.message;
        this.selectedBusByConductor[conductor.id] = prevBusId;
        this.loadingBusAssignment[conductor.id] = false;
      },
    });
  }

  onView(conductor: ConductorVM) {}

  onRowClick(conductor: ConductorVM, event: MouseEvent) {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      return;
    }

    const target = event.target as HTMLElement;
    if (
      target.tagName === 'SELECT' ||
      target.closest('select') ||
      target.closest('button')
    ) {
      return;
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
    this.currentPage = 1;
    this.loadConductores();
    this.onDataChanged.emit();
  }

  onDeleteFromEdit() {
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
    this.onDataChanged.emit();
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
