/**
 * 海运出口「服务项目」纯逻辑层：类型、常量、节点构建、分组排序、必填/锁定映射等。
 *
 * 本文件只做无副作用的纯计算，不依赖 Vue 响应式与表单实例，便于独立测试与复用。
 * 有状态逻辑（勾选节点 ref、表单联动、任务完成/取消、弹窗草稿等）仍保留在 form.vue。
 */
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import dayjs from 'dayjs';

import { $t } from '#/locales';

export const SERVICE_TASK_STATUS_PENDING = 0;
export const SERVICE_TASK_STATUS_PROCESSED = 1;

export type ServiceTypeTaskUser = {
  userId: number;
  userNickName?: string;
};
export type ServiceTypeTaskInfo = {
  taskId?: string;
  taskStatus?: 0 | 1 | null;
  completionUserId?: number | null;
  completionTime?: string | null;
  completionUserNickName?: string | null;
  taskUsers?: ServiceTypeTaskUser[];
};
export type ServiceTypeNode = {
  serviceType: number;
  label: string;
  /** 是否业务主流程（ServiceType 枚举项 extra1） */
  isBusinessProcess: boolean;
  sortId: number;
  checked: boolean;
  taskStatus?: 0 | 1 | null;
  taskId?: string;
  completionUserId?: number | null;
  completionTime?: string | null;
  completionUserNickName?: string | null;
  taskUsers?: ServiceTypeTaskUser[];
};
export type EditServiceSnapshot = {
  savedServiceTypeSet: Set<number>;
  savedSortIdMap: Map<number, number>;
  taskMap: Map<number, ServiceTypeTaskInfo>;
};
export type ServicePipelineState = 'active' | 'done' | 'upcoming';
export type ServiceTypeNodeGroup = {
  sortId: number;
  nodes: ServiceTypeNode[];
};

export const toServiceTaskStatusValue = (
  value: unknown,
): ServiceTypeNode['taskStatus'] => {
  const status = Number(value);
  if (status === SERVICE_TASK_STATUS_PENDING)
    return SERVICE_TASK_STATUS_PENDING;
  if (status === SERVICE_TASK_STATUS_PROCESSED)
    return SERVICE_TASK_STATUS_PROCESSED;
  return undefined;
};

export const buildServiceTypeNodes = (
  polNodes: SeaExportAdminApi.ServiceTypeByPolDto[],
  enumLabelMap: Map<number, string>,
  savedServiceTypeSet?: Set<number>,
  clientCheckedMap?: Map<number, boolean>,
  taskMap?: Map<number, ServiceTypeTaskInfo>,
  savedSortIdMap?: Map<number, number>,
  processMap?: Map<number, boolean>,
): ServiceTypeNode[] => {
  const resolveSortId = (serviceType: number, polSortId: number) =>
    savedSortIdMap?.get(serviceType) ?? polSortId;
  return polNodes
    .slice()
    .sort(
      (a, b) =>
        resolveSortId(Number(a.serviceType), a.sortId) -
          resolveSortId(Number(b.serviceType), b.sortId) ||
        a.serviceType - b.serviceType,
    )
    .map((node) => {
      const serviceType = Number(node.serviceType);
      const taskInfo = taskMap?.get(serviceType);
      let checked = !!node.checked;
      if (savedServiceTypeSet) {
        checked = savedServiceTypeSet.has(serviceType);
      } else if (clientCheckedMap?.has(serviceType)) {
        checked = clientCheckedMap.get(serviceType) ?? false;
      }
      return {
        serviceType,
        label: enumLabelMap.get(serviceType) ?? `${serviceType}`,
        isBusinessProcess: processMap?.get(serviceType) ?? false,
        sortId: resolveSortId(serviceType, node.sortId),
        checked,
        taskStatus: taskInfo?.taskStatus,
        taskId: taskInfo?.taskId,
        completionUserId: taskInfo?.completionUserId,
        completionTime: taskInfo?.completionTime,
        completionUserNickName: taskInfo?.completionUserNickName,
        taskUsers: taskInfo?.taskUsers,
      };
    });
};

export const parseDetailServiceTypes = (
  detail: SeaExportAdminApi.SeaExportDto,
) => {
  const services = detail.seaExportServices ?? [];
  const savedSet = new Set<number>();
  // 编辑态服务项目仅来自详情 seaExportServices，不再参与 POL 联动
  const savedSortIdMap = new Map<number, number>();
  const taskMap = new Map<number, ServiceTypeTaskInfo>();
  services.forEach((item) => {
    const serviceType = Number(item.serviceType);
    if (!Number.isFinite(serviceType)) return;
    savedSet.add(serviceType);
    if (item.sortId != null) {
      savedSortIdMap.set(serviceType, Number(item.sortId));
    }
    const rawTaskId = item.seServiceTask?.id;
    const taskId =
      rawTaskId == null ? undefined : String(rawTaskId).trim() || undefined;
    taskMap.set(serviceType, {
      taskId,
      taskStatus:
        item.seServiceTask == null
          ? null
          : toServiceTaskStatusValue(item.seServiceTask.serviceTaskStatus),
      completionUserId: item.seServiceTask?.completionUserId ?? null,
      completionTime: item.seServiceTask?.completionTime ?? null,
      completionUserNickName:
        item.seServiceTask?.completionUserNickName ?? null,
      taskUsers: (item.seServiceTask?.seServiceTaskUsers ?? []).map((user) => ({
        userId: user.userId,
        userNickName: user.userNickName,
      })),
    });
  });
  return { savedSet, savedSortIdMap, taskMap };
};

