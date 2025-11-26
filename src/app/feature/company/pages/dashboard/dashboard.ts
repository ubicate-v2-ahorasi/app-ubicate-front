import { Component, OnInit } from '@angular/core';
import { Stats } from '../../components/dashboard/stats/stats';
import { MapContainerComponent } from '../../components/dashboard/map-container/map-container';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [Stats, MapContainerComponent, CommonModule],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  isVerticalLayout = false;
  sidebarWidth = 400; // Ancho inicial en píxeles
  isResizing = false;

  ngOnInit() {
    // Cargar configuración guardada
    const savedLayout = localStorage.getItem('dashboardLayout');
    const savedWidth = localStorage.getItem('dashboardSidebarWidth');
    
    if (savedLayout) {
      this.isVerticalLayout = savedLayout === 'vertical';
    }
    
    if (savedWidth) {
      this.sidebarWidth = parseInt(savedWidth, 10);
    }
  }

  toggleLayout() {
    this.isVerticalLayout = !this.isVerticalLayout;
    localStorage.setItem('dashboardLayout', this.isVerticalLayout ? 'vertical' : 'horizontal');
  }

  onMouseDown(event: MouseEvent) {
    if (!this.isVerticalLayout) return;
    
    this.isResizing = true;
    event.preventDefault();
    
    const startX = event.clientX;
    const startWidth = this.sidebarWidth;

    const onMouseMove = (e: MouseEvent) => {
      if (!this.isResizing) return;
      
      const deltaX = startX - e.clientX;
      const newWidth = Math.max(280, Math.min(600, startWidth + deltaX));
      this.sidebarWidth = newWidth;
    };

    const onMouseUp = () => {
      this.isResizing = false;
      localStorage.setItem('dashboardSidebarWidth', this.sidebarWidth.toString());
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }
}
