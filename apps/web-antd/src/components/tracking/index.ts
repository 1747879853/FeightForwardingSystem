/**
 * 运踪（新服务商）共享能力：批量订阅、运踪状态列、预警叹号、运踪详情弹窗。
 *
 * 用户可见文案统一称「运踪」，不得出现服务商名称；后端字段名保持原样。
 * 分流规则见 `utils/tracking-brand.ts` 与 `doc/modules/shared/feituo-tracking-brand-split.md`。
 */
export type {
  AirTrackingOpenPayload,
  AirTrackingRowLike,
} from './air-tracking';
export {
  buildAirTrackingPayload,
  buildAirWarningProps,
  getAirTrackingStatusColor,
  getAirTrackingStatusLabel,
  resolveAirTrackingOrderLabel,
  resolveAirTrackingViewState,
} from './air-tracking';
export {
  AIR_TRACKING_MAP_CONFIG,
  buildAirTrackingMapSrc,
  hasAirTrackingMapConfig,
} from './build-air-tracking-map-src';
export type {
  ContainerTrackingOpenPayload,
  ContainerTrackingRowLike,
} from './container-tracking';
export {
  buildContainerTrackingPayload,
  buildContainerWarningProps,
  getContainerTrackingStatusColor,
  getContainerTrackingStatusLabel,
  resolveContainerOrderLabel,
  resolveContainerTrackingViewState,
} from './container-tracking';
export {
  getTrackingDataStatusColor,
  getTrackingDataStatusLabel,
} from './data-status';
export type {
  ContainerTimelineGroup,
  TrackingTimelineNode,
  TrackingTimelineState,
} from './timeline-nodes';
export {
  buildAirTimelineNodes,
  buildContainerTimelineGroups,
  buildContainerTimelineNodes,
} from './timeline-nodes';
export { default as TrackingTimeline } from './tracking-timeline.vue';
export { default as TrackingWarningModal } from './tracking-warning-modal.vue';
export { default as ContainerTrackingPanel } from './container-tracking-panel.vue';
export { default as TrackingWarningIcon } from './tracking-warning-icon.vue';
export type {
  TrackingSubscribeResultRow,
  TrackingSubscribeResultView,
  TrackingSubscribeRowInfo,
  TrackingViewState,
} from './types';
export { useAirTrackingSubscribe } from './use-air-tracking-subscribe';
export { useContainerTrackingSubscribe } from './use-container-tracking-subscribe';
export {
  useAirTrackingDetail,
  useContainerTrackingDetail,
} from './use-tracking-detail';
export { useVendorTrackingMap } from './use-vendor-tracking-map';
export type { VendorMapLang, VendorTrackingMapPayload } from './vendor-map-src';
export {
  decodeVendorMapToken,
  encodeVendorMapToken,
  resolveVendorMapSrc,
  withMapLang,
} from './vendor-map-src';
export { default as VendorTrackingMapModal } from './vendor-tracking-map-modal.vue';
