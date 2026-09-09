<script lang="ts" setup>
import type { PaymentSettlementAdminApi } from '#/api/sea-export/payment-settlement-admin';

import { nextTick, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import {
  Button,
  Card,
  DatePicker,
  Input,
  InputNumber,
  message,
  Select,
  Space,
} from 'ant-design-vue';

import { ClientSelect, CurrencySelect } from '#/adapter/component';
import FileUploadInput from '#/adapter/component/file-upload/file-upload-input.vue';
import { openAttachmentViewer } from '#/components/attachment-viewer';
import { downloadAttachmentWithFriendlyName } from '#/utils/download-file';

import AddApplicationDrawer from './add-application-drawer/index.vue';
import ApplicationItemsTable from './application-items-table.vue';
import { useBankOptions } from './composables/use-bank-options';
import { useFormEffects } from './composables/use-form-effects';
import { useFormState } from './composables/use-form-state';
import { useLoadDetail } from './composables/use-load-detail';
import { useSubmit } from './composables/use-submit';
import { formatAmount, payTypeOptions } from './form-data';

const state = useFormState();
const {
  editId,
  isEdit,
  pageLoading,
  submitting,
  settlementNo,
  settlementTime,
  payType,
  settlementId,
  settlementSelectedItems,
  currencyId,
  currencyCode,
  orgBankAccountId,
  clientInvoiceBankId,
  transactionFee,
  transactionFeeCurrencyId,
  remark,
  attachments,
  paymentApplicationAttachments,
  orgBankOptions,
  clientBankOptions,
  applicationItems,
  selectedRowKeys,
  orgCompanies,
  hasExistingFees,
  existingSettlementRowKeys,
  totalSettledAmount,
  currentUserName,
} = state;

const { loadOrgBankOptions, loadClientBankOptions } = useBankOptions(state);
const { loadEditData } = useLoadDetail(
  state,
  loadOrgBankOptions,
  loadClientBankOptions,
);
useFormEffects(state, loadOrgBankOptions, loadClientBankOptions);

const { handleConfirmApplications, handleBatchDeleteApplications, handleSave } =
  useSubmit(state, loadEditData);

const addApplicationDrawerRef = ref<InstanceType<
  typeof AddApplicationDrawer
> | null>(null);

function handleAddApplication() {
  nextTick(() => {
    addApplicationDrawerRef.value?.openDrawer();
  });
}

function handlePreviewAttachment(
  item: PaymentSettlementAdminApi.AttachmentItemDto,
) {
  openAttachmentViewer(item);
}

function handleDownloadAttachment(
  item: PaymentSettlementAdminApi.AttachmentItemDto,
) {
  if (!item.url) {
    message.warning('附件链接不存在');
    return;
  }
  void downloadAttachmentWithFriendlyName(
    item.url,
    item.friendlyFileName || 'download',
  );
}

onMounted(() => {
  if (isEdit.value) {
    loadEditData();
  } else {
    nextTick(() => {
      handleAddApplication();
    });
  }
});
</script>

<template>
  <!-- auto-content-height 让 Page 自动测量并扣除标题头高度，内容区得到确定高度；
       content-class 建立 flex 纵向容器，配合下方 .ps-page flex-1 精确填满，整页不再溢出滚动。
       保留默认 p-4 外边距，与 .ps-page 自身 16px padding 一起维持原有留白。 -->
  <Page
    :title="isEdit ? '编辑结算单' : '新建结算单'"
    auto-content-height
    content-class="flex flex-col overflow-hidden"
  >
    <template #extra>
      <Space>
        <!-- 结算单号（设计稿展示于页面标题栏） -->
        <span v-if="isEdit" class="ps-settlement-no">
          结算单号：{{ settlementNo }}
        </span>

        <Button
          class="ps-action-btn ps-action-btn-primary"
          type="primary"
          @click="handleSave"
          :loading="submitting"
        >
          保存
        </Button>
      </Space>
    </template>

    <div v-loading="pageLoading" class="ps-page">
      <!-- 顶部布局：结算信息卡片 + 附件卡片（与设计稿一致） -->
      <div class="ps-grid-top">
        <!-- 结算信息卡片：费用汇总已按设计稿并入 -->
        <Card :bordered="false" size="small" class="info-card combined-card">
          <template #title>
            <div class="card-title">
              <div class="card-title-icon icon-blue">
                <IconifyIcon icon="ion:cash-outline" class="size-4" />
              </div>
              <span class="card-title-text">结算信息</span>
            </div>
          </template>

          <!-- 卡片头部右侧：结算币别 + 结算总金额（与设计稿一致） -->
          <template #extra>
            <div class="header-summary">
              <div class="hs-item">
                <span class="hs-label">结算币别</span>
                <CurrencySelect
                  v-model="currencyId"
                  placeholder="请选择"
                  allow-clear
                  disabled
                  class="hs-currency"
                />
              </div>
              <div class="hs-item">
                <span class="hs-label">结算总金额</span>
                <span class="hs-amount">
                  {{ formatAmount(totalSettledAmount) }}
                </span>
                <span class="hs-currency-code">
                  {{ currencyCode || 'RMB' }}
                </span>
              </div>
            </div>
          </template>

          <!-- 表单区：左半为结算基础字段（两小列），右半为银行/费用字段（填满） -->
          <div class="settle-form">
            <!-- 第 1 行 -->
            <!-- 归属组织（换算到公司层级） -->
            <div v-if="orgCompanies.length > 0" class="form-item form-col-1">
              <div class="form-label">归属公司</div>
              <Select
                :value="orgCompanies.map((c) => c.id)"
                :options="
                  orgCompanies.map((c) => ({
                    label: c.name,
                    value: c.id,
                  }))
                "
                disabled
                style="width: 100%"
              />
            </div>

            <!-- 结算人 -->
            <div class="form-item form-col-2">
              <div class="form-label">结算人</div>
              <Input :value="currentUserName" disabled />
            </div>

            <!-- 手续费 + 币别 -->
            <div class="form-item form-col-3">
              <div class="form-label">手续费</div>
              <div class="fee-row">
                <InputNumber
                  v-model:value="transactionFee"
                  placeholder="0.00"
                  :min="0"
                  :precision="2"
                  style="flex: 1; min-width: 0"
                />
                <CurrencySelect
                  v-model="transactionFeeCurrencyId"
                  placeholder="币别"
                  allow-clear
                  class="fee-currency"
                />
              </div>
            </div>

            <!-- 第 2 行 -->
            <!-- 结算时间 -->
            <div class="form-item form-col-1">
              <div class="form-label">结算时间</div>
              <DatePicker
                v-model:value="settlementTime"
                show-time
                format="YYYY-MM-DD HH:mm"
                style="width: 100%"
              />
            </div>

            <!-- 付款方式 -->
            <div class="form-item form-col-2">
              <div class="form-label">付款方式</div>
              <Select
                v-model:value="payType"
                :options="payTypeOptions"
                placeholder="请选择"
                allow-clear
                style="width: 100%"
              />
            </div>

            <!-- 我司银行 -->
            <div class="form-item form-col-3">
              <div class="form-label bank-label-ours">我司银行</div>
              <Select
                v-model:value="orgBankAccountId"
                :options="
                  orgBankOptions.map((opt) => ({
                    label: opt.label,
                    value: opt.id,
                  }))
                "
                placeholder="请先添加申请明细，然后选择我司银行"
                allow-clear
                :disabled="applicationItems.length === 0"
                style="width: 100%"
              />
            </div>

            <!-- 第 3 行 -->
            <!-- 结算对象 -->
            <div class="form-item form-col-1">
              <div class="form-label">结算对象</div>
              <ClientSelect
                v-model="settlementId"
                :selected-items="settlementSelectedItems"
                placeholder="请选择结算对象"
                allow-clear
                disabled
                style="width: 100%"
              />
            </div>

            <!-- 对方银行 -->
            <div class="form-item form-col-3">
              <div class="form-label bank-label-theirs">对方银行</div>
              <Select
                v-model:value="clientInvoiceBankId"
                :options="
                  clientBankOptions.map((opt) => ({
                    label: opt.label,
                    value: opt.id,
                  }))
                "
                placeholder="请先选择结算对象，然后选择对方银行"
                allow-clear
                :disabled="!settlementId"
                style="width: 100%"
              />
            </div>

            <!-- 第 4 行：备注（单独一行，横跨整行） -->
            <div class="form-item form-col-all">
              <div class="form-label">备注</div>
              <Input.TextArea
                v-model:value="remark"
                placeholder="请输入备注信息（选填）"
                :rows="2"
              />
            </div>
          </div>
        </Card>

        <!-- 右侧：附件 -->
        <Card :bordered="false" size="small" class="info-card attach-card">
          <template #title>
            <div class="card-title">
              <span class="card-title-icon icon-blue">
                <IconifyIcon icon="mdi:paperclip" />
              </span>
              <span class="card-title-text">附件</span>
            </div>
          </template>

          <div class="attach-section">
            <div class="attach-section-title">结算单附件</div>
            <FileUploadInput
              v-model="attachments"
              module-type-id="160011"
              :max-count="10"
              drag
            />
          </div>

          <div
            v-if="paymentApplicationAttachments.length > 0"
            class="attach-section"
          >
            <div class="attach-section-title">付费申请附件</div>
            <div
              v-for="(item, index) in paymentApplicationAttachments"
              :key="index"
              class="attach-item"
            >
              <IconifyIcon
                icon="ant-design:file-outlined"
                class="attach-item-icon size-4"
              />
              <span
                class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm"
                :title="item.friendlyFileName"
              >
                {{ item.friendlyFileName }}
              </span>
              <Space size="small">
                <Button
                  type="link"
                  size="small"
                  @click="handlePreviewAttachment(item)"
                >
                  预览
                </Button>
                <Button
                  type="link"
                  size="small"
                  @click="handleDownloadAttachment(item)"
                >
                  下载
                </Button>
              </Space>
            </div>
          </div>
        </Card>
      </div>

      <!-- 申请明细 -->
      <Card :bordered="false" size="small" class="info-card detail-card">
        <template #title>
          <div class="card-title">
            <div class="card-title-icon icon-blue">
              <IconifyIcon icon="mdi:clipboard-list-outline" class="size-4" />
            </div>
            <span class="card-title-text">申请明细</span>
          </div>
        </template>
        <template #extra>
          <Space>
            <Button
              class="detail-btn-add"
              type="primary"
              size="small"
              @click="handleAddApplication"
            >
              + 添加申请
            </Button>
            <Button
              :disabled="isEdit && selectedRowKeys.length === 0"
              danger
              size="small"
              :loading="submitting"
              @click="handleBatchDeleteApplications"
            >
              删除选中 ({{ selectedRowKeys.length }})
            </Button>
          </Space>
        </template>

        <!-- ✅ 使用新的申请明细表格组件 -->
        <ApplicationItemsTable
          :items="applicationItems"
          :editable="isEdit"
          v-model:selected-row-keys="selectedRowKeys"
        />
      </Card>

      <!-- 选择付费申请抽屉 -->
      <AddApplicationDrawer
        ref="addApplicationDrawerRef"
        :payment-settlement-id="editId"
        :settlement-id="settlementId"
        :currency-id="currencyId"
        :has-existing-fees="hasExistingFees"
        :existing-row-keys="existingSettlementRowKeys"
        @confirm="handleConfirmApplications"
      />
    </div>
  </Page>
</template>

<style scoped>
/* ==================== 响应式适配 ==================== */

/* 窄屏：列间距收紧，保证不溢出 */
@media (max-width: 1400px) {
  .settle-form {
    column-gap: 12px;
  }
}

@media (max-width: 1200px) {
  .ps-grid-top {
    grid-template-columns: 1fr;
  }
}

/* 页面纵向弹性布局：由 Page(auto-content-height) 给出确定高度，
   .ps-page 用 flex-1 填满内容区，替代原先脆弱的 calc(100vh - 104px) + min-height:720px
   （魔数未计入标题头/内边距，且 min-height 在小屏强制溢出，导致纵向滚动条）。 */
.ps-page {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  padding: 16px;
}

.ps-grid-top {
  display: grid;
  flex-shrink: 0;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 16px;
  margin-bottom: 16px;
}

/* 顶部操作按钮：圆角 + 主按钮轻投影，强化点击感 */
.ps-action-btn {
  border-radius: 6px;
  transition: all 0.2s ease;
}

.ps-action-btn-primary {
  box-shadow: 0 2px 8px rgb(24 144 255 / 30%);
}

.ps-action-btn-primary:hover {
  box-shadow: 0 4px 12px rgb(24 144 255 / 40%);
}

/* 页面头部右侧：结算单号（设计稿展示于标题栏） */
.ps-settlement-no {
  font-size: 13px;
  color: #8c95a3;
}

/* ==================== 分区卡片统一风格 ==================== */
.info-card {
  overflow: hidden;
  border: 1px solid #e8ecf3;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgb(16 42 83 / 6%);
  transition: box-shadow 0.3s ease;
}

.info-card:hover {
  box-shadow: 0 6px 20px rgb(16 42 83 / 10%);
}

:deep(.info-card.ant-card-small > .ant-card-head) {
  min-height: 56px;
  padding: 0 16px;
  background: linear-gradient(90deg, #f4f8ff 0%, #fafbfd 60%, #fff 100%);
  border-bottom: 1px solid #e4e8ef;
}

:deep(.info-card.ant-card-small > .ant-card-body) {
  padding: 14px 16px;
}

/* 结算信息与附件卡片：固定高度 375px，body 撑满剩余高度 */
.combined-card,
.attach-card {
  display: flex;
  flex-direction: column;
  height: 375px;
}

:deep(.combined-card.ant-card-small > .ant-card-body),
:deep(.attach-card.ant-card-small > .ant-card-body) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  padding: 18px 16px;
}

/* 结算信息表单：三行在卡片内均匀分布 */
.combined-card .settle-form {
  flex: 1;
  align-content: space-between;
}

/* 卡片标题：渐变图标徽标 + 加粗深色文字 */
.card-title {
  display: flex;
  gap: 8px;
  align-items: center;
}

.card-title-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-size: 16px;
  border-radius: 8px;
}

