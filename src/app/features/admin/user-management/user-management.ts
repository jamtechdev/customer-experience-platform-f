import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ToastrService } from 'ngx-toastr';
import { UserService } from '../../../core/services/admin.service';
import { getRoleLabel } from '../../../core/models/user.model';

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  companyId?: number;
  companyName?: string;
  createdAt?: Date | string;
}

interface UserForm {
  id?: number;
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  password: string;
  isActive: boolean;
}

@Component({
  selector: 'app-user-management',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatMenuModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule
  ],
  templateUrl: './user-management.html',
  styleUrl: './user-management.css',
})
export class UserManagement implements OnInit {
  private userService = inject(UserService);
  private toastr = inject(ToastrService);
  getRoleLabel = getRoleLabel;

  loading = signal(false);
  saving = signal(false);
  users = signal<User[]>([]);
  editorOpen = signal(false);
  editingId = signal<number | null>(null);
  displayedColumns: string[] = ['name', 'email', 'company', 'role', 'status', 'actions'];
  form: UserForm = this.emptyForm();

  ngOnInit(): void {
    this.loadUsers();
  }

  activeCount(): number {
    return this.users().filter((user) => user.isActive).length;
  }

  inactiveCount(): number {
    return this.users().filter((user) => !user.isActive).length;
  }

  loadUsers(): void {
    this.loading.set(true);
    this.userService.getUsers().subscribe({
      next: (response) => {
        if (response.success) {
          // Map API response to component interface (convert id from string to number if needed)
          const mapped = (response.data || []).map((item: any) => ({
            id: typeof item.id === 'string' ? parseInt(item.id, 10) : item.id,
            email: item.email,
            firstName: item.firstName,
            lastName: item.lastName,
            role: item.role,
            isActive: item.isActive !== undefined ? item.isActive : true,
            companyId: item.companyId ?? item.settings?.companyId,
            companyName: item.companyName ?? item.settings?.branding?.companyName,
            createdAt: item.createdAt,
          }));
          this.users.set(mapped);
        }
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.toastr.error(error.error?.message || 'Failed to load users', 'User Management');
      }
    });
  }

  openCreate(): void {
    this.form = this.emptyForm();
    this.editingId.set(null);
    this.editorOpen.set(true);
  }

  openEdit(user: User): void {
    this.form = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      companyName: user.companyName || '',
      password: '',
      isActive: user.isActive,
    };
    this.editingId.set(user.id);
    this.editorOpen.set(true);
  }

  closeEditor(): void {
    this.editorOpen.set(false);
    this.editingId.set(null);
    this.form = this.emptyForm();
  }

  saveUser(): void {
    if (!this.form.firstName.trim() || !this.form.lastName.trim() || !this.form.email.trim() || !this.form.companyName.trim()) {
      this.toastr.warning('Name, email, and company are required.', 'Missing details');
      return;
    }
    if (!this.editingId() && this.form.password.length < 6) {
      this.toastr.warning('Password must be at least 6 characters.', 'Missing password');
      return;
    }

    const payload = {
      firstName: this.form.firstName.trim(),
      lastName: this.form.lastName.trim(),
      email: this.form.email.trim(),
      companyName: this.form.companyName.trim(),
      isActive: this.form.isActive,
      role: 'user',
      ...(this.form.password ? { password: this.form.password } : {}),
    };
    const request = this.editingId()
      ? this.userService.updateUser(String(this.editingId()), payload as any)
      : this.userService.createUser(payload as any);

    this.saving.set(true);
    request.subscribe({
      next: (response) => {
        this.saving.set(false);
        if (!response.success) {
          this.toastr.error(response.message || 'Could not save user', 'User Management');
          return;
        }
        this.toastr.success(this.editingId() ? 'User updated' : 'User created', 'User Management');
        this.closeEditor();
        this.loadUsers();
      },
      error: (error) => {
        this.saving.set(false);
        this.toastr.error(error.error?.message || 'Could not save user', 'User Management');
      },
    });
  }

  toggleUserStatus(user: User): void {
    this.userService.toggleUserStatus(String(user.id), !user.isActive).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastr.success(`User ${!user.isActive ? 'activated' : 'deactivated'}`, 'User Management');
          this.loadUsers();
        } else {
          this.toastr.error(response.message || 'Could not update status', 'User Management');
        }
      },
      error: (error) => this.toastr.error(error.error?.message || 'Could not update status', 'User Management'),
    });
  }

  deleteUser(user: User): void {
    const confirmed = window.confirm(`Delete ${user.firstName} ${user.lastName}? This user will no longer be able to log in.`);
    if (!confirmed) return;
    this.userService.deleteUser(String(user.id)).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastr.success('User deleted', 'User Management');
          this.loadUsers();
        } else {
          this.toastr.error(response.message || 'Could not delete user', 'User Management');
        }
      },
      error: (error) => this.toastr.error(error.error?.message || 'Could not delete user', 'User Management'),
    });
  }

  private emptyForm(): UserForm {
    return {
      firstName: '',
      lastName: '',
      email: '',
      companyName: '',
      password: '',
      isActive: true,
    };
  }
}
