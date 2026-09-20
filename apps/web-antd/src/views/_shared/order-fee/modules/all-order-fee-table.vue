<script lang="ts" setup>
import { rememberPermissionRow } from '#/composables/field-permission';
import { useFieldPermission } from '#/composables/use-field-permission';
import { orderFeeFieldPermission } from '#/composables/field-permission-profiles';
const { usePermissionGrid: useVbenVxeGrid } = useFieldPermission(
  orderFeeFieldPermission,
);

import type { OrderFeeAdminApi } from '#/api/sea-export/order-fee-admin';
import type { ExpenseSubmissionAdminApi } from '#/api/audit-approval/expense-admin';
import type { CurrencyAdminApi } from '#/api/system/base-data/currency-admin';

import { computed, onMounted, ref, watch, h, nextTick } from 'vue';
import {
  Button,
  Input,
  Select,
  InputNumber,
  Space,
  Table,
  Checkbox,
  message,
  DropdownButton,
  MenuItem,
  Menu,
  Modal,
  Textarea,
  Tag,
  Card,
  Tooltip,
} from 'ant-design-vue';
import { sortOrderFeeList } from './utils/order-fee-sort';
import { $t } from '#/locales';
import { orderFeeDataT, clientDataT } from '../data';
import dayjs from 'dayjs';
import { CircleHelp, IconifyIcon } from '@vben/icons';
import OrderFeeWarningTicker from './order-fee-warning-ticker.vue';
import type { OrderFeeWarningDisplayItem } from './utils/order-fee-warning-messages';

import * as feeConstants from '../data';

import { OrderFeeTaskDetailAsync } from '#/api/audit-approval/expense-admin';
import { getCurrencyPagedList } from '#/api/system/base-data/currency-admin';

const dataSource = defineModel<ExpenseSubmissionAdminApi.OrderFeeAndTaskDto[]>({
  default: () => [],
});

const props = defineProps<{
  type?: number; // 收付类型 0 应收 1 应付
  transportOrderId: string;
  entityId: string;
  changeOrderId?: string | null; // ✅ 新增：更改单 id，用于精确定位费用任务
  /** 费用预警展示项（优先于 warningMessages） */
  warningItems?: OrderFeeWarningDisplayItem[];
  /** 费用预警文案（兼容旧用法） */
  warningMessages?: string[];
  /** 预警悬停高亮的费用 id */
  highlightFeeIds?: string[];
}>();

const emit = defineEmits<{
  (e: 'updateTableData', data: any[]): void;
  (e: 'updateSelectData', keys: any[]): void;
  (e: 'highlight', orderFeeIds: string[]): void;
}>();

const highlightIdSet = computed(() => {
  const ids = props.highlightFeeIds ?? [];
  return new Set(ids.map((id) => String(id)));
});

function resolveRowWarningClass({ row }: { row: any }) {
  const id = row?.id;
  if (id && highlightIdSet.value.has(String(id))) {
    return 'fee-warning-highlight-row';
  }
  return '';
}

// 币别符号映射表（从API获取）
const currencySymbolMap = ref<Record<number, string>>({});

/**
 * 加载所有币别并构建符号映射表
 */
const loadCurrencySymbols = async () => {
  try {
    // 获取所有币别（使用较大的pageSize确保获取全部）
    const result = await getCurrencyPagedList({
      PageIndex: 1,
      PageSize: 1000,
    });

    if (result && result.items) {
      // 构建币别ID到符号的映射
      const symbolMap: Record<number, string> = {};
      result.items.forEach((currency: CurrencyAdminApi.CurrencyDto) => {
        if (currency.id && currency.symbol) {
          symbolMap[currency.id] = currency.symbol;
        }
      });
      currencySymbolMap.value = symbolMap;
    }
  } catch (error) {
    console.error('❌ 加载币别符号失败:', error);
    // 失败时使用默认的硬编码映射
    const defaultOptions = feeConstants.getCurrencyEnumSymbolOptions();
    const symbolMap: Record<number, string> = {};
    defaultOptions.forEach((opt) => {
      symbolMap[opt.value] = opt.label;
    });
    currencySymbolMap.value = symbolMap;
  }
};

/**
 * 转换币别符号
 * @param currencyId 币别ID
 * @returns 币别符号
 */
