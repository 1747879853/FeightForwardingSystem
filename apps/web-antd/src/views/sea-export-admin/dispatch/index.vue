<script lang="ts" setup>
import type { SeaExportDispatchAdminApi } from '#/api/sea-export/dispatch-admin';

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

import AreaLeafCascader from '#/adapter/component/biz-select/area-leaf-cascader.vue';
import ClientSelect from '#/adapter/component/biz-select/client-select.vue';
import CtnSelect from '#/adapter/component/biz-select/ctn-select.vue';
import CodeGoodsSelect from '#/adapter/component/biz-select/code-goods-select.vue';
import CodePackageSelect from '#/adapter/component/biz-select/code-package-select.vue';
import {
  addDispatch,
  deleteDispatch,
  editDispatch,
  getDispatchPagedList,
} from '#/api/sea-export/dispatch-admin';
import { $t } from '#/locales';

defineOptions({
  name: 'SeaExportDispatch',
});

const route = useRoute();

const seaExportId = computed<string>(() => {
  const id = route.params.id;
  if (Array.isArray(id)) return id[0] || '';
  return id ? String(id) : '';
});

const loading = ref(false);
const dataSource = ref<SeaExportDispatchAdminApi.DispatchDto[]>([]);
const selectedDispatchKeys = ref<(string | number)[]>([]);
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
    const res = await getDispatchPagedList({
      seaExportId: seaExportId.value,
      keyword: keyword.value || undefined,
      skipCount: (currentPage.value - 1) * pageSize.value,
      maxResultCount: pageSize.value,
    });
    dataSource.value = res.items || [];
    selectedDispatchKeys.value = [];
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

// ==================== Form Modal ====================

const modalVisible = ref(false);
const modalTitle = ref('');
const submitting = ref(false);
const editingId = ref<string | undefined>();

const formData = ref<Record<string, any>>({});
const ctnList = ref<SeaExportDispatchAdminApi.DispatchCtnEditDto[]>([]);
const selectedCtnKeys = ref<(string | number)[]>([]);

let ctnRowKeyCounter = 0;

const openAddModal = () => {
  editingId.value = undefined;
  modalTitle.value = $t('seaExport.export.dispatch.add');
  formData.value = { sortId: 0 };
  ctnList.value = [];
  selectedCtnKeys.value = [];
  modalVisible.value = true;
};

const openEditModal = (record: SeaExportDispatchAdminApi.DispatchDto) => {
  editingId.value = record.id;
  modalTitle.value = $t('seaExport.export.dispatch.edit');
  formData.value = {
    teamId: record.teamId,
    requiredTime: toDayjs(record.requiredTime),
    dispatchTime: toDayjs(record.dispatchTime),
    factoryContact: record.factoryContact,
    factoryTel: record.factoryTel,
    yardId: record.yardId,
    closingTime: toDayjs(record.closingTime),
    factoryId: record.factoryId,
    areaId: record.areaId,
    address: record.address,
    precautions: record.precautions,
    sortId: record.sortId,
    remark: record.remark,
    teamName: record.teamName,
    yardName: record.yardName,
    factoryName: record.factoryName,
  };
  ctnList.value = (record.seaExportDispatchCtns || []).map((ctn) => ({
    ...ctn,
    _rowKey: `ctn_${++ctnRowKeyCounter}_${Date.now()}`,
  })) as any[];
  selectedCtnKeys.value = [];
  modalVisible.value = true;
};

const addCtnRow = () => {
  ctnList.value = [
    ...ctnList.value,
    { _rowKey: `ctn_${++ctnRowKeyCounter}_${Date.now()}` } as any,
  ];
};

const removeCtnRows = () => {
  if (!selectedCtnKeys.value.length) return;
  const keysSet = new Set(selectedCtnKeys.value);
  ctnList.value = ctnList.value.filter(
    (row) => !keysSet.has((row as any)._rowKey),
  );
  selectedCtnKeys.value = [];
};

const updateCtnRow = (index: number, field: string, value: any) => {
  const list = [...ctnList.value];
  if (!list[index])
    list[index] = { _rowKey: `ctn_${++ctnRowKeyCounter}_${Date.now()}` } as any;
  list[index] = { ...list[index], [field]: value };
  ctnList.value = list;
};

