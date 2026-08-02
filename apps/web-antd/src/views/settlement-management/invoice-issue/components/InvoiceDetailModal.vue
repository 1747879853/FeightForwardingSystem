<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import dayjs from 'dayjs';

import {
  Button,
  Input,
  message,
  Modal,
  Space,
  Spin,
  Table,
} from 'ant-design-vue';

import { IconifyIcon } from '@vben/icons';
import {
  getInvoiceIssueDetail,
  removeApplicationsFromInvoiceIssue,
} from '#/api/Invoice/InvoiceIssue';

interface Props {
  visible: boolean;
  invoiceIssueId?: string; // 发票开出ID
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  invoiceIssueId: '',
});

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'refresh'): void; // 刷新事件
  (e: 'update-goods-details', goodsDetails: any[]): void; // ✅ 新增：更新商品明细
}>();

// 弹窗显示状态
const modalVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
});

// 加载状态
const loading = ref(false);

// 搜索条件
const searchKeyword = ref<string>(''); // 搜索关键词（申请单号/委托编号/主提单号）

// 选中的行 keys
const selectedRowKeys = ref<string[]>([]);

// 发票详情数据
const invoiceDetailData = ref<any>(null);

// 申请组数据（从 invoiceIssueApplications 转换而来）
const applicationGroupsData = ref<any[]>([]);

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

/** 加载发票详情数据 */
async function loadInvoiceDetail() {
  if (!props.invoiceIssueId) {
    console.warn('⚠️ 发票ID为空，无法加载详情');
    return;
  }

  loading.value = true;
  try {
    const detail = await getInvoiceIssueDetail(props.invoiceIssueId);
    invoiceDetailData.value = detail;

    // ✅ 将 invoiceIssueApplications 转换为与抽屉相同的数据结构
    if (
      detail.invoiceIssueApplications &&
      detail.invoiceIssueApplications.length > 0
    ) {
      applicationGroupsData.value = transformToTreeData(
        detail.invoiceIssueApplications,
      );
      console.log(
        '✅ 发票详情数据加载成功，申请组数量:',
        applicationGroupsData.value.length,
      );
    } else {
      applicationGroupsData.value = [];
      console.log('⚠️ 发票详情中无申请数据');
    }
  } catch (error) {
    console.error('❌ 加载发票详情失败:', error);
    message.error('加载发票详情失败');
  } finally {
    loading.value = false;
  }
}

