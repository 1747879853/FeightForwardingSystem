<script lang="ts">
export default {
  name: 'WorkbenchPortHeader',
};
</script>

<script lang="ts" setup>
import { computed } from 'vue';

import { Tooltip } from 'ant-design-vue';

import type { PortTab } from '../../workbench-data';

interface Props {
  activePort: string;
  activePortMeta: PortTab;
  ports: PortTab[];
}

const props = defineProps<Props>();

const portTitleText = computed(() => {
  const enName = props.activePortMeta.portName || props.activePortMeta.label;
  const cnName = props.activePortMeta.cnName;
  return cnName ? `${enName} (${cnName})` : enName;
});

const emit = defineEmits<{
  'update:activePort': [string];
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
          <span class="port-header__badge">{{ activePortMeta.count }}</span>
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
          <span class="port-chip__label">{{ port.label }}</span>
          <span class="port-header__badge">{{ port.count }}</span>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.port-header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  min-height: 72px;
  padding: 12px 16px;
  background: #fff;
  border: 0.5px solid #eff0f2;
  border-radius: 8px;
  box-shadow: 0 2px 8px 0 rgb(150 199 217 / 6%);
}

.port-header__left {
  display: flex;
  flex-wrap: wrap;
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

.port-header__badge {
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
  display: inline-flex;
  gap: 8px;
  align-items: center;
  height: 36px;
  padding: 0 14px;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 18px;
}

.port-chip__label {
  font-size: 14px;
  font-weight: 600;
  color: #555d6d;
}

.port-chip.is-active {
  background: #f3f4f6;
}

.port-chip.is-active .port-chip__label {
  font-weight: 700;
  color: #1e2229;
}
</style>
