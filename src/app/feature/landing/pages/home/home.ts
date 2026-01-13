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
  appVersion = 'v1.0.0';
  apkSize = '25 MB';

  // Estado del navbar
  isNavbarScrolled = false;
  activeSection = 'inicio';
  isDarkMode$ = this.themeService.isDarkMode$;

  // Estadísticas de impacto
  stats = [
    { value: '10,000+', label: 'Usuarios activos' },
    { value: '50+', label: 'Rutas monitoreadas' },
    { value: '99%', label: 'Precisión en tiempo real' },
    { value: '30min', label: 'Ahorro promedio diario' }
  ];

  // Características principales
  features = [
    {
      icon: '📍',
      title: 'Ubicación en Tiempo Real',
      description: 'Ve exactamente dónde está cada bus en un mapa interactivo actualizado al segundo'
    },
    {
      icon: '⏱️',
      title: 'Tiempo de Llegada Preciso',
      description: 'Calcula automáticamente cuántos minutos falta para que llegue tu bus'
    },
    {
      icon: '🔔',
      title: 'Notificaciones Inteligentes',
      description: 'Recibe alertas cuando tu bus esté cerca y nunca más lo pierdas'
    },
    {
      icon: '🗺️',
      title: 'Planifica tu Ruta',
      description: 'Encuentra la mejor combinación de buses para llegar a tu destino'
    },
    {
      icon: '💚',
      title: 'Ahorra Tiempo',
      description: 'Deja de esperar en la parada sin saber cuándo llegará el bus'
    },
    {
      icon: '📱',
      title: 'Diseño Intuitivo',
      description: 'Interfaz moderna y fácil de usar, diseñada para todas las edades'
    }
  ];

  // Cómo funciona - pasos
  howItWorks = [
    {
      step: '1',
      title: 'Descarga la App',
      description: 'Instala Ubicate gratis desde nuestra web',
      icon: '📲'
    },
    {
      step: '2',
      title: 'Busca tu Ruta',
      description: 'Selecciona la ruta que necesitas tomar',
      icon: '🔍'
    },
    {
      step: '3',
      title: 'Ve el Bus en Tiempo Real',
      description: 'Observa la ubicación exacta y tiempo de llegada',
      icon: '🚌'
    },
    {
      step: '4',
      title: 'Sal a Tiempo',
      description: 'Ve a la parada justo cuando lo necesitas',
      icon: '✅'
    }
  ];

  // Testimonios
  testimonials = [
    {
      name: 'María González',
      role: 'Estudiante',
      image: 'assets/testimonial-1.jpg',
      comment: 'Ya no pierdo tiempo esperando en la parada. Ahora sé exactamente cuándo sale mi bus y puedo aprovechar mejor mi tiempo.',
      rating: 5
    },
    {
      name: 'Carlos Ramírez',
      role: 'Trabajador',
      image: 'assets/testimonial-2.jpg',
      comment: 'Perfecto para ir al trabajo. Las notificaciones me avisan cuando el bus está cerca y nunca llego tarde.',
      rating: 5
    },
    {
      name: 'Ana Martínez',
      role: 'Profesora',
      image: 'assets/testimonial-3.jpg',
      comment: 'Excelente app! Muy intuitiva y precisa. La recomiendo totalmente para cualquier persona que use transporte público.',
      rating: 5
    }
  ];

  // FAQs
  faqs = [
    {
      question: '¿La app es gratuita?',
      answer: 'Sí, Ubicate es completamente gratuita para todos los usuarios. Solo descarga e instala.',
      isOpen: false
    },
    {
      question: '¿Qué tan precisa es la ubicación?',
      answer: 'Nuestra tecnología GPS actualiza la posición cada 5 segundos con una precisión del 99%, para darte información en tiempo real.',
      isOpen: false
    },
    {
      question: '¿Funciona sin internet?',
      answer: 'Necesitas conexión a internet para ver la ubicación en tiempo real. Recomendamos usar datos móviles o WiFi.',
      isOpen: false
    },
    {
      question: '¿Qué rutas están disponibles?',
      answer: 'Actualmente monitoreamos más de 50 rutas y agregamos nuevas constantemente. Puedes ver todas las rutas disponibles en la app.',
      isOpen: false
    },
    {
      question: '¿Cómo me registro como empresa?',
      answer: 'Las empresas de transporte pueden acceder a nuestro panel web para gestionar su flota. Contáctanos para más información.',
      isOpen: false
    }
  ];

  companyFeatures = [
    {
      title: 'Dashboard Completo',
      description: 'Monitorea tu flota en tiempo real con estadísticas detalladas',
      image: 'assets/ld1.jpg'
    },
    {
      title: 'Gestión de Rutas',
      description: 'Administra rutas, conductores y buses de forma eficiente',
      image: 'assets/ld2.jpg'
    }
  ];

  demos = [
    {
      title: 'Mapa en tiempo real',
      description: 'Ve todos los buses cerca de ti en un mapa interactivo',
      image: 'assets/MapaEnTiempoReal.jpg'
    },
    {
      title: 'Tiempos exactos',
      description: 'Lista ordenada por proximidad con tiempos precisos',
      image: 'assets/TDE.jpg'
    },
    {
      title: 'Vista para conductores',
      description: 'Tu escoges cuando empezar a mostrar tu ruta en la app',
      image: 'assets/Interfazchofer.jpg'
    }
  ];

  ngOnInit() {
    // Inicializar la detección de sección activa
    this.updateActiveSection();
    // Inicializar animaciones de scroll
    this.initScrollAnimations();
  }

  // Inicializar animaciones al hacer scroll
  initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    // Observar todos los elementos con clases de animación
    setTimeout(() => {
      const animatedElements = document.querySelectorAll('.scroll-animate, .scroll-animate-left, .scroll-animate-right, .scroll-animate-scale');
      animatedElements.forEach(el => observer.observe(el));
    }, 100);
  }

  // Detectar scroll para animación del navbar
  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isNavbarScrolled = window.scrollY > 50;
    this.updateActiveSection();
  }

  // Actualizar la sección activa basada en el scroll
  updateActiveSection() {
    const sections = ['inicio', 'como-funciona', 'caracteristicas', 'empresas', 'demo', 'cta'];
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
  }

  goToLogin() {
    this.router.navigate(['/auth/login']);
  }

  goToCompany() {
    this.router.navigate(['/auth/login']);
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  toggleFaq(index: number) {
    this.faqs[index].isOpen = !this.faqs[index].isOpen;
  }
}
