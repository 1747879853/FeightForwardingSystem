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
  color: #94a3b8;
  background: #fff;
  border: 2px solid #d1d5db;
  border-radius: 50%;
}

.client-approval-path__line {
  position: absolute;
  top: 20px;
  bottom: 0;
  left: 9px;
  width: 1px;
  background: #d8dee7;
}

.client-approval-path__node:last-child .client-approval-path__line {
  display: none;
}

.client-approval-path__node--passed .client-approval-path__dot {
  color: #fff;
  background: #22c55e;
  border-color: #22c55e;
}

.client-approval-path__node--active .client-approval-path__dot {
  color: #fff;
  background: #3b82f6;
  border-color: #3b82f6;
}

.client-approval-path__node--rejected .client-approval-path__dot {
  color: #fff;
  background: #ef4444;
  border-color: #ef4444;
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
  color: #172033;
}

.client-approval-path__pass-method {
  padding: 1px 6px;
  font-size: 11px;
  line-height: 16px;
  color: #f59e0b;
  border: 1px solid currentcolor;
  border-radius: 4px;
}

.client-approval-path__detail {
  display: flex;
  gap: 4px;
  align-items: center;
  font-size: 11px;
  line-height: 18px;
  color: #94a3b8;
  white-space: nowrap;
}

.client-approval-path__detail .is-green {
  color: #22a06b;
}

.client-approval-path__detail .is-red {
  color: #dc2626;
}

.client-approval-path__detail .is-blue {
  color: #2563eb;
}

.client-approval-path__comment {
  font-size: 11px;
  line-height: 17px;
  color: #64748b;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
</style>
