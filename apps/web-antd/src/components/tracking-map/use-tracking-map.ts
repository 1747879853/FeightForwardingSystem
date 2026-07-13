import { ref } from 'vue';

const visible = ref(false);
/** 当前订阅号（mblNo），作为 referenceno 传入轨迹地图 */
const referenceNo = ref('');

export interface TrackingMapOpenParams {
  /** 订阅号（提单号 mblNo），对应 trackingeyes 的 referenceno */
  mblNo: string;
}

function open(params: TrackingMapOpenParams) {
  const mblNo = params?.mblNo?.trim() ?? '';
  referenceNo.value = mblNo;
  visible.value = true;
}

function close() {
  visible.value = false;
  referenceNo.value = '';
}

export function useTrackingMap() {
  return {
    visible,
    referenceNo,
    open,
    close,
  };
}
