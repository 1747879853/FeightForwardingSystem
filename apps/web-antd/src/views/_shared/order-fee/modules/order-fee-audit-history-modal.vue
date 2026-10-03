<script lang="ts" setup>
import { ref, watch } from 'vue';
import { useVbenModal } from '@vben/common-ui';
import { $t } from '#/locales';
import { orderFeeDataT } from '../data';
import type { ExpenseSubmissionAdminApi } from '#/api/audit-approval/expense-admin';
import { IconifyIcon } from '@vben/icons';
import { Table } from 'ant-design-vue';
import dayjs from 'dayjs';

import { batchGetWorkFlowInstances } from '#/api/audit-approval/payment-review-admin';

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

/** 当前待审节点上的审核人，多人用顿号拼接 */
const pendingAuditorText = ref('—');

function formatTaskTime(value?: null | string) {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '—';
}

async function loadPendingAuditors(feeId?: string) {
  pendingAuditorText.value = '—';
  if (!feeId) return;

  try {
    const instances = await batchGetWorkFlowInstances(
      { TaskType: 0, EntityId: String(feeId) },
      { silent: true },
    );
    const active = (instances ?? []).filter((item) => item.status === 0);
    const source = active.length > 0 ? active : (instances ?? []);
    const names = new Set<string>();
    for (const instance of source) {
      for (const group of instance.levelGroup ?? []) {
        for (const item of group.itemList ?? []) {
          if (Number(item.taskStatus) === 0 && item.userNickName) {
            names.add(item.userNickName);
          }
        }
      }
    }
    pendingAuditorText.value = [...names].join('、') || '—';
  } catch {
    pendingAuditorText.value = '—';
  }
}

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

    if (!feeData) {
      auditTasks.value = [];
      currentFeeData.value = null;
      pendingAuditorText.value = '—';
      return;
    }

    // 保存当前费用数据，用于待审核修改任务的对比
    currentFeeData.value = feeData;

    const allTasks: ExpenseSubmissionAdminApi.TaskItemDto[] = [];

    // 收集所有类型的审核任务（每次审核操作都是一条独立记录）
    if (feeData.submitOrderFeeTasks?.length) {
      allTasks.push(...feeData.submitOrderFeeTasks);
    }
    if (feeData.modifyOrderFeeTasks?.length) {
      allTasks.push(...feeData.modifyOrderFeeTasks);
    }
    if (feeData.deleteOrderFeeTasks?.length) {
      allTasks.push(...feeData.deleteOrderFeeTasks);
    }

    // 不再过滤，显示所有任务（包括待审核、已通过、已驳回）
    // 这样用户在未审核完成之前也能查看本次申请修改的原值及修改值
    const displayTasks = allTasks;

    // 排序逻辑：
    // 1. 有审核时间的按审核时间倒序（最新的在前）
    // 2. 没有审核时间的（待审核）排在最前面，并按创建时间倒序
    const hasPending = allTasks.some((task) => !task.auditTime);
    if (hasPending) {
      void loadPendingAuditors(feeData.id);
    } else {
      pendingAuditorText.value = '—';
    }

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
  } else {
    // 关闭时清空数据
    auditTasks.value = [];
    currentFeeData.value = null;
    pendingAuditorText.value = '—';
  }
});

const getTaskTypeLabel = (taskType?: number) => {
  const typeMap: Record<number, string> = {
    0: $t('auditApproval.task.typeOptions.SubmitOrderFee'),
    1: $t('auditApproval.task.typeOptions.ModifyOrderFee'),
    2: $t('auditApproval.task.typeOptions.DeleteOrderFee'),
  };
  return taskType === undefined ? '' : (typeMap[taskType] ?? '');
};

/** 卡片和圆点按任务类型分色，不跟审核结果走 */
function taskTypeClass(taskType?: number) {
  if (taskType === 1) return 'is-modify';
  if (taskType === 2) return 'is-delete';
  return 'is-submit';
}

