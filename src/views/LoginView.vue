<template>
  <main class="login-page">
    <section class="login-intro">
      <div class="login-logo">R</div><span class="eyebrow">RAG KNOWLEDGE WORKSPACE</span>
      <h1>Turn your documents into reliable knowledge.</h1>
      <p>Upload, preview, index, and manage source material from one focused workspace.</p>
    </section>
    <section class="login-panel">
      <a-card :bordered="false" class="login-card">
        <h2>Welcome back</h2><p class="muted">Sign in to continue to RAG Lab.</p>
        <a-alert v-if="loadError" :message="loadError" type="error" show-icon class="login-alert" />
        <a-form layout="vertical" :model="form" @finish="handleSubmit">
          <a-form-item label="Username" name="username" :rules="[{ required: true, message: 'Enter your username.' }]">
            <a-input v-model:value="form.username" size="large" autocomplete="username" />
          </a-form-item>
          <a-form-item label="Password" name="password" :rules="[{ required: true, message: 'Enter your password.' }]">
            <a-input-password v-model:value="form.password" size="large" autocomplete="current-password" />
          </a-form-item>
          <a-form-item label="Captcha" name="captchaCode" :rules="[{ required: true, message: 'Enter the captcha code.' }]">
            <div class="captcha-row">
              <a-input v-model:value="form.captchaCode" size="large" maxlength="4" autocomplete="off" />
              <button type="button" class="captcha-image" title="Refresh captcha" @click="loadCaptcha">
                <img v-if="captcha?.imageDataUri" :src="captcha.imageDataUri" alt="Captcha" /><ReloadOutlined v-else />
              </button>
            </div>
          </a-form-item>
          <a-button type="primary" html-type="submit" size="large" block :loading="submitting">Sign in</a-button>
        </a-form>
      </a-card>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ReloadOutlined } from '@ant-design/icons-vue';
import { getCaptcha } from '@/api/auth';
import type { CaptchaResult } from '@/api/auth';
import { useAuthStore } from '@/stores/auth';
import { getApiErrorMessage } from '@/utils/http';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const captcha = ref<CaptchaResult | null>(null);
const submitting = ref(false);
const loadError = ref('');
const form = reactive({ username: '', password: '', captchaCode: '' });

async function loadCaptcha() {
  try {
    loadError.value = '';
    captcha.value = await getCaptcha();
    form.captchaCode = '';
  } catch (error) {
    loadError.value = getApiErrorMessage(error, 'The captcha could not be loaded.');
  }
}

async function handleSubmit() {
  if (!captcha.value) return loadCaptcha();
  submitting.value = true;
  loadError.value = '';
  try {
    await auth.signIn({ ...form, captchaId: captcha.value.captchaId });
    await router.replace(typeof route.query.redirect === 'string' ? route.query.redirect : '/');
  } catch (error) {
    loadError.value = getApiErrorMessage(error, 'Sign-in failed.');
    await loadCaptcha();
  } finally {
    submitting.value = false;
  }
}

onMounted(loadCaptcha);
</script>
