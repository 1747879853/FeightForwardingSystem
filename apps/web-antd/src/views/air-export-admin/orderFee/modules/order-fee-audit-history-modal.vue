<script lang="ts" setup>
import { ref, watch } from 'vue';
import { useVbenModal } from '@vben/common-ui';
import { $t } from '#/locales';
import type { ExpenseSubmissionAdminApi } from '#/api/audit-approval/expense-admin';
import { Tag, Timeline, TimelineItem, Table } from 'ant-design-vue';
import dayjs from 'dayjs';

import { getTaskStatusOptions } from '#/views/sea-export-admin/orderFee/data.js';

// 模态框
const [Modal, modalApi] = useVbenModal({
  class: 'w-[800px]',
  title: $t('seaExport.export.orderFee.auditHistory'),
  footer: false,
});

// 审核任务列表 - 使用 ref 而非 computed
const auditTasks = ref<ExpenseSubmissionAdminApi.TaskItemDto[]>([]);

// 当前费用数据（用于待审核的修改任务对比）
const currentFeeData = ref<any>(null);

// 获取指定任务之前的上一条修改任务的 info
const getPreviousModifyTaskInfo = (
  currentTask: ExpenseSubmissionAdminApi.TaskItemDto,
): string | null => {
  if (!currentTask.auditTime) {
    return null; // 待审核任务没有上一条
  }

  // 找到所有在当前任务之前完成的修改任务（taskType === 1）
  const previousModifyTasks = auditTasks.value.filter(
    (task) =>
      task.taskType === 1 &&
      task.auditTime &&
      dayjs(task.auditTime).valueOf() < dayjs(currentTask.auditTime).valueOf(),
  );

  // 按审核时间倒序排列，取第一个（最近的）
  if (previousModifyTasks.length > 0) {
    previousModifyTasks.sort(
      (a, b) => dayjs(b.auditTime!).valueOf() - dayjs(a.auditTime!).valueOf(),
    );
    const firstTask = previousModifyTasks[0];
    return firstTask?.info || null;
  }

  return null;
};

// 使用 useStore 监听模态框状态变化
const isOpen = modalApi.useStore((state) => state.isOpen);

