<script setup lang="ts">
import type { TextInAdminApi } from '#/api/common/text-in-admin';

import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

import { Drawer, Empty, Spin, Tag } from 'ant-design-vue';

import { isPdfFile, resolveCitationForField } from './ai-extract-utils';

const props = withDefaults(
  defineProps<{
    open?: boolean;
    file?: File | null;
    citations?: Record<string, TextInAdminApi.TextInFieldCitationDto>;
    activeField?: string | null;
    isFromCache?: boolean;
  }>(),
  {
    open: false,
    file: null,
    citations: () => ({}),
    activeField: null,
    isFromCache: false,
  },
);

const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

const drawerOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
});

const loading = ref(false);
const loadError = ref('');
const imageObjectUrl = ref('');
const imageViewBox = ref('');
const pdfPreviewUrl = ref('');
const isPdfPreview = ref(false);
const pageContainerRef = ref<HTMLElement | null>(null);

const activeCitation = computed(() => {
  if (!props.activeField) return undefined;
  return resolveCitationForField(props.activeField, props.citations);
});

const activeRegions = computed(() => {
  const regions = activeCitation.value?.boundingRegions ?? [];
  return regions.filter(
    (region) =>
      region.pageNumber != null &&
      Array.isArray(region.position) &&
      region.position.length >= 8,
  );
});

const activeCitationText = computed(() => {
  const citation = activeCitation.value;
  if (!citation) return '';
  if (citation.value?.trim()) return citation.value.trim();
  const regionText = citation.boundingRegions
    ?.map((region) => region.text?.trim())
    .filter(Boolean)
    .join(' / ');
  return regionText ?? '';
});

function cleanupObjectUrls() {
  if (imageObjectUrl.value) {
    URL.revokeObjectURL(imageObjectUrl.value);
    imageObjectUrl.value = '';
  }
  if (pdfPreviewUrl.value) {
    URL.revokeObjectURL(pdfPreviewUrl.value);
    pdfPreviewUrl.value = '';
  }
}

function buildPolygonPoints(position: number[]) {
  const pairs: string[] = [];
  for (let index = 0; index < 8; index += 2) {
    const x = position[index];
    const y = position[index + 1];
    if (x == null || y == null) continue;
    pairs.push(`${x},${y}`);
  }
  return pairs.join(' ');
}

async function renderPreview(file: File) {
  cleanupObjectUrls();
  loadError.value = '';
  loading.value = true;
  imageViewBox.value = '';
  isPdfPreview.value = false;

  try {
    if (isPdfFile(file)) {
      isPdfPreview.value = true;
      pdfPreviewUrl.value = URL.createObjectURL(file);
      return;
    }
    imageObjectUrl.value = URL.createObjectURL(file);
  } catch {
    loadError.value = '文件预览加载失败';
  } finally {
    loading.value = false;
  }
}

async function scrollToActiveHighlight() {
  await nextTick();
  const container = pageContainerRef.value;
  if (!container || activeRegions.value.length === 0) return;
  const pageNumber = activeRegions.value[0]?.pageNumber;
  if (!pageNumber) return;
  const pageElement = container.querySelector(
    `[data-page-number="${pageNumber}"]`,
  );
  pageElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function handleImageLoad(event: Event) {
  const target = event.target as HTMLImageElement | null;
  if (!target?.naturalWidth || !target.naturalHeight) return;
  imageViewBox.value = `0 0 ${target.naturalWidth} ${target.naturalHeight}`;
}

watch(
  () => props.file,
  (file) => {
    if (!file) {
      cleanupObjectUrls();
      isPdfPreview.value = false;
      return;
    }
    void renderPreview(file);
  },
  { immediate: true },
);

watch(
  () => props.activeField,
  () => {
    void scrollToActiveHighlight();
  },
);

onBeforeUnmount(() => {
  cleanupObjectUrls();
});
</script>

<template>
  <Drawer
    v-model:open="drawerOpen"
    title="AI识别预览"
    placement="right"
    width="46%"
    :destroy-on-close="false"
    class="ai-extract-preview-drawer"
  >
    <template #extra>
      <Tag v-if="isFromCache" color="blue">来自缓存</Tag>
    </template>

    <div
      v-if="activeCitationText"
      class="ai-extract-preview-drawer__active-text"
    >
      <span class="ai-extract-preview-drawer__active-label">当前字段原文</span>
      <span>{{ activeCitationText }}</span>
    </div>

    <Spin :spinning="loading">
      <div ref="pageContainerRef" class="ai-extract-preview-drawer__pages">
        <Empty v-if="loadError" :description="loadError" />

        <template v-else-if="isPdfPreview && pdfPreviewUrl">
          <iframe
            :src="pdfPreviewUrl"
            class="ai-extract-preview-drawer__pdf-fallback"
            title="PDF预览"
          />
          <div
            v-if="activeRegions.length > 0"
            class="ai-extract-preview-drawer__fallback-hint"
          >
            当前字段位于第 {{ activeRegions[0]?.pageNumber }} 页，请在 PDF
            中手动对照。
          </div>
        </template>

        <div
          v-else-if="imageObjectUrl"
          class="ai-extract-preview-drawer__page"
          data-page-number="1"
        >
          <div class="ai-extract-preview-drawer__page-inner">
            <img
              :src="imageObjectUrl"
              alt="识别文件预览"
              class="ai-extract-preview-drawer__image"
              @load="handleImageLoad"
            />
            <svg
              v-if="imageViewBox"
              class="ai-extract-preview-drawer__overlay"
              :viewBox="imageViewBox"
            >
              <polygon
                v-for="(region, regionIndex) in activeRegions"
                v-show="region.pageNumber === 1 && region.position"
                :key="`image-region-${regionIndex}`"
                :points="buildPolygonPoints(region.position ?? [])"
                class="ai-extract-preview-drawer__highlight"
              />
            </svg>
          </div>
        </div>

        <Empty v-else-if="!loading" description="暂无可预览内容" />
      </div>
    </Spin>
  </Drawer>
</template>

<style scoped>
.ai-extract-preview-drawer__active-text {
  padding: 8px 12px;
  margin-bottom: 12px;
  font-size: 12px;
  line-height: 1.5;
  background: hsl(var(--primary) / 8%);
  border: 1px solid hsl(var(--primary) / 20%);
  border-radius: 6px;
}

.ai-extract-preview-drawer__active-label {
  display: block;
  margin-bottom: 4px;
  font-weight: 600;
  color: hsl(var(--primary));
}

.ai-extract-preview-drawer__pages {
  max-height: calc(100vh - 180px);
  overflow: auto;
}

.ai-extract-preview-drawer__page {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.ai-extract-preview-drawer__page-inner {
  position: relative;
  max-width: 100%;
}

.ai-extract-preview-drawer__image {
  display: block;
  max-width: 100%;
  height: auto;
}

.ai-extract-preview-drawer__overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.ai-extract-preview-drawer__highlight {
  fill: rgb(255 77 79 / 18%);
  stroke: #ff4d4f;
  stroke-width: 2;
}

.ai-extract-preview-drawer__pdf-fallback {
  width: 100%;
  height: calc(100vh - 220px);
  border: 0;
}

.ai-extract-preview-drawer__fallback-hint {
  margin-top: 8px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}
</style>
