<script lang="ts" setup>
import type { SeaImportAdminApi } from '#/api/sea-import/sea-import-admin';
import type { TerminalScheduleItem } from '#/components/terminal-schedule';

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
import { useUserStore } from '@vben/stores';

import { useAccess } from '@vben/access';

import dayjs from 'dayjs';

import {
  Avatar,
  Button,
  Card,
  Dropdown,
  InputNumber,
  Menu,
  MenuItem,
  message,
  Modal,
  Popover,
  Radio,
  Space,
  Spin,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import {
  CodeSourceSelect,
  UserOrgSelect,
  UserSelect,
} from '#/adapter/component';
import { useVbenForm } from '#/adapter/form';
import {
  getSeaImportDetail,
  updateSeaImportCommissionNum,
} from '#/api/sea-import/sea-import-admin';
import { FeituoTrackingAdminApi } from '#/api/tracking/feituo-tracking-admin';
import {
  TerminalSchedulePickerModal,
  buildTerminalScheduleFormPatch,
  useTerminalScheduleSync,
} from '#/components/terminal-schedule';
import { useContainerTrackingSubscribe } from '#/components/tracking';
import { $t } from '#/locales';
import { createAbpPermission } from '#/utils/abp-permission';
import { isTicketEditable, setFormApisDisabled } from '#/utils/ticket-editable';
import { useAllUserOrg } from '#/composables/use-all-user-org';
import { resolveOrderUserCompanyIds } from '#/composables/use-my-org';
import { useUnsavedGuard } from '#/composables/use-unsaved-guard';

import {
  CARGO_TYPE,
  createEmptyDgValues,
  createEmptyReeferValues,
  formatSeaImportPortRemark,
  pickPortSelectOption,
  TRANSFER_STATION_DATE_OFFSET_DAYS,
  useBasicInfoFormSchema,
  useCargoFormSchema,
  useDgFormSchema,
  usePartyInfoFormSchema,
  usePortFormSchema,
  useReeferFormSchema,
  useShipmentFormSchema,
} from '../data';
import OrderCtnTable from '../modules/order-ctn-table.vue';
import { useSeaImportCopy } from '../use-sea-import-copy';
import AiExtractUploadModal from './ai-extract-upload-modal.vue';
import {
  flattenDetail,
  normalizeOrderCtnsWithRowKey,
  resolveCodePackageName,
  resolveCodeSourceName,
  sumCtnNetWeight,
  toPortSelectedItems,
  toSelectedItems,
} from './sea-import-detail-mapper';
import { useOrderUsers } from './use-order-users';
import { useSeaImportAiRecognize } from './use-sea-import-ai-recognize';
import { useSeaImportSubmit } from './use-sea-import-submit';

type SectionKey = 'basic' | 'cargo' | 'party' | 'port' | 'shipment';

const DropdownButton = Dropdown.Button;

defineOptions({ name: 'SeaImportAdminForm' });

const props = withDefaults(defineProps<{ embedded?: boolean }>(), {
  embedded: false,
});

/** 编辑保存成功：上抛最新详情 DTO，供编辑工作台联动费用/更改单等 Tab */
const emit = defineEmits<{
  saved: [detail: SeaImportAdminApi.SeaImportDto];
  sectionChange: [key: SectionKey];
}>();

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const { closeTabByKey } = useTabs();
const perm = createAbpPermission('Admin.SeaImport');
const externalApiUseCode = 'Admin.ExternalApi.Use';
const { hasAccessByCodes } = useAccess();

const pageWrapperTag = computed(() => (props.embedded ? 'div' : Page));
const pageWrapperProps = computed(() =>
  props.embedded ? {} : { autoContentHeight: true, contentClass: '!p-0' },
);

const editId = computed<string | undefined>(() => {
  const id = route.params.id;
  const resolved = Array.isArray(id) ? id[0] : id;
  return resolved ? String(resolved) : undefined;
});
const isEdit = computed(() => !!editId.value);

/** 详情根上的 isEditable；缺字段按不可编辑，进页后以最新详情为准 */
const detailIsEditable = ref(false);
const canEditOrder = computed(
  () =>
    !isEdit.value || (hasAccessByCodes([perm.edit]) && detailIsEditable.value),
);
const isOrderReadonly = computed(() => isEdit.value && !canEditOrder.value);

const currentUserId = computed<number | undefined>(() => {
  const parsed = Number(userStore.userInfo?.userId);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
});

const pageLoading = ref(false);
const transportOrderId = ref<string | undefined>();
const orderCtns = ref<any[]>([]);
/** 商品子表行 id 缓存：提交时与多选 id 合并，避免编辑全量删建 */
const orderCodeGoodsRows = ref<
  Array<{ codeGoodsId?: number | string; id?: number | string }>
>([]);
/** 委托单位联系人：暂无独立控件，编辑时原样回传避免被清空 */
const clientContactId = ref<null | number | string | undefined>();
/** 收发通区块可折叠，默认展开（对齐业务联系单交互，进口默认展开） */
const partyExpanded = ref(true);

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
/** 件重尺水平 label：件数/包装、毛重KGS 等与输入框同一行 */
const METRICS_FORM_LABEL_CLASS = 'leading-[24px] mb-0 shrink-0';

/** 只读信息挪到基础信息区块头部展示，不占表单栅格 */
const BASIC_INFO_HEADER_READONLY_FIELD_NAMES = [
  'commissionNum',
  'countryName',
  'laneName',
  'accountDate',
  'settlementDate',
] as const;
/** 头部内联下拉：表单里仍保留隐藏项承载取值与校验 */
const BASIC_INFO_HEADER_SELECT_FIELD_NAMES = ['orgId', 'codeSourceId'] as const;
/** 免箱期挪到船期区块标题栏，表单里保留隐藏项承载取值 */
const SHIPMENT_HEADER_FIELD_NAMES = ['freeDays'] as const;
/** 船名航次与船公司并入基础信息，船期区块只留作业日期流程条 */
const BASIC_MODULE_EXTRA_FIELD_NAMES = [
  'vessel',
  'innerVoyno',
  'carrierId',
] as const;
const SHIPMENT_MOVED_TO_BASIC_FIELD_NAMES = new Set<string>(
  BASIC_MODULE_EXTRA_FIELD_NAMES,
);
const BASIC_INFO_FIELD_ORDER = [
  'clientId',
  'carrierId',
  'vessel',
  'teamId',
  'custBrokerId',
  'warehouseId',
  'insuranceId',
  'mblNum',
  'hblNum',
  'throughBillNum',
  'contractNum',
  'invoiceNum',
  'batchNum',
  'clientNum',
  'terminalId',
  'tradeMode',
  'codeServiceId',
  'originCountryId',
] as const;
const BASIC_INFO_FIELD_ORDER_MAP = new Map(
  BASIC_INFO_FIELD_ORDER.map((fieldName, index) => [fieldName, index]),
);

/** 码头船舶：纯查询；有可引入数据才弹窗，确定后由前端回填并走原有保存 */
const terminalScheduleApplying = ref(false);
const {
  pickerItems: terminalScheduleItems,
  pickerOpen: terminalSchedulePickerOpen,
  queryInfo: terminalScheduleQueryInfo,
  sync: handleTerminalScheduleSync,
  syncing: terminalScheduleQuerying,
} = useTerminalScheduleSync({
  transportOrderId: editId,
});
const terminalScheduleSyncing = computed(
  () => terminalScheduleQuerying.value || terminalScheduleApplying.value,
);

/** vessel 用 VesselVoyageInput 合并组件，componentProps 需保持函数以承载航次动态入参 */
const buildVesselComponentProps =
  () => (values: Record<string, any>, formApi: any) => ({
    formContext: formApi,
    secondFieldName: 'innerVoyno',
    secondFieldValue: values?.innerVoyno ?? '',
    actionVisible: isEdit.value,
    actionLoading: terminalScheduleSyncing.value,
    actionTitle: $t('component.terminalSchedule.sync'),
    onAction: handleTerminalScheduleSync,
  });

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
          !(
            BASIC_INFO_HEADER_READONLY_FIELD_NAMES as readonly string[]
          ).includes(item.fieldName) && item.fieldName !== 'cargoId',
      )
      .map((item) => ({
        ...item,
        formItemClass: (
          BASIC_INFO_HEADER_SELECT_FIELD_NAMES as readonly string[]
        ).includes(item.fieldName)
          ? 'hidden'
          : item.formItemClass,
      })),
    ...useShipmentFormSchema()
      .filter((item) => SHIPMENT_MOVED_TO_BASIC_FIELD_NAMES.has(item.fieldName))
      .map((item) =>
        item.fieldName === 'vessel'
          ? { ...item, componentProps: buildVesselComponentProps() }
          : item,
      ),
  ]
    .sort((a, b) => {
      const aIndex = BASIC_INFO_FIELD_ORDER_MAP.get(a.fieldName as any);
      const bIndex = BASIC_INFO_FIELD_ORDER_MAP.get(b.fieldName as any);
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
});

