<script lang="ts" setup>
import type { ClientAdminApi } from '#/api/sea-export/client-admin';

import { computed } from 'vue';

import { Empty } from 'ant-design-vue';
import dayjs from 'dayjs';

import { WorkFlowPassMethod } from '#/api/audit-approval/payment-review-admin';

defineOptions({ name: 'ClientApprovalPath' });

interface Props {
  /** 某一轮任务的工作流实例；工作流算不出审核人而直接通过时为 null */
  instance?: ClientAdminApi.ClientWorkFlowInstanceDto | null;
}

const props = withDefaults(defineProps<Props>(), { instance: null });

type LevelGroup = ClientAdminApi.ClientWorkFlowInstanceLevelGroupDto;

const levelGroups = computed<LevelGroup[]>(() => {
  const groups = props.instance?.levelGroup ?? [];
  return [...groups].sort((a, b) => a.level - b.level);
});

/** 或签下别人先审掉了就只显示真正审的那位，避免一堆「未轮到」噪音 */
const visibleItems = (group: LevelGroup) => {
  const items = group.itemList ?? [];
  if (group.passMethod !== WorkFlowPassMethod.Or) return items;
  const decided = items.filter((item) => item.taskStatus === 2);
  return decided.length > 0 ? decided : items;
};

const groupState = (group: LevelGroup) => {
  const items = visibleItems(group);
  if (items.some((item) => item.taskStatus === 1)) return 'rejected';
  if (
    items.length > 0 &&
    (group.passMethod === WorkFlowPassMethod.Or
      ? items.some((item) => item.taskStatus === 2)
      : items.every((item) => item.taskStatus === 2))
  ) {
    return 'passed';
  }
  if (items.some((item) => item.taskStatus === 0)) return 'active';
  return 'waiting';
};

const nodeMarker = (group: LevelGroup) => {
  const state = groupState(group);
  if (state === 'passed') return '✓';
  if (state === 'rejected') return '×';
  return String(group.level);
};

const passMethodLabel = (method?: number) => {
  if (method === WorkFlowPassMethod.Or) return '或签';
  if (method === WorkFlowPassMethod.And) return '会签';
  return '';
};

const itemStatusLabel = (taskStatus?: null | number, passMethod?: number) => {
  switch (taskStatus) {
    case 0: {
      return passMethod === WorkFlowPassMethod.Or ? '待处理' : '待审批';
    }
    case 1: {
      return '已驳回';
    }
    case 2: {
      return '已通过';
    }
    default: {
      return '未轮到';
    }
  }
};

const itemStatusClass = (taskStatus?: null | number) => {
  switch (taskStatus) {
    case 0: {
      return 'is-blue';
    }
    case 1: {
      return 'is-red';
    }
    case 2: {
      return 'is-green';
    }
    default: {
      return 'is-gray';
    }
  }
};

const formatTime = (value?: null | string) => {
  if (!value) return '';
  const date = dayjs(value);
  return date.isValid() ? date.format('YYYY-MM-DD HH:mm') : '';
};
</script>

