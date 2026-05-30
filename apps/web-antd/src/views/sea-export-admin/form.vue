<script lang="ts" setup>
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import dayjs from 'dayjs';
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  ArrowLeft,
  FileText,
  IconifyIcon,
  MapPin,
  Package,
  Save,
  Ship,
  Users,
} from '@vben/icons';

import {
  Avatar,
  Button,
  Card,
  Checkbox,
  message,
  Popover,
  Select,
  Space,
  Spin,
  Tag,
  Tooltip,
} from 'ant-design-vue';
import { useUserStore } from '@vben/stores';

defineOptions({
  name: 'SeaExportAdminForm',
});
import { UserSelect } from '#/adapter/component';
import { useVbenForm } from '#/adapter/form';
import { runVisionOcrPdf } from '#/api/common';
import {
  addSeaExport,
  editSeaExport,
  getServiceTypesByPOL,
  getSeaExportDetail,
} from '#/api/sea-export/sea-export-admin';
import { completeSeServiceTask } from '#/api/sea-export/se-service-task-admin';
import {
  getOrganizationUnitTree,
  type SystemOrganizationUnitApi,
} from '#/api/system/organization-unit';
import type { SystemUserAdminApi } from '#/api/system/user-admin';

import { getUser, UserAttribute } from '#/api/system/user-admin';
import { $t } from '#/locales';
import { markListShouldRefresh } from '#/utils/list-refresh-flag';

import OrderCtnTable from './modules/order-ctn-table.vue';
import ReadonlyFormItem from './modules/readonly-form-item.vue';
import {
  useBasicInfoFormSchema,
  useCargoFormSchema,
  usePartyInfoFormSchema,
  usePortFormSchema,
  useShipmentFormSchema,
} from './data';
import {
  buildServiceTypeLabelMap,
  loadSeServiceTypeOptions,
  SERVICE_TYPE_VALUE,
} from './service-type';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const props = withDefaults(
  defineProps<{
    embedded?: boolean;
  }>(),
  {
    embedded: false,
  },
);
const pageWrapperTag = computed(() => (props.embedded ? 'div' : Page));
const pageWrapperProps = computed(() =>
  props.embedded
    ? {}
    : {
        autoContentHeight: true,
        contentClass: '!p-0',
      },
);
const emit = defineEmits<{
  sectionChange: [key: SectionKey];
}>();

const editId = computed<string | undefined>(() => {
  const id = route.params.id;
  if (Array.isArray(id)) return id[0];
  return id ? String(id) : undefined;
});

const isEdit = computed(() => !!editId.value);

const pageTitle = computed(() => {
  return isEdit.value
    ? $t('ui.actionTitle.edit', [$t('seaExport.export.name')])
    : $t('ui.actionTitle.create', [$t('seaExport.export.name')]);
});

const pageLoading = ref(false);
const submitting = ref(false);
const aiRecognizing = ref(false);
const aiOcrPdfInputRef = ref<HTMLInputElement | null>(null);
const transportOrderId = ref<number | undefined>();
const defaultOrderUsers: SeaExportAdminApi.OrderUserAddDto[] = [
  { userAttribute: UserAttribute.Sales, sortId: 6 },
  { userAttribute: UserAttribute.Business, sortId: 5 },
  { userAttribute: UserAttribute.Operation, sortId: 4 },
  { userAttribute: UserAttribute.CustomerService, sortId: 3 },
  { userAttribute: UserAttribute.Documentation, sortId: 2 },
  { userAttribute: UserAttribute.OverseasCustomerService, sortId: 1 },
];
const fixedOrderUserRoles = new Set<number>(
  defaultOrderUsers
    .map((item) => item.userAttribute)
    .filter((item): item is number => item != null),
);
const requiredOrderUserRoles: number[] = [
  UserAttribute.Sales,
  UserAttribute.Operation,
];
const defaultCurrentUserRoleSet = new Set([
  UserAttribute.Operation,
  UserAttribute.CustomerService,
  UserAttribute.Documentation,
]);
const currentUserId = computed(() => {
  const rawUserId = userStore.userInfo?.userId;
  if (!rawUserId) return undefined;
  const parsedUserId = Number(rawUserId);
  return Number.isFinite(parsedUserId) && parsedUserId > 0
    ? parsedUserId
    : undefined;
});

/** 左侧表单：相关方信息（发货人、收货人、通知人等） */
const [PartyInfoForm, partyInfoFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  schema: usePartyInfoFormSchema().map((item) =>
    item.fieldName === 'orderUsers'
      ? { ...item, formItemClass: 'party-flow-order-users-hidden' }
      : item,
  ),
  showDefaultActions: false,
  wrapperClass: 'party-flow-wrap grid-cols-3 gap-x-8',
});

const ENTRUST_STATIC_FIELD_NAMES = [
  'commissionNum',
  'countryName',
  'laneName',
  'accountDate',
  'settlementDate',
];
const ENTRUST_FORM_FIELD_NAMES = [
  'codeSourceId',
  'codeFrtId',
  'prepareAtId',
  'codeServiceId',
  'tradeTermsType',
  'blType',
  'billType',
];
const BASIC_INFO_FIELD_ORDER = [
  'clientId',
  'carrierId',
  'vessel',
  'shipAgentId',
  'bookingAgentId',
  'teamId',
  'custBrokerId',
  'warehouseId',
  'insuranceId',
  'bookingNum',
  'mblNum',
  'yardId',
  'codeIssueTypeId',
  'signingPortId',
  'signingTime',
  'noBillEnum',
] as const;
const BASIC_INFO_FIELD_ORDER_MAP = new Map(
  BASIC_INFO_FIELD_ORDER.map((fieldName, index) => [fieldName, index]),
);
const BASIC_MODULE_EXTRA_FIELD_NAMES = [
  'clientId',
  'vessel',
  'innerVoyno',
  'carrierId',
  'shipAgentId',
  'yardId',
  'signingTime',
  'signingPortId',
] as const;
const SHIPMENT_MOVED_TO_BASIC_FIELD_NAMES = new Set([
  'bookingAgentId',
  ...BASIC_MODULE_EXTRA_FIELD_NAMES,
]);
const PORT_MOVED_TO_BASIC_FIELD_NAMES = new Set(['signingPortId']);
const SERVICE_ITEM_FIELD_NAMES = [
  'bookingAgentId',
  'teamId',
  'custBrokerId',
  'warehouseId',
  'insuranceId',
] as const;
type ServiceItemFieldName = (typeof SERVICE_ITEM_FIELD_NAMES)[number];
const SERVICE_ITEM_META: Record<
  ServiceItemFieldName,
  { industryCategory: string; label: string; icon: string }
> = {
  bookingAgentId: {
    industryCategory: 'o',
    label: '订舱代理',
    icon: 'mdi:ferry',
  },
  teamId: {
    industryCategory: 'i',
    label: '车队',
    icon: 'mdi:truck-fast-outline',
  },
  custBrokerId: {
    industryCategory: 'f',
    label: '报关行',
    icon: 'mdi:file-document-check-outline',
  },
  warehouseId: { industryCategory: 'q', label: '仓库', icon: 'mdi:warehouse' },
  insuranceId: {
    industryCategory: 'r',
    label: '保险公司',
    icon: 'mdi:shield-check-outline',
  },
};
const COLLECTION_PAYMENT_ICON = 'mdi:cash-multiple';
const SERVICE_ITEM_CHECK_FIELD_NAMES: Record<ServiceItemFieldName, string> = {
  bookingAgentId: 'bookingAgentIdEnabled',
  teamId: 'teamIdEnabled',
  custBrokerId: 'custBrokerIdEnabled',
  warehouseId: 'warehouseIdEnabled',
  insuranceId: 'insuranceIdEnabled',
};
const SERVICE_TYPE_VALUES: Record<ServiceItemFieldName, number> = {
  bookingAgentId: SERVICE_TYPE_VALUE.booking,
  teamId: SERVICE_TYPE_VALUE.truck,
  custBrokerId: SERVICE_TYPE_VALUE.customs,
  warehouseId: SERVICE_TYPE_VALUE.warehouse,
  insuranceId: SERVICE_TYPE_VALUE.insurance,
};
const COLLECTION_PAYMENT_SERVICE_TYPE = SERVICE_TYPE_VALUE.collectionPayment;
/** 暂时隐藏代收支服务项，恢复时改为 true */
const SHOW_COLLECTION_PAYMENT_FIELD = false;
const SERVICE_TYPE_TO_FIELD = new Map<number, ServiceItemFieldName>(
  SERVICE_ITEM_FIELD_NAMES.map((field) => [SERVICE_TYPE_VALUES[field], field]),
);
const SERVICE_ITEM_DEFAULT_ORDER_MAP = new Map(
  SERVICE_ITEM_FIELD_NAMES.map((field, index) => [field, index]),
);
const serviceItemLabelMap = ref(new Map<number, string>());
const serviceItemSortOrderMap = ref(new Map<ServiceItemFieldName, number>());
const getServiceItemLabel = (field: ServiceItemFieldName) => {
  const serviceType = SERVICE_TYPE_VALUES[field];
  return (
    serviceItemLabelMap.value.get(serviceType) ?? SERVICE_ITEM_META[field].label
  );
};
const loadServiceItemLabelMap = async () => {
  const options = await loadSeServiceTypeOptions();
  serviceItemLabelMap.value = buildServiceTypeLabelMap(options);
};
const SERVICE_TASK_STATUS_PENDING = 0;
const SERVICE_TASK_STATUS_PROCESSED = 1;
type ServiceTaskStatusValue =
  | typeof SERVICE_TASK_STATUS_PENDING
  | typeof SERVICE_TASK_STATUS_PROCESSED;
const SERVICE_TASK_STATUS_META: Record<
  ServiceTaskStatusValue,
  { label: string; color: string }
> = {
  [SERVICE_TASK_STATUS_PENDING]: { label: '待处理', color: 'gold' },
  [SERVICE_TASK_STATUS_PROCESSED]: { label: '已处理', color: 'green' },
};
const SERVICE_REQUIRE_PROP_TO_FIELD_NAME: Record<number, string> = {
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
const SERVICE_REQUIRE_FIELD_LABEL_KEY: Record<string, string> = {
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
type ServiceItemCheckFieldName =
  (typeof SERVICE_ITEM_CHECK_FIELD_NAMES)[ServiceItemFieldName];
const getOrderedServiceItemFields = (fields: readonly ServiceItemFieldName[]) =>
  [...fields].sort((a, b) => {
    const orderA = serviceItemSortOrderMap.value.get(a);
    const orderB = serviceItemSortOrderMap.value.get(b);
    if (orderA != null && orderB != null) {
      return orderA - orderB;
    }
    if (orderA != null) return -1;
    if (orderB != null) return 1;
    return (
      (SERVICE_ITEM_DEFAULT_ORDER_MAP.get(a) ?? Number.MAX_SAFE_INTEGER) -
      (SERVICE_ITEM_DEFAULT_ORDER_MAP.get(b) ?? Number.MAX_SAFE_INTEGER)
    );
  });
const getServiceTypesFromEnabledValues = (
  values: Record<string, any>,
  withCollectionPayment = false,
) => {
  const types = getOrderedServiceItemFields(SERVICE_ITEM_FIELD_NAMES)
    .filter((field) => {
      const checkFieldName = getServiceItemCheckFieldName(field);
      return !!values[checkFieldName];
    })
    .map((field) => SERVICE_TYPE_VALUES[field]);
  if (withCollectionPayment) {
    types.push(COLLECTION_PAYMENT_SERVICE_TYPE);
  }
  return types;
};
const extractServiceTypesFromDetail = (
  detail: SeaExportAdminApi.SeaExportDto,
): number[] => {
  const parsedServiceTypes = new Set<number>();
  const collectServiceTypes = (value: unknown) => {
    if (value == null) return;
    if (Array.isArray(value)) {
      value.forEach((item) => collectServiceTypes(item));
      return;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      parsedServiceTypes.add(value);
      return;
    }
    if (typeof value === 'string' && value.trim() !== '') {
      const numericValue = Number(value);
      if (Number.isFinite(numericValue)) {
        parsedServiceTypes.add(numericValue);
      }
      return;
    }
    if (typeof value === 'object') {
      const serviceTypeValue = (value as { serviceType?: unknown }).serviceType;
      if (serviceTypeValue !== undefined) {
        collectServiceTypes(serviceTypeValue);
      }
    }
  };

  collectServiceTypes((detail as any).serviceTypes);
  collectServiceTypes((detail as any).seaExportServices);
  collectServiceTypes((detail as any).serviceItems);

  return [...parsedServiceTypes];
};

/** 右侧表单：基础信息 */
const [BasicInfoForm, basicInfoFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  schema: [
    ...useBasicInfoFormSchema(isEdit.value).filter(
      (item) =>
        ![
          ...ENTRUST_STATIC_FIELD_NAMES,
          ...ENTRUST_FORM_FIELD_NAMES,
          'cargoId',
        ].includes(item.fieldName),
    ),
    ...useShipmentFormSchema().filter((item) =>
      BASIC_MODULE_EXTRA_FIELD_NAMES.includes(
        item.fieldName as (typeof BASIC_MODULE_EXTRA_FIELD_NAMES)[number],
      ),
    ),
    ...usePortFormSchema().filter((item) => item.fieldName === 'signingPortId'),
  ].sort((a, b) => {
    const aIndex = BASIC_INFO_FIELD_ORDER_MAP.get(a.fieldName);
    const bIndex = BASIC_INFO_FIELD_ORDER_MAP.get(b.fieldName);
    if (aIndex === undefined && bIndex === undefined) return 0;
    if (aIndex === undefined) return 1;
    if (bIndex === undefined) return -1;
    return aIndex - bIndex;
  }),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-6 gap-x-4',
});

/** 左侧表单：委托信息 */
const [EntrustInfoForm, entrustInfoFormApi] = useVbenForm({
  layout: 'horizontal',
  compact: true,
  schema: useBasicInfoFormSchema(isEdit.value)
    .filter((item) => ENTRUST_FORM_FIELD_NAMES.includes(item.fieldName))
    .sort(
      (a, b) =>
        ENTRUST_FORM_FIELD_NAMES.indexOf(a.fieldName) -
        ENTRUST_FORM_FIELD_NAMES.indexOf(b.fieldName),
    )
    .map((item) => ({
      ...item,
      componentProps:
        typeof item.componentProps === 'function'
          ? (...args: any[]) => ({
              ...(
                item.componentProps as (
                  ...innerArgs: any[]
                ) => Record<string, any>
              )(...args),
              size: 'small',
            })
          : {
              ...(item.componentProps ?? {}),
              size: 'small',
            },
      formItemClass:
        item.fieldName === 'blType' || item.fieldName === 'billType'
          ? 'col-span-1 entrust-top-label-item'
          : 'col-span-2',
    })),
  showDefaultActions: false,
  commonConfig: {
    labelWidth: 60,
  },
  wrapperClass: 'grid-cols-2 gap-x-2',
});

/** 右侧表单：船期信息 */
const [ShipmentForm, shipmentFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  schema: useShipmentFormSchema().filter(
    (item) => !SHIPMENT_MOVED_TO_BASIC_FIELD_NAMES.has(item.fieldName),
  ),
  showDefaultActions: false,
  wrapperClass: 'shipment-flow-wrap grid-cols-7 gap-x-8',
});

/** 右侧表单：服务项目（订舱代理、车队、报关行、仓库、保险公司） */
const serviceItemValues = ref<Partial<Record<ServiceItemFieldName, any>>>({});
const serviceItemEnabledValues = ref<
  Partial<Record<ServiceItemCheckFieldName, boolean>>
>({});
const serviceItemVisibleValues = ref<
  Partial<Record<ServiceItemFieldName, boolean>>
>(
  SERVICE_ITEM_FIELD_NAMES.reduce(
    (acc, field) => {
      acc[field] = true;
      return acc;
    },
    {} as Partial<Record<ServiceItemFieldName, boolean>>,
  ),
);
const serviceItemSelectedItems = ref<
  Partial<Record<ServiceItemFieldName, any[]>>
>({});
const collectionPaymentEnabled = ref(false);
const collectionPaymentDeptId = ref<number | undefined>();
const collectionPaymentDeptOptions = ref<
  Array<{ label: string; value: number }>
>([]);
const getServiceItemCheckFieldName = (field: ServiceItemFieldName) =>
  SERVICE_ITEM_CHECK_FIELD_NAMES[field] as ServiceItemCheckFieldName;
const getServiceItemChecked = (field: ServiceItemFieldName) => {
  const checkFieldName = getServiceItemCheckFieldName(field);
  return !!serviceItemEnabledValues.value[checkFieldName];
};
const getServiceItemNodeState = (
  field: ServiceItemFieldName,
): 'active' | 'done' | 'pending' => {
  if (!getServiceItemChecked(field)) return 'pending';
  const status = serviceItemTaskStatusValues.value[field];
  if (status === SERVICE_TASK_STATUS_PROCESSED) return 'done';
  return 'active';
};
const isServiceItemNodeDone = (field: ServiceItemFieldName) =>
  getServiceItemNodeState(field) === 'done';
