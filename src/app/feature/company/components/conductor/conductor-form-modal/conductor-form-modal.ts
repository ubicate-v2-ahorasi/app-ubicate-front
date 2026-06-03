import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  inject,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { ConductorService } from '../../../service/chofer/chofer.service';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { DatePickerModule } from 'primeng/datepicker';

@Component({
  selector: 'app-conductor-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePickerModule],
  templateUrl: './conductor-form-modal.html',
})
export class ConductorFormModal implements OnInit {
  private fb = inject(FormBuilder);
  private conductorService = inject(ConductorService);

  @Input() isVisible = false;
  @Input() conductor: any = null;
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<void>();

  conductorForm!: FormGroup;
  isSubmitting = false;
  isEditMode = false;
  errorMessage = '';

  showCredentials = false;
  createdCredentials: any = null;

  formErrorMessage: string | null = null;
  formErrorDetails: { [key: string]: any } | null = null;

  categorias = ['A1', 'A2a', 'A2b', 'A3a', 'A3b', 'A3c'];

  private onlyLettersValidator(control: any) {
    const value = control.value;
    if (!value) return null;
    const valid = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(value);
    return valid ? null : { onlyLetters: true };
  }

  private onlyNumbersValidator(control: any) {
    const value = control.value;
    if (!value) return null;
    const valid = /^\d+$/.test(value);
    return valid ? null : { onlyNumbers: true };
  }

  private plateValidator(control: any) {
    const value = control.value;
    if (!value) return null;
    const valid = /^[a-zA-Z0-9]{0,6}$/.test(value);
    return valid ? null : { invalidPlate: true };
  }

  ngOnInit() {
    this.initForm();
  }

  ngOnChanges() {
    if (this.conductorForm) {
      if (this.conductor) {
        this.isEditMode = true;
        this.populateForm();
      } else {
        this.isEditMode = false;
        this.resetForm();
      }
    }
  }

