<script lang="ts" setup>
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import { computed, ref, watch } from 'vue';

import { Button, Input, InputNumber, Space, Table } from 'ant-design-vue';

import CtnSelect from '#/adapter/component/biz-select/ctn-select.vue';
import CodeGoodsSelect from '#/adapter/component/biz-select/code-goods-select.vue';
import CodePackageSelect from '#/adapter/component/biz-select/code-package-select.vue';
import { $t } from '#/locales';

const modelValue = defineModel<SeaExportAdminApi.OrderCtnAddDto[]>({
  default: () => [],
});

const selectedRowKeys = ref<(string | number)[]>([]);

const dataSource = computed({
  get: () => modelValue.value ?? [],
  set: (val) => {
    modelValue.value = val;
  },
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
  field: keyof SeaExportAdminApi.OrderCtnAddDto,
  value: any,
) => {
  const list = [...(modelValue.value ?? [])];
  if (!list[index])
    list[index] = { _rowKey: `ctn_${++rowKeyCounter}_${Date.now()}` } as any;
  list[index] = { ...list[index], [field]: value };
  modelValue.value = list;
};

watch(
  () => modelValue.value,
  (val) => {
    if (val === undefined || val === null) {
      modelValue.value = [];
    }
    // 数据变化时清除无效的选中项
    const keys = new Set((val ?? []).map((r) => (r as any)._rowKey));
    selectedRowKeys.value = selectedRowKeys.value.filter((k) => keys.has(k));
  },
  { immediate: true },
);
</script>

<template>
  <div class="order-ctn-table">
    <div class="mb-2 flex items-center justify-between">
      <span class="text-sm font-medium text-gray-600">
        {{ $t('seaExport.export.orderCtns') }}
      </span>
      <Space>
        <Button type="primary" size="small" @click="addRow">
          {{ $t('seaExport.export.addCtn') }}
        </Button>
        <Button
          danger
          size="small"
          :disabled="!selectedRowKeys.length"
          @click="removeSelectedRows"
        >
          {{ $t('common.delete') }}
        </Button>
      </Space>
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
            class="w-full min-w-[100px]"
            :placeholder="$t('ui.placeholder.select')"
            @update:model-value="(v) => updateRow(index, 'ctnCodeId', v)"
          />
        </template>
        <template v-else-if="column.key === 'ctnNo'">
          <Input
            :value="record.ctnNo"
            :placeholder="$t('seaExport.export.ctnNo')"
            allow-clear
            @update:value="(v) => updateRow(index, 'ctnNo', v)"
          />
        </template>
        <template v-else-if="column.key === 'sealNo'">
          <Input
            :value="record.sealNo"
            :placeholder="$t('seaExport.export.sealNo')"
            allow-clear
            @update:value="(v) => updateRow(index, 'sealNo', v)"
          />
        </template>
        <template v-else-if="column.key === 'pkgs'">
          <InputNumber
            :value="record.pkgs"
            :placeholder="$t('seaExport.export.pkgs')"
            class="w-full"
            :min="0"
            :controls="false"
            @update:value="(v) => updateRow(index, 'pkgs', v)"
          />
        </template>
        <template v-else-if="column.key === 'codePackageId'">
          <CodePackageSelect
            :model-value="record.codePackageId"
            class="w-full min-w-[90px]"
            :placeholder="$t('ui.placeholder.select')"
            @update:model-value="(v) => updateRow(index, 'codePackageId', v)"
          />
        </template>
        <template v-else-if="column.key === 'grossWeight'">
          <InputNumber
            :value="record.grossWeight"
            :placeholder="$t('seaExport.export.grossWeight')"
            class="w-full"
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
            :min="0"
            :controls="false"
            :precision="2"
            @update:value="(v) => updateRow(index, 'volume', v)"
          />
        </template>
        <template v-else-if="column.key === 'codeGoodsId'">
          <CodeGoodsSelect
            :model-value="record.codeGoodsId"
            class="w-full min-w-[90px]"
            :placeholder="$t('ui.placeholder.select')"
            @update:model-value="(v) => updateRow(index, 'codeGoodsId', v)"
          />
        </template>
        <template v-else-if="column.key === 'remark'">
          <Input
            :value="record.remark"
            :placeholder="$t('seaExport.export.remark')"
            allow-clear
            @update:value="(v) => updateRow(index, 'remark', v)"
          />
        </template>
      </template>
      <Table.Column
        key="ctnCodeId"
        :title="$t('seaExport.export.ctnCodeId')"
        width="120"
      />
      <Table.Column
        key="ctnNo"
        :title="$t('seaExport.export.ctnNo')"
        width="100"
      />
      <Table.Column
        key="sealNo"
        :title="$t('seaExport.export.sealNo')"
        width="90"
      />
      <Table.Column
        key="pkgs"
        :title="$t('seaExport.export.pkgs')"
        width="80"
      />
      <Table.Column
        key="codePackageId"
        :title="$t('seaExport.export.codePackageId')"
        width="100"
      />
      <Table.Column
        key="grossWeight"
        :title="$t('seaExport.export.grossWeight')"
        width="90"
      />
      <Table.Column
        key="tareWeight"
        :title="$t('seaExport.export.tareWeight')"
        width="90"
      />
      <Table.Column
        key="volume"
        :title="$t('seaExport.export.volume')"
        width="90"
      />
      <Table.Column
        key="codeGoodsId"
        :title="$t('seaExport.export.codeGoodsId')"
        width="100"
      />
      <Table.Column
        key="remark"
        :title="$t('seaExport.export.remark')"
        min-width="100"
      />
    </Table>
  </div>
</template>
