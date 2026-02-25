import { Component, Input, Output, EventEmitter, ContentChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaginationParams } from '../../../core/models';

export interface TableColumn<T = any> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  template?: TemplateRef<any>;
  format?: (value: any, row: T) => string;
  class?: string | ((row: T) => string);
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="data-table-container">
      <!-- Table Header Actions -->
      @if (showSearch || showFilters || headerActions) {
        <div class="table-header">
          @if (showSearch) {
            <div class="search-box">
              <i class="icon icon-search"></i>
              <input 
                type="text" 
                [placeholder]="searchPlaceholder"
                [(ngModel)]="searchQuery"
                (ngModelChange)="onSearchChange($event)"
              >
            </div>
          }
          
          <div class="header-actions">
            <ng-content select="[tableActions]"></ng-content>
          </div>
        </div>
      }

      <!-- Loading Overlay -->
      @if (loading) {
        <div class="loading-overlay">
          <div class="spinner"></div>
          <span>Yükleniyor...</span>
        </div>
      }

      <!-- Table -->
      <div class="table-wrapper">
        <table class="data-table" [class.striped]="striped">
          <thead>
            <tr>
              @if (selectable) {
                <th class="checkbox-cell">
                  <input 
                    type="checkbox" 
                    [checked]="allSelected"
                    [indeterminate]="someSelected && !allSelected"
                    (change)="toggleSelectAll($event)"
                  >
                </th>
              }
              @for (column of columns; track column.key) {
                <th 
                  [style.width]="column.width"
                  [style.text-align]="column.align || 'left'"
                  [class.sortable]="column.sortable"
                  (click)="column.sortable && sort(column.key)"
                >
                  {{column.header}}
                  @if (column.sortable) {
                    <span class="sort-icon">
                      @if (sortBy === column.key) {
                        <i class="icon" [class.icon-chevron-up]="sortOrder === 'asc'" [class.icon-chevron-down]="sortOrder === 'desc'"></i>
                      } @else {
                        <i class="icon icon-chevrons-up-down"></i>
                      }
                    </span>
                  }
                </th>
              }
              @if (showActions) {
                <th class="actions-cell">İşlemler</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (row of data; track trackByFn ? trackByFn(row) : $index) {
              <tr [class.selected]="isSelected(row)" (click)="onRowClick.emit(row)">
                @if (selectable) {
                  <td class="checkbox-cell" (click)="$event.stopPropagation()">
                    <input 
                      type="checkbox" 
                      [checked]="isSelected(row)"
                      (change)="toggleSelect(row)"
                    >
                  </td>
                }
                @for (column of columns; track column.key) {
                  <td 
                    [style.text-align]="column.align || 'left'"
                    [class]="getColumnClass(column, row)"
                  >
                    @if (column.template) {
                      <ng-container *ngTemplateOutlet="column.template; context: { $implicit: row, value: getValue(row, column.key) }"></ng-container>
                    } @else if (column.format) {
                      {{column.format(getValue(row, column.key), row)}}
                    } @else {
                      {{getValue(row, column.key)}}
                    }
                  </td>
                }
                @if (showActions) {
                  <td class="actions-cell" (click)="$event.stopPropagation()">
                    <ng-content select="[rowActions]"></ng-content>
                    <ng-container *ngTemplateOutlet="rowActionsTemplate; context: { $implicit: row }"></ng-container>
                  </td>
                }
              </tr>
            } @empty {
              <tr class="empty-row">
                <td [attr.colspan]="totalColumns">
                  <div class="empty-state">
                    <i class="icon icon-inbox"></i>
                    <p>{{emptyMessage}}</p>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      @if (showPagination && totalItems > 0) {
        <div class="table-footer">
          <div class="pagination-info">
            {{(currentPage - 1) * pageSize + 1}} - {{Math.min(currentPage * pageSize, totalItems)}} / {{totalItems}} kayıt
          </div>
          
          <div class="page-size-selector">
            <label>Sayfa başına:</label>
            <select [(ngModel)]="pageSize" (ngModelChange)="onPageSizeChange($event)">
              <option [value]="10">10</option>
              <option [value]="25">25</option>
              <option [value]="50">50</option>
              <option [value]="100">100</option>
            </select>
          </div>

          <div class="pagination">
            <button 
              class="page-btn" 
              [disabled]="currentPage === 1"
              (click)="goToPage(1)"
            >
              <i class="icon icon-chevrons-left"></i>
            </button>
            <button 
              class="page-btn" 
              [disabled]="currentPage === 1"
              (click)="goToPage(currentPage - 1)"
            >
              <i class="icon icon-chevron-left"></i>
            </button>
            
            @for (page of visiblePages; track page) {
              <button 
                class="page-btn" 
                [class.active]="page === currentPage"
                [disabled]="page === '...'"
                (click)="page !== '...' && goToPage(+page)"
              >
                {{page}}
              </button>
            }
            
            <button 
              class="page-btn" 
              [disabled]="currentPage === totalPages"
              (click)="goToPage(currentPage + 1)"
            >
              <i class="icon icon-chevron-right"></i>
            </button>
            <button 
              class="page-btn" 
              [disabled]="currentPage === totalPages"
              (click)="goToPage(totalPages)"
            >
              <i class="icon icon-chevrons-right"></i>
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .data-table-container {
      background: #fff;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      position: relative;
    }

    .table-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem;
      border-bottom: 1px solid var(--border-color, #e5e7eb);
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--input-bg, #f3f4f6);
      border-radius: 0.375rem;
      padding: 0.5rem 0.75rem;
      min-width: 280px;

      input {
        border: none;
        background: transparent;
        outline: none;
        width: 100%;
        font-size: 0.875rem;
      }
    }

    .loading-overlay {
      position: absolute;
      inset: 0;
      background: rgba(255, 255, 255, 0.8);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      z-index: 10;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--border-color, #e5e7eb);
      border-top-color: var(--primary-color, #3b82f6);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .table-wrapper {
      overflow-x: auto;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;

      &.striped tbody tr:nth-child(even) {
        background: var(--stripe-bg, #f9fafb);
      }
    }

    th, td {
      padding: 0.75rem 1rem;
      text-align: left;
      border-bottom: 1px solid var(--border-color, #e5e7eb);
    }

    th {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--text-secondary, #6b7280);
      background: var(--header-bg, #f9fafb);
      white-space: nowrap;

      &.sortable {
        cursor: pointer;
        user-select: none;

        &:hover {
          background: var(--hover-bg, #f3f4f6);
        }
      }
    }

    .sort-icon {
      margin-left: 0.25rem;
      opacity: 0.5;

      .icon {
        width: 14px;
        height: 14px;
      }
    }

    tbody tr {
      transition: background 0.2s;

      &:hover {
        background: var(--hover-bg, #f9fafb);
      }

      &.selected {
        background: var(--selected-bg, #eff6ff);
      }
    }

    .checkbox-cell {
      width: 40px;
      text-align: center;
    }

    .actions-cell {
      width: 120px;
      text-align: center;
    }

    .empty-row td {
      padding: 3rem;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      color: var(--text-secondary, #6b7280);

      .icon {
        font-size: 2.5rem;
        opacity: 0.5;
      }
    }

    .table-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem;
      border-top: 1px solid var(--border-color, #e5e7eb);
      gap: 1rem;
    }

    .pagination-info {
      font-size: 0.875rem;
      color: var(--text-secondary, #6b7280);
    }

    .page-size-selector {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;

      select {
        padding: 0.375rem 0.5rem;
        border: 1px solid var(--border-color, #e5e7eb);
        border-radius: 0.375rem;
        background: #fff;
      }
    }

    .pagination {
      display: flex;
      gap: 0.25rem;
    }

    .page-btn {
      min-width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--border-color, #e5e7eb);
      border-radius: 0.375rem;
      background: #fff;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s;

      &:hover:not(:disabled) {
        background: var(--hover-bg, #f3f4f6);
        border-color: var(--primary-color, #3b82f6);
      }

      &.active {
        background: var(--primary-color, #3b82f6);
        border-color: var(--primary-color, #3b82f6);
        color: #fff;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .icon {
      width: 16px;
      height: 16px;
    }
  `]
})
export class DataTableComponent<T = any> {
  @Input() data: T[] = [];
  @Input() columns: TableColumn<T>[] = [];
  @Input() loading = false;
  @Input() selectable = false;
  @Input() showSearch = true;
  @Input() showFilters = false;
  @Input() showActions = false;
  @Input() showPagination = true;
  @Input() striped = true;
  @Input() searchPlaceholder = 'Ara...';
  @Input() emptyMessage = 'Kayıt bulunamadı';
  @Input() totalItems = 0;
  @Input() currentPage = 1;
  @Input() pageSize = 10;
  @Input() headerActions = false;
  @Input() sortBy?: string;
  @Input() sortOrder: 'asc' | 'desc' = 'asc';
  @Input() trackByFn?: (item: T) => any;
  @Input() rowActionsTemplate?: TemplateRef<any>;

  @Output() onSearch = new EventEmitter<string>();
  @Output() onSort = new EventEmitter<{ sortBy: string; sortOrder: 'asc' | 'desc' }>();
  @Output() onPageChange = new EventEmitter<PaginationParams>();
  @Output() onRowClick = new EventEmitter<T>();
  @Output() onSelectionChange = new EventEmitter<T[]>();

  searchQuery = '';
  selectedItems: T[] = [];
  Math = Math;

  get totalColumns(): number {
    let count = this.columns.length;
    if (this.selectable) count++;
    if (this.showActions) count++;
    return count;
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  get visiblePages(): (number | string)[] {
    const pages: (number | string)[] = [];
    const total = this.totalPages;
    const current = this.currentPage;
    const delta = 2;

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      if (current <= delta + 1) {
        for (let i = 1; i <= delta + 3; i++) pages.push(i);
        pages.push('...');
        pages.push(total);
      } else if (current >= total - delta) {
        pages.push(1);
        pages.push('...');
        for (let i = total - delta - 2; i <= total; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = current - delta; i <= current + delta; i++) pages.push(i);
        pages.push('...');
        pages.push(total);
      }
    }

    return pages;
  }

  get allSelected(): boolean {
    return this.data.length > 0 && this.selectedItems.length === this.data.length;
  }

  get someSelected(): boolean {
    return this.selectedItems.length > 0 && this.selectedItems.length < this.data.length;
  }

  getValue(row: T, key: string): any {
    return key.split('.').reduce((obj: any, k) => obj?.[k], row);
  }

  getColumnClass(column: TableColumn<T>, row: T): string {
    if (typeof column.class === 'function') {
      return column.class(row);
    }
    return column.class || '';
  }

  isSelected(row: T): boolean {
    return this.selectedItems.includes(row);
  }

  toggleSelect(row: T): void {
    const index = this.selectedItems.indexOf(row);
    if (index > -1) {
      this.selectedItems.splice(index, 1);
    } else {
      this.selectedItems.push(row);
    }
    this.onSelectionChange.emit([...this.selectedItems]);
  }

  toggleSelectAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedItems = checked ? [...this.data] : [];
    this.onSelectionChange.emit([...this.selectedItems]);
  }

  sort(key: string): void {
    if (this.sortBy === key) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = key;
      this.sortOrder = 'asc';
    }
    this.onSort.emit({ sortBy: this.sortBy, sortOrder: this.sortOrder });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.emitPageChange();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.emitPageChange();
  }

  onSearchChange(query: string): void {
    this.onSearch.emit(query);
  }

  private emitPageChange(): void {
    this.onPageChange.emit({
      page: this.currentPage,
      pageSize: this.pageSize,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder
    });
  }
}
