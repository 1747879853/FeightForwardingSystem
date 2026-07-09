<script lang="ts" setup>
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import dayjs from 'dayjs';
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useAccess } from '@vben/access';

import {
  ArrowLeft,
  Copy,
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
  Empty,
  message,
  Modal,
  Popover,
  Radio,
  Select,
  Space,
  Spin,
  Tag,
  Tooltip,
} from 'ant-design-vue';
import { preferences } from '@vben/preferences';
import { useUserStore } from '@vben/stores';

defineOptions({
  name: 'SeaExportAdminForm',
});
const emptySimpleImage = Empty.PRESENTED_IMAGE_SIMPLE;
import { CodeSourceSelect, UserSelect } from '#/adapter/component';
import { useVbenForm } from '#/adapter/form';
import { extractSeaExportToAddDto } from '#/api/common';
import {
  addSeaExport,
  editSeaExport,
  getServiceTypesByPOL,
  getSeaExportDetail,
} from '#/api/sea-export/sea-export-admin';
import {
  cancelCompleteSeServiceTask,
  completeSeServiceTask,
} from '#/api/sea-export/se-service-task-admin';
import type { SystemUserAdminApi } from '#/api/system/user-admin';

import { getUser, UserAttribute } from '#/api/system/user-admin';
import { parseSeaExportUserAttribute } from '#/views/system/user/data';
import { $t } from '#/locales';
import { PrintJsonType, usePrintFormat } from '#/components/print-format';
import { buildAttachmentUrl } from '#/utils';
import { createAbpPermission } from '#/utils/abp-permission';
import { toEnglishUpperCase } from '#/utils/english-upper-case';
import { markListShouldRefresh } from '#/utils/list-refresh-flag';
import {
  formatDeletedUserFallback,
  resolveUserDisplayName,
} from '#/utils/user-display';

import OrderCtnTable from './modules/order-ctn-table.vue';
import {
  AI_EXTRACT_ACCEPT,
  buildAiExtractFormPayload,
  isAiExtractSupportedFile,
  pickExtractedLabel,
  resolveCitationKeys,
} from './modules/ai-extract-utils';
import {
  CARGO_TYPE,
  createEmptyDgValues,
  createEmptyReeferValues,
  getBillTypeOptions,
  getBlTypeOptions,
  useBasicInfoFormSchema,
  useCargoFormSchema,
  useDgFormSchema,
  usePartyInfoFormSchema,
  usePortFormSchema,
  useReeferFormSchema,
  useShipmentFormSchema,
} from './data';
import {
  buildServiceTypeLabelMap,
  loadSeServiceTypeOptions,
} from './service-type';
import { useSeaExportTabTitle } from './use-sea-export-tab-title';
import { useSeaExportCopy } from './use-sea-export-copy';
import { useYardRealQuery } from './use-yard-real-query';
import { useSyncShipmentDates } from './use-sync-shipment-dates';
import { useYundangOceanSubscribe } from './use-yundang-ocean-subscribe';

const perm = createAbpPermission('Admin.SeaExport');
const externalApiUseCode = 'Admin.ExternalApi.Use';
const { hasAccessByCodes } = useAccess();
const hasYardRealQueryAccess = computed(() =>
  hasAccessByCodes([externalApiUseCode]),
);

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
const printing = ref(false);
const formSnapshotJson = ref<string | null>(null);
const { openPrint } = usePrintFormat();
const aiRecognizing = ref(false);
const aiExtractFileInputRef = ref<HTMLInputElement | null>(null);
const transportOrderId = ref<number | undefined>();
const defaultOrderUsers: SeaExportAdminApi.OrderUserAddDto[] = [
  { userAttribute: UserAttribute.Sales, sortId: 6 },
  { userAttribute: UserAttribute.Business, sortId: 5 },
  { userAttribute: UserAttribute.Operation, sortId: 4 },
  { userAttribute: UserAttribute.CustomerService, sortId: 3 },
  { userAttribute: UserAttribute.Documentation, sortId: 2 },
  { userAttribute: UserAttribute.OverseasCustomerService, sortId: 1 },
];
/** 不可删除的必填干系人角色（销售、操作始终必填；其余由服务项目动态校验） */
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

/** 与委托信息一致：表单控件使用 small 尺寸 */
function withSmallComponentProps(componentProps: unknown) {
  if (typeof componentProps === 'function') {
    return (...args: any[]) => ({
      ...(componentProps as (...innerArgs: any[]) => Record<string, any>)(
        ...args,
      ),
      size: 'small',
    });
  }
  return {
    ...((componentProps as Record<string, any> | undefined) ?? {}),
    size: 'small',
  };
}

function mapSchemaWithSmallSize<T extends { componentProps?: unknown }>(
  schema: T[],
): T[] {
  return schema.map((item) => ({
    ...item,
    componentProps: withSmallComponentProps(item.componentProps),
  }));
}

/** 垂直布局表单 label：与基础信息区块一致 */
const VERTICAL_FORM_LABEL_CLASS = 'leading-[1em] mb-0';

/** 左侧表单：相关方信息（发货人、收货人、通知人等） */
const [PartyInfoForm, partyInfoFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  schema: usePartyInfoFormSchema().map((item) => {
    const nextItem =
      item.fieldName === 'orderUsers'
        ? { ...item, formItemClass: 'party-flow-order-users-hidden' }
        : item;
    return {
      ...nextItem,
      componentProps: withSmallComponentProps(nextItem.componentProps),
    };
  }),
  showDefaultActions: false,
  wrapperClass: 'party-flow-wrap grid-cols-6 gap-x-4',
});

