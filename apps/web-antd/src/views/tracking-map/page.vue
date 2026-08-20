<script lang="ts" setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import { Empty } from 'ant-design-vue';

import { buildTrackingMapSrc } from '#/components/tracking-map';
import { brandLogo, brandLogoText } from '#/utils/brand-assets';

/**
 * 现有运踪（sjtd 海出）货物轨迹独立静态页。
 * 订阅号来自路径 `/tracking-map/:mblNo`，页头展示品牌、单号与中性标题。
 */
defineOptions({ name: 'TrackingMapPage' });

const route = useRoute();

// 页头品牌 logo（横版优先，缺省回退方形），随打包品牌 VITE_APP_BRAND 自动切换
const headerLogo = brandLogoText || brandLogo;
const companyName = (import.meta.env.VITE_APP_TITLE as string) || '';

// 订阅号（mblNo）来自路由参数，兼容 path param 与 query
const referenceNo = computed(() => {
  const fromParam = route.params.mblNo;
  const fromQuery = route.query.mblNo;
  const raw = Array.isArray(fromParam)
    ? fromParam[0]
    : (fromParam ?? (Array.isArray(fromQuery) ? fromQuery[0] : fromQuery));
  return typeof raw === 'string' ? raw.trim() : '';
});

// 语言来自 query（?lang=en），用于分享给海外客户的英文链接，默认中文
const lang = computed(() => {
  const raw = Array.isArray(route.query.lang)
    ? route.query.lang[0]
    : route.query.lang;
  return raw === 'en' ? 'en' : 'zh';
});

/** 页内文案跟随 URL lang，不依赖系统全局语言（分享页可能免登录访问） */
const pageText = computed(() =>
  lang.value === 'en'
    ? {
        title: 'Cargo Tracking',
        referenceNo: 'Reference no',
        empty:
          'No reference number available. Please open the link with a subscription number.',
      }
    : {
        title: '货物轨迹查询',
        referenceNo: '单号',
        empty: '暂无可查询的订阅号，请通过带订阅号的链接访问',
      },
);

const iframeSrc = computed(() =>
  buildTrackingMapSrc(referenceNo.value, lang.value),
);
</script>

<template>
  <div class="tracking-page">
    <header class="tracking-page__header">
      <div class="tracking-page__brand">
        <img
          v-if="headerLogo"
          :src="headerLogo"
          :alt="companyName || 'logo'"
          class="tracking-page__logo"
        />
        <span v-else class="tracking-page__company">{{ companyName }}</span>
        <span v-if="referenceNo" class="tracking-page__ref">
          {{ pageText.referenceNo }}：<strong>{{ referenceNo }}</strong>
        </span>
      </div>
      <span class="tracking-page__title">{{ pageText.title }}</span>
    </header>

    <main class="tracking-page__body">
      <iframe
        v-if="iframeSrc"
        :key="iframeSrc"
        :src="iframeSrc"
        class="tracking-page__frame"
        frameborder="0"
        allow="geolocation"
        referrerpolicy="no-referrer"
      ></iframe>
      <div v-else class="tracking-page__empty">
        <Empty :description="pageText.empty" />
      </div>
    </main>
  </div>
</template>

<style scoped>
.tracking-page {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #f5f5f7;
}

.tracking-page__header {
  display: flex;
  flex-shrink: 0;
  gap: 16px;
  align-items: center;
  height: 56px;
  padding: 0 24px;
  background: #fff;
  border-bottom: 1px solid rgb(60 60 67 / 10%);
  box-shadow: 0 1px 2px rgb(0 0 0 / 4%);
}

.tracking-page__brand {
  display: flex;
  align-items: center;
}

.tracking-page__logo {
  max-width: 200px;
  height: 32px;
  object-fit: contain;
}

.tracking-page__company {
  font-size: 18px;
  font-weight: 600;
  color: rgb(0 0 0 / 88%);
}

.tracking-page__ref {
  padding-left: 12px;
  font-size: 13px;
  color: rgb(60 60 67 / 60%);
  border-left: 1px solid rgb(60 60 67 / 12%);
}

.tracking-page__title {
  padding-left: 16px;
  font-size: 15px;
  color: rgb(60 60 67 / 60%);
  border-left: 1px solid rgb(60 60 67 / 12%);
}

.tracking-page__body {
  flex: 1;
  min-height: 0;
}

.tracking-page__frame {
  display: block;
  width: 100%;
  height: 100%;
  border: none;
}

.tracking-page__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
</style>
