<script setup lang="ts">
import type { Component } from 'vue';

import { computed, defineAsyncComponent, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { IconifyIcon } from '@vben/icons';
import { $t } from '@vben/locales';

import { Button, Empty, Image, Modal, Space, Spin } from 'ant-design-vue';

import {
  buildAttachmentUrl,
  buildPdfEmbedUrl,
  resolveSameOriginMediaUrl,
} from '#/utils';
import { prepareExcelPreviewBuffer } from '#/utils/prepare-excel-preview';

import '@vue-office/docx/lib/index.css';
import '@vue-office/excel/lib/index.css';

type FileCategory = 'image' | 'office' | 'other' | 'pdf';
type OfficeKind = 'docx' | 'excel' | 'pptx' | '';

interface Props {
  /** 是否显示 */
  open?: boolean;
  /** 文件访问地址（相对或绝对均可，内部会补全为完整地址） */
  fileUrl?: string;
  /** 文件名，用于识别类型与标题展示 */
  fileName?: string;
  /** 上传人 */
  uploader?: string;
  /** 已格式化的上传时间 */
  uploadTime?: string;
  /** 弹窗标题 */
  title?: string;
  /** dialog：弹窗；page：独立预览页 */
  mode?: 'dialog' | 'page';
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
  fileUrl: '',
  fileName: '',
  uploader: '',
  uploadTime: '',
  title: '',
  mode: 'dialog',
});

const emit = defineEmits<{
  'update:open': [value: boolean];
  close: [];
}>();

const router = useRouter();

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

const VueOfficeDocx = defineAsyncComponent(
  () => import('@vue-office/docx') as Promise<{ default: Component }>,
);
const VueOfficeExcel = defineAsyncComponent(
  () => import('@vue-office/excel') as Promise<{ default: Component }>,
);
const VueOfficePptx = defineAsyncComponent(
  () => import('@vue-office/pptx') as Promise<{ default: Component }>,
);

const iframeLoading = ref(true);
const officeLoading = ref(false);
const officeError = ref('');
const officeSrc = ref<ArrayBuffer | string>('');
const fullscreen = ref(false);

const isPageMode = computed(() => props.mode === 'page');
const isExpanded = computed(() => isPageMode.value || fullscreen.value);

const modelOpen = computed({
  get: () => (isPageMode.value ? true : props.open),
  set: (val) => {
    if (isPageMode.value) return;
    emit('update:open', val);
  },
});

const wrapClassName = computed(() =>
  [
    'attachment-viewer-modal',
    isExpanded.value ? 'attachment-viewer-modal--expanded' : '',
    isPageMode.value ? 'attachment-viewer-modal--page' : '',
  ]
    .filter(Boolean)
    .join(' '),
);

const modalStyle = computed(() =>
  isExpanded.value
    ? { top: 0, margin: 0, maxWidth: '100%', paddingBottom: 0 }
    : { top: '24px', paddingBottom: 0 },
);

/** 完整可访问地址（下载 / 新窗口） */
const fullUrl = computed(() => buildAttachmentUrl(props.fileUrl));

/** 同源地址：开发走 `/Uploads` 代理，避免 CORS 与 X-Frame-Options */
const sameOriginUrl = computed(() => resolveSameOriginMediaUrl(props.fileUrl));

/** PDF 弹窗预览地址（隐藏浏览器工具栏与左侧分页） */
const pdfEmbedUrl = computed(() =>
  buildPdfEmbedUrl(sameOriginUrl.value || fullUrl.value),
);

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

/** vue-office 可解析的格式；旧版 .doc / .ppt 不支持 */
const officeKind = computed<OfficeKind>(() => {
  const ext = extension.value;
  if (ext === 'docx') return 'docx';
  if (['csv', 'xls', 'xlsx'].includes(ext)) return 'excel';
  if (ext === 'pptx') return 'pptx';
  return '';
});

const canLocalOfficePreview = computed(() => officeKind.value !== '');

const computedTitle = computed(
  () => props.title || props.fileName || $t('component.filePreview.title'),
);