const BASIC_INFO_HEADER_READONLY_FIELD_NAMES = [
  'commissionNum',
  'countryName',
  'laneName',
  'accountDate',
  'settlementDate',
] as const;
const BASIC_INFO_HEADER_SELECT_FIELD_NAMES = [
  'blType',
  'billType',
  'codeSourceId',
] as const;
const BASIC_INFO_MERGED_ENTRUST_FIELD_NAMES = [
  'codeFrtId',
  'codeServiceId',
  'tradeTermsType',
] as const;
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
  'codeFrtId',
  'codeServiceId',
  'tradeTermsType',
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
const SERVICE_TASK_STATUS_PENDING = 0;
const SERVICE_TASK_STATUS_PROCESSED = 1;
type ServiceTypeTaskUser = {
  userId: number;
  userNickName?: string;
};
type ServiceTypeTaskInfo = {
  taskId?: string;
  taskStatus?: 0 | 1 | null;
  completionUserId?: number | null;
  completionTime?: string | null;
  completionUserNickName?: string | null;
  taskUsers?: ServiceTypeTaskUser[];
};
type ServiceTypeNode = {
  serviceType: number;
  label: string;
  sortId: number;
  checked: boolean;
  taskStatus?: 0 | 1 | null;
  taskId?: string;
  completionUserId?: number | null;
  completionTime?: string | null;
  completionUserNickName?: string | null;
  taskUsers?: ServiceTypeTaskUser[];
};
const serviceTypeNodes = ref<ServiceTypeNode[]>([]);
const serviceTypeLabelMap = ref(new Map<number, string>());
const loadServiceTypeLabelMap = async () => {
  const options = await loadSeServiceTypeOptions();
  serviceTypeLabelMap.value = buildServiceTypeLabelMap(options);
};
const toServiceTaskStatusValue = (
  value: unknown,
): ServiceTypeNode['taskStatus'] => {
  const status = Number(value);
  if (status === SERVICE_TASK_STATUS_PENDING)
    return SERVICE_TASK_STATUS_PENDING;
  if (status === SERVICE_TASK_STATUS_PROCESSED)
    return SERVICE_TASK_STATUS_PROCESSED;
  return undefined;
};
const buildServiceTypeNodes = (
  polNodes: SeaExportAdminApi.ServiceTypeByPolDto[],
  enumLabelMap: Map<number, string>,
  savedServiceTypeSet?: Set<number>,
  clientCheckedMap?: Map<number, boolean>,
  taskMap?: Map<number, ServiceTypeTaskInfo>,
  savedSortIdMap?: Map<number, number>,
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
const parseDetailServiceTypes = (detail: SeaExportAdminApi.SeaExportDto) => {
  const services = detail.seaExportServices ?? [];
  const savedSet = new Set<number>(services.map((item) => item.serviceType));
  // 编辑态以已保存的 seaExportServices.sortId 作为分组/排序依据（快照优先于 POL 配置）
  const savedSortIdMap = new Map<number, number>();
  const taskMap = new Map<number, ServiceTypeTaskInfo>();
  services.forEach((item) => {
    if (item.sortId != null) {
      savedSortIdMap.set(item.serviceType, Number(item.sortId));
    }
    const rawTaskId = item.seServiceTask?.id;
    const taskId =
      rawTaskId == null ? undefined : String(rawTaskId).trim() || undefined;
    taskMap.set(item.serviceType, {
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
const getCheckedServiceTypes = () =>
  serviceTypeNodes.value
    .filter((node) => node.checked)
    .map((node) => node.serviceType);
/** 提交入参用：勾选的服务项（含前端传入的 sortId 优先级），按优先级升序 */
const getCheckedServiceTypeItems =
  (): SeaExportAdminApi.SeaExportServiceItemDto[] =>
    sortServiceTypeNodesBySortId(
      serviceTypeNodes.value.filter((node) => node.checked),
    ).map((node) => ({
      serviceType: node.serviceType,
      sortId: node.sortId,
    }));
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

const syncDateVessel = ref('');
const syncDateInnerVoyno = ref('');
const syncDateEtd = ref<unknown>(undefined);

/** 中间表单：基础信息 */
const [BasicInfoForm, basicInfoFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  commonConfig: {
    labelClass: VERTICAL_FORM_LABEL_CLASS,
  },
  schema: [
    ...useBasicInfoFormSchema(isEdit.value)
      .filter(
        (item) =>
          !BASIC_INFO_HEADER_READONLY_FIELD_NAMES.includes(
            item.fieldName as (typeof BASIC_INFO_HEADER_READONLY_FIELD_NAMES)[number],
          ) && item.fieldName !== 'cargoId',
      )
      .map((item) => {
        const isHeaderSelectField =
          BASIC_INFO_HEADER_SELECT_FIELD_NAMES.includes(
            item.fieldName as (typeof BASIC_INFO_HEADER_SELECT_FIELD_NAMES)[number],
          );
        const isMergedEntrustField =
          BASIC_INFO_MERGED_ENTRUST_FIELD_NAMES.includes(
            item.fieldName as (typeof BASIC_INFO_MERGED_ENTRUST_FIELD_NAMES)[number],
          );
        return {
          ...item,
          componentProps: withSmallComponentProps(item.componentProps),
          formItemClass: isHeaderSelectField
            ? 'hidden'
            : isMergedEntrustField
              ? 'col-span-1'
              : item.formItemClass,
        };
      }),
    ...useShipmentFormSchema().filter((item) =>
      BASIC_MODULE_EXTRA_FIELD_NAMES.includes(
        item.fieldName as (typeof BASIC_MODULE_EXTRA_FIELD_NAMES)[number],
      ),
    ),
    ...usePortFormSchema().filter((item) => item.fieldName === 'signingPortId'),
  ]
    .sort((a, b) => {
      const aIndex = BASIC_INFO_FIELD_ORDER_MAP.get(a.fieldName);
      const bIndex = BASIC_INFO_FIELD_ORDER_MAP.get(b.fieldName);
      if (aIndex === undefined && bIndex === undefined) return 0;
      if (aIndex === undefined) return 1;
      if (bIndex === undefined) return -1;
      return aIndex - bIndex;
    })
    .map((item) => ({
      ...item,
      componentProps: withSmallComponentProps(item.componentProps),
    })),
  showDefaultActions: false,
  wrapperClass: 'basic-info-wrap form-controls-small grid-cols-6 gap-x-4',
  handleValuesChange: (values, fieldsChanged) => {
    if (fieldsChanged.includes('vessel')) {
      syncDateVessel.value = String(values.vessel ?? '').trim();
    }
    if (fieldsChanged.includes('innerVoyno')) {
      syncDateInnerVoyno.value = String(values.innerVoyno ?? '').trim();
    }
  },
});

const blTypeOptions = computed(() => getBlTypeOptions());
const billTypeOptions = computed(() => getBillTypeOptions());
const headerBlType = ref<number | undefined>();
const headerBillType = ref<number | undefined>();
const headerCodeSourceId = ref<number | undefined>();
const headerCodeSourceSelectedItems = ref<any[]>([]);

const syncBasicInfoHeaderFields = async () => {
  const values = await basicInfoFormApi.getValues();
  headerBlType.value = values.blType;
  headerBillType.value = values.billType;
  headerCodeSourceId.value = values.codeSourceId;
};

const handleHeaderBlTypeChange = async (value: number | undefined) => {
  headerBlType.value = value;
  await basicInfoFormApi.setFieldValue('blType', value);
};

const handleHeaderBillTypeChange = async (value: number | undefined) => {
  headerBillType.value = value;
  await basicInfoFormApi.setFieldValue('billType', value);
};

const handleHeaderCodeSourceChange = async (value: number | undefined) => {
  headerCodeSourceId.value = value;
  await basicInfoFormApi.setFieldValue('codeSourceId', value);
};

/** 右侧表单：船期信息 */
const [ShipmentForm, shipmentFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  commonConfig: {
    labelClass: VERTICAL_FORM_LABEL_CLASS,
  },
  schema: mapSchemaWithSmallSize(
    useShipmentFormSchema().filter(
      (item) => !SHIPMENT_MOVED_TO_BASIC_FIELD_NAMES.has(item.fieldName),
    ),
  ),
  showDefaultActions: false,
  wrapperClass: 'shipment-flow-wrap form-controls-small grid-cols-7 gap-x-8',
  handleValuesChange: (values, fieldsChanged) => {
    if (fieldsChanged.includes('etd')) {
      syncDateEtd.value = values.etd;
    }
  },
});

const {
  canSync: canSyncShipmentDates,
  disabledTip: syncShipmentDatesDisabledTip,
  loading: syncShipmentDatesLoading,
  refreshParamsFromForms: refreshSyncShipmentDateParams,
  syncDates: handleSyncShipmentDates,
} = useSyncShipmentDates({
  vessel: syncDateVessel,
  innerVoyno: syncDateInnerVoyno,
  etd: syncDateEtd,
  basicInfoFormApi,
  shipmentFormApi,
});

const serviceTypeRequiredPropValues = ref<Map<number, number[]>>(new Map());
const latestAvailableServiceTypes = ref<
  SeaExportAdminApi.ServiceTypeByPolDto[]
>([]);
const completingServiceType = ref<number>();
const cancellingServiceType = ref<number>();
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
const buildServiceRequiredPropsByType = (
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
const updateServiceTypeRequiredProps = () => {
  const checkedSet = new Set(getCheckedServiceTypes());
  serviceTypeRequiredPropValues.value = buildServiceRequiredPropsByType(
    latestAvailableServiceTypes.value,
    checkedSet,
  );
};
type ServicePipelineState = 'active' | 'done' | 'upcoming';
type ServiceTypeNodeGroup = {
  sortId: number;
  nodes: ServiceTypeNode[];
};
const getDistinctServiceSortIdsAsc = (nodes: ServiceTypeNode[]) => {
  const sortIds = new Set<number>();
  nodes.forEach((node) => sortIds.add(node.sortId));
  return [...sortIds].sort((a, b) => a - b);
};
const sortServiceTypeNodesBySortId = (nodes: ServiceTypeNode[]) =>
  [...nodes].sort(
    (a, b) => a.sortId - b.sortId || a.serviceType - b.serviceType,
  );
const groupServiceTypeNodesBySortId = (
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
const checkedServiceTypeNodes = computed(() =>
  sortServiceTypeNodesBySortId(
    serviceTypeNodes.value.filter((node) => node.checked),
  ),
);
const checkedServiceTypeNodeGroups = computed(() =>
  groupServiceTypeNodesBySortId(checkedServiceTypeNodes.value),
);
const serviceTypeNodeGroups = computed(() =>
  groupServiceTypeNodesBySortId(
    sortServiceTypeNodesBySortId(serviceTypeNodes.value),
  ),
);
/** 当前应处理的 sortId 组：取最小 sortId 且组内尚未全部完成 */
const getServicePipelineActiveSortId = (nodes: ServiceTypeNode[]) => {
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
const getServicePipelineState = (
  node: ServiceTypeNode,
  nodes: ServiceTypeNode[] = checkedServiceTypeNodes.value,
): ServicePipelineState => {
  const inList = nodes.some((item) => item.serviceType === node.serviceType);
  if (!inList) return 'upcoming';

  if (node.taskStatus === SERVICE_TASK_STATUS_PROCESSED) {
    return 'done';
  }

  const activeSortId = getServicePipelineActiveSortId(nodes);
  if (activeSortId === null) {
    return 'done';
  }
  if (node.sortId < activeSortId) {
    return 'done';
  }
  if (node.sortId === activeSortId) {
    return 'active';
  }
  return 'upcoming';
};
const isServiceTypeNodeDone = (node: ServiceTypeNode) =>
  getServicePipelineState(node) === 'done';
const getServiceTypeNodeIcon = (node: ServiceTypeNode) => {
  const state = getServicePipelineState(node);
  if (state === 'done') return 'mdi:check-circle';
  if (state === 'active') return 'mdi:progress-clock';
  return 'mdi:schedule';
};
const shouldShowServiceNodeTooltip = (node: ServiceTypeNode) =>
  getServicePipelineState(node) !== 'upcoming';
const isServiceGroupAllUpcoming = (group: ServiceTypeNodeGroup) =>
  group.nodes.length > 1 &&
  group.nodes.every((node) => getServicePipelineState(node) === 'upcoming');
const formatServiceGroupLabels = (nodes: ServiceTypeNode[]) =>
  nodes.map((node) => node.label).join(' / ');
const isServiceChevronFlowFirst = (groupIndex: number, nodeIndex: number) =>
  groupIndex === 0 && nodeIndex === 0;
const isServiceChevronGroupFirst = (groupIndex: number) => groupIndex === 0;
const isServiceChevronGroupLast = (groupIndex: number) => {
  const groups = checkedServiceTypeNodeGroups.value;
  if (!groups.length) return false;
  return groupIndex === groups.length - 1;
};
const isServiceChevronFlowLast = (groupIndex: number, nodeIndex: number) => {
  const groups = checkedServiceTypeNodeGroups.value;
  if (!groups.length) return false;
  const lastGroupIndex = groups.length - 1;
  const lastGroup = groups[lastGroupIndex];
  return (
    groupIndex === lastGroupIndex && nodeIndex === lastGroup.nodes.length - 1
  );
};
const getServiceNodeTooltipStatusMeta = (node: ServiceTypeNode) => {
  if (node.taskStatus === SERVICE_TASK_STATUS_PROCESSED) {
    return { label: '已完成', color: 'success' as const };
  }
  const state = getServicePipelineState(node);
  if (state === 'done') {
    return { label: '已完成', color: 'success' as const };
  }
  if (state === 'active') {
    return { label: '处理中', color: 'processing' as const };
  }
  return { label: '还未到', color: 'default' as const };
};
const serviceTypeModalOpen = ref(false);
const serviceTypeModalDraft = ref<Map<number, boolean>>(new Map());
const isServiceTypeModalChecked = (serviceType: number) =>
  serviceTypeModalDraft.value.get(serviceType) ?? false;
const openServiceTypeModal = () => {
  const draft = new Map<number, boolean>();
  serviceTypeNodes.value.forEach((node) => {
    draft.set(node.serviceType, node.checked);
  });
  serviceTypeModalDraft.value = draft;
  serviceTypeModalOpen.value = true;
};
const handleServiceTypeModalDraftChange = (
  node: ServiceTypeNode,
  event: { target?: { checked?: boolean } },
) => {
  const checked = !!event?.target?.checked;
  serviceTypeModalDraft.value.set(node.serviceType, checked);
  serviceTypeModalDraft.value = new Map(serviceTypeModalDraft.value);
};
const handleServiceTypeModalCancel = () => {
  serviceTypeModalOpen.value = false;
};
const serviceTypeModalDraftChanged = computed(() =>
  serviceTypeNodes.value.some(
    (node) =>
      (serviceTypeModalDraft.value.get(node.serviceType) ?? false) !==
      node.checked,
  ),
);
const applyServiceTypeModalDraft = () => {
  const draftToApply = new Map(serviceTypeModalDraft.value);
  serviceTypeNodes.value.forEach((node) => {
    node.checked = draftToApply.get(node.serviceType) ?? false;
  });
  updateServiceTypeRequiredProps();
  serviceTypeModalOpen.value = false;
};
const SERVICE_TASK_REGENERATE_CONFIRM_SUFFIX =
  '所有服务项目都会重新生成任务。是否继续？';
const SERVICE_TYPE_CONFIG_CONFIRM_CONTENT = `编辑或取消任意服务项目后，${SERVICE_TASK_REGENERATE_CONFIRM_SUFFIX}`;
const applyServiceTypeModalDraftAndSave = async () => {
  applyServiceTypeModalDraft();
  if (isEdit.value) {
    await handleSubmit();
  }
};
const handleServiceTypeModalConfirm = () => {
  if (!serviceTypeModalDraftChanged.value) {
    serviceTypeModalOpen.value = false;
    return;
  }
  if (!isEdit.value) {
    applyServiceTypeModalDraft();
    return;
  }
  return new Promise<void>((resolve, reject) => {
    Modal.confirm({
      title: '确认编辑服务项目',
      content: SERVICE_TYPE_CONFIG_CONFIRM_CONTENT,
      okText: '继续',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        await applyServiceTypeModalDraftAndSave();
        resolve();
      },
      onCancel: () => {
        reject(new Error('cancel'));
      },
    });
  });
};
const isServiceTypeNodeInProgress = (node: ServiceTypeNode) =>
  getServicePipelineState(node) === 'active';
const isCurrentUserServiceTaskHandler = (node: ServiceTypeNode) => {
  const userId = currentUserId.value;
  if (userId == null) return false;
  const users = node.taskUsers ?? [];
  if (!users.length) return true;
  return users.some((item) => item.userId === userId);
};
const formatServiceTaskUsersText = (node: ServiceTypeNode) => {
  const names = (node.taskUsers ?? [])
    .map((item) => item.userNickName || `用户${item.userId}`)
    .filter(Boolean);
  return names.length ? names.join('、') : '-';
};
const hasServiceTaskHandlerRestriction = (node: ServiceTypeNode) =>
  (node.taskUsers?.length ?? 0) > 0;
const canOperateServiceTaskByHandler = (node: ServiceTypeNode) =>
  !hasServiceTaskHandlerRestriction(node) ||
  isCurrentUserServiceTaskHandler(node);
const isCurrentUserServiceCompleter = (node: ServiceTypeNode) => {
  const userId = currentUserId.value;
  if (userId == null) return false;
  const completionUserId = node.completionUserId;
  if (completionUserId == null) return true;
  return completionUserId === userId;
};
const showServiceCompletePermissionHint = (node: ServiceTypeNode) =>
  isEdit.value &&
  !!node.taskId &&
  node.checked &&
  isServiceTypeNodeInProgress(node) &&
  node.taskStatus === SERVICE_TASK_STATUS_PENDING &&
  hasServiceTaskHandlerRestriction(node) &&
  !isCurrentUserServiceTaskHandler(node);
const showServiceCancelPermissionHint = (node: ServiceTypeNode) =>
  isEdit.value &&
  !!node.taskId &&
  node.checked &&
  node.taskStatus === SERVICE_TASK_STATUS_PROCESSED &&
  node.completionUserId != null &&
  !isCurrentUserServiceCompleter(node);
const canCompleteServiceTypeNode = (node: ServiceTypeNode) =>
  isEdit.value &&
  !!node.taskId &&
  node.taskStatus === SERVICE_TASK_STATUS_PENDING &&
  node.checked &&
  isServiceTypeNodeInProgress(node) &&
  canOperateServiceTaskByHandler(node);
const canCancelCompleteServiceTypeNode = (node: ServiceTypeNode) =>
  isEdit.value &&
  !!node.taskId &&
  node.taskStatus === SERVICE_TASK_STATUS_PROCESSED &&
  node.checked &&
  isCurrentUserServiceCompleter(node);
const formatServiceTaskCompletionTime = (value?: string | null) => {
  if (!value) return '-';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm') : value;
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
    basicValues,
    shipmentValues,
    portValues,
    cargoTypeValues,
    cargoMainValues,
    cargoMetricsValues,
    cargoRemarkValues,
    cargoDgValues,
    cargoReeferValues,
  ] = await Promise.all([
    partyInfoFormApi.getValues(),
    basicInfoFormApi.getValues(),
    shipmentFormApi.getValues(),
    portFormApi.getValues(),
    cargoTypeInlineFormApi.getValues(),
    cargoMainFormApi.getValues(),
    cargoMetricsFormApi.getValues(),
    cargoRemarkFormApi.getValues(),
    cargoDgFormApi.getValues(),
    cargoReeferFormApi.getValues(),
  ]);
  return {
    commissionNum: entrustReadonlyInfo.value.commissionNum,
    accountDate: entrustReadonlyInfo.value.accountDate,
    settlementDate: entrustReadonlyInfo.value.settlementDate,
    ...partyValues,
    ...basicValues,
    ...shipmentValues,
    ...portValues,
    ...cargoTypeValues,
    ...cargoMainValues,
    ...cargoMetricsValues,
    ...cargoRemarkValues,
    ...cargoDgValues,
    ...cargoReeferValues,
  } as Record<string, any>;
};
const getMissingRequiredLabelsForServiceType = async (serviceType: number) => {
  const requiredProps =
    serviceTypeRequiredPropValues.value.get(serviceType) ?? [];
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
const handleCompleteServiceType = async (node: ServiceTypeNode) => {
  if (!isEdit.value) return;
  if (completingServiceType.value != null) return;
  const taskId = node.taskId;
  if (!taskId) {
    message.warning('当前服务暂无可完成任务');
    return;
  }
  if (node.taskStatus === SERVICE_TASK_STATUS_PROCESSED) {
    message.info('当前服务已完成');
    return;
  }
  if (!isServiceTypeNodeInProgress(node)) {
    message.warning('当前服务还未轮到处理');
    return;
  }
  if (showServiceCompletePermissionHint(node)) {
    message.warning(
      `您不是当前处理人（${formatServiceTaskUsersText(node)}），无法完成此服务`,
    );
    return;
  }
  const missingLabels = await getMissingRequiredLabelsForServiceType(
    node.serviceType,
  );
  if (missingLabels.length > 0) {
    message.warning(`请先填写：${missingLabels.join('、')}，再完成服务`);
    return;
  }
  completingServiceType.value = node.serviceType;
  try {
    await completeSeServiceTask({ id: taskId });
    message.success(`${node.label}已完成`);
    await loadEditData();
  } catch {
    message.error('完成服务失败，请稍后重试');
  } finally {
    completingServiceType.value = undefined;
  }
};
const confirmCancelCompleteServiceType = (node: ServiceTypeNode) =>
  new Promise<void>((resolve, reject) => {
    Modal.confirm({
      title: '确认取消完成',
      content: `取消「${node.label}」服务完成后，${SERVICE_TASK_REGENERATE_CONFIRM_SUFFIX}`,
      okText: '继续',
      cancelText: '取消',
      okType: 'danger',
      onOk: () => resolve(),
      onCancel: () => reject(new Error('cancel')),
    });
  });
const handleCancelCompleteServiceType = async (node: ServiceTypeNode) => {
  if (!isEdit.value) return;
  if (cancellingServiceType.value != null) return;
  const taskId = node.taskId;
  if (!taskId) {
    message.warning('当前服务暂无可取消任务');
    return;
  }
  if (node.taskStatus !== SERVICE_TASK_STATUS_PROCESSED) {
    message.info('当前服务未完成');
    return;
  }
  if (showServiceCancelPermissionHint(node)) {
    message.warning(
      `仅完成人（${node.completionUserNickName || '-'}）可取消完成`,
    );
    return;
  }
  try {
    await confirmCancelCompleteServiceType(node);
  } catch {
    return;
  }
  cancellingServiceType.value = node.serviceType;
  try {
    await cancelCompleteSeServiceTask({ id: taskId });
    message.success(`${node.label}已取消完成`);
    await loadEditData();
  } catch {
    message.error('取消完成失败，请稍后重试');
  } finally {
    cancellingServiceType.value = undefined;
  }
};
const toOptionalQueryValue = (value: unknown) => {
  if (value === undefined || value === null || value === '') return undefined;
  return value;
};
let serviceTypeLinkageRequestId = 0;
const linkedClientId = ref<unknown>(undefined);
const linkedPolId = ref<unknown>(undefined);
const serviceTypeSyncLoading = ref(false);
const polServiceConfigLoaded = ref(false);
const polHasNoServiceConfig = computed(() => {
  if (toOptionalQueryValue(linkedPolId.value) === undefined) return false;
  if (serviceTypeSyncLoading.value || !polServiceConfigLoaded.value)
    return false;
  return serviceTypeNodes.value.length === 0;
});
const hasPolSelected = computed(
  () => toOptionalQueryValue(linkedPolId.value) !== undefined,
);
const showServiceItemContent = computed(
  () =>
    hasPolSelected.value &&
    !serviceTypeSyncLoading.value &&
    polServiceConfigLoaded.value &&
    !polHasNoServiceConfig.value,
);
let serviceTypeSyncTimer: ReturnType<typeof setTimeout> | undefined;
let latestServiceTypeQueryKey = '';
const buildClientCheckedMap = (
  checkedServiceTypes: null | SeaExportAdminApi.ServiceTypeByPolDto[],
) => {
  const map = new Map<number, boolean>();
  (Array.isArray(checkedServiceTypes) ? checkedServiceTypes : []).forEach(
    (item) => {
      const serviceType = Number(item?.serviceType);
      if (!Number.isFinite(serviceType)) return;
      map.set(serviceType, !!item.checked);
    },
  );
  return map;
};
const resetServiceTypeStateWhenPolEmpty = () => {
  serviceTypeNodes.value = [];
  latestAvailableServiceTypes.value = [];
  serviceTypeRequiredPropValues.value = new Map();
  polServiceConfigLoaded.value = false;
};
const applyServiceTypeStateByPol = (
  availableServiceTypes: null | SeaExportAdminApi.ServiceTypeByPolDto[],
  checkedServiceTypes: null | SeaExportAdminApi.ServiceTypeByPolDto[],
  overrides?: {
    savedServiceTypeSet?: Set<number>;
    savedSortIdMap?: Map<number, number>;
    taskMap?: Map<number, ServiceTypeTaskInfo>;
  },
) => {
  const polNodes = Array.isArray(availableServiceTypes)
    ? availableServiceTypes
    : [];
  latestAvailableServiceTypes.value = polNodes;
  const clientCheckedMap = overrides?.savedServiceTypeSet
    ? undefined
    : buildClientCheckedMap(checkedServiceTypes);
  serviceTypeNodes.value = buildServiceTypeNodes(
    polNodes,
    serviceTypeLabelMap.value,
    overrides?.savedServiceTypeSet,
    clientCheckedMap,
    overrides?.taskMap,
    overrides?.savedSortIdMap,
  );
  serviceTypeRequiredPropValues.value = buildServiceRequiredPropsByType(
    availableServiceTypes,
    new Set(getCheckedServiceTypes()),
  );
  polServiceConfigLoaded.value = true;
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
    savedServiceTypeSet?: Set<number>;
    savedSortIdMap?: Map<number, number>;
    taskMap?: Map<number, ServiceTypeTaskInfo>;
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
  serviceTypeSyncLoading.value = true;
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
        savedServiceTypeSet: args.savedServiceTypeSet,
        savedSortIdMap: args.savedSortIdMap,
        taskMap: args.taskMap,
      },
    );
  } catch {
    if (requestId !== serviceTypeLinkageRequestId) return;
    polServiceConfigLoaded.value = false;
    message.warning('根据起运港查询服务项目失败');
  } finally {
    if (requestId === serviceTypeLinkageRequestId) {
      serviceTypeSyncLoading.value = false;
    }
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
  basicInfoFormApi.updateSchema([
    {
      fieldName: 'clientId',
      componentProps: {
        onChange: (value: unknown) => {
          queueSyncServiceTypesByPol({ clientId: value });
        },
        size: 'small',
      },
    },
    {
      fieldName: 'mblNum',
      componentProps: {
        onChange: async () => {
          await nextTick();
          const values = await basicInfoFormApi.getValues();
          tabMblNum.value = String(values.mblNum ?? '').trim();
        },
        size: 'small',
      },
    },
  ]);
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

const pickPortSelectOption = (option: unknown) => {
  if (Array.isArray(option)) {
    return option[0] as
      | {
          raw?: {
            country?: { countryEnName?: string };
            portName?: string;
          };
        }
      | undefined;
  }
  return option as
    | {
        raw?: {
          country?: { countryEnName?: string };
          portName?: string;
        };
      }
    | undefined;
};

/** 备注单段：去掉中文逗号及逗号后内容，避免与 country 重复拼接 */
const normalizePortRemarkPart = (value: unknown) =>
  (value ?? '').toString().replace(/，/g, ',').split(',')[0]?.trim() ?? '';

/** 备注格式：portName, countryEnName（英文逗号 + 空格，联动时同步半角与大写） */
const formatSeaExportPortRemark = (raw?: {
  country?: { countryEnName?: string };
  portName?: string;
}) => {
  const portName = normalizePortRemarkPart(raw?.portName);
  const countryEnName = normalizePortRemarkPart(raw?.country?.countryEnName);
  const remark =
    portName && countryEnName
      ? `${portName}, ${countryEnName}`
      : portName || countryEnName || '';
  return remark ? toEnglishUpperCase(remark) : undefined;
};

/** PortSelect @change：联动备注；起运港变更时同步服务项目 */
const handlePortSelectChange = (
  fieldName: string,
  value: unknown,
  option: unknown,
) => {
  if (fieldName === 'polId') {
    queueSyncServiceTypesByPol({ polId: value });
  }
  const remarkField = PORT_ID_FIELD_TO_REMARK_FIELD[fieldName];
  if (!remarkField) return;
  const remark = formatSeaExportPortRemark(pickPortSelectOption(option)?.raw);
  if (!remark) return;
  const api = portFormApiRef.current;
  if (!api) return;
  void api.setFieldValue(remarkField, remark);
};

/** 右侧表单：港口信息 */
const [PortForm, portFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  commonConfig: {
    labelClass: VERTICAL_FORM_LABEL_CLASS,
  },
  schema: usePortFormSchema({ onPortChange: handlePortSelectChange })
    .filter((item) => !PORT_MOVED_TO_BASIC_FIELD_NAMES.has(item.fieldName))
    .map((item) =>
      String(item.formItemClass ?? '').includes('port-flow-remark')
        ? item
        : {
            ...item,
            componentProps: withSmallComponentProps(item.componentProps),
          },
    ),
  showDefaultActions: false,
  wrapperClass: 'port-flow-wrap form-controls-small grid-cols-5 gap-x-8',
});
portFormApiRef.current = portFormApi;
bindServiceTypeLinkageEvents();

const cargoSchema = useCargoFormSchema();
const currentCargoId = ref<number | undefined>();
const cargoInlineFieldNames = new Set(['cargoId', 'orderCodeGoodss']);
const cargoTypeSchema = mapSchemaWithSmallSize(
  [...useBasicInfoFormSchema(isEdit.value), ...cargoSchema]
    .filter((item) => cargoInlineFieldNames.has(item.fieldName))
    .map((item) => ({
      ...item,
      hideLabel: true,
      formItemClass:
        item.fieldName === 'orderCodeGoodss'
          ? 'cargo-type-inline-item cargo-type-inline-item--goods'
          : 'cargo-type-inline-item cargo-type-inline-item--cargo',
    })),
);
const [CargoTypeInlineForm, cargoTypeInlineFormApi] = useVbenForm({
  layout: 'horizontal',
  compact: true,
  schema: cargoTypeSchema,
  showDefaultActions: false,
  commonConfig: {
    labelWidth: 0,
  },
  wrapperClass: 'form-controls-small grid-cols-2 gap-x-3',
  handleValuesChange: (values, fieldsChanged) => {
    if (!fieldsChanged.includes('cargoId')) {
      return;
    }
    currentCargoId.value = values.cargoId as number | undefined;
  },
});
const cargoMainFieldNames = new Set(['marks', 'goodsDes']);
const cargoMetricsFieldNames = new Set(['pkgs', 'codePackageId', 'kgs', 'cbm']);
const cargoRemarkFieldNames = ['internalRemark', 'remark'] as const;
const cargoRemarkSchema = cargoSchema
  .filter((item) =>
    (cargoRemarkFieldNames as readonly string[]).includes(item.fieldName),
  )
  .map((item) => ({
    ...item,
    label:
      item.fieldName === 'internalRemark'
        ? '备注信息'
        : item.fieldName === 'remark'
          ? '外部备注'
          : item.label,
    componentProps: {
      allowClear: true,
      rows: 3,
      style: { minHeight: '72px' },
    },
    formItemClass: 'col-span-2 party-remark-field',
  }));

/** 收发通区块：备注信息 */
const [CargoRemarkForm, cargoRemarkFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  commonConfig: {
    labelClass: VERTICAL_FORM_LABEL_CLASS,
  },
  schema: cargoRemarkSchema,
  showDefaultActions: false,
  wrapperClass: 'party-remark-wrap grid-cols-6 gap-x-4',
});
const [CargoMainForm, cargoMainFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  commonConfig: {
    labelClass: VERTICAL_FORM_LABEL_CLASS,
  },
  schema: cargoSchema
    .filter((item) => cargoMainFieldNames.has(item.fieldName))
    .map((item) => ({
      ...item,
      formItemClass:
        item.fieldName === 'marks'
          ? 'col-span-2 cargo-main-item cargo-main-item--marks min-h-0 !flex-shrink'
          : 'col-span-3 cargo-main-item cargo-main-item--goods-des min-h-0 !flex-shrink',
    })),
  showDefaultActions: false,
  wrapperClass: 'cargo-main-wrap form-controls-small grid-cols-5 gap-x-4',
});

/** 中间表单：货物信息 — 件数 / 包装 / 毛重 / 体积 */
const [CargoMetricsForm, cargoMetricsFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  commonConfig: {
    labelClass: VERTICAL_FORM_LABEL_CLASS,
  },
  schema: cargoSchema
    .filter((item) => cargoMetricsFieldNames.has(item.fieldName))
    .map((item) => ({
      ...item,
      componentProps: withSmallComponentProps(item.componentProps),
      formItemClass: `cargo-metrics-item cargo-metrics-item--${item.fieldName === 'codePackageId' ? 'code-package' : item.fieldName}`,
    })),
  showDefaultActions: false,
  wrapperClass: 'cargo-metrics-wrap form-controls-small grid-cols-1',
});

const showDgFields = computed(() => currentCargoId.value === CARGO_TYPE.D);
const showReeferFields = computed(() => currentCargoId.value === CARGO_TYPE.R);

const [CargoDgForm, cargoDgFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  commonConfig: {
    labelClass: VERTICAL_FORM_LABEL_CLASS,
  },
  schema: useDgFormSchema().map((item) => ({
    ...item,
    componentProps: withSmallComponentProps(item.componentProps),
  })),
  showDefaultActions: false,
  wrapperClass: 'cargo-extension-wrap form-controls-small grid-cols-4 gap-x-4',
});

