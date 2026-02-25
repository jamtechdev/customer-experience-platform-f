import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/services/admin.service';
import { User, UserRole, UserStatus } from '../../core/models/user.model';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="user-management">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-content">
          <h1>Kullanıcı Yönetimi</h1>
          <p>Sistem kullanıcılarını yönetin ve yetkilendirin</p>
        </div>
        <button class="btn btn-primary" (click)="openCreateModal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="8.5" cy="7" r="4"/>
            <line x1="20" y1="8" x2="20" y2="14"/>
            <line x1="23" y1="11" x2="17" y2="11"/>
          </svg>
          Yeni Kullanıcı
        </button>
      </div>

      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon total">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ users().length }}</span>
            <span class="stat-label">Toplam Kullanıcı</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ activeCount() }}</span>
            <span class="stat-label">Aktif</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon admin">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ adminCount() }}</span>
            <span class="stat-label">Admin</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon pending">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ pendingCount() }}</span>
            <span class="stat-label">Onay Bekliyor</span>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-bar">
        <div class="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input 
            type="text" 
            placeholder="Kullanıcı ara..."
            [(ngModel)]="searchQuery"
            (input)="filterUsers()"
          />
        </div>

        <select [(ngModel)]="selectedRole" (change)="filterUsers()">
          <option value="">Tüm Roller</option>
          <option value="ADMIN">Admin</option>
          <option value="MANAGER">Yönetici</option>
          <option value="ANALYST">Analist</option>
          <option value="VIEWER">Görüntüleyici</option>
          <option value="MAKER">Girişçi</option>
          <option value="CHECKER">Onaycı</option>
        </select>

        <select [(ngModel)]="selectedStatus" (change)="filterUsers()">
          <option value="">Tüm Durumlar</option>
          <option value="ACTIVE">Aktif</option>
          <option value="INACTIVE">Pasif</option>
          <option value="PENDING">Onay Bekliyor</option>
          <option value="LOCKED">Kilitli</option>
        </select>
      </div>

      <!-- Users Table -->
      <div class="users-table-container">
        <table class="users-table">
          <thead>
            <tr>
              <th>Kullanıcı</th>
              <th>Rol</th>
              <th>Departman</th>
              <th>Son Giriş</th>
              <th>Durum</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            @for (user of filteredUsers(); track user.id) {
              <tr>
                <td class="user-cell">
                  <div class="user-avatar" [style.background]="getAvatarColor(user.name || '')">
                    {{ getInitials(user.name || '') }}
                  </div>
                  <div class="user-info">
                    <span class="user-name">{{ user.name }}</span>
                    <span class="user-email">{{ user.email }}</span>
                  </div>
                </td>
                <td>
                  <span class="role-badge" [class]="user.role.toLowerCase()">
                    {{ getRoleLabel(user.role) }}
                  </span>
                </td>
                <td>{{ user.department || '-' }}</td>
                <td>{{ user.lastLogin ? formatDate(user.lastLogin) : 'Hiç giriş yok' }}</td>
                <td>
                  <span class="status-badge" [class]="(user.status || 'ACTIVE').toLowerCase()">
                    {{ getStatusLabel(user.status || UserStatus.ACTIVE) }}
                  </span>
                </td>
                <td>
                  <div class="actions">
                    <button class="action-btn" (click)="editUser(user)" title="Düzenle">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    @if (user.status === UserStatus.ACTIVE) {
                      <button class="action-btn" (click)="deactivateUser(user)" title="Pasifleştir">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                        </svg>
                      </button>
                    } @else if (user.status === UserStatus.INACTIVE || user.status === UserStatus.LOCKED) {
                      <button class="action-btn" (click)="activateUser(user)" title="Aktifleştir">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                          <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                      </button>
                    }
                    <button class="action-btn" (click)="resetPassword(user)" title="Şifre Sıfırla">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </button>
                    <button class="action-btn danger" (click)="deleteUser(user)" title="Sil">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- User Modal -->
      @if (showModal()) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>{{ editingUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı' }}</h2>
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
                  <label>Ad Soyad *</label>
                  <input type="text" [(ngModel)]="userForm.name" placeholder="Ad Soyad" />
                </div>
                <div class="form-group">
                  <label>E-posta *</label>
                  <input type="email" [(ngModel)]="userForm.email" placeholder="ornek@email.com" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Rol *</label>
                  <select [(ngModel)]="userForm.role">
                    <option value="ADMIN">Admin</option>
                    <option value="MANAGER">Yönetici</option>
                    <option value="ANALYST">Analist</option>
                    <option value="VIEWER">Görüntüleyici</option>
                    <option value="MAKER">Girişçi</option>
                    <option value="CHECKER">Onaycı</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Departman</label>
                  <input type="text" [(ngModel)]="userForm.department" placeholder="Departman" />
                </div>
              </div>

              @if (!editingUser) {
                <div class="form-row">
                  <div class="form-group">
                    <label>Şifre *</label>
                    <input type="password" [(ngModel)]="userForm.password" placeholder="••••••••" />
                  </div>
                  <div class="form-group">
                    <label>Şifre Tekrar *</label>
                    <input type="password" [(ngModel)]="userForm.confirmPassword" placeholder="••••••••" />
                  </div>
                </div>
              }

              <div class="form-group">
                <label>Yetkiler</label>
                <div class="permissions-grid">
                  @for (perm of availablePermissions; track perm.value) {
                    <label class="permission-item">
                      <input 
                        type="checkbox"
                        [checked]="userForm.permissions.includes(perm.value)"
                        (change)="togglePermission(perm.value)"
                      />
                      <span class="checkbox-custom"></span>
                      <span>{{ perm.label }}</span>
                    </label>
                  }
                </div>
              </div>

              <div class="form-group">
                <label class="toggle-label">
                  <input type="checkbox" [(ngModel)]="userForm.sendInvite" />
                  <span class="toggle-switch"></span>
                  <span>Davet e-postası gönder</span>
                </label>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline" (click)="closeModal()">İptal</button>
              <button class="btn btn-primary" (click)="saveUser()">
                {{ editingUser ? 'Güncelle' : 'Oluştur' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .user-management {
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

    /* Stats */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .stat-icon svg {
      width: 24px;
      height: 24px;
    }

    .stat-icon.total { background: #e3f2fd; color: #1976d2; }
    .stat-icon.active { background: #e8f5e9; color: #388e3c; }
    .stat-icon.admin { background: #f3e5f5; color: #7b1fa2; }
    .stat-icon.pending { background: #fff3e0; color: #f57c00; }

    .stat-content {
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
      color: var(--text-secondary);
    }

    /* Filters */
    .filters-bar {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
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
    .users-table-container {
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 12px;
      overflow: hidden;
    }

    .users-table {
      width: 100%;
      border-collapse: collapse;
    }

    .users-table th,
    .users-table td {
      padding: 16px 20px;
      text-align: left;
      border-bottom: 1px solid var(--border-color);
    }

    .users-table th {
      background: var(--bg-secondary);
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      color: var(--text-secondary);
    }

    .users-table tbody tr:hover {
      background: var(--bg-secondary);
    }

    .user-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 0.875rem;
    }

    .user-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .user-name {
      font-weight: 500;
    }

    .user-email {
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    .role-badge {
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .role-badge.admin { background: #f3e5f5; color: #7b1fa2; }
    .role-badge.manager { background: #e3f2fd; color: #1976d2; }
    .role-badge.analyst { background: #e8f5e9; color: #388e3c; }
    .role-badge.viewer { background: #f5f5f5; color: #616161; }
    .role-badge.maker { background: #fff3e0; color: #f57c00; }
    .role-badge.checker { background: #fce4ec; color: #c2185b; }

    .status-badge {
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .status-badge.active { background: #e8f5e9; color: #388e3c; }
    .status-badge.inactive { background: #f5f5f5; color: #616161; }
    .status-badge.pending { background: #fff3e0; color: #f57c00; }
    .status-badge.locked { background: #ffebee; color: #c62828; }

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
      max-width: 600px;
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
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

    .permissions-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .permission-item {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      font-size: 0.875rem;
    }

    .permission-item input {
      display: none;
    }

    .checkbox-custom {
      width: 20px;
      height: 20px;
      border: 2px solid var(--border-color);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }

    .permission-item input:checked + .checkbox-custom {
      background: var(--primary-color);
      border-color: var(--primary-color);
    }

    .permission-item input:checked + .checkbox-custom::after {
      content: '';
      width: 6px;
      height: 10px;
      border: solid white;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
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
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        gap: 16px;
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }

      .filters-bar {
        flex-direction: column;
      }

      .form-row {
        grid-template-columns: 1fr;
      }

      .permissions-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class UserManagementComponent implements OnInit {
  private adminService = inject(AdminService);

  users = signal<User[]>([]);
  filteredUsers = signal<User[]>([]);
  showModal = signal(false);
  editingUser: User | null = null;

  // Expose enums to template
  UserStatus = UserStatus;
  UserRole = UserRole;

  searchQuery = '';
  selectedRole = '';
  selectedStatus = '';

  userForm = {
    name: '',
    email: '',
    role: UserRole.VIEWER,
    department: '',
    password: '',
    confirmPassword: '',
    permissions: [] as string[],
    sendInvite: true
  };

  availablePermissions = [
    { value: 'dashboard.view', label: 'Dashboard Görüntüleme' },
    { value: 'feedback.view', label: 'Geri Bildirim Görüntüleme' },
    { value: 'feedback.manage', label: 'Geri Bildirim Yönetimi' },
    { value: 'analysis.view', label: 'Analiz Görüntüleme' },
    { value: 'reports.view', label: 'Rapor Görüntüleme' },
    { value: 'reports.create', label: 'Rapor Oluşturma' },
    { value: 'tasks.view', label: 'Görev Görüntüleme' },
    { value: 'tasks.manage', label: 'Görev Yönetimi' },
    { value: 'admin.users', label: 'Kullanıcı Yönetimi' },
    { value: 'admin.settings', label: 'Sistem Ayarları' }
  ];

  activeCount = computed(() => this.users().filter(u => u.status === UserStatus.ACTIVE).length);
  adminCount = computed(() => this.users().filter(u => u.role === UserRole.ADMIN).length);
  pendingCount = computed(() => this.users().filter(u => u.status === UserStatus.PENDING).length);

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    // Mock data
    const mockUsers: User[] = [
      {
        id: '1',
        firstName: 'Ahmet',
        lastName: 'Yılmaz',
        name: 'Ahmet Yılmaz',
        email: 'ahmet.yilmaz@albarakaturk.com.tr',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        department: 'Bilgi Teknolojileri',
        permissions: ['*'],
        isActive: true,
        lastLogin: new Date('2024-01-31T09:30:00'),
        createdAt: new Date('2023-01-15'),
        updatedAt: new Date('2024-01-31')
      },
      {
        id: '2',
        firstName: 'Zeynep',
        lastName: 'Kaya',
        name: 'Zeynep Kaya',
        email: 'zeynep.kaya@albarakaturk.com.tr',
        role: UserRole.MANAGER,
        status: UserStatus.ACTIVE,
        department: 'Müşteri Deneyimi',
        permissions: ['dashboard.view', 'feedback.view', 'analysis.view', 'reports.view'],
        isActive: true,
        lastLogin: new Date('2024-01-31T11:45:00'),
        createdAt: new Date('2023-03-20'),
        updatedAt: new Date('2024-01-31')
      },
      {
        id: '3',
        firstName: 'Mehmet',
        lastName: 'Demir',
        name: 'Mehmet Demir',
        email: 'mehmet.demir@albarakaturk.com.tr',
        role: UserRole.ANALYST,
        status: UserStatus.ACTIVE,
        department: 'Veri Analitiği',
        permissions: ['dashboard.view', 'feedback.view', 'analysis.view', 'reports.view', 'reports.create'],
        isActive: true,
        lastLogin: new Date('2024-01-30T16:20:00'),
        createdAt: new Date('2023-05-10'),
        updatedAt: new Date('2024-01-30')
      },
      {
        id: '4',
        firstName: 'Elif',
        lastName: 'Şahin',
        name: 'Elif Şahin',
        email: 'elif.sahin@albarakaturk.com.tr',
        role: UserRole.MAKER,
        status: UserStatus.ACTIVE,
        department: 'Operasyon',
        permissions: ['dashboard.view', 'feedback.view', 'tasks.view'],
        isActive: true,
        lastLogin: new Date('2024-01-31T08:15:00'),
        createdAt: new Date('2023-07-01'),
        updatedAt: new Date('2024-01-31')
      },
      {
        id: '5',
        firstName: 'Ali',
        lastName: 'Öztürk',
        name: 'Ali Öztürk',
        email: 'ali.ozturk@albarakaturk.com.tr',
        role: UserRole.CHECKER,
        status: UserStatus.PENDING,
        department: 'Uyum',
        permissions: ['dashboard.view', 'tasks.view', 'tasks.manage'],
        isActive: false,
        createdAt: new Date('2024-01-28'),
        updatedAt: new Date('2024-01-28')
      },
      {
        id: '6',
        firstName: 'Fatma',
        lastName: 'Arslan',
        name: 'Fatma Arslan',
        email: 'fatma.arslan@albarakaturk.com.tr',
        role: UserRole.VIEWER,
        status: UserStatus.INACTIVE,
        department: 'Pazarlama',
        permissions: ['dashboard.view'],
        isActive: false,
        lastLogin: new Date('2023-12-15T10:00:00'),
        createdAt: new Date('2023-06-15'),
        updatedAt: new Date('2023-12-15')
      }
    ];

    this.users.set(mockUsers);
    this.filteredUsers.set(mockUsers);
  }

  filterUsers(): void {
    let filtered = [...this.users()];

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(u => 
        (u.name || '').toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query)
      );
    }

    if (this.selectedRole) {
      filtered = filtered.filter(u => u.role === this.selectedRole);
    }

    if (this.selectedStatus) {
      filtered = filtered.filter(u => u.status === this.selectedStatus);
    }

    this.filteredUsers.set(filtered);
  }

  getRoleLabel(role: UserRole): string {
    const labels: Record<UserRole, string> = {
      [UserRole.ADMIN]: 'Admin',
      [UserRole.MANAGER]: 'Yönetici',
      [UserRole.ANALYST]: 'Analist',
      [UserRole.VIEWER]: 'Görüntüleyici',
      [UserRole.MAKER]: 'Girişçi',
      [UserRole.CHECKER]: 'Onaycı'
    };
    return labels[role];
  }

  getStatusLabel(status: UserStatus): string {
    const labels: Record<UserStatus, string> = {
      [UserStatus.ACTIVE]: 'Aktif',
      [UserStatus.INACTIVE]: 'Pasif',
      [UserStatus.PENDING]: 'Onay Bekliyor',
      [UserStatus.LOCKED]: 'Kilitli',
      [UserStatus.SUSPENDED]: 'Askıya Alındı'
    };
    return labels[status];
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getAvatarColor(name: string): string {
    const colors = ['#1976d2', '#388e3c', '#f57c00', '#7b1fa2', '#c2185b', '#00796b'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleString('tr-TR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  openCreateModal(): void {
    this.editingUser = null;
    this.userForm = {
      name: '',
      email: '',
      role: UserRole.VIEWER,
      department: '',
      password: '',
      confirmPassword: '',
      permissions: [],
      sendInvite: true
    };
    this.showModal.set(true);
  }

  editUser(user: User): void {
    this.editingUser = user;
    this.userForm = {
      name: user.name || '',
      email: user.email,
      role: user.role,
      department: user.department || '',
      password: '',
      confirmPassword: '',
      permissions: [...user.permissions],
      sendInvite: false
    };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingUser = null;
  }

  togglePermission(permission: string): void {
    const index = this.userForm.permissions.indexOf(permission);
    if (index > -1) {
      this.userForm.permissions.splice(index, 1);
    } else {
      this.userForm.permissions.push(permission);
    }
  }

  saveUser(): void {
    console.log('Save user:', this.userForm);
    this.closeModal();
  }

  activateUser(user: User): void {
    this.users.update(users => 
      users.map(u => u.id === user.id ? { ...u, status: UserStatus.ACTIVE } : u)
    );
    this.filterUsers();
  }

  deactivateUser(user: User): void {
    this.users.update(users => 
      users.map(u => u.id === user.id ? { ...u, status: UserStatus.INACTIVE } : u)
    );
    this.filterUsers();
  }

  resetPassword(user: User): void {
    if (confirm(`${user.name} için şifre sıfırlama bağlantısı göndermek istiyor musunuz?`)) {
      console.log('Reset password for:', user);
    }
  }

  deleteUser(user: User): void {
    if (confirm(`${user.name} kullanıcısını silmek istediğinizden emin misiniz?`)) {
      this.users.update(users => users.filter(u => u.id !== user.id));
      this.filterUsers();
    }
  }
}
