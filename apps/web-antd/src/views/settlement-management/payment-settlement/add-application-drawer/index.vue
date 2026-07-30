<script lang="ts" setup>
import type { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';

import { computed, ref, onMounted, nextTick, onUnmounted } from 'vue';
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

import { useSearchSchema, getStatusTagProps } from './data';

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

// MutationObserver 实例
let tableObserver: MutationObserver | null = null;

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

  // 初始化 MutationObserver
  await nextTick();
  setTimeout(() => {
    initTableObserver();
  }, 200);
}

/** 关闭抽屉 */
function closeDrawer() {
  visible.value = false;
  // 销毁 Observer
  destroyTableObserver();
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
      // 固定币别申请：初始化 settledPrice 字段，默认为未结算费用
      if (app.currencyId) {
        const unsettledAmount =
          (app.totalSettleablePriceUpperLimit ?? 0) +
          (app.totalSettleablePriceLowerLimit ?? 0);
        app.settledPrice = app.settledPrice ?? unsettledAmount;
      }

      // 原币申请：为每个币别分组初始化 settledAmount 和 checked 字段
      if (app.currencyGroup) {
        app.currencyGroup = app.currencyGroup.map((group: any) => {
          const unsettledAmount =
            (group.settleableUpperLimit ?? 0) +
            (group.settleableLowerLimit ?? 0);
          return {
            ...group,
            settledAmount: group.settledAmount ?? unsettledAmount, // 初始化用户输入的结算金额，默认为未结算费用
            checked: false, // 初始化复选框状态为未选中
          };
        });
      }
      return app;
    });

    total.value = result.totalCount || 0;

    // 数据加载完成后，启用列宽拖拽
    await nextTick();
    const tables = document.querySelectorAll('.ant-table-wrapper');
    tables.forEach((table) => {
      enableColumnResize(table as HTMLElement);
    });
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

  // 如果用户没有选择结算币别，尝试从已选费用中自动推断
  if (!selectedCurrencyId.value) {
    // 收集所有已选费用中的币别ID
    const currencyIds = new Set<number>();

    selectedApps.forEach((app) => {
      // 固定币别申请：直接使用 currencyId
      if (app.currencyId) {
        currencyIds.add(app.currencyId);
      }
      // 原币申请：收集所有被勾选且有结算金额的币别ID
      else if (app.currencyGroup) {
        app.currencyGroup.forEach((group: any) => {
          if (
            group.checked &&
            group.settledAmount &&
            group.settledAmount !== 0
          ) {
            currencyIds.add(group.id);
          }
        });
      }
    });

    // 如果只有一个唯一的币别，自动设置为结算币别
    if (currencyIds.size === 1) {
      const autoSelectedCurrencyId = Array.from(currencyIds)[0];
      selectedCurrencyId.value = autoSelectedCurrencyId;
      console.log('自动设置结算币别为:', autoSelectedCurrencyId);
      message.success(`自动选择结算币别`);
    }
  }

  // 验证是否选择了结算币别（包括自动设置的情况）
  if (!selectedCurrencyId.value) {
    message.warning('请选择结算币别');
    return;
  }

  // 构造返回数据，并过滤掉结算金额为0的申请和币别
  const result = dataSource.value
    .filter((app) => selectedRowKeys.value.includes(app.id))
    .map((app) => {
      const item: any = {
        application: app,
      };

      // 固定币别申请
      if (app.currencyId) {
        // 从用户输入获取 settledPrice
        item.settledPrice = app.settledPrice || 0;
      } else {
        // 原币申请：只收集用户勾选且填写了结算金额的币别
        item.currencyItems = (app.currencyGroup || [])
          .filter((g: any) => {
            // 首先检查是否被勾选
            if (!g.checked) {
              return false;
            }
            // 然后检查是否有可结算金额范围
            const hasSettleableAmount =
              g.settleableUpperLimit > 0 || g.settleableLowerLimit < 0;
            // 然后检查用户是否填写了非零的结算金额
            const hasUserInput =
              g.settledAmount && g.settledAmount !== 0 ? true : false;
            console.log(
              '币别检查:',
              g.code,
              'checked:',
              g.checked,
              'hasSettleableAmount:',
              hasSettleableAmount,
              'hasUserInput:',
              hasUserInput,
            );
            // 必须同时满足：被勾选、有可结算金额、用户填写了非零金额
            return g.checked && hasSettleableAmount && hasUserInput;
          })
          .map((g: any) => ({
            originalCurrencyId: g.id,
            settledAmount: g.settledAmount, // 使用用户输入的settledAmount
          }));

        console.log('item.currencyItems', item.currencyItems);
      }

      return item;
    })
    .filter((item) => {
      // 过滤掉没有有效结算数据的申请
      if (item.application.currencyId) {
        // 固定币别申请：检查settledPrice是否为0
        return item.settledPrice !== 0;
      } else {
        // 原币申请：检查currencyItems是否为空（如果为空说明没有勾选任何有效的结算金额）
        return item.currencyItems && item.currencyItems.length > 0;
      }
    });

  // 如果过滤后没有数据，提示用户
  if (result.length === 0) {
    message.warning(
      '所有申请的结算金额都为0或未填写，请至少填写一个非零的结算金额',
    );
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

// 获取付费申请状态 Tag 展示
function resolveApplicationStatusTag(status: number) {
  return getStatusTagProps(status);
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

// 获取原币申请的未结算费用统计（按币别分组）
function getCurrencyGroupUnsettledTotal(
  record: PaymentApplicationAdminApi.PaymentApplicationForSettlementDto,
): string {
  // 如果是固定币别申请，不显示此统计
  if (record.currencyId) {
    return '';
  }

  // 原币申请：统计所有币别分组的未结算费用
  if (!record.currencyGroup || record.currencyGroup.length === 0) {
    return '-';
  }

  const currencyStats = record.currencyGroup
    .map((group: any) => {
      const unsettledAmount =
        (group.settleableUpperLimit ?? 0) + (group.settleableLowerLimit ?? 0);
      // 只显示有未结算费用的币别
      if (unsettledAmount !== 0) {
        return `${group.code}:${formatAmount(unsettledAmount)}`;
      }
      return null;
    })
    .filter((item): item is string => item !== null);

  return currencyStats.length > 0 ? currencyStats.join('  ') : '-';
}

// 获取归属组织名称（组织串末端）
function getCompanyName(
  record: PaymentApplicationAdminApi.PaymentApplicationForSettlementDto,
): string {
  return record.orgs?.at(-1)?.name || '-';
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
      dataIndex: 'auditUserNickName',
      key: 'auditUserNickName',
      width: 100,
    },
    {
      title: '未结算费用',
      key: 'unSettledAmount',
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
      title: '归属组织',
      key: 'companyName',
      width: 150,
    },
  ];

// 第二层列配置（币别分组）- 添加复选框列
const currencyGroupColumns: ColumnsType<PaymentApplicationAdminApi.CurrencyGroupForSettlementDto> =
  [
    {
      title: '',
      key: 'checkbox',
      width: 50,
      align: 'center',
    },
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
      key: 'totalUnSettledAmount',
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
      title: '申请金额',
      dataIndex: 'rqstPaymentAmount',
      key: 'rqstPaymentAmount',
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

/** 为表格添加列宽拖拽功能 */
function enableColumnResize(tableElement: HTMLElement | null) {
  if (!tableElement) return;

  // 查找该表格容器内的所有表头（包括嵌套的表格）
  const headers = tableElement.querySelectorAll('th');

  headers.forEach((header) => {
    // 跳过选择框列和展开图标列
    if (
      header.classList.contains('ant-table-selection-column') ||
      header.classList.contains('ant-table-expand-icon-th')
    ) {
      return;
    }

    // 如果已经有拖拽手柄，跳过
    if (header.querySelector('.column-resizer')) {
      return;
    }

    // 创建拖拽手柄
    const resizer = document.createElement('div');
    resizer.className = 'column-resizer';
    resizer.style.cssText = `
      position: absolute;
      right: 0;
      top: 0;
      bottom: 0;
      width: 5px;
      cursor: col-resize;
      background-color: transparent;
      transition: background-color 0.2s;
      z-index: 10;
    `;

    resizer.addEventListener('mouseenter', () => {
      resizer.style.backgroundColor = '#d9d9d9';
    });

    resizer.addEventListener('mouseleave', () => {
      resizer.style.backgroundColor = 'transparent';
    });

    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    resizer.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;
      startWidth = header.offsetWidth;
      resizer.style.backgroundColor = '#1890ff';

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      e.preventDefault();
    });

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const diff = e.clientX - startX;
      const newWidth = Math.max(80, startWidth + diff);
      header.style.width = `${newWidth}px`;
      header.style.minWidth = `${newWidth}px`;
      header.style.maxWidth = `${newWidth}px`;
    };

    const handleMouseUp = () => {
      isResizing = false;
      resizer.style.backgroundColor = 'transparent';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    header.style.position = 'relative';
    header.appendChild(resizer);
  });
}

