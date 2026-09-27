<script lang="ts" setup>
import type { PackingAdminApi } from '#/api/packing/packing-admin';

import { computed, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Input,
  InputNumber,
  message,
  Slider,
  Switch,
} from 'ant-design-vue';

import { calculatePacking } from '#/api/packing/packing-admin';

import PackingScene from './packing-scene.vue';
import {
  buildPackingCalculateInput,
  PACKING_PRESETS,
  sumCargoDraft,
  validatePackingDraft,
  type PackingCargoDraft,
  type PackingContainerDraft,
} from './packing-payload';

defineOptions({ name: 'PackingCalcPage' });

const LINE_COLORS = [
  '#1677ff',
  '#52c41a',
  '#fa8c16',
  '#eb2f96',
  '#722ed1',
  '#13c2c2',
  '#faad14',
  '#2f54eb',
];

let rowSeed = 1;

function createCargoRow(): PackingCargoDraft {
  rowSeed += 1;
  return {
    key: `cargo-${rowSeed}`,
    name: '',
    allowRotate: true,
  };
}

const container = ref<PackingContainerDraft>({
  length: 1203,
  width: 235,
  height: 269,
  limitWeight: 0,
  maxContainerCount: 5,
  selfStack: false,
  flatLay: false,
  gapLength: 0,
  gapWidth: 0,
});

const cargos = ref<PackingCargoDraft[]>([createCargoRow()]);
const calculating = ref(false);
const result = ref<PackingAdminApi.PackingCalculateResult>();
const activeContainerIndex = ref(0);
const visibleLoadOrder = ref(0);

const cargoStats = computed(() => sumCargoDraft(cargos.value));

const activeContainer = computed(
  () => result.value?.containers?.[activeContainerIndex.value],
);

const loadOrderMax = computed(
  () => activeContainer.value?.placements?.length ?? 0,
);

const legendLines = computed(() => {
  const seen = new Map<number, string>();
  for (const piece of activeContainer.value?.placements ?? []) {
    if (!seen.has(piece.lineNo)) {
      seen.set(piece.lineNo, piece.name || `第${piece.lineNo}行`);
    }
  }
  return [...seen.entries()].map(([lineNo, name]) => ({
    lineNo,
    name,
    color: LINE_COLORS[(lineNo - 1) % LINE_COLORS.length],
  }));
});

function applyPreset(preset: (typeof PACKING_PRESETS)[number]) {
  container.value.length = preset.length;
  container.value.width = preset.width;
  container.value.height = preset.height;
}

function addCargo() {
  cargos.value.push(createCargoRow());
}

function removeCargo(key: string) {
  cargos.value = cargos.value.filter((row) => row.key !== key);
}

function formatOffset(value: number, positive: string, negative: string) {
  if (!value) return '0';
  const side = value > 0 ? positive : negative;
  return `${value}（${side}）`;
}

async function generatePlan() {
  const error = validatePackingDraft(container.value, cargos.value);
  if (error) {
    message.warning(error);
    return;
  }
  calculating.value = true;
  try {
    const data = await calculatePacking(
      buildPackingCalculateInput(container.value, cargos.value),
    );
    result.value = data;
    activeContainerIndex.value = 0;
    visibleLoadOrder.value = data.containers?.[0]?.placements?.length ?? 0;
  } catch {
    // 接口报错由请求拦截器按原文提示
  } finally {
    calculating.value = false;
  }
}

function selectContainer(index: number) {
  activeContainerIndex.value = index;
  visibleLoadOrder.value =
    result.value?.containers?.[index]?.placements?.length ?? 0;
}
</script>