const canToggleServiceItemNode = (field: ServiceItemFieldName) => {
  if (!isEdit.value) return true;
  const checked = getServiceItemChecked(field);
  if (!checked) return true;
  return !isServiceItemNodeDone(field);
};
const handleServiceItemNodeToggle = (field: ServiceItemFieldName) => {
  if (!canToggleServiceItemNode(field)) {
    message.warning('已完成服务不可关闭');
    return;
  }
  handleServiceItemEnabledChange(field, !getServiceItemChecked(field));
};
const getServiceItemVisible = (field: ServiceItemFieldName) => {
  return serviceItemVisibleValues.value[field] !== false;
};
const visibleServiceItemFields = computed(() =>
  getOrderedServiceItemFields(SERVICE_ITEM_FIELD_NAMES).filter((field) =>
    getServiceItemVisible(field),
  ),
);
const handleServiceItemEnabledChange = (
  field: ServiceItemFieldName,
  enabled: boolean,
) => {
  const checkFieldName = getServiceItemCheckFieldName(field);
  serviceItemEnabledValues.value = {
    ...serviceItemEnabledValues.value,
    [checkFieldName]: enabled,
  };
  if (!enabled) {
    serviceItemValues.value = {
      ...serviceItemValues.value,
      [field]: undefined,
    };
    serviceItemSelectedItems.value = {
      ...serviceItemSelectedItems.value,
      [field]: [],
    };
  }
};
const handleServiceItemValueChange = (
  field: ServiceItemFieldName,
  value: any,
) => {
  serviceItemValues.value = {
    ...serviceItemValues.value,
    [field]: value,
  };
  if (value !== undefined && value !== null && value !== '') {
    handleServiceItemEnabledChange(field, true);
  }
};
const getServiceItemSelectedItems = (field: ServiceItemFieldName) => {
  return serviceItemSelectedItems.value[field] || [];
};
const getServiceItemFormValues = (
  fallbackValues: Partial<Record<string, any>> = {},
) => {
  const values: Partial<Record<string, any>> = {};
  SERVICE_ITEM_FIELD_NAMES.forEach((field) => {
    const checkFieldName = getServiceItemCheckFieldName(field);
    const fieldValue =
      serviceItemValues.value[field] ??
      (fallbackValues as Record<string, any>)[field];
    values[field] = fieldValue;
    values[checkFieldName] =
      !!serviceItemEnabledValues.value[checkFieldName] ||
      hasServiceItemValue(fieldValue);
  });
  return values;
};
const hasServiceItemValue = (value: any) =>
  value !== undefined && value !== null && value !== '';
const serviceItemTaskStatusValues = ref<
  Partial<Record<ServiceItemFieldName, ServiceTaskStatusValue>>
>({});
const serviceItemTaskIdValues = ref<
  Partial<Record<ServiceItemFieldName, string>>
>({});
const serviceItemRequiredPropValues = ref<
  Partial<Record<ServiceItemFieldName, number[]>>
>({});
const completingServiceField = ref<ServiceItemFieldName>();
const toServiceTaskStatusValue = (
  value: unknown,
): ServiceTaskStatusValue | undefined => {
  const status = Number(value);
  if (status === SERVICE_TASK_STATUS_PENDING)
    return SERVICE_TASK_STATUS_PENDING;
  if (status === SERVICE_TASK_STATUS_PROCESSED)
    return SERVICE_TASK_STATUS_PROCESSED;
  return undefined;
};
const extractServiceTaskStatusFromDetail = (
  detail: SeaExportAdminApi.SeaExportDto,
): Partial<Record<ServiceItemFieldName, ServiceTaskStatusValue>> => {
  const result: Partial<Record<ServiceItemFieldName, ServiceTaskStatusValue>> =
    {};
  const services = (detail as any)?.seaExportServices;
  if (!Array.isArray(services)) return result;

  services.forEach((service: any) => {
    const mappedField = SERVICE_TYPE_TO_FIELD.get(Number(service?.serviceType));
    if (!mappedField) return;
    const status = toServiceTaskStatusValue(
      service?.seServiceTask?.serviceTaskStatus ?? service?.serviceTaskStatus,
    );
    if (status === undefined) return;
    result[mappedField] = status;
  });

  return result;
};
const extractServiceTaskIdFromDetail = (
  detail: SeaExportAdminApi.SeaExportDto,
): Partial<Record<ServiceItemFieldName, string>> => {
  const result: Partial<Record<ServiceItemFieldName, string>> = {};
  const services = (detail as any)?.seaExportServices;
  if (!Array.isArray(services)) return result;

  services.forEach((service: any) => {
    const mappedField = SERVICE_TYPE_TO_FIELD.get(Number(service?.serviceType));
    if (!mappedField) return;
    const rawTaskId =
      service?.seServiceTask?.id ??
      service?.seServiceTaskId ??
      service?.serviceTaskId;
    if (rawTaskId == null) return;
    const taskId = String(rawTaskId).trim();
    if (!taskId) return;
    result[mappedField] = taskId;
  });

  return result;
};
const normalizeRequiredProps = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item) && item > 0),
    ),
  ];
};
const buildServiceRequiredPropsByField = (
  availableServiceTypes: null | SeaExportAdminApi.ServiceTypeByPolDto[],
  checkedServiceTypes: null | SeaExportAdminApi.ServiceTypeByPolDto[],
) => {
  const result: Partial<Record<ServiceItemFieldName, number[]>> = {};
  const sourceMap = new Map<number, SeaExportAdminApi.ServiceTypeByPolDto>();
  (Array.isArray(availableServiceTypes) ? availableServiceTypes : []).forEach(
    (item) => {
      const serviceType = Number(item?.serviceType);
      if (!Number.isFinite(serviceType)) return;
      sourceMap.set(serviceType, item);
    },
  );
  (Array.isArray(checkedServiceTypes) ? checkedServiceTypes : []).forEach(
    (item) => {
      const serviceType = Number(item?.serviceType);
      if (!Number.isFinite(serviceType)) return;
      sourceMap.set(serviceType, item);
    },
  );

  SERVICE_ITEM_FIELD_NAMES.forEach((field) => {
    const serviceType = SERVICE_TYPE_VALUES[field];
    const matched = sourceMap.get(serviceType);
    if (!matched) return;
    result[field] = normalizeRequiredProps(matched.seServiceRequires);
  });
  return result;
};
const getServiceItemTaskStatusMeta = (field: ServiceItemFieldName) => {
  const status = serviceItemTaskStatusValues.value[field];
  if (status === undefined) return undefined;
  return SERVICE_TASK_STATUS_META[status];
};
const canCompleteServiceItem = (field: ServiceItemFieldName) => {
  const taskId = serviceItemTaskIdValues.value[field];
  const status = serviceItemTaskStatusValues.value[field];
  return (
    !!taskId &&
    status === SERVICE_TASK_STATUS_PENDING &&
    getServiceItemChecked(field)
  );
};
const isRequiredFieldFilled = (value: unknown) => {
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
const getRequiredFieldLabelByProp = (propEnum: number) => {
  const fieldName = SERVICE_REQUIRE_PROP_TO_FIELD_NAME[propEnum];
  if (!fieldName) return `字段(${propEnum})`;
  const labelKey = SERVICE_REQUIRE_FIELD_LABEL_KEY[fieldName];
  return labelKey ? $t(labelKey) : fieldName;
};
const collectCurrentFormValues = async () => {
  const [
    partyValues,
    entrustValues,
    basicValues,
    shipmentValues,
    portValues,
    cargoTypeValues,
    cargoMainValues,
    cargoRemarkValues,
  ] = await Promise.all([
    partyInfoFormApi.getValues(),
    entrustInfoFormApi.getValues(),
    basicInfoFormApi.getValues(),
    shipmentFormApi.getValues(),
    portFormApi.getValues(),
    cargoTypeInlineFormApi.getValues(),
    cargoMainFormApi.getValues(),
    cargoRemarkFormApi.getValues(),
  ]);
  return {
    commissionNum: entrustReadonlyInfo.value.commissionNum,
    accountDate: entrustReadonlyInfo.value.accountDate,
    settlementDate: entrustReadonlyInfo.value.settlementDate,
    ...partyValues,
    ...entrustValues,
    ...basicValues,
    ...getServiceItemFormValues(basicValues),
    ...shipmentValues,
    ...portValues,
    ...cargoTypeValues,
    ...cargoMainValues,
    ...cargoRemarkValues,
  } as Record<string, any>;
};
const getMissingRequiredLabelsForService = async (
  field: ServiceItemFieldName,
) => {
  const requiredProps = serviceItemRequiredPropValues.value[field] ?? [];
  if (!requiredProps.length) return [];
  const currentValues = await collectCurrentFormValues();
  const missingLabels: string[] = [];
  requiredProps.forEach((propEnum) => {
    const mappedField = SERVICE_REQUIRE_PROP_TO_FIELD_NAME[propEnum];
    if (!mappedField) return;
    if (isRequiredFieldFilled(currentValues[mappedField])) return;
    missingLabels.push(getRequiredFieldLabelByProp(propEnum));
  });
  return missingLabels;
};
const handleCompleteService = async (field: ServiceItemFieldName) => {
  if (!isEdit.value) return;
  if (completingServiceField.value) return;
  const taskId = serviceItemTaskIdValues.value[field];
  if (!taskId) {
    message.warning('当前服务暂无可完成任务');
    return;
  }
  if (
    serviceItemTaskStatusValues.value[field] === SERVICE_TASK_STATUS_PROCESSED
  ) {
    message.info('当前服务已完成');
    return;
  }
  const missingLabels = await getMissingRequiredLabelsForService(field);
  if (missingLabels.length > 0) {
    message.warning(`请先填写：${missingLabels.join('、')}，再完成服务`);
    return;
  }
  completingServiceField.value = field;
  try {
    await completeSeServiceTask({ id: taskId });
    serviceItemTaskStatusValues.value = {
      ...serviceItemTaskStatusValues.value,
      [field]: SERVICE_TASK_STATUS_PROCESSED,
    };
    message.success(`${getServiceItemLabel(field)}已完成`);
  } catch {
    message.error('完成服务失败，请稍后重试');
  } finally {
    completingServiceField.value = undefined;
  }
};
const toOptionalQueryValue = (value: unknown) => {
  if (value === undefined || value === null || value === '') return undefined;
  return value;
};
let serviceTypeLinkageRequestId = 0;
const linkedClientId = ref<unknown>(undefined);
const linkedPolId = ref<unknown>(undefined);
let serviceTypeSyncTimer: ReturnType<typeof setTimeout> | undefined;
let latestServiceTypeQueryKey = '';
const extractServiceFieldSet = (
  serviceTypes: null | SeaExportAdminApi.ServiceTypeByPolDto[],
  onlyChecked: boolean,
) => {
  const matchedFields = new Set<ServiceItemFieldName>();
  let collectionPaymentMatched = false;
  (Array.isArray(serviceTypes) ? serviceTypes : []).forEach((item) => {
    if (onlyChecked && !item?.checked) return;
    if (Number(item?.serviceType) === COLLECTION_PAYMENT_SERVICE_TYPE) {
      collectionPaymentMatched = true;
      return;
    }
    const mappedField = SERVICE_TYPE_TO_FIELD.get(Number(item?.serviceType));
    if (mappedField) {
      matchedFields.add(mappedField);
    }
  });
  return {
    matchedFields,
    collectionPaymentMatched,
  };
};
const buildServiceItemSortOrderMap = (
  serviceTypes: null | SeaExportAdminApi.ServiceTypeByPolDto[],
) => {
  const orderMap = new Map<ServiceItemFieldName, number>();
  (Array.isArray(serviceTypes) ? serviceTypes : [])
    .slice()
    .sort(
      (a, b) =>
        Number(a?.sortId ?? Number.MAX_SAFE_INTEGER) -
        Number(b?.sortId ?? Number.MAX_SAFE_INTEGER),
    )
    .forEach((item, index) => {
      const mappedField = SERVICE_TYPE_TO_FIELD.get(Number(item?.serviceType));
      if (!mappedField || orderMap.has(mappedField)) return;
      orderMap.set(mappedField, index);
    });
  return orderMap;
};
const resetServiceTypeStateWhenPolEmpty = () => {
  const nextVisibleValues: Partial<Record<ServiceItemFieldName, boolean>> = {};
  const nextEnabledValues: Partial<Record<ServiceItemCheckFieldName, boolean>> =
    {};
  const nextServiceItemValues = { ...serviceItemValues.value };
  const nextServiceItemSelectedItems = { ...serviceItemSelectedItems.value };

  SERVICE_ITEM_FIELD_NAMES.forEach((field) => {
    const checkFieldName = getServiceItemCheckFieldName(field);
    nextVisibleValues[field] = true;
    nextEnabledValues[checkFieldName] = false;
    nextServiceItemValues[field] = undefined;
    nextServiceItemSelectedItems[field] = [];
  });

  serviceItemVisibleValues.value = nextVisibleValues;
  serviceItemEnabledValues.value = nextEnabledValues;
  serviceItemValues.value = nextServiceItemValues;
  serviceItemSelectedItems.value = nextServiceItemSelectedItems;
  collectionPaymentEnabled.value = false;
  collectionPaymentDeptId.value = undefined;
  serviceItemRequiredPropValues.value = {};
  serviceItemSortOrderMap.value = new Map();
};
const applyServiceTypeStateByPol = (
  availableServiceTypes: null | SeaExportAdminApi.ServiceTypeByPolDto[],
  checkedServiceTypes: null | SeaExportAdminApi.ServiceTypeByPolDto[],
  overrides?: {
    checkedServiceFields?: Set<ServiceItemFieldName>;
    checkedCollectionPayment?: boolean;
  },
) => {
  const { matchedFields: availableServiceFields, collectionPaymentMatched } =
    extractServiceFieldSet(availableServiceTypes, false);
  const {
    matchedFields: checkedServiceFields,
    collectionPaymentMatched: checkedCollectionPayment,
  } = extractServiceFieldSet(checkedServiceTypes, true);
  const effectiveCheckedServiceFields =
    overrides?.checkedServiceFields ?? checkedServiceFields;
  const effectiveCheckedCollectionPayment =
    overrides?.checkedCollectionPayment ?? checkedCollectionPayment;

  const nextServiceItemValues = { ...serviceItemValues.value };
  const nextServiceItemSelectedItems = { ...serviceItemSelectedItems.value };
  const nextServiceEnabledValues: Partial<
    Record<ServiceItemCheckFieldName, boolean>
  > = {};
  const nextServiceVisibleValues: Partial<
    Record<ServiceItemFieldName, boolean>
  > = {};

  SERVICE_ITEM_FIELD_NAMES.forEach((field) => {
    const checkFieldName = getServiceItemCheckFieldName(field);
    const visible = availableServiceFields.has(field);
    const checked = visible && effectiveCheckedServiceFields.has(field);
    nextServiceVisibleValues[field] = visible;
    nextServiceEnabledValues[checkFieldName] = checked;
    if (!checked || !visible) {
      nextServiceItemValues[field] = undefined;
      nextServiceItemSelectedItems[field] = [];
    }
  });

  serviceItemVisibleValues.value = nextServiceVisibleValues;
  serviceItemValues.value = nextServiceItemValues;
  serviceItemSelectedItems.value = nextServiceItemSelectedItems;
  serviceItemEnabledValues.value = nextServiceEnabledValues;
  collectionPaymentEnabled.value =
    SHOW_COLLECTION_PAYMENT_FIELD &&
    collectionPaymentMatched &&
    effectiveCheckedCollectionPayment;
  if (!collectionPaymentEnabled.value) {
    collectionPaymentDeptId.value = undefined;
  }
  serviceItemRequiredPropValues.value = buildServiceRequiredPropsByField(
    availableServiceTypes,
    checkedServiceTypes,
  );
  serviceItemSortOrderMap.value = buildServiceItemSortOrderMap(
    availableServiceTypes,
  );
};
const extractServiceTypesByPolResult = (
  payload: unknown,
): null | SeaExportAdminApi.ServiceTypeByPolDto[] => {
  if (payload == null) return null;
  if (Array.isArray(payload)) {
    return payload as SeaExportAdminApi.ServiceTypeByPolDto[];
  }
  const wrappedPayload = payload as { result?: unknown };
  if (Array.isArray(wrappedPayload?.result)) {
    return wrappedPayload.result as SeaExportAdminApi.ServiceTypeByPolDto[];
  }
  return null;
};
const syncServiceTypesByPol = async (
  args: {
    clientId?: unknown;
    polId?: unknown;
    force?: boolean;
    checkedServiceFields?: Set<ServiceItemFieldName>;
    checkedCollectionPayment?: boolean;
  } = {},
) => {
  const requestId = ++serviceTypeLinkageRequestId;
  let polId = toOptionalQueryValue(args.polId ?? linkedPolId.value);
  let clientId = toOptionalQueryValue(args.clientId ?? linkedClientId.value);

  if (polId === undefined) {
    const portValues = await portFormApi.getValues();
    if (requestId !== serviceTypeLinkageRequestId) return;
    polId = toOptionalQueryValue(portValues.polId);
  }
  if (clientId === undefined) {
    const basicValues = await basicInfoFormApi.getValues();
    if (requestId !== serviceTypeLinkageRequestId) return;
    clientId = toOptionalQueryValue(basicValues.clientId);
  }
  linkedPolId.value = polId;
  linkedClientId.value = clientId;

  if (polId === undefined) {
    latestServiceTypeQueryKey = '';
    if (requestId !== serviceTypeLinkageRequestId) return;
    resetServiceTypeStateWhenPolEmpty();
    return;
  }
  const queryKey = `${String(polId)}::${clientId == null ? '' : String(clientId)}`;
  if (!args.force && queryKey === latestServiceTypeQueryKey) {
    return;
  }
  latestServiceTypeQueryKey = queryKey;
  try {
    const [serviceTypesByPolResponse, checkedServiceTypesResponse] =
      await Promise.all([
        getServiceTypesByPOL({
          polId: polId as number | string,
        }),
        clientId === undefined
          ? Promise.resolve(null)
          : getServiceTypesByPOL({
              polId: polId as number | string,
              clientId: clientId as number | string,
            }),
      ]);
    if (requestId !== serviceTypeLinkageRequestId) return;
    applyServiceTypeStateByPol(
      extractServiceTypesByPolResult(serviceTypesByPolResponse),
      extractServiceTypesByPolResult(checkedServiceTypesResponse),
      {
        checkedServiceFields: args.checkedServiceFields,
        checkedCollectionPayment: args.checkedCollectionPayment,
      },
    );
  } catch {
    if (requestId !== serviceTypeLinkageRequestId) return;
    message.warning('根据起运港查询服务项目失败');
  }
};
const queueSyncServiceTypesByPol = (args: {
  clientId?: unknown;
  polId?: unknown;
}) => {
  if (Object.prototype.hasOwnProperty.call(args, 'clientId')) {
    linkedClientId.value = toOptionalQueryValue(args.clientId);
  }
  if (Object.prototype.hasOwnProperty.call(args, 'polId')) {
    linkedPolId.value = toOptionalQueryValue(args.polId);
  }
  if (serviceTypeSyncTimer) {
    clearTimeout(serviceTypeSyncTimer);
  }
  serviceTypeSyncTimer = setTimeout(() => {
    serviceTypeSyncTimer = undefined;
    void syncServiceTypesByPol({
      clientId: linkedClientId.value,
      polId: linkedPolId.value,
    });
  }, 0);
};
const bindServiceTypeLinkageEvents = () => {
  const handleClientIdChanged = (value: unknown) => {
    queueSyncServiceTypesByPol({ clientId: value });
  };
  const handlePolIdChanged = (value: unknown) => {
    queueSyncServiceTypesByPol({ polId: value });
  };
  basicInfoFormApi.updateSchema([
    {
      fieldName: 'clientId',
      componentProps: {
        onChange: (value: unknown) => {
          handleClientIdChanged(value);
        },
      },
    },
  ]);
  portFormApi.updateSchema([
    {
      fieldName: 'polId',
      componentProps: {
        onChange: (value: unknown) => {
          handlePolIdChanged(value);
        },
      },
    },
  ]);
};
const flattenOrganizationUnitOptions = (
  nodes: SystemOrganizationUnitApi.OrganizationUnitTreeDto[],
  parentLabel = '',
): Array<{ label: string; value: number }> => {
  return nodes.flatMap((node) => {
    if (typeof node.id !== 'number') return [];
    const displayName = node.displayName || `${node.id}`;
    const currentLabel = parentLabel
      ? `${parentLabel} / ${displayName}`
      : displayName;
    const currentOption = [{ label: currentLabel, value: node.id }];
    const childOptions = Array.isArray(node.children)
      ? flattenOrganizationUnitOptions(node.children, currentLabel)
      : [];
    return [...currentOption, ...childOptions];
  });
};
const loadCollectionPaymentDeptOptions = async () => {
  try {
    const list = await getOrganizationUnitTree();
    collectionPaymentDeptOptions.value = flattenOrganizationUnitOptions(list);
  } catch {
    collectionPaymentDeptOptions.value = [];
  }
};
const handleCollectionPaymentEnabledChange = (event: any) => {
  const checked = !!event?.target?.checked;
  collectionPaymentEnabled.value = checked;
  if (!checked) {
    collectionPaymentDeptId.value = undefined;
  }
};
const handleCollectionPaymentDeptChange = (value: number | undefined) => {
  collectionPaymentDeptId.value = value;
};

/** 港口选择字段与备注字段的对应；选中港口后自动填入对应备注字段 */
const PORT_ID_FIELD_TO_REMARK_FIELD: Record<string, string> = {
  receivePortId: 'receivePortRemark',
  polId: 'polRemark',
  poT1Id: 'poT1Remark',
  poT2Id: 'poT2Remark',
  podId: 'podRemark',
  deliverPortId: 'deliverPortRemark',
};

const portFormApiRef = { current: null as any };

/** PortSelect 通过 emit `portName` 联动备注（在 data.ts 中经 `onPortName` 传入） */
const handlePortSelectPortName = (
  fieldName: string,
  portName: string | undefined,
) => {
  const remarkField = PORT_ID_FIELD_TO_REMARK_FIELD[fieldName];
  if (!remarkField || !portName) return;
  const api = portFormApiRef.current;
  if (!api) return;
  void api.setFieldValue(remarkField, portName);
};

/** 右侧表单：港口信息 */
const [PortForm, portFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  schema: usePortFormSchema({ onPortName: handlePortSelectPortName }).filter(
    (item) => !PORT_MOVED_TO_BASIC_FIELD_NAMES.has(item.fieldName),
  ),
  showDefaultActions: false,
  wrapperClass: 'port-flow-wrap grid-cols-5 gap-x-8',
});
portFormApiRef.current = portFormApi;
bindServiceTypeLinkageEvents();

