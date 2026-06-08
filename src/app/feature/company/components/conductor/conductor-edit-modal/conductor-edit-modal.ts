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
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ConductorService } from '../../../service/chofer/chofer.service';
import {
  AnimatedSelectComponent,
  AnimatedSelectOption,
} from '../../shared/animated-select/animated-select';

@Component({
  selector: 'app-conductor-edit-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AnimatedSelectComponent],
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
  changingPassword = false;
  passwordErrorMessage: string | null = null;
  passwordSuccessMessage: string | null = null;
  showPassword = false;
  showConfirmPassword = false;
  showPasswordSection = false;

  estados = ['ACTIVO', 'INACTIVO', 'VACACIONES', 'SUSPENDIDO'];
  get estadoOptions(): AnimatedSelectOption<string>[] {
    return this.estados.map((estado) => ({ label: estado, value: estado }));
  }

  get busOptions(): AnimatedSelectOption<number | null>[] {
    return [
      { label: 'Sin bus asignado', value: null },
      ...this.buses.map((bus) => ({
        label: `${bus.placa} - ${bus.modelo || '-'}`,
        value: bus.id,
        disabled: !!(bus.conductorAsignadoId && bus.conductorAsignadoId !== this.conductor?.id),
      })),
    ];
  }

  ngOnInit() {
    this.initForm();
  }

  ngOnChanges() {
    if (this.conductorForm && this.conductor) {
      this.populateForm();
    }
  }

  initForm() {
    this.conductorForm = this.fb.group(
      {
        telefono: [
          '',
          [Validators.required, Validators.pattern(/^\d{9}$/), Validators.maxLength(9)],
        ],
        estado: ['ACTIVO'],
        busAsignadoId: [null],
        password: [
          '',
          [Validators.minLength(8), Validators.pattern(/^(?=.*\d)(?=.*[^A-Za-z0-9])(?=.*[A-Z]).+$/)],
        ],
        confirmPassword: [''],
      },
      {
        validators: [this.matchPasswordsValidator('password', 'confirmPassword')],
      }
    );
  }

  populateForm() {
    if (this.conductor) {
      this.conductorForm.patchValue({
        telefono: this.conductor.telefono || '',
        estado: this.conductor.estado || 'ACTIVO',
        busAsignadoId: this.conductor.busAsignadoId || null,
        password: '',
        confirmPassword: '',
      });
      this.passwordErrorMessage = null;
      this.passwordSuccessMessage = null;
      this.showPassword = false;
      this.showConfirmPassword = false;
      this.showPasswordSection = false;
      this.conductorForm.get('password')?.markAsPristine();
      this.conductorForm.get('confirmPassword')?.markAsPristine();
    }
  }

  resetForm() {
    this.conductorForm.reset({
      telefono: '',
      estado: 'ACTIVO',
      busAsignadoId: null,
      password: '',
      confirmPassword: '',
    });
    this.passwordErrorMessage = null;
    this.passwordSuccessMessage = null;
    this.showPassword = false;
    this.showConfirmPassword = false;
    this.showPasswordSection = false;
  }

  cancel() {
    this.resetForm();
    this.onCancel.emit();
  }

  onSubmit() {
    if (!this.isSubmitting && this.conductor && this.canSubmitProfile) {
      this.isSubmitting = true;
      const formData = this.conductorForm.value;

      this.conductorService
        .updateConductor(this.conductor.id, {
          telefono: formData.telefono,
          estado: formData.estado,
          busAsignadoId: formData.busAsignadoId,
        })
        .subscribe({
          next: () => {
            this.isSubmitting = false;
            this.resetPasswordFields();
            this.onSave.emit();
          },
          error: () => {
            this.isSubmitting = false;
          },
        });
    }
  }

  onChangePassword() {
    if (!this.conductor || this.changingPassword || !this.canSubmitPassword) {
      this.markPasswordFieldsTouched();
      return;
    }

    this.changingPassword = true;
    this.passwordErrorMessage = null;
    this.passwordSuccessMessage = null;

    const password = this.conductorForm.get('password')?.value;
    this.conductorService.changePassword(this.conductor.id, password).subscribe({
      next: () => {
        this.changingPassword = false;
        this.passwordSuccessMessage = 'Contraseña actualizada correctamente.';
        this.resetPasswordFields();
      },
      error: (err) => {
        this.changingPassword = false;
        this.passwordErrorMessage =
          err?.error?.message ?? err?.message ?? 'No se pudo actualizar la contraseña.';
      },
    });
  }

  get submitButtonText(): string {
    return this.isSubmitting ? 'Actualizando...' : 'Actualizar Conductor';
  }

  get canSubmitProfile(): boolean {
    return (
      !!this.conductorForm.get('telefono')?.valid &&
      !!this.conductorForm.get('estado')?.valid
    );
  }

  get canSubmitPassword(): boolean {
    const passwordControl = this.conductorForm.get('password');
    const confirmControl = this.conductorForm.get('confirmPassword');
    const password = passwordControl?.value as string;
    const confirm = confirmControl?.value as string;

    if (!password && !confirm) return false;

    return !!password && !!confirm && !passwordControl?.invalid && !this.conductorForm.errors?.['passwordsMismatch'];
  }

  get passwordValue(): string {
    return (this.conductorForm.get('password')?.value as string) || '';
  }

  get hasMinLength(): boolean {
    return this.passwordValue.length >= 8;
  }

  get hasNumber(): boolean {
    return /\d/.test(this.passwordValue);
  }

  get hasSymbol(): boolean {
    return /[^A-Za-z0-9]/.test(this.passwordValue);
  }

  get hasUppercase(): boolean {
    return /[A-Z]/.test(this.passwordValue);
  }

  deleteClick() {
    this.onDelete.emit();
  }

  togglePasswordSection() {
    this.showPasswordSection = !this.showPasswordSection;

    if (!this.showPasswordSection) {
      this.passwordErrorMessage = null;
      this.passwordSuccessMessage = null;
      this.showPassword = false;
      this.showConfirmPassword = false;
      this.resetPasswordFields();
    }
  }

  onlyNumbers(event: KeyboardEvent): void {
    const key = event.key;
    if (key.length === 1 && !/^\d$/.test(key)) {
      event.preventDefault();
    }
  }

  private resetPasswordFields() {
    this.conductorForm.patchValue({
      password: '',
      confirmPassword: '',
    });
    this.conductorForm.get('password')?.markAsPristine();
    this.conductorForm.get('password')?.markAsUntouched();
    this.conductorForm.get('confirmPassword')?.markAsPristine();
    this.conductorForm.get('confirmPassword')?.markAsUntouched();
  }

  private markPasswordFieldsTouched() {
    this.conductorForm.get('password')?.markAsTouched();
    this.conductorForm.get('confirmPassword')?.markAsTouched();
  }

  private matchPasswordsValidator(passwordKey: string, confirmKey: string): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const password = group.get(passwordKey)?.value;
      const confirmPassword = group.get(confirmKey)?.value;

      if (!password && !confirmPassword) {
        return null;
      }

      if (!password || !confirmPassword) {
        return { passwordsMismatch: true };
      }

      return password === confirmPassword ? null : { passwordsMismatch: true };
    };
  }
}
