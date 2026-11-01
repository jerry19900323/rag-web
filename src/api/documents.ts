import { http } from '@/utils/http';

export type DocumentType = 'TEXT' | 'MARKDOWN' | 'PDF' | 'DOCX' | 'PPTX' | 'XLSX' | 'HTML';
export type ProcessingStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface PageResult<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface SourceReference {
  pageNumber: number | null;
  slideNumber: number | null;
  sheetName: string | null;
  sectionTitle: string | null;
  elementType: string;
  sourceUrl?: string | null;
  sourceTitle?: string | null;
  webPageNumber?: number | null;
}

export interface DocumentChunk {
  index: number;
  startOffset: number;
  endOffset: number;
  characterCount: number;
  content: string;
  sourceReferences: SourceReference[];
}

export interface DocumentPreview {
  fileName: string;
  documentType: DocumentType;
  characterCount: number;
  chunkCount: number;
  maxCharacters: number;
  overlapCharacters: number;
  chunks: DocumentChunk[];
}

export interface IndexDocumentResult {
  documentId: string;
  ingestionId: string;
  fileName: string;
  documentType: DocumentType;
  documentHash: string;
  characterCount: number;
  chunkCount: number;
  indexedAt: string;
}

export interface DocumentItem {
  documentId: string;
  fileName: string;
  documentType: DocumentType;
  documentHash: string;
  characterCount: number;
  chunkCount: number;
  currentIngestionId: string;
  status: ProcessingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface IngestionItem {
  ingestionId: string;
  documentId: string;
  documentHash: string;
  status: ProcessingStatus;
  characterCount: number;
  chunkCount: number;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

export interface ChunkSettings {
  maxCharacters: number;
  overlapCharacters: number;
}

function createUploadForm(file: File, settings: ChunkSettings, documentId?: string) {
  const form = new FormData();
  form.append('file', file);
  form.append('maxCharacters', String(settings.maxCharacters));
  form.append('overlapCharacters', String(settings.overlapCharacters));
  if (documentId?.trim()) form.append('documentId', documentId.trim());
  return form;
}

export async function previewDocument(file: File, settings: ChunkSettings) {
  const { data } = await http.post<DocumentPreview>('/api/documents/preview', createUploadForm(file, settings));
  return data;
}

export async function indexDocument(file: File, settings: ChunkSettings, documentId?: string) {
  const { data } = await http.post<IndexDocumentResult>('/api/documents/index', createUploadForm(file, settings, documentId));
  return data;
}

export async function listDocuments(page = 0, size = 20, document?: string) {
  const { data } = await http.get<PageResult<DocumentItem>>('/api/documents', {
    params: { page, size, ...(document?.trim() ? { document: document.trim() } : {}) },
  });
  return data;
}

export async function getDocument(documentId: string) {
  const { data } = await http.get<DocumentItem>(`/api/documents/${encodeURIComponent(documentId)}`);
  return data;
}

export async function listDocumentIngestions(documentId: string, page = 0, size = 20) {
  const { data } = await http.get<PageResult<IngestionItem>>(`/api/documents/${encodeURIComponent(documentId)}/ingestions`, {
    params: { page, size },
  });
  return data;
}
