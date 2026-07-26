<script lang="ts" setup>
import type { PreOrderAdminApi } from '#/api/pre-order/pre-order-admin';

import { computed, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import {
  Button,
  Input,
  InputNumber,
  Space,
  Table,
  Tooltip,
} from 'ant-design-vue';

import CtnSelect from '#/adapter/component/biz-select/ctn-select.vue';
import { $t } from '#/locales';

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

/**
 * 回显用：只要有 id 就塞给 CtnSelect。
 * 表格 cell 重挂载时靠这个把 id 记入 loadedSelectedIds，避免再打详情。
 */
function ctnSelectedItems(row: PreOrderCtnRow) {
  if (row.ctnCodeId == null || row.ctnCodeId === '') return [];
  if (row.ctnCode) return [row.ctnCode];
  return [{ id: row.ctnCodeId, ctnName: row.ctnCodeName }];
}

/**
 * 不用 Table scroll.y：会拆成表头/表体两张表，列宽与滚动条占位极易错位。
 * 改为外层滚动 + thead sticky，整表一张表，列天然对齐。
 */
const columns = computed(() => [
  { title: '箱型', dataIndex: 'ctnCodeId', width: 180 },
  { title: '箱量', dataIndex: 'count', width: 100 },
  { title: '货重', dataIndex: 'weight', width: 110 },
  { title: '指导价', dataIndex: 'sugPrice', width: 110 },
  { title: '卖价', dataIndex: 'price', width: 110 },
  { title: '备注', dataIndex: 'remark', width: 160 },
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

/** 箱型选择后从 option 取名称，供费用行按单位匹配（不再打详情接口） */
function handleCtnChange(
  row: PreOrderCtnRow,
  value: unknown,
  option?: { label?: string; raw?: { ctnName?: string } },
) {
  // 雪花 ID 可能超出 Number 安全整数，json-bigint 已是 string，禁止 Number() 转丢精度
  row.ctnCodeId =
    value == null || value === ''
      ? undefined
      : (value as PreOrderCtnRow['ctnCodeId']);
  const nameFromOption =
    option?.raw?.ctnName ||
    (typeof option?.label === 'string' ? option.label : undefined);
  row.ctnCodeName =
    row.ctnCodeId == null || row.ctnCodeId === ''
      ? undefined
      : nameFromOption || undefined;
  emit('ctnChange');
}

/** 详情回显：优先用嵌套 ctnCode / 已有名称，不额外请求 */
watch(
  dataSource,
  (rows) => {
    for (const row of rows) {
      if (!row.ctnCodeId || row.ctnCodeName) continue;
      const fromDetail = (row.ctnCode as { ctnName?: string } | null)?.ctnName;
      if (fromDetail) {
        row.ctnCodeName = String(fromDetail);
      }
    }
  },
  { immediate: true, deep: false },
);
</script>

<template>
  <div class="pre-order-ctn-table form-controls-small">
    <Space
      v-if="!props.readonly"
      class="pre-order-ctn-table__toolbar mb-2"
      :size="8"
    >
      <Tooltip :title="$t('seaExport.export.addCtn')">
        <Button
          type="text"
          size="small"
          class="!flex !h-7 !w-7 !items-center !justify-center !rounded-md !bg-[#e6f4ff] !p-0 transition-all hover:scale-105 hover:!bg-[#bae0ff]"
          @click="handleAdd"
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
          @click="handleRemove"
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
    </Space>
    <div class="pre-order-ctn-table__body">
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
        <template #headerCell="{ column }">
          <template v-if="column.dataIndex === 'count'">
            <span class="pre-order-ctn-table__required">*</span>
            箱量
          </template>
          <template v-else>{{ column.title }}</template>
        </template>
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'ctnCodeId'">
            <CtnSelect
              :model-value="record.ctnCodeId"
              :selected-items="ctnSelectedItems(asRow(record))"
              :disabled="props.readonly"
              size="small"
              @change="
                (v: any, option: any) =>
                  handleCtnChange(asRow(record), v, option)
              "
            />
          </template>
          <template v-else-if="column.dataIndex === 'count'">
            <InputNumber
              v-model:value="record.count"
              :disabled="props.readonly"
              size="small"
              class="w-full"
              :min="1"
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
            <Input
              v-model:value="record.remark"
              :disabled="props.readonly"
              size="small"
              :maxlength="1024"
            />
          </template>
        </template>
      </Table>
    </div>
  </div>
</template>

<style scoped>
.pre-order-ctn-table {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.pre-order-ctn-table__toolbar {
  flex-shrink: 0;
}

.pre-order-ctn-table__required {
  margin-right: 2px;
  font-family: SimSun, sans-serif;
  color: #ff4d4f;
}

.pre-order-ctn-table__body {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

/* 单表铺满容器；行多时外层滚动，表头 sticky 保持可见 */
.pre-order-ctn-table__body :deep(.ant-table) {
  width: 100%;
}

.pre-order-ctn-table__body :deep(.ant-table table) {
  width: 100% !important;
  table-layout: fixed;
}

.pre-order-ctn-table__body :deep(.ant-table-thead > tr > th) {
  position: sticky;
  top: 0;
  z-index: 2;
}
</style>
