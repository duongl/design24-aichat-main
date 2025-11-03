import { useState, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { geminiTtsService } from '@/services/geminiTtsService';

interface UseTextToSpeechOptions {
  lang?: 'vi-VN' | 'en-US';
  rate?: number; // 0.1 to 10 (for audio playback speed)
  pitch?: number; // 0 to 2 (not used for Gemini TTS)
  volume?: number; // 0 to 1
}

interface UseTextToSpeech {
  isSpeaking: boolean;
  speak: (text: string) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  currentProvider: 'gemini';
}

export function useTextToSpeech(options: UseTextToSpeechOptions = {}): UseTextToSpeech {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechQueueRef = useRef<Array<{ text: string; cleanText: string }>>([]);
  const isProcessingRef = useRef(false);
  const { toast } = useToast();

  const {
    rate = 1,
    volume = 1,
  } = options;

  // Stop audio and clear queue
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    speechQueueRef.current = []; // Clear queue
    isProcessingRef.current = false;
    setIsSpeaking(false);
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsSpeaking(false);
  }, []);

  const resume = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play();
    }
    setIsSpeaking(true);
  }, []);

  // Process next item in queue
  const processNextInQueue = useCallback(async () => {
    // If already processing or queue is empty, return
    if (isProcessingRef.current || speechQueueRef.current.length === 0) {
      return;
    }

    isProcessingRef.current = true;
    const { text, cleanText } = speechQueueRef.current.shift()!;

    try {
      setIsSpeaking(true);
      
      console.log('Gemini TTS: Processing queue item, remaining:', speechQueueRef.current.length);

      // Call Gemini TTS API
      // Using Kore voice for Vietnamese female (Southern)
      const audioDataUrl = await geminiTtsService.speak(cleanText, {
        voice: 'Kore', // Vietnamese female voice (Southern) - prebuilt voice name
      });

      console.log('Gemini TTS: Received audio data URL');

      if (!audioDataUrl) {
        throw new Error('No audio data returned from Gemini TTS API');
      }

      // Play audio
      const audio = new Audio(audioDataUrl);
      audioRef.current = audio;
      audio.volume = volume;
      
      // Adjust playback rate if needed (0.5 to 2.0)
      audio.playbackRate = Math.max(0.5, Math.min(2.0, rate));

      // Event handlers
      audio.onloadeddata = () => {
        console.log('Gemini TTS: Audio loaded successfully');
      };

      audio.onended = () => {
        console.log('Gemini TTS: Audio playback ended');
        setIsSpeaking(false);
        audioRef.current = null;
        isProcessingRef.current = false;
        
        // Process next item in queue
        if (speechQueueRef.current.length > 0) {
          processNextInQueue();
        }
      };

      audio.onerror = (e) => {
        console.error('Gemini TTS: Audio playback error:', e);
        setIsSpeaking(false);
        audioRef.current = null;
        isProcessingRef.current = false;
        
        toast({
          title: 'Lỗi phát âm thanh',
          description: 'Không thể phát file âm thanh từ Gemini TTS.',
          variant: 'destructive',
        });
        
        // Continue processing queue even on error
        if (speechQueueRef.current.length > 0) {
          processNextInQueue();
        }
      };

      await audio.play();
      console.log('Gemini TTS: Audio playing');
    } catch (error) {
      console.error('Gemini TTS Error:', error);
      setIsSpeaking(false);
      isProcessingRef.current = false;
      
      const errorMessage = error instanceof Error ? error.message : 'Không thể tạo giọng nói';
      
      // Check if it's a model not available error
      const isModelNotAvailable = errorMessage.includes('model') || 
                                   errorMessage.includes('not found') ||
                                   errorMessage.includes('preview');
      
      toast({
        title: 'Lỗi Gemini TTS',
        description: isModelNotAvailable
          ? 'Model gemini-2.5-flash-preview-tts có thể chưa available hoặc cần quyền truy cập. Vui lòng thử lại sau hoặc kiểm tra Gemini API key.'
          : errorMessage,
        variant: 'destructive',
        duration: 5000,
      });
      
      // Continue processing queue even on error
      if (speechQueueRef.current.length > 0) {
        processNextInQueue();
      }
    }
  }, [rate, volume, toast]);

  // Gemini TTS speak function - adds to queue
  const speak = useCallback((text: string) => {
    if (!geminiTtsService.isConfigured()) {
      toast({
        title: 'Chưa cấu hình API Key',
        description: 'Vui lòng nhập Gemini API key trong Settings để sử dụng Text-to-Speech.',
        variant: 'destructive',
      });
      return;
    }

    console.log('Gemini TTS: Adding to queue');

    // Clean text: remove markdown, HTML tags, etc.
    const cleanText = text
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`([^`]+)`/g, '$1') // Remove inline code
      .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.+?)\*/g, '$1') // Remove italic
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links
      .replace(/<[^>]+>/g, '') // Remove HTML tags
      .replace(/\n+/g, '. ') // Replace newlines
      .trim();

    if (!cleanText) {
      toast({
        title: 'Không có nội dung',
        description: 'Không có văn bản để đọc.',
        variant: 'destructive',
      });
      return;
    }

    // Add to queue (don't stop current playback - queue will handle sequentially)
    speechQueueRef.current.push({ text, cleanText });
    
    console.log(`Gemini TTS: Added to queue (${speechQueueRef.current.length} items total)`);

    // Start processing queue if not already processing
    if (!isProcessingRef.current) {
      processNextInQueue();
    }
  }, [toast, stop, processNextInQueue]);

  return {
    isSpeaking,
    speak,
    stop,
    pause,
    resume,
    currentProvider: 'gemini' as const,
  };
}
