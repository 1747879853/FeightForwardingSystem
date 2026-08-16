import { useVbenModal } from '@vben/common-ui';

import AirTrackingModal from './air-tracking-modal.vue';
import type { AirTrackingOpenPayload } from './air-tracking';
import ContainerTrackingModal from './container-tracking-modal.vue';
import type { ContainerTrackingOpenPayload } from './container-tracking';

/** 海运集装箱运踪详情弹窗（列表运踪状态列点击后打开） */
export function useContainerTrackingDetail() {
  const [TrackingModal, trackingModalApi] = useVbenModal({
    connectedComponent: ContainerTrackingModal,
    destroyOnClose: true,
  });

  const openTracking = (payload: ContainerTrackingOpenPayload) => {
    trackingModalApi.setData(payload).open();
  };

  return {
    TrackingModal,
    openTracking,
  };
}

/** 空运运踪详情弹窗 */
export function useAirTrackingDetail() {
  const [TrackingModal, trackingModalApi] = useVbenModal({
    connectedComponent: AirTrackingModal,
    destroyOnClose: true,
  });

  const openTracking = (payload: AirTrackingOpenPayload) => {
    trackingModalApi.setData(payload).open();
  };

  return {
    TrackingModal,
    openTracking,
  };
}