// 监听模态框打开事件，获取最新数据
watch(isOpen, (isOpenValue) => {
  if (isOpenValue) {
    const feeData = modalApi.getData<any>();
    console.log('审核历史 - 原始数据:', feeData);

    if (!feeData) {
      auditTasks.value = [];
      currentFeeData.value = null;
      return;
    }

    // 保存当前费用数据，用于待审核修改任务的对比
    currentFeeData.value = feeData;

    const allTasks: ExpenseSubmissionAdminApi.TaskItemDto[] = [];

    // 收集所有类型的审核任务（每次审核操作都是一条独立记录）
    if (feeData.submitOrderFeeTasks?.length) {
      console.log('提交费用审核任务:', feeData.submitOrderFeeTasks);
      allTasks.push(...feeData.submitOrderFeeTasks);
    }
    if (feeData.modifyOrderFeeTasks?.length) {
      console.log('修改费用审核任务:', feeData.modifyOrderFeeTasks);
      allTasks.push(...feeData.modifyOrderFeeTasks);
    }
    if (feeData.deleteOrderFeeTasks?.length) {
      console.log('删除费用审核任务:', feeData.deleteOrderFeeTasks);
      allTasks.push(...feeData.deleteOrderFeeTasks);
    }

    console.log('所有审核任务数量:', allTasks.length);
    console.log('所有审核任务详情:', allTasks);

    // 不再过滤，显示所有任务（包括待审核、已通过、已驳回）
    // 这样用户在未审核完成之前也能查看本次申请修改的原值及修改值
    const displayTasks = allTasks;

    console.log('显示的任务数量:', displayTasks.length);

    // 排序逻辑：
    // 1. 有审核时间的按审核时间倒序（最新的在前）
    // 2. 没有审核时间的（待审核）排在最前面，并按创建时间倒序
    auditTasks.value = displayTasks.sort((a, b) => {
      const hasAuditTimeA = !!a.auditTime;
      const hasAuditTimeB = !!b.auditTime;

      // 如果一个有审核时间，一个没有
      if (hasAuditTimeA !== hasAuditTimeB) {
        // 没有审核时间的（待审核）排在前面
        return hasAuditTimeA ? 1 : -1;
      }

      // 如果都有审核时间，按审核时间倒序
      if (hasAuditTimeA && hasAuditTimeB) {
        const timeA = dayjs(a.auditTime).valueOf();
        const timeB = dayjs(b.auditTime).valueOf();
        return timeB - timeA;
      }

      // 如果都没有审核时间，按创建时间倒序（最新的在前）
      const createTimeA = a.creationTime ? dayjs(a.creationTime).valueOf() : 0;
      const createTimeB = b.creationTime ? dayjs(b.creationTime).valueOf() : 0;
      return createTimeB - createTimeA;
    });

    console.log('最终显示的审核历史记录:', auditTasks.value);
  } else {
    // 关闭时清空数据
    auditTasks.value = [];
    currentFeeData.value = null;
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

// 解析JSON并对比字段差异
const parseAndCompareFields = (
  originalInfo: string | null | undefined,
  info: string | null | undefined,
  currentFeeData?: any, // 当前费用数据，用于待审核的修改任务
  previousTaskInfo?: string | null, // 上一条任务的 info，用于驳回任务
) => {
  let original: any;
  let modified: any;

  // 场景1：驳回任务（taskStatus === 1），使用上一条修改任务的 info 作为"修改前"
  if (previousTaskInfo && info) {
    console.log('=== 驳回任务 - 使用上一条任务的 info 作为修改前 ===');
    try {
      original = JSON.parse(previousTaskInfo);
      modified = JSON.parse(info);
    } catch (error) {
      console.error('解析驳回任务数据失败:', error);
      return [];
    }
  }
  // 场景2：待审核的修改任务（没有 originalInfo 和 auditTime）
  else if (currentFeeData && !originalInfo && info) {
    console.log('=== 待审核修改任务 - 使用当前费用作为修改前 ===');
    original = currentFeeData;
    try {
      modified = JSON.parse(info);
    } catch (error) {
      console.error('解析修改后数据失败:', error);
      return [];
    }
  }
  // 场景3：正常的已审核修改任务
  else if (originalInfo && info) {
    console.log('=== 正常修改任务 - 使用 originalInfo 和 info ===');
    try {
      original = JSON.parse(originalInfo);
      modified = JSON.parse(info);
    } catch (error) {
      console.error('解析修改记录失败:', error);
      return [];
    }
  }
  // 场景4：数据不完整
  else {
    console.warn('费用修改记录数据不完整:', {
      originalInfo,
      info,
      currentFeeData,
      previousTaskInfo,
    });
    return [];
  }

  console.log('=== 费用字段对比调试 ===');
  console.log('修改前数据 (original):', original);
  console.log('修改后数据 (modified):', modified);

  // 需要对比的字段列表（排除一些不需要展示的字段）
  const excludeFields = [
    // 系统字段
    'id',
    'transportOrderId',
    'creationTime',
    'lastModificationTime',
    'creatorUserId',
    'lastModifierUserId',
    'isDeleted',
    'deleterUserId',
    'deletionTime',
    'creatorUserName', // 创建人用户名
    'dataEntryMethod', // 数据录入方式
    'InvoiceBlocked',
    'settledPrice',
    'thisSettledPrice',
    'taxRate',
    'statements',
    'isStatemented',

    // 状态字段
    'feeStatus', // 费用状态
    'settlementStatus', // 结算状态
    'invoiceStatus', // 开票状态

    // ID类字段（包括各种大小写变体）
    'feeCodeId',
    'FeeCodeId',
    'FEECODEID',
    'currencyId',
    'CurrencyId',
    'CURRENCYID',

    // 金额相关字段
    'invoicedAmount', // 已开票金额
    'orderInvoiceAmount', // 发票申请金额
    'settledAmount', // 已结算金额
    'thisSettledAmount', // 本结算金额
    'rqstPaymentAmount', // 付费申请金额
    'unRqstPaymentAmount', // 未申请金额
    'unSettledAmount', // 未结算金额
    'unInvoicedAmount', // 未开票金额

    'amount',
    'unitPrice',
    'noTaxAmount',
    'noTaxUnitPrice',
    'IsConfidential', // 是否机密
    'quantity',
    'Unit',
    'UnitPrice',
    'statementId',
    'settlementCode',
    'statement',
    'combinedFeeStatus',

    'Settlement',
    'FeeCode',
    'feeCodeId',
    'Currency',
    'localCurrencyId',
    'localCurrency',
    'currencyId',
    'SettlementId',

    // 其他字段（包括各种大小写变体）
    'localCurrencyCode', // 本位币代码
    'Remark',
    'ExchangeRate',
    'CurrencyCode',
    'FeeCodeCode',
    'invoices',

    'industryCategory',
    'IndustryCategory',
    'INDUSTRYCATEGORY',

    // 关联对象和数组字段
    'transportOrder', // 运输订单
    'submitOrderFeeTasks', // 提交费用任务
    'modifyOrderFeeTasks', // 修改费用任务
    'deleteOrderFeeTasks', // 删除费用任务
    'userId', // 用户ID
    'orgId', // 归属组织ID
    'orgs', // 组织串

    'settlementId',
    'taskStatus',
    'ModificationCount',
    '_settlementName',
    'rowKey',
    'feeCodeId_value',
    'industryCategory_value',
    'currencyid_value',
    'unit_value',
    'settlementId_value',
    'feeCodeId_label_converted',
    '__settlementName',
    '_rowKey',
    'currencyId_value',
    'industryCategory_label_converted',
    'currencyId_label_converted',
    'unit_label_converted',
    'settlementId_label_converted',
  ];

  const changes: Array<{
    field: string;
    label: string;
    before: any;
    after: any;
  }> = [];

  // 字段映射（英文字段名 -> 中文标签）
  const fieldLabels: Record<string, string> = {
    paySide: '收付类型',
    feeStatus: '费用状态',
    invoiceStatus: '开票状态',
    settlementStatus: '结算状态',
    feeCode: '费用代码',
    feeCodeName: '费用名称',
    industryCategory: '行业类别',
    industryCategories: '行业类别字母',
    settlement: '结算对象',
    settlementName: '结算对象名称',
    currency: '币别',
    currencyName: '币别名称',
    exchangeRate: '汇率',
    UnitPrice: '含税单价',
    Amount: '金额',
    unit: '单位',
    Quantity: '数量',
    TaxRate: '税率',
    NoTaxUnitPrice: '不含税单价',
    NoTaxAmount: '不含税金额',
    RqstPaymentAmount: '付费申请金额',
    InvoicedAmount: '已开票金额',
    OrderInvoiceAmount: '发票申请金额',
    SettledAmount: '已结算金额',
    unRqstPaymentAmount: '未申请金额',
    unSettledAmount: '未结算金额',
    unInvoicedAmount: '未开票金额',
    invoiceBlocked: '不允许开票',
    isConfidential: '是否机密',
    dataEntryMethod: '数据录入方式',
    remark: '备注',
    localCurrencyCode: '本位币代码',
    feeCodeCode: '费用代码编码',
    currencyCode: '币别代码',
  };

  // 创建反向映射（中文标签 -> 英文字段名），用于统一字段名
  const reverseFieldLabels: Record<string, string> = {};
  Object.entries(fieldLabels).forEach(([engKey, cnLabel]) => {
    reverseFieldLabels[cnLabel] = engKey;
  });

  // 标准化字段名的函数：将中文字段名转换为英文字段名
  const normalizeFieldName = (fieldName: string): string => {
    // 如果已经是英文字段名，直接返回
    if (fieldLabels[fieldName]) {
      return fieldName;
    }
    // 如果是中文字段名，转换为英文字段名
    if (reverseFieldLabels[fieldName]) {
      return reverseFieldLabels[fieldName];
    }
    // 否则返回原字段名
    return fieldName;
  };

  // 获取字段值的辅助函数：尝试多种可能的字段名
  const getFieldValue = (data: any, normalizedKey: string): any => {
    // 1. 先尝试使用标准化后的英文字段名
    if (normalizedKey in data) {
      return data[normalizedKey];
    }

    // 2. 尝试使用原始大小写变体（如 SettlementName, settlementName）
    for (const key of Object.keys(data)) {
      if (key.toLowerCase() === normalizedKey.toLowerCase()) {
        return data[key];
      }
    }

    // 3. 尝试使用中文字段名
    const cnLabel = fieldLabels[normalizedKey];
    if (cnLabel && cnLabel in data) {
      return data[cnLabel];
    }

    // 4. 返回 undefined
    return undefined;
  };

  // 合并所有需要检查的字段（包括修改前和修改后的所有字段）
  const allFields = new Set([
    ...Object.keys(original).filter((key) => !excludeFields.includes(key)),
    ...Object.keys(modified).filter((key) => !excludeFields.includes(key)),
  ]);

  console.log('需要对比的所有字段:', Array.from(allFields));

  // 遍历所有字段，找出变化的
  allFields.forEach((key) => {
    // 标准化字段名，确保中英文都能正确匹配
    const normalizedKey = normalizeFieldName(key);

    // 使用辅助函数获取值，尝试多种可能的字段名
    let before = getFieldValue(original, normalizedKey);
    let after = getFieldValue(modified, normalizedKey);

    // 如果值不同，则记录变化
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      before =
        JSON.stringify(before) === 'true'
          ? '是'
          : JSON.stringify(before) === 'false'
            ? '否'
            : before;
      after =
        JSON.stringify(after) === 'true'
          ? '是'
          : JSON.stringify(after) === 'false'
            ? '否'
            : after;
      before = before === null ? '-' : before;
      after = after === null ? '-' : after;

      if (normalizedKey === 'feeCode') {
        before = before.CnName ?? before.cnName;
        after = after.cnName;
      }
      if (normalizedKey === 'currency') {
        before = before.Code ?? before.code;
        after = after.code;
      }
      if (normalizedKey === 'settlement') {
        before = before.Name || before.name;
        after = after.name;
      }
      changes.push({
        field: normalizedKey,
        label: fieldLabels[normalizedKey] || normalizedKey, // 统一使用中文标签
        before: before ?? '-',
        after: after ?? '-',
      });
    }
  });

  console.log('检测到的字段变化数量:', changes.length);
  console.log('变化的字段详情:', changes);
  console.log('========================');

  return changes;
};

// 获取修改记录的表格列定义
const getModifyColumns = () => {
  return [
    {
      title: '字段名称',
      dataIndex: 'label',
      key: 'label',
      width: 150,
    },
    {
      title: '修改前',
      dataIndex: 'before',
      key: 'before',
      width: 200,
    },
    {
      title: '修改后',
      dataIndex: 'after',
      key: 'after',
      width: 200,
    },
  ];
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
            <div
              class="timeline-dot"
              :class="{
                'status-rejected': task.taskStatus === 1,
                'status-approved': task.taskStatus === 2,
                'status-pending': !task.auditTime,
              }"
            />
          </template>
          <div class="audit-item">
            <!-- 第一行：核心信息 -->
            <div class="audit-header">
              <!-- 操作人员 -->
              <span
                class="audit-user"
                :title="`审核人: ${task.auditUserName || '-'}`"
              >
                <i class="i-carbon-user" />
                审核人: {{ task.auditUserName || '-' }}
              </span>

              <!-- 审核时间 -->
              <span
                class="audit-time"
                :title="`审核时间: ${task.auditTime ? dayjs(task.auditTime).format('YYYY-MM-DD HH:mm:ss') : '-'}`"
              >
                <i class="i-carbon-calendar" />
                审核时间:
                {{
                  task.auditTime
                    ? dayjs(task.auditTime).format('YYYY-MM-DD HH:mm:ss')
                    : '-'
                }}
              </span>

              <!-- 任务类型标签 -->
              <Tag
                v-if="getTaskTypeTag(task.taskType)"
                :color="getTaskTypeTag(task.taskType)?.color"
                class="task-type-tag"
              >
                {{ getTaskTypeTag(task.taskType)?.text }}
              </Tag>

              <!-- 审核状态标签（通过/驳回） -->
              <Tag
                :color="
                  task.taskStatus === 1
                    ? 'error'
                    : task.taskStatus === 2
                      ? 'success'
                      : 'default'
                "
                class="task-status-tag"
              >
                <i
                  :class="
                    task.taskStatus === 2
                      ? 'i-carbon-checkmark'
                      : task.taskStatus === 1
                        ? 'i-carbon-close'
                        : ''
                  "
                />
                {{ getTaskStatusText(task.taskStatus) }}
              </Tag>
            </div>

            <!-- 第二行：创建时间和提交人信息 -->
            <div class="audit-meta-info">
              <!-- 创建时间 -->
              <span
                class="meta-item create-time"
                :title="`创建时间: ${task.creationTime ? dayjs(task.creationTime).format('YYYY-MM-DD HH:mm:ss') : '-'}`"
              >
                <i class="i-carbon-time" />
                创建时间:
                {{
                  task.creationTime
                    ? dayjs(task.creationTime).format('YYYY-MM-DD HH:mm:ss')
                    : '-'
                }}
              </span>

              <!-- 提交人 -->
              <span v-if="task.creatorUserName" class="meta-item submitter">
                <i class="i-carbon-user-avatar" />
                提交人: {{ task.creatorUserName }}
              </span>
            </div>

            <!-- 第三行：审核意见 -->
            <div v-if="task.remark" class="audit-remark">
              <div class="remark-label">审核意见:</div>
              <div class="remark-content">{{ task.remark }}</div>
            </div>

            <!-- 第四行：修改记录对比（费用修改类型显示） -->
            <div
              v-if="task.taskType === 1 && task.info"
              class="modify-record-section"
            >
              <!-- 标题区域 -->
              <div class="modify-record-header">
                <div class="header-left">
                  <i class="i-carbon-compare header-icon" />
                  <span class="header-title">费用修改详情</span>
                  <Tag v-if="!task.auditTime" color="warning" class="ml-2">
                    待审核
                  </Tag>
                </div>
                <div class="header-badges">
                  <span class="badge badge-before">
                    <i class="i-carbon-arrow-left" />
                    修改前
                  </span>
                  <i class="i-carbon-arrow-right arrow-icon" />
                  <span class="badge badge-after">
                    修改后
                    <i class="i-carbon-arrow-right" />
                  </span>
                </div>
              </div>

              <!-- 对比表格 -->
              <div class="table-wrapper">
                <Table
                  :columns="getModifyColumns()"
                  :data-source="
                    parseAndCompareFields(
                      task.originalInfo,
                      task.info,
                      !task.auditTime ? currentFeeData : null,
                      task.taskStatus === 1
                        ? getPreviousModifyTaskInfo(task)
                        : null,
                    )
                  "
                  :pagination="false"
                  size="middle"
                  bordered
                  class="modify-record-table"
                >
                  <template #bodyCell="{ column, record }">
                    <template v-if="column.key === 'before'">
                      <div class="cell-before">
                        <i class="i-carbon-subtract cell-icon" />
                        <span class="cell-value">{{ record.before }}</span>
                      </div>
                    </template>
                    <template v-else-if="column.key === 'after'">
                      <div class="cell-after">
                        <i class="i-carbon-add cell-icon" />
                        <span class="cell-value">{{ record.after }}</span>
                      </div>
                    </template>
                  </template>
                </Table>
              </div>
            </div>
          </div>
        </TimelineItem>
      </Timeline>
    </div>
  </Modal>
</template>

<style scoped lang="scss">
// 动画效果
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.6;
  }
}