const transCurrencySymbol = (currencyId: number | string | undefined) => {
  // 如果 currencyId 为空，返回空字符串
  if (currencyId === undefined || currencyId === null || currencyId === '') {
    return '';
  }

  // 申请修改币别的费用，currencyId 会被展示层改写为 "原值 => [新值]"，取原值查找符号
  const normalizedId = Number(String(currencyId).split('=>')[0]?.trim());
  if (!Number.isFinite(normalizedId)) {
    return '';
  }

  // 优先从API获取的映射表中查找
  if (currencySymbolMap.value[normalizedId]) {
    return currencySymbolMap.value[normalizedId];
  }

  // 如果映射表中没有，则使用默认的硬编码选项
  const option = feeConstants
    .getCurrencyEnumSymbolOptions()
    .find((o) => o.value === normalizedId);
  return option ? option.label : String(normalizedId);
};

/**
 * 费用明细表格列定义（审核详情页专用）
 */
const useOrderFeeDetailColumns = () => {
  return [
    { type: 'checkbox', width: 48, fixed: 'left' },
    {
      title: orderFeeDataT('feeStatus'),
      field: 'combinedFeeStatus',
      width: 100,
      align: 'center',
      slots: {
        default: ({ row }: any) => {
          const task = row.task;
          const statusTag = h(
            Tag,
            {
              color:
                feeConstants
                  .getFeeStatusOptions()
                  .find((opt) => opt.value === row.combinedFeeStatus)?.color ||
                'default',
            },
            () =>
              feeConstants
                .getFeeStatusOptions()
                .find((opt) => opt.value === row.combinedFeeStatus)?.label ||
              '--',
          );

          // 申请修改 / 申请删除（待审核）：状态旁问号，悬停展示原因
          const isPendingModify =
            task && task.taskType === 1 && task.taskStatus === 0;
          const isPendingDelete =
            task && task.taskType === 2 && task.taskStatus === 0;

          if (isPendingModify || isPendingDelete) {
            const reason =
              task.remark ||
              (isPendingDelete ? '未填写删除原因' : '未填写修改原因');
            return h(
              'div',
              {
                style:
                  'display: flex; align-items: center; justify-content: center; gap: 4px;',
              },
              [
                statusTag,
                h(
                  Tooltip,
                  {
                    title: reason,
                    placement: 'top',
                  },
                  {
                    default: () =>
                      h(IconifyIcon, {
                        icon: 'ant-design:question-circle-outlined',
                        style:
                          'cursor: pointer; color: #1890ff; font-size: 22px;',
                        onClick: (e: Event) => {
                          e.stopPropagation();
                          showTaskReason(row);
                        },
                      }),
                  },
                ),
              ],
            );
          }

          return statusTag;
        },
      },
    },
    {
      title: orderFeeDataT('feecodeName'),
      field: 'feeCodeId',
      width: 120,
      formatter: ({ row }: any) => {
        return row.feeCode?.cnName || '--';
      },
    },
    {
      title: orderFeeDataT('settlement'),
      field: 'settlementId',
      width: 120,
      formatter: ({ row }: any) => {
        return row.settlement?.name || '--';
      },
    },
    {
      title: orderFeeDataT('currency'),
      field: 'currencyId',
      width: 70,
      align: 'center',
      formatter: ({ row }: any) => {
        return row.currency?.code || '--';
      },
    },
    {
      title: orderFeeDataT('ExchangeRate'),
      field: 'exchangeRate',
      width: 80,
      align: 'right',
      formatter: ({ row }: any) => {
        return row.exchangeRate ?? '--';
      },
    },
    {
      title: orderFeeDataT('unitPrice'),
      field: 'unitPriceStr',
      width: 100,
      align: 'right',
    },
    {
      title: orderFeeDataT('amount'),
      field: 'amountStr',
      width: 100,
      align: 'right',
    },
    {
      title: orderFeeDataT('quantity'),
      field: 'quantity',
      width: 80,
      align: 'right',
      formatter: ({ row }: any) => {
        return row.quantity ?? '--';
      },
    },
    {
      title: orderFeeDataT('noTaxUnitPrice'),
      field: 'noTaxUnitPriceStr',
      width: 110,
      align: 'right',
    },
    {
      title: orderFeeDataT('noTaxAmount'),
      field: 'noTaxAmountStr',
      width: 110,
      align: 'right',
    },
    {
      title: orderFeeDataT('remark'),
      field: 'remark',
      width: 150,
      showOverflow: true,
    },
    {
      title: $t('auditApproval.task.creatorUserName'),
      field: 'creatorUserName',
      width: 100,
    },
    {
      title: $t('auditApproval.task.createTime'),
      field: 'creationTime',
      width: 155,
      formatter: 'formatDateTime',
    },
  ];
};