  initForm() {
    this.conductorForm = this.fb.group({
      nombre: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(30),
          this.onlyLettersValidator,
        ],
      ],
      apellido: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(30),
          this.onlyLettersValidator,
        ],
      ],
      dni: [
        '',
        [
          Validators.required,
          Validators.pattern(/^\d{8}$/),
          this.onlyNumbersValidator,
        ],
      ],
      telefono: [
        '',
        [
          Validators.required,
          Validators.minLength(9),
          Validators.maxLength(9),
          this.onlyNumbersValidator,
        ],
      ],
      email: ['', [Validators.required, Validators.email]],
      numeroLicencia: [
        '',
        [Validators.required, Validators.maxLength(6), this.plateValidator],
      ],
      categoriaLicencia: ['', [Validators.required]],
      fechaVencimientoLicencia: ['', [Validators.required]],
    });
  }

  populateForm() {
    if (this.conductor) {
      const nombreCompleto = this.conductor.nombre_completo || '';
      const partes = nombreCompleto.trim().split(' ');
      const nombre = partes[0] || '';
      const apellido = partes.slice(1).join(' ') || '';
      this.conductorForm.patchValue({
        nombre: nombre,
        apellido: apellido,
        dni: this.conductor.dni || '',
        telefono: this.conductor.telefono || '',
        email: this.conductor.email || '',
        numeroLicencia: this.conductor.numero_licencia || '',
        categoriaLicencia: this.conductor.categoria_licencia || '',
        fechaVencimientoLicencia:
          this.conductor.fecha_vencimiento_licencia || '',
      });
      this.clearErrors();
    }
  }

  resetForm() {
    this.conductorForm.reset({
      nombre: '',
      apellido: '',
      categoriaLicencia: '',
    });
    this.errorMessage = '';
    this.showCredentials = false;
    this.createdCredentials = null;
    this.clearErrors();
  }

  clearErrors() {
    this.formErrorMessage = null;
    this.formErrorDetails = null;
    Object.keys(this.conductorForm.controls || {}).forEach((k) => {
      this.conductorForm.get(k)?.setErrors(null);
    });
  }

  cancel() {
    this.resetForm();
    this.onCancel.emit();
  }

  closeCredentials() {
    this.showCredentials = false;
    this.createdCredentials = null;
    this.resetForm();
    this.onSave.emit();
  }

  sendToWhatsApp() {
    const phoneNumber = this.createdCredentials?.telefono || '';
    const email = this.createdCredentials?.email || '';
    const password = this.createdCredentials?.password || '';
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const message = `🚗 *Credenciales de Acceso*

📧 *Email:* ${email}
🔐 *Contraseña:* ${password}

Cambia tu contraseña en el primer acceso.`;
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
      message
    )}`;
    window.open(whatsappUrl, '_blank');
  }

  onSubmit() {
    if (this.conductorForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      this.errorMessage = '';
      const formData = this.conductorForm.value;

      if (this.isEditMode) {
        this.conductorService
          .updateConductor(this.conductor.id, formData)
          .subscribe({
            next: () => {
              this.isSubmitting = false;
              this.resetForm();
              this.onSave.emit();
            },
            error: (error) => {
              this.isSubmitting = false;
              this.errorMessage = this.parseErrorMessage(error);
            },
          });
      } else {
        this.conductorService.createConductor(formData).subscribe({
          next: (response) => {
            this.isSubmitting = false;
            this.createdCredentials = {
              email: formData.email,
              telefono: formData.telefono,
              password: response.temp_password,
            };
            this.showCredentials = true;
          },
          error: (error) => {
            this.isSubmitting = false;
            this.errorMessage = this.parseErrorMessage(error);
          },
        });
      }
    }
  }

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

    // Mapeos personalizados basados en código de error y mensaje
    if (!details && body.code) {
      // Determinar el campo basado en el mensaje
      let field: string | null = null;

      // Detectar por el mensaje del backend
      if (message.toLowerCase().includes('dni')) {
        field = 'dni';
      } else if (
        message.toLowerCase().includes('teléfono') ||
        message.toLowerCase().includes('telefono')
      ) {
        field = 'telefono';
      } else if (
        message.toLowerCase().includes('email') ||
        message.toLowerCase().includes('correo')
      ) {
        field = 'email';
      } else if (message.toLowerCase().includes('licencia')) {
        field = 'numeroLicencia';
      }

      // Mapeos explícitos por código (tienen prioridad)
      const fieldMappings: { [key: string]: string } = {
        USER_001: 'email',
        USER_002: 'dni',
        USER_003: 'telefono',
        CONDUCTOR_001: 'numeroLicencia',
        CONDUCTOR_002: 'dni',
        CONDUCTOR_003: 'email',
      };

      // Si hay mapeo explícito, usarlo; si no, usar el detectado por mensaje
      const mappedField = fieldMappings[body.code];
      if (mappedField) {
        field = mappedField;
      }

      // Si encontramos un campo, crear el detalle
      if (field) {
        details = { [field]: message };
      }
    }

    return { message, details };
  }

  private markServerErrorsOnForm(details: { [key: string]: any } | null) {
    if (!details) return;

    const fieldMapping: { [key: string]: string } = {
      email: 'email',
      dni: 'dni',
      telefono: 'telefono',
      numeroLicencia: 'numeroLicencia',
      numero_licencia: 'numeroLicencia',
    };

    Object.keys(details).forEach((key) => {
      if (key === 'error') return;

      const formFieldName = fieldMapping[key] || key;
      const control = this.conductorForm.get(formFieldName);

      if (control) {
        const val = details[key];
        control.setErrors({ server: val });
        control.markAsTouched();
      }
    });
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
          return 'El registro ya existe en el sistema.';
        case 500:
          return 'Error del servidor. Por favor intente nuevamente.';
        default:
          return `Error ${error.status}: ${error.statusText || 'Error desconocido'}`;
      }
    }

    // Error genérico
    return 'No se pudo guardar la información. Por favor, intente nuevamente.';
  }

  onlyLetters(event: KeyboardEvent): void {
    const key = event.key;
    if (key.length === 1 && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]$/.test(key)) {
      event.preventDefault();
    }
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
      email: 'Email',
      dni: 'DNI',
      telefono: 'Teléfono',
      numeroLicencia: 'Número de Licencia',
      numero_licencia: 'Número de Licencia',
      nombre: 'Nombres',
      apellido: 'Apellidos',
      categoriaLicencia: 'Categoría',
      categoria_licencia: 'Categoría',
      fechaVencimientoLicencia: 'Fecha de Vencimiento',
      fecha_vencimiento_licencia: 'Fecha de Vencimiento',
    };
    return translations[fieldName] || fieldName;
  }
}
