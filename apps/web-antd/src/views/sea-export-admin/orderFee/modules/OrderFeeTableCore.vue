<script lang="ts" setup>
import type { OrderFeeAdminApi } from '#/api/sea-export/order-fee-admin';
import type { ClientAdminApi } from '#/api/sea-export/client-admin';
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import { computed, h, nextTick, ref } from 'vue';

import { HotTable } from '@handsontable/vue3';
import { Select, message } from 'ant-design-vue';

import { getClientPagedList } from '#/api/sea-export/client-admin';
import { getIndustryCategoryOptions } from '../data';

interface Props {
  dataSource: OrderFeeAdminApi.OrderFeeDto[];
  selectedRowKeys: (string | number)[];
  hotSettings: any;
  dropdownSources?: {
    feeCodeList: Array<{ label: string; value: any }>;
    industryCategoryList: Array<{ label: string; value: any }>;
    currencyList: Array<{ label: string; value: any }>;
    unitList: Array<{ label: string; value: any }>;
  };
  orderDetail?: SeaExportAdminApi.SeaExportDto | null; // 新增：订单详情
  sortableFields?: Set<string>; // 可排序字段列表
  sortState?: {
    field: string | null;
    order: 'asc' | 'desc' | null;
  }; // 排序状态
}

const props = defineProps<Props>();

const emit = defineEmits(['update:selectedRowKeys', 'column-sort']);

const hotTableRef = ref<any>(null);

// ==================== 客户列表缓存 ====================

// 用于存储当前编辑的单元格信息
const currentEditingCell = ref<{
  row: number;
  col: number;
  field: string;
  td: HTMLTableCellElement | null;
} | null>(null);

// ==================== 客户列表加载 ====================

// 客户列表缓存（简化版，不依赖 Vue Query）
const clientListCache = ref<Array<{ label: string; value: any }>>([]);
const clientListLoading = ref(false);

/**
 * 加载客户列表（简化版，不使用 usePagedSelect）
 */
const loadClientList = async (
  keyword?: string,
): Promise<Array<{ label: string; value: any }>> => {
  if (clientListLoading.value) {
    return clientListCache.value;
  }

  try {
    clientListLoading.value = true;
    console.log(
      '🔄 [loadClientList] 开始加载客户列表',
      keyword ? `关键词: ${keyword}` : '',
    );

    const res = await getClientPagedList({
      Keyword: keyword || '',
      PageIndex: 1,
      PageSize: 100, // 加载更多数据
    });

    const clients = (res.items || []).map(
      (client: ClientAdminApi.ClientDto) => ({
        label: `${client.name}${client.code ? ` (${client.code})` : ''}`,
        value: client.id,
      }),
    );

    clientListCache.value = clients;
    console.log('✅ [loadClientList] 加载成功，共', clients.length, '条');

    return clients;
  } catch (error) {
    console.error('❌ [loadClientList] 加载失败:', error);
    return [];
  } finally {
    clientListLoading.value = false;
  }
};

/**
 * 从订单详情中提取所有可能的结算对象
 */
