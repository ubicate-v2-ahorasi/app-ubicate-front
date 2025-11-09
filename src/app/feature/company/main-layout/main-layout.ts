import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Slidebard } from '../components/layout/slidebard/slidebard';


@Component({
  selector: 'app-main-layout',
  standalone:true,
  imports: [CommonModule, RouterOutlet, Slidebard],
  templateUrl: './main-layout.html'
})
export class MainLayout {
  sidebarOpen = true;

  onSidebarToggle(isOpen: boolean): void {
    this.sidebarOpen = isOpen;
  }

  onLogout(): void {
    // El logout se maneja en el SessionService del Slidebard
    console.log('Logout event received');
  }
}
