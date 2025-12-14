import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconsModule } from '../../../icons.module';

@Component({
  selector: 'app-success-modal',
  standalone: true,
  imports: [CommonModule, IconsModule],
  templateUrl: './success-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuccessModalComponent {
  @Input() isVisible = false;
  @Input() routeName = '';

  @Output() close = new EventEmitter<void>();

  onClose(): void {
    this.close.emit();
  }
}