const extractSettlementOptionsFromOrder = (
  orderDetail: SeaExportAdminApi.SeaExportDto | null | undefined,
): Array<{ label: string; value: any }> => {
  if (!orderDetail) return [];

  const allClients: Array<{ id: any; name?: string; code?: string }> = [];
  const transportOrder = orderDetail.transportOrder;

  // 添加委托单位（主要客户）- 从 transportOrder 中获取
  if (transportOrder?.clientId && transportOrder.clientName) {
    allClients.push({
      id: transportOrder.clientId,
      name: transportOrder.clientName,
    });
  }

  // 添加发货人 - 从 transportOrder 中获取
  if (transportOrder?.shipperId) {
    try {
      const shipperContent = JSON.parse(transportOrder.shipperContent || '{}');
      allClients.push({
        id: transportOrder.shipperId,
        name: shipperContent.name || shipperContent.cnName,
        code: shipperContent.code,
      });
    } catch (e) {
      console.warn(
        '⚠️ [extractSettlementOptionsFromOrder] 解析发货人信息失败:',
        e,
      );
    }
  }

  // 添加收货人 - 从 transportOrder 中获取
  if (transportOrder?.consigneeId) {
    try {
      const consigneeContent = JSON.parse(
        transportOrder.consigneeContent || '{}',
      );
      allClients.push({
        id: transportOrder.consigneeId,
        name: consigneeContent.name || consigneeContent.cnName,
        code: consigneeContent.code,
      });
    } catch (e) {
      console.warn(
        '⚠️ [extractSettlementOptionsFromOrder] 解析收货人信息失败:',
        e,
      );
    }
  }

  // 添加通知人 - 从 transportOrder 中获取
  if (transportOrder?.notifierId) {
    try {
      const notifierContent = JSON.parse(
        transportOrder.notifierContent || '{}',
      );
      allClients.push({
        id: transportOrder.notifierId,
        name: notifierContent.name || notifierContent.cnName,
        code: notifierContent.code,
      });
    } catch (e) {
      console.warn(
        '⚠️ [extractSettlementOptionsFromOrder] 解析通知人信息失败:',
        e,
      );
    }
  }

  // 添加第二通知人 - 从 SeaExportDto 直接字段获取
  if (orderDetail.secondNotifierId && orderDetail.secondNotifier) {
    allClients.push({
      id: orderDetail.secondNotifierId,
      name: orderDetail.secondNotifier.name,
      code: orderDetail.secondNotifier.code,
    });
  }

  // 添加目的港代理 - 从 SeaExportDto 直接字段获取
  if (orderDetail.podAgentId && orderDetail.podAgent) {
    allClients.push({
      id: orderDetail.podAgentId,
      name: orderDetail.podAgent.name,
      code: orderDetail.podAgent.code,
    });
  }

  // 添加订舱代理 - 从 SeaExportDto 直接字段获取
  if (orderDetail.bookingAgentId && orderDetail.bookingAgent) {
    allClients.push({
      id: orderDetail.bookingAgentId,
      name: orderDetail.bookingAgent.name,
      code: orderDetail.bookingAgent.code,
    });
  }

  // 添加船代 - 从 SeaExportDto 直接字段获取
  if (orderDetail.shipAgentId && orderDetail.shipAgent) {
    allClients.push({
      id: orderDetail.shipAgentId,
      name: orderDetail.shipAgent.name,
      code: orderDetail.shipAgent.code,
    });
  }

  // 添加场站 - 从 SeaExportDto 直接字段获取
  if (orderDetail.yardId && orderDetail.yard) {
    allClients.push({
      id: orderDetail.yardId,
      name: orderDetail.yard.name,
      code: orderDetail.yard.code,
    });
  }

  // 添加车队 - 从 transportOrder 中获取
  if (transportOrder?.teamId && transportOrder.teamName) {
    allClients.push({
      id: transportOrder.teamId,
      name: transportOrder.teamName,
    });
  }

  // 添加报关行 - 从 transportOrder 中获取
  if (transportOrder?.custBrokerId && transportOrder.custBrokerName) {
    allClients.push({
      id: transportOrder.custBrokerId,
      name: transportOrder.custBrokerName,
    });
  }

  // 添加仓库 - 从 transportOrder 中获取
  if (transportOrder?.warehouseId && transportOrder.warehouseName) {
    allClients.push({
      id: transportOrder.warehouseId,
      name: transportOrder.warehouseName,
    });
  }

  // 添加保险公司 - 从 transportOrder 中获取
  if (transportOrder?.insuranceId && transportOrder.insuranceName) {
    allClients.push({
      id: transportOrder.insuranceId,
      name: transportOrder.insuranceName,
    });
  }

  // 去重并格式化
  const uniqueMap = new Map();
  allClients.forEach((client) => {
    if (client.id && !uniqueMap.has(client.id)) {
      uniqueMap.set(client.id, {
        label: client.name
          ? `${client.name}${client.code ? ` (${client.code})` : ''}`
          : String(client.id),
        value: client.id,
      });
    }
  });

  const options = Array.from(uniqueMap.values());
  console.log(
    '👥 [extractSettlementOptionsFromOrder] 提取结算对象:',
    options.length,
    '个',
  );

  return options;
};

/**
 * 显示 Ant Design Vue Select 组件
 */