const cargoSchema = useCargoFormSchema();
const cargoInlineFieldNames = new Set(['cargoId', 'orderCodeGoodss']);
const cargoTypeSchema = [
  ...useBasicInfoFormSchema(isEdit.value),
  ...cargoSchema,
]
  .filter((item) => cargoInlineFieldNames.has(item.fieldName))
  .map((item) => ({
    ...item,
    hideLabel: true,
    formItemClass:
      item.fieldName === 'orderCodeGoodss'
        ? 'cargo-type-inline-item cargo-type-inline-item--goods'
        : 'cargo-type-inline-item cargo-type-inline-item--cargo',
  }));
const [CargoTypeInlineForm, cargoTypeInlineFormApi] = useVbenForm({
  layout: 'horizontal',
  compact: true,
  schema: cargoTypeSchema,
  showDefaultActions: false,
  commonConfig: {
    labelWidth: 0,
  },
  wrapperClass: 'grid-cols-2 gap-x-3',
});
const cargoMainFieldNames = new Set([
  'pkgs',
  'codePackageId',
  'kgs',
  'cbm',
  'marks',
  'goodsDes',
]);
const cargoRemarkFieldNames = new Set(['remark', 'internalRemark']);
const cargoRemarkSchema = cargoSchema
  .filter((item) => cargoRemarkFieldNames.has(item.fieldName))
  .map((item) => ({
    ...item,
    formItemClass: 'col-span-6',
  }));

/** 中间表单：货物信息（不含备注） */
const [CargoMainForm, cargoMainFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  schema: cargoSchema.filter((item) => cargoMainFieldNames.has(item.fieldName)),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-6 gap-x-4',
});

/** 左侧表单：备注信息 */
const [CargoRemarkForm, cargoRemarkFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  schema: cargoRemarkSchema,
  showDefaultActions: false,
  wrapperClass: 'grid-cols-6 gap-x-4',
});

/** 箱型箱量数据（由 OrderCtnTable 管理） */
const orderCtns = ref<SeaExportAdminApi.OrderCtnAddDto[]>([]);
const entrustReadonlyInfo = ref({
  commissionNum: '',
  organizationUnitsText: '-',
  countryName: '',
  laneName: '',
  accountDateText: '',
  settlementDateText: '',
  isBusinessLocking: false,
  feeLocked: false,
  accountDate: undefined as unknown,
  settlementDate: undefined as unknown,
});

const refreshEntrustReadonlyInfo = (values: Record<string, any>) => {
  entrustReadonlyInfo.value = {
    commissionNum: values.commissionNum ?? '',
    organizationUnitsText: values.organizationUnitsText ?? '-',
    countryName: values.countryName ?? '',
    laneName: values.laneName ?? '',
    accountDateText: values.accountDate
      ? dayjs(values.accountDate).format('YYYY-MM')
      : '-',
    settlementDateText: values.settlementDate
      ? dayjs(values.settlementDate).format('YYYY-MM-DD')
      : '-',
    isBusinessLocking: !!values.isBusinessLocking,
    feeLocked: !!values.feeLocked,
    accountDate: values.accountDate,
    settlementDate: values.settlementDate,
  };
};

const transitPortTab = ref<'poT1' | 'poT2'>('poT1');
const transitPortLabelTarget = ref<HTMLElement | null>(null);
const podPortLabelTarget = ref<HTMLElement | null>(null);
const consigneePartyLabelTarget = ref<HTMLElement | null>(null);
const notifierPartyTab = ref<'notifier' | 'podAgent' | 'secondNotifier'>(
  'notifier',
);
const notifierPartyLabelTarget = ref<HTMLElement | null>(null);
type OrderUserEditorRow = SeaExportAdminApi.OrderUserAddDto & {
  _rowKey: string;
  userName?: string;
};
const orderUserRows = ref<OrderUserEditorRow[]>([]);
const orderUserNameMap = ref<Record<number, string>>({});
const orderUserDetailMap = ref<Record<number, SystemUserAdminApi.UserDto>>({});
const orderUserDetailLoadingMap = ref<Record<number, boolean>>({});
let orderUserRowKeyCounter = 0;
const makeOrderUserRowKey = () =>
  `order_user_${++orderUserRowKeyCounter}_${Date.now()}`;
type SectionKey = 'basic' | 'party' | 'shipment' | 'port' | 'cargo';
const sectionRefs = {
  basic: ref<HTMLElement | null>(null),
  shipment: ref<HTMLElement | null>(null),
  port: ref<HTMLElement | null>(null),
  cargo: ref<HTMLElement | null>(null),
  party: ref<HTMLElement | null>(null),
} as const;
const currentSection = ref<SectionKey>('basic');
const orderUserRoleOptions = computed(() => [
  {
    label: $t('system.user.userAttributeOptions.sales'),
    value: UserAttribute.Sales,
  },
  {
    label: $t('system.user.userAttributeOptions.business'),
    value: UserAttribute.Business,
  },
  {
    label: $t('system.user.userAttributeOptions.operation'),
    value: UserAttribute.Operation,
  },
  {
    label: $t('system.user.userAttributeOptions.customerService'),
    value: UserAttribute.CustomerService,
  },
  {
    label: $t('system.user.userAttributeOptions.documentation'),
    value: UserAttribute.Documentation,
  },
  {
    label: $t('system.user.userAttributeOptions.overseasCustomerService'),
    value: UserAttribute.OverseasCustomerService,
  },
]);
const isFixedOrderUserRole = (userAttribute?: number) =>
  userAttribute != null && fixedOrderUserRoles.has(userAttribute);
const hasOtherSameRole = (rowKey: string, userAttribute?: number) => {
  if (userAttribute == null) return false;
  return orderUserRows.value.some(
    (row) =>
      row._rowKey !== rowKey && row.userAttribute === Number(userAttribute),
  );
};
const getOrderUserRoleOptions = (rowKey: string) =>
  orderUserRoleOptions.value.map((option) => ({
    ...option,
    disabled: hasOtherSameRole(rowKey, option.value),
  }));
const getOrderUserRoleLabel = (userAttribute?: number) => {
  switch (userAttribute) {
    case UserAttribute.Sales:
      return $t('system.user.userAttributeOptions.sales');
    case UserAttribute.Business:
      return $t('system.user.userAttributeOptions.business');
    case UserAttribute.Operation:
      return $t('system.user.userAttributeOptions.operation');
    case UserAttribute.CustomerService:
      return $t('system.user.userAttributeOptions.customerService');
    case UserAttribute.Documentation:
      return $t('system.user.userAttributeOptions.documentation');
    case UserAttribute.OverseasCustomerService:
      return $t('system.user.userAttributeOptions.overseasCustomerService');
    default:
      return '-';
  }
};
const getOrderUserDisplayName = (row: OrderUserEditorRow) => {
  if (!row.userId) return row.userName || '';
  const mappedName = orderUserNameMap.value[row.userId];
  if (mappedName) return mappedName;
  if (row.userName && row.userName !== String(row.userId)) return row.userName;
  return '';
};
const getOrderUserAvatarText = (row: OrderUserEditorRow) => {
  const role = getOrderUserRoleLabel(row.userAttribute);
  return role && role !== '-' ? role.slice(0, 1) : '?';
};
const getOrderUserDetail = (userId?: number) =>
  userId ? orderUserDetailMap.value[userId] : undefined;
const isOrderUserDetailLoading = (userId?: number) =>
  !!(userId && orderUserDetailLoadingMap.value[userId]);
const getOrderUserDetailText = (value?: string) => value?.trim() || '-';
const getOrderUserStatusText = (detail?: SystemUserAdminApi.UserDto) => {
  if (!detail) return '未知';
  return detail.isActive ? '启用' : '禁用';
};
const getOrderUserStatusClass = (detail?: SystemUserAdminApi.UserDto) => {
  if (!detail?.isActive) return 'order-user-detail-card__status--inactive';
  return 'order-user-detail-card__status--active';
};
const formatOrderUserLastLogin = (lastLoginTime?: string) => {
  if (!lastLoginTime) return '-';
  return dayjs(lastLoginTime).format('YYYY-MM-DD HH:mm');
};
const syncOrderUserName = (userId: number, userName: string) => {
  orderUserNameMap.value = { ...orderUserNameMap.value, [userId]: userName };
};
const syncOrderUserDetail = (detail: SystemUserAdminApi.UserDto) => {
  orderUserDetailMap.value = {
    ...orderUserDetailMap.value,
    [detail.id]: detail,
  };
  const displayName = detail.nickName || detail.userName || String(detail.id);
  syncOrderUserName(detail.id, displayName);
};
const setOrderUserNameForRow = (
  rowKey: string | undefined,
  userId: number,
  userName: string,
) => {
  if (!rowKey) return;
  orderUserRows.value = orderUserRows.value.map((row) => {
    if (row._rowKey !== rowKey || row.userId !== userId) return row;
    return { ...row, userName };
  });
  syncOrderUsersToForm();
};
const loadOrderUserDetail = async (
  userId: number | undefined,
  rowKey?: string,
) => {
  if (!userId) return;
  const cachedDetail = orderUserDetailMap.value[userId];
  if (cachedDetail) {
    setOrderUserNameForRow(
      rowKey,
      userId,
      cachedDetail.nickName || cachedDetail.userName || String(userId),
    );
    return;
  }
  if (orderUserDetailLoadingMap.value[userId]) return;
  orderUserDetailLoadingMap.value = {
    ...orderUserDetailLoadingMap.value,
    [userId]: true,
  };
  try {
    const detail = await getUser(userId);
    syncOrderUserDetail(detail);
    const displayName = detail.nickName || detail.userName || String(userId);
    setOrderUserNameForRow(rowKey, userId, displayName);
  } catch {
    // ignore user detail fetch error for hover card
  } finally {
    orderUserDetailLoadingMap.value = {
      ...orderUserDetailLoadingMap.value,
      [userId]: false,
    };
  }
};
const withOrderUserSortId = (rows: OrderUserEditorRow[]) => {
  const total = rows.length;
  return rows.map((row, index) => ({
    ...row,
    sortId: total - index,
  }));
};
const toOptionalNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};
const hasValidUserId = (value: unknown) => {
  const parsed = toOptionalNumber(value);
  return parsed != null && parsed > 0;
};
const normalizeOrderUserItem = (item: SeaExportAdminApi.OrderUserAddDto) => ({
  ...item,
  userId: toOptionalNumber(item.userId),
  userAttribute: toOptionalNumber(item.userAttribute),
  sortId: toOptionalNumber(item.sortId),
});
const cloneOrderUsersForForm = (rows: OrderUserEditorRow[]) =>
  withOrderUserSortId(rows).map(({ _rowKey: _k, userName: _n, ...rest }) => ({
    ...rest,
  }));
