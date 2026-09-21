<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Button, Empty, Spin, Tag } from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  ClientAdminApi,
  getClientAuditDetail,
} from '#/api/sea-export/client-admin';
import { $t } from '#/locales';
import { getClientStatusOptions } from '#/views/client/base/client-status';

import {
  getClientTaskStatusOptions,
  getClientTaskTypeLabel,
  getMyTaskStatusLabel,
} from '../data';
import ApprovalPath from './approval-path.vue';
import ClientModifyDiff from './client-modify-diff.vue';

defineOptions({ name: 'ClientReviewDetailModal' });

const { ClientTaskType } = ClientAdminApi;

const loading = ref(false);
const detail = ref<ClientAdminApi.ClientAuditDetailDto | null>(null);
/** 展开中的历史轮次 round 集合，当前轮默认展开 */
const expandedRounds = ref<number[]>([]);

const [Modal, modalApi] = useVbenModal({
  class: 'w-[1100px] client-review-detail-modal',
  async onOpenChange(isOpen) {
    if (!isOpen) {
      detail.value = null;
      expandedRounds.value = [];
      return;
    }
    const data = modalApi.getData<{ clientId?: string }>();
    if (!data?.clientId) return;
    loading.value = true;
    try {
      detail.value = await getClientAuditDetail(data.clientId);
      const current = detail.value?.histories?.find((item) => item.isCurrent);
      expandedRounds.value = current ? [current.round] : [];
    } finally {
      loading.value = false;
    }
  },
});

const client = computed(() => detail.value?.client ?? null);

const clientStatusTag = computed(() =>
  getClientStatusOptions().find(
    (item) => item.value === client.value?.clientStatus,
  ),
);

const taskStatusTag = (taskStatus?: null | number) =>
  getClientTaskStatusOptions().find((item) => item.value === taskStatus);

/** 历史按提交时间正序返回，展示时倒序更符合「最近的在上」的阅读习惯 */
const histories = computed(() =>
  [...(detail.value?.histories ?? [])].sort((a, b) => b.round - a.round),
);

const isModifyTask = (taskType?: null | number) =>
  taskType === ClientTaskType.ModifyClient;

const formatTime = (value?: null | string) => {
  if (!value) return '--';
  const date = dayjs(value);
  return date.isValid() ? date.format('YYYY-MM-DD HH:mm:ss') : '--';
};

const orgsText = computed(
  () =>
    (client.value?.orgs ?? [])
      .map((org) => org.name)
      .filter(Boolean)
      .join(' / ') || '--',
);

const isRoundExpanded = (round: number) => expandedRounds.value.includes(round);

const toggleRound = (round: number) => {
  const index = expandedRounds.value.indexOf(round);
  if (index === -1) {
    expandedRounds.value = [...expandedRounds.value, round];
  } else {
    expandedRounds.value = expandedRounds.value.filter((it) => it !== round);
  }
};
</script>