const showAntdSelect = async (
  event: MouseEvent,
  td: HTMLTableCellElement,
  rowIndex: number,
  field: string,
) => {
  console.log('🔵 [showAntdSelect] 被调用', { field, rowIndex });

  event.preventDefault();
  event.stopPropagation();

  // 记录当前编辑的单元格
  currentEditingCell.value = {
    row: rowIndex,
    col: 0,
    field,
    td,
  };

  // 创建容器
  const container = document.createElement('div');
  container.className = 'handsontable-select-container';
  container.style.position = 'fixed';
  container.style.zIndex = '9999';

  // 获取单元格位置
  const rect = td.getBoundingClientRect();
  container.style.left = `${rect.left}px`;
  container.style.top = `${rect.top}px`;
  container.style.width = `${rect.width}px`;

  document.body.appendChild(container);

  // 根据字段类型获取选项
  let options: Array<{ label: string; value: any }> = [];
  const currentValue = (props.dataSource[rowIndex] as any)?.[field];
  const currentRow = props.dataSource[rowIndex] as any;

  console.log(
    '🔵 [showAntdSelect] 当前值:',
    currentValue,
    '字段:',
    field,
    '当前行数据:',
    currentRow,
  );

  if (field === 'feeCodeId') {
    console.log('✅ [showAntdSelect] 使用费用代码列表');
    options = props.dropdownSources?.feeCodeList || [];
  } else if (field === 'industryCategory') {
    console.log('✅ [showAntdSelect] 使用行业类别列表');
    options = props.dropdownSources?.industryCategoryList || [];
  } else if (field === 'settlementId') {
    console.log('✅ [showAntdSelect] 加载结算对象列表');

    // 获取当前行的行业类别
    const industryCategoryKey = currentRow?.industryCategory;
    if (!industryCategoryKey) {
      console.warn('⚠️ [showAntdSelect] 当前行没有行业类别，无法加载结算对象');
      message.warning('请先选择行业类别');
      document.body.removeChild(container);
      currentEditingCell.value = null;
      return;
    }

    // 将行业类别 key 转换为 value（字母代码）
    const industryCategoryValue = getIndustryCategoryOptions().find(
      (item: any) => item.key === industryCategoryKey,
    )?.value;

    if (!industryCategoryValue) {
      console.warn(
        '⚠️ [showAntdSelect] 无法转换行业类别:',
        industryCategoryKey,
      );
      document.body.removeChild(container);
      currentEditingCell.value = null;
      return;
    }

    console.log(
      '👥 [showAntdSelect] 行业类别:',
      industryCategoryValue,
      '开始加载对应客户列表',
    );

    // 根据行业类别加载客户列表
    try {
      const res = await getClientPagedList({
        Keyword: '',
        IndustryCategory: industryCategoryValue, // 传递行业类别参数
        PageIndex: 1,
        PageSize: 100,
      });

      options = (res.items || []).map((client: ClientAdminApi.ClientDto) => ({
        label: `${client.fullName || client.name}${client.code ? ` (${client.code})` : ''}`,
        value: client.id,
      }));

      // 缓存当前选项，用于后续显示名称
      currentOptionsCache.value = options;

      console.log('✅ [showAntdSelect] 加载成功，共', options.length, '个客户');

      if (!options.length) {
        console.warn('⚠️ [showAntdSelect] 该行业类别下没有客户');
        message.warning(`该行业类别（${industryCategoryValue}）下暂无客户`);
        document.body.removeChild(container);
        currentEditingCell.value = null;
        return;
      }
    } catch (error) {
      console.error('❌ [showAntdSelect] 加载客户列表失败:', error);
      message.error('加载客户列表失败');
      document.body.removeChild(container);
      currentEditingCell.value = null;
      return;
    }
  } else if (field === 'currencyId') {
    console.log('✅ [showAntdSelect] 使用币别列表');
    options = props.dropdownSources?.currencyList || [];
  } else if (field === 'unit') {
    console.log('✅ [showAntdSelect] 使用单位列表');
    options = props.dropdownSources?.unitList || [];
  } else {
    console.warn('⚠️ [showAntdSelect] 未知字段:', field);
    currentEditingCell.value = null;
    return;
  }

  // 如果没有选项，不显示下拉框
  if (!options.length) {
    console.warn('⚠️ [showAntdSelect] 没有可用的选项');
    currentEditingCell.value = null;
    return;
  }

  // 渲染基础 Select 组件（支持搜索过滤）
  const selectComponent = h(Select, {
    value: currentValue,
    options: options,
    placeholder: `请选择${getFieldLabel(field)}`,
    style: { width: '100%' },
    showSearch: true, // ✅ 启用搜索功能
    filterOption: (input: string, option: any) => {
      // ✅ 自定义过滤逻辑：支持按 label 模糊搜索
      if (!input) return true;
      const label = option?.label || '';
      return label.toLowerCase().includes(input.toLowerCase());
    },
    onChange: (value: any) => {
      handleSelectChange(value, field, rowIndex, container);
    },
  });

  import('vue').then(({ render }) => {
    render(selectComponent, container);
  });

  // 点击外部关闭
  const closeSelect = (e: MouseEvent) => {
    if (!container.contains(e.target as Node)) {
      // 安全检查：确保容器仍在 DOM 中
      if (container.parentNode) {
        document.body.removeChild(container);
      }
      document.removeEventListener('click', closeSelect);
      currentEditingCell.value = null;
    }
  };

  setTimeout(() => {
    document.addEventListener('click', closeSelect);
  }, 100);
};

