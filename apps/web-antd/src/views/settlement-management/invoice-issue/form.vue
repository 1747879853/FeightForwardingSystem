<script lang="ts" setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import dayjs from 'dayjs';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Menu,
  MenuItem,
  message,
  Space,
  Spin,
  Table,
  Tag,
  Modal,
} from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';

import { CurrencySelect, MyOrgSelect } from '#/adapter/component';
import { Select } from 'ant-design-vue';
import { InvoiceIssueApi } from '#/api/Invoice/InvoiceIssue';
import {
  issueByInterface,
  applyRedAsync,
  getInvoiceIssueDetail,
  queryIssueResult,
  queryRedResult,
} from '#/api/Invoice/InvoiceIssue';
import { buildAttachmentUrl } from '#/utils';

// 导入组合状态映射（发票状态 = 开票状态与冲红状态合并）
import {
  getCombinedStatusColor,
  getCombinedStatusLabel,
} from './invoice-status';

// 导入组合函数
import { useFormData } from './composables/use-form-data';
import { useGoodsDetails } from './composables/use-goods-details';
import { useFeeManagement } from './composables/use-fee-management';
import { useInvoiceInfo } from './composables/use-invoice-info';
import { useTemplate } from './composables/use-template';
import { useSubmit } from './composables/use-submit';
import { useFeeSelection } from './composables/use-fee-selection';
import { useComputed } from './composables/use-computed';
import { useLoadDetail } from './composables/use-load-detail';

// 导入子组件
import FeeSelectionDrawerForIssue from './components/FeeSelectionDrawerForIssue.vue';
import RemarkTemplateModal from './components/RemarkTemplateModal.vue';
import SelectRemarkTemplateModal from './components/SelectRemarkTemplateModal.vue';
import InvoiceDetailModal from './components/InvoiceDetailModal.vue';

const route = useRoute();
const router = useRouter();

// ==================== 使用组合函数 ====================

const {
  editId,
  isEdit,
  loading,
  formData,
  invoiceIssueTime,
  applicantName,
  applicantCompanyName,
  applicantTaxNumber,
  applicantAddress,
  orgBankAccounts,
  clientInvoiceInfoList,
  selectedClientInvoiceInfo,
  codeInvoiceList,
  invoiceExchangeRate,
  goodsDetails,
  applicationGroupsData,
  fixedHeaderId,
  fixedCurrencyId,
  initApplicantInfo,
  getAddedAppIdsArray,
  flattenTreeData,
} = useFormData();

// ✅ 新增：发票开票状态管理（包含 editLocked）
const invoiceStatus = ref<{
  issueStatus?: number;
  redLocked?: boolean;
  redStatus?: number;
  editLocked?: boolean;
  redReason?: number;
  redInvoiceNo?: string;
  combinedStatus?: number;
}>({
  issueStatus: undefined,
  redLocked: false,
  redStatus: undefined,
  editLocked: false,
  redReason: undefined,
  redInvoiceNo: undefined,
  combinedStatus: undefined,
});

// ✅ 新增：是否已冲红（已发起过冲红，即 redStatus 非 0），基础信息区据此展示冲红字段
const isRedInvolved = computed(() => {
  const { redStatus } = invoiceStatus.value;
  return !!redStatus && redStatus !== 0;
});

// ✅ 新增：发票是否已通过接口开出——开票完成(2) 或签章失败(24)。
// 签章失败(24) 是“票已开出来、发票号有值”的终态（见对接文档 3.2/3.6），因此可冲红，
// 绝不能因非 2 就显示「税局开票」按钮（见文档「变更1」：冲红条件为 issueStatus 2/24 且 redLocked===false）。
const isInvoiceIssued = computed(() => {
  const issueStatus = invoiceStatus.value.issueStatus;
  return issueStatus === 2 || issueStatus === 24;
});

// ✅ 新增：附件列表
const attachments = ref<InvoiceIssueApi.AttachmentItemDto[]>([]);

// ✅ 新增：计算发票抬头名称（从 clientInvoiceInfoList 中查找）
const headerNameForDrawer = computed(() => {
  if (!fixedHeaderId.value || !clientInvoiceInfoList.value) return '';

  const info = clientInvoiceInfoList.value.find(
    (item: any) => item.id === fixedHeaderId.value,
  );

  const name = info?.header || '';
  console.log('🔍 计算 headerNameForDrawer:', {
    fixedHeaderId: fixedHeaderId.value,
    hasList: !!clientInvoiceInfoList.value,
    listLength: clientInvoiceInfoList.value?.length || 0,
    found: !!info,
    header: name,
  });

  return name;
});

const {
  loadCodeInvoiceList,
  handleGoodsNameChange,
  handleQuantityOrPriceChange,
  handleAmountChange,
  handleTaxRateChange,
  handleAddGoodsRow,
  handleDeleteGoodsRow,
  autoFillGoodsDetails,
  mergeGoodsDetailsFromApplications,
  recalculateGoodsDetails,
} = useGoodsDetails(
  goodsDetails,
  codeInvoiceList,
  formData,
  invoiceExchangeRate,
  flattenTreeData,
);

