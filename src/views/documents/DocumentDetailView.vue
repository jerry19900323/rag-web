<template>
  <div class="page-heading">
    <div><a-button type="link" class="back-link" @click="$router.push({ name: 'documents' })"><ArrowLeftOutlined /> Documents</a-button><h1>{{ document?.fileName || 'Document details' }}</h1><p>{{ documentId }}</p></div>
    <a-button @click="load"><ReloadOutlined /> Refresh</a-button>
  </div>
  <a-alert v-if="errorMessage" :message="errorMessage" type="error" show-icon class="page-alert" />
  <a-spin :spinning="loading">
    <a-card v-if="document" title="Metadata" :bordered="false" class="detail-card">
      <a-descriptions bordered :column="2">
        <a-descriptions-item label="Document ID">{{ document.documentId }}</a-descriptions-item><a-descriptions-item label="Status"><a-badge :status="badgeStatus(document.status)" :text="document.status" /></a-descriptions-item>
        <a-descriptions-item label="File name">{{ document.fileName }}</a-descriptions-item><a-descriptions-item label="Type">{{ document.documentType }}</a-descriptions-item>
        <a-descriptions-item label="Characters">{{ document.characterCount }}</a-descriptions-item><a-descriptions-item label="Chunks">{{ document.chunkCount }}</a-descriptions-item>
        <a-descriptions-item label="Current ingestion">{{ document.currentIngestionId }}</a-descriptions-item><a-descriptions-item label="Updated">{{ formatDate(document.updatedAt) }}</a-descriptions-item>
        <a-descriptions-item label="Document hash" :span="2"><code class="hash-value">{{ document.documentHash }}</code></a-descriptions-item>
      </a-descriptions>
    </a-card>
    <a-card title="Ingestion history" :bordered="false">
      <a-table row-key="ingestionId" :columns="columns" :data-source="ingestions.items" :pagination="pagination" @change="handleTableChange">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'"><a-badge :status="badgeStatus(record.status)" :text="record.status" /></template>
          <template v-else-if="column.key === 'startedAt'">{{ formatDate(record.startedAt) }}</template>
          <template v-else-if="column.key === 'completedAt'">{{ record.completedAt ? formatDate(record.completedAt) : '—' }}</template>
          <template v-else-if="column.key === 'errorMessage'"><span :class="{ 'error-text': record.errorMessage }">{{ record.errorMessage || '—' }}</span></template>
        </template>
        <template #emptyText><a-empty description="No ingestion attempts were found." /></template>
      </a-table>
    </a-card>
  </a-spin>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import type { TablePaginationConfig } from 'ant-design-vue';
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons-vue';
import { getDocument, listDocumentIngestions } from '@/api/documents';
import type { DocumentItem, IngestionItem, PageResult, ProcessingStatus } from '@/api/documents';
import { getApiErrorMessage } from '@/utils/http';

const route = useRoute();
const documentId = computed(() => String(route.params.documentId));
const document = ref<DocumentItem | null>(null);
const loading = ref(false);
const errorMessage = ref('');
const ingestions = reactive<PageResult<IngestionItem>>({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
const columns = [
  { title: 'Ingestion ID', dataIndex: 'ingestionId' }, { title: 'Status', key: 'status', dataIndex: 'status', width: 130 },
  { title: 'Characters', dataIndex: 'characterCount', width: 120 }, { title: 'Chunks', dataIndex: 'chunkCount', width: 90 },
  { title: 'Started', key: 'startedAt', dataIndex: 'startedAt', width: 190 }, { title: 'Completed', key: 'completedAt', dataIndex: 'completedAt', width: 190 },
  { title: 'Error', key: 'errorMessage', dataIndex: 'errorMessage' },
];
const pagination = computed<TablePaginationConfig>(() => ({ current: ingestions.page + 1, pageSize: ingestions.size, total: ingestions.totalElements, showSizeChanger: true }));
const badgeStatus = (status: ProcessingStatus) => ({ PROCESSING: 'processing', COMPLETED: 'success', FAILED: 'error' } as const)[status];
const formatDate = (value: string) => new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

async function load(page = 0, size = ingestions.size) {
  loading.value = true; errorMessage.value = '';
  try {
    const [metadata, history] = await Promise.all([getDocument(documentId.value), listDocumentIngestions(documentId.value, page, size)]);
    document.value = metadata; Object.assign(ingestions, history);
  } catch (error) { errorMessage.value = getApiErrorMessage(error, 'Document details could not be loaded.'); }
  finally { loading.value = false; }
}
function handleTableChange(page: TablePaginationConfig) { void load((page.current || 1) - 1, page.pageSize || 20); }
watch(documentId, () => load());
onMounted(() => load());
</script>
