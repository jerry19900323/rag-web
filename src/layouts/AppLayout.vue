<template>
  <a-layout class="app-shell">
    <a-layout-sider v-model:collapsed="appStore.collapsed" collapsible :width="228" class="sidebar">
      <div class="brand"><div class="brand-mark">R</div><span v-if="!appStore.collapsed">RAG Lab</span></div>
      <a-menu theme="dark" mode="inline" :selected-keys="selectedKeys" @click="navigate">
        <a-menu-item key="home"><template #icon><DashboardOutlined /></template>Dashboard</a-menu-item>
        <a-menu-item key="documents"><template #icon><FileTextOutlined /></template>Documents</a-menu-item>
        <a-menu-item key="search"><template #icon><SearchOutlined /></template>Search passages</a-menu-item>
        <a-menu-item key="ask"><template #icon><CommentOutlined /></template>Ask a question</a-menu-item>
        <a-menu-item key="document-upload"><template #icon><CloudUploadOutlined /></template>Upload</a-menu-item>
        <a-menu-item key="web-page-import"><template #icon><GlobalOutlined /></template>Import web pages</a-menu-item>
        <a-menu-item v-if="auth.user?.role === 'ADMIN'" key="model-settings"><template #icon><SettingOutlined /></template>Model settings</a-menu-item>
      </a-menu>
    </a-layout-sider>
    <a-layout>
      <a-layout-header class="header">
        <a-button type="text" class="collapse-button" @click="appStore.toggleCollapsed">
          <MenuUnfoldOutlined v-if="appStore.collapsed" /><MenuFoldOutlined v-else />
        </a-button>
        <a-dropdown>
          <button class="user-menu" type="button">
            <a-avatar size="small">{{ avatarText }}</a-avatar><span>{{ auth.user?.displayName || auth.user?.username }}</span><DownOutlined />
          </button>
          <template #overlay><a-menu><a-menu-item key="logout" @click="handleLogout"><LogoutOutlined /> Sign out</a-menu-item></a-menu></template>
        </a-dropdown>
      </a-layout-header>
      <a-layout-content class="content">
        <nav class="page-tabs" aria-label="Open pages">
          <div v-for="tab in visitedTabs" :key="tab.key" class="page-tab" :class="{ active: currentTabKey === tab.key }">
            <button type="button" class="page-tab-link" @click="router.push(tab.path)">{{ tab.title }}</button>
            <button v-if="tab.key !== '/' || visitedTabs.length > 1" type="button" class="page-tab-close" :aria-label="`Close ${tab.title}`" @click="closeTab(tab.key)">×</button>
          </div>
        </nav>
        <router-view v-slot="{ Component, route: viewRoute }"><keep-alive :include="visitedTabs.some(tab => tab.key === 'ask') ? ['AskView'] : []"><component :is="Component" :key="viewRoute.name === 'ask' ? 'ask' : viewRoute.fullPath" /></keep-alive></router-view>
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { MenuProps } from 'ant-design-vue';
import { CloudUploadOutlined, CommentOutlined, DashboardOutlined, DownOutlined, FileTextOutlined, GlobalOutlined, LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined, SearchOutlined, SettingOutlined } from '@ant-design/icons-vue';
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const auth = useAuthStore();
const selectedKeys = computed(() => [route.name === 'document-detail' ? 'documents' : String(route.name)]);
const visitedTabs = ref<{ key: string; path: string; title: string }[]>([]);
const currentTabKey = computed(() => String(route.name || route.path));
watch(() => route.fullPath, () => {
  const path = route.fullPath;
  const key = currentTabKey.value;
  const existing = visitedTabs.value.find(tab => tab.key === key);
  if (existing) existing.path = path;
  else visitedTabs.value.push({ key, path, title: String(route.meta.title || 'Page') });
}, { immediate: true });
const avatarText = computed(() => (auth.user?.displayName || auth.user?.username || 'A').slice(0, 1).toUpperCase());
const navigate: MenuProps['onClick'] = ({ key }) => void router.push({ name: String(key) });
async function closeTab(key: string) {
  const tab = visitedTabs.value.find(item => item.key === key);
  if (!tab) return;
  if (currentTabKey.value === key) {
    const other = visitedTabs.value.filter(item => item.key !== key).at(-1);
    if (!other && key === 'home') return;
    await router.push(other?.path || '/');
  }
  visitedTabs.value = visitedTabs.value.filter(item => item.key !== key);
}

async function handleLogout() {
  await auth.signOut();
  await router.replace({ name: 'login' });
}
</script>
