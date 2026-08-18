<script lang="ts" setup>
import type { AirExportAdminApi } from '#/api/air-export/air-export-admin';

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
import { Copy, FileText, IconifyIcon, Package, Save } from '@vben/icons';
import { useUserStore } from '@vben/stores';

import dayjs from 'dayjs';

import {
  Avatar,
  Button,
  Card,
  Dropdown,
  Menu,
  MenuItem,
  message,
  Modal,
  Popover,
  Radio,
  Space,
  Spin,
  Switch,
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
  getAirExportDetail,
  updateAirExportCommissionNum,
} from '#/api/air-export/air-export-admin';
import { $t } from '#/locales';
import { createAbpPermission } from '#/utils/abp-permission';
import { useAllUserOrg } from '#/composables/use-all-user-org';
import { resolveOrderUserCompanyIds } from '#/composables/use-my-org';

import {
  AIR_LEG_HEADER_FIELD_NAMES,
  CARGO_TYPE,
  createEmptyDgValues,
  createEmptyReeferValues,
  formatAirPortRemark,
  getInputTypeOptions,
  pickAirPortSelectOption,
  useAirLegFormSchema,
  useBasicInfoFormSchema,
  useCargoFormSchema,
  useDateFormSchema,
  useDgFormSchema,
  usePartyInfoFormSchema,
  useReeferFormSchema,
} from '../data';
import AirExportOrderCtnTable from '../modules/air-export-order-ctn-table.vue';
import { useAirExportCopy } from '../use-air-export-copy';
import { useAirTrackingSubscribe } from '#/components/tracking';
import AiExtractUploadModal from './ai-extract-upload-modal.vue';
import {
  calcBubbleRatio,
  flattenDetail,
  normalizeOrderCtnsWithRowKey,
  toAirPortSelectedItems,
  toSelectedItems,
} from './air-export-detail-mapper';
import { useAirExportAiRecognize } from './use-air-export-ai-recognize';
import { useAirExportSubmit } from './use-air-export-submit';
import { useOrderUsers } from './use-order-users';

type SectionKey = 'basic' | 'cargo' | 'date' | 'leg' | 'party';

const DropdownButton = Dropdown.Button;

defineOptions({ name: 'AirExportAdminForm' });

const props = withDefaults(defineProps<{ embedded?: boolean }>(), {
  embedded: false,
});

const emit = defineEmits<{
  sectionChange: [key: SectionKey];
  /** 编辑保存成功：上抛最新详情 DTO，供编辑工作台联动费用等 Tab */
  saved: [detail: AirExportAdminApi.AirExportDto];
}>();

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const { closeTabByKey } = useTabs();
const perm = createAbpPermission('Admin.AirExport');
const externalApiUseCode = 'Admin.ExternalApi.Use';

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

const currentUserId = computed<number | undefined>(() => {
  const parsed = Number(userStore.userInfo?.userId);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
});

const pageLoading = ref(false);
const transportOrderId = ref<string | undefined>();
const orderCtns = ref<any[]>([]);
/** 收发通区块可折叠，默认展开（对齐海运进口） */
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
const METRICS_FORM_LABEL_CLASS = 'leading-[24px] mb-0 shrink-0';

/** 只读信息挪到基础信息区块头部展示，不占表单栅格 */
const BASIC_INFO_HEADER_READONLY_FIELD_NAMES = [
  'commissionNum',
  'accountDate',
  'settlementDate',
] as const;
/** 头部内联下拉：表单里仍保留隐藏项承载取值与校验 */
const BASIC_INFO_HEADER_SELECT_FIELD_NAMES = ['orgId', 'codeSourceId'] as const;
const BASIC_INFO_FIELD_ORDER = [
  'clientId',
  'mblNum',
  'contractNum',
  'codeServiceId',
  'teamId',
  'custBrokerId',
  'warehouseId',
  'insuranceId',
] as const;
const BASIC_INFO_FIELD_ORDER_MAP = new Map(
  BASIC_INFO_FIELD_ORDER.map((fieldName, index) => [fieldName, index]),
);

