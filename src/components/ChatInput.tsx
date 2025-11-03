import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Mic, MicOff, Image as ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { useToast } from '@/hooks/use-toast';

const MAX_IMAGES = 4;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB per image

interface ChatInputProps {
  onSendMessage: (message: string, images?: string[]) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, isLoading, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const stt = useSpeechToText({
    onTranscript: (text, isFinal) => {
      // Append interim or final to input, but do not auto-send
      if (isFinal) setMessage(prev => (prev ? `${prev} ${text}`.trim() : text));
    },
    preferredLanguages: ['vi-VN', 'en-US']
  });

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (images.length + files.length > MAX_IMAGES) {
      toast({
        title: 'Quá nhiều ảnh',
        description: `Bạn chỉ có thể upload tối đa ${MAX_IMAGES} ảnh.`,
        variant: 'destructive',
      });
      return;
    }

    const validFiles: File[] = [];
    
    // Validate files first
    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Định dạng không hợp lệ',
          description: `${file.name} không phải là ảnh.`,
          variant: 'destructive',
        });
        continue;
      }

      // Validate file size
      if (file.size > MAX_IMAGE_SIZE) {
        toast({
          title: 'Ảnh quá lớn',
          description: `${file.name} vượt quá 10MB.`,
          variant: 'destructive',
        });
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // Convert all valid files to data URLs
    const readPromises = validFiles.map(file => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          resolve(dataUrl);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    try {
      const dataUrls = await Promise.all(readPromises);
      setImages(prev => [...prev, ...dataUrls]);
      setImageFiles(prev => [...prev, ...validFiles]);
    } catch (error) {
      toast({
        title: 'Lỗi đọc ảnh',
        description: 'Không thể đọc một số ảnh. Vui lòng thử lại.',
        variant: 'destructive',
      });
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hasContent = message.trim() || images.length > 0;
    
    if (hasContent && !isLoading && !disabled) {
      onSendMessage(message.trim() || (images.length > 0 ? 'Xem ảnh' : ''), images.length > 0 ? images : undefined);
      setMessage('');
      setImages([]);
      setImageFiles([]);
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
      {/* Image Preview */}
      {images.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {images.map((image, index) => (
            <div key={index} className="relative group">
              <img
                src={image}
                alt={`Preview ${index + 1}`}
                className="w-20 h-20 object-cover rounded-lg border border-border"
              />
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Xóa ảnh"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

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
        
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          multiple
          onChange={handleImageSelect}
          className="hidden"
          disabled={disabled || isLoading || images.length >= MAX_IMAGES}
        />
        
        <Button
          type="button"
          variant="outline"
          className="h-[44px] px-3 flex-shrink-0"
          disabled={disabled || isLoading || images.length >= MAX_IMAGES}
          onClick={() => fileInputRef.current?.click()}
          title={images.length >= MAX_IMAGES ? `Tối đa ${MAX_IMAGES} ảnh` : 'Upload ảnh'}
        >
          <ImageIcon className="w-5 h-5" />
          {images.length > 0 && (
            <span className="ml-1 text-xs">{images.length}/{MAX_IMAGES}</span>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-[44px] px-3 flex-shrink-0"
          disabled={disabled || isLoading || !stt.isSupported}
          onClick={() => {
            if (!stt.isSupported) {
              toast({ title: 'Không hỗ trợ', description: 'Trình duyệt không hỗ trợ ghi âm (Web Speech)', variant: 'destructive' });
              return;
            }
            if (stt.isRecording) stt.stop(); else stt.start();
          }}
          aria-label={stt.isRecording ? 'Dừng ghi' : 'Bắt đầu ghi'}
          title={stt.isSupported ? (stt.isRecording ? 'Dừng ghi' : 'Nhấn để nói') : 'Trình duyệt không hỗ trợ'}
        >
          {stt.isRecording ? <MicOff className="w-5 h-5 text-red-500" /> : <Mic className="w-5 h-5" />}
        </Button>
        
        <Button
          type="submit"
          disabled={(!message.trim() && images.length === 0) || isLoading || disabled}
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