<template>
  <Page auto-content-height content-class="!p-3">
    <div class="packing-page">
      <div class="packing-left">
        <section class="packing-panel packing-panel--cargo">
          <header class="packing-panel__head">
            <span>货物清单</span>
            <span class="packing-panel__meta">
              {{ cargoStats.quantity }} 件 ·
              {{ cargoStats.volumeM3.toFixed(4) }} m³ ·
              {{ cargoStats.weight.toFixed(2) }} kg
            </span>
          </header>
          <div class="packing-cargo-list">
            <article
              v-for="(row, index) in cargos"
              :key="row.key"
              class="packing-cargo"
            >
              <div class="packing-cargo__title">
                <span>第 {{ index + 1 }} 行</span>
                <button
                  type="button"
                  class="packing-link"
                  @click="removeCargo(row.key)"
                >
                  删除
                </button>
              </div>
              <Input
                v-model:value="row.name"
                :maxlength="200"
                placeholder="货物名称"
                size="small"
              />
              <div class="packing-cargo__grid">
                <label>
                  长
                  <InputNumber
                    v-model:value="row.length"
                    :min="0"
                    :max="5000"
                    size="small"
                    placeholder="cm"
                  />
                </label>
                <label>
                  宽
                  <InputNumber
                    v-model:value="row.width"
                    :min="0"
                    :max="5000"
                    size="small"
                    placeholder="cm"
                  />
                </label>
                <label>
                  高
                  <InputNumber
                    v-model:value="row.height"
                    :min="0"
                    :max="5000"
                    size="small"
                    placeholder="cm"
                  />
                </label>
                <label>
                  单件毛重
                  <InputNumber
                    v-model:value="row.weight"
                    :min="0"
                    :max="1000000"
                    size="small"
                    placeholder="kg"
                  />
                </label>
                <label>
                  件数
                  <InputNumber
                    v-model:value="row.quantity"
                    :min="1"
                    :max="800"
                    :precision="0"
                    size="small"
                  />
                </label>
                <label class="packing-cargo__rotate">
                  允许旋转
                  <Switch v-model:checked="row.allowRotate" size="small" />
                </label>
              </div>
            </article>
          </div>
          <Button block size="small" @click="addCargo">新增货物</Button>
        </section>

        <section class="packing-panel packing-panel--container-info">
          <header class="packing-panel__head">
            <span>集装箱信息</span>
          </header>
          <div class="packing-form packing-form--gaps">
            <label>
              间隙长 (cm)
              <InputNumber
                v-model:value="container.gapLength"
                :min="0"
                :max="5000"
                class="w-full"
              />
            </label>
            <label>
              间隙宽 (cm)
              <InputNumber
                v-model:value="container.gapWidth"
                :min="0"
                :max="5000"
                class="w-full"
              />
            </label>
          </div>
          <div class="packing-switch-row">
            <label class="packing-switch">
              <span>货物自叠</span>
              <Switch v-model:checked="container.selfStack" />
            </label>
            <label class="packing-switch">
              <span>平铺</span>
              <Switch v-model:checked="container.flatLay" />
            </label>
          </div>
          <p class="packing-hint">
            平铺打开时只铺一层，与自叠同时开启也只平铺。自叠只允许同一行号上下叠。
          </p>
        </section>
      </div>

      <section class="packing-panel packing-panel--scene">
        <header class="packing-panel__head">
          <span>装载图</span>
          <div v-if="result" class="packing-result-stats">
            <span class="packing-result-stat packing-result-stat--cabin">
              <em>{{ result.containerCount }}</em>
              开柜
            </span>
            <span class="packing-result-stat packing-result-stat--ok">
              <em>{{ result.placedQuantity }}</em>
              已装
            </span>
            <span
              class="packing-result-stat"
              :class="
                result.unplacedQuantity > 0
                  ? 'packing-result-stat--warn'
                  : 'packing-result-stat--mute'
              "
            >
              <em>{{ result.unplacedQuantity }}</em>
              未装
            </span>
          </div>
        </header>
        <div v-if="result?.containers?.length" class="packing-tabs">
          <button
            v-for="(item, index) in result.containers"
            :key="item.index"
            type="button"
            class="packing-tab"
            :class="{ 'packing-tab--on': index === activeContainerIndex }"
            @click="selectContainer(index)"
          >
            柜 {{ item.index }}
          </button>
        </div>
        <div class="packing-scene-wrap">
          <PackingScene
            v-if="result && activeContainer"
            :length="result.length"
            :width="result.width"
            :height="result.height"
            :placements="activeContainer.placements"
            :visible-load-order="visibleLoadOrder"
          />
          <div v-else class="packing-empty">
            录入柜子和货物后，点底部「生成方案」
          </div>
        </div>
        <div v-if="activeContainer" class="packing-scene-foot">
          <div class="packing-metrics">
            <span>容积率 {{ activeContainer.volumeRate }}%</span>
            <span>载重率 {{ activeContainer.weightRate }}%</span>
            <span>
              柜长偏移
              {{
                formatOffset(
                  activeContainer.gravityOffsetLength,
                  '偏向箱门',
                  '偏向里端',
                )
              }}
              cm
            </span>
            <span>
              柜宽偏移
              {{
                formatOffset(
                  activeContainer.gravityOffsetWidth,
                  '偏向右侧',
                  '偏向左侧',
                )
              }}
              cm
            </span>
          </div>
          <div v-if="loadOrderMax > 1" class="packing-order">
            <span>装载顺序 {{ visibleLoadOrder }} / {{ loadOrderMax }}</span>
            <Slider
              v-model:value="visibleLoadOrder"
              :min="1"
              :max="loadOrderMax"
              :tooltip-open="false"
            />
          </div>
          <div v-if="legendLines.length" class="packing-legend">
            <span v-for="item in legendLines" :key="item.lineNo">
              <i :style="{ background: item.color }"></i>
              {{ item.lineNo }}. {{ item.name }}
            </span>
          </div>
          <p class="packing-axis">
            箱头在里端，箱尾为箱门（红面）。箱长沿 X，箱高沿 Y，箱宽沿
            Z。左键旋转，Ctrl+左键平移，滚轮缩放。
          </p>
        </div>
        <div v-if="result?.unplacedCargos?.length" class="packing-unplaced">
          <div class="packing-unplaced__title">未装货物</div>
          <p
            v-for="item in result.unplacedCargos"
            :key="`${item.lineNo}-${item.reason}`"
          >
            第 {{ item.lineNo }} 行 {{ item.name || '' }} ×
            {{ item.quantity }}：{{ item.reason }}
          </p>
        </div>
      </section>

      <section class="packing-panel">
        <header class="packing-panel__head">
          <span>柜子与规则</span>
        </header>
        <div class="packing-presets">
          <button
            v-for="preset in PACKING_PRESETS"
            :key="preset.key"
            type="button"
            class="packing-tab"
            @click="applyPreset(preset)"
          >
            {{ preset.label }}
          </button>
        </div>
        <p class="packing-hint">快捷填充只写入内径，接口不使用柜型。</p>
        <div class="packing-form">
          <label>
            柜内长 (cm)
            <InputNumber
              v-model:value="container.length"
              :min="0"
              :max="5000"
              class="w-full"
            />
          </label>
          <label>
            柜内宽 (cm)
            <InputNumber
              v-model:value="container.width"
              :min="0"
              :max="5000"
              class="w-full"
            />
          </label>
          <label>
            柜内高 (cm)
            <InputNumber
              v-model:value="container.height"
              :min="0"
              :max="5000"
              class="w-full"
            />
          </label>
          <label>
            限重 (kg)
            <InputNumber
              v-model:value="container.limitWeight"
              :min="0"
              :max="1000000"
              class="w-full"
            />
          </label>
          <label>
            最多开柜数
            <InputNumber
              v-model:value="container.maxContainerCount"
              :min="1"
              :max="50"
              :precision="0"
              class="w-full"
            />
          </label>
        </div>
        <p class="packing-hint">限重填 0 表示不限重。</p>
      </section>

      <footer class="packing-footer">
        <Button type="primary" :loading="calculating" @click="generatePlan">
          生成方案
        </Button>
        <span class="packing-hint">结果不保存，刷新或离开页面即丢。</span>
      </footer>
    </div>
  </Page>
