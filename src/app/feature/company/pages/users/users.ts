import { Component, ViewChild } from '@angular/core';
import { ConductorHeader } from '../../components/conductor/conductor-header/conductor-header';
import { ConductorTable } from '../../components/conductor/conductor-table/conductor-table';
import { ConductorPagination } from '../../components/conductor/conductor-pagination/conductor-pagination';
import { ConductorFormModal } from '../../components/conductor/conductor-form-modal/conductor-form-modal';
import { ConductorDeleteModal } from '../../components/conductor/conductor-delete-modal/conductor-delete-modal';
import { ConductorStatsComponent } from '../../components/conductor/conductor-stats/conductor-stats';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    ConductorHeader,
    ConductorStatsComponent,
    ConductorTable,
    ConductorPagination,
    ConductorFormModal,
    ConductorDeleteModal,
  ],
  templateUrl: './users.html',
})
export class Users {
  @ViewChild(ConductorTable) conductorTable!: ConductorTable;

  isModalVisible = false;
  isEditModalVisible = false;
  selectedConductor: any = null;
  buses: any[] = [];

  openCreateModal() {
    this.isModalVisible = true;
  }

  openEditModal(conductor: any) {
    this.selectedConductor = conductor;
    this.isEditModalVisible = true;
  }

  closeModal() {
    this.isModalVisible = false;
  }

  closeEditModal() {
    this.isEditModalVisible = false;
    this.selectedConductor = null;
  }

  onConductorSaved() {
    this.closeModal();
    this.closeEditModal();
    this.conductorTable.loadConductores();
  }
}
