import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { AdminService } from '../../../core/services/admin.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

interface Role {
  id?: string;
  name: string;
  role?: string;
  permissions: string[];
}

@Component({
  selector: 'app-role-management',
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatSnackBarModule
  ],
  templateUrl: './role-management.html',
  styleUrl: './role-management.css',
})
export class RoleManagement implements OnInit {
  private adminService = inject(AdminService);
  private snackBar = inject(MatSnackBar);

  loading = signal(false);
  roles = signal<Role[]>([]);
  displayedColumns: string[] = ['name', 'permissions', 'actions'];

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles(): void {
    this.loading.set(true);
    this.adminService.getRoles().subscribe({
      next: (response) => {
        if (response.success) {
          // Map API response to component interface
          const mapped = (response.data || []).map((item: any) => ({
            id: item.id || item.role || '',
            name: item.name || item.role || 'Unknown',
            permissions: item.permissions || []
          }));
          this.roles.set(mapped);
        }
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.snackBar.open('Failed to load roles', 'Close', { duration: 3000 });
      }
    });
  }
}
