<script lang="ts" setup>
import { ref, watch } from 'vue';
import { useVbenModal } from '@vben/common-ui';
import { $t } from '#/locales';
import { orderFeeDataT } from '../data';
import type { ExpenseSubmissionAdminApi } from '#/api/audit-approval/expense-admin';
import { Tag, Timeline, TimelineItem, Table } from 'ant-design-vue';
import dayjs from 'dayjs';

import { getTaskStatusOptions } from '../data';

// 模态框
const [Modal, modalApi] = useVbenModal({
  class: 'w-[840px]',
  title: orderFeeDataT('auditHistory'),
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

    // 金额相关字段（派生流程金额，不随编辑变化，排除）
    'invoicedAmount', // 已开票金额
    'orderInvoiceAmount', // 发票申请金额
    'settledAmount', // 已结算金额
    'thisSettledAmount', // 本结算金额
    'rqstPaymentAmount', // 付费申请金额
    'unRqstPaymentAmount', // 未申请金额
    'unSettledAmount', // 未结算金额
    'unInvoicedAmount', // 未开票金额
    // 结算占用类：快照里常不一致，不参与「申请修改」字段对比
    'finalSettlementTime',
    'FinalSettlementTime',
    'settlementOccupiedAmount',
    'SettlementOccupiedAmount',

    'IsConfidential', // 是否机密
    'statementId',
    'settlementCode',
    'statement',
    'combinedFeeStatus',

    // 嵌套主数据 / 对应 Id 由下方 LOGICAL_MASTERS 专门解析展示，勿进普通字段遍历
    'Settlement',
    'FeeCode',
    'Currency',
    'feeCode',
    'currency',
    'settlement',
    'feeCodeName',
    'currencyName',
    'settlementName',
    'feeCodeCode',
    'currencyCode',
    'localCurrencyId',
    'localCurrency',
    'SettlementId',
    'settlementId',
    'feeCodeId',
    'currencyId',

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

  const excludeFieldSet = new Set(
    excludeFields.map((field) => field.toLowerCase()),
  );
  const isExcludedField = (fieldName: string) =>
    excludeFieldSet.has(fieldName.toLowerCase());

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
    // 与上面对应的小写 camelCase 变体（后端 DTO 序列化为 camelCase）
    unitPrice: '含税单价',
    amount: '金额',
    quantity: '数量',
    taxRate: '税率',
    noTaxUnitPrice: '不含税单价',
    noTaxAmount: '不含税金额',
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

  /** 嵌套主数据对象 → 可展示文案（兼容大小写） */
  const pickNestedDisplay = (
    value: any,
    kind: 'currency' | 'feeCode' | 'settlement',
  ): string => {
    if (value === null || value === undefined || value === '') {
      return '-';
    }
    if (typeof value !== 'object') {
      return String(value);
    }
    if (kind === 'feeCode') {
      return String(
        value.cnName ??
          value.CnName ??
          value.name ??
          value.Name ??
          value.code ??
          value.Code ??
          '-',
      );
    }
    if (kind === 'currency') {
      return String(
        value.code ?? value.Code ?? value.name ?? value.Name ?? '-',
      );
    }
    return String(
      value.name ??
        value.Name ??
        value.shortName ??
        value.ShortName ??
        value.code ??
        value.Code ??
        '-',
    );
  };

  /**
   * 费用名 / 币别 / 结算对象：从嵌套对象、名称字段、Handsontable 标签列或 Id 解析展示文案。
   * （申请修改快照常只有 Id；录入行常把 label 写进 *Id、真 Id 在 *_value）
   */
  const resolveMasterDisplay = (
    data: any,
    kind: 'currency' | 'feeCode' | 'settlement',
  ): string => {
    if (!data || typeof data !== 'object') {
      return '-';
    }

    const nested = getFieldValue(data, kind);
    if (nested && typeof nested === 'object') {
      const fromNested = pickNestedDisplay(nested, kind);
      if (fromNested !== '-') {
        return fromNested;
      }
    }

    if (kind === 'feeCode') {
      const name =
        getFieldValue(data, 'feeCodeName') ??
        getFieldValue(data, 'feeCodeCode');
      if (name != null && name !== '' && typeof name !== 'object') {
        return String(name);
      }
    }
    if (kind === 'currency') {
      const name =
        getFieldValue(data, 'currencyName') ??
        getFieldValue(data, 'currencyCode');
      if (name != null && name !== '' && typeof name !== 'object') {
        return String(name);
      }
    }
    if (kind === 'settlement') {
      const name =
        getFieldValue(data, 'settlementName') ??
        data._settlementName ??
        data.__settlementName;
      if (name != null && name !== '' && typeof name !== 'object') {
        return String(name);
      }
    }

    const idKey =
      kind === 'feeCode'
        ? 'feeCodeId'
        : kind === 'currency'
          ? 'currencyId'
          : 'settlementId';
    const idValue = data[`${idKey}_value`];
    const idRaw = getFieldValue(data, idKey);
    const labelConverted = !!data[`${idKey}_label_converted`];

    // Handsontable：*Id 已被改成展示名，真 Id 在 *_value
    if (
      (idValue != null || labelConverted) &&
      idRaw != null &&
      idRaw !== '' &&
      typeof idRaw !== 'object'
    ) {
      return String(idRaw);
    }

    if (nested != null && typeof nested !== 'object') {
      return String(nested);
    }

    if (idRaw != null && idRaw !== '' && typeof idRaw !== 'object') {
      return String(idRaw);
    }
    if (idValue != null && idValue !== '') {
      return String(idValue);
    }

    return '-';
  };

  /** 解析主数据 Id，用于判断是否真的改了（避免仅对象引用不同） */
  const resolveMasterId = (
    data: any,
    kind: 'currency' | 'feeCode' | 'settlement',
  ): string => {
    if (!data || typeof data !== 'object') {
      return '';
    }
    const idKey =
      kind === 'feeCode'
        ? 'feeCodeId'
        : kind === 'currency'
          ? 'currencyId'
          : 'settlementId';
    if (data[`${idKey}_value`] != null && data[`${idKey}_value`] !== '') {
      return String(data[`${idKey}_value`]);
    }
    const nested = getFieldValue(data, kind);
    if (nested && typeof nested === 'object' && nested.id != null) {
      return String(nested.id);
    }
    if (data[`${idKey}_label_converted`]) {
      return '';
    }
    const idRaw = getFieldValue(data, idKey);
    if (idRaw != null && idRaw !== '' && typeof idRaw !== 'object') {
      return String(idRaw);
    }
    return '';
  };

  /** 统一成可比对的展示值，再判断是否有变更（避免整对象 JSON 误判） */
  const toComparableDisplay = (normalizedKey: string, value: any): string => {
    if (value === null || value === undefined) {
      return '-';
    }
    if (typeof value === 'boolean') {
      return value ? '是' : '否';
    }
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }
    return String(value);
  };

  // 合并所有需要检查的字段（包括修改前和修改后的所有字段）
  const allFields = new Set([
    ...Object.keys(original).filter((key) => !isExcludedField(key)),
    ...Object.keys(modified).filter((key) => !isExcludedField(key)),
  ]);

  console.log('需要对比的所有字段:', Array.from(allFields));

  const seenNormalizedKeys = new Set<string>();

  // 费用名 / 币别 / 结算对象：始终按 Id+展示名解析（不依赖快照是否带嵌套对象）
  (
    [
      { key: 'feeCode', kind: 'feeCode', label: '费用代码' },
      { key: 'currency', kind: 'currency', label: '币别' },
      { key: 'settlement', kind: 'settlement', label: '结算对象' },
    ] as const
  ).forEach(({ key, kind, label }) => {
    seenNormalizedKeys.add(key.toLowerCase());
    const beforeId = resolveMasterId(original, kind);
    const afterId = resolveMasterId(modified, kind);
    let before = resolveMasterDisplay(original, kind);
    let after = resolveMasterDisplay(modified, kind);

    // 快照只有 Id、没有嵌套名称时，用 Id 兜底展示，避免单元格空白
    if (before === '-' && beforeId) {
      before = beforeId;
    }
    if (after === '-' && afterId) {
      after = afterId;
    }

    const changed =
      beforeId && afterId ? beforeId !== afterId : before !== after;

    if (!changed) {
      return;
    }

    changes.push({
      field: key,
      label: fieldLabels[key] || label,
      before,
      after,
    });
  });

  // 遍历其余普通字段
  allFields.forEach((key) => {
    const normalizedKey = normalizeFieldName(key);
    if (isExcludedField(normalizedKey)) {
      return;
    }
    if (seenNormalizedKeys.has(normalizedKey.toLowerCase())) {
      return;
    }
    seenNormalizedKeys.add(normalizedKey.toLowerCase());

    const beforeRaw = getFieldValue(original, normalizedKey);
    const afterRaw = getFieldValue(modified, normalizedKey);
    const before = toComparableDisplay(normalizedKey, beforeRaw);
    const after = toComparableDisplay(normalizedKey, afterRaw);

    if (before === after) {
      return;
    }

    changes.push({
      field: normalizedKey,
      label: fieldLabels[normalizedKey] || normalizedKey,
      before,
      after,
    });
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
    <div class="audit-history">
      <div v-if="auditTasks.length === 0" class="audit-history__empty">
        {{ $t('common.noData') }}
      </div>
      <Timeline v-else class="audit-history__timeline">
        <TimelineItem
          v-for="(task, index) in auditTasks"
          :key="index"
          :color="getTaskTypeTag(task.taskType)?.color || 'gray'"
        >
          <template #dot>
            <div
              class="audit-history__dot"
              :class="{
                'is-rejected': task.taskStatus === 1,
                'is-approved': task.taskStatus === 2,
                'is-pending': !task.auditTime,
              }"
            />
          </template>

          <article class="audit-card">
            <header class="audit-card__header">
              <div class="audit-card__primary">
                <span
                  class="audit-card__auditor"
                  :title="`审核人: ${task.auditUserName || '-'}`"
                >
                  <i class="i-carbon-user" />
                  {{ task.auditUserName || '-' }}
                </span>
                <span
                  class="audit-card__time"
                  :title="`审核时间: ${task.auditTime ? dayjs(task.auditTime).format('YYYY-MM-DD HH:mm:ss') : '-'}`"
                >
                  <i class="i-carbon-calendar" />
                  {{
                    task.auditTime
                      ? dayjs(task.auditTime).format('YYYY-MM-DD HH:mm:ss')
                      : '待审核'
                  }}
                </span>
              </div>
              <div class="audit-card__tags">
                <Tag
                  v-if="getTaskTypeTag(task.taskType)"
                  :color="getTaskTypeTag(task.taskType)?.color"
                  class="audit-card__tag"
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
                  class="audit-card__tag"
                >
                  {{ getTaskStatusText(task.taskStatus) }}
                </Tag>
              </div>
            </header>

            <div class="audit-card__meta">
              <span
                class="audit-card__meta-item"
                :title="`创建时间: ${task.creationTime ? dayjs(task.creationTime).format('YYYY-MM-DD HH:mm:ss') : '-'}`"
              >
                <i class="i-carbon-time" />
                创建
                {{
                  task.creationTime
                    ? dayjs(task.creationTime).format('YYYY-MM-DD HH:mm:ss')
                    : '-'
                }}
              </span>
              <span v-if="task.creatorUserName" class="audit-card__meta-item">
                <i class="i-carbon-user-avatar" />
                提交人 {{ task.creatorUserName }}
              </span>
            </div>

            <div v-if="task.remark" class="audit-card__remark">
              <span class="audit-card__remark-label">审核意见</span>
              <p class="audit-card__remark-text">{{ task.remark }}</p>
            </div>

            <section v-if="task.taskType === 1 && task.info" class="audit-diff">
              <div class="audit-diff__header">
                <div class="audit-diff__title">
                  <i class="i-carbon-compare" />
                  <span>费用修改详情</span>
                  <Tag
                    v-if="!task.auditTime"
                    color="warning"
                    class="audit-card__tag"
                  >
                    待审核
                  </Tag>
                </div>
                <div class="audit-diff__legend" aria-hidden="true">
                  <span class="audit-diff__chip audit-diff__chip--before"
                    >修改前</span
                  >
                  <span class="audit-diff__arrow">→</span>
                  <span class="audit-diff__chip audit-diff__chip--after"
                    >修改后</span
                  >
                </div>
              </div>

              <div class="audit-diff__body">
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
                  class="audit-diff__table"
                >
                  <template #bodyCell="{ column, record }">
                    <template v-if="column.key === 'before'">
                      <div class="diff-cell diff-cell--before">
                        {{ record.before }}
                      </div>
                    </template>
                    <template v-else-if="column.key === 'after'">
                      <div class="diff-cell diff-cell--after">
                        {{ record.after }}
                      </div>
                    </template>
                    <template v-else-if="column.key === 'label'">
                      <span class="diff-field">{{ record.label }}</span>
                    </template>
                  </template>
                </Table>
              </div>
            </section>
          </article>
        </TimelineItem>
      </Timeline>
    </div>
  </Modal>
</template>

<style scoped lang="scss">
.audit-history {
  padding: 2px 2px 16px;
}

.audit-history__empty {
  padding: 48px 16px;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
  text-align: center;
  background: #fafbfd;
  border: 1px dashed #e4e8ef;
  border-radius: 10px;
}

.audit-history__timeline {
  padding-top: 4px;

  :deep(.ant-timeline-item) {
    padding-bottom: 16px;
  }

  :deep(.ant-timeline-item-tail) {
    border-inline-start: 2px solid #e8ecf3;
  }

  :deep(.ant-timeline-item-content) {
    top: -4px;
    margin-inline-start: 22px;
  }
}

.audit-history__dot {
  width: 10px;
  height: 10px;
  background: #a8b0bf;
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 0 0 1px #d5dae3;
  transition:
    background-color 0.2s ease,
    box-shadow 0.2s ease;

  &.is-rejected {
    background: #e57373;
    box-shadow: 0 0 0 1px rgb(229 115 115 / 35%);
  }

  &.is-approved {
    background: #6bbf8a;
    box-shadow: 0 0 0 1px rgb(107 191 138 / 35%);
  }

  &.is-pending {
    background: hsl(var(--primary));
    box-shadow: 0 0 0 1px hsl(var(--primary) / 28%);
  }
}

.audit-card {
  padding: 14px 16px 16px;
  background: #fff;
  border: 1px solid #e8ecf3;
  border-radius: 10px;
  box-shadow: 0 1px 2px rgb(16 42 83 / 4%);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;

  &:hover {
    background: #fcfdff;
    border-color: #dce3ee;
    box-shadow: 0 4px 12px rgb(16 42 83 / 6%);
  }
}

.audit-card__header {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  align-items: center;
  justify-content: space-between;
}

.audit-card__primary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  align-items: center;
  min-width: 0;
}

.audit-card__auditor {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  color: #252a31;

  i {
    font-size: 15px;
    color: hsl(var(--primary) / 75%);
  }
}

.audit-card__time {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  font-size: 12px;
  color: #8c95a3;

  i {
    font-size: 13px;
    color: #a8b0bf;
  }
}

.audit-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.audit-card__tag {
  margin: 0;
  border-radius: 6px;
}

.audit-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  align-items: center;
  padding-top: 10px;
  margin-top: 10px;
  border-top: 1px solid #eef1f6;
}

