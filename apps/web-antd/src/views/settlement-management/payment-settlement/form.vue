<script lang="ts" setup>
import type { ClientAppApi } from '#/api/common/client';
import type { PaymentSettlementAdminApi } from '#/api/sea-export/payment-settlement-admin';
import type { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';
import type { Attachment } from '#/api/common/upload';

import { computed, onMounted, ref, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import dayjs from 'dayjs';

import { Page } from '@vben/common-ui';
import { useTabs } from '@vben/hooks';
import { IconifyIcon } from '@vben/icons';
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
} from '#/adapter/component';
import FileUploadInput from '#/adapter/component/file-upload/file-upload-input.vue';
import {
  addPaymentSettlementByCurrency, // ✅ 使用新的按原币新增接口
  editPaymentSettlement,
  getPaymentSettlementDetailByCurrency, // ✅ 使用新的按原币详情接口
  addItemsToSettlementByCurrency, // ✅ 使用新的按原币添加明细接口
  deleteItemsFromSettlementByCurrency, // ✅ 使用新的按原币删除明细接口
} from '#/api/sea-export/payment-settlement-admin';
import {
  getMyCompanyBankAccounts,
  getMyDefaultOrgId,
  getMyOrgCompanyNode,
} from '#/composables/use-my-org';
import { openAttachmentViewer } from '#/components/attachment-viewer';
import { buildAttachmentUrl } from '#/utils';

import AddApplicationDrawer from './add-application-drawer/index.vue';
import ApplicationItemsTable from './application-items-table.vue'; // ✅ 新增：申请明细表格子组件
// import ExchangeRateModal from '#/views/fee-management/add-fee-modal/exchange-rate-modal.vue'; // ❌ 已移到抽屉组件中
import { formatAmount, payTypeOptions } from './form-data';
import { returnToListWithRefresh } from '#/utils/list-refresh-flag';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const { closeTabByKey } = useTabs();

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
// 付费申请附件列表（只读展示）
const paymentApplicationAttachments = ref<
  PaymentSettlementAdminApi.AttachmentItemDto[]
>([]);

// 所属公司（归属组织换算到公司层级并去重，仅用于展示）
const orgCompanies = computed(() => {
  const seen = new Map<number, { id: number; name: string }>();
  orgs.value.forEach((org) => {
    if (!org.id) return;
    const companyNode = getMyOrgCompanyNode(org.id);
    if (companyNode?.id != null && !seen.has(companyNode.id)) {
      seen.set(companyNode.id, {
        id: companyNode.id,
        name: companyNode.displayName || '',
      });
    }
  });
  return Array.from(seen.values());
});

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

// ✅ 选中的行 keys（用于批量删除）
const selectedRowKeys = ref<string[]>([]);

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

    // 跳转到编辑页面（replace 复用当前页签，再关闭残留的新建页签）
    if (newId) {
      const createTabKey = route.fullPath;
      await router.replace(
        `/settlement-management/payment-settlement/edit/${newId}`,
      );
      await closeTabByKey(createTabKey);
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

/** 批量删除申请明细 */
async function handleBatchDeleteApplications() {
  if (selectedRowKeys.value.length === 0) {
    message.warning('请至少选择一个申请');
    return;
  }

  // 根据 rowKey 找到对应的申请项
  const itemsToDelete = applicationItems.value.filter((item) =>
    selectedRowKeys.value.includes(item.rowKey || ''),
  );

  if (itemsToDelete.length === 0) {
    message.error('未找到要删除的申请');
    return;
  }

  // 确认删除
  try {
    await new Promise<void>((resolve, reject) => {
      Modal.confirm({
        title: '确认删除',
        content: `确定要删除选中的 ${itemsToDelete.length} 个申请吗？`,
        okText: '确定',
        cancelText: '取消',
        onOk: () => {
          resolve();
        },
        onCancel: () => {
          reject(new Error('取消删除'));
        },
      });
    });
  } catch (error: any) {
    if (error.message !== '取消删除') {
      return;
    }
  }

  if (!isEdit.value || !editId.value) {
    // 新建模式：直接从列表中移除
    const keysToRemove = new Set(selectedRowKeys.value);
    applicationItems.value = applicationItems.value.filter(
      (item) => !keysToRemove.has(item.rowKey || ''),
    );
    selectedRowKeys.value = [];
    message.success(`已删除 ${itemsToDelete.length} 个申请`);
    return;
  }

  // 编辑模式：调用后端接口批量删除
  try {
    submitting.value = true;

    // 1. 构建要删除的 keys 列表
    const paymentApplicationCurrencyKeys: PaymentSettlementAdminApi.PaymentSettlementPayAppCurrencyKeyDto[] =
      itemsToDelete.map((item) => ({
        paymentApplicationId: item.paymentApplicationId,
        originalCurrencyId: item.originalCurrencyId,
      }));

    console.log('📤 调用批量删除明细接口:', {
      id: editId.value,
      keys: paymentApplicationCurrencyKeys,
      count: paymentApplicationCurrencyKeys.length,
    });

    // 2. 调用新的按原币删除接口
    await deleteItemsFromSettlementByCurrency({
      id: editId.value,
      paymentApplicationCurrencyKeys,
    });

    message.success(`已成功删除 ${itemsToDelete.length} 个申请`);

    // 3. 清空选中状态
    selectedRowKeys.value = [];

    // 4. 重新加载详情数据以刷新列表
    await loadEditData();
  } catch (error: any) {
    message.error(error.message || '批量删除失败');
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
      url: a.url || a.attachmentPath || '',
      fileName: a.friendlyFileName || a.attachmentName || '',
      friendlyFileName: a.friendlyFileName || a.attachmentName || '',
    }));

    // 加载付费申请附件（只读展示）
    paymentApplicationAttachments.value =
      detail.paymentApplicationAttachments || [];

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

    // ✅ 从用户信息缓存的组织路径中获取公司银行账户（不调用接口，避免用户无接口权限）
    // 先将归属组织换算为公司节点并按公司去重（同一公司下的多个组织共享同一份银行账户）
    const companyIds = new Set<number>();
    orgIds.forEach((orgId) => {
      const companyNode = getMyOrgCompanyNode(orgId);
      if (companyNode?.id) {
        companyIds.add(companyNode.id);
      }
    });

    const allBanks: OrgBankOption[] = [];

    for (const companyId of companyIds) {
      try {
        console.log(`🏦 正在从缓存读取公司 ${companyId} 的银行列表...`);
        const accounts = getMyCompanyBankAccounts(companyId);
        console.log(`   缓存账户数量: ${accounts.length}`);

        if (accounts.length > 0) {
          // 根据结算币别过滤银行（仅保留启用的账户）
          const filteredAccounts = accounts.filter(
            (account) =>
              account.currencyId === currencyId.value &&
              account.enable !== false,
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
          console.warn(`   ⚠️ 公司 ${companyId} 缓存中没有银行账户`);
        }
      } catch (error) {
        console.error(`❌ 读取公司 ${companyId} 的银行列表失败:`, error);
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

/** 预览付费申请附件 */
function handlePreviewAttachment(
  item: PaymentSettlementAdminApi.AttachmentItemDto,
) {
  openAttachmentViewer(item);
}

/** 下载付费申请附件 */
function handleDownloadAttachment(
  item: PaymentSettlementAdminApi.AttachmentItemDto,
) {
  if (item.url) {
    const fullUrl = buildAttachmentUrl(item.url);
    const link = document.createElement('a');
    link.href = fullUrl;
    link.download = item.friendlyFileName || 'download';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    message.warning('附件链接不存在');
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
        <Button class="ps-action-btn" @click="handleBack">关闭</Button>
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
                  ¥{{ formatAmount(totalSettledAmount) }}
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
                style="width: 100%"
              />
            </div>

            <!-- 结算人 -->
            <div class="form-item form-col-2">
              <div class="form-label">结算人</div>
              <Input :value="currentUserName" disabled />
            </div>

            <!-- 手续费（汇率设置已移除：2026-08-10起，汇率由后端从付费申请自动获取） -->
            <div class="form-item form-col-3">
              <div class="form-label">手续费</div>
              <div class="fee-row">
                <InputNumber
                  v-model:value="transactionFee"
                  placeholder="0.00"
                  :min="0"
                  :precision="2"
                  style="flex: 1"
                />
                <span class="fee-unit">RMB</span>
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
            <div class="card-title-icon icon-blue">📋</div>
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
        :existing-application-ids="[]"
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

/* 手续费：输入框 + 币种单位 */
.fee-row {
  display: flex;
  flex: 1;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.fee-unit {
  font-size: 12px;
  color: #8c95a3;
  white-space: nowrap;
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
