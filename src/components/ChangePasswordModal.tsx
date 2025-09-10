import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, EyeOff, Key } from 'lucide-react';
import { UserRole } from '@/types/auth';
import { getUserAuth } from '@/config/auth';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPasswordChanged: (newRole: UserRole) => void;
  currentRole: UserRole;
}

export function ChangePasswordModal({ 
  isOpen, 
  onClose, 
  onPasswordChanged, 
  currentRole 
}: ChangePasswordModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsLoading(true);
    setError('');

    // Simulate a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check password using auth config
    const userAuth = getUserAuth(password);
    
    if (userAuth) {
      // Update localStorage
      localStorage.setItem('user_role', userAuth.role);
      
      // Call parent callback
      onPasswordChanged(userAuth.role);
      
      // Close modal
      onClose();
      setPassword('');
    } else {
      setError('Mật khẩu không đúng hoặc chưa được cấp. Vui lòng liên hệ Học viện Design24 để được hỗ trợ.');
      setPassword('');
    }
    
    setIsLoading(false);
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    onClose();
  };

  const getCurrentRoleInfo = () => {
    switch (currentRole) {
      case UserRole.ADMIN:
        return { name: 'Admin' };
      case UserRole.USER:
        return { name: 'User' };
      case UserRole.BETA:
        return { name: 'Beta' };
      default:
        return { name: 'Unknown' };
    }
  };

  const currentRoleInfo = getCurrentRoleInfo();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Đổi Mã Bảo Mật
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Current Role Display */}
          <div className="flex items-center justify-center p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">
              Gói hiện tại: {currentRoleInfo.name}
            </span>
          </div>

          {/* Service Packages Info */}
          <div className="space-y-2">
            <div className="text-center text-xs text-muted-foreground">
              Chọn gói dịch vụ mới:
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center p-2 bg-muted rounded">
                <div>Admin</div>
                <div className="text-muted-foreground">Không giới hạn tin nhắn</div>
              </div>
              <div className="text-center p-2 bg-muted rounded">
                <div>User</div>
                <div className="text-muted-foreground">50 tin nhắn/ngày</div>
              </div>
              <div className="text-center p-2 bg-muted rounded">
                <div>Beta</div>
                <div className="text-muted-foreground">20 tin nhắn/ngày</div>
              </div>
            </div>
          </div>

          {error && (
            <Alert className="border-red-500/20 bg-red-500/10">
              <AlertDescription className="text-red-400">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Nhập mật khẩu gói mới"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>

            <div className="flex gap-2">
              <Button 
                type="button"
                variant="outline" 
                className="flex-1"
                onClick={handleClose}
                disabled={isLoading}
              >
                Hủy
              </Button>
              <Button 
                type="submit" 
                className="flex-1" 
                disabled={!password.trim() || isLoading}
              >
                {isLoading ? 'Đang xác thực...' : 'Đổi Gói'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
