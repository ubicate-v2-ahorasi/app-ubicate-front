import { Component, Output, EventEmitter } from '@angular/core';

import { CommonModule } from '@angular/common';
import { BusCreate } from '../bus-create/bus-create';

@Component({
  selector: 'app-bus-header',
  standalone: true,
  imports: [CommonModule, BusCreate],
  templateUrl: './bus-header.html',
})
export class BusHeader {
  @Output() onCreateBus = new EventEmitter<void>();

  showCreateModal = false;

  openCreateModal() {
    this.showCreateModal = true;
  }

  closeCreateModal() {
    this.showCreateModal = false;
  }

  onBusCreated() {
    this.closeCreateModal();
    this.onCreateBus.emit();
  }
}
