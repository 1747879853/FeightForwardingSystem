import type { ReportApi } from '#/api/system/report';

import type { ReportPageConfig } from '../_shared/types';

import { message } from 'ant-design-vue';

import { getProfitReportList } from '#/api/system/report';

import { setPortTypeByBizType } from '../_shared/formatters';
import { textRenderer } from '../_shared/hot-columns';
import { getCommonReportFormFields } from '../_shared/options';

/**
 * 利润报表配置
 * 新增报表时可参考本文件：只需提供接口、表单、列与数据转换差异即可
 */
export const profitReportConfig: ReportPageConfig<ReportApi.ProfitReportDto> = {
  name: '利润报表',
  fetchApi: getProfitReportList,

  // 查询表单：利润报表全部使用公共字段
  formSchema: getCommonReportFormFields(),

  // 查询前：保留原有权限校验行为，并按业务类型设置港口类型
  beforeQuery: (values, ctx) => {
    if (!ctx.hasAccessByCodes(['Admin.Report.Profit.Get'])) {
      message.warning('您没有权限查看利润报表');
      return false;
    }
    return setPortTypeByBizType(values);
  },

  // 基础列（数据已在行转换阶段预格式化，渲染器直接输出）
  baseHotColumns: [
    { data: 'commissionNum', title: '委托编号', width: 150 },
    { data: 'mblNum', title: '主提单号', width: 150 },
    { data: 'bizType', title: '业务类型', width: 100 },
    { data: 'client', title: '委托单位', width: 150 },
    { data: 'carrier', title: '船公司', width: 150 },
    { data: 'sales', title: '销售', width: 120 },
    { data: 'operations', title: '操作', width: 120 },
    { data: 'polRemark', title: '起运港备注', width: 150 },
    { data: 'podRemark', title: '目的港备注', width: 150 },
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
  ],

  // 币别明细列：应收 / 应付 / 利润
  currencyFields: [
    { key: 'receivable', title: (code) => `${code}应收` },
    { key: 'payable', title: (code) => `${code}应付` },
    { key: 'profit', title: (code) => `${code}利润` },
  ],

  // 合计列
  totalHotColumns: [
    {
      data: 'totalReceivable',
      title: '合计应收(CNY)',
      width: 140,
      className: 'htRight',
      renderer: textRenderer(''),
    },
    {
      data: 'totalPayable',
      title: '合计应付(CNY)',
      width: 140,
      className: 'htRight',
      renderer: textRenderer(''),
    },
    {
      data: 'totalProfit',
      title: '合计利润(CNY)',
      width: 140,
      className: 'htRight',
      renderer: textRenderer(''),
    },
    {
      data: 'totalProfitRate',
      title: '利润率(%)',
      width: 120,
      className: 'htRight',
      // 利润率存储为小数，显示时乘以 100
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
          value != null
            ? `${(Number.parseFloat(value) * 100).toFixed(2)}%`
            : '-';
        return td;
      },
    },
  ],

  // 利润报表特有的行字段（合计金额与利润率）
  mapExtraRow: (item) => ({
    totalReceivable: item.totalReceivable?.toFixed(2) || '',
    totalPayable: item.totalPayable?.toFixed(2) || '',
    totalProfit: item.totalProfit?.toFixed(2) || '',
    totalProfitRate: item.totalProfitRate != null ? item.totalProfitRate : null,
  }),

  // 数值列（合计行累加、分组聚合、右对齐）
  numericColumnKeys: [
    'totalReceivable',
    'totalPayable',
    'totalProfit',
    'totalProfitRate',
  ],
};
