<script lang="ts" setup>
import {
  OrderFeeTaskBatchAudit,
  ExpenseSubmissionAdminApi,
} from '#/api/audit-approval/expense-admin';
import type { GroupFieldDef } from '#/components/list-grouping';
import { useRouter } from 'vue-router';
import { Page } from '@vben/common-ui';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  getOrderFeeTaskList,
  getOrderFeeTaskGroupedList,
} from '#/api/audit-approval/expense-admin';
import {
  GroupingSettings,
  GroupingTabs,
  useListGrouping,
} from '#/components/list-grouping';
import { $t } from '#/locales';
import { createPagedListQuery } from '#/utils/paged-list-query';
import { useExpenseAllColumns, useGridFormSchema } from '../data';
import { Plus, ArrowDown, ArrowLeft } from '@vben/icons';
import { IconifyIcon } from '@vben/icons';
import { computed, onMounted, ref, h } from 'vue';
import {
  Button,
  message,
  DropdownButton,
  Textarea,
  MenuItem,
  Menu,
  Modal,
} from 'ant-design-vue';

import Detail from './modules/detail.vue';
const router = useRouter();

// ==================== 分组统计配置 ====================

/**
 * 费用任务分组字段配置。
 * paramKey 既是「点击分组项后追加到列表查询」的参数名，
 * 也是与之互斥的搜索表单字段名。
 */
const ORDER_FEE_TASK_GROUP_FIELDS: GroupFieldDef[] = [
  {
    value: ExpenseSubmissionAdminApi.SeaExportGroupField.BLType,
    label: '装运方式',
    paramKey: 'BLType',
    emptyParamKey: 'BLTypeEmpty',
  },
  {
    value: ExpenseSubmissionAdminApi.SeaExportGroupField.BillType,
    label: '订单类型',
    paramKey: 'BillType',
    emptyParamKey: 'BillTypeEmpty',
  },
  {
    value: ExpenseSubmissionAdminApi.SeaExportGroupField.Client,
    label: '委托单位',
    paramKey: 'ClientId',
  },
  {
    value: ExpenseSubmissionAdminApi.SeaExportGroupField.Carrier,
    label: '船公司',
    paramKey: 'CarrierId',
    emptyParamKey: 'CarrierIdEmpty',
  },
  {
    value: ExpenseSubmissionAdminApi.SeaExportGroupField.POL,
    label: '起运港',
    paramKey: 'POLId',
    emptyParamKey: 'POLIdEmpty',
  },
  {
    value: ExpenseSubmissionAdminApi.SeaExportGroupField.POD,
    label: '目的港',
    paramKey: 'PODId',
    emptyParamKey: 'PODIdEmpty',
  },
  {
    value: ExpenseSubmissionAdminApi.SeaExportGroupField.Vessel,
    label: '船名',
    paramKey: 'Vessel',
    emptyParamKey: 'VesselEmpty',
  },
  {
    value: ExpenseSubmissionAdminApi.SeaExportGroupField.CodeFrt,
    label: '付费方式',
    paramKey: 'CodeFrtId',
    emptyParamKey: 'CodeFrtIdEmpty',
  },
  {
    value: ExpenseSubmissionAdminApi.SeaExportGroupField.CodeIssueType,
    label: '签单方式',
    paramKey: 'CodeIssueTypeId',
    emptyParamKey: 'CodeIssueTypeIdEmpty',
  },
  {
    value: ExpenseSubmissionAdminApi.SeaExportGroupField.Yard,
    label: '场站',
    paramKey: 'YardId',
    emptyParamKey: 'YardIdEmpty',
  },
];

// 分组统计状态
const grouping = useListGrouping({
  fields: ORDER_FEE_TASK_GROUP_FIELDS,
  getGridApi: () => gridApi,
  fetchGroups: async (baseParams, field) => {
    // 构建分组查询参数
    const groupParams: any = {
      ...baseParams,
      groupField: field as ExpenseSubmissionAdminApi.SeaExportGroupField,
    };

    console.log(
      '📊 [费用任务分组统计] 调用 getOrderFeeTaskGroupedList，参数:',
      groupParams,
    );

    const items = await getOrderFeeTaskGroupedList(groupParams);
    console.log('📊 [费用任务分组统计] 返回结果:', items);

    // ✅ 关键变更：处理港口分组的 isSea 字段，生成组合 Key
    return (items ?? []).map((item) => ({
      ...item,
      // 如果是港口分组且 isSea 有值，则使用 isSea_id 作为 id，防止海港和空港 ID 冲突
      id:
        (field === ExpenseSubmissionAdminApi.SeaExportGroupField.POL ||
          field === ExpenseSubmissionAdminApi.SeaExportGroupField.POD) &&
        item.isSea !== null &&
        item.isSea !== undefined
          ? `${item.isSea}_${item.id}`
          : item.id,
    }));
  },
});

