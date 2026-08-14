<script lang="ts" setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { Page } from '@vben/common-ui';
import { useRouter } from 'vue-router';
import {
  Button,
  Card,
  Dropdown,
  message,
  Modal,
  Form,
  Input,
  InputNumber,
  Menu,
  MenuItem,
  Space,
  Spin,
  Table,
} from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';

// 导入组合函数
import { useFormData } from './composables/use-form-data';
import { useFeeManagement } from './composables/use-fee-management';
import { useGoodsDetails } from './composables/use-goods-details';
import { useInvoiceInfo } from './composables/use-invoice-info';
import { useTemplate } from './composables/use-template';
import { useSubmit } from './composables/use-submit';
import { useFeeSelectionSave } from './composables/use-fee-selection';
import { useComputed } from './composables/use-computed';
import { useLoadDetail } from './composables/use-load-detail';

// ✅ 新增：导入刷新标记工具函数
import {
  markListShouldRefresh,
  returnToListWithRefresh,
} from '#/utils/list-refresh-flag';

// 导入子组件
import RemarkTemplateModal from './components/RemarkTemplateModal.vue';
import SelectRemarkTemplateModal from './components/SelectRemarkTemplateModal.vue';
import FeeSelectionDrawer from './components/FeeSelectionDrawer.vue';
import FeeDetailModal from './components/FeeDetailModal.vue';
import ClientInvoiceInfoSelector from './components/ClientInvoiceInfoSelector.vue';
import { Select } from 'ant-design-vue';
import { CurrencySelect, MyOrgSelect } from '#/adapter/component';
import { InvoiceApplicationApi } from '#/api/Invoice/invoiceRequest';

// ==================== 初始化路由 ====================
const router = useRouter();

// ==================== 使用组合函数 ====================

const {
  editId,
  isEdit,
  isReadOnly,
  loading,
  formData,
  applicationDate,
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
  feeGroupsData,
  selectedCurrencyCode,
  initApplicantInfo,
  getAddedFeeIdsArray,
  flattenTreeData,
} = useFormData();

// ✅ 新增：计算属性 - 获取结算对象名称
const settlementObjectName = computed(() => {
  // 从 feeGroupsData 中获取第一个费用的结算单位名称
  if (feeGroupsData.value && feeGroupsData.value.length > 0) {
    const firstGroup = feeGroupsData.value[0];
    if (firstGroup.feeDetails && firstGroup.feeDetails.length > 0) {
      return firstGroup.feeDetails[0].settlementUnit || '-';
    }
  }
  return '-';
});

const {
  handleGoodsNameChange,
  handleQuantityOrPriceChange,
  handleAmountChange,
  handleTaxRateChange,
  handleAddGoodsRow,
  handleDeleteGoodsRow,
  autoFillGoodsDetails,
  mergeAmountToExistingGoods,
  loadCodeInvoiceList,
} = useGoodsDetails(
  goodsDetails,
  codeInvoiceList,
  formData,
  invoiceExchangeRate,
  flattenTreeData,
  feeGroupsData, // ✅ 传递费用组数据
);

const {
  addSelectedFeesToForm,
  handleDeleteFee: deleteFeeBase,
  recalculateGoodsDetails,
} = useFeeManagement(
  formData,
  feeGroupsData,
  goodsDetails,
  invoiceExchangeRate,
  codeInvoiceList,
  flattenTreeData,
);

const {
  loadClientInvoiceInfo,
  updateOrgBankByCurrency,
  handleClientInvoiceInfoChange,
  handleClientInvoiceHeaderChange,
  filteredClientBanks,
  filteredOrgBanks,
  clientInvoiceHeaderOptions,
} = useInvoiceInfo(
  formData,
  clientInvoiceInfoList,
  selectedClientInvoiceInfo,
  orgBankAccounts,
);

const {
  handleOpenSelectRemarkTemplateModal,
  handleUseTemplate,
  remarkTemplateData,
} = useTemplate(
  formData,
  feeGroupsData,
  invoiceExchangeRate,
  filteredClientBanks,
  filteredOrgBanks,
  flattenTreeData,
);