const [CargoReeferForm, cargoReeferFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  commonConfig: {
    labelClass: VERTICAL_FORM_LABEL_CLASS,
  },
  schema: useReeferFormSchema().map((item) => ({
    ...item,
    componentProps: withSmallComponentProps(item.componentProps),
  })),
  showDefaultActions: false,
  wrapperClass: 'cargo-extension-wrap form-controls-small grid-cols-4 gap-x-4',
});

watch(currentCargoId, async (nextCargoId, prevCargoId) => {
  if (prevCargoId === CARGO_TYPE.D && nextCargoId !== CARGO_TYPE.D) {
    await cargoDgFormApi.setValues(createEmptyDgValues());
  }
  if (prevCargoId === CARGO_TYPE.R && nextCargoId !== CARGO_TYPE.R) {
    await cargoReeferFormApi.setValues(createEmptyReeferValues());
  }
});

/** 中间表单：货物信息 — 唛头 / 货描 */
const orderCtns = ref<SeaExportAdminApi.OrderCtnAddDto[]>([]);
const entrustReadonlyInfo = ref({
  commissionNum: '',
  organizationUnitsText: '-',
  countryName: '',
  laneName: '',
  accountDateText: '',
  settlementDateText: '',
  accountDate: undefined as unknown,
  settlementDate: undefined as unknown,
});

const tabMblNum = ref('');
const tabCommissionNum = computed(
  () => entrustReadonlyInfo.value.commissionNum || undefined,
);
const isOrderSaved = computed(() => isEdit.value);

useSeaExportTabTitle(tabMblNum, tabCommissionNum, isOrderSaved);

