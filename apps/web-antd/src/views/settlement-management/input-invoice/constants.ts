import type { GroupFieldDef } from '#/components/list-grouping';

import { InputInvoiceAdminApi as Api } from '#/api/settlement-management/input-invoice-admin';

/**
 * 进项发票枚举标签 / 下拉选项 / 分组字段配置。
 *
 * 标签统一从数字枚举反查（TS 数字枚举自带 value→name 反向映射），
 * 保证与后端枚举名一致、避免手写映射漏项或错值。
 */

/** 从数字枚举对象反查中文标签 */
function enumLabel(
  enumObj: Record<string, any>,
  value?: null | number,
): string {
  if (value === null || value === undefined) return '-';
  const label = enumObj[value];
  return typeof label === 'string' ? label : String(value);
}

/** 由数字枚举对象生成下拉 options（按数值升序，过滤掉反向映射产生的名称键） */
function enumOptions(
  enumObj: Record<string, any>,
): { label: string; value: number }[] {
  return Object.keys(enumObj)
    .filter((key) => !Number.isNaN(Number(key)))
    .map((key) => ({ label: enumObj[key] as string, value: Number(key) }))
    .sort((a, b) => a.value - b.value);
}

/** 布尔下拉（「不筛」由 clearable 提供，不额外放 undefined 项） */
export const boolOptions = [
  { label: '是', value: true },
  { label: '否', value: false },
];

// ==================== 标签 getter ====================

export const getInvoiceLineLabel = (v?: null | number) =>
  enumLabel(Api.InputInvoiceLine, v);
export const getInvoiceStatusLabel = (v?: null | number) =>
  enumLabel(Api.InputInvoiceStatus, v);
export const getInvoiceTypeLabel = (v?: null | number) =>
  enumLabel(Api.InputInvoiceType, v);
export const getLevelLabel = (v?: null | number) =>
  enumLabel(Api.InputInvoiceLevel, v);
export const getSpecialTypeLabel = (v?: null | number) =>
  enumLabel(Api.InputInvoiceSpecialType, v);
export const getCheckedStatusLabel = (v?: null | number) =>
  enumLabel(Api.InputInvoiceCheckedStatus, v);
export const getReimbursementStatusLabel = (v?: null | number) =>
  enumLabel(Api.InputInvoiceReimbursementStatus, v);
export const getSignStatusLabel = (v?: null | number) =>
  enumLabel(Api.InputInvoiceSignStatus, v);
export const getEnterAccountStatusLabel = (v?: null | number) =>
  enumLabel(Api.InputInvoiceEnterAccountStatus, v);
export const getManagementStatusLabel = (v?: null | number) =>
  enumLabel(Api.InputInvoiceManagementStatus, v);
export const getGeneralTypeLabel = (v?: null | number) =>
  enumLabel(Api.InputInvoiceGeneralType, v);
export const getVoucherSourceLabel = (v?: null | number) =>
  enumLabel(Api.InputInvoiceVoucherSource, v);
export const getEnterAccountDealStatusLabel = (v?: null | number) =>
  enumLabel(Api.InputInvoiceEnterAccountDealStatus, v);
export const getInternationalSignLabel = (v?: null | number) =>
  enumLabel(Api.InputInvoiceInternationalSign, v);
export const getZeroTaxRateFlagLabel = (v?: null | number) =>
  enumLabel(Api.InputInvoiceZeroTaxRateFlag, v);
export const getLinePropertyLabel = (v?: null | number) =>
  enumLabel(Api.InputInvoiceLineProperty, v);
export const getFavouredPolicyLabel = (v?: null | number) =>
  enumLabel(Api.InputInvoiceFavouredPolicy, v);
export const getIncludeTaxLabel = (v?: null | number) =>
  enumLabel(Api.InputInvoiceIncludeTax, v);
export const getPoolCheckedFilterLabel = (v?: null | number) =>
  enumLabel(Api.InputInvoicePoolCheckedFilter, v);
export const getPaymentApplicationStatusLabel = (v?: null | number) =>
  enumLabel(Api.PaymentApplicationStatus, v);
export const getInvoiceProcessLabel = (v?: null | number) =>
  enumLabel(Api.InvoiceProcess, v);

// ==================== 下拉 options ====================

export const invoiceLineOptions = enumOptions(Api.InputInvoiceLine);
export const invoiceStatusOptions = enumOptions(Api.InputInvoiceStatus);
export const invoiceTypeOptions = enumOptions(Api.InputInvoiceType);
export const levelOptions = enumOptions(Api.InputInvoiceLevel);
export const specialTypeOptions = enumOptions(Api.InputInvoiceSpecialType);
export const checkedStatusOptions = enumOptions(Api.InputInvoiceCheckedStatus);
export const reimbursementStatusOptions = enumOptions(
  Api.InputInvoiceReimbursementStatus,
);
export const signStatusOptions = enumOptions(Api.InputInvoiceSignStatus);
export const enterAccountStatusOptions = enumOptions(
  Api.InputInvoiceEnterAccountStatus,
);
export const poolCheckedFilterOptions = enumOptions(
  Api.InputInvoicePoolCheckedFilter,
);

// ==================== 分组字段 ====================

/**
 * 进项发票分组字段。
 * paramKey 既是「点击分组项后追加到列表查询」的参数名，也是与之互斥的搜索表单字段名；
 * emptyParamKey 对应「未填写」分组项（id/name 均为 null）追加的 *Empty=true。
 * 与文档「点某个分组回列表怎么传」的对应关系一致。
 */
export const INPUT_INVOICE_GROUP_FIELDS: GroupFieldDef[] = [
  {
    value: Api.InputInvoiceGroupField.InvoiceType,
    label: '发票类型',
    paramKey: 'invoiceType',
    emptyParamKey: 'invoiceTypeEmpty',
  },
  {
    value: Api.InputInvoiceGroupField.PayerName,
    label: '购方名称',
    paramKey: 'payerName',
    emptyParamKey: 'payerNameEmpty',
  },
  {
    value: Api.InputInvoiceGroupField.SellerHeader,
    label: '销方名称',
    paramKey: 'sellerHeader',
    emptyParamKey: 'sellerHeaderEmpty',
  },
];

/** 冲红状态集合（includeRedInvoice=true 命中的状态），用于列表状态着色 */
export const RED_INVOICE_STATUSES = new Set<number>([
  Api.InputInvoiceStatus.红冲,
  Api.InputInvoiceStatus.红字待确认,
  Api.InputInvoiceStatus.已部分冲红,
  Api.InputInvoiceStatus.已全部冲红,
]);
