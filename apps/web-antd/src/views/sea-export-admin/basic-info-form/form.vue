<script lang="ts" setup>
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import dayjs from 'dayjs';
import {
  computed,
  defineComponent,
  h,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useAccess } from '@vben/access';
import { useTabs } from '@vben/hooks';

import {
  Copy,
  FileText,
  IconifyIcon,
  MapPin,
  Package,
  Save,
  Ship,
} from '@vben/icons';

import {
  Avatar,
  Button,
  Card,
  Checkbox,
  Dropdown,
  Empty,
  Menu,
  MenuItem,
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
import { useUserStore } from '@vben/stores';

const DropdownButton = Dropdown.Button;

defineOptions({
  name: 'SeaExportAdminForm',
});
const emptySimpleImage = Empty.PRESENTED_IMAGE_SIMPLE;
import { CodeSourceSelect, UserSelect } from '#/adapter/component';
import { type VbenFormSchema, useVbenForm } from '#/adapter/form';
import { getClientDetail } from '#/api/sea-export/client-admin';
import { getCodeFrtDetail } from '#/api/system/base-data/code-frt-admin';
import { useUnsavedGuard } from '#/composables/use-unsaved-guard';
import {
  getServiceTypesByPOL,
  getSeaExportDetail,
} from '#/api/sea-export/sea-export-admin';
import {
  cancelCompleteSeServiceTask,
  completeSeServiceTask,
} from '#/api/sea-export/se-service-task-admin';
import { $t } from '#/locales';
import { PrintJsonType, usePrintFormat } from '#/components/print-format';
import { createAbpPermission } from '#/utils/abp-permission';
import { toEnglishUpperCase } from '#/utils/english-upper-case';

import OrderCtnTable from '../modules/order-ctn-table.vue';
import {
  flattenDetail,
  normalizeOrderCtnsWithRowKey,
  toPortSelectedItems,
  toSelectedItems,
} from './sea-export-detail-mapper';
import { AI_EXTRACT_ACCEPT } from './ai-extract-utils';
import {
  CARGO_TYPE,
  createEmptyDgValues,
  createEmptyReeferValues,
  getBillTypeOptions,
  getBlTypeOptions,
  getTradeTermsTypeOptions,
  useBasicInfoFormSchema,
  useCargoFormSchema,
  useDgFormSchema,
  usePartyInfoFormSchema,
  usePortFormSchema,
  useReeferFormSchema,
  useShipmentFormSchema,
} from '../data';
import {
  buildServiceTypeLabelMap,
  buildServiceTypeProcessMap,
  loadSeServiceTypeOptions,
} from '../service-type';
import type {
  EditServiceSnapshot,
  ServicePipelineState,
  ServiceTypeNode,
} from './service-type-nodes';
import {
  buildServiceRequiredPropsByType,
  buildServiceTypeNodes,
  formatServiceTaskCompletionTime,
  formatServiceTaskUsersText,
  getRequiredFieldLabelByProp,
  getServicePipelineActiveSortId,
  groupServiceTypeNodesBySortId,
  hasServiceTaskHandlerRestriction,
  isRequiredFieldFilled,
  parseDetailServiceTypes,
  SERVICE_LOCKABLE_FIELD_NAMES,
  SERVICE_REQUIRE_PROP_TO_FIELD_NAME,
  SERVICE_TASK_STATUS_PENDING,
  SERVICE_TASK_STATUS_PROCESSED,
  sortServiceTypeNodesBySortId,
} from './service-type-nodes';
import { useSeaExportAiRecognize } from './use-sea-export-ai-recognize';
import { useSeaExportSubmit } from './use-sea-export-submit';
import { defaultOrderUsers, useOrderUsers } from './use-order-users';
import { useSeaExportTabTitle } from '../use-sea-export-tab-title';
import { useSeaExportCopy } from '../use-sea-export-copy';
import { useYardRealQuery } from '../use-yard-real-query';
import { useSyncShipmentDates } from '../use-sync-shipment-dates';
import {
  getYundangSubscribeStatus,
  useYundangOceanSubscribe,
} from '../use-yundang-ocean-subscribe';

const perm = createAbpPermission('Admin.SeaExport');
const externalApiUseCode = 'Admin.ExternalApi.Use';
const { hasAccessByCodes } = useAccess();
const hasYardRealQueryAccess = computed(() =>
  hasAccessByCodes([externalApiUseCode]),
);

const route = useRoute();
const router = useRouter();
const { closeTabByKey } = useTabs();
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

const pageLoading = ref(false);
const printing = ref(false);
const { openPrint } = usePrintFormat();
const transportOrderId = ref<number | undefined>();
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
  'bookingAgentId',
  'yardId',
  'signingTime',
  'signingPortId',
] as const;
const SHIPMENT_MOVED_TO_BASIC_FIELD_NAMES = new Set([
  ...BASIC_MODULE_EXTRA_FIELD_NAMES,
]);
const PORT_MOVED_TO_BASIC_FIELD_NAMES = new Set(['signingPortId']);
const serviceTypeNodes = ref<ServiceTypeNode[]>([]);
const serviceTypeLabelMap = ref(new Map<number, string>());
const serviceTypeProcessMap = ref(new Map<number, boolean>());
const loadServiceTypeLabelMap = async () => {
  const options = await loadSeServiceTypeOptions();
  serviceTypeLabelMap.value = buildServiceTypeLabelMap(options);
  serviceTypeProcessMap.value = buildServiceTypeProcessMap(options);
};
const editServiceSnapshot = ref<EditServiceSnapshot | null>(null);
/** 编辑态：详情原始起运港 / 服务项集合 / 是否已有任务，用于保存时判断是否重建 */
const editOriginalPolId = ref<string>('');
const editOriginalServiceTypeSet = ref<Set<number>>(new Set());
const editHasAnyServiceTask = ref(false);
/** 编辑态回填期间抑制起运港/委托单位联动，避免详情回填 setValues 误触发重写勾选 */
const suppressServiceTypeLinkage = ref(false);
/** 记录上一次的付费方式，仅在真正变更时触发付费地点联动 */
const lastCodeFrtId = ref<number | string | undefined>();
/**
 * 编辑态首次回填：以港口配置为「元数据」（sortId/userAttribute/锁定/必填），
 * 勾选状态与任务进度仍以详情为准；港口配置缺失的历史服务项照常保留。
 */