.audit-card__meta-item {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  font-size: 12px;
  color: #8c95a3;

  i {
    font-size: 13px;
    color: #b0b8c5;
  }
}

.audit-card__remark {
  padding: 10px 12px;
  margin-top: 12px;
  background: hsl(var(--primary) / 4.5%);
  border: 1px solid hsl(var(--primary) / 10%);
  border-radius: 8px;
}

.audit-card__remark-label {
  display: block;
  margin-bottom: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #8c95a3;
  letter-spacing: 0.02em;
}

.audit-card__remark-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: #3d4654;
  overflow-wrap: anywhere;
}

.audit-diff {
  margin-top: 12px;
  overflow: hidden;
  background: #fafbfd;
  border: 1px solid #e8ecf3;
  border-radius: 8px;
}

.audit-diff__header {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: linear-gradient(
    180deg,
    hsl(var(--primary) / 7%) 0%,
    hsl(var(--primary) / 3%) 100%
  );
  border-bottom: 1px solid hsl(var(--primary) / 12%);
}

.audit-diff__title {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: #252a31;

  i {
    font-size: 15px;
    color: hsl(var(--primary) / 80%);
  }
}

.audit-diff__legend {
  display: flex;
  gap: 8px;
  align-items: center;
}

.audit-diff__chip {
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 999px;

  &--before {
    color: #9a5b5b;
    background: #f8eeee;
  }

  &--after {
    color: #4f7a5f;
    background: #eef6f1;
  }
}

