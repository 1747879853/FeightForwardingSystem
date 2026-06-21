import type { VbenFormSchema } from '#/adapter/form';
import { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';

import { $t } from '#/locales';

/** 费用明细港口展示：仅英文 portName，不回退中文名 */
export function resolvePolPortDisplayName(source: {
  pol?: PaymentApplicationAdminApi.PortSimpleDto;
  polName?: string;
  seaExportPOL?: PaymentApplicationAdminApi.PortSimpleDto;
  seaExportPOLName?: string;
  seaExportPOLPortName?: string;
}): string {
  return (
    source.seaExportPOLPortName ??
    source.pol?.portName ??
    source.seaExportPOL?.portName ??
    source.seaExportPOLName ??
    source.polName ??
    ''
  );
}

export function resolvePodPortDisplayName(source: {
  pod?: PaymentApplicationAdminApi.PortSimpleDto;
  podName?: string;
  seaExportPOD?: PaymentApplicationAdminApi.PortSimpleDto;
  seaExportPODName?: string;
  seaExportPODPortName?: string;
}): string {
  return (
    source.seaExportPODPortName ??
    source.pod?.portName ??
    source.seaExportPOD?.portName ??
    source.seaExportPODName ??
    source.podName ??
    ''
  );
}

/** 组件 Props */
export interface AddFeeDrawerProps {
  /** 结算对象 id（由外层表单传入） */
  settlementId?: string;
  /** 结算币别id，null 表示原币结算 */
  settlementCurrencyId?: number | null;
  /** 已选费用 id 数组（不可编辑） */
  selectedFeeIds?: string[];
  /** 已选费用本次结算金额（禁选行展示，不传则不显示默认值） */
  selectedAppliedAmounts?: Record<string, number>;
}

/** 选中费用项（emit 给父组件） */
export interface SelectedFeeItem {
  feeId: string;
  transportOrderId: string;
  commissionNum?: string;
  mblNum?: string;
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
  unSettledAmount: number;
  /** 本次结算金额（用户输入） */
  appliedAmount: number;
  /** 原始汇率 */
  exchangeRate?: number;
}

/** 费用行数据（展开子表格行） */
export interface FeeRowData extends PaymentApplicationAdminApi.OrderFeeDto {
  /** 本次结算金额 */
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

/** 解析分组结算对象展示名：简称 name → 费用 settlementName → fullName */
export function resolveGroupSettlementName(
  group: PaymentApplicationAdminApi.PayAppFeeGroupDto,
): string {
  const settlement = group.settlement;
  if (settlement?.name) return settlement.name;
  const firstFee = group.orderFees?.[0];
  if (firstFee?.settlementName) return firstFee.settlementName;
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

function resolveCurrencyCode(fee: {
  currencyCode?: string;
  currencyName?: string;
}): string {
  return fee.currencyCode ?? fee.currencyName ?? '';
}

/** PaySide 枚举选项 */
export const PaySideOptions = [
  { value: 0, label: '收' },
  { value: 1, label: '付' },
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
    const label = ctn.ctnCodeName?.trim();
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
    { type: 'seq' as const, width: 50, title: '序号' },
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
    .reduce((sum, f) => sum + (f.unSettledAmount ?? 0), 0);
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
