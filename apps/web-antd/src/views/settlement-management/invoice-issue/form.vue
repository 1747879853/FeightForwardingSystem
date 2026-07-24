<script lang="ts" setup>
import {
  addInvoiceIssue,
  editInvoiceIssue,
  getInvoiceIssueDetail,
  InvoiceIssueApi,
} from '#/api/Invoice/InvoiceIssue';
import type { ClientAdminApi } from '#/api/sea-export/client-admin';
import type { ClientInvoiceInfoAdminApi } from '#/api/sea-export/clinet-invoice-admin';
import type { CodeInvoiceAdminApi } from '#/api/system/base-data/code-invoice-admin';

import { computed, nextTick, onMounted, ref, watch } from 'vue';
import dayjs from 'dayjs';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

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
  Modal,
  Space,
  Spin,
  Table,
} from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';

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
import { $t } from '#/locales';
import FeeSelectionDrawerForIssue from './components/FeeSelectionDrawerForIssue.vue';
import RemarkTemplateModal from './components/RemarkTemplateModal.vue';
import SelectRemarkTemplateModal from './components/SelectRemarkTemplateModal.vue';
import { getExchangeRatePagedList } from '#/api/system/base-data/exchange-rate-admin';
// ✅ 新增：导入开票申请详情API
import { InvoiceApplicationAdminApi } from '#/api/settlement-management/invoice-application-admin';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const editId = computed<string | undefined>(() => {
  const id = route.params.id;
  if (Array.isArray(id)) return id[0];
  return id ? String(id) : undefined;
});

const isEdit = computed(() => !!editId.value);
const loading = ref(false);
const submitLoading = ref(false);

// 费用选择抽屉相关
const feeSelectionDrawerRef = ref();
const drawerVisible = ref(false);

// 首次选择的发票抬头和币别（用于锁定）
const fixedHeaderId = ref<string>(''); // 固定的发票抬头ID
const fixedCurrencyId = ref<number | undefined>(undefined); // 固定的发票币别ID

// 商品明细选中行
const selectedGoodsRows = ref<string[]>([]); // 选中的商品明细行ID

// 备注模板管理弹窗相关状态
const remarkTemplateModalVisible = ref(false); // 备注模板管理弹窗显示状态
const selectRemarkTemplateModalVisible = ref(false); // 选择备注模板弹窗显示状态

// 表单数据
const formData = ref<any>({
  settlementId: '',
  orgId: 0,
  currencyId: null, // 默认人民币
  invoiceType: 'p', // 默认普通发票-电票
  invoiceIssueType: InvoiceIssueApi.InvoiceIssueType.NuonuoInterface, // 默认诺诺接口开票
  require: '',
  remark: '',
  orgBankAccountId: '',
  clientInvoiceBankId: '',
  invoiceIssueItems: [],
  invoiceIssueGoodsDtls: [],
});

// 基础信息
const invoiceIssueTime = ref(dayjs().format('YYYY-MM-DD')); // 开票日期，自动生成
const applicantName = ref(''); // 开票人名称
const applicantCompany = ref<number>(0); // 开票人所在公司ID
const applicantCompanyName = ref('');

const applicantTaxNumber = ref('');
const applicantAddress = ref('');

// 销售方银行账号列表（从用户信息中获取）
const orgBankAccounts = ref<any[]>([]);

// 客户开票信息
const clientInvoiceInfoList = ref<
  ClientInvoiceInfoAdminApi.ClientInvoiceInfoDto[]
>([]);
const selectedClientInvoiceInfo =
  ref<ClientInvoiceInfoAdminApi.ClientInvoiceInfoDto>();

// 发票商品编码列表
const codeInvoiceList = ref<CodeInvoiceAdminApi.CodeInvoiceDto[]>([]);

// 发票汇率
const invoiceExchangeRate = ref<number>(1.0);

// 商品明细表格数据
const goodsDetails = ref<any[]>([]);

// 监听商品明细数据变化
watch(
  () => goodsDetails.value,
  (newVal) => {
    console.log('📊 商品明细数据变化:', newVal.length, '条');
    if (newVal.length > 0) {
      console.log('📊 第一条商品明细:', newVal[0]);
    }
  },
  { deep: true },
);

// 申请分组数据（从抽屉中选择的数据）
const applicationGroupsData = ref<any[]>([]);

// 获取 VxeTable 引用
const feeGridRef = ref();

/** 打开费用选择抽屉 */
function handleOpenFeeDrawer() {
  feeSelectionDrawerRef.value?.handleOpenFeeDrawer();
}

/** 将树状数据扁平化 */
function flattenTreeData(data: any[]): any[] {
  const result: any[] = [];

  function flatten(items: any[]) {
    items.forEach((item) => {
      result.push(item);
      if (
        item.invoiceApplicationItems &&
        item.invoiceApplicationItems.length > 0
      ) {
        flatten(item.invoiceApplicationItems);
      }
    });
  }

  flatten(data);
  return result;
}

/** 提交表单 */
async function handleSubmit() {
  // 基本验证
  if (!formData.value.settlementId) {
    message.warning('请选择结算对象');
    return;
  }
  if (!formData.value.orgId) {
    message.warning('请选择归属组织');
    return;
  }

  submitLoading.value = true;
  try {
    const submitData: InvoiceIssueApi.InvoiceIssueAddDto = {
      orgId: formData.value.orgId,
      invoiceIssueType: formData.value.invoiceIssueType,
      invoiceNo: formData.value.invoiceNo,
      invoiceIssueTime: invoiceIssueTime.value,
      // ✅ 添加开票汇率
      invoiceExchangeRate: invoiceExchangeRate.value,
      require: formData.value.require,
      remark: formData.value.remark,
      invoiceIssueItems: formData.value.invoiceIssueItems || [],
      invoiceIssueGoodsDtls: goodsDetails.value.map((item) => ({
        codeInvoiceId: item.codeInvoiceId,
        specification: item.specification,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
        noTaxAmount: item.noTaxAmount,
        taxRate: item.taxRate,
        taxAmount: item.taxAmount,
        remark: item.remark,
      })),
    };

    if (isEdit.value) {
      await editInvoiceIssue({
        ...submitData,
        id: editId.value!,
      } as InvoiceIssueApi.InvoiceIssueEditDto);
      message.success('修改成功');
    } else {
      const newId = await addInvoiceIssue(submitData);
      message.success('创建成功');

      // 创建成功后跳转到编辑页面
      if (newId) {
        router.push(`/settlement-management/invoice-issue/${newId}/edit`);
      }
    }

    // 保存后不关闭页面，保持当前状态
    console.log('✅ 保存成功，保持在当前页面');
  } catch (error) {
    console.error('保存失败:', error);
    //message.error('保存失败');
  } finally {
    submitLoading.value = false;
  }
}

/** 取消 */
function handleCancel() {
  router.back();
}

/** 商品明细 - 项目名称变化 */
function handleGoodsNameChange(record: any, index: number) {
  const selectedItem = codeInvoiceList.value.find(
    (item) => item.id === record.codeInvoiceId,
  );

  if (selectedItem) {
    // 使用 Vue.set 或直接替换整个对象来触发响应式更新
    goodsDetails.value[index] = {
      ...record,
      specification: selectedItem.specification || '',
      unit: selectedItem.unit || '票',
      taxRate: selectedItem.taxRate || 0,
    };

    // 重新计算金额相关字段
    const updatedRecord = goodsDetails.value[index];
    const taxRate = updatedRecord.taxRate || 0;
    updatedRecord.noTaxAmount = updatedRecord.amount / (1 + taxRate / 100);
    updatedRecord.taxAmount =
      (updatedRecord.amount / (1 + taxRate / 100)) * (taxRate / 100);
  }
}

