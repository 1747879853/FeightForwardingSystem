<script lang="ts" setup>
import { computed, unref } from 'vue';
import { useRoute } from 'vue-router';

import { useAntdDesignTokens } from '@vben/hooks';
import { preferences, usePreferences } from '@vben/preferences';
import { useAccessStore } from '@vben/stores';

import { App, ConfigProvider, theme } from 'ant-design-vue';

import { JhtMascot } from '#/components/jht-mascot';
import { shouldShowJhtMascot as resolveJhtMascotVisibility } from '#/components/jht-mascot/jht-mascot-state';
import { PrintFormatModal } from '#/components/print-format';
import { TrackingMapModal } from '#/components/tracking-map';
import { WorkflowTimelineModal } from '#/components/workflow-timeline';
import { antdLocale } from '#/locales';
import { isJhtBrand } from '#/utils/brand-assets';

defineOptions({ name: 'App' });

const route = useRoute();
const accessStore = useAccessStore();
const { isDark } = usePreferences();
const { tokens } = useAntdDesignTokens();
const shouldShowJhtMascot = computed(() =>
  resolveJhtMascotVisibility({
    accessToken: accessStore.accessToken,
    brandIsJht: isJhtBrand,
    routePath: route.path,
  }),
);
const globalFontFamily =
  '"Alibaba PuHuiTi", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif';

const tokenTheme = computed(() => {
  const algorithm = isDark.value
    ? [theme.darkAlgorithm]
    : [theme.defaultAlgorithm];

  // antd 紧凑模式算法
  if (preferences.app.compact) {
    algorithm.push(theme.compactAlgorithm);
  }

  return {
    algorithm,
    token: {
      ...unref(tokens),
      fontFamily: globalFontFamily,
    },
  };
});
</script>

<template>
  <ConfigProvider :locale="antdLocale" :theme="tokenTheme">
    <App>
      <RouterView />
      <PrintFormatModal />
      <WorkflowTimelineModal />
      <TrackingMapModal />
      <JhtMascot v-if="shouldShowJhtMascot" />
    </App>
  </ConfigProvider>
</template>
