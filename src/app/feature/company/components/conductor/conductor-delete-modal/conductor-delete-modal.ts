import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConductorService } from '../../../service/chofer/chofer.service';

@Component({
  selector: 'app-conductor-delete-modal',
  imports: [CommonModule],
  templateUrl: './conductor-delete-modal.html'
})
export class ConductorDeleteModal {
  private conductorService = inject(ConductorService);

  @Input() isVisible = false;
  @Input() conductor: any = null;
  @Output() onCancel = new EventEmitter<void>();
  @Output() onConfirm = new EventEmitter<void>();

  isDeleting = false;

  cancelDelete() {
    this.onCancel.emit();
  }

  confirmDelete() {
    if (this.conductor && !this.isDeleting) {
      this.isDeleting = true;

      this.conductorService.deleteConductor(this.conductor.id)
        .subscribe({
          next: () => {
            this.isDeleting = false;
            this.onConfirm.emit();
          },
          error: (error) => {
            this.isDeleting = false;
          }
        });
    }
  }
}
