import type { VbenFormSchema } from '#/adapter/form';
import { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';

import { $t } from '#/locales';

interface BusinessPortRemarkSource {
  bizType?: number;
  seaExport?: PaymentApplicationAdminApi.SeaExportSimpleForPayAppDto | null;
  seaImport?: PaymentApplicationAdminApi.SeaImportSimpleForPayAppDto | null;
  airExport?: PaymentApplicationAdminApi.AirExportSimpleForPayAppDto | null;
}

function resolveBusinessPortRemarks(source: BusinessPortRemarkSource) {
  switch (source.bizType) {
    case 0: {
      return source.seaExport;
    }
    case 1: {
      return source.seaImport;
    }
    case 2: {
      return source.airExport;
    }
    default: {
      // 兼容未携带 bizType 的历史详情数据。
      return source.seaExport ?? source.seaImport ?? source.airExport;
    }
  }
}

/**
 * 费用明细起运港展示：按业务类型读取业务简要对象中的港口备注。
 * 备注为空不回退港口名。
 */
export function resolvePolPortDisplayName(
  source: BusinessPortRemarkSource,
): string {
  return resolveBusinessPortRemarks(source)?.polRemark ?? '';
}

/**
 * 费用明细目的港展示：按业务类型读取业务简要对象中的港口备注。
 * 备注为空不回退港口名。
 */
export function resolvePodPortDisplayName(
  source: BusinessPortRemarkSource,
): string {
  return resolveBusinessPortRemarks(source)?.podRemark ?? '';
}

/**
 * 付费申请 `currencyId`：有值=指定结算币别申请；null/undefined/0=原币申请（按费用原币分列）。
 * 付费结算单上的结算币别见 `PaymentSettlement.currencyId`。
 */
export function isOriginalCurrencyApplication(
  currencyId: null | number | undefined,
): boolean {
  return currencyId === null || currencyId === undefined || currencyId === 0;
}

export function isSpecifiedCurrencyApplication(
  currencyId: null | number | undefined,
): boolean {
  return !isOriginalCurrencyApplication(currencyId);
}

/** 组件 Props */
export interface AddFeeDrawerProps {
  /** 是否在抽屉内维护发票方式（仅付费申请场景启用） */
  enableInvoiceProcess?: boolean;
  /** 发票方式：0=先票后付，1=先付后票，2=不开票 */
  invoiceProcess?: number;
  /** 结算对象 id（由外层表单传入） */
  settlementId?: string;
  /** 结算对象名称（用于 ClientSelect 回显） */
  settlementName?: string;
  /** 对应付费申请 `currencyId`；null=原币申请 */
  settlementCurrencyId?: number | null;
  /** 结算币别名称（锁定时展示，通常 `currencyCode`） */
  settlementCurrencyName?: string;
  /** 已选费用 id 数组（不可编辑） */
  selectedFeeIds?: string[];
  /** 已选费用本次申请金额（禁选行展示，不传则不显示默认值） */
  selectedAppliedAmounts?: Record<string, number>;
}

/** 选中费用项（emit 给父组件） */
export interface SelectedFeeItem {
  feeId: string;
  transportOrderId: string;
  commissionNum?: string;
  mblNum?: string;
  clientId?: string;
  clientName?: string;
  accountDate?: string;
  etd?: string;
  polName?: string;
  podName?: string;
  saleUserNames?: string;
  operationUserNames?: string;
  customerServiceUserNames?: string;
  paySide: number;
  feeCodeId: number;
  feeCodeName?: string;
  currencyId: number;
  currencyCode?: string;
  currencyName?: string;
  settlementId: string;
  settlementName?: string;
  amount: number;
  /** 已结算金额 */
  settledAmount: number;
  /** 未付费申请金额（原币） */
  unRqstPaymentAmount: number;
  /** 本次申请金额（用户输入） */
  appliedAmount: number;
  /** 原始汇率 */
  exchangeRate?: number;
}

/** 费用行数据（展开子表格行） */
export interface FeeRowData extends PaymentApplicationAdminApi.OrderFeeDto {
  /** 本次申请金额 */
  appliedAmount: number;
}

/** 币别汇总信息（动态列用） */
export interface CurrencyInfo {
  currencyId: number;
  currencyCode: string;
}

/** 业务 + 结算对象复合分组键 */
export function buildFeeGroupKey(
  transportOrderId: string,
  settlementId: string,
): string {
  return `${transportOrderId}_${settlementId}`;
}

/** 解析分组结算对象展示名：简称 name → 费用 settlement.name → fullName */
export function resolveGroupSettlementName(
  group: PaymentApplicationAdminApi.PayAppFeeGroupDto,
): string {
  const settlement = group.settlement;
  if (settlement?.name) return settlement.name;
  const firstFee = group.orderFees?.[0];
  if (firstFee?.settlement?.name) return firstFee.settlement.name;
  if (settlement?.fullName) return settlement.fullName;
  return '';
}

/** 销售 / 操作 / 客服列 field */
export const USER_ROLE_COLUMN_FIELDS = [
  'saleUserNames',
  'operationUserNames',
  'customerServiceUserNames',
] as const;

export function isUserRoleColumnField(field: string | undefined): boolean {
  return USER_ROLE_COLUMN_FIELDS.includes(
    field as (typeof USER_ROLE_COLUMN_FIELDS)[number],
  );
}

function resolveCurrencyCode(
  fee: Pick<PaymentApplicationAdminApi.OrderFeeDto, 'currency'>,
): string {
  return fee.currency?.code ?? '';
}

/** PaySide 枚举选项 */
export const PaySideOptions = [
  { value: 0, label: '收' },
  { value: 1, label: '付' },
];

/** 业务类型选项（与 GetOrderFeeGroupAsync.BizType 一致） */
export const BizTypeOptions = [
  { value: 0, label: '海运出口' },
  { value: 1, label: '海运进口' },
  { value: 2, label: '空运出口' },
];

export function getPaySideLabel(value: number): string {
  return PaySideOptions.find((o) => o.value === value)?.label ?? '';
}

/** 箱型箱量展示：按箱型汇总数量，如 20GP*2，40HQ*1 */
export function formatOrderCtnsDisplay(
  orderCtns?: PaymentApplicationAdminApi.OrderCtnSimpleDto[] | null,
): string {
  if (!Array.isArray(orderCtns) || orderCtns.length === 0) return '';

  const ctnTypeCounter = new Map<string, number>();
  for (const ctn of orderCtns) {
    const label = ctn.ctnCode?.ctnName?.trim();
    if (!label) continue;
    ctnTypeCounter.set(label, (ctnTypeCounter.get(label) ?? 0) + 1);
  }

  if (ctnTypeCounter.size === 0) return '';
  return [...ctnTypeCounter.entries()]
    .map(([ctnType, count]) => `${ctnType}*${count}`)
    .join('，');
}

/** 搜索表单 schema */
export function useAddFeeSearchSchema(options?: {
  /** 是否必填结算对象（已有费用时需锁定并必填） */
  settlementIdRequired?: boolean;
}): VbenFormSchema[] {
  return [
    {
      component: 'ClientSelect',
      fieldName: 'SettlementId',
      label: $t('seaExport.export.paymentApplication.clientName'),
      rules: options?.settlementIdRequired ? 'required' : undefined,
      componentProps: {
        industryCategory: '',
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
    },
    {
      component: 'OrganizationSelect',
      fieldName: 'OrgId',
      label: '所属公司',
      componentProps: {
        isCompany: true,
        required: false,
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'Keyword',
      label: '编号',
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'Select',
      fieldName: 'PaySide',
      label: '收付类型',
      defaultValue: 1,
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
        options: PaySideOptions,
      },
    },
    {
      component: 'Select',
      fieldName: 'BizType',
      label: '业务类型',
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
        options: BizTypeOptions,
      },
    },
    {
      component: 'CurrencySelect',
      fieldName: 'CurrencyId',
      label: '币别',
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
    },
    {
      component: 'RangePicker',
      fieldName: 'ETDRange',
      label: '业务日期',
      formItemClass: 'col-span-2',
      componentProps: {
        placeholder: ['开始日期', '结束日期'],
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'RadioGroup',
      fieldName: 'feeCodeMode',
      label: '费用匹配',
      defaultValue: 'include',
      componentProps: {
        options: [
          { label: '匹配', value: 'include' },
          { label: '排除', value: 'exclude' },
        ],
        optionType: 'button',
        buttonStyle: 'solid',
        size: 'small',
      },
    },
    {
      component: 'FeeCodeSelect',
      fieldName: 'FeeCodeIds',
      label: '费用名称',
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
        mode: 'multiple',
        maxTagCount: 2,
      },
    },
  ];
}

/** 主表格固定列（业务层） */
export function useOrderFixedColumns() {
  return [
    { type: 'seq' as const, width: 105.4545, title: '序号' },
    {
      field: 'commissionNum',
      title: '委托编号',
      width: 150,
      ellipsis: true,
    },
    {
      field: 'mblNum',
      title: '主提单号',
      width: 130,
      ellipsis: true,
    },
    {
      field: 'orderCtnsText',
      title: '箱型箱量',
      width: 120,
      ellipsis: true,
    },
    {
      field: 'clientName',
      title: $t('seaExport.export.paymentApplication.orderClientName'),
      width: 160,
      ellipsis: true,
    },
    {
      field: 'settlementName',
      title: $t('seaExport.export.paymentApplication.settlementNameColumn'),
      width: 160,
      ellipsis: true,
    },
    {
      field: 'saleUserNames',
      title: '销售',
      width: 72,
      ellipsis: true,
      className: 'user-role-column',
    },
    {
      field: 'operationUserNames',
      title: '操作',
      width: 72,
      ellipsis: true,
      className: 'user-role-column',
    },
    {
      field: 'customerServiceUserNames',
      title: '客服',
      width: 72,
      ellipsis: true,
      className: 'user-role-column',
    },
    {
      field: 'accountDate',
      title: '会计日期',
      width: 85,
      formatter: 'formatDate' as const,
    },
    {
      field: 'etd',
      title: '开船日期',
      width: 110,
    },
    {
      field: 'polName',
      title: '起运港',
      width: 110,
      ellipsis: true,
    },
    {
      field: 'podName',
      title: '目的港',
      width: 110,
      ellipsis: true,
    },
  ];
}

function hasUserAttribute(
  userAttribute: number | undefined,
  target: PaymentApplicationAdminApi.UserAttribute,
) {
  if (typeof userAttribute !== 'number') return false;
  return (userAttribute & target) === target;
}

function getOrderUserNamesByAttribute(
  orderUsers: PaymentApplicationAdminApi.OrderUserDto[] | undefined,
  target: PaymentApplicationAdminApi.UserAttribute,
): string {
  if (!Array.isArray(orderUsers) || orderUsers.length === 0) return '';
  return orderUsers
    .filter((user) => hasUserAttribute(user.userAttribute, target))
    .map((user) => user.userNickName)
    .filter((name): name is string => Boolean(name))
    .join('、');
}

/** 根据当前页数据收集所有币别 */
export function collectCurrencies(
  items: PaymentApplicationAdminApi.PayAppFeeGroupDto[],
): CurrencyInfo[] {
  const map = new Map<number, string>();
  for (const order of items) {
    for (const fee of order.orderFees ?? []) {
      const currencyCode = resolveCurrencyCode(fee);
      if (fee.currencyId && currencyCode && !map.has(fee.currencyId)) {
        map.set(fee.currencyId, currencyCode);
      }
    }
  }
  return [...map.entries()].map(([currencyId, currencyCode]) => ({
    currencyId,
    currencyCode,
  }));
}

/** 根据币别生成动态列（每个币别 -> 未收 + 未付） */
export function buildDynamicCurrencyColumns(currencies: CurrencyInfo[]) {
  const columns: Array<{
    field: string;
    title: string;
    width: number;
    align: string;
  }> = [];
  for (const c of currencies) {
    columns.push({
      field: `currency_${c.currencyId}_receive`,
      title: `${c.currencyCode}未收`,
      width: 85,
      align: 'right',
    });
    columns.push({
      field: `currency_${c.currencyId}_pay`,
      title: `${c.currencyCode}未付`,
      width: 85,
      align: 'right',
    });
  }
  return columns;
}

/** 计算某个订单的某币别的应收/应付合计 */
export function calcCurrencySummary(
  orderFees: PaymentApplicationAdminApi.OrderFeeDto[],
  currencyId: number,
  paySide: number,
): number {
  return orderFees
    .filter((f) => f.currencyId === currencyId && f.paySide === paySide)
    .reduce((sum, f) => sum + (f.unRqstPaymentAmount ?? 0), 0);
}

/** 将订单数据转为表格行（含动态币别字段） */
export function buildOrderRow(
  order: PaymentApplicationAdminApi.PayAppFeeGroupDto,
  currencies: CurrencyInfo[],
): Record<string, any> {
  const settlementId =
    order.settlementId ?? order.orderFees?.[0]?.settlementId ?? '';
  const row: Record<string, any> = {
    ...order,
    groupKey: buildFeeGroupKey(order.id, settlementId),
    // 接口仅回 client 对象，列 field 仍是 clientName
    clientName: order.client?.name ?? '',
    settlementName: resolveGroupSettlementName(order),
    polName: resolvePolPortDisplayName(order),
    podName: resolvePodPortDisplayName(order),
    saleUserNames: getOrderUserNamesByAttribute(
      order.orderUsers,
      PaymentApplicationAdminApi.UserAttribute.Sale,
    ),
    operationUserNames: getOrderUserNamesByAttribute(
      order.orderUsers,
      PaymentApplicationAdminApi.UserAttribute.Operation,
    ),
    customerServiceUserNames: getOrderUserNamesByAttribute(
      order.orderUsers,
      PaymentApplicationAdminApi.UserAttribute.CustomerService,
    ),
    orderCtnsText: formatOrderCtnsDisplay(order.orderCtns),
  };
  for (const c of currencies) {
    row[`currency_${c.currencyId}_receive`] = calcCurrencySummary(
      order.orderFees ?? [],
      c.currencyId,
      0,
    );
    row[`currency_${c.currencyId}_pay`] = calcCurrencySummary(
      order.orderFees ?? [],
      c.currencyId,
      1,
    );
  }
  return row;
}
