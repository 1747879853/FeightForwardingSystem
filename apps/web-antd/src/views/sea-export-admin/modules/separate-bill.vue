<script lang="ts" setup>
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';
import type { SeaExportSeparateAdminApi } from '#/api/sea-export/sea-export-separate-admin';

import { computed, onActivated, onMounted, ref, watch } from 'vue';

import {
  Button,
  Input,
  InputNumber,
  message,
  Modal,
  Space,
  Spin,
  Table,
  Tooltip,
} from 'ant-design-vue';

import ClientSelect from '#/adapter/component/biz-select/client-select.vue';
import CodeFrtSelect from '#/adapter/component/biz-select/code-frt-select.vue';
import CodeIssueTypeSelect from '#/adapter/component/biz-select/code-issue-type-select.vue';
import CodePackageSelect from '#/adapter/component/biz-select/code-package-select.vue';
import CodeServiceSelect from '#/adapter/component/biz-select/code-service-select.vue';
import CtnSelect from '#/adapter/component/biz-select/ctn-select.vue';
import { getSeaExportDetail } from '#/api/sea-export/sea-export-admin';
import {
  addSeparate,
  deleteSeparate,
  editSeparate,
  getSeparatePagedList,
} from '#/api/sea-export/sea-export-separate-admin';
import {
  PrintFormatBizType,
  PrintJsonType,
  usePrintFormat,
} from '#/components/print-format';
import { useKeepAliveRouteParamId } from '#/composables/use-keep-alive-route-param-id';
import { $t } from '#/locales';
import {
  WEIGHT_VOLUME_PRECISION,
  formatWeightVolume,
} from '#/utils/weight-volume-precision';

import addTabIcon from './assets/separate-bill-add.svg';

defineOptions({
  name: 'SeaExportSeparateBill',
});

/** 装箱编辑行：对象字段拍平为展示名，供表格内下拉回显 */
type CtnEditRow = Omit<
  SeaExportSeparateAdminApi.SeparateCtnDto,
  'codeGoods' | 'codePackage' | 'ctnCode'
> & {
  _rowKey: string;
  codeGoodsHSCode?: null | string;
  codeGoodsName?: null | string;
  codePackageName?: null | string;
  ctnCodeName?: null | string;
};

type PortSimple =
  | SeaExportAdminApi.PortCodeSimpleDtoForOrder
  | null
  | undefined;

const DRAFT_KEY = '__draft__';

const seaExportIdRef = useKeepAliveRouteParamId();
const seaExportId = computed(() => seaExportIdRef.value ?? '');
const { openPrint } = usePrintFormat();

const loading = ref(false);
const submitting = ref(false);
const printing = ref(false);
const dataSource = ref<SeaExportSeparateAdminApi.SeparateDto[]>([]);
const activeTabKey = ref<string>(DRAFT_KEY);
const editingId = ref<string | undefined>();
const formData = ref<Record<string, any>>({});
const ctnList = ref<CtnEditRow[]>([]);
const selectedCtnKeys = ref<(number | string)[]>([]);
const notifierPartyTab = ref<'notifier' | 'secondNotifier'>('notifier');
const formSnapshot = ref('');

const masterDetail = ref<null | SeaExportAdminApi.SeaExportDto>(null);
const masterLoading = ref(false);

let ctnRowKeyCounter = 0;

const toDateString = (val: unknown) => {
  if (val == null) return undefined;
  const d = new Date(val as string | Date);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
};

const formatDate = (
  val: string | null | undefined,
  format: 'date' | 'placeholder' = 'date',
) => {
  if (!val) return format === 'placeholder' ? '' : '';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
};

const displayText = (val: null | number | string | undefined) => {
  if (val == null) return '';
  const text = String(val).trim();
  return text;
};

const portName = (port?: PortSimple) => port?.portName || port?.cnName;

const formatPortCode = (port?: PortSimple) =>
  displayText(port?.ediCode || port?.portName);

const formatPortName = (port?: PortSimple, remark?: null | string) => {
  const en = port?.portName;
  const country = port?.country?.countryEnName || port?.country?.countryName;
  const cn = port?.cnName;
  const composed = [en, country].filter(Boolean).join('.');
  const withCn =
    composed && cn && cn !== en ? `${composed}${cn}` : composed || cn;
  return displayText(withCn || remark);
};

const masterReadonly = computed(() => {
  const se = masterDetail.value;
  const to = se?.transportOrder;
  const noBill = se?.noBillEnum;
  const copyNoBill = se?.copyNoBillEnum;
  const billCounts =
    noBill == null && copyNoBill == null
      ? ''
      : `${noBill ?? '-'}/${copyNoBill ?? '-'}`;
  return {
    mblNum: displayText(to?.mblNum),
    noBillEnum: billCounts,
    etd: formatDate(to?.etd),
    eta: formatDate(to?.eta),
    vessel: displayText(se?.vessel),
    innerVoyno: displayText(se?.innerVoyno),
    receivePortCode: formatPortCode(se?.receivePort),
    receivePortName: formatPortName(se?.receivePort, se?.receivePortRemark),
    polCode: formatPortCode(se?.pol),
    polName: formatPortName(se?.pol, se?.polRemark),
    podCode: formatPortCode(se?.pod),
    podName: formatPortName(se?.pod, se?.podRemark),
    deliverPortCode: formatPortCode(se?.deliverPort),
    deliverPortName: formatPortName(se?.deliverPort, se?.deliverPortRemark),
  };
});

/** 分单 DTO 无第二通知人，界面与通知人同槽编辑，值从主单带出 */
const masterSecondNotifierFields = () => {
  const se = masterDetail.value;
  return {
    secondNotifierId: se?.secondNotifierId,
    secondNotifierName: se?.secondNotifier?.name,
    secondNotifierContent: se?.secondNotifierContent,
  };
};

