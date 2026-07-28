import { $t } from '#/locales';
import dayjs from 'dayjs';
import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';
import type { OrderFeeAdminApi } from '#/api/sea-export/order-fee-admin';
import { h, ref } from 'vue';
import { Checkbox, Tag } from 'ant-design-vue';
import { getEnumItems } from '#/utils/init-enum';

// --------------------------------------------------------
// 费用编辑权限判断
// --------------------------------------------------------
/**
 * 判断费用是否可编辑
 * @param feeStatus 费用状态
 * @returns true 表示可编辑，false 表示不可编辑
 */
export const canEditFee = (feeStatus: number): boolean => {
  // 可编辑的状态：录入中(0)、审核驳回(3)、申请修改(4)、申请删除(5)
  const editableStatuses = [
    getFeeStatusValue.Entering, // 0 - 录入中
    getFeeStatusValue.Rejected, // 3 - 审核驳回
    getFeeStatusValue.ApplyModify, // 4 - 申请修改
    getFeeStatusValue.ApplyDelete, // 5 - 申请删除
  ];
  return editableStatuses.includes(feeStatus);
};

// --------------------------------------------------------
// 数据录入方式
// --------------------------------------------------------
export const getDataEntryMethodOptions = () => [
  { value: 0, label: '手动录入' },
  { value: 1, label: '历史引入' },
  { value: 2, label: '应收引入' },
  { value: 3, label: '应付引入' },
];

// --------------------------------------------------------
// 任务状态
// --------------------------------------------------------
export const getTaskStatusOptions = () => [
  { value: 0, label: '已提交/审核中' },
  { value: 1, label: '审核驳回' },
  { value: 2, label: '审核通过' },
];

// --------------------------------------------------------
// 任务类型
// --------------------------------------------------------
export const getTaskTypeOptions = () => [{ value: 0, label: '费用审核' }];

export const taskTypeMap = {
  feeSubmit: 0,
  feeModify: 1,
  feeDelete: 2,
};

// --------------------------------------------------------
// 单位
// --------------------------------------------------------
// export const getUnitEmumOptions = () => [
//   { value: 0, label: '箱' },
//   { value: 1, label: '件' },
//   { value: 2, label: '台' },
//   { value: 3, label: '托盘' },
//   { value: 4, label: '集装箱' },
//   { value: 5, label: '吨' },
//   { value: 6, label: '立方米' },
//   { value: 7, label: '千克' },
//   { value: 8, label: '升' },
//   { value: 9, label: '捆' },
//   { value: 10, label: '袋' },
//   { value: 11, label: '卷' },
//   { value: 12, label: '套' },
// ];

// --------------------------------------------------------
// 开票状态
// --------------------------------------------------------

// --------------------------------------------------------
// 费用状态
// --------------------------------------------------------

export const getFeeStatusValue = {
  Entering: 0,
  Submit: 1,
  Approved: 2,
  PartialSettlement: 3,
  Settled: 4,
  Rejected: 5,
  ApplyModify: 6,
  ApplyDelete: 7,
};

// --------------------------------------------------------
// 结算方式
// --------------------------------------------------------
export const getSettlementTypeOptions = () => [
  { value: 0, label: '票结' },
  { value: 1, label: '月结' },
  { value: 2, label: '约定天数' },
];

// --------------------------------------------------------
// 用户属性枚举 (展示用)
// --------------------------------------------------------
export const getUserAttributeEnumOptions = () => [
  { value: 0, label: '操作' },
  { value: 1, label: '客服' },
  { value: 2, label: '单证' },
  { value: 3, label: '商务(航线)' },
  { value: 4, label: '销售' },
  { value: 5, label: '财务' },
  { value: 6, label: '海外客服' },
  { value: 7, label: '人事' },
];

