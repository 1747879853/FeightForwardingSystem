<script lang="ts" setup>
import { ref, watch } from 'vue';
import { IconifyIcon } from '@vben/icons';
import { $t } from '#/locales';
import { Modal, message, Button } from 'ant-design-vue';
import type { Attachment } from '#/api/common/upload';
import { uploadFile, mapResultToAttachment } from '#/api/common/upload';

interface Props {
  /** 弹窗显示状态 */
  visible: boolean;
  /** 客户ID */
  clientId?: string;
  /** 最大上传数量 */
  maxCount?: number;
  /** 最大文件大小(MB) */
  maxSizeMB?: number;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  clientId: '',
  maxCount: 20,
  maxSizeMB: 10,
});

const emit = defineEmits<{
  'update:visible': [value: boolean];
  success: [];
}>();

// 内部弹窗显示状态
const innerVisible = ref(false);
// 临时附件列表
const tempAttachments = ref<Attachment[]>([]);
// 提交状态
const submitting = ref(false);
// 正在上传的文件UID集合
const uploadingUids = ref<Set<string>>(new Set());
// 文件输入引用
const fileInput = ref<HTMLInputElement>();

// 允许的文件类型
const allowedTypes = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.bmp',
];

// 同步外部visible到内部
watch(
  () => props.visible,
  (val) => {
    innerVisible.value = val;
    if (val) {
      // 打开弹窗时重置数据
      tempAttachments.value = [];
      uploadingUids.value.clear();
    }
  },
  { immediate: true },
);

// 同步内部visible到外部
watch(innerVisible, (val) => {
  emit('update:visible', val);
});

/**
 * 检查文件类型是否允许
 */
const isAllowedType = (file: File): boolean => {
  const fileName = file.name.toLowerCase();
  const ext = fileName.split('.').pop() || '';

  return allowedTypes.some((allowed) => {
    const allowedLower = allowed.toLowerCase();
    if (allowedLower.startsWith('.')) {
      return `.${ext}` === allowedLower;
    }
    return ext === allowedLower;
  });
};

/**
 * 检查文件大小是否允许
 */
const isAllowedSize = (file: File): boolean => {
  const sizeMB = file.size / 1024 / 1024;
  return sizeMB <= props.maxSizeMB;
};

/**
 * 处理文件上传
 */
const handleCustomUpload = async (file: File) => {
  // 验证文件类型
  if (!isAllowedType(file)) {
    message.error($t('component.fileUpload.typeNotAllowed'));
    return;
  }

  // 验证文件大小
  if (!isAllowedSize(file)) {
    message.error($t('component.fileUpload.sizeExceeded', [props.maxSizeMB]));
    return;
  }

  // 检查数量限制
  if (tempAttachments.value.length >= props.maxCount) {
    message.warning(
      $t('component.fileUpload.maxCountExceeded', [props.maxCount]),
    );
    return;
  }

  const uid = `${Date.now()}-${Math.random()}`;
  uploadingUids.value.add(uid);

  try {
    const formData = new FormData();
    formData.append('file', file);

    const resultList = await uploadFile(formData);

    // 接口返回的是数组，取第一个结果
    if (resultList && resultList.length > 0) {
      const result = resultList[0];
      if (result) {
        const attachment = mapResultToAttachment(result);
        tempAttachments.value.push(attachment);
        message.success($t('component.fileUpload.uploadSuccess'));
      }
    } else {
      message.error($t('component.fileUpload.uploadFailed'));
    }
  } catch (error: any) {
    console.error('Upload failed:', error);
    message.error($t('component.fileUpload.uploadFailed'));
  } finally {
    uploadingUids.value.delete(uid);
  }
};

/**
 * 处理拖拽区域的文件放置
 */
const handleDrop = async (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();

  const files = e.dataTransfer?.files;
  if (!files || files.length === 0) return;

  submitting.value = true;

  // 逐个处理文件
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file) {
      await handleCustomUpload(file);
    }
  }

  submitting.value = false;
};

/**
 * 处理文件选择（通过点击）
 */
const handleFileSelect = async (e: Event) => {
  const target = e.target as HTMLInputElement;
  const files = target.files;
  if (!files || files.length === 0) return;

  submitting.value = true;

  // 逐个处理文件
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file) {
      await handleCustomUpload(file);
    }
  }

  submitting.value = false;
  // 清空input，允许重复选择同一文件
  target.value = '';
};

