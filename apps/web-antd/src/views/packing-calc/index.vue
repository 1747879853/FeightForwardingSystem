<script lang="ts" setup>
import type { PackingAdminApi } from '#/api/packing/packing-admin';

import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import {
  Button,
  Input,
  InputNumber,
  message,
  Select,
  Slider,
  Switch,
  Tooltip,
  Upload,
} from 'ant-design-vue';

import { calculatePacking } from '#/api/packing/packing-admin';
import { getCtnCodePagedList } from '#/api/system/base-data/ctn-code-admin';

import {
  comparePackingPresets,
  type PackingCompareRow,
} from './packing-compare';
import {
  downloadCargoTemplate,
  exportLoadOrderExcel,
  exportPackingGuideExcel,
  parseCargoExcelFile,
} from './packing-excel';
import {
  buildPackingCalculateInput,
  fromCm,
  isGravityOffsetWarning,
  matchPresetByName,
  PACKING_PRESETS,
  sumCargoDraft,
  toCm,
  validatePackingDraft,
  type PackingCargoDraft,
  type PackingContainerDraft,
  type PackingDimUnit,
  type PackingPresetKey,
} from './packing-payload';
import PackingManualModal from './packing-manual-modal.vue';
import PackingScene from './packing-scene.vue';
import type { PackingViewMode } from './packing-scene.vue';
import {
  clearPackingDraft,
  consumePackingPrefill,
  loadPackingDraft,
  savePackingDraft,
} from './packing-session';

defineOptions({ name: 'PackingCalcPage' });

const router = useRouter();
const manualModalRef = ref<{ open: () => void } | null>(null);

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

function createCargoRow(
  partial?: Partial<PackingCargoDraft>,
): PackingCargoDraft {
  rowSeed += 1;
  return {
    key: `cargo-${rowSeed}`,
    name: '',
    allowRotate: true,
    supportLoad: true,
    damaged: false,
    expandLength: 0,
    expandWidth: 0,
    expandHeight: 0,
    ...partial,
  };
}

const container = ref<PackingContainerDraft>({
  length: 1203,
  width: 235,
  height: 269,
  limitWeight: 26_000,
  maxContainerCount: 5,
  autoMinContainers: true,
  selfStack: false,
  flatLay: false,
  gapLength: 0,
  gapWidth: 0,
  maxSelfStackLayers: 0,
  forkliftClearance: 0,
});

const cargos = ref<PackingCargoDraft[]>([createCargoRow()]);
const dimUnit = ref<PackingDimUnit>('cm');
const presetKey = ref<PackingPresetKey | 'custom'>('40HQ');
const masterCtnOptions = ref<{ label: string; value: string }[]>([]);
const calculating = ref(false);
const comparing = ref(false);
const result = ref<PackingAdminApi.PackingCalculateResult>();
const compareRows = ref<PackingCompareRow[]>([]);
const activeContainerIndex = ref(0);
const visibleLoadOrder = ref(0);
const maxLayerY = ref(0);
const highlightLineNo = ref(0);
const playing = ref(false);
const prefillMeta = ref<{
  seaExportId?: string;
  commissionNum?: string;
  suggestCtnName?: string;
} | null>(null);
const sceneRef = ref<{
  capturePng: () => null | string;
  setDoorView: () => void;
  fitCamera: () => void;
  applyViewMode: () => void;
} | null>(null);

const viewMode = ref<PackingViewMode>('perspective');
const showRulers = ref(true);

function setViewMode(mode: PackingViewMode) {
  viewMode.value = mode;
}

async function onDoorView() {
  setViewMode('perspective');
  await nextTick();
  sceneRef.value?.setDoorView();
}

let playTimer: ReturnType<typeof setInterval> | undefined;

const cargoStats = computed(() => sumCargoDraft(cargos.value));

const activeContainer = computed(
  () => result.value?.containers?.[activeContainerIndex.value],
);

const loadOrderMax = computed(
  () => activeContainer.value?.placements?.length ?? 0,
);

const layerYMax = computed(() => {
  const list = activeContainer.value?.placements ?? [];
  if (list.length === 0) return 0;
  return Math.max(...list.map((p) => p.y + p.height));
});

const gravityWarning = computed(() => {
  const box = activeContainer.value;
  const r = result.value;
  if (!box || !r) return false;
  return (
    isGravityOffsetWarning(box.gravityOffsetLength, r.length) ||
    isGravityOffsetWarning(box.gravityOffsetWidth, r.width)
  );
});

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

