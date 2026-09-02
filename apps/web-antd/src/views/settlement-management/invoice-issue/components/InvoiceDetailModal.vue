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
  Checkbox,
} from 'ant-design-vue';

import { IconifyIcon } from '@vben/icons';
import {
  getInvoiceIssueDetail,
  removeApplicationsFromInvoiceIssue,
} from '#/api/Invoice/InvoiceIssue';
import NestedDataTable from '#/components/nested-data-table/nested-data-table.vue';

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

// ✅ NestedDataTable 展开行控制
const expandedRowKeys = ref<(string | number)[]>([]);

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

/** ✅ 新增：切换单行选择状态 */
function toggleRowSelection(rowKey: string, checked: boolean) {
  if (checked) {
    if (!selectedRowKeys.value.includes(rowKey)) {
      selectedRowKeys.value = [...selectedRowKeys.value, rowKey];
    }
  } else {
    selectedRowKeys.value = selectedRowKeys.value.filter(
      (key) => key !== rowKey,
    );
  }
}

/** ✅ 新增：切换全选状态 */
function toggleAllSelection(checked: boolean) {
  if (checked) {
    selectedRowKeys.value = filteredData.value.map((record) => record.rowKey);
  } else {
    selectedRowKeys.value = [];
  }
}

/** ✅ 新增：是否全选 */
const isAllSelected = computed(() => {
  if (filteredData.value.length === 0) return false;
  return filteredData.value.every((record) =>
    selectedRowKeys.value.includes(record.rowKey),
  );
});

/** ✅ 新增：是否半选 */
const isIndeterminate = computed(() => {
  const selectedCount = selectedRowKeys.value.length;
  return selectedCount > 0 && selectedCount < filteredData.value.length;
});

