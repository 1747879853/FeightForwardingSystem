<script lang="ts" setup>
import type { OrderFeeAdminApi } from '#/api/sea-export/order-fee-admin';
import type { FeeCodeAdminApi } from '#/api/system/base-data/fee-code-admin';
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import {
  Button,
  Space,
  message,
  DropdownButton,
  MenuItem,
  Menu,
  Modal,
  Textarea,
  Card,
} from 'ant-design-vue';

import { IconifyIcon } from '@vben/icons';

import { $t } from '#/locales';

import { PrintJsonType, usePrintFormat } from '#/components/print-format';

import * as feeConstants from '../data';

import { getFeeCodePagedList } from '#/api/system/base-data/fee-code-admin';
import {
  getIndustryCategoryOptions,
  getCurrencyEnumOptions,
  useOrderFeeColumns,
  initOrderFeeEnumCache,
} from '../data';

// 导入拆分后的组件和 composables
import OrderFeeTableCore from './OrderFeeTableCore.vue';
import OrderFeeEditorModal from './order-fee-editor-modal.vue';
import OrderFeeAuditHistoryModal from './order-fee-audit-history-modal.vue';
import BatchImportFeeModal from './batch-import-fee-modal.vue';
import { useOrderFeeData } from './composables/useOrderFeeData';
import { useOrderFeeActions } from './composables/useOrderFeeActions';
import { useOrderFeeLinkage } from './composables/useOrderFeeLinkage';

const props = defineProps<{
  type: number; // 收付类型 0 应收 1 应付
  mode?: string; // changeOrder 更改单
  parentChangeOrderId?: string; //更改单Id
  recAmountMap?: Record<string, any>; // 应收金额汇总
  payAmountMap?: Record<string, any>; // 应付金额汇总
  orderDetail?: SeaExportAdminApi.SeaExportDto | null; // 父组件传入的订单详情
}>();

const emit = defineEmits([
  'sync-fee',
  'update-amount',
  'refresh-opposite-table',
]);

// ==================== 使用 Composables ====================

// 数据管理
const {
  dataSource,
  selectedRowKeys,
  orderBaseData,
  orderCtnList,
  changeOrderId,
  editId,
  getTableDate,
  syncFee,
  sanitizeOrderFee,
} = useOrderFeeData(props, emit as any);

// 操作逻辑
const actions = useOrderFeeActions(
  props,
  {
    dataSource,
    selectedRowKeys,
    editId,
    getTableDate,
    syncFee,
    sanitizeOrderFee,
  },
  emit as any,
);

// 字段联动逻辑
const linkage = useOrderFeeLinkage(props, {
  dataSource,
  editId,
  orderBaseData,
});

// ==================== 打印功能 ====================

const printing = ref(false);
const { openPrint } = usePrintFormat();

const handlePrint = async () => {
  if (printing.value) return;

  const selected = actions.getSelectedRows();
  if (!selected.length) {
    message.warning('请先勾选要打印的费用');
    return;
  }
  if (selected.some((row) => !actions.isSavedOrderFee(row))) {
    message.warning('请先保存费用后再打印');
    return;
  }

  printing.value = true;
  const hideLoading = message.loading('正在准备打印...', 0);
  try {
    const json = JSON.stringify(
      selected.map((row) => {
        const { _rowKey, ...fee } = row as OrderFeeAdminApi.OrderFeeDto & {
          _rowKey?: string;
        };
        return fee;
      }),
    );
    openPrint({
      printJsonType:
        props.type === 0
          ? PrintJsonType.RecOrderFeeList
          : PrintJsonType.PayOrderFeeList,
      json,
    });
  } catch {
    message.error('打印准备失败，请稍后重试');
  } finally {
    hideLoading();
    printing.value = false;
  }
};

// ==================== 下拉框数据源 ====================

