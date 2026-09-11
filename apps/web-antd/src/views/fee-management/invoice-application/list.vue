<script lang="ts" setup>
import { InvoiceApplicationApi } from '#/api/Invoice/invoiceRequest';
import { InvoiceIssueApi } from '#/api/Invoice/InvoiceIssue';

import { computed, ref } from 'vue';
import dayjs from 'dayjs';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Button,
  message,
  Modal,
  Space,
  Input,
  Descriptions,
  Empty,
  Tag,
} from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';
import { toIsoEndOfDay, toIsoStartOfDay } from '#/utils/date-range-iso';
import { normalizeKeysParam } from '#/utils/keys-search';
import { useRefreshListOnFormReturn } from '#/utils/list-refresh-flag';
import { createPagedListQuery } from '#/utils/paged-list-query';
import { openAttachmentViewer } from '#/components/attachment-viewer';
import { downloadAttachmentWithFriendlyName } from '#/utils/download-file';

import {
  useColumns,
  useGridFormSchema,
  invoiceApplicationStatusOptions,
} from './data';

const router = useRouter();
const actionLoading = ref(false);
const rejectReasonVisible = ref(false);
const currentRejectId = ref<string>('');
const rejectReasonValue = ref<string>('');

// ✅ 新增：发票详情弹窗相关状态
const invoiceDetailModalVisible = ref(false);
const currentInvoiceAttachments = ref<InvoiceIssueApi.AttachmentItemDto[]>([]);
const currentInvoiceInfo = ref<any>(null);

/** ✅ 新增：打开发票详情弹窗 */
async function handleViewInvoice(
  row: InvoiceApplicationApi.InvoiceApplicationListDto,
) {
  // 检查是否有发票号（有发票号说明已经开票）
  if (!row.invoiceNo) {
    message.warning('该申请尚未开具发票');
    return;
  }

  try {
    // 获取开票申请的详情
    const detail = await InvoiceApplicationApi.detailAsync(row.id);

    // 构建发票信息对象（用于弹窗显示）
    currentInvoiceInfo.value = {
      invoiceNo: detail.invoiceNo,
      applicationNo: detail.applicationNo,
      settlementName: detail.settlement?.name,
      currencyCode: detail.currency?.code,
      invoiceType: detail.invoiceType,
      applyTime: detail.applyTime,
      invoiceExchangeRate: detail.invoiceExchangeRate,
    };

    // 注意：InvoiceApplicationDetailDto 没有 attachments 字段
    // 如果需要显示附件，应该从发票开出（InvoiceIssue）接口获取
    // 这里暂时设置为空数组
    currentInvoiceAttachments.value = [];

    // 打开弹窗
    invoiceDetailModalVisible.value = true;
  } catch (error) {
    console.error('获取申请详情失败:', error);
    message.error('获取申请详情失败');
  }
}

/** ✅ 新增：格式化日期时间 */
function formatDateTime(value?: string) {
  if (!value) return '-';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm:ss') : '-';
}

/** ✅ 新增：获取发票类型标签 */
function getInvoiceTypeLabel(type?: string) {
  if (!type) return '-';
  const typeMap: Record<string, string> = {
    p: '普通发票(电票)',
    c: '普通发票(纸票)',
    s: '专用发票',
  };
  return typeMap[type] || type;
}

/** 查看附件 */
function viewAttachment(item: InvoiceIssueApi.AttachmentItemDto) {
  openAttachmentViewer(item);
}

/** 下载附件 */
function downloadAttachment(item: InvoiceIssueApi.AttachmentItemDto) {
  if (!item.url) {
    message.warning('附件链接不存在');
    return;
  }
  void downloadAttachmentWithFriendlyName(
    item.url,
    item.friendlyFileName || 'attachment',
  );
}

/** ✅ 新增：获取状态标签颜色 */
function getStatusColor(
  status?: InvoiceApplicationApi.InvoiceApplicationStatus,
) {
  if (status === undefined || status === null) return 'default';

  // 根据开票申请状态返回对应的颜色
  const statusColorMap: Record<number, string> = {
    [InvoiceApplicationApi.InvoiceApplicationStatus.Entering]: 'default', // 录入中 - 灰色
    [InvoiceApplicationApi.InvoiceApplicationStatus.Auditing]: 'processing', // 审核中 - 蓝色
    [InvoiceApplicationApi.InvoiceApplicationStatus.Rejected]: 'error', // 已驳回 - 红色
    [InvoiceApplicationApi.InvoiceApplicationStatus.Invoiced]: 'success', // 已开票 - 绿色
  };

  return statusColorMap[status] || 'default';
}