// --------------------------------------------------------
// 行业类别
// --------------------------------------------------------
/** 行业类别枚举选项（value 取字母，与 IndustryCategory 注释对应：a 船公司、b 发货人、c 场站…） */
export const getIndustryCategoryOptions = () => [
  // {
  //   key: 1,
  //   value: 'a',
  //   label: $t('seaExport.client.industryCategoryOptions.shipCompany'),
  // },
  {
    key: 2,
    value: 'b',
    label: $t('seaExport.client.industryCategoryOptions.shipper'),
  },
  {
    key: 3,
    value: 'c',
    label: $t('seaExport.client.industryCategoryOptions.terminal'),
  },
  {
    key: 4,
    value: 'd',
    label: $t('seaExport.client.industryCategoryOptions.airline'),
  },
  {
    key: 5,
    value: 'e',
    label: $t('seaExport.client.industryCategoryOptions.consignee'),
  },
  {
    key: 6,
    value: 'f',
    label: $t('seaExport.client.industryCategoryOptions.customsBroker'),
  },
  {
    key: 7,
    value: 'g',
    label: $t('seaExport.client.industryCategoryOptions.expressCompany'),
  },
  {
    key: 8,
    value: 'h',
    label: $t('seaExport.client.industryCategoryOptions.notifyParty'),
  },
  {
    key: 9,
    value: 'i',
    label: $t('seaExport.client.industryCategoryOptions.fleet'),
  },
  {
    key: 10,
    value: 'j',
    label: $t('seaExport.client.industryCategoryOptions.trader'),
  },
  {
    key: 11,
    value: 'k',
    label: $t('seaExport.client.industryCategoryOptions.agent'),
  },
  {
    key: 12,
    value: 'l',
    label: $t('seaExport.client.industryCategoryOptions.other'),
  },
  {
    key: 13,
    value: 'm',
    label: $t('seaExport.client.industryCategoryOptions.supplier'),
  },
  {
    key: 14,
    value: 'n',
    label: $t('seaExport.client.industryCategoryOptions.shippingAgent'),
  },
  {
    key: 15,
    value: 'o',
    label: $t('seaExport.client.industryCategoryOptions.bookingAgent'),
  },
  {
    key: 16,
    value: 'p',
    label: $t('seaExport.client.industryCategoryOptions.entrustingUnit'),
  },
  {
    key: 17,
    value: 'q',
    label: $t('seaExport.client.industryCategoryOptions.warehouse'),
  },
  {
    key: 18,
    value: 'r',
    label: $t('seaExport.client.industryCategoryOptions.insuranceCompany'),
  },
  {
    key: 19,
    value: 's',
    label: $t('seaExport.client.industryCategoryOptions.destinationAgent'),
  },
  {
    key: 20,
    value: 'u',
    label: $t('seaExport.client.industryCategoryOptions.factory'),
  },
];

// --------------------------------------------------------
// 客户性质
// --------------------------------------------------------
export const getClientTypeOptions = () => [
  { value: 0, label: '直客' },
  { value: 1, label: '同行' },
  { value: 2, label: '供应商' },
];

export const getTrueOfFlaseOptions = () => [
  { value: true, label: '是' },
  { value: false, label: '否' },
];

// --------------------------------------------------------
// 币别
// --------------------------------------------------------
export const getCurrencyEnumOptions = () => [
  { value: 9999, label: '合计' },
  { value: 1, label: 'RMB' },
  { value: 2, label: 'USD' },
  { value: 3, label: 'EUR' },
  { value: 4, label: 'INR' },
  { value: 5, label: 'JPY' },
  { value: 6, label: 'KRW' },
];

export const getCurrencyEnumSymbolOptions = () => [
  { value: 9999, key: 'RMB', label: '￥' },
  { value: 1, key: 'RMB', label: '￥' },
  { value: 2, key: 'USD', label: '$' },
  { value: 3, key: 'EUR', label: '€' },
  { value: 4, key: 'INR', label: '₹' },
  { value: 5, key: 'JPY', label: '¥' },
  { value: 6, key: 'KRW', label: '₩' },
];
// --------------------------------------------------------
// 费用类别
// --------------------------------------------------------
export const getFeeTypeOptions = () => [
  { value: 0, label: '海运' },
  { value: 1, label: '空运' },
  { value: 2, label: '陆运' },
  { value: 3, label: '仓库' },
  { value: 4, label: '报关' },
];

