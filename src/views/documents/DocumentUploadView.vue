<template>
  <div class="page-heading"><div><h1>Upload document</h1><p>Preview document chunks, then persist the approved content in the search index.</p></div></div>
  <a-alert v-if="errorMessage" :message="errorMessage" type="error" show-icon closable class="page-alert" @close="errorMessage = ''" />
  <a-row :gutter="[20, 20]">
    <a-col :xs="24" :xl="8">
      <a-card title="Document settings" :bordered="false">
        <a-form layout="vertical">
          <a-form-item label="File" required>
            <a-upload-dragger :file-list="fileList" :before-upload="selectFile" :max-count="1" accept=".txt,.md,.markdown,.pdf,.docx,.pptx,.xlsx,.html,.htm" @remove="removeFile">
              <p class="ant-upload-drag-icon"><InboxOutlined /></p><p class="ant-upload-text">Drop a document here or click to browse</p><p class="ant-upload-hint">TXT, Markdown, PDF, DOCX, PPTX, XLSX, or HTML. Maximum request size: 5 MB.</p>
            </a-upload-dragger>
          </a-form-item>
          <a-form-item label="Document ID" extra="Optional. Reusing an ID replaces its current indexed generation.">
            <a-input v-model:value="documentId" maxlength="200" placeholder="Generated automatically when empty" />
          </a-form-item>
          <a-row :gutter="12">
            <a-col :span="12"><a-form-item label="Maximum characters"><a-input-number v-model:value="settings.maxCharacters" :min="100" :max="10000" style="width: 100%" /></a-form-item></a-col>
            <a-col :span="12"><a-form-item label="Overlap characters"><a-input-number v-model:value="settings.overlapCharacters" :min="0" :max="9999" style="width: 100%" /></a-form-item></a-col>
          </a-row>
          <div class="form-actions">
            <a-button :loading="previewing" :disabled="!selectedFile" @click="handlePreview"><EyeOutlined /> Preview chunks</a-button>
            <a-button type="primary" :loading="indexing" :disabled="!selectedFile" @click="handleIndex"><DatabaseOutlined /> Confirm</a-button>
          </div>
        </a-form>
      </a-card>
    </a-col>
    <a-col :xs="24" :xl="16">
      <a-card title="Chunk preview" :bordered="false" :loading="previewing">
        <a-empty v-if="!preview" description="Select a document and preview it to inspect the generated chunks." />
        <template v-else>
          <a-descriptions bordered size="small" :column="4" class="preview-summary">
            <a-descriptions-item label="File">{{ preview.fileName }}</a-descriptions-item><a-descriptions-item label="Type">{{ preview.documentType }}</a-descriptions-item>
            <a-descriptions-item label="Characters">{{ preview.characterCount }}</a-descriptions-item><a-descriptions-item label="Chunks">{{ preview.chunkCount }}</a-descriptions-item>
          </a-descriptions>
          <a-collapse>
            <a-collapse-panel v-for="chunk in preview.chunks" :key="chunk.index" :header="`Chunk ${chunk.index + 1} · ${chunk.characterCount} characters · [${chunk.startOffset}, ${chunk.endOffset})`">
              <pre class="chunk-content">{{ chunk.content }}</pre>
              <div v-if="chunk.sourceReferences.length" class="source-references"><a-tag v-for="(source, index) in chunk.sourceReferences" :key="index">{{ sourceLabel(source) }}</a-tag></div>
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
import type { UploadFile } from 'ant-design-vue';
import { DatabaseOutlined, EyeOutlined, InboxOutlined } from '@ant-design/icons-vue';
import { indexDocument, previewDocument } from '@/api/documents';
import type { DocumentPreview, SourceReference } from '@/api/documents';
import { getApiErrorMessage } from '@/utils/http';

const router = useRouter();
const selectedFile = ref<File | null>(null);
const fileList = ref<UploadFile[]>([]);
const documentId = ref('');
const settings = reactive({ maxCharacters: 800, overlapCharacters: 100 });
const preview = ref<DocumentPreview | null>(null);
const previewing = ref(false);
const indexing = ref(false);
const errorMessage = ref('');

function selectFile(file: File) {
  selectedFile.value = file;
  fileList.value = [{ uid: file.name, name: file.name, status: 'done', originFileObj: file as UploadFile['originFileObj'] }];
  preview.value = null;
  return false;
}
function removeFile() { selectedFile.value = null; fileList.value = []; preview.value = null; return true; }
function validate() {
  if (!selectedFile.value) return 'Select a document first.';
  if (settings.overlapCharacters >= settings.maxCharacters) return 'Overlap characters must be smaller than maximum characters.';
  return '';
}
async function handlePreview() {
  const validation = validate();
  if (validation) return message.warning(validation);
  previewing.value = true; errorMessage.value = '';
  try { preview.value = await previewDocument(selectedFile.value!, settings); }
  catch (error) { errorMessage.value = getApiErrorMessage(error, 'The document could not be previewed.'); }
  finally { previewing.value = false; }
}
async function handleIndex() {
  const validation = validate();
  if (validation) return message.warning(validation);
  indexing.value = true; errorMessage.value = '';
  try {
    const result = await indexDocument(selectedFile.value!, settings, documentId.value);
    message.success('The document was published to the knowledge base.');
    await router.push({ name: 'document-detail', params: { documentId: result.documentId } });
  } catch (error) { errorMessage.value = getApiErrorMessage(error, 'The document could not be published to the knowledge base.'); }
  finally { indexing.value = false; }
}
function sourceLabel(source: SourceReference) {
  const location = source.pageNumber ? `Page ${source.pageNumber}` : source.slideNumber ? `Slide ${source.slideNumber}` : source.sheetName || source.sectionTitle;
  return [source.elementType, location].filter(Boolean).join(' · ');
}
</script>
