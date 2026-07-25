<script lang="ts" setup>
import type { PreOrderAdminApi } from '#/api/pre-order/pre-order-admin';

import { computed, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import {
  Button,
  Checkbox,
  Empty,
  Modal,
  Spin,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import { PreOrderServiceCompareStatus } from '#/api/pre-order/pre-order-admin';
import { getServiceTypesByPOL } from '#/api/sea-export/sea-export-admin';
import {
  buildServiceTypeLabelMap,
  buildServiceTypeProcessMap,
  loadSeServiceTypeOptions,
} from '#/views/sea-export-admin/service-type';

export interface PreOrderServiceRow {
  serviceType: number;
  sortId?: number;
}

interface ServiceCandidate {
  /** 接口返回的默认勾选标记（起运港 + 委托单位维度） */
  defaultChecked: boolean;
  label: string;
  serviceType: number;
  sortId: number;
}

const props = withDefaults(
  defineProps<{
    clientId?: string;
    /** 详情返回的服务项对比标记（仅通过后有值） */
    compareList?: PreOrderAdminApi.PreOrderServiceDto[];
    /** 编辑态：首次回显保留详情已选项，不用默认勾选覆盖 */
    isEdit?: boolean;
    polId?: number | string;
    readonly?: boolean;
  }>(),
  {
    clientId: undefined,
    compareList: () => [],
    isEdit: false,
    polId: undefined,
    readonly: false,
  },
);

const modelValue = defineModel<PreOrderServiceRow[]>({ default: () => [] });

const loading = ref(false);
const labelMap = ref<Map<number, string>>(new Map());
/** ServiceType.extra1=true 的主流程标记，用于展示/回显双重闸门 */
const processMap = ref<Map<number, boolean>>(new Map());
/** 候选项：起运港服务项模板（已按委托单位排除）∩ 主流程服务 */
const candidates = ref<ServiceCandidate[]>([]);
/** 是否已完成首轮候选解析（用于区分「详情回显」与「用户主动改港/改客户」） */
const hasResolvedInitial = ref(false);
const modalOpen = ref(false);
const modalDraft = ref<Map<number, boolean>>(new Map());

const isMainProcess = (serviceType: number) =>
  processMap.value.get(serviceType) === true;

const checkedSet = computed(
  () =>
    new Set((modelValue.value ?? []).map((item) => Number(item.serviceType))),
);

const compareMap = computed(() => {
  const map = new Map<number, PreOrderServiceCompareStatus>();
  for (const item of props.compareList ?? []) {
    if (item.serviceType == null) continue;
    const serviceType = Number(item.serviceType);
    // 非主流程不参与对比展示（审核通过后出口会自动带入非主流程，联系单侧不展示）
    if (processMap.value.size > 0 && !isMainProcess(serviceType)) continue;
    map.set(serviceType, item.compareStatus ?? 0);
  }
  return map;
});

const labelOf = (serviceType: number) =>
  labelMap.value.get(serviceType) ?? `服务项${serviceType}`;

/**
 * 已勾选节点（仅主流程）。
 * 含：联系单已勾选项；以及海运出口侧新增的主流程项（对比「新增」）。
 * 非主流程一律不渲染，也不允许进入 model。
 */
const checkedNodes = computed(() => {
  const candidateMap = new Map(
    candidates.value.map((item) => [item.serviceType, item]),
  );
  const fromChecked = (modelValue.value ?? [])
    .map((item) => {
      const serviceType = Number(item.serviceType);
      const candidate = candidateMap.get(serviceType);
      return {
        label: candidate?.label ?? labelOf(serviceType),
        serviceType,
        sortId: Number(item.sortId ?? candidate?.sortId ?? 0),
      };
    })
    .filter(
      (item) =>
        !Number.isNaN(item.serviceType) &&
        // 候选未就绪时暂不按 processMap 拦截（避免首屏闪空）；就绪后只留主流程
        (processMap.value.size === 0 || isMainProcess(item.serviceType)),
    );

  const checkedTypes = new Set(fromChecked.map((item) => item.serviceType));
  for (const [serviceType, status] of compareMap.value.entries()) {
    if (
      status === PreOrderServiceCompareStatus.SeaExportAdded &&
      !checkedTypes.has(serviceType) &&
      isMainProcess(serviceType)
    ) {
      fromChecked.push({
        label: labelOf(serviceType),
        serviceType,
        sortId: 0,
      });
    }
  }

  return fromChecked.sort(
    (a, b) => a.sortId - b.sortId || a.serviceType - b.serviceType,
  );
});

const checkedGroups = computed(() => {
  const map = new Map<number, typeof checkedNodes.value>();
  for (const node of checkedNodes.value) {
    const list = map.get(node.sortId) ?? [];
    list.push(node);
    map.set(node.sortId, list);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([sortId, nodes]) => ({ nodes, sortId }));
});

const compareTagOf = (serviceType: number) => {
  const status = compareMap.value.get(serviceType);
  if (status === PreOrderServiceCompareStatus.SeaExportAdded) {
    return { color: 'green', text: '新增' };
  }
  if (status === PreOrderServiceCompareStatus.SeaExportRemoved) {
    return { color: 'red', text: '删除' };
  }
  return null;
};

/**
 * 业务联系单无服务任务进度：已勾选节点一律「未执行」样式。
 * 仅对比标记：出口侧「新增」→ active，「删除」→ upcoming（淡化）。
 * 切勿默认 done（绿勾已完成）——那是海运出口任务态，联系单侧会误导。
 */
const nodeState = (serviceType: number) => {
  const tag = compareTagOf(serviceType);
  if (tag?.text === '新增') return 'active';
  return 'upcoming';
};

const nodeIcon = (serviceType: number) => {
  const state = nodeState(serviceType);
  if (state === 'active') return 'mdi:progress-clock';
  return 'mdi:schedule';
};

const isFlowFirst = (groupIndex: number, nodeIndex: number) =>
  groupIndex === 0 && nodeIndex === 0;

const isFlowLast = (groupIndex: number, nodeIndex: number) => {
  const groups = checkedGroups.value;
  if (!groups.length) return false;
  const lastGroupIndex = groups.length - 1;
  return (
    groupIndex === lastGroupIndex &&
    nodeIndex === (groups[lastGroupIndex]?.nodes.length ?? 0) - 1
  );
};

function openModal() {
  if (props.readonly || !props.polId) return;
  const draft = new Map<number, boolean>();
  for (const item of candidates.value) {
    draft.set(item.serviceType, checkedSet.value.has(item.serviceType));
  }
  modalDraft.value = draft;
  modalOpen.value = true;
}

function isModalChecked(serviceType: number) {
  return modalDraft.value.get(serviceType) ?? false;
}

function handleModalDraftChange(
  serviceType: number,
  event: { target?: { checked?: boolean } },
) {
  modalDraft.value.set(serviceType, !!event?.target?.checked);
  modalDraft.value = new Map(modalDraft.value);
}

function handleModalConfirm() {
  const next: PreOrderServiceRow[] = [];
  for (const item of candidates.value) {
    if (modalDraft.value.get(item.serviceType)) {
      next.push({ serviceType: item.serviceType, sortId: item.sortId });
    }
  }
  modelValue.value = next;
  modalOpen.value = false;
}

/** 保留已勾选、仅剔除不在新候选池内 / 非主流程的服务项 */
function keepAllowedChecked(allowed: Set<number>) {
  const kept = (modelValue.value ?? []).filter((item) => {
    const serviceType = Number(item.serviceType);
    return allowed.has(serviceType) && isMainProcess(serviceType);
  });
  if (kept.length !== (modelValue.value ?? []).length) {
    modelValue.value = kept;
  }
}

/** 按接口默认勾选（checked）带出主流程服务项（candidates 已是主流程） */
function applyDefaultChecked() {
  modelValue.value = candidates.value
    .filter((item) => item.defaultChecked)
    .map((item) => ({ serviceType: item.serviceType, sortId: item.sortId }));
}

/**
 * 候选池 = 起运港服务项模板（接口已按委托单位排除）∩ ServiceType 主流程(extra1)。
 * 与后端「最大集合」口径一致，因此勾选结果天然满足「可少不可多」。
 * 非主流程：不可进候选、不可勾选、不可在流水线展示（审核通过后由出口侧自动带入）。
 *
 * 勾选策略：
 * - 首轮解析（详情回显 / 复制预填）：保留已有勾选，仅剔除越界项；
 * - 用户主动选择或变更起运港 / 委托单位：按接口 `checked` 默认带出主流程服务项；
 * - 编辑态首次进入不覆盖详情已选项。
 */
async function loadCandidates() {
  if (!props.polId) {
    candidates.value = [];
    // 清空起运港时同步清空已选服务，避免无港仍挂着旧勾选
    if ((modelValue.value ?? []).length > 0) {
      modelValue.value = [];
    }
    return;
  }
  loading.value = true;
  try {
    const [options, polNodes] = await Promise.all([
      loadSeServiceTypeOptions(),
      getServiceTypesByPOL({
        polId: props.polId,
        clientId: props.clientId,
      } as any),
    ]);
    labelMap.value = buildServiceTypeLabelMap(options);
    processMap.value = buildServiceTypeProcessMap(options);
    candidates.value = (polNodes ?? [])
      .map((node) => {
        const serviceType = Number(node.serviceType);
        return {
          defaultChecked: node.checked === true,
          label: labelMap.value.get(serviceType) ?? `服务项${serviceType}`,
          serviceType,
          sortId: Number(node.sortId ?? 0),
        };
      })
      .filter((node) => isMainProcess(node.serviceType))
      .sort((a, b) => a.sortId - b.sortId || a.serviceType - b.serviceType);

    const allowed = new Set(candidates.value.map((item) => item.serviceType));
    const isInitial = !hasResolvedInitial.value;
    hasResolvedInitial.value = true;

    // 只读态或编辑态首次回显：始终保留详情已选项（仅主流程），绝不用默认值覆盖
    if (props.readonly || (isInitial && props.isEdit)) {
      keepAllowedChecked(allowed);
      return;
    }

    // 新建首轮且已有预填（复制场景）：保留预填项（剔除非主流程）
    if (isInitial && (modelValue.value ?? []).length > 0) {
      keepAllowedChecked(allowed);
      return;
    }

    // 新建首次选港 / 变更起运港或委托单位：按默认勾选带出主流程服务项
    applyDefaultChecked();
  } finally {
    loading.value = false;
  }
}

watch(
  () => [props.polId, props.clientId],
  () => {
    void loadCandidates();
  },
  { immediate: true },
);
</script>

<template>
  <div class="service-pipeline__title-wrap">
    <span class="service-pipeline__title">服务项目</span>
    <Tooltip v-if="props.polId && !props.readonly" title="配置服务">
      <Button
        type="text"
        size="small"
        class="service-pipeline__config-ellipsis"
        :disabled="loading"
        @click="openModal"
      >
        ...
      </Button>
    </Tooltip>
    <Spin
      :spinning="loading"
      class="service-pipeline-spin service-pipeline-spin--inline"
    >
      <div class="service-pipeline-body">
        <div class="service-pipeline service-pipeline--inline">
          <template v-if="props.polId">
            <div v-if="checkedNodes.length > 0" class="service-chevron-flow">
              <div
                v-for="(group, groupIndex) in checkedGroups"
                :key="group.sortId"
                class="service-chevron-flow__group"
              >
                <span
                  v-for="(node, nodeIndex) in group.nodes"
                  :key="node.serviceType"
                  class="service-chevron-flow__item"
                >
                  <Tooltip
                    v-if="compareTagOf(node.serviceType)"
                    placement="top"
                  >
                    <template #title>
                      {{ compareTagOf(node.serviceType)!.text }}
                    </template>
                    <div
                      class="chevron-step"
                      :class="[
                        `chevron-step--${nodeState(node.serviceType)}`,
                        {
                          'chevron-step--first': isFlowFirst(
                            groupIndex,
                            nodeIndex,
                          ),
                          'chevron-step--last': isFlowLast(
                            groupIndex,
                            nodeIndex,
                          ),
                        },
                      ]"
                    >
                      <div class="chevron-step__inner">
                        <IconifyIcon
                          :icon="nodeIcon(node.serviceType)"
                          class="chevron-step__icon"
                        />
                        <span class="chevron-step__label">
                          {{ node.label }}
                        </span>
                        <Tag
                          v-if="compareTagOf(node.serviceType)"
                          :color="compareTagOf(node.serviceType)!.color"
                          class="pre-order-service-compare-tag"
                        >
                          {{ compareTagOf(node.serviceType)!.text }}
                        </Tag>
                      </div>
                    </div>
                  </Tooltip>
                  <div
                    v-else
                    class="chevron-step"
                    :class="[
                      `chevron-step--${nodeState(node.serviceType)}`,
                      {
                        'chevron-step--first': isFlowFirst(
                          groupIndex,
                          nodeIndex,
                        ),
                        'chevron-step--last': isFlowLast(groupIndex, nodeIndex),
                      },
                    ]"
                  >
                    <div class="chevron-step__inner">
                      <IconifyIcon
                        :icon="nodeIcon(node.serviceType)"
                        class="chevron-step__icon"
                      />
                      <span class="chevron-step__label">{{ node.label }}</span>
                    </div>
                  </div>
                </span>
              </div>
            </div>
            <div v-else class="service-pipeline__empty-checked">
              <span class="service-pipeline__empty-checked-text">
                {{
                  candidates.length === 0 && !loading
                    ? '当前起运港未配置主流程服务项'
                    : '暂未配置服务节点'
                }}
              </span>
              <Button
                v-if="!props.readonly && candidates.length > 0"
                type="link"
                size="small"
                @click="openModal"
              >
                去配置
              </Button>
            </div>
          </template>
          <div v-else class="service-pipeline__state">
            <Empty
              :image="Empty.PRESENTED_IMAGE_SIMPLE"
              class="service-pipeline-empty service-pipeline-empty--compact"
              description="请先选择起运港"
            />
          </div>
        </div>
      </div>
    </Spin>

    <Modal
      v-model:open="modalOpen"
      title="配置服务项目"
      ok-text="确定"
      cancel-text="取消"
      width="520px"
      destroy-on-close
      @ok="handleModalConfirm"
    >
      <div class="service-type-modal__list">
        <div class="service-type-modal__group">
          <div class="service-type-modal__group-title">
            主流程
            <span class="service-type-modal__group-count">
              {{ candidates.length }}
            </span>
          </div>
          <div class="service-type-modal__group-items">
            <div
              v-for="item in candidates"
              :key="item.serviceType"
              class="service-type-modal__item"
            >
              <Checkbox
                :checked="isModalChecked(item.serviceType)"
                @change="handleModalDraftChange(item.serviceType, $event)"
              >
                <span class="service-type-modal__label">{{ item.label }}</span>
              </Checkbox>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  </div>
</template>

<style scoped src="../../sea-export-admin/basic-info-form/form.css"></style>
<style scoped>
.service-pipeline__title-wrap {
  display: flex;
  flex: 1;
  gap: 4px;
  align-items: center;
  min-width: 0;
}

.pre-order-service-compare-tag {
  margin-inline-start: 4px;
  font-size: 10px;
  line-height: 16px;
}
</style>
