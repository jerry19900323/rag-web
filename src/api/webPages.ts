import { http } from '@/utils/http';
import type { DocumentPreview, IndexDocumentResult } from '@/api/documents';

export interface WebPageImportParams {
  url: string;
  followPagination: boolean;
  maxPages: number;
  documentId: string | null;
  maxCharacters: number;
  overlapCharacters: number;
}

export interface ImportedWebPage {
  pageNumber: number;
  url: string;
  title: string;
}

export interface WebPagePreviewResult {
  requestedUrl: string;
  paginationFollowed: boolean;
  pages: ImportedWebPage[];
  document: DocumentPreview;
}

export interface WebPageIndexResult {
  requestedUrl: string;
  paginationFollowed: boolean;
  pages: ImportedWebPage[];
  document: IndexDocumentResult;
}

export async function previewWebPages(params: WebPageImportParams) {
  const { data } = await http.post<WebPagePreviewResult>('/api/web-pages/preview', params);
  return data;
}

export async function indexWebPages(params: WebPageImportParams) {
  const { data } = await http.post<WebPageIndexResult>('/api/web-pages/index', params);
  return data;
}