<template>
  <div class="client-approval-path">
    <Empty
      v-if="levelGroups.length === 0"
      :image-style="{ height: '36px' }"
      description="无审批节点（工作流直接通过）"
    />
    <div
      v-for="group in levelGroups"
      v-else
      :key="group.level"
      class="client-approval-path__node"
      :class="`client-approval-path__node--${groupState(group)}`"
    >
      <span class="client-approval-path__dot">{{ nodeMarker(group) }}</span>
      <span class="client-approval-path__line"></span>
      <div class="min-w-0">
        <div class="client-approval-path__title-row">
          <span class="client-approval-path__title">
            第 {{ group.level }} 级审批
          </span>
          <span
            v-if="passMethodLabel(group.passMethod)"
            class="client-approval-path__pass-method"
          >
            {{ passMethodLabel(group.passMethod) }}
          </span>
        </div>
        <div
          v-for="item in visibleItems(group)"
          :key="item.id"
          class="client-approval-path__item"
        >
          <div class="client-approval-path__detail">
            <span>{{ item.userNickName || `用户 ${item.userId}` }}</span>
            <span :class="itemStatusClass(item.taskStatus)">
              {{ itemStatusLabel(item.taskStatus, group.passMethod) }}
            </span>
            <span v-if="item.auditTime"
              >· {{ formatTime(item.auditTime) }}</span
            >
          </div>
          <div v-if="item.comment" class="client-approval-path__comment">
            {{ item.taskStatus === 1 ? '驳回原因' : '审批意见' }}：{{
              item.comment
            }}
          </div>
          <div
            v-if="item.transfers && item.transfers.length > 0"
            class="client-approval-path__transfers"
          >
            <div
              v-for="(transfer, index) in item.transfers"
              :key="`${item.id}-${index}-${transfer.creationTime}`"
              class="client-approval-path__transfer"
            >
              {{ transfer.fromUserNickName || '—' }} 转交给
              {{ transfer.toUserNickName || '—' }}
              <span v-if="transfer.creationTime">
                {{ formatTime(transfer.creationTime) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.client-approval-path__node {
  position: relative;
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr);
  gap: 8px;
  min-height: 46px;
}

.client-approval-path__node:last-child {
  min-height: 24px;
}

.client-approval-path__dot {
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--background));
  border: 2px solid hsl(var(--border));
  border-radius: 50%;
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease;
}

.client-approval-path__line {
  position: absolute;
  top: 20px;
  bottom: 0;
  left: 9px;
  width: 1px;
  background: hsl(var(--border));
}

.client-approval-path__node:last-child .client-approval-path__line {
  display: none;
}

.client-approval-path__node--passed .client-approval-path__dot {
  color: #fff;
  background: hsl(142deg 45% 42%);
  border-color: hsl(142deg 45% 42%);
}

.client-approval-path__node--active .client-approval-path__dot {
  color: #fff;
  background: hsl(var(--primary));
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 3px hsl(var(--primary) / 16%);
}

.client-approval-path__node--rejected .client-approval-path__dot {
  color: #fff;
  background: hsl(0deg 62% 52%);
  border-color: hsl(0deg 62% 52%);
}

.client-approval-path__title-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.client-approval-path__title {
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
  color: hsl(var(--foreground));
}

.client-approval-path__pass-method {
  padding: 1px 6px;
  font-size: 11px;
  line-height: 16px;
  color: hsl(32deg 80% 42%);
  background: hsl(32deg 80% 42% / 8%);
  border: 1px solid hsl(32deg 80% 42% / 35%);
  border-radius: 4px;
}

.client-approval-path__item {
  padding: 2px 0;
  border-radius: 4px;
  transition: background 0.15s ease;
}

.client-approval-path__item:hover {
  background: hsl(var(--primary) / 5%);
}

.client-approval-path__detail {
  display: flex;
  gap: 4px;
  align-items: center;
  font-size: 11px;
  line-height: 18px;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

.client-approval-path__detail .is-green {
  color: hsl(142deg 45% 36%);
}

.client-approval-path__detail .is-red {
  color: hsl(0deg 62% 46%);
}

.client-approval-path__detail .is-blue {
  color: hsl(var(--primary));
}

.client-approval-path__comment {
  margin-top: 2px;
  font-size: 11px;
  line-height: 17px;
  color: hsl(var(--foreground) / 68%);
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.client-approval-path__transfers {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 6px;
  margin-top: 4px;
  background: hsl(var(--primary) / 4%);
  border-left: 2px solid hsl(var(--primary) / 35%);
  border-radius: 0 4px 4px 0;
}

.client-approval-path__transfer {
  font-size: 11px;
  line-height: 17px;
  color: hsl(var(--foreground) / 72%);
  overflow-wrap: anywhere;
}
</style>