.icon-blue {
  color: #006ce6;
  background: #eaf2ff;
}

.icon-cyan {
  color: #13c2c2;
  background: linear-gradient(135deg, #e6fffb 0%, #87e8de 100%);
}

.card-title-text {
  font-size: 14px;
  font-weight: 500;
  color: #252a31;
}

/* ==================== 结算信息卡片（费用汇总已按设计稿并入） ==================== */

/* 卡片头部右侧：结算币别 + 结算总金额 */
.header-summary {
  display: flex;
  gap: 28px;
  align-items: center;
}

.hs-item {
  display: flex;
  gap: 8px;
  align-items: center;
}

.hs-label {
  font-size: 12px;
  color: #8c95a3;
  white-space: nowrap;
}

.hs-currency {
  width: 96px;
}

.hs-amount {
  font-family: 'DIN Alternate', Roboto, sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #006ce6;
  letter-spacing: -0.3px;
}

.hs-currency-code {
  font-size: 12px;
  color: #8c95a3;
}

/* 表单区：左半为结算基础字段（两小列），右半为银行/费用字段（填满），与设计稿一致 */
.settle-form {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 22px 16px;
  padding-top: 4px;
  padding-bottom: 60px;
}

.form-item {
  display: flex;
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.form-col-1 {
  grid-column: 1;
}

.form-col-2 {
  grid-column: 2;
}

/* 右半：银行/费用字段横跨两格，填满右半区 */
.form-col-3 {
  grid-column: 3 / span 2;
}

/* 备注：单独一行，横跨整行 */
.form-col-all {
  grid-column: 1 / -1;
}

/* ==================== 表单字段 ==================== */

/* 标签：与控件同行居左、垂直居中（设计稿样式） */
.form-label {
  flex-shrink: 0;
  width: 48px;
  font-size: 12px;
  font-weight: 400;
  color: #8c95a3;
  text-align: right;
}

/* 控件统一圆角与边框，聚焦时品牌色反馈 */
:deep(.info-card .ant-input),
:deep(.info-card .ant-select-selector),
:deep(.info-card .ant-picker),
:deep(.info-card .ant-input-number) {
  border-color: #e4e8ef;
  border-radius: 8px;
  transition: all 0.2s ease;
}

:deep(.info-card .ant-input:focus),
:deep(.info-card .ant-input-focused),
:deep(.info-card .ant-select-focused .ant-select-selector),
:deep(.info-card .ant-picker-focused),
:deep(.info-card .ant-input-number-focused) {
  border-color: #40a9ff;
  box-shadow: 0 0 0 2px rgb(24 144 255 / 12%);
}

/* 禁用态：浅灰底 + 浅灰文字（设计稿样式） */
:deep(.info-card .ant-input-disabled),
:deep(.info-card .ant-select-disabled .ant-select-selector) {
  color: #b9c0c9;
  background: #f6f7f9;
}

/* ==================== 费用汇总相关字段（已并入表单三列） ==================== */

/* 银行标签用品牌色区分归属（设计稿：我司银行蓝、对方银行橙） */
.bank-label-ours {
  font-weight: 500;
  color: #006ce6;
}

.bank-label-theirs {
  font-weight: 500;
  color: #ff9b54;
}

/* 手续费：金额 + 币别选择 */
.fee-row {
  display: flex;
  flex: 1;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.fee-currency {
  flex-shrink: 0;
  width: 110px;
}

/* ==================== 附件卡片 ==================== */
.attach-section + .attach-section {
  margin-top: 16px;
}

.attach-section-title {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.attach-item {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  margin-bottom: 4px;
  background: #fafbfd;
  border: 1px solid #eef1f6;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.attach-item:hover {
  background: #e9f4ff;
  border-color: #91caff;
}

.attach-item-icon {
  margin-right: 8px;
  color: #8a94a6;
}

/* ==================== 申请明细卡片 ==================== */

/* 申请明细撑满剩余高度：min-height:0 允许在小屏收缩，
   内部 NestedDataTable(fill-height) 自带 overflow:auto 纵向滚动，内容不会被裁掉 */
.detail-card {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

:deep(.detail-card.ant-card-small > .ant-card-body) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.detail-btn-add {
  border-radius: 6px;
  box-shadow: 0 2px 6px rgb(24 144 255 / 25%);
}

/* 附件上传区域样式 */
:deep(.info-card .file-upload-container) {
  border-radius: 8px;
}

/* ==================== 页面容器与布局 ==================== */
</style>