/** 将申请数据转换为树状结构（与 FeeSelectionDrawerForIssue 保持一致） */
function transformToTreeData(applications: any[]): any[] {
  const treeData: any[] = [];

  applications.forEach((app) => {
    const childrenList: any[] = [];

    if (app.invoiceApplicationItems && app.invoiceApplicationItems.length > 0) {
      app.invoiceApplicationItems.forEach((item: any, index: number) => {
        const childNode: any = {
          id: item.id,
          parentId: app.id,
          orderFee: item.orderFee,
          appliedAmount: item.appliedAmount,
          checked: false,
          disabled: true, // ✅ 二级数据禁用选择，只做展示
          // 二级字段
          sequenceNumber: index + 1, // ✅ 序号从1开始
          commissionNum: item.orderFee?.transportOrder?.commissionNum || '-', // 委托编号
          mblNum: item.orderFee?.transportOrder?.mblNum || '-', // 主提单号
          hblNum: '-', // 分提单号（需要从其他地方获取）
          clientName: item.orderFee?.transportOrder?.clientName || '-', // 委托单位
          etd: (() => {
            const etdValue = item.orderFee?.transportOrder?.etd;
            if (!etdValue) return '-';
            try {
              return dayjs(etdValue).format('YYYY-MM-DD');
            } catch (error) {
              console.error('开船日期格式化失败:', error);
              return etdValue;
            }
          })(), // 开船日期（只保留年月日）
          feeName: item.orderFee?.feeCodeName || '-', // 费用名称
          payReceiveType: item.orderFee?.paySide === 1 ? '应付' : '应收', // 收付
          currencyCode: item.orderFee?.currencyCode || '-', // 币别
          amount: item.orderFee?.amount || 0, // 金额
          exchangeRate: 1, // 汇率
          salesPerson: '-', // 销售
          invoiceCurrencyCode: app.currencyCode || '-', // 发票币别
          appliedAmountOriginal: item.appliedAmount || 0, // 开票申请金额（原币）
          settlementAmount: 0, // 结算金额
        };

        childrenList.push(childNode);
      });
    }

    // ✅ 格式化申请日期
    let formattedApplyTime = '-';
    if (app.applyTime) {
      try {
        formattedApplyTime = dayjs(app.applyTime).format('YYYY-MM-DD HH:mm:ss');
      } catch (error) {
        console.error('日期格式化失败:', error);
        formattedApplyTime = app.applyTime;
      }
    }

    // ✅ 从子节点中提取委托编号和主提单号（去重）
    const commissionNums = new Set<string>();
    const mblNums = new Set<string>();

    if (app.invoiceApplicationItems && app.invoiceApplicationItems.length > 0) {
      app.invoiceApplicationItems.forEach((item: any) => {
        const commissionNum = item.orderFee?.transportOrder?.commissionNum;
        const mblNum = item.orderFee?.transportOrder?.mblNum;

        if (commissionNum) {
          commissionNums.add(commissionNum);
        }
        if (mblNum) {
          mblNums.add(mblNum);
        }
      });
    }

    const parentNode: any = {
      id: app.id,
      parentId: null,
      // 一级字段
      companyName: app.companyName || '-',
      orgId: app.orgId,
      applicationNo: app.applicationNo || '-',
      header: app.clientInvoiceInfo?.header || '-',
      currencyCode: app.currencyCode || '-',
      remark: app.remark || '-',
      applyUserName: app.applyUserName || '-',
      applyTime: formattedApplyTime,
      require: app.require || '-',
      invoiceRemark: '-',
      invoiceType: app.invoiceType || '-',
      invoiceExchangeRate: app.invoiceExchangeRate || 1.0,
      totalAppliedAmount: app.totalAppliedAmount || 0,
      invoiceAmount:
        (app.totalAppliedAmount || 0) * (app.invoiceExchangeRate || 1.0),
      checked: false,
      selectable: true,
      invoiceApplicationItems: childrenList,
      invoiceApplicationGoodsDtls: app.invoiceApplicationGoodsDtls || [],
      commissionNum: Array.from(commissionNums).join('、') || '-',
      mblNum: Array.from(mblNums).join('、') || '-',
      // 保留原始数据
      settlementId: app.settlementId,
      currencyId: app.currencyId,
      clientInvoiceBankId: app.clientInvoiceBankId,
      orgBankAccountId: app.orgBankAccountId,
      totalGoodsAmount: app.totalGoodsAmount,
      appliedAmountRmb: app.appliedAmountRmb,
      amountMatched: app.amountMatched,
      clientInvoiceInfo: app.clientInvoiceInfo,
    };

    treeData.push(parentNode);
  });

  return treeData;
}

/** 过滤后的数据 */
const filteredData = computed(() => {
  const data = applicationGroupsData.value;

  if (!searchKeyword.value) {
    return data;
  }

  const keyword = searchKeyword.value.toLowerCase();

  // 递归过滤树状数据
  function filterTree(items: any[]): any[] {
    return items
      .map((item) => {
        // 检查父节点是否匹配
        const parentMatch =
          (item.applicationNo &&
            item.applicationNo.toLowerCase().includes(keyword)) ||
          (item.commissionNum &&
            item.commissionNum.toLowerCase().includes(keyword)) ||
          (item.mblNum && item.mblNum.toLowerCase().includes(keyword));

        // 过滤子节点
        let filteredChildren = item.invoiceApplicationItems || [];
        if (
          item.invoiceApplicationItems &&
          item.invoiceApplicationItems.length > 0
        ) {
          filteredChildren = item.invoiceApplicationItems.filter(
            (child: any) => {
              return (
                (child.commissionNum &&
                  child.commissionNum.toLowerCase().includes(keyword)) ||
                (child.mblNum &&
                  child.mblNum.toLowerCase().includes(keyword)) ||
                (child.hblNum &&
                  child.hblNum.toLowerCase().includes(keyword)) ||
                (child.clientName &&
                  child.clientName.toLowerCase().includes(keyword)) ||
                (child.feeName && child.feeName.toLowerCase().includes(keyword))
              );
            },
          );
        }

        // 如果父节点匹配或子节点有匹配项，则保留该节点
        if (parentMatch || filteredChildren.length > 0) {
          return {
            ...item,
            invoiceApplicationItems: filteredChildren,
          };
        }

        return null;
      })
      .filter(Boolean) as any[];
  }

  return filterTree(data);
});