const dropdownSources = ref({
  feeCodeList: [] as Array<{ label: string; value: any }>,
  industryCategoryList: [] as Array<{ label: string; value: any }>,
  currencyList: [] as Array<{ label: string; value: any }>,
  unitList: [] as Array<{ label: string; value: any }>, // 单位列表
});

const initDropdownSources = async () => {
  try {
    const industryOptions = getIndustryCategoryOptions();
    dropdownSources.value.industryCategoryList = industryOptions.map((opt) => ({
      label: opt.label,
      value: opt.key,
    }));

    const currencyOptions = getCurrencyEnumOptions().filter(
      (opt) => opt.value !== 9999,
    );
    dropdownSources.value.currencyList = currencyOptions.map((opt) => ({
      label: opt.label,
      value: opt.value,
    }));

    console.log(
      '✅ [initDropdownSources] 行业类别数据:',
      dropdownSources.value.industryCategoryList.length,
      '条',
    );
    console.log(
      '✅ [initDropdownSources] 币种数据:',
      dropdownSources.value.currencyList.length,
      '条',
    );
  } catch (error) {
    console.error('❌ [initDropdownSources] 初始化失败:', error);
  }
};

/**
 * 更新单位列表（根据订单箱型动态更新）
 */
const updateUnitList = () => {
  // 从 orderCtnList 获取箱型列表
  const ctnUnits = orderCtnList.value.map((ctn) => ({
    label: ctn.ctnCodeName,
    value: ctn.ctnCodeName,
  }));

  // 添加固定单位选项
  const fixedUnits = [
    { label: '票', value: '票' },
    { label: 'ORDER', value: 'ORDER' },
    { label: '毛重', value: '毛重' },
    { label: 'KGS', value: 'KGS' },
    { label: '尺码', value: '尺码' },
    { label: 'CBM', value: 'CBM' },
    { label: '件数', value: '件数' },
    { label: 'PKGS', value: 'PKGS' },
    { label: 'TEU', value: 'TEU' },
  ];

  // 合并并去重
  const allUnits = [...fixedUnits, ...ctnUnits];
  const uniqueUnits = Array.from(
    new Map(allUnits.map((item) => [item.value, item])).values(),
  );

  dropdownSources.value.unitList = uniqueUnits;
  console.log('📏 [updateUnitList] 单位列表更新:', uniqueUnits.length, '条');
};

// ==================== Handsontable 列配置 ====================

/**
 * 根据费用代码ID获取显示标签
 */
const getFeeCodeLabel = (feeCodeId: any): string => {
  if (!feeCodeId) return '';
  const item = feeCodeList.value.find(
    (f) => f.id === feeCodeId || String(f.id) === String(feeCodeId),
  );
  if (!item) return '';
  const surLabel = item.cnName || item.enName || '';
  return item.code ? `${item.code}-${surLabel}` : surLabel;
};

/**
 * 根据行业类别值获取显示标签
 */
const getIndustryCategoryLabel = (industryCategory: any): string => {
  if (!industryCategory) return '';
  const option = dropdownSources.value.industryCategoryList.find(
    (opt) => opt.value === industryCategory,
  );
  return option?.label || '';
};

/**
 * 根据币种ID获取显示标签
 */
const getCurrencyLabel = (currencyId: any): string => {
  if (!currencyId) return '';
  
  // 确保类型一致进行比较
  const currencyIdStr = String(currencyId);
  const option = dropdownSources.value.currencyList.find(
    (opt) => String(opt.value) === currencyIdStr,
  );
  
  console.log('🔍 [getCurrencyLabel] 查找币别:', currencyId, '→', option?.label || '未找到');
  return option?.label || '';
};

/**
 * 根据结算对象ID获取显示标签
 */
const getSettlementLabel = (settlementId: any): string => {
  if (!settlementId) return '';

  // 首先尝试从所有数据行中查找已缓存的客户信息
  for (const row of dataSource.value) {
    const rowAny = row as any;
    if (String(rowAny.settlementId) === String(settlementId)) {
      // 如果该行有缓存的客户名称，优先使用
      if (rowAny.__settlementName) {
        return rowAny.__settlementName;
      }
    }
  }

  // 如果没有缓存，返回 ID（fallback）
  return String(settlementId);
};

