import type { ReportApi } from '#/api/system/report';

import type { ReportPageConfig } from '../_shared/types';
import type { VbenFormSchema } from '#/adapter/form';

import { message } from 'ant-design-vue';

import { getArrearsReportList } from '#/api/system/report';

import ClientSelect from '#/adapter/component/biz-select/client-select.vue';

import { setPortTypeByBizType } from '../_shared/formatters';
import { localCurrencyColumn, textRenderer } from '../_shared/hot-columns';
import {
  accountDateRangeFields,
  bizDateRangeFields,
  bizTypeField,
  blTypeField,
  bookingAgentField,
  cargoField,
  carrierField,
  clientField,
  innerVoynoField,
  keywordField,
  mergeChangeOrderField,
  operationUserField,
  podField,
  polField,
  saleUserField,
  settlementTypeField,
  vesselField,
  yardField,
  YES_NO_OPTIONS,
} from '../_shared/options';

// ==================== 欠费报表特有选项 ====================

/** 收付类型选项 */
const PAY_SIDE_OPTIONS = [
  { label: '应收', value: 0 },
  { label: '应付', value: 1 },
];

/** 结算状态选项 */
const SETTLEMENT_STATUS_OPTIONS = [
  { label: '未结算', value: 0 },
  { label: '部分结算', value: 1 },
  { label: '结算完毕', value: 2 },
];

/** 付费申请状态选项 */
const PAYMENT_APPLY_STATUS_OPTIONS = [
  { label: '未提交', value: 0 },
  { label: '提交了部分', value: 1 },
  { label: '已全额提交', value: 2 },
];

/** 开票状态选项 */
const INVOICE_STATUS_OPTIONS = [
  { label: '未开票', value: 0 },
  { label: '部分开票', value: 1 },
  { label: '已开票', value: 2 },
];

// ==================== 欠费报表特有表单字段 ====================

/** 收付类型（默认应收） */
function paySideField(): VbenFormSchema {
  return {
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
  };
}

/** 结算对象 */
function settlementField(): VbenFormSchema {
  return {
    fieldName: 'settlementId',
    label: '结算对象',
    component: ClientSelect,
    componentProps: {
      placeholder: '请选择结算对象',
      style: { width: '100%' },
    },
  };
}

/** 欠费报表特有的尾部筛选字段 */
function getArrearsExtraFields(): VbenFormSchema[] {
  return [
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
        options: YES_NO_OPTIONS,
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
        options: YES_NO_OPTIONS,
        allowClear: true,
        placeholder: '请选择费用锁定',
        style: { width: '100%' },
      },
    },
  ];
}

/**
 * 欠费报表配置
 */
