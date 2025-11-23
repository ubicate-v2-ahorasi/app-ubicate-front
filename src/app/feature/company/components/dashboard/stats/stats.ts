import { Component, OnInit, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BusService } from '../../../service/bus/bus.service';
import { BusesStats } from '../../../models/buses.model';

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stats.html',
})
export class Stats implements OnInit {
  private busService = inject(BusService);

  @Input() isVerticalLayout = false;
  stats?: BusesStats;

  ngOnInit(): void {
    this.busService.getBusStats().subscribe({
      next: (data) => (this.stats = data),
      error: (err) => console.error('Error al obtener estadísticas', err),
    });
  }
}
