<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';
import { $t } from '@vben/locales';

import { Button, Empty, Image, Modal, Space, Spin } from 'ant-design-vue';

import { buildAttachmentUrl } from '#/utils';

type FileCategory = 'image' | 'office' | 'other' | 'pdf';

interface Props {
  /** 是否显示 */
  open?: boolean;
  /** 文件访问地址（相对或绝对均可，内部会补全为完整地址） */
  fileUrl?: string;
  /** 文件名，用于识别类型与标题展示 */
  fileName?: string;
  /** 弹窗标题 */
  title?: string;
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
  fileUrl: '',
  fileName: '',
  title: '',
});

const emit = defineEmits<{
  'update:open': [value: boolean];
  close: [];
}>();

const IMAGE_EXTENSIONS = new Set([
  'apng',
  'avif',
  'bmp',
  'gif',
  'ico',
  'jfif',
  'jpeg',
  'jpg',
  'png',
  'svg',
  'tif',
  'tiff',
  'webp',
]);
const OFFICE_EXTENSIONS = new Set([
  'csv',
  'doc',
  'docx',
  'ppt',
  'pptx',
  'xls',
  'xlsx',
]);

const iframeLoading = ref(true);

const modelOpen = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val),
});

/** 完整可访问地址 */
const fullUrl = computed(() => buildAttachmentUrl(props.fileUrl));

/** 文件扩展名 */
const extension = computed(() => {
  const source = props.fileName || props.fileUrl;
  const match = source.match(/\.([a-z0-9]+)(?:[?#]|$)/i);
  return match ? match[1].toLowerCase() : '';
});

const category = computed<FileCategory>(() => {
  const ext = extension.value;
  if (ext === 'pdf') return 'pdf';
  if (IMAGE_EXTENSIONS.has(ext)) return 'image';
  if (OFFICE_EXTENSIONS.has(ext)) return 'office';
  return 'other';
});

/** Office 在线预览地址（要求文件地址为公网可访问） */
const officePreviewUrl = computed(
  () =>
    `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
      fullUrl.value,
    )}`,
);

const computedTitle = computed(
  () => props.title || props.fileName || $t('component.filePreview.title'),
);

const handleIframeLoad = () => {
  iframeLoading.value = false;
};

const handleCancel = () => {
  modelOpen.value = false;
  emit('close');
};

const handleDownload = () => {
  if (!fullUrl.value) return;
  window.open(fullUrl.value, '_blank', 'noopener,noreferrer');
};

const handleOpenInNewWindow = () => {
  const target =
    category.value === 'office' ? officePreviewUrl.value : fullUrl.value;
  if (!target) return;
  window.open(target, '_blank', 'noopener,noreferrer');
};

watch(
  () => [props.open, props.fileUrl] as const,
  ([open]) => {
    if (open) {
      iframeLoading.value = category.value !== 'image';
    }
  },
);
</script>

<template>
  <Modal
    v-model:open="modelOpen"
    :title="computedTitle"
    :footer="null"
    width="90%"
    class="attachment-viewer-modal"
    destroy-on-close
    @cancel="handleCancel"
  >
    <div class="attachment-viewer-toolbar">
      <Space>
        <Button size="small" @click="handleOpenInNewWindow">
          <IconifyIcon icon="mdi:open-in-new" class="mr-1 size-4" />
          {{ $t('component.filePreview.openInNewWindow') }}
        </Button>
        <Button size="small" @click="handleDownload">
          <IconifyIcon icon="mdi:download" class="mr-1 size-4" />
          {{ $t('component.filePreview.download') }}
        </Button>
      </Space>
    </div>

    <div class="attachment-viewer-body">
      <!-- 图片预览 -->
      <div v-if="category === 'image'" class="attachment-viewer-image-wrap">
        <Image
          :src="fullUrl"
          :preview="false"
          class="attachment-viewer-image"
        />
      </div>

      <!-- PDF 预览 -->
      <template v-else-if="category === 'pdf'">
        <Spin
          v-if="iframeLoading"
          class="attachment-viewer-loading"
          size="large"
        />
        <iframe
          v-if="fullUrl"
          :src="fullUrl"
          :title="computedTitle"
          class="attachment-viewer-iframe"
          frameborder="0"
          @load="handleIframeLoad"
        ></iframe>
      </template>

      <!-- Office（Word/Excel/PPT）在线预览 -->
      <template v-else-if="category === 'office'">
        <Spin
          v-if="iframeLoading"
          class="attachment-viewer-loading"
          size="large"
        />
        <iframe
          v-if="fullUrl"
          :src="officePreviewUrl"
          :title="computedTitle"
          class="attachment-viewer-iframe"
          frameborder="0"
          @load="handleIframeLoad"
        ></iframe>
      </template>

      <!-- 不支持在线预览 -->
      <div v-else class="attachment-viewer-unsupported">
        <Empty :description="$t('component.filePreview.unsupported')">
          <Button type="primary" @click="handleDownload">
            {{ $t('component.filePreview.download') }}
          </Button>
        </Empty>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.attachment-viewer-modal :deep(.ant-modal) {
  top: 24px;
  padding-bottom: 0;
}

.attachment-viewer-modal :deep(.ant-modal-body) {
  padding: 0;
}

.attachment-viewer-toolbar {
  padding: 8px 16px;
  background: hsl(var(--accent));
  border-bottom: 1px solid hsl(var(--border));
}

.attachment-viewer-body {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 70vh;
  overflow: auto;
}

.attachment-viewer-image-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 16px;
}

.attachment-viewer-image :deep(img) {
  max-width: 100%;
  max-height: calc(70vh - 32px);
  object-fit: contain;
}

.attachment-viewer-iframe {
  width: 100%;
  height: 100%;
  border: 0;
}

.attachment-viewer-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.attachment-viewer-unsupported {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
</style>
