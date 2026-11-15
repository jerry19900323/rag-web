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
        <template #title>Configure a model</template>
        <template #extra><a-button @click="openCreate">Add model</a-button></template>
        <p class="status-help model-intro">Choose a usage type and model ID, then use a new provider or an existing connection.</p>
        <a-radio-group v-if="!editingId" v-model:value="formMode" button-style="solid" class="model-form-mode">
          <a-radio-button value="new">New provider</a-radio-button><a-radio-button value="existing">Saved provider</a-radio-button>
        </a-radio-group>
        <a-form v-if="formMode === 'new' || editingId" layout="vertical" class="model-connection-form" @submit.prevent="saveConnection">
          <a-alert v-if="formError" type="error" :message="formError" show-icon class="page-alert" />
          <div class="model-connection-fields">
            <a-form-item label="Connection name" required extra="A label to identify this saved configuration."><a-input v-model:value="connectionForm.name" :maxlength="100" placeholder="For example, Main AI account" /></a-form-item>
            <a-form-item label="Provider" required><a-select v-model:value="connectionForm.provider" :disabled="!!editingId" :options="providerOptions" placeholder="Choose the provider protocol" /></a-form-item>
            <a-form-item label="Account ID" :required="isCloudflareProvider" :extra="isCloudflareProvider ? 'Required for Cloudflare. The server uses it to find the account model catalog.' : 'Optional provider metadata; it is not added to requests automatically.'"><a-input v-model:value="connectionForm.accountId" :maxlength="200" placeholder="Provider account ID" /></a-form-item>
            <a-form-item label="API base URL (connection address)" :extra="isCloudflareProvider ? 'Optional. The server uses the Cloudflare account endpoint for the model catalog. A custom URL is stored for future model calls.' : 'Optional for preset providers. For OpenAI-compatible APIs, end at /v1 rather than /models.'"><a-input v-model:value="connectionForm.apiBaseUrl" :maxlength="500" :placeholder="isCloudflareProvider ? 'https://api.cloudflare.com/client/v4/accounts/YOUR_ACCOUNT_ID/ai/v1' : 'https://api.example.com/v1'" /></a-form-item>
            <a-form-item v-if="selectedProvider?.requiresApiKey" :label="editingId ? 'Replace API token / key' : 'API token / key'" :required="!editingId" :extra="isCloudflareProvider ? 'Use a Cloudflare Workers AI API token with Workers AI Read permission. Leave blank while editing to keep the saved token.' : editingId ? 'Leave blank to keep the saved token.' : undefined"><a-input-password v-model:value="connectionForm.apiKey" autocomplete="new-password" :placeholder="editingId ? 'Leave blank to keep the saved token' : 'Provider API token or key'" /></a-form-item>
            <template v-if="!editingId">
              <a-form-item label="Usage type" required><a-select v-model:value="connectionForm.usageType" :options="usageOptions" placeholder="Choose what the model is used for" /></a-form-item>
              <a-form-item label="Model ID" required extra="Enter the exact provider model ID. Manual IDs are unverified."><a-input v-model:value="connectionForm.modelId" :maxlength="200" :placeholder="isCloudflareProvider ? '@cf/meta/llama-3.1-8b-instruct-fast' : 'Provider model ID'" /></a-form-item>
            </template>
            <a-form-item v-if="editingId" label="Enabled"><a-switch v-model:checked="connectionForm.enabled" /></a-form-item>
          </div>
          <a-alert v-if="!editingId && cloudflareExistingAssignment?.connectionId" type="info" show-icon class="page-alert" :message="`Current ${usageName(connectionForm.usageType!)} model: ${cloudflareExistingAssignment.modelId}`" description="Saving will replace the current model selection for this usage type." />
          <a-alert v-if="isCloudflareApiUrl && !isCloudflareProvider" type="warning" show-icon class="page-alert" message="Choose Cloudflare Workers AI as the provider" description="A Cloudflare URL does not change another provider's API protocol. Select the Cloudflare preset if it is available from the server." />
          <a-space><a-button type="primary" html-type="submit" :loading="savingConnection">{{ editingId ? 'Save connection changes' : 'Save model' }}</a-button><a-button v-if="editingId" html-type="button" @click="openCreate">Cancel editing</a-button></a-space>
        </a-form>
        <a-form v-else layout="vertical" class="model-assignment-form" @submit.prevent="saveAssignment">
          <a-form-item label="Usage type" required><a-select v-model:value="selection.usageType" :options="usageOptions" placeholder="Choose what the model is used for" @change="onUsageChange" /></a-form-item>
          <a-alert v-if="currentAssignment?.connectionId" type="info" show-icon class="model-form-note" :message="`Current model: ${currentAssignment.modelId}`" description="Saving will replace this usage type's current model." />
          <a-form-item label="Saved provider" required><a-select v-model:value="selection.connectionId" :options="connectionOptions" placeholder="Choose an enabled connection" @change="onConnectionChange" /></a-form-item>
          <a-form-item label="Model ID" required extra="Enter the exact provider model ID. Manual IDs are unverified."><a-input v-model:value="selection.modelId" :maxlength="200" placeholder="Provider model ID" /></a-form-item>
          <a-alert v-if="assignmentError" type="error" :message="assignmentError" show-icon class="page-alert" />
          <a-alert v-if="assignmentMessage" type="success" :message="assignmentMessage" show-icon class="page-alert" />
          <a-button type="primary" html-type="submit" :loading="savingAssignment">Save model</a-button>
        </a-form>
        <a-divider orientation="left">Saved connections</a-divider>
        <a-table row-key="connectionId" :data-source="connections" :pagination="false" :scroll="{ x: 760 }" :columns="connectionColumns">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'name'"><strong>{{ record.name }}</strong><div class="model-subtext">{{ providerName(record.provider) }}</div><div v-if="record.accountId" class="model-connection-meta">Account ID: {{ record.accountId }}</div><div v-if="record.apiBaseUrl" class="model-connection-meta">API base URL: {{ record.apiBaseUrl }}</div></template>
            <template v-else-if="column.key === 'enabled'"><a-tag :color="record.enabled ? 'green' : 'default'">{{ record.enabled ? 'Enabled' : 'Disabled' }}</a-tag></template>
            <template v-else-if="column.key === 'hasApiKey'"><a-tag :color="record.hasApiKey ? 'green' : 'orange'">{{ record.hasApiKey ? 'Configured' : 'Missing' }}</a-tag></template>
            <template v-else-if="column.key === 'actions'">
              <a-space wrap>
                <a-button v-for="assignment in assignmentsForConnection(record.connectionId)" :key="assignment.purpose" type="link" size="small" :disabled="deletingId === record.connectionId" @click="openEdit(record, assignment.purpose)">Edit {{ usageName(assignment.purpose) }}</a-button>
                <a-button v-if="!assignmentsForConnection(record.connectionId).length" type="link" size="small" :disabled="deletingId === record.connectionId" @click="openEdit(record)">Edit connection</a-button>
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

      <a-card title="Current selections" :bordered="false">
        <a-alert v-if="removeError" type="error" :message="removeError" show-icon class="page-alert" />
        <a-table row-key="purpose" :data-source="assignmentRows" :columns="assignmentColumns" :pagination="{ pageSize: 10 }" :scroll="{ x: 650 }">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'purpose'"><strong>{{ usageName(record.purpose) }}</strong><div class="model-subtext">{{ record.purpose }}</div></template>
            <template v-else-if="column.key === 'connection'">{{ record.connectionId ? connectionName(record.connectionId) : 'Not configured' }}<a-tag v-if="record.connectionId && !connectionById(record.connectionId)?.enabled" color="orange">Disabled</a-tag></template>
            <template v-else-if="column.key === 'modelId'">{{ record.modelId || '—' }}</template>
            <template v-else-if="column.key === 'actions'"><a-space><a-button type="link" size="small" @click="openAssignmentEdit(record)">{{ record.connectionId ? 'Edit' : 'Add model' }}</a-button><a-button v-if="record.connectionId" type="link" size="small" danger :loading="removingUsage === record.purpose" @click="confirmRemoveAssignment(record)">Remove</a-button></a-space></template>
          </template>
        </a-table>
      </a-card>
      <a-modal v-model:open="editModalOpen" :title="editForm.usageType ? 'Edit model' : 'Edit connection'" :footer="null" width="720px" destroy-on-close>
        <a-alert v-if="editModalError" type="error" :message="editModalError" show-icon class="page-alert" />
        <a-form layout="vertical" @submit.prevent="saveEditModal">
          <div class="model-connection-fields">
            <a-form-item label="Connection name" required><a-input v-model:value="editForm.name" :maxlength="100" /></a-form-item>
            <a-form-item label="Provider"><a-input :value="providerName(editForm.provider)" disabled /></a-form-item>
            <a-form-item label="Account ID" :required="editForm.provider === 'CLOUDFLARE'"><a-input v-model:value="editForm.accountId" :maxlength="200" /></a-form-item>
            <a-form-item label="API base URL"><a-input v-model:value="editForm.apiBaseUrl" :maxlength="500" /></a-form-item>
            <a-form-item v-if="providers.find(item => item.provider === editForm.provider)?.requiresApiKey" label="API token / key" extra="Saved key is masked. Use the eye icon to view it, or edit the field to replace it."><a-input-password v-model:value="editForm.apiKey" autocomplete="new-password" placeholder="Enter API token or key" /></a-form-item>
            <a-form-item label="Enabled"><a-switch v-model:checked="editForm.enabled" /></a-form-item>
            <a-form-item v-if="editForm.usageType" label="Usage type"><a-input :value="usageName(editForm.usageType)" disabled /></a-form-item>
            <a-form-item v-if="editForm.usageType" label="Model ID" required><a-input v-model:value="editForm.modelId" :maxlength="200" /></a-form-item>
          </div>
          <p v-if="!editForm.usageType" class="model-subtext">To edit a model ID, choose its usage type in Current selections.</p>
          <a-space><a-button type="primary" html-type="submit" :loading="savingEditModal">Save changes</a-button><a-button html-type="button" @click="editModalOpen = false">Cancel</a-button></a-space>
        </a-form>
      </a-modal>
    </a-spin>
  </template>

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
const editingId = ref<string | null>(null);
const savingConnection = ref(false);
const formError = ref('');
const formMode = ref<'new' | 'existing'>('new');
const editModalOpen = ref(false);
const editModalError = ref('');
const savingEditModal = ref(false);
const editForm = reactive({ connectionId: '', name: '', provider: '', accountId: '', apiBaseUrl: '', apiKey: '', hasApiKey: false, enabled: true, usageType: undefined as string | undefined, modelId: '' });
const originalEditApiKey = ref('');
const editModelIds = reactive<Record<string, string>>({});
const editModelError = ref('');
const editModelMessage = ref('');
const savingEditModelUsage = ref('');
const connectionForm = reactive({ name: '', provider: undefined as string | undefined, accountId: '', apiBaseUrl: '', apiKey: '', usageType: undefined as string | undefined, modelId: '', enabled: true });
const selectedProvider = computed(() => providers.value.find(item => item.provider === connectionForm.provider));
const isCloudflareProvider = computed(() => connectionForm.provider === 'CLOUDFLARE');
const isSelectedCloudflare = computed(() => !!selection.connectionId && connectionById(selection.connectionId)?.provider === 'CLOUDFLARE');
const cloudflareUsageOptions = computed(() => usageOptions.value.filter(option => selectedProvider.value?.supportedPurposes.includes(option.value)));
const cloudflareExistingAssignment = computed(() => assignments.value.find(item => item.purpose === connectionForm.usageType));
const cloudflareCreateIncomplete = computed(() => isCloudflareProvider.value && !editingId.value && (!connectionForm.name.trim() || !connectionForm.accountId.trim() || !connectionForm.apiKey.trim() || !connectionForm.usageType || !connectionForm.modelId.trim() || !connectionForm.enabled));
const isCloudflareApiUrl = computed(() => {
  try { return new URL(connectionForm.apiBaseUrl.trim()).hostname === 'api.cloudflare.com'; }
  catch { return false; }
});
const providerOptions = computed(() => providers.value.map(item => ({ value: item.provider, label: item.displayName })));
const usageOptions = computed(() => usageTypes.value.map(item => ({ value: item.usageType, label: item.displayName })));
const currentAssignment = computed(() => assignments.value.find(item => item.purpose === selection.usageType));
const editingAssignments = computed(() => assignments.value.filter(item => item.connectionId === editingId.value));
const knownPurposes = computed(() => new Set(providers.value.flatMap(item => item.supportedPurposes)));
const usageSupportUnverified = computed(() => !!selection.usageType && !knownPurposes.value.has(selection.usageType));
const connectionOptions = computed(() => connections.value.filter(item => item.enabled && (!selection.usageType || usageSupportUnverified.value || providers.value.find(provider => provider.provider === item.provider)?.supportedPurposes.includes(selection.usageType))).map(item => ({ value: item.connectionId, label: `${item.name} · ${providerName(item.provider)}` })));
const assignmentRows = computed(() => usageTypes.value.map(item => assignments.value.find(assignment => assignment.purpose === item.usageType) || { purpose: item.usageType, connectionId: null, modelId: null, updatedAt: null }));
const connectionColumns = [
  { title: 'Connection', key: 'name', width: 320 }, { title: 'Status', key: 'enabled', width: 110 },
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
function assignmentsForConnection(id: string) { return assignments.value.filter(item => item.connectionId === id); }
function modelOptions(id: string) { return (models[id] || []).map(item => ({ value: item.modelId, label: `${item.displayName} (${item.modelId})` })); }

async function loadSettings() {
  if (!isAdmin.value) return;
  loading.value = true; pageError.value = '';
  try {
    const [providerList, usageList, connectionList, assignmentList] = await Promise.all([listModelProviders(), listModelUsageTypes(), listModelConnections(), listModelAssignments()]);
    providers.value = providerList; usageTypes.value = usageList; connections.value = connectionList; assignments.value = assignmentList;
    if (selection.connectionId && !connectionList.some(item => item.connectionId === selection.connectionId && item.enabled)) { selection.connectionId = undefined; selection.modelId = undefined; }
    selectOnlyAvailableConnection();
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 403) accessDenied.value = true;
    else pageError.value = getApiErrorMessage(error, 'Model settings could not be loaded.');
  } finally { loading.value = false; }
}
async function refreshAssignments() { assignments.value = await listModelAssignments(); }
function onUsageChange() {
  assignmentError.value = ''; assignmentMessage.value = '';
  if (selection.connectionId && !connectionOptions.value.some(item => item.value === selection.connectionId)) { selection.connectionId = undefined; selection.modelId = undefined; selection.manual = false; }
  else selection.modelId = assignments.value.find(item => item.purpose === selection.usageType && item.connectionId === selection.connectionId)?.modelId || undefined;
  selectOnlyAvailableConnection();
}
function selectOnlyAvailableConnection() {
  if (!selection.connectionId && connectionOptions.value.length === 1) {
    selection.connectionId = connectionOptions.value[0].value;
    onConnectionChange();
  }
}
function onConnectionChange() {
  selection.modelId = assignments.value.find(item => item.purpose === selection.usageType && item.connectionId === selection.connectionId)?.modelId || undefined;
  selection.manual = !!selection.modelId; assignmentError.value = ''; assignmentMessage.value = '';
}
function toggleManual() { selection.manual = !selection.manual; selection.modelId = undefined; }
async function selectAssignment(item: ModelAssignment) {
  formMode.value = 'existing'; editingId.value = null;
  selection.usageType = item.purpose;
  selection.connectionId = item.connectionId && connectionById(item.connectionId)?.enabled ? item.connectionId : undefined;
  selection.modelId = selection.connectionId ? item.modelId || undefined : undefined;
  selection.manual = !!selection.modelId;
  assignmentError.value = ''; assignmentMessage.value = '';
  scrollToConnectionForm();
}
function editConnectionModels(item: ModelConnection) {
  const assigned = assignments.value.find(row => row.connectionId === item.connectionId);
  formMode.value = 'existing'; editingId.value = null;
  selection.connectionId = item.enabled ? item.connectionId : undefined;
  selection.usageType = assigned?.purpose;
  selection.modelId = item.enabled ? assigned?.modelId || undefined : undefined;
  selection.manual = !!selection.modelId;
  assignmentError.value = item.enabled ? '' : 'Enable this connection before editing its model.';
  assignmentMessage.value = '';
  scrollToConnectionForm();
}
async function saveAssignment() {
  if (!selection.usageType) { assignmentError.value = 'Select a usage type.'; return; }
  if (!selection.connectionId) {
    assignmentError.value = !connections.value.some(item => item.enabled)
      ? 'Add and enable a provider connection first.'
      : connectionOptions.value.length === 0
        ? 'No enabled connection supports this usage type.'
        : 'Select an enabled connection from the Connection field.';
    return;
  }
  if (!connectionOptions.value.some(item => item.value === selection.connectionId)) { assignmentError.value = 'The selected connection is disabled or does not support this usage type. Choose another connection.'; return; }
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
function scrollToConnectionForm() { document.querySelector('.model-connection-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
function resetConnectionForm() { editingId.value = null; Object.assign(connectionForm, { name: '', provider: undefined, accountId: '', apiBaseUrl: '', apiKey: '', usageType: undefined, modelId: '', enabled: true }); formError.value = ''; editModelError.value = ''; editModelMessage.value = ''; }
function openCreate() { resetConnectionForm(); formMode.value = 'new'; scrollToConnectionForm(); }
function openEdit(item: ModelConnection, usage?: string) {
  const selected = usage ? assignments.value.find(row => row.connectionId === item.connectionId && row.purpose === usage) : undefined;
  originalEditApiKey.value = item.apiKey || '';
  Object.assign(editForm, { connectionId: item.connectionId, name: item.name, provider: item.provider, accountId: item.accountId || '', apiBaseUrl: item.apiBaseUrl || '', apiKey: item.apiKey || '', hasApiKey: item.hasApiKey, enabled: item.enabled, usageType: selected?.purpose, modelId: selected?.modelId || '' });
  editModalError.value = ''; editModalOpen.value = true;
}
function openAssignmentEdit(item: ModelAssignment) {
  const connection = item.connectionId ? connectionById(item.connectionId) : undefined;
  if (connection) openEdit(connection, item.purpose);
  else void selectAssignment(item);
}
async function saveEditModal() {
  const name = editForm.name.trim();
  const accountId = editForm.accountId.trim();
  const apiBaseUrl = editForm.apiBaseUrl.trim();
  const modelId = editForm.modelId.trim();
  if (!name || name.length > 100) { editModalError.value = 'Enter a connection name with 1–100 characters.'; return; }
  if (editForm.provider === 'CLOUDFLARE' && (!accountId || !/^[A-Za-z0-9_-]+$/.test(accountId))) { editModalError.value = 'Enter a valid Cloudflare Account ID.'; return; }
  if (providers.value.find(item => item.provider === editForm.provider)?.requiresApiKey && !editForm.apiKey.trim()) { editModalError.value = 'Enter an API token or key. The saved key cannot be cleared here.'; return; }
  const urlError = validateApiBaseUrl(apiBaseUrl);
  if (urlError) { editModalError.value = urlError; return; }
  if (editForm.usageType && (!modelId || modelId.length > 200)) { editModalError.value = 'Enter a model ID with 1–200 characters.'; return; }
  if (editForm.usageType && !editForm.enabled && modelId !== assignments.value.find(item => item.purpose === editForm.usageType)?.modelId) { editModalError.value = 'Enable the connection before changing its model ID.'; return; }
  savingEditModal.value = true; editModalError.value = '';
  let connectionSaved = false;
  try {
    const saved = await saveModelConnection({ name, provider: editForm.provider, accountId, apiBaseUrl, enabled: editForm.enabled, ...(editForm.apiKey.trim() && editForm.apiKey !== originalEditApiKey.value ? { apiKey: editForm.apiKey.trim() } : {}) }, editForm.connectionId);
    connectionSaved = true;
    connections.value = connections.value.map(item => item.connectionId === saved.connectionId ? saved : item);
    if (editForm.usageType && saved.enabled) {
      const assignment = await saveModelAssignment(editForm.usageType, saved.connectionId, modelId);
      assignments.value = assignments.value.map(item => item.purpose === assignment.purpose ? assignment : item);
    }
    connectionActionError.value = false; connectionActionMessage.value = 'Model configuration saved.';
    editModalOpen.value = false;
    await loadSettings();
  } catch (error) { editModalError.value = `${connectionSaved ? 'Connection settings were saved, but the model ID was not. ' : ''}${getApiErrorMessage(error, 'Changes could not be saved.')}`; }
  finally { savingEditModal.value = false; }
}
async function saveEditedModelId(usage: string) {
  const connectionId = editingId.value;
  if (!connectionId || !connectionById(connectionId)?.enabled) { editModelError.value = 'Enable this connection before changing a model ID.'; return; }
  const modelId = editModelIds[usage]?.trim();
  if (!modelId || modelId.length > 200) { editModelError.value = 'Enter a model ID with 1–200 characters.'; return; }
  if (!assignments.value.some(item => item.purpose === usage && item.connectionId === connectionId)) { editModelError.value = 'This model assignment changed. Refresh settings and try again.'; return; }
  savingEditModelUsage.value = usage; editModelError.value = ''; editModelMessage.value = '';
  try {
    const saved = await saveModelAssignment(usage, connectionId, modelId);
    assignments.value = [...assignments.value.filter(item => item.purpose !== usage), saved];
    if (selection.usageType === usage && selection.connectionId === connectionId) { selection.modelId = saved.modelId || undefined; selection.manual = true; }
    if (editingId.value === connectionId) { editModelIds[usage] = saved.modelId || ''; editModelMessage.value = `${usageName(usage)} model ID saved.`; }
    try { await refreshAssignments(); }
    catch { if (editingId.value === connectionId) editModelMessage.value = 'Model ID saved, but current selections could not be refreshed.'; }
  } catch (error) { if (editingId.value === connectionId) editModelError.value = getApiErrorMessage(error, 'Model ID could not be saved.'); }
  finally { savingEditModelUsage.value = ''; }
}
function validateApiBaseUrl(value: string) {
  if (!value) return '';
  if (value.length > 500) return 'API base URL must contain at most 500 characters.';
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password || value.includes('?') || value.includes('#')) return 'Enter an HTTP(S) base URL without credentials, query, or fragment.';
  } catch { return 'Enter a valid absolute HTTP(S) base URL.'; }
  return '';
}
async function saveConnection() {
  const name = connectionForm.name.trim();
  const accountId = connectionForm.accountId.trim();
  const apiBaseUrl = connectionForm.apiBaseUrl.trim();
  if (!name || name.length > 100) { formError.value = 'Name must contain 1–100 characters.'; return; }
  if (!connectionForm.provider) { formError.value = 'Choose a provider.'; return; }
  if (isCloudflareProvider.value && !accountId) { formError.value = 'Account ID is required for Cloudflare.'; return; }
  if (isCloudflareProvider.value && !/^[A-Za-z0-9_-]+$/.test(accountId)) { formError.value = 'Cloudflare Account ID may contain only letters, digits, underscores, and hyphens.'; return; }
  if (accountId.length > 200) { formError.value = 'Account ID must contain at most 200 characters.'; return; }
  const urlError = validateApiBaseUrl(apiBaseUrl);
  if (urlError) { formError.value = urlError; return; }
  if (!editingId.value && selectedProvider.value?.requiresApiKey && !connectionForm.apiKey.trim()) { formError.value = 'Enter an API key.'; return; }
  const cloudflareModelId = connectionForm.modelId.trim();
  if (!editingId.value) {
    if (!connectionForm.enabled) { formError.value = 'Enable the connection to save its model.'; return; }
    if (!connectionForm.usageType) { formError.value = 'Choose a usage type.'; return; }
    if (selectedProvider.value?.supportedPurposes.includes(connectionForm.usageType) === false && knownPurposes.value.has(connectionForm.usageType)) { formError.value = 'This provider does not support that usage type.'; return; }
    if (!cloudflareModelId || cloudflareModelId.length > 200) { formError.value = 'Enter a model ID with 1–200 characters.'; return; }
  }
  savingConnection.value = true; formError.value = '';
  try {
    const editedId = editingId.value;
    const previous = editedId ? connectionById(editedId) : undefined;
    const keyChanged = !!connectionForm.apiKey.trim();
    const saved = await saveModelConnection({
      name, provider: connectionForm.provider, enabled: connectionForm.enabled,
      ...(editedId || accountId ? { accountId } : {}),
      ...(editedId || apiBaseUrl ? { apiBaseUrl } : {}),
      ...(connectionForm.apiKey.trim() ? { apiKey: connectionForm.apiKey.trim() } : {}),
      ...(!editedId ? { usageType: connectionForm.usageType, modelId: cloudflareModelId } : {}),
    }, editedId || undefined);
    connections.value = [...connections.value.filter(item => item.connectionId !== saved.connectionId), saved];
    connectionActionError.value = false; connectionActionMessage.value = editedId ? 'Connection saved.' : 'Model saved.';
    if (!editedId && saved.enabled) {
      selection.usageType = connectionForm.usageType;
      selection.connectionId = saved.connectionId; selection.modelId = cloudflareModelId; selection.manual = true;
    }
    if (editedId && (previous?.apiBaseUrl !== saved.apiBaseUrl || keyChanged)) {
      delete models[saved.connectionId];
      if (selection.connectionId === saved.connectionId) { selection.modelId = undefined; selection.manual = false; }
      if (saved.enabled) void refreshModels(saved.connectionId);
    }
    if (editedId === selection.connectionId && !saved.enabled) { selection.connectionId = undefined; selection.modelId = undefined; }
    selectOnlyAvailableConnection();
    if (!editedId) {
      try { await refreshAssignments(); }
      catch { connectionActionError.value = true; connectionActionMessage.value = 'Cloudflare model saved, but current selections could not be refreshed. Refresh settings to reload them.'; }
    }
    resetConnectionForm();
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
