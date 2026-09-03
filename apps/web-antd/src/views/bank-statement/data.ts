import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { BankStatementAdminApi } from '#/api/settlement-management/bank-statement-admin';
import { BankStatementAdminApi as BankStatementApi } from '#/api/settlement-management/bank-statement-admin';
import { createKeysSearchSchema } from '#/utils/keys-search';

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

/** 银行流水核销状态枚举 */
export const bankStatementWriteOffStatusMap: Record<
  number,
  { label: string; color: string }
> = {
  [BankStatementApi.BankStatementWriteOffStatus.PendingWriteOff]: {
    label: '待核销',
    color: 'default',
  },
  [BankStatementApi.BankStatementWriteOffStatus.PartialWriteOff]: {
    label: '部分核销',
    color: 'warning',
  },
  [BankStatementApi.BankStatementWriteOffStatus.WriteOffCompleted]: {
    label: '核销完成',
    color: 'success',
  },
};

/** 核销状态下拉选项 */
export function getBankStatementWriteOffStatusOptions() {
  return Object.entries(bankStatementWriteOffStatusMap).map(
    ([value, { label }]) => ({
      label,
      value: Number(value),
    }),
  );
}

/** 获取核销状态展示信息 */
export function getBankStatementWriteOffStatusInfo(
  status: number | undefined | null,
): { label: string; color: string } {
  if (status === undefined || status === null) {
    return { label: '-', color: 'default' };
  }
  return (
    bankStatementWriteOffStatusMap[status] ?? {
      label: String(status),
      color: 'default',
    }
  );
}

/** 拼接操作人名称 */
const formatOperators = (
  users: BankStatementAdminApi.BankStatementUserDto[] | undefined,
): string => {
  if (!users || users.length === 0) return '-';
  return (
    users
      .map((u) => u.operationName)
      .filter(Boolean)
      .join(' / ') || '-'
  );
};

/** 取组织串末端（直属组织）名称 */
const formatOrgs = (orgs: { name?: string }[] | null | undefined): string => {
  if (!orgs || orgs.length === 0) return '-';
  return orgs.at(-1)?.name || '-';
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
      sortable: true,
    },
    {
      field: 'statementTime',
      title: '交易时间',
      width: 150,
      formatter: ({ cellValue }) => formatDateTime(cellValue),
      sortable: true,
    },
    {
      field: 'settlementName',
      title: '付款方',
      minWidth: 150,
      sortable: true,
      formatter: ({ row }) => row.settlement?.name || '-',
    },
    {
      field: 'amount',
      title: '总金额',
      width: 120,
      align: 'right',
      formatter: ({ cellValue }) => formatAmount(cellValue),
      sortable: true,
    },
    {
      field: 'settledAmount',
      title: '已结算金额',
      width: 120,
      align: 'right',
      formatter: ({ cellValue }) => formatAmount(cellValue),
      sortable: true,
    },
    {
      field: 'writeOffStatus',
      title: '核销状态',
      width: 100,
      slots: { default: 'writeOffStatus' },
      sortable: true,
    },
    {
      field: 'currency.code',
      title: '币别',
      width: 80,
      sortable: true,
    },
    {
      field: 'orgBankAccount.bankName',
      title: '我司银行',
      minWidth: 150,
      sortable: true,
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
      sortable: true,
    },
    {
      field: 'bankStatementUsers',
      title: '操作人',
      minWidth: 120,
      formatter: ({ cellValue }) => formatOperators(cellValue),
      sortable: false,
    },
    {
      field: 'orgs',
      title: '归属组织',
      minWidth: 130,
      formatter: ({ cellValue }) => formatOrgs(cellValue),
      sortable: false,
    },
    {
      field: 'creatorUserName',
      title: '创建人',
      width: 100,
      sortable: true,
    },
    {
      field: 'creationTime',
      title: '创建时间',
      width: 150,
      formatter: ({ cellValue }) => formatDateTime(cellValue),
      sortable: true,
    },
    {
      field: 'statementRemark',
      title: '交易备注',
      minWidth: 180,
      showOverflow: true,
      sortable: true,
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
    createKeysSearchSchema({
      fieldName: 'keys',
      label: '流水号精确搜索',
      help: '精确匹配流水号，可粘贴多个（逗号/空格/换行分隔）',
    }),
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
      component: 'Select',
      fieldName: 'writeOffStatus',
      label: '核销状态',
      componentProps: {
        placeholder: '请选择核销状态',
        allowClear: true,
        options: getBankStatementWriteOffStatusOptions(),
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