/** 货物信息卡列表：当前柜已装各货行（按序号），竖向全部展示 */
const cargoInfoCards = computed(() => {
  const placements = activeContainer.value?.placements ?? [];
  const lineNos =
    placements.length > 0
      ? [...new Set(placements.map((piece) => piece.lineNo))].sort(
          (a, b) => a - b,
        )
      : cargos.value.map((row, index) => row.lineNo ?? index + 1);

  return lineNos.map((lineNo) => {
    const draft = cargos.value.find(
      (row, index) => (row.lineNo ?? index + 1) === lineNo,
    );
    const placement = placements.find((piece) => piece.lineNo === lineNo);
    const length = draft?.length ?? placement?.length;
    const width = draft?.width ?? placement?.width;
    const height = draft?.height ?? placement?.height;
    const weight = draft?.weight ?? placement?.weight;
    const allowRotate = draft?.allowRotate ?? true;
    const supportLoad = draft?.supportLoad !== false;
    const dimText = [length, width, height].every(
      (v) => v !== undefined && v !== null && Number.isFinite(Number(v)),
    )
      ? `${formatDimCm(Number(length))}X${formatDimCm(Number(width))}X${formatDimCm(Number(height))}`
      : '—';

    return {
      lineNo,
      name: draft?.name || placement?.name || '—',
      dimText,
      weightText:
        weight !== undefined &&
        weight !== null &&
        Number.isFinite(Number(weight))
          ? String(weight)
          : '—',
      stackRule: allowRotate ? '可旋转' : '正放',
      customerCode: draft?.groupKey?.trim() || '—',
      supportLoadText: supportLoad ? '是' : '否',
    };
  });
});

