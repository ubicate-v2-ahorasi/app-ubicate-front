import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VoiceAssistantService } from '../../../../../core/service/voice-assistant.service';

@Component({
  selector: 'app-accessibility-controls',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './accessibility-controls.html',
  styleUrls: ['./accessibility-controls.css']
})
export class AccessibilityControlsComponent implements OnInit {
  isVoiceEnabled = false;
  isExpanded = false;
  voiceService = inject(VoiceAssistantService);

  ngOnInit(): void {
    this.voiceService.isEnabled$.subscribe((enabled: boolean) => {
      this.isVoiceEnabled = enabled;
    });
  }

  toggleVoice(): void {
    this.voiceService.toggle();
  }

  togglePanel(): void {
    this.isExpanded = !this.isExpanded;
  }
}
