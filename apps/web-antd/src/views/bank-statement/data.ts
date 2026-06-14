import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { BankStatementAdminApi } from '#/api/settlement-management/bank-statement-admin';

import dayjs from 'dayjs';

/** 格式化日期时间到分钟 */
const formatDateTime = (value: string | undefined | null): string => {
  if (!value) return '-';
  return dayjs(value).format('YYYY-MM-DD HH:mm');
};

/** 格式化金额，保留两位小数 */
const formatAmount = (value: number | undefined | null): string => {
  if (value === undefined || value === null) return '-';
  return value.toFixed(2);
};

/** 收费结算状态枚举 */
export const receiveSettlementStatusMap: Record<
  number,
  { label: string; color: string }
> = {
  0: { label: '录入中', color: 'default' },
  1: { label: '审核中', color: 'processing' },
  2: { label: '已驳回', color: 'error' },
  3: { label: '审核通过', color: 'success' },
  4: { label: '部分结算', color: 'warning' },
  5: { label: '已结算', color: 'success' },
};

/** 拼接操作人名称 */
const formatOperators = (
  users: BankStatementAdminApi.BankStatementUserDto[] | undefined,
): string => {
  if (!users || users.length === 0) return '-';
  return users.map((u) => u.operationName || String(u.operationId)).join(' / ');
};

/** 取第一个公司名称 */
const formatCompany = (
  companys: { displayName?: string }[] | undefined,
): string => {
  if (!companys || companys.length === 0) return '-';
  return companys[0]?.displayName || '-';
};

/** 列表表格列配置 */
export function useColumns(): VxeTableGridOptions['columns'] {
  return [
    {
      type: 'checkbox',
      width: 50,
      fixed: 'left',
    },
    {
      field: 'bankStatementNo',
      title: '流水号',
      minWidth: 160,
      fixed: 'left',
    },
    {
      field: 'statementTime',
      title: '交易时间',
      width: 150,
      formatter: ({ cellValue }) => formatDateTime(cellValue),
    },
    {
      field: 'settlementName',
      title: '付款方',
      minWidth: 150,
    },
    {
      field: 'amount',
      title: '总金额',
      width: 120,
      align: 'right',
      formatter: ({ cellValue }) => formatAmount(cellValue),
    },
    {
      field: 'currencyCode',
      title: '币别',
      width: 80,
    },
    {
      field: 'orgBankAccountName',
      title: '我司银行',
      minWidth: 150,
    },
    {
      field: 'transactionFee',
      title: '手续费',
      width: 100,
      align: 'right',
      formatter: ({ cellValue }) =>
        cellValue !== undefined && cellValue !== null
          ? Number(cellValue).toFixed(2)
          : '-',
    },
    {
      field: 'bankStatementUsers',
      title: '操作人',
      minWidth: 120,
      formatter: ({ cellValue }) => formatOperators(cellValue),
    },
    {
      field: 'companys',
      title: '所属公司',
      minWidth: 130,
      formatter: ({ cellValue }) => formatCompany(cellValue),
    },
    {
      field: 'creatorUserName',
      title: '创建人',
      width: 100,
    },
    {
      field: 'creationTime',
      title: '创建时间',
      width: 150,
      formatter: ({ cellValue }) => formatDateTime(cellValue),
    },
    {
      field: 'statementRemark',
      title: '交易备注',
      minWidth: 180,
      showOverflow: true,
    },
  ];
}

/** 查询表单配置 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'bankStatementNo',
      label: '流水号',
      componentProps: {
        placeholder: '请输入流水号',
        allowClear: true,
      },
    },
    {
      component: 'ClientSelect',
      fieldName: 'settlementId',
      label: '结算对象',
      componentProps: {
        placeholder: '请选择结算对象',
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'CurrencySelect',
      fieldName: 'currencyId',
      label: '币别',
      componentProps: {
        placeholder: '请选择币别',
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'RangePicker',
      fieldName: 'statementTimeRange',
      label: '交易时间',
      formItemClass: 'col-span-2',
      componentProps: {
        placeholder: ['开始时间', '结束时间'],
        showTime: false,
        format: 'YYYY-MM-DD',
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'UserSelect',
      fieldName: 'creatorUserId',
      label: '创建人',
      componentProps: {
        placeholder: '请选择创建人',
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'OrganizationSelect',
      fieldName: 'orgId',
      label: '组织',
      componentProps: {
        placeholder: '请选择组织',
        allowClear: true,
        class: 'w-full',
      },
    },
  ];
}