/** ✅ 新增：获取状态标签文本 */
function getStatusLabel(
  status?: InvoiceApplicationApi.InvoiceApplicationStatus,
) {
  if (status === undefined || status === null) return '-';

  const options = invoiceApplicationStatusOptions();
  const option = options.find((item) => item.value === status);
  return option?.label || String(status);
}

// 从命名空间中解构 API 函数
const {
  deleteAsync: deleteInvoiceApplication,
  auditAsync,
  submitAsync,
  withdrawAsync,
  getPagedListAsync,
} = InvoiceApplicationApi;

/** 处理新建 */
function handleCreate() {
  router.push('/fee-management/invoice-application/add');
}

/** 处理编辑 */
function handleEdit(row: InvoiceApplicationApi.InvoiceApplicationListDto) {
  // 只有录入和驳回状态可以编辑
  if (
    row.status !== InvoiceApplicationApi.InvoiceApplicationStatus.Entering &&
    row.status !== InvoiceApplicationApi.InvoiceApplicationStatus.Rejected
  ) {
    message.warning('只有录入或驳回状态的申请可以编辑');
    return;
  }
  // 设置当前行为选中状态，显示选中色
  const grid = gridApi.grid as any;
  if (grid && grid.setCheckboxRow) {
    grid.setCheckboxRow(row, true);
  }
  router.push(`/fee-management/invoice-application/${row.id}/edit`);
}

/** 处理查看详情 */
function handleViewDetail(
  row: InvoiceApplicationApi.InvoiceApplicationListDto,
) {
  // TODO: 后续实现详情页面
  message.info('详情功能待实现');
}

/** 处理提交审核 */
function handleSubmit(row: InvoiceApplicationApi.InvoiceApplicationListDto) {
  // 只有录入和驳回状态可以提交
  if (
    row.status !== InvoiceApplicationApi.InvoiceApplicationStatus.Entering &&
    row.status !== InvoiceApplicationApi.InvoiceApplicationStatus.Rejected
  ) {
    message.warning('只有录入或驳回状态的申请可以提交审核');
    return;
  }
  Modal.confirm({
    title: '确认提交',
    content: `确定要提交申请单 "${row.applicationNo}" 进行审核吗？`,
    onOk: async () => {
      actionLoading.value = true;
      try {
        await submitAsync({ id: row.id });
        message.success('提交成功');
        handleRefresh();
      } catch (error) {
        console.error('提交失败:', error);
        message.error('提交失败');
      } finally {
        actionLoading.value = false;
      }
    },
  });
}

/** 处理撤回审核 */
function handleWithdraw(row: InvoiceApplicationApi.InvoiceApplicationListDto) {
  // 只有待审核状态可以撤回
  if (row.status !== InvoiceApplicationApi.InvoiceApplicationStatus.Auditing) {
    message.warning('只有待审核状态的申请可以撤回');
    return;
  }
  Modal.confirm({
    title: '确认撤回',
    content: `确定要撤回申请单 "${row.applicationNo}" 吗？`,
    onOk: async () => {
      actionLoading.value = true;
      try {
        await withdrawAsync({ id: row.id });
        message.success('撤回成功');
        handleRefresh();
      } catch (error) {
        console.error('撤回失败:', error);
        message.error('撤回失败');
      } finally {
        actionLoading.value = false;
      }
    },
  });
}

/** 处理审核驳回 */
function handleAudit(row: InvoiceApplicationApi.InvoiceApplicationListDto) {
  // 只有待审核状态可以驳回
  if (row.status !== InvoiceApplicationApi.InvoiceApplicationStatus.Auditing) {
    message.warning('只有待审核状态的申请可以驳回');
    return;
  }
  currentRejectId.value = row.id;
  rejectReasonValue.value = '';
  rejectReasonVisible.value = true;
}

/** 确认驳回 */
async function handleConfirmReject() {
  if (!rejectReasonValue.value.trim()) {
    message.warning('请输入驳回原因');
    return;
  }
  actionLoading.value = true;
  try {
    await auditAsync({
      id: currentRejectId.value,
      rejectReason: rejectReasonValue.value,
    });
    message.success('驳回成功');
    rejectReasonVisible.value = false;
    handleRefresh();
  } catch (error) {
    console.error('驳回失败:', error);
    message.error('驳回失败');
  } finally {
    actionLoading.value = false;
  }
}

