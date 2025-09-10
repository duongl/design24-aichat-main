import { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, isLoading, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="border-t border-border bg-background p-4">
      <form onSubmit={handleSubmit} className="flex items-end gap-3">
        <div className="flex-1">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? "Bắt đầu cuộc trò chuyện mới..." : "Nhập tin nhắn của bạn... (Shift+Enter để xuống dòng)"}
            disabled={disabled || isLoading}
            className="min-h-[44px] max-h-[120px] resize-none py-3 px-4 text-sm border-border focus:ring-2 focus:ring-primary/20 focus:border-primary"
            rows={1}
          />
        </div>
        
        <Button
          type="submit"
          disabled={!message.trim() || isLoading || disabled}
          variant="primary"
          className="h-[44px] px-4 flex-shrink-0"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      </form>
      
      <div className="flex items-center justify-center mt-2">
        <p className="text-xs text-muted-foreground text-center">
          Được hỗ trợ bởi <span className="gradient-text font-medium">DESIGN24</span> • 
          Trợ lý AI Đa lĩnh vực
        </p>
      </div>
    </div>
  );
}