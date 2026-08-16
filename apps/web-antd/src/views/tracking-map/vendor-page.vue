<script lang="ts" setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import { Empty } from 'ant-design-vue';

import {
  buildAirTrackingMapSrc,
  decodeVendorMapToken,
  withMapLang,
} from '#/components/tracking';
import { brandLogo, brandLogoText } from '#/utils/brand-assets';

/**
 * 新服务商轨迹地图独立静态页（免登录，可分享给外部客户）。
 *
 * - 空运：`/cargo-tracking/air?no=<航司单号>`，地址由前端按 env 拼装，无需接口；
 * - 海运：`/cargo-tracking/ocean?t=<令牌>`，令牌是编码后的轨迹链接，免登录页不调业务接口。
 *
 * 页头只出现本系统品牌与中性标题，不展示服务商名称与原始地址。
 */
defineOptions({ name: 'CargoTrackingPage' });

const route = useRoute();

const headerLogo = brandLogoText || brandLogo;
const companyName = (import.meta.env.VITE_APP_TITLE as string) || '';

const readQuery = (key: string): string => {
  const raw = Array.isArray(route.query[key])
    ? route.query[key]?.[0]
    : route.query[key];
  return typeof raw === 'string' ? raw.trim() : '';
};

const kind = computed(() => {
  const raw = Array.isArray(route.params.kind)
    ? route.params.kind[0]
    : route.params.kind;
  return raw === 'ocean' ? 'ocean' : 'air';
});

/** 语言来自 query（?lang=en），页内文案不依赖系统语言（免登录访问） */
const lang = computed(() => (readQuery('lang') === 'en' ? 'en' : 'zh'));

const pageText = computed(() =>
  lang.value === 'en'
    ? {
        title: 'Cargo Tracking',
        empty:
          'No tracking information available. Please open the link shared with you.',
      }
    : {
        title: '货物轨迹查询',
        empty: '暂无可查看的轨迹信息，请通过分享给您的链接访问',
      },
);

const iframeSrc = computed(() => {
  if (kind.value === 'air') {
    return buildAirTrackingMapSrc(readQuery('no'), { lang: lang.value });
  }
  const url = decodeVendorMapToken(readQuery('t'));
  return url ? withMapLang(url, lang.value) : '';
});
</script>

<template>
  <div class="cargo-tracking-page">
    <header class="cargo-tracking-page__header">
      <div class="cargo-tracking-page__brand">
        <img
          v-if="headerLogo"
          :alt="companyName || 'logo'"
          class="cargo-tracking-page__logo"
          :src="headerLogo"
        />
        <span v-else class="cargo-tracking-page__company">
          {{ companyName }}
        </span>
      </div>
      <span class="cargo-tracking-page__title">{{ pageText.title }}</span>
    </header>

    <main class="cargo-tracking-page__body">
      <iframe
        v-if="iframeSrc"
        :key="iframeSrc"
        allow="geolocation"
        class="cargo-tracking-page__frame"
        frameborder="0"
        referrerpolicy="no-referrer"
        :src="iframeSrc"
      ></iframe>
      <div v-else class="cargo-tracking-page__empty">
        <Empty :description="pageText.empty" />
      </div>
    </main>
  </div>
</template>

<style scoped>
.cargo-tracking-page {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #f5f5f7;
}

.cargo-tracking-page__header {
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

.cargo-tracking-page__brand {
  display: flex;
  align-items: center;
}

.cargo-tracking-page__logo {
  max-width: 200px;
  height: 32px;
  object-fit: contain;
}

.cargo-tracking-page__company {
  font-size: 18px;
  font-weight: 600;
  color: rgb(0 0 0 / 88%);
}

.cargo-tracking-page__title {
  padding-left: 16px;
  font-size: 15px;
  color: rgb(60 60 67 / 60%);
  border-left: 1px solid rgb(60 60 67 / 12%);
}

.cargo-tracking-page__body {
  flex: 1;
  min-height: 0;
}

.cargo-tracking-page__frame {
  display: block;
  width: 100%;
  height: 100%;
  border: none;
}

.cargo-tracking-page__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
</style>