// --------------------------------------------------------
// 海出服务项
// --------------------------------------------------------
export const getServiceTypeOptions = () => [
  { value: 0, label: '订舱' },
  { value: 1, label: '拖车' },
  { value: 2, label: '报关' },
  { value: 3, label: '仓库' },
  { value: 4, label: '保险' },
  { value: 5, label: '代收支' },
];

// --------------------------------------------------------
// 订单类型
// --------------------------------------------------------
export const getBillTypeOptions = () => [
  { value: 0, label: '主票 M' },
  { value: 1, label: '分票' },
];

// --------------------------------------------------------
// 业务类型
// --------------------------------------------------------
export const getBizTypeOptions = () => [{ value: 0, label: '海运出口' }];

// --------------------------------------------------------
// 编号生成类型
// --------------------------------------------------------
export const getGenerateEnumOptions = () => [
  { value: 0, label: '自动生成的数字' },
  { value: 1, label: '固定字符串' },
  { value: 2, label: '用户名' },
  { value: 3, label: '四位年两位月两位日' },
  { value: 4, label: '两位年两位月两位日' },
  { value: 5, label: '四位年两位月' },
  { value: 6, label: '两位年两位月' },
];

// --------------------------------------------------------
// 零税率标识
// --------------------------------------------------------
export const getZeroTaxRateEnumOptions = () => [
  { value: 0, label: '非零税率' },
  { value: 1, label: '免征' },
  { value: 2, label: '不征收' },
  { value: 3, label: '普通零税率' },
  { value: 4, label: '出口退税' },
];

// --------------------------------------------------------
// 功能枚举
// --------------------------------------------------------
export const getManageTypeOptions = () => [
  { value: 0, label: '查询' },
  { value: 1, label: '编辑' },
];

// --------------------------------------------------------
// 数据权限枚举
// --------------------------------------------------------
export const getDataPermissionTypeOptions = () => [
  { value: 0, label: '自己' },
  { value: 1, label: '自己部门' },
  { value: 2, label: '自己公司' },
  { value: 3, label: '多人' },
  { value: 4, label: '部分' },
  { value: 5, label: '全部' },
];

// --------------------------------------------------------
// 模块枚举
// --------------------------------------------------------
export const getFrightModuleOptions = () => [{ value: 0, label: '海运出口' }];

// --------------------------------------------------------
// 表级别权限的比较操作符
// --------------------------------------------------------
export const getUserTablePermissionOperatorOptions = () => [
  { value: 0, label: '等于' },
  { value: 1, label: '不等于' },
  { value: 2, label: '包含' },
  { value: 3, label: '大于' },
  { value: 4, label: '小于' },
  { value: 5, label: '大于等于' },
  { value: 6, label: '小于等于' },
  { value: 7, label: '开头为' },
  { value: 8, label: '结尾为' },
];

// --------------------------------------------------------
// 计费时间类型
// --------------------------------------------------------
export const getFeeTimeTypeOptions = () => [
  { value: 0, label: '天' },
  { value: 1, label: '周' },
];

// --------------------------------------------------------
// 打印模板类型
// --------------------------------------------------------
export const getPrintTemplateTypeOptions = () => [
  { value: 0, label: '入库单' },
  { value: 1, label: '出库单' },
  { value: 2, label: '仓库月度对账' },
  { value: 3, label: '贸易商月度对账' },
];

// --------------------------------------------------------
// 收付类型
// --------------------------------------------------------
export const getPaySideOptions = () => [
  { value: 0, label: '应收费用' },
  { value: 1, label: '应付费用' },
];

// --------------------------------------------------------
// 出入类型
// --------------------------------------------------------
export const getInOutTypeOptions = () => [
  { value: 0, label: '出' },
  { value: 1, label: '入' },
];

