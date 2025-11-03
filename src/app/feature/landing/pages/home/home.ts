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
