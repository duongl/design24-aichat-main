import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Trash2, Save, User, Settings, Briefcase, Palette } from 'lucide-react';
import { userProfileService, UserProfile } from '../services/userProfile';
import { useToast } from '../hooks/use-toast';
import { useTheme } from '../hooks/useTheme';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const [profile, setProfile] = useState<UserProfile>({});
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { setTheme } = useTheme();

  useEffect(() => {
    if (isOpen) {
      const currentProfile = userProfileService.getProfile();
      setProfile(currentProfile);
    }
  }, [isOpen]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      userProfileService.saveProfile(profile);
      toast({
        title: "Đã lưu profile",
        description: "Thông tin cá nhân đã được cập nhật thành công.",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể lưu profile. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearData = () => {
    if (confirm('Bạn có chắc muốn xóa tất cả dữ liệu profile và lịch sử chat?')) {
      userProfileService.clearAllData();
      setProfile({});
      toast({
        title: "Đã xóa dữ liệu",
        description: "Tất cả thông tin đã được xóa.",
      });
    }
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  };

  const updatePreferences = (updates: Partial<UserProfile['preferences']>) => {
    setProfile(prev => ({
      ...prev,
      preferences: { ...prev.preferences, ...updates }
    }));
  };

  const updateProjectContext = (updates: Partial<UserProfile['projectContext']>) => {
    setProfile(prev => ({
      ...prev,
      projectContext: { ...prev.projectContext, ...updates }
    }));
  };

  const stats = userProfileService.getUsageStats();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile & Preferences
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-4 h-4" />
                Thông tin cơ bản
              </CardTitle>
              <CardDescription>
                Thông tin này giúp AI hiểu rõ hơn về bạn
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Tên</Label>
                  <Input
                    id="name"
                    value={profile.name || ''}
                    onChange={(e) => updateProfile({ name: e.target.value })}
                    placeholder="Tên của bạn"
                  />
                </div>
                <div>
                  <Label htmlFor="job">Nghề nghiệp</Label>
                  <Input
                    id="job"
                    value={profile.job || ''}
                    onChange={(e) => updateProfile({ job: e.target.value })}
                    placeholder="Designer, Developer, Marketer..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Preferences
              </CardTitle>
              <CardDescription>
                Cài đặt phong cách làm việc ưa thích
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Phong cách prompt</Label>
                  <Select
                    value={profile.preferences?.promptStyle || 'balanced'}
                    onValueChange={(value: 'detailed' | 'concise' | 'balanced') => 
                      updatePreferences({ promptStyle: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="detailed">Chi tiết</SelectItem>
                      <SelectItem value="concise">Ngắn gọn</SelectItem>
                      <SelectItem value="balanced">Cân bằng</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Ngôn ngữ ưa thích</Label>
                  <Select
                    value={profile.preferences?.language || 'vi'}
                    onValueChange={(value: 'vi' | 'en' | 'mixed') => 
                      updatePreferences({ language: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vi">Tiếng Việt</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="mixed">Hỗn hợp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Style video</Label>
                  <Select
                    value={profile.preferences?.videoStyle || 'cinematic'}
                    onValueChange={(value: 'cinematic' | 'documentary' | 'casual') => 
                      updatePreferences({ videoStyle: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cinematic">Cinematic</SelectItem>
                      <SelectItem value="documentary">Documentary</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Style ảnh</Label>
                  <Select
                    value={profile.preferences?.imageStyle || 'realistic'}
                    onValueChange={(value: 'realistic' | 'artistic' | 'minimalist') => 
                      updatePreferences({ imageStyle: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="realistic">Realistic</SelectItem>
                      <SelectItem value="artistic">Artistic</SelectItem>
                      <SelectItem value="minimalist">Minimalist</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Theme Color Section */}
              <div className="mt-4">
                <Label className="flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Màu giao diện
                </Label>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {[
                    { value: 'default', name: 'Mặc định', color: 'bg-blue-500' },
                    { value: 'blue', name: 'Xanh dương', color: 'bg-blue-600' },
                    { value: 'green', name: 'Xanh lá', color: 'bg-green-500' },
                    { value: 'purple', name: 'Tím', color: 'bg-purple-500' },
                    { value: 'orange', name: 'Cam', color: 'bg-orange-500' },
                    { value: 'red', name: 'Đỏ', color: 'bg-red-500' }
                  ].map((theme) => (
                    <button
                      key={theme.value}
                      type="button"
                      onClick={() => {
                        updatePreferences({ themeColor: theme.value as any });
                        setTheme(theme.value as any);
                      }}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        (profile.preferences?.themeColor || 'default') === theme.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full ${theme.color}`} />
                      <span className="text-sm font-medium">{theme.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Project Context */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Dự án hiện tại
              </CardTitle>
              <CardDescription>
                Thông tin về dự án đang làm để AI hiểu context
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="currentProject">Tên dự án</Label>
                <Input
                  id="currentProject"
                  value={profile.projectContext?.currentProject || ''}
                  onChange={(e) => updateProjectContext({ currentProject: e.target.value })}
                  placeholder="Video quảng cáo Hội An, Website công ty..."
                />
              </div>
              <div>
                <Label>Loại dự án</Label>
                <Select
                  value={profile.projectContext?.projectType || 'mixed'}
                  onValueChange={(value: 'video' | 'image' | 'mixed') => 
                    updateProjectContext({ projectType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="mixed">Hỗn hợp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="styleGuidelines">Hướng dẫn style</Label>
                <Textarea
                  id="styleGuidelines"
                  value={profile.projectContext?.styleGuidelines || ''}
                  onChange={(e) => updateProjectContext({ styleGuidelines: e.target.value })}
                  placeholder="Màu chủ đạo: xanh dương, tone: professional, target: B2B..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Thống kê sử dụng</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Badge variant="secondary">
                  {stats.totalSessions} phiên chat
                </Badge>
                {stats.lastActive && (
                  <Badge variant="outline">
                    Hoạt động: {new Date(stats.lastActive).toLocaleDateString('vi-VN')}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between">
            <Button
              variant="destructive"
              onClick={handleClearData}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Xóa tất cả dữ liệu
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Hủy
              </Button>
              <Button onClick={handleSave} disabled={isLoading} className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                {isLoading ? 'Đang lưu...' : 'Lưu'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
