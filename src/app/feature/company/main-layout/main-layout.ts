import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, ChildrenOutletContexts } from '@angular/router';
import { Slidebard } from '../components/layout/slidebard/slidebard';
import { fadeAnimation } from '../../../core/utils/route-animations';


@Component({
  selector: 'app-main-layout',
  standalone:true,
  imports: [CommonModule, RouterOutlet, Slidebard],
  templateUrl: './main-layout.html',
  animations: [fadeAnimation]
})
export class MainLayout {
  constructor(private contexts: ChildrenOutletContexts) {}

  getRouteAnimationData() {
    return this.contexts.getContext('primary')?.route?.snapshot?.data?.['animation'];
  }
  sidebarOpen = true;

  onSidebarToggle(isOpen: boolean): void {
    this.sidebarOpen = isOpen;
  }

  onLogout(): void {
    // El logout se maneja en el SessionService del Slidebard
  }
}