const toSelectedItems = (id: any, name: any, labelKey = 'name') => {
  if (id == null) return [];
  return [{ id, [labelKey]: name || '' }] as any[];
};

const handleSubmit = async () => {
  submitting.value = true;
  try {
    const ctns = ctnList.value
      .filter((c) => c.ctnCodeId)
      .map((c) => {
        const {
          _rowKey,
          ctnCodeName,
          codePackageName,
          codeGoodsName,
          codeGoodsHSCode,
          seaExportDispatchId,
          ...rest
        } = c as any;
        return rest;
      });

    if (editingId.value) {
      await editDispatch({
        id: editingId.value,
        seaExportId: seaExportId.value,
        teamId: formData.value.teamId,
        requiredTime: toDateString(formData.value.requiredTime),
        dispatchTime: toDateString(formData.value.dispatchTime),
        factoryContact: formData.value.factoryContact,
        factoryTel: formData.value.factoryTel,
        yardId: formData.value.yardId,
        closingTime: toDateString(formData.value.closingTime),
        factoryId: formData.value.factoryId,
        areaId: formData.value.areaId,
        address: formData.value.address,
        precautions: formData.value.precautions,
        sortId: formData.value.sortId,
        remark: formData.value.remark,
        seaExportDispatchCtns: ctns,
      });
    } else {
      await addDispatch({
        seaExportId: seaExportId.value,
        teamId: formData.value.teamId,
        requiredTime: toDateString(formData.value.requiredTime),
        dispatchTime: toDateString(formData.value.dispatchTime),
        factoryContact: formData.value.factoryContact,
        factoryTel: formData.value.factoryTel,
        yardId: formData.value.yardId,
        closingTime: toDateString(formData.value.closingTime),
        factoryId: formData.value.factoryId,
        areaId: formData.value.areaId,
        address: formData.value.address,
        precautions: formData.value.precautions,
        sortId: formData.value.sortId,
        remark: formData.value.remark,
        seaExportDispatchCtns: ctns,
      });
    }
    message.success($t('ui.actionMessage.operationSuccess'));
    modalVisible.value = false;
    loadData();
  } finally {
    submitting.value = false;
  }
};

const selectedDispatchRows = computed(() =>
  dataSource.value.filter((item) =>
    selectedDispatchKeys.value.includes(item.id),
  ),
);

const handleEditSelected = () => {
  if (selectedDispatchRows.value.length !== 1) return;
  openEditModal(selectedDispatchRows.value[0]!);
};

const handleDeleteSelected = () => {
  if (!selectedDispatchRows.value.length) return;
  Modal.confirm({
    title: $t('ui.actionTitle.delete', [$t('seaExport.export.dispatch.name')]),
    content: $t('ui.actionMessage.deleteConfirm', [
      `${selectedDispatchRows.value.length}`,
    ]),
    okType: 'danger',
    async onOk() {
      await Promise.all(
        selectedDispatchRows.value.map((item) =>
          deleteDispatch({ id: item.id }),
        ),
      );
      message.success($t('ui.actionMessage.operationSuccess'));
      loadData();
    },
  });
};

const listColumns = [
  {
    title: $t('seaExport.export.dispatch.teamId'),
    dataIndex: 'teamName',
    width: 120,
  },
  {
    title: $t('seaExport.export.dispatch.dispatchTime'),
    dataIndex: 'dispatchTime',
    width: 140,
    customRender: ({ text }: any) => formatDate(text),
  },
  {
    title: $t('seaExport.export.dispatch.requiredTime'),
    dataIndex: 'requiredTime',
    width: 140,
    customRender: ({ text }: any) => formatDate(text),
  },
  {
    title: $t('seaExport.export.dispatch.factoryId'),
    dataIndex: 'factoryName',
    width: 120,
  },
  {
    title: $t('seaExport.export.dispatch.factoryContact'),
    dataIndex: 'factoryContact',
    width: 100,
  },
  {
    title: $t('seaExport.export.dispatch.factoryTel'),
    dataIndex: 'factoryTel',
    width: 120,
  },
  {
    title: $t('seaExport.export.dispatch.yardId'),
    dataIndex: 'yardName',
    width: 120,
  },
  {
    title: $t('seaExport.export.dispatch.closingTime'),
    dataIndex: 'closingTime',
    width: 140,
    customRender: ({ text }: any) => formatDate(text),
  },
  {
    title: $t('seaExport.export.dispatch.address'),
    dataIndex: 'address',
    width: 200,
    ellipsis: true,
  },
  {
    title: $t('seaExport.export.dispatch.precautions'),
    dataIndex: 'precautions',
    width: 150,
    ellipsis: true,
  },
  {
    title: $t('seaExport.export.dispatch.remark'),
    dataIndex: 'remark',
    width: 150,
    ellipsis: true,
  },
  {
    title: $t('seaExport.export.dispatch.creationTime'),
    dataIndex: 'creationTime',
    width: 140,
    customRender: ({ text }: any) => formatDate(text),
  },
];

