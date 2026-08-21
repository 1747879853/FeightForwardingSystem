import type { ReportApi } from '#/api/system/report';

import type { VbenFormSchema } from '#/adapter/form';
import ClientSelect from '#/adapter/component/biz-select/client-select.vue';
import SmartPortSelect from './modules/SmartPortSelect.vue';

/**
 * 业务类型选项
 */
export const BIZ_TYPE_OPTIONS = [
  { label: '海运出口', value: 0 },
  { label: '海运进口', value: 1 },
  { label: '空运出口', value: 2 },
];

/**
 * 货物类型选项
 */
export const CARGO_TYPE_OPTIONS = [
  { label: '普通货', value: 0 },
  { label: '冻柜', value: 1 },
  { label: '危险品', value: 2 },
  { label: '超限箱', value: 3 },
];

/**
 * 结算方式选项
 */
export const SETTLEMENT_TYPE_OPTIONS = [
  { label: '票结', value: 0 },
  { label: '月结', value: 1 },
  { label: '约定天数', value: 2 },
];

/**
 * 装运方式选项
 */
export const BL_TYPE_OPTIONS = [
  { label: '整箱', value: 0 },
  { label: '拼箱主票', value: 1 },
  { label: '拼箱分票', value: 2 },
];

/**
 * 查询表单配置
 */
export function useProfitReportFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'isMergeChangeOrder',
      label: '合并更改单',
      component: 'Switch',
      defaultValue: true,
      componentProps: {
        checkedChildren: '是',
        unCheckedChildren: '否',
      },
    },
    {
      fieldName: 'bizType',
      label: '业务类型',
      component: 'Select',
      componentProps: {
        options: BIZ_TYPE_OPTIONS,
        allowClear: true,
        placeholder: '请选择业务类型',
        style: { width: '100%' },
      },
    },
    {
      fieldName: 'clientId',
      label: '委托单位',
      component: ClientSelect,
      componentProps: {
        placeholder: '请选择委托单位',
        style: { width: '100%' },
      },
    },
    {
      fieldName: 'mblNum',
      label: '主提单号',
      component: 'Input',
      componentProps: {
        placeholder: '请输入主提单号',
        allowClear: true,
        style: { width: '100%' },
      },
    },
    {
      fieldName: 'commissionNum',
      label: '委托编号',
      component: 'Input',
      componentProps: {
        placeholder: '请输入委托编号',
        allowClear: true,
        style: { width: '100%' },
      },
    },
    {
      fieldName: 'bizDateStart',
      label: '业务日期起',
      component: 'DatePicker',
      componentProps: {
        placeholder: '请选择开始日期',
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
        style: { width: '100%' },
      },
    },
    {
      fieldName: 'bizDateEnd',
      label: '业务日期止',
      component: 'DatePicker',
      componentProps: {
        placeholder: '请选择结束日期',
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
        style: { width: '100%' },
      },
    },
    {
      fieldName: 'cargoId',
      label: '货物类型',
      component: 'Select',
      componentProps: {
        options: CARGO_TYPE_OPTIONS,
        allowClear: true,
        placeholder: '请选择货物类型',
        style: { width: '100%' },
      },
    },
    {
      fieldName: 'settlementType',
      label: '结算方式',
      component: 'Select',
      componentProps: {
        options: SETTLEMENT_TYPE_OPTIONS,
        allowClear: true,
        placeholder: '请选择结算方式',
        style: { width: '100%' },
      },
    },
    {
      fieldName: 'polId',
      label: '起运港',
      component: SmartPortSelect,
      componentProps: (formValues: any) => ({
        placeholder: '请选择起运港',
        style: { width: '100%' },
        bizType: formValues.bizType,
      }),
    },
    {
      fieldName: 'podId',
      label: '目的港',
      component: SmartPortSelect,
      componentProps: (formValues: any) => ({
        placeholder: '请选择目的港',
        style: { width: '100%' },
        bizType: formValues.bizType,
      }),
    },
  ];
}

/**
 * 表格列配置
 */
