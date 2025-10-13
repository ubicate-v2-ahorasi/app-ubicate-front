import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConductorDeleteModal } from '../conductor-delete-modal/conductor-delete-modal';
import { ConductorEditModal } from '../conductor-edit-modal/conductor-edit-modal';
import { ConductorFilters } from '../conductor-filters/conductor-filters';
import { ConductorService } from '../../../service/chofer/chofer.service';
import { BusService } from '../../../service/bus/bus.service';

type Turno = 'MANANA' | 'TARDE' | 'NOCHE';
type Estado = 'ACTIVO' | 'INACTIVO' | 'VACACIONES' | 'SUSPENDIDO';

interface ConductorVM {
  id: number;
  nombreCompleto: string;
  dni: string;
  telefono: string | null;
  numeroLicencia: string;
  categoriaLicencia: string;
  turno: Turno;
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

  conductores: ConductorVM[] = [];
  busesDisponibles: BusVM[] = [];
  selectedBusByConductor: Record<number, number | null> = {};
  loading = false;
  currentPage = 0;
  pageSize = 20;
  loadingBusAssignment: Record<number, boolean> = {};
  currentSearchTerm = '';
  currentEstado: 'Todos' | Estado = 'Todos';
  currentCategoria = 'Todas';
  currentTurno: 'Todos' | Turno = 'Todos';
  showDeleteModal = false;
  showEditModal = false;
  selectedConductor: ConductorVM | null = null;

  ngOnInit() {
    this.loadConductores();
    this.loadBusesDisponibles();
  }

  private normTurno(v: any): Turno {
    const s = String(v ?? '').toUpperCase();
    if (s === 'MAÑANA' || s === 'MANANA') return 'MANANA';
    if (s === 'TARDE') return 'TARDE';
    if (s === 'NOCHE') return 'NOCHE';
    return 'MANANA';
  }

  private toConductorVM = (c: any): ConductorVM => ({
    id: c.id,
    nombreCompleto: c.nombreCompleto ?? c.nombre_completo ?? '',
    dni: c.dni,
    telefono: c.telefono ?? null,
    numeroLicencia: c.numeroLicencia ?? c.numero_licencia,
    categoriaLicencia: c.categoriaLicencia ?? c.categoria_licencia,
    turno: this.normTurno(c.turno),
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
      this.conductores = this.applyLocalFilters(
        content.map(this.toConductorVM)
      );
      this.reconcileSelectedBus();
      this.loading = false;
    };

    this.conductorService
      .getConductores(this.currentPage, this.pageSize)
      .subscribe({
        next: handlePage,
        error: () => {
          this.loading = false;
        },
      });
  }

  applyLocalFilters(conductores: ConductorVM[]): ConductorVM[] {
    let filtered = [...conductores];

    // Filtro por Categoría
    if (this.currentCategoria !== 'Todas') {
      filtered = filtered.filter(
        (c) => c.categoriaLicencia === this.currentCategoria
      );
    }

    // Filtro por Estado
    if (this.currentEstado !== 'Todos') {
      filtered = filtered.filter((c) => c.estado === this.currentEstado);
    }

    // Filtro por Turno
    if (this.currentTurno !== 'Todos') {
      filtered = filtered.filter((c) => c.turno === this.currentTurno);
    }

    // Filtro por término de búsqueda
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
    this.loadConductores();
  }

  onEstadoChange(estado: Estado | 'Todos') {
    this.currentEstado = estado;
    this.loadConductores();
  }

  onCategoriaChange(categoria: string) {
    this.currentCategoria = categoria;
    this.loadConductores();
  }

  onTurnoChange(turno: Turno | 'Todos') {
    this.currentTurno = turno;
    this.loadConductores();
  }

  onClearFilters() {
    this.currentSearchTerm = '';
    this.currentEstado = 'Todos';
    this.currentCategoria = 'Todas';
    this.currentTurno = 'Todos';
    this.loadConductores();
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
  }
  onCancelDelete() {
    this.showDeleteModal = false;
    this.selectedConductor = null;
  }
  onConfirmDelete() {
    this.showDeleteModal = false;
    this.selectedConductor = null;
    this.loadConductores();
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

  getTurnoClass(turno: Turno): string {
    switch (turno) {
      case 'MANANA':
        return 'bg-yellow-100 text-yellow-800';
      case 'TARDE':
        return 'bg-blue-100 text-blue-800';
      case 'NOCHE':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
}
