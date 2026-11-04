<template>
  <div class="page-heading"><div><h1>Search passages</h1><p>Find matching text in indexed documents.</p></div></div>
  <a-card :bordered="false" class="query-card">
    <a-form layout="vertical">
      <a-form-item label="Keywords or phrase" :validate-status="validationError ? 'error' : undefined" :help="validationError">
        <a-input-search v-model:value="queryText" placeholder="Search document content" :maxlength="500" :loading="loading" enter-button="Search" @search="submitSearch" />
      </a-form-item>
    </a-form>
    <a-space v-if="documentId" wrap><a-tag color="blue">Document: {{ documentId }}</a-tag><a-button size="small" @click="clearDocumentFilter">Search all documents</a-button></a-space>
  </a-card>
  <a-alert v-if="errorMessage" type="error" :message="errorMessage" show-icon class="page-alert" />
  <a-card :bordered="false" :loading="loading">
    <template #title>{{ searched ? `${results.totalElements} matching passages` : 'Results' }}</template>
    <a-empty v-if="!searched" description="Enter a keyword or phrase to search indexed passages." />
    <a-empty v-else-if="!results.items.length && !errorMessage" description="No matching passages found." />
    <template v-else>
      <div v-for="hit in results.items" :key="`${hit.ingestionId}:${hit.chunkIndex}`" class="search-hit">
        <div class="search-hit-heading"><a-button type="link" class="table-link" @click="$router.push({ name: 'document-detail', params: { documentId: hit.documentId } })">{{ hit.fileName }}</a-button><a-tag>{{ hit.documentType }}</a-tag><span>Chunk {{ hit.chunkIndex + 1 }}</span></div>
        <p class="search-hit-content">{{ hit.content }}</p>
        <div v-if="hit.sourceReferences?.length" class="search-locations">
          <span v-for="(source, index) in hit.sourceReferences" :key="index" class="search-location">
            <template v-if="source.pageNumber != null">Page {{ source.pageNumber }} </template>
            <template v-if="source.slideNumber != null">Slide {{ source.slideNumber }} </template>
            <template v-if="source.sheetName">Sheet {{ source.sheetName }} </template>
            <template v-if="source.sectionTitle">{{ source.sectionTitle }} </template>
            <template v-if="source.webPageNumber != null">Web page {{ source.webPageNumber }} </template>
            <a v-if="safeSourceUrl(source.sourceUrl)" :href="safeSourceUrl(source.sourceUrl)" target="_blank" rel="noopener noreferrer">{{ source.sourceTitle || source.sourceUrl }}</a>
            <template v-else-if="source.sourceUrl">{{ source.sourceTitle || source.sourceUrl }}</template>
            <template v-else-if="source.sourceTitle">{{ source.sourceTitle }}</template>
            <template v-if="!hasLocation(source)">{{ source.elementType }}</template>
          </span>
        </div>
      </div>
      <a-pagination v-if="results.totalPages > 1" :current="results.page + 1" :page-size="results.size" :total="Math.min(results.totalElements, 10000)" :show-size-changer="false" class="search-pagination" @change="changePage" />
    </template>
  </a-card>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { PageResult, SourceReference } from '@/api/documents';
import { searchPassages, type SearchHit } from '@/api/search';
import { getApiErrorMessage } from '@/utils/http';

const route = useRoute();
const router = useRouter();
const queryText = ref('');
const documentId = ref('');
const loading = ref(false);
const searched = ref(false);
const errorMessage = ref('');
const validationError = ref('');
const results = reactive<PageResult<SearchHit>>({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
let requestId = 0;

function hasLocation(source: SourceReference) {
  return source.pageNumber != null || source.slideNumber != null || !!source.sheetName || !!source.sectionTitle || source.webPageNumber != null || !!source.sourceUrl || !!source.sourceTitle;
}
function safeSourceUrl(value?: string | null) {
  if (!value) return undefined;
  try { return /^https?:$/.test(new URL(value).protocol) ? value : undefined; }
  catch { return undefined; }
}
async function runSearch(page = 0) {
  const query = queryText.value.trim();
  validationError.value = !query ? 'Enter a search term.' : query.length > 500 ? 'Use at most 500 characters.' : '';
  if (validationError.value) return;
  const currentRequest = ++requestId;
  loading.value = true;
  errorMessage.value = '';
  try {
    const data = await searchPassages(query, page, results.size, documentId.value);
    if (currentRequest === requestId) { Object.assign(results, data); searched.value = true; }
  } catch (error) {
    if (currentRequest === requestId) { errorMessage.value = getApiErrorMessage(error, 'Search could not be completed.'); searched.value = true; Object.assign(results, { items: [], page: 0, totalElements: 0, totalPages: 0 }); }
  } finally { if (currentRequest === requestId) loading.value = false; }
}
function submitSearch() { void runSearch(0); }
function changePage(page: number) { if (page * results.size <= 10000) void runSearch(page - 1); }
function clearDocumentFilter() { void router.push({ name: 'search', query: queryText.value.trim() ? { query: queryText.value.trim() } : {} }); }
watch(() => [route.query.query, route.query.documentId], () => {
  queryText.value = typeof route.query.query === 'string' ? route.query.query : '';
  documentId.value = typeof route.query.documentId === 'string' ? route.query.documentId : '';
  results.items = []; searched.value = false; errorMessage.value = ''; validationError.value = '';
  if (queryText.value.trim()) void runSearch(0);
}, { immediate: true });
</script>