</template>

<style scoped>
.packing-page {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  grid-template-columns: 300px minmax(0, 1fr) 260px;
  gap: 12px;
  height: 100%;
  min-height: 0;
}

.packing-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  padding: 12px;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.packing-left {
  display: flex;
  flex-direction: column;
  grid-row: 1;
  grid-column: 1;
  gap: 12px;
  min-height: 0;
}

.packing-panel--cargo {
  flex: 1;
  min-height: 0;
}

.packing-panel--container-info {
  flex-shrink: 0;
}

.packing-panel--scene {
  grid-row: 1;
  grid-column: 2;
}

.packing-page > .packing-panel:last-of-type {
  grid-row: 1;
  grid-column: 3;
}

.packing-panel__head {
  display: flex;
  gap: 8px;
  align-items: baseline;
  justify-content: space-between;
  font-weight: 600;
  color: hsl(var(--primary));
}

.packing-panel__meta {
  font-size: 12px;
  font-weight: 400;
  color: hsl(var(--muted-foreground));
}

.packing-result-stats {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.packing-result-stat {
  display: inline-flex;
  gap: 6px;
  align-items: baseline;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.2;
  border: 1px solid transparent;
  border-radius: 999px;
}

.packing-result-stat em {
  font-size: 18px;
  font-style: normal;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.packing-result-stat--cabin {
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 12%);
  border-color: hsl(var(--primary) / 28%);
}

.packing-result-stat--ok {
  color: #389e0d;
  background: #f6ffed;
  border-color: #b7eb8f;
}

.packing-result-stat--warn {
  color: #cf1322;
  background: #fff1f0;
  border-color: #ffa39e;
}

.packing-result-stat--mute {
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted) / 55%);
  border-color: hsl(var(--border));
}