function taskTypeIcon(taskType?: number) {
  if (taskType === 1) return 'lucide:git-compare';
  if (taskType === 2) return 'lucide:trash-2';
  return 'lucide:send';
}

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
      <ol v-else class="audit-history__list">
        <li
          v-for="(task, index) in auditTasks"
          :key="index"
          class="audit-history__item"
        >
          <span
            class="audit-history__mark"
            :class="taskTypeClass(task.taskType)"
          />
          <article class="audit-card" :class="taskTypeClass(task.taskType)">
            <header class="audit-card__head">
              <span
                v-if="getTaskTypeLabel(task.taskType)"
                class="audit-card__kind"
              >
                <IconifyIcon :icon="taskTypeIcon(task.taskType)" />
                {{ getTaskTypeLabel(task.taskType) }}
              </span>
            </header>

            <div class="audit-card__row">
              <span class="audit-card__pair">
                <span class="audit-card__label">提交人</span>
                <span class="audit-card__value">{{
                  task.creatorUserName || '—'
                }}</span>
              </span>
              <span class="audit-card__pair">
                <span class="audit-card__label">提交时间</span>
                <span class="audit-card__value">{{
                  formatTaskTime(task.creationTime)
                }}</span>
              </span>
            </div>
            <div v-if="!task.auditTime" class="audit-card__row">
              <span class="audit-card__pair">
                <span class="audit-card__label">待审核人</span>
                <span class="audit-card__value">{{ pendingAuditorText }}</span>
              </span>
            </div>
            <div v-else class="audit-card__row audit-card__row--result">
              <span
                class="audit-card__result"
                :class="{ 'is-rejected': task.taskStatus === 1 }"
              >
                {{ task.taskStatus === 1 ? '驳回' : '审核通过' }}
              </span>
              <span class="audit-card__pair">
                <span class="audit-card__label">审核人</span>
                <span class="audit-card__value">{{
                  task.auditUserName || '—'
                }}</span>
              </span>
              <span class="audit-card__pair">
                <span class="audit-card__label">审核时间</span>
                <span class="audit-card__value">{{
                  formatTaskTime(task.auditTime)
                }}</span>
              </span>
            </div>

            <div v-if="task.remark" class="audit-card__remark">
              <span class="audit-card__remark-label">审核意见</span>
              <p class="audit-card__remark-text">{{ task.remark }}</p>
            </div>

            <section v-if="task.taskType === 1 && task.info" class="audit-diff">
              <div class="audit-diff__header">
                <div class="audit-diff__title">
                  <IconifyIcon icon="lucide:git-compare" />
                  <span>费用修改详情</span>
                  <span v-if="!task.auditTime" class="audit-diff__pending"
                    >待审核</span
                  >
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
                  size="small"
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
        </li>
      </ol>
    </div>
  </Modal>
</template>

<style scoped lang="scss">
.audit-history {
  padding: 2px 4px 20px;
}

.audit-history__empty {
  padding: 48px 16px;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
  text-align: center;
  background: hsl(var(--muted) / 45%);
  border: 1px dashed hsl(var(--border));
  border-radius: 10px;
}

.audit-history__list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 2px 0 0;
  margin: 0;
  list-style: none;
}

.audit-history__item {
  position: relative;
  padding-left: 22px;
}

.audit-history__item::before {
  position: absolute;
  top: 18px;
  bottom: -14px;
  left: 4px;
  width: 1px;
  content: '';
  background: hsl(var(--border));
}

.audit-history__item:last-child::before {
  display: none;
}

.audit-history__mark {
  position: absolute;
  top: 16px;
  left: 0;
  width: 9px;
  height: 9px;
  background: hsl(var(--muted-foreground) / 45%);
  border: 2px solid hsl(var(--card));
  border-radius: 50%;
  box-shadow: 0 0 0 1px hsl(var(--border));
  transition:
    background-color 0.2s ease,
    box-shadow 0.2s ease;

  &.is-submit {
    background: hsl(var(--primary));
    box-shadow: 0 0 0 1px hsl(var(--primary) / 28%);
  }

  &.is-modify {
    background: hsl(var(--warning));
    box-shadow: 0 0 0 1px hsl(var(--warning) / 40%);
  }

  &.is-delete {
    background: hsl(var(--destructive) / 78%);
    box-shadow: 0 0 0 1px hsl(var(--destructive) / 28%);
  }
}

.audit-card {
  padding: 12px 16px 4px;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  box-shadow: 0 1px 2px hsl(var(--foreground) / 4%);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;

  &:hover {
    background: hsl(var(--accent) / 35%);
    box-shadow: 0 8px 20px hsl(var(--foreground) / 6%);
  }

  &.is-submit {
    border-color: hsl(var(--primary) / 22%);
    box-shadow:
      inset 3px 0 0 hsl(var(--primary) / 70%),
      0 1px 2px hsl(var(--foreground) / 4%);
  }

  &.is-modify {
    border-color: hsl(var(--warning) / 45%);
    box-shadow:
      inset 3px 0 0 hsl(var(--warning) / 85%),
      0 1px 2px hsl(var(--foreground) / 4%);
  }

  &.is-delete {
    border-color: hsl(var(--destructive) / 28%);
    box-shadow:
      inset 3px 0 0 hsl(var(--destructive) / 65%),
      0 1px 2px hsl(var(--foreground) / 4%);
  }

  &.is-submit:hover {
    border-color: hsl(var(--primary) / 40%);
    box-shadow:
      inset 3px 0 0 hsl(var(--primary) / 80%),
      0 8px 20px hsl(var(--foreground) / 6%);
  }

  &.is-modify:hover {
    border-color: hsl(var(--warning) / 60%);
    box-shadow:
      inset 3px 0 0 hsl(var(--warning)),
      0 8px 20px hsl(var(--foreground) / 6%);
  }

  &.is-delete:hover {
    border-color: hsl(var(--destructive) / 42%);
    box-shadow:
      inset 3px 0 0 hsl(var(--destructive) / 75%),
      0 8px 20px hsl(var(--foreground) / 6%);
  }
}

