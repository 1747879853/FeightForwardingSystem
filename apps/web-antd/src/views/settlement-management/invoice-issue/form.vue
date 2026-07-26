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
} from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';

import { CurrencySelect, MyOrgSelect } from '#/adapter/component';
import { Select } from 'ant-design-vue';
import { InvoiceIssueApi } from '#/api/Invoice/InvoiceIssue';

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

// ==================== UI 状态（必须在所有composable之前声明）====================

// ✅ 假删除的申请ID列表（由发票详情弹窗维护）
const fakeDeletedIds = ref<string[]>([]);

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
  fakeDeletedIds, // ✅ 传递假删的申请ID列表
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
  fakeDeletedIds, // ✅ 传递假删的申请ID列表
);

const { loadDetail } = useLoadDetail(
  editId,
  formData,
  goodsDetails,
  applicationGroupsData,
  invoiceExchangeRate,
  applicantName,
  invoiceIssueTime,
  loadClientInvoiceInfo,
  updateOrgBankByCurrency,
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
  fakeDeletedIds, // ✅ 传递假删除的申请ID列表
);

/** 打开费用选择抽屉 */
function handleOpenFeeDrawer() {
  feeSelectionDrawerRef.value?.handleOpenFeeDrawer();
}

/** 打开查看发票明细弹窗 */
function handleOpenInvoiceDetailModal() {
  // 无论是否有数据，都打开弹窗（空数据时表格显示为空）
  invoiceDetailModalVisible.value = true;
}

/** 处理发票明细删除（假删除） */
function handleDeleteSelectedInvoices(deletedIds: string[]) {
  console.log('🗑️ 收到假删除的发票ID:', deletedIds);
  fakeDeletedIds.value = deletedIds;
  message.success(`已将 ${deletedIds.length} 条发票标记为删除，保存时生效`);
}

/** 处理发票明细删除后的刷新 */
async function handleInvoiceDetailRefresh() {
  console.log('🔄 发票明细已删除，重新加载数据...');
  if (editId.value) {
    await loadDetail();
    message.success('数据已刷新');
  }
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
    loadDetail();
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
        <Button type="primary" :loading="submitLoading" @click="handleSubmit">
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
                :wrapper-col="{ span: 16 }"
              >
                <Form.Item label="归属组织" required>
                  <MyOrgSelect
                    v-model="formData.orgId"
                    placeholder="请选择归属组织"
                    style="width: 100%"
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
                        label: '诺诺接口开票',
                        value: InvoiceIssueApi.InvoiceIssueType.NuonuoInterface,
                      },
                      {
                        label: '手动开票',
                        value: InvoiceIssueApi.InvoiceIssueType.ManualRecord,
                      },
                    ]"
                    style="width: 100%"
                    placeholder="请选择开票方式"
                  />
                </Form.Item>

                <Form.Item label="其他备注">
                  <Input.TextArea
                    v-model:value="formData.require"
                    placeholder="请输入其他备注信息..."
                    :rows="3"
                  />
                </Form.Item>

                <!-- <Form.Item>
                  <Button
                    type="primary"
                    block
                    @click="handleOpenFeeDrawer"
                    :disabled="fixedHeaderId && fixedCurrencyId ? false : false"
                  >
                    从开票申请导入费用
                  </Button>
                </Form.Item>

                <Form.Item v-if="applicationGroupsData.length > 0">
                  <Button block @click="handleOpenInvoiceDetailModal">
                    <template #icon>
                      <IconifyIcon icon="ant-design:eye-outlined" />
                    </template>
                    查看发票明细 ({{ applicationGroupsData.length }})
                  </Button>
                </Form.Item> -->
              </Form>
            </Card>
          </div>

          <!-- 右侧发票区域 -->
          <div style="flex: 1; min-width: 0">
            <Card>
              <template #title>
                <div style="width: 100%; text-align: center">
                  <Dropdown :trigger="['click']">
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
                          :disabled="!!fixedHeaderId"
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
                        >
                          <IconifyIcon icon="ant-design:plus-circle-outlined" />
                        </Button>
                        <Button
                          type="link"
                          danger
                          @click="handleDeleteGoodsRow(index)"
                          :disabled="goodsDetails.length <= 1"
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
                      />
                    </template>
                    <template v-else-if="column.key === 'specification'">
                      <Input
                        v-model:value="record.specification"
                        size="small"
                      />
                    </template>
                    <template v-else-if="column.key === 'unit'">
                      <Select
                        v-model:value="record.unit"
                        :options="[{ label: '票', value: '票' }]"
                        style="width: 100%"
                        size="small"
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
      :currency-id="formData.currencyId"
      :header-id="fixedHeaderId"
      :added-app-ids="getAddedAppIdsArray()"
      :fake-deleted-ids="fakeDeletedIds"
      :application-groups-data="applicationGroupsData"
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
      :fake-deleted-ids="fakeDeletedIds"
      @delete-selected="handleDeleteSelectedInvoices"
      @refresh="handleInvoiceDetailRefresh"
    />
  </Page>
</template>