/** 中间表单：基础信息 */
const [BasicInfoForm, basicInfoFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  commonConfig: {
    labelClass: VERTICAL_FORM_LABEL_CLASS,
  },
  schema: useBasicInfoFormSchema(isEdit.value)
    .filter(
      (item) =>
        !(BASIC_INFO_HEADER_READONLY_FIELD_NAMES as readonly string[]).includes(
          item.fieldName,
        ) && item.fieldName !== 'cargoId',
    )
    .map((item) => ({
      ...item,
      formItemClass: (
        BASIC_INFO_HEADER_SELECT_FIELD_NAMES as readonly string[]
      ).includes(item.fieldName)
        ? 'hidden'
        : item.formItemClass,
    }))
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

/** 日期区块：货好 → 送仓 → 报关 → 起飞 → 实际起飞 → 预抵 */
const [DateForm, dateFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  commonConfig: {
    labelClass: VERTICAL_FORM_LABEL_CLASS,
  },
  schema: mapSchemaWithSmallSize(useDateFormSchema()),
  showDefaultActions: false,
  wrapperClass: 'shipment-flow-wrap form-controls-small grid-cols-6 gap-x-8',
});

/** 选中空港后回填备注为英文名称，用户仍可手改 */
const syncAirPortRemark = async (fieldName: string, option: unknown) => {
  const remarkField =
    fieldName === 'polId'
      ? 'polRemark'
      : fieldName === 'potId'
        ? 'potRemark'
        : 'podRemark';
  const remark = formatAirPortRemark(pickAirPortSelectOption(option)?.raw);
  await airLegFormApi.setValues({ [remarkField]: remark });
};

const isAirLegHeaderField = (fieldName: string) =>
  (AIR_LEG_HEADER_FIELD_NAMES as readonly string[]).includes(fieldName);

const airLegSchema = useAirLegFormSchema({
  onAirPortChange: (fieldName, _value, option) => {
    void syncAirPortRemark(fieldName, option);
  },
});

/** 航段区块：起运地 → 中转地 → 目的地 */
const [AirLegForm, airLegFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  commonConfig: {
    labelClass: VERTICAL_FORM_LABEL_CLASS,
  },
  schema: airLegSchema
    .filter((item) => !isAirLegHeaderField(item.fieldName))
    .map((item) =>
      String(item.formItemClass ?? '').includes('port-flow-remark')
        ? item
        : {
            ...item,
            componentProps: withSmallComponentProps(item.componentProps),
          },
    ),
  showDefaultActions: false,
  wrapperClass: 'port-flow-wrap form-controls-small grid-cols-3 gap-x-8',
});

/** 航段标题栏：航班 + 订舱代理 */
const [AirLegHeaderForm, airLegHeaderFormApi] = useVbenForm({
  layout: 'horizontal',
  compact: true,
  commonConfig: {
    labelWidth: 64,
    labelClass: 'mb-0 shrink-0',
  },
  schema: mapSchemaWithSmallSize(
    airLegSchema.filter((item) => isAirLegHeaderField(item.fieldName)),
  ),
  showDefaultActions: false,
  wrapperClass:
    'flight-info-header-wrap form-controls-small grid-cols-[196px_minmax(220px,1fr)]',
});

const cargoSchema = useCargoFormSchema();
const cargoType = ref<number | undefined>();
const cargoInlineFieldNames = new Set(['cargoId', 'orderCodeGoodss']);
const cargoMainFieldNames = new Set(['marks', 'goodsDes']);
const cargoMetricsFieldNames = new Set([
  'pkgs',
  'codePackageId',
  'kgs',
  'cbm',
  'bubbleRatio',
]);
const cargoRemarkFieldNames = new Set(['internalRemark', 'remark']);
type RemarkTab = 'internalRemark' | 'remark';
const remarkTab = ref<RemarkTab>('internalRemark');
const remarkTabItems: Array<{ key: RemarkTab; label: string }> = [
  { key: 'internalRemark', label: $t('airExport.export.internalRemark') },
  { key: 'remark', label: $t('airExport.export.externalRemark') },
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
        maxlength: 1024,
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

/** 货物信息右栏：件数/包装 / 毛重 / 体积 / 泡比 */
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
  handleValuesChange: (values, fieldsChanged) => {
    if (!fieldsChanged.includes('kgs') && !fieldsChanged.includes('cbm')) {
      return;
    }
    // 泡比 = 毛重 ÷ 体积；算不出来清空（不要写 0），后端不会替你重算
    void cargoMetricsFormApi.setFieldValue(
      'bubbleRatio',
      calcBubbleRatio(values.kgs, values.cbm),
    );
  },
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
  accountDateText: '-',
  settlementDateText: '-',
  inputType: undefined as number | undefined,
});

