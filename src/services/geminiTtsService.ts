// Gemini 2.5 Flash Preview TTS Service
// Uses Google Gemini API for Text-to-Speech with Vietnamese female voice (Southern)
// Reference: https://ai.google.dev/gemini-api/docs/speech-generation

interface GeminiTtsOptions {
  voice?: string; // Voice name (e.g., "Kore" for Vietnamese female)
}

interface GeminiTtsResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        inlineData?: {
          mimeType: string;
          data: string; // Base64 encoded PCM audio
        };
        text?: string;
      }>;
    };
  }>;
  error?: {
    code: number;
    message: string;
  };
}

class GeminiTtsService {
  private apiKey: string | null = null;
  // Gemini API endpoint for generateContent with audio response
  private readonly ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent';

  constructor() {
    // Get API key from localStorage (same as Gemini chat API)
    try {
      this.apiKey = localStorage.getItem('gemini_personal_api_key') || '';
    } catch {
      this.apiKey = '';
    }
  }

  // Check if configured
  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 0);
  }

  // Get API key
  getApiKey(): string | null {
    return this.apiKey;
  }

  // Convert text to speech
  async speak(text: string, options: GeminiTtsOptions = {}): Promise<string> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY_NOT_CONFIGURED');
    }

    const {
      voice = 'Kore', // Vietnamese female voice (Southern) - prebuilt voice name
    } = options;

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
      throw new Error('Empty text after cleaning');
    }

    // Limit text length (Gemini TTS may have limits)
    const maxLength = 5000;
    if (cleanText.length > maxLength) {
      throw new Error(`Text exceeds ${maxLength} characters limit. Please split into smaller parts.`);
    }

    try {
      console.log('Gemini TTS: Making request to:', this.ENDPOINT);
      console.log('Gemini TTS: Request params:', {
        voice,
        textLength: cleanText.length,
      });

      // Gemini 2.5 Flash Preview TTS API format
      // Reference: https://ai.google.dev/gemini-api/docs/speech-generation
      const requestBody = {
        contents: [{
          parts: [{
            text: cleanText,
          }],
        }],
        generationConfig: {
          responseModalities: ["AUDIO"], // Request audio response
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voice, // "Kore" for Vietnamese female Southern
              },
            },
          },
        },
      };

      console.log('Gemini TTS Request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${this.ENDPOINT}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Gemini TTS: Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini TTS: API error response:', errorText);
        
        // Provide helpful error messages
        if (response.status === 403) {
          throw new Error('API key không có quyền truy cập Gemini TTS hoặc model chưa available. Model gemini-2.5-flash-preview-tts có thể cần quyền truy cập đặc biệt hoặc chưa được kích hoạt cho tài khoản của bạn.');
        } else if (response.status === 401) {
          throw new Error('API key không hợp lệ. Vui lòng kiểm tra lại Gemini API key.');
        } else if (response.status === 404) {
          throw new Error('Model gemini-2.5-flash-preview-tts không tìm thấy. Model này có thể chưa available hoặc tên model không đúng.');
        }
        
        throw new Error(`Gemini TTS API error: ${response.status} - ${errorText}`);
      }

      const data: GeminiTtsResponse = await response.json();

      console.log('Gemini TTS Response:', {
        hasCandidates: !!data.candidates,
        hasParts: !!data.candidates?.[0]?.content?.parts,
        hasInlineData: !!data.candidates?.[0]?.content?.parts?.[0]?.inlineData,
        error: data.error
      });

      if (data.error) {
        throw new Error(data.error.message || `Gemini TTS API error: ${data.error.code}`);
      }

      // Extract audio data from response
      const audioPart = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      
      if (!audioPart || !audioPart.data) {
        throw new Error('Gemini TTS API did not return audio data');
      }

      // Audio is PCM format, convert to WAV data URL
      // PCM data from Gemini TTS: 24000 Hz, mono, 16-bit
      const base64Data = audioPart.data;
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const pcmData = bytes;
      
      // Create WAV file from PCM data
      const wavDataUrl = this.convertPcmToWav(pcmData, 24000, 1, 16);
      
      return wavDataUrl;
    } catch (error) {
      console.error('Gemini TTS Error:', error);
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Không thể kết nối đến Gemini TTS API. Vui lòng kiểm tra kết nối mạng.');
      }
      
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error('Unknown Gemini TTS error');
    }
  }

  // Convert PCM data to WAV format
  private convertPcmToWav(pcmData: Uint8Array, sampleRate: number, channels: number, bitsPerSample: number): string {
    const length = pcmData.length;
    const buffer = new ArrayBuffer(44 + length);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // audio format (1 = PCM)
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channels * bitsPerSample / 8, true); // byte rate
    view.setUint16(32, channels * bitsPerSample / 8, true); // block align
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, length, true);

    // Copy PCM data
    const wavArray = new Uint8Array(buffer);
    wavArray.set(pcmData, 44);

    // Convert to base64 data URL (handle large arrays)
    let binary = '';
    const chunkSize = 0x8000; // 32KB chunks
    for (let i = 0; i < wavArray.length; i += chunkSize) {
      const chunk = wavArray.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    const base64 = btoa(binary);
    return `data:audio/wav;base64,${base64}`;
  }

  // Available Vietnamese voices for Gemini TTS
  getAvailableVoices(): Array<{ value: string; label: string; gender: string; region: string }> {
    return [
      { value: 'Kore', label: 'Kore (Nữ miền Nam)', gender: 'female', region: 'southern' },
      // Add more voices as they become available in Gemini TTS
    ];
  }
}

export const geminiTtsService = new GeminiTtsService();

