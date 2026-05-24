import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn } from '#/adapter/vxe-table';
import type { SeServiceConfigAdminApi } from '#/api/system/base-data/se-service-config-admin';

import { $t } from '#/locales';
import { getEnumItems } from '#/utils/init-enum';

export type SelectOption = { label: string; value: number };

export type ServiceTypeItemLike = {
  serviceType?: number;
  serviceTypeText?: string;
  serviceTypeName?: string;
  serviceTypeDisplayName?: string;
  sortId?: number;
};

/** ServiceType 枚举兜底文案（与后端 ServiceType 枚举一致） */
export const DEFAULT_SERVICE_TYPE_OPTIONS: SelectOption[] = [
  { value: 0, label: '订舱' },
  { value: 1, label: '拖车' },
  { value: 2, label: '报关' },
  { value: 3, label: '仓库' },
  { value: 4, label: '保险' },
  { value: 5, label: '代收支' },
];

export function buildServiceTypeOptionsFromEnum(
  items:
    | {
        displayName?: string;
        enable?: boolean;
        value: number;
      }[]
    | undefined,
): SelectOption[] {
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
  let items = await getEnumItems('ServiceType');
  if (!items?.length) {
    items = await getEnumItems('serviceType');
  }
  return items || [];
}

export async function loadSeServiceTypeOptions() {
  const items = await loadSeServiceTypeEnumItems();
  return buildServiceTypeOptionsFromEnum(items);
}

export function buildServiceTypeMap(serviceTypeOptions: SelectOption[]) {
  const map = new Map(
    DEFAULT_SERVICE_TYPE_OPTIONS.map((item) => [item.value, item.label]),
  );
  for (const item of serviceTypeOptions) {
    map.set(Number(item.value), item.label);
  }
  return map;
}

export function normalizeServiceTypes(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => Number(item))
      .filter((item) => !Number.isNaN(item));
  }
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/[,、]/)
      .map((item) => Number(item.trim()))
      .filter((item) => !Number.isNaN(item));
  }
  return [];
}

export function resolveServiceTypeLabel(
  serviceType: number | undefined | null,
  serviceTypeOptions: SelectOption[],
  backendText?: Pick<
    ServiceTypeItemLike,
    'serviceTypeText' | 'serviceTypeName' | 'serviceTypeDisplayName'
  >,
) {
  if (serviceType !== undefined && serviceType !== null) {
    const normalized = Number(serviceType);
    if (!Number.isNaN(normalized)) {
      const map = buildServiceTypeMap(serviceTypeOptions);
      const mappedLabel = map.get(normalized);
      if (mappedLabel) {
        return mappedLabel;
      }
      return `${normalized}`;
    }
  }

  const text =
    backendText?.serviceTypeDisplayName ||
    backendText?.serviceTypeName ||
    backendText?.serviceTypeText;
  if (text?.trim()) {
    return text.trim();
  }
  return '';
}

export function formatRowServiceTypes(
  row: {
    serviceTypes?: unknown;
    seServiceConfigItems?: ServiceTypeItemLike[];
  },
  serviceTypeOptions: SelectOption[],
) {
  const items = (row.seServiceConfigItems || []).filter(
    (item) => item.serviceType !== undefined && item.serviceType !== null,
  );

  if (items.length > 0) {
    const labels = [...items]
      .sort(
        (a, b) =>
          Number(a.sortId ?? Number.MAX_SAFE_INTEGER) -
          Number(b.sortId ?? Number.MAX_SAFE_INTEGER),
      )
      .map((item) =>
        resolveServiceTypeLabel(
          Number(item.serviceType),
          serviceTypeOptions,
          item,
        ),
      )
      .filter(Boolean);

    if (labels.length > 0) {
      return labels.join('、');
    }
  }

  const types = normalizeServiceTypes(row.serviceTypes);
  if (types.length === 0) {
    return '-';
  }

  const map = buildServiceTypeMap(serviceTypeOptions);
  return types.map((type) => map.get(type) || String(type)).join('、');
}

export function useGridFormSchema(
  serviceTypeOptions: SelectOption[],
): VbenFormSchema[] {
  return [
    {
      component: 'PortSelect',
      fieldName: 'polId',
      label: $t('system.basicData.seServiceConfig.polId'),
      componentProps: {
        allowClear: true,
        placeholder: $t('ui.placeholder.select'),
      },
    },
    {
      component: 'Select',
      fieldName: 'serviceType',
      label: $t('system.basicData.seServiceConfig.serviceType'),
      componentProps: {
        allowClear: true,
        options: serviceTypeOptions,
        placeholder: $t('ui.placeholder.select'),
      },
    },
  ];
}

export function useColumns(
  serviceTypeOptions: SelectOption[],
  onActionClick?: OnActionClickFn<SeServiceConfigAdminApi.SeServiceConfigListDto>,
): VxeTableGridOptions<SeServiceConfigAdminApi.SeServiceConfigListDto>['columns'] {
  return [
    {
      field: 'pol',
      title: $t('system.basicData.seServiceConfig.polId'),
      minWidth: 180,
      formatter: ({ row }) =>
        row.pol?.portName || row.pol?.cnName || String(row.polId || '-'),
    },
    {
      field: 'serviceTypes',
      title: $t('system.basicData.seServiceConfig.serviceType'),
      minWidth: 200,
      formatter: ({ row }) => formatRowServiceTypes(row, serviceTypeOptions),
    },
    {
      field: 'serviceItemCount',
      title: $t('system.basicData.seServiceConfig.serviceItemCount'),
      minWidth: 100,
      align: 'center',
    },
    {
      field: 'sortId',
      title: $t('system.basicData.seServiceConfig.sortId'),
      minWidth: 90,
    },
    {
      field: 'creationTime',
      title: $t('system.basicData.seServiceConfig.creationTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
    {
      align: 'right',
      cellRender: {
        attrs: {
          nameField: 'id',
          nameTitle: $t('system.basicData.seServiceConfig.name'),
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: ['edit', 'delete'],
      },
      field: 'operation',
      fixed: 'right',
      headerAlign: 'center',
      showOverflow: false,
      title: $t('system.basicData.operation'),
      width: 150,
    },
  ];
}
