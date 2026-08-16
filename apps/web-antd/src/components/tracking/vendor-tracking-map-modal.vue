<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { IconifyIcon } from '@vben/icons';

import {
  Button,
  Empty,
  message,
  Modal,
  Segmented,
  Tooltip,
} from 'ant-design-vue';

import { $t } from '#/locales';
import { brandLogo, brandLogoText } from '#/utils/brand-assets';

import { useVendorTrackingMap } from './use-vendor-tracking-map';
import type { VendorMapLang } from './vendor-map-src';
import { encodeVendorMapToken, resolveVendorMapSrc } from './vendor-map-src';

/**
 * 新服务商轨迹地图弹窗：品牌 Logo + 中英切换 + 免登录分享链接，
 * 交互与货物轨迹弹窗保持一致。对外只出现本系统域名与品牌，不展示服务商地址。
 */
const { visible, payload, close } = useVendorTrackingMap();
const router = useRouter();

const headerLogo = brandLogoText || brandLogo;
const companyName = (import.meta.env.VITE_APP_TITLE as string) || '';

const lang = ref<VendorMapLang>('zh');
const langOptions = [
  { label: '中文', value: 'zh' },
  { label: 'English', value: 'en' },
];

// 每次打开重置为中文，避免上次的英文选择带入新单号
watch(visible, (open) => {
  if (open) {
    lang.value = 'zh';
  }
});

const iframeSrc = computed(() =>
  resolveVendorMapSrc(payload.value, lang.value),
);

/** 免登录分享页链接：空运带单号，海运带编码后的轨迹链接令牌 */
const shareUrl = computed(() => {
  const current = payload.value;
  if (!current) {
    return '';
  }
  const query: Record<string, string> = {};
  if (current.kind === 'air') {
    const no = current.businessNumber?.trim() ?? '';
    if (!no) {
      return '';
    }
    query.no = no;
  } else {
    const token = encodeVendorMapToken(
      current.iframeShortUrl || current.iframeUrl,
    );
    if (!token) {
      return '';
    }
    query.t = token;
  }
  if (lang.value === 'en') {
    query.lang = 'en';
  }
  const { href } = router.resolve({
    name: 'CargoTrackingPage',
    params: { kind: current.kind },
    query,
  });
  return `${window.location.origin}${href}`;
});

async function copyShareLink() {
  if (!shareUrl.value) {
    message.warning($t('tracking.map.shareUnavailable'));
    return;
  }
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareUrl.value);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = shareUrl.value;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.append(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
    message.success(
      lang.value === 'en'
        ? $t('tracking.map.shareCopiedEn')
        : $t('tracking.map.shareCopied'),
    );
  } catch {
    message.error($t('tracking.map.shareFailed'));
  }
}

function openInNewTab() {
  if (!shareUrl.value) {
    message.warning($t('tracking.map.shareUnavailable'));
    return;
  }
  window.open(shareUrl.value, '_blank', 'noopener');
}
</script>

<template>
  <Modal
    :body-style="{ padding: '0' }"
    centered
    :destroy-on-close="true"
    :footer="null"
    :open="visible"
    :style="{ maxWidth: '1400px' }"
    :title="$t('tracking.map.title')"
    width="90vw"
    @cancel="close"
  >
    <div class="vendor-map">
      <div v-if="iframeSrc" class="vendor-map__toolbar">
        <div class="vendor-map__brand">
          <img
            v-if="headerLogo"
            :alt="companyName || 'logo'"
            class="vendor-map__logo"
            :src="headerLogo"
          />
          <span v-else class="vendor-map__company">{{ companyName }}</span>
          <span v-if="payload?.referenceNo" class="vendor-map__ref">
            {{ $t('tracking.map.referenceNo') }}：<strong>
              {{ payload.referenceNo }}
            </strong>
          </span>
        </div>
        <div class="vendor-map__actions">
          <Tooltip :title="$t('tracking.map.langHint')">
            <Segmented
              v-model:value="lang"
              :options="langOptions"
              size="small"
            />
          </Tooltip>
          <Tooltip :title="$t('tracking.map.openInNewHint')">
            <Button size="small" @click="openInNewTab">
              <template #icon>
                <IconifyIcon
                  class="mr-1 inline-block"
                  icon="ph:arrow-square-out"
                />
              </template>
              {{ $t('tracking.map.openInNew') }}
            </Button>
          </Tooltip>
          <Tooltip :title="$t('tracking.map.shareHint')">
            <Button size="small" type="primary" @click="copyShareLink">
              <template #icon>
                <IconifyIcon
                  class="mr-1 inline-block"
                  icon="ph:share-network"
                />
              </template>
              {{ $t('tracking.map.share') }}
            </Button>
          </Tooltip>
        </div>
      </div>
      <div class="vendor-map__content">
        <iframe
          v-if="iframeSrc"
          :key="iframeSrc"
          allow="geolocation"
          class="vendor-map__frame"
          frameborder="0"
          referrerpolicy="no-referrer"
          :src="iframeSrc"
        ></iframe>
        <div v-else class="vendor-map__empty">
          <Empty :description="$t('tracking.map.empty')" />
        </div>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.vendor-map {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 80vh;
}

.vendor-map__toolbar {
  display: flex;
  flex-shrink: 0;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-bottom: 1px solid rgb(60 60 67 / 10%);
}

.vendor-map__brand {
  display: flex;
  gap: 12px;
  align-items: center;
  min-width: 0;
}

.vendor-map__logo {
  max-width: 160px;
  height: 28px;
  object-fit: contain;
}

.vendor-map__company {
  font-size: 15px;
  font-weight: 600;
  color: rgb(0 0 0 / 88%);
}

.vendor-map__ref {
  padding-left: 12px;
  font-size: 13px;
  color: rgb(60 60 67 / 60%);
  border-left: 1px solid rgb(60 60 67 / 12%);
}

.vendor-map__actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.vendor-map__content {
  flex: 1;
  min-height: 0;
}

.vendor-map__frame {
  display: block;
  width: 100%;
  height: 100%;
  border: none;
}

.vendor-map__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
</style>
