import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-map-controls',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map-controls.html'
})
export class MapControlsComponent {
  @Input() isLocating = false;
  @Input() isFullscreen = false;

  @Output() toggleFullscreen = new EventEmitter<void>();

  onToggleFullscreen() {
    this.toggleFullscreen.emit();
  }
}
