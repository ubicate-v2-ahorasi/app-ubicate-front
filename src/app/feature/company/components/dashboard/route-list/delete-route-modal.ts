import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconsModule } from '../../../icons.module';
import { RouteResponse } from '../../../models/route.model';

@Component({
  selector: 'app-delete-route-modal',
  standalone: true,
  imports: [CommonModule, IconsModule],
  templateUrl: './delete-route-modal.html',
})
export class DeleteRouteModalComponent {
  @Input() set isVisible(value: boolean) {
    this._isVisible = value;
    this.cdr.detectChanges();
  }
  get isVisible() {
    return this._isVisible;
  }
  private _isVisible = false;

  @Input() set route(value: RouteResponse | null) {
    this._route = value;
    this.cdr.detectChanges();
  }
  get route() {
    return this._route;
  }
  private _route: RouteResponse | null = null;

  @Input() isDeleting = false;

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  constructor(private cdr: ChangeDetectorRef) {}

  onConfirm(): void {
    this.confirm.emit();
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
