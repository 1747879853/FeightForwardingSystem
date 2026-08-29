/**
 * 兼容层：费用录入模块 data.ts 已抽取至 _shared/order-fee/data.ts。
 * 外部引用（changeOrder、audit-approval、fee-management、OrderFeeTemplateAdmin 等）
 * 继续通过本路径导入，行为保持海运出口默认（i18n 前缀 seaExport.export）。
 */
export * from '#/views/_shared/order-fee/data';
