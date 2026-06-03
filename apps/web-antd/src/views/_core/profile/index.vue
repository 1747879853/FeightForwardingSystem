<script setup lang="ts">
import { computed, ref } from 'vue';

import { Profile } from '@vben/common-ui';
import { preferences } from '@vben/preferences';
import { useUserStore } from '@vben/stores';
import { VbenAvatar } from '@vben-core/shadcn-ui';

import { message } from 'ant-design-vue';

import { updateMyAvatarApi } from '#/api';
import { uploadFile } from '#/api/common/upload';
import { useAuthStore } from '#/store';
import { buildAttachmentUrl } from '#/utils';

import ProfileBase from './base-setting.vue';
import ProfilePasswordSetting from './password-setting.vue';

const authStore = useAuthStore();
const userStore = useUserStore();

const tabsValue = ref<string>('basic');
const avatarUploading = ref(false);
const avatarFileInputRef = ref<HTMLInputElement>();

const avatarSrc = computed(
  () => userStore.userInfo?.avatar ?? preferences.app.defaultAvatar,
);

const tabs = ref([
  {
    label: '个人信息',
    value: 'basic',
  },
  {
    label: '修改密码',
    value: 'password',
  },
]);

function triggerAvatarUpload() {
  if (avatarUploading.value) return;
  avatarFileInputRef.value?.click();
}

async function handleAvatarFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) return;
  if (!file.type.startsWith('image/')) {
    message.error('请上传图片文件');
    input.value = '';
    return;
  }

  avatarUploading.value = true;
  try {
    const formData = new FormData();
    formData.append('file', file);
    const uploadResult = await uploadFile(formData);
    const uploaded = uploadResult[0];
    if (!uploaded) {
      throw new Error('头像上传失败');
    }

    const avatarUrl = buildAttachmentUrl(uploaded.fileUrl || uploaded.filePath);
    await updateMyAvatarApi({ avatar: avatarUrl });
    await authStore.fetchUserInfo();
    message.success('头像更新成功');
  } catch (error) {
    console.error(error);
    message.error('头像更新失败，请重试');
  } finally {
    avatarUploading.value = false;
    input.value = '';
  }
}
</script>
<template>
  <Profile
    v-model:model-value="tabsValue"
    title="个人中心"
    :user-info="userStore.userInfo"
    :tabs="tabs"
  >
    <template #avatar>
      <button
        type="button"
        class="group relative block size-20 overflow-hidden rounded-full"
        :disabled="avatarUploading"
        @click="triggerAvatarUpload"
      >
        <VbenAvatar :src="avatarSrc" class="size-20" />
        <div
          class="absolute inset-0 flex items-center justify-center bg-black/45 px-1 text-center text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
        >
          {{ avatarUploading ? '上传中...' : '上传头像' }}
        </div>
      </button>
      <input
        ref="avatarFileInputRef"
        type="file"
        accept="image/*"
        class="hidden"
        @change="handleAvatarFileChange"
      />
    </template>
    <template #content>
      <ProfileBase v-if="tabsValue === 'basic'" />
      <ProfilePasswordSetting v-if="tabsValue === 'password'" />
    </template>
  </Profile>
</template>
