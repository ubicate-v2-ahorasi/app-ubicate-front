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
        <span class="hint" *ngIf="editor.isLoading$ | async">• Calculando ruta...</span>
        <span class="hint" *ngIf="!(editor.isLoading$ | async)">• Arrastra los puntos A/B</span>
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
      background: #1f2937;
      padding: 10px 16px;
      border-radius: 10px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
      font-family: 'Segoe UI', sans-serif;
    }

    .edit-control-below-bus-search {
      top: 7.5rem;
    }

    .edit-info {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #60a5fa;
      font-weight: 600;
      font-size: 13px;
    }

    .hint {
      color: #9ca3af;
      font-weight: 400;
      font-size: 12px;
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
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-discard {
      background: #374151;
      color: #9ca3af;
    }

    .btn-discard:hover:not(:disabled) {
      background: #4b5563;
      color: #e5e7eb;
    }

    .btn-discard:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-save {
      background: #059669;
      color: white;
    }

    .btn-save:hover:not(:disabled) {
      background: #047857;
    }

    .btn-save:disabled {
      background: #4b5563;
      color: #9ca3af;
      cursor: not-allowed;
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
