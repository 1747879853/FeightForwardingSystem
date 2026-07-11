import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';
import { getPaymentApplicationStatusOptions } from '#/constants/application-status';
import { $t } from '#/locales';

const paymentApplicationStatusOptions = () =>
  getPaymentApplicationStatusOptions((key) => $t(key));

/** 「申请合计」锚点列字段：作为列配置中唯一可见/可拖动/可持久化的代理项 */
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

/** 计算某行某币别的申请合计（原币）= 收申请量 + 付申请量 */
function calcRowAppliedTotal(
  row: PaymentApplicationAdminApi.PaymentApplicationDto,
  currencyId: number,
): number | undefined {
  const group = row.currencyGroup?.find((g) => g.id === currencyId);
  if (!group) return undefined;
  return (group.payAmount ?? 0) + (group.receiveAmount ?? 0);
}

/** 按币别平铺生成申请合计列，一列一个币别（单行表头） */
function buildAppliedTotalColumns(currencies: AppliedTotalCurrency[]) {
  const suffix = $t('seaExport.export.paymentApplication.appliedTotal');
  return currencies.map((c) => ({
    field: appliedTotalFieldKey(c.currencyId),
    title: `${c.currencyCode || c.currencyId}${suffix}`,
    minWidth: 120,
    align: 'right' as const,
    sortable: false,
    resizable: false,
    formatter: ({
      row,
    }: {
      row: PaymentApplicationAdminApi.PaymentApplicationDto;
    }) => {
      const val = calcRowAppliedTotal(row, c.currencyId);
      return val == null ? '' : val.toFixed(2);
    },
  }));
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

/** 「申请合计」锚点列在列配置中的状态（显隐 + 整体插入位置） */
export interface AppliedTotalAnchorState {
  visible: boolean;
  /** 锚点块整体紧跟在该 field/type 列之后；undefined 表示使用默认位置 */
  insertAfterField?: string;
}

/** 从当前表格列快照读取「申请合计」锚点状态 */
export function captureAppliedTotalAnchorState(
  fullColumns: Array<{ field?: string; type?: string; visible?: boolean }>,
): AppliedTotalAnchorState | null {
  const anchorIndex = fullColumns.findIndex((c) =>
    isAppliedTotalAnchorField(c?.field),
  );
  if (anchorIndex < 0) return null;

  let insertAfterField: string | undefined;
  for (let i = anchorIndex - 1; i >= 0; i--) {
    const col = fullColumns[i];
    if (
      !isAppliedTotalAnchorField(col?.field) &&
      !isAppliedTotalChildField(col?.field)
    ) {
      insertAfterField = col?.field ?? col?.type;
      break;
    }
  }

  return {
    visible: fullColumns[anchorIndex]!.visible !== false,
    insertAfterField,
  };
}

function resolveColumnIdentity(
  column: Record<string, any>,
): string | undefined {
  return column.field ?? column.type;
}

/** 将锚点块（锚点列 + 各币别列）按保存的状态插入到列配置中 */
export function applyAppliedTotalAnchorState<T extends Record<string, any>>(
  columns: T[],
  state: AppliedTotalAnchorState | null,
): T[] {
  if (!state) return columns;

  const isBlockCol = (col: T) =>
    isAppliedTotalAnchorField(col.field) || isAppliedTotalChildField(col.field);

  const block = columns.filter(isBlockCol).map((col) => ({
    ...col,
    visible: isAppliedTotalAnchorField(col.field)
      ? state.visible
      : state.visible,
  }));
  const rest = columns.filter((col) => !isBlockCol(col));

  if (block.length === 0) return columns;

  let insertIndex = rest.length;
  if (state.insertAfterField) {
    const afterIndex = rest.findIndex(
      (col) => resolveColumnIdentity(col) === state.insertAfterField,
    );
    if (afterIndex >= 0) {
      insertIndex = afterIndex + 1;
    }
  } else {
    const defaultAfter = rest.findIndex(
      (col) => col.field === 'totalReceivePrice',
    );
    if (defaultAfter >= 0) {
      insertIndex = defaultAfter + 1;
    }
  }

  return [...rest.slice(0, insertIndex), ...block, ...rest.slice(insertIndex)];
}

/** 按当前页数据生成列，并可叠加锚点列的显隐/顺序状态 */
export function buildColumns(
  rows: PaymentApplicationAdminApi.PaymentApplicationDto[] = [],
  anchorState: AppliedTotalAnchorState | null = null,
): VxeTableGridOptions<PaymentApplicationAdminApi.PaymentApplicationDto>['columns'] {
  const columns = useColumns(rows) ?? [];
  return applyAppliedTotalAnchorState(columns, anchorState) as NonNullable<
    VxeTableGridOptions<PaymentApplicationAdminApi.PaymentApplicationDto>['columns']
  >;
}

export function useColumns(
  rows: PaymentApplicationAdminApi.PaymentApplicationDto[] = [],
): VxeTableGridOptions<PaymentApplicationAdminApi.PaymentApplicationDto>['columns'] {
  // 按当前页币别平铺生成申请合计列（单行表头，表格中真实渲染，但面板中隐藏）
  const appliedTotalColumns = buildAppliedTotalColumns(
    collectAppliedTotalCurrencies(rows),
  );
  // 「申请合计」锚点代理列：列配置面板中唯一可见项，控制币别列的显隐与整体顺序；
  // 表格中通过 0 宽 + CSS 隐藏其自身单元格，不占用可见空间
  const appliedTotalAnchor = {
    field: APPLIED_TOTAL_ANCHOR_FIELD,
    title: $t('seaExport.export.paymentApplication.appliedTotal'),
    width: 0,
    minWidth: 0,
    resizable: false,
    sortable: false,
    headerClassName: 'applied-total-anchor-col',
    className: 'applied-total-anchor-col',
  };

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
      field: 'status',
      title: $t('seaExport.export.paymentApplication.status'),
      minWidth: 100,
      cellRender: {
        name: 'CellTag',
        options: paymentApplicationStatusOptions(),
      },
    },
    {
      field: 'clientName',
      title: $t('seaExport.export.paymentApplication.clientName'),
      minWidth: 160,
      showOverflow: true,
    },
    {
      field: 'currencyCode',
      title: $t('seaExport.export.paymentApplication.currencyCode'),
      minWidth: 80,
    },
    {
      field: 'totalPayPrice',
      title: $t('seaExport.export.paymentApplication.totalPayPrice'),
      minWidth: 120,
      align: 'right',
    },
    {
      field: 'totalReceivePrice',
      title: $t('seaExport.export.paymentApplication.totalReceivePrice'),
      minWidth: 120,
      align: 'right',
    },
    appliedTotalAnchor,
    ...appliedTotalColumns,
    {
      field: 'creatorUserName',
      title: $t('seaExport.export.paymentApplication.creatorUserName'),
      minWidth: 100,
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
