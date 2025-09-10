import { UserRole } from '@/types/auth';

// Mock server validation - trong thực tế sẽ gọi API thật
class ServerValidationService {
  private readonly API_BASE = 'https://api.design24.com'; // Mock URL
  private readonly VALIDATION_CACHE_KEY = 'server_validation_cache';
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 phút

  // Cache để tránh gọi API liên tục
  private getCachedValidation(): { [key: string]: { valid: boolean; timestamp: number } } {
    const cached = localStorage.getItem(this.VALIDATION_CACHE_KEY);
    if (!cached) return {};
    
    try {
      return JSON.parse(cached);
    } catch {
      return {};
    }
  }

  private setCachedValidation(cache: { [key: string]: { valid: boolean; timestamp: number } }): void {
    localStorage.setItem(this.VALIDATION_CACHE_KEY, JSON.stringify(cache));
  }

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_DURATION;
  }

  // Mock server call - kiểm tra rate limit từ server
  private async mockServerValidation(deviceId: string, userRole: UserRole): Promise<boolean> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Mock logic: Server sẽ kiểm tra rate limit thực tế
    // Trong thực tế, server sẽ có database lưu usage theo deviceId + userRole + date
    
    // Giả lập: Server trả về true nếu chưa vượt limit
    const mockServerResponse = {
      valid: true,
      remaining: userRole === UserRole.ADMIN ? -1 : userRole === UserRole.USER ? 45 : 18,
      dailyLimit: userRole === UserRole.ADMIN ? -1 : userRole === UserRole.USER ? 50 : 20
    };
    
    return mockServerResponse.valid;
  }

  // Validate rate limit với server
  public async validateRateLimit(deviceId: string, userRole: UserRole): Promise<boolean> {
    const cacheKey = `${deviceId}_${userRole}`;
    const cached = this.getCachedValidation();
    
    // Kiểm tra cache trước
    if (cached[cacheKey] && this.isCacheValid(cached[cacheKey].timestamp)) {
      return cached[cacheKey].valid;
    }
    
    try {
      // Gọi server validation
      const isValid = await this.mockServerValidation(deviceId, userRole);
      
      // Cache kết quả
      cached[cacheKey] = {
        valid: isValid,
        timestamp: Date.now()
      };
      this.setCachedValidation(cached);
      
      return isValid;
    } catch (error) {
      console.error('Server validation failed:', error);
      // Fallback: cho phép nếu server lỗi (trong thực tế nên có policy rõ ràng)
      return true;
    }
  }

  // Report usage lên server
  public async reportUsage(deviceId: string, userRole: UserRole, messageCount: number): Promise<void> {
    try {
      // Mock API call để report usage
      await new Promise(resolve => setTimeout(resolve, 50));
      
      console.log(`Reported usage: ${messageCount} messages for ${userRole} on device ${deviceId}`);
      
      // Trong thực tế: POST /api/usage với payload:
      // { deviceId, userRole, messageCount, timestamp, date }
      
    } catch (error) {
      console.error('Failed to report usage:', error);
    }
  }

  // Clear cache khi cần
  public clearCache(): void {
    localStorage.removeItem(this.VALIDATION_CACHE_KEY);
  }
}

export const serverValidationService = new ServerValidationService();