const onPartyClientChange = (
  nameField:
    | 'consigneeName'
    | 'notifierName'
    | 'secondNotifierName'
    | 'shipperName',
  value: unknown,
  option: any,
) => {
  const raw = Array.isArray(option) ? option[0] : option;
  formData.value[nameField] = value
    ? raw?.raw?.name || raw?.label || raw?.rawLabel || formData.value[nameField]
    : undefined;
};

const toSelectedItems = (id: any, name: any, labelKey = 'name') => {
  if (id == null) return [];
  return [{ id, [labelKey]: name || '' }] as any[];
};

const currentSnapshot = () =>
  JSON.stringify({
    form: formData.value,
    ctns: ctnList.value.map(({ _rowKey, ...rest }) => rest),
  });

const isDirty = () => currentSnapshot() !== formSnapshot.value;

const markPristine = () => {
  formSnapshot.value = currentSnapshot();
};

const tabItems = computed(() => {
  const saved = dataSource.value.map((item) => ({
    key: String(item.id),
    label: displayText(item.blNum) || $t('seaExport.export.separate.newDraft'),
  }));
  if (activeTabKey.value === DRAFT_KEY || !editingId.value) {
    return [
      ...saved,
      {
        key: DRAFT_KEY,
        label:
          displayText(formData.value.blNum) ||
          $t('seaExport.export.separate.newDraft'),
      },
    ];
  }
  return saved;
});

const mapMasterCtns = (
  orderCtns?: SeaExportAdminApi.OrderCtnDto[] | null,
): CtnEditRow[] =>
  (orderCtns || []).map((ctn) => ({
    ctnCodeId: ctn.ctnCodeId,
    ctnCodeName: ctn.ctnCode?.ctnName,
    ctnNo: ctn.ctnNo,
    sealNo: ctn.sealNo,
    pkgs: ctn.pkgs,
    codePackageId: ctn.codePackageId,
    codePackageName: ctn.codePackage?.name,
    grossWeight: ctn.grossWeight,
    tareWeight: ctn.tareWeight,
    overLength: ctn.overLength,
    overWidth: ctn.overWidth,
    overHeight: ctn.overHeight,
    volume: ctn.volume,
    codeGoodsId: ctn.codeGoodsId,
    codeGoodsName: ctn.codeGoods?.name,
    codeGoodsHSCode: ctn.codeGoods?.hsCode,
    bookingNo: ctn.bookingNo,
    remark: ctn.remark,
    _rowKey: `ctn_${++ctnRowKeyCounter}_${Date.now()}`,
  }));

const applyMasterToForm = (
  mode: 'defaults' | 'full' = 'full',
  silent = false,
) => {
  const se = masterDetail.value;
  const to = se?.transportOrder;
  if (!se || !to) {
    if (!silent) {
      message.warning($t('seaExport.export.separate.loadFromMasterEmpty'));
    }
    return false;
  }

  const terms = {
    codeIssueTypeId: se.codeIssueTypeId,
    codeIssueTypeName: se.codeIssueType?.billType,
    codeFrtId: to.codeFrtId,
    codeFrtName: to.codeFrt?.cnName,
    codeServiceId: to.codeServiceId,
    codeServiceName: to.codeService?.cnName,
    prepareAtId: se.prepareAtId,
    prepareAtName: portName(se.prepareAt),
    signingPortId: se.signingPortId,
    signingPortName: portName(se.signingPort),
    signingTime: se.signingTime,
  };

  if (mode === 'defaults') {
    formData.value = {
      ...formData.value,
      ...terms,
      ...masterSecondNotifierFields(),
    };
  } else {
    formData.value = {
      ...formData.value,
      ...terms,
      shipperId: to.shipperId,
      shipperName: to.shipper?.name,
      shipperContent: to.shipperContent,
      consigneeId: to.consigneeId,
      consigneeName: to.consignee?.name,
      consigneeContent: to.consigneeContent,
      notifierId: to.notifierId,
      notifierName: to.notifier?.name,
      notifierContent: to.notifierContent,
      ...masterSecondNotifierFields(),
      podAgentId: se.podAgentId,
      podAgentName: se.podAgent?.name,
      podAgentContent: se.podAgentContent,
      marks: to.marks,
      goodsDes: to.goodsDes,
      pkgs: to.pkgs,
      codePackageId: to.codePackageId,
      codePackageName: to.codePackage?.name,
      kgs: to.kgs,
      cbm: to.cbm,
    };
  }

  ctnList.value = mapMasterCtns(to.orderCtns);
  selectedCtnKeys.value = [];
  if (!silent) {
    message.success($t('seaExport.export.separate.loadFromMasterSuccess'));
  }
  return true;
};

const fillFormFromRecord = (
  record: SeaExportSeparateAdminApi.SeparateDto,
  options?: { keepSecondNotifier?: boolean },
) => {
  editingId.value = record.id;
  notifierPartyTab.value = 'notifier';
  const secondNotifier = options?.keepSecondNotifier
    ? {
        secondNotifierId: formData.value.secondNotifierId,
        secondNotifierName: formData.value.secondNotifierName,
        secondNotifierContent: formData.value.secondNotifierContent,
      }
    : masterSecondNotifierFields();
  formData.value = {
    consigneeId: record.consigneeId,
    consigneeName: record.consignee?.name,
    consigneeContent: record.consigneeContent,
    shipperId: record.shipperId,
    shipperName: record.shipper?.name,
    shipperContent: record.shipperContent,
    notifierId: record.notifierId,
    notifierName: record.notifier?.name,
    notifierContent: record.notifierContent,
    ...secondNotifier,
    podAgentId: record.podAgentId,
    podAgentName: record.podAgent?.name,
    podAgentContent: record.podAgentContent,
    blNum: record.blNum,
    marks: record.marks,
    pkgs: record.pkgs,
    codePackageId: record.codePackageId,
    codePackageName: record.codePackage?.name,
    kgs: record.kgs,
    cbm: record.cbm,
    goodsDes: record.goodsDes,
    codeIssueTypeId: record.codeIssueTypeId,
    codeIssueTypeName: record.codeIssueType?.billType,
    signingPortId: record.signingPortId,
    signingPortName: portName(record.signingPort),
    signingTime: record.signingTime,
    codeFrtId: record.codeFrtId,
    codeFrtName: record.codeFrt?.cnName,
    prepareAtId: record.prepareAtId,
    prepareAtName: portName(record.prepareAt),
    codeServiceId: record.codeServiceId,
    codeServiceName: record.codeService?.cnName,
  };
  ctnList.value = (record.seaExportSeparateCtns || []).map((ctn) => {
    const { codeGoods, codePackage, ctnCode, ...rest } = ctn;
    return {
      ...rest,
      ctnCodeName: ctnCode?.ctnName,
      codePackageName: codePackage?.name,
      codeGoodsName: codeGoods?.name,
      codeGoodsHSCode: codeGoods?.hsCode,
      _rowKey: `ctn_${++ctnRowKeyCounter}_${Date.now()}`,
    };
  });
  selectedCtnKeys.value = [];
  markPristine();
};