export const industryCategoryMap: Record<number, string> = {
  0: 'a',
  1: 'b',
  2: 'c',
  3: 'd',
  4: 'e',
  5: 'f',
  6: 'g',
  7: 'h',
  8: 'i',
  9: 'j',
  10: 'k',
  11: 'l',
  12: 'm',
  13: 'n',
  14: 'o',
  15: 'p',
  16: 'q',
  17: 'r',
};

/**
 * 列表列配置（无操作列，第一列为 radio 单选列）
 */
export function useExpenseAllColumns(): VxeTableGridOptions<OrderFeeAdminApi.OrderFeeEditDto>['columns'] {
  return [
    { type: 'checkbox', width: 48, fixed: 'left' },
    {
      title: '保存状态',
      field: '_saveStatus',
      width: 80,
      align: 'center',
      slots: {
        default: ({ row }: any) => {
          // 如果 id 为空，显示未保存标识
          if (!row.id) {
            return h(Tag, { color: 'warning' }, () => '未保存');
          }
          return h(Tag, { color: 'success' }, () => '已保存');
        },
      },
    },
    {
      title: $t('seaExport.export.orderFee.invoiceStatus'),
      field: 'invoiceStatus',
      width: 80,
      cellRender: {
        name: 'CellTag',
        options: getInvoiceStatusOptions(),
      },
    },
    {
      title: $t('seaExport.export.orderFee.feeStatus'),
      align: 'center',
      field: 'combinedFeeStatus',
      minWidth: 100,
      cellRender: {
        name: 'CellFeeStatusTag',
        options: getFeeStatusOptions(),
      },
    },
    {
      title: $t('seaExport.export.orderFee.feecodeName'),

      field: 'feeCodeName',
      minWidth: 120,
    },
    {
      title: $t('seaExport.client.industryCategories'),

      field: 'industryCategory',
      minWidth: 110,
      slots: {
        default: ({ row }: any) => {
          // 如果行业类别为空、0 或 null，显示为空
          if (!row.industryCategory || row.industryCategory === 0) {
            return '';
          }
          const option = getIndustryCategoryOptions().find(
            (o) => o.key === row.industryCategory,
          );
          return option ? option.label : '';
        },
      },
    },
    {
      title: $t('seaExport.export.orderFee.settlement'),

      field: 'settlementName',
      minWidth: 80,
    },

    {
      title: $t('seaExport.export.orderFee.currency'),

      field: 'currencyCode',
      align: 'center',
      minWidth: 80,
    },
    {
      title: $t('seaExport.export.orderFee.ExchangeRate'),
      field: 'exchangeRate',
      align: 'center',
      width: 50,
    },
    {
      title: $t('seaExport.export.orderFee.unitPrice'),

      field: 'unitPriceStr',
      width: 100,
    },
    {
      title: $t('seaExport.export.orderFee.amount'),

      field: 'amountStr',
      minWidth: 80,
    },
    {
      title: $t('seaExport.export.orderFee.unitEmum'),

      field: 'unit',
      minWidth: 60,
      // cellRender: {
      //   name: 'CellTag',
      //   options: getUnitEmumOptions(),
      // },
    },
    {
      title: $t('seaExport.export.orderFee.quantity'),

      field: 'quantity',
      minWidth: 80,
    },
    {
      title: $t('seaExport.export.orderFee.taxRate'),

      field: 'taxRate',
      minWidth: 50,
    },
    {
      title: $t('seaExport.export.orderFee.noTaxUnitPrice'),

      field: 'noTaxUnitPriceStr',
      minWidth: 110,
    },
    {
      title: $t('seaExport.export.orderFee.noTaxAmount'),

      field: 'noTaxAmountStr',
      minWidth: 80,
    },
    {
      title: $t('seaExport.export.orderFee.rqstPaymentAmount'),

      field: 'rqstPaymentAmountStr',
      minWidth: 110,
    },
    {
      title: $t('seaExport.export.orderFee.invoicedAmount'),

      field: 'invoicedAmountStr',
      minWidth: 80,
    },
    {
      title: $t('seaExport.export.orderFee.orderInvoiceAmount'),

      field: 'orderInvoiceAmountStr',
      minWidth: 120,
    },
    {
      title: $t('seaExport.export.orderFee.settledAmount'),

      field: 'settledAmountStr',
      minWidth: 80,
    },
    {
      title: $t('seaExport.export.orderFee.canInvoice'),

      field: 'invoiceBlocked',
      minWidth: 90,
      cellRender: {
        name: 'CellTag',
        options: [
          { color: 'success', label: '是', value: true },
          { color: 'default', label: '否', value: false },
        ],
      },
    },
    {
      title: $t('seaExport.export.orderFee.isConfidential'),

      field: 'isConfidential',
      minWidth: 80,
      cellRender: {
        name: 'CellTag',
        options: [
          { color: 'success', label: '是', value: true },
          { color: 'default', label: '否', value: false },
        ],
      },
    },
    {
      title: $t('seaExport.export.orderFee.remark'),
      field: 'remark',
      minWidth: 150,
    },
    {
      title: $t('seaExport.export.orderFee.dataEntryMethod'),

      field: 'dataEntryMethod',
      minWidth: 110,
      cellRender: {
        name: 'CellTag',
        options: getDataEntryMethodOptions(),
      },
    },

    {
      title: $t('auditApproval.task.creatorUserName'),

      field: 'task.creatorUserName',
      width: 110,
    },
    {
      title: $t('auditApproval.task.createTime'),
      field: 'creationTime',
      width: 150,
      // cellRender: ({ text }) => {
      //   // 基本格式化
      //   return text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '';
      // },
      // cellRender: {
      //   name: 'span',
      //   content: ({ text }) => {
      //     return text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '';
      //   },
      // },
      // cellRender: {
      //   name: 'CellCustom',
      // },
    },
    {
      title: $t('auditApproval.task.auditUserName'),
      field: 'task.auditUserName',

      width: 110,
    },
    {
      title: $t('auditApproval.task.auditTime'),
      field: 'task.auditTime',
      formatter: 'formatDateTime',

      //renderCell: ({ text }) => {
      // 基本格式化
      //  return text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '';
      //  },
      width: 180,
    },
    {
      title: $t('auditApproval.task.AuditRemark'),
      field: 'task.remark',
      width: 150,
    },
  ];
}