export function useProfitReportColumns() {
  return [
    {
      field: 'commissionNum',
      title: '委托编号',
      width: 150,
      fixed: 'left' as const,
    },
    {
      field: 'mblNum',
      title: '主提单号',
      width: 150,
    },
    {
      field: 'bizType',
      title: '业务类型',
      width: 100,
      formatter: ({ row }: any) => {
        const typeMap: Record<number, string> = {
          0: '海运出口',
          1: '海运进口',
          2: '空运出口',
        };
        return typeMap[row.bizType] || '-';
      },
    },
    {
      field: 'client',
      title: '委托单位',
      width: 150,
      formatter: ({ row }: any) => {
        return row.client?.name || '-';
      },
    },
    {
      field: 'pol',
      title: '起运港',
      width: 120,
      formatter: ({ row }: any) => {
        return row.pol ? `${row.pol.cnName}(${row.pol.code})` : '-';
      },
    },
    {
      field: 'pod',
      title: '目的港',
      width: 120,
      formatter: ({ row }: any) => {
        return row.pod ? `${row.pod.cnName}(${row.pod.code})` : '-';
      },
    },
    {
      field: 'vessel',
      title: '船名',
      width: 150,
    },
    {
      field: 'innerVoyno',
      title: '航次',
      width: 100,
    },
    {
      field: 'ctns',
      title: '箱型箱量',
      width: 150,
      formatter: ({ row }: any) => {
        if (!row.ctns || row.ctns.length === 0) return '-';
        return row.ctns
          .map((ctn: any) => `${ctn.ctnCode.ctnName}×${ctn.count}`)
          .join(', ');
      },
    },
    {
      field: 'bizDate',
      title: '业务日期',
      width: 120,
    },
    {
      field: 'accountDate',
      title: '会计期间',
      width: 120,
      // formatter: ({ row }: any) => {
      //   return row.accountDate ? dayjs(row.accountDate).format('YYYY-MM') : '-';
      // },
    },
    {
      field: 'currencies',
      title: '币别明细',
      minWidth: 300,
      formatter: ({ row }: any) => {
        if (!row.currencies || row.currencies.length === 0) return '-';
        return row.currencies
          .map(
            (curr: any) =>
              `${curr.currency.code}:应收${curr.receivable.toFixed(2)}/应付${curr.payable.toFixed(2)}/利润${curr.profit.toFixed(2)}`,
          )
          .join('; ');
      },
    },
    {
      field: 'totalReceivable',
      title: '合计应收(CNY)',
      width: 140,
      align: 'right' as const,
      formatter: ({ row }: any) => {
        return row.totalReceivable?.toFixed(2) || '0.00';
      },
    },
    {
      field: 'totalPayable',
      title: '合计应付(CNY)',
      width: 140,
      align: 'right' as const,
      formatter: ({ row }: any) => {
        return row.totalPayable?.toFixed(2) || '0.00';
      },
    },
    {
      field: 'totalProfit',
      title: '合计利润(CNY)',
      width: 140,
      align: 'right' as const,
      formatter: ({ row }: any) => {
        return row.totalProfit?.toFixed(2) || '0.00';
      },
    },
    {
      field: 'totalProfitRate',
      title: '利润率(%)',
      width: 120,
      align: 'right' as const,
      formatter: ({ row }: any) => {
        return row.totalProfitRate != null
          ? (row.totalProfitRate * 100).toFixed(2) + '%'
          : '-';
      },
    },
    {
      field: 'action',
      title: '操作',
      width: 100,
      fixed: 'right' as const,
      slots: { default: 'action' },
    },
  ];
}

/**
 * 安全的日期格式化函数（用于Handsontable渲染器）
 */