const syncTabTitleFromValues = (values: Record<string, any>) => {
  tabMblNum.value = String(values.mblNum ?? '').trim();
};

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
/** 已确认 getUser 失败的用户，才展示「已删除」兜底 */
const orderUserLoadFailedSet = ref(new Set<number>());
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
const orderUserRoleModalOpen = ref(false);
const orderUserRoleModalSelected = ref<number | undefined>();
const selectedOrderUserRoleSet = computed(
  () =>
    new Set(
      orderUserRows.value
        .map((row) => row.userAttribute)
        .filter((item): item is number => item != null),
    ),
);
const availableOrderUserRoleOptions = computed(() =>
  orderUserRoleOptions.value.filter(
    (option) => !selectedOrderUserRoleSet.value.has(option.value),
  ),
);
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
const getOrderUserResolvedName = (row: OrderUserEditorRow) => {
  if (!row.userId) return row.userName || '';
  const mappedName = orderUserNameMap.value[row.userId];
  if (mappedName) return mappedName;
  if (row.userName && row.userName !== String(row.userId)) return row.userName;
  return '';
};
const getOrderUserDisplayName = (row: OrderUserEditorRow) => {
  const resolved = getOrderUserResolvedName(row);
  if (resolved) return resolved;
  if (!row.userId) return '';
  if (
    isOrderUserDetailLoading(row.userId) ||
    !orderUserLoadFailedSet.value.has(row.userId)
  ) {
    return '';
  }
  return formatDeletedUserFallback(row.userId);
};
const getOrderUserSelectedItems = (row: OrderUserEditorRow) => {
  if (!row.userId) return [];
  const nickName = getOrderUserResolvedName(row);
  if (!nickName) return [];
  return [{ id: row.userId, nickName }];
};
const getOrderUserAvatarSrc = (userId?: number) => {
  const avatar = getOrderUserDetail(userId)?.avatar?.trim();
  if (avatar) return buildAttachmentUrl(avatar);
  return preferences.app.defaultAvatar;
};
const getOrderUserAvatarText = (row: OrderUserEditorRow) => {
  const displayName =
    getOrderUserDisplayName(row) ||
    getOrderUserDetail(row.userId)?.nickName ||
    getOrderUserDetail(row.userId)?.userName;
  const normalized = displayName?.trim();
  if (normalized) return normalized.slice(0, 1);
  return '?';
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
      resolveUserDisplayName(userId, undefined, cachedDetail),
    );
    return;
  }
  if (orderUserDetailLoadingMap.value[userId]) return;
  orderUserDetailLoadingMap.value = {
    ...orderUserDetailLoadingMap.value,
    [userId]: true,
  };
  try {
    const detail = await getUser(userId, { silent: true });
    if (orderUserLoadFailedSet.value.has(userId)) {
      const next = new Set(orderUserLoadFailedSet.value);
      next.delete(userId);
      orderUserLoadFailedSet.value = next;
    }
    syncOrderUserDetail(detail);
    const displayName = resolveUserDisplayName(userId, undefined, detail);
    setOrderUserNameForRow(rowKey, userId, displayName);
  } catch {
    const row = rowKey
      ? orderUserRows.value.find((item) => item._rowKey === rowKey)
      : undefined;
    const fallback = resolveUserDisplayName(userId, row?.userName);
    orderUserLoadFailedSet.value = new Set([
      ...orderUserLoadFailedSet.value,
      userId,
    ]);
    syncOrderUserName(userId, fallback);
    setOrderUserNameForRow(rowKey, userId, fallback);
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
  void fillOrderUserNames(orderUserRows.value);
};
const openOrderUserRoleModal = () => {
  if (!availableOrderUserRoleOptions.value.length) {
    message.warning('所有角色已添加，不可重复添加');
    return;
  }
  orderUserRoleModalSelected.value =
    availableOrderUserRoleOptions.value[0]?.value;
  orderUserRoleModalOpen.value = true;
};
const handleOrderUserRoleModalCancel = () => {
  orderUserRoleModalSelected.value = undefined;
  orderUserRoleModalOpen.value = false;
};
const handleOrderUserRoleModalConfirm = () => {
  const userAttribute = orderUserRoleModalSelected.value;
  if (userAttribute == null) {
    message.warning('请选择角色');
    return;
  }
  if (selectedOrderUserRoleSet.value.has(userAttribute)) {
    message.warning(`${getOrderUserRoleLabel(userAttribute)}角色已存在`);
    return;
  }
  orderUserRows.value = [
    ...orderUserRows.value,
    {
      _rowKey: makeOrderUserRowKey(),
      userAttribute,
      sortId: 0,
    },
  ];
  syncOrderUsersToForm();
  handleOrderUserRoleModalCancel();
};
const removeOrderUserRole = (rowKey: string) => {
  const row = orderUserRows.value.find((item) => item._rowKey === rowKey);
  if (
    row?.userAttribute != null &&
    requiredOrderUserRoles.includes(row.userAttribute)
  ) {
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
const validateRequiredOrderUserAssignee = () => {
  for (const role of requiredOrderUserRoles) {
    const row = orderUserRows.value.find((item) => item.userAttribute === role);
    if (!row) {
      message.warning(`请添加${getOrderUserRoleLabel(role)}角色`);
      return false;
    }
    if (!hasValidUserId(row.userId)) {
      message.warning(`${getOrderUserRoleLabel(role)}必须选择人员`);
      return false;
    }
  }
  return true;
};
const formatBoundRoleOptionsLabel = (roles: number[]) =>
  roles.map((role) => getOrderUserRoleLabel(role)).join('或');
const validateServiceBoundOrderUsers = () => {
  const checkedNodes = serviceTypeNodes.value.filter((node) => node.checked);
  if (!checkedNodes.length) {
    return true;
  }
  if (serviceTypeSyncLoading.value || !polServiceConfigLoaded.value) {
    message.warning('服务项目配置加载中，请稍后保存');
    return false;
  }
  const polConfigMap = new Map<number, SeaExportAdminApi.ServiceTypeByPolDto>();
  latestAvailableServiceTypes.value.forEach((item) => {
    const serviceType = Number(item.serviceType);
    if (!Number.isFinite(serviceType)) return;
    polConfigMap.set(serviceType, item);
  });
  for (const node of checkedNodes) {
    const boundRoles = parseSeaExportUserAttribute(
      polConfigMap.get(node.serviceType)?.userAttribute,
    );
    if (!boundRoles.length) continue;
    const isServiceSatisfied = boundRoles.some((role) => {
      const row = orderUserRows.value.find(
        (item) => item.userAttribute === role,
      );
      return hasValidUserId(row?.userId);
    });
    if (isServiceSatisfied) continue;
    const rolesWithRowNoUser = boundRoles.filter((role) => {
      const row = orderUserRows.value.find(
        (item) => item.userAttribute === role,
      );
      return row != null && !hasValidUserId(row.userId);
    });
    if (rolesWithRowNoUser.length > 0) {
      message.warning(
        `${getOrderUserRoleLabel(rolesWithRowNoUser[0])}必须选择人员（${node.label}）`,
      );
      return false;
    }
    if (boundRoles.length === 1) {
      message.warning(
        `请添加${getOrderUserRoleLabel(boundRoles[0])}角色（${node.label}）`,
      );
      return false;
    }
    message.warning(
      `${node.label}服务缺少责任人员，请添加${formatBoundRoleOptionsLabel(boundRoles)}角色`,
    );
    return false;
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
      label: '',
      formItemClass: `port-flow-item port-flow-item--transit port-flow-pos--transit${
        isPoT1Active ? '' : ' port-flow-item--hidden'
      }`,
    },
    {
      fieldName: 'poT2Id',
      label: '',
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
const parseNumberFromText = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return undefined;
  const matched = value.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  if (!matched) return undefined;
  const parsed = Number(matched[0]);
  return Number.isFinite(parsed) ? parsed : undefined;
};
const ENGLISH_UPPER_CASE_FIELDS = new Set([
  'marks',
  'goodsDes',
  'shipperContent',
  'consigneeContent',
  'notifierContent',
  'secondNotifierContent',
  'podAgentContent',
  'receivePortRemark',
  'polRemark',
  'poT1Remark',
  'poT2Remark',
  'podRemark',
  'deliverPortRemark',
  'vessel',
  'innerVoyno',
  'mblNum',
]);
const normalizeAiFieldValue = (field: string, value: unknown) => {
  if (AI_RECOGNIZE_DATE_FIELDS.has(field)) {
    return toDayjs(value as string | undefined);
  }
  if (field === 'pkgs' || field === 'kgs' || field === 'cbm') {
    return parseNumberFromText(value);
  }
  if (ENGLISH_UPPER_CASE_FIELDS.has(field) && typeof value === 'string') {
    return toEnglishUpperCase(value.trim());
  }
  if (field === 'bookingNum') {
    return typeof value === 'string' ? value.trim() : value;
  }
  return value;
};
const applyAiRecognizedFormValues = async (
  values: Record<string, any>,
  options?: {
    orderCtnsPayload?: SeaExportAdminApi.OrderCtnAddDto[];
    orderCodeGoodssPayload?: number[];
  },
) => {
  await Promise.all([
    partyInfoFormApi.setValues(values),
    basicInfoFormApi.setValues(values),
    shipmentFormApi.setValues(values),
    portFormApi.setValues(values),
    cargoTypeInlineFormApi.setValues(values),
    cargoMainFormApi.setValues(values),
    cargoMetricsFormApi.setValues(values),
    cargoRemarkFormApi.setValues(values),
    cargoDgFormApi.setValues(values),
    cargoReeferFormApi.setValues(values),
  ]);

  if (options?.orderCodeGoodssPayload?.length) {
    await cargoTypeInlineFormApi.setValues({
      orderCodeGoodss: options.orderCodeGoodssPayload,
    });
  }

  if (options?.orderCtnsPayload?.length) {
    orderCtns.value = normalizeOrderCtnsWithRowKey(options.orderCtnsPayload);
  }

  refreshEntrustReadonlyInfo({
    ...entrustReadonlyInfo.value,
    commissionNum:
      values.commissionNum ?? entrustReadonlyInfo.value.commissionNum,
    accountDate: values.accountDate ?? entrustReadonlyInfo.value.accountDate,
    settlementDate:
      values.settlementDate ?? entrustReadonlyInfo.value.settlementDate,
  });
  syncTabTitleFromValues(values);
  await syncBasicInfoHeaderFields();

  if (values.polId != null || values.clientId != null) {
    await syncServiceTypesByPol({
      polId: values.polId,
      clientId: values.clientId,
      force: true,
    });
  }
};

const applyAiExtractSelectedItems = (
  values: Record<string, any>,
  extractedSchema?: Record<string, unknown>,
) => {
  const schema = extractedSchema ?? {};
  const item = (fieldName: string, componentProps: Record<string, any>) => ({
    fieldName,
    componentProps: { ...componentProps, size: 'small' },
  });

  basicInfoFormApi.updateSchema([
    item('clientId', {
      selectedItems: toSelectedItems(
        values.clientId,
        pickExtractedLabel(schema, resolveCitationKeys('clientId')),
      ),
    }),
    item('codeIssueTypeId', {
      selectedItems: toSelectedItems(
        values.codeIssueTypeId,
        pickExtractedLabel(schema, resolveCitationKeys('codeIssueTypeId')),
        'billType',
      ),
    }),
    item('carrierId', {
      selectedItems: toSelectedItems(
        values.carrierId,
        pickExtractedLabel(schema, resolveCitationKeys('carrierId')),
        'cnShortName',
      ),
    }),
    item('shipAgentId', {
      selectedItems: toSelectedItems(
        values.shipAgentId,
        pickExtractedLabel(schema, resolveCitationKeys('shipAgentId')),
      ),
    }),
    item('codeServiceId', {
      selectedItems: toSelectedItems(
        values.codeServiceId,
        pickExtractedLabel(schema, resolveCitationKeys('codeServiceId')),
        'enName',
      ),
    }),
  ]);

  portFormApi.updateSchema([
    item('polId', {
      selectedItems: toPortSelectedItems(
        values.polId,
        pickExtractedLabel(schema, ['起运港名称']),
        pickExtractedLabel(schema, ['起运港代码']),
      ),
    }),
    item('podId', {
      selectedItems: toPortSelectedItems(
        values.podId,
        pickExtractedLabel(schema, ['目的港名称']),
        pickExtractedLabel(schema, ['目的港代码']),
      ),
    }),
    item('deliverPortId', {
      selectedItems: toPortSelectedItems(
        values.deliverPortId,
        pickExtractedLabel(schema, ['交货地名称']),
        pickExtractedLabel(schema, ['交货港代码']),
      ),
    }),
    item('signingPortId', {
      selectedItems: toPortSelectedItems(
        values.signingPortId,
        pickExtractedLabel(schema, resolveCitationKeys('signingPortId')),
      ),
    }),
  ]);

  cargoMetricsFormApi.updateSchema([
    item('codePackageId', {
      selectedItems: toSelectedItems(
        values.codePackageId,
        pickExtractedLabel(schema, resolveCitationKeys('codePackageId')),
      ),
    }),
  ]);
};

/** 提交时 dayjs/日期 转回 ISO 字符串 */
const toDateString = (val: unknown) => {
  if (val == null) return undefined;
  const d = dayjs(val as string | Date);
  return d.isValid() ? d.toISOString() : undefined;
};

/** 提交时 dayjs/日期 转回日期字符串（精度到天） */
const toDateOnlyString = (val: unknown) => {
  if (val == null) return undefined;
  const d = dayjs(val as string | Date);
  return d.isValid() ? d.format('YYYY-MM-DD') : undefined;
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
    dgLevel: to?.dgLevel,
    dgNo: to?.dgNo,
    dgPageNo: to?.dgPageNo,
    dgLabel: to?.dgLabel,
    dgPackingCategory: to?.dgPackingCategory,
    dgContact: to?.dgContact,
    dgTel: to?.dgTel,
    dgNetWeight: to?.dgNetWeight,
    dgFlashPoint: to?.dgFlashPoint,
    dgPackingNo: to?.dgPackingNo,
    dgMarinePollution: to?.dgMarinePollution,
    reeferTemperature: to?.reeferTemperature,
    reeferVentilation: to?.reeferVentilation,
    reeferHumidity: to?.reeferHumidity,
    reeferMinTemperature: to?.reeferMinTemperature,
    reeferMaxTemperature: to?.reeferMaxTemperature,
    reeferTemperatureUnit: to?.reeferTemperatureUnit,
    reeferVentOpen: to?.reeferVentOpen,
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
 * @param labelKey 对应 select 组件的回显字段，如 ClientSelect 用 'name'，PortSelect 用 'portName'
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

/** PortSelect 回显：portName + ediCode（labelKey 为 ediCode 时展示依赖 ediCode），countryEnName 可选 */
const toPortSelectedItems = (
  id: unknown,
  portName: unknown,
  ediCode?: unknown,
  countryEnName?: unknown,
) => {
  const extra: Record<string, unknown> = {};
  if (ediCode != null && String(ediCode).trim() !== '') {
    extra.ediCode = String(ediCode).trim();
  }
  if (countryEnName != null && String(countryEnName).trim() !== '') {
    extra.country = { countryEnName: String(countryEnName).trim() };
  }
  return toSelectedItems(id, portName, 'portName', extra);
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
          size: 'small',
        },
      },
      {
        fieldName: 'consigneeId',
        componentProps: {
          selectedItems: toSelectedItems(
            to?.consigneeId,
            (to as any)?.consigneeName,
          ),
          size: 'small',
        },
      },
      {
        fieldName: 'notifierId',
        componentProps: {
          selectedItems: toSelectedItems(
            to?.notifierId,
            (to as any)?.notifierName,
          ),
          size: 'small',
        },
      },
      {
        fieldName: 'secondNotifierId',
        componentProps: {
          selectedItems: toSelectedItems(
            detail.secondNotifierId,
            detail.secondNotifierName,
          ),
          size: 'small',
        },
      },
      {
        fieldName: 'podAgentId',
        componentProps: {
          selectedItems: toSelectedItems(
            detail.podAgentId,
            detail.podAgentName,
          ),
          size: 'small',
        },
      },
    ]);

    basicInfoFormApi.updateSchema([
      {
        fieldName: 'clientId',
        componentProps: {
          selectedItems: toSelectedItems(to?.clientId, (to as any)?.clientName),
          size: 'small',
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
          size: 'small',
        },
      },
      {
        fieldName: 'carrierId',
        componentProps: {
          selectedItems: toSelectedItems(
            detail.carrierId,
            detail.carrierCnShortName || detail.carrierName,
            'cnShortName',
            {
              ...(detail.carrierLogo ? { logo: detail.carrierLogo } : {}),
              ...(detail.carrier?.code ? { code: detail.carrier.code } : {}),
            },
          ),
          size: 'small',
        },
      },
      {
        fieldName: 'shipAgentId',
        componentProps: {
          selectedItems: toSelectedItems(
            detail.shipAgentId,
            detail.shipAgentName,
          ),
          size: 'small',
        },
      },
      {
        fieldName: 'yardId',
        componentProps: {
          selectedItems: toSelectedItems(detail.yardId, detail.yardName),
          size: 'small',
        },
      },
      {
        fieldName: 'signingPortId',
        componentProps: {
          selectedItems: toPortSelectedItems(
            formValues.signingPortId,
            detail.signingPortName,
            detail.signingPortEdiCode,
          ),
          size: 'small',
        },
      },
    ]);
    basicInfoFormApi.updateSchema([
      {
        fieldName: 'teamId',
        componentProps: {
          selectedItems: toSelectedItems(to?.teamId, (to as any)?.teamName),
          size: 'small',
        },
      },
      {
        fieldName: 'custBrokerId',
        componentProps: {
          selectedItems: toSelectedItems(
            to?.custBrokerId,
            (to as any)?.custBrokerName,
          ),
          size: 'small',
        },
      },
      {
        fieldName: 'warehouseId',
        componentProps: {
          selectedItems: toSelectedItems(
            to?.warehouseId,
            (to as any)?.warehouseName,
          ),
          size: 'small',
        },
      },
      {
        fieldName: 'insuranceId',
        componentProps: {
          selectedItems: toSelectedItems(
            to?.insuranceId,
            (to as any)?.insuranceName,
          ),
          size: 'small',
        },
      },
      {
        fieldName: 'codeFrtId',
        componentProps: {
          frtProps: {
            selectedItems: toSelectedItems(
              to?.codeFrtId,
              (to as any)?.codeFrtName,
              'cnName',
            ),
            allowClear: true,
          },
          prepareProps: {
            selectedItems: toPortSelectedItems(
              formValues.prepareAtId,
              detail.prepareAtName ?? (to as any)?.prepareAtName,
              detail.prepareAtEdiCode ?? (to as any)?.prepareAtEdiCode,
            ),
            allowClear: true,
          },
          size: 'small',
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
          size: 'small',
        },
      },
    ]);
    shipmentFormApi.updateSchema([
      {
        fieldName: 'bookingAgentId',
        componentProps: {
          selectedItems: toSelectedItems(
            detail.bookingAgentId,
            detail.bookingAgentName,
          ),
          size: 'small',
        },
      },
    ]);

    portFormApi.updateSchema([
      {
        fieldName: 'polId',
        componentProps: {
          selectedItems: toPortSelectedItems(
            formValues.polId,
            detail.polName,
            detail.polEdiCode,
          ),
          size: 'small',
        },
      },
      {
        fieldName: 'podId',
        componentProps: {
          selectedItems: toPortSelectedItems(
            formValues.podId,
            detail.podName,
            detail.podEdiCode,
          ),
          size: 'small',
        },
      },
      {
        fieldName: 'poT1Id',
        componentProps: {
          selectedItems: toPortSelectedItems(
            formValues.poT1Id,
            detail.poT1Name,
            detail.poT1EdiCode,
          ),
          size: 'small',
        },
      },
      {
        fieldName: 'poT2Id',
        componentProps: {
          selectedItems: toPortSelectedItems(
            formValues.poT2Id,
            detail.poT2Name,
            detail.poT2EdiCode,
          ),
          size: 'small',
        },
      },
      {
        fieldName: 'receivePortId',
        componentProps: {
          selectedItems: toPortSelectedItems(
            formValues.receivePortId,
            detail.receivePortName,
            detail.receivePortEdiCode,
          ),
          size: 'small',
        },
      },
      {
        fieldName: 'deliverPortId',
        componentProps: {
          selectedItems: toPortSelectedItems(
            formValues.deliverPortId,
            detail.deliverPortName,
            detail.deliverPortEdiCode,
          ),
          size: 'small',
        },
      },
    ]);
    cargoMetricsFormApi.updateSchema([
      {
        fieldName: 'codePackageId',
        componentProps: {
          selectedItems: toSelectedItems(
            formValues.codePackageId,
            (to as any)?.codePackageName,
          ),
          size: 'small',
        },
      },
    ]);

    await Promise.all([
      partyInfoFormApi.setValues(formValues),
      basicInfoFormApi.setValues(formValues),
      shipmentFormApi.setValues(formValues),
      portFormApi.setValues(formValues),
      cargoTypeInlineFormApi.setValues(formValues),
      cargoMainFormApi.setValues(formValues),
      cargoMetricsFormApi.setValues(formValues),
      cargoRemarkFormApi.setValues(formValues),
      cargoDgFormApi.setValues(formValues),
      cargoReeferFormApi.setValues(formValues),
    ]);
    currentCargoId.value = formValues.cargoId as number | undefined;
    initializeOrderUsersPanel(to?.orderUsers ?? []);
    const { savedSet, savedSortIdMap, taskMap } =
      parseDetailServiceTypes(detail);
    refreshEntrustReadonlyInfo(formValues);
    syncTabTitleFromValues(formValues);
    headerCodeSourceSelectedItems.value = toSelectedItems(
      to?.codeSourceId,
      (to as any)?.codeSourceName,
      'cnName',
    );
    await syncBasicInfoHeaderFields();
    await refreshSyncShipmentDateParams();

    orderCtns.value = normalizeOrderCtnsWithRowKey(
      detail.transportOrder?.orderCtns as any,
    );
    await syncServiceTypesByPol({
      polId: formValues.polId,
      clientId: formValues.clientId,
      force: true,
      savedServiceTypeSet: savedSet,
      savedSortIdMap,
      taskMap,
    });
    await syncFormSnapshot();
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
    serviceTypes: getCheckedServiceTypeItems(),
  };

  const transportOrderFields: Record<string, any> = {
    commissionNum: values.commissionNum,
    mblNum: values.mblNum,
    bookingNum: values.bookingNum,
    accountDate: toDateString(values.accountDate),
    settlementDate: toDateString(values.settlementDate),
    codeSourceId: values.codeSourceId ?? undefined,
    isBusinessLocking: values.isBusinessLocking,
    feeLocked: values.feeLocked,
    codeFrtId: values.codeFrtId ?? undefined,
    prepareAtId: values.prepareAtId ?? undefined,
    codeServiceId: values.codeServiceId ?? undefined,
    cargoId: values.cargoId ?? undefined,
    tradeTermsType: values.tradeTermsType ?? undefined,
    goodsCompleteTime: toDateOnlyString(values.goodsCompleteTime),
    etd: toDateOnlyString(values.etd),
    atd: toDateOnlyString(values.atd),
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
    ...(values.cargoId === CARGO_TYPE.D
      ? {
          dgLevel: values.dgLevel,
          dgNo: values.dgNo,
          dgPageNo: values.dgPageNo,
          dgLabel: values.dgLabel,
          dgPackingCategory: values.dgPackingCategory,
          dgContact: values.dgContact,
          dgTel: values.dgTel,
          dgNetWeight: values.dgNetWeight,
          dgFlashPoint: values.dgFlashPoint,
          dgPackingNo: values.dgPackingNo,
          dgMarinePollution: values.dgMarinePollution,
        }
      : {}),
    ...(values.cargoId === CARGO_TYPE.R
      ? {
          reeferTemperature: values.reeferTemperature,
          reeferVentilation: values.reeferVentilation,
          reeferHumidity: values.reeferHumidity,
          reeferMinTemperature: values.reeferMinTemperature,
          reeferMaxTemperature: values.reeferMaxTemperature,
          reeferTemperatureUnit: values.reeferTemperatureUnit ?? undefined,
          reeferVentOpen: values.reeferVentOpen,
        }
      : {}),
  };

  if (isEdit.value && transportOrderId.value) {
    (transportOrderFields as any).id = transportOrderId.value;
  }

  return {
    ...seaExportFields,
    ...(isEdit.value && editId.value ? { id: editId.value } : {}),
    transportOrder: transportOrderFields,
  };
};

