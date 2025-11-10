import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ThemeService } from '../../../../core/service/theme.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
})
export class Home implements OnInit {
  private router = inject(Router);
  private themeService = inject(ThemeService);
  
  apkUrl = 'assets/app-release.apk';
  appName = 'Ubicate';
  appDescription =
    'Encuentra tu bus en tiempo real y nunca más pierdas tiempo esperando';
  appVersion = 'v2.0.0';
  apkSize = '25 MB';

  // Estado del navbar
  isNavbarScrolled = false;
  activeSection = 'inicio';
  isDarkMode$ = this.themeService.isDarkMode$;

  features = [
    '🚌 Ubicación en tiempo real',
    '⏱️ Tiempo de espera estimado',
    '🆓 Completamente gratis',
  ];

  benefits = [
    {
      icon: '🎯',
      title: 'Precisión total',
      description: 'Ve exactamente dónde está tu bus y cuánto tiempo falta',
    },
    {
      icon: '⚡',
      title: 'Súper rápido',
      description: 'Información actualizada cada 10 segundos',
    },
    {
      icon: '🌟',
      title: 'Fácil de usar',
      description: 'Interfaz simple e intuitiva para todas las edades',
    },
  ];

  ngOnInit() {
    // Inicializar la detección de sección activa
    this.updateActiveSection();
  }

  // Detectar scroll para animación del navbar
  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isNavbarScrolled = window.scrollY > 50;
    this.updateActiveSection();
  }

  // Actualizar la sección activa basada en el scroll
  updateActiveSection() {
    const sections = ['inicio', 'empresas', 'beneficios', 'demo', 'cta'];
    const scrollPosition = window.scrollY + 100;

    for (const section of sections) {
      const element = document.getElementById(section);
      if (element) {
        const offsetTop = element.offsetTop;
        const offsetBottom = offsetTop + element.offsetHeight;

        if (scrollPosition >= offsetTop && scrollPosition < offsetBottom) {
          this.activeSection = section;
          break;
        }
      }
    }
  }

  // Scroll suave a una sección con animación mejorada
  scrollToSection(sectionId: string, event: Event) {
    event.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      const offsetTop = element.offsetTop - 80; // Offset para el navbar fijo
      const startPosition = window.scrollY;
      const distance = offsetTop - startPosition;
      const duration = 800; // Duración de la animación en ms
      let startTime: number | null = null;

      const animation = (currentTime: number) => {
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const progress = Math.min(timeElapsed / duration, 1);
        
        // Función de easing para un movimiento más suave
        const ease = (t: number) => t < 0.5 
          ? 4 * t * t * t 
          : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
        
        window.scrollTo(0, startPosition + distance * ease(progress));

        if (timeElapsed < duration) {
          requestAnimationFrame(animation);
        }
      };

      requestAnimationFrame(animation);
    }
  }

  onApkDownload() {
    console.log('Descarga de APK iniciada');
  }

  goToLogin() {
    this.router.navigate(['/auth/login']);
  }

  goToCompany() {
    this.router.navigate(['/company']);
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }
}
