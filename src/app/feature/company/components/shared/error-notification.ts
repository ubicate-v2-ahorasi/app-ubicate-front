import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-error-notification',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (errorMessage) {
    <div class="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      <div class="flex items-start">
        <svg class="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" 
             fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" 
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" 
                clip-rule="evenodd"/>
        </svg>
        <div class="flex-1">
          <h3 class="text-sm font-medium text-red-800 dark:text-red-200">
            {{ errorTitle }}
          </h3>
          <div class="mt-1 text-sm text-red-700 dark:text-red-300 whitespace-pre-line">
            {{ errorMessage }}
          </div>
        </div>
      </div>
    </div>
    }
  `,
})
export class ErrorNotification {
  @Input() errorMessage: string = '';
  @Input() errorTitle: string = 'Error';
}
