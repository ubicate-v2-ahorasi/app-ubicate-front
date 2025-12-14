import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BusService } from '../../../service/bus/bus.service';
import { RouteService } from '../../../service/route/route.service';
import { Bus } from '../../../models/buses.model';
import { RouteResponse } from '../../../models/route.model';
import { BusDeleteModal } from '../bus-delete-modal/bus-delete-modal';
import { BusFilter, BusFilterCriteria } from '../bus-filter/bus-filter';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-bus-list',
  standalone: true,
  imports: [CommonModule, FormsModule, BusDeleteModal],
  templateUrl: './bus-list.html',
})
export class BusList implements OnInit {
  private busService = inject(BusService);
  private routeService = inject(RouteService);
  private sanitizer = inject(DomSanitizer);

  buses = signal<Bus[]>([]);
  rutas = signal<RouteResponse[]>([]);
  loading = signal(false);
  rutasLoading = signal(false);

  currentPage = signal(1);
  pageSize = signal(10);
  totalPages = signal(0);
  totalElements = signal(0);

  currentSearch = signal('');
  currentEstado = signal('');
  currentRuta = signal<number | undefined>(undefined);

  showDeleteModal = signal(false);
  selectedBus = signal<Bus | null>(null);
  updatingId = signal<number | null>(null);
  updatingRutaId = signal<number | null>(null);

  showQRModal = signal(false);
  selectedBusForQR = signal<Bus | null>(null);
  qrImageUrl = signal<SafeUrl | null>(null);
  loadingQR = signal(false);
  qrError = signal(false);

  readonly ESTADOS = ['ACTIVO', 'INACTIVO', 'EN_RUTA', 'MANTENIMIENTO'] as const;

  Math = Math;

  ngOnInit() {
    this.loadRutas();
    this.loadBuses();
  }

  onFilterChange(criteria: BusFilterCriteria) {
    this.currentSearch.set(criteria.search);
    this.currentEstado.set(criteria.estado || '');
    this.currentRuta.set(criteria.ruta);
    this.currentPage.set(1);
    this.loadBuses();
  }

  handleCreateNew() {
    console.log('Crear nuevo bus');
  }

  loadBuses() {
    this.loading.set(true);
    const requestedPage = this.currentPage();

    this.busService.getBuses(
      requestedPage,
      this.pageSize(),
      this.currentRuta(),
      this.currentSearch(),
      this.currentEstado()
    ).subscribe({
      next: (response: any) => {
        const content = response?.content ?? [];
        this.buses.set(content);

        this.totalElements.set(response?.total_elements ?? response?.totalElements ?? 0);
        this.totalPages.set(response?.total_pages ?? response?.totalPages ?? 1);

        if (typeof response?.number === 'number') {
          const respNumber = response.number;

          if (respNumber === requestedPage) {
            this.currentPage.set(respNumber);
          } else if (respNumber === requestedPage - 1) {
            this.currentPage.set(respNumber + 1);
          } else if (respNumber === 0 && requestedPage === 1) {
            this.currentPage.set(1);
          } else {
            this.currentPage.set(respNumber + 1);
          }
        } else {
          this.currentPage.set(requestedPage);
        }

        this.loading.set(false);
      },
      error: () => {
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
      error: () => {
        this.rutas.set([]);
        this.rutasLoading.set(false);
      },
    });
  }

  onPageChange(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadBuses();
    }
  }

  onPageSizeChange(size: number) {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadBuses();
  }

  trackByBusId(index: number, bus: Bus): number {
    return bus.id;
  }

