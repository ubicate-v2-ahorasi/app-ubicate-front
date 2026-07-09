import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, ChildrenOutletContexts } from '@angular/router';
import { Slidebard } from '../components/layout/slidebard/slidebard';
import { fadeAnimation } from '../../../core/utils/route-animations';
import { OnboardingTourComponent, TourStep } from '../components/shared/onboarding-tour/onboarding-tour';
import { AccessibilityControlsComponent } from '../components/shared/accessibility-controls/accessibility-controls';
import { SenalNotificationComponent } from '../components/shared/senal-notification/senal-notification';
import { RealtimeService, SenalNotification } from '../../../core/service/realtime.service';
import { Subscription } from 'rxjs';


@Component({
  selector: 'app-main-layout',
  standalone:true,
  imports: [CommonModule, RouterOutlet, Slidebard, OnboardingTourComponent, AccessibilityControlsComponent, SenalNotificationComponent],
  templateUrl: './main-layout.html',
  animations: [fadeAnimation]
})
export class MainLayout implements OnInit, OnDestroy {
  showTour = false;
  showNotification = false;
  currentNotification!: SenalNotification;
  
  private notificationSubscription?: Subscription;
  private empresaId?: number;

  tourSteps: TourStep[] = [
    {
      title: '¡Bienvenido a Ubicate!',
      description: 'Te guiaremos por las principales funciones de la plataforma. Haz clic en "Siguiente" para comenzar.',
      targetSelector: '#tour-sidebar-menu, #tour-mobile-navbar',
      position: 'right'
    },
    {
      title: 'Dashboard',
      description: 'Visualiza en tiempo real la ubicación de todos tus buses en el mapa. Puedes cambiar entre vista horizontal y vertical.',
      targetSelector: '#tour-menu-dashboard, #tour-mobile-menu-dashboard',
      position: 'right'
    },
    {
      title: 'Gestión de Conductores',
      description: 'Administra tu equipo: agrega conductores, edita su información, visualiza estadísticas y asigna buses.',
      targetSelector: '#tour-menu-users, #tour-mobile-menu-users',
      position: 'right'
    },
    {
      title: 'Control de Buses',
      description: 'Gestiona tu flota completa: agrega vehículos, edita detalles, monitorea su estado y asigna conductores.',
      targetSelector: '#tour-menu-buses, #tour-mobile-menu-buses',
      position: 'right'
    },
    {
      title: 'Rutas',
      description: 'Crea, edita y administra las rutas de tus buses, incluyendo paraderos, trazos en el mapa y recorridos asignados.',
      targetSelector: '#tour-menu-routes, #tour-mobile-menu-routes',
      position: 'right'
    },
    {
      title: 'Comentarios',
      description: 'Revisa el feedback de los usuarios sobre el servicio para mejorar continuamente.',
      targetSelector: '#tour-menu-comments, #tour-mobile-menu-comments',
      position: 'right'
    }
  ];

  constructor(
    private contexts: ChildrenOutletContexts,
    private realtimeService: RealtimeService
  ) {}

  ngOnInit(): void {
    const storedEmpresaId = localStorage.getItem('empresaId');
    if (storedEmpresaId) {
      this.empresaId = parseInt(storedEmpresaId, 10);
      this.subscribeToNotifications();
    }
  }

  ngOnDestroy(): void {
    if (this.notificationSubscription) {
      this.notificationSubscription.unsubscribe();
    }
  }

  private subscribeToNotifications(): void {
    if (!this.empresaId) return;

    this.notificationSubscription = this.realtimeService
      .watchNotificacionesEmpresa(this.empresaId)
      .subscribe({
        next: (notification: SenalNotification) => {
          console.log('[MainLayout] Notificación recibida:', notification);
          this.currentNotification = notification;
          this.showNotification = true;
        },
        error: (err) => {
          console.error('[MainLayout] Error en suscripción de notificaciones:', err);
        }
      });
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

  onNotificationClosed(): void {
    this.showNotification = false;
  }
}
