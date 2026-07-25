<script lang="ts" setup>
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import { computed, ref, watch } from 'vue';

import { Button, Input, InputNumber, Table, Tooltip } from 'ant-design-vue';

import { IconifyIcon } from '@vben/icons';

import { getCtnCodeDetail } from '#/api/system/base-data/ctn-code-admin';
import CtnSelect from '#/adapter/component/biz-select/ctn-select.vue';
import CodeGoodsSelect from '#/adapter/component/biz-select/code-goods-select.vue';
import CodePackageSelect from '#/adapter/component/biz-select/code-package-select.vue';
import { $t } from '#/locales';
import { toEnglishUpperCase } from '#/utils/english-upper-case';

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
    yardRealQueryDisabled?: boolean;
    yardRealQueryDisabledTip?: string;
    yardRealQueryLoading?: boolean;
    yardRealQueryVisible?: boolean;
  }>(),
  {
    getDefaultCodePackage: undefined,
    defaultCodePackageId: undefined,
    yardRealQueryDisabled: false,
    yardRealQueryDisabledTip: '',
    yardRealQueryLoading: false,
    yardRealQueryVisible: false,
  },
);

const emit = defineEmits<{
  yardRealQuery: [];
}>();

const modelValue = defineModel<SeaExportAdminApi.OrderCtnAddDto[]>({
  default: () => [],
});

const yardRealQueryTooltip = computed(() => {
  if (props.yardRealQueryDisabled && props.yardRealQueryDisabledTip) {
    return props.yardRealQueryDisabledTip;
  }
  return $t('seaExport.yardRealQuery.query');
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
  return value.toFixed(2).replace(/\.?0+$/, '');
};

const ctnNameById = ref<Record<string, string>>({});
const loadingCtnNameIds = new Set<string>();

const syncCtnNameMap = async (
  rows: SeaExportAdminApi.OrderCtnAddDto[] = [],
) => {
  for (const row of rows) {
    const anyRow = row as any;
    const ctnId = row.ctnCodeId;
    if (ctnId === undefined || ctnId === null || ctnId === '') continue;

    const idStr = String(ctnId);
    const localName = anyRow.ctnCodeName;
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

  for (const row of list) {
    const anyRow = row as any;
    const ctnLabel =
      anyRow.ctnCodeName ||
      (row.ctnCodeId !== undefined && row.ctnCodeId !== null
        ? ctnNameById.value[String(row.ctnCodeId)]
        : '');
    if (ctnLabel !== undefined && ctnLabel !== null && ctnLabel !== '') {
      const key = String(ctnLabel);
      ctnTypeCounter.set(key, (ctnTypeCounter.get(key) ?? 0) + 1);
    }

    const pkgsValue = Number(row.pkgs ?? 0);
    const grossWeightValue = Number(row.grossWeight ?? 0);
    if (Number.isFinite(pkgsValue)) totalPkgs += pkgsValue;
    if (Number.isFinite(grossWeightValue)) totalGrossWeight += grossWeightValue;
  }

  const ctnTypeText =
    [...ctnTypeCounter.entries()]
      .map(([ctnType, count]) => `${ctnType}*${count}`)
      .join('，') || '-';

  return {
    ctnTypeText,
    totalPkgs: formatSummaryNumber(totalPkgs),
    totalGrossWeight: formatSummaryNumber(totalGrossWeight),
  };
});

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: (string | number)[]) => {
    selectedRowKeys.value = keys;
  },
}));

const tableColumns = computed(() => [
  {
    key: 'seq',
    dataIndex: 'seq',
    title: $t('common.index'),
    width: 40,
    align: 'center' as const,
    className: 'order-ctn-table__seq-col',
  },
  {
    key: 'ctnCodeId',
    dataIndex: 'ctnCodeId',
    title: $t('seaExport.export.ctnCodeId'),
    width: 76,
    className: 'order-ctn-table__ctn-col',
  },
  {
    key: 'ctnNo',
    dataIndex: 'ctnNo',
    title: $t('seaExport.export.ctnNo'),
    width: 130,
    className: 'order-ctn-table__ctn-no-col',
  },
  {
    key: 'sealNo',
    dataIndex: 'sealNo',
    title: $t('seaExport.export.sealNo'),
    width: 120,
    className: 'order-ctn-table__seal-no-col',
  },
  {
    key: 'pkgs',
    dataIndex: 'pkgs',
    title: $t('seaExport.export.pkgs'),
    width: 80,
  },
  {
    key: 'codePackageId',
    dataIndex: 'codePackageId',
    title: $t('seaExport.export.codePackageId'),
    width: 100,
  },
  {
    key: 'grossWeight',
    dataIndex: 'grossWeight',
    title: $t('seaExport.export.grossWeight'),
    width: 90,
  },
  {
    key: 'tareWeight',
    dataIndex: 'tareWeight',
    title: $t('seaExport.export.tareWeight'),
    width: 90,
  },
  {
    key: 'volume',
    dataIndex: 'volume',
    title: $t('seaExport.export.volume'),
    width: 90,
  },
  {
    key: 'codeGoodsId',
    dataIndex: 'codeGoodsId',
    title: $t('seaExport.export.codeGoodsId'),
    width: 100,
  },
  {
    key: 'remark',
    dataIndex: 'remark',
    title: $t('seaExport.export.remark'),
    width: 160,
    className: 'order-ctn-table__remark-col',
  },
]);

