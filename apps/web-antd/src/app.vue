<script lang="ts" setup>
import { computed, unref } from 'vue';

import { useAntdDesignTokens } from '@vben/hooks';
import { preferences, usePreferences } from '@vben/preferences';

import { App, ConfigProvider, theme } from 'ant-design-vue';

import { PrintFormatModal } from '#/components/print-format';
import { TrackingMapModal } from '#/components/tracking-map';
import { WorkflowTimelineModal } from '#/components/workflow-timeline';
import { antdLocale } from '#/locales';

defineOptions({ name: 'App' });

const { isDark } = usePreferences();
const { tokens } = useAntdDesignTokens();
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
    </App>
  </ConfigProvider>
</template>