/** 为所有可见的表格启用列宽拖拽 */
function enableResizeForAllTables() {
  const tables = document.querySelectorAll('.ant-table-wrapper');
  tables.forEach((table) => {
    enableColumnResize(table as HTMLElement);
  });
}

/** 初始化 MutationObserver 监听表格变化 */
function initTableObserver() {
  if (tableObserver) return;

  tableObserver = new MutationObserver((mutations) => {
    let hasNewTable = false;

    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          // 检查是否新增了表格元素
          if (
            node.classList?.contains('ant-table-wrapper') ||
            node.querySelector?.('.ant-table-wrapper')
          ) {
            hasNewTable = true;
          }
        }
      });
    });

    // 如果有新表格，启用拖拽
    if (hasNewTable) {
      setTimeout(() => {
        enableResizeForAllTables();
      }, 50);
    }
  });

  // 开始观察 drawer 内容区域的变化
  const drawerContent = document.querySelector('.ant-drawer-body');
  if (drawerContent) {
    tableObserver.observe(drawerContent, {
      childList: true,
      subtree: true,
    });
  }
}

/** 销毁 MutationObserver */
function destroyTableObserver() {
  if (tableObserver) {
    tableObserver.disconnect();
    tableObserver = null;
  }
}

/** 行展开事件处理 - 为展开的表格启用列宽拖拽 */
async function handleExpand(expanded: boolean, record: any) {
  if (expanded) {
    await nextTick();

    // 多次尝试确保 DOM 渲染完成
    setTimeout(() => {
      enableResizeForAllTables();
    }, 50);

    setTimeout(() => {
      enableResizeForAllTables();
    }, 150);

    setTimeout(() => {
      enableResizeForAllTables();
    }, 300);
  }
}