/**
 * 业务锁定没有对应的 schema 字段，用独立状态承载。
 * 编辑时必须把详情里的值带回提交，否则保存会把已锁定的票悄悄解锁。
 */
const businessLocking = ref(false);

const inputTypeLabel = computed(() => {
  const hit = getInputTypeOptions().find(
    (item) => item.value === entrustReadonlyInfo.value.inputType,
  );
  return hit?.label ?? '';
});

const refreshEntrustReadonlyInfo = (values: Record<string, any>) => {
  entrustReadonlyInfo.value = {
    commissionNum: values.commissionNum ?? '',
    accountDateText: values.accountDate
      ? dayjs(values.accountDate).format('YYYY-MM')
      : '-',
    settlementDateText: values.settlementDate
      ? dayjs(values.settlementDate).format('YYYY-MM-DD')
      : '-',
    inputType: values.inputType ?? undefined,
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
  const basic = await basicInfoFormApi.getValues();
  if (seqAtStart === headerOrgWriteSeq) {
    headerOrgId.value = basic.orgId ?? undefined;
  }
  headerCodeSourceId.value = basic.codeSourceId;
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

/**
 * 换销售后清空回显兜底项；归属组织的清空/默认带出由 UserOrgSelect
 *（clearOnUserChange + autoDefault）统一处理，勿在此异步清 orgId，以免与 autoDefault 竞态。
 */
watch(salesUserId, (nextSalesUserId, prevSalesUserId) => {
  if (nextSalesUserId === prevSalesUserId) return;
  headerOrgSelectedItems.value = [];
});

const sectionRefs = {
  basic: ref<HTMLElement | null>(null),
  party: ref<HTMLElement | null>(null),
  date: ref<HTMLElement | null>(null),
  leg: ref<HTMLElement | null>(null),
  cargo: ref<HTMLElement | null>(null),
} as const;

const collectCurrentFormValues = async (): Promise<Record<string, any>> => {
  const [
    basic,
    party,
    date,
    leg,
    legHeader,
    type,
    remark,
    main,
    metrics,
    dg,
    reefer,
  ] = await Promise.all([
    basicInfoFormApi.getValues(),
    partyInfoFormApi.getValues(),
    dateFormApi.getValues(),
    airLegFormApi.getValues(),
    airLegHeaderFormApi.getValues(),
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
    ...date,
    ...leg,
    ...legHeader,
    ...type,
    ...remark,
    ...main,
    ...metrics,
    ...dg,
    ...reefer,
    commissionNum: entrustReadonlyInfo.value.commissionNum,
    isBusinessLocking: businessLocking.value,
    orderUsers: orderUserRows.value,
  };
};

const validateOrderUsers = () =>
  validateSalesRoleCount() && validateRequiredOrderUserAssignee();

const loadEditData = async (): Promise<
  AirExportAdminApi.AirExportDto | undefined
> => {
  if (!editId.value) {
    return undefined;
  }
  pageLoading.value = true;
  try {
    const detail = await getAirExportDetail(editId.value);
    const to = detail.transportOrder;
    transportOrderId.value = to?.id;
    trackingSubscribed.value = detail.isFeituoSubscribed ?? false;
    trackingSubscribeSuccess.value = detail.isFeituoSubscribeSuccess ?? false;
    const formValues = flattenDetail(detail);
    cargoType.value = to?.cargoId ?? undefined;
    orderCtns.value = normalizeOrderCtnsWithRowKey(detail.airExportOrderCtns);

    // 各下拉的回显项直接由详情对象构造，避免每个 select 再各自打一次详情接口
    basicInfoFormApi.updateSchema([
      {
        fieldName: 'clientId',
        componentProps: {
          selectedItems: toSelectedItems(to?.clientId, to?.client?.name),
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
    airLegFormApi.updateSchema([
      {
        fieldName: 'polId',
        componentProps: {
          selectedItems: toAirPortSelectedItems(detail.pol),
        },
      },
      {
        fieldName: 'potId',
        componentProps: {
          selectedItems: toAirPortSelectedItems(detail.pot),
        },
      },
      {
        fieldName: 'podId',
        componentProps: {
          selectedItems: toAirPortSelectedItems(detail.pod),
        },
      },
    ]);
    airLegHeaderFormApi.updateSchema([
      {
        fieldName: 'bookingAgentId',
        componentProps: {
          selectedItems: toSelectedItems(
            detail.bookingAgentId,
            detail.bookingAgent?.name,
          ),
        },
      },
    ]);
    codePackageSelectedItems.value = toSelectedItems(
      to?.codePackageId,
      to?.codePackage?.name,
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
            name: item.codeGoods?.name,
            hsCode: item.codeGoods?.hsCode,
          })),
        },
      },
    ]);

    await Promise.all([
      basicInfoFormApi.setValues(formValues),
      partyInfoFormApi.setValues(formValues),
      dateFormApi.setValues(formValues),
      airLegFormApi.setValues(formValues),
      airLegHeaderFormApi.setValues(formValues),
      cargoTypeInlineFormApi.setValues(formValues),
      cargoRemarkFormApi.setValues(formValues),
      cargoMainFormApi.setValues(formValues),
      cargoMetricsFormApi.setValues(formValues),
      cargoDgFormApi.setValues(formValues),
      cargoReeferFormApi.setValues(formValues),
    ]);

    refreshEntrustReadonlyInfo(formValues);
    businessLocking.value = !!formValues.isBusinessLocking;
    headerCodeSourceSelectedItems.value = toSelectedItems(
      to?.codeSourceId,
      to?.codeSource?.cnName,
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
    await syncFormSnapshot();
    return detail;
  } finally {
    pageLoading.value = false;
  }
};

const { submitting, handleSubmit, syncFormSnapshot, isFormDirty } =
  useAirExportSubmit({
    formApis: [
      basicInfoFormApi,
      partyInfoFormApi,
      dateFormApi,
      airLegFormApi,
      airLegHeaderFormApi,
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
    validateOrderUsers,
    loadEditData,
    onSaved: (detail) => emit('saved', detail),
    closeTabByKey,
    getCurrentTabKey: () => route.fullPath,
    router,
  });

const { copying: copyingAirExport, copyFrom } = useAirExportCopy({
  checkDirty: isFormDirty,
});

const { aiRecognizing, recognizeAiFile } = useAirExportAiRecognize({
  formApis: {
    party: partyInfoFormApi,
    basic: basicInfoFormApi,
    date: dateFormApi,
    airLeg: airLegFormApi,
    airLegHeader: airLegHeaderFormApi,
    cargoTypeInline: cargoTypeInlineFormApi,
    cargoMain: cargoMainFormApi,
    cargoMetrics: cargoMetricsFormApi,
    cargoRemark: cargoRemarkFormApi,
    cargoDg: cargoDgFormApi,
    cargoReefer: cargoReeferFormApi,
  },
  orderCtns,
  syncBasicInfoHeaderFields,
  setCodePackageSelectedItems: (items) => {
    codePackageSelectedItems.value = items;
  },
  onAirPortChange: (fieldName, _value, option) => {
    void syncAirPortRemark(fieldName, option);
  },
});

const aiExtractModalOpen = ref(false);
const handleAiRecognize = () => {
  if (aiRecognizing.value) return;
  aiExtractModalOpen.value = true;
};
const handleAiExtractFile = async (file: File) => {
  const ok = await recognizeAiFile(file);
  if (ok) aiExtractModalOpen.value = false;
};

const handleCopyAirExport = async () => {
  if (!editId.value) return;
  await copyFrom({
    id: editId.value,
    commissionNum: entrustReadonlyInfo.value.commissionNum,
  });
};

const { ResultModal, subscribe, subscribing } = useAirTrackingSubscribe();

/** 运踪订阅状态（随详情返回，订阅后重新加载详情刷新） */
const trackingSubscribed = ref(false);
const trackingSubscribeSuccess = ref(false);
/** 已成功订阅的票不再重复订阅（需要强制重订走运踪 Tab 的「重新订阅」） */
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

/** 编辑态按最新规则重新生成委托编号，原编号不可恢复 */
const regeneratingCommissionNum = ref(false);
const canRegenerateCommissionNum = computed(() => isEdit.value);
const handleRegenerateCommissionNum = () => {
  if (!canRegenerateCommissionNum.value || regeneratingCommissionNum.value) {
    return;
  }
  Modal.confirm({
    title: $t('airExport.export.regenerateCommissionNum'),
    content: $t('airExport.export.regenerateCommissionNumConfirm'),
    okText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
    async onOk() {
      regeneratingCommissionNum.value = true;
      try {
        const next = await updateAirExportCommissionNum(editId.value!);
        const resolved =
          typeof next === 'string' ? next : String((next as any)?.result ?? '');
        if (resolved) {
          entrustReadonlyInfo.value = {
            ...entrustReadonlyInfo.value,
            commissionNum: resolved,
          };
          await basicInfoFormApi.setValues({ commissionNum: resolved });
        }
        message.success($t('airExport.export.regenerateCommissionNumSuccess'));
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

/** 唛头 / 货描 / 备注高度跟件重尺（含泡比）底对齐 */
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

defineExpose({ scrollToSection, isFormDirty });

onMounted(async () => {
  if (isEdit.value) {
    await loadEditData();
  } else {
    refreshEntrustReadonlyInfo({ inputType: 0 });
    await whenOrderUserRolesReady();
    initializeOrderUsersPanel(undefined, { fillCurrentUser: true });
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
      <div class="air-export-form-page">
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
                              {{ $t('tracking.subscribeRules.airExport') }}
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
                    <DropdownButton
                      v-if="isEdit"
                      type="primary"
                      size="small"
                      :loading="submitting"
                      :trigger="['hover']"
                      class="air-export-save-dropdown"
                      @click="handleSubmit"
                    >
                      <Save class="mr-1 inline-block size-3.5 align-middle" />
                      <span class="align-middle">{{ $t('common.save') }}</span>
                      <template #overlay>
                        <Menu>
                          <MenuItem
                            v-access:code="perm.add"
                            :disabled="copyingAirExport"
                            @click="handleCopyAirExport"
                          >
                            <Copy
                              class="mr-1 inline-block size-3.5 align-middle"
                            />
                            <span class="align-middle">
                              {{ $t('airExport.export.copy') }}
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
                      class="flex items-center justify-center"
                      @click="handleSubmit"
                    >
                      <Save class="mr-1 inline-block size-3.5 align-middle" />
                      <span class="align-middle">{{ $t('common.save') }}</span>
                    </Button>
                  </Space>
                </div>
                <div
                  class="content-section__header section-title-bar basic-info-header"
                >
                  <span class="card-title card-title--on-primary">
                    <FileText class="size-4" />
                    {{ $t('airExport.export.formCardBasicInfo') }}
                  </span>
                  <div class="basic-info-header__meta">
                    <div class="basic-info-header__item">
                      <span class="basic-info-header__label">
                        {{ $t('airExport.export.commissionNum') }}
                      </span>
                      <span class="basic-info-header__value">
                        {{ entrustReadonlyInfo.commissionNum || '-' }}
                      </span>
                      <Tooltip
                        v-if="canRegenerateCommissionNum"
                        :title="$t('airExport.export.regenerateCommissionNum')"
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
                      <Tag v-if="inputTypeLabel" color="blue">
                        {{ inputTypeLabel }}
                      </Tag>
                    </div>
                    <div class="basic-info-header__item">
                      <span class="basic-info-header__label">
                        {{ $t('airExport.export.accountDate') }}
                      </span>
                      <span class="basic-info-header__value">
                        {{ entrustReadonlyInfo.accountDateText || '-' }}
                      </span>
                    </div>
                    <div class="basic-info-header__item">
                      <span class="basic-info-header__label">
                        {{ $t('airExport.export.settlementDate') }}
                      </span>
                      <span class="basic-info-header__value">
                        {{ entrustReadonlyInfo.settlementDateText || '-' }}
                      </span>
                    </div>
                    <div class="basic-info-header__item">
                      <span class="basic-info-header__label">
                        {{ $t('airExport.export.isBusinessLocking') }}
                      </span>
                      <Switch v-model:checked="businessLocking" size="small" />
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
                        class="basic-info-header__select basic-info-header__select--org"
                        :placeholder="$t('ui.placeholder.select')"
                        @update:model-value="handleHeaderOrgChange"
                      />
                    </div>
                    <div
                      class="basic-info-header__item basic-info-header__item--select"
                    >
                      <span class="basic-info-header__label">
                        {{ $t('airExport.export.codeSourceId') }}
                      </span>
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
                  <div
                    class="air-export-party-collapse"
                    role="button"
                    tabindex="0"
                    @click="partyExpanded = !partyExpanded"
                    @keydown.enter.prevent="partyExpanded = !partyExpanded"
                    @keydown.space.prevent="partyExpanded = !partyExpanded"
                  >
                    <span>收发通</span>
                    <IconifyIcon
                      icon="mdi:chevron-up"
                      class="air-export-party-collapse__chevron"
                      :class="{
                        'air-export-party-collapse__chevron--closed':
                          !partyExpanded,
                      }"
                    />
                  </div>
                  <div
                    v-show="partyExpanded"
                    class="air-export-party-collapse__content"
                  >
                    <PartyInfoForm />
                  </div>
                </div>
              </section>

              <section :ref="sectionRefs.leg" class="content-section">
                <div
                  class="content-section__header section-title-bar flight-info-header"
                >
                  <span class="card-title card-title--on-primary">
                    <IconifyIcon icon="mdi:airplane-takeoff" class="size-4" />
                    {{ $t('airExport.export.formCardFlight') }}
                  </span>
                  <div class="flight-info-header__fields">
                    <AirLegHeaderForm />
                  </div>
                </div>
                <div class="content-section__body">
                  <AirLegForm />
                </div>
              </section>

              <section :ref="sectionRefs.date" class="content-section">
                <div class="content-section__header section-title-bar">
                  <span class="card-title card-title--on-primary">
                    <IconifyIcon icon="mdi:calendar-range" class="size-4" />
                    {{ $t('airExport.export.formCardDate') }}
                  </span>
                </div>
                <div class="content-section__body">
                  <div class="shipment-flow-container">
                    <DateForm />
                  </div>
                </div>
              </section>
            </div>

            <section :ref="sectionRefs.cargo">
              <Card class="cargo-container-card">
                <template #title>
                  <div class="cargo-container-card__title section-title-bar">
                    <span class="card-title card-title--on-primary">
                      <Package class="size-4" />
                      {{ $t('airExport.export.formCardCargo') }}
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
                      ></span>
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
                    {{ $t('airExport.export.formCardDg') }}
                  </div>
                  <CargoDgForm />
                </div>
                <div v-show="showReeferFields" class="cargo-extension-section">
                  <div class="cargo-extension-section__title">
                    {{ $t('airExport.export.formCardReefer') }}
                  </div>
                  <CargoReeferForm />
                </div>
                <div class="cargo-ctn-section">
                  <AirExportOrderCtnTable v-model="orderCtns" />
                </div>
              </Card>
            </section>
          </div>

          <!-- 右侧快捷区 -->
          <div class="right-column">
            <Card class="right-column__card">
              <template #title>
                <span class="card-title">
                  {{ $t('airExport.export.orderUsers') }}
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
                        $t('airExport.export.pleaseSelectOrderUser')
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
    <ResultModal />
  </component>
</template>

<style scoped src="./form.css"></style>
