<script lang="ts" setup>
import type {
  UploadChangeParam,
  UploadFile,
  UploadProps,
} from 'ant-design-vue';

import type { Attachment } from '#/api/common/upload';

import { computed, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';
import { $t } from '@vben/locales';

import {
  Button,
  Image,
  message,
  Modal,
  Spin,
  Tooltip,
  Upload,
  UploadDragger,
} from 'ant-design-vue';

import { mapResultToAttachment, uploadFile } from '#/api/common/upload';
import { buildAttachmentUrl } from '#/utils';

/** 图片文件扩展名集合 */
const IMAGE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'bmp',
  'webp',
  'svg',
  'ico',
]);

interface Props {
  /** 允许的文件类型（扩展名或 MIME 类型），空数组表示不限 */
  allowedTypes?: string[];
  /** 是否禁用 */
  disabled?: boolean;
  /** FormData 文件字段名 */
  fieldName?: string;
  /** 友好文件名（仅供 UI 显示使用） */
  friendlyFileName?: string;
  /**
   * 列表展示样式：
   * - text：按钮 + 文件名列表（默认，附件场景）
   * - picture / picture-card：缩略图预览（Logo/头像等）
   */
  listType?: UploadProps['listType'];
  /** 最大文件数量 */
  maxCount?: number;
  /** 最大文件大小（MB） */
  maxSizeMB?: number;
  /** 绑定值 */
  modelValue?: Attachment[];
  /** 是否启用拖拽上传 */
  drag?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  allowedTypes: () => [],
  disabled: false,
  fieldName: 'file',
  friendlyFileName: '',
  listType: 'text',
  maxCount: Number.POSITIVE_INFINITY,
  maxSizeMB: 20,
  modelValue: undefined,
  drag: false,
});

const emit = defineEmits<{
  change: [value: Attachment[]];
  'update:modelValue': [value: Attachment[]];
}>();

/** 内部附件列表 */
const innerValue = ref<Attachment[]>([]);

/** 正在上传的文件 uid 集合 */
const uploadingUids = ref<Set<string>>(new Set());

/** 图片预览弹窗是否显示 */
const previewVisible = ref(false);

/** 当前预览的图片 URL */
const previewImageUrl = ref('');

/** 是否正在上传 */
const isUploading = computed(() => uploadingUids.value.size > 0);

/** 是否达到最大数量 */
const isMaxCount = computed(() => innerValue.value.length >= props.maxCount);

/** 是否以缩略图卡片形式展示（Logo/头像） */
const isPictureCard = computed(() => props.listType === 'picture-card');

/** 用于 Upload 组件展示的 fileList */
const fileList = computed<UploadProps['fileList']>(() =>
  innerValue.value.map((attachment) => {
    const fullUrl = attachment.url
      ? buildAttachmentUrl(attachment.url)
      : undefined;
    return {
      uid: String(attachment.attachmentId),
      name: (attachment.fileName || attachment.friendlyFileName) ?? '',
      status: 'done' as const,
      url: fullUrl,
      thumbUrl: fullUrl,
    };
  }),
);

/** 初始化/同步 modelValue */
const normalizeValue = (value: Attachment[] | undefined): Attachment[] => {
  if (!value) return [];
  if (Array.isArray(value)) return [...value];
  return [];
};

watch(
  () => props.modelValue,
  (newVal) => {
    innerValue.value = normalizeValue(newVal);
  },
  { immediate: true, deep: true },
);

/** 发送更新事件 */
const emitUpdate = () => {
  const value = innerValue.value.length > 0 ? [...innerValue.value] : [];
  emit('update:modelValue', value);
  emit('change', value);
};

/** 检查文件类型是否允许 */
const isAllowedType = (file: File): boolean => {
  if (props.allowedTypes.length === 0) return true;

  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();
  const ext = fileName.split('.').pop() || '';

  return props.allowedTypes.some((allowed) => {
    const allowedLower = allowed.toLowerCase();
    // 匹配扩展名（带或不带点）
    if (allowedLower.startsWith('.')) {
      return `.${ext}` === allowedLower;
    }
    // 匹配 MIME 类型
    if (allowedLower.includes('/')) {
      return fileType === allowedLower;
    }
    // 匹配纯扩展名
    return ext === allowedLower;
  });
};

