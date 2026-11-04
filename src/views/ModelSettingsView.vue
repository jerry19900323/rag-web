<template>
  <div class="page-heading">
    <div><h1>Model settings</h1><p>Save provider connections and choose a model for each usage type.</p></div>
    <a-button v-if="isAdmin" :loading="loading" @click="loadSettings">Refresh settings</a-button>
  </div>
  <a-result v-if="!isAdmin || accessDenied" status="403" title="Access denied" sub-title="Only administrators can manage model settings." />
  <template v-else>
    <a-alert v-if="pageError" type="error" :message="pageError" show-icon class="page-alert" />
    <a-spin :spinning="loading">
      <a-card :bordered="false" class="detail-card">
        <template #title>Connections</template>
        <template #extra><a-button type="primary" @click="openCreate">Add connection</a-button></template>
        <a-table row-key="connectionId" :data-source="connections" :pagination="false" :scroll="{ x: 760 }" :columns="connectionColumns">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'name'"><strong>{{ record.name }}</strong><div class="model-subtext">{{ providerName(record.provider) }}</div></template>
            <template v-else-if="column.key === 'enabled'"><a-tag :color="record.enabled ? 'green' : 'default'">{{ record.enabled ? 'Enabled' : 'Disabled' }}</a-tag></template>
            <template v-else-if="column.key === 'hasApiKey'"><a-tag :color="record.hasApiKey ? 'green' : 'orange'">{{ record.hasApiKey ? 'Configured' : 'Missing' }}</a-tag></template>
            <template v-else-if="column.key === 'actions'">
              <a-space wrap>
                <a-button type="link" size="small" :disabled="deletingId === record.connectionId" @click="openEdit(record)">Edit</a-button>
                <a-button type="link" size="small" :disabled="deletingId === record.connectionId" @click="refreshModels(record.connectionId)">Refresh models</a-button>
                <a-button type="link" size="small" :loading="testingId === record.connectionId" :disabled="deletingId === record.connectionId" @click="testConnection(record.connectionId)">Test connection</a-button>
                <a-button type="link" size="small" danger :loading="deletingId === record.connectionId" @click="confirmDeleteConnection(record)">Delete</a-button>
              </a-space>
            </template>
          </template>
          <template #emptyText><a-empty description="No connections saved yet." /></template>
        </a-table>
        <a-alert v-if="connectionActionMessage" :type="connectionActionError ? 'error' : 'success'" :message="connectionActionMessage" show-icon class="model-action-alert" />
        <p class="status-help">A connection test checks catalog access. It does not test model inference.</p>
      </a-card>

      <a-card title="Add or change a model" :bordered="false" class="detail-card">
        <p class="status-help model-intro">Select a usage type, connection, and model. One model can be saved for each usage type. Saving a selection does not start an AI workflow.</p>
        <a-form layout="vertical" class="model-assignment-form" @submit.prevent="saveAssignment">
          <a-form-item label="Usage type" required>
            <a-select v-model:value="selection.usageType" placeholder="Select a usage type" show-search option-filter-prop="label" :options="usageOptions" @change="onUsageChange" />
          </a-form-item>
          <a-alert v-if="currentAssignment?.connectionId" type="info" show-icon class="model-form-note" :message="`Current selection: ${connectionName(currentAssignment.connectionId)} · ${currentAssignment.modelId}`" description="Saving another model for this usage type will replace this selection." />
          <a-form-item label="Connection" required>
            <a-select v-model:value="selection.connectionId" placeholder="Select an enabled connection" show-search option-filter-prop="label" :options="connectionOptions" @change="onConnectionChange" />
          </a-form-item>
          <template v-if="selection.connectionId">
            <a-form-item label="Model ID" required>
              <a-select v-if="!selection.manual" v-model:value="selection.modelId" placeholder="Select a model" show-search option-filter-prop="label" :loading="modelLoading[selection.connectionId]" :options="modelOptions(selection.connectionId)" />
              <a-input v-else v-model:value="selection.modelId" :maxlength="200" placeholder="Enter the exact provider model ID" />
            </a-form-item>
            <a-space wrap class="model-controls">
              <a-button size="small" @click="toggleManual">{{ selection.manual ? 'Choose from catalog' : 'Enter model ID manually' }}</a-button>
              <a-button size="small" :loading="modelLoading[selection.connectionId]" @click="refreshModels(selection.connectionId)">Refresh models</a-button>
            </a-space>
            <p v-if="selection.manual || usageSupportUnverified" class="model-subtext">{{ selection.manual ? 'Manual model ID is unverified.' : 'Provider and model support for this usage type is unverified.' }}</p>
            <a-alert v-if="modelErrors[selection.connectionId]" type="warning" :message="modelErrors[selection.connectionId]" show-icon class="model-action-alert" />
          </template>
          <a-alert v-if="assignmentError" type="error" :message="assignmentError" show-icon class="model-action-alert" />
          <a-alert v-if="assignmentMessage" type="success" :message="assignmentMessage" show-icon class="model-action-alert" />
          <a-button type="primary" html-type="submit" :loading="savingAssignment" class="model-save">{{ currentAssignment?.connectionId ? 'Replace selected model' : 'Save model' }}</a-button>
        </a-form>
      </a-card>

      <a-card title="Current selections" :bordered="false">
        <a-alert v-if="removeError" type="error" :message="removeError" show-icon class="page-alert" />
        <a-table row-key="purpose" :data-source="assignmentRows" :columns="assignmentColumns" :pagination="{ pageSize: 10 }" :scroll="{ x: 650 }">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'purpose'"><strong>{{ usageName(record.purpose) }}</strong><div class="model-subtext">{{ record.purpose }}</div></template>
            <template v-else-if="column.key === 'connection'">{{ record.connectionId ? connectionName(record.connectionId) : 'Not configured' }}<a-tag v-if="record.connectionId && !connectionById(record.connectionId)?.enabled" color="orange">Disabled</a-tag></template>
            <template v-else-if="column.key === 'modelId'">{{ record.modelId || '—' }}</template>
            <template v-else-if="column.key === 'actions'"><a-space><a-button type="link" size="small" @click="selectAssignment(record)">{{ record.connectionId ? 'Change' : 'Add' }}</a-button><a-button v-if="record.connectionId" type="link" size="small" danger :loading="removingUsage === record.purpose" @click="confirmRemoveAssignment(record)">Remove</a-button></a-space></template>
          </template>
        </a-table>
      </a-card>
    </a-spin>
  </template>

  <a-modal v-model:open="modalOpen" :title="editingId ? 'Edit connection' : 'Add connection'" :confirm-loading="savingConnection" ok-text="Save" @ok="saveConnection" @cancel="closeModal">
    <a-alert v-if="formError" type="error" :message="formError" show-icon class="page-alert" />
    <a-form layout="vertical">
      <a-form-item label="Name" required><a-input v-model:value="connectionForm.name" :maxlength="100" placeholder="Connection name" /></a-form-item>
      <a-form-item label="Provider" required><a-select v-model:value="connectionForm.provider" :disabled="!!editingId" :options="providerOptions" placeholder="Choose a provider" /></a-form-item>
      <a-form-item v-if="selectedProvider?.requiresApiKey" :label="editingId ? 'Replace API key (optional)' : 'API key'" :required="!editingId"><a-input-password v-model:value="connectionForm.apiKey" autocomplete="new-password" :placeholder="editingId ? 'Leave blank to retain saved key' : 'Provider API key'" /></a-form-item>
      <a-form-item label="Enabled"><a-switch v-model:checked="connectionForm.enabled" /></a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import axios from 'axios';
