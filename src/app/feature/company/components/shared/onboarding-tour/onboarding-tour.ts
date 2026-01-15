import { Component, EventEmitter, Output, Input, OnInit, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TourStep {
  title: string;
  description: string;
  targetSelector: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

@Component({
  selector: 'app-onboarding-tour',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './onboarding-tour.html',
  styleUrls: ['./onboarding-tour.css']
})
export class OnboardingTourComponent implements OnInit, AfterViewChecked {
  @Input() steps: TourStep[] = [];
  @Output() tourComplete = new EventEmitter<void>();
  @Output() tourSkipped = new EventEmitter<void>();

  currentStepIndex = 0;
  showTour = true;
  targetElement: HTMLElement | null = null;
  tooltipPosition = { top: '0px', left: '0px' };
  highlightPosition = { top: '0px', left: '0px', width: '0px', height: '0px' };

  ngOnInit(): void {
    this.updateTargetElement();
  }

  ngAfterViewChecked(): void {
    if (this.showTour) {
      this.updateTargetElement();
    }
  }

  get currentStep(): TourStep {
    return this.steps[this.currentStepIndex];
  }

  get isFirstStep(): boolean {
    return this.currentStepIndex === 0;
  }

  get isLastStep(): boolean {
    return this.currentStepIndex === this.steps.length - 1;
  }

  updateTargetElement(): void {
    if (!this.currentStep?.targetSelector) return;

    // Remover estilo del elemento anterior
    if (this.targetElement) {
      this.targetElement.style.position = '';
      this.targetElement.style.zIndex = '';
    }

    const element = document.querySelector(this.currentStep.targetSelector) as HTMLElement;
    if (element) {
      this.targetElement = element;
      
      // Elevar el z-index del elemento
      element.style.position = 'relative';
      element.style.zIndex = '10000';
      
      const rect = element.getBoundingClientRect();
      
      // Posición del highlight
      this.highlightPosition = {
        top: `${rect.top - 8}px`,
        left: `${rect.left - 8}px`,
        width: `${rect.width + 16}px`,
        height: `${rect.height + 16}px`
      };

      // Posición del tooltip según la preferencia
      const position = this.currentStep.position || 'right';
      this.calculateTooltipPosition(rect, position);

      // Hacer scroll si es necesario
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  calculateTooltipPosition(rect: DOMRect, position: string): void {
    const tooltipWidth = 350;
    const tooltipHeight = 200;
    const margin = 20;

    switch (position) {
      case 'right':
        this.tooltipPosition = {
          top: `${rect.top + rect.height / 2 - tooltipHeight / 2}px`,
          left: `${rect.right + margin}px`
        };
        break;
      case 'left':
        this.tooltipPosition = {
          top: `${rect.top + rect.height / 2 - tooltipHeight / 2}px`,
          left: `${rect.left - tooltipWidth - margin}px`
        };
        break;
      case 'bottom':
        this.tooltipPosition = {
          top: `${rect.bottom + margin}px`,
          left: `${rect.left + rect.width / 2 - tooltipWidth / 2}px`
        };
        break;
      case 'top':
        this.tooltipPosition = {
          top: `${rect.top - tooltipHeight - margin}px`,
          left: `${rect.left + rect.width / 2 - tooltipWidth / 2}px`
        };
        break;
    }
  }

  nextStep(): void {
    if (this.isLastStep) {
      this.completeTour();
    } else {
      this.currentStepIndex++;
      setTimeout(() => this.updateTargetElement(), 100);
    }
  }

  previousStep(): void {
    if (!this.isFirstStep) {
      this.currentStepIndex--;
      setTimeout(() => this.updateTargetElement(), 100);
    }
  }

  skipTour(): void {
    // Limpiar estilos del elemento
    if (this.targetElement) {
      this.targetElement.style.position = '';
      this.targetElement.style.zIndex = '';
    }
    this.showTour = false;
    this.tourSkipped.emit();
  }

  completeTour(): void {
    // Limpiar estilos del elemento
    if (this.targetElement) {
      this.targetElement.style.position = '';
      this.targetElement.style.zIndex = '';
    }
    this.showTour = false;
    this.tourComplete.emit();
  }
}
