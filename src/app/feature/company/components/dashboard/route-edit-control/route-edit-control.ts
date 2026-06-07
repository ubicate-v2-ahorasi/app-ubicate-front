import { Component, inject, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouteEditorService } from '../../../service/route/route-editor.service';
import { IconsModule } from '../../../icons.module';

@Component({
  selector: 'app-route-edit-control',
  standalone: true,
  imports: [CommonModule, IconsModule],
  template: `
    <div
      class="edit-control"
      [class.edit-control-below-bus-search]="showBelowBusSearch"
      *ngIf="editor.isEditing()"
    >
      <div class="edit-info">
        <lucide-icon name="edit-3" class="w-4 h-4"></lucide-icon>
        <span>Editando ruta #{{ editor.getEditingRouteId() }}</span>
        <span class="hint" *ngIf="editor.isLoading$ | async">Calculando ruta...</span>
        <span class="hint" *ngIf="!(editor.isLoading$ | async)">Arrastra los puntos A/B</span>
      </div>

      <div class="edit-actions">
        <button class="btn-discard" (click)="onDiscard()" [disabled]="editor.isLoading$ | async">
          <lucide-icon name="x" class="w-4 h-4"></lucide-icon>
          Cancelar
        </button>
        <button class="btn-save" (click)="onSave()" [disabled]="isSaving || (editor.isLoading$ | async)">
          <lucide-icon *ngIf="!(editor.isLoading$ | async)" name="check" class="w-4 h-4"></lucide-icon>
          <lucide-icon *ngIf="editor.isLoading$ | async" name="loader-2" class="w-4 h-4 animate-spin"></lucide-icon>
          {{ (editor.isLoading$ | async) ? 'Guardando...' : 'Guardar' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .edit-control {
      position: absolute;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 16px;
      background: rgba(255, 255, 255, 0.96);
      border: 1px solid rgba(148, 163, 184, 0.28);
      padding: 10px 16px;
      border-radius: 10px;
      box-shadow: 0 10px 25px rgba(15, 23, 42, 0.16);
      backdrop-filter: blur(10px);
      font-family: 'Segoe UI', sans-serif;
    }

    .edit-control-below-bus-search {
      top: 7.5rem;
    }

    :host-context(.dark) .edit-control {
      background: rgba(15, 23, 42, 0.94);
      border-color: rgba(71, 85, 105, 0.7);
      box-shadow: 0 12px 30px rgba(2, 6, 23, 0.38);
    }

    .edit-info {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #1d4ed8;
      font-weight: 600;
      font-size: 13px;
    }

    :host-context(.dark) .edit-info {
      color: #93c5fd;
    }

    .hint {
      color: #64748b;
      font-weight: 400;
      font-size: 12px;
    }

    :host-context(.dark) .hint {
      color: #94a3b8;
    }

    .edit-actions {
      display: flex;
      gap: 6px;
    }

    .btn-discard, .btn-save {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 6px 12px;
      border: 1px solid transparent;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-discard {
      background: #f8fafc;
      border-color: #cbd5e1;
      color: #334155;
    }

    .btn-discard:hover:not(:disabled) {
      background: #f1f5f9;
      color: #0f172a;
    }

    .btn-discard:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    :host-context(.dark) .btn-discard {
      background: #334155;
      border-color: #475569;
      color: #cbd5e1;
    }

    :host-context(.dark) .btn-discard:hover:not(:disabled) {
      background: #475569;
      color: #f8fafc;
    }

    .btn-save {
      background: #059669;
      color: white;
    }

    .btn-save:hover:not(:disabled) {
      background: #047857;
    }

    .btn-save:disabled {
      background: #cbd5e1;
      color: #64748b;
      cursor: not-allowed;
    }

    :host-context(.dark) .btn-save:disabled {
      background: #475569;
      color: #94a3b8;
    }

    .animate-spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class RouteEditControlComponent {
  @Input() showBelowBusSearch = false;
  editor = inject(RouteEditorService);
  @Output() changesSaved = new EventEmitter<void>();

  isSaving = false;

  onDiscard(): void {
    this.editor.discardChanges();
  }

  onSave(): void {
    if (this.isSaving) return;

    const save$ = this.editor.saveChanges();
    if (save$) {
      this.isSaving = true;
      save$.subscribe({
        next: () => {
          this.isSaving = false;
          this.editor.stopEditing();
          this.changesSaved.emit();
        },
        error: (err) => {
          this.isSaving = false;
          console.error('Error saving route:', err);
          alert('Error al guardar la ruta. Intenta de nuevo.');
        }
      });
    }
  }
}
