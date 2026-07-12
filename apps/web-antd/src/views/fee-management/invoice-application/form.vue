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

import { ClientSelect, CurrencySelect } from '#/adapter/component';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getClientDetail } from '#/api/sea-export/client-admin';
import { getClientInvoiceInfoList } from '#/api/sea-export/clinet-invoice-admin';
import { getCodeInvoicePagedList } from '#/api/system/base-data/code-invoice-admin';
import { getCurrencyDetail } from '#/api/system/base-data/currency-admin';
import { DatePicker, Select } from 'ant-design-vue';
import { getBizTypeOptions } from '#/views/sea-export-admin/orderFee/data';
import { $t } from '#/locales';
import RemarkTemplateModal from './components/RemarkTemplateModal.vue';
import SelectRemarkTemplateModal from './components/SelectRemarkTemplateModal.vue';
import FeeSelectionDrawer from './components/FeeSelectionDrawer.vue';
import FeeDetailModal from './components/FeeDetailModal.vue';
import { getExchangeRatePagedList } from '#/api/system/base-data/exchange-rate-admin';
import { InvoiceRemarkTemplateApi } from '#/api/Invoice/invoiceRemarkTemplate';

// 从命名空间中解构 API 函数
const { addAsync, detailAsync, editAsync, submitAsync } = InvoiceApplicationApi;

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const editId = computed<string | undefined>(() => {
  const id = route.params.id;
  if (Array.isArray(id)) return id[0];
  return id ? String(id) : undefined;
});

const isEdit = computed(() => !!editId.value);

// 判断是否为只读模式（通过路由路径判断）
const isReadOnly = computed(() => {
  return route.path.includes('/view');
});

const loading = ref(false);
const submitLoading = ref(false);

// 费用选择抽屉相关
const feeSelectionDrawerRef = ref();
const drawerVisible = ref(false);
const selectedCurrencyCode = ref<string>(''); //

// 费用明细弹窗相关状态
const feeDetailModalVisible = ref(false);
const feeDetailModalLoading = ref(false);
const selectedFeeDetails = ref<any[]>([]); // 已选择的费用明细数据

// 商品明细选中行
const selectedGoodsRows = ref<string[]>([]); // 选中的商品明细行ID

// 备注模板管理弹窗相关状态
const remarkTemplateModalVisible = ref(false); // 备注模板管理弹窗显示状态
const selectRemarkTemplateModalVisible = ref(false); // 选择备注模板弹窗显示状态

// 备注模板组件引用
const remarkTemplateModalRef = ref();

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
const applicantCompanyId = ref(0);

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

// 费用明细表格数据
const feeGroupsData = ref<any[]>([]);

// 选中的费用行 keys
const selectedFeeRowKeys = ref<string[]>([]);

// 获取 VxeTable 引用
const feeGridRef = ref();

/** 获取子表格的选中 keys */
function getChildSelectedKeys(record: any): string[] {
  if (!record.feeDetails) return []; // ✅ 更新为 feeDetails，与 FeeSelectionDrawer 保持一致
  return selectedFeeRowKeys.value.filter((key) =>
    record.feeDetails.some((child: any) => child.id === key),
  );
}

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
      if (item.feeDetails && item.feeDetails.length > 0) {
        // ✅ 更新为 feeDetails，与 FeeSelectionDrawer 保持一致
        flatten(item.feeDetails);
      }
    });
  }

  flatten(data);
  return result;
}

function addSelectedFeesToForm(selectedFees: any[]) {
  // ✅ 获取已存在的费用ID集合
  const existingFeeIds = getAddedFeeIds();

  // ✅ 过滤掉已存在的费用，只添加新的费用
  const newFees = selectedFees.filter((fee: any) => {
    const feeId = String(fee.orderFee.id);
    return !existingFeeIds.has(feeId);
  });

  // 如果没有新费用，直接返回
  if (newFees.length === 0) {
    console.log('⚠️ 所有选择的费用都已存在，无需重复添加');
    message.warning('所选费用已全部添加，无新增费用');
    return;
  }

  // 将选中的费用转换为 InvoiceApplicationItemAddDto
  const items = newFees.map((fee: any) => ({
    orderFeeId: fee.orderFee.id,
    appliedAmount: fee.appliedAmount || fee.orderFee.remainingInvoiceAmount, // ✅ 保持原币金额，不进行汇率转换
    remark: '',
  }));

  // 添加到 formData
  if (!formData.value.invoiceApplicationItems) {
    formData.value.invoiceApplicationItems = [];
  }

  formData.value.invoiceApplicationItems.push(...items);

  console.log(
    `✅ 添加了 ${items.length} 条新费用明细（已过滤 ${selectedFees.length - newFees.length} 条重复费用）:`,
    items,
  );
  message.success(`成功添加 ${items.length} 条新费用`);
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
            invoiceApplicationGoodsDtls: goodsDetails.value.map((item) => ({
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
            orgBankAccountId: formData.value.orgBankAccountId,
            clientInvoiceBankId: formData.value.clientInvoiceBankId,
          },
        ],
      };

      await addAsync(batchData);
      message.success('创建成功');
    }

    // 保存后不关闭页面，保持当前状态
    console.log('✅ 保存成功，保持在当前页面');
  } catch (error) {
    console.error('保存失败:', error);
    message.error('保存失败');
  } finally {
    submitLoading.value = false;
  }
}