const createOrderUserRows = (
  items: SeaExportAdminApi.OrderUserAddDto[] | undefined,
) => {
  if (!items?.length) {
    return defaultOrderUsers.map((item) => {
      const normalizedItem = normalizeOrderUserItem(item);
      const shouldDefaultCurrentUser =
        normalizedItem.userAttribute != null &&
        defaultCurrentUserRoleSet.has(normalizedItem.userAttribute) &&
        currentUserId.value != null;
      return {
        ...normalizedItem,
        userId: shouldDefaultCurrentUser
          ? currentUserId.value
          : normalizedItem.userId,
        _rowKey: makeOrderUserRowKey(),
      };
    });
  }
  return items.map((item) => {
    const nickName = (item as any).userNickName as string | undefined;
    return {
      ...normalizeOrderUserItem(item),
      userName: nickName || undefined,
      _rowKey: makeOrderUserRowKey(),
    };
  });
};
const syncOrderUsersToForm = () => {
  partyInfoFormApi.setValues({
    orderUsers: cloneOrderUsersForForm(orderUserRows.value),
  });
};
const fillOrderUserNames = async (rows: OrderUserEditorRow[]) => {
  const toLoadRows = rows.filter(
    (row): row is OrderUserEditorRow & { userId: number } =>
      row.userId != null && row.userId > 0,
  );
  await Promise.all(
    toLoadRows.map((row) => loadOrderUserDetail(row.userId, row._rowKey)),
  );
};
const initializeOrderUsersPanel = (
  items: SeaExportAdminApi.OrderUserAddDto[] | undefined,
) => {
  orderUserRows.value = createOrderUserRows(items);
  for (const row of orderUserRows.value) {
    if (row.userId && row.userName) {
      orderUserNameMap.value = {
        ...orderUserNameMap.value,
        [row.userId]: row.userName,
      };
    }
  }
  syncOrderUsersToForm();
};
const updateOrderUserRole = (
  rowKey: string,
  userAttribute: number | undefined,
) => {
  const currentRow = orderUserRows.value.find((row) => row._rowKey === rowKey);
  if (
    currentRow &&
    isFixedOrderUserRole(currentRow.userAttribute) &&
    userAttribute !== currentRow.userAttribute
  ) {
    message.warning(
      `${getOrderUserRoleLabel(currentRow.userAttribute)}角色不可修改`,
    );
    return;
  }
  if (hasOtherSameRole(rowKey, userAttribute)) {
    message.warning(`${getOrderUserRoleLabel(userAttribute)}角色不可重复添加`);
    return;
  }
  orderUserRows.value = orderUserRows.value.map((row) => {
    if (row._rowKey !== rowKey) return row;
    return {
      ...row,
      userAttribute,
      userId: undefined,
      userName: undefined,
    };
  });
  syncOrderUsersToForm();
};
const addOrderUserRole = () => {
  const selectedRoleSet = new Set(
    orderUserRows.value
      .map((row) => row.userAttribute)
      .filter((item): item is number => item != null),
  );
  const hasAvailableRole = orderUserRoleOptions.value.some(
    (option) => !selectedRoleSet.has(option.value),
  );
  if (!hasAvailableRole) {
    message.warning('销售/商务/操作/客服/单证角色已存在，不可重复添加');
    return;
  }
  orderUserRows.value = [
    ...orderUserRows.value,
    {
      _rowKey: makeOrderUserRowKey(),
      userAttribute: undefined,
      sortId: 0,
    },
  ];
  syncOrderUsersToForm();
};
const removeOrderUserRole = (rowKey: string) => {
  const row = orderUserRows.value.find((item) => item._rowKey === rowKey);
  if (row && isFixedOrderUserRole(row.userAttribute)) {
    message.warning(`${getOrderUserRoleLabel(row.userAttribute)}角色不可删除`);
    return;
  }
  orderUserRows.value = orderUserRows.value.filter(
    (row) => row._rowKey !== rowKey,
  );
  syncOrderUsersToForm();
};
const updateOrderUser = (rowKey: string, userId: number | undefined) => {
  orderUserRows.value = orderUserRows.value.map((row) => {
    if (row._rowKey !== rowKey) return row;
    return {
      ...row,
      userId,
      userName: userId ? orderUserNameMap.value[userId] : undefined,
    };
  });
  syncOrderUsersToForm();
  if (!userId) return;
  void loadOrderUserDetail(userId, rowKey);
};
const validateSalesRoleCount = () => {
  const salesCount = orderUserRows.value.filter(
    (row) => row.userAttribute === UserAttribute.Sales,
  ).length;
  if (salesCount !== 1) {
    message.warning('干系人中必须且只能有一个销售角色');
    return false;
  }
  return true;
};
const validateOrderUserRequiredAssignee = () => {
  for (const role of requiredOrderUserRoles) {
    const row = orderUserRows.value.find((item) => item.userAttribute === role);
    if (!row?.userId) {
      message.warning(`${getOrderUserRoleLabel(role)}必须选择人员`);
      return false;
    }
  }
  return true;
};
const refreshPortLabelTargets = () => {
  nextTick(() => {
    transitPortLabelTarget.value = document.querySelector(
      '.port-flow-wrap .port-flow-item--transit:not(.port-flow-item--hidden) > label',
    ) as HTMLElement | null;
    podPortLabelTarget.value = document.querySelector(
      '.port-flow-wrap .port-flow-pos--pod > label',
    ) as HTMLElement | null;
  });
};

const applyTransitPortTabSchema = () => {
  const isPoT1Active = transitPortTab.value === 'poT1';
  portFormApi.updateSchema([
    {
      fieldName: 'poT1Id',
      label: isPoT1Active ? '中转港1' : '中转港',
      formItemClass: `port-flow-item port-flow-item--transit port-flow-pos--transit${
        isPoT1Active ? '' : ' port-flow-item--hidden'
      }`,
    },
    {
      fieldName: 'poT2Id',
      label: isPoT1Active ? '中转港' : '中转港2',
      formItemClass: `port-flow-item port-flow-item--transit port-flow-item--transit-secondary port-flow-pos--transit${
        isPoT1Active ? ' port-flow-item--hidden' : ''
      }`,
    },
    {
      fieldName: 'poT1Remark',
      formItemClass: `port-flow-remark port-flow-remark--transit port-flow-pos--transit-remark${
        isPoT1Active ? '' : ' port-flow-item--hidden'
      }`,
    },
    {
      fieldName: 'poT2Remark',
      formItemClass: `port-flow-remark port-flow-remark--transit port-flow-remark--transit-secondary port-flow-pos--transit-remark${
        isPoT1Active ? ' port-flow-item--hidden' : ''
      }`,
    },
  ]);
  refreshPortLabelTargets();
};

const switchTransitPortTab = (tab: 'poT1' | 'poT2') => {
  if (transitPortTab.value === tab) return;
  transitPortTab.value = tab;
  applyTransitPortTabSchema();
};

const applyNotifierPartyTabSchema = () => {
  const isNotifierActive = notifierPartyTab.value === 'notifier';
  const isSecondNotifierActive = notifierPartyTab.value === 'secondNotifier';
  const isPodAgentActive = notifierPartyTab.value === 'podAgent';
  partyInfoFormApi.updateSchema([
    {
      fieldName: 'notifierId',
      label: $t('seaExport.export.notifierId'),
      formItemClass: `party-flow-item party-flow-item--notifier party-flow-pos--3${
        isNotifierActive ? '' : ' party-flow-item--hidden'
      }`,
    },
    {
      fieldName: 'notifierContent',
      formItemClass: `party-flow-content party-flow-content--notifier party-flow-content-pos--3${
        isNotifierActive ? '' : ' party-flow-item--hidden'
      }`,
    },
    {
      fieldName: 'secondNotifierId',
      label: $t('seaExport.export.secondNotifierId'),
      formItemClass: `party-flow-item party-flow-item--notifier party-flow-item--notifier-secondary party-flow-pos--3${
        isSecondNotifierActive ? '' : ' party-flow-item--hidden'
      }`,
    },
    {
      fieldName: 'secondNotifierContent',
      formItemClass: `party-flow-content party-flow-content--notifier party-flow-content--notifier-secondary party-flow-content-pos--3${
        isSecondNotifierActive ? '' : ' party-flow-item--hidden'
      }`,
    },
    {
      fieldName: 'podAgentId',
      label: $t('seaExport.export.overseasAgent'),
      formItemClass: `party-flow-item party-flow-item--notifier party-flow-item--notifier-pod-agent party-flow-pos--3${
        isPodAgentActive ? '' : ' party-flow-item--hidden'
      }`,
    },
    {
      fieldName: 'podAgentContent',
      formItemClass: `party-flow-content party-flow-content--notifier party-flow-content--notifier-pod-agent party-flow-content-pos--3${
        isPodAgentActive ? '' : ' party-flow-item--hidden'
      }`,
    },
  ]);
  nextTick(() => {
    consigneePartyLabelTarget.value = document.querySelector(
      '.party-flow-wrap .party-flow-pos--2 > label',
    ) as HTMLElement | null;
    notifierPartyLabelTarget.value = document.querySelector(
      '.party-flow-wrap .party-flow-item--notifier:not(.party-flow-item--hidden) > label',
    ) as HTMLElement | null;
  });
};

const switchNotifierPartyTab = (
  tab: 'notifier' | 'podAgent' | 'secondNotifier',
) => {
  if (notifierPartyTab.value === tab) return;
  notifierPartyTab.value = tab;
  applyNotifierPartyTabSchema();
};

const copyConsigneeToNotifier = async () => {
  const partyValues = await partyInfoFormApi.getValues();
  await partyInfoFormApi.setValues({
    notifierId: partyValues.consigneeId ?? undefined,
    notifierContent: partyValues.consigneeContent ?? '',
  });
  if (notifierPartyTab.value !== 'notifier') {
    notifierPartyTab.value = 'notifier';
    applyNotifierPartyTabSchema();
  }
  message.success('已复制收货人到通知人');
};

const scrollToSection = (key: SectionKey) => {
  const el = sectionRefs[key].value;
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - 150;
  window.scrollTo({ top, behavior: 'smooth' });
  if (currentSection.value !== key) {
    currentSection.value = key;
    emit('sectionChange', key);
  }
};

const updateActiveSectionByScroll = () => {
  const order: SectionKey[] = ['basic', 'party', 'shipment', 'port', 'cargo'];
  const offset = 190;
  let current: SectionKey = 'basic';
  for (const key of order) {
    const el = sectionRefs[key].value;
    if (!el) continue;
    if (el.getBoundingClientRect().top <= offset) {
      current = key;
    }
  }
  if (currentSection.value !== current) {
    currentSection.value = current;
    emit('sectionChange', current);
  }
};

/** DatePicker 需要的 dayjs 对象，API 返回的是字符串 */
const toDayjs = (val: string | null | undefined) =>
  val && dayjs(val).isValid() ? dayjs(val) : undefined;

const AI_RECOGNIZE_ALLOWED_FIELDS = new Set([
  'blType',
  'billType',
  'codeIssueTypeId',
  'issueType',
  'vessel',
  'innerVoyno',
  'carrierId',
  'secondNotifierId',
  'secondNotifierContent',
  'podAgentId',
  'podAgentContent',
  'bookingAgentId',
  'shipAgentId',
  'yardId',
  'noBillEnum',
  'copyNoBillEnum',
  'prepareAtId',
  'closingTime',
  'closeVgmTime',
  'closeDocTime',
  'closeManifestTime',
  'signingTime',
  'signingPortId',
  'podId',
  'podRemark',
  'polId',
  'polRemark',
  'poT1Id',
  'poT1Remark',
  'poT2Id',
  'poT2Remark',
  'receivePortId',
  'receivePortRemark',
  'deliverPortId',
  'deliverPortRemark',
  'remark',
  'commissionNum',
  'mblNum',
  'bookingNum',
  'accountDate',
  'settlementDate',
  'codeSourceId',
  'codeFrtId',
  'codeServiceId',
  'cargoId',
  'tradeTermsType',
  'goodsCompleteTime',
  'etd',
  'atd',
  'eta',
  'clientId',
  'teamId',
  'custBrokerId',
  'warehouseId',
  'insuranceId',
  'consigneeId',
  'consigneeContent',
  'shipperId',
  'shipperContent',
  'notifierId',
  'notifierContent',
  'marks',
  'pkgs',
  'codePackageId',
  'goodsDes',
  'kgs',
  'cbm',
  'internalRemark',
  'serviceTypes',
]);
const AI_RECOGNIZE_DATE_FIELDS = new Set([
  'goodsCompleteTime',
  'etd',
  'atd',
  'eta',
  'closingTime',
  'closeVgmTime',
  'closeDocTime',
  'closeManifestTime',
  'signingTime',
  'accountDate',
  'settlementDate',
]);
const isPlainObject = (value: unknown): value is Record<string, any> =>
  Object.prototype.toString.call(value) === '[object Object]';
const normalizeOcrFieldName = (field: string) =>
  field ? `${field.charAt(0).toLowerCase()}${field.slice(1)}` : field;
const normalizeOcrLookupKey = (field: string) =>
  (field || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_:/\\.\-()]+/g, '');
const AI_RECOGNIZE_FIELD_ALIASES: Record<string, string> = {
  bookingno: 'bookingNum',
  blno: 'mblNum',
  vessel: 'vessel',
  voyage: 'innerVoyno',
  marks: 'marks',
  noofpackages: 'pkgs',
  numberofcontainersorpackages: 'pkgs',
  grossweight: 'kgs',
  measurement: 'cbm',
  descriptionofgoods: 'goodsDes',
  shipper: 'shipperContent',
  consignee: 'consigneeContent',
  notifyparty: 'notifierContent',
  portofloading: 'polRemark',
  portofdischarge: 'podRemark',
  placeofreceipt: 'receivePortRemark',
  placeofdelivery: 'deliverPortRemark',
  发货人: 'shipperContent',
  收货人: 'consigneeContent',
  通知人: 'notifierContent',
  船名: 'vessel',
  航次: 'innerVoyno',
  起运港: 'polRemark',
  卸货港: 'podRemark',
  收货地: 'receivePortRemark',
  交货地: 'deliverPortRemark',
  船期: 'etd',
};
const parseNumberFromText = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return undefined;
  const matched = value.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  if (!matched) return undefined;
  const parsed = Number(matched[0]);
  return Number.isFinite(parsed) ? parsed : undefined;
};
const normalizeAiFieldValue = (field: string, value: unknown) => {
  if (AI_RECOGNIZE_DATE_FIELDS.has(field)) {
    return toDayjs(value as string | undefined);
  }
  if (field === 'pkgs' || field === 'kgs' || field === 'cbm') {
    return parseNumberFromText(value);
  }
  if (field === 'mblNum' || field === 'bookingNum' || field === 'innerVoyno') {
    return typeof value === 'string' ? value.trim() : value;
  }
  return value;
};
const extractOcrFieldPayload = (payload: unknown): Record<string, any> => {
  let parsedPayload = payload;
  if (typeof parsedPayload === 'string') {
    try {
      parsedPayload = JSON.parse(parsedPayload);
    } catch {
      return {};
    }
  }
  if (Array.isArray(parsedPayload)) {
    parsedPayload = parsedPayload[0];
  }
  if (!isPlainObject(parsedPayload)) return {};

  const rawObject = parsedPayload as Record<string, any>;
  for (const key of ['fields', 'fieldMap', 'ocrFields', 'data', 'result']) {
    if (isPlainObject(rawObject[key])) {
      return rawObject[key];
    }
  }
  return rawObject;
};
const buildAiRecognizedFormValues = (payload: unknown) => {
  const basePayload = extractOcrFieldPayload(payload);
  const mergedPayload: Record<string, any> = {};
  const mergePayloadObject = (source: unknown) => {
    if (!isPlainObject(source)) return;
    Object.entries(source).forEach(([rawKey, value]) => {
      const normalizedKey = normalizeOcrFieldName(rawKey);
      mergedPayload[normalizedKey] = value;
    });
  };

  mergePayloadObject(basePayload);
  mergePayloadObject(basePayload.transportOrder);
  mergePayloadObject(basePayload.seaExport);
  mergePayloadObject(basePayload.transportOrderDto);
  mergePayloadObject(basePayload.seaExportDto);

  const formValues: Record<string, any> = {};
  const applyRecognizedValue = (field: string, value: unknown) => {
    if (!AI_RECOGNIZE_ALLOWED_FIELDS.has(field)) return;
    if (value === undefined) return;
    const normalizedValue = normalizeAiFieldValue(field, value);
    if (normalizedValue === undefined) return;
    formValues[field] = normalizedValue;
  };
  Object.entries(mergedPayload).forEach(([rawField, value]) => {
    const field = normalizeOcrFieldName(rawField);
    applyRecognizedValue(field, value);
    const aliasField =
      AI_RECOGNIZE_FIELD_ALIASES[normalizeOcrLookupKey(rawField)];
    if (aliasField) {
      applyRecognizedValue(aliasField, value);
    }
  });
  if (!Array.isArray(formValues.serviceTypes)) {
    delete formValues.serviceTypes;
  } else {
    formValues.serviceTypes = formValues.serviceTypes
      .map((item: unknown) => Number(item))
      .filter((item: number) => Number.isFinite(item));
  }
  if (
    formValues.codeIssueTypeId == null &&
    formValues.issueType != null &&
    Number.isFinite(Number(formValues.issueType))
  ) {
    formValues.codeIssueTypeId = Number(formValues.issueType);
  }
  return formValues;
};
const applyAiRecognizedFormValues = async (values: Record<string, any>) => {
  await Promise.all([
    partyInfoFormApi.setValues(values),
    entrustInfoFormApi.setValues(values),
    basicInfoFormApi.setValues(values),
    shipmentFormApi.setValues(values),
    portFormApi.setValues(values),
    cargoTypeInlineFormApi.setValues(values),
    cargoMainFormApi.setValues(values),
    cargoRemarkFormApi.setValues(values),
  ]);

  let touchedServiceItems = false;
  const nextServiceItemValues = { ...serviceItemValues.value };
  SERVICE_ITEM_FIELD_NAMES.forEach((field) => {
    if (!Object.prototype.hasOwnProperty.call(values, field)) return;
    touchedServiceItems = true;
    nextServiceItemValues[field] = values[field];
  });
  if (touchedServiceItems) {
    serviceItemValues.value = nextServiceItemValues;
  }

  if (Array.isArray(values.serviceTypes)) {
    const selectedServiceTypes = new Set<number>(
      values.serviceTypes.map((type: unknown) => Number(type)),
    );
    serviceItemEnabledValues.value = {
      bookingAgentIdEnabled:
        selectedServiceTypes.has(SERVICE_TYPE_VALUES.bookingAgentId) ||
        hasServiceItemValue(nextServiceItemValues.bookingAgentId),
      teamIdEnabled:
        selectedServiceTypes.has(SERVICE_TYPE_VALUES.teamId) ||
        hasServiceItemValue(nextServiceItemValues.teamId),
      custBrokerIdEnabled:
        selectedServiceTypes.has(SERVICE_TYPE_VALUES.custBrokerId) ||
        hasServiceItemValue(nextServiceItemValues.custBrokerId),
      warehouseIdEnabled:
        selectedServiceTypes.has(SERVICE_TYPE_VALUES.warehouseId) ||
        hasServiceItemValue(nextServiceItemValues.warehouseId),
      insuranceIdEnabled:
        selectedServiceTypes.has(SERVICE_TYPE_VALUES.insuranceId) ||
        hasServiceItemValue(nextServiceItemValues.insuranceId),
    };
  } else if (touchedServiceItems) {
    const nextServiceEnabledValues = { ...serviceItemEnabledValues.value };
    SERVICE_ITEM_FIELD_NAMES.forEach((field) => {
      if (!Object.prototype.hasOwnProperty.call(values, field)) return;
      const checkFieldName = getServiceItemCheckFieldName(field);
      nextServiceEnabledValues[checkFieldName] = hasServiceItemValue(
        nextServiceItemValues[field],
      );
    });
    serviceItemEnabledValues.value = nextServiceEnabledValues;
  }

  refreshEntrustReadonlyInfo({
    ...entrustReadonlyInfo.value,
    commissionNum:
      values.commissionNum ?? entrustReadonlyInfo.value.commissionNum,
    accountDate: values.accountDate ?? entrustReadonlyInfo.value.accountDate,
    settlementDate:
      values.settlementDate ?? entrustReadonlyInfo.value.settlementDate,
  });
};

