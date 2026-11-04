import { http } from '@/utils/http';
import type { DocumentType, PageResult, SourceReference } from '@/api/documents';

export interface SearchHit {
  documentId: string;
  ingestionId: string;
  fileName: string;
  documentType: DocumentType;
  chunkIndex: number;
  content: string;
  startOffset: number;
  endOffset: number;
  sourceReferences: SourceReference[];
  score: number;
}

export async function searchPassages(query: string, page = 0, size = 20, documentId?: string) {
  const { data } = await http.get<PageResult<SearchHit>>('/api/search', {
    params: { query: query.trim(), page, size, ...(documentId?.trim() ? { documentId: documentId.trim() } : {}) },
  });
  return data;
}
