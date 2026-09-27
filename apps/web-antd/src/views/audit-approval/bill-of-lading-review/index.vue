<script setup lang="ts">
import type { BillTask } from '#/api/bill-of-lading';
import { onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { Page } from '@vben/common-ui';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getBillTask, getBillTasks } from '#/api/bill-of-lading';
import { createPagedListQuery } from '#/utils/paged-list-query';
import { normalizeBillQuery } from '#/views/bill-of-lading/data';
import CopyBillNo from '#/views/bill-of-lading/copy-bill-no.vue';
import MoneyCell from '#/views/bill-of-lading/money-cell.vue';

import Detail from './detail.vue';
import { summarizeBatchOrigin } from './origin-summary';
import TaskStatusCell from './task-status-cell.vue';
defineOptions({ name: 'BillOfLadingReview' });
const route = useRoute();
const detail = ref<InstanceType<typeof Detail>>();
const originCache = new Map<
  string,
  { code: string; lines: ReturnType<typeof summarizeBatchOrigin>['lines'] }
>();

function loadRowOrigin(id: string) {
  const cached = originCache.get(id);
  if (cached) return Promise.resolve(cached);
  return getBillTask(id).then((task) => {
    const summary = summarizeBatchOrigin(task);
    originCache.set(id, summary);
    return summary;
  });
}
const [Grid, gridApi] = useVbenVxeGrid<BillTask>({
  formOptions: {
    submitOnChange: true,
    compact: true,
    wrapperClass: 'grid-cols-4',
    schema: [
      {
        fieldName: 'MyAuditStatus',
        label: '我的审核状态',
        component: 'Select',
        defaultValue: 0,
        componentProps: {
          allowClear: true,
          options: [
            { label: '待我审核', value: 0 },
            { label: '我已审核', value: 2 },
          ],
        },
      },
      {
        fieldName: 'Processed',
        label: '处理完毕',
        component: 'Select',
        componentProps: {
          allowClear: true,
          options: [
            { label: '是', value: true },
            { label: '否', value: false },
          ],
        },
      },
      {
        fieldName: 'BlNum',
        label: '提单号',
        component: 'Input',
        componentProps: { allowClear: true },
      },
      {
        fieldName: 'ClientId',
        label: '委托单位',
        component: 'ClientSelect',
        componentProps: { allowClear: true },
      },
      {
        fieldName: 'SubmitTimeRange',
        label: '提交时间',
        component: 'RangePicker',
      },
    ],
  },
  gridEvents: {
    cellDblclick: ({ row }: { row: BillTask }) => detail.value?.open(row.id),
  },
  gridOptions: {
    height: 'auto',
    rowConfig: { keyField: 'id', isHover: true },
    pagerConfig: { enabled: true },
    columns: [
      {
        field: 'taskStatus',
        title: '批次状态',
        minWidth: 120,
        slots: { default: 'taskStatus' },
      },
      {
        field: 'mblNums',
        title: '主提单号',
        minWidth: 180,
        slots: { default: 'mblNums' },
      },
      {
        field: 'blNums',
        title: '分提单号',
        minWidth: 180,
        slots: { default: 'blNums' },
      },
      { field: 'settlement.name', title: '结算对象', minWidth: 160 },
      { field: 'client.name', title: '委托单位', minWidth: 160 },
      { field: 'creatorUserName', title: '申请人', width: 110 },
      {
        field: 'creationTime',
        title: '申请时间',
        width: 170,
        formatter: 'formatDateTime',
      },
      {
        field: 'sales',
        title: '销售',
        minWidth: 120,
        formatter: ({ cellValue }: { cellValue?: { nickName?: string }[] }) =>
          cellValue?.map((x: { nickName?: string }) => x.nickName).join('、'),
      },
      {
        field: 'operators',
        title: '操作',
        minWidth: 120,
        formatter: ({ cellValue }: { cellValue?: { nickName?: string }[] }) =>
          cellValue?.map((x: { nickName?: string }) => x.nickName).join('、'),
      },
      {
        field: 'totalUnReceivedAmount',
        title: '未收金额',
        minWidth: 155,
        align: 'right',
        slots: { default: 'totalUnReceivedAmount' },
      },
      { field: 'totalCtn', title: '箱型箱量', minWidth: 130 },
      { field: 'itemCount', title: '提单数量', width: 95 },
      { field: 'pendingItemCount', title: '未完成数量', width: 105 },
    ],
    proxyConfig: {
      autoLoad: false,
      ajax: {
        query: createPagedListQuery(getBillTasks, {
          mapParams: normalizeBillQuery,
        }),
      },
    },
    toolbarConfig: { custom: true, refresh: { code: 'query' }, zoom: true },
  },
});
onMounted(() => gridApi.formApi.submitForm());
watch(
  [() => route.query.taskId, detail],
  ([id, panel]) => {
    if (typeof id === 'string' && panel) panel.open(id);
  },
  { immediate: true },
);
</script>
<template>
  <Page auto-content-height>
    <Grid table-title="提单签出审核">
      <template #mblNums="{ row }">
        <CopyBillNo :texts="row.mblNums" />
      </template>
      <template #blNums="{ row }">
        <CopyBillNo :texts="row.blNums" />
      </template>
      <template #taskStatus="{ row }">
        <TaskStatusCell :row="row" />
      </template>
      <template #totalUnReceivedAmount="{ row }">
        <MoneyCell
          :value="row.totalUnReceivedAmount"
          :code="row.localCurrencyCode"
          :lines="row.currencies"
          :load="() => loadRowOrigin(row.id)"
        />
      </template>
    </Grid>
    <Detail ref="detail" @success="gridApi.query()" />
  </Page>
</template>
