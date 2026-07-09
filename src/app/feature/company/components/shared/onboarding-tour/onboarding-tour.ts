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

    const element = Array.from(document.querySelectorAll(this.currentStep.targetSelector))
      .find((candidate) => {
        const htmlElement = candidate as HTMLElement;
        const rect = htmlElement.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }) as HTMLElement | undefined;
    if (element) {
      this.targetElement = element;
      
      // Elevar el z-index sin cambiar de lugar elementos fijos como la navbar movil.
      if (window.getComputedStyle(element).position === 'static') {
        element.style.position = 'relative';
      }
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
      if (!this.isInsideFixedElement(element)) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  calculateTooltipPosition(rect: DOMRect, position: string): void {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipWidth = Math.min(350, viewportWidth - 32);
    const tooltipHeight = 220;
    const margin = 16;
    const isMobile = viewportWidth < 768;
    const mobileNavbarHeight = isMobile ? this.getVisibleElementHeight('#tour-mobile-navbar') : 0;
    const safeViewportBottom = viewportHeight - mobileNavbarHeight - margin;
    const preferredPosition = isMobile ? (rect.top > viewportHeight / 2 ? 'top' : 'bottom') : position;

    let top = rect.top + rect.height / 2 - tooltipHeight / 2;
    let left = rect.right + margin;

    switch (preferredPosition) {
      case 'right':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + margin;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - tooltipWidth - margin;
        break;
      case 'bottom':
        top = rect.bottom + margin;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case 'top':
        top = rect.top - tooltipHeight - margin;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
    }

    this.tooltipPosition = {
      top: `${this.clamp(top, margin, safeViewportBottom - tooltipHeight)}px`,
      left: `${this.clamp(left, margin, viewportWidth - tooltipWidth - margin)}px`
    };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), Math.max(min, max));
  }

  private getVisibleElementHeight(selector: string): number {
    const element = document.querySelector(selector) as HTMLElement | null;
    if (!element) return 0;

    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 ? rect.height : 0;
  }

  private isInsideFixedElement(element: HTMLElement): boolean {
    let current: HTMLElement | null = element;

    while (current) {
      if (window.getComputedStyle(current).position === 'fixed') {
        return true;
      }
      current = current.parentElement;
    }

    return false;
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

