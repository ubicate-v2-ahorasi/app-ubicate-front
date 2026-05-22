import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SenalNotification } from '../../../../../core/service/realtime.service';

@Component({
  selector: 'app-senal-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './senal-notification.html',
})
export class SenalNotificationComponent implements OnInit, OnDestroy {
  @Input() notification!: SenalNotification;
  @Input() show = false;
  @Output() closed = new EventEmitter<void>();

  private hideTimeout?: ReturnType<typeof setTimeout>;

  ngOnInit() {
    if (this.show && this.notification?.tipo === 'SIN_SEÑAL') {
      this.startAutoHide();
    }
  }

  ngOnDestroy() {
    this.clearHideTimeout();
  }

  private startAutoHide() {
    this.clearHideTimeout();
    this.hideTimeout = setTimeout(() => {
      this.close();
    }, 10000);
  }

  private clearHideTimeout() {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
  }

  close() {
    this.show = false;
    this.clearHideTimeout();
    this.closed.emit();
  }

  dismiss() {
    this.close();
  }

  isAlerta(): boolean {
    return this.notification?.tipo === 'SIN_SEÑAL';
  }

  getNotificationClass(): string {
    const baseClass = 'notification-container border-l-4 shadow-lg rounded-lg p-4 mb-2';
    if (this.isAlerta()) {
      return `${baseClass} bg-red-50 dark:bg-red-900/20 border-red-500`;
    } else {
      return `${baseClass} bg-green-50 dark:bg-green-900/20 border-green-500`;
    }
  }

  getIconClass(): string {
    if (this.isAlerta()) {
      return 'text-red-500';
    } else {
      return 'text-green-500';
    }
  }

  getTitleClass(): string {
    if (this.isAlerta()) {
      return 'text-red-700 dark:text-red-400 font-bold';
    } else {
      return 'text-green-700 dark:text-green-400 font-bold';
    }
  }
}