/** 获取所有选中的申请ID（包括父节点和子节点） */
function getSelectedApplicationIds(): string[] {
  const allItems = flattenTreeData(applicationGroupsData.value);
  const selectedIds: string[] = [];

  selectedRowKeys.value.forEach((key) => {
    const item = allItems.find((i) => i.id === key);
    if (item) {
      // 如果是父节点（一级），添加父节点ID
      if (!item.parentId) {
        selectedIds.push(String(item.id));
      } else {
        // 如果是子节点（二级），添加其父节点ID
        selectedIds.push(String(item.parentId));
      }
    }
  });

  // 去重
  return Array.from(new Set(selectedIds));
}

/** 重新生成商品明细（基于剩余的申请） */
async function regenerateGoodsDetails(appsToDelete: string[]): Promise<any[]> {
  console.log('🔄 开始重新生成商品明细...');
  console.log('  - 要删除的申请ID:', appsToDelete);
  console.log('  - 当前申请总数:', applicationGroupsData.value.length);

  // ✅ 过滤掉要删除的申请，获取剩余的申请
  const remainingApps = applicationGroupsData.value.filter(
    (app: any) => !appsToDelete.includes(String(app.id)),
  );

  console.log('  - 剩余申请数量:', remainingApps.length);

  if (remainingApps.length === 0) {
    // 如果没有剩余申请，返回空数组
    console.log('✅ 无剩余申请，返回空商品明细');
    return [];
  }

  // ✅ 关键修复：不再依赖申请中的 invoiceApplicationGoodsDtls，而是基于剩余申请的总金额重新计算
  let totalAppliedAmount = 0; // 总申请金额（原币）
  let totalRmbAmount = 0; // 总申请金额（人民币）

  remainingApps.forEach((app: any) => {
    // 累加申请金额（原币）
    const appliedAmount = app.totalAppliedAmount || 0;
    const invoiceExchangeRate = app.invoiceExchangeRate || 1;

    totalAppliedAmount += appliedAmount;
    // ✅ 修复：乘以开票汇率，转换为人民币金额
    totalRmbAmount += appliedAmount * invoiceExchangeRate;
  });

  console.log('  - 剩余申请总金额（原币）:', totalAppliedAmount.toFixed(2));
  console.log('  - 剩余申请总金额（人民币）:', totalRmbAmount.toFixed(2));

  if (totalRmbAmount === 0) {
    console.log('✅ 申请总金额为0，返回空商品明细');
    return [];
  }

  // ✅ 基于剩余申请的总金额，生成一条商品明细
  // 取第一个申请的商品明细作为模板（如果有的话）
  let templateGoods: any = null;

  for (const app of remainingApps) {
    if (
      app.invoiceApplicationGoodsDtls &&
      app.invoiceApplicationGoodsDtls.length > 0
    ) {
      templateGoods = app.invoiceApplicationGoodsDtls[0];
      break;
    }
  }

  // 如果没有模板，使用默认值
  if (!templateGoods) {
    console.log('⚠️ 没有找到商品明细模板，使用默认值');
    templateGoods = {
      codeInvoiceId: null,
      specification: '',
      unit: '票',
      quantity: 1,
      taxRate: 0,
    };
  }

  const taxRate = templateGoods.taxRate || 0;
  const amount = totalRmbAmount; // ✅ 修复：商品明细金额 = 申请总金额（人民币）
  const noTaxAmount = amount / (1 + taxRate / 100);
  const taxAmount = noTaxAmount * (taxRate / 100);
  const unitPrice = amount / (templateGoods.quantity || 1);

  const result = [
    {
      codeInvoiceId: templateGoods.codeInvoiceId,
      specification: templateGoods.specification || '',
      unit: templateGoods.unit || '票',
      quantity: templateGoods.quantity || 1,
      unitPrice: unitPrice,
      amount: amount,
      noTaxAmount: noTaxAmount,
      taxRate: taxRate,
      taxAmount: taxAmount,
      remark: '',
    },
  ];

  console.log('✅ 基于申请总金额重新生成商品明细:', {
    申请总金额原币: totalAppliedAmount.toFixed(2),
    开票汇率: remainingApps[0]?.invoiceExchangeRate || 1,
    申请总金额人民币: totalRmbAmount.toFixed(2),
    商品明细金额: amount.toFixed(2),
    税率: taxRate,
    不含税金额: noTaxAmount.toFixed(2),
    税额: taxAmount.toFixed(2),
  });

  // ✅ 验证：确保开票金额等于申请金额（人民币）
  const invoiceAmount = result.reduce(
    (sum, item) => sum + (item.amount || 0),
    0,
  );
  const difference = Math.abs(invoiceAmount - totalRmbAmount);

  if (difference > 0.01) {
    console.warn('⚠️ 警告：开票金额与申请金额不一致！');
    console.warn('  - 开票金额:', invoiceAmount.toFixed(2));
    console.warn('  - 申请金额（人民币）:', totalRmbAmount.toFixed(2));
    console.warn('  - 差异:', difference.toFixed(2));
  } else {
    console.log('✅ 验证通过：开票金额等于申请金额（人民币）');
  }

  console.log('✅ 商品明细重新生成完成，共', result.length, '条');
  return result;
}

