import {
  ChangeDetectionStrategy,
  Component,
  Input,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../../../../core/service/theme.service';
import { SelectedBusDetails } from '../../../service/bus/bus-marker.service';

interface StopEventItem {
  time: string;
  title: string;
  subtitle: string;
  tone: 'green' | 'blue' | 'violet' | 'red';
}

@Component({
  selector: 'app-bus-stop-events-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bus-stop-events-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusStopEventsPanelComponent {
  private themeService = inject(ThemeService);

  @Input({ required: true }) bus!: SelectedBusDetails;

  isDarkMode$ = this.themeService.isDarkMode$;

  get events(): StopEventItem[] {
    const plate = this.bus?.placa || 'VHC-001';

    return [
      {
        time: '08:45 AM',
        title: 'Cruzo Parada Central',
        subtitle: `${plate} - Av. Espana`,
        tone: 'blue',
      },
      {
        time: '08:30 AM',
        title: 'Cruzo Paradero Los Pinos',
        subtitle: `${plate} - Bodega Principal`,
        tone: 'green',
      },
      {
        time: '08:15 AM',
        title: 'Cruzo Parada Mercado Norte',
        subtitle: `${plate} - Zona Comercial`,
        tone: 'violet',
      },
      {
        time: '08:00 AM',
        title: 'Salida desde Patio',
        subtitle: `${plate} - Terminal Norte`,
        tone: 'red',
      },
    ];
  }

  getToneClasses(tone: StopEventItem['tone']): string {
    switch (tone) {
      case 'green':
        return 'bg-emerald-500/18 text-emerald-300 border border-emerald-400/20';
      case 'blue':
        return 'bg-sky-500/18 text-sky-300 border border-sky-400/20';
      case 'violet':
        return 'bg-violet-500/18 text-violet-300 border border-violet-400/20';
      case 'red':
        return 'bg-rose-500/18 text-rose-300 border border-rose-400/20';
    }
  }

  getToneClassesLight(tone: StopEventItem['tone']): string {
    switch (tone) {
      case 'green':
        return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
      case 'blue':
        return 'bg-sky-50 text-sky-600 border border-sky-100';
      case 'violet':
        return 'bg-violet-50 text-violet-600 border border-violet-100';
      case 'red':
        return 'bg-rose-50 text-rose-600 border border-rose-100';
    }
  }
}
