import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Wifi, WifiOff, Plus, Menu, Key } from 'lucide-react';
import { ChatSidebar } from './ChatSidebar';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ApiKeySetup } from './ApiKeySetup';
import { ChangePasswordModal } from './ChangePasswordModal';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useChatSessions } from '@/hooks/useChatSessions';
import { geminiService } from '@/services/geminiApi';
import { secureRateLimitingService as rateLimitingService } from '@/services/secureRateLimiting';
import { useToast } from '@/hooks/use-toast';
import { UserRole, USER_ROLE_CONFIGS } from '@/types/auth';
import logoDesign24 from '@/assets/design24-logo.webp';

interface TypingMessage {
  id: string;
  message: string;
  isUser: boolean;
  timestamp: number;
  isTyping: boolean;
}

interface ChatboxProps {
  userRole: UserRole;
}

export function Chatbox({ userRole }: ChatboxProps) {
  const [isApiKeyConfigured, setIsApiKeyConfigured] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState(userRole);
  const [rateLimitInfo, setRateLimitInfo] = useState(rateLimitingService.getRateLimitInfo(userRole));
  
  const {
    chatSessions,
    currentChatId,
    currentChat,
    createNewChat,
    addMessage,
    loadChatSession,
    deleteChatSession,
    renameChatSession,
    clearAllChatSessions,
  } = useChatSessions();

  const [isLoading, setIsLoading] = useState(false);
  const [typingMessage, setTypingMessage] = useState<TypingMessage | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Check if API key is configured on mount
  useEffect(() => {
    setIsApiKeyConfigured(geminiService.isConfigured());
  }, []);

  // Update rate limit info when user role changes
  useEffect(() => {
    setRateLimitInfo(rateLimitingService.getRateLimitInfo(currentUserRole));
    
    // Cảnh báo nếu phát hiện device mới (có thể là hack attempt)
    if (rateLimitingService.isNewDevice()) {
      console.warn('New device detected - rate limiting reset');
    }
  }, [currentUserRole]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChat?.messages, typingMessage]);

  // Show welcome message for empty chats
  useEffect(() => {
    if (currentChat && currentChat.messages.length === 0) {
      const welcomeMessageId = addMessage(
        "Xin chào! Tôi là Trợ lý AI của DESIGN24. Tôi có thể hỗ trợ bạn trong nhiều lĩnh vực học tập và công việc — từ du lịch, hành chính công, đến sáng tạo nội dung và hơn thế nữa. Hãy bắt đầu cuộc trò chuyện để khám phá các kỹ năng hoặc dịch vụ bạn quan tâm nhé!",
        false
      );
    }
  }, [currentChat?.id, addMessage]);

  const handleSendMessage = async (message: string) => {
    if (!currentChatId) {
      const newChatId = createNewChat();
      if (!newChatId) return;
    }

    if (!isOnline) {
      toast({
        title: "Không có kết nối Internet",
        description: "Vui lòng kiểm tra kết nối internet và thử lại.",
        variant: "destructive",
      });
      return;
    }

    if (!geminiService.isConfigured()) {
      toast({
        title: "Yêu cầu API Key",
        description: "Vui lòng làm mới trang và nhập khóa API Gemini của bạn.",
        variant: "destructive",
      });
      return;
    }

    // Check rate limit
    const canSend = await rateLimitingService.canSendMessage(currentUserRole);
    if (!canSend) {
      const userConfig = USER_ROLE_CONFIGS[currentUserRole];
      toast({
        title: "Đã vượt quá giới hạn tin nhắn",
        description: `Bạn đã sử dụng hết ${userConfig.dailyLimit} tin nhắn/ngày. Vui lòng thử lại vào ngày mai.`,
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    // Add user message
    addMessage(message, true);
    setIsLoading(true);

    try {
      // Create conversation context for API
      const conversationMessages = currentChat?.messages.map(msg => ({
        message: msg.message,
        isUser: msg.isUser
      })) || [];

      // Get AI response
      const response = await geminiService.sendMessage(conversationMessages, message);

      // Show typing animation
      const typingId = `typing-${Date.now()}`;
      setTypingMessage({
        id: typingId,
        message: response,
        isUser: false,
        timestamp: Date.now(),
        isTyping: true,
      });

      // Wait for typing animation to complete, then add the actual message
      setTimeout(async () => {
        addMessage(response, false);
        setTypingMessage(null);
        
        // Increment rate limit usage after successful response
        await rateLimitingService.incrementUsage(currentUserRole);
        setRateLimitInfo(rateLimitingService.getRateLimitInfo(currentUserRole));
      }, Math.min(response.length * 20, 3000)); // Dynamic timing based on response length

    } catch (error) {
      console.error('Error sending message:', error);
      
      // Check if it's an API key error
      if (error instanceof Error && error.message === 'API_KEY_NOT_CONFIGURED') {
        setIsApiKeyConfigured(false);
        addMessage('Vui lòng làm mới trang và nhập khóa API Gemini để tiếp tục.', false);
        toast({
          title: "Cần API Key",
          description: "Vui lòng làm mới trang và nhập khóa API của bạn.",
          variant: "destructive",
        });
        return;
      }
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Xin lỗi, tôi gặp lỗi. Vui lòng thử lại.';
      
      addMessage(errorMessage, false);
      
      toast({
        title: "Lỗi",
        description: "Không thể nhận phản hồi từ AI. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    createNewChat();
    setIsMobileSidebarOpen(false); // Close mobile sidebar after creating new chat
    toast({
      title: "Tạo cuộc trò chuyện mới",
      description: "Bạn có thể bắt đầu cuộc trò chuyện mới.",
      duration: 3500,
    });
  };

  const handleSelectChat = (chatId: string) => {
    loadChatSession(chatId);
    setIsMobileSidebarOpen(false); // Close mobile sidebar after selecting chat
  };

  const handleDeleteChat = (chatId: string) => {
    deleteChatSession(chatId);
    toast({
      title: "Đã xóa cuộc trò chuyện",
      description: "Cuộc trò chuyện đã được xóa.",
      duration: 3500,
    });
  };

  const handleClearAllChats = () => {
    clearAllChatSessions();
    toast({
      title: "Đã xóa tất cả cuộc trò chuyện",
      description: "Tất cả cuộc trò chuyện đã được xóa.",
      duration: 3500,
    });
  };

  const handleRenameChat = (chatId: string, newTitle: string) => {
    renameChatSession(chatId, newTitle);
    toast({
      title: "Đã đổi tên cuộc trò chuyện",
      description: `Đã đổi tên thành "${newTitle}".`,
      duration: 3500,
    });
  };

  const handleApiKeySet = () => {
    setIsApiKeyConfigured(true);
    // Create a new chat automatically after API key is set
    createNewChat();
  };

  const handlePasswordChanged = (newRole: UserRole) => {
    setCurrentUserRole(newRole);
    setRateLimitInfo(rateLimitingService.getRateLimitInfo(newRole));
    
    toast({
      title: "Đã đổi gói dịch vụ",
      description: `Chuyển sang gói ${newRole === UserRole.ADMIN ? 'Admin' : newRole === UserRole.USER ? 'User' : 'Beta'} thành công.`,
      duration: 3000,
    });
  };

  // API key is now integrated, no setup required

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-80">
        <ChatSidebar
          chatSessions={chatSessions}
          currentChatId={currentChatId}
          onNewChat={handleNewChat}
          onSelectChat={handleSelectChat}
          onDeleteChat={handleDeleteChat}
          onRenameChat={handleRenameChat}
          onClearAllChats={handleClearAllChats}
        />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
        <SheetContent side="left" className="w-80 p-0">
          <ChatSidebar
            chatSessions={chatSessions}
            currentChatId={currentChatId}
            onNewChat={handleNewChat}
            onSelectChat={handleSelectChat}
            onDeleteChat={handleDeleteChat}
            onRenameChat={handleRenameChat}
            onClearAllChats={handleClearAllChats}
          />
        </SheetContent>
      </Sheet>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-card border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Menu Button */}
            <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="md:hidden p-2"
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
            </Sheet>
            
            <div className="w-8 h-8 bg-chat-gradient rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-primary-foreground font-bold text-sm">AI</span>
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-lg truncate">
                {currentChat?.title || 'Trợ lý AI'}
              </h2>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground truncate">
                  DESIGN24 • Trợ lý AI Đa lĩnh vực
                </p>
                {/* Rate limit info - hidden on mobile and tablet */}
                <div className="hidden lg:flex items-center gap-1 text-xs">
                  <span className="text-muted-foreground">
                    {rateLimitingService.getFormattedLimitInfo(currentUserRole)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Change Password Button - visible on all devices */}
            <Button 
              onClick={() => setIsChangePasswordModalOpen(true)}
              variant="ghost"
              size="sm"
              title="Đổi gói dịch vụ"
            >
              <Key className="w-4 h-4" />
            </Button>
            
            {/* Mobile New Chat Button */}
            <Button 
              onClick={handleNewChat}
              variant="ghost"
              size="sm"
              className="md:hidden"
            >
              <Plus className="w-4 h-4" />
            </Button>
            
            <div className={`hidden sm:flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
              isOnline 
                ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
                : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            }`}>
              {isOnline ? (
                <Wifi className="w-3 h-3" />
              ) : (
                <WifiOff className="w-3 h-3" />
              )}
              <span className="hidden sm:inline">{isOnline ? 'Trực tuyến' : 'Ngoại tuyến'}</span>
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="max-w-4xl mx-auto">
            {!geminiService.isConfigured() && (
              <Alert className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Vui lòng làm mới trang và nhập khóa API Gemini để bắt đầu trò chuyện.
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="ml-2"
                    onClick={() => window.location.reload()}
                  >
                    Làm mới trang
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Welcome message for new users */}
            {Object.keys(chatSessions).length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 border border-border">
                  <img 
                    src={logoDesign24} 
                    alt="DESIGN24 Logo" 
                    className="w-12 h-12 object-contain"
                  />
                </div>
                <h3 className="text-xl font-semibold mb-2 gradient-text">
                  Chào mừng đến với Trợ lý AI DESIGN24
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Xin chào! Tôi là Trợ lý AI của DESIGN24. Tôi có thể hỗ trợ bạn trong nhiều lĩnh vực học tập và công việc — từ du lịch, hành chính công, đến sáng tạo nội dung và hơn thế nữa. Hãy bắt đầu cuộc trò chuyện để khám phá các kỹ năng hoặc dịch vụ bạn quan tâm nhé!
                </p>
                <Button onClick={handleNewChat} variant="hero">
                  Bắt đầu cuộc trò chuyện đầu tiên
                </Button>
              </div>
            )}

            {/* Chat Messages */}
            {currentChat?.messages.map((message) => (
              <ChatMessage
                key={message.id}
                id={message.id}
                message={message.message}
                isUser={message.isUser}
                timestamp={message.timestamp}
              />
            ))}

            {/* Typing Message */}
            {typingMessage && (
              <ChatMessage
                id={typingMessage.id}
                message={typingMessage.message}
                isUser={typingMessage.isUser}
                timestamp={typingMessage.timestamp}
                isTyping={typingMessage.isTyping}
              />
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          disabled={!currentChatId || !geminiService.isConfigured() || !isOnline}
        />
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
        onPasswordChanged={handlePasswordChanged}
        currentRole={currentUserRole}
      />
    </div>
  );
}