/** 加载发票详情数据 */
async function loadInvoiceDetail() {
  if (!props.invoiceIssueId) {
    console.warn('⚠️ 发票ID为空，无法加载详情');
    return;
  }

  loading.value = true;
  try {
    const detail = await getInvoiceIssueDetail(props.invoiceIssueId);
    console.log('✅ 发票详情数据加载成功:', detail);
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
          clientName: item.orderFee?.transportOrder?.client.name || '-', // 委托单位
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
          feeName: item.orderFee?.feeCode?.cnName || '-', // 费用名称
          payReceiveType: item.orderFee?.paySide === 1 ? '应付' : '应收', // 收付
          currencyCode: item.orderFee?.currency?.code || '-', // 币别
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
      rowKey: String(app.id), // NestedDataTable 需要的 rowKey
      parentId: null,
      // 一级字段
      companyName: app.company.displayName || '-',
      orgId: app.orgId,
      applicationNo: app.applicationNo || '-',
      header: app.clientInvoiceInfo?.header || '-',
      currencyCode: app.currency.code || '-',
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
      code: app.code,
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

  // ✅ 使用 Map 来存储合并后的商品明细
  const goodsMap = new Map<string, any>();

  // ✅ 获取发票币别信息
  const invoiceCurrencyId = invoiceDetailData.value?.currencyId || 1;
  console.log('  - 发票币别ID:', invoiceCurrencyId);

  // ✅ 遍历所有剩余的申请，处理商品明细
  remainingApps.forEach((app: any) => {
    if (
      !app.invoiceApplicationGoodsDtls ||
      app.invoiceApplicationGoodsDtls.length === 0
    ) {
      console.warn('⚠️ 申请', app.applicationNo, '没有商品明细数据');
      return;
    }

    // 获取当前申请的币别和汇率信息
    const appCurrencyId = app.currencyId;
    const isAppForeignCurrency = appCurrencyId !== 1; // 1 是人民币

    // 遍历该申请的所有商品明细
    app.invoiceApplicationGoodsDtls.forEach((goods: any) => {
      const goodsName = goods.codeInvoiceName || goods.goodsName || '未知商品';
      const specification = goods.specification || '';
      const unit = goods.unit || '票';
      const quantity = goods.quantity || 0;
      const taxRate = goods.taxRate || 0;

      // ✅ 使用完整的五个字段作为合并键
      const mergeKey = `${goodsName}_${specification}_${unit}_${quantity}_${taxRate}`;

      // ✅ 计算转换后的金额（如果是外币申请，需要乘以汇率）
      let convertedAmount = goods.amount || 0;
      let convertedNoTaxAmount = goods.noTaxAmount || 0;
      let convertedTaxAmount = goods.taxAmount || 0;
      let convertedUnitPrice = goods.unitPrice || 0;

      // 如果申请是外币且发票币别是人民币，需要乘以汇率转换为人民币
      if (isAppForeignCurrency && invoiceCurrencyId === 1) {
        // 申请是外币，发票是人民币：需要乘以汇率转换为人民币
        const exchangeRate = app.invoiceExchangeRate || 1;
        convertedAmount = (goods.amount || 0) * exchangeRate;
        convertedNoTaxAmount = (goods.noTaxAmount || 0) * exchangeRate;
        convertedTaxAmount = (goods.taxAmount || 0) * exchangeRate;
        convertedUnitPrice = (goods.unitPrice || 0) * exchangeRate;

        console.log('💱 外币转人民币:', {
          originalAmount: goods.amount,
          exchangeRate: exchangeRate,
          convertedAmount: convertedAmount,
          appCurrencyId: appCurrencyId,
          invoiceCurrencyId: invoiceCurrencyId,
        });
      } else if (
        isAppForeignCurrency &&
        invoiceCurrencyId !== 1 &&
        appCurrencyId !== invoiceCurrencyId
      ) {
        // 申请是外币A，发票是外币B：这种情况理论上不应该出现
        console.warn('⚠️ 不同外币之间转换，可能存在问题:', {
          appCurrencyId: appCurrencyId,
          invoiceCurrencyId: invoiceCurrencyId,
        });
        // 这种情况暂时不处理，保持原值
      }
      // 其他情况（都是人民币，或者申请币别等于发票币别）：保持原值

      if (goodsMap.has(mergeKey)) {
        // ✅ 已存在完全相同的商品（五个字段都相同），累加金额并重新计算单价
        const existing = goodsMap.get(mergeKey);
        const originalAmount = existing.amount;
        existing.amount += convertedAmount;
        existing.noTaxAmount += convertedNoTaxAmount;
        existing.taxAmount += convertedTaxAmount;

        // ✅ 重新计算单价：单价 = 金额 / 数量
        // 注意：数量应该大于0，避免除零错误
        if (existing.quantity > 0) {
          existing.unitPrice = existing.amount / existing.quantity;
        }

        console.log('  - 合并相同商品:', goodsName, {
          规格型号: specification,
          单位: unit,
          数量: quantity,
          税率: taxRate,
          原金额: originalAmount,
          新增金额: convertedAmount,
          累计金额: existing.amount,
          原单价: originalAmount / (existing.quantity || 1),
          新单价: existing.unitPrice,
        });
      } else {
        // ✅ 商品不完全相同（至少有一个字段不同），添加为新商品
        const newItem = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          codeInvoiceId: goods.codeInvoiceId,
          codeInvoiceName: goodsName,
          specification: specification,
          unit: unit,
          quantity: quantity,
          unitPrice: convertedUnitPrice,
          amount: convertedAmount,
          noTaxAmount: convertedNoTaxAmount,
          taxRate: taxRate,
          taxAmount: convertedTaxAmount,
          remark: goods.remark || '',
        };

        goodsMap.set(mergeKey, newItem);
        console.log(
          '  - 新增商品:',
          goodsName,
          '规格:',
          specification,
          '单位:',
          unit,
          '数量:',
          quantity,
          '税率:',
          taxRate,
          '金额:',
          convertedAmount,
        );
      }
    });
  });

  // ✅ 将 Map 转换为数组
  const mergedGoodsDetails = Array.from(goodsMap.values());

  console.log('  - 合并后商品明细数量:', mergedGoodsDetails.length);
  console.log(
    '  - 合并后总金额:',
    mergedGoodsDetails
      .reduce((sum, item) => sum + (item.amount || 0), 0)
      .toFixed(2),
  );

  if (mergedGoodsDetails.length > 0) {
    console.log('✅ 商品明细重新生成完成');
    return mergedGoodsDetails;
  } else {
    console.warn('⚠️ 没有可合并的商品明细');
    return [];
  }
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
    title: '',
    key: 'seq',
    width: 50,
    align: 'center' as const,
  },
  {
    title: '所属公司',
    dataIndex: 'companyName',
    key: 'companyName',
    minWidth: 120,
    width: 120,
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
    width: 180,
    ellipsis: true,
  },
  {
    title: '申请人',
    dataIndex: 'applyUserName',
    key: 'applyUserName',
    minWidth: 80,
    width: 80,
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

<style scoped>
.table-sequence-cell {
  display: flex;
  gap: 10px;
  align-items: center;
}

.expand-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  min-width: 14px;
  line-height: 1;
  transform-origin: center;
  transition: transform 0.15s ease;
}