function safeFormatDateForRenderer(
  dateStr: string | undefined | null,
  format: 'date' | 'month' = 'date',
): string {
  if (!dateStr) {
    return '-';
  }

  // 尝试解析日期
  const date = new Date(dateStr);

  // 检查是否为有效日期
  if (isNaN(date.getTime())) {
    return '-';
  }

  try {
    if (format === 'month') {
      // 使用标准格式 YYYY-MM，避免末尾多余的斜杠
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${year}/${month}`;
    } else {
      return date.toLocaleDateString();
    }
  } catch (error) {
    return '-';
  }
}

/**
 * 获取 Handsontable 列配置（基础列）
 */
export function getBaseHotColumns() {
  return [
    {
      data: 'commissionNum',
      title: '委托编号',
      width: 150,
      fixed: 'left' as const, // 固定在左侧
    },
    {
      data: 'mblNum',
      title: '主提单号',
      width: 150,
      fixed: 'left' as const, // 固定在左侧
    },
    {
      data: 'bizType',
      title: '业务类型',
      width: 100,
    },
    {
      data: 'client',
      title: '委托单位',
      width: 150,
    },
    {
      data: 'pol',
      title: '起运港',
      width: 120,
    },
    {
      data: 'pod',
      title: '目的港',
      width: 120,
    },
    {
      data: 'vessel',
      title: '船名',
      width: 150,
    },
    {
      data: 'innerVoyno',
      title: '航次',
      width: 100,
    },
    {
      data: 'ctns',
      title: '箱型箱量',
      width: 150,
      renderer: (
        instance: any,
        td: HTMLTableCellElement,
        row: number,
        col: number,
        prop: string,
        value: any,
        cellProperties: any,
      ) => {
        // value 已经是格式化好的字符串
        td.innerHTML = value || '-';
        return td;
      },
    },
    {
      data: 'bizDate',
      title: '业务日期',
      width: 120,
      renderer: (
        instance: any,
        td: HTMLTableCellElement,
        row: number,
        col: number,
        prop: string,
        value: any,
        cellProperties: any,
      ) => {
        td.innerHTML = safeFormatDateForRenderer(value, 'date');
        return td;
      },
    },
    {
      data: 'accountDate',
      title: '会计期间',
      width: 120,
      renderer: (
        instance: any,
        td: HTMLTableCellElement,
        row: number,
        col: number,
        prop: string,
        value: any,
        cellProperties: any,
      ) => {
        td.innerHTML = safeFormatDateForRenderer(value, 'month');
        return td;
      },
    },
  ];
}

/**
 * 获取币别明细列配置
 */
export function getCurrencyColumns(currencyCodes: string[]) {
  const currencyColumns: any[] = [];

  // 按币别代码排序，确保列顺序一致
  const sortedCodes = [...currencyCodes].sort();

  sortedCodes.forEach((code) => {
    currencyColumns.push({
      data: `${code}_receivable`,
      title: `${code}应收`,
      width: 120,
      className: 'htRight',
      renderer: (
        instance: any,
        td: HTMLTableCellElement,
        row: number,
        col: number,
        prop: string,
        value: any,
        cellProperties: any,
      ) => {
        td.innerHTML = (parseFloat(value) || 0).toFixed(2);
        return td;
      },
    });

    currencyColumns.push({
      data: `${code}_payable`,
      title: `${code}应付`,
      width: 120,
      className: 'htRight',
      renderer: (
        instance: any,
        td: HTMLTableCellElement,
        row: number,
        col: number,
        prop: string,
        value: any,
        cellProperties: any,
      ) => {
        td.innerHTML = (parseFloat(value) || 0).toFixed(2);
        return td;
      },
    });

    currencyColumns.push({
      data: `${code}_profit`,
      title: `${code}利润`,
      width: 120,
      className: 'htRight',
      renderer: (
        instance: any,
        td: HTMLTableCellElement,
        row: number,
        col: number,
        prop: string,
        value: any,
        cellProperties: any,
      ) => {
        td.innerHTML = (parseFloat(value) || 0).toFixed(2);
        return td;
      },
    });
  });

  return currencyColumns;
}

/**
 * 获取合计列配置
 */
export function getTotalColumns() {
  return [
    {
      data: 'totalReceivable',
      title: '合计应收(CNY)',
      width: 140,
      className: 'htRight',
      renderer: (
        instance: any,
        td: HTMLTableCellElement,
        row: number,
        col: number,
        prop: string,
        value: any,
        cellProperties: any,
      ) => {
        td.innerHTML = (parseFloat(value) || 0).toFixed(2);
        return td;
      },
    },
    {
      data: 'totalPayable',
      title: '合计应付(CNY)',
      width: 140,
      className: 'htRight',
      renderer: (
        instance: any,
        td: HTMLTableCellElement,
        row: number,
        col: number,
        prop: string,
        value: any,
        cellProperties: any,
      ) => {
        td.innerHTML = (parseFloat(value) || 0).toFixed(2);
        return td;
      },
    },
    {
      data: 'totalProfit',
      title: '合计利润(CNY)',
      width: 140,
      className: 'htRight',
      renderer: (
        instance: any,
        td: HTMLTableCellElement,
        row: number,
        col: number,
        prop: string,
        value: any,
        cellProperties: any,
      ) => {
        td.innerHTML = (parseFloat(value) || 0).toFixed(2);
        return td;
      },
    },
    {
      data: 'totalProfitRate',
      title: '利润率(%)',
      width: 120,
      className: 'htRight',
      renderer: (
        instance: any,
        td: HTMLTableCellElement,
        row: number,
        col: number,
        prop: string,
        value: any,
        cellProperties: any,
      ) => {
        td.innerHTML =
          value != null ? (parseFloat(value) * 100).toFixed(2) + '%' : '-';
        return td;
      },
    },
  ];
}

/**
 * 获取 Handsontable 列配置（兼容旧版本）
 */
export function getHotColumns() {
  return [...getBaseHotColumns(), ...getTotalColumns()];
}

/**
 * 计算统计汇总
 */
export function calculateStatistics(data: ReportApi.ProfitReportDto[]) {
  const stats = {
    totalReceivable: 0,
    totalPayable: 0,
    totalProfit: 0,
    currencyStats: new Map<
      string,
      { receivable: number; payable: number; profit: number }
    >(),
  };

  data.forEach((item) => {
    stats.totalReceivable += item.totalReceivable || 0;
    stats.totalPayable += item.totalPayable || 0;
    stats.totalProfit += item.totalProfit || 0;

    // 按币别统计
    item.currencies?.forEach((currency) => {
      const code = currency.currency?.code || 'UNKNOWN';
      if (!stats.currencyStats.has(code)) {
        stats.currencyStats.set(code, { receivable: 0, payable: 0, profit: 0 });
      }
      const stat = stats.currencyStats.get(code)!;
      stat.receivable += currency.receivable || 0;
      stat.payable += currency.payable || 0;
      stat.profit += currency.profit || 0;
    });
  });

  return {
    totalReceivable: stats.totalReceivable.toFixed(2),
    totalPayable: stats.totalPayable.toFixed(2),
    totalProfit: stats.totalProfit.toFixed(2),
    totalProfitRate:
      stats.totalPayable !== 0 ? stats.totalProfit / stats.totalPayable : null,
    currencies: Array.from(stats.currencyStats.entries()).map(
      ([code, stat]) => ({
        code,
        receivable: stat.receivable.toFixed(2),
        payable: stat.payable.toFixed(2),
        profit: stat.profit.toFixed(2),
      }),
    ),
  };
}
