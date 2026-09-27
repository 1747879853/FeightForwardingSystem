import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { toIsoEndOfDay, toIsoStartOfDay } from '#/utils/date-range-iso';
import { billStatusOptions } from './rules';

export function billColumns(): VxeTableGridOptions['columns'] {
  return [
    { type: 'checkbox', width: 45, fixed: 'left' },
    {
      field: 'seaExport.transportOrder.mblNum',
      title: '主提单号',
      minWidth: 180,
      fixed: 'left',
    },
    { field: 'seaExportSeparate.blNum', title: '分提单号', minWidth: 180 },
    {
      field: 'isSeparate',
      title: '主/分单',
      width: 90,
      sortable: false,
      cellRender: {
        name: 'CellTag',
        options: [
          { value: true, label: '分单' },
          { value: false, label: '主单' },
        ],
      },
    },
    {
      field: 'status',
      title: '提单状态',
      minWidth: 115,
      cellRender: { name: 'CellTag', options: billStatusOptions },
    },
    {
      field: 'codeIssueType.billType',
      title: '签单方式',
      minWidth: 110,
      sortable: false,
    },
    {
      field: 'isOriginal',
      title: '正本',
      width: 80,
      sortable: false,
      cellRender: {
        name: 'CellTag',
        options: [
          { value: true, label: '是' },
          { value: false, label: '否' },
        ],
      },
    },
    {
      field: 'settlement.name',
      title: '结算对象',
      minWidth: 150,
      sortable: false,
    },
    {
      field: 'seaExport.transportOrder.client.name',
      title: '委托单位',
      minWidth: 150,
    },
    {
      field: 'seaExport.transportOrder.commissionNum',
      title: '委托编号',
      minWidth: 150,
    },
    { field: 'seaExport.vessel', title: '船名', minWidth: 130 },
    { field: 'seaExport.innerVoyno', title: '船公司航次', minWidth: 110 },
    { field: 'seaExport.terminalVoyno', title: '码头航次', minWidth: 110 },
    {
      field: 'seaExport.transportOrder.etd',
      title: '开船日期',
      minWidth: 115,
      formatter: 'formatDate',
    },
    { field: 'seaExport.carrier.cnShortName', title: '船公司', minWidth: 120 },
    { field: 'seaExport.pol.portName', title: '起运港', minWidth: 130 },
    { field: 'seaExport.pod.portName', title: '目的港', minWidth: 130 },
    {
      field: 'seaExport.transportOrder.totalCtn',
      title: '主单箱型箱量',
      minWidth: 130,
      sortable: false,
    },
    {
      field: 'seaExportSeparate.totalCtn',
      title: '分单箱型箱量',
      minWidth: 130,
      sortable: false,
    },
    {
      field: 'unReceivedAmount',
      title: '未收金额',
      minWidth: 150,
      sortable: false,
      slots: { default: 'unReceivedAmount' },
    },
    { field: 'overdueDays', title: '超期天数', width: 95, sortable: false },
    {
      field: 'settlementDate',
      title: '应结日期',
      minWidth: 115,
      formatter: 'formatDate',
      sortable: false,
    },
    {
      field: 'promisePayDate',
      title: '承诺付款日期',
      minWidth: 120,
      formatter: 'formatDate',
    },
    {
      field: 'signIn.actionDate',
      title: '签入日期',
      minWidth: 115,
      formatter: 'formatDate',
      sortable: false,
    },
    {
      field: 'signOut.actionDate',
      title: '签出日期',
      minWidth: 115,
      formatter: 'formatDate',
      sortable: false,
    },
    {
      field: 'seaExport.transportOrder.orderUsers',
      title: '销售 / 操作',
      minWidth: 160,
      sortable: false,
      formatter: ({ cellValue }) =>
        (cellValue ?? [])
          .filter(
            (user: { userAttribute: number }) =>
              (user.userAttribute & 17) !== 0,
          )
          .map(
            (user: { userNickName: string; userAttribute: number }) =>
              `${user.userNickName}（${(user.userAttribute & 16) !== 0 ? '销售' : '操作'}）`,
          )
          .join('、'),
    },
  ];
}
const boolOptions = [
  { label: '是', value: true },
  { label: '否', value: false },
];
export function billSearchSchema(): VbenFormSchema[] {
  const fields: [
    string,
    string,
    VbenFormSchema['component'],
    Record<string, unknown>?,
  ][] = [
    ['BlNum', '提单号', 'Input'],
    ['Status', '提单状态', 'Select', { options: billStatusOptions }],
    ['ClientId', '委托单位', 'ClientSelect'],
    ['CodeIssueTypeId', '签单方式', 'CodeIssueTypeSelect'],
    ['CarrierId', '船公司', 'CarrierSelect'],
    ['Vessel', '船名', 'Input'],
    ['Voyno', '航次', 'Input'],
    ['ETDRange', '开船日期', 'RangePicker'],
    ['UserId', '业务员/操作', 'UserSelect'],
    ['CommissionNum', '委托编号', 'Input'],
    [
      'IsOverdueUnpaid',
      '超期未收',
      'Select',
      { options: [{ label: '超期未收', value: true }] },
    ],
    ['IsOverdue', '提交是否超期', 'Select', { options: boolOptions }],
    ['SignInDateRange', '签入日期', 'RangePicker'],
    ['SignOutDateRange', '签出日期', 'RangePicker'],
    [
      'IsSeparate',
      '主/分单',
      'Select',
      {
        options: [
          { label: '分单', value: true },
          { label: '主单', value: false },
        ],
      },
    ],
  ];
  return fields.map(([fieldName, label, component, props]) => ({
    fieldName,
    label,
    component,
    componentProps: { allowClear: true, class: 'w-full', ...props },
  }));
}
export function normalizeBillQuery(values: Record<string, unknown>) {
  const params = { ...values };
  for (const key of ['ETD', 'SignInDate', 'SignOutDate', 'SubmitTime']) {
    const range = params[`${key}Range`];
    if (Array.isArray(range)) {
      params[`${key}Start`] = toIsoStartOfDay(range[0]);
      params[`${key}End`] = toIsoEndOfDay(range[1]);
    }
    delete params[`${key}Range`];
  }
  return params;
}
