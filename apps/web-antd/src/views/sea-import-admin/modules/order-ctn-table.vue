<script lang="ts" setup>
import type { SeaImportAdminApi } from '#/api/sea-import/sea-import-admin';
import type { CodeGoodsAdminApi } from '#/api/system/base-data/code-goods-admin';

import { computed, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import {
  Button,
  Input,
  InputNumber,
  Select,
  Table,
  Tooltip,
} from 'ant-design-vue';

import CodeGoodsSelect from '#/adapter/component/biz-select/code-goods-select.vue';
import CodePackageSelect from '#/adapter/component/biz-select/code-package-select.vue';
import CtnSelect from '#/adapter/component/biz-select/ctn-select.vue';
import { getCodeGoodsDetail } from '#/api/system/base-data/code-goods-admin';
import { getCtnCodeDetail } from '#/api/system/base-data/ctn-code-admin';
import { $t } from '#/locales';
import {
  WEIGHT_VOLUME_PRECISION,
  formatWeightVolume,
} from '#/utils/weight-volume-precision';

type SpecOption = CodeGoodsAdminApi.CodeGoodsSpecSimpleDto;
type ModelOption = CodeGoodsAdminApi.CodeGoodsModelSimpleDto;

const modelValue = defineModel<SeaImportAdminApi.OrderCtnEditDto[]>({
  default: () => [],
});

const selectedRowKeys = ref<(string | number)[]>([]);

const dataSource = computed({
  get: () => modelValue.value ?? [],
  set: (val) => {
    modelValue.value = val;
  },
});

const formatSummaryNumber = (value: number) => {
  if (!Number.isFinite(value)) return '0';
  if (Number.isInteger(value)) return String(value);
  return formatWeightVolume(value);
};

const ctnNameById = ref<Record<string, string>>({});
const loadingCtnNameIds = new Set<string>();

const specsByGoodsId = ref<Record<string, SpecOption[]>>({});
const modelsByGoodsId = ref<Record<string, ModelOption[]>>({});
const loadingGoodsOptionIds = new Set<string>();

const sortBySortIdAsc = <T extends { sortId?: number }>(items: T[]) =>
  [...items].sort((a, b) => (a.sortId ?? 0) - (b.sortId ?? 0));

const ensureGoodsOptionsLoaded = async (codeGoodsId: unknown) => {
  if (codeGoodsId === undefined || codeGoodsId === null || codeGoodsId === '') {
    return;
  }
  const idStr = String(codeGoodsId);
  if (
    specsByGoodsId.value[idStr] ||
    modelsByGoodsId.value[idStr] ||
    loadingGoodsOptionIds.has(idStr)
  ) {
    return;
  }
  loadingGoodsOptionIds.add(idStr);
  try {
    const detail = await getCodeGoodsDetail(idStr);
    specsByGoodsId.value = {
      ...specsByGoodsId.value,
      [idStr]: sortBySortIdAsc(detail?.codeGoodsSpecs ?? []),
    };
    modelsByGoodsId.value = {
      ...modelsByGoodsId.value,
      [idStr]: sortBySortIdAsc(detail?.codeGoodsModels ?? []),
    };
  } finally {
    loadingGoodsOptionIds.delete(idStr);
  }
};

const syncCtnNameMap = async (
  rows: SeaImportAdminApi.OrderCtnEditDto[] = [],
) => {
  for (const row of rows) {
    const anyRow = row as any;
    const ctnId = row.ctnCodeId;
    if (ctnId === undefined || ctnId === null || ctnId === '') continue;

    const idStr = String(ctnId);
    const localName = anyRow.ctnCodeName || anyRow.ctnCode?.ctnName;
    if (localName) {
      ctnNameById.value = { ...ctnNameById.value, [idStr]: String(localName) };
      continue;
    }

    if (ctnNameById.value[idStr] || loadingCtnNameIds.has(idStr)) continue;
    loadingCtnNameIds.add(idStr);
    try {
      const detail = await getCtnCodeDetail(idStr);
      const detailName = (detail as any)?.ctnName;
      if (detailName) {
        ctnNameById.value = {
          ...ctnNameById.value,
          [idStr]: String(detailName),
        };
      }
    } finally {
      loadingCtnNameIds.delete(idStr);
    }
  }
};

const ctnSummary = computed(() => {
  const list = dataSource.value ?? [];
  const ctnTypeCounter = new Map<string, number>();
  let totalPkgs = 0;
  let totalGrossWeight = 0;
  let totalNetWeight = 0;

  for (const row of list) {
    const anyRow = row as any;
    const ctnLabel =
      anyRow.ctnCodeName ||
      anyRow.ctnCode?.ctnName ||
      (row.ctnCodeId !== undefined && row.ctnCodeId !== null
        ? ctnNameById.value[String(row.ctnCodeId)]
        : '');
    if (ctnLabel !== undefined && ctnLabel !== null && ctnLabel !== '') {
      const key = String(ctnLabel);
      ctnTypeCounter.set(key, (ctnTypeCounter.get(key) ?? 0) + 1);
    }

    const pkgsValue = Number(row.pkgs ?? 0);
    const grossWeightValue = Number(row.grossWeight ?? 0);
    const netWeightValue = Number(row.netWeight ?? 0);
    if (Number.isFinite(pkgsValue)) totalPkgs += pkgsValue;
    if (Number.isFinite(grossWeightValue)) totalGrossWeight += grossWeightValue;
    if (Number.isFinite(netWeightValue)) totalNetWeight += netWeightValue;
  }

  const ctnTypeText =
    [...ctnTypeCounter.entries()]
      .map(([ctnType, count]) => `${ctnType}*${count}`)
      .join('，') || '-';

  return {
    ctnTypeText,
    totalPkgs: formatSummaryNumber(totalPkgs),
    totalGrossWeight: formatSummaryNumber(totalGrossWeight),
    totalNetWeight: formatSummaryNumber(totalNetWeight),
  };
});

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: (string | number)[]) => {
    selectedRowKeys.value = keys;
  },
}));

