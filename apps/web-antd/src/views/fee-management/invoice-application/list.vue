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
import { normalizeKeysParam } from '#/utils/keys-search';
import { useRefreshListOnFormReturn } from '#/utils/list-refresh-flag';
import { createPagedListQuery } from '#/utils/paged-list-query';
import { openAttachmentViewer } from '#/components/attachment-viewer';
import { buildAttachmentUrl } from '#/utils';

import {
  useColumns,
  useGridFormSchema,
  invoiceApplicationStatusOptions,
} from './data';
import InvoiceDetailModal from '#/views/settlement-management/invoice-issue/invoice-detail-modal.vue';

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

/** ✅ 新增：下载附件 */
function downloadAttachment(item: InvoiceIssueApi.AttachmentItemDto) {
  if (item.url) {
    const url = buildAttachmentUrl(item.url);
    const link = document.createElement('a');
    link.href = url;
    link.download = item.friendlyFileName || 'attachment';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    message.warning('附件链接不存在');
  }
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

/** 转换日期为 ISO 字符串 */
const toIsoString = (value: unknown): string | undefined => {
  if (!value) return undefined;
  const parsed = dayjs(value as string | Date);
  return parsed.isValid() ? parsed.toISOString() : undefined;
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
    applyTimeStart: toIsoString(applyTimeStart),
    applyTimeEnd: toIsoString(applyTimeEnd),
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
  // 币别按代码排序，翻页时合计行的胶囊顺序不跳动
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
      height: 'auto',
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
  <Page auto-content-height>
    <Grid table-title="开票申请列表">
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

    <!-- 表格下方：当前页按币别的申请金额/发票金额合计 -->
    <template #footer>
      <div v-if="currencyTotals.length > 0" class="invoice-footer-summary">
        <span class="invoice-footer-summary__label">当页合计：</span>
        <div class="invoice-footer-summary__list">
          <div
            v-for="item in currencyTotals"
            :key="item.currencyCode"
            class="invoice-footer-summary__item"
          >
            <span class="invoice-footer-summary__currency">
              {{ item.currencyCode }}
            </span>
            <span class="invoice-footer-summary__cell">
              <span class="invoice-footer-summary__cell-label">申请金额</span>
              <span class="invoice-footer-summary__applied">
                {{ formatAmount(item.appliedAmount) }}
              </span>
            </span>
            <span class="invoice-footer-summary__cell">
              <span class="invoice-footer-summary__cell-label">发票金额</span>
              <span class="invoice-footer-summary__invoice">
                {{ formatAmount(item.invoiceAmount) }}
              </span>
            </span>
          </div>

          <!-- 跨币别总计：直接相加，未折算 -->
          <div
            class="invoice-footer-summary__item invoice-footer-summary__item--total"
            title="各币别发票金额直接相加，未按开票汇率折算"
          >
            <span class="invoice-footer-summary__currency">总计</span>
            <span class="invoice-footer-summary__cell">
              <span class="invoice-footer-summary__cell-label">发票金额</span>
              <span class="invoice-footer-summary__invoice">
                {{ formatAmount(totalInvoiceAmount) }}
              </span>
            </span>
          </div>
        </div>
      </div>
      <div v-else class="invoice-footer-summary invoice-footer-summary--empty">
        <span class="invoice-footer-summary__label">当页合计：</span>
        <span class="text-muted-foreground">暂无数据</span>
      </div>
    </template>

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

/* 表格下方：当页按币别合计（与客户对账列表合计样式保持一致） */
.invoice-footer-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  width: 100%;

  /* Page 只在挂载时量一次 footer 高度，空/有数据两态保持等高，避免表格高度跳变 */
  min-height: 32px;
  font-size: 13px;
}

.invoice-footer-summary--empty {
  color: rgb(0 0 0 / 45%);
}

.invoice-footer-summary__label {
  font-weight: 600;
  color: rgb(0 0 0 / 85%);
}

.invoice-footer-summary__list {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
}

.invoice-footer-summary__item {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  padding: 4px 12px;
  background: rgb(24 144 255 / 6%);
  border: 1px solid rgb(24 144 255 / 20%);
  border-radius: 4px;
}

/* 跨币别总计胶囊：底色加重，与各币别明细区分 */
.invoice-footer-summary__item--total {
  background: rgb(24 144 255 / 14%);
  border-color: rgb(24 144 255 / 45%);
}

.invoice-footer-summary__currency {
  padding-right: 8px;
  font-weight: 600;
  color: #1890ff;
  border-right: 1px solid rgb(24 144 255 / 20%);
}

.invoice-footer-summary__cell {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}

.invoice-footer-summary__cell-label {
  color: rgb(0 0 0 / 45%);
}

.invoice-footer-summary__applied {
  font-weight: 600;
  color: #cf1322;
}

.invoice-footer-summary__invoice {
  font-weight: 600;
  color: #389e0d;
}
</style>