/**
 * 列表列配置（无操作列，第一列为 radio 单选列）
 */

export function useOrderFeeColumns(
  type: number,
): VxeTableGridOptions<OrderFeeAdminApi.OrderFeeEditDto>['columns'] {
  return [
    // { type: 'checkbox', width: 48, fixed: 'left' },
    // {
    //   title: $t('common.index'),
    //   field: '_rowIndex',
    //   width: 60,
    //   align: 'center',
    //   slots: {
    //     default: ({ rowIndex }: any) => {
    //       return h('span', {}, String(rowIndex + 1));
    //     },
    //   },
    // },
    {
      title: $t('seaExport.export.orderFee.invoiceStatus'),
      field: 'invoiceStatus',
      width: 65,
      sortable: true,
      cellRender: {
        name: 'CellTag',
        options: getInvoiceStatusOptions(),
      },
    },
    {
      title: $t('seaExport.export.orderFee.feeStatus'),
      align: 'center',
      field: 'combinedFeeStatus',
      width: 75,
      sortable: true,
      cellRender: {
        name: 'CellFeeStatusTag',
        options: getFeeStatusOptions(),
      },
    },
    {
      title: $t('seaExport.export.orderFee.feecodeName'),

      field: 'feeCodeId',
      width: 150,
      sortable: true,
      cellRender: {
        name: 'CellFeeCodeSelect',
        props: {
          disabled: (row: any) => !canEditFee(row.feeStatus),
        },
      },
    },

    {
      title: $t('seaExport.client.industryCategories'),

      field: 'industryCategory',
      width: 100,
      sortable: true,
      cellRender: {
        name: 'CellIndustryCategorySelect',
        props: {
          disabled: (row: any) => !canEditFee(row.feeStatus),
        },
      },
    },
    {
      title: $t('seaExport.export.orderFee.settlement'),

      field: 'settlementId',
      width: 130,
      sortable: true,
      cellRender: {
        name: 'CellClientSelect',
        props: {
          disabled: (row: any) => !canEditFee(row.feeStatus),
        },
      },
    },

    {
      title: $t('seaExport.export.orderFee.currency'),

      field: 'currencyId',
      align: 'center',
      width: 60,
      sortable: true,
      cellRender: {
        name: 'CurrencySelect',
        props: {
          type: type,
          disabled: (row: any) => !canEditFee(row.feeStatus),
        },
      },
    },
    {
      title: $t('seaExport.export.orderFee.ExchangeRate'),
      field: 'exchangeRate',
      align: 'right',
      width: 60,
      sortable: true,
      cellRender: {
        name: 'CellInput',
        props: {
          disabled: (row: any) =>
            !canEditFee(row.feeStatus) || row['__isLocalCurrency'] === true,
        },
      },
    },
    {
      title: $t('seaExport.export.orderFee.unitPrice'),
      field: 'unitPrice',
      width: 80,
      align: 'right',
      sortable: true,
      cellRender: {
        name: 'CellInput',
        props: {
          disabled: (row: any) => !canEditFee(row.feeStatus),
        },
      },
    },
    {
      title: $t('seaExport.export.orderFee.amount'),
      field: 'amount',
      width: 100,
      align: 'right',
      sortable: true,
      cellRender: {
        name: 'CellInput',
        props: {
          disabled: (row: any) => !canEditFee(row.feeStatus),
        },
      },
    },
    {
      title: $t('seaExport.export.orderFee.unitEmum'),
      field: 'unit',
      width: 70,
      sortable: true,
      cellRender: {
        name: 'CellUnitSelect',
        props: {
          // 使用普通箭头函数，而不是 getter，确保函数不会被立即执行
          unitOptions: () => {
            const list = orderCtnListRef.value;
            console.log('🔍 [unitOptions函数] 当前箱型列表:', list);
            return list.map((ctn) => ({
              label: ctn.ctnCodeName,
              value: ctn.ctnCodeName,
            }));
          },
          disabled: (row: any) => !canEditFee(row.feeStatus),
        },
      },
    },
    {
      title: $t('seaExport.export.orderFee.quantity'),

      field: 'quantity',
      width: 70,
      align: 'right',
      sortable: true,
      cellRender: {
        name: 'CellInput',
        props: {
          disabled: (row: any) => !canEditFee(row.feeStatus),
        },
      },
    },
    {
      title: $t('seaExport.export.orderFee.taxRate'),

      field: 'taxRate',
      width: 60,
      align: 'right',
      sortable: true,
      cellRender: {
        name: 'CellInput',
        props: {
          disabled: (row: any) => !canEditFee(row.feeStatus),
        },
      },
    },
    {
      title: $t('seaExport.export.orderFee.noTaxUnitPrice'),
      field: 'noTaxUnitPrice',
      width: 90,
      align: 'right',
      sortable: true,
      formatter: ({ cellValue }: any) => {
        if (cellValue === null || cellValue === undefined || cellValue === '')
          return '';
        return Number(cellValue).toLocaleString('zh-CN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      },
    },
    {
      title: $t('seaExport.export.orderFee.noTaxAmount'),

      field: 'noTaxAmount',
      width: 100,
      align: 'right',
      sortable: true,
      formatter: ({ cellValue }: any) => {
        if (cellValue === null || cellValue === undefined || cellValue === '')
          return '';
        return Number(cellValue).toLocaleString('zh-CN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      },
    },
    {
      title: '对账单号',
      field: 'statementNum',
      width: 120,
      align: 'center',
      sortable: false,
      formatter: ({ row }: any) => {
        // 从 statement 对象中获取 statementNum
        if (row.statement && row.statement.statementNum) {
          return row.statement.statementNum;
        }
        return '';
      },
    },
    {
      title: $t('seaExport.export.orderFee.rqstPaymentAmount'),
      field: 'rqstPaymentAmount',
      width: 105,
      align: 'right',
      sortable: true,
      formatter: ({ cellValue }: any) => {
        if (cellValue === null || cellValue === undefined || cellValue === '')
          return '';
        return Number(cellValue).toLocaleString('zh-CN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      },
      cellRender: {
        name: 'CellInput',
        props: {
          disabled: (row: any) => true, // 申请付款金额不能修改
        },
      },
    },
    {
      title: $t('seaExport.export.orderFee.invoicedAmount'),
      field: 'invoicedAmount',
      width: 100,
      align: 'right',
      sortable: true,
      formatter: ({ cellValue }: any) => {
        if (cellValue === null || cellValue === undefined || cellValue === '')
          return '';
        return Number(cellValue).toLocaleString('zh-CN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      },
    },
    {
      title: $t('seaExport.export.orderFee.orderInvoiceAmount'),
      field: 'orderInvoiceAmount',
      width: 105,
      align: 'right',
      sortable: true,
      formatter: ({ cellValue }: any) => {
        if (cellValue === null || cellValue === undefined || cellValue === '')
          return '';
        return Number(cellValue).toLocaleString('zh-CN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      },
    },
    {
      title: $t('seaExport.export.orderFee.settledAmount'),
      field: 'settledAmount',
      width: 100,
      align: 'right',
      sortable: true,
      formatter: ({ cellValue }: any) => {
        if (cellValue === null || cellValue === undefined || cellValue === '')
          return '';
        return Number(cellValue).toLocaleString('zh-CN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      },
    },
    {
      title: $t('seaExport.export.orderFee.canInvoice'),

      field: 'invoiceBlocked',
      width: 75,
      align: 'center',
      sortable: true,
      slots: {
        default: ({ row }: any) => {
          return h(Checkbox, {
            checked: row.invoiceBlocked === true,
            disabled: !canEditFee(row.feeStatus),
            onChange: (e: any) => {
              row.invoiceBlocked = !e.target.checked;
            },
          });
        },
      },
    },
    {
      title: $t('seaExport.export.orderFee.isConfidential'),

      field: 'isConfidential',
      width: 75,
      align: 'center',
      sortable: true,
      slots: {
        default: ({ row }: any) => {
          return h(Checkbox, {
            checked: row.isConfidential === true,
            disabled: !canEditFee(row.feeStatus),
            onChange: (e: any) => {
              row.isConfidential = e.target.checked;
            },
          });
        },
      },
    },
    {
      title: $t('seaExport.export.orderFee.remark'),
      field: 'remark',
      width: 120,
      sortable: true,
      cellRender: {
        name: 'CellInput',
        props: {
          disabled: (row: any) => !canEditFee(row.feeStatus),
        },
      },
    },
    {
      title: $t('seaExport.export.orderFee.dataEntryMethod'),
      field: 'dataEntryMethod',
      width: 80,
      sortable: true,
      cellRender: {
        name: 'CellTag',
        options: getDataEntryMethodOptions(),
      },
    },

    {
      title: $t('auditApproval.task.creatorUserName'),
      field: 'creatorUserName',
      width: 90,
      sortable: true,
    },
    {
      title: $t('auditApproval.task.createTime'),
      field: 'creationTime',
      width: 155,
      sortable: true,
      formatter: 'formatDateTime',
    },
  ];
}

// --------------------------------------------------------
// 枚举数据缓存（用于表格列配置等需要同步访问的场景）
// --------------------------------------------------------
let invoiceStatusCache: Array<{ value: number; label: string }> = [];
let feeStatusCache: Array<{ value: number; label: string; color?: string }> =
  [];

/**
 * 初始化枚举数据缓存（在应用启动或组件挂载时调用）
 */
export async function initOrderFeeEnumCache() {
  try {
    const [invoiceItems, feeItems] = await Promise.all([
      getEnumItems('InvoiceStatus'),
      getEnumItems('FeeStatus'),
    ]);

    invoiceStatusCache = invoiceItems.map((item) => ({
      value: item.value,
      label: item.displayName || '',
      color: item.remark || undefined,
    }));

    feeStatusCache = feeItems.map((item) => ({
      value: item.value,
      label: item.displayName || '',
      color: item.remark || undefined,
    }));

    console.log('[OrderFee Enum Cache] 枚举数据缓存已更新');
  } catch (error) {
    console.error('[OrderFee Enum Cache] 枚举数据缓存更新失败:', error);
  }
}

/**
 * 获取开票状态选项（同步方法，用于表格列配置）
 */
export const getInvoiceStatusOptions = () => {
  return invoiceStatusCache.length > 0
    ? invoiceStatusCache
    : [
        { value: 0, label: '未开票' },
        { value: 1, label: '部分开票' },
        { value: 2, label: '已开票' },
      ];
};

/**
 * 获取费用状态选项（同步方法，用于表格列配置）
 */
export const getFeeStatusOptions = () => {
  return [
    { value: 0, label: '录入状态', color: '#b8cdd7', code: 'Entering' },
    { value: 1, label: '提交审核', color: '#ffc107', code: 'Submitted' },
    { value: 2, label: '审核通过', color: '#67c23a', code: 'Passed' },
    {
      value: 3,
      label: '部分结算',
      color: '#87CEEB', // 浅蓝色 (SkyBlue)
      code: 'PartialSettlement',
    },
    {
      value: 4,
      label: '结算完毕',
      color: '#1E90FF', // 蓝色 (DodgerBlue)
      code: 'Settlemented',
    },
    { value: 5, label: '驳回', color: '#f56c6c', code: 'Rejected' },
    { value: 6, label: '申请修改', color: '#ff9900', code: 'Modification' },
    { value: 7, label: '申请删除', color: '#ff9900', code: 'Deletion' },
  ];
};

export const getFeeStatusValueByLabel = (code: string): number | undefined => {
  const status = getFeeStatusOptions().find((item) => item.code === code);
  return status ? status.value : undefined;
};

/**
 * 海运出口列表组合费用状态（SeaExportFeeStatus）
 * 综合应收/应付及更改单费用、申请修改/删除、结算等判断
 */
export const getSeaExportFeeStatusOptions = () => [
  { value: 0, label: '录入状态', color: '#b8cdd7', code: 'Entering' },
  { value: 1, label: '提交审核', color: '#ffc107', code: 'Submitted' },
  { value: 2, label: '审核通过', color: '#67c23a', code: 'Passed' },
  {
    value: 3,
    label: '部分结算',
    color: '#87CEEB', // 浅蓝色 (SkyBlue)
    code: 'PartialSettlement',
  },
  {
    value: 4,
    label: '结算完毕',
    color: '#1E90FF', // 蓝色 (DodgerBlue)
    code: 'Settlemented',
  },
  { value: 5, label: '驳回', color: '#f56c6c', code: 'Rejected' },
  { value: 6, label: '申请修改', color: '#ff9900', code: 'Modification' },
  { value: 7, label: '申请删除', color: '#ff9900', code: 'Deletion' },
];

// --------------------------------------------------------
// 订单箱型列表（用于单位下拉框过滤）
// --------------------------------------------------------
export const orderCtnListRef = ref<
  Array<{ ctnCodeId: number; ctnCodeName: string }>
>([]);

/**
 * 设置订单箱型列表
 * @param ctnList 箱型列表
 */
export const setOrderCtnList = (
  ctnList: Array<{ ctnCodeId: number; ctnCodeName: string }>,
) => {
  orderCtnListRef.value = ctnList;
};

/**
 * 获取订单箱型列表
 */
export const getOrderCtnList = () => {
  return orderCtnListRef.value;
};