let rowKeyCounter = 0;
const addRow = async () => {
  const list = [...(modelValue.value ?? [])];
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

  list.push({
    _rowKey: `ctn_${++rowKeyCounter}_${Date.now()}`,
    ...(hasDefaultPackage
      ? {
          codePackageId: defaultPackageId,
          ...(codePackageName ? { codePackageName } : {}),
        }
      : {}),
  } as any);
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
  field: keyof SeaExportAdminApi.OrderCtnAddDto,
  value: any,
) => {
  const list = [...(modelValue.value ?? [])];
  if (!list[index])
    list[index] = { _rowKey: `ctn_${++rowKeyCounter}_${Date.now()}` } as any;
  list[index] = { ...list[index], [field]: value };
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
      : (value as SeaExportAdminApi.OrderCtnAddDto['ctnCodeId']);
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

const toSelectedItems = (id: any, name: any, labelKey = 'name') => {
  if (id == null || id === '') return [];
  // 无名称时不传 selectedItems，交由 Select 按 id 拉取详情回显文案；
  // 若传 { id, name: '' }，会标记为已加载且标签为空，界面会退化成显示 id。
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
  },
  { immediate: true, deep: true },
);
</script>

<template>
  <div class="order-ctn-table form-controls-small">
    <div class="order-ctn-table__title-bar">
      <span class="order-ctn-table__title-text">
        {{ $t('seaExport.export.orderCtns') }}
      </span>
      <Tooltip v-if="props.yardRealQueryVisible" :title="yardRealQueryTooltip">
        <Button
          size="small"
          class="order-ctn-table__yard-query-btn"
          :disabled="props.yardRealQueryDisabled"
          :loading="props.yardRealQueryLoading"
          @click="emit('yardRealQuery')"
        >
          <IconifyIcon
            icon="mdi:cloud-sync-outline"
            class="mr-1 inline-block size-3.5 align-middle"
          />
          <span class="align-middle">{{
            $t('seaExport.yardRealQuery.query')
          }}</span>
        </Button>
      </Tooltip>
      <Tooltip :title="$t('seaExport.export.addCtn')">
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
      :columns="tableColumns"
      :data-source="dataSource"
      :row-selection="rowSelection"
      :pagination="false"
      :scroll="{ x: 1108 }"
      table-layout="fixed"
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
              toSelectedItems(record.ctnCodeId, record.ctnCodeName, 'ctnName')
            "
            class="w-full min-w-0"
            size="small"
            :placeholder="$t('ui.placeholder.select')"
            @change="
              (v: any, option: any) => handleCtnCodeChange(index, v, option)
            "
          />
        </template>
        <template v-else-if="column.key === 'ctnNo'">
          <Input
            :value="record.ctnNo"
            :placeholder="$t('seaExport.export.ctnNo')"
            size="small"
            allow-clear
            @update:value="
              (v) => updateRow(index, 'ctnNo', toEnglishUpperCase(v))
            "
          />
        </template>
        <template v-else-if="column.key === 'sealNo'">
          <Input
            :value="record.sealNo"
            :placeholder="$t('seaExport.export.sealNo')"
            size="small"
            allow-clear
            @update:value="
              (v) => updateRow(index, 'sealNo', toEnglishUpperCase(v))
            "
          />
        </template>
        <template v-else-if="column.key === 'pkgs'">
          <InputNumber
            :value="record.pkgs"
            :placeholder="$t('seaExport.export.pkgs')"
            class="w-full"
            size="small"
            :min="0"
            :controls="false"
            @update:value="(v) => updateRow(index, 'pkgs', v)"
          />
        </template>
        <template v-else-if="column.key === 'codePackageId'">
          <CodePackageSelect
            :model-value="record.codePackageId"
            :selected-items="
              toSelectedItems(record.codePackageId, record.codePackageName)
            "
            class="w-full min-w-[90px]"
            size="small"
            :placeholder="$t('ui.placeholder.select')"
            @update:model-value="(v) => updateRow(index, 'codePackageId', v)"
          />
        </template>
        <template v-else-if="column.key === 'grossWeight'">
          <InputNumber
            :value="record.grossWeight"
            :placeholder="$t('seaExport.export.grossWeight')"
            class="w-full"
            size="small"
            :min="0"
            :controls="false"
            :precision="2"
            @update:value="(v) => updateRow(index, 'grossWeight', v)"
          />
        </template>
        <template v-else-if="column.key === 'tareWeight'">
          <InputNumber
            :value="record.tareWeight"
            :placeholder="$t('seaExport.export.tareWeight')"
            class="w-full"
            size="small"
            :min="0"
            :controls="false"
            :precision="2"
            @update:value="(v) => updateRow(index, 'tareWeight', v)"
          />
        </template>
        <template v-else-if="column.key === 'volume'">
          <InputNumber
            :value="record.volume"
            :placeholder="$t('seaExport.export.volume')"
            class="w-full"
            size="small"
            :min="0"
            :controls="false"
            :precision="2"
            @update:value="(v) => updateRow(index, 'volume', v)"
          />
        </template>
        <template v-else-if="column.key === 'codeGoodsId'">
          <CodeGoodsSelect
            :model-value="record.codeGoodsId"
            :selected-items="
              toSelectedItems(record.codeGoodsId, record.codeGoodsName)
            "
            class="w-full min-w-[90px]"
            size="small"
            :placeholder="$t('ui.placeholder.select')"
            @update:model-value="(v) => updateRow(index, 'codeGoodsId', v)"
          />
        </template>
        <template v-else-if="column.key === 'remark'">
          <Input
            :value="record.remark"
            :placeholder="$t('seaExport.export.remark')"
            size="small"
            allow-clear
            @update:value="(v) => updateRow(index, 'remark', v)"
          />
        </template>
      </template>
    </Table>
    <div
      class="mt-2 flex items-center gap-6 rounded border border-[#f0f0f0] bg-[#fafafa] px-3 py-2 text-sm text-[#595959]"
    >
      <span class="font-medium text-[#262626]">
        {{ $t('seaExport.export.orderCtnSummaryLabel') }}
      </span>
      <span>
        {{ ctnSummary.ctnTypeText }}
      </span>
      <span>
        {{ $t('seaExport.export.pkgs') }} {{ ctnSummary.totalPkgs }}
      </span>
      <span>
        {{ $t('seaExport.export.grossWeight') }}
        {{ ctnSummary.totalGrossWeight }}
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

