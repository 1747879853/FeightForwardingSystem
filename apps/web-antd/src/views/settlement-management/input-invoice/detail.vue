<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useTabs } from '@vben/hooks';
import { IconifyIcon } from '@vben/icons';

import {
  Button,
  Descriptions,
  DescriptionsItem,
  Empty,
  Spin,
  Table,
  Tag,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import { InputInvoiceAdminApi as Api } from '#/api/settlement-management/input-invoice-admin';
import { buildAttachmentUrl } from '#/utils';

import {
  getCheckedStatusLabel,
  getEnterAccountDealStatusLabel,
  getEnterAccountStatusLabel,
  getGeneralTypeLabel,
  getInternationalSignLabel,
  getInvoiceLineLabel,
  getInvoiceProcessLabel,
  getInvoiceStatusLabel,
  getInvoiceTypeLabel,
  getLevelLabel,
  getManagementStatusLabel,
  getPaymentApplicationStatusLabel,
  getReimbursementStatusLabel,
  getSignStatusLabel,
  getSpecialTypeLabel,
  getVoucherSourceLabel,
} from './constants';
import { getInvoiceStatusColor } from './data';
import { buildNestedTables } from './detail-columns';

const route = useRoute();
const { closeCurrentTab } = useTabs();

/** 详情主键来自路由参数，支持在多个详情 tab 间切换时重新加载 */
const detailId = computed<string | undefined>(() => {
  const id = route.params.id;
  if (Array.isArray(id)) return id[0] ? String(id[0]) : undefined;
  return id ? String(id) : undefined;
});

const loading = ref(false);
const detail = ref<Api.InputInvoiceDetailDto | null>(null);

const text = (value: any): string => {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
};

const fmtDateTime = (value: any): string => {
  if (!value) return '-';
  const parsed = dayjs(value);
  return parsed.isValid()
    ? parsed.format('YYYY-MM-DD HH:mm:ss')
    : String(value);
};

const fmtMoney = (value: any): string => {
  if (value === null || value === undefined || value === '') return '-';
  const num = Number(value);
  return Number.isNaN(num) ? String(value) : num.toFixed(2);
};

/** 表格行 key：多数嵌套数组无稳定主键，用索引 */
const rowKeyByIndex = (_record: any, index: any) => index;

const nestedTables = computed(() =>
  detail.value ? buildNestedTables(detail.value) : [],
);

const attachments = computed(() => detail.value?.attachments ?? []);

/** 机动车/二手车票头：任一字段有值才展示该区 */
const hasVehicleInfo = computed(() => {
  const d = detail.value;
  if (!d) return false;
  return [
    d.vehicleType,
    d.vehicleBrandModel,
    d.vin,
    d.engineNo,
    d.licensePlateNo,
    d.certificateNo,
    d.auctionCompany,
    d.usedCarCompany,
  ].some((v) => !!v);
});

/** 航空票头：任一字段有值才展示该区 */
const hasAirInfo = computed(() => {
  const d = detail.value;
  if (!d) return false;
  return [
    d.passengerName,
    d.ticketNum,
    d.fare,
    d.fuelSurcharge,
    d.gpOrderNum,
    d.internationalSign,
  ].some((v) => v !== null && v !== undefined && v !== '');
});

/** 组织串（顶→底）拼接展示 */
const orgsText = computed(() => {
  const orgs = detail.value?.orgs;
  if (!orgs || orgs.length === 0) return '-';
  return orgs
    .map((org) => org.name)
    .filter(Boolean)
    .join(' / ');
});

async function loadDetail(id: string) {
  loading.value = true;
  try {
    detail.value = await Api.detail(id);
  } catch {
    detail.value = null;
  } finally {
    loading.value = false;
  }
}

/** 关闭当前详情 tab */
function handleClose() {
  void closeCurrentTab();
}

onMounted(() => {
  if (detailId.value) {
    void loadDetail(detailId.value);
  }
});

watch(detailId, (id) => {
  if (id) {
    void loadDetail(id);
  } else {
    detail.value = null;
  }
});
</script>

<template>
  <Page title="进项发票详情" auto-content-height>
    <template #extra>
      <Button @click="handleClose">关闭</Button>
    </template>

    <Spin :spinning="loading">
      <div v-if="detail" class="pr-2">
        <!-- 票面概要 -->
        <Descriptions bordered size="small" :column="3">
          <template #title>
            <div class="section-title">
              <span class="section-title-icon">
                <IconifyIcon icon="mdi:receipt-text-outline" />
              </span>
              <span class="section-title-text">票面概要</span>
            </div>
          </template>
          <DescriptionsItem label="发票号码">
            {{ text(detail.invoiceNo) }}
          </DescriptionsItem>
          <DescriptionsItem label="数电号码">
            {{ text(detail.elecInvoiceNumber) }}
          </DescriptionsItem>
          <DescriptionsItem label="发票代码">
            {{ text(detail.invoiceCode) }}
          </DescriptionsItem>
          <DescriptionsItem label="发票种类">
            {{ getInvoiceLineLabel(detail.invoiceLine) }}
          </DescriptionsItem>
          <DescriptionsItem label="蓝/红">
            {{ getInvoiceTypeLabel(detail.invoiceType) }}
          </DescriptionsItem>
          <DescriptionsItem label="发票状态">
            <Tag
              v-if="detail.invoiceStatus"
              :color="getInvoiceStatusColor(detail.invoiceStatus)"
            >
              {{ getInvoiceStatusLabel(detail.invoiceStatus) }}
            </Tag>
            <span v-else>-</span>
          </DescriptionsItem>
          <DescriptionsItem label="开票时间">
            {{ fmtDateTime(detail.invoiceTime) }}
          </DescriptionsItem>
          <DescriptionsItem label="精确等级">
            {{ getLevelLabel(detail.level) }}
          </DescriptionsItem>
          <DescriptionsItem label="特定业务">
            {{ getSpecialTypeLabel(detail.specialInvoiceType) }}
          </DescriptionsItem>
          <DescriptionsItem label="开票人">
            {{ text(detail.clerk) }}
          </DescriptionsItem>
          <DescriptionsItem label="是否已使用">
            <Tag v-if="detail.isUsed" color="processing">已使用</Tag>
            <span v-else>未使用</span>
          </DescriptionsItem>
          <DescriptionsItem label="关联付费申请">
            <span v-if="detail.paymentApplication">
              {{ text(detail.paymentApplication.applicationNo) }}
              （{{
                getPaymentApplicationStatusLabel(
                  detail.paymentApplication.status,
                )
              }}
              /
              {{
                getInvoiceProcessLabel(
                  detail.paymentApplication.invoiceProcess,
                )
              }}）
            </span>
            <span v-else>-</span>
          </DescriptionsItem>
        </Descriptions>

        <!-- 金额信息 -->
        <Descriptions bordered size="small" :column="4" class="mt-4">
          <template #title>
            <div class="section-title">
              <span class="section-title-icon">
                <IconifyIcon icon="mdi:cash-multiple" />
              </span>
              <span class="section-title-text">金额信息</span>
            </div>
          </template>
          <DescriptionsItem label="含税总金额">
            {{ fmtMoney(detail.totalAmount) }}
          </DescriptionsItem>
          <DescriptionsItem label="不含税总金额">
            {{ fmtMoney(detail.exTaxAmount) }}
          </DescriptionsItem>
          <DescriptionsItem label="税额">
            {{ fmtMoney(detail.taxAmount) }}
          </DescriptionsItem>
          <DescriptionsItem label="本位币">
            {{ text(detail.localCurrencyCode) }}
          </DescriptionsItem>
        </Descriptions>

        <!-- 销方 / 购方 -->
        <Descriptions bordered size="small" :column="2" class="mt-4">
          <template #title>
            <div class="section-title">
              <span class="section-title-icon">
                <IconifyIcon icon="mdi:account-multiple-outline" />
              </span>
              <span class="section-title-text">销方 / 购方</span>
            </div>
          </template>
          <DescriptionsItem label="销方名称">
            {{ text(detail.sellerHeader) }}
          </DescriptionsItem>
          <DescriptionsItem label="购方名称">
            {{ text(detail.payerName) }}
          </DescriptionsItem>
          <DescriptionsItem label="销方税号">
            {{ text(detail.sellerTaxNo) }}
          </DescriptionsItem>
          <DescriptionsItem label="购方税号">
            {{ text(detail.payerTaxNo) }}
          </DescriptionsItem>
          <DescriptionsItem label="销方地址">
            {{ text(detail.sellerAddress) }}
          </DescriptionsItem>
          <DescriptionsItem label="购方地址">
            {{ text(detail.payerAddress) }}
          </DescriptionsItem>
          <DescriptionsItem label="销方电话">
            {{ text(detail.sellerPhone) }}
          </DescriptionsItem>
          <DescriptionsItem label="购方电话">
            {{ text(detail.payerPhone) }}
          </DescriptionsItem>
          <DescriptionsItem label="销方银行账号">
            {{ text(detail.sellerAccount) }}
          </DescriptionsItem>
          <DescriptionsItem label="购方银行账号">
            {{ text(detail.payerAccount || detail.buyerBankAccount) }}
          </DescriptionsItem>
        </Descriptions>

        <!-- 状态与查验 -->
        <Descriptions bordered size="small" :column="3" class="mt-4">
          <template #title>
            <div class="section-title">
              <span class="section-title-icon">
                <IconifyIcon icon="mdi:clipboard-check-outline" />
              </span>
              <span class="section-title-text">状态与查验</span>
            </div>
          </template>
          <DescriptionsItem label="查验状态">
            {{ getCheckedStatusLabel(detail.checkedInvoiceStatus) }}
          </DescriptionsItem>
          <DescriptionsItem label="查验状态(新)">
            {{ getCheckedStatusLabel(detail.checkedInvoiceStatusNew) }}
          </DescriptionsItem>
          <DescriptionsItem label="查验时间">
            {{ fmtDateTime(detail.checkTime) }}
          </DescriptionsItem>
          <DescriptionsItem label="报销状态">
            {{ getReimbursementStatusLabel(detail.reimbursementStatus) }}
          </DescriptionsItem>
          <DescriptionsItem label="报销时间">
            {{ fmtDateTime(detail.reimbursementDate) }}
          </DescriptionsItem>
          <DescriptionsItem label="报销人">
            {{ text(detail.reimbursementName) }}
          </DescriptionsItem>
          <DescriptionsItem label="签收状态">
            {{ getSignStatusLabel(detail.signStatus) }}
          </DescriptionsItem>
          <DescriptionsItem label="签收时间">
            {{ fmtDateTime(detail.signTime) }}
          </DescriptionsItem>
          <DescriptionsItem label="签收人">
            {{ text(detail.signUserName) }}
          </DescriptionsItem>
          <DescriptionsItem label="入账状态">
            {{ getEnterAccountStatusLabel(detail.enterAccountStatus) }}
          </DescriptionsItem>
          <DescriptionsItem label="入账处理状态">
            {{ getEnterAccountDealStatusLabel(detail.enterAccountDealStatus) }}
          </DescriptionsItem>
          <DescriptionsItem label="入账时间">
            {{ fmtDateTime(detail.enterAccountTime) }}
          </DescriptionsItem>
          <DescriptionsItem label="入账失败原因" :span="2">
            {{ text(detail.enterAccountFailReason) }}
          </DescriptionsItem>
          <DescriptionsItem label="风险等级">
            {{ getManagementStatusLabel(detail.managementStatus) }}
          </DescriptionsItem>
          <DescriptionsItem label="计算抵扣种类">
            {{ getGeneralTypeLabel(detail.generalType) }}
          </DescriptionsItem>
        </Descriptions>

        <!-- 票据与凭证 -->
        <Descriptions bordered size="small" :column="3" class="mt-4">
          <template #title>
            <div class="section-title">
              <span class="section-title-icon">
                <IconifyIcon icon="mdi:shield-check-outline" />
              </span>
              <span class="section-title-text">票据与凭证</span>
            </div>
          </template>
          <DescriptionsItem label="发票流水号">
            {{ text(detail.serialNo) }}
          </DescriptionsItem>
          <DescriptionsItem label="收款人">
            {{ text(detail.payee) }}
          </DescriptionsItem>
          <DescriptionsItem label="复核人">
            {{ text(detail.checker) }}
          </DescriptionsItem>
          <DescriptionsItem label="机器编码">
            {{ text(detail.machineCode) }}
          </DescriptionsItem>
          <DescriptionsItem label="校验码">
            {{ text(detail.checkCode) }}
          </DescriptionsItem>
          <DescriptionsItem label="电子凭证来源">
            {{ getVoucherSourceLabel(detail.voucherSource) }}
          </DescriptionsItem>
          <DescriptionsItem label="密文区" :span="3">
            {{ text(detail.cipherText) }}
          </DescriptionsItem>
          <DescriptionsItem label="版式文件" :span="3">
            <a
              v-if="detail.pdfUrl"
              :href="detail.pdfUrl"
              target="_blank"
              class="text-blue-600"
            >
              {{ detail.pdfUrl }}
            </a>
            <span v-else>-</span>
          </DescriptionsItem>
          <DescriptionsItem label="发票图片" :span="3">
            <a
              v-if="detail.pictureUrl"
              :href="detail.pictureUrl"
              target="_blank"
              class="text-blue-600"
            >
              {{ detail.pictureUrl }}
            </a>
            <span v-else>-</span>
          </DescriptionsItem>
          <DescriptionsItem label="归集时间">
            {{ fmtDateTime(detail.collectionTime) }}
          </DescriptionsItem>
          <DescriptionsItem label="发票池更新时间">
            {{ fmtDateTime(detail.poolUpdateTime) }}
          </DescriptionsItem>
          <DescriptionsItem label="提示信息">
            {{ text(detail.promptInformation) }}
          </DescriptionsItem>
        </Descriptions>

        <!-- 机动车 / 二手车 -->
        <Descriptions
          v-if="hasVehicleInfo"
          bordered
          size="small"
          :column="3"
          class="mt-4"
        >
          <template #title>
            <div class="section-title">
              <span class="section-title-icon">
                <IconifyIcon icon="mdi:car-outline" />
              </span>
              <span class="section-title-text">机动车 / 二手车信息</span>
            </div>
          </template>
          <DescriptionsItem label="车辆类型">
            {{ text(detail.vehicleType) }}
          </DescriptionsItem>
          <DescriptionsItem label="品牌型号">
            {{ text(detail.vehicleBrandModel) }}
          </DescriptionsItem>
          <DescriptionsItem label="产地">
            {{ text(detail.producingArea) }}
          </DescriptionsItem>
          <DescriptionsItem label="合格证号">
            {{ text(detail.certificateNo) }}
          </DescriptionsItem>
          <DescriptionsItem label="商检单号">
            {{ text(detail.commodityInspectionNo) }}
          </DescriptionsItem>
          <DescriptionsItem label="发动机号">
            {{ text(detail.engineNo) }}
          </DescriptionsItem>
          <DescriptionsItem label="车辆识别代号">
            {{ text(detail.vin) }}
          </DescriptionsItem>
          <DescriptionsItem label="进口证明书号">
            {{ text(detail.importCertificateNo) }}
          </DescriptionsItem>
          <DescriptionsItem label="车牌号">
            {{ text(detail.licensePlateNo) }}
          </DescriptionsItem>
          <DescriptionsItem label="车辆登记证书号">
            {{ text(detail.vehicleRegisterNo) }}
          </DescriptionsItem>
          <DescriptionsItem label="吨位">
            {{ text(detail.tonnage) }}
          </DescriptionsItem>
          <DescriptionsItem label="限乘人数">
            {{ text(detail.limitedNumber) }}
          </DescriptionsItem>
          <DescriptionsItem label="机动车税率">
            {{ text(detail.taxRate) }}
          </DescriptionsItem>
          <DescriptionsItem label="完税凭证号码">
            {{ text(detail.taxPaymentCertificateNo) }}
          </DescriptionsItem>
          <DescriptionsItem label="主管税务机关">
            {{ text(detail.taxAuthorityName) }}
          </DescriptionsItem>
          <DescriptionsItem label="转入地车管所">
            {{ text(detail.intoVehicleManagementStat) }}
          </DescriptionsItem>
          <DescriptionsItem label="经营/拍卖单位">
            {{ text(detail.auctionCompany) }}
          </DescriptionsItem>
          <DescriptionsItem label="经营/拍卖单位地址">
            {{ text(detail.auctionCompanyAddress) }}
          </DescriptionsItem>
          <DescriptionsItem label="经营/拍卖单位税号">
            {{ text(detail.auctionCompanyTaxNo) }}
          </DescriptionsItem>
          <DescriptionsItem label="二手车市场">
            {{ text(detail.usedCarCompany) }}
          </DescriptionsItem>
          <DescriptionsItem label="二手车市场地址">
            {{ text(detail.usedCarCompanyAddress1) }}
          </DescriptionsItem>
          <DescriptionsItem label="二手车公司税号">
            {{ text(detail.usedCarCompanyTaxNo) }}
          </DescriptionsItem>
        </Descriptions>

        <!-- 航空票 -->
        <Descriptions
          v-if="hasAirInfo"
          bordered
          size="small"
          :column="3"
          class="mt-4"
        >
          <template #title>
            <div class="section-title">
              <span class="section-title-icon">
                <IconifyIcon icon="mdi:airplane" />
              </span>
              <span class="section-title-text">航空票信息</span>
            </div>
          </template>
          <DescriptionsItem label="旅客姓名">
            {{ text(detail.passengerName) }}
          </DescriptionsItem>
          <DescriptionsItem label="有效身份证件号">
            {{ text(detail.valididNum) }}
          </DescriptionsItem>
          <DescriptionsItem label="国内国际标识">
            {{ getInternationalSignLabel(detail.internationalSign) }}
          </DescriptionsItem>
          <DescriptionsItem label="电子客票号码">
            {{ text(detail.ticketNum) }}
          </DescriptionsItem>
          <DescriptionsItem label="GP单号">
            {{ text(detail.gpOrderNum) }}
          </DescriptionsItem>
          <DescriptionsItem label="签注">
            {{ text(detail.endorsement) }}
          </DescriptionsItem>
          <DescriptionsItem label="票价">
            {{ text(detail.fare) }}
          </DescriptionsItem>
          <DescriptionsItem label="燃油附加费">
            {{ text(detail.fuelSurcharge) }}
          </DescriptionsItem>
          <DescriptionsItem label="民航发展基金">
            {{ text(detail.developmentFund) }}
          </DescriptionsItem>
          <DescriptionsItem label="其他税费">
            {{ text(detail.otherTaxes) }}
          </DescriptionsItem>
          <DescriptionsItem label="保险费">
            {{ text(detail.insurance) }}
          </DescriptionsItem>
          <DescriptionsItem label="销售网点代号">
            {{ text(detail.agentCode) }}
          </DescriptionsItem>
          <DescriptionsItem label="填开单位">
            {{ text(detail.issueParty) }}
          </DescriptionsItem>
          <DescriptionsItem label="二维码" :span="2">
            {{ text(detail.qrCode) }}
          </DescriptionsItem>
        </Descriptions>

        <!-- 组织与系统信息 -->
        <Descriptions bordered size="small" :column="3" class="mt-4">
          <template #title>
            <div class="section-title">
              <span class="section-title-icon">
                <IconifyIcon icon="mdi:sitemap-outline" />
              </span>
              <span class="section-title-text">组织与系统信息</span>
            </div>
          </template>
          <DescriptionsItem label="所属公司">
            {{ text(detail.company?.displayName) }}
          </DescriptionsItem>
          <DescriptionsItem label="组织串" :span="2">
            {{ orgsText }}
          </DescriptionsItem>
          <DescriptionsItem label="落入本地时间">
            {{ fmtDateTime(detail.creationTime) }}
          </DescriptionsItem>
          <DescriptionsItem label="创建人">
            {{ text(detail.creatorUserName) }}
          </DescriptionsItem>
          <DescriptionsItem label="最近更新">
            {{ fmtDateTime(detail.lastModificationTime) }}
          </DescriptionsItem>
          <DescriptionsItem label="修改人">
            {{ text(detail.lastModifierUserName) }}
          </DescriptionsItem>
          <DescriptionsItem label="备注" :span="2">
            {{ text(detail.remark) }}
          </DescriptionsItem>
        </Descriptions>

        <!-- 版式文件附件 -->
        <div class="mt-4">
          <div class="section-title mb-3">
            <span class="section-title-icon">
              <IconifyIcon icon="mdi:paperclip" />
            </span>
            <span class="section-title-text">版式文件附件</span>
          </div>
          <div
            v-if="attachments.length > 0"
            class="flex flex-col gap-1 rounded border border-gray-200 p-3"
          >
            <a
              v-for="att in attachments"
              :key="att.id"
              :href="buildAttachmentUrl(att.url)"
              target="_blank"
              class="inline-flex items-center gap-2 text-blue-600 hover:underline"
            >
              <span>{{ att.friendlyFileName || '附件' }}</span>
              <span v-if="att.fileLength" class="text-xs text-gray-400">
                （{{ att.fileLength }} 字节）
              </span>
            </a>
          </div>
          <Empty v-else description="暂无附件" />
        </div>

        <!-- 商品明细 / 特定业务嵌套数组 -->
        <div v-for="table in nestedTables" :key="table.key" class="mt-4">
          <div class="section-title mb-3">
            <span class="section-title-icon">
              <IconifyIcon icon="mdi:table" />
            </span>
            <span class="section-title-text">{{ table.title }}</span>
          </div>
          <Table
            :columns="table.columns"
            :data-source="table.data"
            :pagination="false"
            :row-key="rowKeyByIndex"
            :scroll="{ x: 'max-content' }"
            size="small"
            bordered
          />
        </div>
      </div>
      <Empty v-else-if="!loading" description="暂无数据" />
    </Spin>
  </Page>
</template>

<style scoped>
/* 区块标题：图标徽章 + 加粗文字，强化与内容的区分度（颜色统一走设计 token，兼容暗色） */
.section-title {
  display: flex;
  gap: 8px;
  align-items: center;
}

.section-title-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  font-size: 15px;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
  border-radius: 7px;
}