/** 取消驳回 */
function handleCancelReject() {
  rejectReasonVisible.value = false;
  rejectReasonValue.value = '';
  currentRejectId.value = '';
}

/** 双击行处理 */
const handleRowDblclick = ({
  row,
}: {
  row: InvoiceApplicationApi.InvoiceApplicationListDto;
}) => {
  // 只有录入和驳回状态可以编辑
  if (
    row.status === InvoiceApplicationApi.InvoiceApplicationStatus.Entering ||
    row.status === InvoiceApplicationApi.InvoiceApplicationStatus.Rejected
  ) {
    handleEdit(row);
  } else {
    // 其他状态（如待审核、已开票等）以只读模式查看
    router.push(`/fee-management/invoice-application/${row.id}/view`);
  }
};

/** 获取范围值 */
const getRangeValue = (
  value: unknown,
): [unknown | undefined, unknown | undefined] => {
  return Array.isArray(value)
    ? [value[0] as unknown, value[1] as unknown]
    : [undefined, undefined];
};

/** 标准化查询参数 */
const normalizeQuery = (formValues: Record<string, unknown>) => {
  const [applyTimeStart, applyTimeEnd] = getRangeValue(
    formValues.applyTimeRange,
  );

  return {
    ...formValues,
    // Keys 精确搜索：去空白去重后作为 List<string>（repeat 序列化）
    keys: normalizeKeysParam(formValues.keys),
    applyTimeStart: toIsoStartOfDay(applyTimeStart),
    applyTimeEnd: toIsoEndOfDay(applyTimeEnd),
    applyTimeRange: undefined,
  };
};

/** 当前页表格数据，用于底部按币别合计 */
const currentPageData = ref<InvoiceApplicationApi.InvoiceApplicationListDto[]>(
  [],
);

/** 按币别汇总当前页的申请金额合计与发票金额合计 */
const currencyTotals = computed(() => {
  const map = new Map<
    string,
    { appliedAmount: number; currencyCode: string; invoiceAmount: number }
  >();
  currentPageData.value.forEach((row) => {
    const code = row.currency?.code || '未知';
    const item = map.get(code) ?? {
      appliedAmount: 0,
      currencyCode: code,
      invoiceAmount: 0,
    };
    item.appliedAmount += Number(row.totalAppliedAmount) || 0;
    item.invoiceAmount += Number(row.invoiceAmount) || 0;
    map.set(code, item);
  });
  // 币别按代码排序，翻页时合计行顺序不跳动
  return [...map.values()].sort((a, b) =>
    a.currencyCode.localeCompare(b.currencyCode),
  );
});

/** 金额格式化：千分位 + 两位小数 */
const formatAmount = (value: number) =>
  value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * 当前页发票金额总计：各币别金额直接相加，**未按开票汇率折算**。
 * 混合币别时该数字只代表「量级」，不等于本位币金额。
 */
const totalInvoiceAmount = computed(() =>
  currentPageData.value.reduce(
    (sum, row) => sum + (Number(row.invoiceAmount) || 0),
    0,
  ),
);

/**
 * 底部合计扁平项（对齐应收应付审核详情底部 total-amount：
 * 「标签: 着色金额」，每币别两组后用分隔符）。
 */
const summaryItems = computed(() => {
  const list: Array<{ color: string; name: string; value: string }> = [];
  currencyTotals.value.forEach((item) => {
    list.push({
      color: 'applied',
      name: `${item.currencyCode}申请金额:`,
      value: formatAmount(item.appliedAmount),
    });
    list.push({
      color: 'invoice',
      name: `${item.currencyCode}发票金额:`,
      value: formatAmount(item.invoiceAmount),
    });
  });
  if (currencyTotals.value.length > 0) {
    list.push({
      color: 'total',
      name: '总计发票金额:',
      value: formatAmount(totalInvoiceAmount.value),
    });
  }
  return list;
});