/** 商品明细 - 数量或单价变化 */
function handleQuantityOrPriceChange(record: any) {
  // 金额 = 数量 × 单价
  record.amount = (record.quantity || 0) * (record.unitPrice || 0);

  // 不含税金额 = 金额 ÷ (1 + 税率)
  const taxRate = record.taxRate || 0;
  record.noTaxAmount = record.amount / (1 + taxRate / 100);

  // 税额 = 含税金额 ÷ (1 + 税率) × 税率
  record.taxAmount = (record.amount / (1 + taxRate / 100)) * (taxRate / 100);
}

/** 商品明细 - 金额变化（用户手动修改） */
function handleAmountChange(record: any) {
  // 当用户手动修改金额时，反向计算单价
  const quantity = record.quantity || 1;
  if (quantity > 0) {
    record.unitPrice = record.amount / quantity;
  }

  // 重新计算不含税金额和税额
  const taxRate = record.taxRate || 0;
  record.noTaxAmount = record.amount / (1 + taxRate / 100);
  record.taxAmount = (record.amount / (1 + taxRate / 100)) * (taxRate / 100);
}

/** 处理商品明细 - 税率变化 */
function handleTaxRateChange(record: any) {
  // 确保税率为数字类型
  const taxRate = Number(record.taxRate) || 0;
  record.taxRate = taxRate;

  // 重新计算不含税金额和税额
  const amount = record.amount || 0;
  record.noTaxAmount = amount / (1 + taxRate / 100);
  record.taxAmount = (amount / (1 + taxRate / 100)) * (taxRate / 100);
}

/** 添加商品明细行 */
function handleAddGoodsRow() {
  // ✅ 检查是否已经从抽屉中添加了费用
  const items = formData.value.invoiceIssueItems || [];

  if (items.length === 0) {
    message.warning('请先从抽屉中添加费用,然后再添加商品明细');
    return;
  }

  goodsDetails.value.push({
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9), // 生成唯一ID
    codeInvoiceId: undefined,
    specification: '',
    unit: '票',
    quantity: 1,
    unitPrice: 0,
    amount: 0,
    noTaxAmount: 0,
    taxRate: 0,
    taxAmount: 0,
    remark: '',
  });
}

/** 删除商品明细行 */
function handleDeleteGoodsRow(index: number) {
  goodsDetails.value.splice(index, 1);
}

/** 删除选中的商品明细行 */
function handleDeleteSelectedGoodsRows() {
  if (selectedGoodsRows.value.length === 0) {
    message.warning('请先选择要删除的行');
    return;
  }

  const deleteCount = selectedGoodsRows.value.length;

  // 过滤掉选中的行（根据ID匹配）
  goodsDetails.value = goodsDetails.value.filter(
    (item) => !selectedGoodsRows.value.includes(item.id),
  );

  // 清空选中状态
  selectedGoodsRows.value = [];

  message.success(`已删除 ${deleteCount} 行`);
}

/** ✅ 新增：重新计算商品明细金额 */
async function recalculateGoodsDetails() {
  const items = formData.value.invoiceIssueItems || [];

  if (items.length === 0) {
    console.log('⚠️ 没有费用明细，清空商品明细');
    goodsDetails.value = [];
    return;
  }

  // 确保发票商品编码列表已加载
  if (codeInvoiceList.value.length === 0) {
    await loadCodeInvoiceList();
  }

  // 获取当前发票币别
  const invoiceCurrencyId = formData.value.currencyId;
  if (!invoiceCurrencyId) {
    console.warn('未设置发票币别');
    return;
  }

  // 获取币别代码
  let currencyCode = '';
  try {
    const currencyDetail = await getCurrencyDetail(invoiceCurrencyId);
    currencyCode = currencyDetail.code || '';
  } catch (error) {
    console.error('获取币别详情失败:', error);
    return;
  }

  if (!currencyCode) {
    console.warn('未找到币别代码');
    return;
  }

  // 查找默认商品编码
  const defaultCodeInvoice = codeInvoiceList.value.find(
    (item) => item.isDefault && item.defaultCurrency === currencyCode,
  );

  if (!defaultCodeInvoice) {
    console.warn('未找到默认商品编码');
    return;
  }

  // 计算所有费用的总金额（转换为人民币）
  let totalRmbAmount = 0;

  // 从 applicationGroupsData 中获取完整的费用信息
  const allApplications = flattenTreeData(applicationGroupsData.value);

  items.forEach((item: any) => {
    const app = allApplications.find(
      (a: any) => a.id === item.invoiceApplicationId,
    );
    if (app) {
      const appliedAmount = app.totalAppliedAmount || 0;
      const appCurrencyId = app.currencyId;

      // 如果需要汇率转换
      if (appCurrencyId !== 1) {
        totalRmbAmount += appliedAmount * (invoiceExchangeRate.value || 1);
      } else {
        totalRmbAmount += appliedAmount;
      }
    }
  });

  console.log('📊 重新计算后的总金额（人民币）:', totalRmbAmount.toFixed(2));

  // 如果只有一行商品明细，更新该行金额
  if (goodsDetails.value.length === 1) {
    const existingItem = goodsDetails.value[0];

    // 检查商品编码是否匹配
    if (existingItem.codeInvoiceId === defaultCodeInvoice.id) {
      const taxRate = existingItem.taxRate || defaultCodeInvoice.taxRate || 0;

      existingItem.amount = totalRmbAmount;
      existingItem.unitPrice = totalRmbAmount;
      existingItem.noTaxAmount = totalRmbAmount / (1 + taxRate / 100);
      existingItem.taxAmount =
        (totalRmbAmount / (1 + taxRate / 100)) * (taxRate / 100);

      console.log('✅ 已更新商品明细金额');
    } else {
      console.warn('⚠️ 商品编码不匹配，无法自动更新');
      message.warning('商品明细与当前币别不匹配，请手动调整或重新填充');
    }
  } else if (goodsDetails.value.length > 1) {
    // 多行商品明细时，提示用户手动处理
    message.warning('当前存在多行商品明细，删除费用后请手动调整各行的金额');
  } else {
    // 没有商品明细，自动创建
    await autoFillGoodsDetails(
      items
        .map((item: any) => {
          const app = allApplications.find(
            (a: any) => a.id === item.invoiceApplicationId,
          );
          return app;
        })
        .filter(Boolean),
    );
  }
}

