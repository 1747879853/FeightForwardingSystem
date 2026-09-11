<script lang="ts" setup>
import type { SortableEvent } from 'sortablejs';

import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { message, Checkbox, Button } from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';
import Sortable from 'sortablejs';

interface ColumnConfig {
  data: string;
  title: string;
  visible: boolean;
  fixed?: 'left' | 'right' | false;
  order: number;
}

type FixedSection = 'left' | 'normal' | 'right';

const props = defineProps<{
  modelValue: boolean;
  columns: ColumnConfig[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'save', columns: ColumnConfig[]): void;
}>();

const modalOpen = ref(props.modelValue);
const localColumns = ref<ColumnConfig[]>([]);

const leftListRef = ref<HTMLElement | null>(null);
const normalListRef = ref<HTMLElement | null>(null);
const rightListRef = ref<HTMLElement | null>(null);

const sortableInstances: Sortable[] = [];

watch(
  () => props.modelValue,
  (newVal) => {
    modalOpen.value = newVal;
  },
);

watch(modalOpen, (newVal) => {
  if (newVal !== props.modelValue) {
    emit('update:modelValue', newVal);
  }
});

function cloneColumns(columns: ColumnConfig[]): ColumnConfig[] {
  return columns
    .map((col) => ({
      ...col,
      order: col.order ?? 999,
      visible: col.visible ?? true,
      fixed: col.fixed ?? false,
    }))
    .sort((a, b) => a.order - b.order);
}

watch(
  () => props.columns,
  (newColumns) => {
    if (newColumns?.length) {
      localColumns.value = cloneColumns(newColumns);
    }
  },
  { immediate: true },
);

function getSectionColumns(section: FixedSection): ColumnConfig[] {
  if (section === 'left') {
    return localColumns.value.filter((col) => col.fixed === 'left');
  }
  if (section === 'right') {
    return localColumns.value.filter((col) => col.fixed === 'right');
  }
  return localColumns.value.filter((col) => col.fixed === false);
}

const leftFixedColumns = computed(() => getSectionColumns('left'));
const nonFixedColumns = computed(() => getSectionColumns('normal'));
const rightFixedColumns = computed(() => getSectionColumns('right'));

function rebuildLocalColumns(
  left: ColumnConfig[],
  normal: ColumnConfig[],
  right: ColumnConfig[],
) {
  const merged = [...left, ...normal, ...right];
  merged.forEach((col, index) => {
    col.order = index;
  });
  localColumns.value = merged;
}

function handleSectionSort(section: FixedSection, evt: SortableEvent) {
  const { oldIndex, newIndex } = evt;
  if (
    oldIndex === undefined ||
    newIndex === undefined ||
    oldIndex === newIndex
  ) {
    return;
  }

  const left = getSectionColumns('left');
  const normal = getSectionColumns('normal');
  const right = getSectionColumns('right');
  const target =
    section === 'left' ? left : section === 'right' ? right : normal;

  const [moved] = target.splice(oldIndex, 1);
  if (!moved) return;
  target.splice(newIndex, 0, moved);

  rebuildLocalColumns(
    section === 'left' ? target : left,
    section === 'normal' ? target : normal,
    section === 'right' ? target : right,
  );
}

function destroySortables() {
  while (sortableInstances.length > 0) {
    sortableInstances.pop()?.destroy();
  }
}

async function initSortables() {
  destroySortables();
  await nextTick();

  const configs: Array<{ el: HTMLElement | null; section: FixedSection }> = [
    { el: leftListRef.value, section: 'left' },
    { el: normalListRef.value, section: 'normal' },
    { el: rightListRef.value, section: 'right' },
  ];

  configs.forEach(({ el, section }) => {
    if (!el) return;
    const instance = Sortable.create(el, {
      animation: 200,
      handle: '.drag-handle',
      ghostClass: 'column-item--ghost',
      chosenClass: 'column-item--chosen',
      dragClass: 'column-item--drag',
      onEnd: (evt) => handleSectionSort(section, evt),
    });
    sortableInstances.push(instance);
  });
}

watch(modalOpen, async (open) => {
  if (open) {
    await initSortables();
  } else {
    destroySortables();
  }
});

// 固定状态变化后分区 DOM 会重建，需重新绑定拖拽
watch(
  () =>
    [
      leftFixedColumns.value.length,
      nonFixedColumns.value.length,
      rightFixedColumns.value.length,
    ].join(','),
  async () => {
    if (modalOpen.value) {
      await initSortables();
    }
  },
);

onBeforeUnmount(() => {
  destroySortables();
});

function toggleColumnVisibility(data: string, checked: boolean) {
  const column = localColumns.value.find((col) => col.data === data);
  if (column) {
    column.visible = checked;
  }
}

