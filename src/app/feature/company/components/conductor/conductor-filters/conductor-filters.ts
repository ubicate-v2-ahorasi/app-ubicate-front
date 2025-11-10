import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Tipos alineados al backend
type Estado = 'ACTIVO' | 'INACTIVO' | 'VACACIONES' | 'SUSPENDIDO';
type EstadoTodos = Estado | 'Todos';
type Turno = 'MANANA' | 'TARDE' | 'NOCHE';
type TurnoTodos = Turno | 'Todos';

@Component({
  selector: 'app-conductor-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './conductor-filters.html',
})
export class ConductorFilters {
  // Valores de los filtros (tipados)
  searchTerm = '';
  selectedEstado: EstadoTodos = 'Todos';
  selectedCategoria = 'Todas';
  selectedTurno: TurnoTodos = 'Todos';

  // Opciones selects (coinciden con enums del backend)
  estados: EstadoTodos[] = [
    'Todos',
    'ACTIVO',
    'INACTIVO',
    'VACACIONES',
    'SUSPENDIDO',
  ];
  categorias = ['Todas', 'A1', 'A2a', 'A2b', 'A3a', 'A3b', 'A3c'];
  turnos: TurnoTodos[] = ['Todos', 'MANANA', 'TARDE', 'NOCHE']; 

  // Eventos tipados
  @Output() onSearch = new EventEmitter<string>();
  @Output() onEstadoChange = new EventEmitter<EstadoTodos>();
  @Output() onCategoriaChange = new EventEmitter<string>();
  @Output() onTurnoChange = new EventEmitter<TurnoTodos>();
  @Output() onClearFilters = new EventEmitter<void>();
  @Output() onCreateNew = new EventEmitter<void>();

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