import { computed, onMounted, reactive, ref } from 'vue';
import { Modal } from 'ant-design-vue';
import { useAuthStore } from '@/stores/auth';
import { getApiErrorMessage } from '@/utils/http';
import { deleteModelConnection, listModelProviders, listModelUsageTypes, listModelConnections, listModelAssignments, listProviderModels, saveModelConnection, testModelConnection, saveModelAssignment } from '@/api/modelSettings';
import type { ModelProvider, ModelUsageType, ModelConnection, ModelAssignment, ProviderModel } from '@/api/modelSettings';

const auth = useAuthStore();
const isAdmin = computed(() => auth.user?.role === 'ADMIN');
const providers = ref<ModelProvider[]>([]);
const usageTypes = ref<ModelUsageType[]>([]);
const connections = ref<ModelConnection[]>([]);
const assignments = ref<ModelAssignment[]>([]);
const models = reactive<Record<string, ProviderModel[]>>({});
const modelLoading = reactive<Record<string, boolean>>({});
const modelErrors = reactive<Record<string, string>>({});
const selection = reactive<{ usageType?: string; connectionId?: string; modelId?: string; manual: boolean }>({ manual: false });
const loading = ref(false);
const pageError = ref('');
const accessDenied = ref(false);
const assignmentError = ref('');
const assignmentMessage = ref('');
const removeError = ref('');
const connectionActionMessage = ref('');
const connectionActionError = ref(false);
const testingId = ref('');
const deletingId = ref('');
const removingUsage = ref('');
const savingAssignment = ref(false);
const modalOpen = ref(false);
const editingId = ref<string | null>(null);
const savingConnection = ref(false);
const formError = ref('');
const connectionForm = reactive({ name: '', provider: undefined as string | undefined, apiKey: '', enabled: true });
const selectedProvider = computed(() => providers.value.find(item => item.provider === connectionForm.provider));
const providerOptions = computed(() => providers.value.map(item => ({ value: item.provider, label: item.displayName })));
const usageOptions = computed(() => usageTypes.value.map(item => ({ value: item.usageType, label: item.displayName })));
const currentAssignment = computed(() => assignments.value.find(item => item.purpose === selection.usageType));
const knownPurposes = computed(() => new Set(providers.value.flatMap(item => item.supportedPurposes)));
const usageSupportUnverified = computed(() => !!selection.usageType && !knownPurposes.value.has(selection.usageType));
const connectionOptions = computed(() => connections.value.filter(item => item.enabled && (!selection.usageType || usageSupportUnverified.value || providers.value.find(provider => provider.provider === item.provider)?.supportedPurposes.includes(selection.usageType))).map(item => ({ value: item.connectionId, label: `${item.name} · ${providerName(item.provider)}` })));
const assignmentRows = computed(() => usageTypes.value.map(item => assignments.value.find(assignment => assignment.purpose === item.usageType) || { purpose: item.usageType, connectionId: null, modelId: null, updatedAt: null }));
const connectionColumns = [
  { title: 'Connection', key: 'name', width: 250 }, { title: 'Status', key: 'enabled', width: 110 },
  { title: 'API key', key: 'hasApiKey', width: 120 }, { title: 'Actions', key: 'actions' },
];
const assignmentColumns = [
  { title: 'Usage type', key: 'purpose', width: 230 }, { title: 'Connection', key: 'connection', width: 230 },
  { title: 'Model ID', key: 'modelId' }, { title: 'Actions', key: 'actions', width: 155 },
];