const { addSelectedApplicationsToForm } = useFeeManagement(
  formData,
  applicationGroupsData,
  goodsDetails,
  invoiceExchangeRate,
  codeInvoiceList,
  flattenTreeData,
  editId,
);

const {
  loadClientInvoiceInfo,
  updateOrgBankByCurrency,
  updateClientBankByCurrency,
  handleClientInvoiceHeaderChange,
  handleClientBankChange,
  clientInvoiceHeaderOptions,
  filteredClientBanks,
  filteredOrgBanks,
} = useInvoiceInfo(
  clientInvoiceInfoList,
  selectedClientInvoiceInfo,
  formData,
  orgBankAccounts,
);

const {
  remarkTemplateModalVisible,
  selectRemarkTemplateModalVisible,
  remarkTemplateData,
  handleOpenRemarkTemplateModal,
  handleOpenSelectRemarkTemplateModal,
  handleUseRemarkTemplate,
} = useTemplate(
  formData,
  applicationGroupsData,
  invoiceExchangeRate,
  flattenTreeData,
);

const {
  totalInvoiceAmount,
  totalTaxAmount,
  totalAppliedAmountOriginal,
  totalAppliedAmount,
  hasAmountDifference,
  foreignCurrencyAmount,
} = useComputed(
  goodsDetails,
  formData,
  applicationGroupsData,
  invoiceExchangeRate,
  selectedClientInvoiceInfo,
  orgBankAccounts,
);

const { handleFeeSelectionSave } = useFeeSelection(
  formData,
  applicationGroupsData,
  goodsDetails,
  invoiceExchangeRate,
  codeInvoiceList,
  fixedHeaderId,
  fixedCurrencyId,
  loadClientInvoiceInfo,
  updateOrgBankByCurrency,
  addSelectedApplicationsToForm,
  mergeGoodsDetailsFromApplications,
  autoFillGoodsDetails,
  router,
  editId,
  isEdit,
  invoiceIssueTime,
);

const { loadDetail, loadDetailWithoutGoods } = useLoadDetail(
  editId,
  formData,
  goodsDetails,
  applicationGroupsData,
  invoiceExchangeRate,
  applicantName,
  invoiceIssueTime,
  loadClientInvoiceInfo,
  updateOrgBankByCurrency,
  fixedHeaderId, // ✅ 新增：传入 fixedHeaderId
  fixedCurrencyId, // ✅ 新增：传入 fixedCurrencyId
  invoiceStatus, // ✅ 新增：传入 invoiceStatus，用于在加载详情时同步更新状态
  attachments, // ✅ 新增：传入 attachments，用于在加载详情时同步更新附件列表
);

// ==================== UI 状态 ====================

// 费用选择抽屉相关
const feeSelectionDrawerRef = ref();
const drawerVisible = ref(false);

// 查看发票明细弹窗相关状态
const invoiceDetailModalVisible = ref(false);

const { submitLoading, handleSubmit, handleCancel } = useSubmit(
  formData,
  goodsDetails,
  invoiceExchangeRate,
  invoiceIssueTime,
  editId,
  isEdit,
);

// ✅ 新增：冲红弹窗相关状态
const redModalVisible = ref(false);
const redReason = ref<number>(1);

/** 打开费用选择抽屉 */
function handleOpenFeeDrawer() {
  feeSelectionDrawerRef.value?.handleOpenFeeDrawer();
}

/** ✅ 新增：刷新发票状态 */
async function refreshInvoiceStatus() {
  if (!editId.value) return;
  try {
    // 直接从详情接口获取最新状态（不再调用 queryIssueResult）
    const detail = await getInvoiceIssueDetail(editId.value);
    invoiceStatus.value = {
      issueStatus: detail.issueStatus,
      redLocked: detail.redLocked || false,
      redStatus: detail.redStatus,
      editLocked: detail.editLocked,
      redReason: detail.redReason,
      redInvoiceNo: detail.redInvoiceNo,
      combinedStatus: detail.combinedStatus,
    };
    // 同步到 formData
    formData.value.editLocked = detail.editLocked;

    // ✅ 新增：更新附件列表
    attachments.value = detail.attachments || [];
  } catch (error) {
    console.error('❌ 获取发票状态失败:', error);
  }
}

/** ✅ 新增：税局开票 / 发票冲红 */
async function handleTaxAction() {
  if (!editId.value) {
    message.warning('请先保存发票以获取ID');
    return;
  }

  // 开票完成(2) 或签章失败(24) 都算“票已开出”，走冲红分支（见文档「变更1」）
  const isIssued = isInvoiceIssued.value;
  const isRedLocked = invoiceStatus.value.redLocked;
  const isEditLocked = invoiceStatus.value.editLocked;

  // 如果处于编辑锁定状态，且不是“已开出(开票完成/签章失败)”状态下的冲红操作，则禁止
  if (isEditLocked && !isIssued) {
    message.warning('该发票开出已锁定，只能查询，不能执行此操作');
    return;
  }

  // 如果是因为冲红被锁，禁止所有操作
  if (isRedLocked) {
    message.warning('该发票正在冲红中或已冲红，无法执行此操作');
    return;
  }

  if (isIssued) {
    // 打开冲红弹窗
    redReason.value = 1; // 重置默认原因
    redModalVisible.value = true;
  } else {
    // 税局开票逻辑
    Modal.confirm({
      title: '确认开票',
      content: `确定要对发票发起税局开票吗？`,
      onOk: async () => {
        try {
          loading.value = true;
          await issueByInterface(editId.value!);
          message.success('开票请求已提交，请稍后刷新查看结果');
          await refreshInvoiceStatus(); // 只刷新状态
          await loadDetailWithoutGoods(); // 刷新基础数据
        } catch (error) {
          console.error('❌ 开票失败:', error);
        } finally {
          loading.value = false;
        }
      },
    });
  }
}

