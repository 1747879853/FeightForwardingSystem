import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';
import { getPaymentApplicationStatusOptions } from '#/constants/application-status';
import { $t } from '#/locales';
import { createKeysSearchSchema } from '#/utils/keys-search';

import { isSpecifiedCurrencyApplication } from '../add-fee-modal/data';
import {
  formatPayAppCommissionNums,
  formatPayAppMblNums,
} from './format-pay-app-mbl-nums';

const paymentApplicationStatusOptions = () =>
  getPaymentApplicationStatusOptions((key) => $t(key));

/** 列配置持久化 key（与 columnPersist.tableId 对应） */
export const PAYMENT_APPLICATION_LIST_TABLE_ID = 'PaymentApplicationList';

/** 「申请合计」锚点列字段：列配置中唯一可见/可持久化的代理项 */
export const APPLIED_TOTAL_ANCHOR_FIELD = 'appliedTotal';
/** 各币别申请合计列字段前缀（表格中真实渲染，但在列配置面板中隐藏） */
const APPLIED_TOTAL_FIELD_PREFIX = 'appliedTotal_';

function appliedTotalFieldKey(currencyId: number): string {
  return `${APPLIED_TOTAL_FIELD_PREFIX}${currencyId}`;
}

/** 是否为币别申请合计列（面板隐藏、显隐与顺序跟随锚点列） */
export function isAppliedTotalChildField(
  field: string | undefined | null,
): boolean {
  return !!field && field.startsWith(APPLIED_TOTAL_FIELD_PREFIX);
}

/** 是否为「申请合计」锚点代理列 */
export function isAppliedTotalAnchorField(
  field: string | undefined | null,
): boolean {
  return field === APPLIED_TOTAL_ANCHOR_FIELD;
}

interface AppliedTotalCurrency {
  currencyId: number;
  currencyCode: string;
}

/** 从当前页数据收集出现的币别（按 currencyId 升序去重） */
function collectAppliedTotalCurrencies(
  rows: PaymentApplicationAdminApi.PaymentApplicationDto[],
): AppliedTotalCurrency[] {
  const map = new Map<number, AppliedTotalCurrency>();
  for (const row of rows) {
    for (const group of row.currencyGroup ?? []) {
      if (group.id != null && !map.has(group.id)) {
        map.set(group.id, {
          currencyId: group.id,
          currencyCode: group.code ?? '',
        });
      }
    }
  }
  return [...map.values()].sort((a, b) => a.currencyId - b.currencyId);
}

/**
 * 计算某行某币别的申请合计（后端已算好，前端只做付 − 收）：
 * - 原币：`currencyGroup` 对应币别 `payAmount − receiveAmount`
 * - 固定币别：仅结算币别列填 `totalPayPrice − totalReceivePrice`，其它币别列留空；
 *   两侧总额都空也留空
 */
function calcRowAppliedTotal(
  row: PaymentApplicationAdminApi.PaymentApplicationDto,
  currencyId: number,
): number | undefined {
  if (isSpecifiedCurrencyApplication(row.currencyId)) {
    if (Number(row.currencyId) !== Number(currencyId)) {
      return undefined;
    }
    const pay = row.totalPayPrice;
    const receive = row.totalReceivePrice;
    if (pay == null && receive == null) {
      return undefined;
    }
    return (pay ?? 0) - (receive ?? 0);
  }
  const group = row.currencyGroup?.find((g) => g.id === currencyId);
  if (!group) return undefined;
  return (group.payAmount ?? 0) - (group.receiveAmount ?? 0);
}

/** 申请合计列（锚点列与币别跟随列）的公共属性 */
function appliedTotalColumnBase() {
  return {
    minWidth: 120,
    align: 'right' as const,
    sortable: false,
    showHeaderOverflow: 'title' as const,
    headerClassName: 'applied-total-currency-col',
    className: 'applied-total-currency-col',
  };
}

function appliedTotalFormatter(currencyId: number) {
  return ({
    row,
  }: {
    row: PaymentApplicationAdminApi.PaymentApplicationDto;
  }) => {
    const val = calcRowAppliedTotal(row, currencyId);
    return val == null ? '' : val.toFixed(2);
  };
}