const openDraft = (silentMaster = true) => {
  editingId.value = undefined;
  activeTabKey.value = DRAFT_KEY;
  notifierPartyTab.value = 'notifier';
  formData.value = {};
  ctnList.value = [];
  selectedCtnKeys.value = [];
  applyMasterToForm('defaults', silentMaster);
  markPristine();
};

const confirmIfDirty = (onOk: () => void) => {
  if (!isDirty()) {
    onOk();
    return;
  }
  Modal.confirm({
    title: $t('common.prompt'),
    content: $t('seaExport.export.separate.switchDirtyConfirm'),
    onOk,
  });
};

const selectTab = (key: string) => {
  if (key === activeTabKey.value) return;
  confirmIfDirty(() => {
    if (key === DRAFT_KEY) {
      openDraft();
      return;
    }
    const record = dataSource.value.find((item) => String(item.id) === key);
    if (!record) return;
    activeTabKey.value = key;
    fillFormFromRecord(record);
  });
};

const addDraftTab = () => {
  if (activeTabKey.value === DRAFT_KEY) return;
  confirmIfDirty(() => openDraft());
};

const loadMasterDetail = async () => {
  if (!seaExportId.value) return;
  masterLoading.value = true;
  try {
    masterDetail.value = await getSeaExportDetail(seaExportId.value);
  } finally {
    masterLoading.value = false;
  }
};

const loadData = async (
  preferId?: string,
  options?: { keepSecondNotifier?: boolean },
) => {
  if (!seaExportId.value) return;
  loading.value = true;
  try {
    const res = await getSeparatePagedList({
      seaExportId: seaExportId.value,
      pageIndex: 1,
      pageSize: 100,
      sorting: 'Id DESC',
    });
    dataSource.value = res.items || [];
    const nextId = preferId || (editingId.value ? String(editingId.value) : '');
    const matched = dataSource.value.find((item) => String(item.id) === nextId);
    if (matched) {
      activeTabKey.value = String(matched.id);
      fillFormFromRecord(matched, options);
    } else if (dataSource.value[0]) {
      activeTabKey.value = String(dataSource.value[0].id);
      fillFormFromRecord(dataSource.value[0], options);
    } else {
      openDraft();
    }
  } finally {
    loading.value = false;
  }
};

const confirmLoadFromMaster = () => {
  Modal.confirm({
    title: $t('seaExport.export.separate.loadFromMaster'),
    content: $t('seaExport.export.separate.loadFromMasterConfirm'),
    onOk: () => applyMasterToForm('full'),
  });
};

const addCtnRow = () => {
  ctnList.value = [
    ...ctnList.value,
    { _rowKey: `ctn_${++ctnRowKeyCounter}_${Date.now()}` },
  ];
};

const removeCtnRows = () => {
  if (!selectedCtnKeys.value.length) return;
  const keysSet = new Set(selectedCtnKeys.value);
  ctnList.value = ctnList.value.filter((row) => !keysSet.has(row._rowKey));
  selectedCtnKeys.value = [];
};

const updateCargoTotalsFromCtn = () => {
  const sum = (key: 'grossWeight' | 'pkgs' | 'volume') =>
    ctnList.value.reduce((acc, row) => {
      const n = Number(row[key]);
      return acc + (Number.isFinite(n) ? n : 0);
    }, 0);

  formData.value.pkgs = sum('pkgs') || undefined;
  formData.value.kgs = sum('grossWeight') || undefined;
  formData.value.cbm = sum('volume') || undefined;

  const firstPkg = ctnList.value.find((row) => row.codePackageId);
  if (firstPkg?.codePackageId) {
    formData.value.codePackageId = firstPkg.codePackageId;
    formData.value.codePackageName = firstPkg.codePackageName;
  }
  message.success($t('seaExport.export.separate.updateTotalSuccess'));
};

const updateCtnRow = (index: number, field: string, value: any) => {
  const list = [...ctnList.value];
  if (!list[index]) {
    list[index] = {
      _rowKey: `ctn_${++ctnRowKeyCounter}_${Date.now()}`,
    };
  }
  list[index] = { ...list[index], [field]: value };
  ctnList.value = list;
};

const buildCtnPayload = () =>
  ctnList.value
    .filter((ctn) => ctn.ctnCodeId)
    .map((ctn) => {
      const {
        _rowKey,
        codeGoodsHSCode,
        codeGoodsName,
        codePackageName,
        ctnCodeName,
        seaExportSeparateId,
        ...rest
      } = ctn;
      return rest;
    });

const buildPayload = () => ({
  seaExportId: seaExportId.value,
  consigneeId: formData.value.consigneeId,
  consigneeContent: formData.value.consigneeContent,
  shipperId: formData.value.shipperId,
  shipperContent: formData.value.shipperContent,
  notifierId: formData.value.notifierId,
  notifierContent: formData.value.notifierContent,
  podAgentId: formData.value.podAgentId,
  podAgentContent: formData.value.podAgentContent,
  blNum: formData.value.blNum,
  marks: formData.value.marks,
  pkgs: formData.value.pkgs,
  codePackageId: formData.value.codePackageId,
  kgs: formData.value.kgs,
  cbm: formData.value.cbm,
  goodsDes: formData.value.goodsDes,
  codeIssueTypeId: formData.value.codeIssueTypeId,
  signingPortId: formData.value.signingPortId,
  signingTime: toDateString(formData.value.signingTime),
  codeFrtId: formData.value.codeFrtId,
  prepareAtId: formData.value.prepareAtId,
  codeServiceId: formData.value.codeServiceId,
  seaExportSeparateCtns: buildCtnPayload(),
});

