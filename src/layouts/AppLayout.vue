<template>
  <a-layout class="app-shell">
    <a-layout-sider v-model:collapsed="appStore.collapsed" collapsible :width="228" class="sidebar">
      <div class="brand"><div class="brand-mark">R</div><span v-if="!appStore.collapsed">RAG Lab</span></div>
      <a-menu theme="dark" mode="inline" :selected-keys="selectedKeys" @click="navigate">
        <a-menu-item key="home"><template #icon><DashboardOutlined /></template>Dashboard</a-menu-item>
        <a-menu-item key="documents"><template #icon><FileTextOutlined /></template>Documents</a-menu-item>
        <a-menu-item key="search"><template #icon><SearchOutlined /></template>Search passages</a-menu-item>
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
      <a-layout-content class="content"><router-view /></a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { MenuProps } from 'ant-design-vue';
import { CloudUploadOutlined, DashboardOutlined, DownOutlined, FileTextOutlined, GlobalOutlined, LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined, SearchOutlined, SettingOutlined } from '@ant-design/icons-vue';
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const auth = useAuthStore();
const selectedKeys = computed(() => [route.name === 'document-detail' ? 'documents' : String(route.name)]);
const avatarText = computed(() => (auth.user?.displayName || auth.user?.username || 'A').slice(0, 1).toUpperCase());
const navigate: MenuProps['onClick'] = ({ key }) => void router.push({ name: String(key) });

async function handleLogout() {
  await auth.signOut();
  await router.replace({ name: 'login' });
}
</script>