/**
 * 「申请合计」锚点列：一个真实可见列，承载「首个币别」的申请合计。
 * - 列配置面板显示为「申请合计」（title），是控制整组显隐/顺序的唯一开关，字段稳定可持久化
 * - 表头通过插槽显示「{首个币别}申请合计」（params.anchorHeader）
 */
function buildAppliedTotalAnchorColumn(
  currencies: AppliedTotalCurrency[],
  visible: boolean,
) {
  const suffix = $t('seaExport.export.paymentApplication.appliedTotal');
  const first = currencies[0];
  const headerLabel = first
    ? `${first.currencyCode || first.currencyId}${suffix}`
    : suffix;
  return {
    ...appliedTotalColumnBase(),
    field: APPLIED_TOTAL_ANCHOR_FIELD,
    title: suffix,
    visible,
    params: { anchorHeader: headerLabel },
    slots: { header: 'appliedTotalAnchorHeader' },
    formatter: first ? appliedTotalFormatter(first.currencyId) : () => '',
  };
}

/** 其余币别的申请合计跟随列（显隐/顺序跟随锚点列，列配置面板中隐藏） */
function buildAppliedTotalFollowerColumns(
  currencies: AppliedTotalCurrency[],
  visible: boolean,
) {
  const suffix = $t('seaExport.export.paymentApplication.appliedTotal');
  return currencies.slice(1).map((c) => ({
    ...appliedTotalColumnBase(),
    field: appliedTotalFieldKey(c.currencyId),
    title: `${c.currencyCode || c.currencyId}${suffix}`,
    visible,
    formatter: appliedTotalFormatter(c.currencyId),
  }));
}