export const arrearsReportConfig: ReportPageConfig<ReportApi.ArrearsReportDto> =
  {
    name: '欠费报表',
    fetchApi: getArrearsReportList,

    // 查询表单：收付类型 + 公共字段（插入结算对象） + 欠费特有筛选字段
    formSchema: [
      paySideField(),
      bizTypeField(),
      clientField(),
      settlementField(),
      keywordField(),
      ...bizDateRangeFields(),
      cargoField(),
      settlementTypeField(),
      mergeChangeOrderField(),
      bookingAgentField(),
      carrierField(),
      saleUserField(),
      operationUserField(),
      yardField(),
      blTypeField(),
      vesselField(),
      innerVoynoField(),
      polField(),
      podField(),
      ...accountDateRangeFields(),
      ...getArrearsExtraFields(),
    ],

    // 查询前：按收付类型做权限校验（保留原有行为），并按业务类型设置港口类型
    beforeQuery: (values, ctx) => {
      const paySide = values.paySide || 0;
      const canViewReceive = ctx.hasAccessByCodes([
        'Admin.Report.Arrears.Receive.Get',
      ]);
      const canViewPay = ctx.hasAccessByCodes(['Admin.Report.Arrears.Pay.Get']);
      if (
        (paySide === 0 && !canViewReceive) ||
        (paySide === 1 && !canViewPay)
      ) {
        message.warning('您没有权限查看该类型的欠费报表');
        return false;
      }
      return setPortTypeByBizType(values);
    },

    // 基础列：公共列 + 欠费特有列（结算对象/应结日期/超期天数/发票号/费用锁定）
    baseHotColumns: [
      { data: 'commissionNum', title: '委托编号', width: 150 },
      { data: 'mblNum', title: '主提单号', width: 150 },
      { data: 'bizType', title: '业务类型', width: 100 },
      { data: 'client', title: '委托单位', width: 150 },
      { data: 'settlement', title: '结算对象', width: 150 },
      { data: 'carrier', title: '船公司', width: 150 },
      { data: 'sales', title: '销售', width: 120 },
      { data: 'operations', title: '操作', width: 120 },
      { data: 'polRemark', title: '起运港', width: 150 },
      { data: 'podRemark', title: '目的港', width: 150 },
      { data: 'vessel', title: '船名', width: 150 },
      { data: 'innerVoyno', title: '航次', width: 120 },
      { data: 'ctns', title: '箱型数量', width: 150, renderer: textRenderer() },
      {
        data: 'bizDate',
        title: '业务日期',
        width: 120,
        renderer: textRenderer(),
      },
      {
        data: 'accountDate',
        title: '会计期间',
        width: 120,
        renderer: textRenderer(),
      },
      {
        data: 'settlementDate',
        title: '应结日期',
        width: 120,
        renderer: textRenderer(),
      },
      {
        data: 'overdueDays',
        title: '超期天数',
        width: 100,
        className: 'htRight',
        // 超期天数显示逻辑：负数表示未到期（绿），0 当天到期（黄），正数超期（红）
        renderer: (
          _instance: any,
          td: HTMLTableCellElement,
          _row: number,
          _col: number,
          _prop: string,
          value: any,
          _cellProperties: any,
        ) => {
          if (value == null || value === '') {
            td.innerHTML = '-';
          } else {
            const days = Number.parseInt(value);
            if (days < 0) {
              td.innerHTML = `-${Math.abs(days)}天`;
              td.style.color = '#52c41a';
            } else if (days === 0) {
              td.innerHTML = '0天';
              td.style.color = '#faad14';
            } else {
              td.innerHTML = `${days}天`;
              td.style.color = '#f5222d';
            }
          }
          return td;
        },
      },
      {
        data: 'invoiceNos',
        title: '发票号',
        width: 150,
        // 发票号数组显示
        renderer: (
          _instance: any,
          td: HTMLTableCellElement,
          _row: number,
          _col: number,
          _prop: string,
          value: any,
          _cellProperties: any,
        ) => {
          td.innerHTML =
            Array.isArray(value) && value.length > 0 ? value.join(', ') : '-';
          return td;
        },
      },
      {
        data: 'feeLocked',
        title: '费用锁定',
        width: 100,
        // 费用锁定显示为是/否
        renderer: (
          _instance: any,
          td: HTMLTableCellElement,
          _row: number,
          _col: number,
          _prop: string,
          value: any,
          _cellProperties: any,
        ) => {
          td.innerHTML = value ? '是' : '否';
          return td;
        },
      },
    ],

    // 币别明细列：应收 / 已收 / 未收（标题按收付类型语义显示）
    currencyFields: [
      { key: 'receivable', title: (code) => `${code}应收/应付` },
      { key: 'received', title: (code) => `${code}已收/已付` },
      { key: 'unReceived', title: (code) => `${code}未收/未付` },
    ],

    // 合计列。金额口径为本行本位币，单位见前置的「本位币」列，不写死币种
    totalHotColumns: [
      localCurrencyColumn(),
      {
        data: 'totalReceivable',
        title: '合计应收/应付',
        width: 160,
        className: 'htRight',
        renderer: textRenderer(''),
      },
      {
        data: 'totalReceived',
        title: '合计已收/已付',
        width: 160,
        className: 'htRight',
        renderer: textRenderer(''),
      },
      {
        data: 'totalUnReceived',
        title: '合计未收/未付',
        width: 160,
        className: 'htRight',
        renderer: textRenderer(''),
      },
    ],

    // 欠费报表特有的行字段（结算对象/锁定/超期/发票号/合计金额）
    mapExtraRow: (item) => ({
      settlement: item.settlement?.name || '-',
      feeLocked: item.feeLocked,
      overdueDays: item.overdueDays,
      invoiceNos: item.invoiceNos || [],
      totalReceivable: item.totalReceivable?.toFixed(2) || '',
      totalReceived: item.totalReceived?.toFixed(2) || '',
      totalUnReceived: item.totalUnReceived?.toFixed(2) || '',
    }),

    // 数值列（合计行累加、分组聚合、右对齐）
    numericColumnKeys: ['totalReceivable', 'totalReceived', 'totalUnReceived'],
  };