/**
 * 获取字段的中文标签
 */
const getFieldLabel = (field: string): string => {
  const labels: Record<string, string> = {
    feeCodeId: '费用代码',
    industryCategory: '行业类别',
    settlementId: '结算对象',
    currencyId: '币别',
    unit: '单位',
  };
  return labels[field] || field;
};

/**
 * 根据字段名获取列索引
 */
const getColumnIndex = (field: string): number => {
  const index = props.hotSettings.columns?.findIndex(
    (col: any) => col.data === field,
  );
  return index >= 0 ? index : 0;
};

/**
 * 处理选择变化
 */
const handleSelectChange = (
  value: any,
  field: string,
  rowIndex: number,
  container: HTMLElement,
) => {
  console.log(`✅ [${field}] 已更新为:`, value);

  // 如果是结算对象字段，需要缓存客户名称
  if (field === 'settlementId' && value) {
    // 从当前加载的选项中查找对应的客户信息
    const selectedOption = currentOptionsCache.value?.find(
      (opt: any) => opt.value === value,
    );
    if (selectedOption) {
      console.log(
        '👤 [handleSelectChange] 缓存结算对象名称:',
        selectedOption.label,
      );
      // 将客户名称缓存到数据行中
      if (props.dataSource[rowIndex]) {
        (props.dataSource[rowIndex] as any).__settlementName =
          selectedOption.label;
      }
    }
  }

  // 使用 hotInstance.setDataAtCell 触发 afterChange 事件，从而激活联动逻辑
  if (hotTableRef.value?.hotInstance) {
    console.log('🔄 [handleSelectChange] 调用 setDataAtCell 触发联动');
    hotTableRef.value.hotInstance.setDataAtCell(
      rowIndex,
      getColumnIndex(field),
      value,
    );
  } else {
    // fallback：直接更新数据
    if (props.dataSource[rowIndex]) {
      (props.dataSource[rowIndex] as any)[field] = value;
    }
  }

  // 移除容器
  if (container.parentNode) {
    document.body.removeChild(container);
  }

  currentEditingCell.value = null;
};

// 缓存当前加载的选项（用于 settlementId 显示名称）
const currentOptionsCache = ref<Array<{ label: string; value: any }> | null>(
  null,
);

/**
 * 处理行选择
 */
const handleAfterSelection = (
  row: number,
  column: number,
  row2: number,
  column2: number,
) => {
  const selectedRows = props.dataSource.slice(row, row2 + 1);
  const keys = selectedRows.map((r) => (r as any)._rowKey);
  emit('update:selectedRowKeys', keys);
};

/**
 * 处理数据变化
 */
const handleAfterChange = (
  changes: any,
  source: string,
  syncFee: () => void,
) => {
  if (source !== 'loadData') {
    syncFee();
  }
};

defineExpose({
  hotTableRef,
  showAntdSelect,
});
</script>

<template>
  <HotTable
    ref="hotTableRef"
    :settings="hotSettings"
    class="handsontable-wrapper"
    @after-selection="handleAfterSelection"
  />
</template>

<style scoped lang="scss">
.handsontable-wrapper {
  flex: 1; // ✅ 使用 flex 布局自动填充剩余空间
  height: 600px; // ✅ 新增:固定容器高度,与 hotSettings.height 保持一致
  min-height: 0; // ✅ 防止 flex 子项溢出
  overflow: hidden; // ✅ 修复:改为 hidden,由 Handsontable 内部处理滚动

  :deep(.htCore) {
    width: 100% !important;
  }

  :deep(.ht_master) {
    // ✅ 修复:设置固定高度,避免滚动时高度变化
    height: 600px !important;
    overflow: auto !important;
  }

  :deep(::-webkit-scrollbar) {
    width: 16px;
    height: 16px;
  }

  :deep(::-webkit-scrollbar-track) {
    background: #f5f5f5;
    border-radius: 8px;
  }

  :deep(::-webkit-scrollbar-thumb) {
    min-width: 40px;
    min-height: 40px;
    background: #c1c1c1;
    border-radius: 8px;

    &:hover {
      background: #a8a8a8;
    }

    &:active {
      background: #8a8a8a;
    }
  }
}

:deep(.handsontable) {
  font-size: 13px;

  .htCore {
    border-collapse: collapse;
  }

  th {
    font-weight: 500;
    color: #262626;
    background: #fafafa;
    border-color: #e8e8e8;
  }

  td {
    border-color: #e8e8e8;
  }

  .htSelected {
    background: #e6f7ff !important;
  }

  .htCurrent {
    outline: 2px solid #1890ff !important;
    outline-offset: -2px;
  }
}
</style>
