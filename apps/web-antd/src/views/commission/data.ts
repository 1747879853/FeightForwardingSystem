import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';

import { h } from 'vue';

import { CommissionOrderAdminApi } from '#/api/commission/commission-order-admin';
import { $t } from '#/locales';

import type { TableColumnsType } from 'ant-design-vue';
import { Tag } from 'ant-design-vue';

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

/** 月份中文文案：`2026-08-27T22:38:03` → `2026年8月` */
export const formatMonthCn = (value?: null | string): string => {
  const text = formatMonth(value);
  if (text === '-') return '-';
  const [year, month] = text.split('-');
  return `${year}年${Number(month)}月`;
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

/** 未结清票按结算对象展开后的行（同一票多结算对象多行） */
export type UnsettledSettlementFlatRow =
  CommissionOrderAdminApi.CommissionTicketDto & {
    _flatKey: string;
    _unsettledGroupIndex: number;
    _unsettledSettlement: string;
  };

/** 未结清票 → 按结算对象拆行，供欠款明细按币别动态列展示 */
export function flattenUnsettledBySettlement(
  tickets: CommissionOrderAdminApi.CommissionTicketDto[],
): UnsettledSettlementFlatRow[] {
  const rows: UnsettledSettlementFlatRow[] = [];
  for (const ticket of tickets) {
    const groups = ticket.unsettledSettlements ?? [];
    const baseKey = ticketRowKey(ticket);
    if (groups.length === 0) {
      rows.push({
        ...ticket,
        _flatKey: `${baseKey}:unsettled:0`,
        _unsettledGroupIndex: 0,
        _unsettledSettlement: '',
      });
      continue;
    }
    groups.forEach((group, index) => {
      rows.push({
        ...ticket,
        _flatKey: `${baseKey}:unsettled:${index}`,
        _unsettledGroupIndex: index,
        _unsettledSettlement:
          group.settlement?.name ?? group.settlement?.fullName ?? '',
      });
    });
  }
  return rows;
}

export const unsettledSettlementRowKey = (
  row: UnsettledSettlementFlatRow,
): string => row._flatKey;

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

/** 按业务类型取对应的起运港/目的港子对象（三个子对象只有对应的一个有值） */
const getPortPair = (
  transportOrder: CommissionOrderAdminApi.CommissionTransportOrderDto,
):
  | CommissionOrderAdminApi.CommissionSeaExportDto
  | CommissionOrderAdminApi.CommissionSeaImportDto
  | CommissionOrderAdminApi.CommissionAirExportDto
  | null
  | undefined => {
  switch (transportOrder.bizType) {
    case CommissionOrderAdminApi.BizType.SeaExport: {
      return transportOrder.seaExport;
    }
    case CommissionOrderAdminApi.BizType.SeaImport: {
      return transportOrder.seaImport;
    }
    case CommissionOrderAdminApi.BizType.AirExport: {
      return transportOrder.airExport;
    }
    default: {
      return undefined;
    }
  }
};

const formatPortName = (
  port?: null | CommissionOrderAdminApi.SeaAirPortSimpleDto,
): string => port?.cnName || port?.enName || port?.code || '-';

/** 起运港/目的港文案：`上海 → 汉堡`，无值时显示 `-` */
export const formatPolPod = (
  transportOrder?: null | CommissionOrderAdminApi.CommissionTransportOrderDto,
): string => {
  if (!transportOrder) return '-';
  const pair = getPortPair(transportOrder);
  if (!pair?.pol && !pair?.pod) return '-';
  return `${formatPortName(pair.pol)} → ${formatPortName(pair.pod)}`;
};

/** 箱型箱量文案：`40HQ×2、20GP×1`，空运出口（无箱）显示 `-` */
export const formatCtns = (
  ctns?: null | CommissionOrderAdminApi.CommissionCtnSimpleDto[],
): string => {
  if (!ctns || ctns.length === 0) return '-';
  return ctns
    .map((c) => {
      const name = c.ctnCode?.ctnName ?? c.ctnCode?.cabinetSize ?? '-';
      return `${name}×${c.count ?? 0}`;
    })
    .join('、');
};

/** 欠款明细文案：`结算对象A：USD 应收100 未收80；...`（不含应付/未付），无值时显示 `-` */
export const formatUnsettledSettlements = (
  groups?: null | CommissionOrderAdminApi.CommissionUnsettledSettlementDto[],
): string => {
  if (!groups || groups.length === 0) return '-';
  return groups
    .map((group) => {
      const party =
        group.settlement?.name ??
        group.settlement?.fullName ??
        $t('commissionOrder.ticket.unsettledSettlementNone');
      const details = (group.currencies ?? [])
        .map((c) => {
          const code = c.currency?.code ?? '-';
          return `${code} ${$t('commissionOrder.ticket.receivable')}${formatAmount(c.receivable)} ${$t('commissionOrder.ticket.unReceived')}${formatAmount(c.unReceived)}`;
        })
        .join('；');
      return details ? `${party}：${details}` : party;
    })
    .join('；');
};

/** 从票列表收集币别代码（升序），用于动态列 */
export const collectTicketCurrencyCodes = (
  tickets: CommissionOrderAdminApi.CommissionTicketDto[],
  source: 'currencies' | 'unsettled' = 'currencies',
): string[] => {
  const codes = new Set<string>();
  for (const ticket of tickets) {
    if (source === 'unsettled') {
      for (const group of ticket.unsettledSettlements ?? []) {
        for (const item of group.currencies ?? []) {
          const code = item.currency?.code?.trim();
          if (code) codes.add(code);
        }
      }
      continue;
    }
    for (const item of ticket.currencies ?? []) {
      const code = item.currency?.code?.trim();
      if (code) codes.add(code);
    }
  }
  return [...codes].sort((a, b) => a.localeCompare(b));
};

/** 参与计算票：按币别取应收；未收对已结清票恒为 0 */
const getSettledCurrencyAmount = (
  ticket: CommissionOrderAdminApi.CommissionTicketDto,
  code: string,
  field: 'receivable' | 'unReceived',
): null | number => {
  const hit = (ticket.currencies ?? []).find(
    (item) => (item.currency?.code ?? '') === code,
  );
  if (!hit) return null;
  return field === 'unReceived' ? 0 : (hit.receivable ?? null);
};

/** 未结清票：按币别汇总应收/未收（跨结算对象） */
const getUnsettledCurrencyAmount = (
  ticket: CommissionOrderAdminApi.CommissionTicketDto,
  code: string,
  field: 'receivable' | 'unReceived',
): null | number => {
  let sum = 0;
  let hit = false;
  for (const group of ticket.unsettledSettlements ?? []) {
    for (const item of group.currencies ?? []) {
      if ((item.currency?.code ?? '') !== code) continue;
      hit = true;
      sum += Number(item[field] ?? 0);
    }
  }
  return hit ? sum : null;
};

/** 未结清票拆行后：按当前结算对象 + 币别取应收/未收 */
const getUnsettledSettlementCurrencyAmount = (
  row: UnsettledSettlementFlatRow,
  code: string,
  field: 'receivable' | 'unReceived',
): null | number => {
  const group = row.unsettledSettlements?.[row._unsettledGroupIndex];
  if (!group) return null;
  const hit = (group.currencies ?? []).find(
    (item) => (item.currency?.code ?? '') === code,
  );
  if (!hit) return null;
  return hit[field] ?? null;
};

/** 仅日期：`2026-08-27`，空值 `-` */
export const formatDateOnly = (value?: null | string): string => {
  if (!value) return '-';
  return value.slice(0, 10);
};

/** 超期天数文案：未到期为负数不归零 */
export const formatOverdueDays = (days?: null | number): string => {
  if (days == null || Number.isNaN(Number(days))) return '-';
  const value = Number(days);
  if (value < 0) {
    return $t('commissionOrder.ticket.overdueDaysEarly', {
      days: Math.abs(value),
    });
  }
  return $t('commissionOrder.ticket.overdueDaysValue', { days: value });
};

/** 账期类型（结算方式：票结/月结/指定日结） */
export const getSettlementTypeLabel = (type?: null | number): string => {
  if (type == null) return '-';
  const map: Record<number, string> = {
    0: $t(
      'seaExport.client.paymentTerms.SettlementTypeOptions.ticketSettlement',
    ),
    1: $t(
      'seaExport.client.paymentTerms.SettlementTypeOptions.monthlySettlement',
    ),
    2: $t(
      'seaExport.client.paymentTerms.SettlementTypeOptions.appointedDaySettlement',
    ),
  };
  return map[type] ?? String(type);
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

/** 金额单元格：右对齐，负数红色；可附加强调色（如提成金额） */
const amountCell = (text: unknown, extraClass?: string) =>
  h(
    'span',
    {
      class: [
        typeof text === 'number' && text < 0 ? 'text-red-500' : undefined,
        extraClass,
      ],
    },
    formatAmount(text as number | null | undefined),
  );

/** 业务信息文案：`海运出口  2026-07 · 青岛 --` */
export const formatBizInfo = (
  ticket: CommissionOrderAdminApi.CommissionTicketDto,
): string => {
  const order = ticket.transportOrder;
  const biz = getBizTypeLabel(order?.bizType);
  const date = formatMonth(order?.bizDate);
  const ports = formatPolPod(order)
    .replace(' → ', ' -- ')
    .replace(/\s--\s-$/, ' --');
  return `${biz}  ${date} · ${ports}`;
};

const ticketTitle = (key: string) => $t(`commissionOrder.ticket.${key}`);

type TicketColumns =
  TableColumnsType<CommissionOrderAdminApi.CommissionTicketDto>;

/** 应结日期 / 超期天数 / 账期类型 */
const buildSettlementMetaColumns = (): TicketColumns => [
  {
    title: ticketTitle('settlementDate'),
    key: 'settlementDate',
    width: 110,
    customRender: ({ record }) =>
      formatDateOnly(
        (record as CommissionOrderAdminApi.CommissionTicketDto).transportOrder
          ?.settlementDate,
      ),
  },
  {
    title: ticketTitle('overdueDays'),
    key: 'overdueDays',
    width: 90,
    align: 'right',
    customRender: ({ record }) => {
      const days = (record as CommissionOrderAdminApi.CommissionTicketDto)
        .transportOrder?.overdueDays;
      const label = formatOverdueDays(days);
      if (days == null) return label;
      const className =
        days < 0
          ? 'text-green-600'
          : days === 0
            ? 'text-amber-500'
            : 'text-red-500';
      return h('span', { class: className }, label);
    },
  },
  {
    title: ticketTitle('settlementType'),
    key: 'settlementType',
    width: 100,
    customRender: ({ record }) =>
      getSettlementTypeLabel(
        (record as CommissionOrderAdminApi.CommissionTicketDto).transportOrder
          ?.settlementType,
      ),
  },
];

/** 按币别动态列：`RMB应收` / `RMB未收` …；mode=settled 时未收恒为 0 */
const buildCurrencyAmountColumns = (
  currencyCodes: string[],
  mode: 'settled' | 'unsettled' | 'unsettledBySettlement',
): TicketColumns => {
  const columns: TicketColumns = [];
  for (const code of currencyCodes) {
    columns.push(
      {
        title: $t('commissionOrder.ticket.currencyReceivable', { code }),
        key: `currencyRecv_${code}`,
        width: 110,
        align: 'right',
        customRender: ({ record }) => {
          let value: null | number;
          if (mode === 'unsettledBySettlement') {
            value = getUnsettledSettlementCurrencyAmount(
              record as UnsettledSettlementFlatRow,
              code,
              'receivable',
            );
          } else {
            const ticket =
              record as CommissionOrderAdminApi.CommissionTicketDto;
            value =
              mode === 'unsettled'
                ? getUnsettledCurrencyAmount(ticket, code, 'receivable')
                : getSettledCurrencyAmount(ticket, code, 'receivable');
          }
          return amountCell(value);
        },
      },
      {
        title: $t('commissionOrder.ticket.currencyUnReceived', { code }),
        key: `currencyUnRecv_${code}`,
        width: 110,
        align: 'right',
        customRender: ({ record }) => {
          let value: null | number;
          if (mode === 'unsettledBySettlement') {
            value = getUnsettledSettlementCurrencyAmount(
              record as UnsettledSettlementFlatRow,
              code,
              'unReceived',
            );
          } else {
            const ticket =
              record as CommissionOrderAdminApi.CommissionTicketDto;
            value =
              mode === 'unsettled'
                ? getUnsettledCurrencyAmount(ticket, code, 'unReceived')
                : getSettledCurrencyAmount(ticket, code, 'unReceived');
          }
          return amountCell(value);
        },
      },
    );
  }
  return columns;
};

const ticketBaseColumns = (): TicketColumns => [
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
    title: ticketTitle('operations'),
    dataIndex: ['transportOrder', 'operations'],
    key: 'operations',
    width: 100,
    customRender: ({ record }) => {
      const operations = (record as CommissionOrderAdminApi.CommissionTicketDto)
        .transportOrder?.operations;
      const text = (operations ?? [])
        .map((o) => o.nickName)
        .filter(Boolean)
        .join('、');
      return text || '-';
    },
  },
  {
    title: ticketTitle('polPod'),
    key: 'polPod',
    width: 150,
    ellipsis: true,
    customRender: ({ record }) =>
      formatPolPod(
        (record as CommissionOrderAdminApi.CommissionTicketDto).transportOrder,
      ),
  },
  {
    title: ticketTitle('ticketType'),
    key: 'ticketType',
    width: 80,
    customRender: ({ record }) =>
      getTicketTypeLabel(record as CommissionOrderAdminApi.CommissionTicketDto),
  },
  {
    title: ticketTitle('accountDate'),
    dataIndex: 'accountDate',
    key: 'accountDate',
    width: 100,
    customRender: ({ text }) => formatMonth(text as string | null),
  },
];

/** 销售提成票表格列。
 * compact：新建弹窗「参与计算的票」精简列；
 * showUnsettled：未结清票（按结算对象拆行 + 币别动态应收/未收列）；
 * currencyCodes：动态币别列，由调用方按当前数据收集。 */
export function useSalesTicketColumns(
  options: {
    compact?: boolean;
    currencyCodes?: string[];
    showUnsettled?: boolean;
  } = {},
): TicketColumns {
  const showUnsettled = options.showUnsettled ?? false;
  const compact = options.compact ?? false;
  const currencyCodes = options.currencyCodes ?? [];
  const currencyMode = showUnsettled ? 'unsettledBySettlement' : 'settled';
  const currencyColumns = buildCurrencyAmountColumns(
    currencyCodes,
    currencyMode,
  );
  const metaColumns = buildSettlementMetaColumns();

  if (showUnsettled) {
    return [
      ...ticketBaseColumns(),
      {
        title: ticketTitle('unsettledSettlement'),
        key: 'unsettledSettlement',
        width: 120,
        ellipsis: true,
        customRender: ({ record }) => {
          const row = record as UnsettledSettlementFlatRow;
          return (
            row._unsettledSettlement ||
            $t('commissionOrder.ticket.unsettledSettlementNone')
          );
        },
      },
      ...metaColumns,
      ...currencyColumns,
    ];
  }

  const profitTypeColumn = {
    title: compact ? ticketTitle('status') : ticketTitle('profitType'),
    dataIndex: 'profitType',
    key: 'profitType',
    width: 100,
    customRender: ({ text }: { text: unknown }) => {
      const value = text as number | null;
      if (value == null) return '-';
      const option = getProfitTypeOptions().find((o) => o.value === value);
      return h(
        Tag,
        { color: option?.color ?? 'default' },
        () => option?.label ?? String(value),
      );
    },
  };

  if (compact) {
    return [
      {
        title: ticketTitle('commissionNum'),
        key: 'commissionNum',
        width: 140,
        customRender: ({ record }) =>
          (record as CommissionOrderAdminApi.CommissionTicketDto).transportOrder
            ?.commissionNum ?? '-',
      },
      {
        title: ticketTitle('bizInfo'),
        key: 'bizInfo',
        ellipsis: true,
        customRender: ({ record }) =>
          formatBizInfo(record as CommissionOrderAdminApi.CommissionTicketDto),
      },
      ...metaColumns,
      ...currencyColumns,
      {
        title: ticketTitle('profit'),
        dataIndex: 'profit',
        key: 'profit',
        width: 100,
        align: 'right',
        customRender: ({ text }) => amountCell(text),
      },
      {
        title: ticketTitle('amount'),
        dataIndex: 'amount',
        key: 'amount',
        width: 110,
        align: 'right',
        customRender: ({ text }) =>
          amountCell(text, 'font-semibold text-[hsl(var(--primary))]'),
      },
      profitTypeColumn,
    ];
  }

  return [
    ...ticketBaseColumns(),
    ...metaColumns,
    ...currencyColumns,
    {
      title: ticketTitle('profit'),
      dataIndex: 'profit',
      key: 'profit',
      width: 110,
      align: 'right',
      customRender: ({ text }) => amountCell(text),
    },
    profitTypeColumn,
    {
      title: ticketTitle('amount'),
      dataIndex: 'amount',
      key: 'amount',
      width: 110,
      align: 'right',
      customRender: ({ text }) =>
        amountCell(text, 'font-semibold text-[hsl(var(--primary))]'),
    },
  ];
}

/** 操作提成票表格列 */
export function useOperationTicketColumns(): TicketColumns {
  return [
    ...ticketBaseColumns(),
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