/** 初始化表格 */
const [Grid, gridApi] =
  useVbenVxeGrid<InvoiceApplicationApi.InvoiceApplicationListDto>({
    formOptions: {
      schema: useGridFormSchema(),
      submitOnChange: true,
      showCollapseButton: true,
      collapsed: true,
      compact: true,
      wrapperClass: 'grid-cols-4',
    },
    gridEvents: {
      cellDblclick: handleRowDblclick,
    },
    gridOptions: {
      columns: useColumns(),
      height: '100%',
      keepSource: true,
      // 使用 checkboxConfig（多选），支持点击行选中
      checkboxConfig: {
        highlight: true,
        trigger: 'row', // 点击行即可选中/取消选中复选框
        reserve: true, // 跨页保留选中状态
      },
      rowConfig: {
        keyField: 'id',
        isHover: true,
      },
      pagerConfig: {
        enabled: true,
      },
      proxyConfig: {
        ajax: {
          query: createPagedListQuery(getPagedListAsync, {
            mapParams: normalizeQuery,
            afterFetch: (result: any) => {
              // 拦截当前页数据，驱动底部按币别合计
              currentPageData.value = result?.items ?? [];
              return result;
            },
          }),
        },
      },
      toolbarConfig: {
        custom: true,
        export: false,
        refresh: { code: 'query' },
        zoom: true,
      },
    },
  });

/** 刷新列表 */
function handleRefresh() {
  gridApi.reload();
}

/** 监听表单返回，自动刷新列表 */
useRefreshListOnFormReturn('InvoiceApplicationList', handleRefresh);

/** 获取选中的行 */
function getSelectedRows(): InvoiceApplicationApi.InvoiceApplicationListDto[] {
  const grid = gridApi.grid as any;
  if (!grid) return [];

  // 使用复选框的获取方法，支持多选
  return (grid.getCheckboxRecords?.() ??
    []) as InvoiceApplicationApi.InvoiceApplicationListDto[];
}

/** 批量删除 */
function handleBatchDelete() {
  const rows = getSelectedRows();
  if (rows.length === 0) {
    message.warning('请先选择要删除的记录');
    return;
  }

  // 检查是否有已开票状态的记录
  const invoicedRows = rows.filter(
    (row) =>
      row.status === InvoiceApplicationApi.InvoiceApplicationStatus.Invoiced,
  );
  if (invoicedRows.length > 0) {
    message.warning('已开票状态的申请不能删除');
    return;
  }

  Modal.confirm({
    title: '确认删除',
    content: `确定要删除选中的 ${rows.length} 条开票申请记录吗？`,
    okType: 'danger',
    onOk: async () => {
      actionLoading.value = true;
      try {
        // 使用批量删除接口
        await deleteInvoiceApplication({ ids: rows.map((row) => row.id) });
        message.success('删除成功');
        handleRefresh();
      } catch (error) {
        console.error('删除失败:', error);
        message.error('删除失败');
      } finally {
        actionLoading.value = false;
      }
    },
  });
}

/** 批量提交审核 */
function handleBatchSubmit() {
  const rows = getSelectedRows();
  if (rows.length === 0) {
    message.warning('请先选择要提交的记录');
    return;
  }

  // 过滤出可以提交的记录(录入或驳回状态)
  const canSubmitRows = rows.filter(
    (row) =>
      row.status === InvoiceApplicationApi.InvoiceApplicationStatus.Entering ||
      row.status === InvoiceApplicationApi.InvoiceApplicationStatus.Rejected,
  );

  if (canSubmitRows.length === 0) {
    message.warning('选中的记录中没有可以提交的申请');
    return;
  }

  if (canSubmitRows.length < rows.length) {
    message.warning(
      `选中的 ${rows.length} 条记录中,只有 ${canSubmitRows.length} 条可以提交`,
    );
  }

  Modal.confirm({
    title: '确认提交',
    content: `确定要提交选中的 ${canSubmitRows.length} 条开票申请进行审核吗?`,
    onOk: async () => {
      actionLoading.value = true;
      try {
        for (const row of canSubmitRows) {
          await submitAsync({ id: row.id });
        }
        message.success('提交成功');
        handleRefresh();
      } catch (error) {
        console.error('提交失败:', error);
        message.error('提交失败');
      } finally {
        actionLoading.value = false;
      }
    },
  });
}

