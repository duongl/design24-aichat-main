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

  // Handle JSON copy functionality
  useEffect(() => {
    const handleCopyJson = async (event: Event) => {
      const target = event.target as HTMLElement;
      // Check if clicked element is button or its child (SVG)
      const button = target.closest('.copy-json-btn') as HTMLElement;
      if (button) {
        console.log('Copy button clicked!');
        const jsonData = button.getAttribute('data-json');
        if (jsonData) {
          try {
            const decodedJson = decodeURIComponent(jsonData);
            console.log('Copying JSON:', decodedJson.substring(0, 100) + '...');
            await navigator.clipboard.writeText(decodedJson);
            
            // Show success feedback
            const originalIcon = button.innerHTML;
            button.innerHTML = '<i class="fa-solid fa-check"></i>';
            button.classList.add('text-green-500');
            
            setTimeout(() => {
              // Restore original copy icon
              button.innerHTML = '<i class="fa-regular fa-copy"></i>';
              button.classList.remove('text-green-500');
            }, 1500);
          } catch (error) {
            console.error('Failed to copy JSON:', error);
          }
        }
      }
    };

    // Add event listener
    document.addEventListener('click', handleCopyJson);
    
    return () => {
      document.removeEventListener('click', handleCopyJson);
    };
  }, []);

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
    
    // Remove "json" text at the beginning of lines and standalone "json" words
    formatted = formatted.replace(/^json\s*/gm, '');
    formatted = formatted.replace(/\bjson\b\s*/g, '');
    
    // Detect JSON blocks (even without ```json markers)
    // Improved regex to better match JSON objects
    const jsonRegex = /(\{(?:[^{}]|{[^{}]*})*\})/g;
    formatted = formatted.replace(jsonRegex, (match) => {
      try {
        // Try to parse as JSON to validate
        JSON.parse(match);
        // If valid JSON, format it with syntax highlighting
        const formattedJson = formatJsonSyntax(match);
        
        console.log('Creating JSON block with copy button');
        return `<div class="json-block-container mb-4">
          <div class="json-header">
            <span class="text-sm font-semibold text-primary">JSON Scene</span>
            <button class="copy-json-btn" data-json='${encodeURIComponent(match)}' title="Copy JSON">
              <i class="fa-regular fa-copy"></i>
            </button>
          </div>
          <pre class="json-content overflow-x-auto whitespace-pre-wrap break-words" style="word-break: break-word; overflow-wrap: break-word; white-space: pre-wrap;"><code class="json-syntax">${formattedJson}</code></pre>
        </div>`;
      } catch (e) {
        // If not valid JSON, return original text
        return match;
      }
    });

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
        } rounded-2xl p-4 shadow-soft`}>
          <div 
            className={`text-sm leading-relaxed break-words overflow-wrap-break-word whitespace-normal ${
              displayedMessage.length < 20 ? 'short-message' : ''
            }`}
            style={{ 
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              whiteSpace: 'normal'
            }}
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