/** 删除选中的发票（真删除） */
async function handleDeleteSelected() {
  const selectedIds = getSelectedApplicationIds();

  if (selectedIds.length === 0) {
    message.warning('请先选择要删除的发票');
    return;
  }

  Modal.confirm({
    title: '确认删除',
    content: `确定要从发票中移除选中的 ${selectedIds.length} 条申请吗？此操作将立即生效。`,
    okText: '确定',
    cancelText: '取消',
    okType: 'danger',
    onOk: async () => {
      try {
        loading.value = true;

        // ✅ 先根据剩余申请重新生成商品明细
        const newGoodsDetails = await regenerateGoodsDetails(selectedIds);

        console.log('📦 准备调用删除API:', {
          invoiceIssueId: props.invoiceIssueId,
          删除的申请数量: selectedIds.length,
          剩余商品明细数量: newGoodsDetails.length,
        });

        // ✅ 调用真删除 API
        await removeApplicationsFromInvoiceIssue({
          id: props.invoiceIssueId,
          invoiceApplicationIds: selectedIds,
          invoiceIssueGoodsDtls: newGoodsDetails, // ✅ 传递剩余申请的商品明细
        });

        message.success(`已成功移除 ${selectedIds.length} 条申请`);

        // 清空选中状态
        selectedRowKeys.value = [];

        // ✅ 通知父组件更新商品明细（使用删除时生成的新商品明细）
        emit('update-goods-details', newGoodsDetails);
        console.log(
          '✅ 已通知父组件更新商品明细:',
          newGoodsDetails.length,
          '条',
        );

        // ✅ 重新加载数据（会自动更新 applicationGroupsData）
        await loadInvoiceDetail();

        // ✅ 通知父组件刷新
        emit('refresh');
      } catch (error) {
        console.error('❌ 删除申请失败:', error);
        message.error('删除申请失败，请重试');
      } finally {
        loading.value = false;
      }
    },
  });
}

/** 重置搜索 */
function handleResetSearch() {
  searchKeyword.value = '';
  selectedRowKeys.value = [];
}

// 表格列定义（一级 - 开票申请）
const parentColumns = [
  {
    title: '所属公司',
    dataIndex: 'companyName',
    key: 'companyName',
    minWidth: 100,
    width: 100,
    ellipsis: true,
  },
  {
    title: '申请单号',
    dataIndex: 'applicationNo',
    key: 'applicationNo',
    width: 120,
    ellipsis: true,
  },
  {
    title: '发票抬头',
    dataIndex: 'header',
    key: 'header',
    width: 120,
    ellipsis: true,
  },
  {
    title: '币别',
    dataIndex: 'currencyCode',
    key: 'currencyCode',
    minWidth: 60,
    width: 60,
    ellipsis: true,
  },
  {
    title: '备注',
    dataIndex: 'remark',
    key: 'remark',
    width: 80,
    ellipsis: true,
  },
  {
    title: '申请人',
    dataIndex: 'applyUserName',
    key: 'applyUserName',
    minWidth: 70,
    width: 70,
    ellipsis: true,
  },
  {
    title: '申请日期',
    dataIndex: 'applyTime',
    key: 'applyTime',
    minWidth: 130,
    width: 130,
    ellipsis: true,
  },
  {
    title: '开票要求',
    dataIndex: 'require',
    key: 'require',
    minWidth: 80,
    width: 80,
    ellipsis: true,
  },
  {
    title: '发票类型',
    dataIndex: 'invoiceType',
    key: 'invoiceType',
    minWidth: 90,
    width: 90,
    ellipsis: true,
  },
  {
    title: '开票汇率',
    dataIndex: 'invoiceExchangeRate',
    key: 'invoiceExchangeRate',
    minWidth: 70,
    width: 70,
    align: 'right' as const,
  },
  {
    title: '开票原币金额',
    dataIndex: 'totalAppliedAmount',
    key: 'totalAppliedAmount',
    minWidth: 95,
    width: 95,
    align: 'right' as const,
  },
  {
    title: '开票金额',
    dataIndex: 'invoiceAmount',
    key: 'invoiceAmount',
    minWidth: 85,
    width: 85,
    align: 'right' as const,
  },
];

