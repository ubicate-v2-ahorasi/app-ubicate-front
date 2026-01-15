import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, ChildrenOutletContexts } from '@angular/router';
import { Slidebard } from '../components/layout/slidebard/slidebard';
import { fadeAnimation } from '../../../core/utils/route-animations';
import { OnboardingTourComponent, TourStep } from '../components/shared/onboarding-tour/onboarding-tour';
import { AccessibilityControlsComponent } from '../components/shared/accessibility-controls/accessibility-controls';


@Component({
  selector: 'app-main-layout',
  standalone:true,
  imports: [CommonModule, RouterOutlet, Slidebard, OnboardingTourComponent, AccessibilityControlsComponent],
  templateUrl: './main-layout.html',
  animations: [fadeAnimation]
})
export class MainLayout implements OnInit {
  showTour = false;
  tourSteps: TourStep[] = [
    {
      title: '¡Bienvenido a Ubicate!',
      description: 'Te guiaremos por las principales funciones de la plataforma. Haz clic en "Siguiente" para comenzar.',
      targetSelector: '#tour-sidebar-menu',
      position: 'right'
    },
    {
      title: 'Dashboard',
      description: 'Visualiza en tiempo real la ubicación de todos tus buses en el mapa. Puedes cambiar entre vista horizontal y vertical.',
      targetSelector: '#tour-menu-dashboard',
      position: 'right'
    },
    {
      title: 'Gestión de Conductores',
      description: 'Administra tu equipo: agrega conductores, edita su información, visualiza estadísticas y asigna buses.',
      targetSelector: '#tour-menu-users',
      position: 'right'
    },
    {
      title: 'Control de Buses',
      description: 'Gestiona tu flota completa: agrega vehículos, edita detalles, monitorea su estado y asigna conductores.',
      targetSelector: '#tour-menu-buses',
      position: 'right'
    },
    {
      title: 'Comentarios',
      description: 'Revisa el feedback de los usuarios sobre el servicio para mejorar continuamente.',
      targetSelector: '#tour-menu-comments',
      position: 'right'
    }
  ];

  constructor(private contexts: ChildrenOutletContexts) {}

  ngOnInit(): void {
    // Verificar si es la primera vez que el usuario accede
    const hasSeenTour = localStorage.getItem('ubicate_tour_completed');
    if (!hasSeenTour) {
      setTimeout(() => {
        this.showTour = true;
      }, 500);
    }
  }

  onTourComplete(): void {
    localStorage.setItem('ubicate_tour_completed', 'true');
    this.showTour = false;
  }

  onTourSkipped(): void {
    localStorage.setItem('ubicate_tour_completed', 'true');
    this.showTour = false;
  }

  startTour(): void {
    this.showTour = true;
  }

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
