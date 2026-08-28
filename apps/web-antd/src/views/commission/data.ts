import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';

import { h } from 'vue';

import { CommissionOrderAdminApi } from '#/api/commission/commission-order-admin';
import { $t } from '#/locales';

import type { TableColumnsType } from 'ant-design-vue';
import { Tag, Tooltip } from 'ant-design-vue';

/**
 * 提成单模块共享工具：
 * 枚举选项、状态/金额/月份格式化、列表搜索表单 schema 与列定义。
 */

// ==================== 枚举选项 ====================

export const getStatusOptions = () => [
  {
    value: CommissionOrderAdminApi.CommissionOrderStatus.Draft,
    label: $t('commissionOrder.status.draft'),
    color: 'default',
  },
  {
    value: CommissionOrderAdminApi.CommissionOrderStatus.Submitted,
    label: $t('commissionOrder.status.submitted'),
    color: 'processing',
  },
  {
    value: CommissionOrderAdminApi.CommissionOrderStatus.Rejected,
    label: $t('commissionOrder.status.rejected'),
    color: 'error',
  },
  {
    value: CommissionOrderAdminApi.CommissionOrderStatus.Approved,
    label: $t('commissionOrder.status.approved'),
    color: 'success',
  },
  {
    value: CommissionOrderAdminApi.CommissionOrderStatus.Granted,
    label: $t('commissionOrder.status.granted'),
    color: 'purple',
  },
];

export const getStatusLabel = (
  status: CommissionOrderAdminApi.CommissionOrderStatus,
) =>
  getStatusOptions().find((o) => o.value === status)?.label ?? String(status);

export const getProfitTypeOptions = () => [
  {
    value: CommissionOrderAdminApi.CommissionItemProfitType.Qualified,
    label: $t('commissionOrder.profitType.qualified'),
    color: 'success',
  },
  {
    value: CommissionOrderAdminApi.CommissionItemProfitType.BelowThreshold,
    label: $t('commissionOrder.profitType.belowThreshold'),
    color: 'default',
  },
  {
    value: CommissionOrderAdminApi.CommissionItemProfitType.NegativeProfit,
    label: $t('commissionOrder.profitType.negative'),
    color: 'error',
  },
];

export const getProfitTypeLabel = (value?: number | null): string => {
  if (value == null) return '-';
  return (
    getProfitTypeOptions().find((o) => o.value === value)?.label ??
    String(value)
  );
};

const BIZ_TYPE_LABELS: Record<number, string> = {
  [CommissionOrderAdminApi.BizType.SeaExport]: $t(
    'commissionOrder.bizType.seaExport',
  ),
  [CommissionOrderAdminApi.BizType.SeaImport]: $t(
    'commissionOrder.bizType.seaImport',
  ),
  [CommissionOrderAdminApi.BizType.AirExport]: $t(
    'commissionOrder.bizType.airExport',
  ),
};

export const getBizTypeLabel = (value?: number | null): string => {
  if (value == null) return '-';
  return BIZ_TYPE_LABELS[value] ?? String(value);
};

export const getBaseSalaryModeLabel = (mode?: number | null): string | null => {
  if (mode == null) return null;
  return mode === CommissionOrderAdminApi.BaseSalaryMode.MaxOfBoth
    ? $t('commissionOrder.calc.baseSalaryModeMaxOfBoth')
    : $t('commissionOrder.calc.baseSalaryModeDirectAdd');
};

// ==================== 格式化 ====================

