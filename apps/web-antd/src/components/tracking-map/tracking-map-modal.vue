<script lang="ts" setup>
import type { TrackingMapLang } from './build-tracking-map-src';

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

import { buildTrackingMapSrc } from './build-tracking-map-src';
import { useTrackingMap } from './use-tracking-map';

const { visible, referenceNo, close } = useTrackingMap();
const router = useRouter();

/** 内嵌页语言，切换后 iframe 与分享链接同步；默认中文 */
const lang = ref<TrackingMapLang>('zh');
const langOptions = [
  { label: '中文', value: 'zh' },
  { label: 'English', value: 'en' },
];

// 每次打开弹窗重置为中文，避免上次的英文选择带入新订阅号
watch(visible, (open) => {
  if (open) lang.value = 'zh';
});

const iframeSrc = computed(() =>
  buildTrackingMapSrc(referenceNo.value, lang.value),
);

/** 可分享的独立静态页绝对链接（免登录），自动兼容 hash / history 路由模式 */
const shareUrl = computed(() => {
  if (!referenceNo.value) return '';
  const { href } = router.resolve({
    name: 'TrackingMapPage',
    params: { mblNo: referenceNo.value },
    query: lang.value === 'en' ? { lang: 'en' } : {},
  });
  return `${window.location.origin}${href}`;
});

async function copyShareLink() {
  if (!shareUrl.value) return;
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
      lang.value === 'en' ? '英文分享链接已复制' : '分享链接已复制',
    );
  } catch {
    message.error('复制失败，请手动复制');
  }
}

function openInNewTab() {
  if (!shareUrl.value) return;
  window.open(shareUrl.value, '_blank', 'noopener');
}
</script>

<template>
  <Modal
    :open="visible"
    title="货物轨迹"
    :footer="null"
    width="90vw"
    :style="{ maxWidth: '1400px' }"
    :destroy-on-close="true"
    :body-style="{ padding: '0' }"
    centered
    @cancel="close"
  >
    <div class="tracking-map">
      <div v-if="iframeSrc" class="tracking-map__toolbar">
        <span class="tracking-map__ref">
          订阅号：<strong>{{ referenceNo }}</strong>
        </span>
        <div class="tracking-map__actions">
          <Tooltip title="切换轨迹地图语言，分享链接同步生成对应语言">
            <Segmented
              v-model:value="lang"
              :options="langOptions"
              size="small"
            />
          </Tooltip>
          <Tooltip title="在新窗口打开可分享的轨迹页">
            <Button size="small" @click="openInNewTab">
              <template #icon>
                <IconifyIcon
                  icon="ph:arrow-square-out"
                  class="mr-1 inline-block"
                />
              </template>
              新窗口打开
            </Button>
          </Tooltip>
          <Tooltip title="复制免登录分享链接，可发送给外部客户">
            <Button type="primary" size="small" @click="copyShareLink">
              <template #icon>
                <IconifyIcon
                  icon="ph:share-network"
                  class="mr-1 inline-block"
                />
              </template>
              复制分享链接
            </Button>
          </Tooltip>
        </div>
      </div>
      <div class="tracking-map__content">
        <iframe
          v-if="iframeSrc"
          :key="iframeSrc"
          :src="iframeSrc"
          class="tracking-map__frame"
          frameborder="0"
          allow="geolocation"
          referrerpolicy="no-referrer"
        ></iframe>
        <div v-else class="tracking-map__empty">
          <Empty description="暂无可查询的订阅号" />
        </div>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.tracking-map {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 80vh;
}

.tracking-map__toolbar {
  display: flex;
  flex-shrink: 0;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-bottom: 1px solid rgb(60 60 67 / 10%);
}

.tracking-map__ref {
  font-size: 13px;
  color: rgb(60 60 67 / 60%);
}

.tracking-map__actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.tracking-map__content {
  flex: 1;
  min-height: 0;
}

.tracking-map__frame {
  display: block;
  width: 100%;
  height: 100%;
  border: none;
}

.tracking-map__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
</style>
