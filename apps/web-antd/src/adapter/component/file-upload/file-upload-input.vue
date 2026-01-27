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
} from 'ant-design-vue';

import { mapResultToAttachment, uploadFile } from '#/api/common/upload';

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
  /** 最大文件数量 */
  maxCount?: number;
  /** 最大文件大小（MB） */
  maxSizeMB?: number;
  /** 绑定值 */
  modelValue?: Attachment[];
}

const props = withDefaults(defineProps<Props>(), {
  allowedTypes: () => [],
  disabled: false,
  fieldName: 'file',
  maxCount: Number.POSITIVE_INFINITY,
  maxSizeMB: 20,
  modelValue: undefined,
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

/** 用于 Upload 组件展示的 fileList */
const fileList = computed<UploadProps['fileList']>(() =>
  innerValue.value.map((attachment) => ({
    uid: String(attachment.attachmentId),
    name: attachment.fileName,
    status: 'done' as const,
    url: attachment.url,
  })),
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
      const attachment = mapResultToAttachment(resultList[0]);
      innerValue.value.push(attachment);
      emitUpdate();
      message.success($t('component.fileUpload.uploadSuccess'));
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
const handleRemove = (file: UploadFile): boolean => {
  if (props.disabled) return false;

  innerValue.value = innerValue.value.filter(
    (item) => String(item.attachmentId) !== file.uid,
  );
  emitUpdate();
  return true;
};

/** 判断文件是否为图片类型 */
const isImageFile = (fileName: string): boolean => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return IMAGE_EXTENSIONS.has(ext);
};

/** 处理文件预览 */
const handlePreview = (file: UploadFile) => {
  const attachment = innerValue.value.find(
    (item) => String(item.attachmentId) === file.uid,
  );

  if (attachment?.url) {
    // 构建完整 URL
    const fullUrl = attachment.url.startsWith('http')
      ? attachment.url
      : `${window.location.origin}${attachment.url}`;

    // 如果是图片类型，使用弹窗预览
    if (isImageFile(attachment.fileName)) {
      previewImageUrl.value = fullUrl;
      previewVisible.value = true;
    } else {
      // 非图片类型，打开新窗口
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
  <div class="file-upload-input">
    <Upload
      :file-list="fileList"
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
    >
      <Tooltip
        v-if="isMaxCount && !disabled"
        :title="$t('component.fileUpload.maxCountReached')"
      >
        <Button :disabled="true">
          <template #icon>
            <IconifyIcon icon="ant-design:upload-outlined" class="size-4" />
          </template>
          {{ $t('component.fileUpload.selectFile') }}
        </Button>
      </Tooltip>
      <Button v-else-if="!disabled" :loading="isUploading">
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
    <div v-if="!disabled" class="mt-1 text-xs text-gray-400">
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
      <Image
        :src="previewImageUrl"
        :preview="false"
        class="w-full"
        style="max-height: 70vh; object-fit: contain"
      />
    </Modal>
  </div>
</template>

<style scoped>
.file-upload-input {
  width: 100%;
}
</style>