/** 完成时必填扩展枚举：附件类型。具体附件类型 id 写在 requireValues */
export const ATTACHMENT_DTL_TYPE_PROP_ENUM = 10001;
/** ≥ 该值均为扩展类型，只能出现在 seServiceRequires */
export const SEA_EXPORT_PROP_EXTENDED_MIN = 10001;

type SeServicePropItemLike = {
  seaExportPropEnum?: number;
  requireValues?: string | null;
};

/** 兼容旧 int[] 与新对象数组，取出 seaExportPropEnum */
export const toSeaExportPropEnum = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (value && typeof value === 'object' && 'seaExportPropEnum' in value) {
    const parsed = Number(
      (value as { seaExportPropEnum?: unknown }).seaExportPropEnum,
    );
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

/** 解析 `"1|2|3"`，按字符串保留 id，避免大整数精度丢失；不要用 includes('1') */
export const parseRequireIds = (requireValues?: null | string): string[] => {
  if (!requireValues) return [];
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const part of requireValues.split('|')) {
    const id = part.trim();
    if (!id || id === '0' || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
};

export const toRequireValues = (
  ids?: Array<number | string> | null,
): string | null => {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const raw of ids ?? []) {
    const id = String(raw).trim();
    if (!id || id === '0' || seen.has(id)) continue;
    seen.add(id);
    unique.push(id);
  }
  return unique.length ? unique.join('|') : null;
};

export const collectRequiredAttachmentTypeIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const propEnum = toSeaExportPropEnum(item);
    if (propEnum !== ATTACHMENT_DTL_TYPE_PROP_ENUM) continue;
    const requireValues =
      item && typeof item === 'object'
        ? (item as SeServicePropItemLike).requireValues
        : null;
    for (const id of parseRequireIds(requireValues)) {
      if (seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
};

export const formatRequiredAttachmentNames = (
  ids: Array<number | string>,
  types: Array<{
    id?: number | string;
    name?: string | null;
    sortId?: number;
  }>,
): string => {
  const typeMap = new Map(
    types.map((item) => [String(item.id), item] as const),
  );
  return [...ids]
    .sort((left, right) => {
      const leftSort =
        typeMap.get(String(left))?.sortId ?? Number.MAX_SAFE_INTEGER;
      const rightSort =
        typeMap.get(String(right))?.sortId ?? Number.MAX_SAFE_INTEGER;
      return Number(leftSort) - Number(rightSort);
    })
    .map((id) => {
      const name = typeMap.get(String(id))?.name?.trim();
      return name || `未知类型(${id})`;
    })
    .join('、');
};

export const collectUploadedAttachmentTypeIds = (
  groups: Array<{
    attachmentDtlTypeId?: number | string | null;
    attachmentDtlType?: { id?: number | string } | null;
    items?: Array<{ attachmentDtlTypeId?: number | string | null }> | null;
  }>,
): Set<string> => {
  const ids = new Set<string>();
  for (const group of groups) {
    const groupItems = group.items ?? [];
    if (groupItems.length === 0) continue;
    const typeId =
      group.attachmentDtlTypeId ?? group.attachmentDtlType?.id ?? null;
    if (typeId != null && String(typeId) !== '') {
      ids.add(String(typeId));
    }
    for (const item of groupItems) {
      if (item.attachmentDtlTypeId == null || item.attachmentDtlTypeId === '') {
        continue;
      }
      ids.add(String(item.attachmentDtlTypeId));
    }
  }
  return ids;
};

/** SeaExportPropEnum → 字段名（必填/锁定字段映射一致） */
export const SERVICE_REQUIRE_PROP_TO_FIELD_NAME: Record<number, string> = {
  1: 'carrierId',
  2: 'polId',
  3: 'podId',
  4: 'vessel',
  5: 'innerVoyno',
  6: 'closingTime',
  7: 'closeDocTime',
  8: 'closeVgmTime',
  9: 'closeManifestTime',
  10: 'bookingAgentId',
  11: 'shipAgentId',
  12: 'yardId',
  13: 'codeIssueTypeId',
  14: 'mblNum',
  15: 'bookingNum',
  16: 'etd',
  17: 'clientId',
};
export const SERVICE_REQUIRE_FIELD_LABEL_KEY: Record<string, string> = {
  carrierId: 'seaExport.export.carrierId',
  polId: 'seaExport.export.polId',
  podId: 'seaExport.export.podId',
  vessel: 'seaExport.export.vessel',
  innerVoyno: 'seaExport.export.innerVoyno',
  closingTime: 'seaExport.export.closingTime',
  closeDocTime: 'seaExport.export.closeDocTime',
  closeVgmTime: 'seaExport.export.closeVgmTime',
  closeManifestTime: 'seaExport.export.closeManifestTime',
  bookingAgentId: 'seaExport.export.bookingAgentId',
  shipAgentId: 'seaExport.export.shipAgentId',
  yardId: 'seaExport.export.yardId',
  codeIssueTypeId: 'seaExport.export.codeIssueTypeId',
  mblNum: 'seaExport.export.mblNum',
  bookingNum: 'seaExport.export.bookingNum',
  etd: 'seaExport.export.etd',
  clientId: 'seaExport.export.clientId',
};

/** 可被服务锁定的表单字段（去重后的字段名集合） */
export const SERVICE_LOCKABLE_FIELD_NAMES = [
  ...new Set(Object.values(SERVICE_REQUIRE_PROP_TO_FIELD_NAME)),
];

/** 取出完成时必填的普通字段枚举；跳过 ≥10001 的扩展类型（如附件类型） */
export const normalizeRequiredProps = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .map((item) => toSeaExportPropEnum(item))
        .filter(
          (item): item is number =>
            item != null &&
            Number.isFinite(item) &&
            item > 0 &&
            item < SEA_EXPORT_PROP_EXTENDED_MIN,
        ),
    ),
  ];
};

