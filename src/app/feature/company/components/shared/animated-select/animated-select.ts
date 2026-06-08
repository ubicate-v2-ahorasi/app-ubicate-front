import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Optional,
  Output,
  Self,
  ViewChild,
  inject,
} from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { animate, style, transition, trigger } from '@angular/animations';

export interface AnimatedSelectOption<T = unknown> {
  label: string;
  value: T;
  disabled?: boolean;
}

@Component({
  selector: 'app-animated-select',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative">
      <button
        #triggerButton
        type="button"
        [disabled]="disabled"
        (click)="toggle()"
        [class]="triggerClasses"
      >
        <span class="truncate">{{ selectedLabel }}</span>
        <svg
          class="h-4 w-4 shrink-0 text-gray-500 transition-transform"
          [class.rotate-180]="isOpen"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        *ngIf="isOpen"
        @dropdownAnimation
        [class]="panelClass"
        [style.position]="'fixed'"
        [style.top.px]="panelPosition.top"
        [style.left.px]="panelPosition.left"
        [style.width.px]="panelPosition.width"
        [style.max-height.px]="panelPosition.maxHeight"
        [style.z-index]="60"
      >
        <button
          *ngFor="let option of options"
          type="button"
          [disabled]="option.disabled"
          (click)="selectOption(option)"
          [class]="getOptionClass(option)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>
  `,
  animations: [
    trigger('dropdownAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-6px) scaleY(0.96)', transformOrigin: 'top' }),
        animate(
          '180ms cubic-bezier(0.22, 1, 0.36, 1)',
          style({ opacity: 1, transform: 'translateY(0) scaleY(1)' })
        ),
      ]),
      transition(':leave', [
        animate(
          '140ms cubic-bezier(0.4, 0, 1, 1)',
          style({ opacity: 0, transform: 'translateY(-4px) scaleY(0.96)' })
        ),
      ]),
    ]),
  ],
})
export class AnimatedSelectComponent<T = unknown> implements ControlValueAccessor {
  private host = inject(ElementRef<HTMLElement>);

  @ViewChild('triggerButton') triggerButton?: ElementRef<HTMLButtonElement>;

  @Input() options: AnimatedSelectOption<T>[] = [];
  @Input() placeholder = 'Seleccionar';
  @Input() triggerClass =
    'flex w-full items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-left text-gray-900 transition-all focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:cursor-not-allowed disabled:opacity-60';
  @Input() panelClass =
    'absolute z-20 mt-2 w-full max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-700';
  @Input() optionClass =
    'block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-gray-100 dark:text-white dark:hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50';
  @Output() valueChange = new EventEmitter<T>();

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.isOpen = false;
    }
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  updatePanelPosition(): void {
    if (!this.isOpen || !this.triggerButton) return;

    const rect = this.triggerButton.nativeElement.getBoundingClientRect();
    const gap = 8;
    const preferredMaxHeight = 240;
    const viewportPadding = 16;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding - gap;
    const spaceAbove = rect.top - viewportPadding - gap;
    const openBelow = spaceBelow >= 160 || spaceBelow >= spaceAbove;
    const maxHeight = Math.max(120, Math.min(preferredMaxHeight, openBelow ? spaceBelow : spaceAbove));

    this.panelPosition = {
      top: openBelow ? rect.bottom + gap : rect.top - gap - maxHeight,
      left: rect.left,
      width: rect.width,
      maxHeight,
    };
  }

  isOpen = false;
  disabled = false;
  value: T | null = null;
  panelPosition = { top: 0, left: 0, width: 0, maxHeight: 240 };

  private onChange: (value: T | null) => void = () => {};
  private onTouched: () => void = () => {};

  get triggerClasses(): string {
    return [
      'flex items-center justify-between gap-2 text-left',
      this.triggerClass,
    ].join(' ');
  }

  constructor(@Optional() @Self() public ngControl: NgControl) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  get selectedLabel(): string {
    const selected = this.options.find((option) => this.areEqual(option.value, this.value));
    return selected?.label ?? this.placeholder;
  }

  toggle(): void {
    if (this.disabled) return;
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      setTimeout(() => this.updatePanelPosition());
    }
    this.onTouched();
  }

  selectOption(option: AnimatedSelectOption<T>): void {
    if (option.disabled) return;
    this.value = option.value;
    this.onChange(this.value);
    this.onTouched();
    this.valueChange.emit(option.value);
    this.isOpen = false;
  }

  getOptionClass(option: AnimatedSelectOption<T>): string {
    const selected = this.areEqual(option.value, this.value);
    return [
      this.optionClass,
      selected ? 'font-semibold bg-gray-100 dark:bg-gray-600' : '',
    ].join(' ');
  }

  writeValue(value: T | null): void {
    this.value = value;
  }

  registerOnChange(fn: (value: T | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  private areEqual(a: T | null | undefined, b: T | null | undefined): boolean {
    return a === b;
  }
}
