import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BusService } from '../../../service/bus/bus.service';
import { RouteService } from '../../../service/route/route.service';
import { Bus } from '../../../models/buses.model';
import { RouteResponse } from '../../../models/route.model';
import { BusDeleteModal } from '../bus-delete-modal/bus-delete-modal';
import { BusFilter, BusFilterCriteria } from '../bus-filter/bus-filter';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-bus-list',
  standalone: true,
  imports: [CommonModule, FormsModule, BusDeleteModal],
  templateUrl: './bus-list.html'
})
export class BusList implements OnInit {
  private busService = inject(BusService);
  private routeService = inject(RouteService);
  private sanitizer = inject(DomSanitizer);

  // Signals para el estado
  allBuses = signal<Bus[]>([]);
  rutas = signal<RouteResponse[]>([]);
  loading = signal(false);
  rutasLoading = signal(false);
  filterCriteria = signal<BusFilterCriteria>({ search: '' });

  // ✨ Signals para el modal de QR
  showQRModal = signal(false);
  selectedBusForQR = signal<Bus | null>(null);
  qrImageUrl = signal<SafeUrl | null>(null);
  loadingQR = signal(false);
  qrError = signal(false);

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

  // Estado del modal de eliminación
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
    console.log('🚌 Inicializando BusList component...');
    this.loadRutas();
    this.loadBuses();
  }

  // Manejo de filtros
  onFilterChange(criteria: BusFilterCriteria) {
    console.log('🔍 Filtros cambiados:', criteria);
    this.filterCriteria.set(criteria);
    this.currentPage.set(0);
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
    console.log('📡 Cargando buses...');
    this.loading.set(true);

    this.busService.getBuses(0, 1000).subscribe({
      next: (res) => {
        console.log('✅ Buses cargados:', res);
        this.allBuses.set(res.content);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('❌ Error cargando buses:', error);
        this.loading.set(false);
      },
    });
  }

  loadRutas() {
    console.log('🛣️ Cargando rutas...');
    this.rutasLoading.set(true);

    this.routeService.getRoutes().subscribe({
      next: (rutas) => {
        console.log('✅ Rutas cargadas:', rutas);
        const rutasActivas = rutas.filter((ruta) => ruta.estado === 'ACTIVA');
        this.rutas.set(rutasActivas);
        this.rutasLoading.set(false);
      },
      error: (error) => {
        console.error('❌ Error cargando rutas:', error);
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
        console.log('✅ Bus actualizado exitosamente:', updatedBus);
        this.allBuses.update((buses) =>
          buses.map((b) => (b.id === bus.id ? updatedBus : b))
        );
        this.updatingRutaId.set(null);
      },
      error: (error) => {
        console.error('❌ Error actualizando ruta del bus:', error);
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
    console.log('🔄 Recargando rutas manualmente...');
    this.loadRutas();
  }

  // ========================================
  // ✨ MÉTODOS PARA EL QR
  // ========================================

  /**
   * Abre el modal de QR y carga la imagen
   */
  openQRModal(bus: Bus) {
    console.log('📱 Abriendo modal QR para bus:', bus);

    // Resetear estados
    this.qrError.set(false);
    this.qrImageUrl.set(null);

    // Establecer el bus seleccionado y mostrar modal
    this.selectedBusForQR.set(bus);
    this.showQRModal.set(true);

    // Cargar el QR
    this.loadBusQR(bus);
  }

  /**
   * Cierra el modal de QR y limpia los estados
   */
  closeQRModal() {
    console.log('❌ Cerrando modal QR');

    // Limpiar la URL del objeto si existe
    const currentUrl = this.qrImageUrl();
    if (currentUrl && typeof currentUrl === 'string') {
      URL.revokeObjectURL(currentUrl as string);
    }

    // Resetear todos los estados
    this.showQRModal.set(false);
    this.selectedBusForQR.set(null);
    this.qrImageUrl.set(null);
    this.loadingQR.set(false);
    this.qrError.set(false);
  }

  /**
   * Carga el QR del bus desde el backend
   */
  loadBusQR(bus: Bus) {
    // Obtener empresa_id del localStorage
    const authUser = localStorage.getItem('auth_user');
    if (!authUser) {
      console.error('❌ No se encontró auth_user en localStorage');
      this.qrError.set(true);
      this.loadingQR.set(false);
      return;
    }

    const empresaId = JSON.parse(authUser)?.empresa_id;
    if (!empresaId) {
      console.error('❌ No se encontró empresa_id en auth_user');
      this.qrError.set(true);
      this.loadingQR.set(false);
      return;
    }

    console.log(
      `📡 Cargando QR para bus ID: ${bus.id}, Empresa ID: ${empresaId}`
    );
    this.loadingQR.set(true);
    this.qrError.set(false);

    this.busService.getBusQR(bus.id, empresaId).subscribe({
      next: (blob) => {
        console.log('✅ QR cargado exitosamente, tamaño:', blob.size, 'bytes');

        // Crear URL del blob
        const objectUrl = URL.createObjectURL(blob);

        // Sanitizar la URL para evitar problemas de seguridad
        const safeUrl = this.sanitizer.bypassSecurityTrustUrl(objectUrl);

        this.qrImageUrl.set(safeUrl);
        this.loadingQR.set(false);
        this.qrError.set(false);
      },
      error: (error) => {
        console.error('❌ Error cargando QR:', error);
        this.loadingQR.set(false);
        this.qrError.set(true);
      },
    });
  }

  /**
   * Descarga el QR como imagen PNG
   */
  downloadQR() {
    const bus = this.selectedBusForQR();
    if (!bus) {
      console.warn('⚠️ No hay bus seleccionado para descargar QR');
      return;
    }

    const authUser = localStorage.getItem('auth_user');
    if (!authUser) {
      console.error('❌ No se encontró auth_user en localStorage');
      return;
    }

    const empresaId = JSON.parse(authUser)?.empresa_id;
    if (!empresaId) {
      console.error('❌ No se encontró empresa_id en auth_user');
      return;
    }

    console.log(`💾 Descargando QR para bus: ${bus.placa}`);

    // Obtener el blob nuevamente para descargar
    this.busService.getBusQR(bus.id, empresaId).subscribe({
      next: (blob) => {
        // Crear un link temporal
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `QR-Bus-${bus.placa}-${new Date().getTime()}.png`;

        // Simular click para descargar
        document.body.appendChild(link);
        link.click();

        // Limpiar
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        console.log('✅ QR descargado exitosamente');
      },
      error: (error) => {
        console.error('❌ Error descargando QR:', error);
        alert(
          'Error al descargar el código QR. Por favor, intenta nuevamente.'
        );
      },
    });
  }

  /**
   * Imprime el QR
   */
  printQR() {
    const bus = this.selectedBusForQR();
    if (!bus || !this.qrImageUrl()) {
      console.warn('⚠️ No hay QR cargado para imprimir');
      return;
    }

    console.log(`🖨️ Imprimiendo QR para bus: ${bus.placa}`);

    // Crear una ventana de impresión
    const printWindow = window.open('', '_blank', 'width=600,height=600');

    if (!printWindow) {
      alert(
        'No se pudo abrir la ventana de impresión. Verifica que no estén bloqueadas las ventanas emergentes.'
      );
      return;
    }

    const qrUrl = this.qrImageUrl();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - Bus ${bus.placa}</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              font-family: Arial, sans-serif;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
            }
            h1 {
              font-size: 24px;
              margin: 0 0 10px 0;
            }
            .bus-info {
              font-size: 16px;
              color: #666;
            }
            img {
              max-width: 400px;
              height: auto;
              border: 2px solid #000;
              padding: 10px;
              background: white;
            }
            .footer {
              margin-top: 20px;
              text-align: center;
              font-size: 12px;
              color: #999;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Código QR</h1>
            <div class="bus-info">
              <strong>Bus:</strong> ${bus.placa}<br>
              <strong>Modelo:</strong> ${bus.modelo}<br>
              <strong>ID:</strong> ${bus.id}
            </div>
          </div>
          <img src="${qrUrl}" alt="QR Code" onload="window.print(); window.close();">
          <div class="footer">
            Generado el ${new Date().toLocaleString('es-ES')}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
  }
}
