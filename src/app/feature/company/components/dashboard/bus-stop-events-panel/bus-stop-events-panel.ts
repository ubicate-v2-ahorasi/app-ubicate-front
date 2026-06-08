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
import { forkJoin } from 'rxjs';
import { ThemeService } from '../../../../../core/service/theme.service';
import { SelectedBusDetails } from '../../../service/bus/bus-marker.service';
import {
  RouteStopPassageEvent,
  RouteStopResponse,
} from '../../../models/route.model';
import { RouteService } from '../../../service/route/route.service';

interface StopEventItem {
  time: string;
  title: string;
  subtitle: string;
  tone: 'green' | 'blue' | 'violet' | 'red';
  crossed: boolean;
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
  @Input() routeId: number | null = null;

  isDarkMode$ = this.themeService.isDarkMode$;
  loading = false;
  events: StopEventItem[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['bus'] || changes['routeId']) {
      this.loadEvents();
    }
  }

  private loadEvents(): void {
    const routeId = this.routeId ?? this.bus?.ruta?.id;
    const busId = this.bus?.id;

    if (!routeId || !busId) {
      this.events = [];
      this.cdr.markForCheck();
      return;
    }

    this.loading = true;
    this.cdr.markForCheck();

    forkJoin({
      stops: this.routeService.getRouteStops(routeId),
      passages: this.routeService.getRouteStopEvents(routeId, busId),
    }).subscribe({
      next: ({ stops, passages }) => {
        this.events = this.mapStopsToItems(stops, passages);
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

  private mapStopsToItems(
    stops: RouteStopResponse[],
    passages: RouteStopPassageEvent[]
  ): StopEventItem[] {
    const latestPassageByStop = new Map<number, RouteStopPassageEvent>();

    for (const passage of passages) {
      const current = latestPassageByStop.get(passage.route_stop_id);
      if (
        !current ||
        new Date(passage.timestamp).getTime() > new Date(current.timestamp).getTime()
      ) {
        latestPassageByStop.set(passage.route_stop_id, passage);
      }
    }

    return [...stops]
      .sort((a, b) => a.orden - b.orden)
      .map((stop, index) => this.mapStopToItem(stop, latestPassageByStop.get(stop.id), index));
  }

  private mapStopToItem(
    stop: RouteStopResponse,
    passage: RouteStopPassageEvent | undefined,
    index: number
  ): StopEventItem {
    const tones: StopEventItem['tone'][] = ['blue', 'green', 'violet'];
    const stopName =
      stop.nombre ||
      stop.direccion ||
      `Parada ${stop.orden}`;

    return {
      time: passage ? this.formatTime(passage.timestamp) : 'Pendiente',
      title: `${stop.orden}. ${stopName}`,
      subtitle: passage
        ? passage.conductor?.trim() || this.bus?.conductor?.trim() || this.bus?.placa
        : 'Sin cruce registrado',
      tone: passage ? 'green' : tones[index % tones.length],
      crossed: !!passage,
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
