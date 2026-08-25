import type { ReportApi } from '#/api/system/report';

import type { VbenFormSchema } from '#/adapter/form';
import ClientSelect from '#/adapter/component/biz-select/client-select.vue';
import CarrierSelect from '#/adapter/component/biz-select/carrier-select.vue';
import UserSelect from '#/adapter/component/biz-select/user-select.vue';
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
 * 收付类型选项
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
  { label: '部分结算', value: 1 },
  { label: '结算完毕', value: 2 },
];

/**
 * 付费申请状态选项
 */
export const PAYMENT_APPLY_STATUS_OPTIONS = [
  { label: '未提交', value: 0 },
  { label: '提交了部分', value: 1 },
  { label: '已全额提交', value: 2 },
];

/**
 * 开票状态选项
 */
export const INVOICE_STATUS_OPTIONS = [
  { label: '未开票', value: 0 },
  { label: '部分开票', value: 1 },
  { label: '已开票', value: 2 },
];

/**
 * 查询表单配置
 */
export function useArrearsReportFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'paySide',
      label: '收付类型',
      component: 'Select',
      defaultValue: 0,
      componentProps: {
        options: PAY_SIDE_OPTIONS,
        allowClear: false,
        placeholder: '请选择收付类型',
        style: { width: '100%' },
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
      fieldName: 'settlementId',
      label: '结算对象',
      component: ClientSelect,
      componentProps: {
        placeholder: '请选择结算对象',
        style: { width: '100%' },
      },
    },
    {
      fieldName: 'keyword',
      label: '关键词',
      component: 'Input',
      componentProps: {
        placeholder: '主提单号或委托编号',
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
      fieldName: 'isMergeChangeOrder',
      label: '合并更改单',
      component: 'Switch',
      defaultValue: false,
      componentProps: {
        checkedChildren: '是',
        unCheckedChildren: '否',
      },
    },
    {
      fieldName: 'bookingAgentId',
      label: '订舱代理',
      component: ClientSelect,
      componentProps: {
        placeholder: '请选择订舱代理',
        style: { width: '100%' },
      },
    },
    {
      fieldName: 'carrierId',
      label: '船公司',
      component: CarrierSelect,
      componentProps: {
        placeholder: '请选择船公司',
        style: { width: '100%' },
      },
    },
    {
      fieldName: 'saleUserIds',
      label: '销售',
      component: UserSelect,
      componentProps: {
        mode: 'multiple',
        placeholder: '请选择销售',
        style: { width: '100%' },
      },
    },
    {
      fieldName: 'operationUserIds',
      label: '操作',
      component: UserSelect,
      componentProps: {
        mode: 'multiple',
        placeholder: '请选择操作',
        style: { width: '100%' },
      },
    },
    {
      fieldName: 'yardId',
      label: '场站',
      component: ClientSelect,
      componentProps: {
        placeholder: '请选择场站',
        style: { width: '100%' },
      },
    },
    {
      fieldName: 'blType',
      label: '装运方式',
      component: 'Select',
      componentProps: {
        options: BL_TYPE_OPTIONS,
        allowClear: true,
        placeholder: '请选择装运方式',
        style: { width: '100%' },
      },
    },
    {
      fieldName: 'vessel',
      label: '船名',
      component: 'Input',
      componentProps: {
        placeholder: '请输入船名',
        allowClear: true,
        style: { width: '100%' },
      },
    },
    {
      fieldName: 'innerVoyno',
      label: '航次',
      component: 'Input',
      componentProps: {
        placeholder: '请输入航次',
        allowClear: true,
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
    {
      fieldName: 'accountDateStart',
      label: '会计期间起',
      component: 'DatePicker',
      componentProps: {
        picker: 'month',
        placeholder: '请选择开始月份',
        format: 'YYYY-MM',
        valueFormat: 'YYYY-MM',
        style: { width: '100%' },
      },
    },
    {
      fieldName: 'accountDateEnd',
      label: '会计期间止',
      component: 'DatePicker',
      componentProps: {
        picker: 'month',
        placeholder: '请选择结束月份',
        format: 'YYYY-MM',
        valueFormat: 'YYYY-MM',
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
      fieldName: 'paymentApplyStatus',
      label: '付费申请状态',
      component: 'Select',
      componentProps: {
        options: PAYMENT_APPLY_STATUS_OPTIONS,
        allowClear: true,
        placeholder: '请选择付费申请状态',
        style: { width: '100%' },
      },
    },
    {
      fieldName: 'invoiceStatus',
      label: '开票状态',
      component: 'Select',
      componentProps: {
        options: INVOICE_STATUS_OPTIONS,
        allowClear: true,
        placeholder: '请选择开票状态',
        style: { width: '100%' },
      },
    },
    {
      fieldName: 'isStatemented',
      label: '是否对账',
      component: 'Select',
      componentProps: {
        options: [
          { label: '是', value: true },
          { label: '否', value: false },
        ],
        allowClear: true,
        placeholder: '请选择是否对账',
        style: { width: '100%' },
      },
    },
    {
      fieldName: 'feeLocked',
      label: '费用锁定',
      component: 'Select',
      componentProps: {
        options: [
          { label: '是', value: true },
          { label: '否', value: false },
        ],
        allowClear: true,
        placeholder: '请选择费用锁定',
        style: { width: '100%' },
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
 * 获取 Handsontable 列配置（基础列）
 */
export function getBaseHotColumns() {
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
      data: 'carrier',
      title: '船公司',
      width: 150,
    },
    {
      data: 'sales',
      title: '销售',
      width: 120,
    },
    {
      data: 'operations',
      title: '操作',
      width: 120,
    },
    {
      data: 'polRemark',
      title: '起运港备注',
      width: 150,
    },
    {
      data: 'podRemark',
      title: '目的港备注',
      width: 150,
    },
    {
      data: 'vessel',
      title: '船名',
      width: 150,
    },
    {
      data: 'innerVoyno',
      title: '航次',
      width: 120,
    },
    {
      data: 'ctns',
      title: '箱型数量',
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
        // 数据已在 transformDataForHotTable 中预格式化，直接显示
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
        // 日期已在 transformDataForHotTable 中预格式化，直接显示
        td.innerHTML = value || '-';
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
        // 日期已在 transformDataForHotTable 中预格式化，直接显示
        td.innerHTML = value || '-';
        return td;
      },
    },
    {
      data: 'settlementDate',
      title: '应结日期',
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
        // 日期已在 transformDataForHotTable 中预格式化，直接显示
        td.innerHTML = value || '-';
        return td;
      },
    },
    {
      data: 'overdueDays',
      title: '超期天数',
      width: 100,
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
        // 超期天数显示逻辑：负数表示未到期，正数表示超期
        if (value == null || value === '') {
          td.innerHTML = '-';
        } else {
          const days = parseInt(value);
          if (days < 0) {
            td.innerHTML = `-${Math.abs(days)}天`;
            td.style.color = '#52c41a'; // 绿色表示未到期
          } else if (days === 0) {
            td.innerHTML = '0天';
            td.style.color = '#faad14'; // 黄色表示当天到期
          } else {
            td.innerHTML = `${days}天`;
            td.style.color = '#f5222d'; // 红色表示超期
          }
        }
        return td;
      },
    },
    {
      data: 'invoiceNos',
      title: '发票号',
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
        // 发票号数组显示
        if (Array.isArray(value) && value.length > 0) {
          td.innerHTML = value.join(', ');
        } else {
          td.innerHTML = '-';
        }
        return td;
      },
    },
    {
      data: 'feeLocked',
      title: '费用锁定',
      width: 100,
      renderer: (
        instance: any,
        td: HTMLTableCellElement,
        row: number,
        col: number,
        prop: string,
        value: any,
        cellProperties: any,
      ) => {
        // 费用锁定显示为是/否
        td.innerHTML = value ? '是' : '否';
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
      title: `${code}应收/应付`,
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
        // 数据已在 transformDataForHotTable 中预格式化，直接显示
        td.innerHTML = value || '';
        return td;
      },
    });

    currencyColumns.push({
      data: `${code}_received`,
      title: `${code}已收/已付`,
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
        // 数据已在 transformDataForHotTable 中预格式化，直接显示
        td.innerHTML = value || '';
        return td;
      },
    });

    currencyColumns.push({
      data: `${code}_unReceived`,
      title: `${code}未收/未付`,
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
        // 数据已在 transformDataForHotTable 中预格式化，直接显示
        td.innerHTML = value || '';
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
      title: '合计应收/应付(CNY)',
      width: 160,
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
        // 数据已在 transformDataForHotTable 中预格式化，直接显示
        td.innerHTML = value || '';
        return td;
      },
    },
    {
      data: 'totalReceived',
      title: '合计已收/已付(CNY)',
      width: 160,
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
        // 数据已在 transformDataForHotTable 中预格式化，直接显示
        td.innerHTML = value || '';
        return td;
      },
    },
    {
      data: 'totalUnReceived',
      title: '合计未收/未付(CNY)',
      width: 160,
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
        // 数据已在 transformDataForHotTable 中预格式化，直接显示
        td.innerHTML = value || '';
        return td;
      },
    },
  ];
}
