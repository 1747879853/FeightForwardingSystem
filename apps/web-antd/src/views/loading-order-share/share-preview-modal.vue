<script lang="ts" setup>
import type { LoadingShareLang } from './share-text';

import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { IconifyIcon } from '@vben/icons';

import { Button, message, Modal, Segmented, Tooltip } from 'ant-design-vue';

import { $t } from '#/locales';

import LoadingOrderSharePage from './page.vue';
import { buildLoadingOrderShareUrl, copyTextToClipboard } from './share-url';

defineOptions({ name: 'LoadingOrderSharePreviewModal' });

const props = defineProps<{
  loadingOrderNum: string;
  mblNum: string;
  open: boolean;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

const router = useRouter();
const lang = ref<LoadingShareLang>('zh');
const langOptions = [
  { label: '中文', value: 'zh' },
  { label: 'English', value: 'en' },
];

watch(
  () => props.open,
  (open) => {
    if (open) lang.value = 'zh';
  },
);

const shareUrl = computed(() => {
  const mbl = props.mblNum.trim();
  const orderNum = props.loadingOrderNum.trim();
  if (!mbl || !orderNum) return '';
  return buildLoadingOrderShareUrl({
    router,
    mblNum: mbl,
    loadingOrderNum: orderNum,
    lang: lang.value,
  });
});

const close = () => emit('update:open', false);

async function copyShareLink() {
  if (!shareUrl.value) return;
  const ok = await copyTextToClipboard(shareUrl.value);
  if (ok) {
    message.success(
      lang.value === 'en'
        ? $t('seaExport.loadingOrder.shareCopiedEn')
        : $t('seaExport.loadingOrder.shareCopied'),
    );
  } else {
    message.error($t('seaExport.loadingOrder.shareFailed'));
  }
}

function openInNewTab() {
  if (!shareUrl.value) return;
  window.open(shareUrl.value, '_blank', 'noopener');
}
</script>

<template>
  <Modal
    :body-style="{ padding: '0' }"
    centered
    destroy-on-close
    :footer="null"
    :open="open"
    :style="{ maxWidth: '1200px' }"
    :title="$t('seaExport.loadingOrder.sharePreviewTitle')"
    width="90vw"
    @cancel="close"
  >
    <div class="share-preview">
      <div class="share-preview__toolbar">
        <span class="share-preview__hint">
          {{ $t('seaExport.loadingOrder.sharePreviewHint') }}
        </span>
        <div class="share-preview__actions">
          <Tooltip :title="$t('seaExport.loadingOrder.shareLangHint')">
            <Segmented
              v-model:value="lang"
              :options="langOptions"
              size="small"
            />
          </Tooltip>
          <Tooltip :title="$t('seaExport.loadingOrder.shareOpenInNewHint')">
            <Button size="small" @click="openInNewTab">
              <template #icon>
                <IconifyIcon
                  class="mr-1 inline-block"
                  icon="ph:arrow-square-out"
                />
              </template>
              {{ $t('seaExport.loadingOrder.shareOpenInNew') }}
            </Button>
          </Tooltip>
          <Tooltip :title="$t('seaExport.loadingOrder.shareCopyHint')">
            <Button size="small" type="primary" @click="copyShareLink">
              <template #icon>
                <IconifyIcon
                  class="mr-1 inline-block"
                  icon="ph:share-network"
                />
              </template>
              {{ $t('seaExport.loadingOrder.shareCopyLink') }}
            </Button>
          </Tooltip>
        </div>
      </div>
      <div class="share-preview__frame">
        <LoadingOrderSharePage
          :embedded="true"
          :lang="lang"
          :loading-order-num="loadingOrderNum"
          :mbl-num="mblNum"
        />
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.share-preview {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 80vh;
}

.share-preview__toolbar {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-bottom: 1px solid rgb(60 60 67 / 10%);
}

.share-preview__hint {
  min-width: 0;
  font-size: 13px;
  color: rgb(60 60 67 / 60%);
}

.share-preview__actions {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
  align-items: center;
}

.share-preview__frame {
  flex: 1;
  min-height: 0;
}

.share-preview__frame :deep(.loading-share) {
  height: 100%;
}
</style>
