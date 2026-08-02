import { message } from 'ant-design-vue';
import {
  addInvoiceIssue,
  InvoiceIssueApi,
  editInvoiceIssue,
  addApplicationsToInvoiceIssue,
} from '#/api/Invoice/InvoiceIssue';
import dayjs from 'dayjs';
import { getCurrencyDetail } from '#/api/system/base-data/currency-admin';

/**
 * 费用选择保存逻辑
 */
export function useFeeSelection(
  formData: any,
  applicationGroupsData: any,
  goodsDetails: any,
  invoiceExchangeRate: any,
  codeInvoiceList: any,
  fixedHeaderId: any,
  fixedCurrencyId: any,
  loadClientInvoiceInfo: (settlementId: string) => Promise<void>,
  updateOrgBankByCurrency: () => void,
  addSelectedApplicationsToForm: (selectedApps: any[]) => void,
  mergeGoodsDetailsFromApplications: (selectedApps: any[]) => Promise<void>,
  autoFillGoodsDetails: (selectedApps: any[]) => Promise<void>,
  router: any,
  editId: any,
  isEdit: any,
  invoiceIssueTime: any,
) {
  /**
   * 处理费用选择保存
   */
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

    // 设置结算单位
    formData.value.settlementId = settlementId;
    formData.value.currencyId = currencyId;

    // ✅ 从第一个申请中获取结算单位名称（所有申请的结算单位应该相同）
    if (
      selectedApplications.length > 0 &&
      selectedApplications[0].settlementName
    ) {
      formData.value.settlementName = selectedApplications[0].settlementName;
      console.log(
        '✅ 设置结算单位名称:',
        selectedApplications[0].settlementName,
      );
    }

    // 设置发票抬头
    if (headerId) {
      if (!fixedHeaderId.value) {
        fixedHeaderId.value = headerId;
        fixedCurrencyId.value = currencyId;
        console.log('✅ 首次选择，固定发票抬头和币别:', headerId, currencyId);
      }

      formData.value.clientInvoiceBankId = headerId;
    }

    // 设置发票汇率
    if (rate !== undefined) {
      invoiceExchangeRate.value = rate;
      console.log('✅ 从费用选择抽屉中获取发票汇率:', rate);
    }

    // 自动设置归属组织为当前用户默认组织
    if (!formData.value.orgId) {
      const { getMyDefaultOrgId } = await import('#/composables/use-my-org');
      formData.value.orgId = getMyDefaultOrgId() ?? 0;
    }

    // 加载客户开票信息
    await loadClientInvoiceInfo(settlementId);

    // 根据币别更新销售方银行
    updateOrgBankByCurrency();

    // 合并申请组数据，避免重复添加
    if (groupsData && groupsData.length > 0) {
      const existingAppIds = new Set<string>();
      applicationGroupsData.value.forEach((group: any) => {
        if (group.id) {
          existingAppIds.add(String(group.id));
        }
      });

      const newGroups = groupsData.filter((group: any) => {
        return group.id && !existingAppIds.has(String(group.id));
      });

      if (newGroups.length > 0) {
        applicationGroupsData.value = [
          ...applicationGroupsData.value,
          ...newGroups,
        ];
        console.log(
          `✅ 已合并申请数据到 applicationGroupsData: 新增 ${newGroups.length} 个申请组`,
        );
      } else {
        console.log('⚠️ 所有申请组都已存在，无需重复添加');
      }
    }

    // 判断是否是首次添加费用
    const isFirstTimeAdd = goodsDetails.value.length === 0;

    // 过滤出真正的新申请
    const existingAppIds = getAddedAppIds();
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

    // 如果是新增状态（还没有发票ID），先创建发票
    if (!isEdit.value || !editId.value) {
      console.log('🆕 新增状态，先创建发票...');
      await createInvoiceWithApplications(newApplications);
    } else {
      // 编辑状态，直接添加申请到现有发票
      console.log('✏️ 编辑状态，添加申请到现有发票...');
      await addApplicationsToExistingInvoice(newApplications);
    }
  }

  /**
   * 创建发票并添加申请（新增状态）
   */
  async function createInvoiceWithApplications(selectedApplications: any[]) {
    try {
      // 处理商品明细
      await mergeGoodsDetailsFromApplications(selectedApplications);

      // 构建备注信息（从选择的发票信息中获取，多条用----------------------------------------分隔）
      const remarks = selectedApplications
        .map((app: any) => app.remark || '')
        .filter(Boolean);
      const combinedRemark = remarks.join(
        '\n----------------------------------------\n',
      );

      // 构建提交数据
      const submitData: InvoiceIssueApi.InvoiceIssueAddDto = {
        orgId: formData.value.orgId,
        invoiceIssueType: formData.value.invoiceIssueType,
        invoiceNo: formData.value.invoiceNo,
        invoiceIssueTime:
          invoiceIssueTime.value || dayjs().format('YYYY-MM-DD'),
        invoiceExchangeRate: invoiceExchangeRate.value,
        require: formData.value.require,
        remark: combinedRemark || formData.value.remark,
        invoiceIssueItems: selectedApplications.map((app: any) => ({
          invoiceApplicationId: app.id,
          remark: '',
        })),
        invoiceIssueGoodsDtls: goodsDetails.value.map((item: any) => ({
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

      console.log('📤 创建发票数据:', submitData);

      // 调用创建接口
      const newId = await addInvoiceIssue(submitData);
      message.success('发票创建成功');

      console.log('✅ 发票创建成功，ID:', newId);

      // 跳转到编辑页面
      if (newId) {
        router.push(`/settlement-management/invoice-issue/${newId}/edit`);
      }
    } catch (error) {
      console.error('❌ 创建发票失败:', error);
      message.error('创建发票失败');
      throw error;
    }
  }

  /**
   * 添加申请到现有发票（编辑状态）
   */
  async function addApplicationsToExistingInvoice(selectedApplications: any[]) {
    try {
      // ✅ 关键修改：编辑状态下，如果已有商品明细，直接将新增申请的金额累加到第一条
      const hasExistingGoods = goodsDetails.value.length > 0;
      let hasManuallyAdjusted = false; // 标记是否已手动调整过金额

      if (hasExistingGoods) {
        console.log('✅ 已有商品明细，将新增申请金额累加到第一条');

        // 计算所有新申请的总金额（转换为人民币）
        let newApplicationsTotalRmb = 0;
        selectedApplications.forEach((app: any) => {
          const appliedAmount = app.totalAppliedAmount || 0;
          const appCurrencyId = app.currencyId;

          if (appCurrencyId !== 1) {
            // 外币转人民币
            const convertedAmount =
              appliedAmount * (invoiceExchangeRate.value || 1);
            newApplicationsTotalRmb += convertedAmount;
          } else {
            // 人民币直接累加
            newApplicationsTotalRmb += appliedAmount;
          }
        });

        console.log(
          '📊 新增申请总金额（人民币）:',
          newApplicationsTotalRmb.toFixed(2),
        );

        // ✅ 将新增金额累加到第一条商品明细
        const firstItem = goodsDetails.value[0];
        const taxRate = firstItem.taxRate || 0;
        const currentAmount = firstItem.amount || 0;
        const newAmount = currentAmount + newApplicationsTotalRmb;

        console.log('🔄 累加金额到第一条商品明细:', {
          原金额: currentAmount,
          新增金额: newApplicationsTotalRmb,
          新金额: newAmount,
          税率: taxRate,
        });

        // 更新第一条商品明细的金额相关字段
        firstItem.amount = newAmount;
        firstItem.unitPrice = newAmount / (firstItem.quantity || 1);
        firstItem.noTaxAmount = newAmount / (1 + taxRate / 100);
        firstItem.taxAmount =
          (newAmount / (1 + taxRate / 100)) * (taxRate / 100);

        message.success(
          `已将新增申请金额 ${newApplicationsTotalRmb.toFixed(2)} 累加到第一条商品明细`,
        );

        // ✅ 标记已手动调整，避免后续重复调整
        hasManuallyAdjusted = true;
      } else {
        // 没有商品明细，使用原有的合并逻辑
        console.log('⚠️ 没有商品明细，使用合并逻辑');
        await mergeGoodsDetailsFromApplications(selectedApplications);
      }

      // ✅ 关键修复：更新 invoiceIssueItems，确保合计中的申请金额正确显示
      console.log('🔄 更新 invoiceIssueItems...');
      addSelectedApplicationsToForm(selectedApplications);
      console.log(
        '✅ invoiceIssueItems 已更新，当前数量:',
        formData.value.invoiceIssueItems?.length || 0,
      );

      // ✅ 关键逻辑：编辑状态下，添加申请后需要确保发票金额等于申请金额
      // ⚠️ 注意：如果已经手动调整过金额，则跳过此步骤，避免重复计算
      if (!hasManuallyAdjusted) {
        // 计算所有申请的总金额（转换为人民币）
        const allApplications = [...applicationGroupsData.value];
        let totalAppliedAmountRmb = 0;

        allApplications.forEach((app: any) => {
          const appliedAmount = app.totalAppliedAmount || 0;
          const appCurrencyId = app.currencyId;

          if (appCurrencyId !== 1) {
            // 外币转人民币
            const convertedAmount =
              appliedAmount * (invoiceExchangeRate.value || 1);
            totalAppliedAmountRmb += convertedAmount;
          } else {
            // 人民币直接累加
            totalAppliedAmountRmb += appliedAmount;
          }
        });

        console.log(
          '📊 申请总金额（人民币）:',
          totalAppliedAmountRmb.toFixed(2),
        );

        // ✅ 计算当前商品明细总金额
        const currentGoodsTotal = goodsDetails.value.reduce(
          (sum: number, item: any) => sum + (item.amount || 0),
          0,
        );

        console.log('📊 当前商品明细总金额:', currentGoodsTotal.toFixed(2));

        // ✅ 判断是否有差异（容差 0.01）
        const hasDifference =
          Math.abs(totalAppliedAmountRmb - currentGoodsTotal) > 0.01;

        if (hasDifference) {
          console.log('⚠️ 检测到金额差异，需要调整商品明细');
          console.log('  - 申请总金额:', totalAppliedAmountRmb.toFixed(2));
          console.log('  - 商品明细总金额:', currentGoodsTotal.toFixed(2));
          console.log(
            '  - 差异:',
            (totalAppliedAmountRmb - currentGoodsTotal).toFixed(2),
          );

          // ✅ 如果有商品明细，调整第一条的金额使其等于申请金额
          if (goodsDetails.value.length > 0) {
            const firstItem = goodsDetails.value[0];
            const taxRate = firstItem.taxRate || 0;

            // 计算其他行的总金额（除第一条外）
            const otherItemsTotal = goodsDetails.value
              .slice(1)
              .reduce((sum: number, item: any) => sum + (item.amount || 0), 0);

            // 第一条商品的金额 = 申请总金额 - 其他行总金额
            const firstItemAmount = totalAppliedAmountRmb - otherItemsTotal;

            console.log('🔄 调整第一条商品明细金额:', {
              原金额: firstItem.amount,
              新金额: firstItemAmount,
              其他行总金额: otherItemsTotal,
              税率: taxRate,
            });

            // 更新第一条商品明细的金额相关字段
            firstItem.amount = firstItemAmount;
            firstItem.unitPrice = firstItemAmount / (firstItem.quantity || 1);
            firstItem.noTaxAmount = firstItemAmount / (1 + taxRate / 100);
            firstItem.taxAmount =
              (firstItemAmount / (1 + taxRate / 100)) * (taxRate / 100);

            message.success(
              `已自动调整第一条商品明细金额，使开票金额等于申请金额`,
            );
            console.log('✅ 调整后验证:', {
              新的商品明细总金额: goodsDetails.value
                .reduce((sum: number, item: any) => sum + (item.amount || 0), 0)
                .toFixed(2),
              申请总金额: totalAppliedAmountRmb.toFixed(2),
            });
          } else {
            // 没有商品明细，无法调整
            console.warn('⚠️ 没有商品明细，无法调整金额');
            message.warning('请先添加商品明细');
            return;
          }
        } else {
          console.log('✅ 金额一致，无需调整');
        }
      } else {
        console.log('✅ 已手动调整过金额，跳过自动校验调整');
      }

      // 构建添加申请数据（包含调整后的商品明细）
      const addData: InvoiceIssueApi.InvoiceIssueAddApplicationsDto = {
        id: editId.value!,
        invoiceIssueItems: selectedApplications.map((app: any) => ({
          invoiceApplicationId: app.id,
          remark: '',
        })),
        invoiceIssueGoodsDtls: goodsDetails.value.map((item: any) => ({
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

      console.log('📤 添加申请数据（含调整后的商品明细）:', addData);

      // 调用添加申请接口
      const { addApplicationsToInvoiceIssue } =
        await import('#/api/Invoice/InvoiceIssue');
      await addApplicationsToInvoiceIssue(addData);

      // message.success(
      //   `成功添加 ${selectedApplications.length} 条申请，并已同步更新商品明细`,
      // );
      console.log('✅ 申请添加成功，商品明细已保存');
    } catch (error) {
      console.error('❌ 添加申请失败:', error);
      //message.error('添加申请失败');
      throw error;
    }
  }

  /**
   * 获取已添加的申请ID集合
   */
  function getAddedAppIds(): Set<string> {
    const items = formData.value.invoiceIssueItems || [];
    return new Set(items.map((item: any) => String(item.invoiceApplicationId)));
  }

  return {
    handleFeeSelectionSave,
  };
}
