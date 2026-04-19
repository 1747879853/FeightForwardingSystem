import type { VbenFormSchema } from '#/adapter/form';

import type { StatementAdminApi } from '#/api/settlement-management/statement-admin';
import type { OrderFeeAdminApi } from '#/api/sea-export/order-fee-admin';
import { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';
import { $t } from '#/locales';

/** 组件 Props */
export interface AddFeeDrawerProps {
  /** 结算对象 id（由外层表单传入） */
  settlementId?: string;
  /** 已选费用 id 数组（不可编辑） */
  selectedFeeIds?: string[];
  /** 当前对账单 id，排除已选费用 */
  statementNum?: string;
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
  currencyName?: string;
  settlementId: string;
  settlementName?: string;
  amount: number;
  /** 已结算金额 */
  settledAmount: number;
  unSettledAmount: number;
  /** 原始汇率 */
  exchangeRate?: number;
}

/** 费用行数据（展开子表格行） */
export interface FeeRowData extends OrderFeeAdminApi.OrderFeeDto {
  /** 本次结算金额 */
  appliedAmount: number;
}

/** 币别汇总信息（动态列用） */
export interface CurrencyInfo {
  currencyId: number;
  currencyName: string;
}

/** 搜索表单 schema */
export function useAddFeeSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'ClientSelect',
      fieldName: 'SettlementId',
      label: '客户名称',
      rules: 'required',
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
      component: 'RangePicker',
      fieldName: 'ETDRange',
      label: '业务日期',
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
    {
      component: 'CurrencySelect',
      fieldName: 'CurrencyId',
      label: '币别',
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
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
      width: 180,
      ellipsis: true,
    },
    {
      field: 'clientName',
      title: '委托单位',
      width: 200,
      ellipsis: true,
    },

    {
      field: 'accountDate',
      title: '会计日期',
      width: 130,
      formatter: 'formatDate' as const,
    },
    {
      field: 'polName',
      title: '起运港',
      width: 140,
      ellipsis: true,
    },
    {
      field: 'podName',
      title: '目的港',
      width: 140,
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
  orderUsers: SeaExportAdminApi.OrderUserDto[] | undefined,
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
  items: SeaExportAdminApi.TransportOrderDto[],
): CurrencyInfo[] {
  const map = new Map<number, string>();
  for (const order of items) {
    for (const fee of order.orderFees ?? []) {
      if (fee.currencyId && fee.currencyName && !map.has(fee.currencyId)) {
        map.set(fee.currencyId, fee.currencyName);
      }
    }
  }
  return [...map.entries()].map(([currencyId, currencyName]) => ({
    currencyId,
    currencyName,
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
      dataIndex: `currency_${c.currencyId}_receive`,
      title: `${c.currencyName}应收`,
      width: 120,
      align: 'right',
    });
    columns.push({
      field: `currency_${c.currencyId}_pay`,
      dataIndex: `currency_${c.currencyId}_pay`,
      title: `${c.currencyName}应付`,
      width: 120,
      align: 'right',
    });
    columns.push({
      field: `currency_${c.currencyId}_un_receive`,
      dataIndex: `currency_${c.currencyId}_un_receive`,
      title: `${c.currencyName}未收`,
      width: 120,
      align: 'right',
    });
    columns.push({
      field: `currency_${c.currencyId}_un_pay`,
      dataIndex: `currency_${c.currencyId}_un_pay`,
      title: `${c.currencyName}未付`,
      width: 120,
      align: 'right',
    });
  }
  console.log('buildDynamicCurrencyColumns', columns);
  return columns;
}

export function calcCurrencySummary(
  orderFees: OrderFeeAdminApi.OrderFeeDto[],
  currencyId: number,
  paySide: number,
): number {
  console.log('calcCurrencySummary', orderFees, currencyId, paySide);
  return orderFees
    .filter((f) => f.currencyId === currencyId && f.paySide === paySide)
    .reduce((sum, f) => sum + (f.unSettledAmount ?? 0), 0);
}

/** 将订单数据转为表格行（含动态币别字段） */
export function buildOrderRow(
  order: SeaExportAdminApi.TransportOrderDto,
  currencies: CurrencyInfo[],
): Record<string, any> {
  const row: Record<string, any> = {
    ...order,
    // saleUserNames: getOrderUserNamesByAttribute(
    //   order.orderUsers,
    //   PaymentApplicationAdminApi.UserAttribute.Sale,
    // ),
    // operationUserNames: getOrderUserNamesByAttribute(
    //   order.orderUsers,
    //   PaymentApplicationAdminApi.UserAttribute.Operation,
    // ),
    // customerServiceUserNames: getOrderUserNamesByAttribute(
    //   order.orderUsers,
    //   PaymentApplicationAdminApi.UserAttribute.CustomerService,
    // ),
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

/** PaySide 枚举选项 */
export const PaySideOptions = [
  { value: 0, label: '收' },
  { value: 1, label: '付' },
];

export function getPaySideLabel(value: number): string {
  return PaySideOptions.find((o) => o.value === value)?.label ?? '';
}
