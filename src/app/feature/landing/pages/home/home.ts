import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
})
export class Home {
  apkUrl = 'assets/app-release.apk';
  appName = 'Ubicate';
  appDescription =
    'Encuentra tu bus en tiempo real y nunca más pierdas tiempo esperando';
  appVersion = 'v2.0.0';
  apkSize = '25 MB';

  features = [
    '🚌 Ubicación en tiempo real',
    '⏱️ Tiempo de espera exacto',
    '📍 Paradas cercanas',
    '🔔 Notificaciones inteligentes',
    '📱 Funciona offline',
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

  stats = [
    { number: '50K+', label: 'Usuarios activos' },
    { number: '200+', label: 'Rutas cubiertas' },
    { number: '15 seg', label: 'Tiempo promedio de búsqueda' },
  ];

  constructor(private router: Router) {}

  onApkDownload() {
    console.log('Descarga de APK iniciada');
  }

  goToLogin() {
    this.router.navigate(['/auth/login']);
  }

  goToCompany() {
    this.router.navigate(['/company']);
  }
}
