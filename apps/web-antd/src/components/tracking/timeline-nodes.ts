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
  /** 该节点来自哪些箱（整票合并视图下多箱票才有，用于解释同名节点为何出现多次） */
  containerNos?: string[];
  state: TrackingTimelineState;
  stateLabel: string;
}

/** 按箱分组的时间轴（多箱票排查单箱进度用） */
export interface ContainerTimelineGroup {
  containerNo: string;
  containerType?: string;
  nodes: TrackingTimelineNode[];
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
 * 丢弃已作废的预计记录。
 *
 * 服务商对同一事件会同时给预计与实际两条（如计划离港 00:00 与实际离港 02:04），
 * 按时间排序会把作废的预计排到实际前面，看起来像重复又像倒错。两种情况丢弃预计：
 * 1. 同一事件（事件类型 + 发生地）已经有实际记录；
 * 2. 预计时间已被最新的实际进度超越，或根本没有时间。
 *
 * 一条实际记录都没有时（刚订阅只有计划）全部保留，否则时间轴会整片空白。
 */
function dropSupersededEstimates<T>(
  items: T[],
  resolve: (item: T) => {
    eventKey: string;
    isEstimated: boolean;
    time?: string;
  },
): T[] {
  const actualKeys = new Set<string>();
  let latestActualTime = '';
  for (const item of items) {
    const { eventKey, isEstimated, time } = resolve(item);
    if (isEstimated) {
      continue;
    }
    actualKeys.add(eventKey);
    const sortKey = toSortKey(time);
    if (sortKey > latestActualTime) {
      latestActualTime = sortKey;
    }
  }
  if (!latestActualTime && actualKeys.size === 0) {
    return items;
  }
  return items.filter((item) => {
    const { eventKey, isEstimated, time } = resolve(item);
    if (!isEstimated) {
      return true;
    }
    if (actualKeys.has(eventKey)) {
      return false;
    }
    const sortKey = toSortKey(time);
    return Boolean(sortKey) && sortKey > latestActualTime;
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

interface ContainerNodeEntry {
  node: FeituoTrackingAdminApi.ContainerStatusNodeDto;
  containerNos: Set<string>;
}

/** 箱物流节点的事件标识：同一事件的预计与实际要落到同一个键上 */
function resolveContainerEventKey(
  node: FeituoTrackingAdminApi.ContainerStatusNodeDto,
): string {
  const category = node.eventCode?.trim() || node.descriptionCn?.trim() || '';
  const location = node.portCode?.trim() || node.eventPlace?.trim() || '';
  return `${category}|${location}`.toUpperCase();
}

/** 把去重后的箱节点整理成时间轴：丢作废预计 → 按时间升序 → 标记三态 */
function toContainerTimelineNodes(
  entries: ContainerNodeEntry[],
  withContainerNos: boolean,
): TrackingTimelineNode[] {
  const effective = dropSupersededEstimates(entries, ({ node }) => ({
    eventKey: resolveContainerEventKey(node),
    isEstimated: node.isEsti === 'Y',
    time: node.eventTime,
  }));

  const sorted = sortByTimeAsc(effective, ({ node }) => node.eventTime);
  return markStates(
    sorted.map(({ containerNos, node }, index) => ({
      isEstimated: node.isEsti === 'Y',
      node: {
        key: `${toSortKey(node.eventTime)}-${node.eventCode ?? ''}-${index}`,
        title: node.descriptionCn?.trim() || node.descriptionEn?.trim() || '--',
        time: node.eventTime?.trim(),
        place: node.eventPlace?.trim() || node.terminalName?.trim(),
        vehicle: [node.vslName?.trim(), node.voy?.trim()]
          .filter(Boolean)
          .join(' / '),
        containerNos:
          withContainerNos && containerNos.size > 0
            ? [...containerNos].sort()
            : undefined,
      },
    })),
  );
}

/** 收集单个箱的节点条目（同箱内同一节点重复推送也去重） */
function collectContainerEntries(
  container: FeituoTrackingAdminApi.ContainerItemDto,
  into: Map<string, ContainerNodeEntry>,
) {
  const containerNo = container.containerNo?.trim() ?? '';
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
    const exist = into.get(key);
    if (exist) {
      if (containerNo) {
        exist.containerNos.add(containerNo);
      }
      continue;
    }
    into.set(key, {
      node,
      containerNos: new Set(containerNo ? [containerNo] : []),
    });
  }
}

/**
 * 海运：把各箱的物流节点合并成整票一条时间轴。
 *
 * 同一节点会在多个箱上重复出现（如「船舶离港」），按事件代码+时间+地点+描述去重，
 * 再丢掉已被实际进度取代的预计节点。**同名节点仍可能出现多次**：多箱票各箱进度不同，
 * 或被摘车/甩柜后重新编组，都会产生真实的第二次「离站/到站」，因此多箱票的节点带上箱号，
 * 需要逐箱排查时改用 `buildContainerTimelineGroups`。
 *
 * 港区与海关节点服务商单独计费、默认不返回，节点会比船公司口径稀疏。
 */
export function buildContainerTimelineNodes(
  result?: FeituoTrackingAdminApi.ContainerResultDto | null,
): TrackingTimelineNode[] {
  const containers = result?.containers ?? [];
  const merged = new Map<string, ContainerNodeEntry>();
  for (const container of containers) {
    collectContainerEntries(container, merged);
  }
  // 单箱票标箱号是冗余信息，只有多箱票才需要解释同名节点归属
  return toContainerTimelineNodes([...merged.values()], containers.length > 1);
}

/** 海运：每个箱一条时间轴（多箱票排查单箱进度用） */
export function buildContainerTimelineGroups(
  result?: FeituoTrackingAdminApi.ContainerResultDto | null,
): ContainerTimelineGroup[] {
  return (result?.containers ?? []).map((container, index) => {
    const entries = new Map<string, ContainerNodeEntry>();
    collectContainerEntries(container, entries);
    return {
      containerNo: container.containerNo?.trim() || `#${index + 1}`,
      containerType: container.containerTypeGroup?.trim(),
      nodes: toContainerTimelineNodes([...entries.values()], false),
    };
  });
}

/**
 * 空运事件标识：同一事件的预计与实际两条记录要落到同一个键上。
 * 分类字段按来源取其一（单证/运输/货物动态各用自己那个），都取不到才退回描述。
 */
function resolveAirEventKey(event: FeituoTrackingAdminApi.AirEventDto): string {
  const category =
    event.eventCategory?.trim() ||
    event.transportEventCategory?.trim() ||
    event.shipmentEventCategory?.trim() ||
    event.equipmentEventCategory?.trim() ||
    event.description?.trim() ||
    '';
  const location = event.transportCall?.location?.locationCode?.trim() ?? '';
  return `${category}|${location}`.toUpperCase();
}

/**
 * 空运：把五类事件（单证、运输、货物动态、装货地、卸货地）合并成一条时间轴。
 *
 * 五类结构完全一致，装卸货地事件挂在运输路径下；同一事件可能在多处重复出现，按描述+时间+航班去重，
 * 再丢掉已被实际进度取代的预计记录。
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

  const effective = dropSupersededEstimates([...merged.values()], (event) => ({
    eventKey: resolveAirEventKey(event),
    isEstimated: event.eventClassifier === 'EST',
    time: event.eventTime,
  }));

  const sorted = sortByTimeAsc(effective, (event) => event.eventTime);
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