const handleSubmit = async () => {
  const [
    partyResult,
    basicResult,
    shipmentResult,
    portResult,
    cargoTypeResult,
    cargoMainResult,
    cargoMetricsResult,
    cargoRemarkResult,
    cargoDgResult,
    cargoReeferResult,
  ] = await Promise.all([
    partyInfoFormApi.validate(),
    basicInfoFormApi.validate(),
    shipmentFormApi.validate(),
    portFormApi.validate(),
    cargoTypeInlineFormApi.validate(),
    cargoMainFormApi.validate(),
    cargoMetricsFormApi.validate(),
    cargoRemarkFormApi.validate(),
    cargoDgFormApi.validate(),
    cargoReeferFormApi.validate(),
  ]);
  const allValid =
    partyResult.valid &&
    basicResult.valid &&
    shipmentResult.valid &&
    portResult.valid &&
    cargoTypeResult.valid &&
    cargoMainResult.valid &&
    cargoMetricsResult.valid &&
    cargoRemarkResult.valid &&
    cargoDgResult.valid &&
    cargoReeferResult.valid;
  if (!allValid) {
    message.warning($t('ui.formRules.pleaseCompleteRequiredFields'));
    return;
  }
  if (!validateSalesRoleCount()) {
    return;
  }
  if (!validateRequiredOrderUserAssignee()) {
    return;
  }
  if (!validateServiceBoundOrderUsers()) {
    return;
  }

  submitting.value = true;
  const [
    partyValues,
    basicValues,
    shipmentValues,
    portValues,
    cargoTypeValues,
    cargoMainValues,
    cargoMetricsValues,
    cargoRemarkValues,
    cargoDgValues,
    cargoReeferValues,
  ] = await Promise.all([
    partyInfoFormApi.getValues(),
    basicInfoFormApi.getValues(),
    shipmentFormApi.getValues(),
    portFormApi.getValues(),
    cargoTypeInlineFormApi.getValues(),
    cargoMainFormApi.getValues(),
    cargoMetricsFormApi.getValues(),
    cargoRemarkFormApi.getValues(),
    cargoDgFormApi.getValues(),
    cargoReeferFormApi.getValues(),
  ]);
  const values = {
    commissionNum: entrustReadonlyInfo.value.commissionNum,
    accountDate: entrustReadonlyInfo.value.accountDate,
    settlementDate: entrustReadonlyInfo.value.settlementDate,
    ...partyValues,
    ...basicValues,
    ...shipmentValues,
    ...portValues,
    ...cargoTypeValues,
    ...cargoMainValues,
    ...cargoMetricsValues,
    ...cargoRemarkValues,
    ...cargoDgValues,
    ...cargoReeferValues,
  };
  const dto = buildDto(values);

  try {
    if (isEdit.value) {
      await editSeaExport(dto as SeaExportAdminApi.SeaExportEditDto);
      message.success($t('ui.actionMessage.operationSuccess'));
      markListShouldRefresh('SeaExportList');
      markListShouldRefresh('Workspace');
      await loadEditData();
    } else {
      const createdId = await addSeaExport(
        dto as SeaExportAdminApi.SeaExportAddDto,
      );
      message.success($t('ui.actionMessage.operationSuccess'));
      markListShouldRefresh('SeaExportList');
      markListShouldRefresh('Workspace');
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

const handleAiFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  const file = target?.files?.[0];
  if (!file) return;

  if (!isAiExtractSupportedFile(file)) {
    message.warning('请上传 PDF 或图片文件（png/jpg/jpeg/bmp/tiff/webp）');
    if (target) target.value = '';
    return;
  }

  aiRecognizing.value = true;
  const hideLoading = message.loading('AI识别中，请稍候...', 0);
  try {
    const result = await extractSeaExportToAddDto(file);
    if (result.extract?.code != null && result.extract.code !== 200) {
      message.error(result.extract.message || 'AI识别失败，请稍后重试');
      return;
    }

    const payload = buildAiExtractFormPayload(result, {
      allowedFields: AI_RECOGNIZE_ALLOWED_FIELDS,
      normalizeValue: normalizeAiFieldValue,
    });
    const recognizedFieldCount = payload.filledFields.length;
    if (recognizedFieldCount === 0) {
      message.warning('识别成功，但没有可回填的字段');
      return;
    }

    applyAiExtractSelectedItems(
      payload.formValues,
      result.extract?.extractedSchema,
    );
    await applyAiRecognizedFormValues(payload.formValues, {
      orderCtnsPayload: payload.orderCtns,
      orderCodeGoodssPayload: payload.orderCodeGoodss,
    });

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
  aiExtractFileInputRef.value?.click();
};

const syncFormSnapshot = async () => {
  await nextTick();
  const values = await collectCurrentFormValues();
  formSnapshotJson.value = JSON.stringify(buildDto(values));
};

const isFormDirty = async () => {
  if (!formSnapshotJson.value) return false;
  const values = await collectCurrentFormValues();
  return JSON.stringify(buildDto(values)) !== formSnapshotJson.value;
};

const { copying: copyingSeaExport, copyFrom: copySeaExportFromCurrent } =
  useSeaExportCopy({
    checkDirty: isFormDirty,
  });

const { ResultModal, subscribe, subscribing } = useYundangOceanSubscribe();

const { loading: yardRealQueryLoading, runQuery: runYardRealQuery } =
  useYardRealQuery({
    editId,
    isFormDirty,
    onSave: handleSubmit,
    onReload: async () => {
      if (!editId.value) {
        return;
      }
      await loadEditData();
      return getSeaExportDetail(editId.value);
    },
    getQueryContext: async () => {
      const values = await collectCurrentFormValues();
      return {
        mblNum: String(values.mblNum ?? tabMblNum.value ?? '').trim(),
        yardId: values.yardId,
      };
    },
  });

const yardRealQueryDisabled = computed(() => !isEdit.value || !editId.value);
const yardRealQueryDisabledTip = computed(() =>
  yardRealQueryDisabled.value
    ? $t('seaExport.yardRealQuery.saveOrderFirst')
    : '',
);

const handleYardRealQuery = async () => {
  await runYardRealQuery();
};

const handleYundangSubscribe = async () => {
  if (!isEdit.value || !editId.value) {
    return;
  }
  const basicValues = await basicInfoFormApi.getValues();
  await subscribe([
    {
      id: editId.value,
      commissionNum: entrustReadonlyInfo.value.commissionNum,
      mblNum: tabMblNum.value,
      bookingNum: String(basicValues.bookingNum ?? ''),
    },
  ]);
};

const handleCopySeaExport = async () => {
  if (!isEdit.value || !editId.value) {
    return;
  }
  const basicValues = await basicInfoFormApi.getValues();
  void copySeaExportFromCurrent({
    id: editId.value,
    commissionNum: entrustReadonlyInfo.value.commissionNum,
    mblNum: tabMblNum.value,
    bookingNum: String(basicValues.bookingNum ?? ''),
    clientName: String(basicValues.clientName ?? ''),
  });
};

const confirmUnsavedPrint = () => {
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const settle = (value: boolean) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    Modal.confirm({
      title: '存在未保存的修改',
      content: '当前表单有未保存的修改，确认按当前内容打印吗？',
      okText: '确认打印',
      cancelText: '取消',
      onOk: () => {
        settle(true);
      },
      onCancel: () => {
        settle(false);
      },
    });
  });
};

const resolvePrintJson = async (): Promise<string | null> => {
  if (!isEdit.value || !editId.value) {
    message.warning('请先保存后再打印');
    return null;
  }

  try {
    const dirty = await isFormDirty();
    if (dirty) {
      const confirmed = await confirmUnsavedPrint();
      if (!confirmed) return null;
      const values = await collectCurrentFormValues();
      return JSON.stringify(buildDto(values));
    }

    const detail = await getSeaExportDetail(editId.value);
    return JSON.stringify(detail);
  } catch {
    message.error('获取打印数据失败');
    return null;
  }
};

const handlePrint = async () => {
  if (printing.value) return;
  printing.value = true;
  const hideLoading = message.loading('正在准备打印...', 0);
  try {
    const json = await resolvePrintJson();
    if (!json) return;
    openPrint({ printJsonType: PrintJsonType.SeaExportDetail, json });
  } catch {
    message.error('打印准备失败，请稍后重试');
  } finally {
    hideLoading();
    printing.value = false;
  }
};

const handleBack = () => {
  router.push('/sea-exports');
};

const cargoMainLayoutLeftRef = ref<HTMLElement | null>(null);
const cargoMainLayoutRightRef = ref<HTMLElement | null>(null);
let cargoLayoutResizeObserver: ResizeObserver | null = null;
let lastCargoLayoutSyncHeight = 0;
let cargoLayoutSyncing = false;

const applyCargoTextareaHeights = (targetHeight: number) => {
  const leftEl = cargoMainLayoutLeftRef.value;
  if (!leftEl || targetHeight <= 0) return;

  for (const textarea of Array.from(
    leftEl.querySelectorAll<HTMLTextAreaElement>('textarea.ant-input'),
  )) {
    const formItem =
      textarea.closest<HTMLElement>('.flex-col') ??
      textarea.closest<HTMLElement>('.relative.flex');
    const label = formItem?.querySelector<HTMLElement>(':scope > label');
    const labelHeight = label?.getBoundingClientRect().height ?? 0;
    const textareaHeight = Math.max(
      Math.round(targetHeight - labelHeight - 2),
      48,
    );

    textarea.style.setProperty('height', `${textareaHeight}px`, 'important');
    textarea.style.removeProperty('min-height');
  }
};

const syncCargoMainLayoutHeight = () => {
  if (cargoLayoutSyncing) return;

  const leftEl = cargoMainLayoutLeftRef.value;
  const rightEl = cargoMainLayoutRightRef.value;
  if (!leftEl || !rightEl) return;

  requestAnimationFrame(() => {
    const targetHeight = Math.round(rightEl.getBoundingClientRect().height);
    if (targetHeight <= 0) return;
    if (Math.abs(targetHeight - lastCargoLayoutSyncHeight) < 2) return;

    cargoLayoutSyncing = true;
    cargoLayoutResizeObserver?.disconnect();
    lastCargoLayoutSyncHeight = targetHeight;

    leftEl.style.removeProperty('height');
    leftEl.style.minHeight = `${targetHeight}px`;

    requestAnimationFrame(() => {
      applyCargoTextareaHeights(targetHeight);
      cargoLayoutSyncing = false;
      if (rightEl && cargoLayoutResizeObserver) {
        cargoLayoutResizeObserver.observe(rightEl);
      }
    });
  });
};

const bindCargoMainLayoutHeightSync = () => {
  cargoLayoutResizeObserver?.disconnect();
  cargoLayoutResizeObserver = null;
  lastCargoLayoutSyncHeight = 0;

  const rightEl = cargoMainLayoutRightRef.value;
  if (!rightEl) return;

  cargoLayoutResizeObserver = new ResizeObserver(() => {
    syncCargoMainLayoutHeight();
  });
  cargoLayoutResizeObserver.observe(rightEl);
  syncCargoMainLayoutHeight();
};

const scheduleCargoMainLayoutHeightSync = () => {
  nextTick(() => {
    requestAnimationFrame(() => {
      bindCargoMainLayoutHeightSync();
    });
  });
};

onMounted(() => {
  const initialize = async () => {
    await loadServiceTypeLabelMap();
    loadEditData();
    if (!isEdit.value) {
      void syncServiceTypesByPol();
    }
  };
  if (!isEdit.value) {
    initializeOrderUsersPanel(defaultOrderUsers);
    refreshEntrustReadonlyInfo({});
    serviceTypeRequiredPropValues.value = new Map();
    void nextTick(() => syncBasicInfoHeaderFields());
  }
  applyTransitPortTabSchema();
  applyNotifierPartyTabSchema();
  void initialize();
  scheduleCargoMainLayoutHeightSync();
  nextTick(() => {
    updateActiveSectionByScroll();
  });
  window.addEventListener('scroll', updateActiveSectionByScroll, {
    passive: true,
  });
  window.addEventListener('resize', syncCargoMainLayoutHeight);
});

onBeforeUnmount(() => {
  window.removeEventListener('scroll', updateActiveSectionByScroll);
  window.removeEventListener('resize', syncCargoMainLayoutHeight);
  cargoLayoutResizeObserver?.disconnect();
  cargoLayoutResizeObserver = null;
  if (serviceTypeSyncTimer) {
    clearTimeout(serviceTypeSyncTimer);
    serviceTypeSyncTimer = undefined;
  }
});

watch(pageLoading, (loading) => {
  if (!loading) {
    scheduleCargoMainLayoutHeightSync();
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
          <!-- 中间主表单 -->
          <div class="center-column">
            <div class="content-column">
              <section :ref="sectionRefs.basic" class="content-section">
                <div class="content-section__actions">
                  <div class="content-section__actions-left">
                    <span class="service-pipeline__title">服务项目</span>
                    <Tooltip
                      v-if="
                        showServiceItemContent ||
                        (hasPolSelected && serviceTypeSyncLoading)
                      "
                      title="配置服务"
                    >
                      <Button
                        type="text"
                        size="small"
                        class="service-pipeline__config-ellipsis"
                        :disabled="serviceTypeSyncLoading"
                        @click="openServiceTypeModal"
                      >
                        ...
                      </Button>
                    </Tooltip>
                    <Spin
                      :spinning="serviceTypeSyncLoading"
                      class="service-pipeline-spin service-pipeline-spin--inline"
                    >
                      <div class="service-pipeline-body">
                        <div class="service-pipeline service-pipeline--inline">
                          <template v-if="showServiceItemContent">
                            <div
                              v-if="checkedServiceTypeNodes.length > 0"
                              class="service-chevron-flow"
                            >
                              <div
                                v-for="(
                                  group, groupIndex
                                ) in checkedServiceTypeNodeGroups"
                                :key="group.sortId"
                                class="service-chevron-flow__group"
                              >
                                <span
                                  v-if="isServiceGroupAllUpcoming(group)"
                                  class="service-chevron-flow__item service-chevron-flow__item--merged"
                                >
                                  <div
                                    class="chevron-step chevron-step--upcoming"
                                    :class="{
                                      'chevron-step--first':
                                        isServiceChevronGroupFirst(groupIndex),
                                      'chevron-step--last':
                                        isServiceChevronGroupLast(groupIndex),
                                    }"
                                  >
                                    <div class="chevron-step__inner">
                                      <IconifyIcon
                                        icon="mdi:schedule"
                                        class="chevron-step__icon"
                                      />
                                      <span class="chevron-step__label">
                                        {{
                                          formatServiceGroupLabels(group.nodes)
                                        }}
                                      </span>
                                    </div>
                                  </div>
                                </span>
                                <template v-else>
                                  <span
                                    v-for="(node, nodeIndex) in group.nodes"
                                    :key="node.serviceType"
                                    class="service-chevron-flow__item"
                                  >
                                    <Tooltip
                                      v-if="shouldShowServiceNodeTooltip(node)"
                                      placement="top"
                                      :overlay-class-name="'chevron-step-tooltip'"
                                    >
                                      <template #title>
                                        <div
                                          class="chevron-step-tooltip__content"
                                        >
                                          <div
                                            class="chevron-step-tooltip__header"
                                          >
                                            <span
                                              class="chevron-step-tooltip__node-name"
                                            >
                                              {{ node.label }}
                                            </span>
                                            <Tag
                                              :color="
                                                getServiceNodeTooltipStatusMeta(
                                                  node,
                                                ).color
                                              "
                                              class="chevron-step-tooltip__status-tag"
                                            >
                                              {{
                                                getServiceNodeTooltipStatusMeta(
                                                  node,
                                                ).label
                                              }}
                                            </Tag>
                                          </div>
                                          <div
                                            v-if="
                                              node.taskStatus ===
                                                SERVICE_TASK_STATUS_PROCESSED ||
                                              (isServiceTypeNodeInProgress(
                                                node,
                                              ) &&
                                                node.taskStatus ===
                                                  SERVICE_TASK_STATUS_PENDING)
                                            "
                                            class="chevron-step-tooltip__info"
                                          >
                                            <template
                                              v-if="
                                                node.taskStatus ===
                                                SERVICE_TASK_STATUS_PROCESSED
                                              "
                                            >
                                              <div
                                                class="chevron-step-tooltip__info-row"
                                              >
                                                <span
                                                  class="chevron-step-tooltip__info-label"
                                                >
                                                  完成时间
                                                </span>
                                                <span
                                                  class="chevron-step-tooltip__info-value"
                                                >
                                                  {{
                                                    formatServiceTaskCompletionTime(
                                                      node.completionTime,
                                                    )
                                                  }}
                                                </span>
                                              </div>
                                              <div
                                                class="chevron-step-tooltip__info-row"
                                              >
                                                <span
                                                  class="chevron-step-tooltip__info-label"
                                                >
                                                  完成人
                                                </span>
                                                <span
                                                  class="chevron-step-tooltip__info-value"
                                                >
                                                  {{
                                                    node.completionUserNickName ||
                                                    '-'
                                                  }}
                                                </span>
                                              </div>
                                            </template>
                                            <div
                                              v-else
                                              class="chevron-step-tooltip__info-row"
                                            >
                                              <span
                                                class="chevron-step-tooltip__info-label"
                                              >
                                                处理人
                                              </span>
                                              <span
                                                class="chevron-step-tooltip__info-value"
                                              >
                                                {{
                                                  formatServiceTaskUsersText(
                                                    node,
                                                  )
                                                }}
                                              </span>
                                            </div>
                                          </div>
                                          <div
                                            v-if="
                                              showServiceCompletePermissionHint(
                                                node,
                                              ) ||
                                              showServiceCancelPermissionHint(
                                                node,
                                              )
                                            "
                                            class="chevron-step-tooltip__permission-hint"
                                          >
                                            <IconifyIcon
                                              icon="mdi:lock-outline"
                                              class="chevron-step-tooltip__permission-hint-icon"
                                            />
                                            <span>
                                              {{
                                                showServiceCancelPermissionHint(
                                                  node,
                                                )
                                                  ? '您不是完成人，暂无操作权限'
                                                  : '您不是当前处理人，暂无操作权限'
                                              }}
                                            </span>
                                          </div>
                                          <div
                                            v-if="
                                              canCancelCompleteServiceTypeNode(
                                                node,
                                              ) ||
                                              canCompleteServiceTypeNode(node)
                                            "
                                            class="chevron-step-tooltip__actions"
                                          >
                                            <Button
                                              v-if="
                                                canCompleteServiceTypeNode(node)
                                              "
                                              type="primary"
                                              size="small"
                                              block
                                              class="chevron-step-tooltip__action-btn"
                                              :loading="
                                                completingServiceType ===
                                                node.serviceType
                                              "
                                              @click.stop="
                                                handleCompleteServiceType(node)
                                              "
                                            >
                                              完成
                                            </Button>
                                            <Button
                                              v-if="
                                                canCancelCompleteServiceTypeNode(
                                                  node,
                                                )
                                              "
                                              danger
                                              size="small"
                                              block
                                              class="chevron-step-tooltip__action-btn"
                                              :loading="
                                                cancellingServiceType ===
                                                node.serviceType
                                              "
                                              @click.stop="
                                                handleCancelCompleteServiceType(
                                                  node,
                                                )
                                              "
                                            >
                                              取消完成
                                            </Button>
                                          </div>
                                        </div>
                                      </template>
                                      <div
                                        class="chevron-step"
                                        :class="[
                                          `chevron-step--${getServicePipelineState(node)}`,
                                          {
                                            'chevron-step--first':
                                              isServiceChevronFlowFirst(
                                                groupIndex,
                                                nodeIndex,
                                              ),
                                            'chevron-step--last':
                                              isServiceChevronFlowLast(
                                                groupIndex,
                                                nodeIndex,
                                              ),
                                          },
                                        ]"
                                      >
                                        <div class="chevron-step__inner">
                                          <IconifyIcon
                                            :icon="getServiceTypeNodeIcon(node)"
                                            class="chevron-step__icon"
                                          />
                                          <span class="chevron-step__label">
                                            {{ node.label }}
                                          </span>
                                        </div>
                                      </div>
                                    </Tooltip>
                                    <div
                                      v-else
                                      class="chevron-step chevron-step--upcoming"
                                      :class="{
                                        'chevron-step--first':
                                          isServiceChevronFlowFirst(
                                            groupIndex,
                                            nodeIndex,
                                          ),
                                        'chevron-step--last':
                                          isServiceChevronFlowLast(
                                            groupIndex,
                                            nodeIndex,
                                          ),
                                      }"
                                    >
                                      <div class="chevron-step__inner">
                                        <IconifyIcon
                                          :icon="getServiceTypeNodeIcon(node)"
                                          class="chevron-step__icon"
                                        />
                                        <span class="chevron-step__label">
                                          {{ node.label }}
                                        </span>
                                      </div>
                                    </div>
                                  </span>
                                </template>
                              </div>
                            </div>
                            <div v-else class="service-pipeline__empty-checked">
                              <span
                                class="service-pipeline__empty-checked-text"
                              >
                                暂未配置服务节点
                              </span>
                              <Button
                                type="link"
                                size="small"
                                @click="openServiceTypeModal"
                              >
                                去配置
                              </Button>
                            </div>
                          </template>
                          <div v-else class="service-pipeline__state">
                            <div
                              v-if="serviceTypeSyncLoading"
                              class="service-pipeline__loading-slot"
                              aria-hidden="true"
                            />
                            <Empty
                              v-if="!serviceTypeSyncLoading && !hasPolSelected"
                              :image="emptySimpleImage"
                              class="service-pipeline-empty service-pipeline-empty--compact"
                              :description="
                                $t('seaExport.export.selectPolForServiceItems')
                              "
                            />
                            <Empty
                              v-else-if="
                                !serviceTypeSyncLoading && polHasNoServiceConfig
                              "
                              :image="emptySimpleImage"
                              class="service-pipeline-empty service-pipeline-empty--compact"
                              :description="
                                $t('seaExport.export.polNoServiceConfig')
                              "
                            />
                          </div>
                        </div>
                      </div>
                    </Spin>
                  </div>
                  <Space class="content-section__actions-right">
                    <Button
                      v-if="isEdit"
                      v-access:code="perm.add"
                      size="small"
                      class="flex items-center justify-center"
                      :loading="copyingSeaExport"
                      @click="handleCopySeaExport"
                    >
                      <Copy class="mr-1 inline-block size-3.5 align-middle" />
                      <span class="align-middle">{{
                        $t('seaExport.export.copy')
                      }}</span>
                    </Button>
                    <Button
                      size="small"
                      class="flex items-center justify-center"
                      :loading="aiRecognizing"
                      @click="handleAiRecognize"
                    >
                      <IconifyIcon
                        icon="mdi:robot-outline"
                        class="mr-1 inline-block size-3.5 align-middle"
                      />
                      <span class="align-middle">AI识别</span>
                    </Button>
                    <Button
                      size="small"
                      class="flex items-center justify-center"
                      :loading="printing"
                      @click="handlePrint"
                    >
                      <IconifyIcon
                        icon="mdi:printer-outline"
                        class="mr-1 inline-block size-3.5 align-middle"
                      />
                      <span class="align-middle">打印</span>
                    </Button>
                    <Button
                      v-if="isEdit"
                      v-access:code="externalApiUseCode"
                      size="small"
                      class="flex items-center justify-center"
                      :loading="subscribing"
                      @click="handleYundangSubscribe"
                    >
                      <IconifyIcon
                        icon="mdi:radar"
                        class="mr-1 inline-block size-3.5 align-middle"
                      />
                      <span class="align-middle">{{
                        $t('seaExport.yundang.subscribe')
                      }}</span>
                    </Button>
                    <Button size="small" @click="handleCancel">
                      {{ $t('common.cancel') }}
                    </Button>
                    <Button
                      type="primary"
                      size="small"
                      :loading="submitting"
                      class="flex items-center justify-center"
                      @click="handleSubmit"
                    >
                      <Save class="mr-1 inline-block size-3.5 align-middle" />
                      <span class="align-middle">{{ $t('common.save') }}</span>
                    </Button>
                  </Space>
                  <input
                    ref="aiExtractFileInputRef"
                    type="file"
                    :accept="AI_EXTRACT_ACCEPT"
                    class="hidden"
                    @change="handleAiFileChange"
                  />
                </div>
                <div
                  class="content-section__header section-title-bar basic-info-header"
                >
                  <span class="card-title card-title--on-primary">
                    <FileText class="size-4" />
                    {{ $t('seaExport.export.formCardBasicInfo') }}
                  </span>
                  <div class="basic-info-header__meta">
                    <div class="basic-info-header__item">
                      <span class="basic-info-header__label">委托编号</span>
                      <span class="basic-info-header__value">{{
                        entrustReadonlyInfo.commissionNum || '-'
                      }}</span>
                    </div>
                    <div class="basic-info-header__item">
                      <span class="basic-info-header__label">会计期间</span>
                      <span class="basic-info-header__value">{{
                        entrustReadonlyInfo.accountDateText || '-'
                      }}</span>
                    </div>
                    <div class="basic-info-header__item">
                      <span class="basic-info-header__label">应结日期</span>
                      <span class="basic-info-header__value">{{
                        entrustReadonlyInfo.settlementDateText || '-'
                      }}</span>
                    </div>
                    <div class="basic-info-header__item">
                      <span class="basic-info-header__label">所属公司</span>
                      <span
                        class="basic-info-header__value basic-info-header__value--ellipsis"
                        :title="entrustReadonlyInfo.organizationUnitsText"
                      >
                        {{ entrustReadonlyInfo.organizationUnitsText || '-' }}
                      </span>
                    </div>
                    <div
                      class="basic-info-header__item basic-info-header__item--select"
                    >
                      <span class="basic-info-header__label">{{
                        $t('seaExport.export.blType')
                      }}</span>
                      <Select
                        :value="headerBlType"
                        allow-clear
                        size="small"
                        class="basic-info-header__select"
                        :options="blTypeOptions"
                        :placeholder="$t('ui.placeholder.select')"
                        @update:value="handleHeaderBlTypeChange"
                      />
                    </div>
                    <div
                      class="basic-info-header__item basic-info-header__item--select"
                    >
                      <span class="basic-info-header__label">{{
                        $t('seaExport.export.billType')
                      }}</span>
                      <Select
                        :value="headerBillType"
                        allow-clear
                        size="small"
                        class="basic-info-header__select"
                        :options="billTypeOptions"
                        :placeholder="$t('ui.placeholder.select')"
                        @update:value="handleHeaderBillTypeChange"
                      />
                    </div>
                    <div
                      class="basic-info-header__item basic-info-header__item--select"
                    >
                      <span class="basic-info-header__label">{{
                        $t('seaExport.export.codeSourceId')
                      }}</span>
                      <CodeSourceSelect
                        :model-value="headerCodeSourceId"
                        :selected-items="headerCodeSourceSelectedItems"
                        allow-clear
                        size="small"
                        class="basic-info-header__select basic-info-header__select--source"
                        :placeholder="$t('ui.placeholder.select')"
                        @update:model-value="handleHeaderCodeSourceChange"
                      />
                    </div>
                  </div>
                </div>
                <div
                  class="content-section__body content-section__body--flush-bottom"
                >
                  <BasicInfoForm />
                </div>
              </section>

              <section :ref="sectionRefs.party" class="content-section">
                <div
                  class="content-section__body content-section__body--flush-top"
                >
                  <PartyInfoForm />
                  <div class="party-remark-row">
                    <CargoRemarkForm />
                  </div>
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
                <div
                  class="content-section__header section-title-bar shipment-info-header"
                >
                  <span class="card-title card-title--on-primary">
                    <Ship class="size-4" />
                    {{ $t('seaExport.export.formCardShipment') }}
                  </span>
                  <Tooltip :title="syncShipmentDatesDisabledTip">
                    <Button
                      size="small"
                      class="shipment-info-header__sync-btn"
                      :disabled="!canSyncShipmentDates"
                      :loading="syncShipmentDatesLoading"
                      @click="handleSyncShipmentDates"
                    >
                      <IconifyIcon
                        icon="mdi:calendar-sync-outline"
                        class="mr-1 inline-block size-3.5 align-middle"
                      />
                      <span class="align-middle">{{
                        $t('seaExport.syncShipmentDates.sync')
                      }}</span>
                    </Button>
                  </Tooltip>
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
                <div class="content-section__header section-title-bar">
                  <span class="card-title card-title--on-primary">
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
                  <div class="cargo-container-card__title section-title-bar">
                    <span class="card-title card-title--on-primary">
                      <Package class="size-4" />
                      {{ $t('seaExport.export.formCardCargo') }}
                    </span>
                    <div class="cargo-type-inline-wrap">
                      <CargoTypeInlineForm />
                    </div>
                  </div>
                </template>
                <div class="cargo-main-layout">
                  <div
                    ref="cargoMainLayoutLeftRef"
                    class="cargo-main-layout__left"
                  >
                    <CargoMainForm />
                  </div>
                  <div
                    ref="cargoMainLayoutRightRef"
                    class="cargo-main-layout__right"
                  >
                    <CargoMetricsForm />
                  </div>
                </div>
                <div v-show="showDgFields" class="cargo-extension-section">
                  <div class="cargo-extension-section__title">
                    {{ $t('seaExport.export.dgSectionTitle') }}
                  </div>
                  <CargoDgForm />
                </div>
                <div v-show="showReeferFields" class="cargo-extension-section">
                  <div class="cargo-extension-section__title">
                    {{ $t('seaExport.export.reeferSectionTitle') }}
                  </div>
                  <CargoReeferForm />
                </div>
                <div class="cargo-ctn-section">
                  <OrderCtnTable
                    v-model="orderCtns"
                    :yard-real-query-visible="hasYardRealQueryAccess"
                    :yard-real-query-disabled="yardRealQueryDisabled"
                    :yard-real-query-disabled-tip="yardRealQueryDisabledTip"
                    :yard-real-query-loading="yardRealQueryLoading"
                    @yard-real-query="handleYardRealQuery"
                  />
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
                <div class="order-user-panel__body">
                  <div class="order-user-panel__header">
                    <div class="order-user-panel__role-label">
                      {{ getOrderUserRoleLabel(row.userAttribute) }}
                    </div>
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
                              :src="getOrderUserAvatarSrc(row.userId)"
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
                          </div>
                        </div>
                      </template>
                      <Avatar
                        :size="28"
                        :src="getOrderUserAvatarSrc(row.userId)"
                        class="order-user-panel__avatar order-user-panel__avatar--link"
                        @mouseenter="
                          loadOrderUserDetail(row.userId, row._rowKey)
                        "
                      >
                        {{ getOrderUserAvatarText(row) }}
                      </Avatar>
                    </Popover>
                    <Avatar
                      v-else
                      :size="28"
                      :src="getOrderUserAvatarSrc()"
                      class="order-user-panel__avatar"
                    >
                      ?
                    </Avatar>
                  </div>
                  <UserSelect
                    :key="row._rowKey"
                    :model-value="row.userId"
                    :user-attribute="row.userAttribute"
                    label-key="nickName"
                    :selected-items="getOrderUserSelectedItems(row)"
                    :placeholder="$t('seaExport.export.pleaseSelectOrderUser')"
                    size="small"
                    allow-clear
                    class="order-user-panel__select"
                    @update:model-value="(v) => updateOrderUser(row._rowKey, v)"
                  />
                </div>
                <Button
                  v-if="
                    row.userAttribute != null &&
                    !requiredOrderUserRoles.includes(row.userAttribute)
                  "
                  type="text"
                  danger
                  size="small"
                  class="order-user-panel__delete-btn"
                  title="删除角色"
                  @click.stop="removeOrderUserRole(row._rowKey)"
                >
                  <IconifyIcon icon="mdi:close-circle" />
                </Button>
              </div>
              <Button
                class="order-user-panel__add-btn"
                :disabled="!availableOrderUserRoleOptions.length"
                @click="openOrderUserRoleModal"
              >
                + 添加角色
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </Spin>
    <Modal
      v-model:open="orderUserRoleModalOpen"
      title="添加角色"
      ok-text="确定"
      cancel-text="取消"
      width="400px"
      destroy-on-close
      :ok-button-props="{ disabled: orderUserRoleModalSelected == null }"
      @ok="handleOrderUserRoleModalConfirm"
      @cancel="handleOrderUserRoleModalCancel"
    >
      <Radio.Group
        v-model:value="orderUserRoleModalSelected"
        class="order-user-role-modal__group"
      >
        <Radio
          v-for="option in availableOrderUserRoleOptions"
          :key="option.value"
          :value="option.value"
          class="order-user-role-modal__item"
        >
          {{ option.label }}
        </Radio>
      </Radio.Group>
    </Modal>
    <Modal
      v-model:open="serviceTypeModalOpen"
      title="配置服务项目"
      ok-text="确定"
      cancel-text="取消"
      width="520px"
      destroy-on-close
      @ok="handleServiceTypeModalConfirm"
      @cancel="handleServiceTypeModalCancel"
    >
      <div class="service-type-modal__list">
        <div
          v-for="group in serviceTypeNodeGroups"
          :key="group.sortId"
          class="service-type-modal__group"
        >
          <div
            v-for="node in group.nodes"
            :key="node.serviceType"
            class="service-type-modal__item"
          >
            <Checkbox
              :checked="isServiceTypeModalChecked(node.serviceType)"
              @change="handleServiceTypeModalDraftChange(node, $event)"
            >
              <span class="service-type-modal__label">{{ node.label }}</span>
            </Checkbox>
          </div>
        </div>
      </div>
    </Modal>
    <ResultModal />
  </component>