const applyServiceTypeStateForEditInitial = (
  polConfig: null | SeaExportAdminApi.ServiceTypeByPolDto[],
  snapshot: EditServiceSnapshot,
) => {
  const polNodes = Array.isArray(polConfig) ? polConfig : [];
  latestAvailableServiceTypes.value = polNodes;
  const nodes = buildServiceTypeNodes(
    polNodes,
    serviceTypeLabelMap.value,
    snapshot.savedServiceTypeSet,
    undefined,
    snapshot.taskMap,
    snapshot.savedSortIdMap,
    serviceTypeProcessMap.value,
  );
  const presentTypes = new Set(nodes.map((node) => node.serviceType));
  snapshot.savedServiceTypeSet.forEach((serviceType) => {
    if (presentTypes.has(serviceType)) return;
    const taskInfo = snapshot.taskMap.get(serviceType);
    nodes.push({
      serviceType,
      label: serviceTypeLabelMap.value.get(serviceType) ?? `${serviceType}`,
      isBusinessProcess: serviceTypeProcessMap.value.get(serviceType) ?? false,
      sortId: snapshot.savedSortIdMap.get(serviceType) ?? serviceType,
      checked: true,
      taskStatus: taskInfo?.taskStatus,
      taskId: taskInfo?.taskId,
      completionUserId: taskInfo?.completionUserId,
      completionTime: taskInfo?.completionTime,
      completionUserNickName: taskInfo?.completionUserNickName,
      taskUsers: taskInfo?.taskUsers,
    });
  });
  serviceTypeNodes.value = sortServiceTypeNodesBySortId(nodes);
  updateServiceTypeRequiredProps();
  polServiceConfigLoaded.value = true;
  applyServiceLockedFields();
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
const syncDateVessel = ref('');
const syncDateInnerVoyno = ref('');
const syncDateEtd = ref<unknown>(undefined);

const entrustReadonlyInfo = ref({
  commissionNum: '',
  organizationUnitsText: '-',
  countryName: '',
  laneName: '',
  accountDateText: '',
  settlementDateText: '',
  accountDate: undefined as unknown,
  settlementDate: undefined as unknown,
  yardContact: '',
  yardEmail: '',
  yardMobile: '',
  yardTel: '',
});

const YardFieldLabel = defineComponent({
  name: 'SeaExportYardFieldLabel',
  setup() {
    return () => {
      const detailItems = [
        ['场站邮箱', entrustReadonlyInfo.value.yardEmail],
        ['场站手机', entrustReadonlyInfo.value.yardMobile],
        ['场站电话', entrustReadonlyInfo.value.yardTel],
      ];
      return h('span', { class: 'flex w-full min-w-0 items-center' }, [
        h('span', $t('seaExport.export.yardId')),
        h(
          Popover,
          { placement: 'topLeft', trigger: 'hover' },
          {
            content: () =>
              h(
                'div',
                { class: 'flex min-w-56 flex-col gap-2' },
                detailItems.map(([label, value]) =>
                  h('div', { class: 'flex gap-3 text-xs', key: label }, [
                    h('span', { class: 'shrink-0 text-gray-500' }, label),
                    h(
                      'span',
                      {
                        class:
                          'min-w-0 flex-1 break-all text-right text-gray-900',
                      },
                      value || '-',
                    ),
                  ]),
                ),
              ),
            default: () =>
              h(
                'span',
                {
                  class:
                    'ml-auto max-w-28 cursor-help truncate pl-2 text-xs font-normal text-primary',
                  onClick: (event: MouseEvent) => event.stopPropagation(),
                },
                entrustReadonlyInfo.value.yardContact || '-',
              ),
          },
        ),
      ]);
    };
  },
});
const yardFieldLabelSchemaContent = YardFieldLabel as unknown as NonNullable<
  VbenFormSchema['label']
>;

/**
 * 付费方式→付费地点联动：
 * - 付费方式为「到付」(cnName 含「到付」/ ediCode=CC) → 付费地点带出目的港(podId)
 * - 付费方式为「预付」(cnName 含「预付」/ ediCode=PP) → 付费地点带出起运港(polId)
 * 付费方式变更时触发（含详情回填），带出后仍允许手动修改。
 */
const applyFrtPrepareByCodeFrt = async (
  codeFrtId: number | string | undefined,
) => {
  if (codeFrtId === undefined || codeFrtId === null || codeFrtId === '') return;
  let detail: Awaited<ReturnType<typeof getCodeFrtDetail>> | undefined;
  try {
    detail = await getCodeFrtDetail(codeFrtId);
  } catch {
    return;
  }
  const cnName = String(detail?.cnName ?? '');
  const ediCode = String(detail?.ediCode ?? '').toUpperCase();
  const isCollect = cnName.includes('到付') || ediCode === 'CC';
  const isPrepaid = cnName.includes('预付') || ediCode === 'PP';
  if (!isCollect && !isPrepaid) return;
  const portValues = await portFormApi.getValues();
  const targetPortId = isCollect ? portValues.podId : portValues.polId;
  if (
    targetPortId === undefined ||
    targetPortId === null ||
    targetPortId === ''
  ) {
    return;
  }
  await basicInfoFormApi.setFieldValue('prepareAtId', targetPortId);
};

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
          label:
            isEdit.value && item.fieldName === 'yardId'
              ? yardFieldLabelSchemaContent
              : item.label,
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
    if (fieldsChanged.includes('codeFrtId')) {
      const codeFrtId = values.codeFrtId;
      if (codeFrtId !== lastCodeFrtId.value) {
        lastCodeFrtId.value = codeFrtId;
        void applyFrtPrepareByCodeFrt(codeFrtId);
      }
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
const updateServiceTypeRequiredProps = () => {
  const checkedSet = new Set(getCheckedServiceTypes());
  serviceTypeRequiredPropValues.value = buildServiceRequiredPropsByType(
    latestAvailableServiceTypes.value,
    checkedSet,
  );
};
/** 已完成服务任务锁定的字段集合（取所有已处理任务对应服务项的 seServiceLocks 并集） */
const getServiceLockedFieldNames = (): Set<string> => {
  const lockedFields = new Set<string>();
  if (!isEdit.value) return lockedFields;
  const configMap = new Map<number, SeaExportAdminApi.ServiceTypeByPolDto>();
  latestAvailableServiceTypes.value.forEach((item) => {
    const serviceType = Number(item.serviceType);
    if (!Number.isFinite(serviceType)) return;
    configMap.set(serviceType, item);
  });
  serviceTypeNodes.value.forEach((node) => {
    if (node.taskStatus !== SERVICE_TASK_STATUS_PROCESSED) return;
    const locks = configMap.get(node.serviceType)?.seServiceLocks ?? [];
    locks.forEach((propEnum) => {
      const fieldName = SERVICE_REQUIRE_PROP_TO_FIELD_NAME[Number(propEnum)];
      if (fieldName) lockedFields.add(fieldName);
    });
  });
  return lockedFields;
};
/**
 * 将「已完成服务锁定字段」置为只读；未锁定字段恢复可编辑。
 * updateSchema 会按 fieldName 深合并 componentProps，对不属于该表单的字段是无操作，故可广播到多个表单。
 */
const applyServiceLockedFields = () => {
  if (!isEdit.value) return;
  const lockedFields = getServiceLockedFieldNames();
  const patches = SERVICE_LOCKABLE_FIELD_NAMES.map((fieldName) => {
    // vessel 使用 VesselVoyageInput 合并组件，componentProps 为函数，
    // 需保留 secondFieldValue（航次）等动态入参，否则 updateSchema 会以
    // 静态对象覆盖函数，导致航次显示丢失且无法写回 innerVoyno。
    if (fieldName === 'vessel') {
      return {
        fieldName,
        componentProps: (values: Record<string, any>, formApi: any) => ({
          formContext: formApi,
          secondFieldName: 'innerVoyno',
          secondFieldValue: values?.innerVoyno ?? '',
          size: 'small',
          disabled: lockedFields.has(fieldName),
          mainRatio: 3,
          secondRatio: 2,
        }),
      };
    }
    return {
      fieldName,
      componentProps: { disabled: lockedFields.has(fieldName) },
    };
  });
  basicInfoFormApi.updateSchema(patches);
  shipmentFormApi.updateSchema(patches);
  portFormApi.updateSchema(patches);
};
const checkedServiceTypeNodes = computed(() =>
  sortServiceTypeNodesBySortId(
    serviceTypeNodes.value.filter((node) => node.checked),
  ),
);
const checkedServiceTypeNodeGroups = computed(() =>
  groupServiceTypeNodesBySortId(checkedServiceTypeNodes.value),
);
const serviceTypeModalGroups = computed(() => {
  const nodes = sortServiceTypeNodesBySortId(serviceTypeNodes.value);
  return [
    {
      key: 'main',
      label: '主流程',
      nodes: nodes.filter((node) => node.isBusinessProcess),
    },
    {
      key: 'non-main',
      label: '服务项目',
      nodes: nodes.filter((node) => !node.isBusinessProcess),
    },
  ].filter((group) => group.nodes.length > 0);
});
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
const getServiceTypeNodeIcon = (node: ServiceTypeNode) => {
  const state = getServicePipelineState(node);
  if (state === 'done') return 'mdi:check-circle';
  if (state === 'active') return 'mdi:progress-clock';
  return 'mdi:schedule';
};
const shouldShowServiceNodeTooltip = (node: ServiceTypeNode) =>
  getServicePipelineState(node) !== 'upcoming';
/**
 * 同 sortId 组内无缝咬合、组间留间距区分、整条保持箭头链流向：
 * 咬合位移放在 item 层（非组首 item 负 margin 一个箭头宽），组首 item 不位移；
 * --first/--last 仅用于整条链两端收圆；节点仍各自渲染、单独完成/取消完成。
 */
const isServiceChevronFlowFirst = (groupIndex: number, nodeIndex: number) =>
  groupIndex === 0 && nodeIndex === 0;
const isServiceChevronFlowLast = (groupIndex: number, nodeIndex: number) => {
  const groups = checkedServiceTypeNodeGroups.value;
  if (!groups.length) return false;
  const lastGroupIndex = groups.length - 1;
  return (
    groupIndex === lastGroupIndex &&
    nodeIndex === groups[lastGroupIndex].nodes.length - 1
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
    return { label: '待处理', color: 'warning' as const };
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
/** 编辑态保存时的重建二次确认（仅在起运港/服务项集合变更且本票已存在任务时触发） */
const confirmServiceTaskRebuild = () =>
  new Promise<boolean>((resolve) => {
    Modal.confirm({
      title: '确认修改起运港 / 服务项目',
      content:
        '起运港或服务项目集合已变更，保存后将清空本票全部服务任务进度并按新配置重新生成。是否继续？',
      okText: '继续保存',
      cancelText: '取消',
      okType: 'danger',
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });
const applyServiceTypeModalDraftAndSave = async () => {
  applyServiceTypeModalDraft();
  if (isEdit.value) {
    await handleSubmit();
  }
};
const handleServiceTypeModalConfirm = async () => {
  if (!serviceTypeModalDraftChanged.value) {
    serviceTypeModalOpen.value = false;
    return;
  }
  if (!isEdit.value) {
    applyServiceTypeModalDraft();
    return;
  }
  // 编辑态：应用勾选后立即保存；是否重建的二次确认统一交由保存流程处理
  await applyServiceTypeModalDraftAndSave();
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
    yardContact: entrustReadonlyInfo.value.yardContact,
    yardEmail: entrustReadonlyInfo.value.yardEmail,
    yardMobile: entrustReadonlyInfo.value.yardMobile,
    yardTel: entrustReadonlyInfo.value.yardTel,
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
/** 归一化 id 用于「是否变更」比较（空值统一为空串） */
const normalizeIdForCompare = (value: unknown) =>
  value === undefined || value === null || value === '' ? '' : String(value);
let serviceTypeLinkageRequestId = 0;
const linkedClientId = ref<unknown>(undefined);
const linkedPolId = ref<unknown>(undefined);
const serviceTypeSyncLoading = ref(false);
const polServiceConfigLoaded = ref(false);
const polHasNoServiceConfig = computed(() => {
  if (isEdit.value) return false;
  if (toOptionalQueryValue(linkedPolId.value) === undefined) return false;
  if (serviceTypeSyncLoading.value || !polServiceConfigLoaded.value)
    return false;
  return serviceTypeNodes.value.length === 0;
});
const hasPolSelected = computed(
  () => toOptionalQueryValue(linkedPolId.value) !== undefined,
);
const showServiceItemContent = computed(() => {
  if (isEdit.value) {
    return serviceTypeNodes.value.length > 0 && !serviceTypeSyncLoading.value;
  }
  return (
    hasPolSelected.value &&
    !serviceTypeSyncLoading.value &&
    polServiceConfigLoaded.value &&
    !polHasNoServiceConfig.value
  );
});
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
) => {
  const polNodes = Array.isArray(availableServiceTypes)
    ? availableServiceTypes
    : [];
  latestAvailableServiceTypes.value = polNodes;
  const clientCheckedMap = buildClientCheckedMap(checkedServiceTypes);
  serviceTypeNodes.value = buildServiceTypeNodes(
    polNodes,
    serviceTypeLabelMap.value,
    undefined,
    clientCheckedMap,
    undefined,
    undefined,
    serviceTypeProcessMap.value,
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
    );
    // 编辑态改起运港/委托单位后，按新配置重写勾选并回到「新建态」展示（不显示任务进度），同时解除历史锁定
    if (isEdit.value) {
      applyServiceLockedFields();
    }
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
  if (suppressServiceTypeLinkage.value) return;
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
/** 委托单位变更：按其已绑定干系人默认回填干系人面板（缺失操作/单证/客服兜底当前账号） */
const applyClientDefaultOrderUsersByClientId = async (value: unknown) => {
  // 仅新建态按委托单位默认回填，避免覆盖编辑态已保存的干系人
  if (isEdit.value || suppressServiceTypeLinkage.value) return;
  const clientId = toOptionalQueryValue(value);
  if (clientId === undefined) {
    applyClientDefaultOrderUsers(undefined);
    return;
  }
  try {
    const client = await getClientDetail(String(clientId));
    applyClientDefaultOrderUsers(client);
  } catch {
    applyClientDefaultOrderUsers(undefined);
  }
};
const bindServiceTypeLinkageEvents = () => {
  basicInfoFormApi.updateSchema([
    {
      fieldName: 'clientId',
      componentProps: {
        onChange: (value: unknown) => {
          queueSyncServiceTypesByPol({ clientId: value });
          void applyClientDefaultOrderUsersByClientId(value);
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
        ? $t('seaExport.export.internalRemark')
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

/** 收发通区块：内部备注 / 外部备注 */
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

/** 订单级总包装（id + 文本），新建箱型时一并带出，避免再拉详情回显 */
const orderCodePackage = ref<{
  id?: number | string;
  name?: string;
}>({});

const syncOrderCodePackage = (
  id: number | string | undefined,
  name?: string,
) => {
  if (id === undefined || id === null || id === '') {
    orderCodePackage.value = {};
    return;
  }
  orderCodePackage.value = {
    id,
    name: name?.trim() || undefined,
  };
};

const resolveCodePackageLabel = (option: any): string | undefined => {
  if (!option) return undefined;
  const opt = Array.isArray(option) ? option[0] : option;
  const label = opt?.label ?? opt?.name;
  return label == null || label === '' ? undefined : String(label);
};

/** 中间表单：货物信息 — 件数 / 包装 / 毛重 / 体积 */
const [CargoMetricsForm, cargoMetricsFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  commonConfig: {
    labelClass: VERTICAL_FORM_LABEL_CLASS,
  },
  schema: cargoSchema
    .filter((item) => cargoMetricsFieldNames.has(item.fieldName))
    .map((item) => {
      const baseProps = withSmallComponentProps(item.componentProps);
      if (item.fieldName !== 'codePackageId') {
        return {
          ...item,
          componentProps: baseProps,
          formItemClass: `cargo-metrics-item cargo-metrics-item--${item.fieldName}`,
        };
      }
      return {
        ...item,
        componentProps:
          typeof baseProps === 'function'
            ? (...args: any[]) => ({
                ...(baseProps as (...inner: any[]) => Record<string, any>)(
                  ...args,
                ),
                onChange: (value: any, option: any) => {
                  syncOrderCodePackage(value, resolveCodePackageLabel(option));
                },
              })
            : {
                ...(baseProps as Record<string, any>),
                onChange: (value: any, option: any) => {
                  syncOrderCodePackage(value, resolveCodePackageLabel(option));
                },
              },
        formItemClass: 'cargo-metrics-item cargo-metrics-item--code-package',
      };
    }),
  showDefaultActions: false,
  wrapperClass: 'cargo-metrics-wrap form-controls-small grid-cols-1',
});

/** 新建箱型时带回总包装 id + 文本 */
const getDefaultCodePackage = async () => {
  const values = await cargoMetricsFormApi.getValues();
  const id = values.codePackageId ?? undefined;
  if (id === undefined || id === null || id === '') return undefined;
  const cached = orderCodePackage.value;
  const name =
    cached.id !== undefined && String(cached.id) === String(id)
      ? cached.name
      : undefined;
  return { id, name };
};

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
    yardContact: values.yardContact ?? '',
    yardEmail: values.yardEmail ?? '',
    yardMobile: values.yardMobile ?? '',
    yardTel: values.yardTel ?? '',
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
const {
  orderUserRows,
  orderUserRoleModalOpen,
  orderUserRoleModalSelected,
  availableOrderUserRoleOptions,
  requiredOrderUserRoles,
  getOrderUserRoleLabel,
  getOrderUserDisplayName,
  getOrderUserSelectedItems,
  getOrderUserAvatarSrc,
  getOrderUserAvatarText,
  getOrderUserDetail,
  isOrderUserDetailLoading,
  getOrderUserDetailText,
  getOrderUserStatusText,
  getOrderUserStatusClass,
  loadOrderUserDetail,
  initializeOrderUsersPanel,
  applyClientDefaultOrderUsers,
  openOrderUserRoleModal,
  handleOrderUserRoleModalCancel,
  handleOrderUserRoleModalConfirm,
  removeOrderUserRole,
  updateOrderUser,
  validateSalesRoleCount,
  validateRequiredOrderUserAssignee,
  validateServiceBoundOrderUsers,
} = useOrderUsers({
  partyInfoFormApi,
  currentUserId,
  isEdit,
  serviceTypeNodes,
  serviceTypeSyncLoading,
  polServiceConfigLoaded,
  latestAvailableServiceTypes,
});
type SectionKey = 'basic' | 'party' | 'shipment' | 'port' | 'cargo';
const sectionRefs = {
  basic: ref<HTMLElement | null>(null),
  shipment: ref<HTMLElement | null>(null),
  port: ref<HTMLElement | null>(null),
  cargo: ref<HTMLElement | null>(null),
  party: ref<HTMLElement | null>(null),
} as const;
const currentSection = ref<SectionKey>('basic');
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

const { aiRecognizing, handleAiFileChange } = useSeaExportAiRecognize({
  formApis: {
    party: partyInfoFormApi,
    basic: basicInfoFormApi,
    shipment: shipmentFormApi,
    port: portFormApi,
    cargoTypeInline: cargoTypeInlineFormApi,
    cargoMain: cargoMainFormApi,
    cargoMetrics: cargoMetricsFormApi,
    cargoRemark: cargoRemarkFormApi,
    cargoDg: cargoDgFormApi,
    cargoReefer: cargoReeferFormApi,
  },
  orderCtns,
  entrustReadonlyInfo,
  refreshEntrustReadonlyInfo,
  syncTabTitleFromValues,
  syncBasicInfoHeaderFields,
  isEdit,
  syncServiceTypesByPol,
});

const aiExtractFileInputRef = ref<HTMLInputElement | null>(null);
const handleAiRecognize = () => {
  if (aiRecognizing.value) return;
  aiExtractFileInputRef.value?.click();
};

const loadEditData = async () => {
  if (!editId.value) return;

  suppressServiceTypeLinkage.value = true;
  pageLoading.value = true;
  try {
    const detail = await getSeaExportDetail(editId.value);
    transportOrderId.value = detail.transportOrder?.id;
    yundangSubscribed.value = detail.isYundangSubscribed ?? false;
    yundangSubscribeSuccess.value = detail.isYundangSubscribeSuccess ?? false;
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
        fieldName: 'bookingAgentId',
        componentProps: {
          selectedItems: toSelectedItems(
            detail.bookingAgentId,
            detail.bookingAgentName,
          ),
          size: 'small',
        },
      },
      {
        fieldName: 'yardId',
        label: yardFieldLabelSchemaContent,
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
        // codeFrtId 使用 FrtPrepareInput 合并组件，componentProps 为函数，
        // 需保留 secondFieldValue（付费地点）/formContext 等动态入参，否则
        // updateSchema 会以静态对象覆盖函数，导致付费地点显示丢失且无法写回 prepareAtId。
        fieldName: 'codeFrtId',
        componentProps: (values: Record<string, any>, formApi: any) => ({
          formContext: formApi,
          secondFieldName: 'prepareAtId',
          secondFieldValue: values?.prepareAtId ?? undefined,
          frtProps: {
            placeholder: $t('ui.placeholder.select'),
            selectedItems: toSelectedItems(
              to?.codeFrtId,
              (to as any)?.codeFrtName,
              'cnName',
            ),
            allowClear: true,
          },
          prepareProps: {
            placeholder: $t('ui.placeholder.select'),
            selectedItems: toPortSelectedItems(
              formValues.prepareAtId,
              detail.prepareAtName ?? (to as any)?.prepareAtName,
              detail.prepareAtEdiCode ?? (to as any)?.prepareAtEdiCode,
            ),
            allowClear: true,
          },
          size: 'small',
        }),
      },
      {
        // codeServiceId 使用 ServiceTradeTermsInput 合并组件，componentProps 为函数，
        // 需保留 secondFieldValue（贸易条款）/formContext/tradeTermsOptions 等动态入参，
        // 否则 updateSchema 会以静态对象覆盖函数，导致贸易条款下拉丢失且无法写回 tradeTermsType。
        fieldName: 'codeServiceId',
        componentProps: (values: Record<string, any>, formApi: any) => ({
          formContext: formApi,
          secondFieldName: 'tradeTermsType',
          secondFieldValue: values?.tradeTermsType ?? undefined,
          serviceProps: {
            placeholder: $t('ui.placeholder.select'),
            selectedItems: toSelectedItems(
              to?.codeServiceId,
              (to as any)?.codeServiceName,
              'cnName',
            ),
            allowClear: true,
          },
          tradeTermsOptions: getTradeTermsTypeOptions(),
          tradeTermsProps: {
            placeholder: $t('ui.placeholder.select'),
            allowClear: true,
          },
          size: 'small',
        }),
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
          onChange: (value: any, option: any) => {
            syncOrderCodePackage(value, resolveCodePackageLabel(option));
          },
        },
      },
    ]);
    syncOrderCodePackage(
      formValues.codePackageId,
      (to as any)?.codePackageName,
    );

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
    editServiceSnapshot.value = {
      savedServiceTypeSet: savedSet,
      savedSortIdMap,
      taskMap,
    };
    editOriginalServiceTypeSet.value = new Set(savedSet);
    editOriginalPolId.value = normalizeIdForCompare(detail.polId);
    editHasAnyServiceTask.value = [...taskMap.values()].some(
      (info) =>
        info.taskStatus === SERVICE_TASK_STATUS_PENDING ||
        info.taskStatus === SERVICE_TASK_STATUS_PROCESSED,
    );
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
    linkedPolId.value = toOptionalQueryValue(formValues.polId);
    linkedClientId.value = toOptionalQueryValue(formValues.clientId);
    // 编辑态首屏拉取港口服务项配置，仅作为锁定/必填/责任角色等元数据；勾选与任务进度仍以详情为准
    const polIdForConfig = toOptionalQueryValue(formValues.polId);
    let polConfig: null | SeaExportAdminApi.ServiceTypeByPolDto[] = null;
    if (polIdForConfig !== undefined) {
      try {
        polConfig = extractServiceTypesByPolResult(
          await getServiceTypesByPOL({
            polId: polIdForConfig as number | string,
          }),
        );
      } catch {
        polConfig = null;
      }
    }
    if (editServiceSnapshot.value) {
      applyServiceTypeStateForEditInitial(polConfig, editServiceSnapshot.value);
    } else {
      serviceTypeNodes.value = [];
      polServiceConfigLoaded.value = true;
    }
    await syncFormSnapshot();
  } finally {
    suppressServiceTypeLinkage.value = false;
    pageLoading.value = false;
  }
};

/**
 * 校验截关类时间（截VGM/截单/截舱单）需早于开船日期与实际开船。
 * 任一截关时间晚于开船日期或实际开船（按日期比较）时提示并阻止保存。
 */
const validateShipmentDates = async (): Promise<boolean> => {
  const values = await shipmentFormApi.getValues();
  const cutTimeFields = [
    { field: 'closeVgmTime', labelKey: 'seaExport.export.closeVgmTime' },
    { field: 'closeDocTime', labelKey: 'seaExport.export.closeDocTime' },
    {
      field: 'closeManifestTime',
      labelKey: 'seaExport.export.closeManifestTime',
    },
  ];
  const departureFields = [
    { value: values.etd, labelKey: 'seaExport.export.etd' },
    { value: values.atd, labelKey: 'seaExport.export.atd' },
  ];
  for (const cut of cutTimeFields) {
    const cutValue = values[cut.field];
    if (!cutValue) continue;
    const cutDay = dayjs(cutValue);
    if (!cutDay.isValid()) continue;
    for (const departure of departureFields) {
      if (!departure.value) continue;
      const departureDay = dayjs(departure.value);
      if (!departureDay.isValid()) continue;
      if (cutDay.isAfter(departureDay, 'day')) {
        message.warning(
          `${$t(cut.labelKey)}应早于${$t(departure.labelKey)}，请核查`,
        );
        return false;
      }
    }
  }
  return true;
};

const { submitting, buildDto, handleSubmit, syncFormSnapshot, isFormDirty } =
  useSeaExportSubmit({
    formApis: {
      party: partyInfoFormApi,
      basic: basicInfoFormApi,
      shipment: shipmentFormApi,
      port: portFormApi,
      cargoTypeInline: cargoTypeInlineFormApi,
      cargoMain: cargoMainFormApi,
      cargoMetrics: cargoMetricsFormApi,
      cargoRemark: cargoRemarkFormApi,
      cargoDg: cargoDgFormApi,
      cargoReefer: cargoReeferFormApi,
    },
    collectCurrentFormValues,
    orderCtns,
    isEdit,
    editId,
    transportOrderId,
    getCheckedServiceTypes,
    getCheckedServiceTypeItems,
    editHasAnyServiceTask,
    editOriginalPolId,
    editOriginalServiceTypeSet,
    normalizeIdForCompare,
    confirmServiceTaskRebuild,
    validateSalesRoleCount,
    validateRequiredOrderUserAssignee,
    validateServiceBoundOrderUsers,
    validateShipmentDates,
    loadEditData,
    closeTabByKey,
    getCurrentTabKey: () => route.fullPath,
    router,
  });

const { copying: copyingSeaExport, copyFrom: copySeaExportFromCurrent } =
  useSeaExportCopy({
    checkDirty: isFormDirty,
  });

// 页面级表单未保存拦截：切换标签页 / 菜单跳转 / 关闭当前标签页时二次确认。
// 内嵌于编辑工作台（editor.vue）时由父级统一登记，此处仅在独立页面（新建）生效。
useUnsavedGuard({
  isDirty: isFormDirty,
  enabled: () => !props.embedded,
});

const { ResultModal, subscribe, subscribing } = useYundangOceanSubscribe();

/** 运踪订阅状态（随详情返回，订阅后重新加载详情刷新） */
const yundangSubscribed = ref(false);
const yundangSubscribeSuccess = ref(false);
const yundangSubscribeStatus = computed(() =>
  getYundangSubscribeStatus({
    isYundangSubscribed: yundangSubscribed.value,
    isYundangSubscribeSuccess: yundangSubscribeSuccess.value,
  }),
);
/** 已成功订阅的同单号禁止重复批量订阅 */
const yundangSubscribeDisabled = computed(
  () => yundangSubscribeStatus.value === 'success',
);
const yundangSubscribeButtonText = computed(() =>
  yundangSubscribeStatus.value === 'failed'
    ? $t('seaExport.yundang.resubscribe')
    : $t('seaExport.yundang.subscribe'),
);

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
  if (!isEdit.value || !editId.value || yundangSubscribeDisabled.value) {
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
  await loadEditData();
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
      content: '当前表单有未保存的修改，打印将使用已保存的数据，是否继续？',
      okText: '继续打印',
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

/**
 * 解析打印所需的当票要素（签单方式/船公司/分公司）。
 * 打印数据由后端按 id 取数，未保存的表单修改不会体现在打印结果中。
 */
const resolvePrintContext = async (): Promise<null | {
  carrierId?: null | number;
  codeIssueTypeId?: null | number;
  orgId?: null | number;
}> => {
  if (!isEdit.value || !editId.value) {
    message.warning('请先保存后再打印');
    return null;
  }

  try {
    const dirty = await isFormDirty();
    if (dirty) {
      const confirmed = await confirmUnsavedPrint();
      if (!confirmed) return null;
    }

    const detail = await getSeaExportDetail(editId.value);
    return {
      codeIssueTypeId:
        (detail as any).codeIssueTypeId ?? (detail as any).issueType ?? null,
      carrierId: detail.carrierId ?? null,
      orgId: detail.orgId ?? null,
    };
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
    const ctx = await resolvePrintContext();
    if (!ctx) return;
    openPrint({
      printJsonType: PrintJsonType.SeaExportDetail,
      codeIssueTypeId: ctx.codeIssueTypeId,
      carrierId: ctx.carrierId,
      orgId: ctx.orgId,
      detailInput: { id: editId.value },
    });
  } catch {
    message.error('打印准备失败，请稍后重试');
  } finally {
    hideLoading();
    printing.value = false;
  }
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
      // 新建态记录初始空白快照，作为未保存拦截的脏检查基线
      await syncFormSnapshot();
    }
  };
  if (!isEdit.value) {
    editServiceSnapshot.value = null;
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
  isFormDirty,
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
                                                formatServiceTaskUsersText(node)
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
                    <template v-if="isEdit">
                      <Tooltip
                        :title="
                          yundangSubscribeDisabled
                            ? $t('seaExport.yundang.alreadySubscribed')
                            : ''
                        "
                      >
                        <Button
                          v-access:code="externalApiUseCode"
                          size="small"
                          class="flex items-center justify-center"
                          :loading="subscribing"
                          :disabled="yundangSubscribeDisabled"
                          @click="handleYundangSubscribe"
                        >
                          <IconifyIcon
                            icon="mdi:radar"
                            class="mr-1 inline-block size-3.5 align-middle"
                          />
                          <span class="align-middle">{{
                            yundangSubscribeButtonText
                          }}</span>
                        </Button>
                      </Tooltip>
                    </template>
                    <DropdownButton
                      v-if="isEdit"
                      type="primary"
                      size="small"
                      :loading="submitting"
                      :trigger="['hover']"
                      class="sea-export-save-dropdown"
                      @click="handleSubmit"
                    >
                      <Save class="mr-1 inline-block size-3.5 align-middle" />
                      <span class="align-middle">{{ $t('common.save') }}</span>
                      <template #overlay>
                        <Menu>
                          <MenuItem
                            v-access:code="perm.add"
                            :disabled="copyingSeaExport"
                            @click="handleCopySeaExport"
                          >
                            <Copy
                              class="mr-1 inline-block size-3.5 align-middle"
                            />
                            <span class="align-middle">{{
                              $t('seaExport.export.copy')
                            }}</span>
                          </MenuItem>
                        </Menu>
                      </template>
                    </DropdownButton>
                    <Button
                      v-else
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
                    :get-default-code-package="getDefaultCodePackage"
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
          <div class="right-column">
            <Card class="right-column__card">
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
                        <span
                          v-if="
                            row.userAttribute != null &&
                            requiredOrderUserRoles.includes(row.userAttribute)
                          "
                          class="order-user-panel__role-required"
                        >
                          *
                        </span>
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
                                    getOrderUserDetail(row.userId)
                                      ?.emailAddress,
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
                      :placeholder="
                        $t('seaExport.export.pleaseSelectOrderUser')
                      "
                      size="small"
                      allow-clear
                      class="order-user-panel__select"
                      @update:model-value="
                        (v) => updateOrderUser(row._rowKey, v)
                      "
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
          v-for="group in serviceTypeModalGroups"
          :key="group.key"
          class="service-type-modal__group"
        >
          <div class="service-type-modal__group-title">
            {{ group.label }}
            <span class="service-type-modal__group-count">
              {{ group.nodes.length }}
            </span>
          </div>
          <div class="service-type-modal__group-items">
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
      </div>
    </Modal>
    <ResultModal />
  </component>
</template>

<style scoped src="./form.css"></style>