.audit-diff__arrow {
  font-size: 12px;
  color: #a8b0bf;
}

.audit-diff__body {
  padding: 10px;
  background: #fff;
}

.audit-diff__table {
  :deep(.ant-table) {
    font-size: 13px;
    border-radius: 6px;
  }

  :deep(.ant-table-container) {
    border-color: #e8ecf3 !important;
  }

  :deep(.ant-table-thead > tr > th) {
    padding: 9px 10px;
    font-size: 12px;
    font-weight: 600;
    color: #5c6570;
    background: #fafbfd !important;
    border-bottom-color: #eef1f6 !important;
  }

  :deep(.ant-table-tbody > tr > td) {
    padding: 8px 10px;
    vertical-align: middle;
    border-bottom-color: #eef1f6 !important;
    transition: background-color 0.15s ease;
  }

  :deep(.ant-table-tbody > tr:hover > td) {
    background: hsl(var(--primary) / 4%) !important;
  }

  :deep(.ant-table-tbody > tr:last-child > td) {
    border-bottom: none !important;
  }
}

.diff-field {
  font-size: 13px;
  font-weight: 500;
  color: #3d4654;
}

.diff-cell {
  display: inline-block;
  max-width: 100%;
  padding: 3px 8px;
  font-size: 12px;
  line-height: 1.5;
  word-break: break-all;
  border-radius: 6px;

  &--before {
    color: #8a5555;
    background: #f7f0f0;
    box-shadow: inset 2px 0 0 #d4a5a5;
  }

  &--after {
    color: #457058;
    background: #f0f6f2;
    box-shadow: inset 2px 0 0 #8fbf9f;
  }
}
</style>