</template>

<style scoped>
@media (max-width: 1200px) {
  .main-layout {
    flex-direction: column;
  }

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

.center-column {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 14px;
  width: 0;
  min-width: 0;
}

.content-column {
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow: hidden visible;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 10px;
}

.side-card,
.right-column {
  border-radius: 10px;
}

.cargo-container-card {
  border-radius: 10px;
}

.cargo-container-card :deep(.ant-card-head) {
  min-height: auto;
  padding: 0;
  background: transparent;
  border-bottom: none;
  border-radius: 0;
}

.cargo-container-card :deep(.ant-card-head-wrapper) {
  width: 100%;
}

.cargo-container-card :deep(.ant-card-head-title) {
  flex: 1;
  padding: 0;
  overflow: visible;
  white-space: normal;
}

.cargo-container-card__title.section-title-bar {
  padding: 8px 18px;
  border-radius: 10px 10px 0 0;
}

.cargo-container-card__title {
  display: flex;
  gap: 12px;
  align-items: center;
  width: 100%;
}

.cargo-container-card :deep(.ant-card-body) {
  padding: 6px 18px 14px;
  overflow: visible;
}

.cargo-container-card :deep(.ant-spin-container) {
  overflow: visible;
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

.cargo-ctn-section {
  padding-top: 0;
  margin-top: 12px;
}

.cargo-extension-section {
  padding-top: 12px;
  margin-top: 12px;
  border-top: 1px solid rgb(0 0 0 / 6%);
}

.cargo-extension-section__title {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: rgb(0 0 0 / 88%);
}

.cargo-extension-wrap :deep(.ant-form-item) {
  margin-bottom: 12px;
}

.cargo-ctn-section :deep(.order-ctn-table__title-bar) {
  margin-right: -18px;
  margin-left: -18px;
}

.cargo-ctn-section__header {
  margin-bottom: 12px;
}

.content-section {
  padding: 0;
}

.section-title-bar {
  display: flex;
  align-items: center;
  width: 100%;
  background: hsl(var(--primary) / 15%);
}

.content-section__header {
  padding: 0;
}

.content-section__header.section-title-bar {
  padding: 8px 18px;
}

.shipment-info-header {
  gap: 8px;
}

.shipment-info-header__sync-btn {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 10px;
  font-size: 12px;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
  border: 1px solid hsl(var(--primary) / 25%);
}

.basic-info-header {
  flex-wrap: wrap;
  gap: 8px 16px;
  justify-content: flex-start;
}

.basic-info-header__meta {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: 8px 14px;
  align-items: center;
  min-width: 0;
}

.basic-info-header__item {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  min-width: 0;
  font-size: 12px;
  line-height: 20px;
  color: #595959;
}

.basic-info-header__item--select {
  gap: 4px;
}

.basic-info-header__label {
  flex-shrink: 0;
  font-weight: 500;
  color: #8c8c8c;
}

.basic-info-header__value {
  color: #262626;
}

.basic-info-header__value--ellipsis {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.basic-info-header__select {
  width: 108px;
}

.basic-info-header__select--source {
  width: 120px;
}

.party-remark-row {
  margin-top: 12px;
}

.party-remark-wrap :deep(.party-remark-field) {
  padding-bottom: 0 !important;
  overflow: visible;
}

.party-remark-wrap :deep(.party-remark-field > label) {
  flex-shrink: 0;
  margin-bottom: 4px;
  line-height: 1.2;
}

/* Vben 内层 flex-auto + items-center 会把 textarea 垂直居中并裁切 */
.party-remark-wrap :deep(.party-remark-field .flex-auto) {
  overflow: visible !important;
}

.party-remark-wrap :deep(.party-remark-field .flex-auto > .relative.flex) {
  display: block;
  width: 100%;
  overflow: visible !important;
}

.party-remark-wrap :deep(.party-remark-field textarea.ant-input) {
  display: block;
  width: 100%;
  min-height: 72px;
  line-height: 1.5715;
  resize: vertical;
}

.content-section__header--cargo {
  display: flex;
  gap: 12px;
  align-items: center;
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

.cargo-main-layout {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding-bottom: 4px;
  overflow: visible;
}

.cargo-main-layout__left {
  flex: 5 1 0;
  min-width: 0;
  overflow: visible;
}

.cargo-main-layout__right {
  flex: 1 1 120px;
  min-width: 120px;
}

.cargo-main-layout__left :deep(form) {
  overflow: visible;
}

.cargo-main-layout__left :deep(.cargo-main-wrap) {
  display: grid !important;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  grid-auto-flow: row;
  gap: 1rem;
  align-items: start;
  overflow: visible;
}

.cargo-main-wrap :deep(.cargo-main-item--marks) {
  grid-column: span 2 / span 2;
  min-width: 0;
}

.cargo-main-wrap :deep(.cargo-main-item--goods-des) {
  grid-column: span 3 / span 3;
  min-width: 0;
}

.cargo-main-wrap :deep(.cargo-main-item) {
  overflow: visible;
}

/* FormItem：去掉 compact 默认 pb-2，避免挤压 textarea */
.cargo-main-wrap :deep(.relative.flex.flex-col) {
  display: flex;
  flex-direction: column;
  padding-bottom: 0 !important;
  overflow: visible;
}

.cargo-main-wrap :deep(.relative.flex.flex-col > label) {
  flex-shrink: 0;
  margin-bottom: 0;
  line-height: 1;
}

/* Vben 默认 flex-auto overflow-hidden + p-[1px] 会裁切 textarea 底部 */
.cargo-main-wrap :deep(.relative.flex.flex-col > .flex-auto) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  padding: 0 !important;
  overflow: visible !important;
}

/* 内层 relative 默认 items-center 会导致 textarea 垂直居中后被 overflow 裁切 */
.cargo-main-wrap :deep(.relative.flex.flex-col .flex-auto > .relative) {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: stretch !important;
  min-height: 0;
  overflow: visible !important;
}

.cargo-main-wrap :deep(.relative.flex.flex-col .flex-auto > .relative > *) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.cargo-main-wrap :deep(.english-upper-textarea) {
  display: block;
  overflow: visible;
}

.cargo-main-wrap :deep(textarea.ant-input) {
  box-sizing: border-box;
  width: 100%;
  margin-top: 0;
  resize: vertical;
}

.cargo-metrics-wrap :deep(.relative.flex) {
  padding-bottom: 4px;
}

.cargo-metrics-wrap :deep(.cargo-metrics-item--cbm) {
  padding-bottom: 0;
}

.content-section__body {
  padding: 6px 18px;
}

.content-section__body--flush-top {
  padding-top: 0;
}

.content-section__body--flush-bottom {
  padding-bottom: 0;
}

.content-section__actions {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 6px 18px;
  border-bottom: 1px solid #edf2f7;
}

.content-section__actions-left {
  display: flex;
  flex: 1;
  gap: 4px;
  align-items: center;
  min-width: 0;
}

.content-section__actions-right {
  flex-shrink: 0;
}

.right-column {
  flex-shrink: 0;
  width: 180px;
}

.right-column :deep(.ant-card-body) {
  overflow: visible;
}

.card-title {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}

.card-title--on-primary {
  color: hsl(var(--primary));
}

.card-body {
  padding: 0 4px;
}

.card-body--party {
  min-height: auto;
}

.biz-block {
  padding: 10px;
  border-radius: 8px;
}

.biz-block--container {
  margin-top: 12px;
}

.biz-block--service {
  padding: 12px 18px 8px;
  margin-top: 0;
  background: transparent;
}

.service-pipeline-spin--inline {
  display: flex;
  flex: 1;
  min-width: 0;
}

.service-pipeline-spin--inline :deep(.ant-spin-nested-loading) {
  position: relative;
  display: flex;
  flex: 1;
  width: 100%;
  min-width: 0;
}

.service-pipeline-spin--inline :deep(.ant-spin-container) {
  display: flex;
  flex: 1;
  width: 100%;
  min-width: 0;
}

.service-pipeline-spin :deep(.ant-spin-nested-loading) {
  position: relative;
}

.service-pipeline-spin :deep(.ant-spin) {
  max-height: none;
}

.service-pipeline-body {
  box-sizing: border-box;
  flex: 1;
  width: 100%;
  min-width: 0;
}

.service-pipeline__title {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  color: #1677ff;
  white-space: nowrap;
}

.service-pipeline__config-ellipsis {
  flex-shrink: 0;
  height: 22px;
  padding: 0 2px;
  font-size: 12px;
  font-weight: 600;
  line-height: 22px;
  color: rgb(0 0 0 / 45%);
  letter-spacing: 0.5px;
}

.service-pipeline__config-ellipsis:hover {
  color: #1677ff;
}

.service-pipeline__empty-checked {
  display: flex;
  gap: 8px;
  align-items: center;
  min-height: 32px;
}

.service-pipeline--inline .service-pipeline__empty-checked {
  justify-content: flex-start;
  min-height: auto;
}

.service-pipeline--inline .service-pipeline__empty-checked-text {
  font-size: 12px;
  line-height: 20px;
}

.service-pipeline--inline
  .service-pipeline-empty--compact
  :deep(.ant-empty-description) {
  margin: 0;
  font-size: 11px;
  line-height: 18px;
}

.service-pipeline__state {
  display: flex;
  flex: 1;
  align-items: center;
  width: 100%;
  min-width: 0;
  min-height: 32px;
}

.service-pipeline__loading-slot {
  flex: 1;
  min-width: 160px;
  min-height: 26px;
}

.service-pipeline--inline .service-pipeline__state {
  justify-content: flex-start;
  min-height: 26px;
}

.service-pipeline--inline .service-pipeline-empty--compact {
  margin: 0;
}

.service-pipeline--inline
  .service-pipeline-empty--compact
  :deep(.ant-empty-image) {
  display: none;
}

.service-pipeline__empty-checked-text {
  font-size: 13px;
  color: rgb(0 0 0 / 45%);
}

.service-pipeline {
  padding: 8px 12px 10px;
  background: #fff;
  border: 1px solid rgb(226 232 240 / 60%);
  border-radius: 12px;
  box-shadow:
    0 1px 3px rgb(0 0 0 / 5%),
    0 4px 6px -2px rgb(0 0 0 / 2%);
}

.service-pipeline--inline {
  display: flex;
  flex: 1;
  width: 100%;
  min-width: 0;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 0;
  box-shadow: none;
}

.service-pipeline--inline .service-chevron-flow {
  border-radius: 4px;
}

.service-pipeline--inline .service-chevron-flow__item {
  flex: 0 0 96px;
  width: 96px;
  min-width: 96px;
  max-width: 96px;
  overflow: visible;
}

.service-pipeline--inline .service-chevron-flow__item > :deep(span),
.service-pipeline--inline .service-chevron-flow__item > .chevron-step {
  display: flex;
  width: 100%;
  overflow: visible;
}

.service-pipeline--inline .service-chevron-flow__item--merged {
  flex: 0 1 auto;
  width: auto;
  min-width: 96px;
  max-width: 280px;
}

.service-pipeline--inline .service-chevron-flow__item--merged > .chevron-step {
  flex: 1 1 auto;
  width: auto;
  min-width: 96px;
  max-width: 280px;
}

.service-chevron-flow__item--merged {
  flex: 0 1 auto;
  width: auto;
  min-width: 72px;
  max-width: 320px;
}

.service-chevron-flow__item--merged > .chevron-step {
  width: 100%;
  min-width: 72px;
  max-width: 320px;
}

.service-chevron-flow__item--merged .chevron-step__label {
  white-space: nowrap;
}

.service-pipeline--inline .chevron-step {
  flex: 0 0 96px;
  width: 96px;
  min-width: 96px;
  max-width: 96px;
  height: 26px;
  padding-right: 5px;
  padding-left: 11px;
  margin-left: -7px;
  clip-path: polygon(
    0% 0%,
    calc(100% - 7px) 0%,
    100% 50%,
    calc(100% - 7px) 100%,
    0% 100%,
    7px 50%
  );
}

.service-pipeline--inline .chevron-step--first {
  padding-left: 8px;
  margin-left: 0;
  border-top-left-radius: 4px;
  border-bottom-left-radius: 4px;
  clip-path: polygon(
    0% 0%,
    calc(100% - 7px) 0%,
    100% 50%,
    calc(100% - 7px) 100%,
    0% 100%
  );
}

.service-pipeline--inline .chevron-step--last {
  padding-right: 8px;
  border-top-right-radius: 4px;
  border-bottom-right-radius: 4px;
  clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 7px 50%);
}

.service-pipeline--inline .chevron-step__inner {
  gap: 2px;
}

.service-pipeline--inline .chevron-step__icon {
  font-size: 11px;
}

.service-pipeline--inline .chevron-step__label {
  font-size: 10px;
  font-weight: 600;
}

.service-chevron-flow {
  display: flex;
  flex: 1;
  min-width: 0;
  overflow: auto hidden;
  border-radius: 8px;
}

.service-chevron-flow__group {
  display: flex;
  flex-shrink: 0;
  gap: 0;
  min-width: 0;
}

.service-chevron-flow__group .service-chevron-flow__item {
  position: relative;
}

.service-chevron-flow__group .service-chevron-flow__item:nth-child(n + 2) {
  z-index: 1;
}

.service-chevron-flow__group + .service-chevron-flow__group {
  margin-left: 8px;
}

.service-pipeline--inline
  .service-chevron-flow__group
  + .service-chevron-flow__group {
  margin-left: 6px;
}

.service-chevron-flow > :deep(span),
.service-chevron-flow__item {
  display: flex;
  flex: 1 1 0;
  min-width: 72px;
  max-width: 140px;
}

.service-chevron-flow > :deep(span) {
  cursor: pointer;
}

.service-chevron-flow__item {
  cursor: default;
}

.chevron-step {
  position: relative;
  display: flex;
  flex: 1 1 0;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 140px;
  height: 40px;
  padding-right: 8px;
  padding-left: 16px;
  margin-left: -12px;
  cursor: pointer;
  border: 1px solid rgb(255 255 255 / 20%);
  clip-path: polygon(
    0% 0%,
    calc(100% - 12px) 0%,
    100% 50%,
    calc(100% - 12px) 100%,
    0% 100%,
    12px 50%
  );
  transition:
    box-shadow 0.2s ease,
    filter 0.2s ease;
}

.chevron-step--first {
  padding-left: 12px;
  margin-left: 0;
  border-top-left-radius: 8px;
  border-bottom-left-radius: 8px;
  clip-path: polygon(
    0% 0%,
    calc(100% - 12px) 0%,
    100% 50%,
    calc(100% - 12px) 100%,
    0% 100%
  );
}

.chevron-step--last {
  padding-right: 12px;
  border-top-right-radius: 8px;
  border-bottom-right-radius: 8px;
  clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 12px 50%);
}

.chevron-step:hover {
  z-index: 30;
  box-shadow: 0 2px 8px rgb(0 0 0 / 6%);
  filter: brightness(1.03);
}

.chevron-step--done {
  color: #005313;
  background: #a8e6cf;
}

.chevron-step--active {
  color: #00325b;
  background: #d1e9ff;
}

.chevron-step--upcoming {
  color: #414752;
  cursor: default;
  background: #f2f2f2;
  opacity: 0.8;
}

.chevron-step__inner {
  display: flex;
  gap: 4px;
  align-items: center;
  min-width: 0;
  max-width: 100%;
}

.chevron-step__icon {
  flex-shrink: 0;
  font-size: 14px;
}

.chevron-step__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}