const handleSubmit = async () => {
  submitting.value = true;
  try {
    let savedId = editingId.value;
    if (editingId.value) {
      await editSeparate({
        id: editingId.value,
        ...buildPayload(),
      });
    } else {
      savedId = await addSeparate(buildPayload());
    }
    message.success($t('ui.actionMessage.operationSuccess'));
    await loadData(savedId ? String(savedId) : undefined, {
      keepSecondNotifier: true,
    });
  } finally {
    submitting.value = false;
  }
};

const handleDelete = () => {
  if (!editingId.value) return;
  Modal.confirm({
    title: $t('ui.actionTitle.delete', [$t('seaExport.export.separate.name')]),
    content: $t('ui.actionMessage.deleteConfirm', ['1']),
    okType: 'danger',
    async onOk() {
      await deleteSeparate({ ids: [editingId.value!] });
      message.success($t('ui.actionMessage.operationSuccess'));
      editingId.value = undefined;
      await loadData();
    },
  });
};

const handlePrint = () => {
  if (!seaExportId.value) return;
  printing.value = true;
  try {
    const se = masterDetail.value;
    openPrint({
      printJsonType: PrintJsonType.SeaExportDetail,
      codeIssueTypeId: formData.value.codeIssueTypeId ?? se?.codeIssueTypeId,
      carrierId: se?.carrierId,
      orgId: se?.orgId,
      bizType: PrintFormatBizType.SeaExport,
      detailInput: { id: seaExportId.value },
    });
  } catch {
    message.error($t('seaExport.export.separate.printFailed'));
  } finally {
    printing.value = false;
  }
};

const ctnColumns = [
  {
    title: $t('seaExport.export.separate.seq'),
    key: 'seq',
    width: 52,
    align: 'center' as const,
  },
  {
    title: $t('seaExport.export.separate.ctnCodeId'),
    key: 'ctnCodeId',
    width: 88,
  },
  {
    title: $t('seaExport.export.separate.ctnNo'),
    key: 'ctnNo',
    width: 120,
  },
  {
    title: $t('seaExport.export.separate.sealNo'),
    key: 'sealNo',
    width: 110,
  },
  {
    title: $t('seaExport.export.separate.pkgs'),
    key: 'pkgs',
    width: 72,
  },
  {
    title: $t('seaExport.export.separate.codePackageId'),
    key: 'codePackageId',
    width: 96,
  },
  {
    title: $t('seaExport.export.separate.grossWeight'),
    key: 'grossWeight',
    width: 88,
  },
  {
    title: $t('seaExport.export.separate.volumeShort'),
    key: 'volume',
    width: 80,
  },
  {
    title: $t('seaExport.export.separate.tareWeightShort'),
    key: 'tareWeight',
    width: 80,
  },
  {
    title: $t('seaExport.export.separate.ctnRemark'),
    key: 'remark',
    width: 110,
  },
];

const reloadAll = async () => {
  await loadMasterDetail();
  await loadData();
};

onMounted(() => {
  reloadAll();
});

onActivated(() => {
  loadMasterDetail();
});

watch(seaExportId, () => {
  reloadAll();
});
</script>

