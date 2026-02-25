import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/services/admin.service';

interface DictionaryItem {
  id: string;
  category: string;
  key: string;
  labelTr: string;
  labelEn: string;
  labelAr: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface DictionaryCategory {
  name: string;
  key: string;
  count: number;
  icon: string;
}

@Component({
  selector: 'app-data-dictionary',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="data-dictionary">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-content">
          <h1>Veri Sözlüğü</h1>
          <p>Sistem kategorileri, etiketleri ve tanımlarını yönetin</p>
        </div>
        <button class="btn btn-primary" (click)="openCreateModal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Yeni Öğe
        </button>
      </div>

      <div class="dictionary-layout">
        <!-- Categories Sidebar -->
        <div class="categories-sidebar">
          <div class="sidebar-header">
            <h3>Kategoriler</h3>
          </div>
          <div class="categories-list">
            <button 
              class="category-item"
              [class.active]="selectedCategory() === ''"
              (click)="selectCategory('')"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
              </svg>
              <span>Tüm Kategoriler</span>
              <span class="count">{{ items().length }}</span>
            </button>
            @for (cat of categories; track cat.key) {
              <button 
                class="category-item"
                [class.active]="selectedCategory() === cat.key"
                (click)="selectCategory(cat.key)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  @switch (cat.icon) {
                    @case ('tag') {
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                      <line x1="7" y1="7" x2="7.01" y2="7"/>
                    }
                    @case ('folder') {
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                    }
                    @case ('smile') {
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                      <line x1="9" y1="9" x2="9.01" y2="9"/>
                      <line x1="15" y1="9" x2="15.01" y2="9"/>
                    }
                    @case ('alert') {
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    }
                    @case ('map') {
                      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                      <line x1="8" y1="2" x2="8" y2="18"/>
                      <line x1="16" y1="6" x2="16" y2="22"/>
                    }
                    @case ('database') {
                      <ellipse cx="12" cy="5" rx="9" ry="3"/>
                      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                    }
                    @default {
                      <circle cx="12" cy="12" r="10"/>
                    }
                  }
                </svg>
                <span>{{ cat.name }}</span>
                <span class="count">{{ getCategoryCount(cat.key) }}</span>
              </button>
            }
          </div>
        </div>

        <!-- Main Content -->
        <div class="main-content">
          <!-- Search & Filters -->
          <div class="filters-bar">
            <div class="search-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input 
                type="text" 
                placeholder="Ara..."
                [(ngModel)]="searchQuery"
                (input)="filterItems()"
              />
            </div>
            
            <select [(ngModel)]="filterStatus" (change)="filterItems()">
              <option value="">Tüm Durumlar</option>
              <option value="active">Aktif</option>
              <option value="inactive">Pasif</option>
            </select>

            <button class="btn btn-outline" (click)="exportData()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Dışa Aktar
            </button>
          </div>

          <!-- Items Table -->
          <div class="items-table-container">
            <table class="items-table">
              <thead>
                <tr>
                  <th>Anahtar</th>
                  <th>Türkçe</th>
                  <th>İngilizce</th>
                  <th>Arapça</th>
                  <th>Sıra</th>
                  <th>Durum</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                @for (item of filteredItems(); track item.id) {
                  <tr [class.inactive]="!item.isActive">
                    <td>
                      <div class="key-cell">
                        <code>{{ item.key }}</code>
                        @if (item.description) {
                          <span class="key-desc">{{ item.description }}</span>
                        }
                      </div>
                    </td>
                    <td>{{ item.labelTr }}</td>
                    <td>{{ item.labelEn }}</td>
                    <td class="rtl">{{ item.labelAr }}</td>
                    <td>{{ item.sortOrder }}</td>
                    <td>
                      <span class="status-badge" [class.active]="item.isActive">
                        {{ item.isActive ? 'Aktif' : 'Pasif' }}
                      </span>
                    </td>
                    <td>
                      <div class="actions">
                        <button class="action-btn" (click)="editItem(item)" title="Düzenle">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button class="action-btn" (click)="toggleStatus(item)" 
                                [title]="item.isActive ? 'Pasifleştir' : 'Aktifleştir'">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            @if (item.isActive) {
                              <circle cx="12" cy="12" r="10"/>
                              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                            } @else {
                              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                              <polyline points="22 4 12 14.01 9 11.01"/>
                            }
                          </svg>
                        </button>
                        <button class="action-btn danger" (click)="deleteItem(item)" title="Sil">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="7" class="empty-state">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                        <polyline points="13 2 13 9 20 9"/>
                      </svg>
                      <span>Veri bulunamadı</span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Item Modal -->
      @if (showModal()) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal modal-large" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>{{ editingItem ? 'Öğe Düzenle' : 'Yeni Öğe' }}</h2>
              <button class="modal-close" (click)="closeModal()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div class="modal-body">
              <div class="form-row">
                <div class="form-group">
                  <label>Kategori *</label>
                  <select [(ngModel)]="itemForm.category">
                    @for (cat of categories; track cat.key) {
                      <option [value]="cat.key">{{ cat.name }}</option>
                    }
                  </select>
                </div>
                <div class="form-group">
                  <label>Anahtar (Key) *</label>
                  <input type="text" [(ngModel)]="itemForm.key" placeholder="örn: positive" />
                  <span class="help-text">Sistem tarafından kullanılacak benzersiz anahtar</span>
                </div>
              </div>

              <div class="form-group">
                <label>Açıklama</label>
                <input type="text" [(ngModel)]="itemForm.description" placeholder="Bu öğenin amacını açıklayın" />
              </div>

              <div class="translations-section">
                <h4>Çeviriler</h4>
                <div class="form-row three-col">
                  <div class="form-group">
                    <label>
                      <span class="flag">🇹🇷</span>
                      Türkçe *
                    </label>
                    <input type="text" [(ngModel)]="itemForm.labelTr" placeholder="Türkçe etiket" />
                  </div>
                  <div class="form-group">
                    <label>
                      <span class="flag">🇬🇧</span>
                      İngilizce
                    </label>
                    <input type="text" [(ngModel)]="itemForm.labelEn" placeholder="English label" />
                  </div>
                  <div class="form-group">
                    <label>
                      <span class="flag">🇸🇦</span>
                      Arapça
                    </label>
                    <input type="text" [(ngModel)]="itemForm.labelAr" placeholder="العربية" dir="rtl" />
                  </div>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Sıralama</label>
                  <input type="number" [(ngModel)]="itemForm.sortOrder" min="0" />
                </div>
                <div class="form-group">
                  <label>Üst Öğe (Opsiyonel)</label>
                  <select [(ngModel)]="itemForm.parentId">
                    <option value="">Yok</option>
                    @for (item of getParentOptions(); track item.id) {
                      <option [value]="item.id">{{ item.labelTr }}</option>
                    }
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label class="toggle-label">
                  <input type="checkbox" [(ngModel)]="itemForm.isActive" />
                  <span class="toggle-switch"></span>
                  <span>Aktif</span>
                </label>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline" (click)="closeModal()">İptal</button>
              <button class="btn btn-primary" (click)="saveItem()">
                {{ editingItem ? 'Güncelle' : 'Oluştur' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .data-dictionary {
      padding: 0;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
    }

    .header-content h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 4px;
    }

    .header-content p {
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 500;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn svg {
      width: 18px;
      height: 18px;
    }

    .btn-primary {
      background: var(--primary-color);
      color: white;
      border: none;
    }

    .btn-primary:hover {
      background: var(--primary-dark);
    }

    .btn-outline {
      background: white;
      border: 1px solid var(--border-color);
      color: var(--text-primary);
    }

    .btn-outline:hover {
      border-color: var(--primary-color);
      color: var(--primary-color);
    }

    /* Layout */
    .dictionary-layout {
      display: grid;
      grid-template-columns: 260px 1fr;
      gap: 24px;
    }

    /* Sidebar */
    .categories-sidebar {
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 12px;
      overflow: hidden;
      height: fit-content;
    }

    .sidebar-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-color);
    }

    .sidebar-header h3 {
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--text-secondary);
    }

    .categories-list {
      padding: 8px;
    }

    .category-item {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      background: transparent;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      text-align: left;
      transition: all 0.2s ease;
    }

    .category-item svg {
      width: 20px;
      height: 20px;
      color: var(--text-tertiary);
    }

    .category-item span:first-of-type {
      flex: 1;
      font-size: 0.875rem;
      color: var(--text-primary);
    }

    .category-item .count {
      font-size: 0.75rem;
      color: var(--text-tertiary);
      background: var(--bg-secondary);
      padding: 2px 8px;
      border-radius: 10px;
    }

    .category-item:hover {
      background: var(--bg-secondary);
    }

    .category-item.active {
      background: var(--primary-light);
    }

    .category-item.active svg {
      color: var(--primary-color);
    }

    .category-item.active span:first-of-type {
      color: var(--primary-color);
      font-weight: 500;
    }

    /* Main Content */
    .main-content {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* Filters */
    .filters-bar {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    .search-box {
      flex: 1;
      min-width: 250px;
      position: relative;
    }

    .search-box svg {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      width: 20px;
      height: 20px;
      color: var(--text-tertiary);
    }

    .search-box input {
      width: 100%;
      padding: 12px 14px 12px 44px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      font-size: 0.875rem;
      background: white;
    }

    .search-box input:focus {
      outline: none;
      border-color: var(--primary-color);
    }

    .filters-bar select {
      padding: 12px 16px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      font-size: 0.875rem;
      background: white;
      min-width: 150px;
    }

    /* Table */
    .items-table-container {
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 12px;
      overflow: hidden;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
    }

    .items-table th,
    .items-table td {
      padding: 14px 16px;
      text-align: left;
      border-bottom: 1px solid var(--border-color);
    }

    .items-table th {
      background: var(--bg-secondary);
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      color: var(--text-secondary);
    }

    .items-table tbody tr:hover {
      background: var(--bg-secondary);
    }

    .items-table tbody tr.inactive {
      opacity: 0.6;
    }

    .key-cell {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .key-cell code {
      font-family: 'Fira Code', monospace;
      font-size: 0.8125rem;
      background: var(--bg-secondary);
      padding: 4px 8px;
      border-radius: 4px;
      display: inline-block;
      width: fit-content;
    }

    .key-desc {
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    .rtl {
      direction: rtl;
      text-align: right;
    }

    .status-badge {
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 500;
      background: var(--bg-secondary);
      color: var(--text-tertiary);
    }

    .status-badge.active {
      background: #e8f5e9;
      color: #388e3c;
    }

    .actions {
      display: flex;
      gap: 8px;
    }

    .action-btn {
      width: 32px;
      height: 32px;
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .action-btn svg {
      width: 16px;
      height: 16px;
      color: var(--text-secondary);
    }

    .action-btn:hover {
      border-color: var(--primary-color);
    }

    .action-btn:hover svg {
      color: var(--primary-color);
    }

    .action-btn.danger:hover {
      border-color: var(--error-color);
    }

    .action-btn.danger:hover svg {
      color: var(--error-color);
    }

    .empty-state {
      text-align: center;
      padding: 48px !important;
      color: var(--text-tertiary);
    }

    .empty-state svg {
      width: 48px;
      height: 48px;
      margin-bottom: 12px;
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .modal {
      background: white;
      border-radius: 16px;
      width: 100%;
      max-width: 500px;
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .modal.modal-large {
      max-width: 700px;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid var(--border-color);
    }

    .modal-header h2 {
      font-size: 1.25rem;
      font-weight: 600;
    }

    .modal-close {
      background: none;
      border: none;
      padding: 8px;
      cursor: pointer;
      color: var(--text-tertiary);
      border-radius: 8px;
    }

    .modal-close:hover {
      background: var(--bg-secondary);
    }

    .modal-close svg {
      width: 20px;
      height: 20px;
    }

    .modal-body {
      padding: 24px;
      overflow-y: auto;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .form-row.three-col {
      grid-template-columns: repeat(3, 1fr);
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
      margin-bottom: 8px;
      font-size: 0.875rem;
    }

    .flag {
      font-size: 1.125rem;
    }

    .form-group input,
    .form-group select {
      width: 100%;
      padding: 12px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      font-size: 0.875rem;
    }

    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: var(--primary-color);
    }

    .help-text {
      font-size: 0.75rem;
      color: var(--text-tertiary);
      margin-top: 4px;
      display: block;
    }

    .translations-section {
      background: var(--bg-secondary);
      padding: 16px;
      border-radius: 12px;
      margin-bottom: 20px;
    }

    .translations-section h4 {
      font-size: 0.875rem;
      font-weight: 600;
      margin-bottom: 16px;
    }

    .translations-section .form-group {
      margin-bottom: 0;
    }

    .toggle-label {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      font-weight: 500;
    }

    .toggle-label input {
      display: none;
    }

    .toggle-switch {
      width: 44px;
      height: 24px;
      background: var(--border-color);
      border-radius: 12px;
      position: relative;
      transition: background 0.2s ease;
    }

    .toggle-switch::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 20px;
      height: 20px;
      background: white;
      border-radius: 50%;
      transition: transform 0.2s ease;
    }

    .toggle-label input:checked + .toggle-switch {
      background: var(--primary-color);
    }

    .toggle-label input:checked + .toggle-switch::after {
      transform: translateX(20px);
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid var(--border-color);
    }

    @media (max-width: 1024px) {
      .dictionary-layout {
        grid-template-columns: 1fr;
      }

      .categories-sidebar {
        display: none;
      }
    }

    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        gap: 16px;
      }

      .form-row,
      .form-row.three-col {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DataDictionaryComponent implements OnInit {
  private adminService = inject(AdminService);

  items = signal<DictionaryItem[]>([]);
  filteredItems = signal<DictionaryItem[]>([]);
  selectedCategory = signal('');
  showModal = signal(false);
  editingItem: DictionaryItem | null = null;

  searchQuery = '';
  filterStatus = '';

  itemForm = {
    category: '',
    key: '',
    labelTr: '',
    labelEn: '',
    labelAr: '',
    description: '',
    sortOrder: 0,
    parentId: '',
    isActive: true
  };

  categories: DictionaryCategory[] = [
    { name: 'Etiketler', key: 'tags', count: 0, icon: 'tag' },
    { name: 'Kategoriler', key: 'categories', count: 0, icon: 'folder' },
    { name: 'Duygu Durumları', key: 'sentiments', count: 0, icon: 'smile' },
    { name: 'Öncelikler', key: 'priorities', count: 0, icon: 'alert' },
    { name: 'Temas Noktaları', key: 'touchpoints', count: 0, icon: 'map' },
    { name: 'Veri Kaynakları', key: 'datasources', count: 0, icon: 'database' }
  ];

  ngOnInit(): void {
    this.loadItems();
  }

  loadItems(): void {
    const mockItems: DictionaryItem[] = [
      // Sentiments
      {
        id: '1',
        category: 'sentiments',
        key: 'positive',
        labelTr: 'Olumlu',
        labelEn: 'Positive',
        labelAr: 'إيجابي',
        description: 'Olumlu duygu durumu',
        isActive: true,
        sortOrder: 1,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      },
      {
        id: '2',
        category: 'sentiments',
        key: 'negative',
        labelTr: 'Olumsuz',
        labelEn: 'Negative',
        labelAr: 'سلبي',
        description: 'Olumsuz duygu durumu',
        isActive: true,
        sortOrder: 2,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      },
      {
        id: '3',
        category: 'sentiments',
        key: 'neutral',
        labelTr: 'Nötr',
        labelEn: 'Neutral',
        labelAr: 'محايد',
        description: 'Nötr duygu durumu',
        isActive: true,
        sortOrder: 3,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      },
      // Categories
      {
        id: '4',
        category: 'categories',
        key: 'service_quality',
        labelTr: 'Hizmet Kalitesi',
        labelEn: 'Service Quality',
        labelAr: 'جودة الخدمة',
        description: 'Hizmet kalitesiyle ilgili geri bildirimler',
        isActive: true,
        sortOrder: 1,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      },
      {
        id: '5',
        category: 'categories',
        key: 'mobile_banking',
        labelTr: 'Mobil Bankacılık',
        labelEn: 'Mobile Banking',
        labelAr: 'الخدمات المصرفية عبر الهاتف المحمول',
        description: 'Mobil uygulama ile ilgili geri bildirimler',
        isActive: true,
        sortOrder: 2,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      },
      {
        id: '6',
        category: 'categories',
        key: 'branch_service',
        labelTr: 'Şube Hizmetleri',
        labelEn: 'Branch Services',
        labelAr: 'خدمات الفرع',
        description: 'Şube hizmetleriyle ilgili geri bildirimler',
        isActive: true,
        sortOrder: 3,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      },
      // Priorities
      {
        id: '7',
        category: 'priorities',
        key: 'critical',
        labelTr: 'Kritik',
        labelEn: 'Critical',
        labelAr: 'حرج',
        description: 'En yüksek öncelik',
        isActive: true,
        sortOrder: 1,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      },
      {
        id: '8',
        category: 'priorities',
        key: 'high',
        labelTr: 'Yüksek',
        labelEn: 'High',
        labelAr: 'عالي',
        description: 'Yüksek öncelik',
        isActive: true,
        sortOrder: 2,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      },
      {
        id: '9',
        category: 'priorities',
        key: 'medium',
        labelTr: 'Orta',
        labelEn: 'Medium',
        labelAr: 'متوسط',
        description: 'Orta öncelik',
        isActive: true,
        sortOrder: 3,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      },
      {
        id: '10',
        category: 'priorities',
        key: 'low',
        labelTr: 'Düşük',
        labelEn: 'Low',
        labelAr: 'منخفض',
        description: 'Düşük öncelik',
        isActive: true,
        sortOrder: 4,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      },
      // Touchpoints
      {
        id: '11',
        category: 'touchpoints',
        key: 'mobile_app',
        labelTr: 'Mobil Uygulama',
        labelEn: 'Mobile App',
        labelAr: 'تطبيق الهاتف المحمول',
        description: 'Mobil uygulama temas noktası',
        isActive: true,
        sortOrder: 1,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      },
      {
        id: '12',
        category: 'touchpoints',
        key: 'internet_banking',
        labelTr: 'İnternet Bankacılığı',
        labelEn: 'Internet Banking',
        labelAr: 'الخدمات المصرفية عبر الإنترنت',
        description: 'İnternet bankacılığı temas noktası',
        isActive: true,
        sortOrder: 2,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      },
      {
        id: '13',
        category: 'touchpoints',
        key: 'branch',
        labelTr: 'Şube',
        labelEn: 'Branch',
        labelAr: 'فرع',
        description: 'Şube temas noktası',
        isActive: true,
        sortOrder: 3,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      },
      {
        id: '14',
        category: 'touchpoints',
        key: 'call_center',
        labelTr: 'Çağrı Merkezi',
        labelEn: 'Call Center',
        labelAr: 'مركز الاتصال',
        description: 'Çağrı merkezi temas noktası',
        isActive: true,
        sortOrder: 4,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      },
      // Datasources
      {
        id: '15',
        category: 'datasources',
        key: 'twitter',
        labelTr: 'Twitter/X',
        labelEn: 'Twitter/X',
        labelAr: 'تويتر/إكس',
        description: 'Twitter sosyal medya platformu',
        isActive: true,
        sortOrder: 1,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      },
      {
        id: '16',
        category: 'datasources',
        key: 'instagram',
        labelTr: 'Instagram',
        labelEn: 'Instagram',
        labelAr: 'إنستغرام',
        description: 'Instagram sosyal medya platformu',
        isActive: true,
        sortOrder: 2,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      },
      {
        id: '17',
        category: 'datasources',
        key: 'sikayetvar',
        labelTr: 'Şikayetvar',
        labelEn: 'Şikayetvar',
        labelAr: 'شكايت فار',
        description: 'Şikayetvar şikayet platformu',
        isActive: true,
        sortOrder: 3,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      },
      {
        id: '18',
        category: 'datasources',
        key: 'google_reviews',
        labelTr: 'Google Yorumları',
        labelEn: 'Google Reviews',
        labelAr: 'مراجعات جوجل',
        description: 'Google harita yorumları',
        isActive: true,
        sortOrder: 4,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      }
    ];

    this.items.set(mockItems);
    this.filterItems();
  }

  getCategoryCount(key: string): number {
    return this.items().filter(i => i.category === key).length;
  }

  selectCategory(key: string): void {
    this.selectedCategory.set(key);
    this.filterItems();
  }

  filterItems(): void {
    let filtered = [...this.items()];

    if (this.selectedCategory()) {
      filtered = filtered.filter(i => i.category === this.selectedCategory());
    }

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(i => 
        i.key.toLowerCase().includes(query) ||
        i.labelTr.toLowerCase().includes(query) ||
        i.labelEn.toLowerCase().includes(query)
      );
    }

    if (this.filterStatus === 'active') {
      filtered = filtered.filter(i => i.isActive);
    } else if (this.filterStatus === 'inactive') {
      filtered = filtered.filter(i => !i.isActive);
    }

    filtered.sort((a, b) => a.sortOrder - b.sortOrder);
    this.filteredItems.set(filtered);
  }

  getParentOptions(): DictionaryItem[] {
    if (!this.itemForm.category) return [];
    return this.items()
      .filter(i => i.category === this.itemForm.category && (!this.editingItem || i.id !== this.editingItem.id));
  }

  openCreateModal(): void {
    this.editingItem = null;
    this.itemForm = {
      category: this.selectedCategory() || this.categories[0].key,
      key: '',
      labelTr: '',
      labelEn: '',
      labelAr: '',
      description: '',
      sortOrder: this.items().length + 1,
      parentId: '',
      isActive: true
    };
    this.showModal.set(true);
  }

  editItem(item: DictionaryItem): void {
    this.editingItem = item;
    this.itemForm = {
      category: item.category,
      key: item.key,
      labelTr: item.labelTr,
      labelEn: item.labelEn,
      labelAr: item.labelAr,
      description: item.description,
      sortOrder: item.sortOrder,
      parentId: item.parentId || '',
      isActive: item.isActive
    };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingItem = null;
  }

  saveItem(): void {
    console.log('Save item:', this.itemForm);
    this.closeModal();
  }

  toggleStatus(item: DictionaryItem): void {
    this.items.update(items => 
      items.map(i => i.id === item.id ? { ...i, isActive: !i.isActive } : i)
    );
    this.filterItems();
  }

  deleteItem(item: DictionaryItem): void {
    if (confirm(`${item.labelTr} öğesini silmek istediğinizden emin misiniz?`)) {
      this.items.update(items => items.filter(i => i.id !== item.id));
      this.filterItems();
    }
  }

  exportData(): void {
    const data = this.filteredItems();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data-dictionary.json';
    a.click();
    URL.revokeObjectURL(url);
  }
}
