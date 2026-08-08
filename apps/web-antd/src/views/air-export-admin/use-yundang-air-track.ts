import type { AirExportAdminApi } from '#/api/air-export/air-export-admin';
import type { YundangAirAdminApi } from '#/api/yundang/yundang-air-admin';

import { useVbenModal } from '@vben/common-ui';

import { $t } from '#/locales';

import YundangAirTrackingModal from './modules/yundang-air-tracking-modal.vue';
import { getYundangAirSubscribeStatus } from './use-yundang-air-subscribe';

export type YundangAirViewState =
  | 'has_shipment'
  | 'never_subscribed'
  | 'subscribe_failed'
  | 'waiting_push';

export interface YundangAirTrackRowInfo {
  id: string;
  isYundangSubscribed?: boolean | null;
  isYundangSubscribeSuccess?: boolean | null;
  yundangAirShipmentNode?: null | YundangAirAdminApi.YundangAirShipmentNodeInfoDto;
  commissionNum?: null | string;
  mblNum?: null | string;
}

export interface YundangAirTrackingOpenPayload {
  airExportId: string;
  orderLabel?: string;
  isYundangSubscribed?: boolean | null;
  isYundangSubscribeSuccess?: boolean | null;
}

export function buildYundangAirTrackRow(
  row: AirExportAdminApi.AirExportDto,
): YundangAirTrackRowInfo {
  return {
    id: String(row.id),
    isYundangSubscribed: row.isYundangSubscribed,
    isYundangSubscribeSuccess: row.isYundangSubscribeSuccess,
    yundangAirShipmentNode: row.yundangAirShipmentNode,
    commissionNum: row.transportOrder?.commissionNum,
    mblNum: row.transportOrder?.mblNum,
  };
}

export function resolveAirOrderLabel(row: YundangAirTrackRowInfo): string {
  return row.commissionNum?.trim() || row.mblNum?.trim() || row.id;
}

/**
 * 结合列表状态字段与推送查询结果推导运踪面板四态。
 */
export function resolveYundangAirViewState(
  row: {
    isYundangSubscribeSuccess?: boolean | null;
    isYundangSubscribed?: boolean | null;
    yundangAirShipmentNode?: null | YundangAirAdminApi.YundangAirShipmentNodeInfoDto;
  },
  pushInfo?: null | YundangAirAdminApi.YundangAirPushInfoDto,
): YundangAirViewState {
  if (!row.isYundangSubscribed) {
    return 'never_subscribed';
  }
  if (!row.isYundangSubscribeSuccess) {
    return 'subscribe_failed';
  }
  if (row.yundangAirShipmentNode?.stateDescCN?.trim()) {
    return 'has_shipment';
  }
  if (!pushInfo?.shipment) {
    return 'waiting_push';
  }
  return 'has_shipment';
}

function resolveLatestStatusFromShipment(
  shipment: YundangAirAdminApi.YundangAirShipmentInfoDto,
): string | undefined {
  if (shipment.currentStatus?.trim()) {
    return shipment.currentStatus.trim();
  }
  if (shipment.trackStatus?.trim()) {
    return shipment.trackStatus.trim();
  }
  return undefined;
}

/**
 * 列表「运踪状态」列展示文案：优先当前节点 stateDescCN / 推送详情，否则按订阅状态回退。
 */
export function getYundangAirTrackStatusLabel(
  row: YundangAirTrackRowInfo,
  pushInfo?: null | YundangAirAdminApi.YundangAirPushInfoDto,
): string {
  if (row.yundangAirShipmentNode?.stateDescCN?.trim()) {
    return row.yundangAirShipmentNode.stateDescCN.trim();
  }
  if (pushInfo?.shipment) {
    const latest = resolveLatestStatusFromShipment(pushInfo.shipment);
    if (latest) {
      return latest;
    }
  }

  const subscribeStatus = getYundangAirSubscribeStatus(row);
  switch (subscribeStatus) {
    case 'failed': {
      return $t('airExport.yundang.trackStatus.subscribeFailed');
    }
    case 'success': {
      return $t('airExport.yundang.trackStatus.waitingPush');
    }
    default: {
      return $t('airExport.yundang.trackStatus.notSubscribed');
    }
  }
}

export function getYundangAirTrackStatusColor(
  row: YundangAirTrackRowInfo,
  pushInfo?: null | YundangAirAdminApi.YundangAirPushInfoDto,
): string {
  const viewState = resolveYundangAirViewState(row, pushInfo);
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

export function useYundangAirTrack() {
  const [TrackingModal, trackingModalApi] = useVbenModal({
    connectedComponent: YundangAirTrackingModal,
    destroyOnClose: true,
  });

  const openTracking = (payload: YundangAirTrackingOpenPayload) => {
    trackingModalApi.setData(payload).open();
  };

  return {
    TrackingModal,
    openTracking,
  };
}