<template>
  <div class="separate-bill">
    <Spin :spinning="loading || masterLoading">
      <section class="separate-card separate-card--main">
        <div class="separate-toolbar">
          <div class="hbl-tabs">
            <button
              v-for="tab in tabItems"
              :key="tab.key"
              type="button"
              class="hbl-tab"
              :class="{ 'hbl-tab--active': activeTabKey === tab.key }"
              @click="selectTab(tab.key)"
            >
              {{ tab.label }}
            </button>
            <button
              type="button"
              class="hbl-add"
              :title="$t('seaExport.export.separate.add')"
              @click="addDraftTab"
            >
              <img
                :src="addTabIcon"
                alt=""
                class="hbl-add__icon"
                width="10"
                height="10"
              />
            </button>
          </div>
          <Space :size="8">
            <Button
              size="small"
              :disabled="!editingId"
              danger
              @click="handleDelete"
            >
              {{ $t('common.delete') }}
            </Button>
            <Button
              size="small"
              class="separate-btn-print"
              :loading="printing"
              @click="handlePrint"
            >
              {{ $t('seaExport.export.separate.print') }}
            </Button>
            <Button
              size="small"
              type="primary"
              class="separate-btn-save"
              :loading="submitting"
              @click="handleSubmit"
            >
              {{ $t('common.save') }}
            </Button>
          </Space>
        </div>

        <div class="main-split">
          <div class="party-col">
            <div class="party-block">
              <div class="inline-field">
                <label class="inline-label inline-label--party">
                  {{ $t('seaExport.export.separate.shipperLabel') }}
                </label>
                <ClientSelect
                  v-model="formData.shipperId"
                  :selected-items="
                    toSelectedItems(formData.shipperId, formData.shipperName)
                  "
                  industry-category="b"
                  size="small"
                  class="flex-1"
                  :placeholder="$t('ui.placeholder.select')"
                  @change="
                    (value, option) =>
                      onPartyClientChange('shipperName', value, option)
                  "
                />
              </div>
              <Input.TextArea
                :value="formData.shipperContent"
                :maxlength="1024"
                :rows="5"
                class="party-textarea"
                allow-clear
                @update:value="(v) => (formData.shipperContent = v)"
              />
            </div>

            <div class="party-block">
              <div class="inline-field">
                <label class="inline-label inline-label--party">
                  {{ $t('seaExport.export.separate.consigneeLabel') }}
                </label>
                <ClientSelect
                  v-model="formData.consigneeId"
                  :selected-items="
                    toSelectedItems(
                      formData.consigneeId,
                      formData.consigneeName,
                    )
                  "
                  industry-category="e"
                  size="small"
                  class="flex-1"
                  :placeholder="$t('ui.placeholder.select')"
                  @change="
                    (value, option) =>
                      onPartyClientChange('consigneeName', value, option)
                  "
                />
              </div>
              <Input.TextArea
                :value="formData.consigneeContent"
                :maxlength="1024"
                :rows="5"
                class="party-textarea"
                allow-clear
                @update:value="(v) => (formData.consigneeContent = v)"
              />
            </div>

            <div class="party-block">
              <div class="inline-field">
                <button
                  type="button"
                  class="party-switch"
                  :class="{
                    'party-switch--active': notifierPartyTab === 'notifier',
                  }"
                  @click="notifierPartyTab = 'notifier'"
                >
                  {{ $t('seaExport.export.separate.notifierLabel') }}
                </button>
                <button
                  type="button"
                  class="party-switch"
                  :class="{
                    'party-switch--active':
                      notifierPartyTab === 'secondNotifier',
                  }"
                  @click="notifierPartyTab = 'secondNotifier'"
                >
                  {{ $t('seaExport.export.secondNotifierId') }}
                </button>
                <ClientSelect
                  v-show="notifierPartyTab === 'notifier'"
                  v-model="formData.notifierId"
                  :selected-items="
                    toSelectedItems(formData.notifierId, formData.notifierName)
                  "
                  industry-category="h"
                  size="small"
                  class="flex-1"
                  :placeholder="$t('ui.placeholder.select')"
                  @change="
                    (value, option) =>
                      onPartyClientChange('notifierName', value, option)
                  "
                />
                <ClientSelect
                  v-show="notifierPartyTab === 'secondNotifier'"
                  v-model="formData.secondNotifierId"
                  :selected-items="
                    toSelectedItems(
                      formData.secondNotifierId,
                      formData.secondNotifierName,
                    )
                  "
                  industry-category="h"
                  size="small"
                  class="flex-1"
                  :placeholder="$t('ui.placeholder.select')"
                  @change="
                    (value, option) =>
                      onPartyClientChange('secondNotifierName', value, option)
                  "
                />
              </div>
              <Input.TextArea
                v-show="notifierPartyTab === 'notifier'"
                :value="formData.notifierContent"
                :maxlength="1024"
                :rows="5"
                class="party-textarea"
                allow-clear
                @update:value="(v) => (formData.notifierContent = v)"
              />
              <Input.TextArea
                v-show="notifierPartyTab === 'secondNotifier'"
                :value="formData.secondNotifierContent"
                :maxlength="1024"
                :rows="5"
                class="party-textarea"
                allow-clear
                @update:value="(v) => (formData.secondNotifierContent = v)"
              />
            </div>
          </div>

          <div class="meta-col">
            <div class="meta-grid">
              <div class="inline-field">
                <label class="inline-label">
                  {{ $t('seaExport.export.mblNum') }}
                </label>
                <Input
                  size="small"
                  readonly
                  class="readonly-input"
                  :value="masterReadonly.mblNum"
                />
              </div>
              <div class="inline-field">
                <label class="inline-label">
                  {{ $t('seaExport.export.separate.blNum') }}
                </label>
                <Input
                  size="small"
                  :value="formData.blNum"
                  :maxlength="64"
                  allow-clear
                  @update:value="(v) => (formData.blNum = v)"
                />
              </div>
              <div class="inline-field">
                <label class="inline-label">
                  {{ $t('seaExport.export.issueType') }}
                </label>
                <CodeIssueTypeSelect
                  v-model="formData.codeIssueTypeId"
                  :selected-items="
                    toSelectedItems(
                      formData.codeIssueTypeId,
                      formData.codeIssueTypeName,
                      'billType',
                    )
                  "
                  size="small"
                  class="flex-1"
                  :placeholder="$t('ui.placeholder.select')"
                />
              </div>
              <div class="inline-field">
                <label class="inline-label">
                  {{ $t('seaExport.export.noBillEnum') }}
                </label>
                <Input
                  size="small"
                  readonly
                  class="readonly-input"
                  :value="masterReadonly.noBillEnum"
                />
              </div>
              <div class="inline-field">
                <label class="inline-label">
                  {{ $t('seaExport.export.separate.serviceStatus') }}
                </label>
                <CodeServiceSelect
                  v-model="formData.codeServiceId"
                  :selected-items="
                    toSelectedItems(
                      formData.codeServiceId,
                      formData.codeServiceName,
                      'cnName',
                    )
                  "
                  size="small"
                  class="flex-1"
                  :placeholder="$t('ui.placeholder.select')"
                />
              </div>
              <div class="inline-field">
                <label class="inline-label">
                  {{ $t('seaExport.export.separate.payMethod') }}
                </label>
                <CodeFrtSelect
                  v-model="formData.codeFrtId"
                  :selected-items="
                    toSelectedItems(
                      formData.codeFrtId,
                      formData.codeFrtName,
                      'cnName',
                    )
                  "
                  size="small"
                  class="flex-1"
                  :placeholder="$t('ui.placeholder.select')"
                />
              </div>
              <div class="inline-field meta-grid__span">
                <label class="inline-label">
                  {{ $t('seaExport.export.separate.agentLabel') }}
                </label>
                <ClientSelect
                  v-model="formData.podAgentId"
                  :selected-items="
                    toSelectedItems(formData.podAgentId, formData.podAgentName)
                  "
                  industry-category="q"
                  size="small"
                  class="flex-1"
                  :placeholder="$t('ui.placeholder.select')"
                />
              </div>
            </div>

            <Input.TextArea
              :value="formData.podAgentContent"
              :maxlength="1024"
              :rows="5"
              class="agent-textarea"
              allow-clear
              @update:value="(v) => (formData.podAgentContent = v)"
            />

            <div class="ctn-block">
              <div class="ctn-head">
                <span class="ctn-title">
                  {{ $t('seaExport.export.separate.ctnTable') }}
                </span>
                <Space :size="6">
                  <Button size="small" type="link" @click="addCtnRow">
                    + {{ $t('seaExport.export.separate.addCtn') }}
                  </Button>
                  <Button
                    size="small"
                    type="link"
                    danger
                    :disabled="!selectedCtnKeys.length"
                    @click="removeCtnRows"
                  >
                    - {{ $t('common.delete') }}
                  </Button>
                  <Tooltip :title="$t('seaExport.export.separate.updateTotal')">
                    <Button
                      size="small"
                      type="link"
                      @click="updateCargoTotalsFromCtn"
                    >
                      {{ $t('seaExport.export.separate.updateTotal') }}
                    </Button>
                  </Tooltip>
                  <Tooltip
                    :title="$t('seaExport.export.separate.loadFromMasterTip')"
                  >
                    <Button
                      size="small"
                      type="link"
                      :loading="masterLoading"
                      @click="confirmLoadFromMaster"
                    >
                      {{ $t('seaExport.export.separate.loadFromMaster') }}
                    </Button>
                  </Tooltip>
                </Space>
              </div>
              <Table
                class="ctn-table"
                :data-source="ctnList"
                :columns="ctnColumns"
                :row-selection="{
                  selectedRowKeys: selectedCtnKeys,
                  onChange: (keys) => {
                    selectedCtnKeys = keys;
                  },
                }"
                :pagination="false"
                :scroll="{ x: 980, y: 108 }"
                size="small"
                bordered
                row-key="_rowKey"
              >
                <template #bodyCell="{ column, record, index }">
                  <template v-if="column.key === 'seq'">
                    {{ index + 1 }}
                  </template>
                  <template v-else-if="column.key === 'ctnCodeId'">
                    <CtnSelect
                      :model-value="record.ctnCodeId"
                      :selected-items="
                        toSelectedItems(
                          record.ctnCodeId,
                          record.ctnCodeName,
                          'ctnName',
                        )
                      "
                      size="small"
                      class="w-full min-w-[72px]"
                      :placeholder="$t('ui.placeholder.select')"
                      @update:model-value="
                        (v) => updateCtnRow(index, 'ctnCodeId', v)
                      "
                    />
                  </template>
                  <template v-else-if="column.key === 'ctnNo'">
                    <Input
                      size="small"
                      :value="record.ctnNo"
                      :maxlength="32"
                      allow-clear
                      @update:value="(v) => updateCtnRow(index, 'ctnNo', v)"
                    />
                  </template>
                  <template v-else-if="column.key === 'sealNo'">
                    <Input
                      size="small"
                      :value="record.sealNo"
                      :maxlength="32"
                      allow-clear
                      @update:value="(v) => updateCtnRow(index, 'sealNo', v)"
                    />
                  </template>
                  <template v-else-if="column.key === 'pkgs'">
                    <InputNumber
                      size="small"
                      :value="record.pkgs"
                      class="w-full"
                      :min="0"
                      :controls="false"
                      @update:value="(v) => updateCtnRow(index, 'pkgs', v)"
                    />
                  </template>
                  <template v-else-if="column.key === 'codePackageId'">
                    <CodePackageSelect
                      :model-value="record.codePackageId"
                      :selected-items="
                        toSelectedItems(
                          record.codePackageId,
                          record.codePackageName,
                        )
                      "
                      size="small"
                      class="w-full min-w-[72px]"
                      :placeholder="$t('ui.placeholder.select')"
                      @update:model-value="
                        (v) => updateCtnRow(index, 'codePackageId', v)
                      "
                    />
                  </template>
                  <template v-else-if="column.key === 'grossWeight'">
                    <InputNumber
                      size="small"
                      :value="record.grossWeight"
                      class="w-full"
                      :min="0"
                      :controls="false"
                      :precision="WEIGHT_VOLUME_PRECISION"
                      :formatter="formatWeightVolume"
                      @update:value="
                        (v) => updateCtnRow(index, 'grossWeight', v)
                      "
                    />
                  </template>
                  <template v-else-if="column.key === 'volume'">
                    <InputNumber
                      size="small"
                      :value="record.volume"
                      class="w-full"
                      :min="0"
                      :controls="false"
                      :precision="WEIGHT_VOLUME_PRECISION"
                      :formatter="formatWeightVolume"
                      @update:value="(v) => updateCtnRow(index, 'volume', v)"
                    />
                  </template>
                  <template v-else-if="column.key === 'tareWeight'">
                    <InputNumber
                      size="small"
                      :value="record.tareWeight"
                      class="w-full"
                      :min="0"
                      :controls="false"
                      :precision="WEIGHT_VOLUME_PRECISION"
                      :formatter="formatWeightVolume"
                      @update:value="
                        (v) => updateCtnRow(index, 'tareWeight', v)
                      "
                    />
                  </template>
                  <template v-else-if="column.key === 'remark'">
                    <Input
                      size="small"
                      :value="record.remark"
                      :maxlength="1024"
                      allow-clear
                      @update:value="(v) => updateCtnRow(index, 'remark', v)"
                    />
                  </template>
                </template>
              </Table>
            </div>
          </div>
        </div>
      </section>

      <section class="separate-card">
        <div class="section-title">
          <span class="section-title__icon" aria-hidden="true">◉</span>
          {{ $t('seaExport.export.separate.voyagePortSection') }}
        </div>
        <div class="voyage-grid">
          <div class="inline-field">
            <label class="inline-label">
              {{ $t('seaExport.export.separate.etdLabel') }}
            </label>
            <Input
              size="small"
              readonly
              class="readonly-input"
              :value="masterReadonly.etd"
            />
          </div>
          <div class="inline-field">
            <label class="inline-label">
              {{ $t('seaExport.export.eta') }}
            </label>
            <Input
              size="small"
              readonly
              class="readonly-input"
              :value="masterReadonly.eta"
            />
          </div>
          <div class="inline-field">
            <label class="inline-label">
              {{ $t('seaExport.export.vessel') }}
            </label>
            <Input
              size="small"
              readonly
              class="readonly-input"
              :value="masterReadonly.vessel"
            />
          </div>
          <div class="inline-field">
            <label class="inline-label">
              {{ $t('seaExport.export.separate.voyageNo') }}
            </label>
            <Input
              size="small"
              readonly
              class="readonly-input"
              :value="masterReadonly.innerVoyno"
            />
          </div>
          <div class="inline-field">
            <label class="inline-label">
              {{ $t('seaExport.export.receivePortId') }}
            </label>
            <div class="port-pair">
              <Input
                size="small"
                readonly
                class="readonly-input port-pair__code"
                :value="masterReadonly.receivePortCode"
              />
              <Input
                size="small"
                readonly
                class="readonly-input port-pair__name"
                :value="masterReadonly.receivePortName"
              />
            </div>
          </div>
          <div class="inline-field">
            <label class="inline-label">
              {{ $t('seaExport.export.polId') }}
            </label>
            <div class="port-pair">
              <Input
                size="small"
                readonly
                class="readonly-input port-pair__code"
                :value="masterReadonly.polCode"
              />
              <Input
                size="small"
                readonly
                class="readonly-input port-pair__name"
                :value="masterReadonly.polName"
              />
            </div>
          </div>
          <div class="inline-field">
            <label class="inline-label">
              {{ $t('seaExport.export.podId') }}
            </label>
            <div class="port-pair">
              <Input
                size="small"
                readonly
                class="readonly-input port-pair__code"
                :value="masterReadonly.podCode"
              />
              <Input
                size="small"
                readonly
                class="readonly-input port-pair__name"
                :value="masterReadonly.podName"
              />
            </div>
          </div>
          <div class="inline-field">
            <label class="inline-label">
              {{ $t('seaExport.export.deliverPortId') }}
            </label>
            <div class="port-pair">
              <Input
                size="small"
                readonly
                class="readonly-input port-pair__code"
                :value="masterReadonly.deliverPortCode"
              />
              <Input
                size="small"
                readonly
                class="readonly-input port-pair__name"
                :value="masterReadonly.deliverPortName"
              />
            </div>
          </div>
        </div>
      </section>

      <section class="separate-card">
        <div class="section-title">
          <span class="section-title__icon" aria-hidden="true">◉</span>
          {{ $t('seaExport.export.separate.cargoSection') }}
        </div>
        <div class="cargo-grid">
          <div class="cargo-field">
            <label class="stack-label">
              {{ $t('seaExport.export.separate.marksLabel') }}
            </label>
            <Input.TextArea
              :value="formData.marks"
              class="cargo-textarea"
              allow-clear
              @update:value="(v) => (formData.marks = v)"
            />
          </div>
          <div class="cargo-field">
            <label class="stack-label">
              {{ $t('seaExport.export.separate.goodsDesLabel') }}
            </label>
            <Input.TextArea
              :value="formData.goodsDes"
              class="cargo-textarea"
              allow-clear
              @update:value="(v) => (formData.goodsDes = v)"
            />
          </div>
          <div class="cargo-metrics">
            <div class="cargo-field">
              <label class="stack-label">
                {{ $t('seaExport.export.pkgs') }}
              </label>
              <InputNumber
                size="small"
                :value="formData.pkgs"
                class="w-full"
                :min="0"
                :controls="false"
                @update:value="(v) => (formData.pkgs = v)"
              />
            </div>
            <div class="cargo-field">
              <label class="stack-label">
                {{ $t('seaExport.export.codePackageId') }}
              </label>
              <CodePackageSelect
                v-model="formData.codePackageId"
                :selected-items="
                  toSelectedItems(
                    formData.codePackageId,
                    formData.codePackageName,
                  )
                "
                size="small"
                class="w-full"
                :placeholder="$t('ui.placeholder.select')"
              />
            </div>
            <div class="cargo-field">
              <label class="stack-label">
                {{ $t('seaExport.export.separate.grossWeightKgs') }}
              </label>
              <InputNumber
                size="small"
                :value="formData.kgs"
                class="w-full"
                :min="0"
                :controls="false"
                :precision="WEIGHT_VOLUME_PRECISION"
                :formatter="formatWeightVolume"
                @update:value="(v) => (formData.kgs = v)"
              />
            </div>
            <div class="cargo-field">
              <label class="stack-label">
                {{ $t('seaExport.export.separate.volumeCbm') }}
              </label>
              <InputNumber
                size="small"
                :value="formData.cbm"
                class="w-full"
                :min="0"
                :controls="false"
                :precision="WEIGHT_VOLUME_PRECISION"
                :formatter="formatWeightVolume"
                @update:value="(v) => (formData.cbm = v)"
              />
            </div>
          </div>
        </div>
      </section>
    </Spin>
  </div>
