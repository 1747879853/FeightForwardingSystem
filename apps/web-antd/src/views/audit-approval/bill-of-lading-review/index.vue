<script setup lang="ts">
import type { BillTask } from '#/api/bill-of-lading';
import { onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { Page } from '@vben/common-ui';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getBillTasks } from '#/api/bill-of-lading';
import { createPagedListQuery } from '#/utils/paged-list-query';
import { normalizeBillQuery } from '#/views/bill-of-lading/data';
import Detail from './detail.vue';
defineOptions({ name: 'BillOfLadingReview' });
const route = useRoute();
const detail = ref<InstanceType<typeof Detail>>();
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
        minWidth: 115,
        cellRender: {
          name: 'CellTag',
          options: ['审核中', '全部驳回', '全部通过', '部分通过'].map(
            (label, value) => ({ label, value }),
          ),
        },
      },
      {
        field: 'myTaskStatus',
        title: '我的审核状态',
        minWidth: 125,
        cellRender: {
          name: 'CellTag',
          options: ['待我审核', '我已驳回', '我已通过'].map((label, value) => ({
            label,
            value,
          })),
        },
      },
      {
        field: 'mblNums',
        title: '主提单号',
        minWidth: 180,
        formatter: ({ cellValue }: { cellValue?: string[] }) =>
          cellValue?.join('、'),
      },
      {
        field: 'blNums',
        title: '分提单号',
        minWidth: 180,
        formatter: ({ cellValue }: { cellValue?: string[] }) =>
          cellValue?.join('、'),
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
        title: '未收金额（本位币）',
        minWidth: 155,
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
    <Grid table-title="提单签出审核" />
    <Detail ref="detail" @success="gridApi.query()" />
  </Page>
</template>
