import { UserRole, UserAuth } from '@/types/auth';

// Mật khẩu thực tế - chỉ dành cho development/testing
// Trong production, mật khẩu sẽ được cấp riêng cho từng khách hàng
const AUTH_PASSWORDS = {
  [UserRole.ADMIN]: 'adDesign24',
  [UserRole.USER]: 'usDesign24', 
  [UserRole.BETA]: 'btDesign24'
};

// Entry pass only to unlock UI, not tied to rate limit/role
export const ENTRY_PASS = 'Design24AI';

export const getUserAuth = (password: string): UserAuth | null => {
  // Tìm role dựa trên mật khẩu
  const role = Object.entries(AUTH_PASSWORDS).find(
    ([_, pass]) => pass === password
  )?.[0] as UserRole;

  if (!role) return null;

  // Trả về thông tin user auth
  return {
    role,
    password: AUTH_PASSWORDS[role],
    dailyLimit: role === UserRole.ADMIN ? -1 : role === UserRole.USER ? 50 : 20,
    displayName: role === UserRole.ADMIN ? 'Administrator' : 
                 role === UserRole.USER ? 'User' : 'Beta Tester'
  };
};

// Export để sử dụng trong PasswordProtection
export { AUTH_PASSWORDS };

// Validate only the entry pass for first screen
export const validateEntryPass = (password: string): boolean => password === ENTRY_PASS;
