<script lang="ts" setup>
import type { OrderFeeAdminApi } from '#/api/sea-export/order-fee-admin';
import type { ClientAdminApi } from '#/api/sea-export/client-admin';
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import { computed, h, nextTick, onUnmounted, ref } from 'vue';

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

// ✅ 新增：存储当前的下拉框容器和关闭函数
const currentSelectContainer = ref<HTMLElement | null>(null);
const currentCloseHandler = ref<((e: MouseEvent) => void) | null>(null);
const isClosed = ref(false); // ✅ 防止多次触发清理

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
 * ✅ 新增：清理下拉框的统一函数
 */
const cleanupSelect = () => {
  if (isClosed.value) {
    console.log('ℹ️ [cleanupSelect] 已关闭，跳过清理');
    return;
  }

  isClosed.value = true;

  // 移除点击外部监听器
  if (currentCloseHandler.value) {
    document.removeEventListener('click', currentCloseHandler.value);
    currentCloseHandler.value = null;
  }

  // 移除滚动监听器
  removeScrollListener();

  // 移除 DOM 容器
  if (currentSelectContainer.value && currentSelectContainer.value.parentNode) {
    console.log('🗑️ [cleanupSelect] 移除下拉框容器');
    document.body.removeChild(currentSelectContainer.value);
    currentSelectContainer.value = null;
  }

  currentEditingCell.value = null;
  console.log('✅ [cleanupSelect] 清理完成');
};

/**
 * ✅ 新增：滚动事件处理函数
 */
const handleScroll = () => {
  console.log('📜 [handleScroll] 检测到滚动，销毁下拉框');
  cleanupSelect();
};

/**
 * ✅ 新增：添加滚动监听器
 */
const addScrollListener = () => {
  // 延迟执行，确保DOM已完全渲染
  setTimeout(() => {
    console.log('🔍 [addScrollListener] 开始查找滚动容器...');

    let scrollContainer: Element | null = null;

    // 方法1: 直接查找 .wtHolder 元素（Handsontable 的实际滚动容器）
    const wtHolders = document.querySelectorAll('.wtHolder');
    console.log(
      '🔍 [addScrollListener] 找到 .wtHolder 元素数量:',
      wtHolders.length,
    );

    if (wtHolders.length > 0) {
      // 使用第一个 .wtHolder（通常只有一个）
      scrollContainer = wtHolders[0] || null;
      console.log(
        '✅ [addScrollListener] 使用 .wtHolder 作为滚动容器',
      );
    }

    // 方法2: 如果没找到 .wtHolder，尝试查找 .handsontable-wrapper
    if (!scrollContainer) {
      const wrapper = document.querySelector('.handsontable-wrapper');
      if (wrapper) {
        const computedStyle = getComputedStyle(wrapper);
        console.log('🔍 [addScrollListener] 检查 .handsontable-wrapper:', {
          overflow: computedStyle.overflow,
          overflowY: computedStyle.overflowY,
          scrollHeight: wrapper.scrollHeight,
          clientHeight: wrapper.clientHeight,
          canScroll: wrapper.scrollHeight > wrapper.clientHeight,
        });

        if (
          wrapper.scrollHeight > wrapper.clientHeight ||
          computedStyle.overflow === 'auto' ||
          computedStyle.overflow === 'scroll' ||
          computedStyle.overflowY === 'auto' ||
          computedStyle.overflowY === 'scroll'
        ) {
          console.log('✅ [addScrollListener] 使用 .handsontable-wrapper 作为滚动容器');
          scrollContainer = wrapper;
        }
      }
    }

    // 方法3: 向上查找父容器
    if (!scrollContainer) {
      const wrapper = document.querySelector('.handsontable-wrapper');
      if (wrapper) {
        let parent = wrapper.parentElement;
        let depth = 0;
        const maxDepth = 5;

        while (parent && depth < maxDepth) {
          const computedStyle = getComputedStyle(parent);
          console.log(`🔍 [addScrollListener] 检查父容器层级 ${depth + 1}:`, {
            tagName: parent.tagName,
            className: parent.className,
            overflow: computedStyle.overflow,
            overflowY: computedStyle.overflowY,
            scrollHeight: parent.scrollHeight,
            clientHeight: parent.clientHeight,
            canScroll: parent.scrollHeight > parent.clientHeight,
          });

          if (
            parent.scrollHeight > parent.clientHeight ||
            computedStyle.overflow === 'auto' ||
            computedStyle.overflow === 'scroll' ||
            computedStyle.overflowY === 'auto' ||
            computedStyle.overflowY === 'scroll'
          ) {
            console.log(
              `✅ [addScrollListener] 找到父级滚动容器 (层级 ${depth + 1}):`,
              parent.tagName,
              parent.className,
            );
            scrollContainer = parent;
            break;
          }

          parent = parent.parentElement;
          depth++;
        }
      }
    }

    // 最终确定并添加监听器
    if (scrollContainer) {
      console.log('✅ [addScrollListener] 最终确定滚动容器，添加监听器');
      console.log('📊 [addScrollListener] 容器信息:', {
        tagName: scrollContainer.tagName,
        className: scrollContainer.className,
        scrollHeight: scrollContainer.scrollHeight,
        clientHeight: scrollContainer.clientHeight,
      });

      // 添加滚动监听器
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });

      // 验证监听器是否添加成功
      console.log('✅ [addScrollListener] 监听器添加完成，请尝试滚动表格');
    } else {
      console.error('❌ [addScrollListener] 无法找到滚动容器');
      console.log('💡 [addScrollListener] 提示: 请检查 Handsontable 是否正确渲染');

      // 输出所有可能的容器信息用于调试
      console.log('🔍 [addScrollListener] 调试信息 - 所有相关元素:');
      const allElements = document.querySelectorAll(
        '.handsontable-wrapper, .ht_master, .hot-table-container',
      );
      allElements.forEach((el, index) => {
        const style = getComputedStyle(el);
        console.log(`  元素 ${index} (${el.tagName}.${el.className}):`, {
          overflow: style.overflow,
          overflowY: style.overflowY,
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
          canScroll: el.scrollHeight > el.clientHeight,
        });
      });
    }
  }, 200); // 增加延迟时间，确保Handsontable完全渲染
};

