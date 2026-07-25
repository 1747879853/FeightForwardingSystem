<script lang="ts" setup>
import type { PreOrderAdminApi } from '#/api/pre-order/pre-order-admin';

import { computed, ref, watch } from 'vue';

import { Button, InputNumber, Space, Table } from 'ant-design-vue';

import CtnSelect from '#/adapter/component/biz-select/ctn-select.vue';
import { getCtnCodeDetail } from '#/api/system/base-data/ctn-code-admin';

/** 编辑行：额外携带前端行 key 与箱型名（箱型名用于费用「单位」联动） */
export interface PreOrderCtnRow extends PreOrderAdminApi.PreOrderCtnDto {
  rowKey: string;
  ctnCodeName?: string;
}

const props = withDefaults(defineProps<{ readonly?: boolean }>(), {
  readonly: false,
});

const modelValue = defineModel<PreOrderCtnRow[]>({ default: () => [] });

const emit = defineEmits<{
  /** 箱型/箱量/卖价变化后通知外部刷新应收费用 */
  ctnChange: [];
}>();

const selectedRowKeys = ref<string[]>([]);

const dataSource = computed({
  get: () => modelValue.value ?? [],
  set: (val) => {
    modelValue.value = val;
  },
});

let rowSeed = 0;
const createRowKey = () => `ctn-${Date.now()}-${(rowSeed += 1)}`;

/** a-table 插槽的 record 为 Record<string, any>，在模板边界收敛为箱型行 */
const asRow = (record: unknown) => record as PreOrderCtnRow;

const columns = computed(() => [
  { title: '箱型', dataIndex: 'ctnCodeId', width: 180 },
  { title: '箱量', dataIndex: 'count', width: 110 },
  { title: '货重', dataIndex: 'weight', width: 120 },
  { title: '指导价', dataIndex: 'sugPrice', width: 130 },
  { title: '卖价', dataIndex: 'price', width: 130 },
  { title: '备注', dataIndex: 'remark' },
]);

function handleAdd() {
  dataSource.value = [
    ...dataSource.value,
    { rowKey: createRowKey(), count: 1 } as PreOrderCtnRow,
  ];
}

function handleRemove() {
  if (selectedRowKeys.value.length === 0) return;
  const removing = new Set(selectedRowKeys.value);
  dataSource.value = dataSource.value.filter(
    (row) => !removing.has(row.rowKey),
  );
  selectedRowKeys.value = [];
  emit('ctnChange');
}

/** 箱型选择后回填箱型名，供费用行按单位匹配 */
async function handleCtnChange(row: PreOrderCtnRow, value: unknown) {
  row.ctnCodeId = value == null || value === '' ? undefined : Number(value);
  row.ctnCodeName = undefined;
  if (row.ctnCodeId) {
    try {
      const detail = await getCtnCodeDetail(String(row.ctnCodeId));
      row.ctnCodeName = (detail as any)?.ctnName ?? undefined;
    } catch {
      // 箱型名获取失败时不阻断录入，费用侧按 id 无法匹配则保持手填
    }
  }
  emit('ctnChange');
}

/** 详情回显时补齐缺失的箱型名 */
watch(
  dataSource,
  async (rows) => {
    for (const row of rows) {
      if (!row.ctnCodeId || row.ctnCodeName) continue;
      const fromDetail = (row.ctnCode as any)?.ctnName;
      if (fromDetail) {
        row.ctnCodeName = String(fromDetail);
        continue;
      }
      try {
        const detail = await getCtnCodeDetail(String(row.ctnCodeId));
        row.ctnCodeName = (detail as any)?.ctnName ?? undefined;
      } catch {
        // 忽略
      }
    }
  },
  { immediate: true, deep: false },
);
</script>

<template>
  <div class="pre-order-ctn-table">
    <Space v-if="!props.readonly" class="mb-2">
      <Button size="small" type="primary" @click="handleAdd">添加箱型</Button>
      <Button
        size="small"
        danger
        :disabled="selectedRowKeys.length === 0"
        @click="handleRemove"
      >
        删除
      </Button>
    </Space>
    <Table
      size="small"
      :columns="columns"
      :data-source="dataSource"
      :pagination="false"
      row-key="rowKey"
      :row-selection="
        props.readonly
          ? undefined
          : {
              selectedRowKeys,
              onChange: (keys: any[]) => (selectedRowKeys = keys as string[]),
            }
      "
      bordered
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'ctnCodeId'">
          <CtnSelect
            :model-value="record.ctnCodeId"
            :disabled="props.readonly"
            size="small"
            @update:model-value="(v: any) => handleCtnChange(asRow(record), v)"
          />
        </template>
        <template v-else-if="column.dataIndex === 'count'">
          <InputNumber
            v-model:value="record.count"
            :disabled="props.readonly"
            size="small"
            class="w-full"
            :min="0"
            :precision="0"
            @change="emit('ctnChange')"
          />
        </template>
        <template v-else-if="column.dataIndex === 'weight'">
          <InputNumber
            v-model:value="record.weight"
            :disabled="props.readonly"
            size="small"
            class="w-full"
            :min="0"
            :precision="3"
          />
        </template>
        <template v-else-if="column.dataIndex === 'sugPrice'">
          <InputNumber
            v-model:value="record.sugPrice"
            :disabled="props.readonly"
            size="small"
            class="w-full"
            :min="0"
            :precision="2"
          />
        </template>
        <template v-else-if="column.dataIndex === 'price'">
          <InputNumber
            v-model:value="record.price"
            :disabled="props.readonly"
            size="small"
            class="w-full"
            :min="0"
            :precision="2"
            @change="emit('ctnChange')"
          />
        </template>
        <template v-else-if="column.dataIndex === 'remark'">
          <a-input
            v-model:value="record.remark"
            :disabled="props.readonly"
            size="small"
            :maxlength="1024"
          />
        </template>
      </template>
    </Table>
  </div>
</template>
