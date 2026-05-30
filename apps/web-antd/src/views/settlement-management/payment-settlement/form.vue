<script lang="ts" setup>
import type { PaymentSettlementAdminApi } from '#/api/sea-export/payment-settlement-admin';
import type { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';
import type { Attachment } from '#/api/common/upload';

import { computed, onMounted, ref, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import dayjs from 'dayjs';

import { Page } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import {
  Button,
  Card,
  DatePicker,
  Input,
  InputNumber,
  message,
  Select,
  Space,
  Table,
  Tag,
  Upload,
} from 'ant-design-vue';

import {
  OrgBankAccountSelect,
  ClientSelect,
  CurrencySelect,
  ClientBankAccountSelect,
} from '#/adapter/component';
import {
  addPaymentSettlement,
  editPaymentSettlement,
  getPaymentSettlementDetail,
} from '#/api/sea-export/payment-settlement-admin';

import AddApplicationDrawer from './add-application-drawer/index.vue';
import { formatAmount, payTypeOptions } from './form-data';
import { returnToListWithRefresh } from '#/utils/list-refresh-flag';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const editId = computed<string | undefined>(() => {
  const id = route.params.id;
  if (Array.isArray(id)) return id[0];
  return id ? String(id) : undefined;
});
const isEdit = computed(() => !!editId.value);

const pageLoading = ref(false);
const submitting = ref(false);

// 表单数据
const settlementTime = ref(dayjs());
const payType = ref<number | undefined>(undefined);
const settlementId = ref<string>('');
const settlementName = ref('');
const currencyId = ref<number | undefined>(undefined);
const currencyCode = ref('');
const orgBankAccountId = ref<string | undefined>(undefined);
const orgBankAccountName = ref('');
const clientInvoiceBankId = ref<string | undefined>(undefined);
const clientBankName = ref('');
const clientBankAccount = ref('');
const transactionFee = ref<number | undefined>(undefined);
const remark = ref('');
const attachments = ref<Attachment[]>([]);

// 汇率列表
const rateList = ref<PaymentSettlementAdminApi.PaymentSettlementRateAddDto[]>(
  [],
);

// 结算明细列表
interface SettlementItem {
  id: string;
  applicationNo: string;
  settlementName: string;
  currencyCode: string;
  originalAmount: number;
  rate: number;
  settledPrice: number;
  feeCount: number;
  application: PaymentApplicationAdminApi.PaymentApplicationForSettlementDto;
}

const settlementItems = ref<SettlementItem[]>([]);

// 计算是否已有费用
const hasExistingFees = computed(() => settlementItems.value.length > 0);

// 抽屉引用
const addApplicationDrawerRef = ref<InstanceType<
  typeof AddApplicationDrawer
> | null>(null);

// 当前用户
const currentUserName = computed(
  () => userStore.userInfo?.realName || userStore.userInfo?.username || '-',
);

// 计算结算总金额
const totalSettlementAmount = computed(() => {
  const itemsTotal = settlementItems.value.reduce(
    (sum, item) => sum + (item.settledPrice || 0),
    0,
  );
  return itemsTotal + (transactionFee.value || 0);
});

/** 打开选择付费申请抽屉 */
function handleAddApplication() {
  // 新建时不需要前置条件，编辑时如果有费用则锁定筛选条件
  nextTick(() => {
    addApplicationDrawerRef.value?.openDrawer();
  });
}

/** 确认选择付费申请 */
function handleConfirmApplications(
  applications: Array<{
    application: PaymentApplicationAdminApi.PaymentApplicationForSettlementDto;
    settledAmount: number;
  }>,
) {
  // 转换为结算明细
  const newItems: SettlementItem[] = applications.map((app, index) => {
    // 计算汇率（这里需要根据实际业务逻辑获取汇率）
    const rate = 1; // TODO: 从API获取汇率

    return {
      id: `${Date.now()}-${index}`,
      applicationNo: app.application.applicationNo || '',
      settlementName: app.application.clientName || '',
      currencyCode: app.application.currencyCode || '',
      originalAmount: app.settledAmount,
      rate: rate,
      settledPrice: app.settledAmount * rate,
      feeCount:
        app.application.currencyGroup?.reduce(
          (sum, g) => sum + (g.orderFees?.length || 0),
          0,
        ) || 0,
      application: app.application,
    };
  });

  // 添加到列表
  settlementItems.value.push(...newItems);

  // 如果是新建且第一次添加，自动填充结算信息
  if (!isEdit.value && settlementItems.value.length === newItems.length) {
    // 取第一个申请的结算对象和币别
    const firstApp = applications[0].application;
    if (firstApp) {
      settlementId.value = firstApp.settlementId;
      // 注意：currencyId 使用用户在抽屉中选择的值，不从申请单中取
    }
  }

  message.success(`已添加 ${applications.length} 个付费申请`);
}

/** 删除结算明细 */
function handleDeleteItem(index: number) {
  settlementItems.value.splice(index, 1);
}

/** 保存 */
async function handleSave() {
  if (!validateForm()) {
    return;
  }

  submitting.value = true;
  try {
    const data: PaymentSettlementAdminApi.PaymentSettlementAddDto = {
      settlementTime: settlementTime.value.toISOString(),
      payType: payType.value,
      settlementId: settlementId.value,
      currencyId: currencyId.value!,
      orgBankAccountId: orgBankAccountId.value,
      clientInvoiceBankId: clientInvoiceBankId.value,
      transactionFee: transactionFee.value,
      remark: remark.value,
      paymentSettlementRates: rateList.value,
      paymentApplicationGroups: buildPaymentApplicationGroups(),
      attachments: attachments.value.map((a, idx) => ({
        attachmentId: Number(a.attachmentId),
        displayOrder: idx,
      })),
    };

    if (isEdit.value && editId.value) {
      await editPaymentSettlement({
        id: editId.value,
        ...data,
      } as any);
      message.success('保存成功');
      returnToListWithRefresh('PaymentSettlementList', () => {
        router.push('/settlement-management/payment-settlement');
      });
    } else {
      await addPaymentSettlement(data);
      message.success('新建成功');
      returnToListWithRefresh('PaymentSettlementList', () => {
        router.push('/settlement-management/payment-settlement');
      });
    }
  } catch (error: any) {
    message.error(error.message || '操作失败');
  } finally {
    submitting.value = false;
  }
}

/** 构建付费申请分组数据 */
function buildPaymentApplicationGroups(): PaymentSettlementAdminApi.PaymentSettlementAddItemGroupDto[] {
  // 根据 settlementItems 构建分组数据
  const groups: PaymentSettlementAdminApi.PaymentSettlementAddItemGroupDto[] =
    [];

  settlementItems.value.forEach((item) => {
    const app = item.application;
    if (!app.currencyGroup) return;

    const currencyItems: PaymentSettlementAdminApi.PaymentSettlementAddItemCurrencyDto[] =
      [];

    app.currencyGroup.forEach((group) => {
      currencyItems.push({
        originalCurrencyId: group.id,
        settledAmount: item.originalAmount, // TODO: 需要根据实际业务逻辑分配金额到各个币别
      });
    });

    groups.push({
      paymentApplicationId: app.id,
      currencyItems,
    });
  });

  return groups;
}

/** 表单验证 */
function validateForm(): boolean {
  if (!settlementId.value) {
    message.warning('请选择结算对象');
    return false;
  }
  if (!currencyId.value) {
    message.warning('请选择结算币别');
    return false;
  }
  if (settlementItems.value.length === 0) {
    message.warning('请至少添加一个付费申请');
    return false;
  }
  return true;
}

/** 加载编辑数据 */
async function loadEditData() {
  if (!editId.value) return;

  pageLoading.value = true;
  try {
    const detail = await getPaymentSettlementDetail(editId.value);

    settlementTime.value = dayjs(detail.settlementTime);
    payType.value = detail.payType;
    settlementId.value = detail.settlementId;
    settlementName.value = detail.settlementName;
    currencyId.value = detail.currencyId;
    currencyCode.value = detail.currencyCode || '';
    orgBankAccountId.value = detail.orgBankAccountId;
    clientInvoiceBankId.value = detail.clientInvoiceBankId;
    transactionFee.value = detail.transactionFee;
    remark.value = detail.remark || '';

    rateList.value = detail.paymentSettlementRates.map((r) => ({
      originalCurrencyId: r.originalCurrencyId,
      rate: r.rate,
    }));

    // 转换结算明细
    settlementItems.value = detail.paymentSettlementItems.map(
      (item, index) => ({
        id: item.id,
        applicationNo: item.applicationNo,
        settlementName: detail.settlementName,
        currencyCode: item.originalCurrencyCode,
        originalAmount: item.settledAmount,
        rate: item.rate,
        settledPrice: item.settledPrice,
        feeCount: 1, // TODO: 需要获取实际的费用笔数
        application: {} as any, // TODO: 需要从API获取完整的申请信息
      }),
    );

    attachments.value = (detail.attachments ?? []).map((a) => ({
      attachmentId: a.attachmentId,
      url: a.attachmentPath || '',
      fileName: a.attachmentName || '',
    }));
  } finally {
    pageLoading.value = false;
  }
}

// 监听结算对象变化，更新名称并清空银行信息
watch(settlementId, async (newVal) => {
  if (newVal) {
    // 获取客户详情以获取名称
    try {
      const { getClientDetail } = await import('#/api/sea-export/client-admin');
      const detail = await getClientDetail(newVal);
      settlementName.value = detail.name || detail.fullName || '';
    } catch (error) {
      console.error('获取客户详情失败:', error);
    }
  } else {
    settlementName.value = '';
  }
  // 清空银行信息
  clientInvoiceBankId.value = undefined;
});

// 监听结算币别变化，更新币别代码
watch(currencyId, async (newVal) => {
  if (newVal) {
    try {
      const { getCurrencyDetail } =
        await import('#/api/system/base-data/currency-admin');
      const detail = await getCurrencyDetail(String(newVal));
      currencyCode.value = detail.code || '';
    } catch (error) {
      console.error('获取币别详情失败:', error);
    }
  } else {
    currencyCode.value = '';
  }
});

onMounted(() => {
  if (isEdit.value) {
    loadEditData();
  } else {
    // 新建时自动打开抽屉
    nextTick(() => {
      handleAddApplication();
    });
  }
});
</script>

<template>
  <Page :title="isEdit ? '编辑结算单' : '新建结算单'">
    <template #extra>
      <Space>
        <Button @click="router.back()"> 返回 </Button>
        <Button type="primary" @click="handleSave" :loading="submitting">
          确认结算
        </Button>
      </Space>
    </template>

    <div v-loading="pageLoading" style="padding: 16px">
      <!-- 顶部三栏布局 -->
      <div
        style="
          display: grid;
          grid-template-columns: 280px 1fr 280px;
          gap: 16px;
          margin-bottom: 16px;
        "
      >
        <!-- 左侧：结算信息 -->
        <Card title="结算信息" :bordered="true" size="small">
          <div style="display: flex; flex-direction: column; gap: 12px">
            <div>
              <div style="margin-bottom: 4px; font-size: 12px; color: #666">
                结算人
              </div>
              <Input :value="currentUserName" disabled />
            </div>
            <div>
              <div style="margin-bottom: 4px; font-size: 12px; color: #666">
                结算时间
              </div>
              <DatePicker
                v-model:value="settlementTime"
                show-time
                format="YYYY-MM-DD HH:mm"
                style="width: 100%"
              />
            </div>
            <div>
              <div style="margin-bottom: 4px; font-size: 12px; color: #666">
                付款方式
              </div>
              <Select
                v-model:value="payType"
                :options="payTypeOptions"
                placeholder="请选择"
                allow-clear
                style="width: 100%"
              />
            </div>
            <div>
              <div style="margin-bottom: 4px; font-size: 12px; color: #666">
                结算对象
              </div>
              <ClientSelect
                v-model="settlementId"
                placeholder="请选择结算对象"
                allow-clear
                :disabled="hasExistingFees"
                style="width: 100%"
              />
            </div>
            <div>
              <div style="margin-bottom: 4px; font-size: 12px; color: #666">
                结算币别
              </div>
              <CurrencySelect
                v-model="currencyId"
                placeholder="请选择"
                allow-clear
                :disabled="hasExistingFees"
                style="width: 100%"
              />
            </div>
            <div style="margin-top: 8px">
              <div style="margin-bottom: 4px; font-size: 12px; color: #666">
                备注
              </div>
              <Input.TextArea
                v-model:value="remark"
                placeholder="请输入备注信息（选填）"
                :rows="3"
              />
            </div>
          </div>
        </Card>

        <!-- 中间：费用汇总 -->
        <Card title="费用汇总" :bordered="true" size="small">
          <div style="display: flex; flex-direction: column; gap: 16px">
            <!-- 结算总金额 -->
            <div
              style="
                padding: 16px;
                text-align: center;
                background: #f5f7fa;
                border-radius: 4px;
              "
            >
              <div style="margin-bottom: 8px; font-size: 12px; color: #999">
                结算总金额
              </div>
              <div style="font-size: 24px; font-weight: bold; color: #1890ff">
                ¥{{ formatAmount(totalSettlementAmount) }}
              </div>
              <div style="margin-top: 4px; font-size: 12px; color: #999">
                {{ currencyCode || 'RMB' }}
              </div>
            </div>

            <!-- 我司银行 -->
            <div
              style="
                padding: 12px;
                border: 1px solid #e8e8e8;
                border-radius: 4px;
              "
            >
              <div
                style="
                  margin-bottom: 8px;
                  font-size: 14px;
                  font-weight: 500;
                  color: #1890ff;
                "
              >
                我司银行
              </div>
              <OrgBankAccountSelect
                v-model:value="orgBankAccountId"
                placeholder="请选择我司银行"
                allow-clear
                style="width: 100%"
              />
            </div>

            <!-- 对方银行 -->
            <div
              style="
                padding: 12px;
                border: 1px solid #e8e8e8;
                border-radius: 4px;
              "
            >
              <div
                style="
                  margin-bottom: 8px;
                  font-size: 14px;
                  font-weight: 500;
                  color: #fa8c16;
                "
              >
                对方银行
              </div>
              <ClientBankAccountSelect
                v-model:value="clientInvoiceBankId"
                :client-id="settlementId"
                placeholder="请先选择结算对象，然后选择对方银行"
                allow-clear
                style="width: 100%"
              />
            </div>

            <!-- 手续费 -->
            <div style="display: flex; gap: 8px; align-items: center">
              <span style="color: #fa8c16">手续费</span>
              <InputNumber
                v-model:value="transactionFee"
                placeholder="0.00"
                :min="0"
                :precision="2"
                style="width: 120px"
              />
              <span style="font-size: 12px; color: #999">RMB</span>
              <span style="margin-left: auto; font-size: 12px; color: #999"
                >手续费将计入结算总金额</span
              >
            </div>
          </div>
        </Card>

        <!-- 右侧：附件 -->
        <Card title="附件" :bordered="true" size="small">
          <Upload
            :file-list="attachments as any"
            :before-upload="() => false"
            :max-count="10"
            list-type="picture-card"
          >
            <div>
              <div style="font-size: 24px">↑</div>
              <div style="margin-top: 8px; font-size: 12px; color: #999">
                点击或拖拽上传<br />
                支持 PDF、图片等格式
              </div>
            </div>
          </Upload>
        </Card>
      </div>

      <!-- 申请明细 -->
      <Card :bordered="true" size="small">
        <template #title>
          <div style="display: flex; gap: 8px; align-items: center">
            <div
              style="
                padding: 2px 8px;
                font-size: 12px;
                color: white;
                background: #1890ff;
              "
            >
              申请明细
            </div>
          </div>
        </template>
        <template #extra>
          <Space>
            <Button size="small"> 全选 </Button>
            <Button size="small" danger> − 移除选中 </Button>
            <Button type="primary" size="small" @click="handleAddApplication">
              + 添加申请
            </Button>
          </Space>
        </template>

        <Table
          :columns="[
            { dataIndex: 'checkbox', key: 'checkbox', width: 50 },
            { dataIndex: 'seq', title: '序号', width: 60 },
            { dataIndex: 'applicationNo', title: '申请单号', minWidth: 140 },
            { dataIndex: 'settlementName', title: '结算单位', minWidth: 150 },
            { dataIndex: 'currencyCode', title: '申请币别', width: 100 },
            {
              dataIndex: 'originalAmount',
              title: '原始金额',
              width: 120,
              align: 'right',
            },
            {
              dataIndex: 'rate',
              title: '核销汇率',
              width: 100,
              align: 'right',
            },
            {
              dataIndex: 'settledPrice',
              title: '本次结算',
              width: 120,
              align: 'right',
            },
            {
              dataIndex: 'feeCount',
              title: '费用笔数',
              width: 100,
              align: 'center',
            },
            { key: 'action', title: '操作', width: 100 },
          ]"
          :data-source="settlementItems"
          :pagination="false"
          bordered
          size="small"
          row-key="id"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.dataIndex === 'applicationNo'">
              <a style="color: #fa8c16">{{ record.applicationNo }}</a>
            </template>
            <template v-else-if="column.dataIndex === 'currencyCode'">
              <Tag color="red">{{ record.currencyCode }}</Tag>
            </template>
            <template v-else-if="column.dataIndex === 'settledPrice'">
              <span style="font-weight: bold; color: #fa8c16">
                ¥{{ formatAmount(record.settledPrice) }}
              </span>
            </template>
            <template v-else-if="column.key === 'action'">
              <Space>
                <Button type="link" size="small"> ↓ </Button>
                <Button
                  type="link"
                  size="small"
                  danger
                  @click="handleDeleteItem(index)"
                >
                  ✕
                </Button>
              </Space>
            </template>
          </template>
        </Table>
      </Card>
    </div>

    <!-- 选择付费申请抽屉 -->
    <AddApplicationDrawer
      ref="addApplicationDrawerRef"
      :payment-settlement-id="editId"
      :settlement-id="settlementId"
      :currency-id="currencyId"
      :has-existing-fees="hasExistingFees"
      @confirm="handleConfirmApplications"
    />
  </Page>
</template>

<style scoped>
:deep(.ant-card-small .ant-card-head) {
  min-height: 36px;
  padding: 0 12px;
}

:deep(.ant-card-small .ant-card-body) {
  padding: 12px;
}
</style>
