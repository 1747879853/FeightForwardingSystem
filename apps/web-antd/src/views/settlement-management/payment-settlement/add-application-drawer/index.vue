<script lang="ts" setup>
import type { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';

import { computed, ref, watch } from 'vue';
import dayjs from 'dayjs';

import {
  Drawer,
  Button,
  message,
  Space,
  Tag,
  Table,
  InputNumber,
  Select,
} from 'ant-design-vue';
import type { ColumnsType } from 'ant-design-vue/es/table';

import { useVbenForm } from '#/adapter/form';
import { CurrencySelect } from '#/adapter/component';
import { getPaymentApplicationPagedListForSettlement } from '#/api/settlement-management/payment-application-admin';

import { useSearchSchema, getStatusColor, getStatusText } from './data';

interface Props {
  /** 付费结算ID（编辑时传入，用于排除已选择的申请） */
  paymentSettlementId?: string;
  /** 结算对象ID */
  settlementId?: string;
  /** 结算币别ID */
  currencyId?: number;
  /** 是否已有费用（用于控制筛选条件是否可修改） */
  hasExistingFees?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  confirm: [
    applications: Array<{
      application: PaymentApplicationAdminApi.PaymentApplicationForSettlementDto;
      settledAmount: number; // 本次结算金额
    }>,
  ];
}>();

const visible = ref(false);
const loading = ref(false);
const selectedRows = ref<
  Array<{
    application: PaymentApplicationAdminApi.PaymentApplicationForSettlementDto;
    settledAmount: number;
  }>
>([]);
const dataSource = ref<
  PaymentApplicationAdminApi.PaymentApplicationForSettlementDto[]
>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);