let rowKeyCounter = 0;
const addRow = () => {
  const list = [...(modelValue.value ?? [])];
  list.push({ _rowKey: `ctn_${++rowKeyCounter}_${Date.now()}` } as any);
  modelValue.value = list;
};

const removeSelectedRows = () => {
  if (!selectedRowKeys.value.length) return;
  const keysSet = new Set(selectedRowKeys.value);
  const list = (modelValue.value ?? []).filter(
    (row) => !keysSet.has((row as any)._rowKey),
  );
  modelValue.value = list;
  selectedRowKeys.value = [];
};

const updateRow = (
  index: number,
  field: keyof SeaImportAdminApi.OrderCtnEditDto,
  value: any,
) => {
  const list = [...(modelValue.value ?? [])];
  if (!list[index])
    list[index] = { _rowKey: `ctn_${++rowKeyCounter}_${Date.now()}` } as any;
  const next = { ...list[index], [field]: value } as any;
  list[index] = next;
  modelValue.value = list;
};

/** 箱型选择：从 option 取名称写入行，避免 syncCtnNameMap 再打详情 */
const handleCtnCodeChange = (
  index: number,
  value: unknown,
  option?: { label?: string; raw?: { ctnName?: string } },
) => {
  const list = [...(modelValue.value ?? [])];
  if (!list[index]) {
    list[index] = { _rowKey: `ctn_${++rowKeyCounter}_${Date.now()}` } as any;
  }
  // 雪花 ID 原样透传，禁止 Number()
  const ctnCodeId =
    value == null || value === ''
      ? undefined
      : (value as SeaImportAdminApi.OrderCtnAddDto['ctnCodeId']);
  const nameFromOption =
    option?.raw?.ctnName ||
    (typeof option?.label === 'string' ? option.label : undefined);
  const ctnCodeName =
    ctnCodeId == null ? undefined : nameFromOption || undefined;
  list[index] = {
    ...list[index],
    ctnCodeId,
    ctnCodeName,
  } as any;
  if (ctnCodeId != null && ctnCodeName) {
    ctnNameById.value = {
      ...ctnNameById.value,
      [String(ctnCodeId)]: String(ctnCodeName),
    };
  }
  modelValue.value = list;
};

