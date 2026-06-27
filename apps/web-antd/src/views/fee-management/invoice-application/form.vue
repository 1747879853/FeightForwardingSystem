<script lang="ts" setup>
import { InvoiceApplicationApi } from '#/api/Invoice/invoiceRequest';
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
  Drawer,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Space,
  Spin,
  Table,
} from 'ant-design-vue';
import { h } from 'vue';

import { ClientSelect, CurrencySelect } from '#/adapter/component';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getClientDetail } from '#/api/sea-export/client-admin';
import { getClientInvoiceInfoList } from '#/api/sea-export/clinet-invoice-admin';
import { getCodeInvoicePagedList } from '#/api/system/base-data/code-invoice-admin';
import { getExchangeRatePagedList } from '#/api/system/base-data/exchange-rate-admin';
import { getCurrencyDetail } from '#/api/system/base-data/currency-admin';
import { DatePicker, Select } from 'ant-design-vue';
import { $t } from '#/locales';

// 从命名空间中解构 API 函数
const { addAsync, detailAsync, editAsync, getOrderFeeGroupAsync } =
  InvoiceApplicationApi;

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

// 抽屉相关状态
const drawerVisible = ref(false);
const feeDrawerLoading = ref(false);
const selectedSettlementId = ref<string>(''); // 已选择的结算单位（固定）
const selectedCurrencyId = ref<number>(); // 已选择的币别（固定）
const selectedCurrencyCode = ref<string>(''); // 已选择的币别代码（用于显示）

// 抽屉筛选条件
const filterCommissionNum = ref<string>(''); // 委托编号筛选
const filterMblNum = ref<string>(''); // 主提单号筛选

// 费用明细弹窗相关状态
const feeDetailModalVisible = ref(false);
const feeDetailModalLoading = ref(false);
const selectedFeeDetails = ref<any[]>([]); // 已选择的费用明细数据

// 商品明细选中行
const selectedGoodsRows = ref<string[]>([]); // 选中的商品明细行ID

// 表单数据
const formData = ref<any>({
  settlementId: '',
  companyId: 0,
  currencyId: null, // 默认人民币
  invoiceType: InvoiceApplicationApi.InvoiceType.NormalElectric,
  require: '',
  remark: '',
  orgBankAccountId: '',
  clientInvoiceBankId: '',
  invoiceApplicationItems: [],
  invoiceApplicationGoodsDtls: [],
});

// 基础信息
const applicationDate = ref(dayjs().format('YYYY-MM-DD')); // 申请日期，自动生成
const applicantName = ref(''); // 申请人名称
const applicantCompany = ref<number>(0); // 申请人所在公司ID
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

// 费用明细表格数据
const feeGroupsData = ref<any[]>([]);

// 选中的费用行 keys
const selectedFeeRowKeys = ref<string[]>([]);

// 商品明细表格数据
const goodsDetails = ref<any[]>([]);

// 获取 VxeTable 引用
const feeGridRef = ref();

/** 获取子表格的选中 keys */
function getChildSelectedKeys(record: any): string[] {
  if (!record.children) return [];
  return selectedFeeRowKeys.value.filter((key) =>
    record.children.some((child: any) => child.id === key),
  );
}

/** 处理子表格选择变化 */
async function handleChildSelectionChange(
  record: any,
  selectedRowKeys: string[],
) {
  // 更新选中状态
  const currentSelected = selectedFeeRowKeys.value.filter(
    (key) =>
      !record.children ||
      !record.children.some((child: any) => child.id === key),
  );
  selectedFeeRowKeys.value = [...currentSelected, ...selectedRowKeys];

  // 根据选中的费用自动更新币别和汇率
  await updateCurrencyFromSelectedFees();
}

/** 从选中的费用中更新币别 */
async function updateCurrencyFromSelectedFees() {
  // 获取所有选中的费用（包括子节点）
  const allSelected = flattenTreeData(feeGroupsData.value);
  const selectedFees = allSelected.filter(
    (item: any) => item.orderFee && selectedFeeRowKeys.value.includes(item.id),
  );

  console.log('所有选中的费用:', selectedFees);

  if (selectedFees.length > 0) {
    // 取第一个选中费用的币别作为发票币别
    const firstFee = selectedFees[0];
    const currencyId = firstFee.orderFee?.currencyId;

    if (currencyId && currencyId !== selectedCurrencyId.value) {
      selectedCurrencyId.value = currencyId;

      // ✅ 同步更新表单中的发票币别（发票币别 = 费用币别）
      formData.value.currencyId = currencyId;

      // 加载默认汇率
      await loadDefaultExchangeRate(currencyId);

      // 根据币别更新销售方银行
      updateOrgBankByCurrency();

      console.log(
        '🔄 自动更新发票币别:',
        currencyId,
        '汇率:',
        invoiceExchangeRate.value,
      );
    }
  }
}

/** 加载默认汇率 */
async function loadDefaultExchangeRate(currencyId: number) {
  try {
    // 获取当前时间
    const now = dayjs();
    const currentDate = now.format('YYYY-MM-DD');

    console.log('加载默认汇率 - 币别ID:', currencyId, '当前日期:', currentDate);

    // 从汇率管理中查询符合条件的汇率
    const result = await getExchangeRatePagedList({
      CurrencyId: currencyId,
      PageIndex: 1,
      PageSize: 100, // 获取更多数据以便筛选
    });

    console.log('汇率查询结果:', result);

    if (result.items && result.items.length > 0) {
      // 查找符合当前时间的汇率记录
      const matchedRate = result.items.find((item: any) => {
        const startDate = item.startDate ? dayjs(item.startDate) : null;
        const endDate = item.endDate ? dayjs(item.endDate) : null;

        // 检查当前日期是否在有效期内
        const isStartDateValid =
          !startDate || now.isAfter(startDate) || now.isSame(startDate);
        const isEndDateValid =
          !endDate || now.isBefore(endDate) || now.isSame(endDate);

        return isStartDateValid && isEndDateValid;
      });

      if (matchedRate) {
        // 使用发票汇率（invoiceValue）作为默认值
        const defaultRate = matchedRate.invoiceValue ?? 1.0;
        invoiceExchangeRate.value = defaultRate;

        console.log('找到匹配的汇率记录:', matchedRate);
        console.log('设置默认汇率:', defaultRate);
      } else {
        // 如果没有找到符合时间的记录，使用第一条记录的发票汇率
        const firstRate = result.items[0];
        if (firstRate) {
          const defaultRate = firstRate.invoiceValue ?? 1.0;
          invoiceExchangeRate.value = defaultRate;

          console.warn(
            '未找到符合当前时间的汇率记录，使用第一条记录:',
            firstRate,
          );
          console.log('设置默认汇率:', defaultRate);
        } else {
          // 如果连第一条记录都没有，使用默认值1.0
          invoiceExchangeRate.value = 1.0;
          console.warn(`未找到币别 ${currencyId} 的汇率记录，使用默认值1.0`);
        }
      }
    } else {
      // 没有找到任何汇率记录，使用默认值1.0
      invoiceExchangeRate.value = 1.0;
      console.warn(`未找到币别 ${currencyId} 的汇率记录，使用默认值1.0`);
    }

    // 获取币别代码用于显示
    try {
      const currencyDetail = await getCurrencyDetail(currencyId);
      selectedCurrencyCode.value = currencyDetail.code || '';
      console.log('币别代码:', selectedCurrencyCode.value);
    } catch (error) {
      console.error('获取币别详情失败:', error);
      selectedCurrencyCode.value = '';
    }
  } catch (error) {
    console.error('加载默认汇率失败:', error);
    invoiceExchangeRate.value = 1.0;
  }
}

