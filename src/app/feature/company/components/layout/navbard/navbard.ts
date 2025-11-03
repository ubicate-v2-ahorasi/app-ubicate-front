import { Component, Output, EventEmitter, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  GreenEducationService,
  GreenTip,
} from '../../../service/green-education.service';
import { GreenNotificationComponent } from '../../green-notification/green-notification';

@Component({
  selector: 'app-navbard',
  standalone: true,
  imports: [CommonModule, GreenNotificationComponent],
  templateUrl: './navbard.html',
})
export class Navbard implements OnInit {
  @Output() menuToggle = new EventEmitter<void>();
  @Output() themeToggle = new EventEmitter<void>();

  private greenEducationService = inject(GreenEducationService);

  notifications = 3;
  isDarkMode = false;
  showGreenNotification = false;
  currentGreenTip?: GreenTip;

  ngOnInit() {

    setTimeout(() => {
      this.showGreenTip();
    }, 10000);

    // Mostrar tip verde cada 5 minutos
    setInterval(() => {
      this.showGreenTip();
    }, 300000);
  }

  onMenuClick(): void {
    this.menuToggle.emit();
  }

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    this.themeToggle.emit();

    if (this.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
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
    console.log('Abrir información detallada:', tip);
    this.showGreenNotification = false;
    // Aquí puedes abrir un modal o navegar a una página de info
  }
}