</template>

<style scoped>
.separate-bill {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  padding: 12px;
  overflow: auto;
  background: #f7fafc;
}

.separate-bill :deep(.ant-spin-nested-loading),
.separate-bill :deep(.ant-spin-container) {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12px;
}

.separate-card {
  padding: 10px 12px 12px;
  background: #fff;
  border: 1px solid #e4e8ef;
  border-radius: 6px;
}

.separate-card--main {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.separate-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
}

.hbl-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.hbl-tab {
  min-width: 88px;
  height: 24px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 500;
  line-height: 24px;
  color: #8c95a3;
  text-align: center;
  cursor: pointer;
  background: #eff1f5;
  border: 0;
  border-radius: 3px;
}

.hbl-tab--active {
  color: #3389eb;
  background: rgb(51 137 235 / 15%);
}

.hbl-add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  cursor: pointer;
  background: rgb(51 137 235 / 15%);
  border: 0;
  border-radius: 3px;
}

.hbl-add__icon {
  display: block;
  width: 10px;
  height: 10px;
}

.separate-btn-print {
  min-width: 52px;
  color: #252a31;
  background: #fff;
  border-color: #e4e8ef;
}

.separate-btn-save {
  min-width: 52px;
  background: #006ce6;
  border-color: #006ce6;
}

