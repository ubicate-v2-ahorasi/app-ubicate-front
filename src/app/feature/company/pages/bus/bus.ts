// bus.component.ts
import { Component, ViewChild } from '@angular/core';
import { BusHeader } from '../../components/bus/bus-header/bus-header';
import {
  BusFilter,
  BusFilterCriteria,
} from '../../components/bus/bus-filter/bus-filter';
import { BusList } from '../../components/bus/bus-list/bus-list';
import { BusCreate } from '../../components/bus/bus-create/bus-create';

@Component({
  selector: 'app-bus',
  imports: [BusHeader, BusFilter, BusList, BusCreate],
  templateUrl: './bus.html',
})
export class Bus {
  @ViewChild(BusList) busList!: BusList;

  showCreateModal = false;

  openCreateModal() {
    this.showCreateModal = true;
  }

  closeCreateModal() {
    this.showCreateModal = false;
  }

  onBusCreated() {
    this.closeCreateModal();
    if (this.busList) {
      this.busList.loadBuses();
    }
  }

  // Manejar cambio de filtros
  onFilterChange(criteria: BusFilterCriteria) {
    console.log('🔍 Filtros recibidos en componente padre:', criteria);
    if (this.busList) {
      this.busList.onFilterChange(criteria);
    }
  }
}