/** 左侧表单：相关方信息（发货人、收货人、通知人） */
const [PartyInfoForm, partyInfoFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  schema: mapSchemaWithSmallSize(usePartyInfoFormSchema()),
  showDefaultActions: false,
  wrapperClass: 'party-flow-wrap grid-cols-6 gap-x-4',
});

/** 船期区块：免箱期 + 到港/换单/提货/报关/转站/箱使日期流程条 */
const [ShipmentForm, shipmentFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  commonConfig: {
    labelClass: VERTICAL_FORM_LABEL_CLASS,
  },
  schema: mapSchemaWithSmallSize(
    useShipmentFormSchema()
      .filter(
        (item) => !SHIPMENT_MOVED_TO_BASIC_FIELD_NAMES.has(item.fieldName),
      )
      .map((item) =>
        (SHIPMENT_HEADER_FIELD_NAMES as readonly string[]).includes(
          item.fieldName,
        )
          ? { ...item, formItemClass: 'hidden' }
          : item,
      ),
  ),
  showDefaultActions: false,
  wrapperClass: 'shipment-flow-wrap form-controls-small grid-cols-6 gap-x-8',
});

const headerFreeDays = ref<number | undefined>();

/** 免箱期改动会带出箱使日期，所以改完要重算派生日期 */
const handleHeaderFreeDaysChange = async (value: null | number | undefined) => {
  headerFreeDays.value = value ?? undefined;
  await shipmentFormApi.setFieldValue('freeDays', value ?? undefined);
  await recalcDerivedDates();
};

/** 港口选择后回填对应备注：`portName, countryEnName` */
const syncPortRemark = async (fieldName: string, option: unknown) => {
  const remarkField = fieldName === 'polId' ? 'polRemark' : 'podRemark';
  const raw = pickPortSelectOption(option)?.raw;
  const remark = formatSeaImportPortRemark(raw);
  await portFormApi.setValues({ [remarkField]: remark ?? '' });
  if (fieldName === 'polId') {
    // 航线与国家没有独立字段，仅挂在起运港下
    entrustReadonlyInfo.value = {
      ...entrustReadonlyInfo.value,
      countryName: (raw as any)?.country?.countryName ?? '',
      laneName: (raw as any)?.lane?.laneName ?? '',
    };
  }
};

/** 港口区块：起运港 → 目的港，另加整票唯一的原产国 */
const [PortForm, portFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  commonConfig: {
    labelClass: VERTICAL_FORM_LABEL_CLASS,
  },
  schema: usePortFormSchema({
    onPortChange: (fieldName, _value, option) => {
      void syncPortRemark(fieldName, option);
    },
  }).map((item) =>
    String(item.formItemClass ?? '').includes('port-flow-remark')
      ? item
      : {
          ...item,
          componentProps: withSmallComponentProps(item.componentProps),
        },
  ),
  showDefaultActions: false,
  wrapperClass: 'port-flow-wrap form-controls-small grid-cols-2 gap-x-8',
});

const cargoSchema = useCargoFormSchema();
const cargoType = ref<number | undefined>();
const cargoInlineFieldNames = new Set(['cargoId', 'orderCodeGoodss']);
const cargoMainFieldNames = new Set(['marks', 'goodsDes']);
const cargoMetricsFieldNames = new Set([
  'pkgs',
  'codePackageId',
  'kgs',
  'totalNetWeight',
  'cbm',
]);
const cargoRemarkFieldNames = new Set(['internalRemark', 'remark']);
type RemarkTab = 'internalRemark' | 'remark';
const remarkTab = ref<RemarkTab>('internalRemark');
const remarkTabItems: Array<{ key: RemarkTab; label: string }> = [
  { key: 'internalRemark', label: $t('seaImport.import.internalRemark') },
  { key: 'remark', label: $t('seaImport.import.externalRemark') },
];