const ctnColumns = [
  {
    title: $t('seaExport.export.dispatch.ctnCodeId'),
    key: 'ctnCodeId',
    width: 120,
  },
  {
    title: $t('seaExport.export.dispatch.ctnNo'),
    key: 'ctnNo',
    width: 120,
  },
  {
    title: $t('seaExport.export.dispatch.sealNo'),
    key: 'sealNo',
    width: 100,
  },
  {
    title: $t('seaExport.export.dispatch.pkgs'),
    key: 'pkgs',
    width: 80,
  },
  {
    title: $t('seaExport.export.dispatch.codePackageId'),
    key: 'codePackageId',
    width: 110,
  },
  {
    title: $t('seaExport.export.dispatch.grossWeight'),
    key: 'grossWeight',
    width: 100,
  },
  {
    title: $t('seaExport.export.dispatch.tareWeight'),
    key: 'tareWeight',
    width: 100,
  },
  {
    title: $t('seaExport.export.dispatch.volume'),
    key: 'volume',
    width: 90,
  },
  {
    title: $t('seaExport.export.dispatch.codeGoodsId'),
    key: 'codeGoodsId',
    width: 110,
  },
  {
    title: $t('seaExport.export.dispatch.bookingNo'),
    key: 'bookingNo',
    width: 120,
  },
  {
    title: $t('seaExport.export.dispatch.ctnRemark'),
    key: 'remark',
    width: 120,
  },
];

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="dispatch-container p-2">
    <Card>
      <template #title>
        <span class="flex items-center gap-2 text-sm font-medium">
          <IconifyIcon icon="mdi:truck-delivery" class="text-base" />
          {{ $t('seaExport.export.dispatch.list') }}
        </span>
      </template>
      <template #extra>
        <Space>
          <Input
            :value="keyword"
            :placeholder="$t('seaExport.export.dispatch.keyword')"
            allow-clear
            style="width: 220px"
            @update:value="onKeywordChange"
          />
          <Button
            type="primary"
            class="!inline-flex !items-center !gap-1"
            @click="openAddModal"
          >
            <IconifyIcon
              icon="mdi:plus"
              class="shrink-0 text-base leading-none"
            />
            {{ $t('seaExport.export.dispatch.add') }}
          </Button>
          <Button
            class="!inline-flex !items-center !gap-1"
            :disabled="selectedDispatchKeys.length !== 1"
            @click="handleEditSelected"
          >
            <IconifyIcon
              icon="mdi:pencil"
              class="shrink-0 text-base leading-none"
            />
            {{ $t('common.edit') }}
          </Button>
          <Button
            class="!inline-flex !items-center !gap-1"
            danger
            :disabled="!selectedDispatchKeys.length"
            @click="handleDeleteSelected"
          >
            <IconifyIcon
              icon="mdi:delete"
              class="shrink-0 text-base leading-none"
            />
            {{ $t('common.delete') }}
          </Button>
        </Space>
      </template>

      <Spin :spinning="loading">
        <Table
          :data-source="dataSource"
          :columns="listColumns"
          :row-selection="{
            selectedRowKeys: selectedDispatchKeys,
            onChange: (keys) => {
              selectedDispatchKeys = keys;
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
          :scroll="{ x: 1600 }"
          size="small"
          bordered
          row-key="id"
        >
          <template #expandedRowRender="{ record }">
            <div
              v-if="record.seaExportDispatchCtns?.length"
              class="bg-gray-50 p-2"
            >
              <Table
                :data-source="record.seaExportDispatchCtns"
                :pagination="false"
                size="small"
                bordered
                row-key="id"
              >
                <Table.Column
                  :title="$t('seaExport.export.dispatch.ctnCodeId')"
                  data-index="ctnCodeName"
                  :width="100"
                />
                <Table.Column
                  :title="$t('seaExport.export.dispatch.ctnNo')"
                  data-index="ctnNo"
                  :width="120"
                />
                <Table.Column
                  :title="$t('seaExport.export.dispatch.sealNo')"
                  data-index="sealNo"
                  :width="100"
                />
                <Table.Column
                  :title="$t('seaExport.export.dispatch.pkgs')"
                  data-index="pkgs"
                  :width="80"
                />
                <Table.Column
                  :title="$t('seaExport.export.dispatch.codePackageId')"
                  data-index="codePackageName"
                  :width="100"
                />
                <Table.Column
                  :title="$t('seaExport.export.dispatch.grossWeight')"
                  data-index="grossWeight"
                  :width="90"
                />
                <Table.Column
                  :title="$t('seaExport.export.dispatch.tareWeight')"
                  data-index="tareWeight"
                  :width="90"
                />
                <Table.Column
                  :title="$t('seaExport.export.dispatch.volume')"
                  data-index="volume"
                  :width="80"
                />
                <Table.Column
                  :title="$t('seaExport.export.dispatch.codeGoodsId')"
                  data-index="codeGoodsName"
                  :width="100"
                />
                <Table.Column
                  :title="$t('seaExport.export.dispatch.bookingNo')"
                  data-index="bookingNo"
                  :width="120"
                />
                <Table.Column
                  :title="$t('seaExport.export.dispatch.ctnRemark')"
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

    <!-- Add/Edit Modal -->
    <Modal
      :open="modalVisible"
      :title="modalTitle"
      :width="1000"
      :confirm-loading="submitting"
      destroy-on-close
      @ok="handleSubmit"
      @cancel="modalVisible = false"
    >
      <div class="dispatch-form grid grid-cols-3 gap-x-4 gap-y-3 py-2">
        <div class="form-item">
          <label class="mb-1 block text-xs text-gray-500">
            {{ $t('seaExport.export.dispatch.teamId') }}
          </label>
          <ClientSelect
            v-model="formData.teamId"
            :selected-items="
              toSelectedItems(formData.teamId, formData.teamName, 'name')
            "
            industry-category="i"
            class="w-full"
            :placeholder="$t('ui.placeholder.select')"
          />
        </div>
        <div class="form-item">
          <label class="mb-1 block text-xs text-gray-500">
            {{ $t('seaExport.export.dispatch.dispatchTime') }}
          </label>
          <DatePicker
            :value="formData.dispatchTime"
            class="w-full"
            show-time
            format="YYYY-MM-DD HH:mm"
            @update:value="(v) => (formData.dispatchTime = v)"
          />
        </div>
        <div class="form-item">
          <label class="mb-1 block text-xs text-gray-500">
            {{ $t('seaExport.export.dispatch.requiredTime') }}
          </label>
          <DatePicker
            :value="formData.requiredTime"
            class="w-full"
            show-time
            format="YYYY-MM-DD HH:mm"
            @update:value="(v) => (formData.requiredTime = v)"
          />
        </div>
        <div class="form-item">
          <label class="mb-1 block text-xs text-gray-500">
            {{ $t('seaExport.export.dispatch.factoryId') }}
          </label>
          <ClientSelect
            v-model="formData.factoryId"
            :selected-items="
              toSelectedItems(formData.factoryId, formData.factoryName, 'name')
            "
            industry-category="u"
            class="w-full"
            :placeholder="$t('ui.placeholder.select')"
          />
        </div>
        <div class="form-item">
          <label class="mb-1 block text-xs text-gray-500">
            {{ $t('seaExport.export.dispatch.factoryContact') }}
          </label>
          <Input
            :value="formData.factoryContact"
            :maxlength="128"
            allow-clear
            @update:value="(v) => (formData.factoryContact = v)"
          />
        </div>
        <div class="form-item">
          <label class="mb-1 block text-xs text-gray-500">
            {{ $t('seaExport.export.dispatch.factoryTel') }}
          </label>
          <Input
            :value="formData.factoryTel"
            :maxlength="64"
            allow-clear
            @update:value="(v) => (formData.factoryTel = v)"
          />
        </div>
        <div class="form-item">
          <label class="mb-1 block text-xs text-gray-500">
            {{ $t('seaExport.export.dispatch.yardId') }}
          </label>
          <ClientSelect
            v-model="formData.yardId"
            :selected-items="
              toSelectedItems(formData.yardId, formData.yardName, 'name')
            "
            industry-category="c"
            class="w-full"
            :placeholder="$t('ui.placeholder.select')"
          />
        </div>
        <div class="form-item">
          <label class="mb-1 block text-xs text-gray-500">
            {{ $t('seaExport.export.dispatch.closingTime') }}
          </label>
          <DatePicker
            :value="formData.closingTime"
            class="w-full"
            show-time
            format="YYYY-MM-DD HH:mm"
            @update:value="(v) => (formData.closingTime = v)"
          />
        </div>
        <div class="form-item">
          <label class="mb-1 block text-xs text-gray-500">
            {{ $t('seaExport.export.dispatch.areaId') }}
          </label>
          <AreaLeafCascader
            v-model="formData.areaId"
            class="w-full"
            :placeholder="$t('ui.placeholder.select')"
          />
        </div>
        <div class="form-item col-span-2">
          <label class="mb-1 block text-xs text-gray-500">
            {{ $t('seaExport.export.dispatch.address') }}
          </label>
          <Input
            :value="formData.address"
            :maxlength="1024"
            allow-clear
            @update:value="(v) => (formData.address = v)"
          />
        </div>
        <div class="form-item">
          <label class="mb-1 block text-xs text-gray-500">
            {{ $t('seaExport.export.dispatch.sortId') }}
          </label>
          <InputNumber
            :value="formData.sortId"
            class="w-full"
            :min="0"
            :controls="false"
            @update:value="(v) => (formData.sortId = v)"
          />
        </div>
        <div class="form-item col-span-2">
          <label class="mb-1 block text-xs text-gray-500">
            {{ $t('seaExport.export.dispatch.precautions') }}
          </label>
          <Input
            :value="formData.precautions"
            :maxlength="256"
            allow-clear
            @update:value="(v) => (formData.precautions = v)"
          />
        </div>
        <div class="form-item">
          <label class="mb-1 block text-xs text-gray-500">
            {{ $t('seaExport.export.dispatch.remark') }}
          </label>
          <Input
            :value="formData.remark"
            :maxlength="1024"
            allow-clear
            @update:value="(v) => (formData.remark = v)"
          />
        </div>
      </div>

      <!-- CTN Sub Table -->
      <div class="mt-4">
        <div class="mb-2 flex items-center gap-2">
          <span class="text-sm font-medium text-gray-600">
            {{ $t('seaExport.export.dispatch.ctnTable') }}
          </span>
          <Tooltip :title="$t('seaExport.export.dispatch.addCtn')">
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
          :scroll="{ x: 1300 }"
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
            <template v-else-if="column.key === 'grossWeight'">
              <InputNumber
                :value="record.grossWeight"
                class="w-full"
                :min="0"
                :controls="false"
                :precision="2"
                @update:value="(v) => updateCtnRow(index, 'grossWeight', v)"
              />
            </template>
            <template v-else-if="column.key === 'tareWeight'">
              <InputNumber
                :value="record.tareWeight"
                class="w-full"
                :min="0"
                :controls="false"
                :precision="2"
                @update:value="(v) => updateCtnRow(index, 'tareWeight', v)"
              />
            </template>
            <template v-else-if="column.key === 'volume'">
              <InputNumber
                :value="record.volume"
                class="w-full"
                :min="0"
                :controls="false"
                :precision="2"
                @update:value="(v) => updateCtnRow(index, 'volume', v)"
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
.dispatch-form .form-item {
  display: flex;
  flex-direction: column;
}

.dispatch-container :deep(.ant-table-tbody > tr.ant-table-row-selected > td),
.dispatch-container
  :deep(.ant-table-tbody > tr.ant-table-row-selected:hover > td),
.dispatch-container
  :deep(
    .ant-table-tbody > tr.ant-table-row-selected > td.ant-table-cell-row-hover
  ) {
  background: #e6f4ff !important;
}
</style>
