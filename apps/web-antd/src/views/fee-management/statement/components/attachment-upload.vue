<script lang="ts" setup>
import type { UploadFile, UploadProps } from 'ant-design-vue';

import type { Attachment } from '#/api/common/upload';

import { computed, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';
import { $t } from '@vben/locales';

import { message, Spin, Tooltip, Upload } from 'ant-design-vue';

import { mapResultToAttachment, uploadFile } from '#/api/common/upload';
import { buildAttachmentUrl } from '#/utils';

// 导入插图资源
import attachmentImage from '#/assets/images/statement/attachment.png';

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
  maxCount: 20,
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

/** 是否正在上传 */
const isUploading = computed(() => uploadingUids.value.size > 0);

/** 是否达到最大数量 */
const isMaxCount = computed(() => innerValue.value.length >= props.maxCount);

/** 用于 Upload 组件展示的 fileList */
const fileList = computed<UploadProps['fileList']>(
  () =>
    innerValue.value.map((attachment) => ({
      uid: String(attachment.attachmentId),
      name: attachment.fileName || attachment.friendlyFileName || '',
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
      const firstResult = resultList[0];
      if (firstResult) {
        const attachment = mapResultToAttachment(firstResult);
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
const handleRemove = (file: UploadFile): boolean => {
  if (props.disabled) return false;

  innerValue.value = innerValue.value.filter(
    (item) => String(item.attachmentId) !== file.uid,
  );
  emitUpdate();
  return true;
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
  <div class="attachment-upload-container">
    <!-- 标题区域 -->
    <!-- <div class="upload-header">
      <div class="title-indicator"></div>
      <span class="upload-title">3D模型预览</span>
    </div> -->

    <!-- 分隔线 -->
    <!-- <div class="divider-line"></div> -->

    <!-- 拖拽上传区域 -->
    <Upload
      :file-list="fileList"
      :disabled="disabled"
      :before-upload="handleBeforeUpload"
      :show-upload-list="{
        showPreviewIcon: false,
        showRemoveIcon: !disabled,
        showDownloadIcon: false,
      }"
      @remove="handleRemove"
      drag
      class="drag-area"
    >
      <div v-if="!isUploading" class="upload-content">
        <!-- 插图 -->
        <img :src="attachmentImage"  v-if="innerValue.length === 0" alt="attachment" class="attachment-image" />
        
        <!-- 提示文本 -->
        <p class="upload-text-primary">点击或者拖拽文件到此上传</p>
        <p class="upload-text-secondary">
          最大{{ maxSizeMB }}MB | 最多{{ maxCount }}个文件
        </p>
      </div>

      <div v-else class="upload-loading">
        <Spin size="large" />
        <p class="loading-text">上传中...</p>
      </div>
    </Upload>

    <!-- 已上传文件列表 -->
    <div v-if="innerValue.length > 0" class="uploaded-files">
      <div
        v-for="(file, index) in innerValue"
        :key="file.attachmentId"
        class="file-item"
      >
        <div class="file-info">
          <IconifyIcon icon="ant-design:file-outlined" class="file-icon" />
          <span class="file-name" :title="file.fileName">{{
            file.fileName
          }}</span>
        </div>
        <Tooltip v-if="!disabled" title="删除">
          <IconifyIcon
            icon="ant-design:delete-outlined"
            class="delete-icon"
            @click="
              handleRemove({
                uid: String(file.attachmentId),
                name: file.fileName,
              } as UploadFile)
            "
          />
        </Tooltip>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.attachment-upload-container {
  position: relative;
  width: 276px;
  height: 222px;
  background: #ffffff;
  border-radius: 16px;
  padding: 16px;
 // box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.upload-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.title-indicator {
  width: 4px;
  height: 16px;
  background: linear-gradient(180deg, #3f7bfa 0%, rgba(63, 123, 250, 0.3) 100%);
  border-radius: 2px;
}

.upload-title {
  font-family: 'Source Han Sans CN', sans-serif;
  font-style: normal;
  font-weight: 700;
  font-size: 16px;
  line-height: 16px;
  color: #222222;
}

.divider-line {
  width: calc(100% - 10px);
  height: 1px;
  background-color: #f2f2f2;
  margin-left: 5px;
  margin-right: 5px;
  margin-bottom: 16px;
}

.drag-area {
  width: 244px;
  height: 232px;
  background: #f5f7fa;
  border: 1px dashed #e1e5ea;
  border-radius: 16px;
  transition: all 0.3s ease;

  &:hover {
    border-color: #3f7bfa;
    background: #f0f5ff;
  }

  &.ant-upload-drag-hover {
    border-color: #3f7bfa;
    background: #e6f0ff;
  }

  :deep(.ant-upload) {
    width: 100%;
    height: 100%;
    padding: 0;
  }

  :deep(.ant-upload-drag) {
    width: 100%;
    height: 100%;
    border: none;
    background: transparent;
  }
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 20px;
}

.attachment-image {
  width: 95px;
  height: 113px;
  object-fit: contain;
  margin-bottom: 16px;
}

.upload-text-primary {
  font-family: 'Source Han Sans CN', sans-serif;
  font-style: normal;
  font-weight: 400;
  font-size: 14px;
  line-height: 14px;
  color: #3d3d3d;
  margin: 0 0 8px 0;
  text-align: center;
}

.upload-text-secondary {
  font-family: 'Source Han Sans CN', sans-serif;
  font-style: normal;
  font-weight: 400;
  font-size: 12px;
  line-height: 12px;
  color: #999999;
  margin: 0;
  text-align: center;
}

.upload-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.loading-text {
  margin-top: 12px;
  font-size: 14px;
  color: #666;
}

.uploaded-files {
  margin-top: 12px;
  max-height: 100px;
  overflow-y: auto;
  position: absolute;
  top: 0px;
}

.file-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  background: #f9f9f9;
  border-radius: 4px;
  margin-bottom: 4px;
  transition: background 0.2s ease;

  &:hover {
    background: #f0f0f0;
  }
}

.file-info {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.file-icon {
  font-size: 16px;
  color: #1890ff;
  flex-shrink: 0;
}

.file-name {
  font-size: 12px;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.delete-icon {
  font-size: 16px;
  color: #999;
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.2s ease;

  &:hover {
    color: #ff4d4f;
  }
}
</style>