const amountFormatter = new Intl.NumberFormat('zh-CN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 金额文案：千分位两位小数，空值显示 `-` */
export const formatAmount = (value?: number | null): string => {
  if (value == null) return '-';
  return amountFormatter.format(value);
};

/** 月份文案：`2026-08-27T22:38:03` → `2026-08` */
export const formatMonth = (value?: null | string): string => {
  if (!value) return '-';
  const text = String(value);
  return text.length >= 7 ? text.slice(0, 7) : text;
};

/** 日期时间文案：`2026-08-27 22:38:03`，空值显示 `-` */
export const formatDateTimeText = (value?: null | string): string => {
  if (!value) return '-';
  return String(value).replace('T', ' ').slice(0, 19);
};

/** 票类型文案：原票 / 更改单 */
export const getTicketTypeLabel = (
  ticket: CommissionOrderAdminApi.CommissionTicketDto,
): string =>
  ticket.isOriginal
    ? $t('commissionOrder.ticket.original')
    : $t('commissionOrder.ticket.changeOrder');

/**
 * 票行唯一键：同一主单可能同时存在原票与更改单（transportOrderId 相同），
 * 需用更改单id或主单id+原票标记组合成唯一键
 */
export const ticketRowKey = (
  ticket: CommissionOrderAdminApi.CommissionTicketDto,
): string => ticket.changeOrderId ?? `${ticket.transportOrderId}:original`;

/** 原币明细文案：`USD 应收100.00 应付80.00 利润20.00(汇率7.1)` */
export const formatCurrencies = (
  currencies?: CommissionOrderAdminApi.CommissionCurrencyDto[] | null,
): string => {
  if (!currencies || currencies.length === 0) return '-';
  return currencies
    .map((c) => {
      const code = c.currency?.code ?? String(c.currencyId);
      return `${code} ${$t('commissionOrder.ticket.totalReceivable')}${formatAmount(c.receivable)} ${$t('commissionOrder.ticket.totalPayable')}${formatAmount(c.payable)} ${$t('commissionOrder.ticket.profit')}${formatAmount(c.profit)}(${formatAmount(c.exchangeRate)})`;
    })
    .join('；');
};

// ==================== 列表搜索表单 ====================

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'keyword',
      label: $t('commissionOrder.search.keyword'),
      componentProps: {
        allowClear: true,
        placeholder: $t('commissionOrder.search.keywordPlaceholder'),
      },
    },
    {
      component: 'UserSelect',
      fieldName: 'userId',
      label: $t('commissionOrder.search.user'),
      componentProps: {
        allowClear: true,
        placeholder: $t('ui.placeholder.select'),
      },
    },
    {
      component: 'Select',
      fieldName: 'status',
      label: $t('commissionOrder.search.status'),
      componentProps: {
        allowClear: true,
        options: getStatusOptions(),
        placeholder: $t('ui.placeholder.select'),
      },
    },
    {
      component: 'RangePicker',
      fieldName: 'accountDateRange',
      label: $t('commissionOrder.search.accountDateRange'),
      formItemClass: 'col-span-2',
      componentProps: {
        allowClear: true,
        class: 'w-full',
        picker: 'month',
        placeholder: [
          $t('commissionOrder.search.accountDateStart'),
          $t('commissionOrder.search.accountDateEnd'),
        ],
      },
    },
  ];
}

// ==================== 列表列定义 ====================

/**
 * 提成单列表列定义（无操作列：详情由行双击打开，其余操作在表格上方工具栏）
 */