/** 将申请合计列组插入到某静态列之后（默认在「开票日期」后） */
function insertAppliedTotalGroup<T extends Record<string, any>>(
  columns: T[],
  afterField: string,
  group: T[],
): T[] {
  const index = columns.findIndex((col) => col.field === afterField);
  const at = index >= 0 ? index + 1 : columns.length;
  return [...columns.slice(0, at), ...group, ...columns.slice(at)];
}

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'Keyword',
      label: $t('seaExport.export.number'),
      componentProps: {
        placeholder: $t(
          'seaExport.export.paymentApplication.keywordPlaceholder',
        ),
        allowClear: true,
      },
    },
    createKeysSearchSchema({
      help: '精确匹配（非模糊）：主提单号、订舱编号、委托编号',
    }),
    {
      component: 'Input',
      fieldName: 'ApplicationNo',
      label: $t('seaExport.export.paymentApplication.applicationNo'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'Select',
      fieldName: 'Status',
      label: $t('seaExport.export.paymentApplication.status'),
      componentProps: {
        allowClear: true,
        options: paymentApplicationStatusOptions().map(({ label, value }) => ({
          label,
          value,
        })),
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
    {
      component: 'ClientSelect',
      fieldName: 'SettlementId',
      label: $t('seaExport.export.paymentApplication.clientName'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'CurrencySelect',
      fieldName: 'CurrencyId',
      label: $t('seaExport.export.paymentApplication.currencyCode'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'Select',
      fieldName: 'InvoiceProcess',
      label: '发票流程',
      componentProps: {
        allowClear: true,
        options: [
          { label: '先票后付', value: 0 },
          { label: '先付后票', value: 1 },
          { label: '不开票', value: 2 },
        ],
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
    {
      component: 'Input',
      fieldName: 'InvoiceNo',
      label: '发票号',
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'RangePicker',
      fieldName: 'InvoiceDateRange',
      label: '开票日期',
      componentProps: {
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'RangePicker',
      fieldName: 'SubmitTimeRange',
      label: $t('seaExport.export.paymentApplication.submitTime'),
      componentProps: {
        placeholder: [
          $t('seaExport.export.paymentApplication.submitTimeStart'),
          $t('seaExport.export.paymentApplication.submitTimeEnd'),
        ],
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'RangePicker',
      fieldName: 'EndTimeRange',
      label: $t('seaExport.export.paymentApplication.endTime'),
      componentProps: {
        placeholder: [
          $t('seaExport.export.paymentApplication.endTimeStart'),
          $t('seaExport.export.paymentApplication.endTimeEnd'),
        ],
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'UserSelect',
      fieldName: 'CreatorUserId',
      label: $t('seaExport.export.paymentApplication.creatorUserName'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
        class: 'w-full',
      },
    },
  ];
}

/** 静态列（不含申请合计组），申请合计组默认插入在「开票日期」之后 */
function buildStaticColumns(): Array<Record<string, any>> {
  return [
    { type: 'checkbox', width: 50, fixed: 'left' },
    { type: 'seq', width: 50, fixed: 'left' },
    {
      field: 'applicationNo',
      title: $t('seaExport.export.paymentApplication.applicationNo'),
      minWidth: 160,
      fixed: 'left',
    },
    {
      field: 'mblNums',
      title: '主提单号',
      minWidth: 160,
      showOverflow: true,
      sortable: false,
      formatter: ({
        row,
      }: {
        row: PaymentApplicationAdminApi.PaymentApplicationDto;
      }) => formatPayAppMblNums(row.payAppFeeBySeaExportGroup),
    },
    {
      field: 'commissionNums',
      title: '委托编号',
      minWidth: 160,
      showOverflow: true,
      sortable: false,
      formatter: ({
        row,
      }: {
        row: PaymentApplicationAdminApi.PaymentApplicationDto;
      }) => formatPayAppCommissionNums(row.payAppFeeBySeaExportGroup),
    },
    {
      field: 'status',
      title: $t('seaExport.export.paymentApplication.status'),
      minWidth: 100,
      slots: { default: 'status' },
    },
    {
      field: 'settlement.name',
      title: $t('seaExport.export.paymentApplication.clientName'),
      minWidth: 160,
      showOverflow: true,
      // 后端按 Settlement.Name 排序（见 PaymentApplication 排序对接文档）
      sortField: 'Settlement.Name',
      formatter: ({
        row,
      }: {
        row: PaymentApplicationAdminApi.PaymentApplicationDto;
      }) => row.settlement?.name ?? '',
    },
    {
      field: 'invoiceProcess',
      title: '发票流程',
      minWidth: 110,
      slots: { default: 'invoiceProcess' },
    },
    {
      field: 'invoiceNo',
      title: '发票号',
      minWidth: 160,
      showOverflow: true,
      sortable: false,
      slots: { default: 'invoiceNo' },
    },
    {
      field: 'invoiceDate',
      title: '开票日期',
      minWidth: 140,
      showOverflow: true,
      sortable: false,
      slots: { default: 'invoiceDate' },
    },
    {
      field: 'creatorUserName',
      title: $t('seaExport.export.paymentApplication.creatorUserName'),
      minWidth: 100,
      // 昵称为后填 DTO 字段；实体仅 CreatorUserId，按姓名排序会报错
      sortable: false,
    },
    {
      field: 'require',
      title: $t('seaExport.export.paymentApplication.require'),
      minWidth: 140,
      showOverflow: true,
    },
    {
      field: 'remark',
      title: $t('seaExport.export.paymentApplication.remark'),
      minWidth: 140,
      showOverflow: true,
    },
    {
      field: 'submitTime',
      title: $t('seaExport.export.paymentApplication.submitTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
    {
      field: 'endTime',
      title: $t('seaExport.export.paymentApplication.endTime'),
      minWidth: 160,
      formatter: 'formatDate',
    },
    {
      field: 'creationTime',
      title: $t('seaExport.export.paymentApplication.creationTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
  ];
}

const APPLIED_TOTAL_DEFAULT_AFTER_FIELD = 'invoiceDate';

/** 首次渲染列（申请合计组在默认位置，锚点承载首个币别） */
export function buildColumns(
  rows: PaymentApplicationAdminApi.PaymentApplicationDto[] = [],
): VxeTableGridOptions<PaymentApplicationAdminApi.PaymentApplicationDto>['columns'] {
  const currencies = collectAppliedTotalCurrencies(rows);
  const group = [
    buildAppliedTotalAnchorColumn(currencies, true),
    ...buildAppliedTotalFollowerColumns(currencies, true),
  ];
  return insertAppliedTotalGroup(
    buildStaticColumns(),
    APPLIED_TOTAL_DEFAULT_AFTER_FIELD,
    group,
  ) as NonNullable<
    VxeTableGridOptions<PaymentApplicationAdminApi.PaymentApplicationDto>['columns']
  >;
}

/**
 * 结合运行时列状态重建列，作为「申请合计」显隐/顺序的唯一数据源：
 * - 静态列与锚点列沿用运行时的显隐、固定、列宽与顺序（保留用户在列配置里的调整与持久化结果，避免翻页/配置后被重置）
 * - 锚点列是真实列（可拖动、可调宽、可显隐，走 vxe 原生），承载首个币别
 * - 其余币别作为跟随列，显隐跟随锚点、整体紧跟在锚点之后
 */
export function buildColumnsWithRuntime(
  rows: PaymentApplicationAdminApi.PaymentApplicationDto[] = [],
  runtimeColumns: Array<Record<string, any>> = [],
): NonNullable<
  VxeTableGridOptions<PaymentApplicationAdminApi.PaymentApplicationDto>['columns']
> {
  const currencies = collectAppliedTotalCurrencies(rows);
  const rtList = Array.isArray(runtimeColumns) ? runtimeColumns : [];

  const rtByKey = new Map<
    string,
    { col: Record<string, any>; order: number }
  >();
  rtList.forEach((col, index) => {
    const key = col?.field ?? col?.type;
    if (key != null && !rtByKey.has(String(key))) {
      rtByKey.set(String(key), { col, order: index });
    }
  });

  const anchorRt = rtByKey.get(APPLIED_TOTAL_ANCHOR_FIELD);
  const anchorVisible = anchorRt ? anchorRt.col.visible !== false : true;

  const anchorColumn = buildAppliedTotalAnchorColumn(currencies, anchorVisible);
  const followerColumns = buildAppliedTotalFollowerColumns(
    currencies,
    anchorVisible,
  );

  // 可排序列 = 静态列 + 锚点列（默认位置），按运行时顺序与显隐合并
  const orderables = insertAppliedTotalGroup(
    buildStaticColumns(),
    APPLIED_TOTAL_DEFAULT_AFTER_FIELD,
    [anchorColumn],
  );

  const merged = orderables.map((col, index) => {
    const key = col.field ?? col.type;
    const rt = key == null ? undefined : rtByKey.get(String(key));
    const nextCol: Record<string, any> = { ...col };
    let order = index;
    if (rt) {
      order = rt.order;
      // 锚点列显隐已在 buildAppliedTotalAnchorColumn 里处理，其余列沿用运行时显隐
      if (!isAppliedTotalAnchorField(col.field)) {
        nextCol.visible = rt.col.visible !== false;
      }
      const fixed = rt.col.fixed;
      if (fixed === 'left' || fixed === 'right') {
        nextCol.fixed = fixed;
      }
      const resizeWidth = Number(rt.col.resizeWidth);
      if (Number.isFinite(resizeWidth) && resizeWidth > 0) {
        nextCol.width = resizeWidth;
      }
    }
    return { col: nextCol, order, index };
  });

  merged.sort((a, b) => a.order - b.order || a.index - b.index);
  const ordered = merged.map((item) => item.col);

  // 跟随列整体紧跟在锚点列之后
  const anchorIndex = ordered.findIndex((col) =>
    isAppliedTotalAnchorField(col.field),
  );
  const insertAt = anchorIndex >= 0 ? anchorIndex + 1 : ordered.length;

  return [
    ...ordered.slice(0, insertAt),
    ...followerColumns,
    ...ordered.slice(insertAt),
  ] as NonNullable<
    VxeTableGridOptions<PaymentApplicationAdminApi.PaymentApplicationDto>['columns']
  >;
}