const {
  taxRateOptions,
  invoiceTypeOptions,
  getInvoiceTitle,
  totalInvoiceAmount,
  totalTaxAmount,
  totalAppliedAmount,
  hasAmountDifference,
  foreignCurrencyAmount,
} = useComputed(
  goodsDetails,
  formData,
  invoiceExchangeRate,
  selectedCurrencyCode,
);

const { submitLoading, handleSubmit, handleDirectSubmit, handleCancel } =
  useSubmit(formData, goodsDetails, isEdit, editId);

const { handleFeeSelectionSave } = useFeeSelectionSave(
  formData,
  feeGroupsData,
  goodsDetails,
  invoiceExchangeRate,
  selectedCurrencyCode,
  codeInvoiceList, // ✅ 传递发票商品编码列表
  loadCodeInvoiceList, // ✅ 传递加载发票商品编码列表函数
  addSelectedFeesToForm,
  autoFillGoodsDetails,
  mergeAmountToExistingGoods,
  loadClientInvoiceInfo,
  updateOrgBankByCurrency,
  flattenTreeData, // ✅ 传递扁平化树形数据函数
  loadDefaultRemarkTemplate, // ✅ 传递默认备注模板加载函数
  (ids: string[]) => {
    // ✅ 新增开票申请成功后的回调 - 打开所有开票申请的tab页
    console.log('✅ 开票申请创建成功，IDs:', ids);

    if (ids && ids.length > 0) {
      // 第一个ID使用replace替换当前页面
      const firstId = ids[0];
      router.replace({
        path: `/fee-management/invoice-application/${firstId}/edit`,
      });

      // 其他ID在新tab中打开
      if (ids.length > 1) {
        setTimeout(() => {
          ids.slice(1).forEach((id) => {
            // 使用router.push打开新tab
            router.push({
              path: `/fee-management/invoice-application/${id}/edit`,
            });
            console.log('📑 已打开开票申请tab:', id);
          });
        }, 300); // 延迟300ms，确保第一个tab已经打开
      }
    }
  },
  handleFeeDetailRefresh, // ✅ 传递刷新数据的回调
);

const { loadDetail } = useLoadDetail(
  editId,
  isEdit,
  isReadOnly,
  loading,
  formData,
  goodsDetails,
  feeGroupsData,
  selectedClientInvoiceInfo,
  invoiceExchangeRate,
  selectedCurrencyCode,
  applicantName,
  applicationDate,
  loadClientInvoiceInfo,
  updateOrgBankByCurrency,
);