<template>
  <Modal title="客户审核详情">
    <Spin :spinning="loading">
      <div v-if="detail" class="client-detail">
        <!-- 客户摘要：一眼看清是谁、当前什么状态 -->
        <section class="summary-panel">
          <div class="summary-panel__hero">
            <div class="summary-panel__identity">
              <h3 class="summary-panel__name">{{ client?.name || '--' }}</h3>
              <span class="summary-panel__code">{{
                client?.code || '--'
              }}</span>
            </div>
            <div class="summary-panel__tags">
              <Tag v-if="clientStatusTag" :color="clientStatusTag.color">
                {{ clientStatusTag.label }}
              </Tag>
              <Tag
                v-if="taskStatusTag(detail.taskStatus)"
                :color="taskStatusTag(detail.taskStatus)?.color"
              >
                {{ getClientTaskTypeLabel(detail.taskType) }} ·
                {{ taskStatusTag(detail.taskStatus)?.label }}
              </Tag>
            </div>
          </div>

          <div class="summary-panel__grid">
            <div class="meta-cell">
              <span class="meta-cell__label">客户全称</span>
              <span class="meta-cell__value">{{
                client?.fullName || '--'
              }}</span>
            </div>
            <div class="meta-cell">
              <span class="meta-cell__label">客户英文名</span>
              <span class="meta-cell__value">{{ client?.enName || '--' }}</span>
            </div>
            <div class="meta-cell">
              <span class="meta-cell__label">归属组织</span>
              <span class="meta-cell__value">{{ orgsText }}</span>
            </div>
            <div class="meta-cell">
              <span class="meta-cell__label">我的审核状态</span>
              <span class="meta-cell__value">{{
                getMyTaskStatusLabel(detail.myTaskStatus)
              }}</span>
            </div>
            <div class="meta-cell meta-cell--wide">
              <span class="meta-cell__label">提交信息</span>
              <span class="meta-cell__value">
                {{ detail.submitUserName || '--' }}
                <span class="meta-cell__sep">·</span>
                {{ formatTime(detail.submitTime) }}
              </span>
            </div>
          </div>
        </section>

        <!-- 审批历史时间轴 -->
        <section class="history-panel">
          <div class="history-panel__head">
            <div class="history-panel__title-wrap">
              <span class="history-panel__accent" aria-hidden="true" />
              <span class="history-panel__title">审批历史</span>
            </div>
            <span class="history-panel__meta">
              共 {{ histories.length }} 轮 · 最新在上
            </span>
          </div>

          <Empty
            v-if="histories.length === 0"
            :image-style="{ height: '36px' }"
            description="暂无审批历史"
          />

          <div v-else class="timeline">
            <div
              v-for="round in histories"
              :key="round.round"
              class="timeline__item"
              :class="{
                'is-current': round.isCurrent,
                'is-open': isRoundExpanded(round.round),
              }"
            >
              <div class="timeline__rail" aria-hidden="true">
                <span class="timeline__dot">{{ round.round }}</span>
                <span class="timeline__line" />
              </div>

              <div class="timeline__card">
                <button
                  type="button"
                  class="timeline__header"
                  :aria-expanded="isRoundExpanded(round.round)"
                  @click="toggleRound(round.round)"
                >
                  <div class="timeline__header-main">
                    <span class="timeline__round-label"
                      >第 {{ round.round }} 轮</span
                    >
                    <Tag v-if="round.isCurrent" color="processing">当前轮</Tag>
                    <span class="timeline__type">{{
                      getClientTaskTypeLabel(round.taskType)
                    }}</span>
                    <Tag
                      v-if="taskStatusTag(round.taskStatus)"
                      :color="taskStatusTag(round.taskStatus)?.color"
                    >
                      {{ taskStatusTag(round.taskStatus)?.label }}
                    </Tag>
                  </div>
                  <div class="timeline__header-side">
                    <span class="timeline__submit">
                      {{ round.submitUserName || '--' }} ·
                      {{ formatTime(round.submitTime) }}
                    </span>
                    <span class="timeline__toggle">
                      <span class="timeline__toggle-text">{{
                        isRoundExpanded(round.round) ? '收起' : '展开'
                      }}</span>
                      <span
                        class="timeline__chevron"
                        :class="{
                          'is-open': isRoundExpanded(round.round),
                        }"
                        >▾</span
                      >
                    </span>
                  </div>
                </button>

                <Transition name="round-expand">
                  <div
                    v-show="isRoundExpanded(round.round)"
                    class="timeline__body"
                  >
                    <div class="round-facts">
                      <div class="meta-cell">
                        <span class="meta-cell__label">{{
                          $t('auditApproval.task.auditUserName')
                        }}</span>
                        <span class="meta-cell__value">
                          {{ round.auditUserName || '--' }}
                          <span class="meta-cell__sep">·</span>
                          {{ formatTime(round.auditTime) }}
                        </span>
                      </div>
                      <div class="meta-cell">
                        <span class="meta-cell__label">我在这一轮</span>
                        <span class="meta-cell__value">{{
                          getMyTaskStatusLabel(round.myTaskStatus)
                        }}</span>
                      </div>
                      <div class="meta-cell meta-cell--wide">
                        <span class="meta-cell__label">{{
                          $t('auditApproval.task.AuditRemark')
                        }}</span>
                        <span class="meta-cell__value">{{
                          round.remark || '--'
                        }}</span>
                      </div>
                      <div
                        v-if="isModifyTask(round.taskType)"
                        class="meta-cell meta-cell--wide"
                      >
                        <span class="meta-cell__label">申请修改原因</span>
                        <span class="meta-cell__value">{{
                          round.applyRemark || '--'
                        }}</span>
                      </div>
                    </div>

                    <div class="round-block">
                      <div class="round-block__title">审批路径</div>
                      <div class="round-block__content">
                        <ApprovalPath :instance="round.workFlowInstance" />
                      </div>
                    </div>

                    <div
                      v-if="isModifyTask(round.taskType)"
                      class="round-block"
                    >
                      <div class="round-block__title">这一轮的改动</div>
                      <div class="round-block__content">
                        <ClientModifyDiff
                          :from="round.modifyFrom"
                          :to="round.modifyTo"
                        />
                      </div>
                    </div>
                  </div>
                </Transition>
              </div>
            </div>
          </div>
        </section>
      </div>
      <Empty v-else-if="!loading" description="该客户没有审核任务" />
    </Spin>

    <template #footer>
      <Button type="primary" class="detail-close-btn" @click="modalApi.close()">
        {{ $t('common.close') }}
      </Button>
    </template>
  </Modal>
</template>

<style scoped>
@media (max-width: 900px) {
  .summary-panel__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .round-facts {
    grid-template-columns: 1fr;
  }
}

