<script lang="ts" setup>
import { ref, watch } from 'vue';
import { useVbenModal } from '@vben/common-ui';
import { $t } from '#/locales';
import type { ExpenseSubmissionAdminApi } from '#/api/audit-approval/expense-admin';
import { Tag, Timeline, TimelineItem } from 'ant-design-vue';
import dayjs from 'dayjs';

import { getTaskStatusOptions } from '#/views/sea-export-admin/orderFee/data.ts';

// 模态框
const [Modal, modalApi] = useVbenModal({
  class: 'w-[800px]',
  title: $t('seaExport.export.orderFee.auditHistory'),
  footer: false,
});

// 审核任务列表 - 使用 ref 而非 computed
const auditTasks = ref<ExpenseSubmissionAdminApi.TaskItemDto[]>([]);

// 使用 useStore 监听模态框状态变化
const isOpen = modalApi.useStore((state) => state.isOpen);

// 监听模态框打开事件，获取最新数据
watch(isOpen, (isOpenValue) => {
  if (isOpenValue) {
    const feeData = modalApi.getData<any>();
    console.log('auditTasks - feeData:', feeData);

    if (!feeData) {
      auditTasks.value = [];
      return;
    }

    const tasks: ExpenseSubmissionAdminApi.TaskItemDto[] = [];

    // 收集所有类型的审核任务
    if (feeData.submitOrderFeeTasks?.length) {
      tasks.push(...feeData.submitOrderFeeTasks);
    }
    if (feeData.modifyOrderFeeTasks?.length) {
      tasks.push(...feeData.modifyOrderFeeTasks);
    }
    if (feeData.deleteOrderFeeTasks?.length) {
      tasks.push(...feeData.deleteOrderFeeTasks);
    }

    // 根据auditTime倒序排列
    auditTasks.value = tasks
      .filter((task) => task.auditTime) // 只保留有审核时间的记录
      .sort((a, b) => {
        const timeA = dayjs(a.auditTime).valueOf();
        const timeB = dayjs(b.auditTime).valueOf();
        return timeB - timeA; // 倒序
      });
  } else {
    // 关闭时清空数据
    auditTasks.value = [];
  }
});

// 获取任务类型标签
const getTaskTypeTag = (taskType?: number) => {
  const typeMap: Record<number, { text: string; color: string }> = {
    0: {
      text: $t('auditApproval.task.typeOptions.SubmitOrderFee'),
      color: 'blue',
    },
    1: {
      text: $t('auditApproval.task.typeOptions.ModifyOrderFee'),
      color: 'orange',
    },
    2: {
      text: $t('auditApproval.task.typeOptions.DeleteOrderFee'),
      color: 'red',
    },
  };
  return taskType !== undefined ? typeMap[taskType] : null;
};

// 获取任务状态文本
const getTaskStatusText = (taskStatus?: number) => {
  const statusOption = getTaskStatusOptions().find(
    (item) => item.value === taskStatus,
  );
  return statusOption ? statusOption.label || '' : '';
};

// 暴露方法供父组件调用
defineExpose({
  modalApi,
});
</script>

<template>
  <Modal>
    <div class="audit-history-container">
      <div v-if="auditTasks.length === 0" class="empty-state">
        {{ $t('common.noData') }}
      </div>
      <Timeline v-else class="audit-timeline">
        <TimelineItem
          v-for="(task, index) in auditTasks"
          :key="index"
          :color="getTaskTypeTag(task.taskType)?.color || 'gray'"
        >
          <template #dot>
            <div class="timeline-dot" />
          </template>
          <div class="audit-item">
            <!-- 第一行：核心信息 -->
            <div class="audit-header">
              <span class="audit-user">{{ task.auditUserName || '-' }}</span>
              <span class="audit-time">
                {{
                  task.auditTime
                    ? dayjs(task.auditTime).format('YYYY-MM-DD HH:mm:ss')
                    : '-'
                }}
              </span>
              <Tag
                v-if="getTaskTypeTag(task.taskType)"
                :color="getTaskTypeTag(task.taskType)?.color"
              >
                {{ getTaskTypeTag(task.taskType)?.text }}
              </Tag>
              <Tag
                :color="
                  task.taskStatus === 1
                    ? 'error'
                    : task.taskStatus === 2
                      ? 'success'
                      : 'default'
                "
              >
                {{ getTaskStatusText(task.taskStatus) }}
              </Tag>
            </div>
            <!-- 第二行：审核意见 -->
            <div v-if="task.remark" class="audit-remark">
              {{ task.remark }}
            </div>
          </div>
        </TimelineItem>
      </Timeline>
    </div>
  </Modal>
</template>

<style scoped lang="scss">
.audit-history-container {
  max-height: 600px;
  padding: 16px 10px;
  overflow-y: auto;
}

.empty-state {
  padding: 40px 0;
  color: #999;
  text-align: center;
}

.audit-timeline {
  :deep(.ant-timeline-item-content) {
    padding-left: 32px;
  }
}

.timeline-dot {
  width: 12px;
  height: 12px;
  background-color: currentcolor;
  border-radius: 50%;
}

.audit-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.audit-header {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;

  .audit-user {
    font-size: 14px;
    font-weight: 600;
    color: #262626;
  }

  .audit-time {
    font-size: 13px;
    color: #8c8c8c;
  }
}

.audit-remark {
  padding: 8px 12px;
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.6;
  color: #595959;
  background-color: #fafafa;
  border-radius: 4px;
}
</style>
