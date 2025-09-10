import { UserRole, RateLimitInfo, USER_ROLE_CONFIGS } from '@/types/auth';
import { serverValidationService } from './serverValidation';

class SecureRateLimitingService {
  private readonly STORAGE_KEY = 'secure_rate_limit';
  private readonly DEVICE_ID_KEY = 'device_fingerprint';
  private readonly ENCRYPTION_KEY = 'design24_secure_key_2025';

  // Tạo device fingerprint để track user
  private generateDeviceFingerprint(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx?.fillText('Device fingerprint', 10, 10);
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|');
    
    // Hash đơn giản
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private getDeviceId(): string {
    let deviceId = localStorage.getItem(this.DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = this.generateDeviceFingerprint();
      localStorage.setItem(this.DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  }

  // Mã hóa đơn giản (trong thực tế nên dùng crypto mạnh hơn)
  private encrypt(data: string): string {
    let encrypted = '';
    for (let i = 0; i < data.length; i++) {
      const charCode = data.charCodeAt(i) ^ this.ENCRYPTION_KEY.charCodeAt(i % this.ENCRYPTION_KEY.length);
      encrypted += String.fromCharCode(charCode);
    }
    return btoa(encrypted);
  }

  private decrypt(encrypted: string): string {
    try {
      const data = atob(encrypted);
      let decrypted = '';
      for (let i = 0; i < data.length; i++) {
        const charCode = data.charCodeAt(i) ^ this.ENCRYPTION_KEY.charCodeAt(i % this.ENCRYPTION_KEY.length);
        decrypted += String.fromCharCode(charCode);
      }
      return decrypted;
    } catch {
      return '';
    }
  }

  private getTodayDateString(): string {
    return new Date().toDateString();
  }

  private getStoredData(): { usage: Record<UserRole, number>; date: string; deviceId: string } | null {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return null;
    
    try {
      const decrypted = this.decrypt(stored);
      return JSON.parse(decrypted);
    } catch {
      return null;
    }
  }

  private setStoredData(data: { usage: Record<UserRole, number>; date: string; deviceId: string }): void {
    const encrypted = this.encrypt(JSON.stringify(data));
    localStorage.setItem(this.STORAGE_KEY, encrypted);
  }

  private resetDailyUsage(): void {
    const deviceId = this.getDeviceId();
    this.setStoredData({
      usage: {
        [UserRole.ADMIN]: 0,
        [UserRole.USER]: 0,
        [UserRole.BETA]: 0
      },
      date: this.getTodayDateString(),
      deviceId
    });
  }

  private checkAndResetIfNewDay(): void {
    const today = this.getTodayDateString();
    const deviceId = this.getDeviceId();
    const storedData = this.getStoredData();
    
    // Nếu không có data hoặc device ID khác → reset
    if (!storedData || storedData.deviceId !== deviceId) {
      this.resetDailyUsage();
      return;
    }
    
    // Nếu khác ngày → reset
    if (storedData.date !== today) {
      this.resetDailyUsage();
    }
  }

  public getRateLimitInfo(role: UserRole): RateLimitInfo {
    this.checkAndResetIfNewDay();
    
    const storedData = this.getStoredData();
    const usage = storedData?.usage || {
      [UserRole.ADMIN]: 0,
      [UserRole.USER]: 0,
      [UserRole.BETA]: 0
    };
    
    const userConfig = USER_ROLE_CONFIGS[role];
    const usedToday = usage[role];
    const dailyLimit = userConfig.dailyLimit;
    const isUnlimited = dailyLimit === -1;
    const remaining = isUnlimited ? -1 : Math.max(0, dailyLimit - usedToday);

    return {
      role,
      usedToday,
      dailyLimit,
      isUnlimited,
      remaining
    };
  }

  public async canSendMessage(role: UserRole): Promise<boolean> {
    const rateLimitInfo = this.getRateLimitInfo(role);
    const localCheck = rateLimitInfo.isUnlimited || rateLimitInfo.remaining > 0;
    
    if (!localCheck) return false;
    
    // Double-check với server
    const deviceId = this.getDeviceId();
    const serverCheck = await serverValidationService.validateRateLimit(deviceId, role);
    
    return localCheck && serverCheck;
  }

  public async incrementUsage(role: UserRole): Promise<void> {
    this.checkAndResetIfNewDay();
    
    const storedData = this.getStoredData();
    const usage = storedData?.usage || {
      [UserRole.ADMIN]: 0,
      [UserRole.USER]: 0,
      [UserRole.BETA]: 0
    };
    
    usage[role] += 1;
    
    const deviceId = this.getDeviceId();
    this.setStoredData({
      usage,
      date: this.getTodayDateString(),
      deviceId
    });
    
    // Report usage lên server
    await serverValidationService.reportUsage(deviceId, role, usage[role]);
  }

  public getUsagePercentage(role: UserRole): number {
    const rateLimitInfo = this.getRateLimitInfo(role);
    if (rateLimitInfo.isUnlimited) return 0;
    return Math.min(100, (rateLimitInfo.usedToday / rateLimitInfo.dailyLimit) * 100);
  }

  public getFormattedLimitInfo(role: UserRole): string {
    const rateLimitInfo = this.getRateLimitInfo(role);
    
    if (rateLimitInfo.isUnlimited) {
      return 'Không giới hạn tin nhắn';
    }
    
    return `${rateLimitInfo.usedToday}/${rateLimitInfo.dailyLimit} tin nhắn`;
  }

  public resetAllUsage(): void {
    this.resetDailyUsage();
  }

  // Kiểm tra xem có phải device mới không
  public isNewDevice(): boolean {
    const deviceId = this.getDeviceId();
    const storedData = this.getStoredData();
    return !storedData || storedData.deviceId !== deviceId;
  }
}

export const secureRateLimitingService = new SecureRateLimitingService();