/** 切换品名必须清空规格/型号，否则后端会拦「规格不属于该箱所选的商品信息」 */
const handleCodeGoodsChange = (index: number, value: unknown) => {
  const list = [...(modelValue.value ?? [])];
  if (!list[index]) {
    list[index] = { _rowKey: `ctn_${++rowKeyCounter}_${Date.now()}` } as any;
  }
  const codeGoodsId =
    value == null || value === ''
      ? undefined
      : (value as SeaImportAdminApi.OrderCtnAddDto['codeGoodsId']);
  list[index] = {
    ...list[index],
    codeGoodsId,
    codeGoodsName: undefined,
    codeGoodsSpecId: undefined,
    codeGoodsModelId: undefined,
    codeGoodsSpecName: undefined,
    codeGoodsModelName: undefined,
  } as any;
  modelValue.value = list;
  if (codeGoodsId != null) {
    void ensureGoodsOptionsLoaded(codeGoodsId);
  }
};

const getSpecOptions = (record: SeaImportAdminApi.OrderCtnEditDto) => {
  if (record.codeGoodsId == null || record.codeGoodsId === '') return [];
  return (specsByGoodsId.value[String(record.codeGoodsId)] ?? []).map(
    (item) => ({
      label: item.name || String(item.id),
      value: item.id,
    }),
  );
};

const getModelOptions = (record: SeaImportAdminApi.OrderCtnEditDto) => {
  if (record.codeGoodsId == null || record.codeGoodsId === '') return [];
  return (modelsByGoodsId.value[String(record.codeGoodsId)] ?? []).map(
    (item) => ({
      label: item.name || String(item.id),
      value: item.id,
    }),
  );
};

const resolveCtnDisplayName = (record: any) =>
  record.ctnCodeName || record.ctnCode?.ctnName;
const resolvePackageDisplayName = (record: any) =>
  record.codePackageName || record.codePackage?.name;
const resolveGoodsDisplayName = (record: any) =>
  record.codeGoodsName || record.codeGoods?.name;

const toSelectedItems = (id: any, name: any, labelKey = 'name') => {
  if (id == null || id === '') return [];
  if (name === undefined || name === null || name === '') return [];
  return [{ id, [labelKey]: name }] as any[];
};

watch(
  () => modelValue.value,
  (val) => {
    if (val === undefined || val === null) {
      modelValue.value = [];
    }
    const keys = new Set((val ?? []).map((r) => (r as any)._rowKey));
    selectedRowKeys.value = selectedRowKeys.value.filter((k) => keys.has(k));
  },
  { immediate: true },
);

watch(
  () => dataSource.value,
  (rows) => {
    void syncCtnNameMap(rows ?? []);
    for (const row of rows ?? []) {
      if (row?.codeGoodsId != null && row.codeGoodsId !== '') {
        void ensureGoodsOptionsLoaded(row.codeGoodsId);
      }
    }
  },
  { immediate: true, deep: true },
);
</script>

