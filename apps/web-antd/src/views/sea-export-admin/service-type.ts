import { getItemsByName } from '#/api/system/enum-admin';
import { getEnumItems } from '#/utils/init-enum';

export type ServiceTypeOption = {
  /** 是否业务主流程（来源于 ServiceType 枚举项 extra1） */
  isBusinessProcess: boolean;
  label: string;
  value: number;
};
const normalizeServiceTypeLabel = (label?: string) =>
  (label || '').replace(/\s+/g, '').toLowerCase();

export function buildServiceTypeOptionsFromEnum(
  items:
    | {
        displayName?: string;
        enable?: boolean;
        extra1?: boolean;
        value: number;
      }[]
    | undefined,
): ServiceTypeOption[] {
  const options = (items || [])
    .filter((item) => item.enable !== false)
    .map((item) => ({
      isBusinessProcess: item.extra1 === true,
      label: item.displayName || `${item.value}`,
      value: Number(item.value),
    }))
    .filter((item) => !Number.isNaN(item.value))
    .sort((a, b) => a.value - b.value);
  return options;
}

export async function loadSeServiceTypeEnumItems() {
  // ServiceType 的 extra1 可在枚举管理中动态调整；直接读取后端缓存接口，
  // 避免旧版 localStorage 枚举缓存缺少 extra1 时全部误归为非主流程。
  try {
    const items = await getItemsByName('ServiceType');
    return items || [];
  } catch {
    // 网络异常时仍允许使用本地缓存完成基础选项回显。
    return getEnumItems('ServiceType', false);
  }
}

export async function loadSeServiceTypeOptions() {
  const items = await loadSeServiceTypeEnumItems();
  return buildServiceTypeOptionsFromEnum(items);
}

export function buildServiceTypeLabelMap(
  serviceTypeOptions: ServiceTypeOption[],
) {
  const map = new Map<number, string>();
  for (const item of serviceTypeOptions) {
    map.set(Number(item.value), item.label);
  }
  return map;
}

export function buildServiceTypeProcessMap(
  serviceTypeOptions: ServiceTypeOption[],
) {
  const map = new Map<number, boolean>();
  for (const item of serviceTypeOptions) {
    map.set(Number(item.value), item.isBusinessProcess);
  }
  return map;
}

export function resolveServiceTypeValueByLabels(
  serviceTypeOptions: ServiceTypeOption[],
  labels: string[],
) {
  if (!Array.isArray(labels) || labels.length === 0) {
    return undefined;
  }
  const normalizedCandidates = labels
    .map((item) => normalizeServiceTypeLabel(item))
    .filter(Boolean);
  if (normalizedCandidates.length === 0) {
    return undefined;
  }
  const matched = serviceTypeOptions.find((item) => {
    const normalizedLabel = normalizeServiceTypeLabel(item.label);
    return normalizedCandidates.some((candidate) =>
      normalizedLabel.includes(candidate),
    );
  });
  return matched ? Number(matched.value) : undefined;
}

export function resolveServiceTypeLabelByMap(
  serviceType: number | undefined | null,
  labelMap: Map<number, string>,
  fallback = '转交任务',
) {
  if (serviceType == null) {
    return fallback;
  }
  return labelMap.get(Number(serviceType)) ?? `服务项${serviceType}`;
}
