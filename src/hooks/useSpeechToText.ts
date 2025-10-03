import { useCallback, useEffect, useRef, useState } from 'react';
import { userProfileService } from '@/services/userProfile';

export type SttProvider = 'webspeech' | 'google';

export interface UseSpeechToTextOptions {
  onTranscript?: (text: string, isFinal: boolean) => void;
  preferredLanguages?: Array<'vi-VN' | 'en-US'>; // order of preference
}

export interface UseSpeechToText {
  isSupported: boolean;
  isRecording: boolean;
  interimText: string;
  finalText: string;
  provider: SttProvider;
  start: () => void;
  stop: () => void;
  setProvider: (p: SttProvider) => void;
}

// Basic heuristic: choose lang by navigator or stored preference; no true auto-detect
function getInitialLang(preferred?: Array<'vi-VN' | 'en-US'>): 'vi-VN' | 'en-US' {
  if (preferred && preferred.length > 0) return preferred[0];
  const nav = (navigator.language || '').toLowerCase();
  if (nav.startsWith('vi')) return 'vi-VN';
  return 'en-US';
}

export function useSpeechToText(options: UseSpeechToTextOptions = {}): UseSpeechToText {
  const [provider, setProviderState] = useState<SttProvider>(() => {
    const prof = userProfileService.getProfile();
    return prof.preferences?.sttProvider || 'webspeech';
  });
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [finalText, setFinalText] = useState('');

  const recognitionRef = useRef<any>(null);
  const activeLangRef = useRef<'vi-VN' | 'en-US'>(getInitialLang(options.preferredLanguages));

  const isWebSpeechAvailable = typeof window !== 'undefined' && (
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  );

  const isSupported = provider === 'webspeech' ? Boolean(isWebSpeechAvailable) : true;

  useEffect(() => {
    userProfileService.updatePreferences({ sttProvider: provider });
  }, [provider]);

  const cleanupRecognition = useCallback(() => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      }
    } catch {}
    recognitionRef.current = null;
  }, []);

  const stop = useCallback(() => {
    setIsRecording(false);
    cleanupRecognition();
  }, [cleanupRecognition]);

  const startWebSpeech = useCallback(() => {
    if (!isWebSpeechAvailable) return;
    const RecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new RecognitionCtor();
    recognitionRef.current = rec;
    setInterimText('');
    setFinalText('');

    rec.lang = activeLangRef.current;
    rec.interimResults = true;
    rec.continuous = false;

    rec.onresult = (event: any) => {
      let interim = '';
      let finalS = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) finalS += res[0].transcript;
        else interim += res[0].transcript;
      }
      if (interim) {
        setInterimText(interim);
        options.onTranscript?.(interim, false);
      }
      if (finalS) {
        setFinalText((prev) => prev + finalS);
        options.onTranscript?.(finalS, true);
      }
    };

    rec.onerror = () => {
      setIsRecording(false);
    };

    rec.onend = () => {
      setIsRecording(false);
    };

    rec.start();
    setIsRecording(true);
  }, [isWebSpeechAvailable, options]);

  const startGoogleStub = useCallback(() => {
    // Placeholder: requires backend endpoint to process audio stream.
    console.warn('Google STT is not configured. Please set up backend endpoint.');
    setIsRecording(false);
  }, []);

  const start = useCallback(() => {
    if (provider === 'webspeech') return startWebSpeech();
    return startGoogleStub();
  }, [provider, startGoogleStub, startWebSpeech]);

  const setProvider = useCallback((p: SttProvider) => {
    setProviderState(p);
  }, []);

  useEffect(() => () => cleanupRecognition(), [cleanupRecognition]);

  return {
    isSupported,
    isRecording,
    interimText,
    finalText,
    provider,
    start,
    stop,
    setProvider,
  };
}


