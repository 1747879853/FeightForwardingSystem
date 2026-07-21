<script lang="ts" setup>
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';
import type { SeaExportSeparateAdminApi } from '#/api/sea-export/sea-export-separate-admin';

import dayjs from 'dayjs';
import { useDebounceFn } from '@vueuse/core';
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { IconifyIcon } from '@vben/icons';

import {
  Button,
  Card,
  DatePicker,
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
import CodeGoodsSelect from '#/adapter/component/biz-select/code-goods-select.vue';
import CodeIssueTypeSelect from '#/adapter/component/biz-select/code-issue-type-select.vue';
import CodePackageSelect from '#/adapter/component/biz-select/code-package-select.vue';
import CodeServiceSelect from '#/adapter/component/biz-select/code-service-select.vue';
import CtnSelect from '#/adapter/component/biz-select/ctn-select.vue';
import PortSelect from '#/adapter/component/biz-select/port-select.vue';
import { getSeaExportDetail } from '#/api/sea-export/sea-export-admin';
import {
  addSeparate,
  deleteSeparate,
  editSeparate,
  getSeparatePagedList,
} from '#/api/sea-export/sea-export-separate-admin';
import { $t } from '#/locales';

defineOptions({
  name: 'SeaExportSeparateBill',
});

type CtnEditRow = SeaExportSeparateAdminApi.SeparateCtnDto & {
  _rowKey: string;
};

const route = useRoute();

const seaExportId = computed<string>(() => {
  const id = route.params.id;
  if (Array.isArray(id)) return id[0] || '';
  return id ? String(id) : '';
});

const loading = ref(false);
const dataSource = ref<SeaExportSeparateAdminApi.SeparateDto[]>([]);
const selectedSeparateKeys = ref<(string | number)[]>([]);
const totalCount = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const keyword = ref('');

/** 主单详情：船期/港口/主提单号只读，以及「读入主单」数据源 */
const masterDetail = ref<null | SeaExportAdminApi.SeaExportDto>(null);
const masterLoading = ref(false);
/** 船期港口默认折叠，减少分单录入干扰 */
const masterVoyageExpanded = ref(false);

const toDayjs = (val: string | null | undefined) =>
  val && dayjs(val).isValid() ? dayjs(val) : undefined;

const toDateString = (val: unknown) => {
  if (val == null) return undefined;
  const d = dayjs(val as string | Date);
  return d.isValid() ? d.toISOString() : undefined;
};

const formatDate = (
  val: string | null | undefined,
  format = 'YYYY-MM-DD HH:mm',
) => {
  if (!val) return '--';
  const d = dayjs(val);
  return d.isValid() ? d.format(format) : '--';
};

const displayText = (val: null | string | undefined) =>
  val && String(val).trim() ? String(val).trim() : '--';

const portDisplay = (name?: null | string, remark?: null | string) =>
  displayText(name || remark);

/** 弹窗内只读主单摘要 */
const masterReadonly = computed(() => {
  const se = masterDetail.value;
  const to = se?.transportOrder;
  return {
    mblNum: displayText(to?.mblNum),
    bookingNum: displayText(to?.bookingNum),
    carrierName: displayText(se?.carrierCnShortName || se?.carrierName),
    etd: formatDate(to?.etd, 'YYYY-MM-DD'),
    atd: formatDate(to?.atd, 'YYYY-MM-DD'),
    eta: formatDate(to?.eta, 'YYYY-MM-DD'),
    closingTime: formatDate(se?.closingTime, 'YYYY-MM-DD'),
    vessel: displayText(se?.vessel),
    innerVoyno: displayText(se?.innerVoyno),
    receivePort: portDisplay(se?.receivePortName, se?.receivePortRemark),
    pol: portDisplay(se?.polName, se?.polRemark),
    pod: portDisplay(se?.podName, se?.podRemark),
    deliverPort: portDisplay(se?.deliverPortName, se?.deliverPortRemark),
    pot1: portDisplay(se?.poT1Name, se?.poT1Remark),
    pot2: portDisplay(se?.poT2Name, se?.poT2Remark),
    noBillEnum: se?.noBillEnum == null ? '--' : String(se.noBillEnum),
    secondNotifierName: displayText(se?.secondNotifierName),
    secondNotifierContent: displayText(se?.secondNotifierContent),
  };
});

/** 折叠态一行摘要：船名/航次 · ETD · POL→POD */
const masterVoyageSummary = computed(() => {
  const m = masterReadonly.value;
  const vesselVoy =
    m.vessel === '--' && m.innerVoyno === '--'
      ? '--'
      : `${m.vessel === '--' ? '' : m.vessel}${
          m.innerVoyno === '--' ? '' : ` / ${m.innerVoyno}`
        }`.trim() || '--';
  const lane =
    m.pol === '--' && m.pod === '--'
      ? '--'
      : `${m.pol === '--' ? '?' : m.pol} → ${m.pod === '--' ? '?' : m.pod}`;
  return `${vesselVoy} · ETD ${m.etd} · ${lane}`;
});

const loadMasterDetail = async () => {
  if (!seaExportId.value) return;
  masterLoading.value = true;
  try {
    masterDetail.value = await getSeaExportDetail(seaExportId.value);
  } finally {
    masterLoading.value = false;
  }
};

const loadData = async () => {
  if (!seaExportId.value) return;
  loading.value = true;
  try {
    const res = await getSeparatePagedList({
      seaExportId: seaExportId.value,
      keyword: keyword.value || undefined,
      pageIndex: currentPage.value,
      pageSize: pageSize.value,
      sorting: 'Id DESC',
    });
    dataSource.value = res.items || [];
    selectedSeparateKeys.value = [];
    totalCount.value = res.totalCount || 0;
  } finally {
    loading.value = false;
  }
};

const runKeywordSearch = () => {
  currentPage.value = 1;
  return loadData();
};

const debouncedKeywordSearch = useDebounceFn(runKeywordSearch, 400);

const onKeywordChange = (v: string) => {
  keyword.value = v;
  debouncedKeywordSearch();
};

const modalVisible = ref(false);
const modalTitle = ref('');
const submitting = ref(false);
const editingId = ref<string | undefined>();
const formData = ref<Record<string, any>>({});
const ctnList = ref<CtnEditRow[]>([]);
const selectedCtnKeys = ref<(string | number)[]>([]);
/** 通知人 / 第二通知人切换，默认通知人（对齐基础信息）；国外代理独立在下方 */
const notifierPartyTab = ref<'notifier' | 'secondNotifier'>('notifier');

let ctnRowKeyCounter = 0;

const toSelectedItems = (id: any, name: any, labelKey = 'name') => {
  if (id == null) return [];
  return [{ id, [labelKey]: name || '' }] as any[];
};

const mapMasterCtns = (
  orderCtns?: SeaExportAdminApi.OrderCtnAddDto[] | null,
): CtnEditRow[] =>
  (orderCtns || []).map((ctn) => ({
    ctnCodeId: ctn.ctnCodeId,
    ctnCodeName: ctn.ctnCodeName,
    ctnNo: ctn.ctnNo,
    sealNo: ctn.sealNo,
    pkgs: ctn.pkgs,
    codePackageId: ctn.codePackageId,
    codePackageName: (ctn as { codePackageName?: string }).codePackageName,
    grossWeight: ctn.grossWeight,
    tareWeight: ctn.tareWeight,
    overLength: ctn.overLength,
    overWidth: ctn.overWidth,
    overHeight: ctn.overHeight,
    volume: ctn.volume,
    codeGoodsId: ctn.codeGoodsId,
    codeGoodsName: (ctn as { codeGoodsName?: string }).codeGoodsName,
    bookingNo: ctn.bookingNo,
    remark: ctn.remark,
    _rowKey: `ctn_${++ctnRowKeyCounter}_${Date.now()}`,
  }));

/**
 * 从主单带入字段。
 * - defaults：新增默认 —— 仅运费/签单条款 + 装箱，不带收发通与货描（分票常与主单不同）
 * - full：「读入主单」—— 收发通/代理、条款、货描件毛体、装箱全部覆盖
 */
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
    codeIssueTypeName: se.codeIssueTypeName,
    codeFrtId: to.codeFrtId,
    codeFrtName: to.codeFrtName,
    codeServiceId: to.codeServiceId,
    codeServiceName: to.codeServiceName,
    prepareAtId: se.prepareAtId,
    prepareAtName: se.prepareAtName,
    signingPortId: se.signingPortId,
    signingPortName: se.signingPortName,
    signingTime: toDayjs(se.signingTime),
  };

  if (mode === 'defaults') {
    formData.value = { ...formData.value, ...terms };
  } else {
    formData.value = {
      ...formData.value,
      ...terms,
      shipperId: to.shipperId,
      shipperName: to.shipperName,
      shipperContent: to.shipperContent,
      consigneeId: to.consigneeId,
      consigneeName: to.consigneeName,
      consigneeContent: to.consigneeContent,
      notifierId: to.notifierId,
      notifierName: to.notifierName,
      notifierContent: to.notifierContent,
      podAgentId: se.podAgentId,
      podAgentName: se.podAgentName,
      podAgentContent: se.podAgentContent,
      marks: to.marks,
      goodsDes: to.goodsDes,
      pkgs: to.pkgs,
      codePackageId: to.codePackageId,
      codePackageName: to.codePackageName,
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

const confirmLoadFromMaster = () => {
  Modal.confirm({
    title: $t('seaExport.export.separate.loadFromMaster'),
    content: $t('seaExport.export.separate.loadFromMasterConfirm'),
    onOk: () => applyMasterToForm('full'),
  });
};

const openAddModal = async () => {
  editingId.value = undefined;
  modalTitle.value = $t('seaExport.export.separate.add');
  formData.value = {};
  ctnList.value = [];
  selectedCtnKeys.value = [];
  notifierPartyTab.value = 'notifier';
  masterVoyageExpanded.value = false;
  if (!masterDetail.value && !masterLoading.value) {
    await loadMasterDetail();
  }
  applyMasterToForm('defaults', true);
  modalVisible.value = true;
};

const openEditModal = (record: SeaExportSeparateAdminApi.SeparateDto) => {
  editingId.value = record.id;
  modalTitle.value = $t('seaExport.export.separate.edit');
  notifierPartyTab.value = 'notifier';
  masterVoyageExpanded.value = false;
  formData.value = {
    consigneeId: record.consigneeId,
    consigneeName: record.consigneeName,
    consigneeContent: record.consigneeContent,
    shipperId: record.shipperId,
    shipperName: record.shipperName,
    shipperContent: record.shipperContent,
    notifierId: record.notifierId,
    notifierName: record.notifierName,
    notifierContent: record.notifierContent,
    podAgentId: record.podAgentId,
    podAgentName: record.podAgentName,
    podAgentContent: record.podAgentContent,
    blNum: record.blNum,
    marks: record.marks,
    pkgs: record.pkgs,
    codePackageId: record.codePackageId,
    codePackageName: record.codePackageName,
    kgs: record.kgs,
    cbm: record.cbm,
    goodsDes: record.goodsDes,
    codeIssueTypeId: record.codeIssueTypeId,
    codeIssueTypeName: record.codeIssueTypeName,
    signingPortId: record.signingPortId,
    signingPortName: record.signingPortName,
    signingTime: toDayjs(record.signingTime),
    codeFrtId: record.codeFrtId,
    codeFrtName: record.codeFrtName,
    prepareAtId: record.prepareAtId,
    prepareAtName: record.prepareAtName,
    codeServiceId: record.codeServiceId,
    codeServiceName: record.codeServiceName,
  };
  ctnList.value = (record.seaExportSeparateCtns || []).map((ctn) => ({
    ...ctn,
    _rowKey: `ctn_${++ctnRowKeyCounter}_${Date.now()}`,
  }));
  selectedCtnKeys.value = [];
  modalVisible.value = true;
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

/** 按装箱明细合计回填件/毛/体 */
const updateCargoTotalsFromCtn = () => {
  const sum = (key: 'pkgs' | 'grossWeight' | 'volume') =>
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

const measureCtnFields = new Set([
  'grossWeight',
  'tareWeight',
  'volume',
  'overLength',
  'overWidth',
  'overHeight',
]);

const isMeasureCtnField = (key: unknown) =>
  typeof key === 'string' && measureCtnFields.has(key);

const getCtnFieldValue = (record: Record<string, any>, key: unknown) => {
  if (typeof key !== 'string') return undefined;
  return record[key];
};

const updateCtnMeasureRow = (index: number, key: unknown, value: any) => {
  if (typeof key !== 'string') return;
  updateCtnRow(index, key, value);
};

const buildCtnPayload = () => {
  return ctnList.value
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
};

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
    if (editingId.value) {
      await editSeparate({
        id: editingId.value,
        ...buildPayload(),
      });
    } else {
      await addSeparate(buildPayload());
    }
    message.success($t('ui.actionMessage.operationSuccess'));
    modalVisible.value = false;
    loadData();
  } finally {
    submitting.value = false;
  }
};

const selectedSeparateRows = computed(() =>
  dataSource.value.filter((item) =>
    selectedSeparateKeys.value.includes(item.id),
  ),
);

const handleEditSelected = () => {
  if (selectedSeparateRows.value.length !== 1) return;
  openEditModal(selectedSeparateRows.value[0]!);
};

const handleDeleteSelected = () => {
  if (!selectedSeparateRows.value.length) return;
  Modal.confirm({
    title: $t('ui.actionTitle.delete', [$t('seaExport.export.separate.name')]),
    content: $t('ui.actionMessage.deleteConfirm', [
      `${selectedSeparateRows.value.length}`,
    ]),
    okType: 'danger',
    async onOk() {
      await deleteSeparate({
        ids: selectedSeparateRows.value.map((item) => item.id),
      });
      message.success($t('ui.actionMessage.operationSuccess'));
      loadData();
    },
  });
};

const listColumns = [
  {
    title: $t('seaExport.export.separate.blNum'),
    dataIndex: 'blNum',
    width: 140,
  },
  {
    title: $t('seaExport.export.consigneeId'),
    dataIndex: 'consigneeName',
    width: 140,
  },
  {
    title: $t('seaExport.export.shipperId'),
    dataIndex: 'shipperName',
    width: 140,
  },
  {
    title: $t('seaExport.export.notifierId'),
    dataIndex: 'notifierName',
    width: 140,
  },
  {
    title: $t('seaExport.export.podAgentId'),
    dataIndex: 'podAgentName',
    width: 140,
  },
  {
    title: $t('seaExport.export.pkgs'),
    dataIndex: 'pkgs',
    width: 90,
  },
  {
    title: $t('seaExport.export.codePackageId'),
    dataIndex: 'codePackageName',
    width: 100,
  },
  {
    title: $t('seaExport.export.kgs'),
    dataIndex: 'kgs',
    width: 100,
  },
  {
    title: $t('seaExport.export.cbm'),
    dataIndex: 'cbm',
    width: 100,
  },
  {
    title: $t('seaExport.export.codeFrtId'),
    dataIndex: 'codeFrtName',
    width: 110,
  },
  {
    title: $t('seaExport.export.codeServiceId'),
    dataIndex: 'codeServiceName',
    width: 110,
  },
  {
    title: $t('seaExport.export.signingTime'),
    dataIndex: 'signingTime',
    width: 140,
    customRender: ({ text }: any) => formatDate(text),
  },
  {
    title: $t('seaExport.export.goodsDes'),
    dataIndex: 'goodsDes',
    width: 180,
    ellipsis: true,
  },
  {
    title: $t('seaExport.export.creationTime'),
    dataIndex: 'creationTime',
    width: 140,
    customRender: ({ text }: any) => formatDate(text),
  },
];

const ctnColumns = [
  {
    title: $t('seaExport.export.separate.ctnCodeId'),
    key: 'ctnCodeId',
    width: 120,
  },
  {
    title: $t('seaExport.export.separate.ctnNo'),
    key: 'ctnNo',
    width: 120,
  },
  {
    title: $t('seaExport.export.separate.sealNo'),
    key: 'sealNo',
    width: 100,
  },
  {
    title: $t('seaExport.export.separate.pkgs'),
    key: 'pkgs',
    width: 80,
  },
  {
    title: $t('seaExport.export.separate.codePackageId'),
    key: 'codePackageId',
    width: 110,
  },
  {
    title: $t('seaExport.export.separate.grossWeight'),
    key: 'grossWeight',
    width: 100,
  },
  {
    title: $t('seaExport.export.separate.tareWeight'),
    key: 'tareWeight',
    width: 100,
  },
  {
    title: $t('seaExport.export.separate.volume'),
    key: 'volume',
    width: 90,
  },
  {
    title: $t('seaExport.export.separate.overLength'),
    key: 'overLength',
    width: 90,
  },
  {
    title: $t('seaExport.export.separate.overWidth'),
    key: 'overWidth',
    width: 90,
  },
  {
    title: $t('seaExport.export.separate.overHeight'),
    key: 'overHeight',
    width: 90,
  },
  {
    title: $t('seaExport.export.separate.codeGoodsId'),
    key: 'codeGoodsId',
    width: 110,
  },
  {
    title: $t('seaExport.export.separate.bookingNo'),
    key: 'bookingNo',
    width: 120,
  },
  {
    title: $t('seaExport.export.separate.ctnRemark'),
    key: 'remark',
    width: 120,
  },
];

onMounted(() => {
  loadData();
  loadMasterDetail();
});
</script>

<template>
  <div class="separate-container p-2">
    <Card>
      <template #title>
        <span class="flex items-center gap-2 text-sm font-medium">
          <IconifyIcon icon="mdi:file-document-multiple" class="text-base" />
          {{ $t('seaExport.export.separate.list') }}
        </span>
      </template>
      <template #extra>
        <Space>
          <Input
            :value="keyword"
            :placeholder="$t('seaExport.export.separate.keyword')"
            allow-clear
            style="width: 240px"
            @update:value="onKeywordChange"
          />
          <Button
            type="primary"
            class="!inline-flex !items-center !gap-1"
            @click="openAddModal"
          >
            <IconifyIcon icon="mdi:plus" class="shrink-0 text-base" />
            {{ $t('seaExport.export.separate.add') }}
          </Button>
          <Button
            class="!inline-flex !items-center !gap-1"
            :disabled="selectedSeparateKeys.length !== 1"
            @click="handleEditSelected"
          >
            <IconifyIcon icon="mdi:pencil" class="shrink-0 text-base" />
            {{ $t('common.edit') }}
          </Button>
          <Button
            class="!inline-flex !items-center !gap-1"
            danger
            :disabled="!selectedSeparateKeys.length"
            @click="handleDeleteSelected"
          >
            <IconifyIcon icon="mdi:delete" class="shrink-0 text-base" />
            {{ $t('common.delete') }}
          </Button>
        </Space>
      </template>

      <Spin :spinning="loading">
        <Table
          :data-source="dataSource"
          :columns="listColumns"
          :row-selection="{
            selectedRowKeys: selectedSeparateKeys,
            onChange: (keys) => {
              selectedSeparateKeys = keys;
            },
          }"
          :pagination="{
            current: currentPage,
            pageSize,
            total: totalCount,
            showSizeChanger: true,
            showTotal: (total) => `${total}`,
            onChange: (page, size) => {
              currentPage = page;
              pageSize = size;
              loadData();
            },
          }"
          :scroll="{ x: 1700 }"
          size="small"
          bordered
          row-key="id"
        />
      </Spin>
    </Card>

    <Modal
      :open="modalVisible"
      :title="modalTitle"
      :width="1280"
      :confirm-loading="submitting"
      destroy-on-close
      :body-style="{ maxHeight: '78vh', overflowY: 'auto', paddingTop: '12px' }"
      @ok="handleSubmit"
      @cancel="modalVisible = false"
    >
      <div class="separate-form">
        <!-- 1. 提单身份 + 运费条款 -->
        <div class="section-block">
          <div class="meta-grid meta-grid--identity">
            <div class="form-item">
              <label class="field-label">
                {{ $t('seaExport.export.mblNum') }}
              </label>
              <div class="readonly-text">{{ masterReadonly.mblNum }}</div>
            </div>
            <div class="form-item">
              <label class="field-label">
                {{ $t('seaExport.export.separate.blNum') }}
              </label>
              <Input
                :value="formData.blNum"
                :maxlength="64"
                allow-clear
                @update:value="(v) => (formData.blNum = v)"
              />
            </div>
            <div class="form-item">
              <label class="field-label">
                {{ $t('seaExport.export.bookingNum') }}
              </label>
              <div class="readonly-text">{{ masterReadonly.bookingNum }}</div>
            </div>
            <div class="form-item">
              <label class="field-label">
                {{ $t('seaExport.export.carrierId') }}
              </label>
              <div class="readonly-text">{{ masterReadonly.carrierName }}</div>
            </div>
            <div class="form-item">
              <label class="field-label">
                {{ $t('seaExport.export.noBillEnum') }}
              </label>
              <div class="readonly-text">{{ masterReadonly.noBillEnum }}</div>
            </div>
            <div class="form-item">
              <label class="field-label">
                {{ $t('seaExport.export.codeServiceId') }}
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
                class="w-full"
                :placeholder="$t('ui.placeholder.select')"
              />
            </div>
            <div class="form-item">
              <label class="field-label">
                {{ $t('seaExport.export.codeFrtId') }}
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
                class="w-full"
                :placeholder="$t('ui.placeholder.select')"
              />
            </div>
            <div class="form-item">
              <label class="field-label">
                {{ $t('seaExport.export.prepareAtId') }}
              </label>
              <PortSelect
                v-model="formData.prepareAtId"
                :selected-items="
                  toSelectedItems(
                    formData.prepareAtId,
                    formData.prepareAtName,
                    'cnName',
                  )
                "
                class="w-full"
                :placeholder="$t('ui.placeholder.select')"
              />
            </div>
          </div>
        </div>

        <!-- 2. 主单船期港口（默认折叠） -->
        <div class="section-block">
          <div
            class="section-bar section-bar--toggle"
            @click="masterVoyageExpanded = !masterVoyageExpanded"
          >
            <span>{{ $t('seaExport.export.separate.voyagePortSection') }}</span>
            <span class="master-summary">{{ masterVoyageSummary }}</span>
            <button
              type="button"
              class="expand-btn"
              @click.stop="masterVoyageExpanded = !masterVoyageExpanded"
            >
              {{
                masterVoyageExpanded
                  ? $t('seaExport.export.separate.collapse')
                  : $t('seaExport.export.separate.expand')
              }}
            </button>
          </div>
          <div v-show="masterVoyageExpanded" class="voyage-grid">
            <div class="form-item">
              <label class="field-label">{{
                $t('seaExport.export.etd')
              }}</label>
              <div class="readonly-text">{{ masterReadonly.etd }}</div>
            </div>
            <div class="form-item">
              <label class="field-label">{{
                $t('seaExport.export.atd')
              }}</label>
              <div class="readonly-text">{{ masterReadonly.atd }}</div>
            </div>
            <div class="form-item">
              <label class="field-label">{{
                $t('seaExport.export.eta')
              }}</label>
              <div class="readonly-text">{{ masterReadonly.eta }}</div>
            </div>
            <div class="form-item">
              <label class="field-label">{{
                $t('seaExport.export.closingTime')
              }}</label>
              <div class="readonly-text">{{ masterReadonly.closingTime }}</div>
            </div>
            <div class="form-item">
              <label class="field-label">{{
                $t('seaExport.export.vessel')
              }}</label>
              <div class="readonly-text">{{ masterReadonly.vessel }}</div>
            </div>
            <div class="form-item">
              <label class="field-label">{{
                $t('seaExport.export.innerVoyno')
              }}</label>
              <div class="readonly-text">{{ masterReadonly.innerVoyno }}</div>
            </div>
            <div class="form-item">
              <label class="field-label">{{
                $t('seaExport.export.receivePortId')
              }}</label>
              <div class="readonly-text">{{ masterReadonly.receivePort }}</div>
            </div>
            <div class="form-item">
              <label class="field-label">{{
                $t('seaExport.export.polId')
              }}</label>
              <div class="readonly-text">{{ masterReadonly.pol }}</div>
            </div>
            <div class="form-item">
              <label class="field-label">{{
                $t('seaExport.export.podId')
              }}</label>
              <div class="readonly-text">{{ masterReadonly.pod }}</div>
            </div>
            <div class="form-item">
              <label class="field-label">{{
                $t('seaExport.export.deliverPortId')
              }}</label>
              <div class="readonly-text">{{ masterReadonly.deliverPort }}</div>
            </div>
            <div class="form-item">
              <label class="field-label">{{
                $t('seaExport.export.poT1Id')
              }}</label>
              <div class="readonly-text">{{ masterReadonly.pot1 }}</div>
            </div>
            <div class="form-item">
              <label class="field-label">{{
                $t('seaExport.export.poT2Id')
              }}</label>
              <div class="readonly-text">{{ masterReadonly.pot2 }}</div>
            </div>
          </div>
        </div>

        <!-- 3. 中区：左收发通 | 右货物 -->
        <div class="mid-split">
          <div class="party-col">
            <div class="party-block">
              <div class="party-head">
                <label class="field-label">{{
                  $t('seaExport.export.shipperId')
                }}</label>
                <ClientSelect
                  v-model="formData.shipperId"
                  :selected-items="
                    toSelectedItems(formData.shipperId, formData.shipperName)
                  "
                  industry-category="b"
                  class="party-select"
                  :placeholder="$t('ui.placeholder.select')"
                />
              </div>
              <Input.TextArea
                :value="formData.shipperContent"
                :maxlength="1024"
                :rows="3"
                class="party-textarea"
                allow-clear
                @update:value="(v) => (formData.shipperContent = v)"
              />
            </div>
            <div class="party-block">
              <div class="party-head">
                <label class="field-label">{{
                  $t('seaExport.export.consigneeId')
                }}</label>
                <ClientSelect
                  v-model="formData.consigneeId"
                  :selected-items="
                    toSelectedItems(
                      formData.consigneeId,
                      formData.consigneeName,
                    )
                  "
                  industry-category="e"
                  class="party-select"
                  :placeholder="$t('ui.placeholder.select')"
                />
              </div>
              <Input.TextArea
                :value="formData.consigneeContent"
                :maxlength="1024"
                :rows="3"
                class="party-textarea"
                allow-clear
                @update:value="(v) => (formData.consigneeContent = v)"
              />
            </div>
            <div class="party-block">
              <div class="party-head">
                <div class="party-tab-row">
                  <span class="notifier-tabs">
                    <button
                      type="button"
                      class="notifier-tabs__item"
                      :class="{
                        'notifier-tabs__item--active':
                          notifierPartyTab === 'notifier',
                      }"
                      @click="notifierPartyTab = 'notifier'"
                    >
                      {{ $t('seaExport.export.notifierId') }}
                    </button>
                    <button
                      type="button"
                      class="notifier-tabs__item"
                      :class="{
                        'notifier-tabs__item--active':
                          notifierPartyTab === 'secondNotifier',
                      }"
                      @click="notifierPartyTab = 'secondNotifier'"
                    >
                      {{ $t('seaExport.export.secondNotifierId') }}
                    </button>
                  </span>
                </div>
                <ClientSelect
                  v-if="notifierPartyTab === 'notifier'"
                  v-model="formData.notifierId"
                  :selected-items="
                    toSelectedItems(formData.notifierId, formData.notifierName)
                  "
                  industry-category="h"
                  class="party-select"
                  :placeholder="$t('ui.placeholder.select')"
                />
                <div v-else class="readonly-text">
                  {{ masterReadonly.secondNotifierName }}
                </div>
              </div>
              <Input.TextArea
                v-if="notifierPartyTab === 'notifier'"
                :value="formData.notifierContent"
                :maxlength="1024"
                :rows="3"
                class="party-textarea"
                allow-clear
                @update:value="(v) => (formData.notifierContent = v)"
              />
              <div
                v-else
                class="readonly-text readonly-text--multiline readonly-text--compact"
              >
                {{
                  masterReadonly.secondNotifierContent === '--'
                    ? '--'
                    : masterReadonly.secondNotifierContent
                }}
              </div>
            </div>
            <div class="party-block">
              <div class="party-head">
                <label class="field-label">{{
                  $t('seaExport.export.overseasAgent')
                }}</label>
                <ClientSelect
                  v-model="formData.podAgentId"
                  :selected-items="
                    toSelectedItems(formData.podAgentId, formData.podAgentName)
                  "
                  industry-category="q"
                  class="party-select"
                  :placeholder="$t('ui.placeholder.select')"
                />
              </div>
              <Input.TextArea
                :value="formData.podAgentContent"
                :maxlength="1024"
                :rows="3"
                class="party-textarea"
                allow-clear
                @update:value="(v) => (formData.podAgentContent = v)"
              />
            </div>
          </div>

          <div class="cargo-col">
            <div class="section-bar">
              {{ $t('seaExport.export.separate.cargoSection') }}
            </div>
            <div class="cargo-grid cargo-grid--stack">
              <div class="form-item">
                <label class="field-label">{{
                  $t('seaExport.export.marks')
                }}</label>
                <Input.TextArea
                  :value="formData.marks"
                  :rows="4"
                  class="cargo-textarea"
                  allow-clear
                  @update:value="(v) => (formData.marks = v)"
                />
              </div>
              <div class="form-item">
                <label class="field-label">{{
                  $t('seaExport.export.goodsDes')
                }}</label>
                <Input.TextArea
                  :value="formData.goodsDes"
                  :rows="6"
                  class="cargo-textarea"
                  allow-clear
                  @update:value="(v) => (formData.goodsDes = v)"
                />
              </div>
              <div class="cargo-metrics cargo-metrics--row">
                <div class="form-item">
                  <label class="field-label">{{
                    $t('seaExport.export.pkgs')
                  }}</label>
                  <InputNumber
                    :value="formData.pkgs"
                    class="w-full"
                    :min="0"
                    :controls="false"
                    @update:value="(v) => (formData.pkgs = v)"
                  />
                </div>
                <div class="form-item">
                  <label class="field-label">{{
                    $t('seaExport.export.codePackageId')
                  }}</label>
                  <CodePackageSelect
                    v-model="formData.codePackageId"
                    :selected-items="
                      toSelectedItems(
                        formData.codePackageId,
                        formData.codePackageName,
                      )
                    "
                    class="w-full"
                    :placeholder="$t('ui.placeholder.select')"
                  />
                </div>
                <div class="form-item">
                  <label class="field-label">{{
                    $t('seaExport.export.kgs')
                  }}</label>
                  <InputNumber
                    :value="formData.kgs"
                    class="w-full"
                    :min="0"
                    :controls="false"
                    :precision="2"
                    @update:value="(v) => (formData.kgs = v)"
                  />
                </div>
                <div class="form-item">
                  <label class="field-label">{{
                    $t('seaExport.export.cbm')
                  }}</label>
                  <InputNumber
                    :value="formData.cbm"
                    class="w-full"
                    :min="0"
                    :controls="false"
                    :precision="2"
                    @update:value="(v) => (formData.cbm = v)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. 装箱通栏（分票主操作） -->
        <div class="ctn-block">
          <div class="ctn-toolbar">
            <span class="section-title">{{
              $t('seaExport.export.separate.ctnTable')
            }}</span>
            <Space size="small">
              <Button size="small" type="primary" ghost @click="addCtnRow">
                + {{ $t('seaExport.export.separate.addCtn') }}
              </Button>
              <Button
                size="small"
                danger
                ghost
                :disabled="!selectedCtnKeys.length"
                @click="removeCtnRows"
              >
                - {{ $t('common.delete') }}
              </Button>
              <Tooltip :title="$t('seaExport.export.separate.updateTotal')">
                <Button size="small" @click="updateCargoTotalsFromCtn">
                  {{ $t('seaExport.export.separate.updateTotal') }}
                </Button>
              </Tooltip>
              <Tooltip
                :title="$t('seaExport.export.separate.loadFromMasterTip')"
              >
                <Button
                  size="small"
                  :loading="masterLoading"
                  @click="confirmLoadFromMaster"
                >
                  {{ $t('seaExport.export.separate.loadFromMaster') }}
                </Button>
              </Tooltip>
            </Space>
          </div>
          <Table
            :data-source="ctnList"
            :columns="ctnColumns"
            :row-selection="{
              selectedRowKeys: selectedCtnKeys,
              onChange: (keys) => {
                selectedCtnKeys = keys;
              },
            }"
            :pagination="false"
            :scroll="{ x: 1400, y: 220 }"
            size="small"
            bordered
            row-key="_rowKey"
          >
            <template #bodyCell="{ column, record, index }">
              <template v-if="column.key === 'ctnCodeId'">
                <CtnSelect
                  :model-value="record.ctnCodeId"
                  :selected-items="
                    toSelectedItems(
                      record.ctnCodeId,
                      record.ctnCodeName,
                      'ctnName',
                    )
                  "
                  class="w-full min-w-[100px]"
                  :placeholder="$t('ui.placeholder.select')"
                  @update:model-value="
                    (v) => updateCtnRow(index, 'ctnCodeId', v)
                  "
                />
              </template>
              <template v-else-if="column.key === 'ctnNo'">
                <Input
                  :value="record.ctnNo"
                  :maxlength="32"
                  allow-clear
                  @update:value="(v) => updateCtnRow(index, 'ctnNo', v)"
                />
              </template>
              <template v-else-if="column.key === 'sealNo'">
                <Input
                  :value="record.sealNo"
                  :maxlength="32"
                  allow-clear
                  @update:value="(v) => updateCtnRow(index, 'sealNo', v)"
                />
              </template>
              <template v-else-if="column.key === 'pkgs'">
                <InputNumber
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
                  class="w-full min-w-[90px]"
                  :placeholder="$t('ui.placeholder.select')"
                  @update:model-value="
                    (v) => updateCtnRow(index, 'codePackageId', v)
                  "
                />
              </template>
              <template v-else-if="isMeasureCtnField(column.key)">
                <InputNumber
                  :value="getCtnFieldValue(record, column.key)"
                  class="w-full"
                  :min="0"
                  :controls="false"
                  :precision="2"
                  @update:value="
                    (v) => updateCtnMeasureRow(index, column.key, v)
                  "
                />
              </template>
              <template v-else-if="column.key === 'codeGoodsId'">
                <CodeGoodsSelect
                  :model-value="record.codeGoodsId"
                  :selected-items="
                    toSelectedItems(record.codeGoodsId, record.codeGoodsName)
                  "
                  class="w-full min-w-[90px]"
                  :placeholder="$t('ui.placeholder.select')"
                  @update:model-value="
                    (v) => updateCtnRow(index, 'codeGoodsId', v)
                  "
                />
              </template>
              <template v-else-if="column.key === 'bookingNo'">
                <Input
                  :value="record.bookingNo"
                  :maxlength="64"
                  allow-clear
                  @update:value="(v) => updateCtnRow(index, 'bookingNo', v)"
                />
              </template>
              <template v-else-if="column.key === 'remark'">
                <Input
                  :value="record.remark"
                  :maxlength="1024"
                  allow-clear
                  @update:value="(v) => updateCtnRow(index, 'remark', v)"
                />
              </template>
            </template>
          </Table>
        </div>

        <!-- 5. 签单信息 -->
        <div class="section-block">
          <div class="section-bar">
            {{ $t('seaExport.export.separate.signingSection') }}
          </div>
          <div class="signing-grid">
            <div class="form-item">
              <label class="field-label">{{
                $t('seaExport.export.issueType')
              }}</label>
              <CodeIssueTypeSelect
                v-model="formData.codeIssueTypeId"
                :selected-items="
                  toSelectedItems(
                    formData.codeIssueTypeId,
                    formData.codeIssueTypeName,
                    'billType',
                  )
                "
                class="w-full"
                :placeholder="$t('ui.placeholder.select')"
              />
            </div>
            <div class="form-item">
              <label class="field-label">{{
                $t('seaExport.export.signingTime')
              }}</label>
              <DatePicker
                :value="formData.signingTime"
                class="w-full"
                show-time
                format="YYYY-MM-DD HH:mm"
                @update:value="(v) => (formData.signingTime = v)"
              />
            </div>
            <div class="form-item">
              <label class="field-label">{{
                $t('seaExport.export.signingPortId')
              }}</label>
              <PortSelect
                v-model="formData.signingPortId"
                :selected-items="
                  toSelectedItems(
                    formData.signingPortId,
                    formData.signingPortName,
                    'cnName',
                  )
                "
                class="w-full"
                :placeholder="$t('ui.placeholder.select')"
              />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.separate-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field-label {
  margin-bottom: 4px;
  font-size: 12px;
  line-height: 1.2;
  color: rgb(107 114 128);
}

