<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useTabs } from '@vben/hooks';
import { IconifyIcon } from '@vben/icons';

import { Button, Empty, Spin, Table, Tag } from 'ant-design-vue';
import dayjs from 'dayjs';

import { InputInvoiceAdminApi as Api } from '#/api/settlement-management/input-invoice-admin';
import { buildAttachmentUrl } from '#/utils';

import {
  getCheckedStatusLabel,
  getInternationalSignLabel,
  getInvoiceLineLabel,
  getInvoiceProcessLabel,
  getInvoiceStatusLabel,
  getInvoiceTypeLabel,
  getPaymentApplicationStatusLabel,
  getSpecialTypeLabel,
} from './constants';
import { getInvoiceStatusColor, getInvoiceTypeColor } from './data';
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
      <div v-if="detail" class="detail-body">
        <!-- 票面概要 -->
        <section class="detail-band">
          <div class="section-title">
            <span class="section-title-icon">
              <IconifyIcon icon="mdi:receipt-text-outline" />
            </span>
            <span class="section-title-text">票面概要</span>
          </div>
          <div class="field-grid field-grid--4">
            <div class="field">
              <span class="field-label">发票号码：</span>
              <span class="field-value">{{ text(detail.invoiceNo) }}</span>
            </div>
            <div class="field">
              <span class="field-label">发票种类：</span>
              <span class="field-value">{{
                getInvoiceLineLabel(detail.invoiceLine)
              }}</span>
            </div>
            <div class="field">
              <span class="field-label">蓝/红：</span>
              <span class="field-value">
                <Tag
                  v-if="detail.invoiceType"
                  :color="getInvoiceTypeColor(detail.invoiceType)"
                >
                  {{ getInvoiceTypeLabel(detail.invoiceType) }}
                </Tag>
                <template v-else>-</template>
              </span>
            </div>
            <div class="field">
              <span class="field-label">发票状态：</span>
              <span class="field-value">
                <Tag
                  v-if="detail.invoiceStatus"
                  :color="getInvoiceStatusColor(detail.invoiceStatus)"
                >
                  {{ getInvoiceStatusLabel(detail.invoiceStatus) }}
                </Tag>
                <template v-else>-</template>
              </span>
            </div>
            <div class="field">
              <span class="field-label">开票时间：</span>
              <span class="field-value">{{
                fmtDateTime(detail.invoiceTime)
              }}</span>
            </div>
            <div class="field">
              <span class="field-label">特定业务：</span>
              <span class="field-value">{{
                getSpecialTypeLabel(detail.specialInvoiceType)
              }}</span>
            </div>
            <div class="field">
              <span class="field-label">开票人：</span>
              <span class="field-value">{{ text(detail.clerk) }}</span>
            </div>
            <div class="field">
              <span class="field-label">是否已使用：</span>
              <span class="field-value">
                <Tag v-if="detail.isUsed" color="processing">已使用</Tag>
                <template v-else>未使用</template>
              </span>
            </div>
            <div class="field">
              <span class="field-label">查验状态：</span>
              <span class="field-value">{{
                getCheckedStatusLabel(detail.checkedInvoiceStatus)
              }}</span>
            </div>
            <div class="field">
              <span class="field-label">发票流水号：</span>
              <span class="field-value">{{ text(detail.serialNo) }}</span>
            </div>
            <div class="field">
              <span class="field-label">收款人：</span>
              <span class="field-value">{{ text(detail.payee) }}</span>
            </div>
            <div class="field">
              <span class="field-label">复核人：</span>
              <span class="field-value">{{ text(detail.checker) }}</span>
            </div>
            <div class="field field--span2">
              <span class="field-label">关联付费申请：</span>
              <span class="field-value">
                <template v-if="detail.paymentApplication">
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
                </template>
                <template v-else>-</template>
              </span>
            </div>
            <div class="field field--full">
              <span class="field-label">备注：</span>
              <span class="field-value">{{ text(detail.remark) }}</span>
            </div>
          </div>
        </section>

        <!-- 金额信息 -->
        <section class="detail-band">
          <div class="section-title">
            <span class="section-title-icon">
              <IconifyIcon icon="mdi:cash-multiple" />
            </span>
            <span class="section-title-text">金额信息</span>
          </div>
          <div class="field-grid field-grid--4">
            <div class="field">
              <span class="field-label">含税总金额：</span>
              <span class="field-value field-value--strong">{{
                fmtMoney(detail.totalAmount)
              }}</span>
            </div>
            <div class="field">
              <span class="field-label">不含税总金额：</span>
              <span class="field-value field-value--strong">{{
                fmtMoney(detail.exTaxAmount)
              }}</span>
            </div>
            <div class="field">
              <span class="field-label">税额：</span>
              <span class="field-value field-value--strong">{{
                fmtMoney(detail.taxAmount)
              }}</span>
            </div>
            <div class="field">
              <span class="field-label">本位币：</span>
              <span class="field-value">{{
                text(detail.localCurrencyCode)
              }}</span>
            </div>
          </div>
        </section>

        <!-- 销方 / 购方 -->
        <section class="detail-band">
          <div class="section-title">
            <span class="section-title-icon">
              <IconifyIcon icon="mdi:account-multiple-outline" />
            </span>
            <span class="section-title-text">销方 / 购方</span>
          </div>
          <div class="field-grid field-grid--2">
            <div class="field">
              <span class="field-label">销方名称：</span>
              <span class="field-value">{{ text(detail.sellerHeader) }}</span>
            </div>
            <div class="field">
              <span class="field-label">购方名称：</span>
              <span class="field-value">{{ text(detail.payerName) }}</span>
            </div>
            <div class="field">
              <span class="field-label">销方税号：</span>
              <span class="field-value">{{ text(detail.sellerTaxNo) }}</span>
            </div>
            <div class="field">
              <span class="field-label">购方税号：</span>
              <span class="field-value">{{ text(detail.payerTaxNo) }}</span>
            </div>
            <div class="field">
              <span class="field-label">销方地址：</span>
              <span class="field-value">{{ text(detail.sellerAddress) }}</span>
            </div>
            <div class="field">
              <span class="field-label">购方地址：</span>
              <span class="field-value">{{ text(detail.payerAddress) }}</span>
            </div>
            <div class="field">
              <span class="field-label">销方电话：</span>
              <span class="field-value">{{ text(detail.sellerPhone) }}</span>
            </div>
            <div class="field">
              <span class="field-label">购方电话：</span>
              <span class="field-value">{{ text(detail.payerPhone) }}</span>
            </div>
            <div class="field">
              <span class="field-label">销方银行账号：</span>
              <span class="field-value">{{ text(detail.sellerAccount) }}</span>
            </div>
            <div class="field">
              <span class="field-label">购方银行账号：</span>
              <span class="field-value">{{
                text(detail.payerAccount || detail.buyerBankAccount)
              }}</span>
            </div>
          </div>
        </section>

        <!-- 机动车 / 二手车 -->
        <section v-if="hasVehicleInfo" class="detail-band">
          <div class="section-title">
            <span class="section-title-icon">
              <IconifyIcon icon="mdi:car-outline" />
            </span>
            <span class="section-title-text">机动车 / 二手车信息</span>
          </div>
          <div class="field-grid field-grid--3">
            <div class="field">
              <span class="field-label">车辆类型：</span
              ><span class="field-value">{{ text(detail.vehicleType) }}</span>
            </div>
            <div class="field">
              <span class="field-label">品牌型号：</span
              ><span class="field-value">{{
                text(detail.vehicleBrandModel)
              }}</span>
            </div>
            <div class="field">
              <span class="field-label">产地：</span
              ><span class="field-value">{{ text(detail.producingArea) }}</span>
            </div>
            <div class="field">
              <span class="field-label">合格证号：</span
              ><span class="field-value">{{ text(detail.certificateNo) }}</span>
            </div>
            <div class="field">
              <span class="field-label">商检单号：</span
              ><span class="field-value">{{
                text(detail.commodityInspectionNo)
              }}</span>
            </div>
            <div class="field">
              <span class="field-label">发动机号：</span
              ><span class="field-value">{{ text(detail.engineNo) }}</span>
            </div>
            <div class="field">
              <span class="field-label">车辆识别代号：</span
              ><span class="field-value">{{ text(detail.vin) }}</span>
            </div>
            <div class="field">
              <span class="field-label">进口证明书号：</span
              ><span class="field-value">{{
                text(detail.importCertificateNo)
              }}</span>
            </div>
            <div class="field">
              <span class="field-label">车牌号：</span
              ><span class="field-value">{{
                text(detail.licensePlateNo)
              }}</span>
            </div>
            <div class="field">
              <span class="field-label">车辆登记证书号：</span
              ><span class="field-value">{{
                text(detail.vehicleRegisterNo)
              }}</span>
            </div>
            <div class="field">
              <span class="field-label">吨位：</span
              ><span class="field-value">{{ text(detail.tonnage) }}</span>
            </div>
            <div class="field">
              <span class="field-label">限乘人数：</span
              ><span class="field-value">{{ text(detail.limitedNumber) }}</span>
            </div>
            <div class="field">
              <span class="field-label">机动车税率：</span
              ><span class="field-value">{{ text(detail.taxRate) }}</span>
            </div>
            <div class="field">
              <span class="field-label">完税凭证号码：</span
              ><span class="field-value">{{
                text(detail.taxPaymentCertificateNo)
              }}</span>
            </div>
            <div class="field">
              <span class="field-label">主管税务机关：</span
              ><span class="field-value">{{
                text(detail.taxAuthorityName)
              }}</span>
            </div>
            <div class="field">
              <span class="field-label">转入地车管所：</span
              ><span class="field-value">{{
                text(detail.intoVehicleManagementStat)
              }}</span>
            </div>
            <div class="field">
              <span class="field-label">经营/拍卖单位：</span
              ><span class="field-value">{{
                text(detail.auctionCompany)
              }}</span>
            </div>
            <div class="field">
              <span class="field-label">经营/拍卖单位地址：</span
              ><span class="field-value">{{
                text(detail.auctionCompanyAddress)
              }}</span>
            </div>
            <div class="field">
              <span class="field-label">经营/拍卖单位税号：</span
              ><span class="field-value">{{
                text(detail.auctionCompanyTaxNo)
              }}</span>
            </div>
            <div class="field">
              <span class="field-label">二手车市场：</span
              ><span class="field-value">{{
                text(detail.usedCarCompany)
              }}</span>
            </div>
            <div class="field">
              <span class="field-label">二手车市场地址：</span
              ><span class="field-value">{{
                text(detail.usedCarCompanyAddress1)
              }}</span>
            </div>
            <div class="field">
              <span class="field-label">二手车公司税号：</span
              ><span class="field-value">{{
                text(detail.usedCarCompanyTaxNo)
              }}</span>
            </div>
          </div>
        </section>

        <!-- 航空票 -->
        <section v-if="hasAirInfo" class="detail-band">
          <div class="section-title">
            <span class="section-title-icon">
              <IconifyIcon icon="mdi:airplane" />
            </span>
            <span class="section-title-text">航空票信息</span>
          </div>
          <div class="field-grid field-grid--3">
            <div class="field">
              <span class="field-label">旅客姓名：</span
              ><span class="field-value">{{ text(detail.passengerName) }}</span>
            </div>
            <div class="field">
              <span class="field-label">有效身份证件号：</span
              ><span class="field-value">{{ text(detail.valididNum) }}</span>
            </div>
            <div class="field">
              <span class="field-label">国内国际标识：</span
              ><span class="field-value">{{
                getInternationalSignLabel(detail.internationalSign)
              }}</span>
            </div>
            <div class="field">
              <span class="field-label">电子客票号码：</span
              ><span class="field-value">{{ text(detail.ticketNum) }}</span>
            </div>
            <div class="field">
              <span class="field-label">GP单号：</span
              ><span class="field-value">{{ text(detail.gpOrderNum) }}</span>
            </div>
            <div class="field">
              <span class="field-label">签注：</span
              ><span class="field-value">{{ text(detail.endorsement) }}</span>
            </div>
            <div class="field">
              <span class="field-label">票价：</span
              ><span class="field-value">{{ text(detail.fare) }}</span>
            </div>
            <div class="field">
              <span class="field-label">燃油附加费：</span
              ><span class="field-value">{{ text(detail.fuelSurcharge) }}</span>
            </div>
            <div class="field">
              <span class="field-label">民航发展基金：</span
              ><span class="field-value">{{
                text(detail.developmentFund)
              }}</span>
            </div>
            <div class="field">
              <span class="field-label">其他税费：</span
              ><span class="field-value">{{ text(detail.otherTaxes) }}</span>
            </div>
            <div class="field">
              <span class="field-label">保险费：</span
              ><span class="field-value">{{ text(detail.insurance) }}</span>
            </div>
            <div class="field">
              <span class="field-label">销售网点代号：</span
              ><span class="field-value">{{ text(detail.agentCode) }}</span>
            </div>
            <div class="field">
              <span class="field-label">填开单位：</span
              ><span class="field-value">{{ text(detail.issueParty) }}</span>
            </div>
            <div class="field field--span2">
              <span class="field-label">二维码：</span
              ><span class="field-value">{{ text(detail.qrCode) }}</span>
            </div>
          </div>
        </section>

        <!-- 版式文件附件 -->
        <section class="detail-band">
          <div class="section-title">
            <span class="section-title-icon">
              <IconifyIcon icon="mdi:paperclip" />
            </span>
            <span class="section-title-text">版式文件附件</span>
          </div>
          <div v-if="attachments.length > 0" class="attach-list">
            <a
              v-for="att in attachments"
              :key="att.id"
              :href="buildAttachmentUrl(att.url)"
              target="_blank"
              class="field-link inline-flex items-center gap-2"
            >
              <span>{{ att.friendlyFileName || '附件' }}</span>
              <span v-if="att.fileLength" class="text-xs opacity-60">
                （{{ att.fileLength }} 字节）
              </span>
            </a>
          </div>
          <Empty v-else description="暂无附件" />
        </section>

        <!-- 商品明细 / 特定业务嵌套数组 -->
        <section
          v-for="table in nestedTables"
          :key="table.key"
          class="detail-band"
        >
          <div class="section-title">
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
        </section>
      </div>
      <Empty v-else-if="!loading" description="暂无数据" />
    </Spin>
  </Page>