/** 提交时 dayjs/日期 转回 ISO 字符串 */
const toDateString = (val: unknown) => {
  if (val == null) return undefined;
  const d = dayjs(val as string | Date);
  return d.isValid() ? d.toISOString() : undefined;
};

const flattenDetail = (
  detail: SeaExportAdminApi.SeaExportDto,
): Record<string, any> => {
  const to = detail.transportOrder;
  const prepareAtId = to?.prepareAtId ?? (detail as any)?.prepareAtId;
  return {
    countryName: (detail as any).countryName,
    laneName: (detail as any).laneName,
    blType: detail.blType,
    billType: detail.billType,
    codeIssueTypeId: (detail as any).codeIssueTypeId ?? detail.issueType,
    vessel: detail.vessel,
    innerVoyno: detail.innerVoyno,
    carrierId: detail.carrierId,
    secondNotifierId: detail.secondNotifierId,
    secondNotifierContent: detail.secondNotifierContent,
    podAgentId: detail.podAgentId,
    podAgentContent: detail.podAgentContent,
    bookingAgentId: detail.bookingAgentId,
    shipAgentId: detail.shipAgentId,
    yardId: detail.yardId,
    noBillEnum: detail.noBillEnum,
    copyNoBillEnum: detail.copyNoBillEnum,
    goodsCompleteTime: toDayjs(
      to?.goodsCompleteTime ?? detail.goodsCompleteTime,
    ),
    etd: toDayjs(to?.etd ?? detail.etd),
    atd: toDayjs(to?.atd ?? detail.atd),
    eta: toDayjs(to?.eta ?? detail.eta),
    closingTime: toDayjs(detail.closingTime),
    closeVgmTime: toDayjs(detail.closeVgmTime),
    closeDocTime: toDayjs(detail.closeDocTime),
    closeManifestTime: toDayjs(detail.closeManifestTime),
    signingTime: toDayjs(detail.signingTime),
    sortId: detail.sortId,
    remark: detail.remark,
    commissionNum: to?.commissionNum,
    mblNum: to?.mblNum,
    bookingNum: to?.bookingNum,
    accountDate: toDayjs(to?.accountDate),
    settlementDate: toDayjs(to?.settlementDate),
    organizationUnitsText:
      detail.organizationUnits
        ?.map((item) => item?.name)
        .filter((name): name is string => !!name)
        .join('、') || '-',
    codeSourceId: to?.codeSourceId,
    isBusinessLocking: to?.isBusinessLocking,
    feeLocked: to?.feeLocked,
    codeFrtId: to?.codeFrtId,
    prepareAtId,
    codeServiceId: to?.codeServiceId,
    cargoId: to?.cargoId,
    tradeTermsType: to?.tradeTermsType,
    serviceTypes: extractServiceTypesFromDetail(detail),
    polId: detail.polId,
    polRemark: detail.polRemark,
    podId: detail.podId,
    podRemark: detail.podRemark,
    poT1Id: detail.poT1Id,
    poT1Remark: detail.poT1Remark,
    poT2Id: detail.poT2Id,
    poT2Remark: detail.poT2Remark,
    receivePortId: detail.receivePortId,
    receivePortRemark: detail.receivePortRemark,
    deliverPortId: detail.deliverPortId,
    deliverPortRemark: detail.deliverPortRemark,
    signingPortId: detail.signingPortId,
    clientId: to?.clientId,
    teamId: to?.teamId,
    custBrokerId: to?.custBrokerId,
    warehouseId: to?.warehouseId,
    insuranceId: to?.insuranceId,
    consigneeId: to?.consigneeId,
    consigneeContent: to?.consigneeContent,
    shipperId: to?.shipperId,
    shipperContent: to?.shipperContent,
    notifierId: to?.notifierId,
    notifierContent: to?.notifierContent,
    marks: to?.marks,
    pkgs: to?.pkgs,
    codePackageId: to?.codePackageId,
    goodsDes: to?.goodsDes,
    kgs: to?.kgs,
    cbm: to?.cbm,
    internalRemark: to?.internalRemark,
    orderCodeGoodss: (to?.orderCodeGoodss ?? [])
      .map((item: any) => item?.codeGoodsId)
      .filter((id: any) => id !== undefined && id !== null),
    orderUsers: to?.orderUsers ?? [],
  };
};

/** 为 orderCtns 每项添加 _rowKey，供 Table 使用 */
const normalizeOrderCtnsWithRowKey = (
  items: SeaExportAdminApi.OrderCtnAddDto[] | undefined,
) => {
  if (!items?.length) return [];
  return items.map((item, i) => ({
    ...item,
    _rowKey: `ctn_${i}_${Date.now()}`,
  })) as any[];
};

const ORDER_CTN_API_KEYS: Array<
  Extract<keyof SeaExportAdminApi.OrderCtnAddDto, string>
> = [
  'ctnCodeId',
  'ctnNo',
  'sealNo',
  'pkgs',
  'codePackageId',
  'grossWeight',
  'tareWeight',
  'overLength',
  'overWidth',
  'overHeight',
  'volume',
  'codeGoodsId',
  'bookingNo',
  'remark',
];

const ORDER_USER_API_KEYS: Array<
  Extract<keyof SeaExportAdminApi.OrderUserAddDto, string>
> = ['userId', 'userAttribute', 'sortId', 'remark'];

/** 提交时移除 _rowKey 等非 API 字段，仅保留 OrderCtnAddDto 字段 */
const sanitizeOrderCtns = (
  items: any[] | undefined,
): SeaExportAdminApi.OrderCtnAddDto[] => {
  if (!items?.length) return [];
  return items.map((item) => {
    const dto: Record<string, any> = {};
    for (const key of ORDER_CTN_API_KEYS) {
      const val = item[key];
      if (val !== undefined && val !== null) {
        if (typeof val === 'string' && val === '') continue;
        dto[key] = val;
      }
    }
    return dto as SeaExportAdminApi.OrderCtnAddDto;
  });
};

/** 提交时移除 userName 等非 API 字段，仅保留 OrderUserAddDto 字段 */
const sanitizeOrderUsers = (
  items: any[] | undefined,
): SeaExportAdminApi.OrderUserAddDto[] => {
  if (!items?.length) return [];
  return items
    .map((item) => {
      const dto: Record<string, any> = {};
      for (const key of ORDER_USER_API_KEYS) {
        const val = item[key];
        if (val !== undefined && val !== null) {
          if (typeof val === 'string' && val === '') continue;
          dto[key] = val;
        }
      }
      return dto as SeaExportAdminApi.OrderUserAddDto;
    })
    .filter((item) => hasValidUserId(item.userId));
};

/**
 * 从 id + name 构建 select 组件的 selectedItems，
 * 避免每个 select 组件单独调详情接口回显。
 * @param labelKey 对应 select 组件的 labelKey，如 ClientSelect 用 'name'，CarrierSelect/PortSelect 用 'cnName'
 */
const toSelectedItems = (
  id: any,
  name: any,
  labelKey = 'name',
  extra: Record<string, any> = {},
) => {
  if (id == null) return [];
  return [{ id, [labelKey]: name || '', ...extra }] as any[];
};

const loadEditData = async () => {
  if (!editId.value) return;

  pageLoading.value = true;
  try {
    const detail = await getSeaExportDetail(editId.value);
    transportOrderId.value = detail.transportOrder?.id;
    const formValues = flattenDetail(detail);
    const to = detail.transportOrder;

    partyInfoFormApi.updateSchema([
      {
        fieldName: 'shipperId',
        componentProps: {
          selectedItems: toSelectedItems(
            to?.shipperId,
            (to as any)?.shipperName,
          ),
        },
      },
      {
        fieldName: 'consigneeId',
        componentProps: {
          selectedItems: toSelectedItems(
            to?.consigneeId,
            (to as any)?.consigneeName,
          ),
        },
      },
      {
        fieldName: 'notifierId',
        componentProps: {
          selectedItems: toSelectedItems(
            to?.notifierId,
            (to as any)?.notifierName,
          ),
        },
      },
      {
        fieldName: 'secondNotifierId',
        componentProps: {
          selectedItems: toSelectedItems(
            detail.secondNotifierId,
            detail.secondNotifierName,
          ),
        },
      },
      {
        fieldName: 'podAgentId',
        componentProps: {
          selectedItems: toSelectedItems(
            detail.podAgentId,
            detail.podAgentName,
          ),
        },
      },
    ]);

    entrustInfoFormApi.updateSchema([
      {
        fieldName: 'codeSourceId',
        componentProps: {
          selectedItems: toSelectedItems(
            to?.codeSourceId,
            (to as any)?.codeSourceName,
            'cnName',
          ),
        },
      },
      {
        fieldName: 'codeFrtId',
        componentProps: {
          selectedItems: toSelectedItems(
            to?.codeFrtId,
            (to as any)?.codeFrtName,
            'cnName',
          ),
        },
      },
      {
        fieldName: 'prepareAtId',
        componentProps: {
          selectedItems: toSelectedItems(
            formValues.prepareAtId,
            (to as any)?.prepareAtName ?? (detail as any)?.prepareAtName,
            'cnName',
          ),
        },
      },
      {
        fieldName: 'codeServiceId',
        componentProps: {
          selectedItems: toSelectedItems(
            to?.codeServiceId,
            (to as any)?.codeServiceName,
            'cnName',
          ),
        },
      },
    ]);

    basicInfoFormApi.updateSchema([
      {
        fieldName: 'clientId',
        componentProps: {
          selectedItems: toSelectedItems(to?.clientId, (to as any)?.clientName),
        },
      },
      {
        fieldName: 'codeIssueTypeId',
        componentProps: {
          selectedItems: toSelectedItems(
            (detail as any).codeIssueTypeId ?? detail.issueType,
            (detail as any).codeIssueTypeName ?? (detail as any).issueTypeName,
            'billType',
          ),
        },
      },
      {
        fieldName: 'carrierId',
        componentProps: {
          selectedItems: toSelectedItems(
            detail.carrierId,
            detail.carrierName,
            'cnName',
            detail.carrierLogo ? { logo: detail.carrierLogo } : {},
          ),
        },
      },
      {
        fieldName: 'shipAgentId',
        componentProps: {
          selectedItems: toSelectedItems(
            detail.shipAgentId,
            detail.shipAgentName,
          ),
        },
      },
      {
        fieldName: 'yardId',
        componentProps: {
          selectedItems: toSelectedItems(detail.yardId, detail.yardName),
        },
      },
      {
        fieldName: 'signingPortId',
        componentProps: {
          selectedItems: toSelectedItems(
            formValues.signingPortId,
            detail.signingPortName,
            'cnName',
          ),
        },
      },
    ]);
    serviceItemSelectedItems.value = {
      bookingAgentId: toSelectedItems(
        detail.bookingAgentId,
        detail.bookingAgentName,
      ),
      teamId: toSelectedItems(to?.teamId, (to as any)?.teamName),
      custBrokerId: toSelectedItems(
        to?.custBrokerId,
        (to as any)?.custBrokerName,
      ),
      warehouseId: toSelectedItems(to?.warehouseId, (to as any)?.warehouseName),
      insuranceId: toSelectedItems(to?.insuranceId, (to as any)?.insuranceName),
    };
    serviceItemTaskStatusValues.value =
      extractServiceTaskStatusFromDetail(detail);
    serviceItemTaskIdValues.value = extractServiceTaskIdFromDetail(detail);

    portFormApi.updateSchema([
      {
        fieldName: 'polId',
        componentProps: {
          selectedItems: toSelectedItems(
            formValues.polId,
            detail.polName,
            'cnName',
          ),
        },
      },
      {
        fieldName: 'podId',
        componentProps: {
          selectedItems: toSelectedItems(
            formValues.podId,
            detail.podName,
            'cnName',
          ),
        },
      },
      {
        fieldName: 'poT1Id',
        componentProps: {
          selectedItems: toSelectedItems(
            formValues.poT1Id,
            detail.poT1Name,
            'cnName',
          ),
        },
      },
      {
        fieldName: 'poT2Id',
        componentProps: {
          selectedItems: toSelectedItems(
            formValues.poT2Id,
            detail.poT2Name,
            'cnName',
          ),
        },
      },
      {
        fieldName: 'receivePortId',
        componentProps: {
          selectedItems: toSelectedItems(
            formValues.receivePortId,
            detail.receivePortName,
            'cnName',
          ),
        },
      },
      {
        fieldName: 'deliverPortId',
        componentProps: {
          selectedItems: toSelectedItems(
            formValues.deliverPortId,
            detail.deliverPortName,
            'cnName',
          ),
        },
      },
    ]);
    cargoMainFormApi.updateSchema([
      {
        fieldName: 'codePackageId',
        componentProps: {
          selectedItems: toSelectedItems(
            formValues.codePackageId,
            (to as any)?.codePackageName,
          ),
        },
      },
    ]);

    await Promise.all([
      partyInfoFormApi.setValues(formValues),
      entrustInfoFormApi.setValues(formValues),
      basicInfoFormApi.setValues(formValues),
      shipmentFormApi.setValues(formValues),
      portFormApi.setValues(formValues),
      cargoTypeInlineFormApi.setValues(formValues),
      cargoMainFormApi.setValues(formValues),
      cargoRemarkFormApi.setValues(formValues),
    ]);
    initializeOrderUsersPanel(to?.orderUsers ?? []);
    serviceItemValues.value = {
      bookingAgentId: formValues.bookingAgentId,
      teamId: formValues.teamId,
      custBrokerId: formValues.custBrokerId,
      warehouseId: formValues.warehouseId,
      insuranceId: formValues.insuranceId,
    };
    const selectedServiceTypes = new Set<number>(
      Array.isArray(formValues.serviceTypes)
        ? formValues.serviceTypes.map((type: number) => Number(type))
        : [],
    );
    serviceItemEnabledValues.value = {
      bookingAgentIdEnabled:
        selectedServiceTypes.has(SERVICE_TYPE_VALUES.bookingAgentId) ||
        hasServiceItemValue(formValues.bookingAgentId),
      teamIdEnabled:
        selectedServiceTypes.has(SERVICE_TYPE_VALUES.teamId) ||
        hasServiceItemValue(formValues.teamId),
      custBrokerIdEnabled:
        selectedServiceTypes.has(SERVICE_TYPE_VALUES.custBrokerId) ||
        hasServiceItemValue(formValues.custBrokerId),
      warehouseIdEnabled:
        selectedServiceTypes.has(SERVICE_TYPE_VALUES.warehouseId) ||
        hasServiceItemValue(formValues.warehouseId),
      insuranceIdEnabled:
        selectedServiceTypes.has(SERVICE_TYPE_VALUES.insuranceId) ||
        hasServiceItemValue(formValues.insuranceId),
    };
    if (SHOW_COLLECTION_PAYMENT_FIELD) {
      const collectionPaymentSelected = selectedServiceTypes.has(
        COLLECTION_PAYMENT_SERVICE_TYPE,
      );
      collectionPaymentEnabled.value = collectionPaymentSelected;
      const selectedOrganizationId = detail.organizationUnits?.[0]?.id;
      collectionPaymentDeptId.value =
        collectionPaymentSelected && typeof selectedOrganizationId === 'number'
          ? selectedOrganizationId
          : undefined;
    } else {
      collectionPaymentEnabled.value = false;
      collectionPaymentDeptId.value = undefined;
    }
    const checkedServiceFields = new Set<ServiceItemFieldName>();
    SERVICE_ITEM_FIELD_NAMES.forEach((field) => {
      if (selectedServiceTypes.has(SERVICE_TYPE_VALUES[field])) {
        checkedServiceFields.add(field);
      }
    });
    refreshEntrustReadonlyInfo(formValues);

    orderCtns.value = normalizeOrderCtnsWithRowKey(
      detail.transportOrder?.orderCtns as any,
    );
    await syncServiceTypesByPol({
      polId: formValues.polId,
      clientId: formValues.clientId,
      force: true,
      checkedServiceFields,
      checkedCollectionPayment: selectedServiceTypes.has(
        COLLECTION_PAYMENT_SERVICE_TYPE,
      ),
    });
  } finally {
    pageLoading.value = false;
  }
};

