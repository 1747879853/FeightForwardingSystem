<script lang="ts" setup>
import type { SeaImportAdminApi } from '#/api/sea-import/sea-import-admin';
import type { CodeGoodsAdminApi } from '#/api/system/base-data/code-goods-admin';
import type { CtnCodeAdminApi } from '#/api/system/base-data/ctn-code-admin';

import { computed, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import {
  Button,
  Input,
  InputNumber,
  Popover,
  Select,
  Spin,
  Table,
  Tooltip,
  message,
} from 'ant-design-vue';

import CodeGoodsSelect from '#/adapter/component/biz-select/code-goods-select.vue';
import CodePackageSelect from '#/adapter/component/biz-select/code-package-select.vue';
import CtnSelect from '#/adapter/component/biz-select/ctn-select.vue';
import { getCodeGoodsDetail } from '#/api/system/base-data/code-goods-admin';
import {
  getCtnCodeDetail,
  getCtnCodePagedList,
} from '#/api/system/base-data/ctn-code-admin';
import { $t } from '#/locales';
import {
  WEIGHT_VOLUME_PRECISION,
  formatWeightVolume,
} from '#/utils/weight-volume-precision';

/** 单箱型一次最多添加数量 */
const BATCH_ADD_MAX_PER_TYPE = 99;
/** 一次批量确认最多生成行数 */
const BATCH_ADD_MAX_TOTAL = 200;

type BatchAddItem = {
  id: number | string;
  ctnName: string;
  qty: number;
};

type SpecOption = CodeGoodsAdminApi.CodeGoodsSpecSimpleDto;
type ModelOption = CodeGoodsAdminApi.CodeGoodsModelSimpleDto;

const props = withDefaults(
  defineProps<{
    /**
     * 新建箱型时取订单级「总包装」id + 文本（点击时实时读取，允许修改）。
     * 优先于 defaultCodePackageId。
     */
    getDefaultCodePackage?: () =>
      | Promise<{ id?: number | string; name?: string } | undefined>
      | { id?: number | string; name?: string }
      | undefined;
    /** 订单级「总包装」id，新建箱型时默认带出（允许修改） */
    defaultCodePackageId?: number | string;
  }>(),
  {
    getDefaultCodePackage: undefined,
    defaultCodePackageId: undefined,
  },
);

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

const batchAddOpen = ref(false);
const batchAddLoading = ref(false);
const batchAddKeyword = ref('');
const batchAddItems = ref<BatchAddItem[]>([]);

const batchAddSelectedSummary = computed(() => {
  const parts = batchAddItems.value
    .filter((item) => Number(item.qty) > 0)
    .map((item) => `${Number(item.qty)}x${item.ctnName}`);
  return parts.length ? parts.join('，') : '-';
});

const filteredBatchAddItems = computed(() => {
  const keyword = batchAddKeyword.value.trim().toLowerCase();
  if (!keyword) return batchAddItems.value;
  return batchAddItems.value.filter((item) =>
    item.ctnName.toLowerCase().includes(keyword),
  );
});

const resolveDefaultPackageFields = async () => {
  const defaultPackage = props.getDefaultCodePackage
    ? await props.getDefaultCodePackage()
    : props.defaultCodePackageId != null && props.defaultCodePackageId !== ''
      ? { id: props.defaultCodePackageId }
      : undefined;
  const defaultPackageId = defaultPackage?.id;
  const hasDefaultPackage =
    defaultPackageId !== undefined &&
    defaultPackageId !== null &&
    defaultPackageId !== '';
  const codePackageName = defaultPackage?.name?.trim() || undefined;
  if (!hasDefaultPackage) return {};
  return {
    codePackageId: defaultPackageId,
    ...(codePackageName ? { codePackageName } : {}),
  };
};

const createEmptyCtnRow = (
  defaults: Record<string, unknown> = {},
  extra: Partial<SeaImportAdminApi.OrderCtnEditDto> & {
    ctnCodeName?: string;
  } = {},
) =>
  ({
    _rowKey: `ctn_${++rowKeyCounter}_${Date.now()}`,
    ...defaults,
    ...extra,
  }) as any;

const addRow = async () => {
  const list = [...(modelValue.value ?? [])];
  const defaults = await resolveDefaultPackageFields();
  list.push(createEmptyCtnRow(defaults));
  modelValue.value = list;
};

const loadBatchAddCtnTypes = async () => {
  batchAddLoading.value = true;
  try {
    const pageSize = 200;
    let pageIndex = 1;
    let totalCount = Number.POSITIVE_INFINITY;
    const all: CtnCodeAdminApi.CtnCodeDto[] = [];

    while (all.length < totalCount) {
      const ctnRes = await getCtnCodePagedList({
        PageIndex: pageIndex,
        PageSize: pageSize,
        Sorting: 'OrderNo ASC, Id DESC',
      });
      const items = (ctnRes.items || []) as CtnCodeAdminApi.CtnCodeDto[];
      totalCount = Number(ctnRes.totalCount ?? items.length);
      all.push(...items);
      if (!items.length || items.length < pageSize) break;
      pageIndex += 1;
      // 防御：异常 total 时避免死循环
      if (pageIndex > 50) break;
    }

    // 全量启用箱型，不按 isDefault 裁剪
    const source = all.filter((item) => item.status === 0);
    batchAddItems.value = source.map((item) => ({
      id: item.id,
      ctnName: item.ctnName || String(item.id),
      qty: 0,
    }));
    if (batchAddItems.value.length) {
      const nextNames = { ...ctnNameById.value };
      for (const item of batchAddItems.value) {
        nextNames[String(item.id)] = item.ctnName;
      }
      ctnNameById.value = nextNames;
    }
  } catch (error) {
    console.error('加载批量新增箱型失败:', error);
    batchAddItems.value = [];
    message.error($t('seaImport.import.batchAddCtnLoadFailed'));
  } finally {
    batchAddLoading.value = false;
  }
};

const handleBatchAddOpenChange = async (open: boolean) => {
  batchAddOpen.value = open;
  if (!open) {
    batchAddKeyword.value = '';
    return;
  }
  batchAddKeyword.value = '';
  await loadBatchAddCtnTypes();
};

const confirmBatchAdd = async () => {
  const selected = batchAddItems.value.filter((item) => {
    const qty = Math.floor(Number(item.qty));
    return Number.isFinite(qty) && qty > 0;
  });
  if (!selected.length) {
    message.warning($t('seaImport.import.batchAddCtnEmpty'));
    return;
  }

  let total = 0;
  for (const item of selected) {
    total += Math.min(Math.floor(Number(item.qty)), BATCH_ADD_MAX_PER_TYPE);
  }
  if (total > BATCH_ADD_MAX_TOTAL) {
    message.warning(
      $t('seaImport.import.batchAddCtnMaxTotal', [BATCH_ADD_MAX_TOTAL]),
    );
    return;
  }

  const defaults = await resolveDefaultPackageFields();
  const list = [...(modelValue.value ?? [])];
  const nextNames = { ...ctnNameById.value };

  for (const item of selected) {
    const qty = Math.min(Math.floor(Number(item.qty)), BATCH_ADD_MAX_PER_TYPE);
    nextNames[String(item.id)] = item.ctnName;
    for (let i = 0; i < qty; i++) {
      list.push(
        createEmptyCtnRow(defaults, {
          ctnCodeId: item.id as SeaImportAdminApi.OrderCtnAddDto['ctnCodeId'],
          ctnCodeName: item.ctnName,
        }),
      );
    }
  }

  ctnNameById.value = nextNames;
  modelValue.value = list;
  batchAddOpen.value = false;
  message.success($t('seaImport.import.batchAddCtnSuccess', [total]));
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
    <div class="order-ctn-table__title-bar">
      <span class="order-ctn-table__title-text">
        {{ $t('seaImport.import.orderCtns') }}
      </span>
      <Popover
        v-model:open="batchAddOpen"
        trigger="click"
        placement="bottomLeft"
        :overlay-inner-style="{ padding: '12px' }"
        @open-change="handleBatchAddOpenChange"
      >
        <template #content>
          <div class="order-ctn-batch-add">
            <Input
              v-model:value="batchAddKeyword"
              allow-clear
              size="small"
              class="order-ctn-batch-add__search"
              :placeholder="$t('seaImport.import.batchAddCtnSearchPlaceholder')"
            />
            <Spin :spinning="batchAddLoading">
              <div
                v-if="!batchAddLoading && !batchAddItems.length"
                class="order-ctn-batch-add__empty"
              >
                {{ $t('seaImport.import.batchAddCtnNoTypes') }}
              </div>
              <div
                v-else-if="!batchAddLoading && !filteredBatchAddItems.length"
                class="order-ctn-batch-add__empty"
              >
                {{ $t('seaImport.import.batchAddCtnNoMatch') }}
              </div>
              <div v-else class="order-ctn-batch-add__list">
                <div
                  v-for="item in filteredBatchAddItems"
                  :key="String(item.id)"
                  class="order-ctn-batch-add__row"
                >
                  <span class="order-ctn-batch-add__name" :title="item.ctnName">
                    {{ item.ctnName }}
                  </span>
                  <InputNumber
                    v-model:value="item.qty"
                    size="small"
                    :min="0"
                    :max="BATCH_ADD_MAX_PER_TYPE"
                    :precision="0"
                    class="order-ctn-batch-add__qty"
                  />
                </div>
              </div>
            </Spin>
            <div class="order-ctn-batch-add__footer">
              <span class="order-ctn-batch-add__summary">
                {{
                  $t('seaImport.import.batchAddCtnSelected', [
                    batchAddSelectedSummary,
                  ])
                }}
              </span>
              <Button
                type="primary"
                size="small"
                :disabled="!batchAddItems.some((i) => Number(i.qty) > 0)"
                @click="confirmBatchAdd"
              >
                {{ $t('seaImport.import.batchAddCtnConfirm') }}
              </Button>
            </div>
          </div>
        </template>
        <Button size="small" class="order-ctn-table__batch-add-btn">
          {{ $t('seaImport.import.batchAddCtn') }}
        </Button>
      </Popover>
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

<style scoped>
.order-ctn-table__title-bar {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px 18px;
  margin-bottom: 12px;
  background: hsl(var(--primary) / 15%);
}

.order-ctn-table__title-text {
  font-size: 13px;
  font-weight: 600;
  color: hsl(var(--primary));
}

.order-ctn-table__batch-add-btn {
  height: 28px;
  padding-inline: 10px;
  color: #1677ff;
  background: #e6f4ff;
  border-color: #91caff;
}

.order-ctn-table__batch-add-btn:hover {
  color: #0958d9;
  background: #bae0ff;
  border-color: #69b1ff;
}

.order-ctn-batch-add {
  width: 240px;
}

.order-ctn-batch-add__search {
  margin-bottom: 10px;
}

.order-ctn-batch-add__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 280px;
  padding-right: 2px;
  overflow: auto;
}

.order-ctn-batch-add__row {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.order-ctn-batch-add__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  color: #262626;
  white-space: nowrap;
}

.order-ctn-batch-add__qty {
  flex-shrink: 0;
  width: 110px;
}

.order-ctn-batch-add__empty {
  padding: 16px 0;
  font-size: 13px;
  color: #8c8c8c;
  text-align: center;
}

.order-ctn-batch-add__footer {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;
  margin-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.order-ctn-batch-add__summary {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  color: #595959;
  white-space: nowrap;
}
</style>