/** 处理费用选择保存 */
async function handleFeeSelectionSave(data: {
  selectedApplications: any[];
  settlementId: string;
  currencyId: number;
  headerId: string;
  invoiceExchangeRate?: number;
  applicationGroupsData?: any[];
}) {
  const {
    selectedApplications,
    settlementId,
    currencyId,
    headerId,
    invoiceExchangeRate: rate,
    applicationGroupsData: groupsData,
  } = data;

  console.log('✅ 收到费用选择数据:', selectedApplications.length, '条申请');
  console.log('✅ 结算单位ID:', settlementId);
  console.log('✅ 币别ID:', currencyId);
  console.log('✅ 发票抬头ID:', headerId);
  console.log('✅ applicationGroupsData 数量:', groupsData?.length || 0);

  // ✅ 调试：检查第一个申请的商品明细数据
  if (selectedApplications.length > 0) {
    const firstApp = selectedApplications[0];
    console.log('🔍 第一个申请的完整数据:', firstApp);
    console.log(
      '🔍 invoiceApplicationGoodsDtls 是否存在:',
      !!firstApp.invoiceApplicationGoodsDtls,
    );
    console.log(
      '🔍 invoiceApplicationGoodsDtls 长度:',
      firstApp.invoiceApplicationGoodsDtls?.length || 0,
    );
    if (
      firstApp.invoiceApplicationGoodsDtls &&
      firstApp.invoiceApplicationGoodsDtls.length > 0
    ) {
      console.log(
        '🔍 第一条商品明细:',
        firstApp.invoiceApplicationGoodsDtls[0],
      );
    }
  }

  // 设置结算单位
  formData.value.settlementId = settlementId;
  formData.value.currencyId = currencyId;

  // 设置发票抬头
  if (headerId) {
    // 如果是首次选择，固定抬头和币别
    if (!fixedHeaderId.value) {
      fixedHeaderId.value = headerId;
      fixedCurrencyId.value = currencyId;
      console.log('✅ 首次选择，固定发票抬头和币别:', headerId, currencyId);
    }

    formData.value.clientInvoiceBankId = headerId;
  }

  // ✅ 设置发票汇率（从费用选择抽屉中带过来）
  if (rate !== undefined) {
    invoiceExchangeRate.value = rate;
    console.log('✅ 从费用选择抽屉中获取发票汇率:', rate);
  }

  // ✅ 自动设置归属组织为当前用户默认组织
  if (!formData.value.orgId) {
    formData.value.orgId = getMyDefaultOrgId() ?? 0;
  }

  // 加载客户开票信息
  await loadClientInvoiceInfo(settlementId);

  // ✅ 根据币别更新销售方银行（自动选择默认银行）
  updateOrgBankByCurrency();

  // ✅ 关键修复：合并申请组数据，避免重复添加
  if (groupsData && groupsData.length > 0) {
    // ✅ 获取已存在的申请ID集合（用于去重）
    const existingAppIds = new Set<string>();
    applicationGroupsData.value.forEach((group: any) => {
      if (group.id) {
        existingAppIds.add(String(group.id));
      }
    });

    // ✅ 过滤掉已存在的申请组，只添加新的
    const newGroups = groupsData.filter((group: any) => {
      return group.id && !existingAppIds.has(String(group.id));
    });

    // ✅ 合并新旧申请组数据
    if (newGroups.length > 0) {
      applicationGroupsData.value = [
        ...applicationGroupsData.value,
        ...newGroups,
      ];
      console.log(
        `✅ 已合并申请数据到 applicationGroupsData: 新增 ${newGroups.length} 个申请组，总计 ${applicationGroupsData.value.length} 个申请组`,
      );
    } else {
      console.log('⚠️ 所有申请组都已存在，无需重复添加');
    }
  } else {
    console.warn('⚠️ 未接收到 applicationGroupsData 数据');
  }

  // 判断是否是首次添加费用（商品明细为空时才自动填充）
  const isFirstTimeAdd = goodsDetails.value.length === 0;

  // ✅ 关键修复：获取已存在的申请ID集合，用于过滤
  const existingAppIds = getAddedAppIds();

  // ✅ 过滤出真正的新申请（排除已存在的）
  const newApplications = selectedApplications.filter((app: any) => {
    return !existingAppIds.has(app.id);
  });

  console.log('📊 申请过滤结果:', {
    抽屉返回总数: selectedApplications.length,
    已存在数量: selectedApplications.length - newApplications.length,
    实际新增数量: newApplications.length,
  });

  // 如果没有新申请，直接返回
  if (newApplications.length === 0) {
    console.log('⚠️ 没有新申请需要处理');
    message.warning('所选申请已全部添加，无新增申请');
    return;
  }

  addSelectedApplicationsToForm(newApplications);

  // ✅ 统一调用 mergeGoodsDetailsFromApplications 来处理商品明细合并
  if (isFirstTimeAdd) {
    // 首次添加：根据 invoiceApplicationGoodsDtls 合并商品明细
    await mergeGoodsDetailsFromApplications(newApplications);
  } else if (goodsDetails.value.length > 0) {
    // ✅ 已有商品明细：将新申请的商品明细合并到现有明细中
    await mergeGoodsDetailsFromApplications(newApplications);
  } else {
    // 没有商品明细，尝试自动填充
    await autoFillGoodsDetails(newApplications);
  }
}

/** 将选中的申请添加到表单 */
function addSelectedApplicationsToForm(selectedApps: any[]) {
  // ✅ 获取已存在的申请ID集合
  const existingAppIds = getAddedAppIds();

  // ✅ 过滤掉已存在的申请，只添加新的申请
  const newApps = selectedApps.filter((app: any) => {
    return !existingAppIds.has(app.id);
  });

  // 如果没有新申请，直接返回
  if (newApps.length === 0) {
    console.log('⚠️ 所有选择的申请都已存在，无需重复添加');
    message.warning('所选申请已全部添加，无新增申请');
    return;
  }

  // 将选中的申请转换为 InvoiceIssueItemInputDto
  const items = newApps.map((app: any) => ({
    invoiceApplicationId: app.id,
    remark: app.remark || '',
  }));

  // 添加到 formData
  if (!formData.value.invoiceIssueItems) {
    formData.value.invoiceIssueItems = [];
  }

  formData.value.invoiceIssueItems.push(...items);

  console.log(
    `✅ 添加了 ${items.length} 条新申请明细（已过滤 ${selectedApps.length - newApps.length} 条重复申请）:`,
    items,
  );
  message.success(`成功添加 ${items.length} 条新申请`);
}

/** 获取已添加的申请ID列表 */
function getAddedAppIds(): Set<string> {
  const items = formData.value.invoiceIssueItems || [];
  return new Set(items.map((item: any) => String(item.invoiceApplicationId)));
}

/** ✅ 新增：将已添加的申请ID列表转换为数组格式（用于传递给子组件） */
function getAddedAppIdsArray(): string[] {
  return Array.from(getAddedAppIds());
}

/** 加载发票商品编码列表 */
async function loadCodeInvoiceList() {
  try {
    const result = await getCodeInvoicePagedList({
      PageIndex: 1,
      PageSize: 1000,
    });
    codeInvoiceList.value = result.items || [];
  } catch (error) {
    console.error('加载发票商品编码失败:', error);
  }
}

/** 加载客户开票信息 */
async function loadClientInvoiceInfo(settlementId: string) {
  if (!settlementId) return;

  try {
    const list = await getClientInvoiceInfoList({ ClientId: settlementId });
    clientInvoiceInfoList.value = list;

    // 选择默认的开票信息
    const defaultInfo = list.find((item) => item.isDefault);
    selectedClientInvoiceInfo.value =
      defaultInfo || (list.length > 0 ? list[0] : undefined);

    // 根据币别选择银行
    updateClientBankByCurrency();
  } catch (error) {
    console.error('加载客户开票信息失败:', error);
  }
}

/** 根据币别更新客户银行 */
function updateClientBankByCurrency() {
  if (!selectedClientInvoiceInfo.value || !formData.value.currencyId) return;

  const currencyId = formData.value.currencyId;
  const bank = selectedClientInvoiceInfo.value.clientInvoiceBanks?.find(
    (b) => b.currencyId === currencyId && b.isDefault,
  );

  if (bank) {
    formData.value.clientInvoiceBankId = bank.id;
  } else {
    // 如果没有找到默认银行，清空选择
    formData.value.clientInvoiceBankId = undefined;
  }
}

