<script lang="ts" setup>
import type { ReportApi } from '#/api/system/report';

import { computed, ref, nextTick, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';

import { HotTable } from '@handsontable/vue3';

import { Page } from '@vben/common-ui';

import { useAccess } from '@vben/access';
import { useVbenForm } from '#/adapter/form';

import { Button, Card, message } from 'ant-design-vue';

import { getProfitReportList } from '#/api/system/report';

import { useProfitReportFormSchema, getHotColumns } from './data';

defineOptions({
  name: 'ProfitReport',
});

const router = useRouter();
const { hasAccessByCodes } = useAccess();

// 权限检查
const canView = computed(() => hasAccessByCodes(['Admin.Report.Profit.Get']));

// Handsontable 引用
const hotTableRef = ref<any>(null);
const containerRef = ref<HTMLElement | null>(null);

// 表格数据
const tableData = ref<any[]>([]);
const loading = ref(false);

// 表单配置
const formSchema = useProfitReportFormSchema();

// Handsontable 列配置
const hotColumns = getHotColumns();

// Handsontable 配置（改为普通对象，避免响应式问题）
const hotSettings = {
  data: tableData.value,
  columns: hotColumns,
  rowHeaders: true,
  colHeaders: true,
  height: 800, // 暂时恢复固定高度，确保表格能显示
  width: '100%',
  stretchH: 'all',
  manualColumnResize: true,
  manualRowResize: true,
  contextMenu: false,
  readOnly: true,
  licenseKey: 'non-commercial-and-evaluation',
  className: 'htCenter htMiddle',
  afterGetColHeader: (col: number, TH: HTMLTableCellElement) => {
    TH.style.backgroundColor = '#fafafa';
    TH.style.fontWeight = '600';
    TH.style.textAlign = 'center';
  },
};

/**
 * 更新表格高度
 */
function updateTableHeight() {
  nextTick(() => {
    if (containerRef.value && hotTableRef.value?.hotInstance) {
      const height = containerRef.value.offsetHeight;
      if (height > 0) {
        hotTableRef.value.hotInstance.updateSettings({ height });
      }
    }
  });
}

// 监听窗口大小变化
window.addEventListener('resize', updateTableHeight);

onMounted(() => {
  updateTableHeight();
});

onUnmounted(() => {
  window.removeEventListener('resize', updateTableHeight);
});

// 创建表单
const [QueryForm, formApi] = useVbenForm({
  schema: formSchema,
  showDefaultActions: true,
  commonConfig: {
    labelWidth: 100,
  },
  wrapperClass: 'grid-cols-4',
  submitButtonOptions: {
    content: '查询',
  },
  resetButtonOptions: {
    content: '重置',
  },
  handleSubmit: async (values) => {
    await handleQuery(values);
  },
  handleReset: async () => {
    await handleReset();
  },
});

/**
 * 查询报表数据
 */
/**
 * 查询报表数据
 */
async function handleQuery(formData?: any) {
  if (!canView.value) {
    message.warning('您没有权限查看利润报表');
    return;
  }

  try {
    loading.value = true;

    // 如果没有传入formData，则从表单获取
    const values = formData || (await formApi.getValues());

    console.log('查询参数:', values);

    // 调用API
    const result = await getProfitReportList(
      values as ReportApi.ProfitReportQueryDto,
    );

    const dataList = result || [];

    console.log('API返回数据:', dataList);

    // 转换数据
    const transformedData = transformDataForHotTable(dataList);

    console.log('转换后的数据:', transformedData);

    // 更新表格数据
    tableData.value = transformedData;

    // 等待 DOM 更新后，手动更新 Handsontable
    await nextTick();

    if (hotTableRef.value && hotTableRef.value.hotInstance) {
      console.log('更新 Handsontable 数据，共', transformedData.length, '条');
      hotTableRef.value.hotInstance.loadData(transformedData);
    } else {
      console.warn('HotTable 实例未找到');
    }

    message.success(`查询成功，共 ${transformedData.length} 条记录`);
  } catch (error: any) {
    console.error('查询失败:', error);
    message.error(error?.message || '查询失败，请稍后重试');
  } finally {
    loading.value = false;
  }
}

/**
 * 重置查询条件
 */
/**
 * 重置查询条件
 */
async function handleReset() {
  await formApi.resetForm();
  tableData.value = [];

  // 清空 Handsontable
  await nextTick();
  if (hotTableRef.value && hotTableRef.value.hotInstance) {
    hotTableRef.value.hotInstance.loadData([]);
  }
}

/**
 * 处理表格点击事件
 */
function onAfterOnCellMouseDown(
  event: any,
  coords: any,
  TD: HTMLTableCellElement,
) {
  // 检查是否点击了数据行（不再检查操作列）
  if (coords.row >= 0) {
    const rowData = tableData.value[coords.row];
    if (rowData && rowData._originalData) {
      handleViewDetail(rowData._originalData);
    }
  }
}

/**
 * 转换数据以适应 Handsontable
 */
function transformDataForHotTable(data: ReportApi.ProfitReportDto[]) {
  return data.map((item) => ({
    commissionNum: item.commissionNum,
    mblNum: item.mblNum,
    bizType: formatBizType(item.bizType),
    client: item.client?.name || '-',
    pol: item.pol ? item.pol.code : '-',
    pod: item.pod ? item.pod.code : '-',
    vessel: item.vessel || '-',
    innerVoyno: item.innerVoyno || '-',
    ctns: formatCtns(item.ctns),
    bizDate: item.bizDate ? new Date(item.bizDate).toLocaleDateString() : '-',
    accountDate: item.accountDate
      ? new Date(item.accountDate).toLocaleDateString().substring(0, 7)
      : '-',
    currencies: formatCurrencies(item.currencies),
    totalReceivable: item.totalReceivable?.toFixed(2) || '0.00',
    totalPayable: item.totalPayable?.toFixed(2) || '0.00',
    totalProfit: item.totalProfit?.toFixed(2) || '0.00',
    totalProfitRate:
      item.totalProfitRate != null
        ? `${(item.totalProfitRate * 100).toFixed(2)}%`
        : '-',
    _originalData: item, // 保存原始数据用于跳转
  }));
}

/**
 * 格式化业务类型
 */
function formatBizType(bizType: number) {
  const typeMap: Record<number, string> = {
    0: '海运出口',
    1: '海运进口',
    2: '空运出口',
  };
  return typeMap[bizType] || '-';
}

/**
 * 格式化箱型箱量
 */
function formatCtns(ctns: any[]) {
  if (!ctns || ctns.length === 0) return '-';
  return ctns.map((ctn) => `${ctn.ctnCode.ctnName}×${ctn.count}`).join(', ');
}

/**
 * 格式化币别明细
 */
function formatCurrencies(currencies: any[]) {
  if (!currencies || currencies.length === 0) return '-';
  return currencies
    .map(
      (curr) =>
        `${curr.currency.code}:应收${curr.receivable.toFixed(2)}/应付${curr.payable.toFixed(2)}/利润${curr.profit.toFixed(2)}`,
    )
    .join('; ');
}

/**
 * 跳转到业务详情
 */
function handleViewDetail(record: ReportApi.ProfitReportDto) {
  if (record.transportOrderId) {
    const bizTypeMap: Record<number, string> = {
      0: '/sea-export-admin/editor',
      1: '/sea-import-admin/editor',
      2: '/air-export-admin/editor',
    };

    const path = bizTypeMap[record.bizType] || '/sea-export-admin/editor';
    router.push({
      path,
      query: { id: record.transportOrderId },
    });
  }
}

/**
 * 导出Excel（预留）
 */
function handleExport() {
  message.info('导出功能开发中...');
}
</script>

<template>
  <Page auto-content-height>
    <!-- 查询区域 -->
    <Card class="mb-3" :bordered="false">
      <QueryForm />
    </Card>

    <!-- 表格区域 -->
    <Card class="flex flex-1 flex-col overflow-hidden" :bordered="false">
      <div ref="containerRef" class="handsontable-container flex-1">
        <HotTable ref="hotTableRef" :settings="hotSettings" />
      </div>
    </Card>
  </Page>
</template>

<style scoped lang="scss">
.handsontable-container {
  position: relative;
  width: 100%;
  height: 100%;

  :deep(.handsontable) {
    height: 100%;
    font-size: 13px;

    .htCore {
      td {
        padding: 8px 4px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;

        &:hover {
          background-color: #f5f5f5;
        }
      }

      th {
        padding: 10px 4px;
        font-weight: 600;
      }
    }
  }
}
</style>