.packing-cargo-list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  overflow: auto;
}

.packing-cargo {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
}

.packing-cargo__title,
.packing-switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
}

.packing-cargo__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.packing-cargo__grid label,
.packing-form label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.packing-cargo__rotate {
  justify-content: flex-end;
}

.packing-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: auto;
}

.packing-form--gaps {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.packing-switch-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.packing-form :deep(.ant-input-number),
.packing-cargo__grid :deep(.ant-input-number),
.packing-form--gaps :deep(.ant-input-number) {
  width: 100%;
}

.packing-scene-wrap {
  flex: 1;
  min-height: 280px;
}

.packing-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 280px;
  color: hsl(var(--muted-foreground));
  background: #f8fafc;
  border-radius: 8px;
}

.packing-tabs,
.packing-presets,
.packing-legend,
.packing-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.packing-tab {
  padding: 2px 8px;
  font-size: 12px;
  color: hsl(var(--foreground));
  cursor: pointer;
  background: transparent;
  border: 1px solid hsl(var(--border));
  border-radius: 4px;
}

.packing-tab--on {
  color: hsl(var(--primary));
  border-color: hsl(var(--primary));
}

.packing-legend i {
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-right: 4px;
  border-radius: 2px;
}

.packing-axis,
.packing-hint,
.packing-unplaced {
  margin: 0;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.packing-unplaced__title {
  margin-bottom: 4px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.packing-link {
  padding: 0;
  font-size: 12px;
  color: hsl(var(--primary));
  cursor: pointer;
  background: none;
  border: 0;
}

.packing-footer {
  display: flex;
  grid-column: 1 / -1;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.packing-order {
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  font-size: 12px;
}

@media (max-width: 1100px) {
  .packing-page {
    grid-template-rows: auto auto auto auto;
    grid-template-columns: 1fr;
    overflow: auto;
  }

  .packing-left,
  .packing-panel--scene,
  .packing-page > .packing-panel:last-of-type,
  .packing-footer {
    grid-row: auto;
    grid-column: 1;
  }
}
</style>