/** 根据币别更新销售方银行 */
function updateOrgBankByCurrency() {
  if (!orgBankAccounts.value.length || !formData.value.currencyId){
     // ✅ 没有银行列表或币别时，清空选择
     formData.value.orgBankAccountId = undefined;
     return;
  }

  const currencyId = formData.value.currencyId;

  // 先查找默认的银行
  const defaultBank = orgBankAccounts.value.find(
    (b) => b.currencyId === currencyId && b.default,
  );

  if (defaultBank) {
    // ✅ 有默认银行，自动选择
    formData.value.orgBankAccountId = defaultBank.id;
    console.log(
      '✅ 自动选择销售方默认银行:',
      defaultBank.bankName,
      defaultBank.bankAccount,
    );
  } else {
    // ✅ 没有默认银行，清空选择
    formData.value.orgBankAccountId = undefined;
    console.log('⚠️ 未找到销售方默认银行，清空选择');
  }
}

/** 打开备注模板管理弹窗 */
function handleOpenRemarkTemplateModal() {
  remarkTemplateModalVisible.value = true;
}

/** 打开选择备注模板弹窗 */
function handleOpenSelectRemarkTemplateModal() {
  selectRemarkTemplateModalVisible.value = true;
}

/** 使用备注模板 */
function handleUseRemarkTemplate(template: string) {
  formData.value.remark = template;
  //message.success('已应用备注模板');
}

/** 根据选中的归属组织(orgId)填充开票公司信息（税号/开票地址/银行账户） */
function applyOrgCompanyInfo() {
  const companyNode = getMyOrgCompanyNode(formData.value.orgId);
  if (companyNode) {
    applicantCompany.value = companyNode.id;
    applicantCompanyName.value = companyNode.displayName || '';
    applicantTaxNumber.value = companyNode.unifiedSocialCreditCode || '';
    applicantAddress.value =
      `${companyNode.invoiceAddress || ''} ${companyNode.invoiceTel || ''}`.trim();
    orgBankAccounts.value = Array.isArray(companyNode.orgBankAccounts)
      ? companyNode.orgBankAccounts
      : [];
  } else {
    applicantCompany.value = 0;
    applicantCompanyName.value = '';
    applicantTaxNumber.value = '';
    applicantAddress.value = '';
    orgBankAccounts.value = [];
  }
}

/** 初始化开票人信息 */
function initApplicantInfo() {
  const userInfo = userStore.userInfo;
  if (userInfo) {
    applicantName.value = userInfo.realName || userInfo.username || '';
  }
  if (!formData.value.orgId) {
    formData.value.orgId = getMyDefaultOrgId() ?? 0;
  }
  applyOrgCompanyInfo();
}

// 归属组织变化时，联动刷新开票公司信息
watch(
  () => formData.value.orgId,
  () => {
    applyOrgCompanyInfo();
    // ✅ 关键修复：归属组织变化后，立即更新银行选择（无论币别是否存在）
    // 如果币别已存在，会自动选择匹配的默认银行；否则等待币别设置后再更新
    if (formData.value.currencyId) {
      updateOrgBankByCurrency();
    } else {
      // ✅ 币别不存在时，先清空银行选择，避免显示不匹配的银行
      formData.value.orgBankAccountId = undefined;
    }
  },
);

/** 发票抬头选项列表 */
const clientInvoiceHeaderOptions = computed(() => {
  if (
    !clientInvoiceInfoList.value ||
    clientInvoiceInfoList.value.length === 0
  ) {
    return [];
  }

  return clientInvoiceInfoList.value.map((info) => ({
    label: info.header || '未命名抬头',
    value: info.id,
  }));
});

/** 根据发票类型获取标题 */
function getInvoiceTitle(invoiceType: string): string {
  const option = invoiceTypeOptions.find((opt) => opt.value === invoiceType);
  return option ? option.label : '增值税电子普通发票';
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

/** 处理发票类型变化 */
function handleInvoiceTypeChange({ key }: any) {
  formData.value.invoiceType = key;
}

/** 处理发票抬头变化 */
function handleClientInvoiceHeaderChange(headerId: any) {
  if (!headerId) return;

  const selectedInfo = clientInvoiceInfoList.value.find(
    (info) => info.id === String(headerId),
  );

  if (selectedInfo) {
    selectedClientInvoiceInfo.value = selectedInfo;

    // 重新根据币别选择银行
    updateClientBankByCurrency();

    console.log('切换发票抬头:', selectedInfo.header, 'ID:', headerId);
  }
}

/** 处理客户银行变化 - 校验币种 */
function handleClientBankChange(bankId: any) {
  if (!bankId || !selectedClientInvoiceInfo.value) return;

  const selectedBank = selectedClientInvoiceInfo.value.clientInvoiceBanks?.find(
    (b) => b.id === String(bankId),
  );

  if (selectedBank) {
    // 校验银行币种是否与开票币种一致
    if (selectedBank.currencyId !== formData.value.currencyId) {
      message.warning(
        `所选银行的币种（${selectedBank.currencyCode}）与开票币种不一致，请重新选择`,
      );
      // 恢复为之前的选择或清空
      updateClientBankByCurrency();
      return;
    }

    console.log(
      '选择客户银行:',
      selectedBank.bankName,
      selectedBank.bankAccount,
      '币种:',
      selectedBank.currencyCode,
    );
  }
}

/** 自动填充商品明细 */
async function autoFillGoodsDetails(selectedApplications: any[]) {
  // 确保发票商品编码列表已加载
  if (codeInvoiceList.value.length === 0) {
    console.warn('发票商品编码列表为空，尝试重新加载...');
    await loadCodeInvoiceList();
  }

  // 获取当前发票币别
  const invoiceCurrencyId = formData.value.currencyId;

  if (!invoiceCurrencyId) {
    console.warn('未设置发票币别，无法自动填充商品明细');
    message.warning('请先选择发票币别');
    return;
  }

  // 获取币别详情，将币别ID转换为币别代码
  let currencyCode = '';
  try {
    const currencyDetail = await getCurrencyDetail(invoiceCurrencyId);
    currencyCode = currencyDetail.code || '';
    console.log(
      '🔍 发票币别详情 - ID:',
      invoiceCurrencyId,
      '代码:',
      currencyCode,
    );
  } catch (error) {
    console.error('获取币别详情失败:', error);
    message.warning('获取币别信息失败');
    return;
  }

  if (!currencyCode) {
    console.warn(`未找到币别ID ${invoiceCurrencyId} 对应的币别代码`);
    message.warning('未找到币别信息，请手动添加商品明细');
    return;
  }

  // ✅ 根据发票币别查找默认的发票商品编码
  const defaultCodeInvoice = codeInvoiceList.value.find(
    (item) => item.isDefault && item.defaultCurrency === currencyCode,
  );

  if (!defaultCodeInvoice) {
    console.warn(`未找到币别 ${currencyCode} 的默认发票商品编码`);
    message.warning(
      `未找到币别 ${currencyCode} 对应的默认商品编码，请手动添加`,
    );
    return;
  }

  console.log(
    '✅ 找到默认商品编码:',
    defaultCodeInvoice.name,
    '规格:',
    defaultCodeInvoice.specification,
    '单位:',
    defaultCodeInvoice.unit,
  );

  // 计算所有选中申请的总金额（使用原币金额，并转换为人民币）
  let totalRmbAmount = 0; // 人民币总金额

  selectedApplications.forEach((app: any) => {
    // 使用申请的原币金额
    const appliedAmount = app.totalAppliedAmount || 0;
    const appCurrencyId = app.currencyId;
    const appCurrencyCode = app.currencyCode || '未知';

    // ✅ 如果申请币别与人民币不同，需要进行汇率转换
    if (appCurrencyId !== 1) {
      // 外币转人民币：原币金额 × 汇率
      const convertedAmount = appliedAmount * (invoiceExchangeRate.value || 1);
      totalRmbAmount += convertedAmount;
      console.log(
        `💰 外币转换 - ${appCurrencyCode}: ${appliedAmount.toFixed(2)} × ${invoiceExchangeRate.value} = ${convertedAmount.toFixed(2)} RMB`,
      );
    } else {
      // 币别是人民币，直接累加
      totalRmbAmount += appliedAmount;
      console.log(
        `💰 同币别累加 - ${appCurrencyCode}: ${appliedAmount.toFixed(2)}`,
      );
    }
  });

  console.log(
    '📊 商品明细总金额（人民币）:',
    totalRmbAmount.toFixed(2),
    '发票币别:',
    currencyCode,
  );

  // ✅ 使用默认商品编码创建一条商品明细
  const taxRate = defaultCodeInvoice.taxRate || 0;

  const item = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9), // 生成唯一ID
    codeInvoiceId: defaultCodeInvoice.id,
    specification: defaultCodeInvoice.specification || '',
    unit: defaultCodeInvoice.unit || '票',
    quantity: 1,
    unitPrice: totalRmbAmount, // ✅ 单价 = 人民币总金额（用于开票）
    amount: totalRmbAmount, // ✅ 金额 = 人民币总金额（用于开票）
    noTaxAmount: totalRmbAmount / (1 + taxRate / 100),
    taxRate: taxRate,
    taxAmount: (totalRmbAmount / (1 + taxRate / 100)) * (taxRate / 100),
    remark: '',
  };

  goodsDetails.value.push(item);

  console.log(
    '✅ 自动填充商品明细 - 商品名称:',
    defaultCodeInvoice.name,
    '规格:',
    defaultCodeInvoice.specification,
    '单位:',
    defaultCodeInvoice.unit,
    '人民币金额:',
    totalRmbAmount.toFixed(2),
  );
  console.log('📦 自动填充的商品明细总数:', goodsDetails.value.length);
}