/** 直接提交（先保存再提交） */
async function handleDirectSubmit() {
  // 基本验证
  if (!formData.value.settlementId) {
    message.warning('请选择结算对象');
    return;
  }
  if (!formData.value.companyId) {
    message.warning('请选择所属公司');
    return;
  }

  // 验证是否有费用明细
  const items = formData.value.invoiceApplicationItems || [];
  if (items.length === 0) {
    message.warning('请先添加费用明细后再提交');
    return;
  }

  submitLoading.value = true;
  try {
    let applicationId: string | undefined;

    // 如果是新建，先保存
    if (!isEdit.value) {
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
            invoiceApplicationGoodsDtls: goodsDetails.value.map((item) => ({
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
            orgBankAccountId: formData.value.orgBankAccountId,
            clientInvoiceBankId: formData.value.clientInvoiceBankId,
          },
        ],
      };

      const ids = await addAsync(batchData);

      // 获取第一个创建的申请ID
      if (ids && ids.length > 0) {
        applicationId = ids[0];
      }
    } else {
      // 编辑模式，先保存修改
      await editAsync(
        formData.value as InvoiceApplicationApi.InvoiceApplicationEditDto,
      );
      applicationId = editId.value;
    }

    // 保存成功后提交
    if (applicationId) {
      await submitAsync({ id: applicationId });
      message.success('提交成功');

      // 提交成功后返回列表页面
      router.push('/fee-management/invoice-application');
    }
  } catch (error) {
    console.error('提交失败:', error);
    message.error('提交失败');
  } finally {
    submitLoading.value = false;
  }
}