/**
 * 申请修改 diff 展示时排除的字段。
 * task.info 常带完整费用快照，录入人/创建时间等系统字段在修改提交里多为 null，
 * 若参与对比会误显示为「超级管理员 => [null]」。
 */
const MODIFY_DIFF_EXCLUDE_FIELDS = new Set([
  'combinedFeeStatus',
  'id',
  'transportOrderId',
  'creationTime',
  'lastModificationTime',
  'creatorUserId',
  'lastModifierUserId',
  'isDeleted',
  'deleterUserId',
  'deletionTime',
  'creatorUserName',
  'creatorUserNickName',
  'dataEntryMethod',
  'orgId',
  'orgs',
  'userId',
]);

const handleModifyTask = (
  orderFeeTasks: ExpenseSubmissionAdminApi.OrderFeeAndTaskDto[],
) => {
  let tasks = orderFeeTasks?.filter(
    (item) => item.task?.taskType !== feeConstants.taskTypeMap.feeModify,
  );
  let modifyData = orderFeeTasks?.filter(
    (item) => item.task?.taskType === feeConstants.taskTypeMap.feeModify,
  );

  modifyData.map((item: any) => {
    let modifyItem = item.task as ExpenseSubmissionAdminApi.TaskItemDto;
    let info = JSON.parse(modifyItem.info as string);
    Object.keys(info).forEach((key) => {
      if (MODIFY_DIFF_EXCLUDE_FIELDS.has(key)) return;
      const current = item[key];
      const next = info[key];
      // 嵌套对象（如 feeCode / settlement / currency）不参与 "原值 => [新值]" 改写，
      // 否则对象会被拼成 "[object Object] => [object Object]"，
      // 导致费用名称、结算对象、币别等列取不到嵌套字段而显示为空
      if (
        (current !== null && typeof current === 'object') ||
        (next !== null && typeof next === 'object')
      ) {
        return;
      }
      if (current !== next) {
        item[key] = `${current} => [${next}]`;
      }
    });
    return {
      ...item,
    };
  });
  tasks = tasks.concat(modifyData);
  tasks.forEach((item) => {
    item.taskStatus = '';
    if (item.task && item.task?.taskType === 1 && item.task?.taskStatus === 0) {
      item.taskStatus = $t('auditApproval.ApplyModification');
    } else if (
      item.task &&
      item.task?.taskType === 2 &&
      item.task?.taskStatus === 0
    ) {
      item.taskStatus = $t('auditApproval.ApplyDeletion');
    } else {
      item.taskStatus = '';
    }
  });
  return tasks;
};

/** 为 每项添加 _rowKey，供 Table 使用 */
const normalizeOrderFeeWithRowKey = (
  items: OrderFeeAdminApi.OrderFeeDto[] | undefined,
) => {
  if (!items?.length) return [];
  return items.map((item, i) => ({
    ...item,
    _rowKey: `ofee_${i}_${Date.now()}`,
    creationTime: dayjs(item.creationTime).format('YYYY-MM-DD HH:mm:ss'),

    unitPriceStr: `${transCurrencySymbol(item.currencyId)}${item.unitPrice}`,
    amountStr: `${transCurrencySymbol(item.currencyId)}${item.amount}`,
    noTaxUnitPriceStr: `${transCurrencySymbol(item.currencyId)}${item.noTaxUnitPrice}`,
    noTaxAmountStr: `${transCurrencySymbol(item.currencyId)}${item.noTaxAmount}`,

    rqstPaymentAmountStr: `${transCurrencySymbol(item.currencyId)}${item.rqstPaymentAmount}`,
    invoicedAmountStr: `${transCurrencySymbol(item.currencyId)}${item.invoicedAmount}`,

    orderInvoiceAmountStr: `${transCurrencySymbol(item.currencyId)}${item.orderInvoiceAmount}`,
    settledAmountStr: `${transCurrencySymbol(item.currencyId)}${item.settledAmount}`,
  })) as any[];
};
const selectChangeOrderId = ref<string | null>(null);

