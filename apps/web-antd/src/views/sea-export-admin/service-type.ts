import { getEnumItems } from '#/utils/init-enum';

export type ServiceTypeOption = { label: string; value: number };
const normalizeServiceTypeLabel = (label?: string) =>
  (label || '').replace(/\s+/g, '').toLowerCase();

export function buildServiceTypeOptionsFromEnum(
  items:
    | {
        displayName?: string;
        enable?: boolean;
        value: number;
      }[]
    | undefined,
): ServiceTypeOption[] {
  const options = (items || [])
    .filter((item) => item.enable !== false)
    .map((item) => ({
      label: item.displayName || `${item.value}`,
      value: Number(item.value),
    }))
    .filter((item) => !Number.isNaN(item.value))
    .sort((a, b) => a.value - b.value);
  return options;
}

export async function loadSeServiceTypeEnumItems() {
  const items = await getEnumItems('ServiceType');
  return items || [];
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
