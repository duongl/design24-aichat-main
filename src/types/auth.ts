export enum UserRole {
  ADMIN = 'admin',
  USER = 'user', 
  BETA = 'beta'
}

export interface UserAuth {
  role: UserRole;
  password: string;
  dailyLimit: number;
  displayName: string;
}

// User role configurations without passwords (passwords moved to config/auth.ts)
export const USER_ROLE_CONFIGS: Record<UserRole, Omit<UserAuth, 'password'>> = {
  [UserRole.ADMIN]: {
    role: UserRole.ADMIN,
    dailyLimit: -1, // Unlimited
    displayName: 'Administrator'
  },
  [UserRole.USER]: {
    role: UserRole.USER,
    dailyLimit: 30,
    displayName: 'User'
  },
  [UserRole.BETA]: {
    role: UserRole.BETA,
    dailyLimit: 30,
    displayName: 'Beta Tester'
  }
};

export interface RateLimitInfo {
  role: UserRole;
  usedToday: number;
  dailyLimit: number;
  isUnlimited: boolean;
  remaining: number;
}