.client-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ---------- 客户摘要 ---------- */
.summary-panel {
  padding: 14px 16px 16px;
  background: linear-gradient(
    180deg,
    hsl(var(--primary) / 6%) 0%,
    hsl(var(--primary) / 2%) 100%
  );
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  box-shadow: 0 1px 2px hsl(var(--foreground) / 3%);
}

.summary-panel__hero {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  align-items: flex-start;
  justify-content: space-between;
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid hsl(var(--border));
}

.summary-panel__identity {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: baseline;
  min-width: 0;
}

.summary-panel__name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.35;
  color: hsl(var(--foreground));
  letter-spacing: 0.01em;
}

.summary-panel__code {
  font-size: 12px;
  font-weight: 500;
  color: hsl(var(--muted-foreground));
}

.summary-panel__tags {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.summary-panel__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px 20px;
}

/* ---------- 字段单元格：标签在上、内容在下，阅读更稳 ---------- */
.meta-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.meta-cell--wide {
  grid-column: 1 / -1;
}

.meta-cell__label {
  font-size: 11px;
  line-height: 1.3;
  color: hsl(var(--muted-foreground));
  letter-spacing: 0.02em;
}

.meta-cell__value {
  font-size: 13px;
  line-height: 1.45;
  color: hsl(var(--foreground) / 90%);
  overflow-wrap: anywhere;
}

.meta-cell__sep {
  margin: 0 4px;
  color: hsl(var(--muted-foreground) / 70%);
}

/* ---------- 审批历史面板 ---------- */
.history-panel {
  padding: 14px 16px 16px;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
}

.history-panel__head {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.history-panel__title-wrap {
  display: inline-flex;
  gap: 8px;
  align-items: center;
}

.history-panel__accent {
  width: 3px;
  height: 14px;
  background: hsl(var(--primary) / 70%);
  border-radius: 2px;
}

.history-panel__title {
  font-size: 13px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.history-panel__meta {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

/* ---------- 时间轴 ---------- */
.timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.timeline__item {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 10px;
}

.timeline__rail {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 10px;
}

.timeline__dot {
  z-index: 1;
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--background));
  border: 1.5px solid hsl(var(--border));
  border-radius: 50%;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.timeline__line {
  flex: 1;
  width: 1px;
  margin-top: 4px;
  background: hsl(var(--border));
}

.timeline__item:last-child .timeline__line {
  display: none;
}

.timeline__item.is-current .timeline__dot,
.timeline__item.is-open .timeline__dot {
  color: #fff;
  background: hsl(var(--primary));
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 3px hsl(var(--primary) / 14%);
}

.timeline__card {
  margin-bottom: 10px;
  overflow: hidden;
  background: hsl(var(--primary) / 2.5%);
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
}

.timeline__item.is-current .timeline__card {
  background: hsl(var(--primary) / 4%);
  border-color: hsl(var(--primary) / 24%);
  box-shadow: 0 1px 4px hsl(var(--primary) / 6%);
}

.timeline__item.is-open .timeline__card {
  border-color: hsl(var(--primary) / 20%);
}

.timeline__header {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  transition: background 0.18s ease;
}

.timeline__header:hover {
  background: hsl(var(--primary) / 6%);
}

.timeline__header:active {
  background: hsl(var(--primary) / 9%);
}

.timeline__header-main,
.timeline__header-side {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px 8px;
  align-items: center;
  min-width: 0;
}

.timeline__round-label {
  font-size: 13px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.timeline__type {
  font-size: 12px;
  color: hsl(var(--foreground) / 70%);
}

.timeline__submit {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
}

.timeline__toggle {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  margin-left: 4px;
  font-size: 12px;
  color: hsl(var(--primary));
}

.timeline__toggle-text {
  transition: opacity 0.15s ease;
}

.timeline__header:hover .timeline__toggle-text {
  opacity: 0.82;
}

.timeline__chevron {
  display: inline-block;
  font-size: 10px;
  line-height: 1;
  transition: transform 0.2s ease;
}

.timeline__chevron.is-open {
  transform: rotate(180deg);
}

.timeline__body {
  padding: 0 12px 12px;
  border-top: 1px solid hsl(var(--border));
}

.round-facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 16px;
  padding: 12px 0 4px;
}

.round-block {
  margin-top: 12px;
  overflow: hidden;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.round-block__title {
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  color: hsl(var(--foreground) / 82%);
  background: hsl(var(--primary) / 4%);
  border-bottom: 1px solid hsl(var(--border));
}

.round-block__content {
  padding: 10px 12px 12px;
}

.detail-close-btn {
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.detail-close-btn:hover {
  box-shadow: 0 2px 8px hsl(var(--primary) / 18%);
  transform: translateY(-1px);
}

.detail-close-btn:active {
  box-shadow: none;
  transform: translateY(0);
}

/* 展开过渡：高度感用 opacity + 轻微位移，避免硬切 */
.round-expand-enter-active,
.round-expand-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.round-expand-enter-from,
.round-expand-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
