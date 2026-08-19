import type { VbenFormSchema } from '@vben/common-ui';
import type { ReportApi } from '#/api/system/report';

import dayjs from 'dayjs';

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
      component: 'ApiSelect',
      componentProps: {
        api: async () => {
          try {
            const { getClientPagedList } =
              await import('#/api/sea-export/client-admin');
            const result = await getClientPagedList({
              PageIndex: 1,
              PageSize: 1000,
            });
            return (result.items || []).map((item: any) => ({
              label: item.name,
              value: item.id,
            }));
          } catch (error) {
            console.error('加载客户列表失败:', error);
            return [];
          }
        },
        showSearch: true,
        filterOption: true,
        allowClear: true,
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
      fieldName: 'orgId',
      label: '所属组织',
      component: 'ApiTreeSelect',
      componentProps: {
        api: async () => {
          try {
            const { getOrganizationUnitTree } =
              await import('#/api/system/organization-unit');
            const result = await getOrganizationUnitTree();
            return result;
          } catch (error) {
            console.error('加载组织树失败:', error);
            return [];
          }
        },
        fieldNames: {
          label: 'name',
          value: 'id',
          children: 'children',
        },
        showSearch: true,
        treeDefaultExpandAll: false,
        allowClear: true,
        placeholder: '请选择组织',
        style: { width: '100%' },
      },
    },
    {
      fieldName: 'polId',
      label: '起运港',
      component: 'ApiSelect',
      componentProps: {
        api: async () => {
          try {
            const { getSeaAirPortPagedList } =
              await import('#/api/system/report');
            const result = await getSeaAirPortPagedList({
              pageIndex: 1,
              pageSize: 1000,
            });
            return result.items.map((item: any) => ({
              label: `${item.cnName}(${item.code})`,
              value: item.id,
              isSeaPort: item.isSeaPort,
            }));
          } catch (error) {
            console.error('加载港口列表失败:', error);
            return [];
          }
        },
        showSearch: true,
        filterOption: true,
        allowClear: true,
        placeholder: '请选择起运港',
        style: { width: '100%' },
        onChange: (value: any, option: any) => {
          // 自动设置 polIsSeaPort
          if (option) {
            const formActions = (window as any).__profitReportFormActions;
            if (formActions) {
              formActions.setFieldValue('polIsSeaPort', option.isSeaPort);
            }
          }
        },
      },
    },
    {
      fieldName: 'podId',
      label: '目的港',
      component: 'ApiSelect',
      componentProps: {
        api: async () => {
          try {
            const { getSeaAirPortPagedList } =
              await import('#/api/system/report');
            const result = await getSeaAirPortPagedList({
              pageIndex: 1,
              pageSize: 1000,
            });
            return result.items.map((item: any) => ({
              label: `${item.cnName}(${item.code})`,
              value: item.id,
              isSeaPort: item.isSeaPort,
            }));
          } catch (error) {
            console.error('加载港口列表失败:', error);
            return [];
          }
        },
        showSearch: true,
        filterOption: true,
        allowClear: true,
        placeholder: '请选择目的港',
        style: { width: '100%' },
        onChange: (value: any, option: any) => {
          // 自动设置 podIsSeaPort
          if (option) {
            const formActions = (window as any).__profitReportFormActions;
            if (formActions) {
              formActions.setFieldValue('podIsSeaPort', option.isSeaPort);
            }
          }
        },
      },
    },
    // 隐藏字段：用于存储港口的 IsSeaPort 值
    {
      fieldName: 'polIsSeaPort',
      label: '起运港是否海运港',
      component: 'Input',
    },
    {
      fieldName: 'podIsSeaPort',
      label: '目的港是否海运港',
      component: 'Input',
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
      formatter: ({ row }: any) => {
        return row.bizDate ? dayjs(row.bizDate).format('YYYY-MM-DD') : '-';
      },
    },
    {
      field: 'accountDate',
      title: '会计期间',
      width: 120,
      formatter: ({ row }: any) => {
        return row.accountDate ? dayjs(row.accountDate).format('YYYY-MM') : '-';
      },
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
 * 获取 Handsontable 列配置
 */
export function getHotColumns() {
  return [
    {
      data: 'commissionNum',
      title: '委托编号',
      width: 150,
    },
    {
      data: 'mblNum',
      title: '主提单号',
      width: 150,
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
        td.innerHTML = value ? dayjs(value).format('YYYY-MM-DD') : '-';
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
        td.innerHTML = value ? dayjs(value).format('YYYY-MM') : '-';
        return td;
      },
    },
    {
      data: 'currencies',
      title: '币别明细',
      width: 300,
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
      stats.totalPayable !== 0
        ? ((stats.totalProfit / Math.abs(stats.totalPayable)) * 100).toFixed(
            2,
          ) + '%'
        : '-',
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