/**
 * ✅ 新增：移除滚动监听器
 */
const removeScrollListener = () => {
  console.log('🔍 [removeScrollListener] 开始移除滚动监听器...');

  let removedCount = 0;

  // 方法1: 从所有 .wtHolder 元素移除（优先）
  const wtHolders = document.querySelectorAll('.wtHolder');
  console.log(
    '🔍 [removeScrollListener] 找到 .wtHolder 元素数量:',
    wtHolders.length,
  );

  for (let i = 0; i < wtHolders.length; i++) {
    const wtHolder = wtHolders[i];
    if (!wtHolder) continue;
    
    try {
      wtHolder.removeEventListener('scroll', handleScroll);
      removedCount++;
      console.log(`✅ [removeScrollListener] 从 .wtHolder[${i}] 移除监听器`);
    } catch (error) {
      console.warn(`⚠️ [removeScrollListener] 从 .wtHolder[${i}] 移除失败:`, error);
    }
  }

  // 方法2: 从 .handsontable-wrapper 移除
  const wrapper = document.querySelector('.handsontable-wrapper');
  if (wrapper) {
    try {
      wrapper.removeEventListener('scroll', handleScroll);
      removedCount++;
      console.log('✅ [removeScrollListener] 从 .handsontable-wrapper 移除监听器');
    } catch (error) {
      console.warn('⚠️ [removeScrollListener] 从 wrapper 移除失败:', error);
    }
  }

  // 方法3: 从 wrapper 的父容器中移除（最多5层）
  if (wrapper) {
    let parent = wrapper.parentElement;
    let depth = 0;
    const maxDepth = 5;

    while (parent && depth < maxDepth) {
      try {
        parent.removeEventListener('scroll', handleScroll);
        removedCount++;
        console.log(
          `✅ [removeScrollListener] 从父容器层级 ${depth + 1} 移除监听器`,
        );
      } catch (error) {
        // 静默失败，继续检查其他层级
      }
      parent = parent.parentElement;
      depth++;
    }
  }

  console.log(
    `✅ [removeScrollListener] 完成，共尝试移除 ${removedCount} 个监听器`,
  );
};

/**
 * ✅ 组件卸载时清理
 */
onUnmounted(() => {
  console.log('🧹 [onUnmounted] 组件卸载，清理下拉框');
  cleanupSelect();
});

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

  // ✅ 重置关闭状态
  isClosed.value = false;

  // ✅ 如果已有打开的下拉框，先清理
  if (currentSelectContainer.value) {
    console.log('⚠️ [showAntdSelect] 检测到已有下拉框，先清理');
    cleanupSelect();
  }

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

  // ✅ 保存当前容器引用
  currentSelectContainer.value = container;

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
      cleanupSelect(); // ✅ 使用统一清理函数
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
      cleanupSelect(); // ✅ 使用统一清理函数
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
        cleanupSelect(); // ✅ 使用统一清理函数
        return;
      }
    } catch (error) {
      console.error('❌ [showAntdSelect] 加载客户列表失败:', error);
      message.error('加载客户列表失败');
      cleanupSelect(); // ✅ 使用统一清理函数
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
    cleanupSelect(); // ✅ 使用统一清理函数
    return;
  }

  // 如果没有选项，不显示下拉框
  if (!options.length) {
    console.warn('⚠️ [showAntdSelect] 没有可用的选项');
    cleanupSelect(); // ✅ 使用统一清理函数
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

  // ✅ 点击外部关闭 - 使用统一的清理函数
  const closeSelect = (e: MouseEvent) => {
    if (!container.contains(e.target as Node)) {
      console.log('🖱️ [closeSelect] 点击外部，关闭下拉框');
      cleanupSelect();
    }
  };

  // ✅ 保存关闭处理器引用
  currentCloseHandler.value = closeSelect;

  setTimeout(() => {
    document.addEventListener('click', closeSelect);
    // ✅ 添加滚动监听器
    addScrollListener();
    console.log('✅ [showAntdSelect] 下拉框已显示，滚动监听器已添加');
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

  // ✅ 使用统一的清理函数
  cleanupSelect();
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
