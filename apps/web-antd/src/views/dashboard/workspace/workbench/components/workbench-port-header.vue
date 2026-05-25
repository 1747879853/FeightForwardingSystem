<script lang="ts">
export default {
  name: 'WorkbenchPortHeader',
};
</script>

<script lang="ts" setup>
import { computed } from 'vue';

import { Tooltip } from 'ant-design-vue';

import type { PortTab, ProcessingTab } from '../../workbench-data';

interface Props {
  activePort: string;
  activePortMeta: PortTab;
  activeProcessingTab: string;
  ports: PortTab[];
  processingTabs: ProcessingTab[];
}

const props = defineProps<Props>();

const portTitleText = computed(
  () =>
    `${props.activePortMeta.label} (${props.activePortMeta.label.toUpperCase()} PORT)`,
);

const activeProcessingIndex = computed(() => {
  const index = props.processingTabs.findIndex(
    (tab) => tab.key === props.activeProcessingTab,
  );
  return index < 0 ? 0 : index;
});

const emit = defineEmits<{
  'update:activePort': [string];
  'update:activeProcessingTab': [string];
}>();
</script>

<template>
  <section class="port-header">
    <div class="port-header__left">
      <div class="port-header__title-wrap">
        <span class="port-header__caption">当前作业港口</span>
        <div class="port-header__title-row">
          <div class="port-header__title-main">
            <Tooltip :title="portTitleText">
              <h2 class="port-header__title">
                {{ portTitleText }}
              </h2>
            </Tooltip>
          </div>
          <span class="port-header__total">{{ activePortMeta.count }}</span>
        </div>
      </div>
      <div class="port-header__ports">
        <button
          v-for="port in ports"
          :key="port.key"
          :class="['port-chip', { 'is-active': port.key === activePort }]"
          type="button"
          @click="emit('update:activePort', port.key)"
        >
          {{ port.label }} [{{ port.count }}]
        </button>
      </div>
    </div>
    <div class="status-switch">
      <div
        class="status-switch__thumb"
        :style="{ transform: `translateX(${activeProcessingIndex * 100}%)` }"
      />
      <button
        v-for="item in processingTabs"
        :key="item.key"
        :class="[
          'status-switch__item',
          { 'is-active': item.key === activeProcessingTab },
        ]"
        type="button"
        @click="emit('update:activeProcessingTab', item.key)"
      >
        <span class="status-switch__icon" :class="`is-${item.icon}`"></span>
        {{ item.label }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.port-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 83px;
  padding: 13px 40px 16px;
  background: #fff;
  border-bottom: 1px solid #f3f4f6;
  box-shadow: 0 2px 6px rgb(24 27 32 / 4%);
}

.port-header__left {
  display: flex;
  gap: 22px;
  align-items: center;
}

.port-header__title-wrap {
  flex-shrink: 0;
  width: 302px;
}

.port-header__caption {
  font-size: 10px;
  font-weight: 700;
  color: #555d6d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.port-header__title-row {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.port-header__title-main {
  flex: 0 1 auto;
  width: fit-content;
  min-width: 0;
  max-width: 260px;
  overflow: hidden;
}

.port-header__title-main :deep(span) {
  display: block;
  max-width: 100%;
  overflow: hidden;
}

.port-header__title {
  max-width: 100%;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 20px;
  font-weight: 700;
  line-height: 28px;
  color: #181b20;
  white-space: nowrap;
}

.port-header__total {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  min-width: 30px;
  height: 20px;
  padding: 0 8px;
  font-size: 12px;
  font-weight: 500;
  line-height: 20px;
  color: #fff;
  background: #eb4747;
  border-radius: 10px;
}

.port-header__ports {
  display: flex;
  gap: 10px;
  padding-left: 24px;
  border-left: 1px solid #dee1e6;
}

.port-chip {
  height: 36px;
  padding: 0 14px;
  font-size: 14px;
  color: #555d6d;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 18px;
}

.port-chip.is-active {
  color: #1e2229;
  background: #f3f4f6;
}

.status-switch {
  position: relative;
  display: flex;
  width: 252px;
  height: 50px;
  padding: 4px;
  background: #f3f4f6;
  border: 1px solid #f3f4f6;
  border-radius: 10px;
}

.status-switch__thumb {
  position: absolute;
  top: 4px;
  left: 4px;
  width: calc((100% - 8px) / 2);
  height: calc(100% - 8px);
  pointer-events: none;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgb(46 49 56 / 6%);
  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

.status-switch__item {
  position: relative;
  z-index: 1;
  display: inline-flex;
  flex: 1;
  gap: 8px;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: #555d6d;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 8px;
  transition: color 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

.status-switch__item.is-active {
  color: #258cf4;
}

.status-switch__icon {
  position: relative;
  width: 16px;
  height: 16px;
  border: 1.5px solid currentcolor;
  border-radius: 50%;
}

.status-switch__icon.is-processing::after {
  position: absolute;
  inset: 2px;
  content: '';
  border-top: 1.5px solid currentcolor;
  border-right: 1.5px solid currentcolor;
  border-radius: 50%;
}

.status-switch__icon.is-check::before {
  position: absolute;
  top: 4px;
  left: 3px;
  width: 7px;
  height: 4px;
  content: '';
  border-bottom: 1.5px solid currentcolor;
  border-left: 1.5px solid currentcolor;
  transform: rotate(-45deg);
}
</style>