@keyframes slide-right {
  0%,
  100% {
    transform: translateX(0);
  }

  50% {
    transform: translateX(3px);
  }
}

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
  transition: all 0.3s ease;

  // 审核驳回 - 红色
  &.status-rejected {
    background: linear-gradient(135deg, #ff7875 0%, #ff4d4f 100%);
    box-shadow: 0 0 0 2px rgb(255 77 79 / 20%);
  }

  // 审核通过 - 绿色
  &.status-approved {
    background: linear-gradient(135deg, #73d13d 0%, #52c41a 100%);
    box-shadow: 0 0 0 2px rgb(82 196 26 / 20%);
  }

  // 待审核 - 橙色
  &.status-pending {
    background: linear-gradient(135deg, #ffc53d 0%, #faad14 100%);
    box-shadow: 0 0 0 2px rgb(250 173 20 / 20%);
  }
}

.audit-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }
}

.audit-header {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;

  .audit-user {
    display: inline-flex;
    gap: 4px;
    align-items: center;
    font-size: 14px;
    font-weight: 600;
    color: #262626;

    i {
      font-size: 16px;
      color: #1890ff;
    }
  }

  .audit-time {
    display: inline-flex;
    gap: 4px;
    align-items: center;
    font-size: 13px;
    color: #8c8c8c;

    i {
      font-size: 14px;
      color: #595959;
    }

    &.audit-create-time {
      color: #595959;

      i {
        color: #faad14;
      }
    }
  }

  .task-type-tag {
    margin: 0;
  }

  .task-status-tag {
    display: inline-flex;
    gap: 4px;
    align-items: center;
    margin: 0;

    i {
      font-size: 14px;
    }
  }
}

