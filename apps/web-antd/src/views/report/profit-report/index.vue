<script lang="ts" setup>
import type { ReportApi } from '#/api/system/report';

import { computed, ref, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { useAccess } from '@vben/access';
import { useVbenForm } from '#/adapter/form';

import { Card, message } from 'ant-design-vue';

import { getProfitReportList } from '#/api/system/report';

import {
  useProfitReportFormSchema,
  getBaseHotColumns,
  getCurrencyColumns,
  getTotalColumns,
} from './data';

// 导入新的表格组件
import ProfitReportTable from './components/ProfitReportTable.vue';

defineOptions({
  name: 'ProfitReport',
});

const router = useRouter();
const { hasAccessByCodes } = useAccess();

// 权限检查
const canView = computed(() => hasAccessByCodes(['Admin.Report.Profit.Get']));

// 表格加载状态
const loading = ref(false);

// 表格数据
const originalData = ref<any[]>([]); // 保存原始数据用于分组

// 分组相关状态
const groupColumns = ref<string[]>([]); // 当前分组的列名数组
const expandedGroups = ref<Set<string>>(new Set()); // 展开的分组键集合

// 存储所有出现的币别代码
const allCurrencyCodes = ref<Set<string>>(new Set());

// 列配置相关状态
const columnConfigs = ref<any[]>([]);

// 动态列配置计算属性
const dynamicHotColumns = computed(() => {
  return [
    ...getBaseHotColumns(),
    ...getCurrencyColumns(Array.from(allCurrencyCodes.value)),
    ...getTotalColumns(),
  ];
});

// 初始化默认列配置
function initDefaultColumnConfigs() {
  const allCols = dynamicHotColumns.value;
  columnConfigs.value = allCols.map((col, index) => ({
    data: col.data,
    title: col.title,
    visible: true,
    fixed: col.fixed || false,
    order: index,
  }));
}

// 监听动态列变化，更新默认配置
watch(
  dynamicHotColumns,
  () => {
    initDefaultColumnConfigs();
  },
  { immediate: true },
);

// 表单配置
const formSchema = useProfitReportFormSchema();

// 创建表单
const [QueryForm, formApi] = useVbenForm({
  schema: formSchema,
  showDefaultActions: true,
  commonConfig: {
    labelWidth: 100,
  },
  wrapperClass: 'grid-cols-5',
  showCollapseButton: true,
  collapsed: true,
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
 * 根据业务类型自动设置港口类型
 */
function setPortTypeByBizType(queryParams: any) {
  const { bizType } = queryParams;
  if (bizType !== undefined && bizType !== null) {
    if (bizType === 2) {
      queryParams.polIsSeaPort = false;
      queryParams.podIsSeaPort = false;
    } else {
      queryParams.polIsSeaPort = true;
      queryParams.podIsSeaPort = true;
    }
  }
  return queryParams;
}

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
    const values = formData || (await formApi.getValues());
    const processedValues = setPortTypeByBizType({ ...values });
    const result = await getProfitReportList(
      processedValues as ReportApi.ProfitReportQueryDto,
    );
    const dataList = result || [];
    const transformedData = transformDataForHotTable(dataList);
    originalData.value = [...transformedData];
    message.success(`查询成功，共 ${transformedData.length} 条记录`);
  } catch (error: any) {
    console.error('查询失败:', error);
  } finally {
    loading.value = false;
  }
}

/**
 * 重置查询条件
 */
async function handleReset() {
  await formApi.resetForm();
  originalData.value = [];
  groupColumns.value = [];
  expandedGroups.value = new Set();
}

// ✅ 页面加载时默认执行一次查询
onMounted(() => {
  // 延迟执行查询，确保表单已初始化
  setTimeout(() => {
    handleQuery();
  }, 100);
});

/**
 * 安全的日期格式化函数
 */
function safeFormatDate(
  dateStr: string | undefined | null,
  format: 'date' | 'month' = 'date',
): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    console.warn('无效的日期格式:', dateStr);
    return '-';
  }
  try {
    if (format === 'month') {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${year}/${month}`;
    } else {
      return date.toLocaleDateString();
    }
  } catch (error) {
    console.warn('日期格式化失败:', dateStr, error);
    return '-';
  }
}

/**
 * 转换数据以适应 Handsontable（支持币别明细拆分）
 */
function transformDataForHotTable(data: ReportApi.ProfitReportDto[]) {
  allCurrencyCodes.value = new Set();
  data.forEach((item) => {
    if (item.currencies && item.currencies.length > 0) {
      item.currencies.forEach((curr) => {
        if (curr.currency?.code) {
          allCurrencyCodes.value.add(curr.currency.code);
        }
      });
    }
  });

  const currencyCodes = Array.from(allCurrencyCodes.value).sort();

  return data.map((item) => {
    const transportOrder = item.transportOrder;
    let seaExport: ReportApi.ReportSeaExportDto | null = null;
    let seaImport: ReportApi.ReportSeaImportDto | null = null;
    let airExport: ReportApi.ReportAirExportDto | null = null;

    if (transportOrder) {
      seaExport = transportOrder.seaExport || null;
      seaImport = transportOrder.seaImport || null;
      airExport = transportOrder.airExport || null;
    }

    let pol: any = null;
    let pod: any = null;
    let polRemark: string = '';
    let podRemark: string = '';
    let vessel: string = '';
    let innerVoyno: string = '';
    let bookingAgent: any = null;
    let carrier: any = null;
    let yard: any = null;
    let blType: number | null = null;

    if (seaExport) {
      pol = seaExport.pol;
      pod = seaExport.pod;
      polRemark = seaExport.polRemark || '';
      podRemark = seaExport.podRemark || '';
      vessel = seaExport.vessel || '';
      innerVoyno = seaExport.innerVoyno || '';
      bookingAgent = seaExport.bookingAgent;
      carrier = seaExport.carrier;
      yard = seaExport.yard;
      blType = seaExport.blType;
    } else if (seaImport) {
      pol = seaImport.pol;
      pod = seaImport.pod;
      polRemark = seaImport.polRemark || '';
      podRemark = seaImport.podRemark || '';
      vessel = seaImport.vessel || '';
      innerVoyno = seaImport.innerVoyno || '';
      carrier = seaImport.carrier;
    } else if (airExport) {
      pol = airExport.pol;
      pod = airExport.pod;
      polRemark = airExport.polRemark || '';
      podRemark = airExport.podRemark || '';
      bookingAgent = airExport.bookingAgent;
    }

    const rowData: any = {
      transportOrderId: item.transportOrderId,
      changeOrderId: item.changeOrderId,
      isOriginal: item.isOriginal,
      accountDate: safeFormatDate(item.accountDate, 'month'),
      bizType: formatBizType(transportOrder?.bizType ?? 0),
      client: transportOrder?.client?.name || '-',
      mblNum: transportOrder?.mblNum || '',
      commissionNum: transportOrder?.commissionNum || '',
      bizDate: safeFormatDate(transportOrder?.bizDate, 'date'),
      settlementDate: safeFormatDate(transportOrder?.settlementDate, 'date'),
      cargoId: transportOrder?.cargoId,
      settlementType: transportOrder?.settlementType,
      pkgs: transportOrder?.pkgs,
      kgs: transportOrder?.kgs,
      cbm: transportOrder?.cbm,
      sales: (transportOrder?.sales || [])
        .map((u: any) => u.nickName)
        .join(', '),
      operations: (transportOrder?.operations || [])
        .map((u: any) => u.nickName)
        .join(', '),
      pol: pol ? pol.code : '-',
      pod: pod ? pod.code : '-',
      polRemark,
      podRemark,
      vessel,
      innerVoyno,
      carrier: carrier
        ? carrier.cnShortName || carrier.cnName || carrier.enName
        : '-',
      ctns: formatCtns(transportOrder?.ctns || []),
      totalReceivable: item.totalReceivable?.toFixed(2) || '',
      totalPayable: item.totalPayable?.toFixed(2) || '',
      totalProfit: item.totalProfit?.toFixed(2) || '',
      totalProfitRate:
        item.totalProfitRate != null ? item.totalProfitRate : null,
      _originalData: item,
      _isDataRow: true,
    };

    currencyCodes.forEach((code) => {
      rowData[`${code}_receivable`] = '';
      rowData[`${code}_payable`] = '';
      rowData[`${code}_profit`] = '';
    });

    if (item.currencies && item.currencies.length > 0) {
      item.currencies.forEach((curr) => {
        if (curr.currency?.code) {
          const code = curr.currency.code;
          const receivableValue = (curr.receivable || 0).toFixed(2);
          rowData[`${code}_receivable`] =
            receivableValue === '0.00' ? '' : receivableValue;
          rowData[`${code}_payable`] =
            (curr.payable || 0).toFixed(2) === '0.00'
              ? ''
              : (curr.payable || 0).toFixed(2);
          rowData[`${code}_profit`] =
            (curr.profit || 0).toFixed(2) === '0.00'
              ? ''
              : (curr.profit || 0).toFixed(2);
        }
      });
    }

    return rowData;
  });
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
 * 跳转到业务详情
 */
function handleViewDetail(record: ReportApi.ProfitReportDto) {
  if (!record || !record.transportOrderId) {
    message.warning('该记录没有关联的业务订单，无法跳转详情');
    return;
  }

  const bizType = record.transportOrder?.bizType ?? 0;
  const bizTypeMap: Record<number, string> = {
    0: 'sea-exports',
    1: 'sea-imports',
    2: 'air-exports',
  };
  const basePath = bizTypeMap[bizType];
  if (!basePath) {
    message.warning('不支持的业务类型，无法跳转详情');
    return;
  }

  router.push({
    path: `/${basePath}/${record.transportOrderId}/edit`,
  });
}
</script>

<template>
  <Page class="profit-report-page">
    <Card class="query-card mb-3" :bordered="false">
      <QueryForm />
    </Card>
    <ProfitReportTable
      :original-data="originalData"
      :group-columns="groupColumns"
      :expanded-groups="expandedGroups"
      :column-configs="columnConfigs"
      :all-currency-codes="allCurrencyCodes"
      :loading="loading"
      @update:group-columns="groupColumns = $event"
      @update:expanded-groups="expandedGroups = $event"
      @update:column-configs="columnConfigs = $event"
      @view-detail="handleViewDetail"
    />
  </Page>
</template>

<style scoped lang="scss">
.profit-report-page {
  display: flex;
  flex-direction: column;
  padding: 0 !important;
  margin: 0 !important;
  overflow: hidden !important;
}

:deep(.vben-page-wrapper) {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0 !important;
  margin: 0 !important;
  overflow: hidden !important;
}

:deep(.vben-page-wrapper-content) {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0 !important;
  margin: 0 !important;
  overflow: hidden !important;
}

.query-card {
  flex-shrink: 0;

  :deep(.ant-card-body) {
    padding: 16px 10px 0;
  }
}
</style>