/**
 * 从订单详情中提取结算对象名称（用于补充缺失的__settlementName）
 */
const extractSettlementNameFromOrder = (settlementId: any): string | null => {
  if (!settlementId || !orderBaseData.value) return null;

  const settlementIdStr = String(settlementId);
  const orderDetail = orderBaseData.value;
  const transportOrder = orderDetail.transportOrder;

  // 委托单位（主要客户）
  if (transportOrder?.clientId && String(transportOrder.clientId) === settlementIdStr) {
    return transportOrder.clientName || null;
  }

  // 发货人
  if (transportOrder?.shipperId && String(transportOrder.shipperId) === settlementIdStr) {
    try {
      const shipperContent = JSON.parse(transportOrder.shipperContent || '{}');
      return shipperContent.name || shipperContent.cnName || null;
    } catch (e) {
      console.warn('解析发货人信息失败:', e);
    }
  }

  // 收货人
  if (transportOrder?.consigneeId && String(transportOrder.consigneeId) === settlementIdStr) {
    try {
      const consigneeContent = JSON.parse(transportOrder.consigneeContent || '{}');
      return consigneeContent.name || consigneeContent.cnName || null;
    } catch (e) {
      console.warn('解析收货人信息失败:', e);
    }
  }

  // 通知人
  if (transportOrder?.notifierId && String(transportOrder.notifierId) === settlementIdStr) {
    try {
      const notifierContent = JSON.parse(transportOrder.notifierContent || '{}');
      return notifierContent.name || notifierContent.cnName || null;
    } catch (e) {
      console.warn('解析通知人信息失败:', e);
    }
  }

  // 第二通知人
  if (orderDetail.secondNotifierId && String(orderDetail.secondNotifierId) === settlementIdStr) {
    return orderDetail.secondNotifier?.name || null;
  }

  // 目的港代理
  if (orderDetail.podAgentId && String(orderDetail.podAgentId) === settlementIdStr) {
    return orderDetail.podAgent?.name || null;
  }

  // 订舱代理
  if (orderDetail.bookingAgentId && String(orderDetail.bookingAgentId) === settlementIdStr) {
    return orderDetail.bookingAgent?.name || null;
  }

  // 船代
  if (orderDetail.shipAgentId && String(orderDetail.shipAgentId) === settlementIdStr) {
    return orderDetail.shipAgent?.name || null;
  }

  // 场站
  if (orderDetail.yardId && String(orderDetail.yardId) === settlementIdStr) {
    return orderDetail.yard?.name || null;
  }

  // 车队
  if (transportOrder?.teamId && String(transportOrder.teamId) === settlementIdStr) {
    return transportOrder.teamName || null;
  }

  // 报关行
  if (transportOrder?.custBrokerId && String(transportOrder.custBrokerId) === settlementIdStr) {
    return transportOrder.custBrokerName || null;
  }

  // 仓库
  if (transportOrder?.warehouseId && String(transportOrder.warehouseId) === settlementIdStr) {
    return transportOrder.warehouseName || null;
  }

  // 保险公司
  if (transportOrder?.insuranceId && String(transportOrder.insuranceId) === settlementIdStr) {
    return transportOrder.insuranceName || null;
  }

  return null;
};

/**
 * 转换vxe-table列配置为handsontable列配置
 */