/** ✅ 新增：确认冲红 */
async function handleConfirmRed() {
  try {
    loading.value = true;
    await applyRedAsync({
      id: editId.value!,
      redReason: redReason.value,
    });
    message.success('冲红申请已提交');
    redModalVisible.value = false;
    await refreshInvoiceStatus(); // 只刷新状态
    await loadDetailWithoutGoods(); // 刷新基础数据
  } catch (error) {
    console.error('❌ 冲红失败:', error);
  } finally {
    loading.value = false;
  }
}

/** ✅ 新增：刷新开票/冲红进度 */
async function handleRefreshProgress() {
  if (!editId.value) return;

  try {
    loading.value = true;

    // 开票完成(2) 或签章失败(24) 都算“票已开出”，据此决定是否查冲红进度
    const isIssued = isInvoiceIssued.value;
    const redStatus = invoiceStatus.value.redStatus;

    // 已开票且已申请过冲红（redStatus 非 0）时，调用 queryRedResult 查询冲红进度：
    // 该接口不只查询，还会推进整条链路（查确认单状态、纸票自动开红票、回填红票号并保存红票附件）；
    // 未申请过冲红的记录调用会报错，所以必须先判 redStatus（见对接文档）
    if (isIssued && redStatus && redStatus !== 0) {
      const redState = await queryRedResult(editId.value);
      // 失败态（确认单作废/申请失败）优先展示失败原因，
      // 否则直接展示 redStatusText（含下一步操作说明，详情/列表出参里没有该字段）
      if (redState.redFailCause) {
        message.error(`冲红失败：${redState.redFailCause}`, 6);
      } else if (redState.redStatusText) {
        message.info(redState.redStatusText, 6);
      }
    } else {
      // 未冲红，调用 queryIssueResult 刷新发票开票进度
      await queryIssueResult(editId.value);
    }

    // 重新拉取详情更新状态与页面数据
    await refreshInvoiceStatus(); // 刷新本地状态（含附件列表）
    await loadDetailWithoutGoods(); // 刷新页面数据
    message.success('进度已刷新');
  } catch (error) {
    console.error('❌ 刷新进度失败:', error);
  } finally {
    loading.value = false;
  }
}

/** 打开查看发票明细弹窗 */
function handleOpenInvoiceDetailModal() {
  // 无论是否有数据，都打开弹窗（空数据时表格显示为空）
  invoiceDetailModalVisible.value = true;
}

