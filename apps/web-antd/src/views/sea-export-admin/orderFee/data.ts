import { $t } from '#/locales';
import dayjs from 'dayjs';
import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';
import type { OrderFeeAdminApi } from '#/api/sea-export/order-fee-admin';
import { h } from 'vue';
// --------------------------------------------------------
// 数据录入方式
// --------------------------------------------------------
export const getDataEntryMethodOptions = () => [
  { value: 0, label: '手动录入' },
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
export const getUnitEmumOptions = () => [
  { value: 0, label: '箱' },
  { value: 1, label: '件' },
  { value: 2, label: '台' },
  { value: 3, label: '托盘' },
  { value: 4, label: '集装箱' },
  { value: 5, label: '吨' },
  { value: 6, label: '立方米' },
  { value: 7, label: '千克' },
  { value: 8, label: '升' },
  { value: 9, label: '捆' },
  { value: 10, label: '袋' },
  { value: 11, label: '卷' },
  { value: 12, label: '套' },
];

// --------------------------------------------------------
// 开票状态
// --------------------------------------------------------
export const getInvoiceStatusOptions = () => [
  { value: 0, label: '未开票' },
  { value: 1, label: '部分开票' },
  { value: 2, label: '已开票' },
];

// --------------------------------------------------------
// 费用状态
// --------------------------------------------------------
export const getFeeStatusOptions = () => [
  { value: 0, label: '录入状态', color: '#b8cdd7' },
  { value: 1, label: '提交审核', color: '#ffc107' },
  { value: 2, label: '审核通过', color: '#67c23a' },
  { value: 3, label: '驳回', color: '#f56c6c' },
  { value: 4, label: '申请修改', color: '#ff9900' },
  { value: 5, label: '申请删除', color: '#ff9900' },
  { value: 6, label: '部分结算', color: '#909399' },
  { value: 7, label: '结算完毕', color: '#67c23a' },
];

export const getFeeStatusValue = {
  Entering: 0,
  Submit: 1,
  Approved: 2,
  Rejected: 3,
  ApplyModify: 4,
  ApplyDelete: 5,
  PartialSettlement: 6,
  Settled: 7,
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
  { value: 3, label: '商务' },
  { value: 4, label: '销售' },
  { value: 5, label: '财务' },
  { value: 6, label: '海外客服' },
  { value: 7, label: '人事' },
];

// --------------------------------------------------------
// 行业类别
// --------------------------------------------------------
export const getIndustryCategoryOptions = () => [
  { value: 0, label: '船公司' },
  { value: 1, label: '发货人' },
  { value: 2, label: '场站' },
  { value: 3, label: '航空公司' },
  { value: 4, label: '收货人' },
  { value: 5, label: '报关行' },
  { value: 6, label: '快递公司' },
  { value: 7, label: '通知人' },
  { value: 8, label: '车队' },
  { value: 9, label: '贸易商' },
  { value: 10, label: '代理' },
  { value: 11, label: '其他' },
  { value: 12, label: '供应商' },
  { value: 13, label: '船代' },
  { value: 14, label: '订舱代理' },
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
  { value: 1, label: 'RMB' },
  { value: 2, label: 'USD' },
];

export const getCurrencyEnumSymbolOptions = () => [
  { value: 1, label: '￥' },
  { value: 2, label: '$' },
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
// 贸易条款
// --------------------------------------------------------
export const getTradeTermsTypeOptions = () => [
  { value: 0, label: '订舱' },
  { value: 1, label: '拖车' },
  { value: 2, label: '报关' },
  { value: 3, label: '仓库' },
  { value: 4, label: '保险' },
  { value: 5, label: '代收支' },
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
      field: 'feeStatus',
      width: 90,
      cellRender: {
        name: 'CellTag',
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
      cellRender: {
        name: 'CellTag',
        options: getIndustryCategoryOptions(),
      },
    },
    {
      title: $t('seaExport.export.orderFee.settlement'),

      field: 'settlementName',
      minWidth: 110,
    },
    {
      title: $t('seaExport.export.orderFee.currency'),

      field: 'currencyName',
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

      field: 'unitEmum',
      minWidth: 60,
      cellRender: {
        name: 'CellTag',
        options: getUnitEmumOptions(),
      },
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

      field: 'canInvoice',
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
      cellRender: {
        name: 'CellCustom',
      },
    },
    {
      title: $t('auditApproval.task.auditUserName'),
      field: 'task.auditUserName',

      width: 110,
    },
    {
      title: $t('auditApproval.task.auditTime'),
      field: 'task.auditTime',

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
