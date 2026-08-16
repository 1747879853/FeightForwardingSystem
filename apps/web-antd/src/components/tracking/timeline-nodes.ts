import type { FeituoTrackingAdminApi } from '#/api/tracking/feituo-tracking-admin';

import { $t } from '#/locales';

export type TrackingTimelineState = 'completed' | 'current' | 'estimated';

/** 时间轴节点（海运箱物流节点与空运事件归一化后的展示结构） */
export interface TrackingTimelineNode {
  key: string;
  /** 节点描述，主展示 */
  title: string;
  /** 发生时间（服务商原样字符串，不做时区转换） */
  time?: string;
  /** 发生地 */
  place?: string;
  /** 船名航次 / 航班号 */
  vehicle?: string;
  state: TrackingTimelineState;
  stateLabel: string;
}

/**
 * 时间字符串归一化后再比较。
 *
 * 服务商返回定长字符串（海运 `2025/09/01 00:00:00`、空运 `2025-09-01 00:00:00`），
 * 统一分隔符后字符串排序等价于时间排序；用 `new Date()` 解析反而会因个别脏数据排错。
 */
function toSortKey(time?: string): string {
  return (time ?? '').trim().replaceAll('/', '-');
}

function sortByTimeAsc<T>(
  items: T[],
  getTime: (item: T) => string | undefined,
) {
  return [...items].sort((a, b) => {
    const timeA = toSortKey(getTime(a));
    const timeB = toSortKey(getTime(b));
    // 无时间的节点排在末尾，避免顶到最前面被当成起点
    if (!timeA) return timeB ? 1 : 0;
    if (!timeB) return -1;
    return timeA.localeCompare(timeB);
  });
}

/**
 * 标记时间轴状态：预计节点为 `estimated`，实际节点为 `completed`，
 * 其中时间最新的实际节点标为 `current`（与摘要里的「当前节点」口径一致）。
 */
function markStates(
  items: Array<{
    isEstimated: boolean;
    node: Omit<TrackingTimelineNode, 'state' | 'stateLabel'>;
  }>,
): TrackingTimelineNode[] {
  let currentIndex = -1;
  items.forEach((item, index) => {
    if (!item.isEstimated) {
      currentIndex = index;
    }
  });
  return items.map((item, index) => {
    if (index === currentIndex) {
      return {
        ...item.node,
        state: 'current',
        stateLabel: $t('tracking.timeline.state.current'),
      };
    }
    return item.isEstimated
      ? {
          ...item.node,
          state: 'estimated',
          stateLabel: $t('tracking.timeline.state.estimated'),
        }
      : {
          ...item.node,
          state: 'completed',
          stateLabel: $t('tracking.timeline.state.completed'),
        };
  });
}

/**
 * 海运：把各箱的物流节点合并成整票一条时间轴。
 *
 * 同一节点会在多个箱上重复出现（如「船舶离港」），按描述+时间+地点去重；
 * 港区与海关节点服务商单独计费、默认不返回，节点会比船公司口径稀疏。
 */
export function buildContainerTimelineNodes(
  result?: FeituoTrackingAdminApi.ContainerResultDto | null,
): TrackingTimelineNode[] {
  const merged = new Map<
    string,
    FeituoTrackingAdminApi.ContainerStatusNodeDto
  >();
  for (const container of result?.containers ?? []) {
    for (const node of container.status ?? []) {
      const description =
        node.descriptionCn?.trim() || node.descriptionEn?.trim();
      if (!description) {
        continue;
      }
      const key = [
        node.eventCode?.trim() ?? '',
        toSortKey(node.eventTime),
        node.eventPlace?.trim() ?? '',
        description,
      ].join('|');
      if (!merged.has(key)) {
        merged.set(key, node);
      }
    }
  }

  const sorted = sortByTimeAsc([...merged.values()], (node) => node.eventTime);
  return markStates(
    sorted.map((node, index) => ({
      isEstimated: node.isEsti === 'Y',
      node: {
        key: `${toSortKey(node.eventTime)}-${node.eventCode ?? ''}-${index}`,
        title: node.descriptionCn?.trim() || node.descriptionEn?.trim() || '--',
        time: node.eventTime?.trim(),
        place: node.eventPlace?.trim() || node.terminalName?.trim(),
        vehicle: [node.vslName?.trim(), node.voy?.trim()]
          .filter(Boolean)
          .join(' / '),
      },
    })),
  );
}

/**
 * 空运：把五类事件（单证、运输、货物动态、装货地、卸货地）合并成一条时间轴。
 *
 * 五类结构完全一致，装卸货地事件挂在运输路径下；同一事件可能在多处重复出现，按描述+时间+航班去重。
 */
export function buildAirTimelineNodes(
  detail?: FeituoTrackingAdminApi.AirDataDto | null,
): TrackingTimelineNode[] {
  if (!detail) {
    return [];
  }
  const all: FeituoTrackingAdminApi.AirEventDto[] = [
    ...(detail.shipmentEvents ?? []),
    ...(detail.transportEvents ?? []),
    ...(detail.equipmentEvents ?? []),
    ...(detail.shipmentTransports ?? []).flatMap((transport) => [
      ...(transport.loadTransportCall?.events ?? []),
      ...(transport.dischargeTransportCall?.events ?? []),
    ]),
  ];

  const merged = new Map<string, FeituoTrackingAdminApi.AirEventDto>();
  for (const event of all) {
    const description = event.description?.trim();
    if (!description) {
      continue;
    }
    const key = [
      toSortKey(event.eventTime),
      description,
      event.transportCall?.flight?.trim() ?? '',
    ].join('|');
    if (!merged.has(key)) {
      merged.set(key, event);
    }
  }

  const sorted = sortByTimeAsc(
    [...merged.values()],
    (event) => event.eventTime,
  );
  return markStates(
    sorted.map((event, index) => {
      const location = event.transportCall?.location;
      return {
        isEstimated: event.eventClassifier === 'EST',
        node: {
          key: `${toSortKey(event.eventTime)}-${event.eventCategory ?? ''}-${index}`,
          title: event.description?.trim() || '--',
          time: event.eventTime?.trim(),
          place:
            location?.locationName?.trim() ||
            location?.locationCity?.trim() ||
            location?.locationCode?.trim(),
          vehicle: event.transportCall?.flight?.trim(),
        },
      };
    }),
  );
}
