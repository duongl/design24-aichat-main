export interface UserProfile {
  name?: string;
  job?: string;
  preferences?: {
    promptStyle: 'detailed' | 'concise' | 'balanced';
    language: 'vi' | 'en' | 'mixed';
    videoStyle: 'cinematic' | 'documentary' | 'casual';
    imageStyle: 'realistic' | 'artistic' | 'minimalist';
    themeColor: 'default' | 'blue' | 'green' | 'purple' | 'orange' | 'red';
    showSuggestions?: boolean;
    sttProvider?: 'webspeech' | 'google';
    ttsProvider?: 'webspeech';
  };
  projectContext?: {
    currentProject?: string;
    projectType?: 'video' | 'image' | 'mixed';
    clientRequirements?: string[];
    styleGuidelines?: string;
  };
  chatPatterns?: {
    commonTopics: string[];
    frequentRequests: string[];
    lastActiveDate: string;
  };
}

export interface ChatMemory {
  sessionId: string;
  keyPoints: string[];
  decisions: string[];
  importantInfo: string[];
  timestamp: string;
}

class UserProfileService {
  private readonly PROFILE_KEY = 'user_profile';
  private readonly MEMORY_KEY = 'chat_memory';
  private readonly MAX_MEMORIES = 10; // Giữ tối đa 10 phiên chat gần nhất

  // Lưu profile user
  saveProfile(profile: Partial<UserProfile>): void {
    try {
      const existingProfile = this.getProfile();
      const updatedProfile = { ...existingProfile, ...profile };
      localStorage.setItem(this.PROFILE_KEY, JSON.stringify(updatedProfile));
    } catch (error) {
      console.error('Error saving user profile:', error);
    }
  }

  // Lấy profile user
  getProfile(): UserProfile {
    try {
      const stored = localStorage.getItem(this.PROFILE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error loading user profile:', error);
      return {};
    }
  }

  // Lưu memory từ phiên chat hiện tại
  saveChatMemory(memory: ChatMemory): void {
    try {
      const memories = this.getChatMemories();
      
      // Thêm memory mới vào đầu
      memories.unshift(memory);
      
      // Giữ chỉ MAX_MEMORIES gần nhất
      if (memories.length > this.MAX_MEMORIES) {
        memories.splice(this.MAX_MEMORIES);
      }
      
      localStorage.setItem(this.MEMORY_KEY, JSON.stringify(memories));
    } catch (error) {
      console.error('Error saving chat memory:', error);
    }
  }

  // Lấy tất cả chat memories
  getChatMemories(): ChatMemory[] {
    try {
      const stored = localStorage.getItem(this.MEMORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading chat memories:', error);
      return [];
    }
  }

  // Tạo context string cho system prompt
  buildContextString(): string {
    const profile = this.getProfile();
    const memories = this.getChatMemories();
    
    let context = '';
    
    // User profile context
    if (profile.name || profile.job) {
      context += `\n👤 USER PROFILE:\n`;
      if (profile.name) context += `- Tên: ${profile.name}\n`;
      if (profile.job) context += `- Nghề nghiệp: ${profile.job}\n`;
    }
    
    // Preferences context
    if (profile.preferences) {
      context += `\n🎯 PREFERENCES:\n`;
      const prefs = profile.preferences;
      if (prefs.promptStyle) context += `- Phong cách prompt: ${prefs.promptStyle}\n`;
      if (prefs.language) context += `- Ngôn ngữ ưa thích: ${prefs.language}\n`;
      if (prefs.videoStyle) context += `- Style video: ${prefs.videoStyle}\n`;
      if (prefs.imageStyle) context += `- Style ảnh: ${prefs.imageStyle}\n`;
      if (prefs.themeColor) context += `- Màu giao diện: ${prefs.themeColor}\n`;
    }
    
    // Project context
    if (profile.projectContext?.currentProject) {
      context += `\n📁 CURRENT PROJECT:\n`;
      context += `- Dự án: ${profile.projectContext.currentProject}\n`;
      if (profile.projectContext.projectType) {
        context += `- Loại: ${profile.projectContext.projectType}\n`;
      }
      if (profile.projectContext.clientRequirements?.length) {
        context += `- Yêu cầu client: ${profile.projectContext.clientRequirements.join(', ')}\n`;
      }
      if (profile.projectContext.styleGuidelines) {
        context += `- Hướng dẫn style: ${profile.projectContext.styleGuidelines}\n`;
      }
    }
    
    // Recent memories context (chỉ lấy 3 gần nhất)
    const recentMemories = memories.slice(0, 3);
    if (recentMemories.length > 0) {
      context += `\n🧠 RECENT CONTEXT:\n`;
      recentMemories.forEach((memory, index) => {
        if (memory.keyPoints.length > 0) {
          context += `- Phiên ${index + 1}: ${memory.keyPoints.join(', ')}\n`;
        }
      });
    }
    
    return context;
  }

  // Cập nhật preferences
  updatePreferences(preferences: Partial<UserProfile['preferences']>): void {
    const profile = this.getProfile();
    profile.preferences = { ...profile.preferences, ...preferences };
    this.saveProfile(profile);
  }

  // Cập nhật project context
  updateProjectContext(projectContext: Partial<UserProfile['projectContext']>): void {
    const profile = this.getProfile();
    profile.projectContext = { ...profile.projectContext, ...projectContext };
    this.saveProfile(profile);
  }

  // Xóa tất cả data
  clearAllData(): void {
    localStorage.removeItem(this.PROFILE_KEY);
    localStorage.removeItem(this.MEMORY_KEY);
  }

  // Lấy thống kê usage
  getUsageStats(): { totalSessions: number; lastActive: string | null } {
    const memories = this.getChatMemories();
    const profile = this.getProfile();
    
    return {
      totalSessions: memories.length,
      lastActive: profile.chatPatterns?.lastActiveDate || null
    };
  }
}

export const userProfileService = new UserProfileService();
