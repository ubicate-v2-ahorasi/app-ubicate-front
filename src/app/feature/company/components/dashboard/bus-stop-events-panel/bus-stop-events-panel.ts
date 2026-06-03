import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../../../../core/service/theme.service';
import { SelectedBusDetails } from '../../../service/bus/bus-marker.service';
import { RouteStopPassageEvent } from '../../../models/route.model';
import { RouteService } from '../../../service/route/route.service';

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
export class BusStopEventsPanelComponent implements OnChanges {
  private themeService = inject(ThemeService);
  private routeService = inject(RouteService);
  private cdr = inject(ChangeDetectorRef);

  @Input({ required: true }) bus!: SelectedBusDetails;

  isDarkMode$ = this.themeService.isDarkMode$;
  loading = false;
  events: StopEventItem[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['bus']) {
      this.loadEvents();
    }
  }

  private loadEvents(): void {
    const routeId = this.bus?.ruta?.id;
    const busId = this.bus?.id;

    if (!routeId || !busId) {
      this.events = [];
      this.cdr.markForCheck();
      return;
    }

    this.loading = true;
    this.cdr.markForCheck();

    this.routeService.getRouteStopEvents(routeId, busId).subscribe({
      next: (events) => {
        this.events = events.map((event, index) =>
          this.mapEventToItem(event, index)
        );
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.events = [];
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private mapEventToItem(
    event: RouteStopPassageEvent,
    index: number
  ): StopEventItem {
    const tones: StopEventItem['tone'][] = ['blue', 'green', 'violet', 'red'];
    const stopName =
      event.route_stop_nombre ||
      event.route_stop_direccion ||
      `Parada ${event.route_stop_orden}`;

    return {
      time: this.formatTime(event.timestamp),
      title: `Paso por ${stopName}`,
      subtitle:
        event.conductor?.trim() || this.bus?.conductor?.trim() || this.bus?.placa,
      tone: tones[index % tones.length],
    };
  }

  private formatTime(value: string): string {
    try {
      return new Date(value).toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '--:--';
    }
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