function providerName(provider: string) { return providers.value.find(item => item.provider === provider)?.displayName || provider; }
function usageName(usage: string) { return usageTypes.value.find(item => item.usageType === usage)?.displayName || usage; }
function connectionById(id: string) { return connections.value.find(item => item.connectionId === id); }
function connectionName(id: string) { return connectionById(id)?.name || 'Removed connection'; }
function modelOptions(id: string) { return (models[id] || []).map(item => ({ value: item.modelId, label: `${item.displayName} (${item.modelId})` })); }

async function loadSettings() {
  if (!isAdmin.value) return;
  loading.value = true; pageError.value = '';
  try {
    const [providerList, usageList, connectionList, assignmentList] = await Promise.all([listModelProviders(), listModelUsageTypes(), listModelConnections(), listModelAssignments()]);
    providers.value = providerList; usageTypes.value = usageList; connections.value = connectionList; assignments.value = assignmentList;
    if (selection.connectionId && !connectionList.some(item => item.connectionId === selection.connectionId && item.enabled)) { selection.connectionId = undefined; selection.modelId = undefined; }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 403) accessDenied.value = true;
    else pageError.value = getApiErrorMessage(error, 'Model settings could not be loaded.');
  } finally { loading.value = false; }
}
async function refreshAssignments() { assignments.value = await listModelAssignments(); }
function onUsageChange() {
  assignmentError.value = ''; assignmentMessage.value = '';
  if (selection.connectionId && !connectionOptions.value.some(item => item.value === selection.connectionId)) { selection.connectionId = undefined; selection.modelId = undefined; selection.manual = false; }
}
function onConnectionChange() {
  selection.modelId = undefined; selection.manual = false; assignmentError.value = ''; assignmentMessage.value = '';
  if (selection.connectionId) void refreshModels(selection.connectionId, false);
}
function toggleManual() { selection.manual = !selection.manual; selection.modelId = undefined; }
async function selectAssignment(item: ModelAssignment) {
  selection.usageType = item.purpose;
  selection.connectionId = item.connectionId && connectionById(item.connectionId)?.enabled ? item.connectionId : undefined;
  selection.modelId = selection.connectionId ? item.modelId || undefined : undefined;
  selection.manual = !!selection.modelId;
  assignmentError.value = ''; assignmentMessage.value = '';
  if (selection.connectionId) {
    await refreshModels(selection.connectionId, false);
    if (selection.modelId && models[selection.connectionId]?.some(model => model.modelId === selection.modelId)) selection.manual = false;
  }
  document.querySelector('.model-assignment-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
async function saveAssignment() {
  if (!selection.usageType) { assignmentError.value = 'Select a usage type.'; return; }
  if (!selection.connectionId) { assignmentError.value = 'Select an enabled connection.'; return; }
  const modelId = selection.modelId?.trim();
  if (!modelId || modelId.length > 200) { assignmentError.value = 'Enter a model ID with 1–200 characters.'; return; }
  savingAssignment.value = true; assignmentError.value = ''; assignmentMessage.value = '';
  try {
    const saved = await saveModelAssignment(selection.usageType, selection.connectionId, modelId);
    assignments.value = [...assignments.value.filter(item => item.purpose !== saved.purpose), saved];
    selection.modelId = saved.modelId || undefined;
    try { await refreshAssignments(); assignmentMessage.value = `${usageName(saved.purpose)} saved.`; }
    catch { assignmentMessage.value = 'Model saved. Refresh settings to reload the current selections.'; }
  } catch (error) {
    assignmentError.value = getApiErrorMessage(error, 'Model selection could not be saved.');
    if (axios.isAxiosError(error) && error.response?.status === 404) connections.value = await listModelConnections();
  } finally { savingAssignment.value = false; }
}
function confirmRemoveAssignment(item: ModelAssignment) {
  Modal.confirm({ title: `Remove ${usageName(item.purpose)}?`, content: 'This clears the selected model for this usage type. The provider connection stays saved.', okText: 'Remove model', okType: 'danger', onOk: () => removeAssignment(item.purpose) });
}
async function removeAssignment(usage: string) {
  removingUsage.value = usage; removeError.value = ''; assignmentMessage.value = '';
  try {
    const cleared = await saveModelAssignment(usage, null, null);
    assignments.value = [...assignments.value.filter(item => item.purpose !== usage), cleared];
    if (selection.usageType === usage) { selection.connectionId = undefined; selection.modelId = undefined; selection.manual = false; }
    try { await refreshAssignments(); assignmentMessage.value = `${usageName(usage)} selection removed.`; }
    catch { assignmentMessage.value = 'Selection removed. Refresh settings to reload the current selections.'; }
  } catch (error) { removeError.value = getApiErrorMessage(error, 'Model selection could not be removed.'); }
  finally { removingUsage.value = ''; }
}
function openCreate() { editingId.value = null; Object.assign(connectionForm, { name: '', provider: undefined, apiKey: '', enabled: true }); formError.value = ''; modalOpen.value = true; }
function openEdit(item: ModelConnection) { editingId.value = item.connectionId; Object.assign(connectionForm, { name: item.name, provider: item.provider, apiKey: '', enabled: item.enabled }); formError.value = ''; modalOpen.value = true; }
function closeModal() { connectionForm.apiKey = ''; formError.value = ''; }
async function saveConnection() {
  const name = connectionForm.name.trim();
  if (!name || name.length > 100) { formError.value = 'Name must contain 1–100 characters.'; return; }
  if (!connectionForm.provider) { formError.value = 'Choose a provider.'; return; }
  if (!editingId.value && selectedProvider.value?.requiresApiKey && !connectionForm.apiKey.trim()) { formError.value = 'Enter an API key.'; return; }
  savingConnection.value = true; formError.value = '';
  try {
    const saved = await saveModelConnection({ name, provider: connectionForm.provider, enabled: connectionForm.enabled, ...(connectionForm.apiKey.trim() ? { apiKey: connectionForm.apiKey.trim() } : {}) }, editingId.value || undefined);
    connections.value = [...connections.value.filter(item => item.connectionId !== saved.connectionId), saved];
    modalOpen.value = false; closeModal();
    connectionActionError.value = false; connectionActionMessage.value = 'Connection saved.';
    if (!editingId.value && saved.enabled) {
      if (selection.usageType && !usageSupportUnverified.value && !providers.value.find(item => item.provider === saved.provider)?.supportedPurposes.includes(selection.usageType)) selection.usageType = undefined;
      selection.connectionId = saved.connectionId; selection.modelId = undefined; selection.manual = false;
      void refreshModels(saved.connectionId);
    }
    if (editingId.value === selection.connectionId && !saved.enabled) { selection.connectionId = undefined; selection.modelId = undefined; }
    try { connections.value = await listModelConnections(); }
    catch { connectionActionError.value = true; connectionActionMessage.value = 'Connection saved, but the connection list could not be refreshed.'; }
  } catch (error) {
    formError.value = axios.isAxiosError(error) && error.response?.status === 503 ? 'Server model encryption is unavailable. Ask an administrator to configure the server.' : getApiErrorMessage(error, 'Connection could not be saved.');
  } finally { savingConnection.value = false; }
}
async function refreshModels(id: string, announce = true) {
  modelLoading[id] = true; modelErrors[id] = '';
  try {
    models[id] = await listProviderModels(id);
    if (announce) { connectionActionError.value = false; connectionActionMessage.value = `Loaded ${models[id].length} models for ${connectionName(id)}.`; }
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    modelErrors[id] = status === 503 ? 'Server model encryption is unavailable. Ask an administrator to configure the server.' : getApiErrorMessage(error, 'Model catalog could not be loaded. Retry or enter a model ID manually.');
    if (announce) { connectionActionError.value = true; connectionActionMessage.value = modelErrors[id]; }
    if (status === 404) { connections.value = await listModelConnections(); if (selection.connectionId === id) { selection.connectionId = undefined; selection.modelId = undefined; } }
  } finally { modelLoading[id] = false; }
}
async function testConnection(id: string) {
  testingId.value = id; connectionActionMessage.value = '';
  try { const result = await testModelConnection(id); connectionActionError.value = false; connectionActionMessage.value = `${result.status}: ${result.discoveredModelCount} models discovered. Catalog access only; model inference was not tested.`; }
  catch (error) { connectionActionError.value = true; connectionActionMessage.value = getApiErrorMessage(error, 'Connection test failed.'); if (axios.isAxiosError(error) && error.response?.status === 404) connections.value = await listModelConnections(); }
  finally { testingId.value = ''; }
}
async function confirmDeleteConnection(item: ModelConnection) {
  connectionActionMessage.value = '';
  let affected: string[];
  try { affected = (await listModelAssignments()).filter(assignment => assignment.connectionId === item.connectionId).map(assignment => usageName(assignment.purpose)); }
  catch (error) { connectionActionError.value = true; connectionActionMessage.value = getApiErrorMessage(error, 'Assignments could not be checked. Retry deletion.'); return; }
  Modal.confirm({ title: `Delete ${item.name}?`, content: affected.length ? `This deletes the saved connection and API key and clears ${affected.join(', ')}. Remote models are unaffected.` : 'This deletes the saved connection and API key. Remote models are unaffected.', okText: 'Delete connection', okType: 'danger', onOk: () => removeConnection(item.connectionId) });
}
async function removeConnection(id: string) {
  deletingId.value = id; connectionActionMessage.value = '';
  let deleted = false;
  try {
    await deleteModelConnection(id); deleted = true;
    connections.value = connections.value.filter(item => item.connectionId !== id);
    delete models[id]; delete modelErrors[id];
    if (selection.connectionId === id) { selection.connectionId = undefined; selection.modelId = undefined; selection.manual = false; }
    assignments.value = assignments.value.map(item => item.connectionId === id ? { ...item, connectionId: null, modelId: null } : item);
    const [connectionList, assignmentList] = await Promise.all([listModelConnections(), listModelAssignments()]);
    connections.value = connectionList; assignments.value = assignmentList;
    connectionActionError.value = false; connectionActionMessage.value = 'Connection deleted. Its model selections were cleared.';
  } catch (error) {
    if (deleted) { connectionActionError.value = true; connectionActionMessage.value = 'Connection deleted, but settings could not be refreshed. Refresh the page to reload selections.'; return; }
    if (axios.isAxiosError(error) && error.response?.status === 404) { await loadSettings(); connectionActionMessage.value = 'The connection was already removed. Settings have been refreshed.'; }
    else connectionActionMessage.value = getApiErrorMessage(error, 'Connection could not be deleted. Please retry.');
    connectionActionError.value = true;
  } finally { deletingId.value = ''; }
}
onMounted(loadSettings);
</script>