/** 批量撤回审核 */
function handleBatchWithdraw() {
  const rows = getSelectedRows();
  if (rows.length === 0) {
    message.warning('请先选择要撤回的记录');
    return;
  }

  // 过滤出可以撤回的记录(待审核状态)
  const canWithdrawRows = rows.filter(
    (row) =>
      row.status === InvoiceApplicationApi.InvoiceApplicationStatus.Auditing,
  );

  if (canWithdrawRows.length === 0) {
    message.warning('选中的记录中没有可以撤回的申请');
    return;
  }

  if (canWithdrawRows.length < rows.length) {
    message.warning(
      `选中的 ${rows.length} 条记录中,只有 ${canWithdrawRows.length} 条可以撤回`,
    );
  }

  Modal.confirm({
    title: '确认撤回',
    content: `确定要撤回选中的 ${canWithdrawRows.length} 条开票申请吗?`,
    onOk: async () => {
      actionLoading.value = true;
      try {
        for (const row of canWithdrawRows) {
          await withdrawAsync({ id: row.id });
        }
        message.success('撤回成功');
        handleRefresh();
      } catch (error) {
        console.error('撤回失败:', error);
        message.error('撤回失败');
      } finally {
        actionLoading.value = false;
      }
    },
  });
}
</script>

<template>
  <Page auto-content-height content-class="flex flex-col">
    <Grid table-title="开票申请列表" class="min-h-0 flex-1">
      <template #toolbar-tools>
        <Space>
          <Button type="primary" @click="handleCreate"> 新建 </Button>
          <Button @click="handleBatchSubmit"> 批量提交 </Button>
          <Button @click="handleBatchWithdraw"> 批量撤回 </Button>
          <Button danger :loading="actionLoading" @click="handleBatchDelete">
            删除
          </Button>
        </Space>
      </template>

      <!-- ✅ 新增：状态列插槽，支持点击查看发票 -->
      <template #status="{ row }">
        <span
          v-if="row.invoiceNo"
          class="invoice-status-link"
          @click.stop="handleViewInvoice(row)"
        >
          <Tag :color="getStatusColor(row.status)">
            {{ getStatusLabel(row.status) }}
          </Tag>
        </span>
        <Tag v-else :color="getStatusColor(row.status)">
          {{ getStatusLabel(row.status) }}
        </Tag>
      </template>
    </Grid>

    <!-- 合计放在内容区内：Page 的 p-4 形成相对页面左右与底部的外边距 -->
    <div
      v-if="summaryItems.length > 0"
      class="invoice-footer-summary"
      title="各币别金额直接相加；总计发票金额未按开票汇率折算"
    >
      <div
        v-for="(item, index) in summaryItems"
        :key="`${item.name}-${index}`"
        class="invoice-footer-summary__pair"
      >
        <span class="invoice-footer-summary__name">{{ item.name }}</span>
        <span
          class="invoice-footer-summary__value"
          :class="`invoice-footer-summary__value--${item.color}`"
        >
          {{ item.value }}
        </span>
        <span
          v-show="(index + 1) % 2 === 0 && index < summaryItems.length - 1"
          class="invoice-footer-summary__split"
        >
          |
        </span>
      </div>
    </div>
    <div v-else class="invoice-footer-summary invoice-footer-summary--empty">
      <span class="invoice-footer-summary__name">当页合计：</span>
      <span class="invoice-footer-summary__empty-text">暂无数据</span>
    </div>

    <!-- 驳回原因对话框 -->
    <Modal
      v-model:open="rejectReasonVisible"
      title="驳回原因"
      :confirm-loading="actionLoading"
      @ok="handleConfirmReject"
      @cancel="handleCancelReject"
    >
      <Input.TextArea
        v-model:value="rejectReasonValue"
        placeholder="请输入驳回原因"
        :rows="4"
        :maxlength="500"
        show-count
      />
    </Modal>

    <!-- ✅ 新增：发票详情弹窗 -->
    <Modal
      v-model:open="invoiceDetailModalVisible"
      title="发票信息及附件"
      width="800px"
      :footer="null"
    >
      <div v-if="currentInvoiceInfo" class="invoice-detail-container">
        <!-- 发票基本信息 -->
        <div class="section-title">发票信息</div>
        <Descriptions bordered :column="2" size="small" class="mb-4">
          <Descriptions.Item label="申请单号">
            {{ currentInvoiceInfo.applicationNo || '-' }}
          </Descriptions.Item>
          <Descriptions.Item label="发票号码">
            {{ currentInvoiceInfo.invoiceNo || '-' }}
          </Descriptions.Item>
          <Descriptions.Item label="结算对象">
            {{ currentInvoiceInfo.settlementName || '-' }}
          </Descriptions.Item>
          <Descriptions.Item label="币别">
            {{ currentInvoiceInfo.currencyCode || '-' }}
          </Descriptions.Item>
          <Descriptions.Item label="发票类型">
            {{ getInvoiceTypeLabel(currentInvoiceInfo.invoiceType) }}
          </Descriptions.Item>
          <Descriptions.Item label="开票汇率">
            {{ currentInvoiceInfo.invoiceExchangeRate || '-' }}
          </Descriptions.Item>
          <Descriptions.Item label="申请时间">
            {{ formatDateTime(currentInvoiceInfo.applyTime) }}
          </Descriptions.Item>
        </Descriptions>

        <!-- 附件列表 -->
        <div
          v-if="
            currentInvoiceAttachments && currentInvoiceAttachments.length > 0
          "
        >
          <div class="section-title">
            发票附件 ({{ currentInvoiceAttachments.length }})
          </div>
          <div class="attachment-list">
            <div
              v-for="(item, index) in currentInvoiceAttachments"
              :key="index"
              class="attachment-item"
            >
              <span class="attachment-name" :title="item.friendlyFileName">
                {{ item.friendlyFileName }}
              </span>
              <div class="attachment-actions">
                <a-button
                  type="link"
                  size="small"
                  class="attachment-btn"
                  @click="viewAttachment(item)"
                >
                  <IconifyIcon icon="ant-design:eye-outlined" />
                  查看
                </a-button>
                <a-button
                  type="link"
                  size="small"
                  class="attachment-btn"
                  @click="downloadAttachment(item)"
                >
                  <IconifyIcon icon="ant-design:download-outlined" />
                  下载
                </a-button>
              </div>
            </div>
          </div>
        </div>
        <Empty
          v-else
          description="暂无附件"
          :image="Empty.PRESENTED_IMAGE_SIMPLE"
        />
      </div>
    </Modal>
  </Page>