const handleIframeLoad = () => {
  iframeLoading.value = false;
};

const handleOfficeRendered = () => {
  officeLoading.value = false;
};

const handleOfficeError = () => {
  officeLoading.value = false;
  officeError.value = $t('component.filePreview.officeFailed');
};

const handleCancel = () => {
  fullscreen.value = false;
  modelOpen.value = false;
  emit('close');
};

const toggleFullscreen = () => {
  fullscreen.value = !fullscreen.value;
};

const handleDownload = () => {
  if (!fullUrl.value) return;
  const link = document.createElement('a');
  link.href = fullUrl.value;
  link.download = props.fileName || 'download';
  link.rel = 'noopener';
  link.target = '_blank';
  document.body.append(link);
  link.click();
  link.remove();
};

const handleOpenInNewWindow = () => {
  if (!props.fileUrl) return;
  const resolved = router.resolve({
    name: 'AttachmentPreviewPage',
    query: Object.fromEntries(
      Object.entries({
        fileUrl: props.fileUrl,
        fileName: props.fileName,
        uploader: props.uploader,
        uploadTime: props.uploadTime,
        title: props.title,
      }).filter(([, value]) => value),
    ),
  });
  window.open(resolved.href, '_blank', 'noopener,noreferrer');
};

async function loadOfficeBuffer() {
  officeSrc.value = '';
  officeError.value = '';
  if (!props.open || !canLocalOfficePreview.value || !props.fileUrl) {
    officeLoading.value = false;
    return;
  }

  officeLoading.value = true;
  const candidates = [
    ...new Set([sameOriginUrl.value, fullUrl.value].filter(Boolean)),
  ];

  for (const candidate of candidates) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const response = await fetch(candidate);
      if (!response.ok) continue;
      // eslint-disable-next-line no-await-in-loop
      const rawBuffer = await response.arrayBuffer();
      try {
        officeSrc.value =
          officeKind.value === 'excel'
            ? prepareExcelPreviewBuffer(rawBuffer, extension.value)
            : rawBuffer;
      } catch {
        officeLoading.value = false;
        officeError.value = $t('component.filePreview.officeFailed');
        return;
      }
      window.setTimeout(() => {
        officeLoading.value = false;
      }, 8000);
      return;
    } catch {
      // 尝试下一个地址
    }
  }

  officeLoading.value = false;
  officeError.value = $t('component.filePreview.officeFailed');
}

watch(
  () => [modelOpen.value, props.fileUrl, officeKind.value] as const,
  ([open]) => {
    if (!open) {
      officeSrc.value = '';
      officeError.value = '';
      officeLoading.value = false;
      fullscreen.value = false;
      return;
    }
    iframeLoading.value = category.value === 'pdf';
    if (canLocalOfficePreview.value) {
      void loadOfficeBuffer();
    }
  },
  { immediate: true },
);
</script>

