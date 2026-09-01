<script lang="ts" setup>
import type { TerminalScheduleQueryInfo } from './use-terminal-schedule-sync';

import { computed, ref, watch } from 'vue';

import { Alert, message, Modal, Table, Tag } from 'ant-design-vue';

import { $t } from '#/locales';

import {
  type TerminalScheduleItem,
  type TerminalSchedulePickerRow,
  TERMINAL_SCHEDULE_BIZ_TYPE,
} from './use-terminal-schedule-sync';

interface Props {
  open: boolean;
  items: TerminalSchedulePickerRow[];
  loading?: boolean;
  queryInfo?: TerminalScheduleQueryInfo;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  queryInfo: () => ({}),
});

const emit = defineEmits<{
  'update:open': [value: boolean];
  confirm: [item: TerminalScheduleItem];
}>();

const selectedKey = ref<string>();

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) selectedKey.value = undefined;
  },
);

/** 飞驼时间形如 2025-06-16 10:00:00，展示时去掉秒 */
function formatTime(value: unknown): string {
  return typeof value === 'string' && value ? value.slice(0, 16) : '-';
}

const TIME_COLUMN_KEYS = new Set([
  'atd',
  'cyClosing',
  'cyOpen',
  'customsCloseDate',
  'etd',
  'portCloseDate',
]);

function isTimeColumn(key: unknown): boolean {
  return TIME_COLUMN_KEYS.has(String(key));
}

function getTimeCellText(
  record: TerminalScheduleItem,
  dataIndex: unknown,
): string {
  return formatTime((record as Record<string, unknown>)[String(dataIndex)]);
}

const STATUS_COLORS: Record<string, string> = {
  在港: 'cyan',
  取消: 'red',
  离港: 'default',
  确报: 'green',
  预报: 'blue',
};

const isImport = computed(
  () => props.queryInfo?.bizType === TERMINAL_SCHEDULE_BIZ_TYPE.SeaImport,
);

/** 船期状态仅上海港返回，全为空时不展示该列 */
const hasStatus = computed(() =>
  props.items.some((item) => Boolean(item.status)),
);

const columns = computed(() => {
  const t = (key: string) => $t(`component.terminalSchedule.column.${key}`);
  return [
    ...(hasStatus.value
      ? [{ dataIndex: 'status', key: 'status', title: t('status'), width: 88 }]
      : []),
    {
      dataIndex: 'vesselNameEn',
      key: 'vessel',
      title: t('vessel'),
      width: 170,
    },
    { dataIndex: 'evoyage', key: 'voyage', title: t('voyage'), width: 110 },
    { dataIndex: 'terminal', key: 'terminal', title: t('terminal'), width: 86 },
    { dataIndex: 'etd', key: 'etd', title: t('etd'), width: 126 },
    { dataIndex: 'atd', key: 'atd', title: t('atd'), width: 126 },
    { dataIndex: 'cyOpen', key: 'cyOpen', title: t('cyOpen'), width: 126 },
    {
      dataIndex: 'cyClosing',
      key: 'cyClosing',
      title: t('cyClosing'),
      width: 126,
    },
    {
      dataIndex: 'portCloseDate',
      key: 'portCloseDate',
      title: t('portCloseDate'),
      width: 126,
    },
    {
      dataIndex: 'customsCloseDate',
      key: 'customsCloseDate',
      title: t('customsCloseDate'),
      width: 126,
    },
  ];
});

const queryTip = computed(() =>
  $t('component.terminalSchedule.queryTip', {
    vessel: props.queryInfo?.vessel || '-',
    voyage:
      props.queryInfo?.terminalVoyno ||
      $t('component.terminalSchedule.queryVoyageAll'),
    port: props.queryInfo?.portName || props.queryInfo?.portCode || '-',
  }),
);

const showUnfilteredTip = computed(
  () =>
    props.items.length > 0 &&
    props.queryInfo?.filteredByTerminalVoyno === false,
);

