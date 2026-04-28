<script lang="ts" setup>
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

let ctnRowKeyCounter = 0;

const toSelectedItems = (id: any, name: any, labelKey = 'name') => {
  if (id == null) return [];
  return [{ id, [labelKey]: name || '' }] as any[];
};

const openAddModal = () => {
  editingId.value = undefined;
  modalTitle.value = $t('seaExport.export.separate.add');
  formData.value = {};
  ctnList.value = [];
  selectedCtnKeys.value = [];
  modalVisible.value = true;
};

const openEditModal = (record: SeaExportSeparateAdminApi.SeparateDto) => {
  editingId.value = record.id;
  modalTitle.value = $t('seaExport.export.separate.edit');
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
        >
          <template #expandedRowRender="{ record }">
            <div
              v-if="record.seaExportSeparateCtns?.length"
              class="bg-gray-50 p-2"
            >
              <Table
                :data-source="record.seaExportSeparateCtns"
                :pagination="false"
                size="small"
                bordered
                row-key="id"
              >
                <Table.Column
                  :title="$t('seaExport.export.separate.ctnCodeId')"
                  data-index="ctnCodeName"
                  :width="100"
                />
                <Table.Column
                  :title="$t('seaExport.export.separate.ctnNo')"
                  data-index="ctnNo"
                  :width="120"
                />
                <Table.Column
                  :title="$t('seaExport.export.separate.sealNo')"
                  data-index="sealNo"
                  :width="100"
                />
                <Table.Column
                  :title="$t('seaExport.export.separate.pkgs')"
                  data-index="pkgs"
                  :width="80"
                />
                <Table.Column
                  :title="$t('seaExport.export.separate.codePackageId')"
                  data-index="codePackageName"
                  :width="100"
                />
                <Table.Column
                  :title="$t('seaExport.export.separate.grossWeight')"
                  data-index="grossWeight"
                  :width="90"
                />
                <Table.Column
                  :title="$t('seaExport.export.separate.tareWeight')"
                  data-index="tareWeight"
                  :width="90"
                />
                <Table.Column
                  :title="$t('seaExport.export.separate.volume')"
                  data-index="volume"
                  :width="80"
                />
                <Table.Column
                  :title="$t('seaExport.export.separate.codeGoodsId')"
                  data-index="codeGoodsName"
                  :width="100"
                />
                <Table.Column
                  :title="$t('seaExport.export.separate.bookingNo')"
                  data-index="bookingNo"
                  :width="120"
                />
                <Table.Column
                  :title="$t('seaExport.export.separate.ctnRemark')"
                  data-index="remark"
                  :width="120"
                />
              </Table>
            </div>
            <div v-else class="py-2 text-center text-gray-400">
              {{ $t('ui.fallback.noData') }}
            </div>
          </template>
        </Table>
      </Spin>
    </Card>

    <Modal
      :open="modalVisible"
      :title="modalTitle"
      :width="1200"
      :confirm-loading="submitting"
      destroy-on-close
      @ok="handleSubmit"
      @cancel="modalVisible = false"
    >
      <div class="separate-form grid grid-cols-4 gap-x-4 gap-y-3 py-2">
        <div class="form-item">
          <label class="mb-1 block text-xs text-gray-500">
            {{ $t('seaExport.export.consigneeId') }}
          </label>
          <ClientSelect
            v-model="formData.consigneeId"
            :selected-items="
              toSelectedItems(formData.consigneeId, formData.consigneeName)
            "
            industry-category="e"
            class="w-full"
            :placeholder="$t('ui.placeholder.select')"
          />
        </div>
        <div class="form-item">
          <label class="mb-1 block text-xs text-gray-500">
            {{ $t('seaExport.export.shipperId') }}
          </label>
          <ClientSelect
            v-model="formData.shipperId"
            :selected-items="
              toSelectedItems(formData.shipperId, formData.shipperName)
            "
            industry-category="b"
            class="w-full"
            :placeholder="$t('ui.placeholder.select')"
          />
        </div>
        <div class="form-item">
          <label class="mb-1 block text-xs text-gray-500">
            {{ $t('seaExport.export.notifierId') }}
          </label>
          <ClientSelect
            v-model="formData.notifierId"
            :selected-items="
              toSelectedItems(formData.notifierId, formData.notifierName)
            "
            industry-category="h"
            class="w-full"
            :placeholder="$t('ui.placeholder.select')"
          />
        </div>
        <div class="form-item">
          <label class="mb-1 block text-xs text-gray-500">
            {{ $t('seaExport.export.podAgentId') }}
          </label>
          <ClientSelect
            v-model="formData.podAgentId"
            :selected-items="
              toSelectedItems(formData.podAgentId, formData.podAgentName)
            "
            industry-category="q"
            class="w-full"
            :placeholder="$t('ui.placeholder.select')"
          />
        </div>

        <div class="form-item">
          <label class="mb-1 block text-xs text-gray-500">
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
          <label class="mb-1 block text-xs text-gray-500">
            {{ $t('seaExport.export.pkgs') }}
          </label>
          <InputNumber
            :value="formData.pkgs"
            class="w-full"
            :min="0"
            :controls="false"
            @update:value="(v) => (formData.pkgs = v)"
          />
        </div>
        <div class="form-item">
          <label class="mb-1 block text-xs text-gray-500">
            {{ $t('seaExport.export.codePackageId') }}
          </label>
          <CodePackageSelect
            v-model="formData.codePackageId"
            :selected-items="
              toSelectedItems(formData.codePackageId, formData.codePackageName)
            "
            class="w-full"
            :placeholder="$t('ui.placeholder.select')"
          />
        </div>
        <div class="form-item">
          <label class="mb-1 block text-xs text-gray-500">
            {{ $t('seaExport.export.kgs') }}
          </label>
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
          <label class="mb-1 block text-xs text-gray-500">
            {{ $t('seaExport.export.cbm') }}
          </label>
          <InputNumber
            :value="formData.cbm"
            class="w-full"
            :min="0"
            :controls="false"
            :precision="2"
            @update:value="(v) => (formData.cbm = v)"
          />
        </div>
        <div class="form-item">
          <label class="mb-1 block text-xs text-gray-500">
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
            class="w-full"
            :placeholder="$t('ui.placeholder.select')"
          />
        </div>
        <div class="form-item">
          <label class="mb-1 block text-xs text-gray-500">
            {{ $t('seaExport.export.signingPortId') }}
          </label>
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
        <div class="form-item">
          <label class="mb-1 block text-xs text-gray-500">
            {{ $t('seaExport.export.signingTime') }}
          </label>
          <DatePicker
            :value="formData.signingTime"
            class="w-full"
            show-time
            format="YYYY-MM-DD HH:mm"
            @update:value="(v) => (formData.signingTime = v)"
          />
        </div>
        <div class="form-item">
          <label class="mb-1 block text-xs text-gray-500">
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
          <label class="mb-1 block text-xs text-gray-500">
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
        <div class="form-item">
          <label class="mb-1 block text-xs text-gray-500">
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
        <div class="form-item col-span-2">
          <label class="mb-1 block text-xs text-gray-500">
            {{ $t('seaExport.export.marks') }}
          </label>
          <Input.TextArea
            :value="formData.marks"
            :rows="2"
            allow-clear
            @update:value="(v) => (formData.marks = v)"
          />
        </div>
        <div class="form-item col-span-2">
          <label class="mb-1 block text-xs text-gray-500">
            {{ $t('seaExport.export.goodsDes') }}
          </label>
          <Input.TextArea
            :value="formData.goodsDes"
            :rows="2"
            allow-clear
            @update:value="(v) => (formData.goodsDes = v)"
          />
        </div>
        <div class="form-item col-span-2">
          <label class="mb-1 block text-xs text-gray-500">
            {{ $t('seaExport.export.consigneeContent') }}
          </label>
          <Input.TextArea
            :value="formData.consigneeContent"
            :maxlength="1024"
            :rows="2"
            allow-clear
            @update:value="(v) => (formData.consigneeContent = v)"
          />
        </div>
        <div class="form-item col-span-2">
          <label class="mb-1 block text-xs text-gray-500">
            {{ $t('seaExport.export.shipperContent') }}
          </label>
          <Input.TextArea
            :value="formData.shipperContent"
            :maxlength="1024"
            :rows="2"
            allow-clear
            @update:value="(v) => (formData.shipperContent = v)"
          />
        </div>
        <div class="form-item col-span-2">
          <label class="mb-1 block text-xs text-gray-500">
            {{ $t('seaExport.export.notifierContent') }}
          </label>
          <Input.TextArea
            :value="formData.notifierContent"
            :maxlength="1024"
            :rows="2"
            allow-clear
            @update:value="(v) => (formData.notifierContent = v)"
          />
        </div>
        <div class="form-item col-span-2">
          <label class="mb-1 block text-xs text-gray-500">
            {{ $t('seaExport.export.podAgentContent') }}
          </label>
          <Input.TextArea
            :value="formData.podAgentContent"
            :maxlength="1024"
            :rows="2"
            allow-clear
            @update:value="(v) => (formData.podAgentContent = v)"
          />
        </div>
      </div>

      <div class="mt-4">
        <div class="mb-2 flex items-center gap-2">
          <span class="text-sm font-medium text-gray-600">
            {{ $t('seaExport.export.separate.ctnTable') }}
          </span>
          <Tooltip :title="$t('seaExport.export.separate.addCtn')">
            <Button
              type="text"
              size="small"
              class="!flex !h-7 !w-7 !items-center !justify-center !rounded-md !bg-[#e6f4ff] !p-0 transition-all hover:scale-105 hover:!bg-[#bae0ff]"
              @click="addCtnRow"
            >
              <IconifyIcon
                icon="mdi:add-box"
                class="text-[18px] text-[#1677ff]"
              />
            </Button>
          </Tooltip>
          <Tooltip :title="$t('common.delete')">
            <Button
              type="text"
              size="small"
              :class="[
                '!flex !h-7 !w-7 !items-center !justify-center !rounded-md !p-0 transition-all',
                selectedCtnKeys.length
                  ? '!bg-[#fff1f0] hover:scale-105 hover:!bg-[#ffccc7]'
                  : '!bg-[#f5f5f5]',
              ]"
              :disabled="!selectedCtnKeys.length"
              @click="removeCtnRows"
            >
              <IconifyIcon
                icon="mdi:close-box"
                :class="[
                  'text-[18px]',
                  selectedCtnKeys.length ? 'text-[#ff4d4f]' : 'text-[#bfbfbf]',
                ]"
              />
            </Button>
          </Tooltip>
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
          :scroll="{ x: 1600 }"
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
                @update:model-value="(v) => updateCtnRow(index, 'ctnCodeId', v)"
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
                  toSelectedItems(record.codePackageId, record.codePackageName)
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
                @update:value="(v) => updateCtnMeasureRow(index, column.key, v)"
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
    </Modal>
  </div>
</template>

<style scoped>
.separate-form .form-item {
  display: flex;
  flex-direction: column;
}

.separate-container :deep(.ant-table-tbody > tr.ant-table-row-selected > td),
.separate-container
  :deep(.ant-table-tbody > tr.ant-table-row-selected:hover > td),
.separate-container
  :deep(
    .ant-table-tbody > tr.ant-table-row-selected > td.ant-table-cell-row-hover
  ) {
  background: #e6f4ff !important;
}
</style>