const [Grid, gridApi] = useVbenVxeGrid<OrderFeeAdminApi.OrderFeeEditDto>({
  gridOptions: {
    id: `sea-export-all-order-fee-${props.type}`,
    columns: useOrderFeeDetailColumns(),
    height: '100%',
    minHeight: 200,
    keepSource: true,
    radioConfig: {
      highlight: true,
      trigger: 'default',
    },
    rowConfig: {
      keyField: 'id',
    },
    rowClassName: resolveRowWarningClass,
    pagerConfig: {
      enabled: false,
    },
    proxyConfig: {
      ajax: {
        query: async () => {
          // 如果 transportOrderId 为空，清空数据并返回空数组
          if (props.transportOrderId === '') {
            dataSource.value = [];
            emit('updateTableData', dataSource.value);
            return [];
          }
          const detail = await OrderFeeTaskDetailAsync({
            id: props.transportOrderId,
            changeOrderId: selectChangeOrderId.value || undefined,
          });

          const orderFeeTasks =
            detail.orderFeeTasks?.filter(
              (item) => item.paySide === props.type,
            ) || [];
          const modifyData = handleModifyTask(
            orderFeeTasks.map(rememberPermissionRow),
          );

          // 优先自定义 sortId，相同再按录入时间（与费用录入 / 打印口径一致）
          const sortedData = sortOrderFeeList(modifyData);

          dataSource.value = normalizeOrderFeeWithRowKey(sortedData);
          emit('updateTableData', dataSource.value);
          return dataSource.value;
        },
      },
    },
    toolbarConfig: {
      custom: true,
      export: false,
      refresh: { code: 'query' },
      zoom: true,
    },
  },
  gridEvents: {
    // 单行选择变化事件
    checkboxChange: ({ checked }: any) => {
      const records = (gridApi.grid?.getCheckboxRecords?.() ?? []) as any;

      const ids = records.map((r: any) => r._rowKey);
      emit('updateSelectData', ids);
      // 可以在这里处理业务逻辑
    },

    // 全选/取消全选事件
    checkboxAll: ({ checked }: any) => {
      const records = (gridApi.grid?.getCheckboxRecords?.() ?? []) as any;

      const ids = records.map((r: any) => r._rowKey);
      emit('updateSelectData', ids);
    },

    // 单选模式下的选择事件（如果使用 radio 类型）
    radioChange: ({ row }: any) => {},
  },
});

const getTableDate = async (changeOrderId?: string | null) => {
  selectChangeOrderId.value = changeOrderId || null;
  await nextTick();
  gridApi.query();
};

// watch(
//   () => dataSource.value,
//   (val) => {
//     if (val === undefined || val === null) {
//       dataSource.value = [];
//     }
//     const keys = new Set((val ?? []).map((r) => (r as any)._rowKey));
//     selectedRowKeys.value = selectedRowKeys.value.filter((k) => keys.has(k));
//   },
//   { immediate: true },
// );
watch(
  [
    () => props.transportOrderId,
    () => props.entityId,
    () => props.changeOrderId,
  ],
  (
    [newSubmissionId, newEntityId, newChangeOrderId],
    [oldSubmissionId, oldEntityId, oldChangeOrderId],
  ) => {
    // 当 ID 发生变化时（包括变为空），都重新加载数据
    if (
      newSubmissionId !== oldSubmissionId ||
      newEntityId !== oldEntityId ||
      newChangeOrderId !== oldChangeOrderId
    ) {
      getTableDate(newChangeOrderId);
    }
  },
  { immediate: true },
);

watch(
  () => props.highlightFeeIds,
  async () => {
    await nextTick();
    // rowClassName 读 highlightIdSet；刷新行以重算 class
    gridApi.grid?.refreshData?.();
  },
  { deep: true },
);

onMounted(() => {
  // 组件挂载时加载币别符号
  loadCurrencySymbols();
});

// 必须显式暴露
defineExpose({
  getTableDate,
});

// 任务原因弹窗（申请修改 / 申请删除）
const taskReasonModalVisible = ref<boolean>(false);
const currentTaskReason = ref<string>('');
const taskReasonModalTitle = ref<string>('申请原因');
const taskReasonLabel = ref<string>('原因：');

