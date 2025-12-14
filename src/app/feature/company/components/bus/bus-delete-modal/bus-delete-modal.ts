import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Bus } from '../../../models/buses.model';
import { BusService } from '../../../service/bus/bus.service';
import { ErrorNotification } from '../../shared/error-notification';

@Component({
  selector: 'app-bus-delete-modal',
  standalone: true,
  imports: [CommonModule, ErrorNotification],
  templateUrl: './bus-delete-modal.html',
})
export class BusDeleteModal {
  private busService = inject(BusService);

  @Input() isOpen = false;
  @Input() bus: Bus | null = null;

  @Output() onClose = new EventEmitter<void>();
  @Output() onConfirm = new EventEmitter<void>();

  isDeleting = false;
  errorMessage = '';

  closeModal() {
    if (!this.isDeleting) {
      this.onClose.emit();
    }
  }

  confirmDelete() {
    if (this.bus && !this.isDeleting) {
      this.isDeleting = true;
      this.errorMessage = '';

      this.busService.deleteBus(this.bus.id).subscribe({
        next: () => {
          this.isDeleting = false;
          this.onConfirm.emit();
        },
        error: (error) => {
          this.isDeleting = false;
          this.errorMessage = this.parseErrorMessage(error);
        },
      });
    }
  }

  private parseErrorMessage(error: any): string {
    console.log('Error completo:', error);
    console.log('error.error:', error.error);
    
    // El backend devuelve: { code, message, timestamp }
    if (error.error?.message) {
      return error.error.message;
    }
    
    // Errores de validación detallados del backend
    if (error.error?.details) {
      if (typeof error.error.details === 'object') {
        const details = Object.entries(error.error.details)
          .map(([field, message]) => `${field}: ${message}`)
          .join('\n');
        return details;
      }
      return String(error.error.details);
    }
    
    // Si error tiene message directo
    if (error.message) {
      return error.message;
    }
    
    // Error con status
    if (error.status) {
      switch (error.status) {
        case 400:
          return 'No se puede eliminar el bus.';
        case 409:
          return 'El bus está en uso y no puede ser eliminado.';
        case 500:
          return 'Error del servidor. Por favor intente nuevamente.';
        default:
          return `Error ${error.status}: ${error.statusText || 'Error desconocido'}`;
      }
    }
    
    return 'No se pudo eliminar el bus. Por favor, intente nuevamente.';
  }
  getEstadoBadge(estado: string): string {
    const badges = {
      ACTIVO: 'text-green-700',
      INACTIVO: 'text-red-700',
      EN_RUTA: 'text-blue-700',
      MANTENIMIENTO: 'text-yellow-700',
    };
    return badges[estado as keyof typeof badges] || 'text-gray-700';
  }

  getEstadoLabel(estado: string): string {
    const labels = {
      ACTIVO: '🟢 Activo',
      INACTIVO: '🔴 Inactivo',
      EN_RUTA: '🚌 En Ruta',
      MANTENIMIENTO: '🔧 Mantenimiento',
    };
    return labels[estado as keyof typeof labels] || estado;
  }
}
