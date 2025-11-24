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
  selector: 'app-map-dark-mode',
  standalone: true,
  imports: [CommonModule, IconsModule],
  templateUrl: './map-dark-mode.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapDarkModeComponent {
  @Input() isDarkMode = false;
  @Input() disabled = false;

  @Output() toggled = new EventEmitter<void>();

  toggleTheme(): void {
    if (this.disabled) {
      return;
    }

    this.toggled.emit();
  }
}