/** 货物类型 + 品名内联在货物卡片标题栏 */
const [CargoTypeInlineForm, cargoTypeInlineFormApi] = useVbenForm({
  layout: 'horizontal',
  compact: true,
  schema: mapSchemaWithSmallSize(
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
  ),
  showDefaultActions: false,
  commonConfig: {
    labelWidth: 0,
  },
  wrapperClass: 'form-controls-small grid-cols-2 gap-x-3',
  handleValuesChange: (values, fieldsChanged) => {
    if (!fieldsChanged.includes('cargoId')) {
      return;
    }
    cargoType.value = values.cargoId as number | undefined;
  },
});

/** 货物右栏：内部备注 / 外部备注共用一块，顶部 Tab 切换 */
const [CargoRemarkForm, cargoRemarkFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  commonConfig: {
    hideLabel: true,
    labelClass: VERTICAL_FORM_LABEL_CLASS,
  },
  schema: cargoSchema
    .filter((item) => cargoRemarkFieldNames.has(item.fieldName))
    .map((item) => ({
      ...item,
      component: 'Textarea',
      hideLabel: true,
      componentProps: {
        class: 'cargo-remark-textarea',
        rows: 3,
        style: {
          background: 'transparent',
          border: 0,
          borderRadius: 0,
          boxShadow: 'none',
          height: '61px',
          lineHeight: 'normal',
          minHeight: '61px',
          outline: 0,
          padding: '6px 8px',
          resize: 'none',
        },
      },
      formItemClass: `col-span-1 cargo-remark-field cargo-remark-field--${item.fieldName}`,
    })),
  showDefaultActions: false,
  wrapperClass: 'cargo-remark-wrap grid-cols-1',
});

/** 货物信息左栏：唛头 / 货描 */
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

const codePackageSelectedItems = ref<any[]>([]);

/** pkgs 用 PkgsPackageInput 合并包装，componentProps 保持函数以回传 codePackageId */
const buildPkgsComponentProps =
  () => (values: Record<string, any>, formApi: any) => ({
    formContext: formApi,
    secondFieldName: 'codePackageId',
    secondFieldValue: values?.codePackageId,
    selectedItems: codePackageSelectedItems.value,
  });

/** 货物信息右栏：件数/包装 / 毛重 / 净重 / 体积 */
const [CargoMetricsForm, cargoMetricsFormApi] = useVbenForm({
  layout: 'horizontal',
  compact: true,
  commonConfig: {
    labelWidth: 84,
    labelClass: METRICS_FORM_LABEL_CLASS,
  },
  schema: mapSchemaWithSmallSize(
    cargoSchema
      .filter((item) => cargoMetricsFieldNames.has(item.fieldName))
      .map((item) =>
        item.fieldName === 'pkgs'
          ? { ...item, componentProps: buildPkgsComponentProps() }
          : item,
      ),
  ),
  showDefaultActions: false,
  wrapperClass: 'cargo-metrics-wrap form-controls-small grid-cols-1',
});

const showDgFields = computed(() => cargoType.value === CARGO_TYPE.D);
const showReeferFields = computed(() => cargoType.value === CARGO_TYPE.R);

const [CargoDgForm, cargoDgFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  commonConfig: {
    labelClass: VERTICAL_FORM_LABEL_CLASS,
  },
  schema: mapSchemaWithSmallSize(useDgFormSchema()),
  showDefaultActions: false,
  wrapperClass: 'cargo-extension-wrap form-controls-small grid-cols-4 gap-x-4',
});

const [CargoReeferForm, cargoReeferFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  commonConfig: {
    labelClass: VERTICAL_FORM_LABEL_CLASS,
  },
  schema: mapSchemaWithSmallSize(useReeferFormSchema()),
  showDefaultActions: false,
  wrapperClass: 'cargo-extension-wrap form-controls-small grid-cols-4 gap-x-4',
});

const orderFormApis = [
  basicInfoFormApi,
  partyInfoFormApi,
  shipmentFormApi,
  portFormApi,
  cargoTypeInlineFormApi,
  cargoRemarkFormApi,
  cargoMainFormApi,
  cargoMetricsFormApi,
  cargoDgFormApi,
  cargoReeferFormApi,
];

const applyOrderReadonlyState = () => {
  setFormApisDisabled(orderFormApis, isOrderReadonly.value);
};

watch(isOrderReadonly, () => applyOrderReadonlyState(), { immediate: true });

watch(cargoType, async (nextCargoId, prevCargoId) => {
  if (prevCargoId === CARGO_TYPE.D && nextCargoId !== CARGO_TYPE.D) {
    await cargoDgFormApi.setValues(createEmptyDgValues());
  }
  if (prevCargoId === CARGO_TYPE.R && nextCargoId !== CARGO_TYPE.R) {
    await cargoReeferFormApi.setValues(createEmptyReeferValues());
  }
});

/** 基础信息区块头部的只读信息 */
const entrustReadonlyInfo = ref({
  commissionNum: '',
  countryName: '',
  laneName: '',
  accountDateText: '-',
  settlementDateText: '-',
});

const refreshEntrustReadonlyInfo = (values: Record<string, any>) => {
  entrustReadonlyInfo.value = {
    commissionNum: values.commissionNum ?? '',
    countryName: values.countryName ?? '',
    laneName: values.laneName ?? '',
    accountDateText: values.accountDate
      ? dayjs(values.accountDate).format('YYYY-MM')
      : '-',
    settlementDateText: values.settlementDate
      ? dayjs(values.settlementDate).format('YYYY-MM-DD')
      : '-',
  };
};

const headerOrgId = ref<null | number | undefined>();
const headerOrgSelectedItems = ref<Array<{ label: string; value: number }>>([]);
const headerCodeSourceId = ref<number | undefined>();
const headerCodeSourceSelectedItems = ref<any[]>([]);

/** 归属组织写入序号：防止与 UserOrgSelect autoDefault 异步 setFieldValue 乱序 */
let headerOrgWriteSeq = 0;

