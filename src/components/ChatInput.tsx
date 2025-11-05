import React, { useState, useRef, useEffect, useImperativeHandle } from 'react';
import { Send, Loader2, Mic, MicOff, Image as ImageIcon, X, FileText, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { useToast } from '@/hooks/use-toast';
import { extractTextFromDocument, formatDocumentText, type ExtractedDocument } from '@/lib/documentExtractor';

const MAX_IMAGES = 4;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB per image
const MAX_DOCUMENTS = 2;
const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024; // 20MB per document

import type { ChatMessageDocument } from '@/hooks/useChatSessions';

export interface ChatInputRef {
  addFiles: (files: File[]) => Promise<void>;
}

interface ChatInputProps {
  onSendMessage: (message: string, images?: string[], documentText?: string, documents?: ChatMessageDocument[]) => void;
  isLoading: boolean;
  disabled?: boolean;
}

// Forward ref to expose addFiles method
const ChatInputComponent = React.forwardRef<ChatInputRef, ChatInputProps>(({ onSendMessage, isLoading, disabled = false }, ref) => {
  const [message, setMessage] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [documents, setDocuments] = useState<ExtractedDocument[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const finalTextRef = useRef('');
  
  const stt = useSpeechToText({
    onTranscript: (text, isFinal) => {
      // Update message with both interim and final text
      // For continuous mode, we want to show interim results and append final ones
      if (isFinal) {
        finalTextRef.current = finalTextRef.current + text;
        setMessage(finalTextRef.current);
      } else {
        // Show final text + current interim text
        setMessage(finalTextRef.current + (finalTextRef.current ? ' ' : '') + text);
      }
    },
    preferredLanguages: ['vi-VN', 'en-US']
  });
  
  // Reset final text when stopping recording
  useEffect(() => {
    if (!stt.isRecording) {
      finalTextRef.current = '';
    }
  }, [stt.isRecording]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (images.length + files.length > MAX_IMAGES) {
      toast({
        title: 'Quá nhiều ảnh',
        description: `Bạn chỉ có thể upload tối đa ${MAX_IMAGES} ảnh.`,
        variant: 'destructive',
      });
      return;
    }

    const validFiles: File[] = [];
    
    // Validate files first
    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Định dạng không hợp lệ',
          description: `${file.name} không phải là ảnh.`,
          variant: 'destructive',
        });
        continue;
      }

      // Validate file size
      if (file.size > MAX_IMAGE_SIZE) {
        toast({
          title: 'Ảnh quá lớn',
          description: `${file.name} vượt quá 10MB.`,
          variant: 'destructive',
        });
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // Convert all valid files to data URLs
    const readPromises = validFiles.map(file => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          resolve(dataUrl);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    try {
      const dataUrls = await Promise.all(readPromises);
      setImages(prev => [...prev, ...dataUrls]);
      setImageFiles(prev => [...prev, ...validFiles]);
    } catch (error) {
      toast({
        title: 'Lỗi đọc ảnh',
        description: 'Không thể đọc một số ảnh. Vui lòng thử lại.',
        variant: 'destructive',
      });
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDocumentSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (documents.length + files.length > MAX_DOCUMENTS) {
      toast({
        title: 'Quá nhiều tài liệu',
        description: `Bạn chỉ có thể upload tối đa ${MAX_DOCUMENTS} tài liệu.`,
        variant: 'destructive',
      });
      return;
    }

    const validFiles: File[] = [];
    
    // Validate files
    for (const file of files) {
      const fileName = file.name.toLowerCase();
      const isPDF = fileName.endsWith('.pdf');
      const isWord = fileName.endsWith('.docx') || fileName.endsWith('.doc');
      
      if (!isPDF && !isWord) {
        toast({
          title: 'Định dạng không hợp lệ',
          description: `${file.name} không phải là PDF hoặc Word. Chỉ hỗ trợ .pdf, .doc, .docx`,
          variant: 'destructive',
        });
        continue;
      }

      if (file.size > MAX_DOCUMENT_SIZE) {
        toast({
          title: 'Tài liệu quá lớn',
          description: `${file.name} vượt quá ${MAX_DOCUMENT_SIZE / 1024 / 1024}MB.`,
          variant: 'destructive',
        });
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    setIsExtracting(true);

    try {
      // Extract text from all documents
      const extractPromises = validFiles.map(file => extractTextFromDocument(file));
      const extractedDocs = await Promise.all(extractPromises);
      
      setDocuments(prev => [...prev, ...extractedDocs]);
      
      // Check if any document was truncated
      const truncatedCount = extractedDocs.filter(doc => doc.isTruncated).length;
      const cacheHitCount = extractedDocs.length; // Could be optimized to track actual cache hits
      
      let description = `Đã trích xuất text từ ${extractedDocs.length} tài liệu. Text sẽ được gửi kèm tin nhắn.`;
      if (truncatedCount > 0) {
        description += `\n⚠️ ${truncatedCount} tài liệu đã được cắt ngắn để phù hợp với giới hạn API.`;
      }
      
      toast({
        title: 'Đã đọc tài liệu',
        description,
        duration: truncatedCount > 0 ? 5000 : 3000,
      });
    } catch (error) {
      toast({
        title: 'Lỗi đọc tài liệu',
        description: error instanceof Error ? error.message : 'Không thể đọc tài liệu. Vui lòng thử lại.',
        variant: 'destructive',
      });
    } finally {
      setIsExtracting(false);
      // Reset input
      if (documentInputRef.current) {
        documentInputRef.current.value = '';
      }
    }
  };

  const handleRemoveDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hasContent = message.trim() || images.length > 0 || documents.length > 0;
    
    if (hasContent && !isLoading && !disabled) {
      // Stop recording if it's active when sending message
      if (stt.isRecording) {
        stt.stop();
      }
      
      // Combine document texts
      const documentText = documents.length > 0
        ? documents.map(doc => formatDocumentText(doc)).join('\n\n---\n\n')
        : undefined;
      
      // Extract document metadata (without text content)
      const documentMetadata: ChatMessageDocument[] = documents.map(doc => ({
        fileName: doc.fileName,
        fileType: doc.fileType,
        pageCount: doc.pageCount,
        size: doc.size,
      }));
      
      onSendMessage(
        message.trim() || (images.length > 0 ? 'Xem ảnh' : '') || (documents.length > 0 ? 'Phân tích tài liệu' : ''),
        images.length > 0 ? images : undefined,
        documentText,
        documentMetadata.length > 0 ? documentMetadata : undefined
      );
      setMessage('');
      setImages([]);
      setImageFiles([]);
      setDocuments([]);
      finalTextRef.current = ''; // Reset final text reference
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Drag & Drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent bubbling to chat area
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the drop zone
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Expose addFiles method via ref
  useImperativeHandle(ref, () => ({
    addFiles: async (files: File[]) => {
      if (disabled || isLoading) return;
      await processFiles(files);
    }
  }));

  // Shared function to process files (used by both drag & drop and ref method)
  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;

    // Separate files into images and documents
    const imageFiles: File[] = [];
    const documentFiles: File[] = [];

    for (const file of files) {
      const fileName = file.name.toLowerCase();
      if (file.type.startsWith('image/')) {
        imageFiles.push(file);
      } else if (fileName.endsWith('.pdf') || fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
        documentFiles.push(file);
      }
    }

    // Process images
    if (imageFiles.length > 0) {
      if (images.length + imageFiles.length > MAX_IMAGES) {
        toast({
          title: 'Quá nhiều ảnh',
          description: `Bạn chỉ có thể upload tối đa ${MAX_IMAGES} ảnh.`,
          variant: 'destructive',
        });
        // Process only what we can
        imageFiles.splice(MAX_IMAGES - images.length);
      }

      const validImageFiles: File[] = [];
      for (const file of imageFiles) {
        if (file.size > MAX_IMAGE_SIZE) {
          toast({
            title: 'Ảnh quá lớn',
            description: `${file.name} vượt quá 10MB.`,
            variant: 'destructive',
          });
          continue;
        }
        validImageFiles.push(file);
      }

      if (validImageFiles.length > 0) {
        const readPromises = validImageFiles.map(file => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const dataUrl = e.target?.result as string;
              resolve(dataUrl);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        });

        try {
          const dataUrls = await Promise.all(readPromises);
          setImages(prev => [...prev, ...dataUrls]);
          setImageFiles(prev => [...prev, ...validImageFiles]);
        } catch (error) {
          toast({
            title: 'Lỗi đọc ảnh',
            description: 'Không thể đọc một số ảnh. Vui lòng thử lại.',
            variant: 'destructive',
          });
        }
      }
    }

    // Process documents
    if (documentFiles.length > 0) {
      if (documents.length + documentFiles.length > MAX_DOCUMENTS) {
        toast({
          title: 'Quá nhiều tài liệu',
          description: `Bạn chỉ có thể upload tối đa ${MAX_DOCUMENTS} tài liệu.`,
          variant: 'destructive',
        });
        documentFiles.splice(MAX_DOCUMENTS - documents.length);
      }

      const validDocumentFiles: File[] = [];
      for (const file of documentFiles) {
        if (file.size > MAX_DOCUMENT_SIZE) {
          toast({
            title: 'Tài liệu quá lớn',
            description: `${file.name} vượt quá ${MAX_DOCUMENT_SIZE / 1024 / 1024}MB.`,
            variant: 'destructive',
          });
          continue;
        }
        validDocumentFiles.push(file);
      }

      if (validDocumentFiles.length > 0) {
        setIsExtracting(true);
        try {
          const extractPromises = validDocumentFiles.map(file => extractTextFromDocument(file));
          const extractedDocs = await Promise.all(extractPromises);
          
          setDocuments(prev => [...prev, ...extractedDocs]);
          
          const truncatedCount = extractedDocs.filter(doc => doc.isTruncated).length;
          let description = `Đã trích xuất text từ ${extractedDocs.length} tài liệu.`;
          if (truncatedCount > 0) {
            description += `\n⚠️ ${truncatedCount} tài liệu đã được cắt ngắn để phù hợp với giới hạn API.`;
          }
          
          toast({
            title: 'Đã đọc tài liệu',
            description,
            duration: truncatedCount > 0 ? 5000 : 3000,
          });
        } catch (error) {
          toast({
            title: 'Lỗi đọc tài liệu',
            description: error instanceof Error ? error.message : 'Không thể đọc tài liệu. Vui lòng thử lại.',
            variant: 'destructive',
          });
        } finally {
          setIsExtracting(false);
        }
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent bubbling to chat area
    setIsDragging(false);

    if (disabled || isLoading) return;

    const files = Array.from(e.dataTransfer.files);
    await processFiles(files);
  };

  return (
    <div 
      ref={dropZoneRef}
      className={`border-t border-border bg-background p-4 transition-all ${
        isDragging ? 'bg-primary/5 border-primary border-dashed border-2' : ''
      }`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 bg-primary/10 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-card border-2 border-primary border-dashed rounded-lg p-8 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-primary" />
            <p className="text-lg font-semibold">Thả file vào đây để upload</p>
            <p className="text-sm text-muted-foreground mt-2">Hỗ trợ: Ảnh (JPG, PNG, ...) và Tài liệu (PDF, Word)</p>
          </div>
        </div>
      )}
      {/* Image Preview */}
      {images.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {images.map((image, index) => (
            <div key={index} className="relative group">
              <img
                src={image}
                alt={`Preview ${index + 1}`}
                className="w-20 h-20 object-cover rounded-lg border border-border"
              />
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Xóa ảnh"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Document Preview */}
      {documents.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {documents.map((doc, index) => (
            <div key={index} className="relative group flex items-center gap-2 px-3 py-2 bg-muted rounded-lg border border-border">
              <FileText className={`w-4 h-4 flex-shrink-0 ${doc.isTruncated ? 'text-yellow-500' : 'text-primary'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{doc.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.pageCount ? `${doc.pageCount} trang` : ''} • {(doc.size / 1024 / 1024).toFixed(2)} MB
                  {doc.isTruncated && (
                    <span className="text-yellow-600 dark:text-yellow-400 ml-1">⚠️ Đã cắt ngắn</span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveDocument(index)}
                className="w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                aria-label="Xóa tài liệu"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Loading indicator for document extraction */}
      {isExtracting && (
        <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader className="w-4 h-4 animate-spin" />
          <span>Đang đọc tài liệu...</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-3">
        <div className="flex-1">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? "Bắt đầu cuộc trò chuyện mới..." : "Nhập tin nhắn của bạn... (Shift+Enter để xuống dòng)"}
            disabled={disabled || isLoading}
            className="min-h-[44px] max-h-[120px] resize-none py-3 px-4 text-sm border-border focus:ring-2 focus:ring-primary/20 focus:border-primary"
            rows={1}
          />
        </div>
        
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          multiple
          onChange={handleImageSelect}
          className="hidden"
          disabled={disabled || isLoading || images.length >= MAX_IMAGES}
        />
        
        <input
          type="file"
          ref={documentInputRef}
          accept=".pdf,.doc,.docx"
          multiple
          onChange={handleDocumentSelect}
          className="hidden"
          disabled={disabled || isLoading || isExtracting || documents.length >= MAX_DOCUMENTS}
        />
        
        <Button
          type="button"
          variant="outline"
          className="h-[44px] px-3 flex-shrink-0"
          disabled={disabled || isLoading || images.length >= MAX_IMAGES}
          onClick={() => fileInputRef.current?.click()}
          title={images.length >= MAX_IMAGES ? `Tối đa ${MAX_IMAGES} ảnh` : 'Upload ảnh'}
        >
          <ImageIcon className="w-5 h-5" />
          {images.length > 0 && (
            <span className="ml-1 text-xs">{images.length}/{MAX_IMAGES}</span>
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="h-[44px] px-3 flex-shrink-0"
          disabled={disabled || isLoading || isExtracting || documents.length >= MAX_DOCUMENTS}
          onClick={() => documentInputRef.current?.click()}
          title={documents.length >= MAX_DOCUMENTS ? `Tối đa ${MAX_DOCUMENTS} tài liệu` : 'Upload PDF/Word (tối ưu quota)'}
        >
          <FileText className="w-5 h-5" />
          {documents.length > 0 && (
            <span className="ml-1 text-xs">{documents.length}/{MAX_DOCUMENTS}</span>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-[44px] px-3 flex-shrink-0"
          disabled={disabled || isLoading || !stt.isSupported}
          onClick={() => {
            if (!stt.isSupported) {
              toast({ title: 'Không hỗ trợ', description: 'Trình duyệt không hỗ trợ ghi âm (Web Speech)', variant: 'destructive' });
              return;
            }
            if (stt.isRecording) {
              stt.stop();
              finalTextRef.current = ''; // Reset when manually stopping
            } else {
              finalTextRef.current = ''; // Reset when starting new recording
              stt.start();
            }
          }}
          aria-label={stt.isRecording ? 'Dừng ghi' : 'Bắt đầu ghi'}
          title={stt.isSupported ? (stt.isRecording ? 'Dừng ghi' : 'Nhấn để nói') : 'Trình duyệt không hỗ trợ'}
        >
          {stt.isRecording ? <MicOff className="w-5 h-5 text-red-500" /> : <Mic className="w-5 h-5" />}
        </Button>
        
        <Button
          type="submit"
          disabled={(!message.trim() && images.length === 0 && documents.length === 0) || isLoading || disabled}
          variant="primary"
          className="h-[44px] px-4 flex-shrink-0"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      </form>
      
      <div className="flex items-center justify-center mt-2">
        <p className="text-xs text-muted-foreground text-center">
          Được hỗ trợ bởi <span className="gradient-text font-medium">DESIGN24</span> • 
          Trợ lý AI Đa lĩnh vực
        </p>
      </div>
    </div>
  );
});

ChatInputComponent.displayName = 'ChatInput';
export { ChatInputComponent as ChatInput };