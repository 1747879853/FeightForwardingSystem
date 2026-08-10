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

/** 费用状态选项 */
export const FeeStatusOptions = [
  { label: '录入状态', value: 0 },
  { label: '提交审核', value: 1 },
  { label: '审核通过', value: 2 },
  { label: '审核驳回', value: 3 },
];

/** 业务类型选项 */
export const BizTypeOptions = [
  { label: '海运出口', value: 0 },
  { label: '海运进口', value: 1 },
  { label: '空运出口', value: 2 },
];

/** 是否结算选项 */
export const SettlementStatusOptions = [
  { label: '已结算', value: 2 },
  { label: '未结算', value: 0 },
];

/** 费用状态标签映射 */
export const FeeStatusLabelMap: Record<number, string> = {
  0: '录入状态',
  1: '提交审核',
  2: '审核通过',
  3: '部分结算',
  4: '结算完毕',
};

/** 结算状态标签映射 */
export const SettlementStatusLabelMap: Record<number, string> = {
  0: '未结算',
  1: '部分结算',
  2: '已结算',
};

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
    {
      component: 'Select',
      fieldName: 'FeeStatus',
      label: '费用状态',
      defaultValue: 2,
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
        options: FeeStatusOptions,
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
      component: 'UserSelect',
      fieldName: 'OperatorIds',
      label: '操作',
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
        mode: 'multiple',
        maxTagCount: 2,
      },
    },
    {
      component: 'UserSelect',
      fieldName: 'SaleIds',
      label: '销售',
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
        mode: 'multiple',
        maxTagCount: 2,
      },
    },
    {
      component: 'Select',
      fieldName: 'SettlementStatus',
      label: '是否结算',
      defaultValue: 0,
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
        options: SettlementStatusOptions,
      },
    },
  ];
}

/** 主表格固定列（业务层） */
export function useOrderFixedColumns() {
  return [
    { type: 'seq' as const, width: 80, title: '序号' },
    {
      field: 'commissionNum',
      title: '委托编号',
      width: 110,
      ellipsis: true,
    },
    {
      field: 'mblNum',
      title: '主提单号',
      width: 140,
      ellipsis: true,
    },
    {
      field: 'client.name',
      title: '委托单位',
      width: 140,
      ellipsis: true,
      customRender: ({ record }: any) => {
        return record.client?.name || '-';
      },
    },
    {
      field: 'bizType',
      title: '业务类型',
      width: 100,
      customRender: ({ record }: any) => {
        const bizTypeMap: Record<number, string> = {
          0: '海运出口',
          1: '海运进口',
          2: '空运出口',
          3: '空运进口',
          4: '陆运',
          5: '仓储',
        };
        return bizTypeMap[record.bizType] || '-';
      },
    },
    {
      field: 'operationUserNames',
      title: '操作',
      width: 120,
      ellipsis: true,
    },
    {
      field: 'saleUserNames',
      title: '销售',
      width: 120,
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
      customRender: ({ record }: any) => {
        // 优先从 seaExport.pol.portName 获取，其次从 polName 获取
        return record.seaExport?.pol?.portName || record.polName || '-';
      },
    },
    {
      field: 'podName',
      title: '目的港',
      width: 140,
      ellipsis: true,
      customRender: ({ record }: any) => {
        // 优先从 seaExport.pod.portName 获取，其次从 podName 获取
        return record.seaExport?.pod?.portName || record.podName || '-';
      },
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
      const name = fee.currency?.cnName ?? fee.currency?.code;
      if (fee.currencyId && name && !map.has(fee.currencyId)) {
        map.set(fee.currencyId, name);
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
    dataIndex?: string;
    title: string;
    width: number;
    align: 'left' | 'center' | 'right';
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
    // 提取操作人员名称
    operationUserNames: getOrderUserNamesByAttribute(
      order.orderUsers,
      PaymentApplicationAdminApi.UserAttribute.Operation,
    ),
    // 提取销售人员名称
    saleUserNames: getOrderUserNamesByAttribute(
      order.orderUsers,
      PaymentApplicationAdminApi.UserAttribute.Sale,
    ),
    // customerServiceUserNames: getOrderUserNamesByAttribute(
    //   order.orderUsers,
    //   PaymentApplicationAdminApi.UserAttribute.CustomerService,
    // ),
    // 添加嵌套的费用数据
    _fees: (order.orderFees ?? []).map((fee) => ({
      ...fee,
      _orderId: order.id,
    })),
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
