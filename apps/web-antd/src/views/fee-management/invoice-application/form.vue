<script lang="ts" setup>
import { InvoiceApplicationApi } from '#/api/Invoice/invoiceRequest';
import type { ClientAdminApi } from '#/api/sea-export/client-admin';
import type { ClientInvoiceInfoAdminApi } from '#/api/sea-export/clinet-invoice-admin';
import type { CodeInvoiceAdminApi } from '#/api/system/base-data/code-invoice-admin';

import { computed, nextTick, onMounted, ref } from 'vue';
import dayjs from 'dayjs';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Drawer,
  Form,
  Input,
  InputNumber,
  message,
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
import { DatePicker, Select } from 'ant-design-vue';
import { $t } from '#/locales';

// 从命名空间中解构 API 函数
const { addAsync, detailAsync, editAsync, getOrderFeeGroupAsync } =
  InvoiceApplicationApi;

const route = useRoute();
const router = useRouter();

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

// 表单数据
const formData = ref<any>({
  settlementId: '',
  companyId: 0,
  currencyId: 1, // 默认人民币
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
function handleChildSelectionChange(record: any, selectedRowKeys: string[]) {
  // 更新选中状态
  const currentSelected = selectedFeeRowKeys.value.filter(
    (key) =>
      !record.children ||
      !record.children.some((child: any) => child.id === key),
  );
  selectedFeeRowKeys.value = [...currentSelected, ...selectedRowKeys];
}

/** 处理费用选择变化 */
function handleFeeSelectionChange(selectedRowKeys: any[], selectedRows: any[]) {
  selectedFeeRowKeys.value = selectedRowKeys.map((key) => String(key));
  console.log('选中的费用:', selectedRows);
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
      remainingInvoiceAmount: fee.remainingInvoiceAmount,
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
    record.specification = selectedItem.specification || '';
    record.unit = selectedItem.unit || '票';
    record.taxRate = selectedItem.taxRate || 0;
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

/** 商品明细 - 税率变化 */
function handleTaxRateChange(record: any) {
  handleQuantityOrPriceChange(record);
}

/** 添加商品明细行 */
function handleAddGoodsRow() {
  goodsDetails.value.push({
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

/** 重置筛选条件 */
function handleResetFilter() {
  selectedSettlementId.value = '';
  selectedCurrencyId.value = undefined;
  selectedFeeRowKeys.value = []; // 清空选中状态
  loadFeeGroupData();
}

/** 处理结算单位变化 */
function handleSettlementChange(value: string) {
  selectedSettlementId.value = value;
  loadFeeGroupData();
}

/** 处理币别变化 */
function handleCurrencyChange(value: number) {
  selectedCurrencyId.value = value;
  loadFeeGroupData();
}

/** 打开费用选择抽屉 */
function handleOpenFeeDrawer() {
  // 如果是第一次添加费用，清空之前的选择
  if (!selectedSettlementId.value) {
    selectedSettlementId.value = '';
    selectedCurrencyId.value = undefined;
    selectedFeeRowKeys.value = [];
  }

  drawerVisible.value = true;
  nextTick(() => {
    loadFeeGroupData();
  });
}

/** 保存费用选择 */
function handleSaveFeeSelection() {
  const selectedFees = getSelectedFeesFromTable();
  addSelectedFeesToForm(selectedFees);
  drawerVisible.value = false;
}

/** 加载费用分组数据 */
async function loadFeeGroupData() {
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

    // 如果有结算单位，传入invoiceApplicationId排除已关联的费用
    if (formData.value.settlementId) {
      params.invoiceApplicationId = editId.value;
    }

    const result = await getOrderFeeGroupAsync(params);

    // 转换数据为树状结构
    const treeData = transformToTreeData(result.items || []);
    feeGroupsData.value = treeData;

    console.log('费用数据:', treeData);
  } catch (error) {
    console.error('加载费用数据失败:', error);
    message.error('加载费用数据失败');
  } finally {
    feeDrawerLoading.value = false;
  }
}

/** 将费用数据转换为树状结构 */
function transformToTreeData(
  items: InvoiceApplicationApi.InvoiceApplicationFeeGroupOutputDto[],
): any[] {
  const treeData: any[] = [];

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

    // 子节点（费用明细）
    if (item.orderFees && item.orderFees.length > 0) {
      item.orderFees.forEach((fee, feeIndex) => {
        const childNode: any = {
          id: `child_${fee.id}`,
          parentId: `parent_${item.transportOrder.id}`,
          orderFee: fee,
          appliedAmount: fee.remainingInvoiceAmount, // 默认值为未开票金额
          checked: false,
          // 二级列字段
          settlementUnit: fee.settlementUnitName || '-',
          payReceiveType: fee.payReceiveType === 'AR' ? '应收' : '应付',
          feeName: fee.feeCodeName || '-',
          amount: fee.amount,
          currencyCode: fee.currencyCode || '-',
          remainingInvoiceAmount: fee.remainingInvoiceAmount,
        };
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
  }
}

onMounted(() => {
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
    slots: { customRender: 'appliedAmount' },
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
      currencyId: detail.currencyId || 1,
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

    // 设置汇率
    invoiceExchangeRate.value = detail.invoiceExchangeRate || 1.0;
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
                    :value="formData.companyId"
                    disabled
                    placeholder="从费用中自动获取"
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
                    placeholder="请选择币别"
                    style="width: 100%"
                    @change="handleCurrencyChange"
                  />
                </Form.Item>

                <Form.Item
                  label="发票汇率"
                  v-if="formData.currencyId && formData.currencyId !== 1"
                >
                  <InputNumber
                    v-model:value="invoiceExchangeRate"
                    :min="0"
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
                  <Button block> 查看费用明细 </Button>
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
            <Card
              :tab-list="[{ key: 'invoice', tab: '发票信息' }]"
              :active-tab-key="'invoice'"
              @tab-change="(key) => {}"
            >
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
                <div style="flex: 1; padding: 8px; border: 1px solid #d9d9d9">
                  <div
                    style="
                      margin-bottom: 8px;
                      font-weight: bold;
                      color: #c41e3a;
                    "
                  >
                    购买方信息
                  </div>
                  <div style="font-size: 12px">
                    <div>
                      <strong>名 称:</strong>
                      {{ selectedClientInvoiceInfo?.header || '(选填)' }}
                    </div>
                    <div>
                      <strong>纳税人识别号:</strong>
                      {{ selectedClientInvoiceInfo?.taxNum || '(选填)' }}
                    </div>
                    <div>
                      <strong>地址、电话:</strong>
                      {{ selectedClientInvoiceInfo?.address || '(选填)' }}
                      {{ selectedClientInvoiceInfo?.tel || '' }}
                    </div>
                    <div>
                      <strong>开户行及账号:</strong>
                      <Select
                        v-model:value="formData.clientInvoiceBankId"
                        :options="
                          (
                            selectedClientInvoiceInfo?.clientInvoiceBanks || []
                          ).map((b) => ({
                            label: `${b.bankName} - ${b.bankAccount}`,
                            value: b.id,
                          }))
                        "
                        style="width: 100%; margin-top: 4px"
                        placeholder="请选择银行"
                      />
                    </div>
                  </div>
                </div>

                <div style="flex: 1; padding: 8px; border: 1px solid #d9d9d9">
                  <div
                    style="
                      margin-bottom: 8px;
                      font-weight: bold;
                      color: #c41e3a;
                    "
                  >
                    销售方信息
                  </div>
                  <div style="font-size: 12px">
                    <div>
                      <strong>名 称:</strong> 青岛忠进国际货运代理有限公司
                    </div>
                    <div><strong>纳税人识别号:</strong> 91370200783723132P</div>
                    <div><strong>地址、电话:</strong> (选填)</div>
                    <div><strong>开户行及账号:</strong> (选填)</div>
                  </div>
                </div>
              </div>

              <!-- 商品明细表格 -->
              <div style="margin-top: 16px">
                <div style="margin-bottom: 8px">
                  <Button size="small" @click="handleAddGoodsRow">
                    <template #icon>➕</template>
                    添加商品明细
                  </Button>
                  <Button size="small" danger style="margin-left: 8px">
                    <template #icon>❌</template>
                    删除
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
                      width: 100,
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
                    {
                      title: '币别',
                      dataIndex: 'currency',
                      key: 'currency',
                      width: 80,
                    },
                  ]"
                  :data-source="goodsDetails"
                  :pagination="false"
                  bordered
                  size="small"
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
                      {{ record.amount?.toFixed(2) || '0.00' }}
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
                    <template v-else-if="column.key === 'currency'">
                      {{ formData.currencyId === 1 ? 'RMB' : 'USD' }}
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
                  <Space>
                    <span><strong>合计</strong></span>
                    <span
                      >发票金额:
                      {{
                        goodsDetails
                          .reduce((sum, item) => sum + (item.amount || 0), 0)
                          .toFixed(2)
                      }}</span
                    >
                    <span
                      >税额:
                      {{
                        goodsDetails
                          .reduce((sum, item) => sum + (item.taxAmount || 0), 0)
                          .toFixed(2)
                      }}</span
                    >
                  </Space>
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
      width="900"
      :footer-style="{ textAlign: 'right' }"
    >
      <Spin :spinning="feeDrawerLoading">
        <!-- 筛选条件 -->
        <Card size="small" style="margin-bottom: 16px" title="筛选条件">
          <Form layout="inline" size="small">
            <Form.Item label="委托编号">
              <Input placeholder="请输入" style="width: 150px" />
            </Form.Item>
            <Form.Item label="主提单号">
              <Input placeholder="请输入" style="width: 150px" />
            </Form.Item>
            <Form.Item label="结算单位">
              <ClientSelect
                v-if="!selectedSettlementId"
                v-model:value="selectedSettlementId"
                placeholder="请选择"
                style="width: 200px"
                @change="loadFeeGroupData"
              />
              <Input
                v-else
                :value="selectedSettlementId"
                disabled
                style="width: 200px"
              />
            </Form.Item>
            <Form.Item label="币别">
              <CurrencySelect
                v-if="selectedCurrencyId === undefined"
                v-model:value="selectedCurrencyId"
                placeholder="请选择"
                style="width: 150px"
                @change="loadFeeGroupData"
              />
              <Input
                v-else
                :value="selectedCurrencyId"
                disabled
                style="width: 150px"
              />
            </Form.Item>
            <Form.Item>
              <Button type="primary" @click="loadFeeGroupData">查询</Button>
            </Form.Item>
          </Form>
        </Card>

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
                  onChange: (selectedRowKeys) =>
                    handleChildSelectionChange(
                      record,
                      selectedRowKeys.map((key) => String(key)),
                    ),
                }"
              >
                <template #bodyCell="{ column, record: childRecord }">
                  <template v-if="column.key === 'appliedAmount'">
                    <InputNumber
                      v-model:value="childRecord.appliedAmount"
                      :min="0"
                      :max="childRecord.remainingInvoiceAmount"
                      :precision="2"
                      style="width: 100%"
                      size="small"
                    />
                  </template>
                </template>
              </Table>
            </template>
          </Table>
        </div>

        <!-- 币别汇率转换 -->
        <Card
          size="small"
          title="币别汇率转换"
          v-if="selectedCurrencyId && selectedCurrencyId !== 1"
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
        </Card>
      </Spin>

      <template #footer>
        <Space>
          <Button @click="drawerVisible = false">取消</Button>
          <Button type="primary" @click="handleSaveFeeSelection">确定</Button>
        </Space>
      </template>
    </Drawer>
  </Page>
</template>
