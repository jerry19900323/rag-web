<template>
  <div class="page-heading">
    <div><h1>Documents</h1><p>Manage indexed source documents and inspect their current status.</p></div>
    <a-button type="primary" @click="$router.push({ name: 'document-upload' })"><PlusOutlined /> Upload document</a-button>
  </div>
  <a-alert v-if="errorMessage" :message="errorMessage" type="error" show-icon closable class="page-alert" @close="errorMessage = ''" />
  <a-card :bordered="false" class="query-card">
    <a-form layout="inline" @submit.prevent="handleSearch">
      <a-form-item label="Document">
        <a-input v-model:value="queryDocument" allow-clear placeholder="Enter a document name" class="document-query-input" @press-enter="handleSearch" />
      </a-form-item>
      <a-form-item>
        <a-space>
          <a-button type="primary" :loading="loading" @click="handleSearch"><SearchOutlined /> Search</a-button>
          <a-button :disabled="loading" @click="handleReset">Reset</a-button>
        </a-space>
      </a-form-item>
    </a-form>
  </a-card>
  <a-card :bordered="false">
    <a-table row-key="documentId" :columns="columns" :data-source="data.items" :loading="loading" :pagination="pagination" @change="handleTableChange">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'fileName'"><a-button type="link" class="table-link" @click="$router.push({ name: 'document-detail', params: { documentId: record.documentId } })">{{ record.fileName }}</a-button><small class="document-id">{{ record.documentId }}</small></template>
        <template v-else-if="column.key === 'documentType'"><a-tag>{{ record.documentType }}</a-tag></template>
        <template v-else-if="column.key === 'status'"><a-badge :status="badgeStatus(record.status)" :text="record.status" /></template>
        <template v-else-if="column.key === 'updatedAt'">{{ formatDate(record.updatedAt) }}</template>
        <template v-else-if="column.key === 'actions'"><a-button type="link" @click="$router.push({ name: 'document-detail', params: { documentId: record.documentId } })">View</a-button></template>
      </template>
      <template #emptyText><a-empty description="No documents have been indexed yet." /></template>
    </a-table>
  </a-card>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons-vue';
import type { TablePaginationConfig } from 'ant-design-vue';
import { listDocuments } from '@/api/documents';
import type { DocumentItem, PageResult, ProcessingStatus } from '@/api/documents';
import { getApiErrorMessage } from '@/utils/http';

const loading = ref(false);
const errorMessage = ref('');
const queryDocument = ref('');
const data = reactive<PageResult<DocumentItem>>({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
const columns = [
  { title: 'Document', key: 'fileName', dataIndex: 'fileName' },
  { title: 'Type', key: 'documentType', dataIndex: 'documentType', width: 110 },
  { title: 'Status', key: 'status', dataIndex: 'status', width: 130 },
  { title: 'Characters', dataIndex: 'characterCount', width: 120 },
  { title: 'Chunks', dataIndex: 'chunkCount', width: 90 },
  { title: 'Updated', key: 'updatedAt', dataIndex: 'updatedAt', width: 190 },
  { title: '', key: 'actions', width: 80 },
];
const pagination = computed<TablePaginationConfig>(() => ({ current: data.page + 1, pageSize: data.size, total: data.totalElements, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'] }));
const badgeStatus = (status: ProcessingStatus) => ({ PROCESSING: 'processing', COMPLETED: 'success', FAILED: 'error' } as const)[status];
const formatDate = (value: string) => new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

async function load(page = data.page, size = data.size) {
  loading.value = true;
  errorMessage.value = '';
  try { Object.assign(data, await listDocuments(page, size, queryDocument.value)); }
  catch (error) { errorMessage.value = getApiErrorMessage(error, 'Documents could not be loaded.'); }
  finally { loading.value = false; }
}
async function handleSearch() {
  await load(0, data.size);
}
function handleReset() {
  queryDocument.value = '';
  void load(0, 20);
}
function handleTableChange(page: TablePaginationConfig) {
  void load((page.current || 1) - 1, page.pageSize || 20);
}
onMounted(() => load());
</script>
