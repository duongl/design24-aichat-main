import { UserRole, RateLimitInfo, USER_ROLE_CONFIGS } from '@/types/auth';

class RateLimitingService {
  private readonly STORAGE_KEY = 'rate_limit_data';
  private readonly DATE_KEY = 'rate_limit_date';

  private getTodayDateString(): string {
    return new Date().toDateString();
  }

  private getStoredDate(): string | null {
    return localStorage.getItem(this.DATE_KEY);
  }

  private setStoredDate(date: string): void {
    localStorage.setItem(this.DATE_KEY, date);
  }

  private getStoredUsage(): Record<UserRole, number> {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) {
      return {
        [UserRole.ADMIN]: 0,
        [UserRole.USER]: 0,
        [UserRole.BETA]: 0
      };
    }
    return JSON.parse(stored);
  }

  private setStoredUsage(usage: Record<UserRole, number>): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(usage));
  }

  private resetDailyUsage(): void {
    this.setStoredUsage({
      [UserRole.ADMIN]: 0,
      [UserRole.USER]: 0,
      [UserRole.BETA]: 0
    });
    this.setStoredDate(this.getTodayDateString());
  }

  private checkAndResetIfNewDay(): void {
    const today = this.getTodayDateString();
    const storedDate = this.getStoredDate();
    
    if (storedDate !== today) {
      this.resetDailyUsage();
    }
  }

  public getRateLimitInfo(role: UserRole): RateLimitInfo {
    this.checkAndResetIfNewDay();
    
    const usage = this.getStoredUsage();
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

  public canSendMessage(role: UserRole): boolean {
    const rateLimitInfo = this.getRateLimitInfo(role);
    return rateLimitInfo.isUnlimited || rateLimitInfo.remaining > 0;
  }

  public incrementUsage(role: UserRole): void {
    this.checkAndResetIfNewDay();
    
    const usage = this.getStoredUsage();
    usage[role] += 1;
    this.setStoredUsage(usage);
  }

  public getUsagePercentage(role: UserRole): number {
    const rateLimitInfo = this.getRateLimitInfo(role);
    if (rateLimitInfo.isUnlimited) return 0;
    return Math.min(100, (rateLimitInfo.usedToday / rateLimitInfo.dailyLimit) * 100);
  }

  public getFormattedLimitInfo(role: UserRole): string {
    const rateLimitInfo = this.getRateLimitInfo(role);
    
    if (rateLimitInfo.isUnlimited) {
      return 'Không giới hạn';
    }
    
    return `${rateLimitInfo.usedToday}/${rateLimitInfo.dailyLimit} tin nhắn`;
  }

  public resetAllUsage(): void {
    this.resetDailyUsage();
  }
}

export const rateLimitingService = new RateLimitingService();