<template>
  <Modal
    v-model:open="modelOpen"
    :title="computedTitle"
    :footer="null"
    :width="isExpanded ? '100%' : '72%'"
    :mask="!isPageMode"
    :closable="!isPageMode"
    :keyboard="!isPageMode"
    :mask-closable="!isPageMode"
    :wrap-class-name="wrapClassName"
    :style="modalStyle"
    :destroy-on-close="!isPageMode"
    @cancel="handleCancel"
  >
    <div class="attachment-viewer-shell" :class="{ 'is-expanded': isExpanded }">
      <div class="attachment-viewer-toolbar">
        <div class="attachment-viewer-meta">
          <span v-if="uploader">
            {{ $t('component.filePreview.uploader') }}：{{ uploader }}
          </span>
          <span v-if="uploadTime">
            {{ $t('component.filePreview.uploadTime') }}：{{ uploadTime }}
          </span>
        </div>
        <Space>
          <Button v-if="!isPageMode" size="small" @click="toggleFullscreen">
            <IconifyIcon
              :icon="isExpanded ? 'mdi:fullscreen-exit' : 'mdi:fullscreen'"
              class="mr-1 size-4"
            />
            {{
              isExpanded
                ? $t('component.filePreview.exitFullscreen')
                : $t('component.filePreview.fullscreen')
            }}
          </Button>
          <Button
            v-if="!isPageMode"
            size="small"
            @click="handleOpenInNewWindow"
          >
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
            v-if="pdfEmbedUrl"
            :src="pdfEmbedUrl"
            :title="computedTitle"
            class="attachment-viewer-iframe"
            frameborder="0"
            @load="handleIframeLoad"
          ></iframe>
        </template>

        <!-- Office：浏览器内 vue-office 预览 -->
        <template v-else-if="canLocalOfficePreview">
          <Spin
            v-if="officeLoading"
            class="attachment-viewer-loading"
            size="large"
          />
          <div
            v-if="officeError && !officeLoading"
            class="attachment-viewer-unsupported"
          >
            <Empty :description="officeError">
              <Button type="primary" @click="handleDownload">
                {{ $t('component.filePreview.download') }}
              </Button>
            </Empty>
          </div>
          <div v-else-if="officeSrc" class="attachment-viewer-office">
            <VueOfficeExcel
              v-if="officeKind === 'excel'"
              :src="officeSrc"
              class="attachment-viewer-office-inner"
              @rendered="handleOfficeRendered"
              @error="handleOfficeError"
            />
            <VueOfficeDocx
              v-else-if="officeKind === 'docx'"
              :src="officeSrc"
              class="attachment-viewer-office-inner"
              @rendered="handleOfficeRendered"
              @error="handleOfficeError"
            />
            <VueOfficePptx
              v-else-if="officeKind === 'pptx'"
              :src="officeSrc"
              class="attachment-viewer-office-inner"
              @rendered="handleOfficeRendered"
              @error="handleOfficeError"
            />
          </div>
        </template>

        <!-- 旧版 .doc / .ppt 或不支持的格式 -->
        <div v-else class="attachment-viewer-unsupported">
          <Empty
            :description="
              category === 'office'
                ? $t('component.filePreview.officeLegacyUnsupported')
                : $t('component.filePreview.unsupported')
            "
          >
            <Button type="primary" @click="handleDownload">
              {{ $t('component.filePreview.download') }}
            </Button>
          </Empty>
        </div>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.attachment-viewer-shell {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.attachment-viewer-shell.is-expanded {
  flex: 1;
  height: 100%;
}

.attachment-viewer-toolbar {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: hsl(var(--accent));
  border-bottom: 1px solid hsl(var(--border));
}

.attachment-viewer-meta {
  display: flex;
  gap: 16px;
  min-width: 0;
  overflow: hidden;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

.attachment-viewer-body {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 64vh;
  overflow: hidden;
  background: hsl(var(--background));
}

.attachment-viewer-shell.is-expanded .attachment-viewer-body {
  flex: 1;
  height: auto;
  min-height: 0;
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
  max-height: calc(64vh - 32px);
  object-fit: contain;
}

.attachment-viewer-shell.is-expanded .attachment-viewer-image :deep(img) {
  max-height: calc(100% - 32px);
}

.attachment-viewer-iframe {
  width: 100%;
  height: 100%;
  background: #525659;
  border: 0;
}

.attachment-viewer-office {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #fff;
}

.attachment-viewer-office-inner {
  width: 100%;
  height: 100%;
}

.attachment-viewer-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 1;
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

<style>
.attachment-viewer-modal .ant-modal-body {
  padding: 0;
}

.attachment-viewer-modal--expanded .ant-modal {
  top: 0 !important;
  max-width: 100% !important;
  padding-bottom: 0;
  margin: 0;
}

.attachment-viewer-modal--expanded .ant-modal-content {
  display: flex;
  flex-direction: column;
  height: 100vh;
  border-radius: 0;
}

.attachment-viewer-modal--expanded .ant-modal-header {
  flex-shrink: 0;
}

.attachment-viewer-modal--expanded .ant-modal-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  padding: 0;
}

.attachment-viewer-modal--page {
  overflow: hidden;
}
</style>
