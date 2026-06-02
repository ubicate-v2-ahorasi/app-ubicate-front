import { Component, Output, EventEmitter, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  GreenEducationService,
  GreenTip,
} from '../../../service/green-education.service';
import { GreenNotificationComponent } from '../../green-notification/green-notification';
import { ThemeService } from '../../../../../core/service/theme.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-navbard',
  standalone: true,
  imports: [CommonModule, GreenNotificationComponent],
  templateUrl: './navbard.html',
})
export class Navbard implements OnInit, OnDestroy {
  @Output() menuToggle = new EventEmitter<void>();
  @Output() themeToggle = new EventEmitter<void>();

  private greenEducationService = inject(GreenEducationService);
  private themeService = inject(ThemeService);
  private themeSubscription?: Subscription;

  notifications = 3;
  isDarkMode = false;
  showGreenNotification = false;
  currentGreenTip?: GreenTip;

  ngOnInit() {
    this.themeSubscription = this.themeService.isDarkMode$.subscribe((isDark) => {
      this.isDarkMode = isDark;
    });

    setTimeout(() => {
      this.showGreenTip();
    }, 10000);

    // Mostrar tip verde cada 5 minutos
    setInterval(() => {
      this.showGreenTip();
    }, 300000);
  }

  ngOnDestroy(): void {
    this.themeSubscription?.unsubscribe();
  }

  onMenuClick(): void {
    this.menuToggle.emit();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
    this.themeToggle.emit();
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
    // Aquí puedes abrir un modal o navegar a una página de info
  }
}