:global(.chevron-step-tooltip .ant-tooltip-inner) {
  min-width: 220px;
  padding: 0;
  color: #1b1c1c;
  background: #fff;
  border: 1px solid #e8edf5;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgb(15 23 42 / 10%);
}

:global(.chevron-step-tooltip .ant-tooltip-arrow::before) {
  background: #fff;
}

.chevron-step-tooltip__content {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
}

.chevron-step-tooltip__header {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
}

.chevron-step-tooltip__node-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  white-space: nowrap;
}

.chevron-step-tooltip__status-tag {
  flex-shrink: 0;
  margin: 0;
  font-size: 11px;
  line-height: 18px;
}

.chevron-step-tooltip__info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
  background: #f8fafc;
  border-radius: 8px;
}

.chevron-step-tooltip__info-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  justify-content: space-between;
  font-size: 12px;
  line-height: 18px;
}

.chevron-step-tooltip__info-label {
  flex-shrink: 0;
  color: rgb(0 0 0 / 45%);
}

.chevron-step-tooltip__info-value {
  min-width: 0;
  font-weight: 500;
  color: #334155;
  text-align: right;
  word-break: break-all;
}

.chevron-step-tooltip__permission-hint {
  display: flex;
  gap: 6px;
  align-items: flex-start;
  padding: 8px 10px;
  font-size: 12px;
  line-height: 18px;
  color: #b45309;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
}