export const buildServiceRequiredPropsByType = (
  availableServiceTypes: null | SeaExportAdminApi.ServiceTypeByPolDto[],
  checkedServiceTypeSet: Set<number>,
) => {
  const sourceMap = new Map<number, SeaExportAdminApi.ServiceTypeByPolDto>();
  (Array.isArray(availableServiceTypes) ? availableServiceTypes : []).forEach(
    (item) => {
      const serviceType = Number(item?.serviceType);
      if (!Number.isFinite(serviceType)) return;
      sourceMap.set(serviceType, item);
    },
  );
  const result = new Map<number, number[]>();
  checkedServiceTypeSet.forEach((serviceType) => {
    const matched = sourceMap.get(serviceType);
    if (!matched) return;
    result.set(serviceType, normalizeRequiredProps(matched.seServiceRequires));
  });
  return result;
};

export const getDistinctServiceSortIdsAsc = (nodes: ServiceTypeNode[]) => {
  const sortIds = new Set<number>();
  nodes.forEach((node) => sortIds.add(node.sortId));
  return [...sortIds].sort((a, b) => a - b);
};
export const sortServiceTypeNodesBySortId = (nodes: ServiceTypeNode[]) =>
  [...nodes].sort(
    (a, b) => a.sortId - b.sortId || a.serviceType - b.serviceType,
  );
export const groupServiceTypeNodesBySortId = (
  nodes: ServiceTypeNode[],
): ServiceTypeNodeGroup[] => {
  const sortIds = getDistinctServiceSortIdsAsc(nodes);
  return sortIds.map((sortId) => ({
    sortId,
    nodes: nodes
      .filter((node) => node.sortId === sortId)
      .sort((a, b) => a.serviceType - b.serviceType),
  }));
};

/** 当前应处理的 sortId 组：取最小 sortId 且组内尚未全部完成 */
export const getServicePipelineActiveSortId = (nodes: ServiceTypeNode[]) => {
  for (const sortId of getDistinctServiceSortIdsAsc(nodes)) {
    const groupNodes = nodes.filter((node) => node.sortId === sortId);
    const groupComplete = groupNodes.every(
      (node) => node.taskStatus === SERVICE_TASK_STATUS_PROCESSED,
    );
    if (!groupComplete) {
      return sortId;
    }
  }
  return null;
};

export const formatServiceTaskCompletionTime = (value?: string | null) => {
  if (!value) return '-';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm') : value;
};

export const formatServiceTaskUsersText = (node: ServiceTypeNode) => {
  const names = (node.taskUsers ?? [])
    .map((item) => item.userNickName || `用户${item.userId}`)
    .filter(Boolean);
  return names.length ? names.join('、') : '-';
};

export const hasServiceTaskHandlerRestriction = (node: ServiceTypeNode) =>
  (node.taskUsers?.length ?? 0) > 0;

export const isRequiredFieldFilled = (value: unknown) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') {
    if (typeof (value as { isValid?: () => boolean }).isValid === 'function') {
      return !!(value as { isValid: () => boolean }).isValid();
    }
    return true;
  }
  return true;
};

export const getRequiredFieldLabelByProp = (propEnum: number) => {
  const fieldName = SERVICE_REQUIRE_PROP_TO_FIELD_NAME[propEnum];
  if (!fieldName) return `字段(${propEnum})`;
  const labelKey = SERVICE_REQUIRE_FIELD_LABEL_KEY[fieldName];
  return labelKey ? $t(labelKey) : fieldName;
};