const buildDto = (values: Record<string, any>) => {
  const seaExportFields: Record<string, any> = {
    blType: values.blType ?? undefined,
    billType: values.billType ?? undefined,
    codeIssueTypeId: values.codeIssueTypeId ?? values.issueType ?? undefined,
    issueType: values.codeIssueTypeId ?? values.issueType ?? undefined,
    vessel: values.vessel,
    innerVoyno: values.innerVoyno,
    carrierId: values.carrierId ?? undefined,
    secondNotifierId: values.secondNotifierId ?? undefined,
    secondNotifierContent: values.secondNotifierContent,
    podAgentId: values.podAgentId ?? undefined,
    podAgentContent: values.podAgentContent,
    bookingAgentId: values.bookingAgentId ?? undefined,
    shipAgentId: values.shipAgentId ?? undefined,
    yardId: values.yardId ?? undefined,
    noBillEnum: values.noBillEnum ?? undefined,
    copyNoBillEnum: values.copyNoBillEnum ?? undefined,
    prepareAtId: values.prepareAtId ?? undefined,
    closingTime: toDateString(values.closingTime),
    closeVgmTime: toDateString(values.closeVgmTime),
    closeDocTime: toDateString(values.closeDocTime),
    closeManifestTime: toDateString(values.closeManifestTime),
    signingTime: toDateString(values.signingTime),
    signingPortId: values.signingPortId ?? undefined,
    podId: values.podId ?? undefined,
    podRemark: values.podRemark,
    polId: values.polId ?? undefined,
    polRemark: values.polRemark,
    poT1Id: values.poT1Id ?? undefined,
    poT1Remark: values.poT1Remark,
    poT2Id: values.poT2Id ?? undefined,
    poT2Remark: values.poT2Remark,
    receivePortId: values.receivePortId ?? undefined,
    receivePortRemark: values.receivePortRemark,
    deliverPortId: values.deliverPortId ?? undefined,
    deliverPortRemark: values.deliverPortRemark,
    sortId: values.sortId,
    remark: values.remark,
    serviceTypes: getServiceTypesFromEnabledValues(
      values,
      SHOW_COLLECTION_PAYMENT_FIELD && collectionPaymentEnabled.value,
    ),
  };

  const transportOrderFields: Record<string, any> = {
    commissionNum: values.commissionNum,
    mblNum: values.mblNum,
    bookingNum: values.bookingNum,
    accountDate: toDateString(values.accountDate),
    settlementDate: toDateString(values.settlementDate),
    codeSourceId: values.codeSourceId ?? undefined,
    isBusinessLocking: entrustReadonlyInfo.value.isBusinessLocking,
    feeLocked: entrustReadonlyInfo.value.feeLocked,
    codeFrtId: values.codeFrtId ?? undefined,
    prepareAtId: values.prepareAtId ?? undefined,
    codeServiceId: values.codeServiceId ?? undefined,
    cargoId: values.cargoId ?? undefined,
    tradeTermsType: values.tradeTermsType ?? undefined,
    goodsCompleteTime: toDateString(values.goodsCompleteTime),
    etd: toDateString(values.etd),
    atd: toDateString(values.atd),
    eta: toDateString(values.eta),
    clientId: values.clientId,
    teamId: values.teamId ?? undefined,
    custBrokerId: values.custBrokerId ?? undefined,
    warehouseId: values.warehouseId ?? undefined,
    insuranceId: values.insuranceId ?? undefined,
    consigneeId: values.consigneeId ?? undefined,
    consigneeContent: values.consigneeContent,
    shipperId: values.shipperId ?? undefined,
    shipperContent: values.shipperContent,
    notifierId: values.notifierId ?? undefined,
    notifierContent: values.notifierContent,
    marks: values.marks,
    pkgs: values.pkgs ?? undefined,
    codePackageId: values.codePackageId ?? undefined,
    goodsDes: values.goodsDes,
    kgs: values.kgs,
    cbm: values.cbm,
    internalRemark: values.internalRemark,
    orderCodeGoodss: (values.orderCodeGoodss ?? [])
      .filter(
        (codeGoodsId: any) => codeGoodsId !== undefined && codeGoodsId !== null,
      )
      .map((codeGoodsId: number) => ({ codeGoodsId })),
    orderCtns: sanitizeOrderCtns(orderCtns.value),
    orderUsers: sanitizeOrderUsers(values.orderUsers),
  };

  if (isEdit.value && transportOrderId.value) {
    (transportOrderFields as any).id = transportOrderId.value;
  }

  return {
    ...seaExportFields,
    organizationUnits:
      SHOW_COLLECTION_PAYMENT_FIELD &&
      collectionPaymentEnabled.value &&
      typeof collectionPaymentDeptId.value === 'number'
        ? [
            {
              id: collectionPaymentDeptId.value,
              name:
                collectionPaymentDeptOptions.value.find(
                  (option) => option.value === collectionPaymentDeptId.value,
                )?.label ?? undefined,
            },
          ]
        : [],
    ...(isEdit.value && editId.value ? { id: editId.value } : {}),
    transportOrder: transportOrderFields,
  };
};

const handleSubmit = async () => {
  const [
    partyResult,
    entrustResult,
    basicResult,
    shipmentResult,
    portResult,
    cargoTypeResult,
    cargoMainResult,
    cargoRemarkResult,
  ] = await Promise.all([
    partyInfoFormApi.validate(),
    entrustInfoFormApi.validate(),
    basicInfoFormApi.validate(),
    shipmentFormApi.validate(),
    portFormApi.validate(),
    cargoTypeInlineFormApi.validate(),
    cargoMainFormApi.validate(),
    cargoRemarkFormApi.validate(),
  ]);
  const allValid =
    partyResult.valid &&
    entrustResult.valid &&
    basicResult.valid &&
    shipmentResult.valid &&
    portResult.valid &&
    cargoTypeResult.valid &&
    cargoMainResult.valid &&
    cargoRemarkResult.valid;
  if (!allValid) {
    message.warning($t('ui.formRules.pleaseCompleteRequiredFields'));
    return;
  }
  if (!validateSalesRoleCount()) {
    return;
  }
  if (!validateOrderUserRequiredAssignee()) {
    return;
  }

  submitting.value = true;
  const [
    partyValues,
    entrustValues,
    basicValues,
    shipmentValues,
    portValues,
    cargoTypeValues,
    cargoMainValues,
    cargoRemarkValues,
  ] = await Promise.all([
    partyInfoFormApi.getValues(),
    entrustInfoFormApi.getValues(),
    basicInfoFormApi.getValues(),
    shipmentFormApi.getValues(),
    portFormApi.getValues(),
    cargoTypeInlineFormApi.getValues(),
    cargoMainFormApi.getValues(),
    cargoRemarkFormApi.getValues(),
  ]);
  const serviceItemsValues = getServiceItemFormValues(basicValues);
  const values = {
    commissionNum: entrustReadonlyInfo.value.commissionNum,
    accountDate: entrustReadonlyInfo.value.accountDate,
    settlementDate: entrustReadonlyInfo.value.settlementDate,
    ...partyValues,
    ...entrustValues,
    ...basicValues,
    ...serviceItemsValues,
    ...shipmentValues,
    ...portValues,
    ...cargoTypeValues,
    ...cargoMainValues,
    ...cargoRemarkValues,
  };
  const dto = buildDto(values);

  try {
    if (isEdit.value) {
      await editSeaExport(dto as SeaExportAdminApi.SeaExportEditDto);
      message.success($t('ui.actionMessage.operationSuccess'));
      markListShouldRefresh('SeaExportList');
    } else {
      const createdId = await addSeaExport(
        dto as SeaExportAdminApi.SeaExportAddDto,
      );
      message.success($t('ui.actionMessage.operationSuccess'));
      markListShouldRefresh('SeaExportList');
      const resolvedCreatedId =
        (createdId as any)?.id ?? (createdId as any)?.result ?? createdId;
      const createdIdStr =
        resolvedCreatedId === null || resolvedCreatedId === undefined
          ? ''
          : String(resolvedCreatedId).trim();
      if (createdIdStr) {
        router.push(`/sea-exports/${createdIdStr}/edit`);
      } else {
        router.push('/sea-exports');
      }
    }
  } finally {
    submitting.value = false;
  }
};

const handleCancel = () => {
  router.push('/sea-exports');
};

const handleAiPdfFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  const file = target?.files?.[0];
  if (!file) return;

  const isPdfFile =
    file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
  if (!isPdfFile) {
    message.warning('请上传 PDF 文件');
    if (target) target.value = '';
    return;
  }

  aiRecognizing.value = true;
  const hideLoading = message.loading('AI识别中，请稍候...', 0);
  try {
    const ocrPayload = await runVisionOcrPdf(file);
    const formValues = buildAiRecognizedFormValues(ocrPayload);
    const recognizedFieldCount = Object.keys(formValues).length;
    if (recognizedFieldCount === 0) {
      message.warning('识别成功，但没有可回填的字段');
      return;
    }
    await applyAiRecognizedFormValues(formValues);
    message.success(`AI识别完成，已回填 ${recognizedFieldCount} 个字段`);
  } catch {
    message.error('AI识别失败，请稍后重试');
  } finally {
    hideLoading();
    aiRecognizing.value = false;
    if (target) target.value = '';
  }
};

const handleAiRecognize = () => {
  if (aiRecognizing.value) return;
  aiOcrPdfInputRef.value?.click();
};

const handlePrint = () => {
  // TODO: 后续接入打印逻辑
};

const handleBack = () => {
  router.push('/sea-exports');
};

onMounted(() => {
  void loadServiceItemLabelMap();
  if (!isEdit.value) {
    initializeOrderUsersPanel(defaultOrderUsers);
    refreshEntrustReadonlyInfo({});
    serviceItemTaskStatusValues.value = {};
    serviceItemTaskIdValues.value = {};
    serviceItemRequiredPropValues.value = {};
  }
  loadCollectionPaymentDeptOptions();
  applyTransitPortTabSchema();
  applyNotifierPartyTabSchema();
  loadEditData();
  if (!isEdit.value) {
    void syncServiceTypesByPol();
  }
  nextTick(() => {
    updateActiveSectionByScroll();
  });
  window.addEventListener('scroll', updateActiveSectionByScroll, {
    passive: true,
  });
});

onBeforeUnmount(() => {
  window.removeEventListener('scroll', updateActiveSectionByScroll);
  if (serviceTypeSyncTimer) {
    clearTimeout(serviceTypeSyncTimer);
    serviceTypeSyncTimer = undefined;
  }
});
defineExpose({
  scrollToSection,
});
</script>

