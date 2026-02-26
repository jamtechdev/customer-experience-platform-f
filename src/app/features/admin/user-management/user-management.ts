import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule } from '@angular/material/dialog';
import { UserService } from '../../../core/services/admin.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
}

@Component({
  selector: 'app-user-management',
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatMenuModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './user-management.html',
  styleUrl: './user-management.css',
})
export class UserManagement implements OnInit {
  private userService = inject(UserService);
  private snackBar = inject(MatSnackBar);

  loading = signal(false);
  users = signal<User[]>([]);
  displayedColumns: string[] = ['name', 'email', 'role', 'status', 'actions'];

  ngOnInit(): void {
    this.loadUsers();
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
            isActive: item.isActive !== undefined ? item.isActive : true
          }));
          this.users.set(mapped);
        }
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.snackBar.open('Failed to load users', 'Close', { duration: 3000 });
      }
    });
  }

  toggleUserStatus(user: User): void {
    user.isActive = !user.isActive;
    this.snackBar.open(`User ${user.isActive ? 'activated' : 'deactivated'}`, 'Close', { duration: 2000 });
  }

  deleteUser(user: User): void {
    this.snackBar.open('User deleted', 'Close', { duration: 2000 });
  }
}