// 结算币别选择
const selectedCurrencyId = ref<number | undefined>(undefined);

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

  // 如果已有费用，则锁定筛选条件
  if (props.hasExistingFees) {
    if (props.settlementId) {
      await searchFormApi.setValues({ settlementId: props.settlementId });
      // 禁用结算对象字段
      setTimeout(() => {
        const settlementField = document.querySelector(
          '[data-field="settlementId"]',
        );
        if (settlementField) {
          const input = settlementField.querySelector(
            'input, .ant-select-selector',
          );
          if (input) {
            (input as HTMLElement).setAttribute('disabled', 'true');
            (input as HTMLElement).style.pointerEvents = 'none';
            (input as HTMLElement).style.opacity = '0.6';
          }
        }
      }, 100);
    }
    if (props.currencyId !== undefined) {
      await searchFormApi.setValues({ currencyId: props.currencyId });
      selectedCurrencyId.value = props.currencyId;
      // 禁用币别字段
      setTimeout(() => {
        const currencyField = document.querySelector(
          '[data-field="currencyId"]',
        );
        if (currencyField) {
          const input = currencyField.querySelector(
            'input, .ant-select-selector',
          );
          if (input) {
            (input as HTMLElement).setAttribute('disabled', 'true');
            (input as HTMLElement).style.pointerEvents = 'none';
            (input as HTMLElement).style.opacity = '0.6';
          }
        }
      }, 100);
    }
  } else {
    // 新建时不自动设置，让用户自由选择
    if (props.currencyId !== undefined && !props.hasExistingFees) {
      selectedCurrencyId.value = props.currencyId;
    }
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

/** 行选择变化 - 只允许选择一级数据 */
function handleRowSelectionChange(
  selectedRowKeys: (string | number)[],
  selectedRowsData: PaymentApplicationAdminApi.PaymentApplicationForSettlementDto[],
) {
  // 过滤掉二级数据（通过检查是否有currencyGroup来判断是否为一级）
  const validSelectedRows = selectedRowsData.filter(
    (row) => row.currencyGroup && row.currencyGroup.length > 0,
  );

  // 为每个选中的行初始化settledAmount
  selectedRows.value = validSelectedRows.map((row) => {
    const existing = selectedRows.value.find(
      (r) => r.application.id === row.id,
    );
    return {
      application: row,
      settledAmount: existing ? existing.settledAmount : 0,
    };
  });
}

/** 更新某行的本次结算金额 */
function handleSettledAmountChange(
  applicationId: string,
  value: number | null | undefined,
) {
  const row = selectedRows.value.find(
    (r) => r.application.id === applicationId,
  );
  if (row) {
    row.settledAmount = value ?? 0;
  }
}

/** 确认选择 */
function handleConfirm() {
  if (selectedRows.value.length === 0) {
    message.warning('请至少选择一个付费申请');
    return;
  }

  // 验证结算币别
  if (!selectedCurrencyId.value) {
    message.warning('请先选择结算币别');
    return;
  }

  emit('confirm', selectedRows.value);
  closeDrawer();
}

/** 暴露方法给父组件 */
defineExpose({
  openDrawer,
});

// 表格列配置
const columns: ColumnsType<PaymentApplicationAdminApi.PaymentApplicationForSettlementDto> =
  [
    {
      title: '',
      key: 'checkbox',
      width: 60,
      fixed: 'left',
    },
    {
      title: '申请单号',
      dataIndex: 'applicationNo',
      key: 'applicationNo',
      minWidth: 150,
      fixed: 'left',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
    },
    {
      title: '结算对象',
      dataIndex: 'clientName',
      key: 'clientName',
      minWidth: 120,
    },
    {
      title: '币别',
      dataIndex: 'currencyCode',
      key: 'currencyCode',
      width: 80,
    },
    {
      title: '应付金额',
      dataIndex: 'totalPayPrice',
      key: 'totalPayPrice',
      width: 120,
      align: 'right',
    },
    {
      title: '应收金额',
      dataIndex: 'totalReceivePrice',
      key: 'totalReceivePrice',
      width: 120,
      align: 'right',
    },
    {
      title: '未结算金额',
      dataIndex: 'unSettledAmount',
      key: 'unSettledAmount',
      width: 120,
      align: 'right',
    },
    {
      title: '本次结算',
      dataIndex: 'settledAmount',
      key: 'settledAmount',
      width: 150,
      align: 'right',
    },
    {
      title: '提交时间',
      dataIndex: 'submitTime',
      key: 'submitTime',
      width: 160,
    },
    {
      title: '最晚付款时间',
      dataIndex: 'endTime',
      key: 'endTime',
      width: 120,
    },
    {
      title: '申请人',
      dataIndex: 'creatorUserName',
      key: 'creatorUserName',
      width: 100,
    },
  ];
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

    <!-- 结算币别选择区域 -->
    <div
      v-if="!hasExistingFees"
      style="
        display: flex;
        gap: 12px;
        align-items: center;
        padding: 12px;
        margin-bottom: 16px;
        background: #f5f7fa;
        border-radius: 4px;
      "
    >
      <span style="font-weight: 500; color: #333">结算币别：</span>
      <CurrencySelect
        v-model="selectedCurrencyId"
        placeholder="请选择结算币别"
        allow-clear
        style="width: 200px"
      />
      <span style="font-size: 12px; color: #999">
        选择后将用于计算汇率和结算金额
      </span>
    </div>

    <Table
      :columns="columns"
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
        getCheckboxProps: (record) => ({
          disabled: !record.currencyGroup || record.currencyGroup.length === 0,
        }),
      }"
      bordered
      :expandable="{
        expandedRowKeys: [],
        expandIcon: () => null,
      }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <Tag :color="getStatusColor(record.status)">
            {{ getStatusText(record.status) }}
          </Tag>
        </template>

        <template v-else-if="column.key === 'settledAmount'">
          <InputNumber
            v-if="selectedRows.some((r) => r.application.id === record.id)"
            v-model:value="
              selectedRows.find((r) => r.application.id === record.id)!
                .settledAmount
            "
            :min="0"
            :precision="2"
            :max="
              record.currencyGroup?.reduce(
                (sum: number, g: any) => sum + (g.settleableUpperLimit || 0),
                0,
              ) || 0
            "
            placeholder="请输入"
            style="width: 100%"
            @change="
              (val: any) =>
                handleSettledAmountChange(
                  record.id,
                  val as number | null | undefined,
                )
            "
          />
          <span v-else style="color: #999">-</span>
        </template>
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
