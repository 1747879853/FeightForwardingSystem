<script lang="ts" setup>
import type { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';

import { computed, ref } from 'vue';
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
  /** 已存在的申请ID列表（用于禁用这些申请的输入框） */
  existingApplicationIds?: string[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  confirm: [
    applications: Array<{
      application: PaymentApplicationAdminApi.PaymentApplicationForSettlementDto;
      settledPrice?: number; // 固定币别申请的结算总金额
      currencyItems?: Array<{
        originalCurrencyId: number;
        settledAmount: number;
      }>; // 原币申请的各币别结算量
    }>,
    selectedCurrencyId?: number, // 用户在抽屉中选择的结算币别ID
  ];
}>();

const visible = ref(false);
const loading = ref(false);
const selectedRowKeys = ref<string[]>([]);
const dataSource = ref<
  PaymentApplicationAdminApi.PaymentApplicationForSettlementDto[]
>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);

// 结算币别选择（独立于搜索表单）
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
  selectedRowKeys.value = [];
  currentPage.value = 1;

  // 重置独立的结算币别选择
  selectedCurrencyId.value = props.currencyId;

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
    // if (props.currencyId !== undefined) {
    //   await searchFormApi.setValues({ currencyId: props.currencyId });
    // }
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

    // 为每个申请初始化用户输入字段
    dataSource.value = (result.items || []).map((app) => {
      // 固定币别申请：初始化 settledPrice 字段
      if (app.currencyId) {
        app.settledPrice = app.settledPrice ?? 0;
      }

      // 原币申请：为每个币别分组初始化 settledAmount 字段
      if (app.currencyGroup) {
        app.currencyGroup = app.currencyGroup.map((group: any) => ({
          ...group,
          settledAmount: group.settledAmount ?? 0, // 初始化用户输入的结算金额，保留已有值或默认为0
        }));
      }
      return app;
    });

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
function handleRowSelectionChange(selectedRowKeysValue: (string | number)[]) {
  selectedRowKeys.value = selectedRowKeysValue.map((key) => String(key));
}

/** 获取选中的申请数据 */
function getSelectedApplications() {
  return dataSource.value.filter((item) =>
    selectedRowKeys.value.includes(item.id),
  );
}

/** 确认选择 */
async function handleConfirm() {
  const selectedApps = getSelectedApplications();

  if (selectedApps.length === 0) {
    message.warning('请至少选择一个付费申请');
    return;
  }

  // 验证是否选择了结算币别
  if (!selectedCurrencyId.value) {
    message.warning('请选择结算币别');
    return;
  }

  // 验证每个选中的申请是否有结算金额
  for (const app of selectedApps) {
    // 固定币别申请：检查 settledPrice
    if (app.currencyId) {
      // 需要从用户输入获取settledPrice，暂时跳过验证
      continue;
    }

    // 原币申请：检查每个币别的settledAmount
    if (!app.currencyId && app.currencyGroup) {
      const hasSettledAmount = app.currencyGroup.some(
        (g: any) => g.settleableUpperLimit > 0 || g.settleableLowerLimit < 0,
      );
      if (!hasSettledAmount) {
        message.warning(`申请单 ${app.applicationNo} 没有可结算的金额`);
        return;
      }
    }
  }

  // 构造返回数据，并过滤掉结算金额为0的申请
  const result = selectedApps
    .map((app) => {
      const item: any = {
        application: app,
      };

      // 固定币别申请
      if (app.currencyId) {
        // 从用户输入获取 settledPrice
        item.settledPrice = app.settledPrice || 0;
      } else {
        // 原币申请：只收集用户填写了结算金额的币别（过滤掉settledAmount为0的）
        item.currencyItems = (app.currencyGroup || [])
          .filter((g: any) => {
            // 首先检查是否有可结算金额
            const hasSettleableAmount =
              g.settleableUpperLimit > 0 || g.settleableLowerLimit < 0;
            // 然后检查用户是否填写了非零的结算金额
            const hasUserInput = g.settledAmount && g.settledAmount !== 0;
            // 只有同时满足两个条件才保留
            return hasSettleableAmount && hasUserInput;
          })
          .map((g: any) => ({
            originalCurrencyId: g.id,
            settledAmount: g.settledAmount, // 使用用户输入的settledAmount
          }));
      }

      return item;
    })
    .filter((item) => {
      // 过滤掉结算金额为0的申请
      if (item.application.currencyId) {
        // 固定币别申请：检查settledPrice是否为0
        return item.settledPrice !== 0;
      } else {
        // 原币申请：检查currencyItems是否为空（如果为空说明没有填写任何结算金额）
        return item.currencyItems && item.currencyItems.length > 0;
      }
    });

  // 如果过滤后没有数据，提示用户
  if (result.length === 0) {
    message.warning('所有申请的结算金额都为0，请至少填写一个非零的结算金额');
    return;
  }

  emit('confirm', result, selectedCurrencyId.value);
  closeDrawer();
}

