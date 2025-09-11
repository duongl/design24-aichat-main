import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, EyeOff, Key } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { geminiService } from '@/services/geminiApi';

interface ApiKeyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApiKeySet?: () => void;
}

// Repurposed: This dialog is now for entering a Gemini API key.
export function ChangePasswordModal({ isOpen, onClose, onApiKeySet }: ApiKeyDialogProps) {
  const [apiKey, setApiKey] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;
    setIsLoading(true);
    setError('');
    try {
      await new Promise((r) => setTimeout(r, 200));
      geminiService.setApiKey(apiKey.trim());
      toast({ title: 'Đã lưu API key', description: 'Yêu cầu tiếp theo sẽ dùng API key cá nhân của bạn.' });
      onApiKeySet?.();
      onClose();
      setApiKey('');
    } catch (err) {
      setError('Không thể lưu API key. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // keep filled value so user sees it's saved; only clear when dialog closes without save?
    setError('');
    onClose();
  };

  // Preload saved key when dialog opens
  useEffect(() => {
    if (isOpen) {
      const saved = geminiService.getPersonalApiKey() || '';
      setApiKey(saved);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Nhập Gemini API Key
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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
                type={show ? 'text' : 'password'}
                placeholder="Dán Gemini API key cá nhân của bạn"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                onClick={() => setShow(!show)}
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>

            <Button type="submit" className="w-full" disabled={!apiKey.trim() || isLoading}>
              {isLoading ? 'Đang lưu...' : 'Lưu API Key'}
            </Button>
          </form>

          <div className="text-xs text-muted-foreground">
            - Nếu để trống, hệ thống sẽ dùng API key mặc định (bị giới hạn theo gói). Khi đã lưu API key cá nhân, giới hạn sẽ được gỡ bỏ.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

