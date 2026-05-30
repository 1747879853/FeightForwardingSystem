import { getEnumItems } from '#/utils/init-enum';

export type ServiceTypeOption = { label: string; value: number };

export const SERVICE_TYPE_VALUE = {
  booking: 0,
  truck: 1,
  customs: 2,
  warehouse: 3,
  insurance: 4,
  collectionPayment: 5,
} as const;

/** ServiceType 枚举兜底文案（与后端 ServiceType 枚举一致） */
export const DEFAULT_SERVICE_TYPE_OPTIONS: ServiceTypeOption[] = [
  { value: SERVICE_TYPE_VALUE.booking, label: '订舱' },
  { value: SERVICE_TYPE_VALUE.truck, label: '拖车' },
  { value: SERVICE_TYPE_VALUE.customs, label: '报关' },
  { value: SERVICE_TYPE_VALUE.warehouse, label: '仓库' },
  { value: SERVICE_TYPE_VALUE.insurance, label: '保险' },
  { value: SERVICE_TYPE_VALUE.collectionPayment, label: '代收支' },
];

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

  return options.length > 0 ? options : [...DEFAULT_SERVICE_TYPE_OPTIONS];
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
  const map = new Map(
    DEFAULT_SERVICE_TYPE_OPTIONS.map((item) => [item.value, item.label]),
  );
  for (const item of serviceTypeOptions) {
    map.set(Number(item.value), item.label);
  }
  return map;
}

export function resolveServiceTypeLabelByMap(
  serviceType: number | undefined | null,
  labelMap: Map<number, string>,
  fallback = '指派任务',
) {
  if (serviceType == null) {
    return fallback;
  }
  return labelMap.get(Number(serviceType)) ?? `服务项${serviceType}`;
}