/** 暴露方法给父组件 */
defineExpose({
  openDrawer,
  closeDrawer,
});

// 格式化业务类型
function getBizTypeName(bizType: number): string {
  const bizTypeMap: Record<number, string> = {
    1: '海运出口',
    2: '海运进口',
    3: '空运出口',
    4: '空运进口',
    5: '陆运',
  };
  return bizTypeMap[bizType] || '未知';
}

// 格式化收付类型
function getPaySideName(paySide: number): string {
  const paySideMap: Record<number, string> = {
    1: '应收',
    2: '应付',
  };
  return paySideMap[paySide] || '-';
}

// 格式化金额
function formatAmount(value: number | undefined | null): string {
  if (value === undefined || value === null) return '-';
  return value.toFixed(2);
}

// 格式化时间
function formatDateTime(dateTime: string | undefined | null): string {
  if (!dateTime) return '-';
  return dayjs(dateTime).format('YYYY-MM-DD HH:mm:ss');
}

// 从费用明细中聚合委托编号（去重后用逗号分隔）
function getCommissionNums(
  orderFees: PaymentApplicationAdminApi.OrderFeeForSettlementDto[] | undefined,
): string {
  if (!orderFees || orderFees.length === 0) return '-';

  const commissionNums = orderFees
    .map((fee) => fee.transportOrder?.commissionNum)
    .filter((num) => num && num.trim() !== '')
    .filter((num, index, self) => self.indexOf(num) === index); // 去重

  return commissionNums.length > 0 ? commissionNums.join(', ') : '-';
}

// 从费用明细中聚合主提单号（去重后用逗号分隔）
function getMblNums(
  orderFees: PaymentApplicationAdminApi.OrderFeeForSettlementDto[] | undefined,
): string {
  if (!orderFees || orderFees.length === 0) return '-';

  const mblNums = orderFees
    .map((fee) => fee.transportOrder?.mblNum)
    .filter((num) => num && num.trim() !== '')
    .filter((num, index, self) => self.indexOf(num) === index); // 去重

  return mblNums.length > 0 ? mblNums.join(', ') : '-';
}

// 格式化未结算费用范围
function formatUnsettledRange(upperLimit: number, lowerLimit: number): string {
  if (upperLimit === 0 && lowerLimit === 0) return '-';
  return `[${formatAmount(lowerLimit)} ~ ${formatAmount(upperLimit)}]`;
}

// 获取公司名称
function getCompanyName(
  record: PaymentApplicationAdminApi.PaymentApplicationForSettlementDto,
): string {
  return record.companys?.[0]?.name || '-';
}

// 表格列配置 - 第一层（付费申请）
const columns: ColumnsType<PaymentApplicationAdminApi.PaymentApplicationForSettlementDto> =
  [
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
      title: '结算对象',
      dataIndex: 'clientName',
      key: 'clientName',
      minWidth: 120,
    },
    {
      title: '支付要求',
      dataIndex: 'require',
      key: 'require',
      width: 100,
    },
    {
      title: '币别',
      dataIndex: 'currencyCode',
      key: 'currencyCode',
      width: 80,
    },
    {
      title: '申请人',
      dataIndex: 'creatorUserName',
      key: 'creatorUserName',
      width: 100,
    },
    {
      title: '未结算费用',
      key: 'unsettledRange',
      width: 180,
      align: 'right',
    },
    {
      title: '本次结算金额',
      key: 'settledPrice',
      width: 150,
      align: 'right',
    },
    {
      title: '所属公司',
      key: 'companyName',
      width: 150,
    },
  ];

// 第二层列配置（币别分组）
const currencyGroupColumns: ColumnsType<PaymentApplicationAdminApi.CurrencyGroupForSettlementDto> =
  [
    {
      title: '币别',
      dataIndex: 'code',
      key: 'code',
      width: 80,
    },
    {
      title: '委托编号',
      key: 'commissionNums',
      width: 150,
    },
    {
      title: '主提单号',
      key: 'mblNums',
      width: 150,
    },
    {
      title: '应收金额',
      dataIndex: 'receiveAmount',
      key: 'receiveAmount',
      width: 120,
      align: 'right',
    },
    {
      title: '应付金额',
      dataIndex: 'payAmount',
      key: 'payAmount',
      width: 120,
      align: 'right',
    },
    {
      title: '未结算费用',
      key: 'unsettledRange',
      width: 180,
      align: 'right',
    },
    {
      title: '本次结算金额',
      key: 'settledAmount',
      width: 150,
      align: 'right',
    },
  ];

