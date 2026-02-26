export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name?: string; // Computed full name
  role: UserRole;
  department: string;
  avatar?: string;
  isActive: boolean;
  status?: UserStatus;
  permissions: string[];
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  settings?: {
    companyId?: number;
    branding?: {
      logoUrl?: string;
      logoIconUrl?: string;
      companyName?: string;
      primaryColor?: string;
      sidebarBg?: string;
    };
    [key: string]: any;
  };
}

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  SUSPENDED = 'SUSPENDED',
  LOCKED = 'LOCKED'
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}
