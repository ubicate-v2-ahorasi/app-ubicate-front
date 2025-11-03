// green-notification.component.ts
import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  OnInit,
  OnDestroy,
  OnChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { GreenTip } from '../../service/green-education.service';

@Component({
  selector: 'app-green-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './green-notification.html',
})
export class GreenNotificationComponent
  implements OnInit, OnDestroy, OnChanges
{
  @Input() tip!: GreenTip;
  @Input() show = false;
  @Output() closed = new EventEmitter<void>();
  @Output() learnMoreClicked = new EventEmitter<GreenTip>();

  private clickListener?: (event: Event) => void; // ← Corrección aquí

  constructor(private elementRef: ElementRef) {}

  ngOnInit() {
    if (this.show) {
      this.addClickOutsideListener();
    }
  }

  ngOnDestroy() {
    this.removeClickOutsideListener();
  }

  ngOnChanges() {
    if (this.show) {
      setTimeout(() => {
        this.addClickOutsideListener();
      }, 0);
    } else {
      this.removeClickOutsideListener();
    }
  }

  private addClickOutsideListener() {
    this.removeClickOutsideListener();

    this.clickListener = (event: Event) => {
      const target = event.target as HTMLElement;
      const notificationElement = this.elementRef.nativeElement.querySelector(
        '.notification-container'
      );

      if (notificationElement && !notificationElement.contains(target)) {
        this.close();
      }
    };

    setTimeout(() => {
      if (this.clickListener) {
        // ← Verificación adicional
        document.addEventListener('click', this.clickListener);
      }
    }, 100);
  }

  private removeClickOutsideListener() {
    if (this.clickListener) {
      document.removeEventListener('click', this.clickListener);
      this.clickListener = undefined;
    }
  }

  getNotificationClass(): string {
    const baseClass = 'bg-white border-l-4';
    switch (this.tip.type) {
      case 'achievement':
        return `${baseClass} border-yellow-500`;
      case 'challenge':
        return `${baseClass} border-blue-500`;
      case 'tip':
        return `${baseClass} border-green-500`;
      case 'info':
        return `${baseClass} border-purple-500`;
      default:
        return `${baseClass} border-green-500`;
    }
  }

  close() {
    this.show = false;
    this.removeClickOutsideListener();
    this.closed.emit();
  }

  dismiss() {
    this.close();
  }

  learnMore() {
    this.learnMoreClicked.emit(this.tip);
  }
}