const hotColumns = computed(() => {
  const vxeColumns = useOrderFeeColumns(props.type);

  if (!vxeColumns || !Array.isArray(vxeColumns)) {
    return [];
  }

  return vxeColumns.map((col) => {
    const hotCol: any = {
      data: col.field,
      title: col.title,
      width: col.width || col.minWidth || 100,
    };

    if (col.field === 'feeCodeId') {
      hotCol.type = 'text';
      hotCol.renderer = function (
        this: any,
        instance: any,
        td: HTMLTableCellElement,
        row: number,
        col: number,
        prop: string,
        value: any,
        cellProperties: any,
      ) {
        const label = getFeeCodeLabel(value);
        td.innerHTML = `<span style="color: ${label ? '#262626' : '#999'}; cursor: pointer;">${label || '请选择'}</span>`;
        return td;
      };
    } else if (col.field === 'industryCategory') {
      hotCol.type = 'text';
      hotCol.renderer = function (
        this: any,
        instance: any,
        td: HTMLTableCellElement,
        row: number,
        col: number,
        prop: string,
        value: any,
        cellProperties: any,
      ) {
        const label = getIndustryCategoryLabel(value);
        td.innerHTML = `<span style="color: ${label ? '#262626' : '#999'}; cursor: pointer;">${label || '请选择'}</span>`;
        return td;
      };
    } else if (col.field === 'settlementId') {
      hotCol.type = 'text';
      hotCol.renderer = function (
        this: any,
        instance: any,
        td: HTMLTableCellElement,
        row: number,
        col: number,
        prop: string,
        value: any,
        cellProperties: any,
      ) {
        // ✅ 直接从当前行数据源中获取 __settlementName
        const rowData = dataSource.value[row];
        const settlementName = (rowData as any)?.__settlementName;

        let label = '';
        if (settlementName) {
          label = settlementName;
          console.log('🎨 [settlementId renderer] 行', row, '显示名称:', label);
        } else if (value) {
          // fallback：如果没有缓存，显示 ID
          label = String(value);
          console.warn('⚠️ [settlementId renderer] 行', row, '无__settlementName，显示ID:', label);
        }

        td.innerHTML = `<span style="color: ${label ? '#262626' : '#999'}; cursor: pointer;">${label || '请选择'}</span>`;
        return td;
      };
    } else if (col.field === 'currencyId') {
      hotCol.type = 'text';
      hotCol.renderer = function (
        this: any,
        instance: any,
        td: HTMLTableCellElement,
        row: number,
        col: number,
        prop: string,
        value: any,
        cellProperties: any,
      ) {
        const label = getCurrencyLabel(value);
        console.log('🎨 [currencyId renderer] 行', row, '币别ID:', value, '→ 显示:', label || '请选择');
        td.innerHTML = `<span style="color: ${label ? '#262626' : '#999'}; cursor: pointer;">${label || '请选择'}</span>`;
        return td;
      };
    } else if (
      ['exchangeRate', 'unitPrice', 'amount', 'quantity', 'taxRate'].includes(
        col.field || '',
      )
    ) {
      hotCol.type = 'numeric';
      hotCol.numericFormat = {
        pattern: '0.00',
        culture: 'en-US',
      };
    } else if (col.field === 'canInvoice' || col.field === 'isConfidential') {
      hotCol.type = 'checkbox';
    } else {
      hotCol.type = 'text';
    }

    return hotCol;
  });
});

// ==================== Handsontable 设置 ====================

