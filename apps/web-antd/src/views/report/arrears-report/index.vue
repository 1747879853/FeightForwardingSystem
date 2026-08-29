<script lang="ts" setup>
import ReportPage from '../_shared/report-page.vue';

import { arrearsReportConfig } from './config';

/**
 * 欠费报表页面
 * 页面逻辑与视图均由 _shared 下的报表模板组件承载，
 * 本页面只负责提供报表配置（接口、表单、列、数据转换），参见 ./config
 */
defineOptions({
  name: 'ArrearsReport',
});
</script>

<template>
  <ReportPage :config="arrearsReportConfig" />
</template>
