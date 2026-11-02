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
        <template v-else-if="column.key === 'actions'"><a-space><a-button type="link" :disabled="deletingId === record.documentId" @click="$router.push({ name: 'document-detail', params: { documentId: record.documentId } })">View</a-button><a-button v-if="isAdmin" type="link" danger :loading="deletingId === record.documentId" :disabled="!!deletingId && deletingId !== record.documentId" @click="confirmDelete(record)">Delete</a-button></a-space></template>
      </template>
      <template #emptyText><a-empty description="No documents have been indexed yet." /></template>
    </a-table>
  </a-card>
</template>

<script setup lang="ts">
import axios from 'axios';
import { computed, onMounted, reactive, ref } from 'vue';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons-vue';
import { Modal, message, type TablePaginationConfig } from 'ant-design-vue';
import { deleteDocument, listDocuments } from '@/api/documents';
import type { DocumentItem, PageResult, ProcessingStatus } from '@/api/documents';
import { useAuthStore } from '@/stores/auth';
import { getApiErrorMessage } from '@/utils/http';

const loading = ref(false);
const isAdmin = computed(() => useAuthStore().user?.role === 'ADMIN');
const deletingId = ref('');
const errorMessage = ref('');
const queryDocument = ref('');
const appliedFilter = ref('');
const data = reactive<PageResult<DocumentItem>>({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
const columns = [
  { title: 'Document', key: 'fileName', dataIndex: 'fileName' },
  { title: 'Type', key: 'documentType', dataIndex: 'documentType', width: 110 },
  { title: 'Status', key: 'status', dataIndex: 'status', width: 130 },
  { title: 'Characters', dataIndex: 'characterCount', width: 120 },
  { title: 'Chunks', dataIndex: 'chunkCount', width: 90 },
  { title: 'Updated', key: 'updatedAt', dataIndex: 'updatedAt', width: 190 },
  { title: '', key: 'actions', width: 170 },
];
const pagination = computed<TablePaginationConfig>(() => ({ current: data.page + 1, pageSize: data.size, total: data.totalElements, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'] }));
const badgeStatus = (status: ProcessingStatus) => ({ PROCESSING: 'processing', COMPLETED: 'success', FAILED: 'error' } as const)[status];
const formatDate = (value: string) => new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

async function load(page = data.page, size = data.size) {
  loading.value = true;
  errorMessage.value = '';
  try { Object.assign(data, await listDocuments(page, size, appliedFilter.value)); }
  catch (error) { errorMessage.value = getApiErrorMessage(error, 'Documents could not be loaded.'); }
  finally { loading.value = false; }
}
async function handleSearch() {
  appliedFilter.value = queryDocument.value.trim();
  await load(0, data.size);
}
function handleReset() {
  queryDocument.value = '';
  appliedFilter.value = '';
  void load(0, 20);
}
function handleTableChange(page: TablePaginationConfig) {
  void load((page.current || 1) - 1, page.pageSize || 20);
}
function confirmDelete(item: DocumentItem) {
  Modal.confirm({
    title: `Delete ${item.fileName}?`,
    content: `This permanently deletes document ${item.documentId}, all indexed passages, and its ingestion history.`,
    okText: 'Delete permanently', okType: 'danger',
    onOk: () => removeDocument(item.documentId),
  });
}
async function removeDocument(id: string) {
  deletingId.value = id; errorMessage.value = '';
  try {
    await deleteDocument(id);
    await refreshAfterRemoval();
    message.success('Document deleted.');
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    if (status === 404) { await refreshAfterRemoval(); errorMessage.value = 'The document was already removed. The list has been refreshed.'; }
    else errorMessage.value = status === 403 ? 'Access denied. Only administrators can delete documents.' : getApiErrorMessage(error, 'The document could not be deleted. Please retry.');
  } finally { deletingId.value = ''; }
}
async function refreshAfterRemoval() {
  await load(data.page, data.size);
  if (!data.items.length && data.page > 0 && !errorMessage.value) await load(data.page - 1, data.size);
}
onMounted(() => load());
</script>