/**
 * ✅ 新增：根据申请的 invoiceApplicationGoodsDtls 合并商品明细
 * 合并规则：货物名称 + 单位 + 单价 相同的条目进行合并
 */
async function mergeGoodsDetailsFromApplications(selectedApplications: any[]) {
  console.log('🔄 开始合并商品明细，申请数量:', selectedApplications.length);

  // ✅ 调试：检查每个申请的商品明细数据
  selectedApplications.forEach((app, index) => {
    console.log(`📦 申请 ${index + 1}:`, app.applicationNo || app.id);
    console.log(
      `   - invoiceApplicationGoodsDtls 是否存在:`,
      !!app.invoiceApplicationGoodsDtls,
    );
    console.log(
      `   - invoiceApplicationGoodsDtls 长度:`,
      app.invoiceApplicationGoodsDtls?.length || 0,
    );
    if (
      app.invoiceApplicationGoodsDtls &&
      app.invoiceApplicationGoodsDtls.length > 0
    ) {
      console.log(`   - 第一条商品明细:`, app.invoiceApplicationGoodsDtls[0]);
    }
  });

  // 确保发票商品编码列表已加载
  if (codeInvoiceList.value.length === 0) {
    console.warn('发票商品编码列表为空，尝试重新加载...');
    await loadCodeInvoiceList();
  }

  // 获取当前发票币别
  const invoiceCurrencyId = formData.value.currencyId;

  if (!invoiceCurrencyId) {
    console.warn('未设置发票币别，无法合并商品明细');
    message.warning('请先选择发票币别');
    return;
  }

  // 获取币别详情，将币别ID转换为币别代码
  let currencyCode = '';
  try {
    const currencyDetail = await getCurrencyDetail(invoiceCurrencyId);
    currencyCode = currencyDetail.code || '';
    console.log(
      '🔍 发票币别详情 - ID:',
      invoiceCurrencyId,
      '代码:',
      currencyCode,
    );
  } catch (error) {
    console.error('获取币别详情失败:', error);
    message.warning('获取币别信息失败');
    return;
  }

  if (!currencyCode) {
    console.warn(`未找到币别ID ${invoiceCurrencyId} 对应的币别代码`);
    message.warning('未找到币别信息，无法合并商品明细');
    return;
  }

  // ✅ 使用 Map 来存储合并后的商品明细
  // Key: 货物名称_单位_单价
  // Value: 合并后的商品明细对象
  const goodsMap = new Map<string, any>();

  // 遍历所有选中的申请
  selectedApplications.forEach((app: any) => {
    console.log(
      '📦 处理申请:',
      app.applicationNo,
      '商品明细数量:',
      app.invoiceApplicationGoodsDtls?.length || 0,
    );

    // 检查申请是否有商品明细
    if (
      !app.invoiceApplicationGoodsDtls ||
      app.invoiceApplicationGoodsDtls.length === 0
    ) {
      console.warn('⚠️ 申请', app.applicationNo, '没有商品明细数据');
      return;
    }

    // 遍历该申请的所有商品明细
    app.invoiceApplicationGoodsDtls.forEach((goods: any) => {
      // ✅ 构建合并键：货物名称_单位_单价
      const goodsName = goods.codeInvoiceName || goods.goodsName || '未知商品';
      const unit = goods.unit || '票';
      const unitPrice = goods.unitPrice || 0;

      const mergeKey = `${goodsName}_${unit}_${unitPrice}`;

      console.log(
        '  📋 处理商品明细:',
        goodsName,
        '单位:',
        unit,
        '单价:',
        unitPrice,
      );

      if (goodsMap.has(mergeKey)) {
        // ✅ 已存在相同商品，累加数量和金额
        const existing = goodsMap.get(mergeKey);
        existing.quantity += goods.quantity || 0;
        existing.amount += goods.amount || 0;
        existing.noTaxAmount += goods.noTaxAmount || 0;
        existing.taxAmount += goods.taxAmount || 0;

        console.log(
          '    ➕ 合并到现有行 - 数量:',
          existing.quantity,
          '金额:',
          existing.amount.toFixed(2),
        );
      } else {
        // ✅ 新商品，添加到 Map
        // 查找对应的 codeInvoiceId
        const codeInvoiceItem = codeInvoiceList.value.find(
          (item: any) =>
            item.name === goodsName || item.id === goods.codeInvoiceId,
        );

        const newItem = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9), // 生成唯一ID
          codeInvoiceId: codeInvoiceItem
            ? codeInvoiceItem.id
            : goods.codeInvoiceId,
          codeInvoiceName: goodsName,
          specification: goods.specification || '',
          unit: unit,
          quantity: goods.quantity || 0,
          unitPrice: unitPrice,
          amount: goods.amount || 0,
          noTaxAmount: goods.noTaxAmount || 0,
          taxRate: goods.taxRate || 0,
          taxAmount: goods.taxAmount || 0,
          remark: goods.remark || '',
        };

        goodsMap.set(mergeKey, newItem);
        console.log(
          '    ✨ 新增商品行 - 数量:',
          newItem.quantity,
          '金额:',
          newItem.amount.toFixed(2),
        );
      }
    });
  });

  // ✅ 将 Map 转换为数组
  const mergedGoodsDetails = Array.from(goodsMap.values());

  console.log('✅ 合并完成，最终商品明细数量:', mergedGoodsDetails.length);
  console.log('📊 合并后的商品明细:', mergedGoodsDetails);

  // ✅ 更新商品明细
  if (mergedGoodsDetails.length > 0) {
    goodsDetails.value = mergedGoodsDetails;
    // message.success(`成功合并 ${mergedGoodsDetails.length} 条商品明细`);
  } else {
    console.warn('⚠️ 没有可合并的商品明细');
    message.warning('所选申请中没有商品明细数据');
  }
}