// 表格列定义（二级 - 费用明细）
const childColumns = [
  {
    title: '序号',
    dataIndex: 'sequenceNumber',
    key: 'sequenceNumber',
    minWidth: 45,
    width: 45,
    align: 'center' as const,
  },
  {
    title: '委托编号',
    dataIndex: 'commissionNum',
    key: 'commissionNum',
    width: 75,
    ellipsis: true,
  },
  {
    title: '主提单号',
    dataIndex: 'mblNum',
    key: 'mblNum',
    minWidth: 95,
    width: 95,
    ellipsis: true,
  },
  // {
  //   title: '分提单号',
  //   dataIndex: 'hblNum',
  //   key: 'hblNum',
  //   minWidth: 95,
  //   width: 95,
  //   ellipsis: true,
  // },
  {
    title: '委托单位',
    dataIndex: 'clientName',
    key: 'clientName',
    minWidth: 110,
    width: 110,
    ellipsis: true,
  },
  {
    title: '开船日期',
    dataIndex: 'etd',
    key: 'etd',
    minWidth: 90,
    width: 90,
    ellipsis: true,
  },
  {
    title: '费用名称',
    dataIndex: 'feeName',
    key: 'feeName',
    width: 90,
    ellipsis: true,
  },
  {
    title: '收付',
    dataIndex: 'payReceiveType',
    key: 'payReceiveType',
    minWidth: 50,
    width: 50,
    align: 'center' as const,
  },
  {
    title: '币别',
    dataIndex: 'currencyCode',
    key: 'currencyCode',
    minWidth: 55,
    width: 55,
    align: 'center' as const,
  },
  {
    title: '金额',
    dataIndex: 'amount',
    key: 'amount',
    minWidth: 60,
    width: 60,
    align: 'right' as const,
  },
  {
    title: '汇率',
    dataIndex: 'exchangeRate',
    key: 'exchangeRate',
    minWidth: 55,
    width: 55,
    align: 'right' as const,
  },
  // {
  //   title: '销售',
  //   dataIndex: 'salesPerson',
  //   key: 'salesPerson',
  //   minWidth: 70,
  //   width: 70,
  // },
  // {
  //   title: '发票币别',
  //   dataIndex: 'invoiceCurrencyCode',
  //   key: 'invoiceCurrencyCode',
  //   minWidth: 70,
  //   width: 70,
  //   align: 'center' as const,
  // },
  {
    title: '申请金额',
    dataIndex: 'appliedAmountOriginal',
    key: 'appliedAmountOriginal',
    minWidth: 80,
    width: 80,
    align: 'right' as const,
  },
  {
    title: '结算金额',
    dataIndex: 'settlementAmount',
    key: 'settlementAmount',
    minWidth: 80,
    width: 80,
    align: 'right' as const,
  },
];

/** 格式化发票类型显示 */
function getInvoiceTypeText(invoiceType: string | number): string {
  const typeMap: Record<string, string> = {
    p: '普通发票(电票)',
    c: '普通发票(纸票)',
    s: '专用发票',
  };
  return typeMap[String(invoiceType)] || String(invoiceType);
}

// ✅ 监听弹窗打开，加载数据
watch(
  () => props.visible,
  (newVal) => {
    if (newVal && props.invoiceIssueId) {
      loadInvoiceDetail();
    }
  },
);

// ✅ 暴露方法给父组件
defineExpose({
  loadInvoiceDetail,
});
</script>

