import { message, Modal } from 'ant-design-vue';
import type { Ref } from 'vue';
import { getCurrencyDetail } from '#/api/system/base-data/currency-admin';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
/**
 * 商品明细管理相关逻辑
 */
export function useGoodsDetails(
  goodsDetails: Ref<any[]>,
  codeInvoiceList: Ref<any[]>,
  formData: Ref<any>,
  invoiceExchangeRate: Ref<number>,
  flattenTreeData: (data: any[]) => any[],
  feeGroupsData?: Ref<any[]>, // ✅ 新增：费用组数据
) {
  /**
   * 项目名称变化
   */
  function handleGoodsNameChange(record: any, index: number) {
    const selectedItem = codeInvoiceList.value.find(
      (item) => item.id === record.codeInvoiceId,
    );

    if (selectedItem) {
      goodsDetails.value[index] = {
        ...record,
        specification: selectedItem.specification || '',
        unit: selectedItem.unit || '票',
        taxRate: selectedItem.taxRate || 0,
      };

      const updatedRecord = goodsDetails.value[index];
      const taxRate = updatedRecord.taxRate || 0;
      updatedRecord.noTaxAmount = updatedRecord.amount / (1 + taxRate / 100);
      updatedRecord.taxAmount =
        (updatedRecord.amount / (1 + taxRate / 100)) * (taxRate / 100);
    }
  }

  /**
   * 数量或单价变化
   */
  function handleQuantityOrPriceChange(record: any) {
    record.amount = (record.quantity || 0) * (record.unitPrice || 0);
    const taxRate = record.taxRate || 0;
    record.noTaxAmount = record.amount / (1 + taxRate / 100);
    record.taxAmount = (record.amount / (1 + taxRate / 100)) * (taxRate / 100);
  }

  /**
   * 金额变化（用户手动修改）
   */
  function handleAmountChange(record: any) {
    const quantity = record.quantity || 1;
    if (quantity > 0) {
      record.unitPrice = record.amount / quantity;
    }

    const taxRate = record.taxRate || 0;
    record.noTaxAmount = record.amount / (1 + taxRate / 100);
    record.taxAmount = (record.amount / (1 + taxRate / 100)) * (taxRate / 100);
  }

  /**
   * 税率变化
   */
  function handleTaxRateChange(record: any) {
    const taxRate = Number(record.taxRate) || 0;
    record.taxRate = taxRate;

    const amount = record.amount || 0;
    record.noTaxAmount = amount / (1 + taxRate / 100);
    record.taxAmount = (amount / (1 + taxRate / 100)) * (taxRate / 100);
  }

  /**
   * 添加商品明细行
   */
  function handleAddGoodsRow(index?: number) {
    const items = formData.value.invoiceApplicationItems || [];

    if (items.length === 0) {
      message.warning('请先从抽屉中添加费用,然后再添加商品明细');
      return;
    }

    const newRow = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
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
    };

    if (index !== undefined && index >= 0) {
      goodsDetails.value.splice(index + 1, 0, newRow);
    } else {
      goodsDetails.value.push(newRow);
    }
  }

  /**
   * 删除商品明细行
   */
  function handleDeleteGoodsRow(index: number) {
    goodsDetails.value.splice(index, 1);
  }

  /**
   * 删除选中的商品明细行
   */
  function handleDeleteSelectedGoodsRows(selectedGoodsRows: string[]) {
    if (selectedGoodsRows.length === 0) {
      message.warning('请先选择要删除的行');
      return;
    }

    const deleteCount = selectedGoodsRows.length;

    goodsDetails.value = goodsDetails.value.filter(
      (item) => !selectedGoodsRows.includes(item.id),
    );

    message.success(`已删除 ${deleteCount} 行`);
  }

  /**
   * 自动填充商品明细
   */
  async function autoFillGoodsDetails(selectedFees: any[]) {
    if (codeInvoiceList.value.length === 0) {
      await loadCodeInvoiceList();
    }

    const invoiceCurrencyId = formData.value.currencyId;
    if (!invoiceCurrencyId) {
      message.warning('请先选择发票币别');
      return;
    }

    let currencyCode = '';
    try {
      const currencyDetail = await getCurrencyDetail(invoiceCurrencyId);
      currencyCode = currencyDetail.code || '';
    } catch (error) {
      console.error('获取币别详情失败:', error);
      message.warning('获取币别信息失败');
      return;
    }

    if (!currencyCode) {
      message.warning('未找到币别信息，请手动添加商品明细');
      return;
    }

    const defaultCodeInvoice = codeInvoiceList.value.find(
      (item) => item.isDefault && item.defaultCurrency === currencyCode,
    );

    if (!defaultCodeInvoice) {
      message.warning(`未找到币别 ${currencyCode} 对应的默认商品编码，请手动添加`);
      return;
    }

    // 计算所有选中费用的总金额（转换为人民币）
    let totalRmbAmount = 0;

    selectedFees.forEach((fee: any) => {
      const appliedAmount = fee.appliedAmount || 0;
      const feeCurrencyId = fee.orderFee.currencyId;

      if (feeCurrencyId !== 1) {
        const convertedAmount = appliedAmount * (invoiceExchangeRate.value || 1);
        totalRmbAmount += convertedAmount;
      } else {
        totalRmbAmount += appliedAmount;
      }
    });

    const taxRate = defaultCodeInvoice.taxRate || 0;

    const item = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      codeInvoiceId: defaultCodeInvoice.id,
      specification: defaultCodeInvoice.specification || '',
      unit: defaultCodeInvoice.unit || '票',
      quantity: 1,
      unitPrice: totalRmbAmount,
      amount: totalRmbAmount,
      noTaxAmount: totalRmbAmount / (1 + taxRate / 100),
      taxRate: taxRate,
      taxAmount: (totalRmbAmount / (1 + taxRate / 100)) * (taxRate / 100),
      remark: '',
    };

    goodsDetails.value.push(item);
  }

  /**
   * ✅ 修改：将新费用金额合并到现有商品明细
   * 注意：这个函数现在改为基于所有费用重新计算，而不是累加
   */
  async function mergeAmountToExistingGoods(selectedFees: any[]) {
    if (goodsDetails.value.length !== 1) {
      return;
    }

    if (codeInvoiceList.value.length === 0) {
      await loadCodeInvoiceList();
    }

    const invoiceCurrencyId = formData.value.currencyId;
    if (!invoiceCurrencyId) {
      message.warning('请先选择发票币别');
      return;
    }

    let currencyCode = '';
    try {
      const currencyDetail = await getCurrencyDetail(invoiceCurrencyId);
      currencyCode = currencyDetail.code || '';
    } catch (error) {
      console.error('获取币别详情失败:', error);
      message.warning('获取币别信息失败');
      return;
    }

    if (!currencyCode) {
      message.warning('未找到币别信息，无法合并金额');
      return;
    }

    const defaultCodeInvoice = codeInvoiceList.value.find(
      (item) => item.isDefault && item.defaultCurrency === currencyCode,
    );

    if (!defaultCodeInvoice) {
      message.warning(`未找到币别 ${currencyCode} 对应的默认商品编码，无法合并`);
      return;
    }

    // ✅ 关键修改：从 formData.invoiceApplicationItems 中获取所有费用，而不是只计算新费用
    const items = formData.value.invoiceApplicationItems || [];
    let totalRmbAmount = 0;
    const allFees = flattenTreeData(feeGroupsData.value);

    items.forEach((item: any) => {
      const fee = allFees.find((f: any) => f.orderFee?.id === item.orderFeeId);
      if (fee) {
        const appliedAmount = item.appliedAmount || 0;
        const feeCurrencyId = fee.orderFee.currencyId;

        if (feeCurrencyId !== 1) {
          const convertedAmount = appliedAmount * (invoiceExchangeRate.value || 1);
          totalRmbAmount += convertedAmount;
        } else {
          totalRmbAmount += appliedAmount;
        }
      }
    });

    const existingItem = goodsDetails.value[0];

    if (existingItem.codeInvoiceId !== defaultCodeInvoice.id) {
      message.warning('现有商品明细与当前币别不匹配，请手动处理或重新填充');
      return;
    }

    const taxRate = existingItem.taxRate || defaultCodeInvoice.taxRate || 0;

    // ✅ 关键修改：直接设置总金额，不是累加
    existingItem.amount = totalRmbAmount;
    existingItem.unitPrice = totalRmbAmount;
    existingItem.noTaxAmount = totalRmbAmount / (1 + taxRate / 100);
    existingItem.taxAmount = (totalRmbAmount / (1 + taxRate / 100)) * (taxRate / 100);
    
    console.log('✅ 商品明细金额已重新计算（基于所有费用）:', {
      totalRmbAmount,
      taxRate,
      noTaxAmount: existingItem.noTaxAmount,
      taxAmount: existingItem.taxAmount,
    });
  }

  /**
   * 手动重新填充商品明细
   */
  async function handleRefillGoodsDetails() {
    const items = formData.value.invoiceApplicationItems || [];

    if (items.length === 0) {
      message.warning('暂无费用明细，请先添加费用');
      return;
    }

    try {
      const allFees = flattenTreeData(feeGroupsData.value);

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
    }
  }

  /**
   * 加载发票商品编码列表
   */
  async function loadCodeInvoiceList() {
    try {
      const { getCodeInvoicePagedList } = await import(
        '#/api/system/base-data/code-invoice-admin'
      );
      const result = await getCodeInvoicePagedList({
        PageIndex: 1,
        PageSize: 1000,
      });
      codeInvoiceList.value = result.items || [];
    } catch (error) {
      console.error('加载发票商品编码失败:', error);
    }
  }

  return {
    handleGoodsNameChange,
    handleQuantityOrPriceChange,
    handleAmountChange,
    handleTaxRateChange,
    handleAddGoodsRow,
    handleDeleteGoodsRow,
    handleDeleteSelectedGoodsRows,
    autoFillGoodsDetails,
    mergeAmountToExistingGoods,
    handleRefillGoodsDetails,
    loadCodeInvoiceList,
  };
}