// 第三层列配置（费用明细）
const orderFeeColumns: ColumnsType<PaymentApplicationAdminApi.OrderFeeForSettlementDto> =
  [
    {
      title: '委托编号',
      key: 'commissionNum',
      width: 150,
    },
    // {
    //   title: '业务类型',
    //   key: 'bizType',
    //   width: 100,
    // },
    {
      title: '主提单号',
      key: 'mblNum',
      width: 150,
    },
    {
      title: '收付类型',
      dataIndex: 'paySide',
      key: 'paySide',
      width: 100,
    },
    {
      title: '费用名称',
      dataIndex: 'feeCodeName',
      key: 'feeCodeName',
      width: 120,
    },
    {
      title: '币别',
      dataIndex: 'currencyCode',
      key: 'currencyCode',
      width: 80,
    },
    {
      title: '原始金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right',
    },
    {
      title: '结算对象',
      dataIndex: 'settlementName',
      key: 'settlementName',
      width: 120,
    },
    {
      title: '未开票金额',
      dataIndex: 'unInvoicedAmount',
      key: 'unInvoicedAmount',
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

    <!-- 结算币别选择（独立于搜索表单，明显展示） -->
    <div
      style="
        padding: 12px 16px;
        margin-bottom: 16px;
        background: #f0f5ff;
        border: 1px solid #adc6ff;
        border-radius: 4px;
      "
    >
      <div style="display: flex; gap: 12px; align-items: center">
        <span style="font-weight: 500; color: #1890ff; white-space: nowrap">
          <span style="margin-right: 4px; color: #ff4d4f">*</span>
          结算币别：
        </span>
        <CurrencySelect
          v-model="selectedCurrencyId"
          placeholder="请选择结算币别"
          allow-clear
          style="width: 200px"
        />
        <span style="font-size: 12px; color: #999">
          请选择用于本次结算的币别
        </span>
      </div>
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
        selectedRowKeys: selectedRowKeys,
        onChange: handleRowSelectionChange,
      }"
      bordered
      :expandable="{
        defaultExpandAllRows: false,
        expandIconColumnIndex: 0,
      }"
    >
      <!-- 第一层：付费申请 -->
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'applicationNo'">
          <div style="display: flex; gap: 4px; align-items: center">
            <a>{{
              (
                record as PaymentApplicationAdminApi.PaymentApplicationForSettlementDto
              ).applicationNo
            }}</a>
            <Tag
              v-if="
                props.existingApplicationIds?.includes(
                  (
                    record as PaymentApplicationAdminApi.PaymentApplicationForSettlementDto
                  ).id,
                )
              "
              color="orange"
              size="small"
            >
              已有费用
            </Tag>
          </div>
        </template>

        <template v-else-if="column.key === 'status'">
          <Tag
            :color="
              getStatusColor(
                (
                  record as PaymentApplicationAdminApi.PaymentApplicationForSettlementDto
                ).status,
              )
            "
          >
            {{
              getStatusText(
                (
                  record as PaymentApplicationAdminApi.PaymentApplicationForSettlementDto
                ).status,
              )
            }}
          </Tag>
        </template>

        <template v-else-if="column.key === 'submitTime'">
          {{
            formatDateTime(
              (
                record as PaymentApplicationAdminApi.PaymentApplicationForSettlementDto
              ).submitTime,
            )
          }}
        </template>

        <template v-else-if="column.key === 'endTime'">
          {{
            formatDateTime(
              (
                record as PaymentApplicationAdminApi.PaymentApplicationForSettlementDto
              ).endTime,
            )
          }}
        </template>

        <template v-else-if="column.key === 'currencyCode'">
          {{
            (
              record as PaymentApplicationAdminApi.PaymentApplicationForSettlementDto
            ).currencyCode || '原币'
          }}
        </template>

        <template v-else-if="column.key === 'unsettledRange'">
          {{
            formatUnsettledRange(
              (
                record as PaymentApplicationAdminApi.PaymentApplicationForSettlementDto
              ).totalSettleablePriceUpperLimit || 0,
              (
                record as PaymentApplicationAdminApi.PaymentApplicationForSettlementDto
              ).totalSettleablePriceLowerLimit || 0,
            )
          }}
        </template>

        <template v-else-if="column.key === 'settledPrice'">
          <InputNumber
            v-if="
              (
                record as PaymentApplicationAdminApi.PaymentApplicationForSettlementDto
              ).currencyId
            "
            v-model:value="record.settledPrice"
            :min="
              (
                record as PaymentApplicationAdminApi.PaymentApplicationForSettlementDto
              ).totalSettleablePriceLowerLimit || 0
            "
            :max="
              (
                record as PaymentApplicationAdminApi.PaymentApplicationForSettlementDto
              ).totalSettleablePriceUpperLimit || 0
            "
            :precision="2"
            placeholder="请输入"
            style="width: 100%"
            :disabled="
              !selectedRowKeys.includes(
                (
                  record as PaymentApplicationAdminApi.PaymentApplicationForSettlementDto
                ).id,
              ) ||
              ((
                record as PaymentApplicationAdminApi.PaymentApplicationForSettlementDto
              ).totalSettleablePriceUpperLimit === 0 &&
                (
                  record as PaymentApplicationAdminApi.PaymentApplicationForSettlementDto
                ).totalSettleablePriceLowerLimit === 0) ||
              (props.existingApplicationIds?.includes(
                (
                  record as PaymentApplicationAdminApi.PaymentApplicationForSettlementDto
                ).id,
              ) ??
                false)
            "
          />
          <span v-else style="color: #999">原币申请</span>
        </template>

        <template v-else-if="column.key === 'companyName'">
          {{
            getCompanyName(
              record as PaymentApplicationAdminApi.PaymentApplicationForSettlementDto,
            )
          }}
        </template>
      </template>

      <!-- 第二层：币别分组 -->
      <template #expandedRowRender="{ record }">
        <Table
          :columns="currencyGroupColumns"
          :data-source="record.currencyGroup || []"
          :pagination="false"
          row-key="id"
          bordered
          size="small"
          :expandable="{
            defaultExpandAllRows: false,
            expandIconColumnIndex: 0,
          }"
        >
          <template #bodyCell="{ column, record: currencyRecord }">
            <template v-if="column.key === 'commissionNums'">
              {{ getCommissionNums(currencyRecord.orderFees) }}
            </template>

            <template v-else-if="column.key === 'mblNums'">
              {{ getMblNums(currencyRecord.orderFees) }}
            </template>

            <template v-else-if="column.key === 'unsettledRange'">
              {{
                formatUnsettledRange(
                  currencyRecord.settleableUpperLimit || 0,
                  currencyRecord.settleableLowerLimit || 0,
                )
              }}
            </template>

            <template v-else-if="column.key === 'settledAmount'">
              <InputNumber
                v-if="!record.currencyId"
                v-model:value="currencyRecord.settledAmount"
                :min="currencyRecord.settleableLowerLimit || 0"
                :max="currencyRecord.settleableUpperLimit || 0"
                :precision="2"
                placeholder="请输入"
                style="width: 100%"
                :disabled="
                  !selectedRowKeys.includes(record.id) ||
                  (currencyRecord.settleableUpperLimit === 0 &&
                    currencyRecord.settleableLowerLimit === 0) ||
                  (props.existingApplicationIds?.includes(record.id) ?? false)
                "
              />
              <span v-else style="color: #999">-</span>
            </template>
          </template>

          <!-- 第三层：费用明细 -->
          <template #expandedRowRender="{ record: feeRecord }">
            <Table
              :columns="orderFeeColumns"
              :data-source="feeRecord.orderFees || []"
              :pagination="false"
              row-key="id"
              bordered
              size="small"
            >
              <template #bodyCell="{ column, record: feeItem }">
                <template v-if="column.key === 'commissionNum'">
                  {{ feeItem.transportOrder?.commissionNum || '-' }}
                </template>

                <template v-else-if="column.key === 'bizType'">
                  {{
                    feeItem.transportOrder?.bizType
                      ? getBizTypeName(feeItem.transportOrder.bizType)
                      : '-'
                  }}
                </template>

                <template v-else-if="column.key === 'mblNum'">
                  {{ feeItem.transportOrder?.mblNum || '-' }}
                </template>

                <template v-else-if="column.key === 'paySide'">
                  {{ getPaySideName(feeItem.paySide) }}
                </template>

                <template v-else-if="column.key === 'amount'">
                  {{ formatAmount(feeItem.amount) }}
                </template>
              </template>
            </Table>
          </template>
        </Table>
      </template>
    </Table>

    <template #footer>
      <Space>
        <Button @click="closeDrawer">取消</Button>
        <Button type="primary" @click="handleConfirm">
          确定 (已选 {{ selectedRowKeys.length }} 个)
        </Button>
      </Space>
    </template>
  </Drawer>
</template>