.order-ctn-table__yard-query-btn {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 10px;
  font-size: 12px;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
  border: 1px solid hsl(var(--primary) / 25%);
}

.order-ctn-table :deep(input.ant-input),
.order-ctn-table :deep(.ant-input-affix-wrapper),
.order-ctn-table :deep(.ant-input-number) {
  height: 24px;
}

.order-ctn-table :deep(.ant-input-number-input) {
  height: 22px;
}

.order-ctn-table :deep(.ant-input-affix-wrapper) {
  display: inline-flex;
  align-items: center;
}

.order-ctn-table :deep(.ant-input-affix-wrapper > input.ant-input) {
  height: 22px;
  line-height: 22px;
}

.order-ctn-table
  :deep(.ant-select:not(.ant-select-customize-input) .ant-select-selector) {
  display: flex;
  align-items: center;
  height: 24px;
}

.order-ctn-table
  :deep(
    .ant-select-single .ant-select-selector .ant-select-selection-item,
    .ant-select-single .ant-select-selector .ant-select-selection-placeholder
  ) {
  line-height: 22px;
}

.order-ctn-table
  :deep(
    .ant-select-single .ant-select-selector .ant-select-selection-search-input
  ) {
  height: 22px;
}

.order-ctn-table :deep(th.order-ctn-table__seq-col),
.order-ctn-table :deep(td.order-ctn-table__seq-col) {
  width: 40px !important;
  min-width: 40px !important;
  max-width: 40px !important;
}

.order-ctn-table :deep(th.order-ctn-table__ctn-col),
.order-ctn-table :deep(td.order-ctn-table__ctn-col) {
  width: 76px !important;
  min-width: 76px !important;
  max-width: 76px !important;
}

.order-ctn-table :deep(th.order-ctn-table__ctn-no-col),
.order-ctn-table :deep(td.order-ctn-table__ctn-no-col) {
  width: 130px !important;
  min-width: 130px !important;
  max-width: 130px !important;
}

.order-ctn-table :deep(th.order-ctn-table__seal-no-col),
.order-ctn-table :deep(td.order-ctn-table__seal-no-col) {
  width: 120px !important;
  min-width: 120px !important;
  max-width: 120px !important;
}

.order-ctn-table :deep(th.order-ctn-table__remark-col),
.order-ctn-table :deep(td.order-ctn-table__remark-col) {
  width: 160px !important;
  min-width: 160px !important;
  max-width: 160px !important;
}
</style>