</template>

<style scoped>
/* 发票详情容器 */
.invoice-detail-container {
  max-height: 60vh;
  overflow-y: auto;
}

.section-title {
  margin: 16px 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: #262626;
}

.mb-4 {
  margin-bottom: 16px;
}

/* 附件列表样式 */
.attachment-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.attachment-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  background-color: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.attachment-item:hover {
  background-color: #f5f5f5;
  border-color: #d9d9d9;
}

.attachment-name {
  flex: 1;
  margin-right: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  color: #262626;
  white-space: nowrap;
}

.attachment-actions {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  white-space: nowrap;
}

.attachment-btn {
  display: inline-flex;
  gap: 2px;
  align-items: center;
  padding: 0 4px;
  margin: 0;
  color: #1677ff;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.3s ease;
}

.attachment-btn :deep(.anticon) {
  font-size: 14px;
}

.attachment-btn:hover {
  color: #4096ff;
  cursor: pointer;
  background-color: rgb(22 119 255 / 10%);
}

/* 查看发票按钮样式 */
.view-invoice-btn {
  color: #1677ff;
}

.view-invoice-btn:hover {
  color: #4096ff;
}

/* 状态链接样式 */
.invoice-status-link {
  cursor: pointer;
  transition: all 0.3s ease;
}

.invoice-status-link:hover {
  opacity: 0.8;
  transform: scale(1.05);
}

/* 内容区内合计：相对页面的外边距由 Page p-4 提供，自身仅与表格留间距 */
.invoice-footer-summary {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 0 4px;
  align-items: center;
  width: 100%;
  min-height: 40px;
  padding: 8px 16px;
  margin-top: 12px;
  font-size: 13px;
  color: #52607a;
  background: linear-gradient(
    90deg,
    hsl(var(--primary) / 6%) 0%,
    hsl(var(--background)) 55%,
    hsl(var(--primary) / 6%) 100%
  );
  border: 1px solid #e8ecf3;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgb(16 42 83 / 5%);
}

.invoice-footer-summary--empty {
  color: #94a3b8;
}

.invoice-footer-summary__pair {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  margin-right: 12px;
}

.invoice-footer-summary__name {
  flex-shrink: 0;
}

.invoice-footer-summary__value {
  font-weight: 600;
}

.invoice-footer-summary__value--applied {
  color: #00a862;
}

.invoice-footer-summary__value--invoice {
  color: #f59e0b;
}

.invoice-footer-summary__value--total {
  color: #1890ff;
}

.invoice-footer-summary__split {
  margin: 0 4px;
  color: #d9dee8;
}

.invoice-footer-summary__empty-text {
  color: #94a3b8;
}
</style>
