<script lang="ts" setup>
import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import { Alert, message, UploadDragger } from 'ant-design-vue';

import { importUsers } from '#/api/system/user-admin';
import { $t } from '#/locales';

const emits = defineEmits(['success']);

const fileList = ref<any[]>([]);
const uploading = ref(false);
const uploadResult = ref<{ success: boolean; message: string } | null>(null);

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    if (fileList.value.length === 0) {
      message.warning($t('system.user.pleaseSelectFile'));
      return;
    }

    const file = fileList.value[0];
    const formData = new FormData();
    formData.append('file', file.originFileObj || file);

    uploading.value = true;
    modalApi.lock();

    try {
      await importUsers(formData);
      uploadResult.value = {
        success: true,
        message: $t('system.user.importSuccess'),
      };
      message.success($t('system.user.importSuccess'));
      emits('success');
      // 延迟关闭，让用户看到结果
      setTimeout(() => {
        modalApi.close();
      }, 1500);
    } catch (error: any) {
      uploadResult.value = {
        success: false,
        message: error?.message || $t('system.user.importFailed'),
      };
      modalApi.unlock();
    } finally {
      uploading.value = false;
    }
  },

  onOpenChange(isOpen) {
    if (isOpen) {
      // 重置状态
      fileList.value = [];
      uploadResult.value = null;
    }
  },
});

/**
 * 文件选择前校验
 */
function handleBeforeUpload(file: any) {
  const isExcel =
    file.type ===
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.type === 'application/vnd.ms-excel' ||
    file.name.endsWith('.xlsx') ||
    file.name.endsWith('.xls');

  if (!isExcel) {
    message.error($t('system.user.onlyExcelAllowed'));
    return false;
  }

  const isLt10M = file.size / 1024 / 1024 < 10;
  if (!isLt10M) {
    message.error($t('system.user.fileSizeLimit'));
    return false;
  }

  // 只保留一个文件
  fileList.value = [file];
  return false; // 阻止自动上传
}

/**
 * 移除文件
 */
function handleRemove() {
  fileList.value = [];
}
</script>

<template>
  <Modal :title="$t('system.user.importUsers')">
    <div class="import-modal-content">
      <Alert
        class="mb-4"
        :message="$t('system.user.importTips')"
        :description="$t('system.user.importTipsDetail')"
        type="info"
        show-icon
      />

      <UploadDragger
        :file-list="fileList"
        :before-upload="handleBeforeUpload"
        :disabled="uploading"
        accept=".xlsx,.xls"
        @remove="handleRemove"
      >
        <p class="ant-upload-drag-icon">
          <IconifyIcon
            class="text-5xl text-blue-400"
            icon="ant-design:inbox-outlined"
          />
        </p>
        <p class="ant-upload-text">
          {{ $t('system.user.clickOrDragUpload') }}
        </p>
        <p class="ant-upload-hint">
          {{ $t('system.user.supportExcel') }}
        </p>
      </UploadDragger>

      <Alert
        v-if="uploadResult"
        class="mt-4"
        :message="uploadResult.message"
        :type="uploadResult.success ? 'success' : 'error'"
        show-icon
      />
    </div>
  </Modal>
</template>

<style scoped>
.import-modal-content {
  min-height: 200px;
}
</style>
