/** 打印数据源类型，与业务模块对应 */
export enum PrintJsonType {
  /** 海运出口详情 */
  SeaExportDetail = 0,
  /** 应收费用列表 */
  RecOrderFeeList = 1000,
  /** 应付费用列表 */
  PayOrderFeeList = 1500,
  /** 海运进口详情 */
  SeaImportDetail = 4000,
  /** 空运出口详情 */
  AirExportDetail = 5000,
  /** 空运进口详情 */
  AirImportDetail = 6000,
}