function setColumnFixed(data: string, position: 'left' | 'right' | false) {
  const column = localColumns.value.find((col) => col.data === data);
  if (!column) return;

  column.fixed = position;

  // 固定变更后将该列移到对应分区末尾，并重排 order
  const rest = localColumns.value.filter((col) => col.data !== data);
  const left = rest.filter((col) => col.fixed === 'left');
  const normal = rest.filter((col) => col.fixed === false);
  const right = rest.filter((col) => col.fixed === 'right');

  if (position === 'left') left.push(column);
  else if (position === 'right') right.push(column);
  else normal.push(column);

  rebuildLocalColumns(left, normal, right);
}

function getPinColor(fixed: 'left' | 'right' | false | undefined) {
  if (fixed === 'left') return '#1890ff';
  if (fixed === 'right') return '#52c41a';
  return '#bfbfbf';
}

function handleSave() {
  const visibleCount = localColumns.value.filter((col) => col.visible).length;
  if (visibleCount === 0) {
    message.warning('至少需要保留一列可见');
    return;
  }

  emit('save', [...localColumns.value]);
  handleClose();
}

function handleReset() {
  if (props.columns?.length) {
    localColumns.value = cloneColumns(props.columns);
  }
}

function handleClose() {
  emit('update:modelValue', false);
}
</script>

