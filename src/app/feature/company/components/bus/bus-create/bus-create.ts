import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
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
  standalone: true,
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
  formErrorMessage: string | null = null;
  formErrorDetails: any | null = null;

  // Validadores personalizados
  private plateValidator(control: any) {
    const value = control.value;
    if (!value) return null;
    const valid = /^[a-zA-Z0-9]{0,6}$/.test(value);
    return valid ? null : { invalidPlate: true };
  }

  private onlyNumbersValidator(control: any) {
    const value = control.value;
    if (!value) return null;
    const valid = /^\d+$/.test(value);
    return valid ? null : { onlyNumbers: true };
  }

  ngOnInit() {
    this.initForm();
    this.isEdit = !!this.bus;

    if (this.bus) {
      this.loadBusData();
    }
  }

  initForm() {
    this.busForm = this.fb.group({
      placa: ['', [
        Validators.required,
        Validators.maxLength(6),
        this.plateValidator
      ]],
      marca: ['', [
        Validators.required,
        Validators.maxLength(30)
      ]],
      modelo: ['', [
        Validators.required,
        Validators.maxLength(30)
      ]],
      capacidad: [
        '',
        [
          Validators.required,
          Validators.min(1),
          Validators.max(99),
          this.onlyNumbersValidator
        ],
      ],
      anio: ['', [
        Validators.required,
        Validators.min(1900),
        Validators.max(new Date().getFullYear() + 1)
      ]],
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

  // 👇 NUEVO: Método para normalizar errores del backend
  private normalizeErrorBody(err: HttpErrorResponse): {
    message: string;
    details: any | null;
  } {
    let body = err.error;

    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return { message: body, details: null };
      }
    }

    if (!body || typeof body !== 'object') {
      return { message: 'Error inesperado del servidor', details: null };
    }

    const message = body.message || 'Error inesperado del servidor';
    let details = body.details || null;

    // Mapeos basados en código de error y detección por mensaje
    if (!details && body.code) {
      let field: string | null = null;

      // Detectar por el mensaje del backend
      if (message.toLowerCase().includes('placa')) {
        field = 'placa';
      } else if (message.toLowerCase().includes('capacidad')) {
        field = 'capacidad';
      } else if (message.toLowerCase().includes('marca')) {
        field = 'marca';
      } else if (message.toLowerCase().includes('modelo')) {
        field = 'modelo';
      }

      // Mapeos explícitos por código (tienen prioridad)
      const fieldMappings: { [key: string]: string } = {
        'RSE_409': 'placa',
        'BUS_001': 'placa',
        'BUS_002': 'capacidad',
        'BUS_003': 'marca',
      };

      const mappedField = fieldMappings[body.code];
      if (mappedField) {
        field = mappedField;
      }

      if (field) {
        details = { [field]: message };
      }
    }

    return { message, details };
  }

  // 👇 NUEVO: Método para marcar errores en el formulario
  private markServerErrorsOnForm(details: { [key: string]: any } | null) {
    if (!details) return;

    const fieldMapping: { [key: string]: string } = {
      placa: 'placa',
      marca: 'marca',
      modelo: 'modelo',
      capacidad: 'capacidad',
      anio: 'anio',
    };

    Object.keys(details).forEach((key) => {
      if (key === 'error') return;

      const formFieldName = fieldMapping[key] || key;
      const control = this.busForm.get(formFieldName);

      if (control) {
        const val = details[key];
        control.setErrors({ server: val });
        control.markAsTouched();
      }
    });
  }

  // 👇 NUEVO: Método para limpiar errores
  private clearErrors() {
    this.formErrorMessage = null;
    this.formErrorDetails = null;
    Object.keys(this.busForm.controls || {}).forEach((k) => {
      const control = this.busForm.get(k);
      if (control?.errors?.['server']) {
        const { server, ...otherErrors } = control.errors;
        control.setErrors(Object.keys(otherErrors).length > 0 ? otherErrors : null);
      }
    });
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
        error: (error: HttpErrorResponse) => {
          this.loading = false;
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
          return 'Datos inválidos. Por favor revise la información ingresada.';
        case 409:
          return 'El bus ya existe en el sistema.';
        case 500:
          return 'Error del servidor. Por favor intente nuevamente.';
        default:
          return `Error ${error.status}: ${error.statusText || 'Error desconocido'}`;
      }
    }

    return 'No se pudo guardar el bus. Por favor, intente nuevamente.';
  }

  closeModal() {
    this.clearErrors(); // 👈 Limpiar errores al cerrar
    this.onClose.emit();
  }

  // 👇 NUEVOS: Métodos helper para el template
  hasFieldErrors(): boolean {
    if (!this.formErrorDetails) return false;
    const keys = Object.keys(this.formErrorDetails).filter(
      (k) => k !== 'error'
    );
    return keys.length > 0;
  }

  getFieldErrors(): Array<{ key: string; value: any }> {
    if (!this.formErrorDetails) return [];
    return Object.keys(this.formErrorDetails)
      .filter((k) => k !== 'error')
      .map((k) => ({ key: k, value: this.formErrorDetails![k] }));
  }

  translateFieldName(fieldName: string): string {
    const translations: { [key: string]: string } = {
      placa: 'Placa',
      marca: 'Marca',
      modelo: 'Modelo',
      capacidad: 'Capacidad',
      anio: 'Año',
      estado: 'Estado',
    };
    return translations[fieldName] || fieldName;
  }

  onlyNumbers(event: KeyboardEvent): void {
    const key = event.key;
    if (key.length === 1 && !/^\d$/.test(key)) {
      event.preventDefault();
    }
  }

  onlyAlphanumeric(event: KeyboardEvent): void {
    const key = event.key;
    if (key.length === 1 && !/^[a-zA-Z0-9]$/.test(key)) {
      event.preventDefault();
    }
  }
}