// ✅ 新增：处理费用明细刷新（删除后重新加载）
async function handleFeeDetailRefresh() {
  console.log('🔄 费用明细已删除，重新加载数据...');
  if (editId.value) {
    // 先关闭弹窗
    feeDetailModalVisible.value = false;

    // 重新加载详情数据
    await loadDetail();

    // ✅ 关键修复：删除费用后，根据剩余的费用重新生成商品明细
    console.log('🔄 开始重新计算商品明细...');
    await recalculateGoodsDetails();
    console.log('✅ 商品明细重新计算完成');

    // 重新构建费用明细数据
    const items = formData.value.invoiceApplicationItems || [];
    if (items.length > 0 && feeGroupsData.value.length > 0) {
      try {
        const allFees = flattenTreeData(feeGroupsData.value);
        const selectedDetails: any[] = [];
        const processedOrders = new Set<string>();

        items.forEach((item: any) => {
          // ✅ 修复：查找费用时，尝试多种ID格式（带前缀和不带前缀）
          const fee = allFees.find((f: any) => {
            // 尝试直接匹配 orderFee.id
            if (f.orderFee?.id === item.orderFeeId) return true;

            // 尝试匹配带 child_ 前缀的ID
            if (f.id === `child_${item.orderFeeId}`) return true;

            // 尝试从 f.id 中提取原始ID（如果 f.id 是 child_xxx 格式）
            if (f.id && f.id.startsWith('child_')) {
              const originalId = f.id.replace('child_', '');
              if (originalId === String(item.orderFeeId)) return true;
            }

            return false;
          });

          if (fee) {
            // ✅ 修复：获取 orderId 时也要处理前缀
            let orderId = fee.parentId;
            if (orderId && orderId.startsWith('parent_')) {
              orderId = orderId.replace('parent_', '');
            }

            if (!processedOrders.has(orderId)) {
              // ✅ 修复：查找父节点时也要处理前缀
              const parentFee = allFees.find((f: any) => {
                if (f.id === orderId) return true;
                if (f.id === `parent_${orderId}`) return true;
                return false;
              });

              if (parentFee) {
                const parentNode: any = {
                  id: parentFee.id,
                  parentId: null,
                  transportOrder: parentFee.transportOrder,
                  seaExport: parentFee.transportOrder?.seaExport,
                  orderFees: parentFee.orderFees,
                  commissionNum: parentFee.transportOrder.commissionNum,
                  mblNum: parentFee.transportOrder.mblNum || '-',
                  bookingNum: parentFee.transportOrder.bookingNum || '-',
                  clientName: parentFee.transportOrder.clientName,
                  bizType: '-',
                  carrier:
                    parentFee.transportOrder?.seaExport?.carrier?.cnName || '-',
                  company: parentFee.transportOrder.orgs?.at(0)?.name || '-',
                  feeDetails: [] as any[],
                };
                selectedDetails.push(parentNode);
                processedOrders.add(orderId);
              }
            }

            const parentNode = selectedDetails.find(
              (p: any) => p.id === orderId || p.id === `parent_${orderId}`,
            );
            if (parentNode) {
              parentNode.feeDetails.push({
                // ✅ 关键修复：使用 fee.orderFee.id 作为子节点ID，确保与后端返回的ID一致
                id: fee.orderFee?.id || fee.id.replace(/^child_/, ''),
                parentId: orderId,
                orderFee: fee.orderFee,
                appliedAmount: item.appliedAmount,
                settlementUnit: fee.orderFee.settlement?.name || '-',
                payReceiveType: fee.orderFee.paySide === 0 ? '应收' : '应付',
                feeName: fee.orderFee.feeCode?.cnName || '-',
                amount: fee.orderFee.amount,
                currencyCode: fee.orderFee.currency?.code || '-',
                remainingInvoiceAmount: fee.orderFee.remainingInvoiceAmount,
                invoiceApplicationItemId: item.id || item.Id || item.ID,
              });
            }
          }
        });

        selectedFeeDetails.value = selectedDetails;

        // 重新打开弹窗
        feeDetailModalVisible.value = true;
        message.success(`数据已刷新，当前共 ${items.length} 条费用`);
      } catch (error) {
        console.error('重新构建费用明细失败:', error);
        message.error('刷新数据失败');
      }
    } else {
      message.success('数据已刷新');
    }
  }
}

// ==================== UI 状态 ====================

const feeSelectionDrawerRef = ref();
const drawerVisible = ref(false);
const feeDetailModalVisible = ref(false);
const feeDetailModalLoading = ref(false);
const selectedFeeDetails = ref<any[]>([]);
const remarkTemplateModalVisible = ref(false);
const selectRemarkTemplateModalVisible = ref(false);
const remarkTemplateModalRef = ref();

// ==================== 事件处理 ====================

function handleOpenFeeDrawer() {
  feeSelectionDrawerRef.value?.handleOpenFeeDrawer();
}

