import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { BusService } from '../../../service/bus/bus.service';
import { Bus } from '../../../models/buses.model';

@Component({
  selector: 'app-bus-create',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './bus-create.html',
})
export class BusCreate implements OnInit {
  @Input() isOpen = false;
  @Input() bus: Bus | null = null;
  @Output() onClose = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private busService = inject(BusService);

  busForm!: FormGroup;
  loading = false;
  isEdit = false;

  ngOnInit() {
    this.initForm();
    this.isEdit = !!this.bus;

    if (this.bus) {
      this.loadBusData();
    }
  }

  initForm() {
    this.busForm = this.fb.group({
      placa: ['', [Validators.required]],
      marca: ['', [Validators.required]],
      modelo: ['', [Validators.required]],
      capacidad: [
        '',
        [Validators.required, Validators.min(1), Validators.max(100)],
      ],
      anio: ['', [Validators.required]],
      estado: ['ACTIVO', [Validators.required]],
    });
  }

  loadBusData() {
    if (this.bus) {
      this.busForm.patchValue({
        placa: this.bus.placa,
        marca: this.bus.modelo,
        modelo: this.bus.modelo,
        capacidad: this.bus.capacidad,
        anio: this.bus.anio,
        estado: this.bus.estado,
      });
    }
  }

  onSubmit() {
    if (this.busForm.valid) {
      this.loading = true;
      const formData = this.busForm.value;

      const operation = this.isEdit
        ? this.busService.updateBus(this.bus!.id!, formData)
        : this.busService.createBus(formData);

      operation.subscribe({
        next: () => {
          this.loading = false;
          this.onSave.emit();
        },
        error: (error) => {
          console.error('Error saving bus:', error);
          this.loading = false;
        },
      });
    }
  }

  closeModal() {
    this.onClose.emit();
  }
}
