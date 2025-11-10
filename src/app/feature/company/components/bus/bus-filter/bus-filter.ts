import { Component, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface BusFilterCriteria {
  search: string;
  estado?: string;
  ruta?: number;
}

@Component({
  selector: 'app-bus-filter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bus-filter.html',
})
export class BusFilter {
  @Output() filterChange = new EventEmitter<BusFilterCriteria>();
  @Output() onCreateNew = new EventEmitter<void>();

  searchTerm = signal('');
  selectedEstado = signal('');
  selectedRuta = signal<number | null>(null);

  onSearchChange(value: string) {
    this.searchTerm.set(value);
    this.emitFilterChange();
  }

  onEstadoChange(value: string) {
    this.selectedEstado.set(value);
    this.emitFilterChange();
  }

  onRutaChange(value: number | null) {
    this.selectedRuta.set(value);
    this.emitFilterChange();
  }

  clearFilters() {
    this.searchTerm.set('');
    this.selectedEstado.set('');
    this.selectedRuta.set(null);
    this.emitFilterChange();
  }

  createNewBus() {
    this.onCreateNew.emit();
  }

  private emitFilterChange() {
    const criteria: BusFilterCriteria = {
      search: this.searchTerm(),
      estado: this.selectedEstado() || undefined,
      ruta: this.selectedRuta() || undefined,
    };
    this.filterChange.emit(criteria);
  }
}
