// src/app/core/service/green-education.service.ts
import { Injectable } from '@angular/core';

export interface GreenTip {
  id: string;
  title: string;
  message: string;
  icon: string;
  type: 'tip' | 'achievement' | 'challenge' | 'info';
}

@Injectable({ providedIn: 'root' })
export class GreenEducationService {
  private tips: GreenTip[] = [
    {
      id: 'tip1',
      title: '🌍 Transporte Sostenible',
      message:
        'El transporte público reduce las emisiones de CO₂ hasta en un 76% comparado con vehículos privados.',
      icon: '🚌',
      type: 'tip',
    },
    {
      id: 'tip2',
      title: '⚡ Eficiencia Energética',
      message:
        'Optimizar rutas puede reducir el consumo de combustible hasta en un 15%.',
      icon: '🗺️',
      type: 'tip',
    },
    {
      id: 'tip3',
      title: '🎯 Tecnología Verde',
      message:
        'Los sistemas de monitoreo GPS pueden reducir el tiempo de viaje en un 20%.',
      icon: '📱',
      type: 'tip',
    },
    {
      id: 'tip4',
      title: '🌱 Impacto Ambiental',
      message:
        'Un bus lleno puede reemplazar hasta 40 automóviles en las calles.',
      icon: '🚌',
      type: 'tip',
    },
    {
      id: 'achievement1',
      title: '🏆 ¡Felicitaciones!',
      message:
        'Tu empresa ha optimizado rutas esta semana, ahorrando combustible.',
      icon: '🌟',
      type: 'achievement',
    },
    {
      id: 'challenge1',
      title: '🎯 Desafío Verde',
      message: '¿Puedes reducir 10% el tiempo de espera optimizando las rutas?',
      icon: '⚡',
      type: 'challenge',
    },
  ];

  showRandomTip(): GreenTip {
    const randomIndex = Math.floor(Math.random() * this.tips.length);
    return this.tips[randomIndex];
  }
}