const syncBasicInfoHeaderFields = async () => {
  const seqAtStart = headerOrgWriteSeq;
  const [basic, shipment] = await Promise.all([
    basicInfoFormApi.getValues(),
    shipmentFormApi.getValues(),
  ]);
  if (seqAtStart === headerOrgWriteSeq) {
    headerOrgId.value = basic.orgId ?? undefined;
  }
  headerCodeSourceId.value = basic.codeSourceId;
  headerFreeDays.value = shipment.freeDays ?? undefined;
};

const handleHeaderOrgChange = async (value: null | number | undefined) => {
  const seq = ++headerOrgWriteSeq;
  headerOrgId.value = value ?? undefined;
  await basicInfoFormApi.setFieldValue('orgId', value ?? undefined);
  if (seq !== headerOrgWriteSeq) {
    await basicInfoFormApi.setFieldValue(
      'orgId',
      headerOrgId.value ?? undefined,
    );
  }
};

const handleHeaderCodeSourceChange = async (value: unknown) => {
  const next =
    value === undefined || value === null || value === '' ? undefined : value;
  headerCodeSourceId.value = next as number | undefined;
  if (next == null) {
    headerCodeSourceSelectedItems.value = [];
  }
  await basicInfoFormApi.setFieldValue('codeSourceId', next);
};

const {
  orderUserRows,
  salesUserId,
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
  getOrderUserOrgText,
  getOrderUserStatusText,
  getOrderUserStatusClass,
  loadOrderUserDetail,
  initializeOrderUsersPanel,
  openOrderUserRoleModal,
  handleOrderUserRoleModalCancel,
  handleOrderUserRoleModalConfirm,
  removeOrderUserRole,
  updateOrderUser,
  validateSalesRoleCount,
  validateRequiredOrderUserAssignee,
  whenOrderUserRolesReady,
} = useOrderUsers({
  partyInfoFormApi,
  currentUserId,
});

const { allUserOrgMap, loadAllUserOrganizations } = useAllUserOrg();
const orderUserCompanyIds = computed(() => {
  void allUserOrgMap.value;
  return resolveOrderUserCompanyIds(headerOrgId.value, salesUserId.value);
});
void loadAllUserOrganizations();

const sectionRefs = {
  basic: ref<HTMLElement | null>(null),
  party: ref<HTMLElement | null>(null),
  shipment: ref<HTMLElement | null>(null),
  port: ref<HTMLElement | null>(null),
  cargo: ref<HTMLElement | null>(null),
} as const;

/** 国家/航线标签挂在起运港的 label 上，与出口把标签挂在目的港一致 */
const polPortLabelTarget = ref<HTMLElement | null>(null);
const refreshPortLabelTargets = () => {
  nextTick(() => {
    const portSection = sectionRefs.port.value;
    polPortLabelTarget.value = portSection
      ? (portSection.querySelector(
          '.port-flow-wrap .port-flow-pos--pol > label',
        ) as HTMLElement | null)
      : null;
  });
};

/**
 * 到港日期 / 免箱期变化时推算：
 * 转站日期 = 到港日期 + 9 天；箱使日期 = 到港日期 + 免箱期 − 1 天。
 * 两个字段只读展示，写入 YYYY-MM-DD 文本。
 */
const recalcDerivedDates = async () => {
  const values = await shipmentFormApi.getValues();
  const arrival = values.etd ? dayjs(values.etd as any) : undefined;
  if (!arrival?.isValid()) {
    return;
  }
  const patch: Record<string, any> = {
    transferStationDate: arrival
      .add(TRANSFER_STATION_DATE_OFFSET_DAYS, 'day')
      .format('YYYY-MM-DD'),
  };
  const freeDays = Number(values.freeDays);
  if (Number.isFinite(freeDays) && freeDays > 0) {
    patch.ctnUseDate = arrival.add(freeDays - 1, 'day').format('YYYY-MM-DD');
  } else {
    patch.ctnUseDate = '';
  }
  await shipmentFormApi.setValues(patch);
};

const bindLinkages = () => {
  shipmentFormApi.updateSchema([
    {
      fieldName: 'etd',
      componentProps: {
        class: 'w-full',
        size: 'small',
        showTime: false,
        format: 'YYYY-MM-DD',
        onChange: () => {
          void nextTick(recalcDerivedDates);
        },
      },
    },
  ]);
};

/**
 * 净重合计跟随集装箱净重求和，改完箱子即刷新；刷新之后仍可手改，
 * 直到下一次箱型列表变动再被重算。详情回填期间挂起，避免覆盖已存值。
 */
const netWeightAutoSyncSuspended = ref(false);
watch(
  orderCtns,
  async (rows) => {
    if (netWeightAutoSyncSuspended.value) return;
    await cargoMetricsFormApi.setValues({
      totalNetWeight: sumCtnNetWeight(rows),
    });
  },
  { deep: true },
);

const collectCurrentFormValues = async (): Promise<Record<string, any>> => {
  const [
    basic,
    party,
    shipment,
    port,
    type,
    remark,
    main,
    metrics,
    dg,
    reefer,
  ] = await Promise.all([
    basicInfoFormApi.getValues(),
    partyInfoFormApi.getValues(),
    shipmentFormApi.getValues(),
    portFormApi.getValues(),
    cargoTypeInlineFormApi.getValues(),
    cargoRemarkFormApi.getValues(),
    cargoMainFormApi.getValues(),
    cargoMetricsFormApi.getValues(),
    cargoDgFormApi.getValues(),
    cargoReeferFormApi.getValues(),
  ]);
  return {
    ...basic,
    ...party,
    ...shipment,
    ...port,
    ...type,
    ...remark,
    ...main,
    ...metrics,
    ...dg,
    ...reefer,
    commissionNum: entrustReadonlyInfo.value.commissionNum,
    orderUsers: orderUserRows.value,
    orderCodeGoodsRows: orderCodeGoodsRows.value,
    clientContactId: clientContactId.value,
  };
};

/** 集装箱必须选箱型，否则后端会整单拒绝 */
const validateOrderCtns = () => {
  const invalid = orderCtns.value.some(
    (row) =>
      row.ctnCodeId === undefined ||
      row.ctnCodeId === null ||
      row.ctnCodeId === '',
  );
  if (invalid) {
    message.warning(
      `${$t('seaImport.import.ctnCodeId')}${$t('ui.formRules.required', [''])}`,
    );
    return false;
  }
  return true;
};

const validateOrderUsers = () =>
  validateSalesRoleCount() && validateRequiredOrderUserAssignee();

