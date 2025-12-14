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
import { ErrorNotification } from '../../shared/error-notification';

@Component({
  selector: 'app-conductor-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ErrorNotification],
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

  categorias = ['A1', 'A2a', 'A2b', 'A3a', 'A3b', 'A3c'];

  // Validadores personalizados
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
      nombre: ['', [
        Validators.required, 
        Validators.minLength(2),
        Validators.maxLength(30),
        this.onlyLettersValidator
      ]],
      apellido: ['', [
        Validators.required, 
        Validators.minLength(2),
        Validators.maxLength(30),
        this.onlyLettersValidator
      ]],
      dni: ['', [
        Validators.required, 
        Validators.pattern(/^\d{8}$/),
        this.onlyNumbersValidator
      ]],
      telefono: ['', [
        Validators.required,
        Validators.minLength(9),
        Validators.maxLength(9),
        this.onlyNumbersValidator
      ]],
      email: ['', [Validators.required, Validators.email]],
      numeroLicencia: ['', [
        Validators.required,
        Validators.maxLength(6),
        this.plateValidator
      ]],
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
    } else {
      Object.keys(this.conductorForm.controls).forEach((key) => {
        this.conductorForm.get(key)?.markAsTouched();
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
    // Permitir teclas de control (backspace, delete, arrows, etc.)
    if (key.length === 1 && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]$/.test(key)) {
      event.preventDefault();
    }
  }

  onlyNumbers(event: KeyboardEvent): void {
    const key = event.key;
    // Permitir teclas de control (backspace, delete, arrows, etc.)
    if (key.length === 1 && !/^\d$/.test(key)) {
      event.preventDefault();
    }
  }

  onlyAlphanumeric(event: KeyboardEvent): void {
    const key = event.key;
    // Permitir teclas de control (backspace, delete, arrows, etc.)
    if (key.length === 1 && !/^[a-zA-Z0-9]$/.test(key)) {
      event.preventDefault();
    }
  }
}