/**
 * 触发文件选择
 */
const triggerFileSelect = () => {
  fileInput.value?.click();
};

/**
 * 处理取消
 */
const handleCancel = () => {
  innerVisible.value = false;
};

/**
 * 确认上传
 */
const handleConfirm = async () => {
  if (tempAttachments.value.length === 0) {
    message.warning('请选择要上传的文件');
    return;
  }

  try {
    submitting.value = true;
    // 通知父组件上传成功，由父组件处理后续逻辑
    emit('success');
    innerVisible.value = false;
  } catch (error) {
    console.error('上传失败:', error);
    message.error($t('common.uploadFailed'));
  } finally {
    submitting.value = false;
  }
};

/**
 * 删除文件
 */
const handleRemove = (index: number) => {
  tempAttachments.value.splice(index, 1);
};

/**
 * 暴露方法给父组件
 */
defineExpose({
  /** 获取当前附件列表 */
  getAttachments: () => [...tempAttachments.value],
  /** 清空附件 */
  clear: () => {
    tempAttachments.value = [];
  },
});
</script>

<template>
  <Modal
    v-model:open="innerVisible"
    :title="$t('client.attachment.uploadTitle')"
    :confirm-loading="submitting"
    width="700px"
    @ok="handleConfirm"
    @cancel="handleCancel"
  >
    <div class="py-4">
      <!-- 拖拽上传区域 -->
      <div
        class="upload-dragger"
        :class="{ 'upload-dragger-disabled': submitting }"
        @dragover.prevent
        @dragenter.prevent
        @drop="handleDrop"
        @click="triggerFileSelect"
      >
        <input
          ref="fileInput"
          type="file"
          multiple
          :accept="allowedTypes.join(',')"
          style="display: none"
          @change="handleFileSelect"
        />
        <p class="upload-dragger-icon">
          <IconifyIcon
            icon="mdi:cloud-upload-outline"
            class="text-4xl text-blue-500"
          />
        </p>
        <p class="upload-dragger-text">{{ '点击或拖拽文件到此区域上传' }}</p>
        <p class="upload-dragger-hint">
          {{ $t('client.attachment.uploadTip') }}
        </p>
      </div>

      <!-- 已上传文件列表预览 -->
      <div v-if="tempAttachments.length > 0" class="mt-4">
        <div class="mb-2 text-sm font-medium text-gray-700">
          {{ '已选择文件' }} ({{ tempAttachments.length }})
        </div>
        <div
          class="max-h-60 overflow-y-auto rounded border border-gray-200 p-2"
        >
          <div
            v-for="(file, index) in tempAttachments"
            :key="file.attachmentId"
            class="flex items-center justify-between rounded px-2 py-1.5 hover:bg-gray-50"
          >
            <div class="flex min-w-0 flex-1 items-center gap-2">
              <IconifyIcon
                :icon="
                  file.fileName?.match(/\.(pdf|doc|docx)$/i)
                    ? 'mdi:file-document-outline'
                    : file.fileName?.match(/\.(xls|xlsx)$/i)
                      ? 'mdi:file-excel-outline'
                      : 'mdi:file-image-outline'
                "
                class="flex-shrink-0 text-gray-400"
              />
              <span
                class="truncate text-sm"
                :title="file.friendlyFileName || file.fileName"
              >
                {{ file.friendlyFileName || file.fileName }}
              </span>
            </div>
            <Button
              type="text"
              danger
              size="small"
              :disabled="submitting"
              @click="handleRemove(index)"
            >
              <IconifyIcon icon="mdi:close" class="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  </Modal>
</template>

<style scoped lang="scss">
.upload-dragger {
  padding: 20px;
  text-align: center;
  cursor: pointer;
  background-color: #fafafa;
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  transition: all 0.3s;

  &:hover {
    background-color: #f0f9ff;
    border-color: #40a9ff;
  }

  &-disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
}

.upload-dragger-icon {
  margin-bottom: 16px;
}

.upload-dragger-text {
  margin-bottom: 8px;
  font-size: 16px;
  color: rgb(0 0 0 / 85%);
}

.upload-dragger-hint {
  font-size: 14px;
  color: rgb(0 0 0 / 45%);
}
</style>