const loadEditData = async (): Promise<
  SeaImportAdminApi.SeaImportDto | undefined
> => {
  if (!editId.value) {
    return undefined;
  }
  detailIsEditable.value = false;
  pageLoading.value = true;
  netWeightAutoSyncSuspended.value = true;
  try {
    const detail = await getSeaImportDetail(editId.value);
    detailIsEditable.value = isTicketEditable(detail);
    const to = detail.transportOrder;
    transportOrderId.value = to?.id;
    trackingSubscribed.value = detail.isFeituoSubscribed ?? false;
    trackingSubscribeSuccess.value = detail.isFeituoSubscribeSuccess ?? false;
    const formValues = flattenDetail(detail);
    cargoType.value = to?.cargoId ?? undefined;
    orderCtns.value = normalizeOrderCtnsWithRowKey(detail.orderCtns);
    orderCodeGoodsRows.value = formValues.orderCodeGoodsRows ?? [];
    clientContactId.value = to?.clientContactId;

    // 各下拉的回显项直接由详情对象构造，避免每个 select 再各自打一次详情接口
    basicInfoFormApi.updateSchema([
      {
        fieldName: 'clientId',
        componentProps: {
          selectedItems: toSelectedItems(to?.clientId, to?.client?.name),
        },
      },
      {
        fieldName: 'terminalId',
        componentProps: {
          selectedItems: toSelectedItems(
            detail.terminalId,
            detail.terminal?.name,
          ),
        },
      },
      {
        fieldName: 'teamId',
        componentProps: {
          selectedItems: toSelectedItems(to?.teamId, to?.team?.name),
        },
      },
      {
        fieldName: 'custBrokerId',
        componentProps: {
          selectedItems: toSelectedItems(
            to?.custBrokerId,
            to?.custBroker?.name,
          ),
        },
      },
      {
        fieldName: 'warehouseId',
        componentProps: {
          selectedItems: toSelectedItems(to?.warehouseId, to?.warehouse?.name),
        },
      },
      {
        fieldName: 'insuranceId',
        componentProps: {
          selectedItems: toSelectedItems(to?.insuranceId, to?.insurance?.name),
        },
      },
      {
        fieldName: 'carrierId',
        componentProps: {
          selectedItems: toSelectedItems(
            detail.carrierId,
            detail.carrier?.cnShortName || detail.carrier?.cnName,
            'cnShortName',
          ),
        },
      },
      {
        fieldName: 'originCountryId',
        componentProps: {
          selectedItems: toSelectedItems(
            detail.originCountryId,
            detail.originCountry?.countryName,
            'countryName',
          ),
        },
      },
      {
        fieldName: 'orgId',
        componentProps: {
          autoDefault: false,
          class: 'w-full',
        },
      },
    ]);
    partyInfoFormApi.updateSchema([
      {
        fieldName: 'shipperId',
        componentProps: {
          selectedItems: toSelectedItems(to?.shipperId, to?.shipper?.name),
        },
      },
      {
        fieldName: 'consigneeId',
        componentProps: {
          selectedItems: toSelectedItems(to?.consigneeId, to?.consignee?.name),
        },
      },
      {
        fieldName: 'notifierId',
        componentProps: {
          selectedItems: toSelectedItems(to?.notifierId, to?.notifier?.name),
        },
      },
    ]);
    portFormApi.updateSchema([
      {
        fieldName: 'polId',
        componentProps: {
          selectedItems: toPortSelectedItems(
            detail.polId,
            detail.pol?.portName,
            detail.pol?.ediCode,
            detail.pol?.country?.countryEnName,
          ),
        },
      },
      {
        fieldName: 'podId',
        componentProps: {
          selectedItems: toPortSelectedItems(
            detail.podId,
            detail.pod?.portName,
            detail.pod?.ediCode,
            detail.pod?.country?.countryEnName,
          ),
        },
      },
    ]);
    codePackageSelectedItems.value = toSelectedItems(
      to?.codePackageId,
      resolveCodePackageName(to),
    );
    cargoTypeInlineFormApi.updateSchema([
      {
        fieldName: 'orderCodeGoodss',
        componentProps: {
          mode: 'multiple',
          showNameWithHsCode: true,
          allowClear: true,
          selectedItems: (to?.orderCodeGoodss ?? []).map((item) => ({
            id: item.codeGoodsId,
            name: item.codeGoodsName || item.codeGoods?.name,
            hsCode: item.codeGoodsHSCode || item.codeGoods?.hsCode,
          })),
        },
      },
    ]);

    await Promise.all([
      basicInfoFormApi.setValues(formValues),
      partyInfoFormApi.setValues(formValues),
      shipmentFormApi.setValues(formValues),
      portFormApi.setValues(formValues),
      cargoTypeInlineFormApi.setValues(formValues),
      cargoRemarkFormApi.setValues(formValues),
      cargoMainFormApi.setValues(formValues),
      cargoMetricsFormApi.setValues(formValues),
      cargoDgFormApi.setValues(formValues),
      cargoReeferFormApi.setValues(formValues),
    ]);

    refreshEntrustReadonlyInfo(formValues);
    headerCodeSourceSelectedItems.value = toSelectedItems(
      to?.codeSourceId,
      resolveCodeSourceName(to),
    );
    headerOrgSelectedItems.value = detail.orgs?.length
      ? [
          {
            value: Number(detail.orgId),
            label: detail.orgs.map((org) => org?.name).join('、'),
          },
        ]
      : [];
    await syncBasicInfoHeaderFields();

    await whenOrderUserRolesReady();
    initializeOrderUsersPanel(to?.orderUsers ?? []);
    bindLinkages();
    refreshPortLabelTargets();
    await syncFormSnapshot();
    return detail;
  } finally {
    pageLoading.value = false;
    await nextTick();
    netWeightAutoSyncSuspended.value = false;
  }
};

const { submitting, handleSubmit, syncFormSnapshot, isFormDirty } =
  useSeaImportSubmit({
    formApis: [
      basicInfoFormApi,
      partyInfoFormApi,
      shipmentFormApi,
      portFormApi,
      cargoTypeInlineFormApi,
      cargoRemarkFormApi,
      cargoMainFormApi,
      cargoMetricsFormApi,
      cargoDgFormApi,
      cargoReeferFormApi,
    ],
    collectCurrentFormValues,
    orderCtns,
    isEdit,
    editId,
    transportOrderId,
    validateSalesRoleCount: validateOrderUsers,
    validateOrderCtns,
    loadEditData,
    onSaved: (detail) => emit('saved', detail),
    closeTabByKey,
    getCurrentTabKey: () => route.fullPath,
    router,
  });

