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
    
    return {
      fileName: file.name,
      fileType: 'pdf',
      text: fullText.trim(),
      pageCount,
      size: file.size,
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
    
    return {
      fileName: file.name,
      fileType: file.name.endsWith('.docx') ? 'docx' : 'doc',
      text: result.value.trim(),
      size: file.size,
    };
  } catch (error) {
    throw new Error(`Không thể đọc file Word: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
  }
}

/**
 * Extract text from document file (PDF or Word)
 */
export async function extractTextFromDocument(file: File): Promise<ExtractedDocument> {
  const fileName = file.name.toLowerCase();
  
  if (fileName.endsWith('.pdf')) {
    return extractTextFromPDF(file);
  } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
    return extractTextFromWord(file);
  } else {
    throw new Error(`Định dạng file không được hỗ trợ: ${file.name}. Chỉ hỗ trợ PDF và Word (.doc, .docx)`);
  }
}

/**
 * Format extracted document text for sending to AI
 */
export function formatDocumentText(doc: ExtractedDocument): string {
  const fileInfo = `📄 **Tài liệu: ${doc.fileName}**${doc.pageCount ? ` (${doc.pageCount} trang)` : ''}\n`;
  const sizeInfo = `📊 **Kích thước: ${(doc.size / 1024 / 1024).toFixed(2)} MB**\n\n`;
  const content = `**Nội dung tài liệu:**\n\n${doc.text}`;
  
  return fileInfo + sizeInfo + content;
}