.main-split {
  display: grid;
  grid-template-columns: minmax(280px, 420px) minmax(0, 1fr);
  gap: 22px;
  align-items: start;
}

.party-col,
.meta-col,
.party-block,
.ctn-block,
.cargo-field,
.cargo-metrics {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.party-col,
.meta-col {
  gap: 10px;
}

.party-block {
  gap: 6px;
}

.inline-field {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.inline-label {
  flex-shrink: 0;
  width: 56px;
  font-size: 12px;
  line-height: 16px;
  color: #8c95a3;
  text-align: right;
}

.inline-label--party {
  width: 118px;
  text-align: left;
}

.meta-grid .inline-label {
  text-align: left;
}

.party-switch {
  flex-shrink: 0;
  padding: 0;
  font-size: 12px;
  line-height: 16px;
  color: #8c95a3;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.party-switch--active {
  font-weight: 500;
  color: #3389eb;
}

.party-textarea :deep(textarea),
.agent-textarea :deep(textarea) {
  min-height: 85px;
  font-size: 12px;
  line-height: 18px;
  resize: vertical;
  background: #fcfdfe;
  border-color: #e4e8ef;
  border-radius: 5px;
}

.meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 12px;
}

.meta-grid__span {
  grid-column: 1 / -1;
}

.readonly-input,
.separate-bill :deep(.ant-input:not(textarea)),
.separate-bill :deep(.ant-input-affix-wrapper),
.separate-bill
  :deep(.ant-select:not(.ant-select-multiple) .ant-select-selector),
.separate-bill :deep(.ant-input-number) {
  background: #fcfdfe;
  border-color: #e4e8ef;
  border-radius: 5px;
}

.readonly-input,
.readonly-input.ant-input[readonly] {
  color: #8c95a3;
  cursor: default;
  background: rgb(228 232 239 / 60%);
}

.separate-bill
  :deep(.ant-input:not(textarea):not([readonly]):not(:disabled):hover),
.separate-bill
  :deep(.ant-input-affix-wrapper:not(.ant-input-affix-wrapper-disabled):hover),
.separate-bill
  :deep(.ant-select:not(.ant-select-disabled):hover .ant-select-selector),
.separate-bill :deep(.ant-input-number:not(.ant-input-number-disabled):hover) {
  border-color: #4096ff;
}

.separate-bill
  :deep(.ant-input:not(textarea):not([readonly]):not(:disabled):focus),
.separate-bill
  :deep(
    .ant-input-affix-wrapper-focused:not(.ant-input-affix-wrapper-disabled)
  ),
.separate-bill
  :deep(.ant-select-focused:not(.ant-select-disabled) .ant-select-selector),
.separate-bill
  :deep(.ant-input-number-focused:not(.ant-input-number-disabled)) {
  border-color: #1677ff;
  box-shadow: 0 0 0 2px rgb(5 145 255 / 10%);
}

.party-textarea :deep(textarea:hover),
.agent-textarea :deep(textarea:hover),
.cargo-textarea :deep(textarea:hover) {
  border-color: #4096ff;
}

.party-textarea :deep(textarea:focus),
.agent-textarea :deep(textarea:focus),
.cargo-textarea :deep(textarea:focus) {
  border-color: #1677ff;
  box-shadow: 0 0 0 2px rgb(5 145 255 / 10%);
}

.ctn-head {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.ctn-title {
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
  color: #3389eb;
}

.ctn-table :deep(.ant-table-thead > tr > th) {
  height: 24px;
  padding: 0 8px;
  font-size: 12px;
  font-weight: 500;
  color: #252a31;
  background: #f7fafc;
}

.ctn-table :deep(.ant-table-tbody > tr > td) {
  height: 32px;
  padding: 2px 4px;
}

.section-title {
  display: flex;
  gap: 4px;
  align-items: center;
  margin-bottom: 10px;
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
  color: #3389eb;
}

.section-title__icon {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
  color: #3389eb;
}

.voyage-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px 16px;
}

.port-pair {
  display: flex;
  flex: 1;
  gap: 4px;
  min-width: 0;
}

.port-pair__code {
  flex-shrink: 0;
  width: 72px;
}

.port-pair__name {
  flex: 1;
  min-width: 0;
}

.cargo-grid {
  display: grid;
  grid-template-columns: minmax(180px, 272fr) minmax(280px, 624fr) minmax(
      180px,
      272fr
    );
  gap: 12px;
  align-items: stretch;
}

.cargo-grid > .cargo-field {
  display: grid;
  grid-template-rows: auto 1fr;
  min-height: 0;
}

.stack-label {
  flex-shrink: 0;
  margin-bottom: 6px;
  font-size: 12px;
  line-height: 16px;
  color: #8c95a3;
}

.cargo-textarea {
  height: 100%;
  min-height: 0;
}

.cargo-textarea :deep(.ant-input-affix-wrapper) {
  box-sizing: border-box;
  width: 100%;
  height: 100% !important;
}

.cargo-textarea :deep(textarea) {
  box-sizing: border-box;
  width: 100%;
  height: 100% !important;
  min-height: 0;
  font-size: 12px;
  line-height: 17px;
  resize: none;
  background: #fcfdfe;
  border-color: #e4e8ef;
  border-radius: 5px;
}

.cargo-metrics {
  gap: 8px;
  justify-content: flex-start;
}

.cargo-metrics > .cargo-field {
  flex: none;
}

.separate-bill :deep(.ant-table-tbody > tr.ant-table-row-selected > td),
.separate-bill :deep(.ant-table-tbody > tr.ant-table-row-selected:hover > td) {
  background: hsl(var(--primary) / 15%) !important;
}

@media (max-width: 1100px) {
  .main-split,
  .meta-grid,
  .voyage-grid,
  .cargo-grid {
    grid-template-columns: 1fr;
  }
}
</style>