const submitBasicInfo = async () => {
  if (isOrderReadonly.value) return;
  await handleSubmit();
};

const confirmTerminalSchedule = async (item: TerminalScheduleItem) => {
  terminalSchedulePickerOpen.value = false;
  terminalScheduleApplying.value = true;
  try {
    const patch = buildTerminalScheduleFormPatch(
      item,
      terminalScheduleQueryInfo.value.bizType,
    );
    if (patch.innerVoyno) {
      await basicInfoFormApi.setFieldValue('innerVoyno', patch.innerVoyno);
    }
    await submitBasicInfo();
  } finally {
    terminalScheduleApplying.value = false;
  }
};

const { copying: copyingSeaImport, copyFrom } = useSeaImportCopy({
  checkDirty: isFormDirty,
});

/** 海运进口全品牌走新服务商运踪；仅编辑态可单票订阅 */
const { ResultModal, subscribe, subscribing } = useContainerTrackingSubscribe(
  FeituoTrackingAdminApi.TrackingBizType.SeaImport,
);

/** 运踪订阅状态（随详情返回，订阅后重新加载详情刷新） */
const trackingSubscribed = ref(false);
const trackingSubscribeSuccess = ref(false);
/** 已成功订阅的票不再重复订阅（需要强制重订走运踪 Tab） */
const trackingSubscribeDisabled = computed(
  () => trackingSubscribed.value && trackingSubscribeSuccess.value,
);
const trackingSubscribeButtonText = computed(() =>
  trackingSubscribed.value && !trackingSubscribeSuccess.value
    ? $t('tracking.detail.resubscribe')
    : $t('tracking.subscribe'),
);

const handleSubscribeTracking = async () => {
  if (!isEdit.value || !editId.value || trackingSubscribeDisabled.value) {
    return;
  }
  const basicValues = await basicInfoFormApi.getValues();
  await subscribe([
    {
      id: editId.value,
      orderLabel:
        entrustReadonlyInfo.value.commissionNum ||
        String(basicValues.mblNum ?? '') ||
        editId.value,
    },
  ]);
  await loadEditData();
};

const { aiRecognizing, recognizeAiFile } = useSeaImportAiRecognize({
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
  syncBasicInfoHeaderFields,
  recalcDerivedDates,
  setCodePackageSelectedItems: (items) => {
    codePackageSelectedItems.value = items;
  },
});

const aiExtractModalOpen = ref(false);
const handleAiRecognize = () => {
  if (isOrderReadonly.value || aiRecognizing.value) return;
  aiExtractModalOpen.value = true;
};
const handleAiExtractFile = async (file: File) => {
  const ok = await recognizeAiFile(file);
  if (ok) aiExtractModalOpen.value = false;
};

const handleCopySeaImport = async () => {
  if (!editId.value) return;
  await copyFrom({
    id: editId.value,
    commissionNum: entrustReadonlyInfo.value.commissionNum,
  });
};

/** 编辑态按最新规则重新生成委托编号，原编号不可恢复 */
const regeneratingCommissionNum = ref(false);
const canRegenerateCommissionNum = computed(
  () =>
    isEdit.value &&
    !!editId.value &&
    hasAccessByCodes([perm.edit]) &&
    detailIsEditable.value,
);
const handleRegenerateCommissionNum = () => {
  if (!canRegenerateCommissionNum.value || regeneratingCommissionNum.value) {
    return;
  }
  Modal.confirm({
    title: $t('seaImport.import.regenerateCommissionNum'),
    content: $t('seaImport.import.regenerateCommissionNumConfirm'),
    okText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
    async onOk() {
      regeneratingCommissionNum.value = true;
      try {
        const next = await updateSeaImportCommissionNum(editId.value!);
        const resolved =
          typeof next === 'string' ? next : String((next as any)?.result ?? '');
        if (resolved) {
          entrustReadonlyInfo.value = {
            ...entrustReadonlyInfo.value,
            commissionNum: resolved,
          };
          await basicInfoFormApi.setValues({ commissionNum: resolved });
        }
        message.success($t('seaImport.import.regenerateCommissionNumSuccess'));
      } finally {
        regeneratingCommissionNum.value = false;
      }
    },
  });
};

const scrollToSection = (key: SectionKey) => {
  sectionRefs[key].value?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
  emit('sectionChange', key);
};

/** 唛头 / 货描高度跟件重尺（含体积 CBM）底对齐 */
const cargoMainLayoutLeftRef = ref<HTMLElement | null>(null);
const cargoMainLayoutRightRef = ref<HTMLElement | null>(null);
const cargoMainLayoutRemarkRef = ref<HTMLElement | null>(null);
let cargoLayoutResizeObserver: null | ResizeObserver = null;
let lastCargoLayoutSyncHeight = 0;
let cargoLayoutSyncing = false;

