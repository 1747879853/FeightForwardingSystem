<script lang="ts" setup>
import type { ReportPageConfig } from './types';

import { Page } from '@vben/common-ui';

import { Card } from 'ant-design-vue';

import ReportHotTable from './report-hot-table.vue';
import { useReportPage } from './use-report-page';

/**
 * 报表模板组件
 * 通过传入一份报表配置（ReportPageConfig）即可渲染完整的报表页面：
 * 顶部查询表单 + 分组/导出工具区 + Handsontable 表格
 *
 * 插槽（应对未来报表的特殊 UI 需求）：
 * - form-extra: 查询卡片内的额外内容
 * - toolbar: 表格上方操作区（如自定义导出按钮）
 * - table-extra: 表格之后的额外内容
 */
defineOptions({
  name: 'ReportPage',
});

const props = defineProps<{
  /** 报表配置（接口、表单、列、数据转换等差异点） */
  config: ReportPageConfig;
}>();

const {
  QueryForm,
  loading,
  originalData,
  groupColumns,
  expandedGroups,
  columnConfigs,
  dynamicHotColumns,
  numericColumnKeys,
  handleViewDetail,
} = useReportPage(props.config);
</script>

<template>
  <Page class="report-page">
    <Card class="query-card mb-3" :bordered="false">
      <component :is="QueryForm" />
      <slot name="form-extra" />
    </Card>

    <slot name="toolbar" />

    <ReportHotTable
      :original-data="originalData"
      :group-columns="groupColumns"
      :expanded-groups="expandedGroups"
      :column-configs="columnConfigs"
      :loading="loading"
      :hot-columns="dynamicHotColumns"
      :numeric-column-keys="numericColumnKeys"
      :report-title="config.name"
      @update:group-columns="groupColumns = $event"
      @update:expanded-groups="expandedGroups = $event"
      @update:column-configs="columnConfigs = $event"
      @view-detail="handleViewDetail"
    />

    <slot name="table-extra" />
  </Page>
</template>

<style scoped lang="scss">
.report-page {
  display: flex;
  flex-direction: column;
  padding: 0 !important;
  margin: 0 !important;
  overflow: hidden !important;
}

:deep(.vben-page-wrapper) {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0 !important;
  margin: 0 !important;
  overflow: hidden !important;
}

:deep(.vben-page-wrapper-content) {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0 !important;
  margin: 0 !important;
  overflow: hidden !important;
}

.query-card {
  flex-shrink: 0;

  :deep(.ant-card-body) {
    padding: 16px 10px 0;
  }
}
</style>
