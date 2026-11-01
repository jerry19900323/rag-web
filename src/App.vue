<template>
  <a-config-provider :theme="themeConfig">
    <router-view />
  </a-config-provider>
</template>

<script setup lang="ts">
import type { ThemeConfig } from 'ant-design-vue/es/config-provider/context';

const themeConfig: ThemeConfig = {
  token: {
    colorPrimary: '#2563eb',
    borderRadius: 8,
    fontFamily: "Inter, 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
};
</script>
