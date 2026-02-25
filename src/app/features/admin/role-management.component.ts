import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/services/admin.service';

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
  isSystem: boolean;
  createdAt: Date;
}

interface PermissionGroup {
  name: string;
  permissions: { value: string; label: string; description: string }[];
}

@Component({
  selector: 'app-role-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="role-management">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-content">
          <h1>Rol ve Yetki Yönetimi</h1>
          <p>Sistem rollerini ve yetkilerini yönetin</p>
        </div>
        <button class="btn btn-primary" (click)="openCreateModal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <line x1="12" y1="9" x2="12" y2="15"/>
            <line x1="9" y1="12" x2="15" y2="12"/>
          </svg>
          Yeni Rol
        </button>
      </div>

      <!-- Roles Grid -->
      <div class="roles-grid">
        @for (role of roles(); track role.id) {
          <div class="role-card" [class.system]="role.isSystem">
            <div class="role-header">
              <div class="role-icon" [class]="getRoleIconClass(role.name)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  @switch (role.name) {
                    @case ('Admin') {
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    }
                    @case ('Yönetici') {
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                    }
                    @default {
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                    }
                  }
                </svg>
              </div>
              <div class="role-info">
                <h3>{{ role.name }}</h3>
                @if (role.isSystem) {
                  <span class="system-badge">Sistem Rolü</span>
                }
              </div>
            </div>

            <p class="role-description">{{ role.description }}</p>

            <div class="role-stats">
              <div class="stat">
                <span class="stat-value">{{ role.userCount }}</span>
                <span class="stat-label">Kullanıcı</span>
              </div>
              <div class="stat">
                <span class="stat-value">{{ role.permissions.length }}</span>
                <span class="stat-label">Yetki</span>
              </div>
            </div>

            <div class="permissions-preview">
              <span class="preview-label">Yetkiler:</span>
              <div class="permissions-tags">
                @for (perm of role.permissions.slice(0, 3); track perm) {
                  <span class="perm-tag">{{ getPermissionLabel(perm) }}</span>
                }
                @if (role.permissions.length > 3) {
                  <span class="perm-more">+{{ role.permissions.length - 3 }} daha</span>
                }
              </div>
            </div>

            <div class="role-actions">
              <button class="action-btn" (click)="viewRole(role)" title="Görüntüle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
              @if (!role.isSystem) {
                <button class="action-btn" (click)="editRole(role)" title="Düzenle">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button class="action-btn" (click)="duplicateRole(role)" title="Kopyala">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                </button>
                <button class="action-btn danger" (click)="deleteRole(role)" title="Sil">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              }
            </div>
          </div>
        }
      </div>

      <!-- Role Modal -->
      @if (showModal()) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal modal-large" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>{{ viewMode() ? 'Rol Detayı' : (editingRole ? 'Rol Düzenle' : 'Yeni Rol') }}</h2>
              <button class="modal-close" (click)="closeModal()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div class="modal-body">
              @if (viewMode()) {
                <div class="role-view">
                  <div class="view-header">
                    <div class="role-icon large" [class]="getRoleIconClass(editingRole?.name || '')">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      </svg>
                    </div>
                    <div>
                      <h3>{{ editingRole?.name }}</h3>
                      <p>{{ editingRole?.description }}</p>
                    </div>
                  </div>

                  <div class="view-section">
                    <h4>Yetkiler ({{ editingRole?.permissions?.length }})</h4>
                    <div class="permissions-list">
                      @for (perm of editingRole?.permissions; track perm) {
                        <div class="permission-item">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          <span>{{ getPermissionLabel(perm) }}</span>
                        </div>
                      }
                    </div>
                  </div>

                  <div class="view-section">
                    <h4>Bu Role Sahip Kullanıcılar ({{ editingRole?.userCount }})</h4>
                    <p class="text-muted">Kullanıcıları görüntülemek için Kullanıcı Yönetimi sayfasını kullanın.</p>
                  </div>
                </div>
              } @else {
                <div class="form-group">
                  <label>Rol Adı *</label>
                  <input type="text" [(ngModel)]="roleForm.name" placeholder="Örn: Raporlama Uzmanı" />
                </div>

                <div class="form-group">
                  <label>Açıklama</label>
                  <textarea [(ngModel)]="roleForm.description" placeholder="Bu rolün amacını açıklayın..."></textarea>
                </div>

                <div class="form-group">
                  <label>Yetkiler</label>
                  <div class="permission-groups">
                    @for (group of permissionGroups; track group.name) {
                      <div class="permission-group">
                        <div class="group-header" (click)="toggleGroup(group.name)">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                               [class.rotated]="expandedGroups.has(group.name)">
                            <polyline points="9 18 15 12 9 6"/>
                          </svg>
                          <span>{{ group.name }}</span>
                          <span class="group-count">
                            {{ getSelectedCount(group) }} / {{ group.permissions.length }}
                          </span>
                        </div>
                        @if (expandedGroups.has(group.name)) {
                          <div class="group-permissions">
                            <label class="select-all" (click)="toggleGroupAll(group, $event)">
                              <input 
                                type="checkbox" 
                                [checked]="isGroupAllSelected(group)"
                                [indeterminate]="isGroupPartiallySelected(group)"
                              />
                              <span>Tümünü Seç</span>
                            </label>
                            @for (perm of group.permissions; track perm.value) {
                              <label class="permission-checkbox">
                                <input 
                                  type="checkbox"
                                  [checked]="roleForm.permissions.includes(perm.value)"
                                  (change)="togglePermission(perm.value)"
                                />
                                <div class="perm-info">
                                  <span class="perm-label">{{ perm.label }}</span>
                                  <span class="perm-desc">{{ perm.description }}</span>
                                </div>
                              </label>
                            }
                          </div>
                        }
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
            <div class="modal-footer">
              @if (viewMode()) {
                <button class="btn btn-outline" (click)="closeModal()">Kapat</button>
                @if (!editingRole?.isSystem) {
                  <button class="btn btn-primary" (click)="switchToEdit()">Düzenle</button>
                }
              } @else {
                <button class="btn btn-outline" (click)="closeModal()">İptal</button>
                <button class="btn btn-primary" (click)="saveRole()">
                  {{ editingRole ? 'Güncelle' : 'Oluştur' }}
                </button>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .role-management {
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

    /* Roles Grid */
    .roles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 20px;
    }

    .role-card {
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 24px;
      transition: all 0.2s ease;
    }

    .role-card:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }

    .role-card.system {
      border-color: var(--primary-light);
      background: linear-gradient(135deg, #f8f9ff 0%, white 100%);
    }

    .role-header {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 16px;
    }

    .role-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .role-icon svg {
      width: 24px;
      height: 24px;
    }

    .role-icon.large {
      width: 64px;
      height: 64px;
    }

    .role-icon.large svg {
      width: 32px;
      height: 32px;
    }

    .role-icon.admin { background: #f3e5f5; color: #7b1fa2; }
    .role-icon.manager { background: #e3f2fd; color: #1976d2; }
    .role-icon.analyst { background: #e8f5e9; color: #388e3c; }
    .role-icon.viewer { background: #f5f5f5; color: #616161; }
    .role-icon.maker { background: #fff3e0; color: #f57c00; }
    .role-icon.checker { background: #fce4ec; color: #c2185b; }
    .role-icon.default { background: #e0e0e0; color: #424242; }

    .role-info h3 {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .system-badge {
      display: inline-block;
      padding: 2px 8px;
      background: var(--primary-light);
      color: var(--primary-color);
      font-size: 0.625rem;
      font-weight: 600;
      border-radius: 4px;
      text-transform: uppercase;
    }

    .role-description {
      color: var(--text-secondary);
      font-size: 0.875rem;
      line-height: 1.5;
      margin-bottom: 20px;
    }

    .role-stats {
      display: flex;
      gap: 24px;
      margin-bottom: 20px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border-color);
    }

    .stat {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    .permissions-preview {
      margin-bottom: 20px;
    }

    .preview-label {
      font-size: 0.75rem;
      color: var(--text-tertiary);
      display: block;
      margin-bottom: 8px;
    }

    .permissions-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .perm-tag {
      padding: 4px 10px;
      background: var(--bg-secondary);
      border-radius: 4px;
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .perm-more {
      padding: 4px 10px;
      background: var(--primary-light);
      color: var(--primary-color);
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .role-actions {
      display: flex;
      gap: 8px;
      padding-top: 16px;
      border-top: 1px solid var(--border-color);
    }

    .action-btn {
      flex: 1;
      padding: 8px;
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }

    .action-btn svg {
      width: 18px;
      height: 18px;
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

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      font-weight: 500;
      margin-bottom: 8px;
      font-size: 0.875rem;
    }

    .form-group input,
    .form-group textarea {
      width: 100%;
      padding: 12px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      font-size: 0.875rem;
    }

    .form-group textarea {
      resize: vertical;
      min-height: 80px;
    }

    .form-group input:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: var(--primary-color);
    }

    /* Permission Groups */
    .permission-groups {
      border: 1px solid var(--border-color);
      border-radius: 8px;
      overflow: hidden;
    }

    .permission-group {
      border-bottom: 1px solid var(--border-color);
    }

    .permission-group:last-child {
      border-bottom: none;
    }

    .group-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      background: var(--bg-secondary);
      cursor: pointer;
      user-select: none;
    }

    .group-header svg {
      width: 18px;
      height: 18px;
      transition: transform 0.2s ease;
    }

    .group-header svg.rotated {
      transform: rotate(90deg);
    }

    .group-header span:first-of-type {
      flex: 1;
      font-weight: 500;
    }

    .group-count {
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    .group-permissions {
      padding: 12px 16px;
    }

    .select-all {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 0;
      border-bottom: 1px solid var(--border-color);
      margin-bottom: 8px;
      cursor: pointer;
      font-weight: 500;
      font-size: 0.875rem;
    }

    .permission-checkbox {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 10px 0;
      cursor: pointer;
    }

    .permission-checkbox input {
      margin-top: 2px;
    }

    .perm-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .perm-label {
      font-size: 0.875rem;
      font-weight: 500;
    }

    .perm-desc {
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    /* View Mode */
    .role-view {
    }

    .view-header {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 24px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border-color);
    }

    .view-header h3 {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .view-header p {
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    .view-section {
      margin-bottom: 24px;
    }

    .view-section h4 {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-secondary);
      margin-bottom: 12px;
    }

    .permissions-list {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }

    .permission-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: var(--bg-secondary);
      border-radius: 6px;
      font-size: 0.875rem;
    }

    .permission-item svg {
      width: 16px;
      height: 16px;
      color: var(--success-color);
    }

    .text-muted {
      color: var(--text-tertiary);
      font-size: 0.875rem;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid var(--border-color);
    }

    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        gap: 16px;
      }

      .roles-grid {
        grid-template-columns: 1fr;
      }

      .permissions-list {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class RoleManagementComponent implements OnInit {
  private adminService = inject(AdminService);

  roles = signal<Role[]>([]);
  showModal = signal(false);
  viewMode = signal(false);
  editingRole: Role | null = null;
  expandedGroups = new Set<string>();

  roleForm = {
    name: '',
    description: '',
    permissions: [] as string[]
  };

  permissionGroups: PermissionGroup[] = [
    {
      name: 'Dashboard',
      permissions: [
        { value: 'dashboard.view', label: 'Dashboard Görüntüleme', description: 'Ana dashboard sayfasını görüntüleme' },
        { value: 'dashboard.export', label: 'Dashboard Dışa Aktarma', description: 'Dashboard verilerini dışa aktarma' }
      ]
    },
    {
      name: 'Geri Bildirimler',
      permissions: [
        { value: 'feedback.view', label: 'Görüntüleme', description: 'Geri bildirimleri görüntüleme' },
        { value: 'feedback.manage', label: 'Yönetim', description: 'Geri bildirimleri düzenleme ve silme' },
        { value: 'feedback.categorize', label: 'Kategorilendirme', description: 'Geri bildirimleri kategorilendirme' },
        { value: 'feedback.respond', label: 'Yanıtlama', description: 'Geri bildirimlere yanıt verme' }
      ]
    },
    {
      name: 'Analizler',
      permissions: [
        { value: 'analysis.view', label: 'Görüntüleme', description: 'Analiz sonuçlarını görüntüleme' },
        { value: 'analysis.sentiment', label: 'Duygu Analizi', description: 'Duygu analizi sonuçlarına erişim' },
        { value: 'analysis.rootcause', label: 'Kök Neden Analizi', description: 'Kök neden analizi sonuçlarına erişim' }
      ]
    },
    {
      name: 'Raporlar',
      permissions: [
        { value: 'reports.view', label: 'Görüntüleme', description: 'Raporları görüntüleme' },
        { value: 'reports.create', label: 'Oluşturma', description: 'Yeni rapor oluşturma' },
        { value: 'reports.schedule', label: 'Zamanlama', description: 'Rapor zamanlaması yapma' },
        { value: 'reports.export', label: 'Dışa Aktarma', description: 'Raporları dışa aktarma' }
      ]
    },
    {
      name: 'Görevler ve Alarmlar',
      permissions: [
        { value: 'tasks.view', label: 'Görüntüleme', description: 'Görevleri görüntüleme' },
        { value: 'tasks.manage', label: 'Yönetim', description: 'Görev oluşturma ve düzenleme' },
        { value: 'tasks.assign', label: 'Atama', description: 'Görev atama' },
        { value: 'alarms.manage', label: 'Alarm Yönetimi', description: 'Alarm kuralları oluşturma ve düzenleme' }
      ]
    },
    {
      name: 'Yönetim',
      permissions: [
        { value: 'admin.users', label: 'Kullanıcı Yönetimi', description: 'Kullanıcı ekleme, düzenleme ve silme' },
        { value: 'admin.roles', label: 'Rol Yönetimi', description: 'Rol ve yetki yönetimi' },
        { value: 'admin.settings', label: 'Sistem Ayarları', description: 'Sistem ayarlarını değiştirme' },
        { value: 'admin.audit', label: 'Denetim Kayıtları', description: 'Denetim kayıtlarını görüntüleme' },
        { value: 'admin.datasources', label: 'Veri Kaynakları', description: 'Veri kaynakları yönetimi' }
      ]
    }
  ];

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles(): void {
    const mockRoles: Role[] = [
      {
        id: '1',
        name: 'Admin',
        description: 'Sistem üzerinde tam yetkiye sahip kullanıcı rolü',
        permissions: ['*'],
        userCount: 2,
        isSystem: true,
        createdAt: new Date('2023-01-01')
      },
      {
        id: '2',
        name: 'Yönetici',
        description: 'Departman yöneticisi yetkilerine sahip rol',
        permissions: ['dashboard.view', 'feedback.view', 'feedback.manage', 'analysis.view', 'reports.view', 'reports.create', 'tasks.view', 'tasks.manage'],
        userCount: 5,
        isSystem: true,
        createdAt: new Date('2023-01-01')
      },
      {
        id: '3',
        name: 'Analist',
        description: 'Veri analizi ve raporlama yetkilerine sahip rol',
        permissions: ['dashboard.view', 'feedback.view', 'analysis.view', 'analysis.sentiment', 'analysis.rootcause', 'reports.view', 'reports.create', 'reports.export'],
        userCount: 8,
        isSystem: true,
        createdAt: new Date('2023-01-01')
      },
      {
        id: '4',
        name: 'Girişçi (Maker)',
        description: 'Veri girişi yapabilen ve onaya gönderebilen rol',
        permissions: ['dashboard.view', 'feedback.view', 'feedback.categorize', 'tasks.view'],
        userCount: 12,
        isSystem: true,
        createdAt: new Date('2023-01-01')
      },
      {
        id: '5',
        name: 'Onaycı (Checker)',
        description: 'Girişçi tarafından yapılan işlemleri onaylayan rol',
        permissions: ['dashboard.view', 'feedback.view', 'tasks.view', 'tasks.manage'],
        userCount: 4,
        isSystem: true,
        createdAt: new Date('2023-01-01')
      },
      {
        id: '6',
        name: 'Görüntüleyici',
        description: 'Sadece görüntüleme yetkisine sahip rol',
        permissions: ['dashboard.view'],
        userCount: 15,
        isSystem: true,
        createdAt: new Date('2023-01-01')
      },
      {
        id: '7',
        name: 'Raporlama Uzmanı',
        description: 'Özelleştirilmiş raporlama yetkilerine sahip rol',
        permissions: ['dashboard.view', 'dashboard.export', 'reports.view', 'reports.create', 'reports.schedule', 'reports.export'],
        userCount: 3,
        isSystem: false,
        createdAt: new Date('2024-01-15')
      }
    ];

    this.roles.set(mockRoles);
  }

  getRoleIconClass(name: string): string {
    const mapping: Record<string, string> = {
      'Admin': 'admin',
      'Yönetici': 'manager',
      'Analist': 'analyst',
      'Görüntüleyici': 'viewer',
      'Girişçi (Maker)': 'maker',
      'Onaycı (Checker)': 'checker'
    };
    return mapping[name] || 'default';
  }

  getPermissionLabel(value: string): string {
    if (value === '*') return 'Tüm Yetkiler';
    for (const group of this.permissionGroups) {
      const perm = group.permissions.find(p => p.value === value);
      if (perm) return perm.label;
    }
    return value;
  }

  getSelectedCount(group: PermissionGroup): number {
    return group.permissions.filter(p => this.roleForm.permissions.includes(p.value)).length;
  }

  isGroupAllSelected(group: PermissionGroup): boolean {
    return group.permissions.every(p => this.roleForm.permissions.includes(p.value));
  }

  isGroupPartiallySelected(group: PermissionGroup): boolean {
    const selected = this.getSelectedCount(group);
    return selected > 0 && selected < group.permissions.length;
  }

  toggleGroup(name: string): void {
    if (this.expandedGroups.has(name)) {
      this.expandedGroups.delete(name);
    } else {
      this.expandedGroups.add(name);
    }
  }

  toggleGroupAll(group: PermissionGroup, event: Event): void {
    event.stopPropagation();
    const allSelected = this.isGroupAllSelected(group);
    
    if (allSelected) {
      this.roleForm.permissions = this.roleForm.permissions.filter(
        p => !group.permissions.some(gp => gp.value === p)
      );
    } else {
      const newPerms = group.permissions
        .map(p => p.value)
        .filter(v => !this.roleForm.permissions.includes(v));
      this.roleForm.permissions = [...this.roleForm.permissions, ...newPerms];
    }
  }

  togglePermission(value: string): void {
    const index = this.roleForm.permissions.indexOf(value);
    if (index > -1) {
      this.roleForm.permissions.splice(index, 1);
    } else {
      this.roleForm.permissions.push(value);
    }
  }

  openCreateModal(): void {
    this.editingRole = null;
    this.viewMode.set(false);
    this.roleForm = {
      name: '',
      description: '',
      permissions: []
    };
    this.expandedGroups.clear();
    this.showModal.set(true);
  }

  viewRole(role: Role): void {
    this.editingRole = role;
    this.viewMode.set(true);
    this.showModal.set(true);
  }

  editRole(role: Role): void {
    this.editingRole = role;
    this.viewMode.set(false);
    this.roleForm = {
      name: role.name,
      description: role.description,
      permissions: [...role.permissions]
    };
    this.expandedGroups.clear();
    this.showModal.set(true);
  }

  switchToEdit(): void {
    if (this.editingRole) {
      this.roleForm = {
        name: this.editingRole.name,
        description: this.editingRole.description,
        permissions: [...this.editingRole.permissions]
      };
      this.viewMode.set(false);
    }
  }

  duplicateRole(role: Role): void {
    this.editingRole = null;
    this.viewMode.set(false);
    this.roleForm = {
      name: `${role.name} (Kopya)`,
      description: role.description,
      permissions: [...role.permissions]
    };
    this.expandedGroups.clear();
    this.showModal.set(true);
  }

  deleteRole(role: Role): void {
    if (role.userCount > 0) {
      alert('Bu role sahip kullanıcılar var. Önce kullanıcıları başka bir role atayın.');
      return;
    }
    
    if (confirm(`${role.name} rolünü silmek istediğinizden emin misiniz?`)) {
      this.roles.update(roles => roles.filter(r => r.id !== role.id));
    }
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingRole = null;
    this.viewMode.set(false);
  }

  saveRole(): void {
    console.log('Save role:', this.roleForm);
    this.closeModal();
  }
}
