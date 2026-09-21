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
  class: 'w-[1100px]',
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
      <div v-if="detail" class="space-y-3">
        <!-- 客户信息：历史条目里的 client 恒为 null，客户信息只在主体上挂一份 -->
        <section class="detail-card">
          <div class="detail-card__title">
            <span class="text-sm font-semibold">
              {{ client?.name || '--' }}
            </span>
            <span class="text-xs text-gray-400">{{
              client?.code || '--'
            }}</span>
            <Tag v-if="clientStatusTag" :color="clientStatusTag.color">
              {{ clientStatusTag.label }}
            </Tag>
          </div>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-item__label">客户全称</span>
              <span class="detail-item__value">
                {{ client?.fullName || '--' }}
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">客户英文名</span>
              <span class="detail-item__value">
                {{ client?.enName || '--' }}
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">归属组织</span>
              <span class="detail-item__value">{{ orgsText }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">当前任务</span>
              <span class="detail-item__value">
                {{ getClientTaskTypeLabel(detail.taskType) }}
                <Tag
                  v-if="taskStatusTag(detail.taskStatus)"
                  :color="taskStatusTag(detail.taskStatus)?.color"
                >
                  {{ taskStatusTag(detail.taskStatus)?.label }}
                </Tag>
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">我的审核状态</span>
              <span class="detail-item__value">
                {{ getMyTaskStatusLabel(detail.myTaskStatus) }}
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">提交</span>
              <span class="detail-item__value">
                {{ detail.submitUserName || '--' }} ·
                {{ formatTime(detail.submitTime) }}
              </span>
            </div>
          </div>
        </section>

        <!-- 审批历史：每轮一段，申请修改的轮次可逐字段看出改了什么 -->
        <section class="detail-card">
          <div class="detail-card__title">
            <span class="text-sm font-semibold">审批历史</span>
            <span class="text-xs text-gray-400">
              共 {{ histories.length }} 轮，最新在上
            </span>
          </div>

          <Empty
            v-if="histories.length === 0"
            :image-style="{ height: '36px' }"
            description="暂无审批历史"
          />

          <div v-for="round in histories" :key="round.round" class="round">
            <div class="round__header" @click="toggleRound(round.round)">
              <span class="round__no">第 {{ round.round }} 轮</span>
              <Tag v-if="round.isCurrent" color="processing">当前轮</Tag>
              <span class="round__type">
                {{ getClientTaskTypeLabel(round.taskType) }}
              </span>
              <Tag
                v-if="taskStatusTag(round.taskStatus)"
                :color="taskStatusTag(round.taskStatus)?.color"
              >
                {{ taskStatusTag(round.taskStatus)?.label }}
              </Tag>
              <span class="round__meta">
                {{ round.submitUserName || '--' }} 提交于
                {{ formatTime(round.submitTime) }}
              </span>
              <span class="round__toggle">
                {{ expandedRounds.includes(round.round) ? '收起' : '展开' }}
              </span>
            </div>

            <div
              v-show="expandedRounds.includes(round.round)"
              class="round__body"
            >
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-item__label">
                    {{ $t('auditApproval.task.auditUserName') }}
                  </span>
                  <span class="detail-item__value">
                    {{ round.auditUserName || '--' }} ·
                    {{ formatTime(round.auditTime) }}
                  </span>
                </div>
                <div class="detail-item">
                  <span class="detail-item__label">
                    {{ $t('auditApproval.task.AuditRemark') }}
                  </span>
                  <span class="detail-item__value">
                    {{ round.remark || '--' }}
                  </span>
                </div>
                <div v-if="isModifyTask(round.taskType)" class="detail-item">
                  <span class="detail-item__label">申请修改原因</span>
                  <span class="detail-item__value">
                    {{ round.applyRemark || '--' }}
                  </span>
                </div>
                <div class="detail-item">
                  <span class="detail-item__label">我在这一轮</span>
                  <span class="detail-item__value">
                    {{ getMyTaskStatusLabel(round.myTaskStatus) }}
                  </span>
                </div>
              </div>

              <div class="round__section">
                <div class="round__section-title">审批路径</div>
                <ApprovalPath :instance="round.workFlowInstance" />
              </div>

              <div v-if="isModifyTask(round.taskType)" class="round__section">
                <div class="round__section-title">这一轮的改动</div>
                <ClientModifyDiff
                  :from="round.modifyFrom"
                  :to="round.modifyTo"
                />
              </div>
            </div>
          </div>
        </section>
      </div>
      <Empty v-else-if="!loading" description="该客户没有审核任务" />
    </Spin>

    <template #footer>
      <Button type="primary" @click="modalApi.close()">
        {{ $t('common.close') }}
      </Button>
    </template>
  </Modal>
</template>

<style scoped>
.detail-card {
  padding: 10px 12px;
  background: hsl(var(--primary) / 3%);
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.detail-card__title {
  display: flex;
  gap: 8px;
  align-items: center;
  padding-bottom: 8px;
  margin-bottom: 8px;
  border-bottom: 1px solid hsl(var(--border));
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px 16px;
}

.detail-item {
  display: flex;
  gap: 6px;
  min-width: 0;
  font-size: 12px;
}

.detail-item__label {
  flex: none;
  color: #8c95a3;
}

.detail-item__value {
  min-width: 0;
  color: #1f2937;
  overflow-wrap: anywhere;
}

.round {
  margin-top: 8px;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
}

.round__header {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding: 6px 10px;
  cursor: pointer;
  background: hsl(var(--primary) / 5%);
  border-radius: 6px 6px 0 0;
}

.round__no {
  font-size: 12px;
  font-weight: 600;
  color: #172033;
}

.round__type {
  font-size: 12px;
  color: #475569;
}

.round__meta {
  font-size: 11px;
  color: #94a3b8;
}

.round__toggle {
  margin-left: auto;
  font-size: 11px;
  color: hsl(var(--primary));
}

.round__body {
  padding: 8px 10px 10px;
}

.round__section {
  margin-top: 10px;
}

.round__section-title {
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #172033;
}
</style>
