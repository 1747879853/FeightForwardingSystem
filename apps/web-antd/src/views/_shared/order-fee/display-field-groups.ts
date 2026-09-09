import type { Component } from 'vue';

import { FileText, MapPin, Package, Ship, Users } from '@vben/icons';

/** 订单信息展示分组（三模块字段 key 共用） */
export type DisplayFieldGroupId =
  | 'identity'
  | 'voyage'
  | 'route'
  | 'party'
  | 'schedule'
  | 'cargo'
  | 'other';

export interface DisplayFieldMeta {
  group: DisplayFieldGroupId;
  /** 组内重点字段：更大字号 / 品牌色 */
  emphasis?: boolean;
}

/** 分组展示顺序 */
export const DISPLAY_FIELD_GROUP_ORDER: DisplayFieldGroupId[] = [
  'identity',
  'voyage',
  'route',
  'party',
  'schedule',
  'cargo',
  'other',
];

export const DISPLAY_FIELD_GROUP_LABELS: Record<DisplayFieldGroupId, string> = {
  identity: '单号',
  voyage: '运输',
  route: '航线',
  party: '客商',
  schedule: '节点',
  cargo: '货量',
  other: '其它',
};

export const DISPLAY_FIELD_GROUP_ICONS: Record<DisplayFieldGroupId, Component> =
  {
    identity: FileText,
    voyage: Ship,
    route: MapPin,
    party: Users,
    schedule: FileText,
    cargo: Package,
    other: FileText,
  };

/**
 * 字段展示元数据。未登记的 key 归入「其它」逻辑时落到最后一个可见组之后单独渲染。
 */
export const DISPLAY_FIELD_META: Record<string, DisplayFieldMeta> = {
  // 单号
  mblNum: { group: 'identity', emphasis: true },
  mawbNum: { group: 'identity', emphasis: true },
  bookingNum: { group: 'identity', emphasis: true },
  commissionNum: { group: 'identity' },

  // 船期 / 航班
  vessel: { group: 'voyage', emphasis: true },
  innerVoyno: { group: 'voyage' },
  terminalVoyno: { group: 'voyage' },
  flightNo: { group: 'voyage', emphasis: true },
  carrierName: { group: 'voyage', emphasis: true },
  etd: { group: 'voyage' },
  atd: { group: 'voyage' },
  eta: { group: 'voyage' },

  // 航线
  receivePortName: { group: 'route' },
  polName: { group: 'route', emphasis: true },
  poT1Name: { group: 'route' },
  poT2Name: { group: 'route' },
  podName: { group: 'route', emphasis: true },
  deliverPortName: { group: 'route' },

  // 客商
  clientName: { group: 'party', emphasis: true },
  teamName: { group: 'party' },
  codeSourceName: { group: 'party' },
  codeServiceName: { group: 'party' },
  codeFrtName: { group: 'party' },

  // 时间节点
  closeDocTime: { group: 'schedule' },
  closeVgmTime: { group: 'schedule' },
  closeManifestTime: { group: 'schedule' },
  arrivalDate: { group: 'schedule' },
  exchangeBillDate: { group: 'schedule' },
  pickUpDate: { group: 'schedule' },
  customsDeclareDate: { group: 'schedule' },
  transferStationDate: { group: 'schedule' },
  ctnUseDate: { group: 'schedule' },
  freeDays: { group: 'schedule' },

  // 货量
  noPkgs: { group: 'cargo' },
  kgs: { group: 'cargo' },
  cbm: { group: 'cargo' },
  goodsDes: { group: 'cargo' },
};

export function resolveDisplayFieldMeta(key: string): DisplayFieldMeta {
  return DISPLAY_FIELD_META[key] ?? { group: 'other' };
}
