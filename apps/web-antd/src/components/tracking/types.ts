/** 待订阅运踪的业务单基本信息（批量订阅入参与结果回显共用） */
export interface TrackingSubscribeRowInfo {
  /** 业务单 Id */
  id: string;
  /** 结果弹窗展示用标签，一般取委托编号 */
  orderLabel: string;
}

/** 订阅结果表格行（海运/空运统一后的结构，文案已做服务商清洗） */
export interface TrackingSubscribeResultRow {
  key: string;
  /** 业务单标签（委托编号 / 主提单号 / Id） */
  orderLabel: string;
  /** 实际上传的订阅号（单号 / 箱号 / 航司单号） */
  referenceNo: string;
  isSuccess: boolean;
  /** 结果标签文案 */
  statusText: string;
  /** 说明（失败原因或「数据获取中」提示），已清洗服务商名 */
  message: string;
}

/** 订阅结果汇总（供结果弹窗渲染） */
export interface TrackingSubscribeResultView {
  total: number;
  successCount: number;
  failedCount: number;
  rows: TrackingSubscribeResultRow[];
}

/** 运踪展示四态：未订阅 / 订阅失败 / 已订阅等数据 / 已有轨迹 */
export type TrackingViewState =
  | 'has_tracking'
  | 'never_subscribed'
  | 'subscribe_failed'
  | 'waiting_data';
