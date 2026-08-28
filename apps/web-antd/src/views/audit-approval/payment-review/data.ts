import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { PaymentReviewAdminApi } from '#/api/audit-approval/payment-review-admin';

import { $t } from '#/locales';
import { getTaskStatusOptions } from '#/views/audit-approval/data';
import { isSpecifiedCurrencyApplication } from '#/views/fee-management/add-fee-modal/data';

import { formatPayAppMblNums } from '#/views/fee-management/payment-application/format-pay-app-mbl-nums';

const t = (key: string) => $t(`auditApproval.paymentReview.${key}`);

/** 列配置持久化 key（与 columnPersist.tableId 对应） */
export const PAYMENT_REVIEW_LIST_TABLE_ID = 'PaymentReviewList';

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
  rows: PaymentReviewAdminApi.PayAppTaskItemDto[],
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
  row: PaymentReviewAdminApi.PayAppTaskItemDto,
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
  return ({ row }: { row: PaymentReviewAdminApi.PayAppTaskItemDto }) => {
    const val = calcRowAppliedTotal(row, currencyId);
    return val == null ? '' : val.toFixed(2);
  };
}

function formatUnSettledAmount(val: number): string {
  return val.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * 结算对象应收未结算展示项（币别 + 原币金额）。
 * 空数组/缺字段兜底为 []；不要与 `currencyGroup` 申请合计混用。
 */
export function formatSettlementReceivableItems(
  groups:
    | PaymentReviewAdminApi.SettlementReceivableGroupDto[]
    | null
    | undefined,
): Array<{
  key: string;
  currencyCode: string;
  amountText: string;
  text: string;
}> {
  return (groups ?? []).flatMap((group, index) => {
    if (group.unSettledAmount == null) return [];
    const amount = Number(group.unSettledAmount);
    if (!Number.isFinite(amount)) return [];
    const code =
      group.currencyCode?.trim() || group.currency?.code?.trim() || '';
    const amountText = formatUnSettledAmount(amount);
    const text = code ? `${code} ${amountText}` : amountText;
    const key = `${group.currencyId ?? (code || index)}`;
    return [{ key, currencyCode: code, amountText, text }];
  });
}

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

/** 将申请合计列组插入到某静态列之后（默认在「结算对象」后） */
function insertAppliedTotalGroup<T extends Record<string, any>>(
  columns: T[],
  afterField: string,
  group: T[],
): T[] {
  const index = columns.findIndex((col) => col.field === afterField);
  const at = index >= 0 ? index + 1 : columns.length;
  return [...columns.slice(0, at), ...group, ...columns.slice(at)];
}

export function usePaymentReviewFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      fieldName: 'TaskStatus',
      label: $t('auditApproval.task.status'),
      componentProps: {
        allowClear: true,
        options: getTaskStatusOptions().map(({ label, value }) => ({
          label,
          value,
        })),
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
    {
      component: 'Select',
      fieldName: 'MyStatus',
      label: t('myStatus'),
      componentProps: {
        allowClear: true,
        options: getTaskStatusOptions().map(({ label, value }) => ({
          label,
          value,
        })),
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
    {
      component: 'TrimInput',
      fieldName: 'Keyword',
      label: $t('seaExport.export.keyword'),
      componentProps: {
        placeholder: $t('seaExport.export.keywordPlaceholder'),
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'ApplicationNo',
      label: t('applicationNo'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'ClientSelect',
      fieldName: 'SettlementId',
      label: t('settlementName'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'RangePicker',
      fieldName: 'SubmitTimeRange',
      label: t('submitTime'),
      formItemClass: 'col-span-2',
      componentProps: {
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'CurrencySelect',
      fieldName: 'CurrencyId',
      label: t('currencyCode'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'UserSelect',
      fieldName: 'CreatorUserId',
      label: t('creatorUserName'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'UserSelect',
      fieldName: 'AuditUserId',
      label: t('auditUserName'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'RangePicker',
      fieldName: 'EndTimeRange',
      label: t('endTime'),
      formItemClass: 'col-span-2',
      componentProps: {
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'RangePicker',
      fieldName: 'AuditTimeRange',
      label: t('auditTime'),
      formItemClass: 'col-span-2',
      componentProps: {
        allowClear: true,
        class: 'w-full',
      },
    },
  ];
}

/** 静态列（不含申请合计组），申请合计组默认插入在「结算对象」之后 */
function buildStaticColumns(): Array<Record<string, any>> {
  return [
    { type: 'checkbox', width: 50, fixed: 'left' },
    {
      field: 'applicationNo',
      title: t('applicationNo'),
      minWidth: 160,
      fixed: 'left',
      // 后端任务列表不支持按 ApplicationNo 排序
      sortable: false,
    },
    {
      field: 'mblNums',
      title: t('mblNum'),
      minWidth: 160,
      showOverflow: true,
      sortable: false,
      formatter: ({ row }: { row: PaymentReviewAdminApi.PayAppTaskItemDto }) =>
        formatPayAppMblNums(row.payAppFeeBySeaExportGroup),
    },
    {
      field: 'settlementName',
      title: t('settlementName'),
      minWidth: 160,
      showOverflow: true,
      sortable: false,
      formatter: ({ row }: { row: PaymentReviewAdminApi.PayAppTaskItemDto }) =>
        row.settlement?.name ?? '',
    },
    {
      field: 'taskStatus',
      title: $t('auditApproval.task.status'),
      minWidth: 100,
      cellRender: {
        name: 'CellTag',
        options: getTaskStatusOptions(),
      },
    },
    {
      field: 'myStatus',
      title: t('myStatus'),
      minWidth: 100,
      // 后端无 MyStatus 排序字段
      sortable: false,
      cellRender: {
        name: 'CellTag',
        options: getTaskStatusOptions(),
      },
    },
    {
      field: 'submitTime',
      title: t('submitTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
      sortable: false,
    },
    {
      field: 'endTime',
      title: t('endTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
      sortable: false,
    },
    {
      field: 'creatorUserName',
      title: t('creatorUserName'),
      minWidth: 100,
      // 按 CreatorUserId 排序（后端不支持昵称字段）
    },
    {
      field: 'auditUserName',
      title: t('auditUserName'),
      minWidth: 100,
      // 按 AuditUserId 排序
    },
    {
      field: 'auditTime',
      title: t('auditTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
    {
      field: 'remark',
      title: t('remark'),
      minWidth: 140,
      showOverflow: true,
    },
  ];
}

const APPLIED_TOTAL_DEFAULT_AFTER_FIELD = 'settlementName';

/** 首次渲染列（申请合计组在默认位置，锚点承载首个币别） */
export function buildColumns(
  rows: PaymentReviewAdminApi.PayAppTaskItemDto[] = [],
): VxeTableGridOptions<PaymentReviewAdminApi.PayAppTaskItemDto>['columns'] {
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
    VxeTableGridOptions<PaymentReviewAdminApi.PayAppTaskItemDto>['columns']
  >;
}

/**
 * 结合运行时列状态重建列：
 * - 静态列与锚点列沿用运行时的显隐、固定、列宽与顺序
 * - 其余币别作为跟随列，显隐跟随锚点、整体紧跟在锚点之后
 */
export function buildColumnsWithRuntime(
  rows: PaymentReviewAdminApi.PayAppTaskItemDto[] = [],
  runtimeColumns: Array<Record<string, any>> = [],
): NonNullable<
  VxeTableGridOptions<PaymentReviewAdminApi.PayAppTaskItemDto>['columns']
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

  const anchorIndex = ordered.findIndex((col) =>
    isAppliedTotalAnchorField(col.field),
  );
  const insertAt = anchorIndex >= 0 ? anchorIndex + 1 : ordered.length;

  return [
    ...ordered.slice(0, insertAt),
    ...followerColumns,
    ...ordered.slice(insertAt),
  ] as NonNullable<
    VxeTableGridOptions<PaymentReviewAdminApi.PayAppTaskItemDto>['columns']
  >;
}
