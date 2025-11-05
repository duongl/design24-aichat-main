// Document text extractor - extracts text from PDF and Word files
// This is optimized for free tier quota by sending text instead of uploading files

import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  // Use CDN fallback for PDF.js worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

export interface ExtractedDocument {
  fileName: string;
  fileType: 'pdf' | 'docx' | 'doc';
  text: string;
  pageCount?: number;
  size: number;
  isTruncated?: boolean; // Indicates if text was truncated
  originalLength?: number; // Original text length before truncation
}

// Maximum text length to avoid exceeding API token limits
// Gemini API free tier has limits, so we cap at 80k characters per document
const MAX_TEXT_LENGTH = 80000;

/**
 * Truncate text if too long, keeping the beginning
 */
function truncateText(text: string, maxLength: number): { text: string; isTruncated: boolean; originalLength: number } {
  const originalLength = text.length;
  if (originalLength <= maxLength) {
    return { text, isTruncated: false, originalLength };
  }
  
  // Keep the beginning part (80% of max) and add truncation notice
  const keepLength = Math.floor(maxLength * 0.8);
  const truncated = text.substring(0, keepLength);
  const notice = `\n\n[... Nội dung đã được cắt ngắn để phù hợp với giới hạn API. Tài liệu gốc có ${originalLength.toLocaleString('vi-VN')} ký tự, đã giữ lại ${keepLength.toLocaleString('vi-VN')} ký tự đầu tiên ...]`;
  
  return {
    text: truncated + notice,
    isTruncated: true,
    originalLength,
  };
}

/**
 * Extract text from PDF file
 */
export async function extractTextFromPDF(file: File): Promise<ExtractedDocument> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pageCount = pdf.numPages;
    
    let fullText = '';
    
    // Extract text from all pages
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Combine text items from the page
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += `\n\n--- Trang ${pageNum}/${pageCount} ---\n${pageText}`;
    }
    
    const trimmedText = fullText.trim();
    const { text, isTruncated, originalLength } = truncateText(trimmedText, MAX_TEXT_LENGTH);
    
    return {
      fileName: file.name,
      fileType: 'pdf',
      text,
      pageCount,
      size: file.size,
      isTruncated,
      originalLength,
    };
  } catch (error) {
    throw new Error(`Không thể đọc file PDF: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
  }
}

/**
 * Extract text from Word file (.docx)
 */
export async function extractTextFromWord(file: File): Promise<ExtractedDocument> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    
    const trimmedText = result.value.trim();
    const { text, isTruncated, originalLength } = truncateText(trimmedText, MAX_TEXT_LENGTH);
    
    return {
      fileName: file.name,
      fileType: file.name.endsWith('.docx') ? 'docx' : 'doc',
      text,
      size: file.size,
      isTruncated,
      originalLength,
    };
  } catch (error) {
    throw new Error(`Không thể đọc file Word: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
  }
}


/**
 * Format extracted document text for sending to AI
 */
export function formatDocumentText(doc: ExtractedDocument): string {
  const fileInfo = `📄 **Tài liệu: ${doc.fileName}**${doc.pageCount ? ` (${doc.pageCount} trang)` : ''}\n`;
  const sizeInfo = `📊 **Kích thước: ${(doc.size / 1024 / 1024).toFixed(2)} MB**`;
  const truncationNotice = doc.isTruncated 
    ? `\n⚠️ **Lưu ý:** Nội dung đã được cắt ngắn (từ ${doc.originalLength?.toLocaleString('vi-VN')} ký tự xuống còn ~${doc.text.length.toLocaleString('vi-VN')} ký tự) để phù hợp với giới hạn API.`
    : '';
  const content = `\n\n**Nội dung tài liệu:**\n\n${doc.text}`;
  
  return fileInfo + sizeInfo + truncationNotice + content;
}

// Cache for extracted documents (key: file name + size + last modified)
interface DocumentCacheEntry {
  text: string;
  pageCount?: number;
  isTruncated?: boolean;
  originalLength?: number;
  timestamp: number;
}

const documentCache = new Map<string, DocumentCacheEntry>();
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate cache key from file
 */
function getCacheKey(file: File): string {
  return `${file.name}_${file.size}_${file.lastModified}`;
}

/**
 * Get cached document if available
 */
export function getCachedDocument(file: File): ExtractedDocument | null {
  const key = getCacheKey(file);
  const cached = documentCache.get(key);
  
  if (!cached) return null;
  
  // Check if cache is expired
  if (Date.now() - cached.timestamp > CACHE_EXPIRY) {
    documentCache.delete(key);
    return null;
  }
  
  return {
    fileName: file.name,
    fileType: file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : (file.name.toLowerCase().endsWith('.docx') ? 'docx' : 'doc'),
    text: cached.text,
    pageCount: cached.pageCount,
    size: file.size,
    isTruncated: cached.isTruncated,
    originalLength: cached.originalLength,
  };
}

/**
 * Cache extracted document
 */
export function cacheDocument(file: File, doc: ExtractedDocument): void {
  const key = getCacheKey(file);
  documentCache.set(key, {
    text: doc.text,
    pageCount: doc.pageCount,
    isTruncated: doc.isTruncated,
    originalLength: doc.originalLength,
    timestamp: Date.now(),
  });
  
  // Limit cache size (keep only last 50 entries)
  if (documentCache.size > 50) {
    const firstKey = documentCache.keys().next().value;
    documentCache.delete(firstKey);
  }
}

/**
 * Extract text from document file (PDF or Word) with caching
 */
export async function extractTextFromDocument(file: File, useCache: boolean = true): Promise<ExtractedDocument> {
  // Check cache first
  if (useCache) {
    const cached = getCachedDocument(file);
    if (cached) {
      return cached;
    }
  }
  
  const fileName = file.name.toLowerCase();
  let doc: ExtractedDocument;
  
  if (fileName.endsWith('.pdf')) {
    doc = await extractTextFromPDF(file);
  } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
    doc = await extractTextFromWord(file);
  } else {
    throw new Error(`Định dạng file không được hỗ trợ: ${file.name}. Chỉ hỗ trợ PDF và Word (.doc, .docx)`);
  }
  
  // Cache the result
  if (useCache) {
    cacheDocument(file, doc);
  }
  
  return doc;
}