/** 第二层表格展开事件处理 - 为第三层表格启用列宽拖拽 */
async function handleSecondLevelExpand(expanded: boolean, record: any) {
  if (expanded) {
    await nextTick();

    // 多次尝试确保 DOM 渲染完成
    setTimeout(() => {
      enableResizeForAllTables();
    }, 50);

    setTimeout(() => {
      enableResizeForAllTables();
    }, 150);

    setTimeout(() => {
      enableResizeForAllTables();
    }, 300);
  }
}
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
        onExpand: handleExpand,
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
            v-bind="
              resolveApplicationStatusTag(
                (
                  record as PaymentApplicationAdminApi.PaymentApplicationForSettlementDto
                ).status,
              ).tagProps
            "
          >
            {{
              resolveApplicationStatusTag(
                (
                  record as PaymentApplicationAdminApi.PaymentApplicationForSettlementDto
                ).status,
              ).label
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

        <template v-else-if="column.key === 'clientName'">
          {{
            (
              record as PaymentApplicationAdminApi.PaymentApplicationForSettlementDto
            ).settlement?.name || '-'
          }}
        </template>

        <template v-else-if="column.key === 'currencyCode'">
          {{
            (
              record as PaymentApplicationAdminApi.PaymentApplicationForSettlementDto
            ).currency?.code || '原币'
          }}
        </template>

        <template v-else-if="column.key === 'unSettledAmount'">
          <!-- 固定币别申请：显示原有的计算方式 -->
          <span
            v-if="
              (
                record as PaymentApplicationAdminApi.PaymentApplicationForSettlementDto
              ).currencyId
            "
          >
            {{
              ((
                record as PaymentApplicationAdminApi.PaymentApplicationForSettlementDto
              ).totalSettleablePriceUpperLimit ?? 0) +
              ((
                record as PaymentApplicationAdminApi.PaymentApplicationForSettlementDto
              ).totalSettleablePriceLowerLimit ?? 0)
            }}
          </span>
          <!-- 原币申请：显示各币别的未结算费用统计 -->
          <span v-else>
            {{
              getCurrencyGroupUnsettledTotal(
                record as PaymentApplicationAdminApi.PaymentApplicationForSettlementDto,
              )
            }}
          </span>
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
      <template #expandedRowRender="{ record: applicationRecord }">
        <Table
          :columns="currencyGroupColumns"
          :data-source="applicationRecord.currencyGroup || []"
          :pagination="false"
          row-key="id"
          bordered
          size="small"
          :expandable="{
            defaultExpandAllRows: false,
            expandIconColumnIndex: 0,
            onExpand: handleSecondLevelExpand,
          }"
        >
          <template #bodyCell="{ column, record: currencyRecord }">
            <!-- 复选框列 -->
            <template v-if="column.key === 'checkbox'">
              <div
                v-if="!applicationRecord.currencyId"
                style="display: flex; justify-content: center"
              >
                <input
                  type="checkbox"
                  :checked="currencyRecord.checked"
                  @change="
                    (e) => {
                      const isChecked = (e.target as HTMLInputElement).checked;
                      currencyRecord.checked = isChecked;

                      console.log('二级复选框变化:', {
                        isChecked,
                        applicationId: applicationRecord.id,
                        currentSelectedKeys: selectedRowKeys,
                        alreadyIncluded: selectedRowKeys.includes(
                          applicationRecord.id,
                        ),
                      });

                      // 如果勾选了二级，自动选中一级
                      if (
                        isChecked &&
                        !selectedRowKeys.includes(applicationRecord.id)
                      ) {
                        selectedRowKeys = [
                          ...selectedRowKeys,
                          applicationRecord.id,
                        ];
                        console.log('已自动选中一级:', applicationRecord.id);
                        console.log(
                          '更新后的selectedRowKeys:',
                          selectedRowKeys,
                        );
                      }
                    }
                  "
                  :disabled="
                    (currencyRecord.settleableUpperLimit === 0 &&
                      currencyRecord.settleableLowerLimit === 0) ||
                    (props.existingApplicationIds?.includes(
                      applicationRecord.id,
                    ) ??
                      false)
                  "
                />
              </div>
              <span v-else style="color: #999">-</span>
            </template>

            <template v-else-if="column.key === 'commissionNums'">
              {{ getCommissionNums(currencyRecord.orderFees) }}
            </template>

            <template v-else-if="column.key === 'mblNums'">
              {{ getMblNums(currencyRecord.orderFees) }}
            </template>

            <template v-else-if="column.key === 'totalUnSettledAmount'">
              {{ currencyRecord.totalUnSettledAmount }}
            </template>

            <template v-else-if="column.key === 'settledAmount'">
              <InputNumber
                v-if="!applicationRecord.currencyId"
                v-model:value="currencyRecord.settledAmount"
                :min="currencyRecord.settleableLowerLimit || 0"
                :max="currencyRecord.settleableUpperLimit || 0"
                :precision="2"
                placeholder="请输入"
                style="width: 100%"
                :disabled="
                  !selectedRowKeys.includes(applicationRecord.id) ||
                  (currencyRecord.settleableUpperLimit === 0 &&
                    currencyRecord.settleableLowerLimit === 0) ||
                  (props.existingApplicationIds?.includes(
                    applicationRecord.id,
                  ) ??
                    false)
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

                <template v-else-if="column.key === 'rqstPaymentAmount'">
                  {{ formatAmount(feeItem.rqstPaymentAmount) }}
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

<style scoped>
/* 列宽拖拽手柄样式 */
:deep(.column-resizer) {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  width: 5px;
  cursor: col-resize;
  background-color: transparent;
  transition: background-color 0.2s;
}

:deep(.column-resizer:hover) {
  background-color: #d9d9d9;
}

:deep(th) {
  position: relative;
  user-select: none;
}
</style>