.expand-toggle--expanded {
  transform: rotate(90deg);
}

/* 统计信息样式 */
.statistics-container {
  padding: 0;
  margin-top: 16px;
}

.statistics-card {
  display: flex;
  gap: 12px;
  align-items: center;
  height: 38px;
  max-height: 48px;
  padding: 8px 12px;
  background: linear-gradient(135deg, #f8f9fa 0%, #fff 100%);
  border: 1px solid #e9ecef;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgb(0 0 0 / 8%);
}

.stats-icon {
  font-size: 16px;
  color: #1890ff;
}

.statistics-title {
  margin-right: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #1890ff;
}

.statistic-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 30px;
  padding: 4px 8px;
  background: white;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgb(0 0 0 / 5%);
}

.statistic-item.primary {
  border-left: 2px solid #1890ff;
}

.statistic-item.success {
  border-left: 2px solid #52c41a;
}

.statistic-label {
  margin-right: 4px;
  font-size: 11px;
  font-weight: 500;
  color: #6c757d;
}

.statistic-value {
  font-size: 14px;
  font-weight: 700;
  line-height: 1.2;
  color: #212529;
}
</style>

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
      <NestedDataTable
        v-else
        :columns="parentColumns"
        :data-source="filteredData"
        fill-height
        :inner-columns="childColumns"
        inner-data-key="invoiceApplicationItems"
        inner-row-key="id"
        row-key="rowKey"
        :loading="loading"
        v-model:expanded-row-keys="expandedRowKeys"
      >
        <template #outerHeaderCell="{ column }">
          <span v-if="column.key === 'seq'" class="table-sequence-cell">
            <Checkbox
              :checked="isAllSelected"
              :indeterminate="isIndeterminate"
              @change="(e) => toggleAllSelection(e.target.checked)"
            />
            {{ column.title }}
          </span>
          <template v-else>{{ column.title }}</template>
        </template>

        <template #outerBodyCell="{ column, record, index }">
          <template v-if="column.key === 'seq'">
            <span class="table-sequence-cell">
              <Checkbox
                :checked="selectedRowKeys.includes(record.rowKey)"
                @change="
                  (e) => toggleRowSelection(record.rowKey, e.target.checked)
                "
              />
              {{ index + 1 }}
            </span>
          </template>
          <template v-else-if="column.key === 'invoiceType'">
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
          <template v-else>
            {{ column.dataIndex ? record[column.dataIndex] : '' }}
          </template>
        </template>

        <template #expandColumnTitle></template>
        <template #expandIcon="{ expanded, record, onExpand }">
          <span
            class="expand-toggle cursor-pointer"
            :class="{ 'expand-toggle--expanded': expanded }"
            @click="
              (e) => {
                e.stopPropagation();
                onExpand(record, e);
              }
            "
          >
            &#9654;
          </span>
        </template>

        <template #innerBodyCell="{ column, record: childRecord }">
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
          <template v-else>
            {{ column.dataIndex ? childRecord[column.dataIndex] : '' }}
          </template>
        </template>
      </NestedDataTable>

      <!-- 底部统计信息 -->
      <div
        v-if="filteredData && filteredData.length > 0"
        class="statistics-container"
      >
        <div class="statistics-card">
          <IconifyIcon
            icon="ant-design:bar-chart-outlined"
            class="stats-icon"
          />
          <span class="statistics-title">统计信息：</span>
          <div class="statistic-item primary">
            <span class="statistic-label">发票数量</span>
            <span class="statistic-value">{{ filteredData.length }}</span>
          </div>
          <div class="statistic-item success">
            <span class="statistic-label">开票总金额</span>
            <span class="statistic-value">
              {{
                filteredData
                  .reduce((sum, item) => sum + (item.invoiceAmount || 0), 0)
                  .toFixed(2)
              }}
            </span>
          </div>
        </div>
      </div>
    </Spin>
  </Modal>
</template>