<template>
  <Modal
    v-model:open="modalVisible"
    title="查看发票明细"
    width="1600px"
    :footer="null"
    :body-style="{ padding: '16px', maxHeight: '70vh', overflow: 'auto' }"
  >
    <Spin :spinning="loading">
      <!-- 搜索和操作区 -->
      <div
        style="
          padding: 12px;
          margin-bottom: 16px;
          background: #fafafa;
          border: 1px solid #d9d9d9;
          border-radius: 4px;
        "
      >
        <div
          style="
            display: flex;
            align-items: center;
            justify-content: space-between;
          "
        >
          <Space>
            <div style="display: flex; gap: 8px; align-items: center">
              <span style="font-size: 14px; color: #333">搜索:</span>
              <Input
                v-model:value="searchKeyword"
                placeholder="申请单号/委托编号/主提单号"
                style="width: 300px"
                allow-clear
              />
            </div>
            <Button @click="handleResetSearch">
              <template #icon>
                <IconifyIcon icon="ant-design:reload-outlined" />
              </template>
              重置
            </Button>
          </Space>
          <Space>
            <Button
              danger
              :disabled="selectedRowKeys.length === 0"
              @click="handleDeleteSelected"
            >
              <template #icon>
                <IconifyIcon icon="ant-design:delete-outlined" />
              </template>
              删除选中 ({{ selectedRowKeys.length }})
            </Button>
          </Space>
        </div>
      </div>

      <!-- 空状态提示 -->
      <div
        v-if="!filteredData || filteredData.length === 0"
        style="padding: 40px; color: #999; text-align: center"
      >
        <IconifyIcon
          icon="ant-design:inbox-outlined"
          style="margin-bottom: 16px; font-size: 48px"
        />
        <div>暂无发票明细数据</div>
      </div>

      <!-- 树状表格 -->
      <Table
        v-else
        :columns="parentColumns"
        :data-source="filteredData"
        :pagination="false"
        bordered
        size="small"
        row-key="id"
        :row-selection="{
          selectedRowKeys: selectedRowKeys,
          onChange: (keys) => {
            selectedRowKeys = keys.map(String);
          },
          type: 'checkbox',
          preserveSelectedRowKeys: true,
        }"
        :scroll="{ x: 1075, y: 400 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'invoiceType'">
            {{ getInvoiceTypeText(record.invoiceType) }}
          </template>
          <template v-else-if="column.key === 'applyTime'">
            {{ record.applyTime || '-' }}
          </template>
          <template v-else-if="column.key === 'totalAppliedAmount'">
            {{ (record.totalAppliedAmount || 0).toFixed(2) }}
          </template>
          <template v-else-if="column.key === 'invoiceAmount'">
            {{ (record.invoiceAmount || 0).toFixed(2) }}
          </template>
          <template v-else-if="column.key === 'invoiceExchangeRate'">
            {{ record.invoiceExchangeRate || 1.0 }}
          </template>
        </template>

        <!-- 展开行模板（二级费用明细） -->
        <template #expandedRowRender="{ record }">
          <Table
            v-if="
              record.invoiceApplicationItems &&
              record.invoiceApplicationItems.length > 0
            "
            :columns="childColumns"
            :data-source="record.invoiceApplicationItems"
            :pagination="false"
            bordered
            size="small"
            row-key="id"
            :show-header="true"
          >
            <template #bodyCell="{ column, record: childRecord }">
              <template v-if="column.key === 'payReceiveType'">
                {{ childRecord.payReceiveType || '-' }}
              </template>
              <template v-else-if="column.key === 'amount'">
                {{ (childRecord.amount || 0).toFixed(2) }}
              </template>
              <template v-else-if="column.key === 'appliedAmountOriginal'">
                {{ (childRecord.appliedAmountOriginal || 0).toFixed(2) }}
              </template>
              <template v-else-if="column.key === 'settlementAmount'">
                {{ (childRecord.settlementAmount || 0).toFixed(2) }}
              </template>
            </template>
          </Table>
          <div v-else style="padding: 20px; color: #999; text-align: center">
            暂无费用明细
          </div>
        </template>
      </Table>

      <!-- 底部统计信息 -->
      <div
        v-if="filteredData && filteredData.length > 0"
        style="
          padding: 12px;
          margin-top: 16px;
          background: rgb(24 144 255 / 5%);
          border-radius: 4px;
        "
      >
        <Space :size="24">
          <span style="font-weight: bold; color: #1890ff">统计信息</span>
          <span>发票数量: {{ filteredData.length }}</span>
          <span>
            开票总金额:
            {{
              filteredData
                .reduce((sum, item) => sum + (item.invoiceAmount || 0), 0)
                .toFixed(2)
            }}
          </span>
        </Space>
      </div>
    </Spin>
  </Modal>
</template>
