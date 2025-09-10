import { useEffect, useState } from 'react';
import { Bot, User, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatMessageProps {
  id: string;
  message: string;
  isUser: boolean;
  timestamp: number;
  isTyping?: boolean;
}

export function ChatMessage({ message, isUser, timestamp, isTyping = false }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [displayedMessage, setDisplayedMessage] = useState('');

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

  const formatMessage = (text: string) => {
    // Convert markdown-like formatting to HTML
    let formatted = text
      // Bold text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic text
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Code blocks
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-muted p-3 rounded-md mt-2 mb-2 text-sm overflow-x-auto"><code>$1</code></pre>')
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
      <div className={`flex-1 max-w-[80%] ${isUser ? 'text-right' : ''}`}>
        <div className={`inline-block max-w-full ${
          isUser 
            ? 'bg-chat-gradient text-primary-foreground' 
            : 'bg-card border border-border'
        } rounded-2xl p-4 shadow-soft`}>
          <div 
            className="text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formatMessage(displayedMessage) }}
          />
          
          {isTyping && !isUser && displayedMessage.length < message.length && (
            <div className="flex items-center gap-1 mt-2">
              <div className="w-2 h-2 bg-primary rounded-full typing-dots" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-primary rounded-full typing-dots" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-primary rounded-full typing-dots" style={{ animationDelay: '300ms' }}></div>
            </div>
          )}
        </div>

        {/* Message Actions */}
        <div className={`flex items-center gap-2 mt-2 text-xs text-muted-foreground ${
          isUser ? 'justify-end' : 'justify-start'
        }`}>
          <span>{formatTime(timestamp)}</span>
          {!isUser && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 hover:bg-accent"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="w-3 h-3 text-green-500" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}