/** 将新申请金额合并到现有商品明细 */
async function mergeAmountToExistingGoods(selectedApplications: any[]) {
  // 确保只有一行商品明细
  if (goodsDetails.value.length !== 1) {
    console.warn('商品明细数量不为1，无法合并');
    return;
  }

  // 确保发票商品编码列表已加载
  if (codeInvoiceList.value.length === 0) {
    console.warn('发票商品编码列表为空，尝试重新加载...');
    await loadCodeInvoiceList();
  }

  // 获取当前发票币别
  const invoiceCurrencyId = formData.value.currencyId;

  if (!invoiceCurrencyId) {
    console.warn('未设置发票币别，无法合并金额');
    message.warning('请先选择发票币别');
    return;
  }

  // 获取币别详情，将币别ID转换为币别代码
  let currencyCode = '';
  try {
    const currencyDetail = await getCurrencyDetail(invoiceCurrencyId);
    currencyCode = currencyDetail.code || '';
    console.log(
      '🔍 发票币别详情 - ID:',
      invoiceCurrencyId,
      '代码:',
      currencyCode,
    );
  } catch (error) {
    console.error('获取币别详情失败:', error);
    message.warning('获取币别信息失败');
    return;
  }

  if (!currencyCode) {
    console.warn(`未找到币别ID ${invoiceCurrencyId} 对应的币别代码`);
    message.warning('未找到币别信息，无法合并金额');
    return;
  }

  // ✅ 根据发票币别查找默认的发票商品编码
  const defaultCodeInvoice = codeInvoiceList.value.find(
    (item) => item.isDefault && item.defaultCurrency === currencyCode,
  );

  if (!defaultCodeInvoice) {
    console.warn(`未找到币别 ${currencyCode} 的默认发票商品编码`);
    message.warning(`未找到币别 ${currencyCode} 对应的默认商品编码，无法合并`);
    return;
  }

  console.log(
    '✅ 找到默认商品编码:',
    defaultCodeInvoice.name,
    '规格:',
    defaultCodeInvoice.specification,
    '单位:',
    defaultCodeInvoice.unit,
  );

  // 计算所有选中申请的总金额（使用原币金额，并转换为人民币）
  let totalRmbAmount = 0; // 人民币总金额

  selectedApplications.forEach((app: any) => {
    // 使用申请的原币金额
    const appliedAmount = app.totalAppliedAmount || 0;
    const appCurrencyId = app.currencyId;
    const appCurrencyCode = app.currencyCode || '未知';

    // ✅ 如果申请币别与人民币不同，需要进行汇率转换
    if (appCurrencyId !== 1) {
      // 外币转人民币：原币金额 × 汇率
      const convertedAmount = appliedAmount * (invoiceExchangeRate.value || 1);
      totalRmbAmount += convertedAmount;
      console.log(
        `💰 外币转换 - ${appCurrencyCode}: ${appliedAmount.toFixed(2)} × ${invoiceExchangeRate.value} = ${convertedAmount.toFixed(2)} RMB`,
      );
    } else {
      // 币别是人民币，直接累加
      totalRmbAmount += appliedAmount;
      console.log(
        `💰 同币别累加 - ${appCurrencyCode}: ${appliedAmount.toFixed(2)}`,
      );
    }
  });

  console.log(
    '📊 新申请总金额（人民币）:',
    totalRmbAmount.toFixed(2),
    '发票币别:',
    currencyCode,
  );

  // ✅ 获取现有的商品明细行
  const existingItem = goodsDetails.value[0];

  // 检查现有行的商品编码是否与默认商品编码一致
  if (existingItem.codeInvoiceId !== defaultCodeInvoice.id) {
    console.warn(
      '现有商品明细的商品编码与默认商品编码不一致，无法合并',
      existingItem.codeInvoiceId,
      defaultCodeInvoice.id,
    );
    message.warning('现有商品明细与当前币别不匹配，请手动处理或重新填充');
    return;
  }

  // ✅ 合并金额到现有行
  const taxRate = existingItem.taxRate || defaultCodeInvoice.taxRate || 0;
  const currentAmount = existingItem.amount || 0;
  const newAmount = currentAmount + totalRmbAmount;

  // 更新现有行的数据
  existingItem.amount = newAmount;
  existingItem.unitPrice = newAmount; // 单价 = 总金额（因为数量为1）
  existingItem.noTaxAmount = newAmount / (1 + taxRate / 100);
  existingItem.taxAmount = (newAmount / (1 + taxRate / 100)) * (taxRate / 100);

  console.log(
    '✅ 合并金额完成 - 原金额:',
    currentAmount.toFixed(2),
    '新增金额:',
    totalRmbAmount.toFixed(2),
    '合并后金额:',
    newAmount.toFixed(2),
  );
  console.log('📦 自动填充的商品明细总数:', goodsDetails.value.length);
}

/** 计算商品明细总金额（人民币） */
const totalInvoiceAmount = computed(() => {
  return goodsDetails.value.reduce((sum, item) => sum + (item.amount || 0), 0);
});

/** 计算商品明细总税额（人民币） */
const totalTaxAmount = computed(() => {
  return goodsDetails.value.reduce(
    (sum, item) => sum + (item.taxAmount || 0),
    0,
  );
});

/** 计算申请总金额（原币金额，从申请明细中获取） */
const totalAppliedAmountOriginal = computed(() => {
  const items = formData.value.invoiceIssueItems || [];

  // 从 applicationGroupsData 中获取每个申请的原币金额
  let total = 0;
  items.forEach((item: any) => {
    const app = applicationGroupsData.value.find(
      (a: any) => a.id === item.invoiceApplicationId,
    );
    if (app) {
      total += app.totalAppliedAmount || 0;
    }
  });

  return total;
});

/** 计算申请总金额（转换为人民币） */
const totalAppliedAmount = computed(() => {
  // 如果发票币别是人民币，直接返回
  if (formData.value.currencyId === 1) {
    return totalAppliedAmountOriginal.value;
  }

  // 如果是外币，转换为人民币
  return totalAppliedAmountOriginal.value * (invoiceExchangeRate.value || 1);
});

/** 判断发票金额与申请金额是否有差异 */
const hasAmountDifference = computed(() => {
  // 使用容差值比较，避免浮点数精度问题
  return Math.abs(totalInvoiceAmount.value - totalAppliedAmount.value) > 0.01;
});

/** 获取原币金额（用于显示） */
const foreignCurrencyAmount = computed(() => {
  // 只有非人民币才需要显示原币金额
  if (formData.value.currencyId === 1) {
    return null;
  }

  // 直接返回原币金额
  return totalAppliedAmountOriginal.value;
});

