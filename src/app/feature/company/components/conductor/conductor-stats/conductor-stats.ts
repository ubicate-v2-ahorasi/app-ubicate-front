import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConductorService } from '../../../service/chofer/chofer.service';

import type { ConductorStats } from '../../../models/conductores.model';

@Component({
  selector: 'app-conductor-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './conductor-stats.html',
})
export class ConductorStatsComponent implements OnInit {
  private conductorService = inject(ConductorService);

  stats?: ConductorStats;
  loading = false;
  error?: string;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = undefined;

    this.conductorService.getConductorStats().subscribe({
      next: (data) => {
        this.stats = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'No se pudieron cargar las estadísticas.';
        this.loading = false;
      },
    });
  }
}
