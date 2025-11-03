import { useEffect, useState } from 'react';
import { Bot, User, Copy, Check, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';

interface ChatMessageProps {
  id: string;
  message: string;
  isUser: boolean;
  timestamp: number;
  isTyping?: boolean;
  canRegenerate?: boolean;
  onRegenerate?: () => void;
  showLoadingDots?: boolean;
  images?: string[];
}

export function ChatMessage({ message, isUser, timestamp, isTyping = false, canRegenerate = false, onRegenerate, showLoadingDots = false, images }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [displayedMessage, setDisplayedMessage] = useState('');
  const tts = useTextToSpeech({ 
    lang: 'vi-VN',
    rate: 1,
    pitch: 1,
    volume: 1
  });

  useEffect(() => {
    if (isTyping && !isUser) {
      // Typing animation for AI responses
      let index = 0;
      const timer = setInterval(() => {
        if (index < message.length) {
          setDisplayedMessage(message.slice(0, index + 1));
          index++;
        } else {
          clearInterval(timer);
        }
      }, 20);
      
      return () => clearInterval(timer);
    } else {
      setDisplayedMessage(message);
    }
  }, [message, isTyping, isUser]);

  // Removed JSON copy button behavior

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const formatJsonSyntax = (jsonString: string): string => {
    try {
      const parsed = JSON.parse(jsonString);
      const formatted = JSON.stringify(parsed, null, 2);
      
      // Add syntax highlighting classes
      return formatted
        .replace(/"([^"]+)":/g, '<span class="json-key">"$1":</span>')
        .replace(/: "([^"]*)"/g, ': <span class="json-string">"$1"</span>')
        .replace(/: (\d+)/g, ': <span class="json-number">$1</span>')
        .replace(/: (true|false)/g, ': <span class="json-boolean">$1</span>')
        .replace(/: null/g, ': <span class="json-null">null</span>');
    } catch (e) {
      return jsonString;
    }
  };

  // Removed JSON Scene detection – JSON will render as plain text

  const formatMessage = (text: string) => {
    // Auto-detect and format JSON blocks (only for AI messages)
    let formatted = text;
    
    // Only format JSON for AI messages, not user messages
    if (isUser) {
      // For user messages, just do basic formatting
      return formatted
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>')
        .replace(/\n/g, '<br>');
    }
    
    // Keep JSON as plain text; do not wrap in special block or add copy button

    // Convert markdown-like formatting to HTML
    formatted = formatted
      // Bold text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic text
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Code blocks (traditional markdown)
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-muted p-3 rounded-md mt-2 mb-2 text-sm overflow-x-auto whitespace-pre-wrap break-words overflow-wrap-break-word" style="word-break: break-word; overflow-wrap: break-word; white-space: pre-wrap;"><code>$1</code></pre>')
      // Inline code
      .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>')
      // Line breaks
      .replace(/\n/g, '<br>');

    return formatted;
  };

  return (
    <div className={`flex items-start gap-4 mb-6 ${isUser ? 'flex-row-reverse chat-animation-right' : 'chat-animation-left'}`}>
      {/* Avatar */}
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
        isUser 
          ? 'bg-chat-gradient text-primary-foreground' 
          : 'bg-accent text-accent-foreground border border-border'
      }`}>
        {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
      </div>

      {/* Message Content */}
      <div className={`flex-1 min-w-0 ${isUser ? 'text-right' : ''}`}>
        <div className={`inline-block max-w-[85%] sm:max-w-[80%] chat-message-bubble ${
          isUser 
            ? 'bg-chat-gradient text-primary-foreground' 
            : 'bg-card border border-border'
        } rounded-2xl shadow-soft ${
          images && images.length > 0 && !displayedMessage 
            ? images.length === 4 
              ? 'p-2' 
              : images.length === 1 
              ? 'p-3' 
              : 'p-2'
            : 'p-4'
        }`}>
          {/* Image Display */}
          {images && images.length > 0 && (
            <div 
              className={`${displayedMessage ? 'mb-3' : ''} ${
                images.length === 1 
                  ? 'w-full' 
                  : images.length === 2
                  ? 'grid grid-cols-2 gap-1.5'
                  : images.length === 3
                  ? 'grid grid-cols-2 gap-1.5'
                  : 'grid grid-cols-2 gap-1.5'
              }`}
              style={{
                maxWidth: images.length === 1 ? '100%' : images.length === 4 ? '380px' : images.length === 3 ? '340px' : '320px'
              }}
            >
              {images.map((image, index) => (
                <div
                  key={index}
                  className={`relative ${
                    images.length === 1 
                      ? 'w-full' 
                      : images.length === 3 && index === 0
                      ? 'col-span-2'
                      : 'w-full'
                  }`}
                >
                  <img
                    src={image}
                    alt={`Image ${index + 1}`}
                    className={`w-full h-auto rounded-lg border border-border/50 cursor-pointer hover:opacity-90 transition-opacity ${
                      images.length === 1 
                        ? 'max-h-[400px] object-contain' 
                        : images.length === 4
                        ? 'aspect-square object-cover'
                        : images.length === 3 && index === 0
                        ? 'aspect-[2/1] object-cover'
                        : 'aspect-square object-cover'
                    }`}
                    onClick={() => window.open(image, '_blank')}
                  />
                </div>
              ))}
            </div>
          )}
          
          {displayedMessage && (
            <div 
              className={`text-sm leading-relaxed break-words overflow-wrap-break-word whitespace-normal ${
                displayedMessage.length < 20 ? 'short-message' : ''
              }`}
              style={{ 
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                whiteSpace: 'normal'
              }}
              dangerouslySetInnerHTML={{ __html: showLoadingDots && !isUser ? '' : formatMessage(displayedMessage) }}
            />
          )}
          
          {(isTyping && !isUser && displayedMessage.length < message.length) || (showLoadingDots && !isUser) ? (
            <div className="flex items-center gap-1 mt-2">
              <div className="w-2 h-2 bg-primary rounded-full typing-dots" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-primary rounded-full typing-dots" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-primary rounded-full typing-dots" style={{ animationDelay: '300ms' }}></div>
            </div>
          ) : null}
        </div>

        {/* Message Actions */}
        <div className={`flex items-center gap-2 mt-2 text-xs text-muted-foreground ${
          isUser ? 'justify-end' : 'justify-start'
        }`}>
          <span>{formatTime(timestamp)}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-1 hover:bg-accent"
            onClick={handleCopy}
            title="Sao chép"
          >
            {copied ? (
              <Check className="w-3 h-3 text-green-500" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-1 hover:bg-accent"
            onClick={() => {
              if (tts.isSpeaking) {
                tts.stop();
              } else {
                tts.speak(message);
              }
            }}
            title={tts.isSpeaking ? 'Dừng đọc' : 'Đọc văn bản'}
          >
            {tts.isSpeaking ? (
              <VolumeX className="w-3 h-3 text-red-500" />
            ) : (
              <Volume2 className="w-3 h-3" />
            )}
          </Button>
          {!isUser && canRegenerate && !!onRegenerate && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 hover:bg-accent"
              onClick={onRegenerate}
              title="Tạo lại phản hồi"
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}