.form-item {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px 12px;
}

.mid-split {
  display: grid;
  grid-template-columns: minmax(280px, 1fr) minmax(320px, 1.1fr);
  gap: 16px;
  align-items: start;
}

.party-col,
.cargo-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.party-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.party-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.party-tab-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.notifier-tabs {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

.notifier-tabs__item {
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

.notifier-tabs__item--active {
  font-weight: 600;
  color: #1677ff;
  background: #e6f4ff;
  border-color: #91caff;
}

.party-head .field-label {
  margin-bottom: 0;
}

.party-select {
  width: 100%;
  min-width: 0;
}

.party-textarea :deep(textarea) {
  resize: vertical;
}

.ctn-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.ctn-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 13px;
  font-weight: 500;
  color: rgb(75 85 99);
}

.section-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-bar {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 13px;
  font-weight: 500;
  color: rgb(55 65 81);
}

.section-bar::before {
  width: 3px;
  height: 14px;
  content: '';
  background: hsl(var(--primary));
  border-radius: 2px;
}

.section-bar--toggle {
  cursor: pointer;
  user-select: none;
}

.master-summary {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  font-weight: 400;
  color: rgb(107 114 128);
  white-space: nowrap;
}

.expand-btn {
  padding: 2px 8px;
  font-size: 12px;
  color: #1677ff;
  cursor: pointer;
  background: transparent;
  border: none;
}

.voyage-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px 12px;
}

.signing-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px 12px;
}

.readonly-text {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  min-height: 32px;
  padding: 4px 0 6px;
  font-size: 13px;
  line-height: 1.4;
  color: rgb(31 41 55);
  overflow-wrap: anywhere;
  border-bottom: 1px dashed rgb(229 231 235);
}

.readonly-text--multiline {
  align-items: flex-start;
  min-height: 72px;
  padding: 8px 0;
  white-space: pre-wrap;
  border-bottom: none;
}

.readonly-text--compact {
  min-height: 64px;
}

.cargo-grid--stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cargo-textarea :deep(textarea) {
  resize: vertical;
}

.cargo-metrics--row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.separate-container :deep(.ant-table-tbody > tr.ant-table-row-selected > td),
.separate-container
  :deep(.ant-table-tbody > tr.ant-table-row-selected:hover > td),
.separate-container
  :deep(
    .ant-table-tbody > tr.ant-table-row-selected > td.ant-table-cell-row-hover
  ) {
  background: hsl(var(--primary) / 15%) !important;
}

@media (max-width: 1100px) {
  .meta-grid,
  .mid-split,
  .voyage-grid,
  .signing-grid,
  .cargo-metrics--row {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
