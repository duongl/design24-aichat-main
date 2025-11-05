import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Wifi, WifiOff, Plus, Menu, Key, User } from 'lucide-react';
import { ChatSidebar } from './ChatSidebar';
import { ChatMessage } from './ChatMessage';
import { ChatInput, type ChatInputRef } from './ChatInput';
import { ApiKeySetup } from './ApiKeySetup';
import { ChangePasswordModal } from './ChangePasswordModal';
import { UserProfileModal } from './UserProfileModal';
import { SuggestionQuestions } from './SuggestionQuestions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useChatSessions } from '@/hooks/useChatSessions';
import { geminiService } from '@/services/geminiApi';
import { secureRateLimitingService as rateLimitingService } from '@/services/secureRateLimiting';
import { useToast } from '@/hooks/use-toast';
import { UserRole, USER_ROLE_CONFIGS } from '@/types/auth';
import { userProfileService } from '@/services/userProfile';
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
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState(userRole);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState(rateLimitingService.getRateLimitInfo(userRole));
  const [profileUpdateTrigger, setProfileUpdateTrigger] = useState(0);
  
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
    replaceLastAssistantMessage,
  } = useChatSessions();

  const [isLoading, setIsLoading] = useState(false);
  const [typingMessage, setTypingMessage] = useState<TypingMessage | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<ChatInputRef>(null);
  const { toast } = useToast();
  const [usingPersonalKey, setUsingPersonalKey] = useState(geminiService.usingPersonalKey());

  // Check if API key is configured on mount
  useEffect(() => {
    setIsApiKeyConfigured(geminiService.isConfigured());
    setUsingPersonalKey(geminiService.usingPersonalKey());
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
        "Xin chào! Tôi là Trợ lý AI của DESIGN24. Tôi có thể hỗ trợ bạn trong nhiều lĩnh vực học tập và công việc — từ sáng tạo nội dung, thiết kế đồ họa, sản xuất video, truyền thông, quảng cáo, hành chính công và hơn thế nữa. Hãy bắt đầu cuộc trò chuyện để khám phá các kỹ năng hoặc dịch vụ bạn quan tâm nhé!",
        false
      );
      
      // Check if suggestions should be shown
      const profile = userProfileService.getProfile();
      const shouldShowSuggestions = profile.preferences?.showSuggestions !== false;
      setShowSuggestions(shouldShowSuggestions);
    }
  }, [currentChat?.id, addMessage]);

  // Update suggestions visibility when profile changes
  useEffect(() => {
    const profile = userProfileService.getProfile();
    const shouldShowSuggestions = profile.preferences?.showSuggestions !== false;
    
    // Only update if we're in a chat with only welcome message
    if (currentChat && currentChat.messages.length === 1) {
      setShowSuggestions(shouldShowSuggestions);
    }
  }, [currentChat?.messages.length, profileUpdateTrigger]);

  const handleSendMessage = async (message: string, images?: string[], documentText?: string, documents?: import('@/hooks/useChatSessions').ChatMessageDocument[]) => {
    // Hide suggestions when user sends a message
    setShowSuggestions(false);
    
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
        title: "Yêu cầu API Key cá nhân",
        description: "Tính năng chat miễn phí đang tạm khóa. Vui lòng nhập API key Gemini cá nhân để sử dụng.",
        variant: "destructive",
      });
      return;
    }

    // Check rate limit
    // Skip rate limit when using personal key
    const canSend = usingPersonalKey ? true : await rateLimitingService.canSendMessage(currentUserRole);
    if (!canSend) {
      const userConfig = USER_ROLE_CONFIGS[currentUserRole];
      toast({
        title: "Đã vượt quá giới hạn tin nhắn",
        description: `Bạn đã sử dụng hết ${userConfig.dailyLimit} tin nhắn/ngày. Vui lòng thử lại vào ngày mai.`,
        variant: "destructive",
        duration: 1300,
      });
      return;
    }

    // Add user message with images and documents
    addMessage(message, true, images, documents);
    setIsLoading(true);

    try {
      // Create conversation context for API
      const conversationMessages = currentChat?.messages.map(msg => ({
        message: msg.message,
        isUser: msg.isUser,
        images: msg.images
      })) || [];

      // Combine message with document text if provided
      const fullMessage = documentText ? `${message}\n\n${documentText}` : message;
      
      // Get AI response
      const response = await geminiService.sendMessage(conversationMessages, fullMessage, images);

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
        if (!usingPersonalKey) {
          await rateLimitingService.incrementUsage(currentUserRole);
          setRateLimitInfo(rateLimitingService.getRateLimitInfo(currentUserRole));
        }
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

  // Regenerate the last AI response using the last user prompt
  const handleRegenerate = async () => {
    if (!currentChat || currentChat.messages.length === 0) return;

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
        title: "Yêu cầu API Key cá nhân",
        description: "Vui lòng nhập API key Gemini để sử dụng.",
        variant: "destructive",
      });
      return;
    }

    // Find the last user message to use as the prompt
    const lastUserMsg = [...currentChat.messages].reverse().find(m => m.isUser)?.message;
    if (!lastUserMsg) return;

    setIsLoading(true);
    try {
      // Find the target assistant message to show loading animation
      let lastUserIndex = -1;
      for (let i = currentChat.messages.length - 1; i >= 0; i--) {
        if (currentChat.messages[i].isUser) { lastUserIndex = i; break; }
      }
      const targetIndex = lastUserIndex >= 0 ? lastUserIndex + 1 : 0;
      const targetId = currentChat.messages[targetIndex]?.isUser === false ? currentChat.messages[targetIndex].id : null;
      if (targetId) setRegeneratingId(targetId);

      // Build conversation context up to the last user message (exclude following AI block)
      const contextSlice = lastUserIndex >= 0 ? currentChat.messages.slice(0, lastUserIndex + 1) : [];
      const conversationMessages = contextSlice.map(msg => ({ message: msg.message, isUser: msg.isUser }));

      const response = await geminiService.sendMessage(conversationMessages, lastUserMsg);

      // During regenerate: don't append a second message; just show loading dots on the target bubble
      // Replace after a short delay to simulate typing
      setTimeout(async () => {
        replaceLastAssistantMessage(response);
        setRegeneratingId(null);
        if (!usingPersonalKey) {
          await rateLimitingService.incrementUsage(currentUserRole);
          setRateLimitInfo(rateLimitingService.getRateLimitInfo(currentUserRole));
        }
      }, Math.min(response.length * 20, 3000));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Xin lỗi, tôi gặp lỗi. Vui lòng thử lại.';
      replaceLastAssistantMessage(errorMessage);
      setRegeneratingId(null);
      toast({ title: 'Lỗi', description: 'Không thể tạo lại phản hồi.', variant: 'destructive' });
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
      duration: 1300,
    });
  };

  const handleSuggestionClick = (suggestion: string) => {
    // Hide suggestions and send the suggestion as a message
    setShowSuggestions(false);
    handleSendMessage(suggestion);
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
      duration: 1300,
    });
  };

  const handleClearAllChats = () => {
    clearAllChatSessions();
    toast({
      title: "Đã xóa tất cả cuộc trò chuyện",
      description: "Tất cả cuộc trò chuyện đã được xóa.",
      duration: 1300,
    });
  };

  const handleRenameChat = (chatId: string, newTitle: string) => {
    renameChatSession(chatId, newTitle);
    toast({
      title: "Đã đổi tên cuộc trò chuyện",
      description: `Đã đổi tên thành "${newTitle}".`,
      duration: 1300,
    });
  };

  const handleApiKeySet = () => {
    setIsApiKeyConfigured(true);
    setUsingPersonalKey(geminiService.usingPersonalKey());
    // Create a new chat automatically after API key is set
    createNewChat();
  };

  const handlePasswordChanged = (newRole: UserRole) => {
    setCurrentUserRole(newRole);
    setRateLimitInfo(rateLimitingService.getRateLimitInfo(newRole));
    
    toast({
      title: "Đã đổi gói dịch vụ",
      description: `Chuyển sang gói ${newRole === UserRole.ADMIN ? 'Admin' : newRole === UserRole.USER ? 'User' : 'Beta'} thành công.`,
      duration: 1300,
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
                {/* Rate limit info - hidden because free chat is temporarily disabled */}
                {false && (
                  <div className="hidden lg:flex items-center gap-1 text-xs">
                    <span className="text-muted-foreground">
                      {rateLimitingService.getFormattedLimitInfo(currentUserRole)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* API Key Button (lock icon) */}
            <Button
              onClick={() => setIsChangePasswordModalOpen(true)}
              variant="ghost"
              size="sm"
              title="Nhập Gemini API Key"
            >
              <Key className="w-4 h-4" />
            </Button>
            
            <Button
              onClick={() => setIsUserProfileModalOpen(true)}
              variant="ghost"
              size="sm"
              title="Profile & Preferences"
            >
              <User className="w-4 h-4" />
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
        <ScrollArea className="flex-1">
          <div className="max-w-4xl mx-auto w-full p-2 sm:p-4">
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
                  Xin chào! Tôi là Trợ lý AI của DESIGN24. Tôi có thể hỗ trợ bạn trong nhiều lĩnh vực học tập và công việc — từ sáng tạo nội dung, thiết kế đồ họa, sản xuất video, truyền thông, quảng cáo, hành chính công và hơn thế nữa. Hãy bắt đầu cuộc trò chuyện để khám phá các kỹ năng hoặc dịch vụ bạn quan tâm nhé!
                </p>
                <Button onClick={handleNewChat} variant="hero">
                  Bắt đầu cuộc trò chuyện đầu tiên
                </Button>
              </div>
            )}

            {/* Chat Messages */}
            {currentChat?.messages.map((message, idx) => (
              <ChatMessage
                key={message.id}
                id={message.id}
                message={message.message}
                isUser={message.isUser}
                timestamp={message.timestamp}
                canRegenerate={!message.isUser && idx === (currentChat.messages.length - 1) && !isLoading}
                onRegenerate={handleRegenerate}
                isTyping={false}
                showLoadingDots={regeneratingId === message.id}
                images={message.images}
                documents={message.documents}
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

        {/* Suggestions */}
        {showSuggestions && currentChat && currentChat.messages.length === 1 && (
          <div className="px-2 sm:px-4 pb-2">
            <SuggestionQuestions
              onSuggestionClick={handleSuggestionClick}
              suggestions={[
                "Hướng dẫn tạo prompt ảnh",
                "Hướng dẫn tạo prompt video chuẩn Veo 3",
                "10 kỹ năng AI lĩnh vực Thiết kế & Truyền thông đa phương tiện",
                "Ứng dụng AI trong thủ tục hành chính",
                "Thiết kế đồ họa",
                "Đa phương tiện",
                "Kiến trúc - nội thất",
                "Sáng tạo truyện tranh",
                "Sáng tạo âm nhạc",
                "Hành chính văn phòng",
                "Viết content quảng cáo",
                "Viết kịch bản video"
              ]}
            />
          </div>
        )}

        {/* Input Area */}
        <ChatInput
          ref={chatInputRef}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          disabled={!currentChatId || !geminiService.isConfigured() || !isOnline}
        />
      </div>

      {/* API Key Dialog */}
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
        onApiKeySet={handleApiKeySet}
      />

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isUserProfileModalOpen}
        onClose={() => {
          setIsUserProfileModalOpen(false);
          // Trigger profile update check
          setProfileUpdateTrigger(prev => prev + 1);
        }}
      />
    </div>
  );
}