  getSelectValue(event: Event): number | null {
    const target = event.target as HTMLSelectElement;
    const value = target.value;
    return value && value !== '' ? +value : null;
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
      },
      error: () => {
        bus.estado = anterior;
        this.updatingId.set(null);
      },
    });
  }

  onRutaChange(bus: Bus, rutaId: number | null) {
    console.log('onRutaChange llamado', { busId: bus.id, rutaId, currentRuta: bus.ruta?.id });
    
    if (this.updatingRutaId() === bus.id) {
      console.log('Ya está actualizando');
      return;
    }

    // Evitar llamada si es la misma ruta
    const currentRutaId = bus.ruta?.id || null;
    if (currentRutaId === rutaId) {
      console.log('Misma ruta, no hacer nada');
      return;
    }

    console.log('Ejecutando operación', rutaId ? 'asignar' : 'remover');
    this.updatingRutaId.set(bus.id);

    // Siempre usar asignarRuta, con null cuando se quiere remover
    this.busService.asignarRuta(bus.id, rutaId).subscribe({
      next: (updatedBus) => {
<<<<<<< HEAD
        this.buses.update((buses) =>
          buses.map((b) => (b.id === bus.id ? updatedBus : b))
=======
        console.log('Ruta actualizada', updatedBus);
        // Crear nuevo array para que Angular detecte el cambio
        const currentBuses = this.allBuses();
        const updatedBuses = currentBuses.map((b) => 
          b.id === bus.id ? updatedBus : b
>>>>>>> a1ec76dd8cafc5fcf808ad2c1d91cae82a5ff9d3
        );
        this.allBuses.set(updatedBuses);
        this.updatingRutaId.set(null);
      },
<<<<<<< HEAD
      error: () => {
=======
      error: (error) => {
        console.error('Error al actualizar ruta', error);
>>>>>>> a1ec76dd8cafc5fcf808ad2c1d91cae82a5ff9d3
        this.updatingRutaId.set(null);
      },
    });
  }

  getEstadoBadge(estado: string): string {
    const map: Record<string, string> = {
      ACTIVO: 'bg-green-100 text-green-800',
      INACTIVO: 'bg-red-100 text-red-800',
      EN_RUTA: 'bg-blue-100 text-blue-800',
      MANTENIMIENTO: 'bg-yellow-100 text-yellow-800',
    };
    return map[estado] || 'bg-gray-100 text-gray-800';
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

  openQRModal(bus: Bus) {
    this.qrError.set(false);
    this.qrImageUrl.set(null);
    this.selectedBusForQR.set(bus);
    this.showQRModal.set(true);
    this.loadBusQR(bus);
  }

  closeQRModal() {
    const currentUrl = this.qrImageUrl();
    if (currentUrl && typeof currentUrl === 'string') {
      URL.revokeObjectURL(currentUrl as string);
    }

    this.showQRModal.set(false);
    this.selectedBusForQR.set(null);
    this.qrImageUrl.set(null);
    this.loadingQR.set(false);
    this.qrError.set(false);
  }

  loadBusQR(bus: Bus) {
    const authUser = localStorage.getItem('auth_user');
    if (!authUser) {
      this.qrError.set(true);
      this.loadingQR.set(false);
      return;
    }

    const empresaId = JSON.parse(authUser)?.empresa_id;
    if (!empresaId) {
      this.qrError.set(true);
      this.loadingQR.set(false);
      return;
    }

    this.loadingQR.set(true);
    this.qrError.set(false);

    this.busService.getBusQR(bus.id, empresaId).subscribe({
      next: (blob) => {
        const objectUrl = URL.createObjectURL(blob);
        const safeUrl = this.sanitizer.bypassSecurityTrustUrl(objectUrl);
        this.qrImageUrl.set(safeUrl);
        this.loadingQR.set(false);
        this.qrError.set(false);
      },
      error: () => {
        this.loadingQR.set(false);
        this.qrError.set(true);
      },
    });
  }

  downloadQR() {
    const bus = this.selectedBusForQR();
    if (!bus) return;

    const authUser = localStorage.getItem('auth_user');
    if (!authUser) return;

    const empresaId = JSON.parse(authUser)?.empresa_id;
    if (!empresaId) return;

    this.busService.getBusQR(bus.id, empresaId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `QR-Bus-${bus.placa}-${new Date().getTime()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        alert('Error al descargar el código QR. Por favor, intenta nuevamente.');
      },
    });
  }
}
