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
 * 收付方选项
 */
export const PAY_SIDE_OPTIONS = [
  { label: '应收', value: 0 },
  { label: '应付', value: 1 },
];

/**
 * 结算状态选项
 */
export const SETTLEMENT_STATUS_OPTIONS = [
  { label: '未结算', value: 0 },
  { label: '已结算', value: 1 },
];

/**
 * 发票状态选项
 */
export const INVOICE_STATUS_OPTIONS = [
  { label: '未开票', value: 0 },
  { label: '已开票', value: 1 },
];

/**
 * 查询表单配置
 */
export function useArrearsReportFormSchema(): VbenFormSchema[] {
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
      },
    },
    {
      fieldName: 'paySide',
      label: '收付方',
      component: 'Select',
      componentProps: {
        options: PAY_SIDE_OPTIONS,
        allowClear: true,
        placeholder: '请选择收付方',
        style: { width: '100%' },
      },
    },
    {
      fieldName: 'settlementStatus',
      label: '结算状态',
      component: 'Select',
      componentProps: {
        options: SETTLEMENT_STATUS_OPTIONS,
        allowClear: true,
        placeholder: '请选择结算状态',
        style: { width: '100%' },
      },
    },
    {
      fieldName: 'invoiceStatus',
      label: '发票状态',
      component: 'Select',
      componentProps: {
        options: INVOICE_STATUS_OPTIONS,
        allowClear: true,
        placeholder: '请选择发票状态',
        style: { width: '100%' },
      },
    },
    {
      fieldName: 'isStatemented',
      label: '是否对账',
      component: 'Switch',
      componentProps: {
        checkedChildren: '是',
        unCheckedChildren: '否',
      },
    },
    {
      fieldName: 'feeLocked',
      label: '费用锁定',
      component: 'Switch',
      componentProps: {
        checkedChildren: '是',
        unCheckedChildren: '否',
      },
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
      data: 'settlement',
      title: '结算对象',
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
      data: 'settlementDate',
      title: '结算日期',
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
      data: 'overdueDays',
      title: '逾期天数',
      width: 100,
    },
    {
      data: 'invoiceNos',
      title: '发票号',
      width: 200,
      renderer: (
        instance: any,
        td: HTMLTableCellElement,
        row: number,
        col: number,
        prop: string,
        value: any,
        cellProperties: any,
      ) => {
        // value 是数组
        td.innerHTML = Array.isArray(value) ? value.join(', ') : '-';
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
      data: 'totalReceived',
      title: '合计已收(CNY)',
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
      data: 'totalUnReceived',
      title: '合计欠费(CNY)',
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
  ];
}