// 默认按委托单位分组（在组件挂载后执行）
onMounted(() => {
  // 延迟执行，确保 gridApi 已初始化
  setTimeout(() => {
    const clientIdField = ORDER_FEE_TASK_GROUP_FIELDS.find(
      (field) => field.paramKey === 'ClientId',
    );
    if (clientIdField && !grouping.enabledField.value) {
      console.log('📊 [默认分组] 自动启用委托单位分组');
      grouping.enableField(clientIdField.value as number);
    }
  }, 100);
});

const transportOrderId = ref<string>('');
const orderName = ref<string>('');
const entityId = ref<string>('');
const changeOrderId = ref<string | null>(null);

/**
 * 清空选中的订单信息
 */
const clearSelectedOrder = () => {
  transportOrderId.value = '';
  entityId.value = '';
  orderName.value = '';
  changeOrderId.value = null;
};

const handleRowDblclick = ({
  row,
}: {
  row: ExpenseSubmissionAdminApi.OrderFeeTaskListDto;
}) => {
  console.log('row', row);
  // 设置当前行为选中状态，显示选中色
  const grid = gridApi.grid as any;
  if (grid && grid.setRadioRow) {
    grid.setRadioRow(row);
  }
  transportOrderId.value = row.transportOrder.id || '';
  entityId.value = row.entityId || '';
  changeOrderId.value = row.changeOrderId || null;
  const mblNum = row.transportOrder.mblNum || '--';
  orderName.value = `当前选中: ${mblNum}(${row.transportOrder.client?.name ?? ''})`;

  // ✅ 关键变更：点行进详情时，必须把该行的 changeOrderId 原样回传
  if (detailRef.value) {
    detailRef.value.getTableDate(row.changeOrderId || null);
  }
};

const [Grid, gridApi] =
  useVbenVxeGrid<ExpenseSubmissionAdminApi.OrderFeeTaskListDto>({
    formOptions: {
      schema: useGridFormSchema(),
      submitOnChange: true,
      showCollapseButton: true,
      collapsed: true,
      compact: true,
      wrapperClass: 'grid-cols-7',
    },
    gridEvents: {
      cellClick: handleRowDblclick,
    },
    gridOptions: {
      id: 'orderFeeTaskList',
      columns: useExpenseAllColumns(),
      height: 'auto',
      keepSource: true,
      radioConfig: {
        highlight: true,
        trigger: 'default',
      },
      rowConfig: {
        // ✅ 关键变更：行 key 从 entityId 改为 entityId + changeOrderId 组合
        // 同一票会出现多行（主单 + 各更改单），只用 entityId 会导致选中态串行、详情打开错行
        keyField: 'entityId + changeOrderId',
        isCurrent: true,
      },
      pagerConfig: {
        enabled: true,
      },
      proxyConfig: {
        ajax: {
          query: createPagedListQuery(getOrderFeeTaskList, {
            mapParams: (formValues) => {
              // 每次查询前清空选中状态，确保费用明细列表不会显示旧数据
              console.log('📋 [费用任务列表查询] 查询前清空选中状态');
              clearSelectedOrder();

              // 使用 grouping.decorateListParams 处理分组筛选条件
              let params = grouping.decorateListParams(formValues);

              // ✅ 关键变更：处理港口分组的 isSea 参数回传
              const field = grouping.enabledField.value;
              if (
                field &&
                (field.value ===
                  ExpenseSubmissionAdminApi.SeaExportGroupField.POL ||
                  field.value ===
                    ExpenseSubmissionAdminApi.SeaExportGroupField.POD)
              ) {
                const selectedId = grouping.selectedItemId.value;
                if (selectedId !== undefined && selectedId !== null) {
                  const parts = String(selectedId).split('_');
                  if (parts.length === 2) {
                    const isSea = parts[0] === 'true';
                    const realId = parts[1];
                    params = {
                      ...params,
                      IsSea: isSea,
                      [field.paramKey]: realId,
                    };
                    // 移除原始的 paramKey（如果 decorateListParams 已经添加了）
                    delete params[field.paramKey];
                    params[field.paramKey] = realId;
                  }
                }
              }

              console.log('📋 [费用任务列表查询] 查询参数:', params);
              return params;
            },
          }),
        },
      },
      toolbarConfig: {
        custom: true,
        export: false,
        //refresh: { code: 'query' },
        zoom: false,
      },
    },
  });