/** 提交审核 */
async function handleSubmitForAudit() {
  // 基本验证
  if (!formData.value.settlementId) {
    message.warning('请选择结算对象');
    return;
  }
  if (!formData.value.companyId) {
    message.warning('请选择所属公司');
    return;
  }

  // 验证是否有费用明细
  const items = formData.value.invoiceApplicationItems || [];
  if (items.length === 0) {
    message.warning('请先添加费用明细后再提交');
    return;
  }

  submitLoading.value = true;
  try {
    // 如果是新建，先保存再提交
    if (!isEdit.value) {
      // 先保存
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
            invoiceApplicationGoodsDtls: goodsDetails.value.map((item) => ({
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
            orgBankAccountId: formData.value.orgBankAccountId,
            clientInvoiceBankId: formData.value.clientInvoiceBankId,
          },
        ],
      };

      const ids = await addAsync(batchData);

      // 获取第一个创建的申请ID并提交
      if (ids && ids.length > 0) {
        await submitAsync({ id: ids[0]! });
        message.success('创建并提交成功');

        // 提交成功后返回列表页面
        router.push('/fee-management/invoice-application');
      }
    } else {
      // 编辑模式直接提交
      await submitAsync({ id: editId.value! });
      message.success('提交成功');

      // 提交成功后返回列表页面
      router.push('/fee-management/invoice-application');
    }
  } catch (error) {
    console.error('提交失败:', error);
    message.error('提交失败');
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
  const items = formData.value.invoiceApplicationItems || [];

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

/** 打开费用明细弹窗 */
function handleOpenFeeDetailModal() {
  // 从 formData 中获取已选择的费用明细
  const items = formData.value.invoiceApplicationItems || [];

  console.log('🔍 打开费用明细弹窗 - 已选费用数量:', items.length);
  console.log('🔍 feeGroupsData 状态检查:');
  console.log('  - feeGroupsData.value:', feeGroupsData.value);
  console.log('  - feeGroupsData.value.length:', feeGroupsData.value.length);
  console.log(
    '  - feeGroupsData.value 是否为空数组:',
    feeGroupsData.value.length === 0,
  );

  if (items.length === 0) {
    message.warning('暂无费用明细数据');
    return;
  }

  // ✅ 关键检查：如果 feeGroupsData 为空，提示用户重新添加费用
  if (feeGroupsData.value.length === 0) {
    console.error(' 严重问题：feeGroupsData 为空！');
    console.error('💡 原因可能是：');
    console.error('   1. 从抽屉选择费用后，数据没有正确保存到 feeGroupsData');
    console.error('   2. 页面刷新后丢失了费用数据');
    console.error('   3. 需要重新从抽屉中添加费用');

    message.error('费用数据丢失，请重新点击"从开票申请导入费用"按钮添加费用');
    return;
  }

  feeDetailModalLoading.value = true;

  try {
    // 根据 orderFeeId 从 feeGroupsData 中查找对应的完整信息
    const allFees = flattenTreeData(feeGroupsData.value);

    console.log('🔍 扁平化后的所有费用数量:', allFees.length);
    console.log(
      ' 所有费用ID列表:',
      allFees.map((f: any) => f.id),
    );
    console.log(
      '🔍 所有费用的 orderFee?.id 列表:',
      allFees.map((f: any) => f.orderFee?.id),
    );

    // 构建已选择费用的树状结构
    const selectedDetails: any[] = [];
    const processedOrders = new Set<string>();

    items.forEach((item: any, index: number) => {
      console.log(`\n=== 处理第 ${index + 1} 个费用项 ===`);
      console.log('🔍 费用项详情:', item);
      console.log('🔍 要查找的 orderFeeId:', item.orderFeeId);

      const fee = allFees.find((f: any) => f.orderFee?.id === item.orderFeeId);
      console.log(' 找到的费用对象:', fee);
      console.log('🔍 费用对象JSON:', JSON.stringify(fee, null, 2));

      if (fee) {
        const orderId = fee.parentId;
        console.log(' 订单ID (fee.parentId):', orderId);
        console.log('🔍 已处理的订单:', Array.from(processedOrders));

        // 如果这个订单还没有处理过，创建父节点
        if (!processedOrders.has(orderId)) {
          const parentFee = allFees.find((f: any) => f.id === orderId);
          console.log('🔍 查找父节点 - 目标ID:', orderId);
          console.log('🔍 父节点费用对象:', parentFee);
          console.log('🔍 父节点是否存在:', !!parentFee);

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
              bizType:
                getBizTypeOptions().find(
                  (o: any) => o.value === parentFee.transportOrder?.bizType,
                )?.label || '-',
              carrier: parentFee.seaExport?.carrierName || '-',
              company: parentFee.transportOrder.companys[0].name || '-',
              feeDetails: [] as any[], // ✅ 使用 feeDetails 而非 children，与 FeeDetailModal 保持一致
            };

            selectedDetails.push(parentNode);
            processedOrders.add(orderId);
            console.log('✅ 添加父节点成功');
          } else {
            console.error('❌ 未找到父节点！orderId:', orderId);
          }
        }

        // 添加子节点（费用明细）
        const parentNode = selectedDetails.find((p: any) => p.id === orderId);
        console.log('🔍 在 selectedDetails 中查找父节点:', parentNode);

        if (parentNode) {
          const childNode = {
            id: fee.id,
            parentId: orderId,
            orderFee: fee.orderFee,
            appliedAmount: item.appliedAmount,
            settlementUnit: fee.orderFee.settlementName || '-',
            payReceiveType:
              fee.orderFee.payReceiveType === 'AR' ? '应收' : '应付',
            feeName: fee.orderFee.feeCodeName || '-',
            amount: fee.orderFee.amount,
            currencyCode: fee.orderFee.currencyCode || '-',
            remainingInvoiceAmount: fee.orderFee.remainingInvoiceAmount,
          };
          parentNode.feeDetails.push(childNode); // ✅ 更新为 feeDetails
          console.log('✅ 添加子节点成功');
        } else {
          console.error(
            '❌ 在 selectedDetails 中未找到父节点！orderId:',
            orderId,
          );
        }
      } else {
        console.error('❌ 未找到对应的费用对象！orderFeeId:', item.orderFeeId);
      }
    });

    selectedFeeDetails.value = selectedDetails;
    console.log('\n=== 最终结果 ===');
    console.log('✅ 最终费用明细数据:', selectedFeeDetails.value);
    console.log('✅ 父节点数量:', selectedDetails.length);
    selectedDetails.forEach((detail, index) => {
      console.log(
        `✅ 父节点 ${index + 1} (${detail.id}) 的子节点数量:`,
        detail.feeDetails?.length || 0,
      );
    });

    feeDetailModalVisible.value = true;
  } catch (error) {
    console.error('❌ 加载费用明细失败:', error);
    message.error('加载费用明细失败');
  } finally {
    feeDetailModalLoading.value = false;
  }
}

/** ✅ 新增：处理删除费用 */
async function handleDeleteFee(feeId: string) {
  console.log('🗑️ 开始删除费用 - feeId:', feeId);

  // 1. 从 invoiceApplicationItems 中移除该费用
  const items = formData.value.invoiceApplicationItems || [];
  const removedItem = items.find((item: any) => {
    // 需要从 feeGroupsData 中找到对应的 orderFeeId
    const allFees = flattenTreeData(feeGroupsData.value);
    const fee = allFees.find((f: any) => f.id === feeId);
    return fee && item.orderFeeId === fee.orderFee?.id;
  });

  if (!removedItem) {
    console.error('❌ 未找到要删除的费用项');
    message.error('未找到要删除的费用');
    return;
  }

  // 过滤掉该费用
  formData.value.invoiceApplicationItems = items.filter(
    (item: any) => item !== removedItem,
  );

  console.log(
    '✅ 已从 invoiceApplicationItems 中删除费用，剩余:',
    formData.value.invoiceApplicationItems.length,
    '条',
  );

  // 2. 重新计算商品明细金额
  await recalculateGoodsDetails();

  // 3. 关闭弹窗并重新打开以刷新显示
  feeDetailModalVisible.value = false;
  await nextTick();
  handleOpenFeeDetailModal();

  message.success('删除成功，已重新计算金额');
}