/** 将树状数据扁平化 */
function flattenTreeData(data: any[]): any[] {
  const result: any[] = [];

  function flatten(items: any[]) {
    items.forEach((item) => {
      result.push(item);
      if (item.children && item.children.length > 0) {
        flatten(item.children);
      }
    });
  }

  flatten(data);
  return result;
}

/** 从表格获取选中的费用 */
function getSelectedFeesFromTable(): any[] {
  // 过滤出子节点（费用明细）
  const allSelected = flattenTreeData(feeGroupsData.value);
  const selectedFees = allSelected.filter(
    (item: any) => item.orderFee && selectedFeeRowKeys.value.includes(item.id),
  );

  console.log('选中的费用:', selectedFees);
  console.log(
    '选中的费用详情:',
    selectedFees.map((fee) => ({
      id: fee.id,
      orderFeeId: fee.orderFee?.id,
      appliedAmount: fee.appliedAmount,
      remainingInvoiceAmount: fee.orderFee.remainingInvoiceAmount,
      currencyCode: fee.currencyCode,
    })),
  );

  return selectedFees;
}

function addSelectedFeesToForm(selectedFees: any[]) {
  // 将选中的费用转换为 InvoiceApplicationItemAddDto
  const items = selectedFees.map((fee: any) => ({
    orderFeeId: fee.orderFee.id,
    appliedAmount: fee.appliedAmount || fee.orderFee.remainingInvoiceAmount,
    remark: '',
  }));

  // 添加到 formData
  if (!formData.value.invoiceApplicationItems) {
    formData.value.invoiceApplicationItems = [];
  }

  formData.value.invoiceApplicationItems.push(...items);

  console.log('添加的费用明细:', items);
}