const onGroupFieldChange = (value: number | undefined) => {
  if (value === undefined) {
    grouping.disable();
  } else {
    grouping.enableField(value);
  }
};

const SubmittedOther = async (key: any) => {
  console.log('SubmittedOther', key);
  showConfirmWithRemark(true, key);
};

const detailRef = ref<any>(null);

/**
 * ✅ 关键变更：批量审核改用 items 参数，按行精确审核
 * @param approve - 是否通过
 * @param modalRemark - 审核备注
 * @param items - 要审核的行列表（包含 transportOrderId 和 changeOrderId）
 */
const OrderFeeAudit = (
  approve: boolean,
  modalRemark: string,
  items: ExpenseSubmissionAdminApi.OrderFeeTaskBatchAuditItemDto[],
) => {
  let OrderFeeTaskBatchAuditDto: ExpenseSubmissionAdminApi.OrderFeeTaskBatchAuditDto =
    {
      success: approve,
      remark: modalRemark,
      items: items, // ✅ 使用 items 参数进行精确审核
    };

  console.log('📋 [批量审核] 审核参数:', OrderFeeTaskBatchAuditDto);

  OrderFeeTaskBatchAudit(OrderFeeTaskBatchAuditDto).then(() => {
    message.success({
      content: $t('ui.actionMessage.operationSuccess'),
      key: 'action_process_msg',
    });
    gridApi.reload();
    if (detailRef.value) {
      detailRef.value.getTableDate();
    }
  });
};

/**
 * 审核选中的行
 */
const selectPass = (approve: boolean, modalRemark: string) => {
  let list =
    gridApi?.grid.getCheckboxRecords() as ExpenseSubmissionAdminApi.OrderFeeTaskListDto[];

  // ✅ 构建 items 数组，包含 entityId 和 changeOrderId
  const items: ExpenseSubmissionAdminApi.OrderFeeTaskBatchAuditItemDto[] =
    list.map((item) => ({
      transportOrderId: item.entityId || '',
      changeOrderId: item.changeOrderId || null,
    }));

  console.log('📋 [选中审核] 选中的行:', items);
  OrderFeeAudit(approve, modalRemark, items);
};

/**
 * 审核所有行
 */
const allPass = (approve: boolean, modalRemark: string) => {
  let tableData = gridApi.grid.getTableData()
    .tableData as ExpenseSubmissionAdminApi.OrderFeeTaskListDto[];

  // ✅ 构建 items 数组，包含 entityId 和 changeOrderId
  const items: ExpenseSubmissionAdminApi.OrderFeeTaskBatchAuditItemDto[] = (
    tableData ?? []
  ).map((item) => ({
    transportOrderId: item.entityId || '',
    changeOrderId: item.changeOrderId || null,
  }));

  console.log('📋 [全部审核] 所有行:', items);
  OrderFeeAudit(approve, modalRemark, items);
};
const showConfirmWithRemark = (approve: boolean = true, type: string = '') => {
  let modalRemark = '';
  // 创建弹窗实例
  const modal = Modal.confirm({
    title: approve
      ? $t('auditApproval.task.okPass')
      : $t('auditApproval.task.noPass'),
    content: () =>
      h('div', {}, [
        h(Textarea, {
          modelValue: modalRemark,
          onChange: (val: any) => {
            modalRemark = val.target?.value || val;
            console.log('Textarea changed:', modalRemark);
          },
          rows: 3,
          placeholder: $t('auditApproval.task.remarkPlaceholder'),
          maxlength: 100,
          style: 'margin-top: 8px;',
        }),
      ]),
    icon: null,
    width: 520,
    centered: true,
    okText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
    async onOk() {
      switch (type) {
        case 'all': {
          allPass(approve, modalRemark);
          break;
        }
        case 'selectPass': {
          selectPass(approve, modalRemark);
          break;
        }
      }
    },
    onCancel() {
      modalRemark = '';
    },
  });
};
const getSelectedRow = ():
  | ExpenseSubmissionAdminApi.OrderFeeTaskListDto
  | undefined => {
  const grid = gridApi.grid as any;
  return grid?.getRadioRecord?.() ?? undefined;
};