/** ✅ 新增：查看附件 */
function viewAttachment(item: InvoiceIssueApi.AttachmentItemDto) {
  if (item.url) {
    const url = buildAttachmentUrl(item.url);
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    message.warning('附件链接不存在');
  }
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

/** 处理发票明细删除后的刷新 */
async function handleInvoiceDetailRefresh() {
  console.log('🔄 发票明细已删除，重新加载数据...');
  if (editId.value) {
    await refreshInvoiceStatus(); // 确保状态也是最新的
    await loadDetailWithoutGoods();
    message.success('数据已刷新');
  }
}

/** 处理商品明细更新（删除时调用） */
function handleUpdateGoodsDetails(newGoodsDetails: any[]) {
  console.log('📦 收到新的商品明细数据:', newGoodsDetails.length, '条');

  // ✅ 直接更新父组件的商品明细
  goodsDetails.value = [];
  nextTick(() => {
    goodsDetails.value = newGoodsDetails;
    console.log('✅ 商品明细已更新:', goodsDetails.value.length, '条');
  });
}

/** 获取冲红状态中文标签（完整枚举见对接文档） */
function getRedStatusLabel(status?: number): string {
  if (status === undefined || status === null) return '-';
  const map: Record<number, string> = {
    0: '未冲红',
    15: '红字确认单申请中',
    1: '冲红中·确认单已生效',
    2: '冲红中·待购方确认',
    3: '冲红中·待我方确认',
    4: '冲红中·已确认，待开红票',
    5: '冲红失败（确认单作废）',
    6: '冲红失败（确认单作废）',
    7: '冲红失败（超时未确认）',
    8: '冲红失败（发起方已撤销）',
    9: '冲红失败（确认单作废）',
    16: '冲红失败（申请失败）',
    99: '冲红完成',
  };
  return map[status] || String(status);
}

/** 获取冲红状态 Tag 颜色：进行中橙、失败红、完成红 */
function getRedStatusColor(status?: number): string {
  if (!status || status === 0) return 'default';
  if (status === 99) return 'red';
  if ((status >= 5 && status <= 9) || status === 16) return 'error';
  return 'orange';
}

/** 获取冲红原因中文标签 */
function getRedReasonLabel(reason?: number): string {
  if (!reason) return '-';
  const map: Record<number, string> = {
    1: '销货退回',
    2: '开票有误',
    3: '服务中止',
    4: '销售折让',
  };
  return map[reason] || String(reason);
}

/** 根据发票类型获取标题 */
function getInvoiceTitle(invoiceType: string): string {
  const option = invoiceTypeOptions.find((opt) => opt.value === invoiceType);
  return option ? option.label : '增值税电子普通发票';
}

/** 处理发票类型变化 */
function handleInvoiceTypeChange({ key }: any) {
  formData.value.invoiceType = key;
}

/** 发票类型选项 */
const invoiceTypeOptions = [
  {
    label: '普通发票(电票)',
    value: 'p',
  },
  {
    label: '普通发票(纸票)',
    value: 'c',
  },
  {
    label: '专用发票',
    value: 's',
  },
];

/** 税率选项 */
const taxRateOptions = [
  { label: '免税', value: 0 },
  { label: '6%', value: 6 },
  { label: '9%', value: 9 },
  { label: '13%', value: 13 },
];

// ==================== 生命周期 ====================

onMounted(() => {
  // 初始化申请人信息
  initApplicantInfo();

  // 加载发票商品编码列表
  loadCodeInvoiceList();

  if (isEdit.value) {
    loadDetail().then(() => {
      refreshInvoiceStatus(); // 加载完详情后，立即获取一次状态
    });
  } else {
    // 新建时自动弹出费用选择抽屉
    nextTick(() => {
      handleOpenFeeDrawer();
    });
  }
});
</script>

<template>
  <Page auto-content-height>
    <!-- 顶部操作按钮 -->
    <div style="margin-bottom: 16px; text-align: right">
      <Space>
        <!-- ✅ 互斥显示的按钮：未开出→税局开票；已开出(开票完成2/签章失败24)→发票冲红 -->
        <Button
          v-if="!isInvoiceIssued"
          type="primary"
          @click="handleTaxAction"
          :disabled="
            !editId || invoiceStatus.editLocked || invoiceStatus.redLocked
          "
        >
          <template #icon>
            <IconifyIcon icon="ant-design:printer-outlined" />
          </template>
          税局开票
        </Button>

        <Button
          v-else
          danger
          @click="handleTaxAction"
          :disabled="!editId || invoiceStatus.redLocked"
        >
          <template #icon>
            <IconifyIcon icon="ant-design:undo-outlined" />
          </template>
          发票冲红
        </Button>

        <Button @click="handleRefreshProgress" :disabled="!editId">
          <template #icon>
            <IconifyIcon icon="ant-design:sync-outlined" />
          </template>
          刷新进度
        </Button>

        <Button
          type="primary"
          :loading="submitLoading"
          @click="handleSubmit"
          :disabled="invoiceStatus.editLocked"
        >
          {{ isEdit ? '保存' : '创建' }}
        </Button>
        <Button @click="handleCancel">关闭</Button>
      </Space>
    </div>

    <Card :title="isEdit ? '编辑发票开出' : '新建发票开出'">
      <Spin :spinning="loading">
        <div style="display: flex; gap: 16px">
          <!-- 左侧基础配置 -->
          <div style="flex-shrink: 0; width: 400px">
            <Card title="基础配置" size="small">
              <Form
                :model="formData"
                layout="vertical"
                :label-col="{ span: 8 }"
                :wrapper-col="{ span: 22 }"
              >
                <Form.Item label="归属组织" required>
                  <MyOrgSelect
                    v-model="formData.orgId"
                    placeholder="请选择归属组织"
                    style="width: 100%"
                    :disabled="invoiceStatus.editLocked"
                  />
                </Form.Item>

                <Form.Item label="结算单位">
                  <Input
                    :value="formData.settlementName"
                    disabled
                    placeholder="从申请发票中自动获取"
                  />
                </Form.Item>

                <Form.Item label="开票人">
                  <Input :value="applicantName" disabled />
                </Form.Item>

                <Form.Item label="开票日期">
                  <Input :value="invoiceIssueTime" disabled />
                </Form.Item>

                <Form.Item label="发票币别" required>
                  <CurrencySelect
                    v-model:value="formData.currencyId"
                    placeholder="从申请发票中自动获取"
                    style="width: 100%"
                    disabled
                  />
                </Form.Item>

                <Form.Item
                  label="开票汇率"
                  v-if="formData.currencyId && formData.currencyId !== 1"
                >
                  <InputNumber
                    v-model:value="invoiceExchangeRate"
                    :min="0"
                    :precision="4"
                    disabled
                    style="width: 100%"
                  />
                </Form.Item>

                <Form.Item label="开票方式" required>
                  <Select
                    v-model:value="formData.invoiceIssueType"
                    :options="[
                      {
                        label: '接口开票',
                        value: InvoiceIssueApi.InvoiceIssueType.NuonuoInterface,
                      },
                      {
                        label: '手动开票',
                        value: InvoiceIssueApi.InvoiceIssueType.ManualRecord,
                      },
                    ]"
                    style="width: 100%"
                    placeholder="请选择开票方式"
                    :disabled="invoiceStatus.editLocked"
                  />
                </Form.Item>

                <Form.Item label="其他备注">
                  <Input.TextArea
                    v-model:value="formData.require"
                    placeholder="请输入其他备注信息..."
                    :rows="4"
                    :disabled="invoiceStatus.editLocked"
                  />
                </Form.Item>

                <!-- ✅ 发票状态（开票状态与冲红状态合并，编辑已保存记录时始终显示） -->
                <Form.Item v-if="editId" label="发票状态">
                  <Tag
                    :color="
                      getCombinedStatusColor(invoiceStatus.combinedStatus)
                    "
                  >
                    {{ getCombinedStatusLabel(invoiceStatus.combinedStatus) }}
                  </Tag>
                </Form.Item>

                <!-- ✅ 新增：冲红信息（发票已冲红时显示） -->
                <template v-if="isRedInvolved">
                  <Form.Item label="冲红状态">
                    <Tag :color="getRedStatusColor(invoiceStatus.redStatus)">
                      {{ getRedStatusLabel(invoiceStatus.redStatus) }}
                    </Tag>
                  </Form.Item>

                  <Form.Item label="冲红原因">
                    <Input
                      :value="getRedReasonLabel(invoiceStatus.redReason)"
                      disabled
                    />
                  </Form.Item>

                  <Form.Item label="关联冲红发票号码">
                    <Input
                      :value="invoiceStatus.redInvoiceNo || '-'"
                      disabled
                    />
                  </Form.Item>
                </template>

                <!-- 附件显示区域 -->
                <div v-if="attachments && attachments.length > 0" class="mt-8">
                  <div
                    style="margin-bottom: 8px; font-weight: 500; color: #262626"
                  >
                    发票附件 ({{ attachments.length }})
                  </div>
                  <div class="attachment-list">
                    <div
                      v-for="(item, index) in attachments"
                      :key="index"
                      class="attachment-item"
                    >
                      <span
                        class="attachment-name"
                        :title="item.friendlyFileName"
                      >
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
              </Form>
            </Card>
          </div>

          <!-- 右侧发票区域 -->
          <div style="flex: 1; min-width: 0">
            <Card>
              <template #title>
                <div style="width: 100%; text-align: center">
                  <Dropdown
                    :trigger="['click']"
                    :disabled="invoiceStatus.editLocked"
                  >
                    <span
                      style="
                        display: inline-flex;
                        gap: 8px;
                        align-items: center;
                        font-size: 24px;
                        color: #c41e3a;
                        cursor: pointer;
                      "
                    >
                      {{ getInvoiceTitle(formData.invoiceType) }}
                      <IconifyIcon icon="ant-design:down-outlined" />
                    </span>
                    <template #overlay>
                      <Menu @click="handleInvoiceTypeChange">
                        <MenuItem
                          v-for="option in invoiceTypeOptions"
                          :key="option.value"
                        >
                          {{ option.label }}
                        </MenuItem>
                      </Menu>
                    </template>
                  </Dropdown>
                </div>
              </template>

              <template #extra>
                <div style="text-align: right">
                  <div style="font-size: 12px; color: #999">发票号码:</div>
                  <Input
                    v-model:value="formData.invoiceNo"
                    placeholder="自动生成/手动输入"
                    style="width: 200px; text-align: right"
                    :disabled="invoiceStatus.editLocked"
                  />
                </div>
              </template>

              <!-- 购买方和销售方信息 -->
              <div style="display: flex; gap: 16px; margin-bottom: 16px">
                <div
                  style="
                    flex: 1;
                    height: 130px;
                    border: 1px solid #c41e3a;
                    border-radius: 4px;
                  "
                >
                  <div style="display: flex; gap: 12px">
                    <div
                      style="
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        width: 40px;
                        padding: 10px 5px;
                        font-size: 14px;
                        font-weight: bold;
                        color: #c41e3a;
                        background-color: rgb(196 30 58 / 10%);
                        border-right: 1px solid #c41e3a;
                      "
                    >
                      购买方信息
                    </div>
                    <div style="flex: 1; padding: 8px; font-size: 13px">
                      <div
                        style="display: flex; align-items: center; height: 28px"
                      >
                        <span
                          style="
                            min-width: 80px;
                            margin-right: 8px;
                            color: #666;
                          "
                          ><strong>名 称:</strong></span
                        >
                        <Select
                          :value="selectedClientInvoiceInfo?.id"
                          :options="clientInvoiceHeaderOptions"
                          style="flex: 1"
                          size="small"
                          placeholder="请选择发票抬头"
                          :disabled="
                            !!fixedHeaderId || invoiceStatus.editLocked
                          "
                          @change="handleClientInvoiceHeaderChange"
                        />
                      </div>
                      <div
                        style="display: flex; align-items: center; height: 28px"
                      >
                        <span
                          style="
                            min-width: 80px;
                            margin-right: 8px;
                            color: #666;
                          "
                          ><strong>纳税人识别号:</strong></span
                        >
                        <span style="flex: 1">{{
                          selectedClientInvoiceInfo?.taxNum || '(选填)'
                        }}</span>
                      </div>
                      <div
                        style="display: flex; align-items: center; height: 28px"
                      >
                        <span
                          style="
                            min-width: 80px;
                            margin-right: 8px;
                            color: #666;
                          "
                          ><strong>地址、电话:</strong></span
                        >
                        <span style="flex: 1"
                          >{{ selectedClientInvoiceInfo?.address || '(选填)' }}
                          {{ selectedClientInvoiceInfo?.tel || '' }}</span
                        >
                      </div>
                      <div
                        style="display: flex; align-items: center; height: 28px"
                      >
                        <span
                          style="
                            min-width: 80px;
                            margin-right: 8px;
                            color: #666;
                          "
                          ><strong>开户行及账号:</strong></span
                        >
                        <Select
                          v-model:value="formData.clientInvoiceBankId"
                          :options="
                            filteredClientBanks.map((b: any) => ({
                              label: `${b.bankName} - ${b.bankAccount}`,
                              value: b.id,
                            }))
                          "
                          style="flex: 1"
                          size="small"
                          placeholder="请选择银行"
                          :disabled="invoiceStatus.editLocked"
                          @change="handleClientBankChange"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  style="
                    flex: 1;
                    height: 130px;
                    border: 1px solid #c41e3a;
                    border-radius: 4px;
                  "
                >
                  <div style="display: flex; gap: 12px">
                    <div
                      style="
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        width: 40px;
                        padding: 10px 5px;
                        font-size: 14px;
                        font-weight: bold;
                        color: #c41e3a;
                        background-color: rgb(196 30 58 / 10%);
                        border-right: 1px solid #c41e3a;
                      "
                    >
                      销售方信息
                    </div>
                    <div style="flex: 1; padding: 8px; font-size: 13px">
                      <div
                        style="display: flex; align-items: center; height: 28px"
                      >
                        <span
                          style="
                            min-width: 80px;
                            margin-right: 8px;
                            color: #666;
                          "
                          ><strong>名 称:</strong></span
                        >
                        <span style="flex: 1">{{
                          applicantCompanyName || '-'
                        }}</span>
                      </div>
                      <div
                        style="display: flex; align-items: center; height: 28px"
                      >
                        <span
                          style="
                            min-width: 80px;
                            margin-right: 8px;
                            color: #666;
                          "
                          ><strong>纳税人识别号:</strong></span
                        >
                        <span style="flex: 1">{{
                          applicantTaxNumber || '-'
                        }}</span>
                      </div>
                      <div
                        style="display: flex; align-items: center; height: 28px"
                      >
                        <span
                          style="
                            min-width: 80px;
                            margin-right: 8px;
                            color: #666;
                          "
                          ><strong>地址、电话:</strong></span
                        >
                        <span style="flex: 1">{{
                          applicantAddress || '-'
                        }}</span>
                      </div>
                      <div
                        style="display: flex; align-items: center; height: 28px"
                      >
                        <span
                          style="
                            min-width: 80px;
                            margin-right: 8px;
                            color: #666;
                          "
                          ><strong>开户行及账号:</strong></span
                        >
                        <Select
                          v-model:value="formData.orgBankAccountId"
                          :options="
                            filteredOrgBanks.map((b: any) => ({
                              label: `${b.bankName} - ${b.bankAccount}`,
                              value: b.id,
                            }))
                          "
                          style="flex: 1"
                          size="small"
                          placeholder="请选择银行"
                          :disabled="invoiceStatus.editLocked"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- ✅ 商品明细操作按钮 - 移到表格上方 -->
              <div
                style="
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  padding: 8px;
                  background: rgb(196 30 58 / 3%);
                  border-top: 1px solid #c41e3a;
                  border-right: 1px solid #c41e3a;
                  border-left: 1px solid #c41e3a;
                "
              >
                <Space>
                  <Button
                    type="primary"
                    size="small"
                    @click="handleOpenFeeDrawer"
                    :disabled="invoiceStatus.editLocked"
                  >
                    <template #icon
                      ><IconifyIcon icon="ant-design:import-outlined"
                    /></template>
                    导入发票
                  </Button>
                  <Button size="small" @click="handleOpenInvoiceDetailModal">
                    <template #icon
                      ><IconifyIcon icon="ant-design:eye-outlined"
                    /></template>
                    查看发票明细
                  </Button>
                </Space>
              </div>

              <!-- 商品明细表格 -->
              <div
                style="
                  height: 240px;
                  overflow-y: auto;
                  border-right: 1px solid #c41e3a;
                  border-bottom: none;
                  border-left: 1px solid #c41e3a;
                "
              >
                <Table
                  :columns="[
                    {
                      title: '操作',
                      key: 'action',
                      width: 80,
                      fixed: 'left',
                      align: 'center',
                    },
                    {
                      title: '货物或应税劳务名称',
                      dataIndex: 'codeInvoiceId',
                      key: 'codeInvoiceId',
                      width: 200,
                    },
                    {
                      title: '规格型号',
                      dataIndex: 'specification',
                      key: 'specification',
                      width: 150,
                    },
                    {
                      title: '单位',
                      dataIndex: 'unit',
                      key: 'unit',
                      width: 80,
                    },
                    {
                      title: '数量',
                      dataIndex: 'quantity',
                      key: 'quantity',
                      width: 80,
                    },
                    {
                      title: '单价',
                      dataIndex: 'unitPrice',
                      key: 'unitPrice',
                      width: 100,
                    },
                    {
                      title: '金额',
                      dataIndex: 'amount',
                      key: 'amount',
                      width: 120,
                    },
                    {
                      title: '不含税金额',
                      dataIndex: 'noTaxAmount',
                      key: 'noTaxAmount',
                      width: 120,
                    },
                    {
                      title: '税率',
                      dataIndex: 'taxRate',
                      key: 'taxRate',
                      width: 80,
                    },
                    {
                      title: '税额',
                      dataIndex: 'taxAmount',
                      key: 'taxAmount',
                      width: 100,
                    },
                  ]"
                  :data-source="goodsDetails"
                  :pagination="false"
                  bordered
                  size="small"
                  row-key="id"
                  :scroll="{ x: 1110 }"
                  :style="{
                    borderTop: 'none',
                    borderBottom: 'none',
                  }"
                >
                  <template #bodyCell="{ column, record, index }">
                    <template v-if="column.key === 'action'">
                      <Space
                        :size="2"
                        style="justify-content: center; width: 100%"
                      >
                        <Button
                          type="link"
                          @click="handleAddGoodsRow(index)"
                          style="padding: 5px; font-size: 18px; color: #52c41a"
                          :disabled="invoiceStatus.editLocked"
                        >
                          <IconifyIcon icon="ant-design:plus-circle-outlined" />
                        </Button>
                        <Button
                          type="link"
                          danger
                          @click="handleDeleteGoodsRow(index)"
                          :disabled="
                            goodsDetails.length <= 1 || invoiceStatus.editLocked
                          "
                          style="padding: 5px; font-size: 18px"
                        >
                          <IconifyIcon
                            icon="ant-design:minus-circle-outlined"
                          />
                        </Button>
                      </Space>
                    </template>
                    <template v-else-if="column.key === 'codeInvoiceId'">
                      <Select
                        v-model:value="record.codeInvoiceId"
                        :options="
                          codeInvoiceList.map((item) => ({
                            label: item.name,
                            value: item.id,
                          }))
                        "
                        style="width: 100%"
                        size="small"
                        placeholder="请选择"
                        :disabled="invoiceStatus.editLocked"
                        @change="() => handleGoodsNameChange(record, index)"
                      />
                    </template>
                    <template v-else-if="column.key === 'specification'">
                      <Input
                        v-model:value="record.specification"
                        size="small"
                        :disabled="invoiceStatus.editLocked"
                      />
                    </template>
                    <template v-else-if="column.key === 'unit'">
                      <Select
                        v-model:value="record.unit"
                        :options="[{ label: '票', value: '票' }]"
                        style="width: 100%"
                        size="small"
                        :disabled="invoiceStatus.editLocked"
                      />
                    </template>
                    <template v-else-if="column.key === 'quantity'">
                      <InputNumber
                        v-model:value="record.quantity"
                        :min="0"
                        :precision="2"
                        style="width: 100%"
                        size="small"
                        :disabled="invoiceStatus.editLocked"
                        @change="() => handleQuantityOrPriceChange(record)"
                      />
                    </template>
                    <template v-else-if="column.key === 'unitPrice'">
                      <InputNumber
                        v-model:value="record.unitPrice"
                        :min="0"
                        :precision="2"
                        style="width: 100%"
                        size="small"
                        :disabled="invoiceStatus.editLocked"
                        @change="() => handleQuantityOrPriceChange(record)"
                      />
                    </template>
                    <template v-else-if="column.key === 'amount'">
                      <InputNumber
                        v-model:value="record.amount"
                        :min="0"
                        :precision="2"
                        style="width: 100%"
                        size="small"
                        :disabled="invoiceStatus.editLocked"
                        @change="() => handleAmountChange(record)"
                      />
                    </template>
                    <template v-else-if="column.key === 'noTaxAmount'">
                      {{ record.noTaxAmount?.toFixed(2) || '0.00' }}
                    </template>
                    <template v-else-if="column.key === 'taxRate'">
                      <Select
                        v-model:value="record.taxRate"
                        :options="taxRateOptions"
                        style="width: 100%"
                        size="small"
                        placeholder="选择税率"
                        allow-clear
                        :disabled="invoiceStatus.editLocked"
                        @change="() => handleTaxRateChange(record)"
                      />
                    </template>
                    <template v-else-if="column.key === 'taxAmount'">
                      {{ record.taxAmount?.toFixed(2) || '0.00' }}
                    </template>
                  </template>
                </Table>
              </div>

              <!-- 合计行 -->
              <div
                style="
                  padding: 12px;
                  background: rgb(196 30 58 / 5%);
                  border-top: 2px solid #c41e3a;
                  border-right: 1px solid #c41e3a;
                  border-bottom: 1px solid #c41e3a;
                  border-left: 1px solid #c41e3a;
                "
              >
                <Space :size="16" wrap>
                  <span
                    style="font-size: 14px; font-weight: bold; color: #c41e3a"
                    >合计</span
                  >
                  <span style="font-size: 13px"
                    ><strong>发票金额:</strong>
                    {{ totalInvoiceAmount.toFixed(2) }}</span
                  >
                  <span style="font-size: 13px"
                    ><strong>税额:</strong>
                    {{ totalTaxAmount.toFixed(2) }}</span
                  >
                  <span style="font-size: 13px"
                    ><strong>申请金额:</strong>
                    {{ totalAppliedAmount.toFixed(2) }}</span
                  >
                  <!-- <span
                    v-if="foreignCurrencyAmount !== null"
                    style="font-size: 13px; color: #1890ff"
                  >
                    <strong>申请币别金额:</strong>
                    {{ foreignCurrencyAmount.toFixed(2) }}
                  </span> -->
                </Space>
                <div
                  v-if="hasAmountDifference"
                  style="
                    margin-top: 8px;
                    font-size: 13px;
                    font-weight: bold;
                    color: #ff4d4f;
                  "
                >
                  ⚠️ 发票金额与申请金额有差异请核对!
                </div>
              </div>

              <!-- 备注信息 -->
              <div style="margin-top: 16px">
                <div
                  style="
                    height: auto;
                    border: 1px solid #c41e3a;
                    border-radius: 4px;
                  "
                >
                  <div style="display: flex; gap: 12px">
                    <div
                      style="
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        width: 40px;
                        padding: 10px 5px;
                        font-size: 14px;
                        font-weight: bold;
                        color: #c41e3a;
                        background-color: rgb(196 30 58 / 10%);
                        border-right: 1px solid #c41e3a;
                      "
                    >
                      备注信息
                    </div>
                    <div style="flex: 1; padding: 8px">
                      <div style="margin-bottom: 8px">
                        <Space>
                          <Button
                            size="small"
                            @click="handleOpenSelectRemarkTemplateModal"
                            :disabled="invoiceStatus.editLocked"
                          >
                            <template #icon
                              ><IconifyIcon
                                icon="ant-design:file-text-outlined"
                            /></template>
                            使用模板
                          </Button>
                          <Button
                            size="small"
                            @click="handleOpenRemarkTemplateModal"
                            :disabled="invoiceStatus.editLocked"
                          >
                            <template #icon
                              ><IconifyIcon icon="ant-design:setting-outlined"
                            /></template>
                            管理模板
                          </Button>
                        </Space>
                      </div>
                      <Input.TextArea
                        v-model:value="formData.remark"
                        placeholder="请输入备注"
                        :rows="6"
                        :disabled="invoiceStatus.editLocked"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </Spin>
    </Card>

    <!-- 费用选择抽屉 -->
    <FeeSelectionDrawerForIssue
      ref="feeSelectionDrawerRef"
      v-model:visible="drawerVisible"
      :settlement-id="formData.settlementId"
      :settlement-name="formData.settlementName"
      :currency-id="formData.currencyId"
      :header-id="fixedHeaderId"
      :header-name="headerNameForDrawer"
      :added-app-ids="getAddedAppIdsArray()"
      :application-groups-data="applicationGroupsData"
      :invoice-exchange-rate="invoiceExchangeRate"
      @save="handleFeeSelectionSave"
    />

    <!-- 备注模板管理弹窗 -->
    <RemarkTemplateModal
      v-model:visible="remarkTemplateModalVisible"
      :settlement-id="formData.settlementId"
      :currency-id="formData.currencyId"
      :fee-details="applicationGroupsData"
      :is-edit="isEdit"
      @use-template="handleUseRemarkTemplate"
    />

    <!-- 选择备注模板弹窗 -->
    <SelectRemarkTemplateModal
      v-model:visible="selectRemarkTemplateModalVisible"
      :settlement-id="formData.orgId"
      :currency-id="formData.currencyId"
      :fee-details="applicationGroupsData"
      :template-data="remarkTemplateData"
      @use-template="handleUseRemarkTemplate"
    />

    <!-- 查看发票明细弹窗 -->
    <InvoiceDetailModal
      v-model:visible="invoiceDetailModalVisible"
      :application-groups-data="applicationGroupsData"
      :invoice-issue-id="editId"
      @refresh="handleInvoiceDetailRefresh"
      @update-goods-details="handleUpdateGoodsDetails"
    />

    <!-- ✅ 新增：冲红确认弹窗 -->
    <Modal
      v-model:open="redModalVisible"
      title="确认冲红"
      @ok="handleConfirmRed"
      @cancel="redModalVisible = false"
    >
      <div>
        <p>被冲红发票号：{{ formData.invoiceNo }}</p>
        <div style="margin-top: 16px">
          <span>冲红原因：</span>
          <Select
            v-model:value="redReason"
            style="width: 100%; margin-top: 8px"
          >
            <Select.Option :value="1">销货退回</Select.Option>
            <Select.Option :value="2">开票有误</Select.Option>
            <Select.Option :value="3">服务中止</Select.Option>
            <Select.Option :value="4">销售折让</Select.Option>
          </Select>
        </div>
      </div>
    </Modal>
  </Page>
</template>

<style scoped>
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

.mt-4 {
  margin-top: 16px;
}
</style>
