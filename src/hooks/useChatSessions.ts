import { useState, useEffect, useCallback } from 'react';

export interface ChatMessage {
  id: string;
  message: string;
  isUser: boolean;
  timestamp: number;
  images?: string[]; // Array of base64 image data URLs
}

export interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: number;
  messageCount: number;
  messages: ChatMessage[];
  isCustomTitle?: boolean; // Track if user has manually renamed the chat
}

const STORAGE_KEY = 'design24-chat-sessions';
const MAX_MESSAGES_PER_CHAT = 200;

export function useChatSessions() {
  const [chatSessions, setChatSessions] = useState<Record<string, ChatSession>>({});
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  // Load chat sessions from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setChatSessions(parsed);
        
        // Load the most recent chat
        const sessions = Object.values(parsed) as ChatSession[];
        if (sessions.length > 0) {
          const mostRecent = sessions.sort((a, b) => b.timestamp - a.timestamp)[0];
          setCurrentChatId(mostRecent.id);
        }
      }
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
    }
  }, []);

  // Save chat sessions to localStorage (debounced)
  const saveChatSessions = useCallback((sessions: Record<string, ChatSession>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error('Failed to save chat sessions:', error);
    }
  }, []);

  // Create a new chat session
  const createNewChat = useCallback(() => {
    const newChatId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newSession: ChatSession = {
      id: newChatId,
      title: 'New Chat',
      lastMessage: '',
      timestamp: Date.now(),
      messageCount: 0,
      messages: [],
      isCustomTitle: false, // Initially not custom title
    };

    const updatedSessions = { ...chatSessions, [newChatId]: newSession };
    setChatSessions(updatedSessions);
    setCurrentChatId(newChatId);
    saveChatSessions(updatedSessions);
    
    return newChatId;
  }, [chatSessions, saveChatSessions]);

  // Add a message to the current chat
  const addMessage = useCallback((message: string, isUser: boolean, images?: string[]) => {
    if (!currentChatId) return;

    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newMessage: ChatMessage = {
      id: messageId,
      message,
      isUser,
      timestamp: Date.now(),
      images,
    };

    setChatSessions(prev => {
      const session = prev[currentChatId];
      if (!session) return prev;

      // Limit messages per chat to prevent memory issues
      const messages = [...session.messages, newMessage];
      if (messages.length > MAX_MESSAGES_PER_CHAT) {
        messages.splice(0, messages.length - MAX_MESSAGES_PER_CHAT);
      }

      // Generate title from first user message ONLY if title hasn't been manually changed
      let title = session.title;
      if (title === 'New Chat' && isUser && message.trim() && !session.isCustomTitle) {
        title = message.length > 50 ? message.substring(0, 47) + '...' : message;
      }

      const updatedSession: ChatSession = {
        ...session,
        title,
        lastMessage: message.substring(0, 100),
        timestamp: Date.now(),
        messageCount: messages.length,
        messages,
      };

      const updatedSessions = { ...prev, [currentChatId]: updatedSession };
      saveChatSessions(updatedSessions);
      return updatedSessions;
    });

    return messageId;
  }, [currentChatId, saveChatSessions]);

  // Load a specific chat session
  const loadChatSession = useCallback((chatId: string) => {
    if (chatSessions[chatId]) {
      setCurrentChatId(chatId);
    }
  }, [chatSessions]);

  // Delete a chat session
  const deleteChatSession = useCallback((chatId: string) => {
    setChatSessions(prev => {
      const updated = { ...prev };
      delete updated[chatId];
      
      // If we're deleting the current chat, switch to another one or create new
      if (currentChatId === chatId) {
        const remaining = Object.values(updated);
        if (remaining.length > 0) {
          const mostRecent = remaining.sort((a, b) => b.timestamp - a.timestamp)[0];
          setCurrentChatId(mostRecent.id);
        } else {
          setCurrentChatId(null);
        }
      }
      
      saveChatSessions(updated);
      return updated;
    });
  }, [currentChatId, saveChatSessions]);

  // Rename a chat session
  const renameChatSession = useCallback((chatId: string, newTitle: string) => {
    setChatSessions(prev => {
      const session = prev[chatId];
      if (!session) return prev;

      const updatedSession: ChatSession = {
        ...session,
        title: newTitle.trim() || 'Untitled Chat',
        isCustomTitle: true, // Mark as custom title when user renames
      };

      const updatedSessions = { ...prev, [chatId]: updatedSession };
      saveChatSessions(updatedSessions);
      return updatedSessions;
    });
  }, [saveChatSessions]);

  // Clear all chat sessions
  const clearAllChatSessions = useCallback(() => {
    setChatSessions({});
    setCurrentChatId(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Replace the last assistant (AI) message in the current chat
  const replaceLastAssistantMessage = useCallback((newMessageText: string) => {
    if (!currentChatId) return;
    setChatSessions(prev => {
      const session = prev[currentChatId];
      if (!session || session.messages.length === 0) return prev;

      const messages = [...session.messages];
      // Find the last user message index
      let lastUserIndex = -1;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].isUser) {
          lastUserIndex = i;
          break;
        }
      }
      // Determine the range of assistant messages after the last user
      const firstAssistantIndex = lastUserIndex >= 0 ? lastUserIndex + 1 : 0;
      let cursor = firstAssistantIndex;
      while (cursor < messages.length && !messages[cursor].isUser) {
        cursor++;
      }
      // [firstAssistantIndex, cursor) is the block of assistant messages to collapse into one
      if (firstAssistantIndex >= messages.length) {
        // There is no assistant yet; append one
        const newAssistant: ChatMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          message: newMessageText,
          isUser: false,
          timestamp: Date.now(),
        };
        messages.push(newAssistant);
      } else if (messages[firstAssistantIndex].isUser) {
        // Edge case: next item is user; insert new assistant right after last user
        const newAssistant: ChatMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          message: newMessageText,
          isUser: false,
          timestamp: Date.now(),
        };
        messages.splice(firstAssistantIndex + 1, 0, newAssistant);
      } else {
        // Replace the first assistant message content
        messages[firstAssistantIndex] = {
          ...messages[firstAssistantIndex],
          message: newMessageText,
          timestamp: Date.now(),
        };
        // Remove any extra assistant messages after it
        if (cursor - firstAssistantIndex > 1) {
          messages.splice(firstAssistantIndex + 1, cursor - firstAssistantIndex - 1);
        }
      }

      const updatedSession: ChatSession = {
        ...session,
        lastMessage: newMessageText.substring(0, 100),
        timestamp: Date.now(),
        messages,
        messageCount: messages.length,
      };

      const updated = { ...prev, [currentChatId]: updatedSession };
      saveChatSessions(updated);
      return updated;
    });
  }, [currentChatId, saveChatSessions]);

  // Get current chat session
  const currentChat = currentChatId ? chatSessions[currentChatId] || null : null;

  return {
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
  };
}