const feeTableType = ref('horizontal');
const changeTableType = (type: string) => {
  feeTableType.value = type;
};
</script>

<template>
  <Page auto-content-height>
    <Grid class="expense-task-grid mb-[10px] h-[445px]">
      <!-- 工具栏左侧插槽始终挂载，避免开启分组时 table-title 与插槽切换导致 vxe options 重算并重置列设置 -->
      <template #toolbar-actions>
        <GroupingTabs
          v-if="grouping.isGrouping.value"
          :items="grouping.groupItems.value"
          :selected-id="grouping.selectedItemId.value"
          :loading="grouping.loading.value"
          @select="grouping.selectItem"
        />
        <div v-else class="flex text-base font-medium">
          <span>{{ $t('auditApproval.expenseReview.title') }}</span>
        </div>
      </template>
      <template #toolbar-tools>
        <DropdownButton @click="SubmittedOther('selectPass')" type="primary">
          {{ $t('auditApproval.task.selectPass') }}
          <template #overlay>
            <Menu @click="showConfirmWithRemark(true, 'all')">
              <MenuItem>
                {{ $t('auditApproval.task.allPass') }}
              </MenuItem>
            </Menu>
          </template>
        </DropdownButton>
        <span class="split mx-3 flex">|</span>
        <Button
          class="layout-toggle-btn mr-2"
          @click="changeTableType('vertical')"
          :class="[feeTableType === 'vertical' ? 'green-btn' : '']"
        >
          <IconifyIcon icon="boxicons:arrow-down-up" class="size-4" />

          {{ $t('auditApproval.tableType.vertical') }}
        </Button>
        <Button
          class="layout-toggle-btn"
          @click="changeTableType('horizontal')"
          :class="[feeTableType === 'horizontal' ? 'green-btn' : '']"
        >
          <IconifyIcon icon="boxicons:arrow-left-right" class="size-4" />
          {{ $t('auditApproval.tableType.horizontal') }}
        </Button>
        <GroupingSettings
          :fields="grouping.fields"
          :value="grouping.enabledField.value?.value"
          @change="onGroupFieldChange"
        />
      </template>
    </Grid>
    <Detail
      :orderName="orderName"
      :transportOrderId="transportOrderId"
      :entityId="entityId"
      :changeOrderId="changeOrderId"
      ref="detailRef"
      :feeTableType="feeTableType"
    />
  </Page>
</template>
<style scoped lang="scss">
.split {
  color: #d9dee8;
}

// 顶部任务列表：卡片化容器 + 表头层级强化，与下方费用明细卡片风格统一
.expense-task-grid {
  overflow: hidden;
  border: 1px solid #e8ecf3;
  border-radius: 10px;
  box-shadow:
    0 1px 2px rgb(16 42 83 / 4%),
    0 4px 12px rgb(16 42 83 / 5%);

  :deep(.vxe-header--column) {
    font-weight: 600;
    color: #333;
    background-color: #f5f7fa;
  }

  :deep(.vxe-body--row.row--stripe) {
    background-color: #fafbfd;
  }

  :deep(.vxe-body--row:hover),
  :deep(.vxe-body--row.row--hover) {
    background-color: #e9f4ff;
  }
}

// 布局切换按钮：未选中态更精致，选中态保持绿色高亮反馈
.layout-toggle-btn {
  border-radius: 6px;
  transition: all 0.2s ease;
}

:deep(.green-btn) {
  color: #fff;
  background-color: #00b96b !important;
  border-color: #00b96b !important;
  box-shadow: 0 2px 6px rgb(0 185 107 / 25%);
}

/* 如果需要处理悬停状态 */
:deep(.green-btn:hover),
:deep(.green-btn:focus) {
  color: #fff;
  background-color: #009a55 !important;
  border-color: #009a55 !important;
}
</style>
