<template>
  <div class="page-heading">
    <div><h1>Import web pages</h1><p>Fetch public static HTML, inspect the generated chunks, and store the content in the search index.</p></div>
  </div>
  <a-alert v-if="errorMessage" :message="errorMessage" type="error" show-icon closable class="page-alert" @close="errorMessage = ''" />

  <a-row :gutter="[20, 20]">
    <a-col :xs="24" :xl="8">
      <a-card title="Import settings" :bordered="false">
        <a-form layout="vertical" :model="form">
          <a-form-item label="Public URL" required extra="Only public HTTP and HTTPS destinations returning HTML are supported.">
            <a-input v-model:value="form.url" placeholder="https://example.com/articles" />
          </a-form-item>
          <a-form-item label="Document ID" extra="Optional. Reusing an ID replaces its current indexed generation.">
            <a-input v-model:value="documentId" maxlength="200" placeholder="Generated automatically when empty" />
          </a-form-item>
          <a-form-item>
            <a-switch v-model:checked="form.followPagination" />
            <span class="switch-label">Follow same-origin next-page links</span>
          </a-form-item>
          <a-form-item v-if="form.followPagination" label="Maximum pages">
            <a-input-number v-model:value="form.maxPages" :min="1" :max="50" style="width: 100%" />
          </a-form-item>
          <a-row :gutter="12">
            <a-col :span="12"><a-form-item label="Maximum characters"><a-input-number v-model:value="form.maxCharacters" :min="100" :max="10000" style="width: 100%" /></a-form-item></a-col>
            <a-col :span="12"><a-form-item label="Overlap characters"><a-input-number v-model:value="form.overlapCharacters" :min="0" :max="9999" style="width: 100%" /></a-form-item></a-col>
          </a-row>
          <div class="form-actions">
            <a-button :loading="previewing" @click="handlePreview"><EyeOutlined /> Preview pages</a-button>
            <a-button type="primary" :loading="indexing" @click="handleIndex"><DatabaseOutlined /> Index pages</a-button>
          </div>
        </a-form>
      </a-card>
    </a-col>

    <a-col :xs="24" :xl="16">
      <a-card title="Import preview" :bordered="false" :loading="previewing">
        <a-empty v-if="!preview" description="Enter a public URL and preview it to inspect fetched pages and generated chunks." />
        <template v-else>
          <a-descriptions bordered size="small" :column="4" class="preview-summary">
            <a-descriptions-item label="Pages">{{ preview.pages.length }}</a-descriptions-item>
            <a-descriptions-item label="Type">{{ preview.document.documentType }}</a-descriptions-item>
            <a-descriptions-item label="Characters">{{ preview.document.characterCount }}</a-descriptions-item>
            <a-descriptions-item label="Chunks">{{ preview.document.chunkCount }}</a-descriptions-item>
          </a-descriptions>

          <h3 class="section-title">Fetched pages</h3>
          <a-list size="small" bordered :data-source="preview.pages" class="page-list">
            <template #renderItem="{ item }">
              <a-list-item>
                <a-list-item-meta :title="`${item.pageNumber}. ${item.title || 'Untitled page'}`" :description="item.url" />
                <a :href="item.url" target="_blank" rel="noreferrer"><ExportOutlined /> Open</a>
              </a-list-item>
            </template>
          </a-list>

          <h3 class="section-title">Generated chunks</h3>
          <a-collapse>
            <a-collapse-panel v-for="chunk in preview.document.chunks" :key="chunk.index" :header="`Chunk ${chunk.index + 1} · ${chunk.characterCount} characters · [${chunk.startOffset}, ${chunk.endOffset})`">
              <pre class="chunk-content">{{ chunk.content }}</pre>
              <div v-if="chunk.sourceReferences.length" class="source-references">
                <a-tag v-for="(source, index) in chunk.sourceReferences" :key="index">{{ sourceLabel(source) }}</a-tag>
              </div>
            </a-collapse-panel>
          </a-collapse>
        </template>
      </a-card>
    </a-col>
  </a-row>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import { DatabaseOutlined, ExportOutlined, EyeOutlined } from '@ant-design/icons-vue';
import { indexWebPages, previewWebPages } from '@/api/webPages';
import type { WebPageImportParams, WebPagePreviewResult } from '@/api/webPages';
import type { SourceReference } from '@/api/documents';
import { getApiErrorMessage } from '@/utils/http';

const router = useRouter();
const documentId = ref('');
const form = reactive<Omit<WebPageImportParams, 'documentId'>>({
  url: '',
  followPagination: false,
  maxPages: 10,
  maxCharacters: 800,
  overlapCharacters: 100,
});
const preview = ref<WebPagePreviewResult | null>(null);
const previewing = ref(false);
const indexing = ref(false);
const errorMessage = ref('');

function requestParams(): WebPageImportParams {
  return { ...form, url: form.url.trim(), documentId: documentId.value.trim() || null };
}

function validate() {
  try {
    const url = new URL(form.url.trim());
    if (!['http:', 'https:'].includes(url.protocol)) return 'Enter an HTTP or HTTPS URL.';
  } catch {
    return 'Enter a valid absolute URL.';
  }
  if (form.overlapCharacters >= form.maxCharacters) return 'Overlap characters must be smaller than maximum characters.';
  return '';
}

async function handlePreview() {
  const validation = validate();
  if (validation) return message.warning(validation);
  previewing.value = true;
  errorMessage.value = '';
  try { preview.value = await previewWebPages(requestParams()); }
  catch (error) { errorMessage.value = getApiErrorMessage(error, 'The web pages could not be previewed.'); }
  finally { previewing.value = false; }
}

async function handleIndex() {
  const validation = validate();
  if (validation) return message.warning(validation);
  indexing.value = true;
  errorMessage.value = '';
  try {
    const result = await indexWebPages(requestParams());
    message.success(`${result.pages.length} web page${result.pages.length === 1 ? '' : 's'} indexed successfully.`);
    await router.push({ name: 'document-detail', params: { documentId: result.document.documentId } });
  } catch (error) { errorMessage.value = getApiErrorMessage(error, 'The web pages could not be indexed.'); }
  finally { indexing.value = false; }
}

function sourceLabel(source: SourceReference) {
  const page = source.webPageNumber ? `Web page ${source.webPageNumber}` : null;
  return [source.elementType, page, source.sourceTitle || source.sectionTitle].filter(Boolean).join(' · ');
}
</script>