/** ✅ 新增：重新计算商品明细金额 */
async function recalculateGoodsDetails() {
  const items = formData.value.invoiceApplicationItems || [];

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

  // 从 feeGroupsData 中获取完整的费用信息
  const allFees = flattenTreeData(feeGroupsData.value);

  items.forEach((item: any) => {
    const fee = allFees.find((f: any) => f.orderFee?.id === item.orderFeeId);
    if (fee) {
      const appliedAmount = item.appliedAmount || 0;
      const feeCurrencyId = fee.orderFee.currencyId;

      // 如果需要汇率转换
      if (feeCurrencyId !== 1) {
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
          const fee = allFees.find(
            (f: any) => f.orderFee?.id === item.orderFeeId,
          );
          return fee;
        })
        .filter(Boolean),
    );
  }
}

/** 处理费用选择保存 */
async function handleFeeSelectionSave(data: {
  selectedFees: any[];
  settlementId: string;
  currencyId: number;
  invoiceExchangeRate?: number;
  feeGroupsData?: any[]; // ✅ 新增：接收完整的费用分组数据
}) {
  const {
    selectedFees,
    settlementId,
    currencyId,
    invoiceExchangeRate: rate,
    feeGroupsData: groupsData,
  } = data;

  console.log('✅ 收到费用选择数据:', selectedFees.length, '条费用');
  console.log('✅ 结算单位ID:', settlementId);
  console.log('✅ 币别ID:', currencyId);
  console.log('✅ feeGroupsData 数量:', groupsData?.length || 0);

  // ✅ 详细检查 feeGroupsData 的结构
  if (groupsData && groupsData.length > 0) {
    console.log('✅ feeGroupsData 第一个订单组:', groupsData[0]);
    const firstFee = groupsData[0].feeDetails?.[0]; // ✅ 更新为 feeDetails，与 FeeSelectionDrawer 保持一致
    if (firstFee) {
      console.log('✅ 第一个费用的完整信息:', {
        id: firstFee.id,
        orderFeeId: firstFee.orderFee?.id,
        commissionNum: firstFee.transportOrder?.commissionNum,
        mblNum: firstFee.transportOrder?.mblNum,
      });
    }
  }

  // 设置结算单位
  formData.value.settlementId = settlementId;
  formData.value.currencyId = currencyId;

  // ✅ 设置发票汇率（从费用选择抽屉中带过来）
  if (rate !== undefined) {
    invoiceExchangeRate.value = rate;
    console.log('✅ 从费用选择抽屉中获取发票汇率:', rate);
  }

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

  // ✅ 根据币别自动选择销售方默认银行
  updateOrgBankByCurrency();

  // 加载客户开票信息
  await loadClientInvoiceInfo(settlementId);

  // ✅ 关键修复：合并费用组数据，避免重复添加
  if (groupsData && groupsData.length > 0) {
    // ✅ 获取已存在的运输订单ID集合（用于去重）
    const existingOrderIds = new Set<string>();
    feeGroupsData.value.forEach((group: any) => {
      if (group.transportOrder?.id) {
        existingOrderIds.add(String(group.transportOrder.id));
      }
    });

    // ✅ 过滤掉已存在的订单组，只添加新的
    const newGroups = groupsData.filter((group: any) => {
      const orderId = group.transportOrder?.id;
      return orderId && !existingOrderIds.has(String(orderId));
    });

    // ✅ 合并新旧费用组数据
    if (newGroups.length > 0) {
      feeGroupsData.value = [...feeGroupsData.value, ...newGroups];
      console.log(
        `✅ 已合并费用数据到 feeGroupsData: 新增 ${newGroups.length} 个订单组，总计 ${feeGroupsData.value.length} 个订单组`,
      );
    } else {
      console.log('⚠️ 所有订单组都已存在，无需重复添加');
    }
  } else {
    console.warn('⚠️ 未接收到 feeGroupsData 数据');
  }

  // 判断是否是首次添加费用（商品明细为空时才自动填充）
  const isFirstTimeAdd = goodsDetails.value.length === 0;

  // ✅ 关键修复：获取已存在的费用ID集合，用于过滤
  const existingFeeIds = getAddedFeeIds();

  // ✅ 过滤出真正的新费用（排除已存在的）
  const newFees = selectedFees.filter((fee: any) => {
    const feeId = String(fee.orderFee?.id);
    return !existingFeeIds.has(feeId);
  });

  console.log('📊 费用过滤结果:', {
    抽屉返回总数: selectedFees.length,
    已存在数量: selectedFees.length - newFees.length,
    实际新增数量: newFees.length,
  });

  // 如果没有新费用，直接返回
  if (newFees.length === 0) {
    console.log('⚠️ 没有新费用需要处理');
    message.warning('所选费用已全部添加，无新增费用');
    return;
  }

  addSelectedFeesToForm(selectedFees);

  // ✅ 自动加载当前币别对应的默认备注模板
  await loadDefaultRemarkTemplate();

  // ✅ 根据商品明细数量决定处理方式（使用过滤后的新费用）
  if (isFirstTimeAdd) {
    // 首次添加：自动填充商品明细
    await autoFillGoodsDetails(newFees);
  } else if (goodsDetails.value.length === 1) {
    // ✅ 只有一行商品明细：将新费用金额合并到该行
    await mergeAmountToExistingGoods(newFees);
  } else {
    // ✅ 多行商品明细：提示用户手动处理，避免数据混乱
    console.warn('⚠️ 存在多行商品明细，无法自动合并');
    message.warning(
      '当前存在多行商品明细，系统无法自动合并金额。建议：\n' +
        '1. 删除多余的商品明细，保留一行\n' +
        '2. 或手动调整各行的金额',
    );
    // 不再自动添加新的商品明细
  }
}

