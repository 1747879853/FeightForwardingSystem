import type { FeituoTrackingAdminApi } from '#/api/tracking/feituo-tracking-admin';

import { $t } from '#/locales';

import type { TrackingViewState } from './types';

/** 列表行里与空运运踪有关的最小字段集合 */
export interface AirTrackingRowLike {
  id: number | string;
  isFeituoSubscribed?: boolean;
  isFeituoSubscribeSuccess?: boolean;
  feituoTracking?: FeituoTrackingAdminApi.AirTrackingSummaryDto | null;
  transportOrder?: {
    commissionNum?: null | string;
    mblNum?: null | string;
  } | null;
}

/** 空运运踪弹窗入参 */
export interface AirTrackingOpenPayload {
  airExportId: string;
  orderLabel: string;
  isSubscribed?: boolean;
  isSubscribeSuccess?: boolean;
  summary?: FeituoTrackingAdminApi.AirTrackingSummaryDto | null;
}

/** 业务单展示标签：委托编号 → 主运单号 → Id */
export function resolveAirTrackingOrderLabel(row: AirTrackingRowLike): string {
  return (
    row.transportOrder?.commissionNum?.trim() ||
    row.transportOrder?.mblNum?.trim() ||
    String(row.id)
  );
}

/** 由订阅状态与摘要推导运踪四态 */
export function resolveAirTrackingViewState(
  row: AirTrackingRowLike,
): TrackingViewState {
  if (!row.isFeituoSubscribed) {
    return 'never_subscribed';
  }
  if (!row.isFeituoSubscribeSuccess) {
    return 'subscribe_failed';
  }
  return row.feituoTracking?.currentDescription?.trim()
    ? 'has_tracking'
    : 'waiting_data';
}

/**
 * 列表「运踪状态」列文案。
 * 空运当前节点可能是预计事件（`currentEventClassifier = EST`），此时加「（预计）」后缀区分。
 */
export function getAirTrackingStatusLabel(row: AirTrackingRowLike): string {
  const summary = row.feituoTracking;
  const current = summary?.currentDescription?.trim();
  if (current) {
    return summary?.currentEventClassifier === 'EST'
      ? `${current}${$t('tracking.status.estimatedSuffix')}`
      : current;
  }
  switch (resolveAirTrackingViewState(row)) {
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
export function getAirTrackingStatusColor(row: AirTrackingRowLike): string {
  switch (resolveAirTrackingViewState(row)) {
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

/** 主运单号列预警叹号的绑定属性 */
export function buildAirWarningProps(row: AirTrackingRowLike) {
  const summary = row.feituoTracking;
  return {
    hasWarning: Boolean(summary?.hasWarning),
    warningCount: summary?.warningCount ?? 0,
    description: summary?.latestWarningDescription ?? '',
    time: summary?.latestWarningTime ?? '',
  };
}

/** 打开空运运踪弹窗所需的 payload */
export function buildAirTrackingPayload(
  row: AirTrackingRowLike,
): AirTrackingOpenPayload {
  return {
    airExportId: String(row.id),
    orderLabel: resolveAirTrackingOrderLabel(row),
    isSubscribed: row.isFeituoSubscribed,
    isSubscribeSuccess: row.isFeituoSubscribeSuccess,
    summary: row.feituoTracking ?? null,
  };
}
