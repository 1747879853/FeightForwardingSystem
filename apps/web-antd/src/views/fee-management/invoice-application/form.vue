<script lang="ts" setup>
import {computed, nextTick, onMounted, ref, watch  } from 'vue';
import { Page } from '@vben/common-ui';
import {
  Button,
  Card,
  message,
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

// 导入子组件
import RemarkTemplateModal from './components/RemarkTemplateModal.vue';
import SelectRemarkTemplateModal from './components/SelectRemarkTemplateModal.vue';
import FeeSelectionDrawer from './components/FeeSelectionDrawer.vue';
import FeeDetailModal from './components/FeeDetailModal.vue';


import { ClientSelect, CurrencySelect, MyOrgSelect } from '#/adapter/component';
import {
  getMyDefaultOrgId,
  getMyOrgCompanyNode,
} from '#/composables/use-my-org';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getClientDetail } from '#/api/sea-export/client-admin';
import { getClientInvoiceInfoList } from '#/api/sea-export/clinet-invoice-admin';
import { getCodeInvoicePagedList } from '#/api/system/base-data/code-invoice-admin';
import { getCurrencyDetail } from '#/api/system/base-data/currency-admin';
import { DatePicker, Select } from 'ant-design-vue';
import { getBizTypeOptions } from '#/views/sea-export-admin/orderFee/data';
import { $t } from '#/locales';
import { getExchangeRatePagedList } from '#/api/system/base-data/exchange-rate-admin';
import { InvoiceRemarkTemplateApi } from '#/api/Invoice/invoiceRemarkTemplate';
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
);

const { addSelectedFeesToForm, handleDeleteFee } = useFeeManagement(
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
} = useComputed(goodsDetails, formData, invoiceExchangeRate, selectedCurrencyCode);

const { submitLoading, handleSubmit, handleDirectSubmit, handleCancel } = useSubmit(
  formData,
  goodsDetails,
  isEdit,
  editId,
);

const { handleFeeSelectionSave } = useFeeSelectionSave(
  formData,
  feeGroupsData,
  goodsDetails,
  invoiceExchangeRate,
  selectedCurrencyCode,
  addSelectedFeesToForm,
  autoFillGoodsDetails,
  mergeAmountToExistingGoods,
  loadClientInvoiceInfo,
  updateOrgBankByCurrency,
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
  if (items.length === 0) return;
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
      const fee = allFees.find((f: any) => f.orderFee?.id === item.orderFeeId);
      if (fee) {
        const orderId = fee.parentId;
        if (!processedOrders.has(orderId)) {
          const parentFee = allFees.find((f: any) => f.id === orderId);
          if (parentFee) {
            const parentNode: any = {
              id: parentFee.id,
              parentId: null,
              transportOrder: parentFee.transportOrder,
              seaExport: parentFee.seaExport,
              orderFees: parentFee.orderFees,
              commissionNum: parentFee.transportOrder.commissionNum,
              mblNum: parentFee.transportOrder.mblNum || '-',
              bookingNum: parentFee.transportOrder.bookingNum || '-',
              clientName: parentFee.transportOrder.clientName,
              bizType: '-',
              carrier: parentFee.seaExport?.carrierName || '-',
              company: parentFee.transportOrder.orgs?.at(-1)?.name || '-',
              feeDetails: [] as any[],
            };
            selectedDetails.push(parentNode);
            processedOrders.add(orderId);
          }
        }

        const parentNode = selectedDetails.find((p: any) => p.id === orderId);
        if (parentNode) {
          parentNode.feeDetails.push({
            id: fee.id,
            parentId: orderId,
            orderFee: fee.orderFee,
            appliedAmount: item.appliedAmount,
            settlementUnit: fee.orderFee.settlementName || '-',
            payReceiveType: fee.orderFee.payReceiveType === 'AR' ? '应收' : '应付',
            feeName: fee.orderFee.feeCodeName || '-',
            amount: fee.orderFee.amount,
            currencyCode: fee.orderFee.currencyCode || '-',
            remainingInvoiceAmount: fee.orderFee.remainingInvoiceAmount,
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
        <Button type="primary" :loading="submitLoading" @click="handleSubmit" :disabled="isReadOnly">
          {{ isEdit ? '保存' : '创建' }}
        </Button>
        <Button type="primary" :loading="submitLoading" @click="handleDirectSubmit" :disabled="isReadOnly">
          提交
        </Button>
        <Button @click="handleCancel">{{ isReadOnly ? '关闭' : '取消' }}</Button>
      </Space>
    </div>

    <Card :title="isEdit ? '编辑开票申请' : '新建开票申请'">
      <Spin :spinning="loading">
        <!-- UI内容保持不变，只是更简洁 -->
        <div style="display: flex; gap: 16px">
          <!-- 左侧基础配置 -->
          <div style="flex-shrink: 0; width: 400px">
            <Card title="基础配置" size="small">
              <Form :model="formData" layout="vertical" :label-col="{ span: 8 }" :wrapper-col="{ span: 16 }">
                <Form.Item label="归属组织" required>
                  <MyOrgSelect v-model="formData.orgId" placeholder="请选择归属组织" style="width: 100%" />
                </Form.Item>
                <Form.Item label="开票公司">
                  <Input :value="applicantCompanyName" disabled placeholder="根据归属组织自动获取" />
                </Form.Item>
                <Form.Item label="开票申请人">
                  <Input :value="applicantName" disabled />
                </Form.Item>
                <Form.Item label="开票申请日期">
                  <Input :value="applicationDate" disabled />
                </Form.Item>
                <Form.Item label="发票币别" required>
                  <CurrencySelect v-model:value="formData.currencyId" placeholder="从费用中自动获取" style="width: 100%" disabled />
                </Form.Item>
                <Form.Item label="发票汇率" v-if="formData.currencyId && formData.currencyId !== 1">
                  <InputNumber v-model:value="invoiceExchangeRate" disabled :precision="4" style="width: 100%" />
                </Form.Item>
                <Form.Item label="客户开票要求">
                  <Input.TextArea v-model:value="formData.require" placeholder="请输入客户的特殊开票要求..." :rows="3" :disabled="isReadOnly" />
                </Form.Item>
              </Form>
            </Card>
          </div>

          <!-- 右侧发票区域（保持原有UI结构） -->
          <div style="flex: 1; min-width: 0">
            <Card>
              <template #title>
                <div style="width: 100%; text-align: center">
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
                          @change="handleClientInvoiceHeaderChange"
                          :disabled="isReadOnly"
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
                          :options="filteredClientBanks"
                          style="flex: 1"
                          size="small"
                          placeholder="请选择银行"
                          :disabled="isReadOnly"
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
                  <Button
                    size="small"
                    @click="handleOpenFeeDetailModal"
                    :disabled="isReadOnly"
                  >
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
                          @click="handleOpenSelectRemarkTemplateModal"
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
      @delete-fee="handleDeleteFee"
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