const hotSettings = computed(() => ({
  data: dataSource.value,
  columns: hotColumns.value,
  rowHeaders: true,
  colHeaders: true,
  height: 'auto',
  maxHeight: 700,
  licenseKey: 'non-commercial-and-evaluation',
  contextMenu: true,
  manualColumnResize: true,
  manualRowMove: false,
  stretchH: 'all',
  autoWrapRow: true,
  autoWrapCol: true,
  afterSelection: (
    row: number,
    column: number,
    row2: number,
    column2: number,
  ) => {
    const selectedRows = dataSource.value.slice(row, row2 + 1);
    selectedRowKeys.value = selectedRows.map((r) => (r as any)._rowKey);
  },
  afterChange: (changes: any, source: string) => {
    // 调用联动逻辑处理
    if (coreTableRef.value?.hotTableRef?.hotInstance) {
      linkage.handleAfterChange(
        changes,
        source,
        coreTableRef.value.hotTableRef.hotInstance,
      );
    }

    // 同步费用
    if (source !== 'loadData') {
      syncFee();
    }
  },
  afterOnCellMouseDown: (
    event: MouseEvent,
    coords: any,
    td: HTMLTableCellElement,
  ) => {
    const columnIndex = coords.col;
    const rowIndex = coords.row;

    if (rowIndex < 0) return;

    const columnConfig = hotColumns.value[columnIndex];
    if (!columnConfig) return;

    const field = columnConfig.data;
    console.log('🔵 [afterOnCellMouseDown] 单元格点击', {
      field,
      rowIndex,
      columnIndex,
    });

    // 对特定字段显示 Ant Design Vue Select
    if (
      [
        'feeCodeId',
        'industryCategory',
        'settlementId',
        'currencyId',
        'unit',
      ].includes(field)
    ) {
      console.log('✅ [afterOnCellMouseDown] 触发下拉', field);
      event.preventDefault();
      event.stopPropagation();

      // 调用核心组件的方法
      if (coreTableRef.value) {
        console.log('🔄 [afterOnCellMouseDown] 调用 showAntdSelect');
        (coreTableRef.value as any).showAntdSelect(event, td, rowIndex, field);
      } else {
        console.error('❌ [afterOnCellMouseDown] coreTableRef 不存在');
      }
    }
  },
  observeDOMVisibility: true,
}));

// ==================== 模态框引用 ====================

const modifyModalRef = ref<InstanceType<typeof OrderFeeEditorModal>>();
const auditHistoryModalRef =
  ref<InstanceType<typeof OrderFeeAuditHistoryModal>>();
const batchImportModalRef = ref<InstanceType<typeof BatchImportFeeModal>>();
const coreTableRef = ref<InstanceType<typeof OrderFeeTableCore>>();

// ==================== 批量导入 ====================

const openBatchImportModal = async () => {
  console.log('🔍 [openBatchImportModal] 检查 editId:', editId.value);

  if (!editId.value) {
    console.warn('⚠️ [openBatchImportModal] editId 为空');
    message.warning('请先保存业务信息');
    return;
  }

  try {
    const orderDetail = orderBaseData.value;

    if (!orderDetail) {
      message.warning('订单详情未加载');
      return;
    }

    batchImportModalRef.value?.modalApi.setData({
      transportOrderId: editId.value,
      paySide: props.type,
      carrierId: orderDetail?.carrierId,
      polId: orderDetail?.polId,
      podId: orderDetail?.podId,
    });

    batchImportModalRef.value?.modalApi.open();
  } catch (error) {
    console.error('❌ [openBatchImportModal] 获取订单详情失败:', error);
    const errorMsg = error instanceof Error ? error.message : '请稍后重试';
    message.error(`获取订单详情失败: ${errorMsg}`);
  }
};

const handleBatchImportConfirm = () => {
  getTableDate();
  syncFee();
  emit('refresh-opposite-table');
};

// ==================== 审核历史 ====================

const openAuditHistoryModal = (row: OrderFeeAdminApi.OrderFeeDto) => {
  if (!row) return;
  auditHistoryModalRef.value?.modalApi.setData(row);
  auditHistoryModalRef.value?.modalApi.open();
};

// ==================== 工具栏操作 ====================

const ImportOther = async (e: any) => {
  switch (e.key) {
    case 'submit': {
      actions.generateOppositeFees();
      break;
    }
  }
};

const SubmittedOther = async (e: any) => {
  switch (e.key) {
    case 'modify': {
      actions.openModifyModal(modifyModalRef, orderBaseData);
      break;
    }
    case 'delete': {
      actions.showDeleteWithRemark();
      break;
    }
  }
};

const handleModalConfirm = (data: {
  originalData: OrderFeeAdminApi.OrderFeeDto | null;
  updatedData: OrderFeeAdminApi.OrderFeeDto | null;
}) => {
  actions.handleModalConfirm(data);
};