.section-title-text {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  color: hsl(var(--foreground));
}

/* 收紧描述列表头部与内容的间距，使徽章标题与表格更贴合 */
:deep(.ant-descriptions-header) {
  margin-bottom: 10px;
}

/* ===== 描述列表（票面信息表）紧凑化 ===== */
:deep(.ant-descriptions-view) {
  border-color: hsl(var(--border));
}

:deep(.ant-descriptions-bordered .ant-descriptions-item-label),
:deep(.ant-descriptions-bordered .ant-descriptions-item-content) {
  padding: 6px 12px;
  font-size: 13px;
  line-height: 1.5;
  border-color: hsl(var(--border));
}

:deep(.ant-descriptions-bordered .ant-descriptions-item-label) {
  font-weight: 600;
  color: hsl(var(--foreground));
  white-space: nowrap;
  background: hsl(var(--muted) / 55%);
}

:deep(.ant-descriptions-bordered .ant-descriptions-item-content) {
  color: hsl(var(--foreground));
  word-break: break-all;
}

/* ===== 明细表格紧凑化 ===== */
:deep(.ant-table) {
  font-size: 13px;
}

:deep(.ant-table-container) {
  border-color: hsl(var(--border));
}

:deep(.ant-table-thead > tr > th) {
  padding: 8px 10px;
  font-size: 13px;
  font-weight: 600;
  color: hsl(var(--foreground));
  background: hsl(var(--muted) / 55%);
  border-color: hsl(var(--border));
}

:deep(.ant-table-tbody > tr > td) {
  padding: 6px 10px;
  color: hsl(var(--foreground));
  border-color: hsl(var(--border));
}

/* 隔行微底色 + hover 主色高亮，提升可读性 */
:deep(.ant-table-tbody > tr:nth-child(even) > td) {
  background: hsl(var(--muted) / 25%);
}

:deep(.ant-table-tbody > tr:hover > td) {
  background: hsl(var(--primary) / 8%);
}
</style>