.audit-card__head {
  display: flex;
  align-items: center;
  min-height: 22px;
}

.audit-card__kind {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 3px 10px;
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
  border-radius: 999px;

  :deep(svg) {
    width: 14px;
    height: 14px;
  }
}

.audit-card.is-submit .audit-card__kind {
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 12%);
}

.audit-card.is-modify .audit-card__kind {
  color: hsl(28deg 46% 32%);
  background: hsl(var(--warning) / 24%);
}

.audit-card.is-delete .audit-card__kind {
  color: hsl(var(--destructive) / 88%);
  background: hsl(var(--destructive) / 12%);
}

.audit-card__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px 28px;
  align-items: baseline;
  padding: 10px 0;
  border-top: 1px solid hsl(var(--border) / 80%);
}

.audit-card__row--result {
  grid-template-columns: auto minmax(0, 1fr) minmax(0, 1.2fr);
}

.audit-card__pair {
  display: flex;
  gap: 8px;
  align-items: baseline;
  min-width: 0;
}

.audit-card__label {
  flex: none;
  font-size: 12px;
  line-height: 20px;
  color: hsl(var(--muted-foreground));
}

.audit-card__value {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
  color: hsl(var(--foreground));
  white-space: nowrap;
}

.audit-card__result {
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
  color: hsl(var(--primary));

  &.is-rejected {
    color: hsl(var(--destructive) / 82%);
  }
}

.audit-card__remark {
  padding: 10px 12px;
  margin: 2px 0 12px;
  background: hsl(var(--muted) / 55%);
  border-radius: 8px;
}

.audit-card__remark-label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  line-height: 18px;
  color: hsl(var(--muted-foreground));
}

.audit-card__remark-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: hsl(var(--foreground));
  overflow-wrap: anywhere;
}

.audit-diff {
  margin: 2px 0 12px;
  overflow: hidden;
  background: hsl(var(--muted) / 35%);
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.audit-diff__header {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid hsl(var(--border));
}

.audit-diff__title {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: hsl(var(--foreground));

  :deep(svg) {
    width: 16px;
    height: 16px;
    color: hsl(var(--muted-foreground));
  }
}

.audit-diff__pending {
  padding: 1px 7px;
  font-size: 12px;
  font-weight: 500;
  line-height: 18px;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
  border-radius: 999px;
}

.audit-diff__legend {
  display: flex;
  gap: 8px;
  align-items: center;
}

.audit-diff__chip {
  padding: 1px 8px;
  font-size: 12px;
  font-weight: 500;
  line-height: 18px;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--background));
  border-radius: 999px;

  &--after {
    color: hsl(var(--foreground));
  }
}

.audit-diff__arrow {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.audit-diff__body {
  padding: 8px;
  background: hsl(var(--card));
}

.audit-diff__table {
  :deep(.ant-table) {
    font-size: 13px;
    background: transparent;
  }

  :deep(.ant-table-thead > tr > th) {
    padding: 8px 10px;
    font-size: 12px;
    font-weight: 600;
    color: hsl(var(--muted-foreground));
    background: hsl(var(--muted) / 50%) !important;
    border-bottom: 1px solid hsl(var(--border)) !important;
  }

  :deep(.ant-table-tbody > tr > td) {
    padding: 8px 10px;
    vertical-align: middle;
    background: transparent;
    border-bottom: 1px solid hsl(var(--border) / 70%) !important;
    transition: background-color 0.18s ease;
  }

  :deep(.ant-table-tbody > tr:hover > td) {
    background: hsl(var(--accent) / 55%) !important;
  }

  :deep(.ant-table-tbody > tr:last-child > td) {
    border-bottom: none !important;
  }
}

.diff-field {
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--foreground));
}

.diff-cell {
  display: inline-block;
  max-width: 100%;
  padding: 2px 8px;
  font-size: 12px;
  line-height: 1.5;
  color: hsl(var(--foreground));
  word-break: break-all;
  background: hsl(var(--muted) / 65%);
  border-radius: 6px;

  &--after {
    background: hsl(var(--primary) / 8%);
  }
}
</style>
