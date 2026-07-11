import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';
import type { YundangAdminApi } from '#/api/yundang/yundang-admin';

import { useVbenModal } from '@vben/common-ui';

import { $t } from '#/locales';

import YundangTrackingModal from './modules/yundang-tracking-modal.vue';
import { getYundangSubscribeStatus } from './use-yundang-ocean-subscribe';

export type YundangViewState =
  | 'has_shipment'
  | 'never_subscribed'
  | 'subscribe_failed'
  | 'waiting_push';

export interface YundangTrackRowInfo {
  id: string;
  isYundangSubscribed?: boolean | null;
  isYundangSubscribeSuccess?: boolean | null;
  yundangTrackStatus?: null | string;
  commissionNum?: null | string;
  mblNum?: null | string;
  bookingNum?: null | string;
}

export interface YundangTrackingOpenPayload {
  seaExportId: string;
  orderLabel?: string;
  isYundangSubscribed?: boolean | null;
  isYundangSubscribeSuccess?: boolean | null;
}

export function buildYundangTrackRow(
  row: SeaExportAdminApi.SeaExportDto,
): YundangTrackRowInfo {
  return {
    id: String(row.id),
    isYundangSubscribed: row.isYundangSubscribed,
    isYundangSubscribeSuccess: row.isYundangSubscribeSuccess,
    yundangTrackStatus: row.yundangTrackStatus,
    commissionNum: row.transportOrder?.commissionNum,
    mblNum: row.transportOrder?.mblNum,
    bookingNum: row.transportOrder?.bookingNum,
  };
}

export function resolveOrderLabel(row: YundangTrackRowInfo): string {
  return (
    row.commissionNum?.trim() ||
    row.mblNum?.trim() ||
    row.bookingNum?.trim() ||
    row.id
  );
}

/**
 * 结合列表状态字段与推送查询结果推导运踪面板四态。
 */
export function resolveYundangViewState(
  row: {
    isYundangSubscribeSuccess?: boolean | null;
    isYundangSubscribed?: boolean | null;
  },
  pushInfo?: null | YundangAdminApi.YundangOceanPushInfoDto,
): YundangViewState {
  if (!row.isYundangSubscribed) {
    return 'never_subscribed';
  }
  if (!row.isYundangSubscribeSuccess) {
    return 'subscribe_failed';
  }
  if (!pushInfo?.shipment) {
    return 'waiting_push';
  }
  return 'has_shipment';
}

function resolveLatestStatusFromShipment(
  shipment: YundangAdminApi.YundangShipmentInfoDto,
): string | undefined {
  if (shipment.trackStatus?.trim()) {
    return shipment.trackStatus.trim();
  }
  const currentNode = shipment.oceanNodes?.find((node) => node.isCurrent);
  if (currentNode?.stateDescCN?.trim()) {
    return currentNode.stateDescCN.trim();
  }
  if (currentNode?.stateDesc?.trim()) {
    return currentNode.stateDesc.trim();
  }
  const firstContainer = shipment.containers?.[0];
  if (firstContainer?.currentStatus?.trim()) {
    return firstContainer.currentStatus.trim();
  }
  return undefined;
}

/**
 * 列表「运踪状态」列展示文案：优先列表字段 / 推送详情，否则按订阅状态回退。
 */
export function getYundangTrackStatusLabel(
  row: YundangTrackRowInfo,
  pushInfo?: null | YundangAdminApi.YundangOceanPushInfoDto,
): string {
  if (pushInfo?.shipment) {
    const latest = resolveLatestStatusFromShipment(pushInfo.shipment);
    if (latest) {
      return latest;
    }
  }
  if (row.yundangTrackStatus?.trim()) {
    return row.yundangTrackStatus.trim();
  }

  const subscribeStatus = getYundangSubscribeStatus(row);
  switch (subscribeStatus) {
    case 'failed': {
      return $t('seaExport.yundang.trackStatus.subscribeFailed');
    }
    case 'success': {
      return $t('seaExport.yundang.trackStatus.waitingPush');
    }
    default: {
      return $t('seaExport.yundang.trackStatus.notSubscribed');
    }
  }
}

export function getYundangTrackStatusColor(
  row: YundangTrackRowInfo,
  pushInfo?: null | YundangAdminApi.YundangOceanPushInfoDto,
): string {
  const viewState = resolveYundangViewState(row, pushInfo);
  switch (viewState) {
    case 'has_shipment': {
      return 'processing';
    }
    case 'subscribe_failed': {
      return 'error';
    }
    case 'waiting_push': {
      return 'warning';
    }
    default: {
      return 'default';
    }
  }
}

export function useYundangOceanTrack() {
  const [TrackingModal, trackingModalApi] = useVbenModal({
    connectedComponent: YundangTrackingModal,
    destroyOnClose: true,
  });

  const openTracking = (payload: YundangTrackingOpenPayload) => {
    trackingModalApi.setData(payload).open();
  };

  return {
    TrackingModal,
    openTracking,
  };
}
