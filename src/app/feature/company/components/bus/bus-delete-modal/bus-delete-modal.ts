import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Bus } from '../../../models/buses.model';
import { BusService } from '../../../service/bus/bus.service';

@Component({
  selector: 'app-bus-delete-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bus-delete-modal.html',
})
export class BusDeleteModal {
  private busService = inject(BusService);

  @Input() isOpen = false;
  @Input() bus: Bus | null = null;

  @Output() onClose = new EventEmitter<void>();
  @Output() onConfirm = new EventEmitter<void>();

  isDeleting = false;

  closeModal() {
    if (!this.isDeleting) {
      this.onClose.emit();
    }
  }

  confirmDelete() {
    if (this.bus && !this.isDeleting) {
      this.isDeleting = true;

      this.busService.deleteBus(this.bus.id).subscribe({
        next: () => {
          this.isDeleting = false;
          this.onConfirm.emit();
        },
        error: (error) => {
          this.isDeleting = false;
        },
      });
    }
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
