import type { LoadingOrderCameraOptionDto } from '@/api/loading-order';

/** 占用项不可选；本工单当前绑定的不算占用。 */
export function canSelectCamera(option: LoadingOrderCameraOptionDto) {
  return !option.isOccupied;
}

/** 同公司占着给出单号，别家只说被占用。 */
export function cameraOccupiedText(option: LoadingOrderCameraOptionDto) {
  if (!option.isOccupied) return '';
  return option.occupiedLoadingOrderNum
    ? `已被 ${option.occupiedLoadingOrderNum} 占用`
    : '已被其它工单占用';
}