/** 获取与开票币种一致的银行列表 */
const filteredClientBanks = computed(() => {
  if (!selectedClientInvoiceInfo.value || !formData.value.currencyId) {
    return [];
  }

  const currencyId = formData.value.currencyId;
  const banks = selectedClientInvoiceInfo.value.clientInvoiceBanks || [];

  // 只返回与开票币种一致的银行
  return banks.filter((bank) => bank.currencyId === currencyId);
});

/** 获取销售方与开票币种一致的银行列表 */
const filteredOrgBanks = computed(() => {
  if (!orgBankAccounts.value.length || !formData.value.currencyId) {
    return [];
  }

  const currencyId = formData.value.currencyId;

  // 只返回与开票币种一致的银行
  return orgBankAccounts.value.filter((bank) => bank.currencyId === currencyId);
});

/** ✅ 新增：为备注模板生成占位符数据 */
const remarkTemplateData = computed(() => {
  const items = formData.value.invoiceIssueItems || [];

  if (items.length === 0) {
    console.log('⚠️ 没有费用明细，无法生成占位符数据');
    return {
      commissionNum: '',
      mblNum: '',
      invoiceExchangeRate: invoiceExchangeRate.value,
      foreignCurrencyAmount: '0.00',
      rmbAmount: '0.00',
      clientBankName: '',
      clientBankAccount: '',
      orgBankName: '',
      orgBankAccount: '',
    };
  }

  // 从 applicationGroupsData 中获取完整的费用信息
  const allApplications = flattenTreeData(applicationGroupsData.value);

  console.log('🔍 扁平化后的申请数据数量:', allApplications.length);
  if (allApplications.length > 0) {
    console.log(
      '🔍 第一个申请的 commissionNum:',
      allApplications[0].commissionNum,
    );
    console.log('🔍 第一个申请的 mblNum:', allApplications[0].mblNum);
  }

  // 收集委托编号和主提单号
  const commissionNums = new Set<string>();
  const mblNums = new Set<string>();

  // 统计金额（按币别）
  let totalForeignAmount = 0;
  let totalRmbAmount = 0;
  let invoiceCurrencyCode = '';

  items.forEach((item: any) => {
    const app = allApplications.find(
      (a: any) => a.id === item.invoiceApplicationId,
    );

    if (app) {
      // 收集委托编号
      if (app.commissionNum) {
        commissionNums.add(app.commissionNum);
      }

      // 收集主提单号
      if (app.mblNum) {
        mblNums.add(app.mblNum);
      }

      // 统计金额
      const appliedAmount = app.totalAppliedAmount || 0;
      const appCurrencyId = app.currencyId;
      const appCurrencyCode = app.currencyCode || 'CNY';

      // 如果是发票币别，累加外币金额
      if (appCurrencyId === formData.value.currencyId) {
        totalForeignAmount += appliedAmount;
        if (!invoiceCurrencyCode) {
          invoiceCurrencyCode = appCurrencyCode;
        }
      }

      // 转换为人民币
      if (appCurrencyId !== 1) {
        totalRmbAmount += appliedAmount * (invoiceExchangeRate.value || 1);
      } else {
        totalRmbAmount += appliedAmount;
      }
    }
  });

  // 获取客户银行信息
  const clientBank = filteredClientBanks.value.find(
    (b) => b.id === formData.value.clientInvoiceBankId,
  );

  // 获取销售方银行信息
  const orgBank = filteredOrgBanks.value.find(
    (b) => b.id === formData.value.orgBankAccountId,
  );

  const templateData = {
    commissionNum: Array.from(commissionNums).join('、'),
    mblNum: Array.from(mblNums).join('、'),
    invoiceExchangeRate: invoiceExchangeRate.value,
    foreignCurrencyAmount: totalForeignAmount.toFixed(2),
    rmbAmount: totalRmbAmount.toFixed(2),
    clientBankName: clientBank?.bankName || '',
    clientBankAccount: clientBank?.bankAccount || '',
    orgBankName: orgBank?.bankName || '',
    orgBankAccount: orgBank?.bankAccount || '',
  };

  console.log('📋 生成的备注模板占位符数据:', templateData);

  return templateData;
});

/** 税率选项（包含常用税率和自定义输入） */
const taxRateOptions = [
  { label: '免税', value: 0 },
  { label: '6%', value: 6 },
  { label: '9%', value: 9 },
  { label: '13%', value: 13 },
];

/** 获取税率显示文本 */
function getTaxRateLabel(value: number | string): string {
  if (value === 0 || value === '0') return '免税';
  if (value === 6 || value === '6') return '6%';
  if (value === 9 || value === '9') return '9%';
  if (value === 13 || value === '13') return '13%';
  // 自定义税率
  return `${value}%`;
}

/** 加载详情数据 */
async function loadDetail() {
  if (!editId.value) return;

  loading.value = true;
  try {
    const detail = await getInvoiceIssueDetail(editId.value);

    formData.value = {
      id: detail.id,
      settlementId: detail.settlementId,
      orgId: detail.orgId,
      currencyId: detail.currencyId || 1,
      invoiceType: detail.invoiceType || 'p',
      invoiceIssueType: detail.invoiceIssueType,
      invoiceNo: detail.invoiceNo,
      require: detail.require,
      remark: detail.remark,
      orgBankAccountId: detail.orgBankAccountId,
      clientInvoiceBankId: detail.clientInvoiceBankId,
      invoiceIssueItems:
        detail.invoiceIssueItems?.map((item: any) => ({
          invoiceApplicationId: item.invoiceApplicationId,
          remark: item.remark || '',
        })) || [],
      invoiceIssueGoodsDtls: detail.invoiceIssueGoodsDtls || [],
    };

    // 设置开票人和开票日期
    applicantName.value = detail.applyUserName || '';
    invoiceIssueTime.value = detail.invoiceIssueTime
      ? dayjs(detail.invoiceIssueTime).format('YYYY-MM-DD')
      : dayjs().format('YYYY-MM-DD');

    // 加载客户开票信息
    await loadClientInvoiceInfo(detail.settlementId);

    // 设置开票汇率
    invoiceExchangeRate.value = detail.invoiceExchangeRate || 1.0;

    // ✅ 根据币别更新销售方银行
    updateOrgBankByCurrency();

    // ✅ 从 invoiceIssueItems 中构建 applicationGroupsData（用于占位符替换等功能）
    if (detail.invoiceIssueItems && detail.invoiceIssueItems.length > 0) {
      console.log('✅ 已加载申请明细:', detail.invoiceIssueItems.length, '条');

      // ✅ 关键修复：需要根据 invoiceApplicationId 重新获取完整的申请数据
      await loadFullApplicationData(detail.invoiceIssueItems);
    }

    // ✅ 加载商品明细数据，并为每行添加唯一ID
    if (
      detail.invoiceIssueGoodsDtls &&
      detail.invoiceIssueGoodsDtls.length > 0
    ) {
      // 创建全新的数组副本，确保响应式更新
      const newGoodsDetails = detail.invoiceIssueGoodsDtls.map(
        (item: any, index: number) => ({
          ...item,
          // 确保 id 是字符串类型，如果不存在则生成新ID
          id: item.id
            ? String(item.id)
            : Date.now().toString() + index.toString(),
        }),
      );

      // 先清空再赋值，确保触发响应式更新
      goodsDetails.value = [];
      await nextTick();
      goodsDetails.value = newGoodsDetails;

      console.log('✅ 加载商品明细:', goodsDetails.value.length, '条');
      console.log('✅ 商品明细数据详情:', goodsDetails.value);
    } else {
      console.log('⚠️ 详情中没有商品明细数据');
    }
  } catch (error) {
    console.error('加载详情失败:', error);
    message.error('加载详情失败');
  } finally {
    loading.value = false;
  }
}