/** 打开备注模板管理弹窗 */
function handleOpenRemarkTemplateModal() {
  remarkTemplateModalVisible.value = true;
}

/** 打开选择备注模板弹窗 */
function handleOpenSelectRemarkTemplateModal() {
  // ✅ 检查是否已添加费用
  const items = formData.value.invoiceApplicationItems || [];

  console.log('🔍 检查费用数据状态:');
  console.log('  - invoiceApplicationItems:', items.length, '条');
  console.log('  - feeGroupsData:', feeGroupsData.value.length, '个订单组');

  if (items.length === 0) {
    message.warning(
      '请先点击"从开票申请导入费用"按钮，从抽屉中添加费用后再使用模板功能',
    );
    return;
  }

  if (feeGroupsData.value.length === 0) {
    console.error(
      '❌ 严重问题：invoiceApplicationItems 有数据但 feeGroupsData 为空！',
    );
    console.error(
      '💡 这可能是费用数据传递过程中丢失了，请重新从抽屉中选择费用',
    );
    message.error('费用数据不完整，请重新添加费用');
    return;
  }

  selectRemarkTemplateModalVisible.value = true;
}

/** 接收模板内容并填充到备注字段 */
function handleUseTemplate(template: string) {
  if (template) {
    formData.value.remark = template;
    //message.success('模板已应用到备注');
  }
}

/** 从费用明细中提取备注信息 */
function handleExtractRemark() {
  const items = formData.value.invoiceApplicationItems || [];

  if (items.length === 0) {
    message.warning('请先添加费用明细');
    return;
  }

  try {
    // 收集所有委托编号和主提单号
    const commissionNums = new Set<string>();
    const mblNums = new Set<string>();

    // 按币别分组统计金额
    const amountByCurrency: Record<number, { code: string; total: number }> =
      {};

    items.forEach((item: any) => {
      // 提取委托编号
      if (item.commissionNum) {
        commissionNums.add(item.commissionNum);
      }

      // 提取主提单号
      if (item.mblNum) {
        mblNums.add(item.mblNum);
      }

      // 统计金额（按币别）
      const currencyId = item.currencyId || formData.value.currencyId;
      const appliedAmount = item.appliedAmount || 0;

      if (!amountByCurrency[currencyId]) {
        amountByCurrency[currencyId] = {
          code: item.currencyCode || 'CNY',
          total: 0,
        };
      }
      amountByCurrency[currencyId].total += appliedAmount;
    });

    // 构建备注内容
    let remark = '';

    // 添加委托编号
    if (commissionNums.size > 0) {
      remark += `委托编号：${Array.from(commissionNums).join('、')}\n`;
    }

    // 添加主提单号
    if (mblNums.size > 0) {
      remark += `主提单号：${Array.from(mblNums).join('、')}\n`;
    }

    // 添加金额信息
    remark += '\n';
    Object.values(amountByCurrency).forEach(({ code, total }) => {
      remark += `${code}金额(总计)：${total.toFixed(2)}\n`;
    });

    // 添加到备注字段
    formData.value.remark = remark;

    message.success(`已从 ${items.length} 条费用明细中提取备注信息`);
  } catch (error) {
    console.error('提取备注失败:', error);
    message.error('提取备注失败');
  }
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
  console.log('📦 自动填充的商品明细总数:', goodsDetails.value.length);
}

