import { Component, Input, Output, EventEmitter, signal, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen()) {
      <div class="modal-backdrop" (click)="closeOnBackdrop && close()">
        <div class="modal" [class]="'modal-' + size" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">{{title}}</h3>
            @if (showClose) {
              <button class="close-btn" (click)="close()">
                <i class="icon icon-x"></i>
              </button>
            }
          </div>
          
          <div class="modal-body">
            <ng-content></ng-content>
          </div>

          @if (showFooter) {
            <div class="modal-footer">
              @if (footerTemplate) {
                <ng-container *ngTemplateOutlet="footerTemplate"></ng-container>
              } @else {
                <button class="btn btn-secondary" (click)="close()">{{cancelText}}</button>
                <button 
                  class="btn btn-primary" 
                  [disabled]="confirmDisabled"
                  (click)="onConfirm.emit()"
                >
                  {{confirmText}}
                </button>
              }
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1100;
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal {
      background: #fff;
      border-radius: 0.75rem;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      animation: slideIn 0.2s ease;

      &.modal-sm { width: 400px; }
      &.modal-md { width: 560px; }
      &.modal-lg { width: 800px; }
      &.modal-xl { width: 1140px; }
      &.modal-full { width: 95vw; height: 90vh; }
    }

    @keyframes slideIn {
      from { 
        opacity: 0;
        transform: translateY(-20px);
      }
      to { 
        opacity: 1;
        transform: translateY(0);
      }
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border-color, #e5e7eb);
    }

    .modal-title {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
    }

    .close-btn {
      background: none;
      border: none;
      padding: 0.5rem;
      cursor: pointer;
      color: var(--text-secondary, #6b7280);
      border-radius: 0.375rem;
      transition: all 0.2s;

      &:hover {
        background: var(--hover-bg, #f3f4f6);
        color: var(--text-primary, #1f2937);
      }
    }

    .modal-body {
      flex: 1;
      padding: 1.5rem;
      overflow-y: auto;
    }

    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--border-color, #e5e7eb);
      background: var(--bg-secondary, #f9fafb);
      border-radius: 0 0 0.75rem 0.75rem;
    }

    .btn {
      padding: 0.625rem 1.25rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid transparent;

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .btn-primary {
      background: var(--primary-color, #3b82f6);
      color: #fff;

      &:hover:not(:disabled) {
        background: var(--primary-dark, #2563eb);
      }
    }

    .btn-secondary {
      background: #fff;
      color: var(--text-primary, #1f2937);
      border-color: var(--border-color, #e5e7eb);

      &:hover:not(:disabled) {
        background: var(--hover-bg, #f3f4f6);
      }
    }

    .icon {
      width: 20px;
      height: 20px;
    }
  `]
})
export class ModalComponent {
  @Input() title = '';
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' | 'full' = 'md';
  @Input() showClose = true;
  @Input() showFooter = true;
  @Input() closeOnBackdrop = true;
  @Input() confirmText = 'Kaydet';
  @Input() cancelText = 'İptal';
  @Input() confirmDisabled = false;
  @Input() footerTemplate?: TemplateRef<any>;

  @Output() onClose = new EventEmitter<void>();
  @Output() onConfirm = new EventEmitter<void>();

  isOpen = signal(false);

  open(): void {
    this.isOpen.set(true);
    document.body.style.overflow = 'hidden';
  }

  close(): void {
    this.isOpen.set(false);
    document.body.style.overflow = '';
    this.onClose.emit();
  }
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen()) {
      <div class="dialog-backdrop" (click)="cancel()">
        <div class="dialog" (click)="$event.stopPropagation()">
          <div class="dialog-icon" [class]="'type-' + type">
            @switch (type) {
              @case ('danger') {
                <i class="icon icon-alert-triangle"></i>
              }
              @case ('warning') {
                <i class="icon icon-alert-circle"></i>
              }
              @case ('success') {
                <i class="icon icon-check-circle"></i>
              }
              @default {
                <i class="icon icon-info"></i>
              }
            }
          </div>
          
          <h3 class="dialog-title">{{title}}</h3>
          <p class="dialog-message">{{message}}</p>
          
          <div class="dialog-actions">
            <button class="btn btn-secondary" (click)="cancel()">{{cancelText}}</button>
            <button class="btn" [class]="'btn-' + type" (click)="confirm()">{{confirmText}}</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .dialog-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1200;
    }

    .dialog {
      background: #fff;
      border-radius: 0.75rem;
      padding: 1.5rem;
      width: 400px;
      text-align: center;
    }

    .dialog-icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1rem;

      &.type-danger {
        background: #fee2e2;
        color: #dc2626;
      }

      &.type-warning {
        background: #fef3c7;
        color: #d97706;
      }

      &.type-success {
        background: #d1fae5;
        color: #059669;
      }

      &.type-info {
        background: #dbeafe;
        color: #2563eb;
      }

      .icon {
        width: 28px;
        height: 28px;
      }
    }

    .dialog-title {
      margin: 0 0 0.5rem;
      font-size: 1.125rem;
      font-weight: 600;
    }

    .dialog-message {
      margin: 0 0 1.5rem;
      color: var(--text-secondary, #6b7280);
      font-size: 0.875rem;
    }

    .dialog-actions {
      display: flex;
      gap: 0.75rem;
      justify-content: center;
    }

    .btn {
      padding: 0.625rem 1.5rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      border: 1px solid transparent;
    }

    .btn-secondary {
      background: #fff;
      color: var(--text-primary, #1f2937);
      border-color: var(--border-color, #e5e7eb);

      &:hover {
        background: var(--hover-bg, #f3f4f6);
      }
    }

    .btn-danger {
      background: #dc2626;
      color: #fff;

      &:hover {
        background: #b91c1c;
      }
    }

    .btn-warning {
      background: #d97706;
      color: #fff;

      &:hover {
        background: #b45309;
      }
    }

    .btn-success {
      background: #059669;
      color: #fff;

      &:hover {
        background: #047857;
      }
    }

    .btn-info {
      background: #2563eb;
      color: #fff;

      &:hover {
        background: #1d4ed8;
      }
    }
  `]
})
export class ConfirmDialogComponent {
  @Input() title = 'Onay';
  @Input() message = 'Bu işlemi gerçekleştirmek istediğinize emin misiniz?';
  @Input() type: 'info' | 'warning' | 'danger' | 'success' = 'info';
  @Input() confirmText = 'Evet';
  @Input() cancelText = 'Hayır';

  @Output() onConfirm = new EventEmitter<void>();
  @Output() onCancel = new EventEmitter<void>();

  isOpen = signal(false);

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  confirm(): void {
    this.onConfirm.emit();
    this.close();
  }

  cancel(): void {
    this.onCancel.emit();
    this.close();
  }
}
