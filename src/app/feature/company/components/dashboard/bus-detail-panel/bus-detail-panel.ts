import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  animate,
  keyframes,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { IconsModule } from '../../../icons.module';
import { SelectedBusDetails } from '../../../service/bus/bus-marker.service';
import { ThemeService } from '../../../../../core/service/theme.service';

@Component({
  selector: 'app-bus-detail-panel',
  standalone: true,
  imports: [CommonModule, IconsModule],
  templateUrl: './bus-detail-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('panelAnimation', [
      transition(':enter', [
        animate(
          '220ms cubic-bezier(0.22, 1, 0.36, 1)',
          keyframes([
            style({
              opacity: 0,
              transform: 'translateX(18px) scale(0.985)',
              offset: 0,
            }),
            style({
              opacity: 1,
              transform: 'translateX(0) scale(1)',
              offset: 1,
            }),
          ])
        ),
      ]),
      transition(':leave', [
        animate(
          '180ms cubic-bezier(0.4, 0, 1, 1)',
          keyframes([
            style({
              opacity: 1,
              transform: 'translateX(0) scale(1)',
              offset: 0,
            }),
            style({
              opacity: 0,
              transform: 'translateX(20px) scale(0.985)',
              offset: 1,
            }),
          ])
        ),
      ]),
      transition('* <=> *', [
        animate(
          '180ms ease-out',
          keyframes([
            style({
              opacity: 0.78,
              transform: 'translateY(6px) scale(0.992)',
              offset: 0,
            }),
            style({
              opacity: 1,
              transform: 'translateY(0) scale(1)',
              offset: 1,
            }),
          ])
        ),
      ]),
    ]),
  ],
})
export class BusDetailPanelComponent {
  private themeService = inject(ThemeService);

  @Input({ required: true }) bus!: SelectedBusDetails;

  @Output() closed = new EventEmitter<void>();

  isDarkMode$ = this.themeService.isDarkMode$;

  get animationKey(): string {
    return String(this.bus?.id ?? '');
  }

  close(): void {
    this.closed.emit();
  }

  get statusLabel(): string {
    if (this.bus.activo && this.bus.velocidad && this.bus.velocidad > 0) {
      return 'En movimiento';
    }

    if (this.bus.activo) {
      return 'Activo';
    }

    return 'Inactivo';
  }

  get statusClasses(): string {
    if (this.bus.activo && this.bus.velocidad && this.bus.velocidad > 0) {
      return 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.45)]';
    }

    if (this.bus.activo) {
      return 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.35)]';
    }

    return 'bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.35)]';
  }

  get formattedUpdatedAt(): string {
    const timestamp = this.bus.timestamp || this.bus.lastUpdate;
    if (!timestamp || Number.isNaN(timestamp)) {
      return 'Sin datos';
    }

    const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (diffSeconds < 60) {
      return `Hace ${diffSeconds || 1} segundos`;
    }

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) {
      return `Hace ${diffMinutes} min`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `Hace ${diffHours} h`;
    }

    const diffDays = Math.floor(diffHours / 24);
    return `Hace ${diffDays} d`;
  }

  get busBrandModel(): string {
    const marca = this.bus.busInfo?.marca;
    const modelo = this.bus.busInfo?.modelo ?? this.bus.modelo;
    return [marca, modelo].filter(Boolean).join(' ') || 'Sin registro';
  }

  get busCapacity(): string {
    const capacidad = this.bus.busInfo?.capacidad;
    return capacidad != null ? `${capacidad} pasajeros` : 'Sin registro';
  }

  get busYear(): string {
    const anio = this.bus.busInfo?.anio;
    return anio != null ? String(anio) : 'Sin registro';
  }

  get routeName(): string {
    const ruta = this.bus.busInfo?.ruta ?? this.bus.ruta;
    if (!ruta) {
      return 'Sin ruta asignada';
    }

    return [ruta.codigo, ruta.nombre].filter(Boolean).join(' - ');
  }

  get conductorName(): string {
    const conductor = this.bus.conductorInfo as any;
    const fullName =
      conductor?.nombreCompleto ??
      conductor?.nombre_completo ??
      [conductor?.nombre, conductor?.apellido].filter(Boolean).join(' ');

    return fullName?.trim() || this.bus.conductor || 'No asignado';
  }

  get conductorDni(): string {
    return this.bus.conductorInfo?.dni || 'Sin registro';
  }

  get conductorPhone(): string {
    return this.bus.conductorInfo?.telefono || 'Sin registro';
  }

  get conductorLicense(): string {
    const conductor = this.bus.conductorInfo as any;
    return conductor?.numeroLicencia || conductor?.numero_licencia || 'Sin registro';
  }

  get conductorCategory(): string {
    const conductor = this.bus.conductorInfo as any;
    return conductor?.categoriaLicencia || conductor?.categoria_licencia || 'Sin registro';
  }

  get conductorStatus(): string {
    return this.bus.conductorInfo?.estado || 'Sin registro';
  }

  get hasConductorInfo(): boolean {
    return !!this.bus.conductorInfo;
  }
}