/** 自动填充商品明细 */
async function autoFillGoodsDetails(selectedFees: any[]) {
  // ✅ 移除清空逻辑，改为追加模式
  // goodsDetails.value = [];

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
  selectedCurrencyCode.value = currencyCode;
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

/** 获取已添加的费用ID列表 */
function getAddedFeeIds(): Set<string> {
  const items = formData.value.invoiceApplicationItems || [];
  return new Set(items.map((item: any) => String(item.orderFeeId)));
}

/** ✅ 新增：将已添加的费用ID列表转换为数组格式（用于传递给子组件） */
function getAddedFeeIdsArray(): string[] {
  return Array.from(getAddedFeeIds());
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

/** ✅ 新增：加载当前币别对应的默认备注模板 */
async function loadDefaultRemarkTemplate() {
  // 检查是否有必要的参数
  if (!formData.value.companyId || !formData.value.currencyId) {
    console.log('⚠️ 缺少公司ID或币别ID，无法加载默认备注模板');
    return;
  }

  // 如果备注字段已经有内容，不覆盖用户已输入的内容
  if (formData.value.remark && formData.value.remark.trim()) {
    console.log('⚠️ 备注字段已有内容，跳过自动填充');
    return;
  }

  try {
    // ✅ 直接调用 RemarkTemplateModal 组件的方法获取默认模板，并传入 templateData 进行占位符替换
    const template =
      await remarkTemplateModalRef.value?.getDefaultRemarkTemplate(
        formData.value.companyId,
        formData.value.currencyId,
        remarkTemplateData.value, // ✅ 传入动态计算的模板数据
      );

    if (template) {
      formData.value.remark = template;
      console.log(
        '✅ 已自动加载并替换默认备注模板:',
        template.substring(0, 50),
      );
      message.success('已自动应用默认备注模板');
    } else {
      console.log('ℹ️ 未找到默认备注模板');
    }
  } catch (error) {
    console.error('加载默认备注模板失败:', error);
    // 静默失败，不影响主流程
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
      applicantCompanyId.value = (userInfo as any).companyId || '';
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

/** 根据发票类型获取标题 */
function getInvoiceTitle(invoiceType: string): string {
  const option = invoiceTypeOptions.find((opt) => opt.value === invoiceType);
  return option ? option.label : '增值税电子普通发票';
}

/** 发票类型选项 */
const invoiceTypeOptions = [
  {
    label: '电子发票（普通发票）',
    value: InvoiceApplicationApi.InvoiceType.NormalElectric,
  },
  {
    label: '电子发票（增值税专用发票）',
    value: InvoiceApplicationApi.InvoiceType.Special,
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

/** 备注模板占位符数据对象 */
const remarkTemplateData = computed(() => {
  // 从费用明细中提取委托编号和主提单号
  const items = formData.value.invoiceApplicationItems || [];
  const commissionNums = new Set<string>();
  const mblNums = new Set<string>();

  console.log(
    '🔍 remarkTemplateData - invoiceApplicationItems:',
    items.length,
    '条',
  );
  console.log(
    '🔍 remarkTemplateData - feeGroupsData:',
    feeGroupsData.value.length,
    '个订单组',
  );

  // ✅ 关键修复：从 feeGroupsData 中获取完整的费用信息（包含 commissionNum 和 mblNum）
  if (feeGroupsData.value && feeGroupsData.value.length > 0) {
    const allFees = flattenTreeData(feeGroupsData.value);
    console.log(
      '🔍 remarkTemplateData - feeGroupsData 扁平化后:',
      allFees.length,
      '条费用',
    );

    items.forEach((item: any) => {
      // 根据 orderFeeId 从 feeGroupsData 中查找对应的完整费用信息
      const fee = allFees.find((f: any) => f.orderFee?.id === item.orderFeeId);

      if (fee) {
        // 从 transportOrder 中获取委托编号和主提单号
        if (fee.transportOrder?.commissionNum) {
          commissionNums.add(fee.transportOrder.commissionNum);
          console.log('✅ 找到委托编号:', fee.transportOrder.commissionNum);
        }
        if (fee.transportOrder?.mblNum) {
          mblNums.add(fee.transportOrder.mblNum);
          console.log('✅ 找到主提单号:', fee.transportOrder.mblNum);
        }
      } else {
        console.warn('⚠️ 未找到 orderFeeId 对应的费用:', item.orderFeeId);
      }
    });
  } else {
    console.warn('⚠️ feeGroupsData 为空，无法提取委托编号和主提单号');
    console.warn('💡 提示：请先从抽屉中添加费用，然后再使用模板功能');
  }

  // 获取购方银行信息
  const clientBank = filteredClientBanks.value.find(
    (b) => b.id === formData.value.clientInvoiceBankId,
  );

  // 获取销方银行信息
  const orgBank = filteredOrgBanks.value.find(
    (b) => b.id === formData.value.orgBankAccountId,
  );

  const result = {
    // 委托编号（多个用顿号分隔）
    commissionNum: Array.from(commissionNums).join('、') || '',
    // 主提单号（多个用顿号分隔）
    mblNum: Array.from(mblNums).join('、') || '',
    // 发票汇率
    invoiceExchangeRate: invoiceExchangeRate.value || 1,
    // 外币金额总计（原币金额）
    foreignCurrencyAmount: totalAppliedAmountOriginal.value.toFixed(2),
    // 人民币金额总计
    rmbAmount: totalAppliedAmount.value.toFixed(2),
    // 购方银行名称
    clientBankName: clientBank?.bankName || '',
    // 购方银行账号
    clientBankAccount: clientBank?.bankAccount || '',
    // 销方银行名称
    orgBankName: orgBank?.bankName || '',
    // 销方银行账号
    orgBankAccount: orgBank?.bankAccount || '',
  };

  console.log('✅ remarkTemplateData 最终结果:', result);
  return result;
});

/** 加载详情数据 */
async function loadDetail() {
  if (!editId.value) return;

  loading.value = true;
  try {
    const detail = await detailAsync(editId.value);

    // 检查状态，只有录入或驳回状态可以编辑（只读模式除外）
    if (
      !isReadOnly.value &&
      detail.status !==
        InvoiceApplicationApi.InvoiceApplicationStatus.Entering &&
      detail.status !== InvoiceApplicationApi.InvoiceApplicationStatus.Rejected
    ) {
      message.error('当前状态的申请不可编辑');
      router.back();
      return;
    }

    // ✅ 从 feeGroups 中提取 invoiceApplicationItems
    const invoiceApplicationItems: any[] = [];
    if (detail.feeGroups && detail.feeGroups.length > 0) {
      detail.feeGroups.forEach((group: any) => {
        if (group.items && group.items.length > 0) {
          group.items.forEach((item: any) => {
            invoiceApplicationItems.push({
              orderFeeId: item.orderFeeId,
              appliedAmount: item.appliedAmount,
              remark: item.remark || '',
            });
          });
        }
      });
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
      invoiceApplicationItems: invoiceApplicationItems, // ✅ 从 feeGroups 中提取
      invoiceApplicationGoodsDtls: detail.invoiceApplicationGoodsDtls || [],
    };

    // 设置申请人和申请日期（使用创建信息）
    applicantName.value = detail.creatorUserName || '';
    applicationDate.value = detail.applyTime
      ? dayjs(detail.applyTime).format('YYYY-MM-DD')
      : dayjs().format('YYYY-MM-DD');

    // 加载客户开票信息
    // 加载客户开票信息
    await loadClientInvoiceInfo(detail.settlementId);

    // 设置汇率
    invoiceExchangeRate.value = detail.invoiceExchangeRate || 1.0;

    // ✅ 加载币别代码
    if (detail.currencyId) {
      try {
        const currencyDetail = await getCurrencyDetail(detail.currencyId);
        selectedCurrencyCode.value = currencyDetail.code || '';
        console.log('✅ 已加载币别代码:', selectedCurrencyCode.value);
      } catch (error) {
        console.error('加载币别详情失败:', error);
        selectedCurrencyCode.value = '';
      }
    }

    // ✅ 根据币别更新销售方银行
    updateOrgBankByCurrency();

    // ✅ 从 feeGroups 中构建 feeGroupsData（用于占位符替换等功能）
    if (detail.feeGroups && detail.feeGroups.length > 0) {
      const feeGroupsForDisplay: any[] = [];

      detail.feeGroups.forEach((group: any) => {
        const parentNode: any = {
          id: group.transportOrder?.id || `order_${Date.now()}`,
          parentId: null,
          transportOrder: group.transportOrder,
          seaExport: group.seaExport,
          orderFees: group.items?.map((item: any) => item.orderFee) || [],
          commissionNum: group.transportOrder?.commissionNum,
          mblNum: group.transportOrder?.mblNum || '-',
          bookingNum: group.transportOrder?.bookingNum || '-',
          clientName: group.transportOrder?.clientName,
          bizType:
            getBizTypeOptions().find(
              (o: any) => o.value === group.transportOrder?.bizType,
            )?.label || '-',
          carrier: group.seaExport?.carrierName || '-',
          company: group.transportOrder?.companys?.[0]?.name || '-',
          feeDetails: [] as any[], // ✅ 更新为 feeDetails，与 FeeSelectionDrawer 保持一致
        };

        // 添加子节点（费用明细）
        if (group.items && group.items.length > 0) {
          group.items.forEach((item: any) => {
            const childNode: any = {
              id: item.id,
              parentId: parentNode.id,
              orderFee: item.orderFee,
              appliedAmount: item.appliedAmount,
              settlementUnit: item.orderFee?.settlementName || '-',
              payReceiveType: item.orderFee?.paySide === 0 ? '应收' : '应付',
              feeName: item.orderFee?.feeCodeName || '-',
              amount: item.orderFee?.amount,
              currencyCode: item.orderFee?.currencyCode || '-',
              remainingInvoiceAmount: item.remainingInvoiceAmount,
              commissionNum: group.transportOrder?.commissionNum,
              mblNum: group.transportOrder?.mblNum || '-',
              bookingNum: group.transportOrder?.bookingNum || '-',
              transportOrder: group.transportOrder,
            };
            parentNode.feeDetails.push(childNode); // ✅ 更新为 feeDetails
          });
        }

        feeGroupsForDisplay.push(parentNode);
      });

      feeGroupsData.value = feeGroupsForDisplay;
      console.log(
        '✅ 已加载 feeGroupsData:',
        feeGroupsData.value.length,
        '个订单组',
      );
    }

    // ✅ 加载商品明细数据，并为每行添加唯一ID
    if (
      detail.invoiceApplicationGoodsDtls &&
      detail.invoiceApplicationGoodsDtls.length > 0
    ) {
      // 创建全新的数组副本，确保响应式更新
      const newGoodsDetails = detail.invoiceApplicationGoodsDtls.map(
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

    // ✅ 如果备注为空，尝试加载默认备注模板
    if (!formData.value.remark || !formData.value.remark.trim()) {
      await loadDefaultRemarkTemplate();
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
        <Button
          type="primary"
          :loading="submitLoading"
          @click="handleSubmit"
          :disabled="isReadOnly"
        >
          {{ isEdit ? '保存' : '创建' }}
        </Button>
        <Button
          type="primary"
          :loading="submitLoading"
          @click="handleDirectSubmit"
          :disabled="isReadOnly"
        >
          提交
        </Button>
        <!-- <Button
          type="primary"
          :loading="submitLoading"
          @click="handleSubmitForAudit"
          v-if="
            !isEdit ||
            formData.status ===
              InvoiceApplicationApi.InvoiceApplicationStatus.Entering ||
            formData.status ===
              InvoiceApplicationApi.InvoiceApplicationStatus.Rejected
          "
          :disabled="isReadOnly"
        >
          提交审核
        </Button> -->
        <Button @click="handleCancel">{{
          isReadOnly ? '关闭' : '取消'
        }}</Button>
      </Space>
    </div>

    <Card :title="isEdit ? '编辑开票申请' : '新建开票申请'">
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

                <Form.Item label="开票申请人">
                  <Input :value="applicantName" disabled />
                </Form.Item>

                <Form.Item label="开票申请日期">
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
                    :disabled="isReadOnly"
                  />
                </Form.Item>

                <Form.Item>
                  <Button
                    type="primary"
                    block
                    @click="handleOpenFeeDrawer"
                    :disabled="isReadOnly"
                  >
                    从开票申请导入费用
                  </Button>
                </Form.Item>

                <Form.Item>
                  <Button
                    block
                    @click="handleOpenFeeDetailModal"
                    :disabled="isReadOnly"
                  >
                    查看费用明细
                  </Button>
                </Form.Item>

                <!-- <Form.Item v-if="goodsDetails.length > 0">
                  <Button
                    type="dashed"
                    block
                    @click="handleRefillGoodsDetails"
                    :disabled="!formData.currencyId"
                  >
                    🔄 根据当前费用重新填充商品明细
                  </Button>
                </Form.Item> -->
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
                    @click="handleAddGoodsRow"
                    :disabled="isReadOnly"
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
                    :disabled="selectedGoodsRows.length === 0 || isReadOnly"
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
                  :row-selection="
                    isReadOnly
                      ? undefined
                      : {
                          selectedRowKeys: selectedGoodsRows,
                          onChange: (selectedRowKeys) => {
                            selectedGoodsRows.splice(
                              0,
                              selectedGoodsRows.length,
                              ...selectedRowKeys.map(String),
                            );
                          },
                          type: 'checkbox',
                        }
                  "
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

    <!-- 费用选择抽屉 -->
    <FeeSelectionDrawer
      ref="feeSelectionDrawerRef"
      v-model:visible="drawerVisible"
      :settlement-id="formData.settlementId"
      :currency-id="formData.currencyId"
      :invoice-application-id="editId"
      :added-fee-ids="getAddedFeeIdsArray()"
      @save="handleFeeSelectionSave"
    />

    <!-- 费用明细弹窗 -->
    <FeeDetailModal
      v-model:visible="feeDetailModalVisible"
      :loading="feeDetailModalLoading"
      :fee-details="selectedFeeDetails"
      @delete-fee="handleDeleteFee"
    />

    <!-- 备注模板管理弹窗 -->
    <RemarkTemplateModal
      ref="remarkTemplateModalRef"
      v-model:visible="remarkTemplateModalVisible"
      @use-template="handleUseTemplate"
    />

    <!-- 选择备注模板弹窗 -->
    <SelectRemarkTemplateModal
      v-model:visible="selectRemarkTemplateModalVisible"
      :settlement-id="applicantCompanyId"
      :currency-id="formData.currencyId"
      :currency-code="selectedCurrencyCode"
      :fee-details="formData.invoiceApplicationItems"
      :template-data="remarkTemplateData"
      @use-template="handleUseTemplate"
    />
  </Page>
</template>
