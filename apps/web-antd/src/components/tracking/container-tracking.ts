import type { FeituoTrackingAdminApi } from '#/api/tracking/feituo-tracking-admin';

import { $t } from '#/locales';

import type { TrackingViewState } from './types';

/** 列表行里与海运运踪有关的最小字段集合（海运出口/进口结构一致） */
export interface ContainerTrackingRowLike {
  id: number | string;
  isFeituoSubscribed?: boolean;
  isFeituoSubscribeSuccess?: boolean;
  feituoTracking?: FeituoTrackingAdminApi.ContainerTrackingSummaryDto | null;
  transportOrder?: {
    commissionNum?: null | string;
    mblNum?: null | string;
  } | null;
}

/** 运踪弹窗入参 */
export interface ContainerTrackingOpenPayload {
  orderId: string;
  bizType: FeituoTrackingAdminApi.TrackingBizType;
  orderLabel: string;
  isSubscribed?: boolean;
  isSubscribeSuccess?: boolean;
  summary?: FeituoTrackingAdminApi.ContainerTrackingSummaryDto | null;
}

/** 业务单展示标签：委托编号 → 主提单号 → Id */
export function resolveContainerOrderLabel(
  row: ContainerTrackingRowLike,
): string {
  return (
    row.transportOrder?.commissionNum?.trim() ||
    row.transportOrder?.mblNum?.trim() ||
    String(row.id)
  );
}

/** 由订阅状态与摘要推导运踪四态 */
export function resolveContainerTrackingViewState(
  row: ContainerTrackingRowLike,
): TrackingViewState {
  if (!row.isFeituoSubscribed) {
    return 'never_subscribed';
  }
  if (!row.isFeituoSubscribeSuccess) {
    return 'subscribe_failed';
  }
  return row.feituoTracking?.currentDescriptionCn?.trim()
    ? 'has_tracking'
    : 'waiting_data';
}

/**
 * 列表「运踪状态」列文案：有当前节点就展示节点中文描述（预计节点加后缀），
 * 否则按订阅状态回退。
 */
export function getContainerTrackingStatusLabel(
  row: ContainerTrackingRowLike,
): string {
  const summary = row.feituoTracking;
  const current = summary?.currentDescriptionCn?.trim();
  if (current) {
    return summary?.currentIsEsti === 'Y'
      ? `${current}${$t('tracking.status.estimatedSuffix')}`
      : current;
  }
  switch (resolveContainerTrackingViewState(row)) {
    case 'subscribe_failed': {
      return $t('tracking.status.subscribeFailed');
    }
    case 'waiting_data': {
      return $t('tracking.status.waitingData');
    }
    default: {
      return $t('tracking.status.notSubscribed');
    }
  }
}

/** 列表「运踪状态」列 Tag 颜色 */
export function getContainerTrackingStatusColor(
  row: ContainerTrackingRowLike,
): string {
  switch (resolveContainerTrackingViewState(row)) {
    case 'has_tracking': {
      return 'processing';
    }
    case 'subscribe_failed': {
      return 'error';
    }
    case 'waiting_data': {
      return 'warning';
    }
    default: {
      return 'default';
    }
  }
}

/** 主提单号列预警叹号的绑定属性 */
export function buildContainerWarningProps(row: ContainerTrackingRowLike) {
  const summary = row.feituoTracking;
  return {
    hasWarning: Boolean(summary?.hasWarning),
    warningCount: summary?.warningCount ?? 0,
    description: summary?.latestWarningDescription ?? '',
    time: summary?.latestWarningTime ?? '',
  };
}

/** 打开运踪弹窗所需的 payload */
export function buildContainerTrackingPayload(
  row: ContainerTrackingRowLike,
  bizType: FeituoTrackingAdminApi.TrackingBizType,
): ContainerTrackingOpenPayload {
  return {
    orderId: String(row.id),
    bizType,
    orderLabel: resolveContainerOrderLabel(row),
    isSubscribed: row.isFeituoSubscribed,
    isSubscribeSuccess: row.isFeituoSubscribeSuccess,
    summary: row.feituoTracking ?? null,
  };
}