<template>
  <component :is="pageWrapperTag" v-bind="pageWrapperProps">
    <Spin :spinning="pageLoading">
      <div class="sea-export-form-page">
        <div class="main-layout">
          <!-- 左侧信息区 -->
          <div class="left-column">
            <Card class="side-card flex shrink-0 flex-col">
              <template #title>
                <span class="card-title">
                  <FileText class="size-4" />
                  委托信息
                </span>
              </template>
              <div class="card-body">
                <div class="entrust-static-list">
                  <ReadonlyFormItem
                    label="委托编号"
                    :value="entrustReadonlyInfo.commissionNum"
                  />
                  <ReadonlyFormItem
                    label="会计期间"
                    :value="entrustReadonlyInfo.accountDateText"
                  />
                  <ReadonlyFormItem
                    label="应结日期"
                    :value="entrustReadonlyInfo.settlementDateText"
                  />
                </div>
                <ReadonlyFormItem
                  label="所属公司"
                  :value="entrustReadonlyInfo.organizationUnitsText"
                />
                <div class="entrust-form-wrap">
                  <EntrustInfoForm />
                </div>
                <div class="entrust-lock-row">
                  <div class="entrust-lock-tag">
                    <Tag
                      :color="
                        entrustReadonlyInfo.isBusinessLocking
                          ? 'orange'
                          : 'green'
                      "
                    >
                      <span class="entrust-lock-tag__content">
                        <IconifyIcon
                          :icon="
                            entrustReadonlyInfo.isBusinessLocking
                              ? 'mdi:lock-outline'
                              : 'mdi:lock-open-variant-outline'
                          "
                          class="entrust-lock-tag__icon"
                        />
                        {{
                          entrustReadonlyInfo.isBusinessLocking
                            ? '业务已锁定'
                            : '业务未锁定'
                        }}
                      </span>
                    </Tag>
                  </div>
                  <div class="entrust-lock-tag">
                    <Tag
                      :color="
                        entrustReadonlyInfo.feeLocked ? 'orange' : 'green'
                      "
                    >
                      <span class="entrust-lock-tag__content">
                        <IconifyIcon
                          :icon="
                            entrustReadonlyInfo.feeLocked
                              ? 'mdi:lock-outline'
                              : 'mdi:lock-open-variant-outline'
                          "
                          class="entrust-lock-tag__icon"
                        />
                        {{
                          entrustReadonlyInfo.feeLocked
                            ? '费用已锁定'
                            : '费用未锁定'
                        }}
                      </span>
                    </Tag>
                  </div>
                </div>
              </div>
            </Card>

            <Card class="side-card flex shrink-0 flex-col">
              <template #title>
                <span class="card-title">
                  <FileText class="size-4" />
                  备注信息
                </span>
              </template>
              <div class="card-body">
                <CargoRemarkForm />
              </div>
            </Card>
          </div>

          <!-- 中间主表单 -->
          <div class="center-column">
            <div class="content-column">
              <section :ref="sectionRefs.basic" class="content-section">
                <div class="content-section__actions">
                  <Space>
                    <Button
                      class="flex items-center justify-center"
                      :loading="aiRecognizing"
                      @click="handleAiRecognize"
                    >
                      <IconifyIcon
                        icon="mdi:robot-outline"
                        class="mr-1 inline-block size-4 align-middle"
                      />
                      <span class="align-middle">AI识别</span>
                    </Button>
                    <Button
                      class="flex items-center justify-center"
                      @click="handlePrint"
                    >
                      <IconifyIcon
                        icon="mdi:printer-outline"
                        class="mr-1 inline-block size-4 align-middle"
                      />
                      <span class="align-middle">打印</span>
                    </Button>
                    <Button @click="handleCancel">
                      {{ $t('common.cancel') }}
                    </Button>
                    <Button
                      type="primary"
                      :loading="submitting"
                      class="flex items-center justify-center"
                      @click="handleSubmit"
                    >
                      <Save class="mr-1 inline-block size-4 align-middle" />
                      <span class="align-middle">{{ $t('common.save') }}</span>
                    </Button>
                  </Space>
                  <input
                    ref="aiOcrPdfInputRef"
                    type="file"
                    accept=".pdf,application/pdf"
                    class="hidden"
                    @change="handleAiPdfFileChange"
                  />
                </div>
                <div class="biz-block biz-block--service">
                  <div class="biz-block__title">服务项目</div>
                  <div class="service-pipeline">
                    <div class="service-pipeline__track">
                      <div
                        v-for="(field, index) in visibleServiceItemFields"
                        :key="field"
                        class="service-item-node-wrap"
                      >
                        <div
                          class="service-item-node"
                          :class="`service-item-node--${getServiceItemNodeState(field)}`"
                        >
                          <div
                            class="service-item-node__content"
                            @click="handleServiceItemNodeToggle(field)"
                          >
                            <span
                              v-if="isEdit && getServiceItemChecked(field)"
                              class="service-item-node__check"
                            >
                              <IconifyIcon
                                icon="mdi:check"
                                class="service-item-node__check-icon"
                              />
                            </span>
                            <span class="service-item-node__icon">
                              <IconifyIcon
                                :icon="SERVICE_ITEM_META[field].icon"
                                class="service-item-node__icon-inner"
                              />
                            </span>
                            <span class="service-item-node__title">
                              {{ getServiceItemLabel(field) }}
                            </span>
                            <span
                              v-if="
                                isEdit &&
                                getServiceItemTaskStatusMeta(field) &&
                                !isServiceItemNodeDone(field)
                              "
                              class="service-item-node__status"
                            >
                              {{ getServiceItemTaskStatusMeta(field)?.label }}
                            </span>
                            <Button
                              v-if="isEdit && canCompleteServiceItem(field)"
                              type="link"
                              size="small"
                              class="service-item-node__action-btn"
                              :loading="completingServiceField === field"
                              @click.stop="handleCompleteService(field)"
                            >
                              完成服务
                            </Button>
                          </div>
                        </div>
                        <div
                          v-if="index < visibleServiceItemFields.length - 1"
                          class="service-item-divider"
                          :class="{
                            'service-item-divider--done':
                              isServiceItemNodeDone(field),
                          }"
                        />
                      </div>
                    </div>
                    <div class="service-item-pipeline__hint">
                      点击节点可启用/关闭服务
                    </div>
                  </div>
                  <div class="service-item-grid">
                    <div
                      v-if="SHOW_COLLECTION_PAYMENT_FIELD"
                      class="service-item-extra-card"
                      :class="{
                        'service-item-extra-card--active':
                          collectionPaymentEnabled,
                      }"
                    >
                      <div class="service-item-extra-card__header">
                        <div class="service-item-extra-card__title-wrap">
                          <span class="service-item-extra-card__icon">
                            <IconifyIcon
                              :icon="COLLECTION_PAYMENT_ICON"
                              class="service-item-extra-card__icon-inner"
                            />
                          </span>
                          <span class="service-item-extra-card__title"
                            >代收支</span
                          >
                        </div>
                        <Checkbox
                          :checked="collectionPaymentEnabled"
                          @change="handleCollectionPaymentEnabledChange"
                        />
                      </div>
                      <div class="service-item-extra-card__body">
                        <Select
                          :value="collectionPaymentDeptId"
                          :options="collectionPaymentDeptOptions"
                          :disabled="!collectionPaymentEnabled"
                          :placeholder="$t('ui.placeholder.select')"
                          allow-clear
                          class="w-full"
                          show-search
                          option-filter-prop="label"
                          @change="handleCollectionPaymentDeptChange"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div class="content-section__header">
                  <span class="card-title">
                    <FileText class="size-4" />
                    {{ $t('seaExport.export.formCardBasicInfo') }}
                  </span>
                </div>
                <div class="content-section__body">
                  <BasicInfoForm />
                </div>
              </section>

              <section :ref="sectionRefs.party" class="content-section">
                <div class="content-section__body">
                  <PartyInfoForm />
                  <Teleport
                    v-if="consigneePartyLabelTarget"
                    :to="consigneePartyLabelTarget"
                  >
                    <button
                      type="button"
                      class="party-copy-btn"
                      @click.stop="copyConsigneeToNotifier"
                    >
                      复制到通知人
                    </button>
                  </Teleport>
                  <Teleport
                    v-if="notifierPartyLabelTarget"
                    :to="notifierPartyLabelTarget"
                  >
                    <span
                      class="transit-port-inline-switch transit-port-inline-switch--in-label"
                    >
                      <button
                        type="button"
                        class="transit-port-tabs__item"
                        :class="{
                          'transit-port-tabs__item--active':
                            notifierPartyTab === 'notifier',
                        }"
                        @click.stop="switchNotifierPartyTab('notifier')"
                      >
                        {{ $t('seaExport.export.notifierId') }}
                      </button>
                      <button
                        type="button"
                        class="transit-port-tabs__item"
                        :class="{
                          'transit-port-tabs__item--active':
                            notifierPartyTab === 'secondNotifier',
                        }"
                        @click.stop="switchNotifierPartyTab('secondNotifier')"
                      >
                        {{ $t('seaExport.export.secondNotifierId') }}
                      </button>
                      <button
                        type="button"
                        class="transit-port-tabs__item"
                        :class="{
                          'transit-port-tabs__item--active':
                            notifierPartyTab === 'podAgent',
                        }"
                        @click.stop="switchNotifierPartyTab('podAgent')"
                      >
                        {{ $t('seaExport.export.overseasAgent') }}
                      </button>
                    </span>
                  </Teleport>
                </div>
              </section>

              <section :ref="sectionRefs.shipment" class="content-section">
                <div class="content-section__header">
                  <span class="card-title">
                    <Ship class="size-4" />
                    {{ $t('seaExport.export.formCardShipment') }}
                  </span>
                </div>
                <div class="content-section__body">
                  <div class="shipment-flow-container">
                    <ShipmentForm />
                    <span
                      aria-hidden="true"
                      class="shipment-flow-divider"
                    ></span>
                  </div>
                </div>
              </section>

              <section :ref="sectionRefs.port" class="content-section">
                <div class="content-section__header">
                  <span class="card-title">
                    <MapPin class="size-4" />
                    {{ $t('seaExport.export.formCardPort') }}
                  </span>
                </div>
                <div class="content-section__body">
                  <PortForm />
                  <Teleport
                    v-if="transitPortLabelTarget"
                    :to="transitPortLabelTarget"
                  >
                    <span
                      class="transit-port-inline-switch transit-port-inline-switch--in-label"
                    >
                      <button
                        type="button"
                        class="transit-port-tabs__item"
                        :class="{
                          'transit-port-tabs__item--active':
                            transitPortTab === 'poT1',
                        }"
                        @click.stop="switchTransitPortTab('poT1')"
                      >
                        中转港1
                      </button>
                      <button
                        type="button"
                        class="transit-port-tabs__item"
                        :class="{
                          'transit-port-tabs__item--active':
                            transitPortTab === 'poT2',
                        }"
                        @click.stop="switchTransitPortTab('poT2')"
                      >
                        中转港2
                      </button>
                    </span>
                  </Teleport>
                  <Teleport v-if="podPortLabelTarget" :to="podPortLabelTarget">
                    <span
                      v-if="
                        entrustReadonlyInfo.countryName?.trim() ||
                        entrustReadonlyInfo.laneName?.trim()
                      "
                      class="pod-port-inline-tags"
                    >
                      <Tooltip
                        v-if="entrustReadonlyInfo.countryName?.trim()"
                        :title="entrustReadonlyInfo.countryName"
                      >
                        <Tag class="pod-port-inline-tags__item" color="blue">
                          <span class="pod-port-inline-tags__item-text">
                            {{ entrustReadonlyInfo.countryName }}
                          </span>
                        </Tag>
                      </Tooltip>
                      <Tooltip
                        v-if="entrustReadonlyInfo.laneName?.trim()"
                        :title="entrustReadonlyInfo.laneName"
                      >
                        <Tag class="pod-port-inline-tags__item" color="cyan">
                          <span class="pod-port-inline-tags__item-text">
                            {{ entrustReadonlyInfo.laneName }}
                          </span>
                        </Tag>
                      </Tooltip>
                    </span>
                  </Teleport>
                </div>
              </section>
            </div>

            <section :ref="sectionRefs.cargo">
              <Card class="cargo-container-card">
                <template #title>
                  <div class="cargo-container-card__title">
                    <span class="card-title">
                      <Package class="size-4" />
                      {{ $t('seaExport.export.formCardCargo') }}
                    </span>
                    <div class="cargo-type-inline-wrap">
                      <CargoTypeInlineForm />
                    </div>
                  </div>
                </template>
                <CargoMainForm />
                <div class="cargo-ctn-section">
                  <OrderCtnTable v-model="orderCtns" />
                </div>
              </Card>
            </section>
          </div>

          <!-- 右侧快捷区 -->
          <Card class="right-column">
            <template #title>
              <span class="card-title">
                {{ $t('seaExport.export.orderUsers') }}
              </span>
            </template>

            <div class="order-user-panel">
              <div
                v-for="row in orderUserRows"
                :key="row._rowKey"
                class="order-user-panel__row"
              >
                <Button
                  v-if="!isFixedOrderUserRole(row.userAttribute)"
                  type="link"
                  danger
                  size="small"
                  class="order-user-panel__delete-btn"
                  title="删除"
                  @click="removeOrderUserRole(row._rowKey)"
                >
                  <IconifyIcon icon="mdi:trash-can-outline" />
                </Button>
                <div
                  class="order-user-panel__avatar-wrap"
                  @mouseenter="loadOrderUserDetail(row.userId, row._rowKey)"
                >
                  <Popover
                    v-if="row.userId"
                    placement="leftTop"
                    trigger="hover"
                    overlay-class-name="order-user-detail-popover"
                  >
                    <template #content>
                      <div class="order-user-detail-card">
                        <div class="order-user-detail-card__header">
                          <Avatar
                            :size="38"
                            class="order-user-detail-card__avatar"
                          >
                            {{ getOrderUserAvatarText(row) }}
                          </Avatar>
                          <div class="order-user-detail-card__title-wrap">
                            <div class="order-user-detail-card__name">
                              {{ getOrderUserDisplayName(row) || '-' }}
                            </div>
                            <div class="order-user-detail-card__sub-title">
                              账号：{{
                                getOrderUserDetailText(
                                  getOrderUserDetail(row.userId)?.userName,
                                )
                              }}
                            </div>
                          </div>
                          <span
                            class="order-user-detail-card__status"
                            :class="
                              getOrderUserStatusClass(
                                getOrderUserDetail(row.userId),
                              )
                            "
                          >
                            {{
                              getOrderUserStatusText(
                                getOrderUserDetail(row.userId),
                              )
                            }}
                          </span>
                        </div>
                        <div
                          v-if="
                            isOrderUserDetailLoading(row.userId) &&
                            !getOrderUserDetail(row.userId)
                          "
                          class="order-user-detail-card__loading"
                        >
                          加载中...
                        </div>
                        <div v-else class="order-user-detail-card__info">
                          <div class="order-user-detail-card__info-item">
                            <span>角色</span>
                            <span>{{
                              getOrderUserRoleLabel(row.userAttribute)
                            }}</span>
                          </div>
                          <div class="order-user-detail-card__info-item">
                            <span>手机</span>
                            <span>{{
                              getOrderUserDetailText(
                                getOrderUserDetail(row.userId)?.phoneNumber,
                              )
                            }}</span>
                          </div>
                          <div class="order-user-detail-card__info-item">
                            <span>邮箱</span>
                            <span>{{
                              getOrderUserDetailText(
                                getOrderUserDetail(row.userId)?.emailAddress,
                              )
                            }}</span>
                          </div>
                          <div class="order-user-detail-card__info-item">
                            <span>最近登录</span>
                            <span>{{
                              formatOrderUserLastLogin(
                                getOrderUserDetail(row.userId)?.lastLoginTime,
                              )
                            }}</span>
                          </div>
                        </div>
                      </div>
                    </template>
                    <Avatar
                      :size="34"
                      class="order-user-panel__avatar order-user-panel__avatar--link"
                    >
                      {{ getOrderUserAvatarText(row) }}
                    </Avatar>
                  </Popover>
                  <Avatar v-else :size="34" class="order-user-panel__avatar">
                    {{ getOrderUserAvatarText(row) }}
                  </Avatar>
                </div>
                <div class="order-user-panel__content">
                  <Select
                    :value="row.userAttribute"
                    :options="getOrderUserRoleOptions(row._rowKey)"
                    :placeholder="
                      $t('seaExport.export.pleaseSelectUserAttribute')
                    "
                    size="small"
                    :allow-clear="!isFixedOrderUserRole(row.userAttribute)"
                    class="order-user-panel__role-select"
                    @update:value="(v) => updateOrderUserRole(row._rowKey, v)"
                  />
                  <UserSelect
                    :key="row._rowKey"
                    :model-value="row.userId"
                    :user-attribute="row.userAttribute"
                    label-key="nickName"
                    :selected-items="
                      row.userId
                        ? [
                            {
                              id: row.userId,
                              nickName: getOrderUserDisplayName(row),
                            },
                          ]
                        : []
                    "
                    :placeholder="$t('seaExport.export.pleaseSelectOrderUser')"
                    size="small"
                    allow-clear
                    class="order-user-panel__select"
                    :disabled="!row.userAttribute"
                    @update:model-value="(v) => updateOrderUser(row._rowKey, v)"
                  />
                </div>
              </div>
              <Button
                class="order-user-panel__add-btn"
                @click="addOrderUserRole"
              >
                + 添加角色
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </Spin>
  </component>
</template>

<style scoped>
.sea-export-form-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.layout-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
  padding: 0 14px;
  color: #fff;
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  border-radius: 10px;
}

.layout-banner__left {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
}

.layout-banner__tabs {
  display: flex;
  gap: 8px;
}

.layout-banner__tab {
  padding: 6px 10px;
  font-size: 12px;
  line-height: 1;
  background: rgb(255 255 255 / 16%);
  border-radius: 999px;
}

.layout-banner__tab--active {
  font-weight: 600;
  color: #1890ff;
  background: #fff;
}

.main-layout {
  display: flex;
  gap: 14px;
  padding: 12px;
}

.left-column {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 220px;
}

.side-card {
  width: 100%;
}

.center-column {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.content-column {
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 10px;
}

.side-card,
.right-column,
.cargo-container-card {
  border-radius: 10px;
}

.cargo-container-card__title {
  display: flex;
  gap: 12px;
  align-items: center;
}

.cargo-ctn-section {
  padding-top: 16px;
  margin-top: 16px;
}

.cargo-ctn-section__header {
  margin-bottom: 12px;
}

.content-section {
  padding: 0;
}

.content-section__header {
  padding: 12px 18px 8px;
  padding-bottom: 24px;
}

.content-section__header--cargo {
  display: flex;
  gap: 12px;
  align-items: center;
}

.cargo-type-inline-wrap {
  display: flex;
  flex: 1;
  align-items: center;
  min-width: 440px;
  max-width: 100%;
}

.cargo-type-inline-wrap :deep(.ant-form-item) {
  margin-bottom: 0;
}

.cargo-type-inline-wrap :deep(.ant-form) {
  width: 100%;
}

.cargo-type-inline-wrap :deep(.grid.grid-cols-2) {
  grid-template-columns: 160px minmax(240px, 1fr);
}

.cargo-type-inline-wrap :deep(.cargo-type-inline-item) {
  padding-bottom: 0 !important;
}

.cargo-type-inline-wrap :deep(.cargo-type-inline-item > label) {
  display: none;
}

.cargo-type-inline-wrap :deep(.cargo-type-inline-item > .flex-auto) {
  width: 100%;
}

.cargo-type-inline-wrap :deep(.cargo-type-inline-item--goods > .flex-auto) {
  width: fit-content;
  min-width: 240px;
  max-width: 100%;
}

.cargo-type-inline-wrap :deep(.cargo-type-inline-item--cargo .ant-select) {
  width: 160px;
}

.cargo-type-inline-wrap :deep(.cargo-type-inline-item--goods .ant-select) {
  width: fit-content;
  min-width: 240px;
  max-width: 100%;
}

.cargo-type-inline-wrap :deep(.ant-btn) {
  width: 100%;
}

.cargo-container-card :deep(.cargo-main-item--marks) {
  grid-row: 2 / span 4;
  grid-column: 1 / span 2;
}

.cargo-container-card :deep(.cargo-main-item--goods-des) {
  grid-row: 2 / span 4;
  grid-column: 3 / span 3;
}

.cargo-container-card :deep(.cargo-main-item--pkgs) {
  grid-row: 2;
  grid-column: 6;
}

.cargo-container-card :deep(.cargo-main-item--code-package) {
  grid-row: 3;
  grid-column: 6;
}

.cargo-container-card :deep(.cargo-main-item--kgs) {
  grid-row: 4;
  grid-column: 6;
}

.cargo-container-card :deep(.cargo-main-item--cbm) {
  grid-row: 5;
  grid-column: 6;
}

.content-section__body {
  padding: 0 18px 14px;
}

.content-section__actions {
  display: flex;
  justify-content: flex-end;
  padding: 10px 18px;
  border-bottom: 1px solid #edf2f7;
}

.right-column {
  flex-shrink: 0;
  width: 180px;
}

.card-title {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}

.card-body {
  padding: 0 4px;
}

.entrust-static-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 8px;
  margin-bottom: 10px;
  border-bottom: 1px dashed #f0f0f0;
}