<template>
  <div class="order-ctn-table">
    <div class="mb-2 flex items-center gap-2">
      <span class="text-sm font-medium text-gray-600">
        {{ $t('seaImport.import.orderCtns') }}
      </span>
      <Tooltip :title="$t('seaImport.import.addCtn')">
        <Button
          type="text"
          size="small"
          class="!flex !h-7 !w-7 !items-center !justify-center !rounded-md !bg-[#e6f4ff] !p-0 transition-all hover:scale-105 hover:!bg-[#bae0ff]"
          @click="addRow"
        >
          <IconifyIcon icon="mdi:add-box" class="text-[18px] text-[#1677ff]" />
        </Button>
      </Tooltip>
      <Tooltip :title="$t('common.delete')">
        <Button
          type="text"
          size="small"
          :class="[
            '!flex !h-7 !w-7 !items-center !justify-center !rounded-md !p-0 transition-all',
            selectedRowKeys.length
              ? '!bg-[#fff1f0] hover:scale-105 hover:!bg-[#ffccc7]'
              : '!bg-[#f5f5f5]',
          ]"
          :disabled="!selectedRowKeys.length"
          @click="removeSelectedRows"
        >
          <IconifyIcon
            icon="mdi:close-box"
            :class="[
              'text-[18px]',
              selectedRowKeys.length ? 'text-[#ff4d4f]' : 'text-[#bfbfbf]',
            ]"
          />
        </Button>
      </Tooltip>
    </div>
    <Table
      :data-source="dataSource"
      :row-selection="rowSelection"
      :pagination="false"
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
                resolveCtnDisplayName(record),
                'ctnName',
              )
            "
            class="w-full min-w-[100px]"
            :placeholder="
              !record.ctnCodeId && resolveCtnDisplayName(record)
                ? resolveCtnDisplayName(record)
                : $t('ui.placeholder.select')
            "
            @change="(v, option) => handleCtnCodeChange(index, v, option)"
          />
        </template>
        <template v-else-if="column.key === 'ctnNo'">
          <Input
            :value="record.ctnNo"
            :placeholder="$t('seaImport.import.ctnNo')"
            allow-clear
            @update:value="(v) => updateRow(index, 'ctnNo', v)"
          />
        </template>
        <template v-else-if="column.key === 'sealNo'">
          <Input
            :value="record.sealNo"
            :placeholder="$t('seaImport.import.sealNo')"
            allow-clear
            @update:value="(v) => updateRow(index, 'sealNo', v)"
          />
        </template>
        <template v-else-if="column.key === 'pkgs'">
          <InputNumber
            :value="record.pkgs"
            :placeholder="$t('seaImport.import.pkgs')"
            class="w-full"
            :min="0"
            :controls="false"
            @update:value="(v) => updateRow(index, 'pkgs', v)"
          />
        </template>
        <template v-else-if="column.key === 'codePackageId'">
          <CodePackageSelect
            :model-value="record.codePackageId"
            :selected-items="
              toSelectedItems(
                record.codePackageId,
                resolvePackageDisplayName(record),
              )
            "
            class="w-full min-w-[90px]"
            :placeholder="
              !record.codePackageId && resolvePackageDisplayName(record)
                ? resolvePackageDisplayName(record)
                : $t('ui.placeholder.select')
            "
            @update:model-value="(v) => updateRow(index, 'codePackageId', v)"
          />
        </template>
        <template v-else-if="column.key === 'grossWeight'">
          <InputNumber
            :value="record.grossWeight"
            :placeholder="$t('seaImport.import.grossWeight')"
            class="w-full"
            :min="0"
            :controls="false"
            :precision="WEIGHT_VOLUME_PRECISION"
            :formatter="formatWeightVolume"
            @update:value="(v) => updateRow(index, 'grossWeight', v)"
          />
        </template>
        <template v-else-if="column.key === 'tareWeight'">
          <InputNumber
            :value="record.tareWeight"
            :placeholder="$t('seaImport.import.tareWeight')"
            class="w-full"
            :min="0"
            :controls="false"
            :precision="WEIGHT_VOLUME_PRECISION"
            :formatter="formatWeightVolume"
            @update:value="(v) => updateRow(index, 'tareWeight', v)"
          />
        </template>
        <template v-else-if="column.key === 'netWeight'">
          <InputNumber
            :value="record.netWeight"
            :placeholder="$t('seaImport.import.netWeight')"
            class="w-full"
            :min="0"
            :controls="false"
            :precision="WEIGHT_VOLUME_PRECISION"
            :formatter="formatWeightVolume"
            @update:value="(v) => updateRow(index, 'netWeight', v)"
          />
        </template>
        <template v-else-if="column.key === 'volume'">
          <InputNumber
            :value="record.volume"
            :placeholder="$t('seaImport.import.volume')"
            class="w-full"
            :min="0"
            :controls="false"
            :precision="WEIGHT_VOLUME_PRECISION"
            :formatter="formatWeightVolume"
            @update:value="(v) => updateRow(index, 'volume', v)"
          />
        </template>
        <template v-else-if="column.key === 'codeGoodsId'">
          <CodeGoodsSelect
            :model-value="record.codeGoodsId"
            :selected-items="
              toSelectedItems(
                record.codeGoodsId,
                resolveGoodsDisplayName(record),
              )
            "
            class="w-full min-w-[90px]"
            :placeholder="$t('ui.placeholder.select')"
            @update:model-value="(v) => handleCodeGoodsChange(index, v)"
          />
        </template>
        <template v-else-if="column.key === 'codeGoodsSpecId'">
          <Select
            :value="record.codeGoodsSpecId"
            :options="getSpecOptions(record)"
            :disabled="record.codeGoodsId == null || record.codeGoodsId === ''"
            :placeholder="$t('seaImport.import.specification')"
            allow-clear
            class="w-full min-w-[110px]"
            @update:value="(v) => updateRow(index, 'codeGoodsSpecId', v)"
          />
        </template>
        <template v-else-if="column.key === 'codeGoodsModelId'">
          <Select
            :value="record.codeGoodsModelId"
            :options="getModelOptions(record)"
            :disabled="record.codeGoodsId == null || record.codeGoodsId === ''"
            :placeholder="$t('seaImport.import.model')"
            allow-clear
            class="w-full min-w-[110px]"
            @update:value="(v) => updateRow(index, 'codeGoodsModelId', v)"
          />
        </template>
        <template v-else-if="column.key === 'remark'">
          <Input
            :value="record.remark"
            :placeholder="$t('seaImport.import.remark')"
            allow-clear
            @update:value="(v) => updateRow(index, 'remark', v)"
          />
        </template>
      </template>
      <Table.Column
        key="ctnCodeId"
        :title="$t('seaImport.import.ctnCodeId')"
        width="120"
      />
      <Table.Column
        key="ctnNo"
        :title="$t('seaImport.import.ctnNo')"
        width="100"
      />
      <Table.Column
        key="sealNo"
        :title="$t('seaImport.import.sealNo')"
        width="90"
      />
      <Table.Column
        key="pkgs"
        :title="$t('seaImport.import.pkgs')"
        width="80"
      />
      <Table.Column
        key="codePackageId"
        :title="$t('seaImport.import.codePackageId')"
        width="100"
      />
      <Table.Column
        key="grossWeight"
        :title="$t('seaImport.import.grossWeight')"
        width="90"
      />
      <Table.Column
        key="tareWeight"
        :title="$t('seaImport.import.tareWeight')"
        width="90"
      />
      <Table.Column
        key="netWeight"
        :title="$t('seaImport.import.netWeight')"
        width="90"
      />
      <Table.Column
        key="volume"
        :title="$t('seaImport.import.volume')"
        width="90"
      />
      <Table.Column
        key="codeGoodsId"
        :title="$t('seaImport.import.codeGoodsId')"
        width="100"
      />
      <Table.Column
        key="codeGoodsSpecId"
        :title="$t('seaImport.import.specification')"
        width="120"
      />
      <Table.Column
        key="codeGoodsModelId"
        :title="$t('seaImport.import.model')"
        width="120"
      />
      <Table.Column
        key="remark"
        :title="$t('seaImport.import.remark')"
        :min-width="100"
      />
    </Table>
    <div
      class="mt-2 flex items-center gap-6 rounded border border-[#f0f0f0] bg-[#fafafa] px-3 py-2 text-sm text-[#595959]"
    >
      <span class="font-medium text-[#262626]">
        {{ $t('seaImport.import.orderCtnSummaryLabel') }}
      </span>
      <span>
        {{ ctnSummary.ctnTypeText }}
      </span>
      <span>
        {{ $t('seaImport.import.pkgs') }} {{ ctnSummary.totalPkgs }}
      </span>
      <span>
        {{ $t('seaImport.import.grossWeight') }}
        {{ ctnSummary.totalGrossWeight }}
      </span>
      <span>
        {{ $t('seaImport.import.netWeight') }}
        {{ ctnSummary.totalNetWeight }}
      </span>
    </div>
  </div>
</template>