const convertedTip = computed(() => {
  if (!props.queryInfo?.terminalVoynoConverted) return '';
  const voyage = props.queryInfo?.terminalVoyno;
  if (!voyage) return '';
  return $t('component.terminalSchedule.convertedTip', { voyage });
});

const unfilteredMessage = computed(
  () =>
    props.queryInfo?.message || $t('component.terminalSchedule.unfilteredTip'),
);

const pickerDescription = computed(() => {
  const multipleTip = $t('component.terminalSchedule.multipleTip');
  return convertedTip.value
    ? `${convertedTip.value} ${multipleTip}`
    : multipleTip;
});

function getVoyage(record: TerminalScheduleItem): string {
  return (isImport.value ? record.ivoyage : record.evoyage) || '-';
}

function getCallingPorts(record: TerminalScheduleItem): string[] {
  return (record.portsCn || record.portsEn || '')
    .split('+')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getRecordKey(record: TerminalSchedulePickerRow): string {
  return record._rowKey;
}

function selectRow(record: TerminalSchedulePickerRow) {
  selectedKey.value = record._rowKey;
}

function resolveSelectedItem(): TerminalScheduleItem | undefined {
  if (!selectedKey.value) return undefined;
  return props.items.find((item) => item._rowKey === selectedKey.value);
}

function handleConfirm() {
  const selected = resolveSelectedItem();
  if (!selected) {
    message.warning($t('component.terminalSchedule.pleaseSelect'));
    return;
  }
  emit('confirm', selected);
}

function selectAndConfirm(record: TerminalSchedulePickerRow) {
  selectRow(record);
  handleConfirm();
}

function handleCancel() {
  emit('update:open', false);
}
</script>

<template>
  <Modal
    :open="props.open"
    :title="$t('component.terminalSchedule.title')"
    :confirm-loading="props.loading"
    :ok-text="$t('component.terminalSchedule.confirmImport')"
    width="1280px"
    destroy-on-close
    :mask-closable="false"
    @cancel="handleCancel"
    @ok="handleConfirm"
  >
    <Alert
      type="info"
      show-icon
      class="mb-3"
      :message="queryTip"
      :description="pickerDescription"
    />
    <Alert
      v-if="showUnfilteredTip"
      type="warning"
      show-icon
      class="mb-3"
      :message="unfilteredMessage"
    />
    <Table
      :columns="columns"
      :data-source="props.items"
      :loading="props.loading"
      :pagination="false"
      :row-key="getRecordKey"
      :scroll="{ x: 1360, y: 420 }"
      :row-selection="{
        type: 'radio',
        selectedRowKeys: selectedKey ? [selectedKey] : [],
        onSelect: selectRow,
      }"
      :custom-row="
        (record) => ({
          onClick: () => selectRow(record),
          onDblclick: () => selectAndConfirm(record),
        })
      "
      :row-expandable="(record) => getCallingPorts(record).length > 0"
      size="small"
      bordered
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <Tag v-if="record.status" :color="STATUS_COLORS[record.status]">
            {{ record.status }}
          </Tag>
          <span v-else class="text-gray-400">-</span>
        </template>
        <template v-else-if="column.key === 'vessel'">
          <div class="leading-tight">
            <div>{{ record.vesselNameEn || '-' }}</div>
            <div v-if="record.vesselNameCn" class="text-xs opacity-60">
              {{ record.vesselNameCn }}
            </div>
          </div>
        </template>
        <template v-else-if="column.key === 'voyage'">
          {{ getVoyage(record) }}
        </template>
        <template v-else-if="isTimeColumn(column.key)">
          {{ getTimeCellText(record, column.dataIndex) }}
        </template>
      </template>
      <template #expandedRowRender="{ record }">
        <div class="flex flex-wrap items-center gap-1 px-2 py-1">
          <span class="mr-1 text-xs opacity-60">
            {{ $t('component.terminalSchedule.callingPorts') }}
          </span>
          <Tag v-for="port in getCallingPorts(record)" :key="port">
            {{ port }}
          </Tag>
        </div>
      </template>
    </Table>
  </Modal>
</template>