</template>

<style scoped>
.detail-body {
  padding-right: 4px;
}

/* 分组条带：无边框字段网格，条带之间用浅色分隔线区隔（颜色走设计 token，兼容暗色） */
.detail-band + .detail-band {
  padding-top: 16px;
  margin-top: 18px;
  border-top: 1px solid hsl(var(--border));
}

/* 分组标题：图标徽章 + 加粗文字 */
.section-title {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
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
  color: hsl(var(--foreground));
}

/* 字段网格：label：value 同行内联，多列排布，无表格边框 */
.field-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px 28px;
}

.field-grid--3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.field-grid--2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.field {
  display: flex;
  gap: 2px;
  min-width: 0;
  font-size: 13px;
  line-height: 1.7;
}

.field--span2 {
  grid-column: span 2;
}

.field--full {
  grid-column: 1 / -1;
}

.field-label {
  flex: none;
  color: hsl(var(--muted-foreground));
}

.field-value {
  min-width: 0;
  color: hsl(var(--foreground));
  word-break: break-all;
}

/* 金额等关键值加粗突出 */
.field-value--strong {
  font-weight: 600;
}

.field-link {
  color: hsl(var(--primary));
}

.field-link:hover {
  text-decoration: underline;
}

/* 附件列表 */
.attach-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
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

:deep(.ant-table-tbody > tr:nth-child(even) > td) {
  background: hsl(var(--muted) / 25%);
}

:deep(.ant-table-tbody > tr:hover > td) {
  background: hsl(var(--primary) / 8%);
}
</style>