/**
 * 显示申请修改 / 删除原因
 */
const showTaskReason = (row: any) => {
  const task = row.task;
  if (task && task.taskType === 1) {
    taskReasonModalTitle.value = '修改申请原因';
    taskReasonLabel.value = '修改原因：';
    currentTaskReason.value = task.remark || '未填写修改原因';
    taskReasonModalVisible.value = true;
    return;
  }
  if (task && task.taskType === 2) {
    taskReasonModalTitle.value = '删除申请原因';
    taskReasonLabel.value = '删除原因：';
    currentTaskReason.value = task.remark || '未填写删除原因';
    taskReasonModalVisible.value = true;
    return;
  }
  message.warning('该费用没有申请记录');
};
</script>

<template>
  <div
    class="order-ctn-table justify-between rounded-md border"
    :class="[type === 0 ? 'rec-table' : 'pay-table']"
  >
    <Grid>
      <template #toolbar-actions>
        <div class="fee-table-title flex min-w-0 items-center gap-2">
          <span class="fee-title-dot"></span>
          <span class="fee-title-text">
            {{
              type === 0
                ? orderFeeDataT('receivableCharges')
                : orderFeeDataT('payableCharges')
            }}
          </span>
          <OrderFeeWarningTicker
            :warnings="warningItems"
            :messages="warningMessages"
            @highlight="(ids) => emit('highlight', ids)"
          />
        </div>
      </template>
      <template #toolbar-tools>
        <div class="fee-total-count text-small">
          {{ $t('auditApproval.totalNum', [dataSource.length]) }}
        </div>
      </template>
    </Grid>
  </div>

  <!-- 申请修改 / 删除原因弹窗 -->
  <Modal
    v-model:open="taskReasonModalVisible"
    :title="taskReasonModalTitle"
    :footer="null"
    width="500px"
  >
    <div style="padding: 16px 0">
      <div style="margin-bottom: 8px; color: #666">{{ taskReasonLabel }}</div>
      <div
        style="
          min-height: 60px;
          padding: 12px;
          word-wrap: break-word;
          white-space: pre-wrap;
          background: #f5f5f5;
          border-radius: 4px;
        "
      >
        {{ currentTaskReason }}
      </div>
    </div>
  </Modal>
</template>

<style scoped lang="scss">
.order-ctn-table {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 200px;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e8ecf3;
  border-radius: 10px;
  box-shadow:
    0 1px 2px rgb(16 42 83 / 4%),
    0 4px 12px rgb(16 42 83 / 5%);

  :deep(.vxe-grid) {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  }

  :deep(.vxe-table) {
    flex: 1;
    min-width: 0;
    min-height: 0;
  }

  // 表头：浅灰底 + 加深字重，强化层级
  :deep(.vxe-header--column) {
    font-weight: 600;
    color: #333;
    background-color: #f5f7fa;
  }

  // 斑马纹行颜色更柔和，悬停高亮使用主题浅蓝
  :deep(.vxe-body--row.row--stripe) {
    background-color: #fafbfd;
  }

  :deep(.vxe-body--row:hover),
  :deep(.vxe-body--row.row--hover) {
    background-color: #e9f4ff;
  }
}

// 标题与计数样式：标题带品牌色圆点，计数为弱化灰色副标题
.fee-table-title {
  padding-left: 4px;

  .fee-title-dot {
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .fee-title-text {
    flex-shrink: 0;
    font-size: 14px;
    font-weight: 600;
    color: #1f2d3d;
  }
}

.fee-total-count {
  font-weight: normal;
  color: #8a94a6;
}

.rec-table {
  border-left: 3px solid rgb(6 100 224);

  .fee-title-dot {
    background-color: rgb(6 100 224);
  }
}

.pay-table {
  border-left: 3px solid rgb(255 153 0);

  .fee-title-dot {
    background-color: rgb(255 153 0);
  }
}

:deep(.fee-warning-highlight-row) {
  background-color: #ffccc7 !important;
}

:deep(.fee-warning-highlight-row > td) {
  background-color: #ffccc7 !important;
}

.green {
  color: green;
}

.blue {
  color: rgb(6 100 224);
}

.yellow {
  color: rgb(255 153 0);
}
</style>
