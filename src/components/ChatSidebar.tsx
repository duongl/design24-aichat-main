import { useState } from 'react';
import { Plus, Trash2, MessageSquare, Clock, Edit2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import logoDesign24 from '@/assets/design24-logo.webp';

interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: number;
  messageCount: number;
}

interface ChatSidebarProps {
  chatSessions: Record<string, ChatSession>;
  currentChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  onRenameChat: (chatId: string, newTitle: string) => void;
  onClearAllChats: () => void;
}

export function ChatSidebar({
  chatSessions,
  currentChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onRenameChat,
  onClearAllChats,
}: ChatSidebarProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const sortedSessions = Object.values(chatSessions).sort(
    (a, b) => b.timestamp - a.timestamp
  );

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const handleStartEdit = (session: ChatSession) => {
    setEditingId(session.id);
    setEditingTitle(session.title);
  };

  const handleSaveEdit = () => {
    if (editingId && editingTitle.trim()) {
      onRenameChat(editingId, editingTitle.trim());
    }
    setEditingId(null);
    setEditingTitle('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  return (
    <div className="w-80 bg-sidebar border-r border-sidebar-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-border">
            <img 
              src={logoDesign24} 
              alt="DESIGN24 Logo" 
              className="w-8 h-8 object-contain"
            />
          </div>
          <div>
            <h1 className="font-bold text-lg gradient-text">DESIGN24 X DƯƠNG</h1>
            <p className="text-xs text-muted-foreground">Trợ lý AI</p>
          </div>
        </div>
        
        <Button 
          onClick={onNewChat}
          variant="primary"
          className="w-full"
        >
          <Plus className="w-5 h-5 mr-2" />
          Cuộc trò chuyện mới
        </Button>
      </div>

      {/* Chat Sessions List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {sortedSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Chưa có cuộc trò chuyện nào</p>
              <p className="text-xs">Bắt đầu cuộc trò chuyện mới</p>
            </div>
          ) : (
            <div className="space-y-1">
              {sortedSessions.map((session) => (
                <div
                  key={session.id}
                  className={`group relative rounded-lg p-3 cursor-pointer transition-all duration-200 ${
                    currentChatId === session.id
                      ? 'bg-sidebar-accent border border-sidebar-border shadow-soft'
                      : 'hover:bg-sidebar-accent/50'
                  }`}
                  onClick={() => onSelectChat(session.id)}
                >
                  {editingId === session.id ? (
                    <div className="flex items-center gap-1 mb-2">
                      <Input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                        className="text-sm h-6 px-2 flex-1"
                        autoFocus
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-6 h-6 p-0 text-green-600 flex-shrink-0"
                        onClick={handleSaveEdit}
                      >
                        <Check className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-6 h-6 p-0 text-red-600 flex-shrink-0"
                        onClick={handleCancelEdit}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0 pr-2">
                        <h3 className="font-medium text-sm text-sidebar-foreground truncate">
                          {truncateText(session.title, 25)}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {truncateText(session.lastMessage, 35)}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(session.timestamp)}</span>
                          <span>•</span>
                          <span>{session.messageCount} tin nhắn</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-7 h-7 p-0 text-muted-foreground hover:text-primary hover:bg-sidebar-accent"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(session);
                          }}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-7 h-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmId(session.id);
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Xóa cuộc trò chuyện</AlertDialogTitle>
                              <AlertDialogDescription>
                                Bạn có chắc chắn muốn xóa cuộc trò chuyện này? Hành động này không thể hoàn tác.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Hủy</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => {
                                  onDeleteChat(session.id);
                                  setDeleteConfirmId(null);
                                }}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Xóa
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      {sortedSessions.length > 0 && (
        <div className="p-4 border-t border-sidebar-border">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full text-destructive hover:bg-destructive/10">
                <Trash2 className="w-4 h-4 mr-2" />
                Xóa tất cả
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Xóa tất cả cuộc trò chuyện</AlertDialogTitle>
                <AlertDialogDescription>
                  Bạn có chắc chắn muốn xóa TẤT CẢ cuộc trò chuyện? Hành động này không thể hoàn tác và sẽ xóa vĩnh viễn toàn bộ lịch sử trò chuyện của bạn.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Hủy</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onClearAllChats}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Xóa tất cả
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}