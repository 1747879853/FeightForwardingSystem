import { message } from 'ant-design-vue';
import { getCurrencyDetail } from '#/api/system/base-data/currency-admin';

/**
 * 商品明细管理
 */
export function useGoodsDetails(
  goodsDetails: any,
  codeInvoiceList: any,
  formData: any,
  invoiceExchangeRate: any,
  flattenTreeData: (data: any[]) => any[],
) {
  /**
   * 加载发票商品编码列表
   */
  async function loadCodeInvoiceList() {
    try {
      const { getCodeInvoicePagedList } =
        await import('#/api/system/base-data/code-invoice-admin');
      const result = await getCodeInvoicePagedList({
        PageIndex: 1,
        PageSize: 1000,
      });
      codeInvoiceList.value = result.items || [];
    } catch (error) {
      console.error('加载发票商品编码失败:', error);
    }
  }

  /**
   * 商品明细 - 项目名称变化
   */
  function handleGoodsNameChange(record: any, index: number) {
    const selectedItem = codeInvoiceList.value.find(
      (item: any) => item.id === record.codeInvoiceId,
    );

    if (selectedItem) {
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

  /**
   * 商品明细 - 数量或单价变化
   */
  function handleQuantityOrPriceChange(record: any) {
    // 金额 = 数量 × 单价
    record.amount = (record.quantity || 0) * (record.unitPrice || 0);

    // 不含税金额 = 金额 ÷ (1 + 税率)
    const taxRate = record.taxRate || 0;
    record.noTaxAmount = record.amount / (1 + taxRate / 100);

    // 税额 = 含税金额 ÷ (1 + 税率) × 税率
    record.taxAmount = (record.amount / (1 + taxRate / 100)) * (taxRate / 100);
  }

  /**
   * 商品明细 - 金额变化（用户手动修改）
   */
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

  /**
   * 处理商品明细 - 税率变化
   */
  function handleTaxRateChange(record: any) {
    // 确保税率为数字类型
    const taxRate = Number(record.taxRate) || 0;
    record.taxRate = taxRate;

    // 重新计算不含税金额和税额
    const amount = record.amount || 0;
    record.noTaxAmount = amount / (1 + taxRate / 100);
    record.taxAmount = (amount / (1 + taxRate / 100)) * (taxRate / 100);
  }

  /**
   * 在指定位置后插入新行
   */
  function handleAddGoodsRow(afterIndex?: number) {
    const items = formData.value.invoiceIssueItems || [];

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

    if (afterIndex !== undefined && afterIndex >= 0) {
      goodsDetails.value.splice(afterIndex + 1, 0, newRow);
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
   * 自动填充商品明细
   */
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

    // 获取币别详情
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
      console.warn(`未找到币别ID ${invoiceCurrencyId} 对应的币别代码`);
      message.warning('未找到币别信息，请手动添加商品明细');
      return;
    }

    // 根据发票币别查找默认的发票商品编码
    const defaultCodeInvoice = codeInvoiceList.value.find(
      (item: any) => item.isDefault && item.defaultCurrency === currencyCode,
    );

    if (!defaultCodeInvoice) {
      console.warn(`未找到币别 ${currencyCode} 的默认发票商品编码`);
      message.warning(
        `未找到币别 ${currencyCode} 对应的默认商品编码，请手动添加`,
      );
      return;
    }

    // 计算所有选中申请的总金额（转换为人民币）
    let totalRmbAmount = 0;

    selectedApplications.forEach((app: any) => {
      const appliedAmount = app.totalAppliedAmount || 0;
      const appCurrencyId = app.currencyId;

      if (appCurrencyId !== 1) {
        const convertedAmount =
          appliedAmount * (invoiceExchangeRate.value || 1);
        totalRmbAmount += convertedAmount;
      } else {
        totalRmbAmount += appliedAmount;
      }
    });

    // 使用默认商品编码创建一条商品明细
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
   * 根据申请的 invoiceApplicationGoodsDtls 合并商品明细
   */
  async function mergeGoodsDetailsFromApplications(
    selectedApplications: any[],
  ) {
    console.log('🔄 开始合并商品明细，申请数量:', selectedApplications.length);
    console.log('  - 当前商品明细数量:', goodsDetails.value.length);

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

    // 获取币别详情
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
      console.warn(`未找到币别ID ${invoiceCurrencyId} 对应的币别代码`);
      message.warning('未找到币别信息，无法合并商品明细');
      return;
    }

    // ✅ 使用 Map 来存储合并后的商品明细（先放入原有的商品明细）
    const goodsMap = new Map<string, any>();

    // ✅ 第一步：将现有的商品明细放入 Map
    goodsDetails.value.forEach((existingItem: any) => {
      // ✅ 修改：使用货物或应税劳务名称、规格型号、单位、数量、税率作为合并键
      const goodsName = existingItem.codeInvoice.name || '未知商品';
      const specification = existingItem.specification || '';
      const unit = existingItem.unit || '票';
      const quantity = existingItem.quantity || 0;
      const taxRate = existingItem.taxRate || 0;
      const mergeKey = `${goodsName}_${specification}_${unit}_${quantity}_${taxRate}`;

      goodsMap.set(mergeKey, {
        ...existingItem,
      });
    });

    console.log('  - 现有商品明细已放入 Map，数量:', goodsMap.size);

    // ✅ 第二步：遍历所有选中的申请，合并新申请的商品明细
    selectedApplications.forEach((app: any) => {
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
        const goodsName =
          goods.codeInvoiceName || goods.goodsName || '未知商品';
        const specification = goods.specification || '';
        const unit = goods.unit || '票';
        const quantity = goods.quantity || 0;
        const taxRate = goods.taxRate || 0;

        // ✅ 修改：使用完整的五个字段作为合并键
        const mergeKey = `${goodsName}_${specification}_${unit}_${quantity}_${taxRate}`;

        // ✅ 计算转换后的金额（如果是外币申请，需要乘以汇率）
        let convertedAmount = goods.amount || 0;
        let convertedNoTaxAmount = goods.noTaxAmount || 0;
        let convertedTaxAmount = goods.taxAmount || 0;
        let convertedUnitPrice = goods.unitPrice || 0;

        // 如果申请是外币且发票币别不是人民币，或者申请是外币但发票是人民币，都需要转换
        if (isAppForeignCurrency && invoiceCurrencyId === 1) {
          // 申请是外币，发票是人民币：需要乘以汇率转换为人民币
          const exchangeRate = invoiceExchangeRate.value || 1;
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
          // 申请是外币A，发票是外币B：这种情况理论上不应该出现，因为费用选择抽屉会按币别分组
          // 但为了安全起见，这里也处理一下（实际上应该不会走到这里）
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
          const codeInvoiceItem = codeInvoiceList.value.find(
            (item: any) =>
              item.name === goodsName || item.id === goods.codeInvoiceId,
          );

          const newItem = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            codeInvoiceId: codeInvoiceItem
              ? codeInvoiceItem.id
              : goods.codeInvoiceId,
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

    // ✅ 第三步：将 Map 转换为数组
    const mergedGoodsDetails = Array.from(goodsMap.values());

    console.log('  - 合并后商品明细数量:', mergedGoodsDetails.length);
    console.log(
      '  - 合并后总金额:',
      mergedGoodsDetails
        .reduce((sum, item) => sum + (item.amount || 0), 0)
        .toFixed(2),
    );

    if (mergedGoodsDetails.length > 0) {
      goodsDetails.value = mergedGoodsDetails;
      console.log('✅ 商品明细合并完成');
    } else {
      console.warn('⚠️ 没有可合并的商品明细');
      message.warning('所选申请中没有商品明细数据');
    }
  }

  /**
   * 重新计算商品明细金额
   */
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
      (item: any) => item.isDefault && item.currency?.code === currencyCode,
    );

    if (!defaultCodeInvoice) {
      console.warn('未找到默认商品编码');
      return;
    }

    // 计算所有费用的总金额（转换为人民币）
    let totalRmbAmount = 0;
    const allApplications = flattenTreeData(
      formData.value.applicationGroupsData || [],
    );

    items.forEach((item: any) => {
      const app = allApplications.find(
        (a: any) => a.id === item.invoiceApplicationId,
      );
      if (app) {
        const appliedAmount = app.totalAppliedAmount || 0;
        const appCurrencyId = app.currencyId;

        if (appCurrencyId !== 1) {
          totalRmbAmount += appliedAmount * (invoiceExchangeRate.value || 1);
        } else {
          totalRmbAmount += appliedAmount;
        }
      }
    });

    // 如果只有一行商品明细，更新该行金额
    if (goodsDetails.value.length === 1) {
      const existingItem = goodsDetails.value[0];

      if (existingItem.codeInvoiceId === defaultCodeInvoice.id) {
        const taxRate = existingItem.taxRate || defaultCodeInvoice.taxRate || 0;

        existingItem.amount = totalRmbAmount;
        existingItem.unitPrice = totalRmbAmount;
        existingItem.noTaxAmount = totalRmbAmount / (1 + taxRate / 100);
        existingItem.taxAmount =
          (totalRmbAmount / (1 + taxRate / 100)) * (taxRate / 100);
      } else {
        console.warn('⚠️ 商品编码不匹配，无法自动更新');
        message.warning('商品明细与当前币别不匹配，请手动调整或重新填充');
      }
    } else if (goodsDetails.value.length > 1) {
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

  return {
    loadCodeInvoiceList,
    handleGoodsNameChange,
    handleQuantityOrPriceChange,
    handleAmountChange,
    handleTaxRateChange,
    handleAddGoodsRow,
    handleDeleteGoodsRow,
    autoFillGoodsDetails,
    mergeGoodsDetailsFromApplications,
    recalculateGoodsDetails,
  };
}