// ==================== 费用代码列表 ====================

const feeCodeList = ref<FeeCodeAdminApi.FeeCodeDto[]>([]);

const getFeeCodeList = async () => {
  try {
    let res =
      (await getFeeCodePagedList({ PageIndex: 1, PageSize: 1000 })) || {};
    feeCodeList.value = res.items || [];

    dropdownSources.value.feeCodeList = feeCodeList.value.map((item) => {
      const surLabel = item.cnName || item.enName || '';
      const label = item.code ? `${item.code}-${surLabel}` : surLabel;
      return {
        label: label || item.cnName || item.enName || item.code || '',
        value: item.id,
      };
    });

    console.log(
      '✅ [getFeeCodeList] 费用代码列表加载完成:',
      dropdownSources.value.feeCodeList.length,
      '条',
    );
  } catch (error) {
    console.error('❌ [getFeeCodeList] 加载失败:', error);
  }
};

watch(
  () => feeCodeList.value,
  (newList) => {
    if (newList && newList.length > 0) {
      dropdownSources.value.feeCodeList = newList.map((item) => {
        const surLabel = item.cnName || item.enName || '';
        const label = item.code ? `${item.code}-${surLabel}` : surLabel;
        return {
          label: label || item.cnName || item.enName || item.code || '',
          value: item.id,
        };
      });
    }
  },
  { deep: true },
);

// ==================== 生命周期 ====================

onMounted(async () => {
  initOrderFeeEnumCache();
  await initDropdownSources();
  getTableDate();
  getFeeCodeList();
});

// 监听 orderCtnList 变化，更新单位列表
watch(
  () => orderCtnList.value,
  () => {
    updateUnitList();
  },
  { deep: true },
);

// ✅ 新增：监听 orderBaseData 变化，重新填充结算对象名称
watch(
  () => orderBaseData.value,
  (newOrderDetail) => {
    if (!newOrderDetail || !dataSource.value.length) return;
    
    console.log('🔄 [watch orderBaseData] 订单详情变化，重新填充结算对象名称');
    
    // 为现有数据补充结算对象名称
    const enrichedData = dataSource.value.map((row: any) => {
      if (row.settlementId && !row.__settlementName) {
        const settlementName = extractSettlementNameFromOrder(row.settlementId);
        if (settlementName) {
          row.__settlementName = settlementName;
          console.log('✅ [watch orderBaseData] 补充结算对象名称:', settlementName);
        }
      }
      return row;
    });
    
    // 更新数据源并刷新表格
    dataSource.value = enrichedData;
  },
  { deep: true },
);

// 监听 dataSource 变化，同步到 Handsontable
watch(
  () => dataSource.value,
  (newData) => {
    console.log(
      '📊 [watch dataSource] 数据源变化，行数:',
      newData?.length || 0,
    );

    nextTick(() => {
      if (coreTableRef.value?.hotTableRef?.hotInstance) {
        console.log('🔄 [watch dataSource] 调用 hotInstance.loadData');
        
        // ✅ 关键修复：在 loadData 之前，确保所有行都有 __settlementName
        const enrichedData = (newData || []).map((row: any) => {
          if (row.settlementId && !row.__settlementName) {
            // 尝试从 orderBaseData 中提取结算对象名称
            const settlementName = extractSettlementNameFromOrder(row.settlementId);
            if (settlementName) {
              row.__settlementName = settlementName;
              console.log('✅ [watch dataSource] 补充结算对象名称:', settlementName);
            }
          }
          return row;
        });
        
        coreTableRef.value.hotTableRef.hotInstance.loadData(enrichedData);
      } else {
        console.warn('⚠️ [watch dataSource] hotInstance 不存在');
      }
    });
  },
  { deep: true },
);

defineExpose({
  getTableDate,
});
</script>

