export interface User {
  id: number;
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
  /** Full system access, manage users and datasets, configure analytics (client: Admin) */
  ADMIN = 'admin',
  /** Upload datasets, view dashboards, generate reports, configure alerts (client: CX Manager) */
  ANALYST = 'analyst',
  /** View dashboards, access summary reports, download executive analytics (client: Executive) */
  VIEWER = 'viewer'
}

/** Client-facing role labels per Project Approach Document §13 */
export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Admin',
  [UserRole.ANALYST]: 'CX Manager',
  [UserRole.VIEWER]: 'Executive',
};

export function getRoleLabel(role: UserRole | string): string {
  return ROLE_LABELS[role as UserRole] ?? role;
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
