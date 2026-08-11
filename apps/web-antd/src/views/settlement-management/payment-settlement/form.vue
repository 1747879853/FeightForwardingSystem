<script lang="ts" setup>
import type { ClientAppApi } from '#/api/common/client';
import type { PaymentSettlementAdminApi } from '#/api/sea-export/payment-settlement-admin';
import type { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';
import type { Attachment } from '#/api/common/upload';

import { computed, onMounted, ref, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import dayjs from 'dayjs';

import { Page } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';
import { $t } from '#/locales';

import {
  Button,
  Card,
  DatePicker,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  OrgBankAccountSelect,
  ClientSelect,
  CurrencySelect,
  ClientBankAccountSelect,
} from '#/adapter/component';
import FileUploadInput from '#/adapter/component/file-upload/file-upload-input.vue';
import {
  addPaymentSettlementByCurrency, // ✅ 使用新的按原币新增接口
  editPaymentSettlement,
  getPaymentSettlementDetailByCurrency, // ✅ 使用新的按原币详情接口
  addItemsToSettlementByCurrency, // ✅ 使用新的按原币添加明细接口
  deleteItemsFromSettlementByCurrency, // ✅ 使用新的按原币删除明细接口
} from '#/api/sea-export/payment-settlement-admin';
import { getPaymentApplicationDetail } from '#/api/settlement-management/payment-application-admin';
import { getMyDefaultOrgId } from '#/composables/use-my-org';
import { getOrgBankAccountList } from '#/api/system/organization-unit';

import AddApplicationDrawer from './add-application-drawer/index.vue';
import ApplicationItemsTable from './application-items-table.vue'; // ✅ 新增：申请明细表格子组件
// import ExchangeRateModal from '#/views/fee-management/add-fee-modal/exchange-rate-modal.vue'; // ❌ 已移到抽屉组件中
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
const settlementNo = ref(''); // 结算单号
const orgs = ref<Array<{ id: number; name?: string }>>([]); // 归属组织串
const settlementTime = ref(dayjs());
const payType = ref<number | undefined>(undefined);
const settlementId = ref<string>('');
const settlementName = ref('');
/** ClientSelect 编辑回显（详情 settlement） */
const settlementSelectedItems = ref<ClientAppApi.ClientSimpleDto[]>([]);
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

// 我司银行选项（根据申请明细中的费用所属公司动态加载）
interface OrgBankOption {
  id: string;
  label: string; // 格式：开户银行(银行账号)
  bankName?: string;
  bankAccount?: string;
  currencyId: number;
}
const orgBankOptions = ref<OrgBankOption[]>([]);

// 结算银行选项（根据结算对象动态加载）
interface ClientBankOption {
  id: string;
  label: string; // 格式：开户银行(银行账号)
  bankName?: string;
  bankAccount?: string;
  currencyId: number;
}
const clientBankOptions = ref<ClientBankOption[]>([]);

// ✅ 新增：申请明细列表（从详情接口的 paymentApplicationCurrencies 获取 - 新的二级结构）
const applicationItems = ref<
  PaymentSettlementAdminApi.PaymentSettlementPayAppCurrencyDto[]
>([]);

// 计算是否已有费用
const hasExistingFees = computed(() => applicationItems.value.length > 0);

// ✅ 计算结算总金额（所有申请明细的 settledPrice 总和）
const totalSettledAmount = computed(() => {
  let total = applicationItems.value.reduce((sum, item) => {
    return sum + (item.settledPrice || 0);
  }, 0);

  console.log('💰 结算总金额计算:', {
    申请明细数量: applicationItems.value.length,
    '各项 settledPrice': applicationItems.value.map((item) => ({
      applicationNo: item.applicationNo,
      settledPrice: item.settledPrice,
    })),
    总金额: total,
  });
  total = total + (transactionFee.value ?? 0);
  return total;
});

// 抽屉引用
const addApplicationDrawerRef = ref<InstanceType<
  typeof AddApplicationDrawer
> | null>(null);

// 当前用户
const currentUserName = computed(
  () => userStore.userInfo?.realName || userStore.userInfo?.username || '-',
);

/** 打开选择付费申请抽屉 */
function handleAddApplication() {
  // ⚠️ TODO: 重新设计后的逻辑
  nextTick(() => {
    addApplicationDrawerRef.value?.openDrawer();
  });
}

/** 确认选择付费申请 */
async function handleConfirmApplications(
  applications: Array<{
    application: PaymentSettlementAdminApi.PaymentApplicationCurrencyForSettlementDto;
    settledPrice: number;
    userEnteredRate?: number; // ✅ 用户输入的汇率（如果有）
  }>,
  selectedCurrencyId?: number, // 用户在抽屉中选择的结算币别ID
) {
  console.log('=== 父组件接收到数据 ===');
  console.log('选中的申请:', applications);
  console.log('结算币别:', selectedCurrencyId);

  // ✅ 打印每个申请的 userEnteredRate
  applications.forEach((app, index) => {
    console.log(`申请${index + 1}:`, {
      applicationNo: app.application.applicationNo,
      originalCurrencyId: app.application.originalCurrencyId,
      userEnteredRate: app.userEnteredRate,
    });
  });

  if (!selectedCurrencyId) {
    message.warning('请选择结算币别');
    return;
  }

  // ✅ 直接使用抽屉返回的数据执行保存
  if (isEdit.value) {
    await handleAddAndSaveToSettlement(applications, selectedCurrencyId);
  } else {
    await handleCreateSettlementAndRedirect(applications, selectedCurrencyId);
  }
}

/** 编辑模式下：添加并立即保存到结算单 */
async function handleAddAndSaveToSettlement(
  applications: Array<{
    application: PaymentSettlementAdminApi.PaymentApplicationCurrencyForSettlementDto;
    settledPrice: number;
    userEnteredRate?: number; // ✅ 用户输入的汇率（如果有）
  }>,
  selectedCurrencyId?: number,
) {
  if (!selectedCurrencyId) {
    message.warning('请选择结算币别');
    return;
  }

  if (!editId.value) {
    message.error('结算单ID不存在');
    return;
  }

  submitting.value = true;
  try {
    // ✅ 直接转换为扁平化的 paymentApplicationCurrencyItems（新的二级结构）
    // 注意：现在使用 settledPrice（结算币别金额）而不是 settledAmount（原币金额）
    const paymentApplicationCurrencyItems: PaymentSettlementAdminApi.PaymentSettlementItemByCurrencyInputDto[] =
      applications.map((app) => ({
        paymentApplicationId: app.application.paymentApplicationId,
        originalCurrencyId: app.application.originalCurrencyId,
        settledPrice: app.settledPrice, // ✅ 这里传入的是结算币别金额
        // settledAmount 已废弃，不再使用
      }));

    // 如果过滤后没有有效数据，提示用户
    if (paymentApplicationCurrencyItems.length === 0) {
      message.warning(
        '所有申请的结算金额都为0或未填写，请至少填写一个非零的结算金额',
      );
      return;
    }

    console.log('📤 调用添加明细接口:', {
      id: editId.value,
      items: paymentApplicationCurrencyItems,
    });

    // ✅ 调用新的按原币添加明细接口（不再传 paymentSettlementRates）
    await addItemsToSettlementByCurrency({
      id: editId.value,
      paymentApplicationCurrencyItems, // ✅ 使用新的扁平化字段，包含 settledPrice
    });

    message.success(
      `已添加并保存 ${paymentApplicationCurrencyItems.length} 个「申请+原币」组合`,
    );

    // 重新加载详情数据以刷新列表
    await loadEditData();
  } catch (error: any) {
    message.error(error.message || '保存失败');
  } finally {
    submitting.value = false;
  }
}

/** 新建模式下：创建结算单并跳转到编辑页面 */
async function handleCreateSettlementAndRedirect(
  applications: Array<{
    application: PaymentSettlementAdminApi.PaymentApplicationCurrencyForSettlementDto;
    settledPrice: number;
    userEnteredRate?: number; // ✅ 用户输入的汇率（如果有）
  }>,
  selectedCurrencyId?: number,
) {
  if (!selectedCurrencyId) {
    message.warning('请选择结算币别');
    return;
  }

  // 获取第一个申请的结算对象
  const firstApp = applications[0]?.application;
  if (!firstApp || !firstApp.settlementId) {
    message.warning('无法获取结算对象信息');
    return;
  }

  // ✅ 使用默认组织ID（因为选择列表接口不返回orgs信息）
  const derivedOrgId = getMyDefaultOrgId();

  if (!derivedOrgId) {
    message.error('缺少归属组织，无法保存');
    return;
  }

  submitting.value = true;
  try {
    // ✅ 直接转换为扁平化的 paymentApplicationCurrencyItems（新的二级结构）
    // 注意：现在使用 settledPrice（结算币别金额）而不是 settledAmount（原币金额）
    const paymentApplicationCurrencyItems: PaymentSettlementAdminApi.PaymentSettlementItemByCurrencyInputDto[] =
      applications.map((app) => ({
        paymentApplicationId: app.application.paymentApplicationId,
        originalCurrencyId: app.application.originalCurrencyId,
        settledPrice: app.settledPrice, // ✅ 这里传入的是结算币别金额
        // settledAmount 已废弃，不再使用
      }));

    // 如果过滤后没有有效数据，提示用户
    if (paymentApplicationCurrencyItems.length === 0) {
      message.warning(
        '所有申请的结算金额都为0或未填写，请至少填写一个非零的结算金额',
      );
      return;
    }

    console.log('📤 调用新建结算单接口:', {
      settlementId: firstApp.settlementId,
      currencyId: selectedCurrencyId,
      items: paymentApplicationCurrencyItems,
    });

    // ✅ 构建结算单数据（使用新的按原币接口，不再传 paymentSettlementRates）
    const data: PaymentSettlementAdminApi.PaymentSettlementAddByCurrencyDto = {
      orgId: derivedOrgId,
      settlementTime: dayjs().toISOString(),
      payType: undefined,
      settlementId: firstApp.settlementId,
      currencyId: selectedCurrencyId,
      orgBankAccountId: undefined,
      clientInvoiceBankId: undefined,
      transactionFee: 0,
      remark: '',
      paymentApplicationCurrencyItems, // ✅ 使用新的扁平化字段，包含 settledPrice
      attachments: attachments.value.map((a, idx) => ({
        attachmentId: Number(a.attachmentId),
        displayOrder: idx,
      })),
    };

    // ✅ 调用新的按原币新增接口
    const newId = await addPaymentSettlementByCurrency(data);

    message.success(
      `成功创建结算单，已添加 ${paymentApplicationCurrencyItems.length} 个「申请+原币」组合`,
    );

    // 跳转到编辑页面
    if (newId) {
      router.push(`/settlement-management/payment-settlement/edit/${newId}`);
    } else {
      console.error('创建成功后未返回ID');
    }
  } catch (error: any) {
    message.error(error.message || '创建结算单失败');
  } finally {
    submitting.value = false;
  }
}

/** 编辑结算单：添加到现有列表了 */
async function handleAddToExistingSettlement(
  applications: Array<{
    application: PaymentApplicationAdminApi.PaymentApplicationForSettlementDto;
    settledPrice?: number;
    currencyItems?: Array<{
      originalCurrencyId: number;
      settledPrice: number;
    }>;
  }>,
  selectedCurrencyId?: number,
) {
  // ⚠️ TODO: 重新设计后的实现
  console.warn('handleAddToExistingSettlement 待重新实现');
}

/** 删除结算明细 */
async function handleDeleteItem(index: number) {
  // ⚠️ TODO: 重新设计后的实现
  console.warn('handleDeleteItem 待重新实现');
}

/** 删除申请明细 */
async function handleDeleteApplicationItem(index: number) {
  if (!isEdit.value || !editId.value) {
    // 新建模式：直接从列表中移除
    applicationItems.value.splice(index, 1);
    return;
  }

  // 编辑模式：调用后端接口删除
  const itemToDelete = applicationItems.value[index];
  if (!itemToDelete) {
    message.error('未找到要删除的申请');
    return;
  }

  try {
    submitting.value = true;

    // 1. 构建要删除的 key（paymentApplicationId + originalCurrencyId）
    const paymentApplicationCurrencyKeys: PaymentSettlementAdminApi.PaymentSettlementPayAppCurrencyKeyDto[] =
      [
        {
          paymentApplicationId: itemToDelete.paymentApplicationId,
          originalCurrencyId: itemToDelete.originalCurrencyId,
        },
      ];

    console.log('📤 调用删除明细接口:', {
      id: editId.value,
      keys: paymentApplicationCurrencyKeys,
    });

    // 2. 调用新的按原币删除接口（不再传 paymentSettlementRates）
    await deleteItemsFromSettlementByCurrency({
      id: editId.value,
      paymentApplicationCurrencyKeys, // ✅ 使用新的扁平化字段
    });

    message.success('删除成功');

    // 3. 重新加载详情数据以刷新列表
    await loadEditData();
  } catch (error: any) {
    message.error(error.message || '删除失败');
  } finally {
    submitting.value = false;
  }
}

/** 保存 */
async function handleSave() {
  if (!validateForm()) {
    return;
  }

  submitting.value = true;
  try {
    // ⚠️ TODO: 重新设计后的数据构建逻辑
    const derivedOrgId = getMyDefaultOrgId();
    if (!derivedOrgId) {
      message.error('缺少归属组织，无法保存');
      submitting.value = false;
      return;
    }

    // ✅ 编辑模式：只保存主表信息（不包含明细）
    if (isEdit.value && editId.value) {
      const data: PaymentSettlementAdminApi.PaymentSettlementEditDto = {
        id: editId.value,
        orgId: derivedOrgId,
        settlementTime: settlementTime.value.toISOString(),
        payType: payType.value,
        orgBankAccountId: orgBankAccountId.value,
        clientInvoiceBankId: clientInvoiceBankId.value,
        transactionFee: transactionFee.value,
        remark: remark.value,
        // paymentSettlementRates 已删除，汇率由后端从付费申请获取
        attachments: attachments.value.map((a, idx) => ({
          attachmentId: Number(a.attachmentId),
          displayOrder: idx,
        })),
      };

      // 编辑模式：保存后不关闭页面，停留在当前编辑页面
      await editPaymentSettlement(data);
      message.success('保存成功');
      // 重新加载详情数据以刷新页面显示
      await loadEditData();
    } else {
      // 新增模式（理论上不会走到这里，因为新增时会自动创建并跳转）
      message.warning('新建模式请使用"添加申请"按钮自动创建结算单');
    }
  } catch (error: any) {
    message.error(error.message || '操作失败');
  } finally {
    submitting.value = false;
  }
}

/** 返回列表页 */
function handleBack() {
  returnToListWithRefresh('PaymentSettlementList', () => {
    router.push('/settlement-management/payment-settlement');
  });
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
  // ⚠️ TODO: 重新设计后的验证逻辑
  // if (settlementItems.value.length === 0) {
  //   message.warning('请至少添加一个付费申请');
  //   return false;
  // }
  return true;
}

/** 加载编辑数据 */
async function loadEditData() {
  if (!editId.value) return;

  pageLoading.value = true;
  try {
    console.log('=== 开始加载结算单详情 ===');
    console.log('结算单ID:', editId.value);

    // ✅ 使用新的按原币详情接口
    const detail = await getPaymentSettlementDetailByCurrency(editId.value);

    console.log('✅ 详情接口返回成功');
    console.log(
      'detail.paymentApplicationCurrencies 数量:',
      detail.paymentApplicationCurrencies?.length || 0,
    );

    settlementNo.value = detail.settlementNo || ''; // 加载结算单号
    orgs.value = detail.orgs || []; // 加载归属组织
    settlementTime.value = dayjs(detail.settlementTime);
    payType.value = detail.payType;
    settlementId.value = detail.settlementId;
    settlementName.value = detail.settlement?.name ?? '';
    settlementSelectedItems.value = detail.settlement?.id
      ? [
          {
            fullName: detail.settlement.fullName,
            id: detail.settlement.id,
            name: detail.settlement.name ?? '',
          },
        ]
      : [];
    currencyId.value = detail.currencyId;
    currencyCode.value = detail.currency?.code || '';
    transactionFee.value = detail.transactionFee;
    remark.value = detail.remark || '';

    console.log('✅ 基本信息赋值完成');
    console.log('currencyId:', currencyId.value);
    console.log('settlementId:', settlementId.value);

    // ✅ 注意：2026-08-10 起，汇率不再由结算单维护，而是从付费申请明细获取
    // detail.paymentSettlementRates 已删除，汇率信息现在在每个 paymentApplicationCurrencies 行的 rate 字段中
    // rateList 已不再使用，无需清空

    // ✅ 从详情接口加载申请明细（新的二级结构：paymentApplicationCurrencies）
    applicationItems.value = detail.paymentApplicationCurrencies || [];

    console.log('✅ 申请明细赋值完成');
    console.log('applicationItems 数量:', applicationItems.value.length);

    // 🔍 详细打印第一个申请明细的结构
    if (applicationItems.value.length > 0) {
      const firstItem = applicationItems.value[0];
      if (firstItem) {
        console.log('📋 第一个申请明细详情:');
        console.log('  paymentApplicationId:', firstItem.paymentApplicationId);
        console.log('  originalCurrencyId:', firstItem.originalCurrencyId);
        console.log('  rate:', firstItem.rate); // ✅ 汇率现在在这里
        console.log('  settledAmount:', firstItem.settledAmount);
        console.log('  settledPrice:', firstItem.settledPrice);
        console.log('  orderFees 数量:', firstItem.orderFees?.length || 0);

        if (firstItem.orderFees && firstItem.orderFees.length > 0) {
          const firstFee = firstItem.orderFees[0];
          if (firstFee) {
            console.log('  第一个费用详情:');
            console.log('    id:', firstFee.id);
            console.log('    orgId:', firstFee.orgId);
            console.log('    amount:', firstFee.amount);
            console.log('    所有字段:', Object.keys(firstFee));
          }
        }
      }
    }

    attachments.value = (detail.attachments ?? []).map((a: any) => ({
      attachmentId: a.attachmentId,
      url: a.attachmentPath || '',
      fileName: a.friendlyFileName || '',
    }));

    console.log('✅ 附件加载完成');

    // 先加载银行选项，再赋值选中值（确保选项存在后才能正确回显）
    console.log('🏦 开始加载银行选项...');
    await loadOrgBankOptions();
    await loadClientBankOptions();
    console.log('✅ 银行选项加载完成');

    // 在银行选项加载完成后，再设置选中值
    orgBankAccountId.value = detail.orgBankAccountId;
    clientInvoiceBankId.value = detail.clientInvoiceBankId;

    console.log('=== 结算单详情加载完成 ===');
  } finally {
    pageLoading.value = false;
  }
}

/** 加载我司银行选项（根据基础信息中的归属组织） */
async function loadOrgBankOptions() {
  console.log('=== 开始加载我司银行选项 ===');
  console.log('当前 currencyId:', currencyId.value);
  console.log('当前 orgs:', orgs.value);

  // 如果没有结算币别或归属组织，清空选项
  if (!currencyId.value || orgs.value.length === 0) {
    console.warn('❌ 缺少结算币别或归属组织，清空银行选项');
    orgBankOptions.value = [];
    return;
  }

  try {
    // ✅ 从归属组织中提取所有组织ID
    const orgIds = new Set<number>();

    orgs.value.forEach((org) => {
      if (org.id) {
        orgIds.add(org.id);
      }
    });

    // 如果没有找到任何组织ID，清空选项
    if (orgIds.size === 0) {
      console.warn('❌ 未从归属组织中找到有效的组织ID');
      orgBankOptions.value = [];
      return;
    }

    console.log('✅ 找到的归属组织IDs:', Array.from(orgIds));

    // ✅ 遍历所有组织ID，获取每个组织的银行列表
    const allBanks: OrgBankOption[] = [];

    for (const orgId of orgIds) {
      try {
        console.log(`🏦 正在加载组织 ${orgId} 的银行列表...`);
        const accounts = await getOrgBankAccountList(orgId);
        console.log(`   返回账户数量: ${accounts?.length || 0}`);

        if (accounts && accounts.length > 0) {
          // 根据结算币别过滤银行
          const filteredAccounts = accounts.filter(
            (account) => account.currencyId === currencyId.value,
          );
          console.log(
            `   过滤后(${currencyId.value})账户数量: ${filteredAccounts.length}`,
          );

          filteredAccounts.forEach((account) => {
            allBanks.push({
              id: account.id,
              label:
                `${account.bankShortName || ''} - ${account.accountName || ''} (${account.currencyCode || ''})`.trim(),
              bankName: account.bankName || undefined,
              bankAccount: account.bankAccount || undefined,
              currencyId: account.currencyId,
            });
          });
        } else {
          console.warn(`   ⚠️ 组织 ${orgId} 没有银行账户`);
        }
      } catch (error) {
        console.error(`❌ 加载组织 ${orgId} 的银行列表失败:`, error);
      }
    }

    // ✅ 去重：根据 id 去重
    const uniqueBanks = allBanks.filter(
      (bank, index, self) => index === self.findIndex((b) => b.id === bank.id),
    );

    orgBankOptions.value = uniqueBanks;
    console.log('✅ 加载我司银行选项完成，共', uniqueBanks.length, '个银行');
    console.log('银行选项详情:', uniqueBanks);
  } catch (error) {
    console.error('❌ 加载我司银行选项失败:', error);
    orgBankOptions.value = [];
  }
}

/** 加载结算银行选项（根据结算对象） */
async function loadClientBankOptions() {
  if (!settlementId.value) {
    clientBankOptions.value = [];
    return;
  }

  try {
    const { getClientInvoiceInfoList } =
      await import('#/api/sea-export/clinet-invoice-admin');

    // 获取客户的所有开票信息
    const invoiceInfos = await getClientInvoiceInfoList({
      ClientId: settlementId.value,
    });

    if (!invoiceInfos || invoiceInfos.length === 0) {
      clientBankOptions.value = [];
      return;
    }

    // 收集所有银行信息
    const allBanks: ClientBankOption[] = [];

    invoiceInfos.forEach((invoiceInfo) => {
      if (
        invoiceInfo.clientInvoiceBanks &&
        invoiceInfo.clientInvoiceBanks.length > 0
      ) {
        // 根据结算币别过滤银行
        const filteredBanks = invoiceInfo.clientInvoiceBanks.filter(
          (bank) => bank.currencyId === currencyId.value && !bank.isDeleted,
        );

        filteredBanks.forEach((bank) => {
          allBanks.push({
            id: bank.id,
            label: `${bank.bankName || ''}(${bank.bankAccount || ''})`.trim(),
            bankName: bank.bankName,
            bankAccount: bank.bankAccount,
            currencyId: bank.currencyId,
          });
        });
      }
    });

    clientBankOptions.value = allBanks;
  } catch (error) {
    console.error('加载结算银行选项失败:', error);
  }
}








/** 监听结算对象变化，更新名称并清空银行信息 */
watch(settlementId, async (newVal) => {
  if (newVal) {
    // 详情已带回结算对象时无需再拉客户详情
    const cached = settlementSelectedItems.value.find(
      (item) => String(item.id) === String(newVal),
    );
    if (cached) {
      settlementName.value = cached.name || cached.fullName || '';
    } else {
      try {
        const { getClientDetail } =
          await import('#/api/sea-export/client-admin');
        const detail = await getClientDetail(newVal);
        settlementName.value = detail.name || detail.fullName || '';
      } catch (error) {
        console.error('获取客户详情失败:', error);
      }
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

  // 结算币别变化时，重新加载银行选项
  await loadOrgBankOptions();
  await loadClientBankOptions();
});

// 监听归属组织变化，重新加载我司银行选项
watch(
  () => orgs.value,
  async () => {
    await loadOrgBankOptions();
  },
  { deep: true },
);

// 监听结算对象变化，重新加载结算银行选项
watch(settlementId, async () => {
  await loadClientBankOptions();
});

onMounted(() => {
  if (isEdit.value) {
    loadEditData();
  } else {
    // 新建时自动打开抽屉，让用户选择结算对象、结算币别和付费申请
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
        <Button @click="handleBack"> 关闭 </Button>
        <Button type="primary" @click="handleSave" :loading="submitting">
          保存
        </Button>
      </Space>
    </template>

    <div v-loading="pageLoading" style="padding: 16px">
      <!-- 顶部三栏布局 -->
      <div
        style="
          display: grid;
          grid-template-columns: 880px 1fr 280px;
          gap: 16px;
          margin-bottom: 16px;
        "
      >
        <!-- 左侧：结算信息 -->
        <Card :bordered="false" size="small" class="info-card">
          <template #title>
            <div style="display: flex; gap: 8px; align-items: center">
              <div
                style="
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  width: 32px;
                  height: 32px;
                  font-size: 16px;
                  color: #1890ff;
                  background: linear-gradient(135deg, #e6f4ff 0%, #bae0ff 100%);
                  border-radius: 8px;
                "
              >
                ¥
              </div>
              <span style="font-size: 16px; font-weight: 600; color: #1a1a1a">
                结算信息
              </span>
            </div>
          </template>

          <div
            style="
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px 12px;
              padding-top: 8px;
            "
          >
            <!-- 结算单号（仅编辑时显示） -->
            <div v-if="isEdit" style="grid-column: span 2">
              <div style="margin-bottom: 6px; font-size: 13px; color: #666">
                结算单号
              </div>
              <Input
                :value="settlementNo"
                disabled
                style="background: #f5f7fa"
              />
            </div>

            <!-- 归属组织 -->
            <div v-if="orgs.length > 0">
              <div style="margin-bottom: 6px; font-size: 13px; color: #666">
                归属组织
              </div>
              <Select
                mode="multiple"
                :value="orgs.map((c) => c.id)"
                :options="orgs.map((c) => ({ label: c.name, value: c.id }))"
                disabled
                style="width: 100%; background: #f5f7fa"
              />
            </div>

            <!-- 结算人 -->
            <div>
              <div style="margin-bottom: 6px; font-size: 13px; color: #666">
                结算人
              </div>
              <Input
                :value="currentUserName"
                disabled
                style="background: #f5f7fa"
              />
            </div>

            <!-- 结算时间 -->
            <div>
              <div style="margin-bottom: 6px; font-size: 13px; color: #666">
                结算时间
              </div>
              <DatePicker
                v-model:value="settlementTime"
                show-time
                format="YYYY-MM-DD HH:mm"
                style="width: 100%"
              />
            </div>

            <!-- 付款方式 -->
            <div>
              <div style="margin-bottom: 6px; font-size: 13px; color: #666">
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

            <!-- 结算对象 -->
            <div>
              <div style="margin-bottom: 6px; font-size: 13px; color: #666">
                结算对象
              </div>
              <ClientSelect
                v-model="settlementId"
                :selected-items="settlementSelectedItems"
                placeholder="请选择结算对象"
                allow-clear
                disabled
                style="width: 100%"
              />
            </div>

            <!-- 结算币别 -->
            <div>
              <div style="margin-bottom: 6px; font-size: 13px; color: #666">
                结算币别
              </div>
              <CurrencySelect
                v-model="currencyId"
                placeholder="请选择"
                allow-clear
                disabled
                style="width: 100%"
              />
            </div>

            <!-- 备注 -->
            <div style="grid-column: span 2">
              <div style="margin-bottom: 6px; font-size: 13px; color: #666">
                备注
              </div>
              <Input.TextArea
                v-model:value="remark"
                placeholder="请输入备注信息（选填）"
                :rows="2"
              />
            </div>
          </div>
        </Card>

        <!-- 中间：费用汇总 -->
        <Card :bordered="false" size="small" class="info-card">
          <template #title>
            <div style="display: flex; gap: 8px; align-items: center">
              <div
                style="
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  width: 32px;
                  height: 32px;
                  font-size: 16px;
                  color: #722ed1;
                  background: linear-gradient(135deg, #f0e6ff 0%, #d9b3ff 100%);
                  border-radius: 8px;
                "
              >
                ￥
              </div>
              <span style="font-size: 16px; font-weight: 600; color: #1a1a1a">
                费用汇总
              </span>
            </div>
          </template>

          <div style="display: flex; flex-direction: column; gap: 16px">
            <!-- 结算总金额 - 渐变背景卡片 -->
            <div
              style="
                position: relative;
                padding: 16px 20px;
                overflow: hidden;
                background: linear-gradient(135deg, #e6f4ff 0%, #bae0ff 100%);
                border-radius: 8px;
              "
            >
              <!-- 装饰性图标 -->
              <div
                style="
                  position: absolute;
                  top: 50%;
                  right: 16px;
                  font-size: 48px;
                  opacity: 0.3;
                  transform: translateY(-50%);
                "
              >
                💰
              </div>

              <div style="position: relative; z-index: 1">
                <div
                  style="
                    margin-bottom: 8px;
                    font-size: 14px;
                    font-weight: 500;
                    color: #1890ff;
                  "
                >
                  结算总金额
                </div>
                <div style="display: flex; gap: 8px; align-items: baseline">
                  <span
                    style="font-size: 28px; font-weight: bold; color: #1890ff"
                  >
                    ¥{{ formatAmount(totalSettledAmount) }}
                  </span>
                  <span style="font-size: 14px; color: #1890ff; opacity: 0.8">
                    {{ currencyCode || 'RMB' }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 我司银行和对方银行同行显示 -->
            <div
              style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px"
            >
              <!-- 我司银行 -->
              <div>
                <div
                  style="
                    margin-bottom: 6px;
                    font-size: 13px;
                    font-weight: 500;
                    color: #1890ff;
                  "
                >
                  我司银行
                </div>
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

              <!-- 对方银行 -->
              <div>
                <div
                  style="
                    margin-bottom: 6px;
                    font-size: 13px;
                    font-weight: 500;
                    color: #fa8c16;
                  "
                >
                  对方银行
                </div>
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
            </div>

            <!-- 手续费（汇率设置已移除：2026-08-10起，汇率由后端从付费申请自动获取） -->
            <div>
              <div
                style="
                  margin-bottom: 6px;
                  font-size: 13px;
                  font-weight: 500;
                  color: #fa8c16;
                "
              >
                手续费
              </div>
              <div style="display: flex; gap: 8px; align-items: center">
                <InputNumber
                  v-model:value="transactionFee"
                  placeholder="0.00"
                  :min="0"
                  :precision="2"
                  style="flex: 1"
                />
                <span
                  style="font-size: 12px; color: #999; white-space: nowrap"
                  >RMB</span
                >
              </div>
            </div>
          </div>
        </Card>

        <!-- 右侧：附件 -->
        <Card :bordered="false" size="small" class="info-card">
          <template #title>
            <div style="display: flex; gap: 8px; align-items: center">
              <div
                style="
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  width: 32px;
                  height: 32px;
                  font-size: 16px;
                  color: #1890ff;
                  background: linear-gradient(135deg, #e6f7ff 0%, #91d5ff 100%);
                  border-radius: 8px;
                "
              >
                📎
              </div>
              <span style="font-size: 16px; font-weight: 600; color: #1a1a1a">
                附件
              </span>
            </div>
          </template>

          <FileUploadInput
            v-model="attachments"
            module-type-id="160011"
            :max-count="10"
          />

          <div
            style="
              padding: 8px;
              margin-top: 12px;
              font-size: 12px;
              color: #999;
              text-align: center;
              background: #f5f7fa;
              border-radius: 4px;
            "
          >
            最大大小: 20MB | 最多数量: 10
          </div>
        </Card>
      </div>

      <!-- 申请明细 -->
      <Card :bordered="true" size="small" style="min-height: 300px">
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
            <Button type="primary" size="small" @click="handleAddApplication">
              + 添加申请
            </Button>
          </Space>
        </template>

        <!-- ✅ 使用新的申请明细表格组件 -->
        <ApplicationItemsTable
          :items="applicationItems"
          :editable="isEdit"
          @delete="handleDeleteApplicationItem"
        />
      </Card>

      <!-- 选择付费申请抽屉 -->
      <AddApplicationDrawer
        ref="addApplicationDrawerRef"
        :payment-settlement-id="editId"
        :settlement-id="settlementId"
        :currency-id="currencyId"
        :has-existing-fees="hasExistingFees"
        :existing-application-ids="[]"
        @confirm="handleConfirmApplications"
      />
    </div>
  </Page>
</template>

<style scoped>
/* 响应式调整 */
@media (max-width: 1400px) {
  :deep(.info-card) {
    margin-bottom: 12px;
  }
}

:deep(.ant-card-small .ant-card-head) {
  min-height: 36px;
  padding: 0 12px;
}

:deep(.ant-card-small .ant-card-body) {
  padding: 12px;
}

/* 信息卡片样式 */
.info-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 6%);
  transition: all 0.3s ease;
}

.info-card:hover {
  box-shadow: 0 4px 16px rgb(0 0 0 / 10%);
}

/* 标题样式优化 */
:deep(.info-card .ant-card-head-title) {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

/* 输入框和选择器统一样式 */
:deep(.info-card .ant-input),
:deep(.info-card .ant-select-selector),
:deep(.info-card .ant-picker) {
  border-color: #e0e0e0;
  border-radius: 6px;
  transition: all 0.3s ease;
}

:deep(.info-card .ant-input:focus),
:deep(.info-card .ant-select-focused .ant-select-selector),
:deep(.info-card .ant-picker-focused) {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgb(24 144 255 / 10%);
}

/* 禁用状态样式 */
:deep(.info-card .ant-input-disabled),
:deep(.info-card .ant-select-disabled .ant-select-selector) {
  color: #666;
  background: #f5f7fa;
}

/* 标签文字样式 */
:deep(.info-card label),
:deep(.info-card div[style*='font-size: 13px']) {
  font-weight: 500;
}

/* 金额数字样式 */
:deep(.info-card [style*='font-size: 28px'] span) {
  font-family: 'DIN Alternate', Roboto, sans-serif;
  letter-spacing: -0.5px;
}

/* 渐变背景卡片 */
:deep(.info-card [style*='linear-gradient']) {
  position: relative;
  overflow: hidden;
}

:deep(.info-card [style*='linear-gradient'])::before {
  position: absolute;
  top: -50%;
  right: -50%;
  width: 200%;
  height: 200%;
  pointer-events: none;
  content: '';
  background: radial-gradient(
    circle,
    rgb(255 255 255 / 30%) 0%,
    transparent 70%
  );
}

/* 附件上传区域样式 */
:deep(.info-card .file-upload-container) {
  border-radius: 8px;
}
</style>
