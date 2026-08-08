<script lang="ts" setup>
import { ref, watch } from 'vue';
import { useVbenModal } from '@vben/common-ui';
import { $t } from '#/locales';
import type { ExpenseSubmissionAdminApi } from '#/api/audit-approval/expense-admin';
import { Tag, Timeline, TimelineItem, Table } from 'ant-design-vue';
import dayjs from 'dayjs';

import { getTaskStatusOptions } from '#/views/sea-export-admin/orderFee/data';

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

// 解析JSON并对比字段差异
const parseAndCompareFields = (
  originalInfo: string | null | undefined,
  info: string | null | undefined,
) => {
  if (!originalInfo || !info) {
    console.warn('费用修改记录数据不完整:', { originalInfo, info });
    return [];
  }

  try {
    const original = JSON.parse(originalInfo);
    const modified = JSON.parse(info);

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

      // 其他字段（包括各种大小写变体）
      'localCurrencyCode', // 本位币代码
      'Remark',
      'ExchangeRate',
      'CurrencyCode',
      'FeeCodeCode',

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
      feeCodeId: '费用代码ID',
      feeCodeName: '费用名称',
      industryCategory: '行业类别',
      industryCategories: '行业类别字母',
      settlementId: '结算对象ID',
      settlementName: '结算对象名称',
      currencyId: '币别ID',
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
      const before = getFieldValue(original, normalizedKey);
      const after = getFieldValue(modified, normalizedKey);

      // 如果值不同，则记录变化
      if (JSON.stringify(before) !== JSON.stringify(after)) {
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
  } catch (error) {
    console.error('解析修改记录失败:', error);
    console.error('原始数据:', originalInfo);
    console.error('修改数据:', info);
    return [];
  }
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
              <span v-if="task.creatorUserName" class="audit-modifier">
                {{ task.creatorUserName }}
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
            <!-- 第三行：修改记录表格（仅费用修改类型显示） -->
            <div
              v-if="task.taskType === 1 && task.originalInfo && task.info"
              class="modify-record-section"
            >
              <div class="modify-record-title">
                {{ $t('auditApproval.task.originalInfo') }} vs
                {{ $t('auditApproval.task.info') }}
              </div>
              <Table
                :columns="getModifyColumns()"
                :data-source="
                  parseAndCompareFields(task.originalInfo, task.info)
                "
                :pagination="false"
                size="small"
                bordered
                class="modify-record-table"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'before'">
                    <span class="before-value">{{ record.before }}</span>
                  </template>
                  <template v-else-if="column.key === 'after'">
                    <span class="after-value">{{ record.after }}</span>
                  </template>
                </template>
              </Table>
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

  .audit-modifier {
    font-size: 13px;
    color: #595959;
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

.modify-record-section {
  padding: 12px;
  margin-top: 12px;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.modify-record-title {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #595959;
}

.modify-record-table {
  :deep(.ant-table) {
    font-size: 12px;
  }

  :deep(.ant-table-thead > tr > th) {
    font-weight: 600;
    background-color: #fafafa;
  }

  .before-value {
    color: #ff4d4f;
    text-decoration: line-through;
  }

  .after-value {
    font-weight: 500;
    color: #52c41a;
  }
}
</style>
