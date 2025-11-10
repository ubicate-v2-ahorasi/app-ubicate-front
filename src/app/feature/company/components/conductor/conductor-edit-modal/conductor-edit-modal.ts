import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  OnChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConductorService } from '../../../service/chofer/chofer.service';

@Component({
  selector: 'app-conductor-edit-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './conductor-edit-modal.html',
})
export class ConductorEditModal implements OnInit, OnChanges {
  private fb = inject(FormBuilder);
  private conductorService = inject(ConductorService);

  @Input() isVisible = false;
  @Input() conductor: any = null;
  @Input() buses: any[] = [];
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<void>();
  @Output() onDelete = new EventEmitter<void>();

  conductorForm!: FormGroup;
  isSubmitting = false;

  // Opciones para selects
  estados = ['ACTIVO', 'INACTIVO', 'VACACIONES', 'SUSPENDIDO'];

  ngOnInit() {
    this.initForm();
  }

  ngOnChanges() {
    if (this.conductorForm && this.conductor) {
      this.populateForm();
    }
  }

  initForm() {
    this.conductorForm = this.fb.group({
      telefono: ['', [Validators.required, Validators.pattern(/^\d{9}$/), Validators.maxLength(9)]],
      estado: ['ACTIVO'],
      busAsignadoId: [null],
    });
  }

  populateForm() {
    if (this.conductor) {
      this.conductorForm.patchValue({
        telefono: this.conductor.telefono || '',
        estado: this.conductor.estado || 'ACTIVO',
        busAsignadoId: this.conductor.busAsignadoId || null,
      });
    }
  }

  resetForm() {
    this.conductorForm.reset({
      telefono: '',
      estado: 'ACTIVO',
      busAsignadoId: null,
    });
  }

  cancel() {
    this.resetForm();
    this.onCancel.emit();
  }

  onSubmit() {
    if (!this.isSubmitting && this.conductor) {
      this.isSubmitting = true;
      const formData = this.conductorForm.value;

      this.conductorService
        .updateConductor(this.conductor.id, formData)
        .subscribe({
          next: () => {
            this.isSubmitting = false;
            this.resetForm();
            this.onSave.emit();
          },
          error: (error) => {
            console.error('Error al actualizar conductor:', error);
            this.isSubmitting = false;
          },
        });
    }
  }

  get submitButtonText(): string {
    return this.isSubmitting ? 'Actualizando...' : 'Actualizar Conductor';
  }

  deleteClick() {
    this.onDelete.emit();
  }

  onlyNumbers(event: KeyboardEvent): void {
    const key = event.key;
    // Permitir teclas de control (backspace, delete, arrows, etc.)
    if (key.length === 1 && !/^\d$/.test(key)) {
      event.preventDefault();
    }
  }
}