<template>
  <Card class="order-fee-card">
    <div class="px-1">
      <div>
        <div class="order-ctn-table">
          <div class="handsontable-container">
            <div class="table-header">
              <span class="table-title">
                {{
                  type === 0
                    ? $t('seaExport.export.orderFee.receivableCharges')
                    : $t('seaExport.export.orderFee.payableCharges')
                }}
              </span>
              <Space class="toolbar-actions">
                <Button type="primary" @click="actions.addRow">
                  {{ $t('common.create') }}
                </Button>
                <Button
                  type="primary"
                  @click="actions.saveRow"
                  v-show="props.mode !== 'changeOrder'"
                >
                  {{ $t('common.save') }}
                </Button>
                <Button
                  v-show="props.mode !== 'changeOrder'"
                  :loading="printing"
                  @click="handlePrint"
                >
                  <IconifyIcon
                    icon="mdi:printer-outline"
                    class="mr-1 inline-block size-3.5 align-middle"
                  />
                  打印
                </Button>
                <Button
                  danger
                  :disabled="!selectedRowKeys.length"
                  @click="actions.removeSelectedRows"
                >
                  {{ $t('common.delete') }}
                </Button>

                <DropdownButton @click="openBatchImportModal" type="primary">
                  {{ $t('seaExport.export.orderFee.batchImport') }}
                  <template #overlay>
                    <Menu @click="ImportOther">
                      <MenuItem key="submit">
                        {{ type === 0 ? '应收生成应付' : '应付生成应收' }}
                      </MenuItem>
                    </Menu>
                  </template>
                </DropdownButton>

                <DropdownButton
                  @click="actions.Submitted"
                  type="primary"
                  :disabled="!selectedRowKeys.length"
                >
                  {{ $t('auditApproval.status.Submitted') }}
                  <template #overlay>
                    <Menu @click="SubmittedOther">
                      <MenuItem key="modify">
                        {{ $t('auditApproval.ApplyModification') }}
                      </MenuItem>
                      <MenuItem key="delete">
                        {{ $t('auditApproval.ApplyDeletion') }}
                      </MenuItem>
                    </Menu>
                  </template>
                </DropdownButton>

                <Button
                  type="primary"
                  :disabled="!selectedRowKeys.length"
                  @click="actions.orderFeeWithdraw"
                  >{{ $t('auditApproval.withdraw') }}</Button
                >
              </Space>
            </div>

            <OrderFeeTableCore
              ref="coreTableRef"
              :data-source="dataSource"
              :selected-row-keys="selectedRowKeys"
              :hot-settings="hotSettings"
              :dropdown-sources="dropdownSources"
              :order-detail="orderBaseData"
              @update:selected-row-keys="selectedRowKeys = $event"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 费用编辑模态框 -->
    <OrderFeeEditorModal
      ref="modifyModalRef"
      :rec-amount-map="recAmountMap || {}"
      :pay-amount-map="payAmountMap || {}"
      :fee-code-list="feeCodeList"
      @confirm="handleModalConfirm"
    />

    <!-- 审核历史模态框 -->
    <OrderFeeAuditHistoryModal ref="auditHistoryModalRef" />

    <!-- 批量引入费用模态框 -->
    <BatchImportFeeModal
      ref="batchImportModalRef"
      @confirm="handleBatchImportConfirm"
    />
  </Card>
</template>

<style scoped lang="scss">
.order-fee-card {
  :deep(.ant-card-body) {
    padding: 0 20px 12px !important;
  }

  .order-ctn-table {
    display: flex;
    flex-direction: column;
    height: 500px;
  }

  .handsontable-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    border: 1px solid #e8e8e8;
    border-radius: 4px;
  }

  .table-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: #fafafa;
    border-bottom: 1px solid #e8e8e8;

    .table-title {
      font-size: 14px;
      font-weight: 500;
      color: #262626;
    }

    .toolbar-actions {
      display: flex;
      gap: 8px;
    }
  }
}
</style>