/** ✅ 新增:根据 invoiceIssueItems 加载完整的申请数据 */
async function loadFullApplicationData(invoiceIssueItems: any[]) {
  try {
    // 提取所有的 invoiceApplicationId
    const applicationIds = invoiceIssueItems.map(
      (item: any) => item.invoiceApplicationId,
    );

    console.log('🔍 需要加载的申请ID列表:', applicationIds);

    // ✅ 调用开票申请详情接口获取完整数据
    const groupsData: any[] = [];

    for (const appItemId of applicationIds) {
      try {
        console.log('📥 正在加载申请详情:', appItemId);
        const appDetail = await InvoiceApplicationAdminApi.detail(appItemId);

        console.log('✅ 成功加载申请详情:', {
          id: appDetail.id,
          applicationNo: appDetail.applicationNo,
          commissionNum:
            appDetail.feeGroups?.[0]?.transportOrder?.commissionNum,
          mblNum: appDetail.feeGroups?.[0]?.transportOrder?.mblNum,
        });

        // ✅ 构建扁平化的费用明细列表
        const flatItems: any[] = [];
        let totalAppliedAmount = 0;

        appDetail.feeGroups.forEach((group: any) => {
          group.items.forEach((item: any) => {
            flatItems.push({
              id: item.id,
              invoiceApplicationId: appDetail.id,
              orderFeeId: item.orderFeeId,
              appliedAmount: item.appliedAmount,
              remark: item.remark,
              orderFee: item.orderFee,
              remainingInvoiceAmount: item.remainingInvoiceAmount,
              // ✅ 关键字段：从 transportOrder 中获取委托编号和主提单号
              commissionNum: group.transportOrder?.commissionNum || '',
              mblNum: group.transportOrder?.mblNum || '',
              currencyId: appDetail.currencyId,
              currencyCode: appDetail.currencyCode,
              totalAppliedAmount: item.appliedAmount,
            });

            totalAppliedAmount += item.appliedAmount;
          });
        });

        // ✅ 构建申请组对象（与抽屉返回的数据结构一致）
        // ✅ 从第一个费用项中获取 commissionNum 和 mblNum（同一申请的所有费用项应该属于同一个运输订单）
        const firstItem = flatItems[0];

        const applicationGroup = {
          id: appDetail.id,
          applicationNo: appDetail.applicationNo,
          settlementId: appDetail.settlementId,
          status: appDetail.status,
          currencyId: appDetail.currencyId,
          currencyCode: appDetail.currencyCode,
          invoiceType: appDetail.invoiceType,
          clientInvoiceBankId: appDetail.clientInvoiceBankId,
          orgBankAccountId: appDetail.orgBankAccountId,
          applyUserId: appDetail.applyUserId,
          applyTime: appDetail.applyTime,
          require: appDetail.require,
          remark: appDetail.remark,
          creatorUserName: appDetail.creatorUserName,
          applyUserName: appDetail.applyUserName,
          settlementName: appDetail.settlementName,
          companyName: undefined,
          invoiceExchangeRate: appDetail.invoiceExchangeRate,
          // ✅ 关键字段：委托编号和主提单号（放在申请组顶层，方便占位符替换）
          commissionNum: firstItem?.commissionNum || '',
          mblNum: firstItem?.mblNum || '',
          invoiceApplicationItems: flatItems,
          invoiceApplicationGoodsDtls:
            appDetail.invoiceApplicationGoodsDtls || [],
          totalAppliedAmount: totalAppliedAmount,
          totalGoodsAmount: 0,
          amountMatched: true,
          clientInvoiceInfo: null,
        };

        groupsData.push(applicationGroup);
      } catch (error) {
        console.error(`❌ 加载申请 ${appItemId} 详情失败:`, error);
        message.warning(`加载申请 ${appItemId} 详情失败`);
      }
    }

    // ✅ 设置 applicationGroupsData
    applicationGroupsData.value = groupsData;
    console.log(
      '✅ applicationGroupsData 已加载完成，共',
      groupsData.length,
      '个申请组',
    );

    // ✅ 调试日志：验证 commissionNum 和 mblNum 是否正确设置
    if (groupsData.length > 0) {
      console.log('📋 第一个申请组的详细信息:', {
        id: groupsData[0].id,
        applicationNo: groupsData[0].applicationNo,
        commissionNum: groupsData[0].commissionNum,
        mblNum: groupsData[0].mblNum,
        invoiceApplicationItemsCount:
          groupsData[0].invoiceApplicationItems?.length || 0,
      });

      if (
        groupsData[0].invoiceApplicationItems &&
        groupsData[0].invoiceApplicationItems.length > 0
      ) {
        console.log('📋 第一个费用项的详细信息:', {
          id: groupsData[0].invoiceApplicationItems[0].id,
          commissionNum: groupsData[0].invoiceApplicationItems[0].commissionNum,
          mblNum: groupsData[0].invoiceApplicationItems[0].mblNum,
        });
      }
    }
  } catch (error) {
    console.error('加载完整申请数据失败:', error);
    message.error('加载申请详情失败，占位符可能无法正确替换');
  }
}

onMounted(() => {
  // 初始化申请人信息（从 auth store 获取）
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
        <Button @click="handleCancel">取消</Button>
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

                <Form.Item label="开票公司">
                  <Input
                    :value="applicantCompanyName || applicantCompany"
                    disabled
                    placeholder="根据归属组织自动获取"
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
                    placeholder="从费用中自动获取"
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
                        label: '手动记录',
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

                <Form.Item>
                  <Button
                    type="primary"
                    block
                    @click="handleOpenFeeDrawer"
                    :disabled="fixedHeaderId && fixedCurrencyId ? false : false"
                  >
                    从开票申请导入费用
                  </Button>
                </Form.Item>
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
                            filteredClientBanks.map((b) => ({
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
                            filteredOrgBanks.map((b) => ({
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
                    @click="handleAddGoodsRow"
                  >
                    <template #icon
                      ><IconifyIcon icon="ant-design:plus-outlined"
                    /></template>
                    添加商品明细
                  </Button>
                  <Button
                    size="small"
                    danger
                    @click="handleDeleteSelectedGoodsRows"
                    :disabled="selectedGoodsRows.length === 0"
                  >
                    <template #icon
                      ><IconifyIcon icon="ant-design:delete-outlined"
                    /></template>
                    删除选中行 ({{ selectedGoodsRows.length }})
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
                  :row-selection="{
                    selectedRowKeys: selectedGoodsRows,
                    onChange: (selectedRowKeys) => {
                      selectedGoodsRows.splice(
                        0,
                        selectedGoodsRows.length,
                        ...selectedRowKeys.map(String),
                      );
                    },
                    type: 'checkbox',
                  }"
                  :style="{
                    borderTop: 'none',
                    borderBottom: 'none',
                  }"
                >
                  <template #bodyCell="{ column, record, index }">
                    <template v-if="column.key === 'codeInvoiceId'">
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
  </Page>
</template>
