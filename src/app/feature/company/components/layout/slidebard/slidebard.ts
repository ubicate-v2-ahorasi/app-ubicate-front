import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionService } from '../../../../../core/service/session.service';
import { ThemeService } from '../../../../../core/service/theme.service';
import { Router } from '@angular/router';
import {
  GreenEducationService,
  GreenTip,
} from '../../../service/green-education.service';
import { GreenNotificationComponent } from '../../green-notification/green-notification';
import { menuItemAnimation } from '../../../../../core/utils/route-animations';

@Component({
  selector: 'app-slidebard',
  imports: [CommonModule, GreenNotificationComponent],
  templateUrl: './slidebard.html',
  animations: [menuItemAnimation]
})
export class Slidebard implements OnInit {
  @Input() isOpen = true;
  @Output() logout = new EventEmitter<void>();
  @Output() toggleChange = new EventEmitter<boolean>();
  @Output() showTourRequest = new EventEmitter<void>();
  private router = inject(Router);
  private sessionService = inject(SessionService);
  private greenEducationService = inject(GreenEducationService);
  themeService = inject(ThemeService);

  menuItems = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      icon: 'home',
      path: '/company/dashboard',
    },
    { id: 'users', name: 'Conductores', icon: 'user', path: '/company/users' },
    { id: 'buses', name: 'Buses', icon: 'bus', path: '/company/buses' },
    { id: 'comments', name: 'Comentarios', icon: 'message', path: '/company/comments' },
  ];

  activeItem = 'dashboard';
  empresaNombre: string | null = null;
  showGreenNotification = false;
  currentGreenTip?: GreenTip;
  isDarkMode = false;

  ngOnInit(): void {
    // Obtener el nombre de la empresa desde el SessionService
    this.empresaNombre = this.sessionService.getEmpresaNombre();

    // Restaurar el menú activo desde la URL actual
    const currentPath = this.router.url;
    const activeMenuItem = this.menuItems.find(item => currentPath.includes(item.path));
    if (activeMenuItem) {
      this.activeItem = activeMenuItem.id;
    }

    // Suscribirse al cambio de tema
    this.themeService.isDarkMode$.subscribe(isDark => {
      this.isDarkMode = isDark;
    });

    // Mostrar tip verde después de 10 segundos
    setTimeout(() => {
      this.showGreenTip();
    }, 10000);

    // Mostrar tip verde cada 5 minutos
    setInterval(() => {
      this.showGreenTip();
    }, 300000);
  }

  toggleSidebar(): void {
    this.isOpen = !this.isOpen;
    this.toggleChange.emit(this.isOpen);
  }

  onItemClick(itemId: string): void {
    const item = this.menuItems.find((menu) => menu.id === itemId);
    if (item) {
      if ((item as any).isExternal) {
        // Abrir enlace externo en nueva pestaña
        window.open(item.path, '_blank');
      } else {
        this.activeItem = itemId;
        this.router.navigate([item.path]);
      }
    }
  }

  onLogout(): void {
    this.sessionService.logout();
    this.logout.emit();
  }

  showGreenTip(): void {
    if (!this.showGreenNotification) {
      this.currentGreenTip = this.greenEducationService.showRandomTip();
      this.showGreenNotification = true;
    }
  }

  onGreenNotificationClosed(): void {
    this.showGreenNotification = false;
  }

  onLearnMoreClicked(tip: GreenTip): void {
    this.showGreenNotification = false;
  }

  onSoftwareVerdeClick(): void {
    window.open('https://aws.amazon.com/es/sustainability/', '_blank');
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  requestTour(): void {
    this.showTourRequest.emit();
  }

  trackByFn(index: number, item: any): any {
    return item.id;
  }
}
