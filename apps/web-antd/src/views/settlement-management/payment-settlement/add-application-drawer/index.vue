<script lang="ts" setup>
import type { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';

import { computed, ref } from 'vue';
import dayjs from 'dayjs';

import { Drawer, Button, message, Space, Tag, Table } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { getPaymentApplicationPagedListForSettlement } from '#/api/settlement-management/payment-application-admin';

import { useSearchSchema, getStatusColor, getStatusText } from './data';

interface Props {
  /** 付费结算ID（编辑时传入，用于排除已选择的申请） */
  paymentSettlementId?: string;
  /** 结算对象ID */
  settlementId?: string;
  /** 结算币别ID */
  currencyId?: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  confirm: [
    applications: PaymentApplicationAdminApi.PaymentApplicationForSettlementDto[],
  ];
}>();

const visible = ref(false);
const loading = ref(false);
const selectedRows = ref<
  PaymentApplicationAdminApi.PaymentApplicationForSettlementDto[]
>([]);
const dataSource = ref<
  PaymentApplicationAdminApi.PaymentApplicationForSettlementDto[]
>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);

// 查询表单
const [SearchForm, searchFormApi] = useVbenForm({
  commonConfig: {
    componentProps: { class: 'w-full' },
  },
  layout: 'horizontal',
  schema: useSearchSchema(),
  showDefaultActions: false,
  compact: true,
  wrapperClass: 'grid-cols-3',
});

/** 打开抽屉 */
async function openDrawer() {
  visible.value = true;
  selectedRows.value = [];
  currentPage.value = 1;

  // 设置默认值
  await searchFormApi.resetForm();
  if (props.settlementId) {
    await searchFormApi.setValues({ settlementId: props.settlementId });
  }
  if (props.currencyId !== undefined) {
    await searchFormApi.setValues({ currencyId: props.currencyId });
  }

  await fetchData();
}

/** 关闭抽屉 */
function closeDrawer() {
  visible.value = false;
}

/** 获取数据 */
async function fetchData() {
  loading.value = true;
  try {
    const formValues = await searchFormApi.getValues();
    const [submitTimeStart, submitTimeEnd] = formValues.submitTimeRange || [];
    const [endTimeStart, endTimeEnd] = formValues.endTimeRange || [];

    const params: PaymentApplicationAdminApi.PaymentApplicationSettlementQueryParams =
      {
        paymentSettlementId: props.paymentSettlementId,
        keyword: formValues.keyword,
        applicationNo: formValues.applicationNo,
        settlementId: formValues.settlementId,
        currencyId: formValues.currencyId,
        creatorUserId: formValues.creatorUserId,
        submitTimeStart: submitTimeStart
          ? dayjs(submitTimeStart).toISOString()
          : undefined,
        submitTimeEnd: submitTimeEnd
          ? dayjs(submitTimeEnd).toISOString()
          : undefined,
        endTimeStart: endTimeStart
          ? dayjs(endTimeStart).toISOString()
          : undefined,
        endTimeEnd: endTimeEnd ? dayjs(endTimeEnd).toISOString() : undefined,
        skipCount: (currentPage.value - 1) * pageSize.value,
        maxResultCount: pageSize.value,
      };

    const result = await getPaymentApplicationPagedListForSettlement(params);
    dataSource.value = result.items || [];
    total.value = result.totalCount || 0;
  } catch (error: any) {
    message.error(error.message || '获取数据失败');
  } finally {
    loading.value = false;
  }
}

/** 搜索 */
async function handleSearch() {
  currentPage.value = 1;
  await fetchData();
}

/** 重置 */
async function handleReset() {
  await searchFormApi.resetForm();
  currentPage.value = 1;
  await fetchData();
}

/** 分页变化 */
function handlePageChange(page: number, size: number) {
  currentPage.value = page;
  pageSize.value = size;
  fetchData();
}

/** 行选择变化 */
function handleRowSelectionChange(
  selectedRowKeys: string[],
  selectedRowsData: PaymentApplicationAdminApi.PaymentApplicationForSettlementDto[],
) {
  selectedRows.value = selectedRowsData;
}

/** 确认选择 */
function handleConfirm() {
  if (selectedRows.value.length === 0) {
    message.warning('请至少选择一个付费申请');
    return;
  }
  emit('confirm', selectedRows.value);
  closeDrawer();
}

/** 暴露方法给父组件 */
defineExpose({
  openDrawer,
});
</script>

<template>
  <Drawer
    v-model:open="visible"
    title="选择付费申请"
    width="90%"
    :footer-style="{ textAlign: 'right' }"
  >
    <template #extra>
      <Space>
        <Button @click="handleReset">重置</Button>
        <Button type="primary" @click="handleSearch">查询</Button>
      </Space>
    </template>

    <div style="margin-bottom: 16px">
      <SearchForm />
    </div>

    <Table
      :columns="[
        { type: 'checkbox', width: 60, fixed: 'left' },
        {
          field: 'applicationNo',
          title: '申请单号',
          minWidth: 150,
          fixed: 'left',
        },
        {
          field: 'status',
          title: '状态',
          width: 100,
          slots: { default: 'status' },
        },
        { field: 'clientName', title: '结算对象', minWidth: 120 },
        { field: 'currencyCode', title: '币别', width: 80 },
        {
          field: 'totalPayPrice',
          title: '应付金额',
          width: 120,
          align: 'right',
        },
        {
          field: 'totalReceivePrice',
          title: '应收金额',
          width: 120,
          align: 'right',
        },
        { field: 'submitTime', title: '提交时间', width: 160 },
        { field: 'endTime', title: '最晚付款时间', width: 120 },
        { field: 'creatorUserName', title: '申请人', width: 100 },
      ]"
      :data-source="dataSource"
      :loading="loading"
      :pagination="{
        current: currentPage,
        pageSize: pageSize,
        total: total,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total) => `共 ${total} 条`,
      }"
      row-key="id"
      :row-selection="{
        type: 'checkbox',
        onChange: handleRowSelectionChange,
      }"
      bordered
    >
      <template #status="{ record }">
        <Tag :color="getStatusColor(record.status)">
          {{ getStatusText(record.status) }}
        </Tag>
      </template>
    </Table>

    <template #footer>
      <Space>
        <Button @click="closeDrawer">取消</Button>
        <Button type="primary" @click="handleConfirm">
          确定 (已选 {{ selectedRows.length }} 个)
        </Button>
      </Space>
    </template>
  </Drawer>
</template>