.entrust-lock-row {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.entrust-lock-tag {
  display: flex;
  flex: 1;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.entrust-lock-tag__content {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  font-size: 10px;
  font-weight: 600;
}

.entrust-lock-tag__icon {
  font-size: 13px;
  color: currentcolor;
}

@media (max-width: 1440px) {
  .entrust-lock-row {
    flex-wrap: wrap;
  }

  .entrust-lock-tag {
    min-width: 160px;
  }
}

.entrust-form-wrap :deep(label) {
  justify-content: flex-start !important;
  font-size: 14px;
  font-weight: 500;
  line-height: 24px;
  color: #595959;
  text-align: left;
}

.entrust-form-wrap :deep(.entrust-top-label-item) {
  flex-direction: column;
  align-items: flex-start;
}

.entrust-form-wrap :deep(.entrust-top-label-item > .flex-auto) {
  width: 100%;
}

.entrust-form-wrap :deep(.entrust-top-label-item .ant-select) {
  width: 100% !important;
}

.card-body--party {
  min-height: 620px;
}

.biz-block {
  padding: 10px;
  border-radius: 8px;
}

.biz-block--container {
  margin-top: 12px;
}

.biz-block--service {
  margin-top: 12px;
}

.service-pipeline {
  padding: 10px 12px;
  background: #fff;
  border: 1px solid rgb(226 232 240 / 60%);
  border-radius: 12px;
  box-shadow:
    0 1px 3px rgb(0 0 0 / 5%),
    0 4px 6px -2px rgb(0 0 0 / 2%);
}

.service-pipeline__track {
  display: flex;
  gap: 0;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  min-height: 64px;
}

.service-item-node-wrap {
  display: contents;
}

.service-item-node {
  display: flex;
  align-items: center;
}

.service-item-node__content {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  padding: 6px 10px;
  cursor: pointer;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.service-item-node__content:hover {
  background: #f8fafc;
}

.service-item-node__check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  color: transparent;
  border: 1.5px solid #e2e8f0;
  border-radius: 999px;
  transition: all 0.2s ease;
}

.service-item-node__check-icon {
  font-size: 12px;
}

.service-item-node__icon {
  display: inline-flex;
  align-items: center;
  color: #64748b;
}

.service-item-node__icon-inner {
  font-size: 16px;
}

.service-item-node__title {
  font-size: 14px;
  font-weight: 500;
  color: #0f172a;
  white-space: nowrap;
}

.service-item-node__status {
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.3;
  color: #f59e0b;
  white-space: nowrap;
  background: #fffbeb;
  border: 1px solid rgb(245 158 11 / 20%);
  border-radius: 999px;
}

.service-item-node__action-btn {
  margin-left: 2px;
  font-size: 12px;
  color: #2563eb;
  pointer-events: none;
  background: #eff6ff;
  border-radius: 6px;
  opacity: 0;
  transform: translateX(-5px);
  transition: all 0.2s ease;
}

.service-item-node:hover .service-item-node__action-btn,
.service-item-node--active .service-item-node__action-btn {
  pointer-events: auto;
  opacity: 1;
  transform: translateX(0);
}

.service-item-node__action-btn:hover {
  color: #fff;
  background: #2563eb;
  box-shadow: 0 2px 4px rgb(37 99 235 / 20%);
}

.service-item-divider {
  flex: 0 0 28px;
  width: 28px;
  height: 1.5px;
  margin: 0 8px;
  background: #f1f5f9;
}

.service-item-divider--done {
  background: rgb(16 185 129 / 30%);
}

.service-item-node--done .service-item-node__check {
  color: #fff;
  background: #10b981;
  border-color: #10b981;
}

.service-item-node--done .service-item-node__title {
  color: #64748b;
}

.service-item-node--active .service-item-node__check {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px #eff6ff;
}

.service-item-node--active .service-item-node__icon,
.service-item-node--active .service-item-node__title {
  color: #2563eb;
}

.service-item-node--active .service-item-node__title {
  font-weight: 600;
}

.service-item-node--pending .service-item-node__check {
  border-style: dashed;
}

.service-item-node--pending .service-item-node__icon,
.service-item-node--pending .service-item-node__title {
  color: #cbd5e1;
}

.service-item-pipeline__hint {
  margin-top: 8px;
  margin-left: 12px;
  font-size: 12px;
  line-height: 20px;
  color: rgb(0 0 0 / 45%);
}

.service-item-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 10px;
}

.service-item-extra-card {
  flex: 0 1 232px;
  max-width: 232px;
  padding: 10px 12px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}

.service-item-extra-card--active {
  background: #f7fbff;
  border-color: #bfdbfe;
  box-shadow: 0 2px 8px rgb(22 119 255 / 6%);
}

.service-item-extra-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.service-item-extra-card__title-wrap {
  display: inline-flex;
  gap: 8px;
  align-items: center;
}

.service-item-extra-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: #1677ff;
  background: #dbeafe;
  border-radius: 9999px;
}

.service-item-extra-card__icon-inner {
  font-size: 13px;
}

.service-item-extra-card__title {
  font-size: 14px;
  font-weight: 500;
  color: rgb(0 0 0 / 65%);
}

.service-item-extra-card__body {
  min-height: 32px;
}

.service-item-extra-card--active .service-item-extra-card__title {
  font-weight: 600;
  color: #1677ff;
}

:deep(.shipment-flow-wrap) {
  --shipment-time-col-gap: 2rem;

  position: relative;
}

:deep(.shipment-time-pos--1) {
  grid-row: 2;
  grid-column: 1;
}

:deep(.shipment-time-pos--2) {
  grid-row: 2;
  grid-column: 2;
}

:deep(.shipment-time-pos--3) {
  grid-row: 2;
  grid-column: 3;
}

:deep(.shipment-time-pos--4) {
  grid-row: 2;
  grid-column: 4;
}

.shipment-flow-container {
  position: relative;
}

.shipment-flow-divider {
  position: absolute;
  inset: 0 auto 0 42.65%;
  z-index: 2;
  width: 2px;
  pointer-events: none;
  background-image: repeating-linear-gradient(
    to bottom,
    #94a3b8 0 6px,
    transparent 6px 10px
  );
  transform: translateX(-50%);
}

:deep(.shipment-time-pos--5) {
  grid-row: 2;
  grid-column: 5;
}

:deep(.shipment-time-pos--6) {
  grid-row: 2;
  grid-column: 6;
}

:deep(.shipment-time-pos--7) {
  grid-row: 2;
  grid-column: 7;
}

:deep(.shipment-time-item) {
  position: relative;
  z-index: 1;
  width: 100%;
  padding: 6px 10px;
  background: #f8fafc;
  border: 1px solid #b8dcff;
  border-radius: 10px;
}

:deep(.shipment-time-item > label) {
  font-weight: 500;
  color: rgb(0 0 0 / 65%);
}

:deep(
  .shipment-time-item:not(.shipment-time-item--last):not(
      .shipment-time-pos--3
    )::after
) {
  position: absolute;
  top: 50%;
  left: calc(100% + (var(--shipment-time-col-gap) - 20px) / 2);
  z-index: 1;
  width: 14px;
  height: 2px;
  content: '';
  background: linear-gradient(90deg, #93c5fd 0%, #3b82f6 100%);
  border-radius: 999px;
  transform: translateY(-50%);
}

:deep(
  .shipment-time-item:not(.shipment-time-item--last):not(
      .shipment-time-pos--3
    )::before
) {
  position: absolute;
  top: 50%;
  left: calc(100% + (var(--shipment-time-col-gap) - 20px) / 2 + 14px);
  z-index: 1;
  content: '';
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  border-left: 6px solid #3b82f6;
  transform: translateY(-50%);
}

:deep(.port-flow-wrap) {
  --port-flow-col-gap: 2rem;

  padding: 10px 10px 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}

:deep(.port-flow-item--hidden) {
  display: none;
}

:deep(.port-flow-pos--receive) {
  grid-row: 1;
  grid-column: 1;
}

:deep(.port-flow-pos--pol) {
  grid-row: 1;
  grid-column: 2;
}

:deep(.port-flow-pos--transit) {
  grid-row: 1;
  grid-column: 3;
}

:deep(.port-flow-pos--pod) {
  grid-row: 1;
  grid-column: 4;
}

:deep(.port-flow-pos--deliver) {
  grid-row: 1;
  grid-column: 5;
}

:deep(.port-flow-pos--receive-remark) {
  grid-row: 2;
  grid-column: 1;
}

:deep(.port-flow-pos--pol-remark) {
  grid-row: 2;
  grid-column: 2;
}

:deep(.port-flow-pos--transit-remark) {
  grid-row: 2;
  grid-column: 3;
}

:deep(.port-flow-pos--pod-remark) {
  grid-row: 2;
  grid-column: 4;
}

:deep(.port-flow-pos--deliver-remark) {
  grid-row: 2;
  grid-column: 5;
}

:deep(.port-flow-item) {
  position: relative;
  padding: 6px 10px 4px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-bottom: 0;
  border-radius: 10px 10px 0 0;
}

:deep(.port-flow-item > label) {
  font-weight: 500;
  color: rgb(0 0 0 / 65%);
}

:deep(.port-flow-item--transit > label) {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

:deep(.port-flow-pos--pod > label) {
  display: flex;
  gap: 6px;
  align-items: center;
  white-space: nowrap;
}

.transit-port-inline-switch {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  margin-left: auto;
}

.transit-port-inline-switch--in-label {
  flex-shrink: 0;
}

.party-copy-btn {
  padding: 4px 8px;
  margin-left: auto;
  font-size: 11px;
  line-height: 1;
  color: #595959;
  cursor: pointer;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.party-copy-btn:hover {
  color: #1677ff;
  background: #e6f4ff;
  border-color: #91caff;
}

.pod-port-inline-tags {
  display: inline-flex;
  flex: 1;
  gap: 6px;
  align-items: center;
  align-self: center;
  justify-content: flex-end;
  min-width: 0;
  max-width: calc(100% - 52px);
  margin-left: auto;
  overflow: hidden;
}

.pod-port-inline-tags__item {
  flex: 0 1 auto;
  margin-inline-end: 0;
  vertical-align: middle;
}

.pod-port-inline-tags__item-text {
  display: inline-block;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pod-port-inline-tags > * {
  display: inline-flex;
  align-items: center;
}

.pod-port-inline-tags :deep(.ant-tag) {
  display: inline-flex;
  align-items: center;
}

.transit-port-tabs__item {
  padding: 4px 8px;
  font-size: 11px;
  line-height: 1;
  color: #595959;
  cursor: pointer;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.transit-port-tabs__item--active {
  font-weight: 600;
  color: #1677ff;
  background: #e6f4ff;
  border-color: #91caff;
}

:deep(.port-flow-item:not(.port-flow-item--last)::after) {
  position: absolute;
  top: 50%;
  left: calc(100% + (var(--port-flow-col-gap) - 20px) / 2);
  z-index: 1;
  width: 14px;
  height: 2px;
  content: '';
  background: linear-gradient(90deg, #93c5fd 0%, #3b82f6 100%);
  border-radius: 999px;
  transform: translateY(-50%);
}

:deep(.port-flow-item:not(.port-flow-item--last)::before) {
  position: absolute;
  top: 50%;
  left: calc(100% + (var(--port-flow-col-gap) - 20px) / 2 + 14px);
  z-index: 1;
  content: '';
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  border-left: 6px solid #3b82f6;
  transform: translateY(-50%);
}

:deep(.port-flow-remark) {
  padding: 0 10px 6px;
  margin-top: 0;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-top: 0;
  border-radius: 0 0 10px 10px;
}

:deep(.port-flow-remark > label) {
  font-size: 12px;
  font-weight: 500;
  line-height: 20px;
  color: rgb(0 0 0 / 65%);
}

:deep(.party-flow-wrap) {
  padding: 10px 10px 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}

:deep(.party-flow-order-users) {
  grid-row: 1;
  grid-column: 1 / span 4;
}

:deep(.party-flow-order-users-hidden) {
  display: none;
}

:deep(.party-flow-pos--1) {
  grid-row: 2;
  grid-column: 1;
}

:deep(.party-flow-pos--2) {
  grid-row: 2;
  grid-column: 2;
}

:deep(.party-flow-pos--3) {
  grid-row: 2;
  grid-column: 3;
}

:deep(.party-flow-pos--4) {
  grid-row: 2;
  grid-column: 4;
}

:deep(.party-flow-content-pos--1) {
  grid-row: 3;
  grid-column: 1;
}

:deep(.party-flow-content-pos--2) {
  grid-row: 3;
  grid-column: 2;
}

:deep(.party-flow-content-pos--3) {
  grid-row: 3;
  grid-column: 3;
}

:deep(.party-flow-content-pos--4) {
  grid-row: 3;
  grid-column: 4;
}

:deep(.party-flow-item--hidden) {
  display: none;
}

:deep(.party-flow-item) {
  padding: 6px 10px 4px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-bottom: 0;
  border-radius: 10px 10px 0 0;
}

:deep(.party-flow-item > label) {
  font-weight: 500;
  color: rgb(0 0 0 / 65%);
}

:deep(.party-flow-item--notifier > label) {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

:deep(.party-flow-content) {
  padding: 0 10px 6px;
  margin-top: 0;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-top: 0;
  border-radius: 0 0 10px 10px;
}

.biz-block__title {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #1677ff;
}

.quick-links {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quick-link {
  padding: 8px 10px;
  font-size: 12px;
  color: #595959;
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
}

.quick-link--active {
  font-weight: 600;
  color: #1677ff;
  background: #e6f4ff;
  border-color: #91caff;
}

.order-user-panel__title {
  font-size: 12px;
  font-weight: 600;
  color: #1f2937;
}

.order-user-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.order-user-panel__add-btn {
  width: 100%;
  height: 32px;
  margin-top: 8px;
  font-size: 13px;
  color: #595959;
  background: #fff;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
}

.order-user-panel__add-btn:hover {
  color: #1677ff;
  border-color: #1677ff;
}

.order-user-panel__row {
  position: relative;
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.order-user-panel__row + .order-user-panel__row {
  margin-top: 8px;
}

.order-user-panel__avatar-wrap {
  display: flex;
  flex: none;
  align-items: center;
}

.order-user-panel__avatar {
  font-size: 13px;
  font-weight: 600;
  color: #1677ff;
  background: #e6f4ff;
}

.order-user-panel__avatar--link {
  cursor: pointer;
  transition: all 0.2s ease;
}

.order-user-panel__avatar--link:hover {
  box-shadow: 0 4px 12px rgb(22 119 255 / 22%);
  transform: translateY(-1px);
}

:deep(.order-user-detail-popover .ant-popover-inner) {
  min-width: 260px;
  padding: 0;
  overflow: hidden;
  background: rgb(255 255 255 / 80%);
  border: 1px solid rgb(148 163 184 / 20%);
  border-radius: 14px;
  box-shadow:
    0 10px 30px rgb(15 23 42 / 14%),
    0 2px 10px rgb(15 23 42 / 8%);
  backdrop-filter: blur(16px) saturate(140%);
}

:deep(.order-user-detail-popover .ant-popover-inner-content) {
  padding: 0;
}

.order-user-detail-card {
  padding: 14px;
  color: #1f2937;
}

.order-user-detail-card__header {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}

.order-user-detail-card__avatar {
  flex: none;
  font-weight: 600;
  color: #1d4ed8;
  background: linear-gradient(145deg, #eff6ff 0%, #dbeafe 100%);
}

.order-user-detail-card__title-wrap {
  flex: 1;
  min-width: 0;
}

.order-user-detail-card__name {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.2;
  color: #111827;
}

.order-user-detail-card__sub-title {
  margin-top: 3px;
  font-size: 12px;
  color: #6b7280;
}

.order-user-detail-card__status {
  flex: none;
  padding: 4px 8px;
  font-size: 11px;
  line-height: 1;
  border-radius: 999px;
}

.order-user-detail-card__status--active {
  color: #15803d;
  background: rgb(34 197 94 / 12%);
  border: 1px solid rgb(34 197 94 / 26%);
}

.order-user-detail-card__status--inactive {
  color: #475569;
  background: rgb(100 116 139 / 10%);
  border: 1px solid rgb(100 116 139 / 22%);
}

.order-user-detail-card__loading {
  padding: 8px 0 2px;
  font-size: 12px;
  color: #6b7280;
}

.order-user-detail-card__info {
  display: grid;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid rgb(226 232 240 / 80%);
}

.order-user-detail-card__info-item {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
}

.order-user-detail-card__info-item > span:first-child {
  flex: none;
  color: #6b7280;
}

.order-user-detail-card__info-item > span:last-child {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
  color: #111827;
  text-align: right;
  white-space: nowrap;
}

.order-user-panel__content {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.order-user-panel__role-select,
.order-user-panel__select {
  width: 100%;
}

.order-user-panel__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  line-height: 1.2;
}

.order-user-panel__meta-value {
  font-size: 12px;
  color: #8c8c8c;
}

.order-user-panel__delete-btn {
  position: absolute;
  top: -13px;
  right: -7px;
  z-index: 1;
  height: 20px;
  padding: 0;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.order-user-panel__row:hover .order-user-panel__delete-btn,
.order-user-panel__row:focus-within .order-user-panel__delete-btn {
  pointer-events: auto;
  opacity: 1;
}

:deep(.ant-card .ant-card-head) {
  min-height: 44px;
  padding: 0 14px;
  background: #fafcff;
  border-bottom: 1px solid #edf2f7;
}

:deep(.ant-card .ant-card-head-title) {
  padding: 10px 0;
}

:deep(.ant-card .ant-card-body) {
  padding: 12px 14px;
}

@media (max-width: 1200px) {
  .main-layout {
    flex-direction: column;
  }

  .left-column,
  .side-card,
  .center-column,
  .right-column {
    width: 100%;
  }

  .card-body--party {
    min-height: auto;
  }

  .layout-banner__tabs {
    display: none;
  }

  :deep(.port-flow-item::after) {
    content: none !important;
  }

  :deep(.port-flow-item::before) {
    content: none !important;
  }
}
</style>