export function useListColumns(): VxeTableGridOptions<CommissionOrderAdminApi.CommissionOrderDto>['columns'] {
  return [
    { type: 'checkbox', width: 50, fixed: 'left' },
    {
      field: 'commissionOrderNum',
      title: $t('commissionOrder.columns.orderNum'),
      minWidth: 170,
      fixed: 'left',
    },
    {
      field: 'accountDate',
      title: $t('commissionOrder.columns.accountDate'),
      minWidth: 100,
      formatter: ({ cellValue }) => formatMonth(cellValue),
    },
    {
      field: 'user',
      title: $t('commissionOrder.columns.user'),
      minWidth: 100,
      formatter: ({ cellValue }) => cellValue?.nickName ?? '',
    },
    {
      field: 'status',
      title: $t('commissionOrder.columns.status'),
      minWidth: 110,
      cellRender: { name: 'CellTag', options: getStatusOptions() },
    },
    {
      field: 'commissionAmount',
      title: $t('commissionOrder.columns.commissionAmount'),
      minWidth: 110,
      align: 'right',
      formatter: ({ cellValue }) => formatAmount(cellValue),
    },
    {
      field: 'baseSalary',
      title: $t('commissionOrder.columns.baseSalary'),
      minWidth: 100,
      align: 'right',
      formatter: ({ cellValue }) => formatAmount(cellValue),
    },
    {
      field: 'finalAmount',
      title: $t('commissionOrder.columns.finalAmount'),
      minWidth: 110,
      align: 'right',
      formatter: ({ cellValue }) => formatAmount(cellValue),
    },
    {
      field: 'commissionConfigName',
      title: $t('commissionOrder.columns.configName'),
      minWidth: 150,
      showOverflow: true,
    },
    {
      field: 'itemCount',
      title: $t('commissionOrder.columns.itemCount'),
      minWidth: 80,
      align: 'right',
    },
    {
      field: 'remark',
      title: $t('commissionOrder.columns.remark'),
      minWidth: 140,
      showOverflow: true,
    },
    {
      field: 'submitUserName',
      title: $t('commissionOrder.columns.submitUser'),
      minWidth: 100,
    },
    {
      field: 'auditUserName',
      title: $t('commissionOrder.columns.auditUser'),
      minWidth: 100,
    },
    {
      field: 'grantUserName',
      title: $t('commissionOrder.columns.grantUser'),
      minWidth: 100,
    },
    {
      field: 'grantAmount',
      title: $t('commissionOrder.columns.grantAmount'),
      minWidth: 110,
      align: 'right',
      formatter: ({ cellValue }) => formatAmount(cellValue),
    },
    {
      field: 'creationTime',
      title: $t('commissionOrder.columns.creationTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
  ];
}

// ==================== 弹窗内表格列（票 / 计算步骤） ====================

const STEP_TYPE_LABELS: Record<number, string> = {
  [CommissionOrderAdminApi.CommissionStepType.ProfitSummary]: $t(
    'commissionOrder.calc.stepTypeProfitSummary',
  ),
  [CommissionOrderAdminApi.CommissionStepType.FixedRate]: $t(
    'commissionOrder.calc.stepTypeFixedRate',
  ),
  [CommissionOrderAdminApi.CommissionStepType.Ladder]: $t(
    'commissionOrder.calc.stepTypeLadder',
  ),
  [CommissionOrderAdminApi.CommissionStepType.NegativeDeduction]: $t(
    'commissionOrder.calc.stepTypeNegativeDeduction',
  ),
  [CommissionOrderAdminApi.CommissionStepType.RuleHit]: $t(
    'commissionOrder.calc.stepTypeRuleHit',
  ),
  [CommissionOrderAdminApi.CommissionStepType.BaseSalary]: $t(
    'commissionOrder.calc.stepTypeBaseSalary',
  ),
  [CommissionOrderAdminApi.CommissionStepType.Total]: $t(
    'commissionOrder.calc.stepTypeTotal',
  ),
};

export const getStepTypeLabel = (stepType?: number | null): string => {
  if (stepType == null) return '-';
  return STEP_TYPE_LABELS[stepType] ?? String(stepType);
};

/** 金额单元格：右对齐，负数红色 */
const amountCell = (text: unknown) =>
  h(
    'span',
    {
      class: typeof text === 'number' && text < 0 ? 'text-red-500' : undefined,
    },
    formatAmount(text as number | null | undefined),
  );

const ticketTitle = (key: string) => $t(`commissionOrder.ticket.${key}`);

type TicketColumns =
  TableColumnsType<CommissionOrderAdminApi.CommissionTicketDto>;

const ticketBaseColumns = (options: {
  showUnsettled: boolean;
}): TicketColumns => {
  const columns: TicketColumns = [
    {
      title: ticketTitle('commissionNum'),
      dataIndex: ['transportOrder', 'commissionNum'],
      key: 'commissionNum',
      width: 120,
      customRender: ({ record }) =>
        (record as CommissionOrderAdminApi.CommissionTicketDto).transportOrder
          ?.commissionNum ?? '-',
    },
    {
      title: ticketTitle('mblNum'),
      dataIndex: ['transportOrder', 'mblNum'],
      key: 'mblNum',
      width: 130,
      customRender: ({ record }) =>
        (record as CommissionOrderAdminApi.CommissionTicketDto).transportOrder
          ?.mblNum ?? '-',
    },
    {
      title: ticketTitle('bizType'),
      dataIndex: ['transportOrder', 'bizType'],
      key: 'bizType',
      width: 90,
      customRender: ({ text }) => getBizTypeLabel(text as number | null),
    },
    {
      title: ticketTitle('bizDate'),
      dataIndex: ['transportOrder', 'bizDate'],
      key: 'bizDate',
      width: 110,
      customRender: ({ record }) =>
        formatMonth(
          (record as CommissionOrderAdminApi.CommissionTicketDto).transportOrder
            ?.bizDate,
        ),
    },
    {
      title: ticketTitle('client'),
      dataIndex: ['transportOrder', 'client'],
      key: 'client',
      width: 130,
      customRender: ({ record }) =>
        (record as CommissionOrderAdminApi.CommissionTicketDto).transportOrder
          ?.client?.name ?? '-',
    },
    {
      title: ticketTitle('ticketType'),
      key: 'ticketType',
      width: 80,
      customRender: ({ record }) =>
        getTicketTypeLabel(
          record as CommissionOrderAdminApi.CommissionTicketDto,
        ),
    },
    {
      title: ticketTitle('accountDate'),
      dataIndex: 'accountDate',
      key: 'accountDate',
      width: 100,
      customRender: ({ text }) => formatMonth(text as string | null),
    },
  ];
  if (options.showUnsettled) {
    columns.push({
      title: ticketTitle('unsettledCount'),
      dataIndex: 'unsettledFeeCount',
      key: 'unsettledFeeCount',
      width: 110,
      customRender: ({ text }) =>
        text == null
          ? '-'
          : $t('commissionOrder.ticket.unsettledCountValue', { count: text }),
    });
  }
  return columns;
};

/** 销售提成票表格列（第一部分与第二部分共用，第二部分多一列未结清费用） */
export function useSalesTicketColumns(
  options: {
    showUnsettled?: boolean;
  } = {},
): TicketColumns {
  return [
    ...ticketBaseColumns({ showUnsettled: options.showUnsettled ?? false }),
    {
      title: ticketTitle('totalReceivable'),
      dataIndex: 'totalReceivable',
      key: 'totalReceivable',
      width: 110,
      align: 'right',
      customRender: ({ text }) => amountCell(text),
    },
    {
      title: ticketTitle('totalPayable'),
      dataIndex: 'totalPayable',
      key: 'totalPayable',
      width: 110,
      align: 'right',
      customRender: ({ text }) => amountCell(text),
    },
    {
      title: ticketTitle('profit'),
      dataIndex: 'profit',
      key: 'profit',
      width: 110,
      align: 'right',
      customRender: ({ text }) => amountCell(text),
    },
    {
      title: ticketTitle('profitType'),
      dataIndex: 'profitType',
      key: 'profitType',
      width: 100,
      customRender: ({ text }) => {
        const value = text as number | null;
        if (value == null) return '-';
        const option = getProfitTypeOptions().find((o) => o.value === value);
        return h(
          Tag,
          { color: option?.color ?? 'default' },
          () => option?.label ?? String(value),
        );
      },
    },
    {
      title: ticketTitle('currencies'),
      dataIndex: 'currencies',
      key: 'currencies',
      width: 150,
      customRender: ({ text }) => {
        const textValue = formatCurrencies(
          text as
            | CommissionOrderAdminApi.CommissionCurrencyDto[]
            | null
            | undefined,
        );
        return h(
          Tooltip,
          { title: () => textValue, placement: 'topLeft' },
          () =>
            h(
              'span',
              {
                class: 'block truncate max-w-[140px]',
              },
              textValue,
            ),
        );
      },
    },
  ];
}

/** 操作提成票表格列 */
export function useOperationTicketColumns(): TicketColumns {
  return [
    ...ticketBaseColumns({ showUnsettled: false }),
    {
      title: ticketTitle('amount'),
      dataIndex: 'amount',
      key: 'amount',
      width: 110,
      align: 'right',
      customRender: ({ text }) => amountCell(text),
    },
    {
      title: ticketTitle('hitRules'),
      dataIndex: 'hitRules',
      key: 'hitRules',
      width: 240,
      customRender: ({ text }) => {
        const rules = text as
          | CommissionOrderAdminApi.CommissionHitRuleDto[]
          | null
          | undefined;
        if (!rules || rules.length === 0) {
          return $t('commissionOrder.ticket.none');
        }
        return h(
          'div',
          { class: 'flex flex-wrap gap-1' },
          rules.map((rule) =>
            h(
              Tag,
              { color: 'blue', key: rule.commissionConfigRuleId },
              () => `${rule.ruleName} +${formatAmount(rule.amount)}`,
            ),
          ),
        );
      },
    },
  ];
}

/** 计算步骤表格列 */
export function useStepColumns(): TableColumnsType<CommissionOrderAdminApi.CommissionStepDto> {
  return [
    {
      title: $t('commissionOrder.calc.stepType'),
      dataIndex: 'stepType',
      key: 'stepType',
      width: 110,
      customRender: ({ text }) => getStepTypeLabel(text as number | null),
    },
    {
      title: $t('commissionOrder.calc.stepDescription'),
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: $t('commissionOrder.calc.stepAmount'),
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right',
      customRender: ({ text }) => amountCell(text),
    },
  ];
}