<template>
  <div v-if="modelValue" class="column-config-dropdown">
    <div class="config-header">
      <span class="header-title">表格列配置</span>
      <span class="header-hint">拖拽调整顺序</span>
    </div>

    <div class="columns-list">
      <div v-if="leftFixedColumns.length > 0" class="fixed-section">
        <div class="section-title">固定在左侧</div>
        <div ref="leftListRef" class="column-sortable">
          <div
            v-for="column in leftFixedColumns"
            :key="column.data"
            class="column-item"
          >
            <span class="drag-handle" title="拖拽排序">
              <IconifyIcon icon="mdi:drag-vertical" class="size-4" />
            </span>
            <Checkbox
              :checked="column.visible"
              @change="
                (e: any) =>
                  toggleColumnVisibility(column.data, e.target.checked)
              "
            >
              <span class="column-name">{{ column.title }}</span>
            </Checkbox>
            <div class="column-actions">
              <div class="pin-buttons">
                <span
                  class="pin-icon active"
                  :style="{ color: getPinColor(column.fixed) }"
                  title="固定在左侧"
                  @click="setColumnFixed(column.data, 'left')"
                >
                  <IconifyIcon icon="mdi:chevron-left" class="size-4" />
                </span>
                <span
                  class="pin-icon active"
                  :style="{ color: getPinColor(column.fixed) }"
                  title="取消固定"
                  @click="setColumnFixed(column.data, false)"
                >
                  <IconifyIcon icon="mdi:pin-off-outline" class="size-4" />
                </span>
                <span
                  class="pin-icon"
                  :style="{ color: getPinColor(column.fixed) }"
                  title="固定在右侧"
                  @click="setColumnFixed(column.data, 'right')"
                >
                  <IconifyIcon icon="mdi:chevron-right" class="size-4" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="nonFixedColumns.length > 0" class="normal-section">
        <div class="section-title">普通列</div>
        <div ref="normalListRef" class="column-sortable">
          <div
            v-for="column in nonFixedColumns"
            :key="column.data"
            class="column-item"
          >
            <span class="drag-handle" title="拖拽排序">
              <IconifyIcon icon="mdi:drag-vertical" class="size-4" />
            </span>
            <Checkbox
              :checked="column.visible"
              @change="
                (e: any) =>
                  toggleColumnVisibility(column.data, e.target.checked)
              "
            >
              <span class="column-name">{{ column.title }}</span>
            </Checkbox>
            <div class="column-actions">
              <div class="pin-buttons">
                <span
                  class="pin-icon"
                  :style="{ color: getPinColor(column.fixed) }"
                  title="固定在左侧"
                  @click="setColumnFixed(column.data, 'left')"
                >
                  <IconifyIcon icon="mdi:chevron-left" class="size-4" />
                </span>
                <span
                  class="pin-icon active"
                  :style="{ color: getPinColor(column.fixed) }"
                  title="取消固定"
                  @click="setColumnFixed(column.data, false)"
                >
                  <IconifyIcon icon="mdi:pin-off-outline" class="size-4" />
                </span>
                <span
                  class="pin-icon"
                  :style="{ color: getPinColor(column.fixed) }"
                  title="固定在右侧"
                  @click="setColumnFixed(column.data, 'right')"
                >
                  <IconifyIcon icon="mdi:chevron-right" class="size-4" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="rightFixedColumns.length > 0" class="fixed-section">
        <div class="section-title">固定在右侧</div>
        <div ref="rightListRef" class="column-sortable">
          <div
            v-for="column in rightFixedColumns"
            :key="column.data"
            class="column-item"
          >
            <span class="drag-handle" title="拖拽排序">
              <IconifyIcon icon="mdi:drag-vertical" class="size-4" />
            </span>
            <Checkbox
              :checked="column.visible"
              @change="
                (e: any) =>
                  toggleColumnVisibility(column.data, e.target.checked)
              "
            >
              <span class="column-name">{{ column.title }}</span>
            </Checkbox>
            <div class="column-actions">
              <div class="pin-buttons">
                <span
                  class="pin-icon"
                  :style="{ color: getPinColor(column.fixed) }"
                  title="固定在左侧"
                  @click="setColumnFixed(column.data, 'left')"
                >
                  <IconifyIcon icon="mdi:chevron-left" class="size-4" />
                </span>
                <span
                  class="pin-icon active"
                  :style="{ color: getPinColor(column.fixed) }"
                  title="取消固定"
                  @click="setColumnFixed(column.data, false)"
                >
                  <IconifyIcon icon="mdi:pin-off-outline" class="size-4" />
                </span>
                <span
                  class="pin-icon active"
                  :style="{ color: getPinColor(column.fixed) }"
                  title="固定在右侧"
                  @click="setColumnFixed(column.data, 'right')"
                >
                  <IconifyIcon icon="mdi:chevron-right" class="size-4" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="config-footer">
      <div class="footer-actions">
        <Button
          size="small"
          type="default"
          class="reset-btn"
          @click="handleReset"
        >
          重置
        </Button>
        <div class="footer-buttons">
          <Button size="small" class="cancel-btn mr-2" @click="handleClose">
            取消
          </Button>
          <Button
            size="small"
            type="primary"
            class="save-btn"
            @click="handleSave"
          >
            确定
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.column-config-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 1000;
  width: 300px;
  max-height: 360px;
  overflow-y: auto;
  background-color: #fff;
  border: 1px solid #e8ecf3;
  border-radius: 10px;
  box-shadow: 0 4px 16px rgb(16 42 83 / 12%);

  .config-header {
    display: flex;
    flex-direction: column;
    gap: 2px;
    align-items: center;
    justify-content: center;
    padding: 12px 16px;
    background: linear-gradient(
      90deg,
      hsl(var(--primary) / 8%) 0%,
      hsl(var(--primary) / 3%) 55%,
      hsl(var(--background)) 100%
    );
    border-bottom: 1px solid #e4e8ef;
    border-radius: 10px 10px 0 0;

    .header-title {
      font-size: 14px;
      font-weight: 600;
      color: #252a31;
    }

    .header-hint {
      font-size: 11px;
      color: #9aa3af;
    }
  }

  .columns-list {
    max-height: 240px;
    padding: 8px 0 12px;
    overflow-y: auto;
  }

  .section-title {
    padding-left: 8px;
    margin: 10px 16px 6px;
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
    border-left: 3px solid hsl(var(--primary));
  }

  .column-sortable {
    min-height: 4px;
  }

  .column-item {
    display: flex;
    gap: 6px;
    align-items: center;
    padding: 8px 12px 8px 8px;
    background: #fff;
    border-bottom: 1px solid #f0f0f0;
    transition:
      background-color 0.15s ease,
      box-shadow 0.15s ease;

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background: #f8fafc;
    }

    &--ghost {
      background: hsl(var(--primary) / 10%);
      opacity: 0.65;
    }

    &--chosen {
      background: hsl(var(--primary) / 8%);
    }

    &--drag {
      background: #fff;
      box-shadow: 0 4px 12px rgb(16 42 83 / 12%);
      opacity: 1;
    }

    .drag-handle {
      display: inline-flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      color: #94a3b8;
      cursor: grab;
      border-radius: 4px;
      transition:
        color 0.15s ease,
        background-color 0.15s ease;

      &:hover {
        color: hsl(var(--primary));
        background: hsl(var(--primary) / 10%);
      }

      &:active {
        cursor: grabbing;
      }
    }

    .ant-checkbox-wrapper {
      flex: 1;
      overflow: hidden;
    }

    .column-name {
      display: inline-block;
      max-width: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 12px;
      vertical-align: middle;
      color: #333;
      white-space: nowrap;
    }

    .column-actions {
      display: flex;
      flex-shrink: 0;
      gap: 6px;
      align-items: center;

      .pin-buttons {
        display: flex;
        gap: 4px;

        .pin-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          cursor: pointer;
          border-radius: 4px;
          transition:
            opacity 0.15s ease,
            background-color 0.15s ease,
            transform 0.15s ease;

          &.active {
            opacity: 1;
          }

          &:hover {
            background: #f1f5f9;
            opacity: 0.9;
            transform: scale(1.08);
          }
        }
      }
    }
  }

  .config-footer {
    padding: 12px 16px;
    border-top: 1px solid #e8ecf3;

    .footer-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
  }
}
</style>