async function handleOpenFeeDetailModal() {
  const items = formData.value.invoiceApplicationItems || [];

  // ✅ 修复：即使没有费用也允许打开弹窗，显示空状态
  if (items.length === 0) {
    selectedFeeDetails.value = [];
    feeDetailModalVisible.value = true;
    return;
  }

  if (feeGroupsData.value.length === 0) {
    message.error('费用数据丢失，请重新添加费用');
    return;
  }

  feeDetailModalLoading.value = true;
  try {
    const allFees = flattenTreeData(feeGroupsData.value);
    const selectedDetails: any[] = [];
    const processedOrders = new Set<string>();

    items.forEach((item: any) => {
      // ✅ 修复：查找费用时，尝试多种ID格式（带前缀和不带前缀）
      const fee = allFees.find((f: any) => {
        // 尝试直接匹配 orderFee.id
        if (f.orderFee?.id === item.orderFeeId) return true;

        // 尝试匹配带 child_ 前缀的ID
        if (f.id === `child_${item.orderFeeId}`) return true;

        // 尝试从 f.id 中提取原始ID（如果 f.id 是 child_xxx 格式）
        if (f.id && f.id.startsWith('child_')) {
          const originalId = f.id.replace('child_', '');
          if (originalId === String(item.orderFeeId)) return true;
        }

        return false;
      });

      if (fee) {
        // ✅ 修复：获取 orderId 时也要处理前缀
        let orderId = fee.parentId;
        if (orderId && orderId.startsWith('parent_')) {
          orderId = orderId.replace('parent_', '');
        }

        if (!processedOrders.has(orderId)) {
          // ✅ 修复：查找父节点时也要处理前缀
          const parentFee = allFees.find((f: any) => {
            if (f.id === orderId) return true;
            if (f.id === `parent_${orderId}`) return true;
            return false;
          });

          if (parentFee) {
            const parentNode: any = {
              id: parentFee.id,
              parentId: null,
              transportOrder: parentFee.transportOrder,
              seaExport: parentFee.transportOrder?.seaExport,
              orderFees: parentFee.orderFees,
              commissionNum: parentFee.transportOrder.commissionNum,
              mblNum: parentFee.transportOrder.mblNum || '-',
              bookingNum: parentFee.transportOrder.bookingNum || '-',
              clientName: parentFee.transportOrder.clientName,
              bizType: '-',
              carrier:
                parentFee.transportOrder?.seaExport?.carrier?.cnName || '-',
              company: parentFee.transportOrder.orgs?.at(0)?.name || '-',
              feeDetails: [] as any[],
            };
            selectedDetails.push(parentNode);
            processedOrders.add(orderId);
          }
        }

        const parentNode = selectedDetails.find(
          (p: any) => p.id === orderId || p.id === `parent_${orderId}`,
        );
        if (parentNode) {
          parentNode.feeDetails.push({
            // ✅ 关键修复：使用 fee.orderFee.id 作为子节点ID，确保与后端返回的ID一致
            id: fee.orderFee?.id || fee.id.replace(/^child_/, ''),
            parentId: orderId,
            orderFee: fee.orderFee,
            appliedAmount: item.appliedAmount,
            settlementUnit: fee.orderFee.settlement?.name || '-',
            payReceiveType: fee.orderFee.paySide === 0 ? '应收' : '应付',
            feeName: fee.orderFee.feeCode?.cnName || '-',
            amount: fee.orderFee.amount,
            currencyCode: fee.orderFee.currency?.code || '-',
            remainingInvoiceAmount: fee.orderFee.remainingInvoiceAmount,
            // ✅ 新增：保存 invoiceApplicationItem 的 ID，用于删除操作
            invoiceApplicationItemId: item.id || item.Id || item.ID,
          });
        }
      }
    });

    selectedFeeDetails.value = selectedDetails;
    feeDetailModalVisible.value = true;
  } catch (error) {
    console.error('加载费用明细失败:', error);
  } finally {
    feeDetailModalLoading.value = false;
  }
}

function handleInvoiceTypeChange({ key }: any) {
  formData.value.invoiceType = key;
}

function handleOpenRemarkTemplateModal() {
  remarkTemplateModalVisible.value = true;
}

function handleOpenSelectRemarkTemplateModalWrapper() {
  const canOpen = handleOpenSelectRemarkTemplateModal();
  if (canOpen) {
    selectRemarkTemplateModalVisible.value = true;
  }
}

// ✅ 新增：加载当前币别对应的默认备注模板
async function loadDefaultRemarkTemplate() {
  // 检查是否有必要的参数
  if (!formData.value.orgId || !formData.value.currencyId) {
    console.log('⚠️ 缺少归属组织或币别ID，无法加载默认备注模板');
    return;
  }

  // 如果备注字段已经有内容，不覆盖用户已输入的内容
  if (formData.value.remark && formData.value.remark.trim()) {
    console.log('⚠️ 备注字段已有内容，跳过自动填充');
    return;
  }

  try {
    // ✅ 直接调用 RemarkTemplateModal 组件的方法获取默认模板，并传入 templateData 进行占位符替换
    const template =
      await remarkTemplateModalRef.value?.getDefaultRemarkTemplate(
        formData.value.orgId,
        formData.value.currencyId,
        remarkTemplateData.value, // ✅ 传入动态计算的模板数据
      );

    if (template) {
      formData.value.remark = template;
      message.success('已自动应用默认备注模板');
    } else {
      console.log('ℹ️ 未找到默认备注模板');
    }
  } catch (error) {
    console.error('加载默认备注模板失败:', error);
    // 静默失败，不影响主流程
  }
}