const applyCargoTextareaHeights = (
  container: HTMLElement | null,
  targetHeight: number,
) => {
  if (!container || targetHeight <= 0) return;

  for (const textarea of Array.from(
    container.querySelectorAll<HTMLTextAreaElement>('textarea.ant-input'),
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
    const remarkEl = cargoMainLayoutRemarkRef.value;
    if (remarkEl) {
      remarkEl.style.minHeight = `${targetHeight}px`;
    }
    requestAnimationFrame(() => {
      applyCargoTextareaHeights(leftEl, targetHeight);
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

useUnsavedGuard({
  isDirty: isFormDirty,
  enabled: () => !props.embedded,
});

defineExpose({ scrollToSection, isFormDirty });

onMounted(async () => {
  if (isEdit.value) {
    await loadEditData();
  } else {
    refreshEntrustReadonlyInfo({});
    await whenOrderUserRolesReady();
    initializeOrderUsersPanel(undefined, { fillCurrentUser: true });
    bindLinkages();
    refreshPortLabelTargets();
    await syncBasicInfoHeaderFields();
    await syncFormSnapshot();
  }
  scheduleCargoMainLayoutHeightSync();
  window.addEventListener('resize', syncCargoMainLayoutHeight);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncCargoMainLayoutHeight);
  cargoLayoutResizeObserver?.disconnect();
  cargoLayoutResizeObserver = null;
});

watch(pageLoading, (loading) => {
  if (!loading) {
    scheduleCargoMainLayoutHeightSync();
  }
});
</script>

<template>
  <component :is="pageWrapperTag" v-bind="pageWrapperProps">
    <Spin :spinning="pageLoading">
      <div
        class="sea-import-form-page"
        :class="{ 'is-order-readonly': isOrderReadonly }"
      >
        <div class="main-layout">
          <!-- 中间主表单 -->
          <div class="center-column">
            <div class="content-column">
              <section :ref="sectionRefs.basic" class="content-section">
                <div class="content-section__actions">
                  <div class="content-section__actions-left"></div>
                  <Space class="content-section__actions-right">
                    <Button
                      size="small"
                      class="flex items-center justify-center"
                      :loading="aiRecognizing"
                      :disabled="isOrderReadonly"
                      @click="handleAiRecognize"
                    >
                      <IconifyIcon
                        icon="mdi:robot-outline"
                        class="mr-1 inline-block size-3.5 align-middle"
                      />
                      <span class="align-middle">AI识别</span>
                    </Button>
                    <template v-if="isEdit">
                      <span
                        v-access:code="externalApiUseCode"
                        class="inline-flex items-center gap-1"
                      >
                        <Tooltip
                          :title="
                            trackingSubscribeDisabled
                              ? $t('tracking.alreadySubscribed')
                              : ''
                          "
                        >
                          <Button
                            size="small"
                            class="flex items-center justify-center"
                            :loading="subscribing"
                            :disabled="trackingSubscribeDisabled"
                            @click="handleSubscribeTracking"
                          >
                            <IconifyIcon
                              icon="mdi:radar"
                              class="mr-1 inline-block size-3.5 align-middle"
                            />
                            <span class="align-middle">{{
                              trackingSubscribeButtonText
                            }}</span>
                          </Button>
                        </Tooltip>
                        <Tooltip>
                          <template #title>
                            <div class="whitespace-pre-line text-left">
                              {{ $t('tracking.subscribeRules.seaImport') }}
                            </div>
                          </template>
                          <IconifyIcon
                            icon="ant-design:question-circle-outlined"
                            class="size-3.5 cursor-help text-[rgba(0,0,0,0.45)]"
                            :aria-label="$t('tracking.subscribeRulesTitle')"
                          />
                        </Tooltip>
                      </span>
                    </template>
                    <template v-if="isEdit && isOrderReadonly">
                      <Button
                        v-access:code="perm.add"
                        size="small"
                        class="flex items-center justify-center"
                        :loading="copyingSeaImport"
                        @click="handleCopySeaImport"
                      >
                        <Copy class="mr-1 inline-block size-3.5 align-middle" />
                        <span class="align-middle">
                          {{ $t('seaImport.import.copy') }}
                        </span>
                      </Button>
                      <Button
                        type="primary"
                        size="small"
                        disabled
                        class="sea-import-save-btn"
                      >
                        <Save class="sea-import-save-dropdown__icon" />
                        <span>{{ $t('common.save') }}</span>
                      </Button>
                    </template>
                    <DropdownButton
                      v-else-if="isEdit"
                      type="primary"
                      size="small"
                      :loading="submitting"
                      :trigger="['hover']"
                      class="sea-import-save-dropdown"
                      @click="submitBasicInfo"
                    >
                      <Save class="sea-import-save-dropdown__icon" />
                      <span>{{ $t('common.save') }}</span>
                      <template #overlay>
                        <Menu>
                          <MenuItem
                            v-access:code="perm.add"
                            :disabled="copyingSeaImport"
                            @click="handleCopySeaImport"
                          >
                            <Copy
                              class="mr-1 inline-block size-3.5 align-middle"
                            />
                            <span class="align-middle">
                              {{ $t('seaImport.import.copy') }}
                            </span>
                          </MenuItem>
                        </Menu>
                      </template>
                    </DropdownButton>
                    <Button
                      v-else
                      type="primary"
                      size="small"
                      :loading="submitting"
                      class="sea-import-save-btn"
                      @click="submitBasicInfo"
                    >
                      <Save class="sea-import-save-dropdown__icon" />
                      <span>{{ $t('common.save') }}</span>
                    </Button>
                  </Space>
                </div>
                <div
                  class="content-section__header section-title-bar basic-info-header"
                >
                  <span class="card-title card-title--on-primary">
                    <FileText class="size-4" />
                    {{ $t('seaImport.import.formCardBasicInfo') }}
                  </span>
                  <div class="basic-info-header__meta">
                    <div class="basic-info-header__item">
                      <span class="basic-info-header__label">
                        {{ $t('seaImport.import.commissionNum') }}
                      </span>
                      <span class="basic-info-header__value">
                        {{ entrustReadonlyInfo.commissionNum || '-' }}
                      </span>
                      <Tooltip
                        v-if="canRegenerateCommissionNum"
                        :title="$t('seaImport.import.regenerateCommissionNum')"
                      >
                        <Button
                          type="text"
                          size="small"
                          class="basic-info-header__icon-btn"
                          :loading="regeneratingCommissionNum"
                          @click="handleRegenerateCommissionNum"
                        >
                          <IconifyIcon
                            v-if="!regeneratingCommissionNum"
                            icon="mdi:refresh"
                            class="size-3.5"
                          />
                        </Button>
                      </Tooltip>
                    </div>
                    <div class="basic-info-header__item">
                      <span class="basic-info-header__label">会计期间</span>
                      <span class="basic-info-header__value">
                        {{ entrustReadonlyInfo.accountDateText || '-' }}
                      </span>
                    </div>
                    <div class="basic-info-header__item">
                      <span class="basic-info-header__label">应结日期</span>
                      <span class="basic-info-header__value">
                        {{ entrustReadonlyInfo.settlementDateText || '-' }}
                      </span>
                    </div>
                    <div
                      class="basic-info-header__item basic-info-header__item--select"
                    >
                      <span class="basic-info-header__label">归属组织</span>
                      <UserOrgSelect
                        :model-value="headerOrgId"
                        :user-id="salesUserId"
                        :selected-items="headerOrgSelectedItems"
                        :auto-default="true"
                        allow-clear
                        size="small"
                        :disabled="isOrderReadonly"
                        class="basic-info-header__select basic-info-header__select--org"
                        :placeholder="$t('ui.placeholder.select')"
                        @update:model-value="handleHeaderOrgChange"
                      />
                    </div>
                    <div
                      class="basic-info-header__item basic-info-header__item--select"
                    >
                      <span class="basic-info-header__label">
                        {{ $t('seaImport.import.codeSourceId') }}
                      </span>
                      <CodeSourceSelect
                        :model-value="headerCodeSourceId"
                        :selected-items="headerCodeSourceSelectedItems"
                        allow-clear
                        size="small"
                        :disabled="isOrderReadonly"
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
                  <div
                    class="sea-import-party-collapse"
                    role="button"
                    tabindex="0"
                    @click="partyExpanded = !partyExpanded"
                    @keydown.enter.prevent="partyExpanded = !partyExpanded"
                    @keydown.space.prevent="partyExpanded = !partyExpanded"
                  >
                    <span>收发通</span>
                    <IconifyIcon
                      icon="mdi:chevron-up"
                      class="sea-import-party-collapse__chevron"
                      :class="{
                        'sea-import-party-collapse__chevron--closed':
                          !partyExpanded,
                      }"
                    />
                  </div>
                  <div
                    v-show="partyExpanded"
                    class="sea-import-party-collapse__content"
                  >
                    <PartyInfoForm />
                  </div>
                </div>
              </section>

              <section :ref="sectionRefs.shipment" class="content-section">
                <div
                  class="content-section__header section-title-bar shipment-info-header"
                >
                  <span class="card-title card-title--on-primary">
                    <Ship class="size-4" />
                    {{ $t('seaImport.import.formCardShipment') }}
                  </span>
                  <div
                    class="basic-info-header__item basic-info-header__item--select"
                  >
                    <span class="basic-info-header__label">
                      {{ $t('seaImport.import.freeDays') }}
                    </span>
                    <InputNumber
                      :value="headerFreeDays"
                      :min="0"
                      :controls="false"
                      :precision="0"
                      size="small"
                      :disabled="isOrderReadonly"
                      class="shipment-info-header__free-days"
                      :addon-after="$t('seaImport.import.freeDaysUnit')"
                      @update:value="
                        (v) => handleHeaderFreeDaysChange(v as number)
                      "
                    />
                  </div>
                </div>
                <div class="content-section__body">
                  <div class="shipment-flow-container">
                    <ShipmentForm />
                  </div>
                </div>
              </section>

              <section :ref="sectionRefs.port" class="content-section">
                <div class="content-section__header section-title-bar">
                  <span class="card-title card-title--on-primary">
                    <MapPin class="size-4" />
                    {{ $t('seaImport.import.formCardPort') }}
                  </span>
                </div>
                <div class="content-section__body">
                  <PortForm />
                  <Teleport v-if="polPortLabelTarget" :to="polPortLabelTarget">
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
                      {{ $t('seaImport.import.formCardCargo') }}
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
                  <div
                    ref="cargoMainLayoutRemarkRef"
                    class="cargo-main-layout__remark"
                    :data-remark-tab="remarkTab"
                  >
                    <div class="cargo-remark-tabs" role="tablist">
                      <span
                        class="cargo-remark-tabs__active-border"
                        :class="`cargo-remark-tabs__active-border--${remarkTab}`"
                        aria-hidden="true"
                      />
                      <button
                        v-for="item in remarkTabItems"
                        :key="item.key"
                        type="button"
                        role="tab"
                        class="cargo-remark-tabs__item"
                        :class="{ 'is-active': remarkTab === item.key }"
                        :aria-selected="remarkTab === item.key"
                        @click="remarkTab = item.key"
                      >
                        {{ item.label }}
                      </button>
                    </div>
                    <CargoRemarkForm />
                  </div>
                </div>
                <div v-show="showDgFields" class="cargo-extension-section">
                  <div class="cargo-extension-section__title">
                    {{ $t('seaImport.import.formCardDg') }}
                  </div>
                  <CargoDgForm />
                </div>
                <div v-show="showReeferFields" class="cargo-extension-section">
                  <div class="cargo-extension-section__title">
                    {{ $t('seaImport.import.formCardReefer') }}
                  </div>
                  <CargoReeferForm />
                </div>
                <div class="cargo-ctn-section">
                  <OrderCtnTable v-model="orderCtns" />
                </div>
              </Card>
            </section>
          </div>

          <!-- 右侧快捷区 -->
          <div class="right-column">
            <Card class="right-column__card">
              <template #title>
                <span class="card-title">
                  {{ $t('seaImport.import.orderUsers') }}
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
                                  组织：{{
                                    getOrderUserDetailText(
                                      getOrderUserOrgText(row.userId),
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
                                <span>
                                  {{ getOrderUserRoleLabel(row.userAttribute) }}
                                </span>
                              </div>
                              <div class="order-user-detail-card__info-item">
                                <span>手机</span>
                                <span>
                                  {{
                                    getOrderUserDetailText(
                                      getOrderUserDetail(row.userId)
                                        ?.phoneNumber,
                                    )
                                  }}
                                </span>
                              </div>
                              <div class="order-user-detail-card__info-item">
                                <span>邮箱</span>
                                <span>
                                  {{
                                    getOrderUserDetailText(
                                      getOrderUserDetail(row.userId)
                                        ?.emailAddress,
                                    )
                                  }}
                                </span>
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
                      :company-ids="orderUserCompanyIds"
                      label-key="nickName"
                      :selected-items="getOrderUserSelectedItems(row)"
                      :placeholder="
                        $t('seaImport.import.pleaseSelectOrderUser')
                      "
                      size="small"
                      allow-clear
                      class="order-user-panel__select"
                      @update:model-value="
                        (v) => updateOrderUser(row._rowKey, v as number)
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
    <AiExtractUploadModal
      v-model:open="aiExtractModalOpen"
      :recognizing="aiRecognizing"
      @file="handleAiExtractFile"
    />
    <TerminalSchedulePickerModal
      v-model:open="terminalSchedulePickerOpen"
      :items="terminalScheduleItems"
      :loading="terminalScheduleSyncing"
      :query-info="terminalScheduleQueryInfo"
      @confirm="confirmTerminalSchedule"
    />
    <ResultModal />
  </component>
</template>

<style scoped src="./form.css"></style>