.audit-meta-info {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  padding: 6px 0;

  .meta-item {
    display: inline-flex;
    gap: 4px;
    align-items: center;
    font-size: 13px;
    color: #595959;

    i {
      font-size: 14px;
    }

    &.create-time {
      i {
        color: #faad14;
      }
    }

    &.submitter {
      i {
        color: #1890ff;
      }
    }
  }
}

.audit-remark {
  padding: 10px 12px;
  margin-top: 4px;
  background-color: #fafafa;
  border-left: 3px solid #1890ff;
  border-radius: 4px;

  .remark-label {
    margin-bottom: 4px;
    font-size: 12px;
    font-weight: 500;
    color: #8c8c8c;
  }

  .remark-content {
    font-size: 13px;
    line-height: 1.6;
    color: #595959;
  }
}

.modify-record-section {
  margin-top: 12px;
  overflow: hidden;
  background: linear-gradient(135deg, #f8f9fa 0%, #fff 100%);
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 4%);
}

.modify-record-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: linear-gradient(135deg, #e6f7ff 0%, #f0f9ff 100%);
  border-bottom: 2px solid #bae7ff;

  .header-left {
    display: flex;
    gap: 8px;
    align-items: center;

    .header-icon {
      font-size: 18px;
      color: #1890ff;
      animation: pulse 2s ease-in-out infinite;
    }

    .header-title {
      font-size: 14px;
      font-weight: 700;
      color: #262626;
      letter-spacing: 0.5px;
    }
  }

  .header-badges {
    display: flex;
    gap: 8px;
    align-items: center;

    .badge {
      display: inline-flex;
      gap: 4px;
      align-items: center;
      padding: 4px 12px;
      font-size: 12px;
      font-weight: 600;
      color: #fff;
      border-radius: 12px;
      box-shadow: 0 2px 4px rgb(0 0 0 / 10%);
      transition: all 0.3s ease;

      &:hover {
        box-shadow: 0 3px 6px rgb(0 0 0 / 15%);
        transform: translateY(-1px);
      }

      &.badge-before {
        background: linear-gradient(135deg, #ff7875 0%, #ff4d4f 100%);

        i {
          font-size: 12px;
        }
      }

      &.badge-after {
        background: linear-gradient(135deg, #73d13d 0%, #52c41a 100%);

        i {
          font-size: 12px;
        }
      }
    }

    .arrow-icon {
      font-size: 16px;
      color: #1890ff;
      animation: slide-right 1.5s ease-in-out infinite;
    }
  }
}

.table-wrapper {
  width: 100%;
  padding: 12px;
  background-color: #fff;
}

.modify-record-table {
  :deep(.ant-table) {
    font-size: 13px;
    border-radius: 6px;
  }

  :deep(.ant-table-thead > tr > th) {
    padding: 12px 8px;
    font-weight: 700;
    color: #262626;
    background: linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%);
    border-bottom: 2px solid #d9d9d9;
  }

  :deep(.ant-table-tbody > tr > td) {
    padding: 10px 8px;
    transition: all 0.3s ease;
  }

  :deep(.ant-table-tbody > tr:hover > td) {
    background-color: #f5f5f5;
  }

  .cell-before {
    display: flex;
    gap: 6px;
    align-items: center;
    padding: 4px 8px;
    background: linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%);
    border-left: 3px solid #ff4d4f;
    border-radius: 4px;

    .cell-icon {
      flex-shrink: 0;
      font-size: 14px;
      color: #ff4d4f;
    }

    .cell-value {
      font-size: 13px;
      font-weight: 500;
      color: #cf1322;
      word-break: break-all;
    }
  }

  .cell-after {
    display: flex;
    gap: 6px;
    align-items: center;
    padding: 4px 8px;
    background: linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%);
    border-left: 3px solid #52c41a;
    border-radius: 4px;

    .cell-icon {
      flex-shrink: 0;
      font-size: 14px;
      color: #52c41a;
    }

    .cell-value {
      font-size: 13px;
      font-weight: 600;
      color: #389e0d;
      word-break: break-all;
    }
  }
}
</style>