/**
 * 撤回开票申请
 */
async function handleWithdraw() {
  if (!editId.value) return;

  Modal.confirm({
    title: '确认撤回',
    content: `确定要撤回申请单 "${formData.value.applicationNo}" 吗？`,
    onOk: async () => {
      try {
        await InvoiceApplicationApi.withdrawAsync({ id: editId.value! });
        message.success('撤回成功');
        // 撤回后刷新详情
        router.push(`/fee-management/invoice-application/${editId.value}/edit`);
        // ✅ 新增：标记列表需要刷新
        markListShouldRefresh('invoice-application-list');
      } catch (error) {
        console.error('撤回失败:', error);
      }
    },
  });
}

// ==================== 生命周期 ====================

onMounted(() => {
  initApplicantInfo();
  loadCodeInvoiceList();

  if (isEdit.value) {
    loadDetail();
  } else {
    nextTick(() => {
      handleOpenFeeDrawer();
    });
  }
});
</script>

<template>
  <Page auto-content-height>
    <div style="margin-bottom: 16px; text-align: right">
      <Space>
        <Button
          type="primary"
          :loading="submitLoading"
          @click="handleSubmit"
          v-if="!isReadOnly"
        >
          {{ isEdit ? '保存' : '创建' }}
        </Button>
        <Button
          v-if="
            isEdit &&
            formData.status ===
              InvoiceApplicationApi.InvoiceApplicationStatus.Auditing
          "
          type="default"
          :loading="submitLoading"
          @click="handleWithdraw"
        >
          撤回
        </Button>
        <Button
          type="primary"
          :loading="submitLoading"
          @click="handleDirectSubmit"
          v-if="!isReadOnly"
        >
          提交
        </Button>
        <!-- <Button @click="handleCancel">{{
          isReadOnly ? '关闭' : '关闭'
        }}</Button> -->
      </Space>
    </div>

    <Card :title="isEdit ? '编辑开票申请' : '新建开票申请'">
      <Spin :spinning="loading">
        <!-- UI内容保持不变，只是更简洁 -->
        <div style="display: flex; gap: 16px">
          <!-- 左侧基础配置 -->
          <div style="flex-shrink: 0; width: 400px">
            <Card title="基础配置" size="small">
              <Form
                :model="formData"
                layout="vertical"
                :label-col="{ span: 8 }"
                :wrapper-col="{ span: 16 }"
              >
                <!-- ✅ 新增：申请单号和结算对象 -->
                <Form.Item label="申请单号">
                  <span>{{ formData.applicationNo || '自动生成' }}</span>
                </Form.Item>
                <Form.Item label="结算对象">
                  <Input
                    :value="settlementObjectName"
                    disabled
                    placeholder="从费用中自动获取"
                  />
                </Form.Item>
                <Form.Item label="归属组织" required>
                  <MyOrgSelect
                    v-model="formData.orgId"
                    placeholder="请选择归属组织"
                    style="width: 100%"
                  />
                </Form.Item>
                <!-- <Form.Item label="开票公司">
                  <Input
                    :value="applicantCompanyName"
                    disabled
                    placeholder="根据归属组织自动获取"
                  />
                </Form.Item> -->
                <Form.Item label="开票申请人">
                  <Input :value="applicantName" disabled />
                </Form.Item>
                <Form.Item label="开票申请日期">
                  <Input :value="applicationDate" disabled />
                </Form.Item>
                <Form.Item label="发票币别" required>
                  <CurrencySelect
                    v-model:value="formData.currencyId"
                    placeholder="从费用中自动获取"
                    style="width: 100%"
                    disabled
                  />
                </Form.Item>
                <Form.Item
                  label="发票汇率"
                  v-if="formData.currencyId && formData.currencyId !== 1"
                >
                  <InputNumber
                    v-model:value="invoiceExchangeRate"
                    disabled
                    :precision="4"
                    style="width: 100%"
                  />
                </Form.Item>
                <Form.Item label="客户开票要求">
                  <Input.TextArea
                    v-model:value="formData.require"
                    placeholder="请输入客户的特殊开票要求..."
                    :rows="3"
                    :disabled="isReadOnly"
                  />
                </Form.Item>
              </Form>
            </Card>
          </div>

          <!-- 右侧发票区域（保持原有UI结构） -->
          <div style="flex: 1; min-width: 0">
            <Card>
              <template #title>
                <div style="width: 100%; text-align: center">
                  <!-- ✅ 修复：添加 trigger 属性并正确绑定 disabled -->
                  <Dropdown :trigger="['click']" :disabled="isReadOnly">
                    <span
                      :style="{
                        display: 'inline-flex',
                        gap: '8px',
                        alignItems: 'center',
                        fontSize: '24px',
                        color: isReadOnly ? '#999' : '#c41e3a',
                        cursor: isReadOnly ? 'not-allowed' : 'pointer',
                      }"
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
                  <div style="color: #999">自动生成/手动输入</div>
                </div>
              </template>

              <!-- 购买方和销售方信息 -->
              <div style="display: flex; gap: 16px; margin-bottom: 16px">
                <div
                  style="
                    flex: 1;
                    height: 180px;
                    overflow: hidden;
                    border: 1px solid #c41e3a;
                    border-radius: 4px;
                  "
                >
                  <div style="display: flex; gap: 12px; height: 100%">
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
                    <div style="flex: 1; padding: 12px; overflow-y: auto">
                      <ClientInvoiceInfoSelector
                        :client-id="formData.settlementId"
                        :value="selectedClientInvoiceInfo?.id || ''"
                        :currency-id="formData.currencyId"
                        :disabled="isReadOnly || !formData.settlementId"
                        @update:value="
                          (val) => {
                            // 由 handleClientInvoiceInfoChange 处理
                          }
                        "
                        @change="handleClientInvoiceInfoChange"
                      />
                    </div>
                  </div>
                </div>

                <div
                  style="
                    flex: 1;
                    height: 180px;
                    overflow: hidden;
                    border: 1px solid #c41e3a;
                    border-radius: 4px;
                  "
                >
                  <div style="display: flex; gap: 12px; height: 100%">
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
                    <div
                      style="
                        flex: 1;
                        padding: 12px;
                        overflow-y: auto;
                        font-size: 13px;
                      "
                    >
                      <div
                        style="
                          display: flex;
                          align-items: center;
                          height: 28px;
                          margin-bottom: 4px;
                        "
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
                        style="
                          display: flex;
                          align-items: center;
                          height: 28px;
                          margin-bottom: 4px;
                        "
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
                        style="
                          display: flex;
                          align-items: center;
                          height: 28px;
                          margin-bottom: 4px;
                        "
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
                            filteredOrgBanks.map((b) => ({
                              label: `${b.bankName} - ${b.bankAccount}`,
                              value: b.id,
                            }))
                          "
                          style="flex: 1"
                          size="small"
                          placeholder="请选择银行"
                          :disabled="isReadOnly"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 商品明细操作按钮 -->
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
                    :disabled="isReadOnly"
                  >
                    <template #icon
                      ><IconifyIcon icon="ant-design:import-outlined"
                    /></template>
                    导入费用
                  </Button>
                  <Button size="small" @click="handleOpenFeeDetailModal">
                    <template #icon
                      ><IconifyIcon icon="ant-design:eye-outlined"
                    /></template>
                    查看费用明细
                  </Button>
                </Space>
              </div>

              <!-- 商品明细表格 -->
              <div
                style="
                  height: 300px;
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
                      width: 50,
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
                  :scroll="{ x: 1030 }"
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
                          :disabled="isReadOnly"
                          style="padding: 5px; font-size: 18px; color: #52c41a"
                        >
                          <IconifyIcon icon="ant-design:plus-circle-outlined" />
                        </Button>
                        <Button
                          type="link"
                          danger
                          @click="handleDeleteGoodsRow(index)"
                          :disabled="isReadOnly || goodsDetails.length <= 1"
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
                        @change="() => handleGoodsNameChange(record, index)"
                        :disabled="isReadOnly"
                      />
                    </template>
                    <template v-else-if="column.key === 'specification'">
                      <Input
                        v-model:value="record.specification"
                        size="small"
                        :disabled="isReadOnly"
                      />
                    </template>
                    <template v-else-if="column.key === 'unit'">
                      <Select
                        v-model:value="record.unit"
                        :options="[{ label: '票', value: '票' }]"
                        style="width: 100%"
                        size="small"
                        :disabled="isReadOnly"
                      />
                    </template>
                    <template v-else-if="column.key === 'quantity'">
                      <InputNumber
                        v-model:value="record.quantity"
                        :min="0"
                        :precision="2"
                        style="width: 100%"
                        size="small"
                        @change="() => handleQuantityOrPriceChange(record)"
                        :disabled="isReadOnly"
                      />
                    </template>
                    <template v-else-if="column.key === 'unitPrice'">
                      <InputNumber
                        v-model:value="record.unitPrice"
                        :min="0"
                        :precision="2"
                        style="width: 100%"
                        size="small"
                        @change="() => handleQuantityOrPriceChange(record)"
                        :disabled="isReadOnly"
                      />
                    </template>
                    <template v-else-if="column.key === 'amount'">
                      <InputNumber
                        v-model:value="record.amount"
                        :min="0"
                        :precision="2"
                        style="width: 100%"
                        size="small"
                        @change="() => handleAmountChange(record)"
                        :disabled="isReadOnly"
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
                        @change="() => handleTaxRateChange(record)"
                        :disabled="isReadOnly"
                      />
                    </template>
                    <template v-else-if="column.key === 'taxAmount'">
                      {{ record.taxAmount?.toFixed(2) || '0.00' }}
                    </template>
                    <template v-else-if="column.key === 'totalAmount'">
                      {{ record.totalAmount?.toFixed(2) || '0.00' }}
                    </template>
                    <template v-else-if="column.key === 'remark'">
                      <Input
                        v-model:value="record.remark"
                        size="small"
                        :disabled="isReadOnly"
                      />
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
                  <span
                    v-if="foreignCurrencyAmount !== null"
                    style="font-size: 13px; color: #1890ff"
                  >
                    <strong>申请币别金额({{ selectedCurrencyCode }}):</strong>
                    {{ foreignCurrencyAmount.toFixed(2) }}
                  </span>
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
                      <Space style="width: 100%; margin-bottom: 8px">
                        <Button
                          size="small"
                          type="primary"
                          ghost
                          @click="handleOpenSelectRemarkTemplateModalWrapper"
                          :disabled="
                            (formData.invoiceApplicationItems || []).length ===
                              0 || isReadOnly
                          "
                        >
                          <template #icon></template>
                          使用模板
                        </Button>
                        <Button
                          size="small"
                          @click="handleOpenRemarkTemplateModal"
                          :disabled="isReadOnly"
                        >
                          <template #icon></template>
                          管理模板
                        </Button>
                      </Space>
                      <Input.TextArea
                        v-model:value="formData.remark"
                        placeholder="请输入备注,或点击按钮使用模板"
                        :rows="6"
                        :disabled="isReadOnly"
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

    <!-- 子组件 -->
    <FeeSelectionDrawer
      ref="feeSelectionDrawerRef"
      v-model:visible="drawerVisible"
      :settlement-id="formData.settlementId"
      :currency-id="formData.currencyId"
      :invoice-application-id="editId"
      :added-fee-ids="getAddedFeeIdsArray()"
      @save="handleFeeSelectionSave"
    />

    <FeeDetailModal
      v-model:visible="feeDetailModalVisible"
      :loading="feeDetailModalLoading"
      :fee-details="selectedFeeDetails"
      :invoice-application-id="editId"
      :invoice-exchange-rate="invoiceExchangeRate"
      @refresh="handleFeeDetailRefresh"
    />

    <RemarkTemplateModal
      ref="remarkTemplateModalRef"
      v-model:visible="remarkTemplateModalVisible"
      @use-template="handleUseTemplate"
    />

    <SelectRemarkTemplateModal
      v-model:visible="selectRemarkTemplateModalVisible"
      :settlement-id="formData.orgId"
      :currency-id="formData.currencyId"
      :currency-code="selectedCurrencyCode"
      :fee-details="formData.invoiceApplicationItems"
      :template-data="remarkTemplateData"
      @use-template="handleUseTemplate"
    />
  </Page>
</template>
