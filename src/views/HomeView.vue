<template>
  <section class="welcome">
    <div><span class="eyebrow">RAG KNOWLEDGE WORKSPACE</span><h1>Welcome to RAG Lab</h1><p>Monitor services and manage the document indexing lifecycle.</p></div>
    <a-button type="primary" @click="$router.push({ name: 'document-upload' })"><CloudUploadOutlined /> Upload document</a-button>
  </section>
  <a-row :gutter="[16, 16]" class="stats">
    <a-col v-for="item in services" :key="item.name" :xs="24" :sm="12" :xl="6">
      <a-card :bordered="false" :loading="loading">
        <div class="health-card"><span><span :class="['status-dot', item.state]" />{{ item.name }}</span><a-tag :color="statusColor(item.state)">{{ statusText(item.state) }}</a-tag></div>
        <p>{{ item.description }}</p>
      </a-card>
    </a-col>
  </a-row>
  <a-card title="Quick actions" :bordered="false">
    <div class="quick-actions">
      <button type="button" @click="$router.push({ name: 'document-upload' })"><CloudUploadOutlined /><span><strong>Upload and publish</strong><small>Preview chunks before publishing to the knowledge base.</small></span></button>
      <button type="button" @click="$router.push({ name: 'documents' })"><FileSearchOutlined /><span><strong>Browse documents</strong><small>Review metadata and ingestion history.</small></span></button>
      <button type="button" @click="$router.push({ name: 'search' })"><SearchOutlined /><span><strong>Search passages</strong><small>Find matching text across indexed documents.</small></span></button>
      <button type="button" @click="loadHealth"><ReloadOutlined /><span><strong>Refresh health</strong><small>Check all backend dependencies again.</small></span></button>
    </div>
  </a-card>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { CloudUploadOutlined, FileSearchOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue';
import { getApplicationHealth, getElasticsearchHealth, getInfrastructureHealth } from '@/api/health';

type State = 'idle' | 'up' | 'down';
const loading = ref(false);
const services = reactive([
  { name: 'Application', description: 'API liveness', state: 'idle' as State },
  { name: 'Elasticsearch', description: 'Search index readiness', state: 'idle' as State },
  { name: 'MySQL', description: 'Metadata persistence', state: 'idle' as State },
  { name: 'Redis', description: 'Sessions and indexing locks', state: 'idle' as State },
]);

const toState = (status?: string): State => status === 'UP' ? 'up' : 'down';
const statusColor = (state: State) => ({ idle: 'default', up: 'success', down: 'error' })[state];
const statusText = (state: State) => ({ idle: 'Not checked', up: 'Available', down: 'Unavailable' })[state];

async function loadHealth() {
  loading.value = true;
  const [app, elasticsearch, infrastructure] = await Promise.allSettled([getApplicationHealth(), getElasticsearchHealth(), getInfrastructureHealth()]);
  services[0].state = app.status === 'fulfilled' ? toState(app.value.status) : 'down';
  services[1].state = elasticsearch.status === 'fulfilled' ? toState(elasticsearch.value.status) : 'down';
  services[2].state = infrastructure.status === 'fulfilled' ? toState(infrastructure.value.components.mysql.status) : 'down';
  services[3].state = infrastructure.status === 'fulfilled' ? toState(infrastructure.value.components.redis.status) : 'down';
  loading.value = false;
}

onMounted(loadHealth);
</script>
