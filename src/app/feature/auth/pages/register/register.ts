import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { RegisterRequest } from '../../models/auth.model';
import { AuthService } from '../../service/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.html',
})
export class Register {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  registerForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor() {
    this.registerForm = this.fb.group({
      // Empresa
      nombreEmpresa: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(100),
        ],
      ],
      ruc: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
      direccion: ['', [Validators.maxLength(200)]],
      // ✅ LOGO REMOVIDO

      // Representante
      nombre: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(50),
        ],
      ],
      apellido: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(50),
        ],
      ],
      dni: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
      telefono: [
        '',
        [Validators.required, Validators.pattern(/^[+]?[0-9]{9,15}$/)],
      ],

      // Credenciales
      email: [
        '',
        [Validators.required, Validators.email, Validators.maxLength(100)],
      ],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
          ),
        ],
      ],
    });
  }

  onSubmit(): void {
    if (this.registerForm.valid && !this.isLoading) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const registerData: RegisterRequest = {
        email: this.registerForm.value.email,
        nombre: this.registerForm.value.nombre,
        apellido: this.registerForm.value.apellido,
        telefono: this.registerForm.value.telefono,
        password: this.registerForm.value.password,
        dni: this.registerForm.value.dni,
        nombreEmpresa: this.registerForm.value.nombreEmpresa,
        ruc: this.registerForm.value.ruc,
        direccion: this.registerForm.value.direccion || '',
        // ✅ LOGO REMOVIDO
      };

      this.authService.register(registerData).subscribe({
        next: (response) => {
          this.successMessage =
            'Empresa registrada exitosamente. Redirigiendo...';
          setTimeout(() => {
            this.router.navigate(['/company']);
          }, 2000);
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Error de registro:', error);

          if (error.error?.details) {
            const details = error.error.details;
            this.errorMessage = Object.values(details).join(', ');
          } else if (error.error?.message) {
            this.errorMessage = error.error.message;
          } else {
            this.errorMessage =
              'Error al registrar la empresa. Intenta nuevamente.';
          }
        },
        complete: () => {
          this.isLoading = false;
        },
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.registerForm.controls).forEach((key) => {
      const control = this.registerForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }
}