function formatDimCm(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function onSelectCargoLine(lineNo: number) {
  highlightLineNo.value = lineNo > 0 ? lineNo : 0;
}

const suggestCtnText = computed(() => {
  if (!result.value || result.value.containerCount <= 0) return '';
  const name =
    prefillMeta.value?.suggestCtnName ||
    (presetKey.value === 'custom' ? 'CUSTOM' : presetKey.value);
  return `${name}*${result.value.containerCount}`;
});

function displayDim(cm?: number) {
  if (cm === undefined || cm === null || !Number.isFinite(cm)) return undefined;
  return fromCm(cm, dimUnit.value);
}

function setDim(
  target: 'container' | PackingCargoDraft,
  field:
    | 'length'
    | 'width'
    | 'height'
    | 'gapLength'
    | 'gapWidth'
    | 'forkliftClearance'
    | 'expandLength'
    | 'expandWidth'
    | 'expandHeight',
  displayValue: null | number | undefined,
) {
  const cm =
    displayValue === null || displayValue === undefined
      ? undefined
      : toCm(Number(displayValue), dimUnit.value);
  if (target === 'container') {
    (container.value as any)[field] = cm;
  } else {
    (target as any)[field] = cm;
  }
}

function applyPreset(key: PackingPresetKey) {
  const preset = PACKING_PRESETS.find((p) => p.key === key);
  if (!preset) return;
  presetKey.value = key;
  container.value.length = preset.length;
  container.value.width = preset.width;
  container.value.height = preset.height;
  if (!container.value.limitWeight) {
    container.value.limitWeight = preset.limitWeight;
  }
}

async function loadMasterCtns() {
  try {
    const page = await getCtnCodePagedList({
      PageIndex: 1,
      PageSize: 100,
      Status: 0,
      Sorting: 'OrderNo ASC, Id DESC',
    });
    const items = page?.items ?? [];
    masterCtnOptions.value = items
      .filter((i) => i.ctnName)
      .map((i) => ({
        label: `${i.ctnName}${i.limitWeight ? ` · 限重${i.limitWeight}` : ''}`,
        value: String(i.ctnName),
      }));
  } catch {
    masterCtnOptions.value = [];
  }
}

function onPickMasterCtn(name: string) {
  const preset = matchPresetByName(name);
  if (preset) {
    applyPreset(preset.key);
  } else {
    presetKey.value = 'custom';
    message.info('已选择箱型名称；内径请按实际填写（主数据无内径字段）');
  }
  // 限重：从选项 label 解析或保留
  const opt = masterCtnOptions.value.find((o) => o.value === name);
  const m = opt?.label.match(/限重\s*([\d.]+)/);
  if (m?.[1]) container.value.limitWeight = Number(m[1]);
}

function addCargo() {
  cargos.value.push(createCargoRow());
}

function removeCargo(key: string) {
  cargos.value = cargos.value.filter((row) => row.key !== key);
  if (cargos.value.length === 0) cargos.value = [createCargoRow()];
}

function formatOffset(value: number, positive: string, negative: string) {
  if (!value) return '0';
  const side = value > 0 ? positive : negative;
  return `${value}（${side}）`;
}

function stopPlay() {
  playing.value = false;
  if (playTimer) {
    clearInterval(playTimer);
    playTimer = undefined;
  }
}

function togglePlay() {
  if (playing.value) {
    stopPlay();
    return;
  }
  if (loadOrderMax.value <= 1) return;
  playing.value = true;
  if (visibleLoadOrder.value >= loadOrderMax.value) {
    visibleLoadOrder.value = 1;
  }
  playTimer = setInterval(() => {
    if (visibleLoadOrder.value >= loadOrderMax.value) {
      stopPlay();
      return;
    }
    visibleLoadOrder.value += 1;
  }, 350);
}

async function generatePlan() {
  const error = validatePackingDraft(container.value, cargos.value);
  if (error) {
    message.warning(error);
    return;
  }
  stopPlay();
  calculating.value = true;
  try {
    const data = await calculatePacking(
      buildPackingCalculateInput(container.value, cargos.value),
    );
    result.value = data;
    activeContainerIndex.value = 0;
    visibleLoadOrder.value = data.containers?.[0]?.placements?.length ?? 0;
    maxLayerY.value = 0;
    highlightLineNo.value = 0;
    savePackingDraft({
      container: container.value,
      cargos: cargos.value,
      presetKey: presetKey.value === 'custom' ? undefined : presetKey.value,
      dimUnit: dimUnit.value,
    });
    if (data.unplacedQuantity > 0) {
      message.warning(`仍有 ${data.unplacedQuantity} 件未装入`);
    } else {
      message.success(
        container.value.autoMinContainers
          ? `试算完成，最少开柜 ${data.containerCount} 只`
          : '试算完成',
      );
    }
  } catch {
    // 接口报错由请求拦截器按原文提示
  } finally {
    calculating.value = false;
  }
}

async function runCompare() {
  const error = validatePackingDraft(
    { ...container.value, autoMinContainers: true },
    cargos.value,
  );
  if (error) {
    message.warning(error);
    return;
  }
  comparing.value = true;
  try {
    compareRows.value = await comparePackingPresets(
      container.value,
      cargos.value,
    );
    message.success('多柜型对比完成');
  } catch {
    // interceptor
  } finally {
    comparing.value = false;
  }
}

function applyCompareRow(row: PackingCompareRow) {
  applyPreset(row.key);
  container.value.limitWeight = row.limitWeight;
  result.value = row.result;
  activeContainerIndex.value = 0;
  visibleLoadOrder.value = row.result.containers?.[0]?.placements?.length ?? 0;
  maxLayerY.value = 0;
  message.success(`已采用 ${row.label} 方案`);
}

function selectContainer(index: number) {
  stopPlay();
  activeContainerIndex.value = index;
  visibleLoadOrder.value =
    result.value?.containers?.[index]?.placements?.length ?? 0;
  maxLayerY.value = 0;
}

async function onImportExcel(file: File) {
  const { rows, errors } = await parseCargoExcelFile(
    file,
    dimUnit.value,
    () => {
      rowSeed += 1;
      return `cargo-${rowSeed}`;
    },
  );
  if (rows.length) {
    cargos.value = rows.map((r) => createCargoRow(r));
    message.success(`已导入 ${rows.length} 行货物`);
  }
  if (errors.length) {
    message.warning(errors.slice(0, 3).join('；'));
  }
  return false;
}

async function onDownloadTemplate() {
  await downloadCargoTemplate(dimUnit.value);
}

async function onExportOrder() {
  if (!result.value) return;
  await exportLoadOrderExcel(
    result.value,
    activeContainerIndex.value,
    dimUnit.value,
  );
}

async function onExportGuide() {
  if (!result.value) return;
  await exportPackingGuideExcel(
    result.value,
    presetKey.value === 'custom' ? '自定义' : presetKey.value,
  );
}

function onScreenshot() {
  const dataUrl = sceneRef.value?.capturePng();
  if (!dataUrl) {
    message.warning('暂无画面可截图');
    return;
  }
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `装箱3D_柜${activeContainer.value?.index ?? 1}.png`;
  a.click();
}

function copySuggestCtn() {
  if (!suggestCtnText.value) return;
  void navigator.clipboard.writeText(suggestCtnText.value).then(
    () => message.success(`已复制建议箱量 ${suggestCtnText.value}`),
    () => message.info(suggestCtnText.value),
  );
}

/** 现场/监装可读的装载说明（文本分享，无需公开页） */
function copySiteLoadGuide() {
  const r = result.value;
  if (!r?.containers?.length) {
    message.warning('请先生成方案');
    return;
  }
  const lines: string[] = [
    '【装箱试算 · 现场装载说明】',
    `柜内径 ${r.length}×${r.width}×${r.height} cm，开柜 ${r.containerCount}`,
    `建议箱量 ${suggestCtnText.value || '—'}`,
    '',
  ];
  for (const box of r.containers) {
    lines.push(
      `— 柜 ${box.index}（容积率 ${box.volumeRate}% / 载重率 ${box.weightRate}%）—`,
    );
    const ordered = [...(box.placements ?? [])].sort(
      (a, b) => a.loadOrder - b.loadOrder,
    );
    for (const p of ordered) {
      lines.push(
        `${p.loadOrder}. 行${p.lineNo} ${p.name || ''} #${p.pieceIndex} @(${p.x},${p.y},${p.z}) ${p.length}×${p.width}×${p.height}cm`,
      );
    }
    lines.push('');
  }
  if (r.unplacedCargos?.length) {
    lines.push('未装：');
    for (const u of r.unplacedCargos) {
      lines.push(`行${u.lineNo} ${u.name || ''} ×${u.quantity} ${u.reason}`);
    }
  }
  const text = lines.join('\n');
  void navigator.clipboard.writeText(text).then(
    () => message.success('已复制现场装载说明，可发给监装/现场'),
    () => message.info('复制失败，请改用导出指导书'),
  );
}

function backToSeaExportWithSuggest() {
  const id = prefillMeta.value?.seaExportId;
  if (!id) return;
  copySuggestCtn();
  router.push({
    path: `/sea-exports/${id}/edit`,
    query: {
      packingSuggest: suggestCtnText.value || undefined,
    },
  });
}

function restoreDraft() {
  const draft = loadPackingDraft();
  if (!draft) {
    message.info('没有本地草稿');
    return;
  }
  container.value = {
    ...container.value,
    ...draft.container,
    autoMinContainers: draft.container.autoMinContainers ?? true,
  };
  cargos.value = (draft.cargos?.length ? draft.cargos : [createCargoRow()]).map(
    (r) => createCargoRow(r),
  );
  if (draft.presetKey) presetKey.value = draft.presetKey;
  if (draft.dimUnit) dimUnit.value = draft.dimUnit;
  message.success('已恢复本地草稿');
}

function clearDraft() {
  clearPackingDraft();
  message.success('已清除本地草稿');
}

onMounted(() => {
  void loadMasterCtns();
  const prefill = consumePackingPrefill();
  if (prefill) {
    if (prefill.container) {
      container.value = {
        ...container.value,
        ...prefill.container,
        autoMinContainers: prefill.container.autoMinContainers ?? true,
      };
    }
    if (prefill.cargos?.length) {
      cargos.value = prefill.cargos.map((r) => createCargoRow(r));
    }
    if (prefill.presetKey) applyPreset(prefill.presetKey);
    prefillMeta.value = {
      seaExportId: prefill.seaExportId,
      commissionNum: prefill.commissionNum,
      suggestCtnName: prefill.suggestCtnName || prefill.presetKey,
    };
    message.success(
      prefill.commissionNum
        ? `已带入业务 ${prefill.commissionNum} 的件毛体估算`
        : '已带入预填数据',
    );
  }
});

onUnmounted(() => stopPlay());

watch(dimUnit, () => {
  // 仅改变展示换算，内部始终存厘米
});
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
          <div class="packing-toolbar">
            <Select
              v-model:value="dimUnit"
              size="small"
              style="width: 88px"
              :options="[
                { label: 'cm', value: 'cm' },
                { label: 'mm', value: 'mm' },
                { label: 'm', value: 'm' },
              ]"
            />
            <Button size="small" @click="onDownloadTemplate">下载模板</Button>
            <Upload
              :show-upload-list="false"
              accept=".xlsx,.xls,.csv"
              :before-upload="onImportExcel"
            >
              <Button size="small">Excel 导入</Button>
            </Upload>
          </div>
          <div class="packing-cargo-list">
            <article
              v-for="(row, index) in cargos"
              :key="row.key"
              class="packing-cargo"
              :class="{
                'packing-cargo--on': highlightLineNo === index + 1,
              }"
              @click="highlightLineNo = index + 1"
            >
              <div class="packing-cargo__title">
                <span>第 {{ index + 1 }} 行</span>
                <button
                  type="button"
                  class="packing-link"
                  @click.stop="removeCargo(row.key)"
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
                  长 ({{ dimUnit }})
                  <InputNumber
                    :value="displayDim(row.length)"
                    :min="0"
                    size="small"
                    placeholder="尺寸"
                    @update:value="(v) => setDim(row, 'length', v as number)"
                  />
                </label>
                <label>
                  宽 ({{ dimUnit }})
                  <InputNumber
                    :value="displayDim(row.width)"
                    :min="0"
                    size="small"
                    @update:value="(v) => setDim(row, 'width', v as number)"
                  />
                </label>
                <label>
                  高 ({{ dimUnit }})
                  <InputNumber
                    :value="displayDim(row.height)"
                    :min="0"
                    size="small"
                    @update:value="(v) => setDim(row, 'height', v as number)"
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
                <label>
                  分组
                  <Input
                    v-model:value="row.groupKey"
                    size="small"
                    :maxlength="50"
                    placeholder="拼箱不拆柜"
                  />
                </label>
                <label class="packing-cargo__rotate">
                  允许旋转
                  <Switch v-model:checked="row.allowRotate" size="small" />
                </label>
                <label class="packing-cargo__rotate">
                  可承重
                  <Switch v-model:checked="row.supportLoad" size="small" />
                </label>
                <label class="packing-cargo__rotate">
                  破损置顶
                  <Switch v-model:checked="row.damaged" size="small" />
                </label>
              </div>
              <div class="packing-cargo__grid packing-cargo__grid--expand">
                <label>
                  膨胀长
                  <InputNumber
                    :value="displayDim(row.expandLength)"
                    :min="0"
                    size="small"
                    @update:value="
                      (v) => setDim(row, 'expandLength', v as number)
                    "
                  />
                </label>
                <label>
                  膨胀宽
                  <InputNumber
                    :value="displayDim(row.expandWidth)"
                    :min="0"
                    size="small"
                    @update:value="
                      (v) => setDim(row, 'expandWidth', v as number)
                    "
                  />
                </label>
                <label>
                  膨胀高
                  <InputNumber
                    :value="displayDim(row.expandHeight)"
                    :min="0"
                    size="small"
                    @update:value="
                      (v) => setDim(row, 'expandHeight', v as number)
                    "
                  />
                </label>
              </div>
            </article>
          </div>
          <Button block size="small" @click="addCargo">新增货物</Button>
        </section>

        <section class="packing-panel packing-panel--container-info">
          <header class="packing-panel__head">
            <span>装载规则</span>
          </header>
          <div class="packing-form packing-form--gaps">
            <label>
              间隙长 ({{ dimUnit }})
              <InputNumber
                :value="displayDim(container.gapLength)"
                :min="0"
                class="w-full"
                @update:value="
                  (v) => setDim('container', 'gapLength', v as number)
                "
              />
            </label>
            <label>
              间隙宽 ({{ dimUnit }})
              <InputNumber
                :value="displayDim(container.gapWidth)"
                :min="0"
                class="w-full"
                @update:value="
                  (v) => setDim('container', 'gapWidth', v as number)
                "
              />
            </label>
            <label>
              自叠层数
              <InputNumber
                v-model:value="container.maxSelfStackLayers"
                :min="0"
                :max="100"
                :precision="0"
                class="w-full"
                placeholder="0=不限"
              />
            </label>
            <label>
              叉车顶隙 ({{ dimUnit }})
              <InputNumber
                :value="displayDim(container.forkliftClearance)"
                :min="0"
                class="w-full"
                @update:value="
                  (v) => setDim('container', 'forkliftClearance', v as number)
                "
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
            平铺优先于自叠。填写膨胀、叉车顶隙后，试算会按预留后的尺寸占位。
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
        <div class="packing-scene-tools">
          <Button size="small" :disabled="!result" @click="togglePlay">
            {{ playing ? '暂停' : '播放顺序' }}
          </Button>
          <Button.Group size="small">
            <Button
              :type="viewMode === 'perspective' ? 'primary' : 'default'"
              :disabled="!result"
              @click="setViewMode('perspective')"
            >
              透视
            </Button>
            <Button
              :type="viewMode === 'top' ? 'primary' : 'default'"
              :disabled="!result"
              @click="setViewMode('top')"
            >
              俯视
            </Button>
            <Button
              :type="viewMode === 'side' ? 'primary' : 'default'"
              :disabled="!result"
              @click="setViewMode('side')"
            >
              侧视
            </Button>
            <Button
              :type="viewMode === 'front' ? 'primary' : 'default'"
              :disabled="!result"
              @click="setViewMode('front')"
            >
              正视
            </Button>
          </Button.Group>
          <Button size="small" :disabled="!result" @click="onDoorView">
            箱门视角
          </Button>
          <Button
            size="small"
            :disabled="!result"
            @click="sceneRef?.fitCamera()"
          >
            复位
          </Button>
          <Button
            size="small"
            :type="showRulers ? 'primary' : 'default'"
            :disabled="!result"
            @click="showRulers = !showRulers"
          >
            标尺
          </Button>
          <Button size="small" :disabled="!result" @click="onScreenshot">
            截图
          </Button>
          <Button size="small" :disabled="!result" @click="onExportOrder">
            导出顺序
          </Button>
          <Button size="small" :disabled="!result" @click="onExportGuide">
            指导书
          </Button>
          <Button size="small" :disabled="!result" @click="copySiteLoadGuide">
            分享现场说明
          </Button>
        </div>
        <div class="packing-scene-wrap">
          <PackingScene
            v-if="result && activeContainer"
            ref="sceneRef"
            :length="result.length"
            :width="result.width"
            :height="result.height"
            :placements="activeContainer.placements"
            :visible-load-order="visibleLoadOrder"
            :max-layer-y="maxLayerY"
            :highlight-line-no="highlightLineNo"
            :gravity-offset-length="activeContainer.gravityOffsetLength"
            :gravity-offset-width="activeContainer.gravityOffsetWidth"
            :gravity-warning="gravityWarning"
            :view-mode="viewMode"
            :show-rulers="showRulers"
            @select-line="onSelectCargoLine"
          />
          <div
            v-if="result && activeContainer && cargoInfoCards.length > 0"
            class="packing-cargo-info-stack"
          >
            <aside
              v-for="info in cargoInfoCards"
              :key="info.lineNo"
              class="packing-cargo-info"
              :class="{
                'packing-cargo-info--on': highlightLineNo === info.lineNo,
              }"
            >
              <header class="packing-cargo-info__head">货物信息</header>
              <dl class="packing-cargo-info__list">
                <div>
                  <dt>序号</dt>
                  <dd>{{ info.lineNo }}</dd>
                </div>
                <div>
                  <dt>品名</dt>
                  <dd>{{ info.name }}</dd>
                </div>
                <div>
                  <dt>单件尺寸(cm)</dt>
                  <dd>{{ info.dimText }}</dd>
                </div>
                <div>
                  <dt>单件毛重(kg)</dt>
                  <dd>{{ info.weightText }}</dd>
                </div>
                <div>
                  <dt>码放要求</dt>
                  <dd>{{ info.stackRule }}</dd>
                </div>
                <div>
                  <dt>客户代码</dt>
                  <dd>{{ info.customerCode }}</dd>
                </div>
                <div>
                  <dt>是否承重</dt>
                  <dd>{{ info.supportLoadText }}</dd>
                </div>
              </dl>
            </aside>
          </div>
          <div v-if="!result" class="packing-empty">
            录入柜子和货物后，点底部「生成方案」
          </div>
        </div>
        <div v-if="activeContainer" class="packing-scene-foot">
          <div
            class="packing-metrics"
            :class="{ 'packing-metrics--warn': gravityWarning }"
          >
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
            <span v-if="gravityWarning" class="packing-warn-text">
              偏载告警：偏移超过柜尺寸 10%
            </span>
          </div>
          <div v-if="loadOrderMax > 1" class="packing-order">
            <span>装载顺序 {{ visibleLoadOrder }} / {{ loadOrderMax }}</span>
            <Slider
              v-model:value="visibleLoadOrder"
              :min="1"
              :max="loadOrderMax"
              :tooltip-open="false"
              @change="stopPlay"
            />
          </div>
          <div v-if="layerYMax > 0" class="packing-order">
            <span>
              层剖切
              {{ maxLayerY > 0 ? `${maxLayerY.toFixed(0)} cm` : '关闭' }}
            </span>
            <Slider
              v-model:value="maxLayerY"
              :min="0"
              :max="Math.ceil(layerYMax)"
              :tooltip-open="false"
            />
          </div>
          <div v-if="legendLines.length" class="packing-legend">
            <button
              v-for="item in legendLines"
              :key="item.lineNo"
              type="button"
              class="packing-legend__btn"
              @click="highlightLineNo = item.lineNo"
            >
              <i :style="{ background: item.color }"></i>
              {{ item.lineNo }}. {{ item.name }}
            </button>
          </div>
          <p class="packing-axis">
            箱头在里端，箱门为红面。橙点为重心投影；绿区为安全区。左键旋转，Ctrl+左键平移，滚轮缩放。
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
        <div v-if="compareRows.length" class="packing-compare">
          <div class="packing-unplaced__title">多柜型对比</div>
          <table>
            <thead>
              <tr>
                <th>柜型</th>
                <th>开柜</th>
                <th>未装</th>
                <th>容积率</th>
                <th>载重率</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in compareRows" :key="row.key">
                <td>{{ row.label }}</td>
                <td>{{ row.containerCount }}</td>
                <td :class="{ 'packing-warn-text': row.unplacedQuantity > 0 }">
                  {{ row.unplacedQuantity }}
                </td>
                <td>{{ row.avgVolumeRate }}%</td>
                <td>{{ row.avgWeightRate }}%</td>
                <td>
                  <button
                    type="button"
                    class="packing-link"
                    @click="applyCompareRow(row)"
                  >
                    采用
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
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
            :class="{ 'packing-tab--on': presetKey === preset.key }"
            @click="applyPreset(preset.key)"
          >
            {{ preset.label }}
          </button>
        </div>
        <label class="packing-master">
          箱型主数据
          <Select
            allow-clear
            show-search
            placeholder="选择箱型带出限重/匹配内径"
            size="small"
            :options="masterCtnOptions"
            :filter-option="
              (input, option) =>
                String(option?.label ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
            "
            @change="(v) => v && onPickMasterCtn(String(v))"
          />
        </label>
        <p class="packing-hint">
          快捷柜型写入内径与建议限重；主数据无内径时仅匹配常见名并带限重。
        </p>
        <div class="packing-form">
          <label>
            柜内长 ({{ dimUnit }})
            <InputNumber
              :value="displayDim(container.length)"
              :min="0"
              class="w-full"
              @update:value="(v) => setDim('container', 'length', v as number)"
            />
          </label>
          <label>
            柜内宽 ({{ dimUnit }})
            <InputNumber
              :value="displayDim(container.width)"
              :min="0"
              class="w-full"
              @update:value="(v) => setDim('container', 'width', v as number)"
            />
          </label>
          <label>
            柜内高 ({{ dimUnit }})
            <InputNumber
              :value="displayDim(container.height)"
              :min="0"
              class="w-full"
              @update:value="(v) => setDim('container', 'height', v as number)"
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
          <label class="packing-switch">
            <span>自动最少开柜</span>
            <Switch v-model:checked="container.autoMinContainers" />
          </label>
          <label v-if="!container.autoMinContainers">
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
        <div v-if="prefillMeta?.seaExportId" class="packing-order-actions">
          <p class="packing-hint">
            来自海出
            {{ prefillMeta.commissionNum || prefillMeta.seaExportId }}
          </p>
          <Button
            size="small"
            block
            :disabled="!suggestCtnText"
            @click="copySuggestCtn"
          >
            复制建议箱量 {{ suggestCtnText || '' }}
          </Button>
          <Button
            size="small"
            block
            type="primary"
            ghost
            :disabled="!suggestCtnText"
            @click="backToSeaExportWithSuggest"
          >
            返回海出（带回建议）
          </Button>
        </div>
        <div class="packing-order-actions">
          <Button size="small" block @click="restoreDraft">恢复草稿</Button>
          <Button size="small" block @click="clearDraft">清除草稿</Button>
        </div>
      </section>

      <footer class="packing-footer">
        <Button type="primary" :loading="calculating" @click="generatePlan">
          生成方案
        </Button>
        <Button :loading="comparing" @click="runCompare">多柜型对比</Button>
        <span class="packing-hint">
          试算结果仅供本机参考；生成后会记住草稿，刷新可点「恢复草稿」。
        </span>
      </footer>
    </div>
    <Tooltip title="操作说明书" placement="left">
      <button
        type="button"
        class="packing-manual-fab"
        aria-label="操作说明书"
        @click="manualModalRef?.open()"
      >
        <IconifyIcon icon="mdi:book-open-page-variant-outline" class="size-5" />
      </button>
    </Tooltip>
    <PackingManualModal ref="manualModalRef" />
  </Page>
</template>

<style scoped>
.packing-page {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  grid-template-columns: 320px minmax(0, 1fr) 260px;
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
  max-height: 42%;
  overflow: auto;
}

.packing-panel--scene {
  grid-row: 1;
  grid-column: 2;
}

.packing-page > .packing-panel:nth-last-of-type(1) {
  grid-row: 1;
  grid-column: 3;
  overflow: auto;
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

.packing-toolbar,
.packing-scene-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
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
  cursor: pointer;
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
}

.packing-cargo--on {
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 1px hsl(var(--primary) / 35%);
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

.packing-cargo__grid--expand {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.packing-cargo__grid label,
.packing-form label,
.packing-master {
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
  position: relative;
  flex: 1;
  min-height: 280px;
}

.packing-cargo-info-stack {
  position: absolute;
  top: 12px;
  bottom: 12px;
  left: 12px;
  z-index: 3;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: min(240px, calc(100% - 24px));
  overflow: auto;
  pointer-events: auto;
  scrollbar-width: thin;
}

.packing-cargo-info {
  flex-shrink: 0;
  pointer-events: none;
  background: rgb(255 255 255 / 96%);
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 16px hsl(var(--foreground) / 8%);
}

.packing-cargo-info--on {
  border-color: hsl(var(--primary) / 45%);
  box-shadow: 0 4px 16px hsl(var(--primary) / 14%);
}

.packing-cargo-info__head {
  padding: 10px 12px 8px;
  font-size: 14px;
  font-weight: 650;
  color: #0f172a;
  border-bottom: 1px solid #eef2f7;
}

.packing-cargo-info__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px 12px;
  margin: 0;

  div {
    display: grid;
    grid-template-columns: 108px minmax(0, 1fr);
    gap: 8px;
    align-items: start;
  }

  dt {
    margin: 0;
    font-size: 12px;
    line-height: 1.45;
    color: #64748b;
  }

  dd {
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 12px;
    font-weight: 500;
    line-height: 1.45;
    color: #0f172a;
    word-break: break-all;
  }
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

.packing-metrics--warn {
  padding: 6px 8px;
  background: #fff1f0;
  border: 1px solid #ffa39e;
  border-radius: 6px;
}

.packing-warn-text {
  color: #cf1322;
}

.packing-tab,
.packing-legend__btn {
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

.packing-compare {
  margin-top: 8px;
  overflow: auto;
  font-size: 12px;
}

.packing-compare table {
  width: 100%;
  border-collapse: collapse;
}

.packing-compare th,
.packing-compare td {
  padding: 4px 6px;
  text-align: left;
  border-bottom: 1px solid hsl(var(--border));
}

.packing-link {
  padding: 0;
  font-size: 12px;
  color: hsl(var(--primary));
  cursor: pointer;
  background: none;
  border: 0;
}

.packing-order-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
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

.packing-manual-fab {
  position: fixed;
  right: 28px;
  bottom: 28px;
  z-index: 50;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  color: #fff;
  cursor: pointer;
  background: hsl(var(--primary));
  border: 0;
  border-radius: 50%;
  box-shadow: 0 6px 16px rgb(0 0 0 / 18%);
}

.packing-manual-fab:hover {
  filter: brightness(1.06);
}

.packing-manual-fab:active {
  transform: scale(0.96);
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
  .packing-page > .packing-panel:nth-last-of-type(1),
  .packing-footer {
    grid-row: auto;
    grid-column: 1;
  }
}
</style>