/** 检查文件大小是否允许 */
const isAllowedSize = (file: File): boolean => {
  const sizeMB = file.size / 1024 / 1024;
  return sizeMB <= props.maxSizeMB;
};

/** 自定义上传处理 */
const handleBeforeUpload = async (
  file: UploadFile,
  _fileList: UploadFile[],
): Promise<false> => {
  // 禁用时不处理
  if (props.disabled) return false;

  // 达到最大数量时不处理
  if (isMaxCount.value) {
    message.warning(
      $t('component.fileUpload.maxCountExceeded', [props.maxCount]),
    );
    return false;
  }

  const rawFile = file as unknown as File;

  // 验证文件类型
  if (!isAllowedType(rawFile)) {
    message.error($t('component.fileUpload.typeNotAllowed'));
    return false;
  }

  // 验证文件大小
  if (!isAllowedSize(rawFile)) {
    message.error($t('component.fileUpload.sizeExceeded', [props.maxSizeMB]));
    return false;
  }

  // 开始上传
  const uid = file.uid || `${Date.now()}`;
  uploadingUids.value.add(uid);

  try {
    const formData = new FormData();
    formData.append(props.fieldName, rawFile);

    const resultList = await uploadFile(formData);

    // 接口返回的是数组，取第一个结果
    if (resultList && resultList.length > 0) {
      const resultItem = resultList[0];
      if (resultItem) {
        const attachment = mapResultToAttachment(resultItem);
        innerValue.value.push(attachment);
        emitUpdate();
        message.success($t('component.fileUpload.uploadSuccess'));
      } else {
        message.error($t('component.fileUpload.uploadFailed'));
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

  // 返回 false 阻止 antd 默认上传行为
  return false;
};

/** 处理文件删除 */
const handleRemove = (file: Pick<UploadFile, 'uid'>): boolean => {
  if (props.disabled) return false;

  innerValue.value = innerValue.value.filter(
    (item) => String(item.attachmentId) !== file.uid,
  );
  emitUpdate();
  return true;
};

/** 判断文件是否为图片类型（文件名或 URL 扩展名均可） */
const isImageFile = (fileName?: null | string): boolean => {
  if (!fileName) return false;
  const ext = fileName.split('.').pop()?.split('?')[0]?.toLowerCase() || '';
  return IMAGE_EXTENSIONS.has(ext);
};

/** 处理文件预览 */
const handlePreview = (file: UploadFile) => {
  const attachment = innerValue.value.find(
    (item) => String(item.attachmentId) === file.uid,
  );

  if (attachment?.url) {
    const fullUrl = buildAttachmentUrl(attachment.url);

    // picture-card / 图片扩展名：弹窗预览；编辑回显文件名可能没有扩展名
    if (
      isPictureCard.value ||
      isImageFile(attachment.fileName) ||
      isImageFile(attachment.url)
    ) {
      previewImageUrl.value = fullUrl;
      previewVisible.value = true;
    } else {
      window.open(fullUrl, '_blank');
    }
  } else {
    message.warning($t('component.fileUpload.previewFailed'));
  }
};

/** 关闭图片预览弹窗 */
const handlePreviewClose = () => {
  previewVisible.value = false;
  previewImageUrl.value = '';
};

/** 处理 fileList 变化（主要用于删除操作） */
const handleChange = (info: UploadChangeParam) => {
  // 如果是删除操作，fileList 会自动更新
  // 但我们使用 handleRemove 来处理删除逻辑
  if (info.file.status === 'removed') {
    // 已在 handleRemove 中处理
  }
};

/** 处理拖拽区域的文件放置 */
const handleDrop = async (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();

  if (props.disabled || isMaxCount.value) {
    return;
  }

  const files = e.dataTransfer?.files;
  if (!files || files.length === 0) return;

  // 逐个处理文件
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file) {
      // 检查是否达到最大数量
      if (innerValue.value.length >= props.maxCount) {
        message.warning(
          $t('component.fileUpload.maxCountExceeded', [props.maxCount]),
        );
        break;
      }

      // 验证文件类型
      if (!isAllowedType(file)) {
        message.error($t('component.fileUpload.typeNotAllowed'));
        continue;
      }

      // 验证文件大小
      if (!isAllowedSize(file)) {
        message.error(
          $t('component.fileUpload.sizeExceeded', [props.maxSizeMB]),
        );
        continue;
      }

      // 开始上传
      const uid = `${Date.now()}-${i}`;
      uploadingUids.value.add(uid);

      try {
        const formData = new FormData();
        formData.append(props.fieldName, file);

        const resultList = await uploadFile(formData);

        // 接口返回的是数组，取第一个结果
        if (resultList && resultList.length > 0) {
          const resultItem = resultList[0];
          if (resultItem) {
            const attachment = mapResultToAttachment(resultItem);
            innerValue.value.push(attachment);
            emitUpdate();
            message.success($t('component.fileUpload.uploadSuccess'));
          } else {
            message.error($t('component.fileUpload.uploadFailed'));
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
    }
  }
};

/** 处理文件选择（通过点击） */
const handleFileSelect = async (e: Event) => {
  const target = e.target as HTMLInputElement;
  const files = target.files;
  if (!files || files.length === 0) return;

  if (props.disabled || isMaxCount.value) {
    return;
  }

  // 逐个处理文件
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file) {
      // 检查是否达到最大数量
      if (innerValue.value.length >= props.maxCount) {
        message.warning(
          $t('component.fileUpload.maxCountExceeded', [props.maxCount]),
        );
        break;
      }

      // 验证文件类型
      if (!isAllowedType(file)) {
        message.error($t('component.fileUpload.typeNotAllowed'));
        continue;
      }

      // 验证文件大小
      if (!isAllowedSize(file)) {
        message.error(
          $t('component.fileUpload.sizeExceeded', [props.maxSizeMB]),
        );
        continue;
      }

      // 开始上传
      const uid = `${Date.now()}-${i}`;
      uploadingUids.value.add(uid);

      try {
        const formData = new FormData();
        formData.append(props.fieldName, file);

        const resultList = await uploadFile(formData);

        // 接口返回的是数组，取第一个结果
        if (resultList && resultList.length > 0) {
          const resultItem = resultList[0];
          if (resultItem) {
            const attachment = mapResultToAttachment(resultItem);
            innerValue.value.push(attachment);
            emitUpdate();
            message.success($t('component.fileUpload.uploadSuccess'));
          } else {
            message.error($t('component.fileUpload.uploadFailed'));
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
    }
  }

  // 清空input，允许重复选择同一文件
  target.value = '';
};

/** 触发文件选择 */
const triggerFileSelect = () => {
  if (props.disabled || isMaxCount.value) {
    return;
  }
  fileInput.value?.click();
};

/** 文件输入引用 */
const fileInput = ref<HTMLInputElement>();

/** 暴露方法 */
defineExpose({
  /** 获取当前附件列表 */
  getAttachments: () => [...innerValue.value],
  /** 清空附件列表 */
  clear: () => {
    innerValue.value = [];
    emitUpdate();
  },
});
</script>

<template>
  <div
    class="file-upload-input"
    :class="{ 'file-upload-input--card': isPictureCard }"
  >
    <!-- 拖拽上传模式 -->
    <template v-if="drag && !disabled">
      <div
        class="upload-dragger"
        :class="{ 'upload-dragger-disabled': isUploading || isMaxCount }"
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
        <p class="upload-dragger-text">
          {{
            $t('component.fileUpload.dragTip') || '点击或拖拽文件到此区域上传'
          }}
        </p>
        <p class="upload-dragger-hint">
          {{ $t('component.fileUpload.dragHint') || '支持多文件上传' }}
        </p>
      </div>
    </template>

    <!-- 传统按钮上传模式 -->
    <Upload
      v-else
      :file-list="fileList"
      :list-type="listType"
      :disabled="disabled"
      :before-upload="handleBeforeUpload"
      :show-upload-list="{
        showPreviewIcon: true,
        showRemoveIcon: !disabled,
        showDownloadIcon: false,
      }"
      @change="handleChange"
      @remove="handleRemove"
      @preview="handlePreview"
      v-bind="$attrs"
    >
      <div
        v-if="isPictureCard && !isMaxCount && !disabled"
        class="file-upload-card-trigger"
      >
        <Spin v-if="isUploading" size="small" />
        <template v-else>
          <IconifyIcon icon="ant-design:plus-outlined" class="size-5" />
          <div class="mt-1 text-xs">
            {{ $t('component.fileUpload.selectFile') }}
          </div>
        </template>
      </div>
      <Tooltip
        v-else-if="!isPictureCard && isMaxCount && !disabled"
        :title="$t('component.fileUpload.maxCountReached')"
      >
        <Button :disabled="true">
          <template #icon>
            <IconifyIcon icon="ant-design:upload-outlined" class="size-4" />
          </template>
          {{ $t('component.fileUpload.selectFile') }}
        </Button>
      </Tooltip>
      <Button v-else-if="!isPictureCard && !disabled" :loading="isUploading">
        <template #icon>
          <Spin v-if="isUploading" size="small" />
          <IconifyIcon
            v-else
            icon="ant-design:upload-outlined"
            class="size-4"
          />
        </template>
        {{
          isUploading
            ? $t('component.fileUpload.uploading')
            : $t('component.fileUpload.selectFile')
        }}
      </Button>
    </Upload>

    <!-- 已上传文件列表：picture-card 已用缩略图预览，不再重复列文件名 -->
    <div v-if="innerValue.length > 0 && !isPictureCard" class="mt-4">
      <div class="mb-2 text-sm font-medium text-gray-700">
        {{ $t('component.fileUpload.uploadedFiles') || '已上传文件' }} ({{
          innerValue.length
        }})
      </div>
      <div class="max-h-20 overflow-y-auto rounded border border-gray-200 p-2">
        <div
          v-for="file in innerValue"
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
                    : isImageFile(file.fileName)
                      ? 'mdi:file-image-outline'
                      : 'mdi:file-outline'
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
            v-if="!disabled"
            type="text"
            danger
            size="small"
            @click="handleRemove({ uid: String(file.attachmentId) })"
          >
            <IconifyIcon icon="mdi:close" class="size-4" />
          </Button>
        </div>
      </div>
    </div>

    <div v-if="!disabled && !drag" class="mt-1 text-xs text-gray-400">
      <span v-if="allowedTypes.length > 0">
        {{ $t('component.fileUpload.allowedTypes') }}:
        {{ allowedTypes.join(', ') }}
      </span>
      <span v-if="allowedTypes.length > 0" class="mx-2">|</span>
      <span>{{ $t('component.fileUpload.maxSize') }}: {{ maxSizeMB }}MB</span>
      <span v-if="maxCount !== Infinity" class="mx-2">|</span>
      <span v-if="maxCount !== Infinity">
        {{ $t('component.fileUpload.maxCount') }}: {{ maxCount }}
      </span>
    </div>

    <!-- 图片预览弹窗 -->
    <Modal
      :open="previewVisible"
      :footer="null"
      :width="800"
      @cancel="handlePreviewClose"
    >
      <div class="flex items-center justify-center">
        <Image
          :src="previewImageUrl"
          :preview="false"
          style="max-width: 100%; max-height: 60vh; object-fit: contain"
        />
      </div>
    </Modal>
  </div>
</template>

<style scoped lang="scss">
.file-upload-input {
  width: 100%;
}

.file-upload-input--card :deep(.ant-upload-select-picture-card),
.file-upload-input--card :deep(.ant-upload-list-item-container) {
  width: 104px;
  height: 104px;
  margin-block: 0 8px;
  margin-inline: 0 8px;
}

.file-upload-input--card :deep(.ant-upload-list-item-thumbnail img),
.file-upload-input--card :deep(.ant-upload-list-item-image) {
  object-fit: contain;
}

.file-upload-input--card :deep(.ant-upload-list-item-name) {
  display: none;
}

.file-upload-card-trigger {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #8c8c8c;
}

.upload-dragger {
  padding: 10px;
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
  display: flex;
  justify-content: center;
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