.chevron-step-tooltip__permission-hint-icon {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  margin-top: 2px;
}

.chevron-step-tooltip__actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.chevron-step-tooltip__action-btn {
  height: 28px;
  font-size: 12px;
}

.service-type-modal__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 360px;
  overflow-y: auto;
}

.service-type-modal__group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.service-type-modal__item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.service-type-modal__label {
  margin-right: 6px;
}

.service-pipeline-empty--compact {
  padding: 0;
  margin: 0;
}

.service-pipeline-empty--compact :deep(.ant-empty-image) {
  height: 40px;
  margin-bottom: 6px;
}

.service-pipeline-empty--compact :deep(.ant-empty-description) {
  max-width: 420px;
  margin: 0 auto;
  font-size: 12px;
  line-height: 20px;
  color: rgb(0 0 0 / 45%);
}

.service-pipeline__state
  .service-pipeline-empty--compact
  :deep(.ant-empty-description) {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
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
  inset: 0 auto 0 57.14%;
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
      .shipment-time-pos--4
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
      .shipment-time-pos--4
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

  padding: 6px 0;
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
  min-height: 22px;
  font-weight: 500;
  color: rgb(0 0 0 / 65%);
}

:deep(.port-flow-item--transit > label) {
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: flex-start;
}

:deep(.port-flow-item--transit > label .transit-port-inline-switch) {
  margin-left: 0;
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
  padding: 4px 10px 8px;
  margin-top: 0;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-top: 0;
  border-radius: 0 0 10px 10px;
}

:deep(.port-flow-remark > .flex-auto) {
  overflow: visible;
}

:deep(.port-flow-remark .flex-auto > .relative) {
  overflow: visible;
}

:deep(.port-flow-remark textarea.ant-input) {
  display: block;
  height: auto;
  min-height: 32px;
  line-height: 1.5715;
}

:deep(.port-flow-remark > label) {
  font-size: 12px;
  font-weight: 500;
  line-height: 20px;
  color: rgb(0 0 0 / 65%);
}

:deep(.party-flow-order-users) {
  grid-row: 1;
  grid-column: 1 / span 6;
}

:deep(.form-controls-small input.ant-input),
:deep(.form-controls-small .ant-input-affix-wrapper),
:deep(.form-controls-small .ant-picker),
:deep(.form-controls-small .ant-input-number) {
  height: 24px;
}

:deep(.form-controls-small .ant-input-number-input) {
  height: 22px;
}

:deep(.form-controls-small .ant-input-affix-wrapper) {
  display: inline-flex;
  align-items: center;
}

:deep(.form-controls-small .ant-input-affix-wrapper > input.ant-input) {
  height: 22px;
  line-height: 22px;
}

:deep(
  .form-controls-small
    .ant-select:not(.ant-select-customize-input)
    .ant-select-selector
) {
  display: flex;
  align-items: center;
  height: 24px;
}

:deep(
  .form-controls-small
    .ant-select-single
    .ant-select-selector
    .ant-select-selection-item,
  .form-controls-small
    .ant-select-single
    .ant-select-selector
    .ant-select-selection-placeholder
) {
  line-height: 22px;
}

:deep(
  .form-controls-small
    .ant-select-single
    .ant-select-selector
    .ant-select-selection-search-input
) {
  height: 22px;
}

:deep(.party-flow-order-users-hidden) {
  display: none;
}

:deep(.party-flow-pos--1) {
  grid-row: 1;
  grid-column: 1 / span 2;
}

:deep(.party-flow-pos--2) {
  grid-row: 1;
  grid-column: 3 / span 2;
}

:deep(.party-flow-pos--3) {
  grid-row: 1;
  grid-column: 5 / span 2;
}

:deep(.party-flow-pos--4) {
  grid-row: 1;
  grid-column: 1 / span 2;
}

:deep(.party-flow-content-pos--1) {
  grid-row: 2;
  grid-column: 1 / span 2;
}

:deep(.party-flow-content-pos--2) {
  grid-row: 2;
  grid-column: 3 / span 2;
}

:deep(.party-flow-content-pos--3) {
  grid-row: 2;
  grid-column: 5 / span 2;
}

:deep(.party-flow-content-pos--4) {
  grid-row: 2;
  grid-column: 1 / span 2;
}

:deep(.party-flow-item--hidden) {
  display: none;
}

:deep(.party-flow-item) {
  padding: 0;
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
  padding: 0;
  margin-top: 0;
}

:deep(
  .party-flow-wrap
    .party-flow-item
    .ant-select:not(.ant-select-customize-input)
    .ant-select-selector
) {
  display: flex;
  align-items: center;
  height: 24px;
}

:deep(
  .party-flow-wrap
    .party-flow-item
    .ant-select-single
    .ant-select-selector
    .ant-select-selection-item,
  .party-flow-wrap
    .party-flow-item
    .ant-select-single
    .ant-select-selector
    .ant-select-selection-placeholder
) {
  line-height: 22px;
}

:deep(
  .party-flow-wrap
    .party-flow-item
    .ant-select-single
    .ant-select-selector
    .ant-select-selection-search-input
) {
  height: 22px;
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

.order-user-panel {
  padding: 6px 6px 0 0;
  overflow: visible;
}

.order-user-panel__row {
  position: relative;
  padding: 10px 12px;
  overflow: visible;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.order-user-panel__row + .order-user-panel__row {
  margin-top: 8px;
}

.order-user-panel__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.order-user-panel__header {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
}

.order-user-panel__avatar {
  flex: none;
  cursor: default;
}

.order-user-panel__avatar--link {
  cursor: pointer;
  transition: all 0.2s ease;
}

.order-user-panel__avatar--link:hover {
  box-shadow: 0 4px 12px rgb(15 23 42 / 18%);
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

.order-user-panel__role-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.2;
  color: #1f2937;
  white-space: nowrap;
}

.order-user-panel__select {
  width: 100%;
}

.order-user-role-modal__group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.order-user-role-modal__item {
  display: flex;
  align-items: center;
  height: 36px;
  padding: 0 12px;
  margin: 0;
  line-height: 36px;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.order-user-role-modal__item:hover {
  border-color: #91caff;
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
  top: -8px;
  right: -8px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  min-width: 22px;
  height: 22px;
  padding: 0;
  font-size: 22px;
  line-height: 1;
  color: #ff4d4f;
  pointer-events: none;
  background: #fff;
  border: none;
  border-radius: 50%;
  box-shadow: 0 2px 6px rgb(0 0 0 / 12%);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.order-user-panel__delete-btn:hover {
  color: #ff7875;
  background: #fff;
}

.order-user-panel__row:hover .order-user-panel__delete-btn,
.order-user-panel__row:focus-within .order-user-panel__delete-btn {
  pointer-events: auto;
  opacity: 1;
}

:deep(.ant-card:not(.cargo-container-card) .ant-card-head) {
  min-height: 44px;
  padding: 0 14px;
  background: #fafcff;
  border-bottom: 1px solid #edf2f7;
}

:deep(.ant-card:not(.cargo-container-card) .ant-card-head-title) {
  padding: 10px 0;
}

:deep(.ant-card:not(.cargo-container-card) .ant-card-body) {
  padding: 12px 14px;
}
</style>
