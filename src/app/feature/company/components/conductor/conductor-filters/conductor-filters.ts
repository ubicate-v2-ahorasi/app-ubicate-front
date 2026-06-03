import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type Estado = 'ACTIVO' | 'INACTIVO' | 'VACACIONES' | 'SUSPENDIDO';
type EstadoTodos = Estado | 'Todos';
type Turno = 'MANANA' | 'TARDE' | 'NOCHE';
type TurnoTodos = Turno | 'Todos';
export type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-conductor-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './conductor-filters.html',
})
export class ConductorFilters {
  searchTerm = '';
  selectedEstado: EstadoTodos = 'Todos';
  selectedCategoria = 'Todas';
  selectedTurno: TurnoTodos = 'Todos';
  sortDirection: SortDirection = 'desc';

  estados: EstadoTodos[] = ['Todos', 'ACTIVO', 'INACTIVO', 'VACACIONES', 'SUSPENDIDO'];
  categorias = ['Todas', 'A1', 'A2a', 'A2b', 'A3a', 'A3b', 'A3c'];
  turnos: TurnoTodos[] = ['Todos', 'MANANA', 'TARDE', 'NOCHE'];

  @Output() onSearch = new EventEmitter<string>();
  @Output() onEstadoChange = new EventEmitter<EstadoTodos>();
  @Output() onCategoriaChange = new EventEmitter<string>();
  @Output() onTurnoChange = new EventEmitter<TurnoTodos>();
  @Output() onSortDirectionChange = new EventEmitter<SortDirection>();
  @Output() onClearFilters = new EventEmitter<void>();
  @Output() onCreateNew = new EventEmitter<void>();

  hasActiveFilters(): boolean {
    return !!(
      this.searchTerm.trim() ||
      this.selectedEstado !== 'Todos' ||
      this.selectedCategoria !== 'Todas' ||
      this.selectedTurno !== 'Todos'
    );
  }

  onSearchInput() {
    this.onSearch.emit(this.searchTerm);
  }

  onEstadoSelect() {
    this.onEstadoChange.emit(this.selectedEstado);
  }

  onCategoriaSelect() {
    this.onCategoriaChange.emit(this.selectedCategoria);
  }

  onTurnoSelect() {
    this.onTurnoChange.emit(this.selectedTurno);
  }

  toggleSortDirection() {
    this.sortDirection = this.sortDirection === 'desc' ? 'asc' : 'desc';
    this.onSortDirectionChange.emit(this.sortDirection);
  }

  clearAllFilters() {
    this.searchTerm = '';
    this.selectedEstado = 'Todos';
    this.selectedCategoria = 'Todas';
    this.selectedTurno = 'Todos';
    this.onClearFilters.emit();
  }

  createNewConductor() {
    this.onCreateNew.emit();
  }
}