/** 提交表单 */
async function handleSubmit() {
  // 基本验证
  if (!formData.value.settlementId) {
    message.warning('请选择结算对象');
    return;
  }
  if (!formData.value.companyId) {
    message.warning('请选择所属公司');
    return;
  }

  submitLoading.value = true;
  try {
    if (isEdit.value) {
      await editAsync(
        formData.value as InvoiceApplicationApi.InvoiceApplicationEditDto,
      );
      message.success('修改成功');
    } else {
      // 新建需要按币别分组
      const batchData: InvoiceApplicationApi.InvoiceApplicationBatchAddDto = {
        settlementId: formData.value.settlementId!,
        companyId: formData.value.companyId!,
        require: formData.value.require,
        remark: formData.value.remark,
        currencyGroups: [
          {
            currencyId: formData.value.currencyId || 1,
            invoiceType: formData.value.invoiceType,
            invoiceApplicationItems:
              formData.value.invoiceApplicationItems || [],
            invoiceApplicationGoodsDtls:
              formData.value.invoiceApplicationGoodsDtls || [],
            orgBankAccountId: formData.value.orgBankAccountId,
            clientInvoiceBankId: formData.value.clientInvoiceBankId,
          },
        ],
      };

      await addAsync(batchData);
      message.success('创建成功');
    }

    // 返回列表并刷新
    router.push('/fee-management/invoice-application');
  } catch (error) {
    console.error('保存失败:', error);
    message.error('保存失败');
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

/** 商品明细 - 税率变化 */
function handleTaxRateChange(record: any) {
  handleQuantityOrPriceChange(record);
}

/** 添加商品明细行 */
function handleAddGoodsRow() {
  // ✅ 检查是否已经从抽屉中添加了费用
  const items = formData.value.invoiceApplicationItems || [];

  if (items.length === 0) {
    message.warning('请先从抽屉中添加费用，然后再添加商品明细');
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

/** 重置筛选条件 */
function handleResetFilter() {
  selectedSettlementId.value = '';
  selectedCurrencyId.value = undefined;
  filterCommissionNum.value = ''; // 清空委托编号
  filterMblNum.value = ''; // 清空主提单号
  selectedFeeRowKeys.value = []; // 清空选中状态
  loadFeeGroupData();
}

// // 监听结算单位变化，自动触发查询
// watch(selectedSettlementId, (newValue) => {
//   console.log('🔍 结算单位变化:', newValue);
//   if (drawerVisible.value && newValue) {
//     loadFeeGroupData();
//   }
// });

// // 监听币别变化，自动触发查询并更新表单币别
// watch(selectedCurrencyId, (newValue) => {
//   console.log('🔍 币别变化:', newValue);

//   if (newValue !== undefined) {
//     // ✅ 同步更新表单中的发票币别（用户可以手动修改）
//     formData.value.currencyId = newValue;

//     // 重新根据币别选择银行
//     updateClientBankByCurrency();

//     // 如果在抽屉打开状态下，自动触发查询
//     if (drawerVisible.value) {
//       loadFeeGroupData();
//     }
//   }
// });

/** 打开费用选择抽屉 */
function handleOpenFeeDrawer() {
  // ✅ 如果已经选择了结算单位和币别（即已经有费用），则保持固定不变
  if (!formData.value.settlementId) {
    // 首次添加费用，清空之前的选择
    selectedSettlementId.value = '';
    selectedCurrencyId.value = undefined;
    selectedFeeRowKeys.value = [];
  } else {
    // ✅ 已有费用，固定结算单位和币别
    selectedSettlementId.value = formData.value.settlementId;
    selectedCurrencyId.value = formData.value.currencyId;
    console.log(
      '🔒 已固定筛选条件 - 结算单位:',
      selectedSettlementId.value,
      '币别:',
      selectedCurrencyId.value,
    );
  }

  drawerVisible.value = true;
  nextTick(() => {
    loadFeeGroupData();
  });
}

/** 打开费用明细弹窗 */
function handleOpenFeeDetailModal() {
  // 从 formData 中获取已选择的费用明细
  const items = formData.value.invoiceApplicationItems || [];

  if (items.length === 0) {
    message.warning('暂无费用明细数据');
    return;
  }

  feeDetailModalLoading.value = true;

  try {
    // 根据 orderFeeId 从 feeGroupsData 中查找对应的完整信息
    const allFees = flattenTreeData(feeGroupsData.value);

    // 构建已选择费用的树状结构
    const selectedDetails: any[] = [];
    const processedOrders = new Set<string>();

    items.forEach((item: any) => {
      const fee = allFees.find((f: any) => f.orderFee?.id === item.orderFeeId);

      if (fee) {
        const orderId = fee.parentId;

        // 如果这个订单还没有处理过，创建父节点
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
              bizType: parentFee.seaExport?.bizType || '-',
              carrier: parentFee.seaExport?.carrier || '-',
              company: parentFee.transportOrder.company || '-',
              children: [] as any[],
            };

            selectedDetails.push(parentNode);
            processedOrders.add(orderId);
          }
        }

        // 添加子节点（费用明细）
        const parentNode = selectedDetails.find((p: any) => p.id === orderId);
        if (parentNode) {
          parentNode.children.push({
            id: fee.id,
            parentId: orderId,
            orderFee: fee.orderFee,
            appliedAmount: item.appliedAmount,
            settlementUnit: fee.orderFee.settlementUnitName || '-',
            payReceiveType:
              fee.orderFee.payReceiveType === 'AR' ? '应收' : '应付',
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

    console.log('费用明细弹窗数据:', selectedFeeDetails.value);
  } catch (error) {
    console.error('加载费用明细失败:', error);
    message.error('加载费用明细失败');
  } finally {
    feeDetailModalLoading.value = false;
  }
}

/** 保存费用选择 */
async function handleSaveFeeSelection() {
  const selectedFees = getSelectedFeesFromTable();

  if (selectedFees.length === 0) {
    message.warning('请至少选择一个费用');
    return;
  }

  // 从第一个费用中获取结算单位ID
  const firstFee = selectedFees[0];
  const settlementId = firstFee.orderFee?.settlementId;

  if (!settlementId) {
    message.warning('无法获取结算单位信息');
    return;
  }

  // 设置结算单位
  formData.value.settlementId = settlementId;

  // ✅ 自动设置所属公司为当前登录用户的公司
  if (applicantCompany.value) {
    formData.value.companyId = applicantCompany.value;
    console.log('✅ 自动设置所属公司:', formData.value.companyId);
  } else {
    // 如果用户信息中没有公司，尝试从费用中获取
    const firstFee = selectedFees[0];
    if (firstFee.transportOrder?.companyId) {
      formData.value.companyId = firstFee.transportOrder.companyId;
      console.log('⚠️ 从费用中获取所属公司:', formData.value.companyId);
    }
  }

  // 加载客户开票信息
  await loadClientInvoiceInfo(settlementId);

  // 判断是否是首次添加费用（商品明细为空时才自动填充）
  const isFirstTimeAdd = goodsDetails.value.length === 0;

  addSelectedFeesToForm(selectedFees);

  // ✅ 根据商品明细数量决定处理方式
  if (isFirstTimeAdd) {
    // 首次添加：自动填充商品明细
    await autoFillGoodsDetails(selectedFees);
  } else if (goodsDetails.value.length === 1) {
    // ✅ 只有一行商品明细：将新费用金额合并到该行
    await mergeAmountToExistingGoods(selectedFees);
  } else {
    // ✅ 多行商品明细：新增一条商品明细（同首次添加规则）
    await autoFillGoodsDetails(selectedFees);
  }

  drawerVisible.value = false;
}

/** 手动重新填充商品明细 */
async function handleRefillGoodsDetails() {
  // 从 formData 中获取当前的费用明细
  const items = formData.value.invoiceApplicationItems || [];

  if (items.length === 0) {
    message.warning('暂无费用明细，请先添加费用');
    return;
  }

  try {
    // 根据 orderFeeId 从 feeGroupsData 中查找对应的完整信息
    const allFees = flattenTreeData(feeGroupsData.value);

    // 构建当前选中的费用列表
    const currentFees: any[] = [];
    items.forEach((item: any) => {
      const fee = allFees.find((f: any) => f.orderFee?.id === item.orderFeeId);
      if (fee) {
        currentFees.push(fee);
      }
    });

    if (currentFees.length === 0) {
      message.warning('未找到匹配的费用数据');
      return;
    }

    // 确认是否覆盖现有商品明细
    Modal.confirm({
      title: '确认重新填充',
      content: `将根据当前 ${currentFees.length} 个费用重新计算并填充商品明细，这将覆盖现有的商品明细数据。是否继续？`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        await autoFillGoodsDetails(currentFees);
      },
    });
  } catch (error) {
    console.error('重新填充商品明细失败:', error);
    message.error('重新填充商品明细失败');
  }
}

/** 将新费用金额合并到现有商品明细 */
async function mergeAmountToExistingGoods(selectedFees: any[]) {
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

  // 获取当前发票币别（等于费用币别）
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

  // ✅ 根据发票币别（费用币别）查找默认的发票商品编码
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

  // 计算所有选中费用的总金额（使用本次申请金额，并转换为人民币）
  let totalRmbAmount = 0; // 人民币总金额

  selectedFees.forEach((fee: any) => {
    // 使用用户填写的本次申请金额（保持原币别）
    const appliedAmount = fee.appliedAmount || 0;
    const feeCurrencyId = fee.orderFee.currencyId;
    const feeCurrencyCode = fee.orderFee.currencyCode || '未知';

    // ✅ 如果费用币别与人民币不同，需要进行汇率转换
    if (feeCurrencyId !== 1) {
      // 外币转人民币：本次申请金额 × 汇率
      const convertedAmount = appliedAmount * (invoiceExchangeRate.value || 1);
      totalRmbAmount += convertedAmount;
      console.log(
        `💰 外币转换 - ${feeCurrencyCode}: ${appliedAmount.toFixed(2)} × ${invoiceExchangeRate.value} = ${convertedAmount.toFixed(2)} RMB`,
      );
    } else {
      // 币别是人民币，直接累加
      totalRmbAmount += appliedAmount;
      console.log(
        `💰 同币别累加 - ${feeCurrencyCode}: ${appliedAmount.toFixed(2)}`,
      );
    }
  });

  console.log(
    '📊 新费用总金额（人民币）:',
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
  console.log('📦 商品明细总数:', goodsDetails.value.length);

  message.success(
    `已将新费用金额合并到商品明细（+${totalRmbAmount.toFixed(2)}）`,
  );
}

/** 自动填充商品明细 */
async function autoFillGoodsDetails(selectedFees: any[]) {
  // 重置商品明细
  goodsDetails.value = [];

  // 确保发票商品编码列表已加载
  if (codeInvoiceList.value.length === 0) {
    console.warn('发票商品编码列表为空，尝试重新加载...');
    await loadCodeInvoiceList();
  }

  // 获取当前发票币别（等于费用币别）
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

  // ✅ 根据发票币别（费用币别）查找默认的发票商品编码
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

  // 计算所有选中费用的总金额（使用本次申请金额，并转换为人民币）
  let totalRmbAmount = 0; // 人民币总金额

  selectedFees.forEach((fee: any) => {
    // 使用用户填写的本次申请金额（保持原币别）
    const appliedAmount = fee.appliedAmount || 0;
    const feeCurrencyId = fee.orderFee.currencyId;
    const feeCurrencyCode = fee.orderFee.currencyCode || '未知';

    // ✅ 如果费用币别与人民币不同，需要进行汇率转换
    if (feeCurrencyId !== 1) {
      // 外币转人民币：本次申请金额 × 汇率
      const convertedAmount = appliedAmount * (invoiceExchangeRate.value || 1);
      totalRmbAmount += convertedAmount;
      console.log(
        `💰 外币转换 - ${feeCurrencyCode}: ${appliedAmount.toFixed(2)} × ${invoiceExchangeRate.value} = ${convertedAmount.toFixed(2)} RMB`,
      );
    } else {
      // 币别是人民币，直接累加
      totalRmbAmount += appliedAmount;
      console.log(
        `💰 同币别累加 - ${feeCurrencyCode}: ${appliedAmount.toFixed(2)}`,
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

/** 加载费用分组数据 */
async function loadFeeGroupData() {
  console.log('🔍 开始加载费用数据');
  console.log('  - selectedSettlementId:', selectedSettlementId.value);
  console.log('  - selectedCurrencyId:', selectedCurrencyId.value);
  console.log('  - filterCommissionNum:', filterCommissionNum.value);
  console.log('  - filterMblNum:', filterMblNum.value);

  feeDrawerLoading.value = true;
  try {
    const params: any = {
      pageIndex: 1,
      pageSize: 1000,
    };

    // 如果已经选择了结算单位和币别，则固定筛选条件
    if (selectedSettlementId.value) {
      params.settlementId = selectedSettlementId.value;
    }
    if (selectedCurrencyId.value !== undefined) {
      params.currencyId = selectedCurrencyId.value;
    }

    // 添加委托编号和主提单号筛选条件
    if (filterCommissionNum.value) {
      params.commissionNum = filterCommissionNum.value;
    }
    if (filterMblNum.value) {
      params.mblNum = filterMblNum.value;
    }

    // 如果有结算单位，传入invoiceApplicationId排除已关联的费用
    if (formData.value.settlementId) {
      params.invoiceApplicationId = editId.value;
    }

    console.log('📤 查询费用参数:', JSON.stringify(params, null, 2));

    const result = await getOrderFeeGroupAsync(params);

    // 转换数据为树状结构
    const treeData = transformToTreeData(result.items || []);
    feeGroupsData.value = treeData;

    console.log('✅ 费用数据加载完成，共', treeData.length, '条');
  } catch (error) {
    console.error('❌ 加载费用数据失败:', error);
    message.error('加载费用数据失败');
  } finally {
    feeDrawerLoading.value = false;
  }
}

/** 获取已添加的费用ID列表 */
function getAddedFeeIds(): Set<string> {
  const items = formData.value.invoiceApplicationItems || [];
  return new Set(items.map((item: any) => String(item.orderFeeId)));
}

/** 将费用数据转换为树状结构 */
function transformToTreeData(
  items: InvoiceApplicationApi.InvoiceApplicationFeeGroupOutputDto[],
): any[] {
  const treeData: any[] = [];
  const addedFeeIds = getAddedFeeIds(); // 获取已添加的费用ID

  items.forEach((item, index) => {
    // 父节点（运输订单）
    const parentNode: any = {
      id: `parent_${item.transportOrder.id}`,
      parentId: null,
      transportOrder: item.transportOrder,
      seaExport: item.seaExport,
      orderFees: item.orderFees,
      // 一级列字段
      commissionNum: item.transportOrder.commissionNum,
      mblNum: item.transportOrder.mblNum || '-',
      bookingNum: item.transportOrder.bookingNum || '-',
      clientName: item.transportOrder.clientName,
      bizType: item.seaExport?.bizType || '-',
      carrier: item.seaExport?.carrier || '-',
      company: item.transportOrder.company || '-',
      checked: false,
      children: [] as any[],
    };

    // 子节点（费用明细）- ✅ 所有费用都显示，包括已添加的
    if (item.orderFees && item.orderFees.length > 0) {
      item.orderFees.forEach((fee, feeIndex) => {
        const isAlreadyAdded = addedFeeIds.has(String(fee.id));

        const childNode: any = {
          id: `child_${fee.id}`,
          parentId: `parent_${item.transportOrder.id}`,
          orderFee: fee,
          appliedAmount: fee.remainingInvoiceAmount, // 默认值为未开票金额
          checked: false,
          disabled: isAlreadyAdded, // ✅ 标记为禁用状态（用于row-selection）
          alreadyAdded: isAlreadyAdded, // ✅ 添加标记用于显示提示
          // 二级列字段
          settlementUnit: fee.settlementUnitName || '-',
          payReceiveType: fee.payReceiveType === 'AR' ? '应收' : '应付',
          feeName: fee.feeCodeName || '-',
          amount: fee.amount,
          currencyCode: fee.currencyCode || '-',
          remainingInvoiceAmount: fee.remainingInvoiceAmount,
        };

        // ✅ 所有费用都加入列表（包括已添加的）
        parentNode.children.push(childNode);
      });
    }

    treeData.push(parentNode);
  });

  return treeData;
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
  if (!orgBankAccounts.value.length || !formData.value.currencyId) return;

  const currencyId = formData.value.currencyId;

  // 先查找默认的银行
  const defaultBank = orgBankAccounts.value.find(
    (b) => b.currencyId === currencyId && b.default,
  );

  if (defaultBank) {
    formData.value.orgBankAccountId = defaultBank.id;
    console.log(
      '✅ 自动选择销售方默认银行:',
      defaultBank.bankName,
      defaultBank.bankAccount,
    );
  } else {
    // 如果没有默认银行，清空选择
    formData.value.orgBankAccountId = undefined;
    console.log('⚠️ 未找到销售方默认银行');
  }
}

/** 初始化申请人信息 */
function initApplicantInfo() {
  const userInfo = userStore.userInfo;
  console.log('当前登录用户信息:', userInfo);

  if (userInfo) {
    // 设置申请人名称
    applicantName.value = userInfo.realName || userInfo.username || '';

    // 从用户信息中获取公司ID（如果存在）
    // 注意：userInfo 可能包含扩展字段，如 companyId
    if ((userInfo as any).companyId) {
      applicantCompany.value = (userInfo as any).companyId;
      applicantCompanyName.value = (userInfo as any).companyName || '';
      applicantTaxNumber.value =
        (userInfo as any).company.unifiedSocialCreditCode || '';
      applicantAddress.value =
        `${(userInfo as any).company.invoiceAddress || ''} ${(userInfo as any).company.invoiceTel || ''}` ||
        '';
      console.log('✅ 从用户信息中获取公司ID:', applicantCompany.value);
    } else {
      console.warn('⚠️ 用户信息中未找到公司ID');
    }

    // 从用户信息中获取银行账号列表
    if (
      (userInfo as any).company.orgBankAccounts &&
      Array.isArray((userInfo as any).company.orgBankAccounts)
    ) {
      orgBankAccounts.value = (userInfo as any).company.orgBankAccounts;
      console.log(
        '✅ 从用户信息中获取银行账号列表:',
        orgBankAccounts.value.length,
        '条',
      );
    } else {
      console.warn('⚠️ 用户信息中未找到银行账号列表');
    }

    console.log('👤 申请人信息:', {
      name: applicantName.value,
      companyId: applicantCompany.value,
      companyName: applicantCompanyName.value,
      bankAccountsCount: orgBankAccounts.value.length,
    });
  }
}
const updateSelectedSettlementId = (settlementId: string) => {
  selectedSettlementId.value = settlementId;
  console.log('🔄 更新结算单位ID:', settlementId);
};

const updateSelectedCurrencyId = (currencyId: number) => {
  selectedCurrencyId.value = currencyId;
  console.log('🔄 更新币别ID:', currencyId);
};

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

// 发票类型选项
const invoiceTypeOptions = [
  {
    label: '普通发票(电票)',
    value: InvoiceApplicationApi.InvoiceType.NormalElectric,
  },
  {
    label: '普通发票(纸票)',
    value: InvoiceApplicationApi.InvoiceType.NormalPaper,
  },
  { label: '专用发票', value: InvoiceApplicationApi.InvoiceType.Special },
];

// 税率选项
const taxRateOptions = [
  { label: '免税', value: 0 },
  { label: '6%', value: 6 },
  { label: '9%', value: 9 },
  { label: '13%', value: 13 },
];

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

/** 计算申请总金额（原币金额，从费用明细中获取） */
const totalAppliedAmountOriginal = computed(() => {
  const items = formData.value.invoiceApplicationItems || [];
  return items.reduce(
    (sum: number, item: any) => sum + (item.appliedAmount || 0),
    0,
  );
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

// 费用表格列定义（一级 - 运输订单）
const feeParentColumns = computed(() => [
  {
    title: '委托编号',
    dataIndex: 'commissionNum',
    key: 'commissionNum',
    minWidth: 140,
    ellipsis: true,
  },
  {
    title: '主提单号',
    dataIndex: 'mblNum',
    key: 'mblNum',
    minWidth: 140,
    ellipsis: true,
  },
  {
    title: '订舱编号',
    dataIndex: 'bookingNum',
    key: 'bookingNum',
    minWidth: 140,
    ellipsis: true,
  },
  {
    title: '结算单位',
    dataIndex: 'clientName',
    key: 'clientName',
    minWidth: 180,
    ellipsis: true,
  },
  {
    title: '业务类型',
    dataIndex: 'bizType',
    key: 'bizType',
    minWidth: 100,
  },
  {
    title: '船公司',
    dataIndex: 'carrier',
    key: 'carrier',
    minWidth: 120,
    ellipsis: true,
  },
  {
    title: '所属公司',
    dataIndex: 'company',
    key: 'company',
    minWidth: 150,
    ellipsis: true,
  },
]);

// 费用表格列定义（二级 - 费用明细）
const feeChildColumns = computed(() => [
  {
    title: '状态',
    dataIndex: 'alreadyAdded',
    key: 'alreadyAdded',
    minWidth: 100,
    align: 'center' as const,
  },
  {
    title: '结算单位',
    dataIndex: 'settlementUnit',
    key: 'settlementUnit',
    minWidth: 180,
    ellipsis: true,
  },
  {
    title: '收付类型',
    dataIndex: 'payReceiveType',
    key: 'payReceiveType',
    minWidth: 80,
    align: 'center' as const,
  },
  {
    title: '费用名称',
    dataIndex: 'feeName',
    key: 'feeName',
    minWidth: 200,
    ellipsis: true,
  },
  {
    title: '金额',
    dataIndex: 'amount',
    key: 'amount',
    minWidth: 120,
    align: 'right' as const,
  },
  {
    title: '币别',
    dataIndex: 'currencyCode',
    key: 'currencyCode',
    minWidth: 80,
    align: 'center' as const,
  },
  {
    title: '未开票金额',
    dataIndex: 'remainingInvoiceAmount',
    key: 'remainingInvoiceAmount',
    minWidth: 120,
    align: 'right' as const,
  },
  {
    title: '本次申请金额',
    dataIndex: 'appliedAmount',
    key: 'appliedAmount',
    minWidth: 180,
    align: 'right' as const,
  },
]);

// 费用明细弹窗表格列定义（一级 - 运输订单）
const feeDetailParentColumns = computed(() => [
  {
    title: '委托编号',
    dataIndex: 'commissionNum',
    key: 'commissionNum',
    minWidth: 140,
    ellipsis: true,
  },
  {
    title: '主提单号',
    dataIndex: 'mblNum',
    key: 'mblNum',
    minWidth: 140,
    ellipsis: true,
  },
  {
    title: '订舱编号',
    dataIndex: 'bookingNum',
    key: 'bookingNum',
    minWidth: 140,
    ellipsis: true,
  },
  {
    title: '结算单位',
    dataIndex: 'clientName',
    key: 'clientName',
    minWidth: 180,
    ellipsis: true,
  },
  {
    title: '业务类型',
    dataIndex: 'bizType',
    key: 'bizType',
    minWidth: 100,
  },
  {
    title: '船公司',
    dataIndex: 'carrier',
    key: 'carrier',
    minWidth: 120,
    ellipsis: true,
  },
  {
    title: '所属公司',
    dataIndex: 'company',
    key: 'company',
    minWidth: 150,
    ellipsis: true,
  },
]);

// 费用明细弹窗表格列定义（二级 - 费用明细）
const feeDetailChildColumns = computed(() => [
  {
    title: '结算单位',
    dataIndex: 'settlementUnit',
    key: 'settlementUnit',
    minWidth: 180,
    ellipsis: true,
  },
  {
    title: '收付类型',
    dataIndex: 'payReceiveType',
    key: 'payReceiveType',
    minWidth: 80,
    align: 'center' as const,
  },
  {
    title: '费用名称',
    dataIndex: 'feeName',
    key: 'feeName',
    minWidth: 200,
    ellipsis: true,
  },
  {
    title: '金额',
    dataIndex: 'amount',
    key: 'amount',
    minWidth: 120,
    align: 'right' as const,
  },
  {
    title: '币别',
    dataIndex: 'currencyCode',
    key: 'currencyCode',
    minWidth: 80,
    align: 'center' as const,
  },
  {
    title: '未开票金额',
    dataIndex: 'remainingInvoiceAmount',
    key: 'remainingInvoiceAmount',
    minWidth: 120,
    align: 'right' as const,
  },
  {
    title: '本次开票金额',
    dataIndex: 'appliedAmount',
    key: 'appliedAmount',
    minWidth: 180,
    align: 'right' as const,
  },
]);

/** 加载详情数据 */
async function loadDetail() {
  if (!editId.value) return;

  loading.value = true;
  try {
    const detail = await detailAsync(editId.value);

    // 检查状态，只有录入或驳回状态可以编辑
    if (
      detail.status !==
        InvoiceApplicationApi.InvoiceApplicationStatus.Entering &&
      detail.status !== InvoiceApplicationApi.InvoiceApplicationStatus.Rejected
    ) {
      message.error('当前状态的申请不可编辑');
      router.back();
      return;
    }

    formData.value = {
      id: detail.id,
      settlementId: detail.settlementId,
      companyId: detail.companyId,
      currencyId: detail.currencyId || 1, // ✅ 使用详情中的币别
      invoiceType:
        detail.invoiceType || InvoiceApplicationApi.InvoiceType.NormalElectric,
      require: detail.require,
      remark: detail.remark,
      orgBankAccountId: detail.orgBankAccountId,
      clientInvoiceBankId: detail.clientInvoiceBankId,
      invoiceApplicationItems: [], // TODO: 从 detail.feeGroups 中提取
      invoiceApplicationGoodsDtls: detail.invoiceApplicationGoodsDtls || [],
    };

    // 设置申请人和申请日期（使用创建信息）
    applicantName.value = detail.creatorUserName || '';
    applicationDate.value = detail.applyTime
      ? dayjs(detail.applyTime).format('YYYY-MM-DD')
      : dayjs().format('YYYY-MM-DD');

    // 加载客户开票信息
    await loadClientInvoiceInfo(detail.settlementId);

    // ✅ 设置固定的筛选条件（用于抽屉）
    selectedSettlementId.value = detail.settlementId;
    selectedCurrencyId.value = detail.currencyId || 1;

    // 设置汇率
    invoiceExchangeRate.value = detail.invoiceExchangeRate || 1.0;

    // ✅ 根据币别更新销售方银行
    updateOrgBankByCurrency();

    // ✅ 加载商品明细数据，并为每行添加唯一ID
    if (
      detail.invoiceApplicationGoodsDtls &&
      detail.invoiceApplicationGoodsDtls.length > 0
    ) {
      goodsDetails.value = detail.invoiceApplicationGoodsDtls.map(
        (item: any, index: number) => ({
          ...item,
          id: item.id || Date.now().toString() + index.toString(), // 如果已有ID则使用，否则生成新ID
        }),
      );
      console.log('✅ 加载商品明细:', goodsDetails.value.length, '条');
    }
  } catch (error) {
    console.error('加载详情失败:', error);
    message.error('加载详情失败');
  } finally {
    loading.value = false;
  }
}
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

    <Card :title="isEdit ? '编辑发票申请' : '新建发票申请'">
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
                <Form.Item label="所属公司" required>
                  <Input
                    :value="applicantCompanyName || applicantCompany"
                    disabled
                    placeholder="从当前登录用户自动获取"
                  />
                </Form.Item>

                <Form.Item label="发票申请人">
                  <Input :value="applicantName" disabled />
                </Form.Item>

                <Form.Item label="发票申请日期">
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
                    placeholder="请输入汇率"
                  />
                </Form.Item>

                <Form.Item label="客户开票要求">
                  <Input.TextArea
                    v-model:value="formData.require"
                    placeholder="请输入客户的特殊开票要求..."
                    :rows="3"
                  />
                </Form.Item>

                <Form.Item>
                  <Button type="primary" block @click="handleOpenFeeDrawer">
                    从发票申请导入费用
                  </Button>
                </Form.Item>

                <Form.Item>
                  <Button block @click="handleOpenFeeDetailModal">
                    查看费用明细
                  </Button>
                </Form.Item>

                <Form.Item v-if="goodsDetails.length > 0">
                  <Button
                    type="dashed"
                    block
                    @click="handleRefillGoodsDetails"
                    :disabled="!formData.currencyId"
                  >
                    🔄 根据当前费用重新填充商品明细
                  </Button>
                </Form.Item>
              </Form>
            </Card>

            <!-- <Card size="small" style="margin-top: 16px;" title="发票推送">
            <Form layout="vertical">
              <Form.Item label="推送邮件">
                <Input value="wanghl@zhongjin.com" disabled>
                  <template #suffix>
                    <Button size="small">同事</Button>
                  </template>
                </Input>
              </Form.Item>
            </Form>
          </Card> -->
          </div>

          <!-- 右侧发票区域 -->
          <div style="flex: 1; min-width: 0">
            <Card>
              <template #title>
                <Space>
                  <span style="font-size: 24px; color: #c41e3a"
                    >增值税电子普通发票</span
                  >
                  <Select
                    v-model:value="formData.invoiceType"
                    :options="invoiceTypeOptions"
                    style="width: 200px"
                  />
                </Space>
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
                    padding: 12px;
                    border: 1px solid #d9d9d9;
                    border-radius: 4px;
                  "
                >
                  <div
                    style="
                      margin-bottom: 8px;
                      font-size: 14px;
                      font-weight: bold;
                      color: #c41e3a;
                    "
                  >
                    购买方信息
                  </div>
                  <div style="font-size: 13px">
                    <div
                      style="display: flex; align-items: center; height: 28px"
                    >
                      <span style="min-width: 80px; color: #666"
                        ><strong>名 称:</strong></span
                      >
                      <Select
                        :value="selectedClientInvoiceInfo?.id"
                        :options="clientInvoiceHeaderOptions"
                        style="flex: 1"
                        size="small"
                        placeholder="请选择发票抬头"
                        @change="handleClientInvoiceHeaderChange"
                      />
                    </div>
                    <div
                      style="display: flex; align-items: center; height: 28px"
                    >
                      <span style="min-width: 80px; color: #666"
                        ><strong>纳税人识别号:</strong></span
                      >
                      <span style="flex: 1">{{
                        selectedClientInvoiceInfo?.taxNum || '(选填)'
                      }}</span>
                    </div>
                    <div
                      style="display: flex; align-items: center; height: 28px"
                    >
                      <span style="min-width: 80px; color: #666"
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
                      <span style="min-width: 80px; color: #666"
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

                <div
                  style="
                    flex: 1;
                    padding: 12px;
                    border: 1px solid #d9d9d9;
                    border-radius: 4px;
                  "
                >
                  <div
                    style="
                      margin-bottom: 8px;
                      font-size: 14px;
                      font-weight: bold;
                      color: #c41e3a;
                    "
                  >
                    销售方信息
                  </div>
                  <div style="font-size: 13px">
                    <div
                      style="display: flex; align-items: center; height: 28px"
                    >
                      <span style="min-width: 80px; color: #666"
                        ><strong>名 称:</strong></span
                      >
                      <span style="flex: 1">{{
                        applicantCompanyName || '-'
                      }}</span>
                    </div>
                    <div
                      style="display: flex; align-items: center; height: 28px"
                    >
                      <span style="min-width: 80px; color: #666"
                        ><strong>纳税人识别号:</strong></span
                      >
                      <span style="flex: 1">{{
                        applicantTaxNumber || '-'
                      }}</span>
                    </div>
                    <div
                      style="display: flex; align-items: center; height: 28px"
                    >
                      <span style="min-width: 80px; color: #666"
                        ><strong>地址、电话:</strong></span
                      >
                      <span style="flex: 1">{{ applicantAddress || '-' }}</span>
                    </div>
                    <div
                      style="display: flex; align-items: center; height: 28px"
                    >
                      <span style="min-width: 80px; color: #666"
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

              <!-- 商品明细表格 -->
              <div style="margin-top: 16px">
                <div style="margin-bottom: 8px">
                  <Button
                    size="small"
                    @click="handleAddGoodsRow"
                    :disabled="
                      (formData.invoiceApplicationItems || []).length === 0
                    "
                  >
                    <template #icon>➕</template>
                    添加商品明细
                  </Button>
                  <Button
                    size="small"
                    danger
                    style="margin-left: 8px"
                    @click="handleDeleteSelectedGoodsRows"
                    :disabled="selectedGoodsRows.length === 0"
                  >
                    <template #icon>❌</template>
                    删除选中
                  </Button>
                </div>

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
                        @change="() => handleTaxRateChange(record)"
                      />
                    </template>
                    <template v-else-if="column.key === 'taxAmount'">
                      {{ record.taxAmount?.toFixed(2) || '0.00' }}
                    </template>
                  </template>
                </Table>

                <!-- 合计行 -->
                <div
                  style="
                    padding: 8px;
                    margin-top: 8px;
                    background: #fafafa;
                    border: 1px solid #d9d9d9;
                  "
                >
                  <Space :size="16">
                    <span><strong>合计</strong></span>
                    <span>发票金额: {{ totalInvoiceAmount.toFixed(2) }}</span>
                    <span>税额: {{ totalTaxAmount.toFixed(2) }}</span>
                    <span>申请金额: {{ totalAppliedAmount.toFixed(2) }}</span>
                    <span
                      v-if="foreignCurrencyAmount !== null"
                      style="color: #1890ff"
                    >
                      申请币别金额({{ selectedCurrencyCode }}):
                      {{ foreignCurrencyAmount.toFixed(2) }}
                    </span>
                  </Space>
                  <div
                    v-if="hasAmountDifference"
                    style="margin-top: 8px; font-weight: bold; color: #ff4d4f"
                  >
                    ⚠️ 发票金额与申请金额有差异请核对!
                  </div>
                </div>
              </div>

              <!-- 备注信息 -->
              <div style="margin-top: 16px">
                <Form layout="vertical" size="small">
                  <Form.Item label="备注信息">
                    <Input.TextArea
                      v-model:value="formData.remark"
                      placeholder="请输入备注"
                      :rows="2"
                    />
                  </Form.Item>
                </Form>
              </div>
            </Card>
          </div>
        </div>
      </Spin>
    </Card>

    <!-- 费用选择抽屉 -->
    <Drawer
      v-model:open="drawerVisible"
      title="选择剩余未开票费用"
      width="1000"
      :footer-style="{ textAlign: 'right' }"
    >
      <Spin :spinning="feeDrawerLoading">
        <!-- 筛选条件 -->
        <div
          style="
            padding: 10px 5px;
            margin-bottom: 16px;
            background: #fafafa;
            border: 1px solid #d9d9d9;
            border-radius: 4px;
          "
        >
          <div
            style="
              display: flex;
              flex-wrap: wrap;
              gap: 12px;
              align-items: center;
            "
          >
            <div
              style="display: flex; gap: 8px; align-items: center; width: 305px"
            >
              <span style="min-width: 70px; font-size: 14px; color: #333"
                >委托编号:</span
              >
              <Input
                v-model:value="filterCommissionNum"
                placeholder="请输入委托编号"
                style="flex: 1"
                allow-clear
              />
            </div>
            <div
              style="display: flex; gap: 8px; align-items: center; width: 305px"
            >
              <span style="min-width: 70px; font-size: 14px; color: #333"
                >主提单号:</span
              >
              <Input
                v-model:value="filterMblNum"
                placeholder="请输入主提单号"
                style="flex: 1"
                allow-clear
              />
            </div>
            <div
              style="display: flex; gap: 8px; align-items: center; width: 305px"
            >
              <span style="min-width: 70px; font-size: 14px; color: #333"
                >结算单位:</span
              >
              <ClientSelect
                :model-value="selectedSettlementId"
                placeholder="请选择结算单位"
                style="flex: 1"
                :disabled="!!formData.settlementId"
                @update:model-value="
                  (v) => updateSelectedSettlementId(v as string)
                "
              />
            </div>
            <div
              style="display: flex; gap: 8px; align-items: center; width: 305px"
            >
              <span style="min-width: 70px; font-size: 14px; color: #333"
                >币别:</span
              >
              <CurrencySelect
                :model-value="selectedCurrencyId"
                placeholder="请选择币别"
                style="flex: 1"
                :disabled="!!formData.currencyId && formData.settlementId"
                @update:model-value="
                  (v) => updateSelectedCurrencyId(v as number)
                "
              />
            </div>
            <div style="display: flex; flex: 1; justify-content: flex-end">
              <Button type="primary" @click="loadFeeGroupData">查询</Button>
            </div>
          </div>
        </div>

        <!-- 费用表格 - 使用 Ant Design Vue Table 实现树状表格 -->
        <div style="border: 1px solid #d9d9d9; border-radius: 4px">
          <Table
            :columns="feeParentColumns"
            :data-source="feeGroupsData"
            :pagination="false"
            bordered
            size="small"
            :expandable="{
              defaultExpandAllRows: true,
              childrenColumnName: 'children',
            }"
            row-key="id"
            :scroll="{ y: 500 }"
          >
            <template #expandedRowRender="{ record }">
              <Table
                v-if="record.children && record.children.length > 0"
                :columns="feeChildColumns"
                :data-source="record.children"
                :pagination="false"
                bordered
                size="small"
                row-key="id"
                :row-selection="{
                  type: 'checkbox',
                  selectedRowKeys: getChildSelectedKeys(record),
                  getCheckboxProps: (childRecord) => ({
                    disabled: childRecord.disabled || childRecord.alreadyAdded,
                  }),
                  onChange: (selectedRowKeys) =>
                    handleChildSelectionChange(
                      record,
                      selectedRowKeys.map((key) => String(key)),
                    ),
                }"
              >
                <template #bodyCell="{ column, record: childRecord }">
                  <template v-if="column.key === 'alreadyAdded'">
                    <!-- 已添加的费用显示提示 -->
                    <span
                      v-if="childRecord.alreadyAdded"
                      style="font-size: 12px; color: #999"
                    >
                      ✓ 已添加
                    </span>
                  </template>
                  <template v-else-if="column.key === 'appliedAmount'">
                    <InputNumber
                      v-model:value="childRecord.appliedAmount"
                      :min="0"
                      :max="childRecord.remainingInvoiceAmount"
                      :precision="2"
                      style="width: 100%"
                      size="small"
                      :disabled="childRecord.alreadyAdded"
                    />
                  </template>
                </template>
              </Table>
            </template>
          </Table>
        </div>

        <!-- 币别汇率转换 -->
        <!-- 已移动到 footer 区域 -->
      </Spin>

      <template #footer>
        <div
          style="
            display: flex;
            gap: 8px;
            align-items: center;
            justify-content: space-between;
          "
        >
          <!-- 左侧：币别汇率转换 -->
          <div
            v-if="selectedCurrencyId && selectedCurrencyId !== 1"
            style="display: flex; gap: 8px; align-items: center"
          >
            <span style="font-size: 14px; color: #666"
              >币别汇率转换 ({{ selectedCurrencyCode || '外币' }}兑人民币)</span
            >
            <Form layout="inline" size="small">
              <Form.Item label="发票汇率">
                <InputNumber
                  v-model:value="invoiceExchangeRate"
                  :min="0"
                  :precision="4"
                  style="width: 150px"
                  placeholder="请输入汇率"
                />
              </Form.Item>
            </Form>
          </div>

          <!-- 右侧：操作按钮 -->
          <Space>
            <Button @click="drawerVisible = false">取消</Button>
            <Button type="primary" @click="handleSaveFeeSelection">确定</Button>
          </Space>
        </div>
      </template>
    </Drawer>

    <!-- 费用明细弹窗 -->
    <Modal
      v-model:open="feeDetailModalVisible"
      title="费用明细"
      width="1000px"
      :footer="null"
      :body-style="{ padding: '16px' }"
    >
      <Spin :spinning="feeDetailModalLoading">
        <div style="border: 1px solid #d9d9d9; border-radius: 4px">
          <Table
            :columns="feeDetailParentColumns"
            :data-source="selectedFeeDetails"
            :pagination="false"
            bordered
            size="small"
            :expandable="{
              defaultExpandAllRows: true,
              childrenColumnName: 'children',
            }"
            row-key="id"
            :scroll="{ y: 500 }"
          >
            <template #expandedRowRender="{ record }">
              <Table
                v-if="record.children && record.children.length > 0"
                :columns="feeDetailChildColumns"
                :data-source="record.children"
                :pagination="false"
                bordered
                size="small"
                row-key="id"
              >
                <template #bodyCell="{ column, record: childRecord }">
                  <template v-if="column.dataIndex === 'appliedAmount'">
                    <span
                      style="font-size: 14px; font-weight: bold; color: #ff4d4f"
                    >
                      {{ childRecord.appliedAmount?.toFixed(2) || '0.00' }}
                      {{ childRecord.currencyCode }}
                    </span>
                  </template>
                </template>
              </Table>
            </template>
          </Table>
        </div>
      </Spin>
    </Modal>
  </Page>
</template>
