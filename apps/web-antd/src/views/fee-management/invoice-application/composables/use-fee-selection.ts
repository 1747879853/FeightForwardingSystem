import { message } from 'ant-design-vue';
import type { Ref } from 'vue';
import { getMyDefaultOrgId } from '#/composables/use-my-org';
import { InvoiceApplicationAdminApi } from '#/api/settlement-management/invoice-application-admin';
import { getCurrencyDetail } from '#/api/system/base-data/currency-admin';
// ✅ 修改：只导入ensureExchangeRateCache函数
import { ensureExchangeRateCache } from '#/utils/exchange-rate-cache';
// ✅ 新增：导入汇率API
import { getExchangeRatePagedList } from '#/api/system/base-data/exchange-rate-admin';
// ✅ 新增：导入客户开票信息API
import { getClientInvoiceInfoList } from '#/api/sea-export/clinet-invoice-admin';
// ✅ 新增：导入备注模板 API
import { InvoiceRemarkTemplateApi } from '#/api/Invoice/invoiceRemarkTemplate';

/**
 * 费用选择抽屉保存处理逻辑
 */
export function useFeeSelectionSave(
  formData: Ref<any>,
  feeGroupsData: Ref<any[]>,
  goodsDetails: Ref<any[]>,
  invoiceExchangeRate: Ref<number>,
  selectedCurrencyCode: Ref<string>,
  codeInvoiceList: Ref<any[]>, // ✅ 新增：发票商品编码列表
  loadCodeInvoiceList: () => Promise<void>, // ✅ 新增：加载发票商品编码列表函数
  addSelectedFeesToForm: (selectedFees: any[]) => void,
  autoFillGoodsDetails: (selectedFees: any[]) => Promise<void>,
  mergeAmountToExistingGoods: (selectedFees: any[]) => Promise<void>,
  loadClientInvoiceInfo: (settlementId: string) => Promise<void>,
  updateOrgBankByCurrency: () => void,
  flattenTreeData: (data: any[]) => any[], // ✅ 新增：扁平化树形数据函数
  loadDefaultRemarkTemplate?: () => Promise<void>,
  orgBankAccounts?: Ref<any[]>, // ✅ 新增：销售方银行账号列表，用于替换占位符
  onCreated?: (ids: string[]) => void, // ✅ 修改：接收多个开票申请ID数组
  onRefresh?: () => Promise<void>, // ✅ 新增：刷新数据的回调
) {
  /**
   * ✅ 新增：基于所有费用重新计算商品明细金额（不是累加）
   */
  async function recalculateGoodsAmountFromAllFees() {
    if (goodsDetails.value.length !== 1) {
      return;
    }

    const items = formData.value.invoiceApplicationItems || [];
    if (items.length === 0) {
      goodsDetails.value = [];
      return;
    }

    if (codeInvoiceList.value.length === 0) {
      await loadCodeInvoiceList();
    }

    const invoiceCurrencyId = formData.value.currencyId;
    if (!invoiceCurrencyId) {
      return;
    }

    let currencyCode = '';
    try {
      const currencyDetail = await getCurrencyDetail(invoiceCurrencyId);
      currencyCode = currencyDetail.code || '';
    } catch (error) {
      console.error('获取币别详情失败:', error);
      return;
    }

    if (!currencyCode) {
      return;
    }

    const defaultCodeInvoice = codeInvoiceList.value.find(
      (item) => item.isDefault && item.currency?.code === currencyCode,
    );

    if (!defaultCodeInvoice) {
      return;
    }

    // ✅ 关键：从 formData.invoiceApplicationItems 中获取所有费用，计算总金额
    let totalRmbAmount = 0;
    const allFees = flattenTreeData(feeGroupsData.value);

    items.forEach((item: any) => {
      const fee = allFees.find((f: any) => f.orderFee?.id === item.orderFeeId);
      if (fee) {
        const appliedAmount = item.appliedAmount || 0;
        const feeCurrencyId = fee.orderFee.currencyId;

        if (feeCurrencyId !== 1) {
          // 外币转人民币
          totalRmbAmount += appliedAmount * (invoiceExchangeRate.value || 1);
        } else {
          // 人民币直接累加
          totalRmbAmount += appliedAmount;
        }
      }
    });

    // 更新唯一的一行商品明细
    const existingItem = goodsDetails.value[0];

    if (existingItem.codeInvoiceId === defaultCodeInvoice.id) {
      const taxRate = existingItem.taxRate || defaultCodeInvoice.taxRate || 0;

      existingItem.amount = totalRmbAmount;
      existingItem.unitPrice = totalRmbAmount;
      existingItem.noTaxAmount = totalRmbAmount / (1 + taxRate / 100);
      existingItem.taxAmount =
        (totalRmbAmount / (1 + taxRate / 100)) * (taxRate / 100);

      console.log('✅ 商品明细金额已重新计算:', {
        totalRmbAmount,
        taxRate,
        noTaxAmount: existingItem.noTaxAmount,
        taxAmount: existingItem.taxAmount,
      });
    } else {
      message.warning('商品明细与当前币别不匹配，请手动调整或重新填充');
    }
  }

  /**
   * 处理费用选择保存
   */
  async function handleFeeSelectionSave(data: {
    selectedFees: any[];
    settlementId: string;
    currencyId: number;
    invoiceExchangeRate?: number;
    feeGroupsData?: any[];
  }) {
    const {
      selectedFees,
      settlementId,
      currencyId,
      invoiceExchangeRate: rate,
      feeGroupsData: groupsData,
    } = data;

    console.log('✅ 收到费用选择数据:', selectedFees.length, '条费用');

    // 设置结算单位和币别
    formData.value.settlementId = settlementId;
    formData.value.currencyId = currencyId;

    // 设置发票汇率
    if (rate !== undefined) {
      invoiceExchangeRate.value = rate;
    }

    // 自动设置归属组织
    // const firstFee = selectedFees[0];
    // if (firstFee?.transportOrder?.orgId) {
    //   formData.value.orgId = firstFee.transportOrder.orgId;
    // } else if (!formData.value.orgId) {
    //   formData.value.orgId = getMyDefaultOrgId() ?? 0;
    // }

    //formData.value.orgId = getMyDefaultOrgId() ?? 0;

    // 根据币别自动选择销售方默认银行
    updateOrgBankByCurrency();

    // 加载客户开票信息
    await loadClientInvoiceInfo(settlementId);

    // 合并费用组数据，避免重复添加
    if (groupsData && groupsData.length > 0) {
      const existingOrderIds = new Set<string>();
      feeGroupsData.value.forEach((group: any) => {
        if (group.transportOrder?.id) {
          existingOrderIds.add(String(group.transportOrder.id));
        }
      });

      const newGroups = groupsData.filter((group: any) => {
        const orderId = group.transportOrder?.id;
        return orderId && !existingOrderIds.has(String(orderId));
      });

      if (newGroups.length > 0) {
        feeGroupsData.value = [...feeGroupsData.value, ...newGroups];
        console.log(
          `✅ 已合并费用数据到 feeGroupsData: 新增 ${newGroups.length} 个订单组`,
        );
      }
    }

    // 过滤出真正的新费用
    const existingFeeIds = getAddedFeeIds();
    const newFees = selectedFees.filter((fee: any) => {
      const feeId = String(fee.orderFee?.id);
      return !existingFeeIds.has(feeId);
    });

    if (newFees.length === 0) {
      message.warning('所选费用已全部添加，无新增费用');
      return;
    }

    // ✅ 根据是否有开票ID判断是新增还是编辑
    const isEdit = !!formData.value.id;

    if (!isEdit) {
      // 新增状态：调用add方法创建开票申请
      try {
        console.log('📋 新增前 - 当前表单数据状态:', {
          orgId: formData.value.orgId,
          settlementId: formData.value.settlementId,
          currencyId: formData.value.currencyId,
          invoiceType: formData.value.invoiceType,
          orgBankAccountId: formData.value.orgBankAccountId,
          clientInvoiceBankId: formData.value.clientInvoiceBankId,
          require: formData.value.require,
          remark: formData.value.remark,
        });

        // ✅ 关键修复：先将费用添加到表单，确保 invoiceApplicationItems 有数据
        // 这样 loadDefaultRemarkTemplate 才能从费用数据中提取主提单号和委托编号
        addSelectedFeesToForm(selectedFees);
        console.log(
          '✅ 费用已添加到表单，invoiceApplicationItems 数量:',
          formData.value.invoiceApplicationItems?.length || 0,
        );

        // ✅ 在新增前，先加载默认备注模板（如果备注为空）
        // 此时 invoiceApplicationItems 已有数据，可以正确提取主提单号和委托编号
        if (
          loadDefaultRemarkTemplate &&
          (!formData.value.remark || !formData.value.remark.trim())
        ) {
          console.log('📝 加载默认备注模板...');
          await loadDefaultRemarkTemplate();
        }

        // ✅ 再次确认所有字段都已正确设置
        console.log('📋 加载默认信息后 - 最终表单数据状态:', {
          orgId: formData.value.orgId,
          settlementId: formData.value.settlementId,
          currencyId: formData.value.currencyId,
          invoiceType: formData.value.invoiceType,
          orgBankAccountId: formData.value.orgBankAccountId,
          clientInvoiceBankId: formData.value.clientInvoiceBankId,
          require: formData.value.require,
          remark: formData.value.remark,
        });

        // ✅ 验证费用明细不为空（关键：必须至少有一条费用明细）
        if (newFees.length === 0) {
          console.error('❌ 错误：费用明细为空，无法创建开票申请');
          message.error('费用明细不能为空，请重新选择费用');
          return;
        }

        console.log('✅ 费用明细数量验证通过:', newFees.length);

        // ✅ 关键修改：按币别分组费用，每个币别生成一个currencyGroup
        // 首先统计所有选中的费用涉及哪些币别
        const currencyMap = new Map<number, any[]>();
        newFees.forEach((fee: any) => {
          const feeCurrencyId = fee.orderFee?.currencyId;
          if (!feeCurrencyId) {
            console.warn('⚠️ 费用缺少币别ID:', fee.orderFee?.id);
            return;
          }

          if (!currencyMap.has(feeCurrencyId)) {
            currencyMap.set(feeCurrencyId, []);
          }
          currencyMap.get(feeCurrencyId)!.push(fee);
        });

        console.log(
          '📊 检测到',
          currencyMap.size,
          '个币别:',
          Array.from(currencyMap.keys()),
        );

        // ✅ 为每个币别构建currencyGroup
        const currencyGroups: InvoiceApplicationAdminApi.InvoiceApplicationCurrencyGroupDto[] =
          [];

        for (const [currencyId, fees] of currencyMap.entries()) {
          console.log(`📦 处理币别 ${currencyId} 的 ${fees.length} 条费用`);

          // 获取币别详情
          let currencyCode = '';
          try {
            const currencyDetail = await getCurrencyDetail(currencyId);
            currencyCode = currencyDetail.code || '';
            console.log('🔍 币别详情 - ID:', currencyId, '代码:', currencyCode);
          } catch (error) {
            console.error('❌ 获取币别详情失败:', error);
            continue; // 跳过该币别，继续处理下一个
          }

          if (!currencyCode) {
            console.warn('⚠️ 无法获取币别代码，跳过币别:', currencyId);
            continue;
          }

          // ✅ 修复：为当前币别获取对应的发票汇率（必须在计算金额和替换占位符之前获取）
          let currentCurrencyExchangeRate = 1.0;
          if (currencyId !== 1) {
            try {
              // 获取当前币别的有效发票汇率
              const exchangeRateList = await getExchangeRatePagedList({
                CurrencyId: currencyId,
                PageIndex: 1,
                PageSize: 10,
              });

              // 筛选启用且在有效期内的汇率记录
              const now = new Date();
              const validRates = (exchangeRateList?.items || []).filter(
                (rate) => {
                  if (!rate.enable) return false;
                  const startDate = rate.startDate
                    ? new Date(rate.startDate)
                    : null;
                  const endDate = rate.endDate ? new Date(rate.endDate) : null;
                  if (startDate && now < startDate) return false;
                  if (endDate && now > endDate) return false;
                  return true;
                },
              );

              // 按sortId降序、id降序排序，取第一条
              if (validRates.length > 0) {
                validRates.sort((a, b) => {
                  const aSortId = a.sortId ?? 0;
                  const bSortId = b.sortId ?? 0;
                  if (bSortId !== aSortId) {
                    return bSortId - aSortId;
                  }
                  return String(b.id) > String(a.id) ? -1 : 1;
                });

                const bestRate = validRates[0];
                if (bestRate && bestRate.invoiceValue !== undefined) {
                  currentCurrencyExchangeRate = bestRate.invoiceValue;
                  console.log(
                    '✅ 获取币别',
                    currencyCode,
                    '的发票汇率:',
                    currentCurrencyExchangeRate,
                  );
                } else {
                  console.warn(
                    '⚠️ 币别',
                    currencyCode,
                    '的汇率记录中没有invoiceValue，使用默认汇率 1.0',
                  );
                  currentCurrencyExchangeRate = 1.0;
                }
              } else {
                console.warn(
                  '⚠️ 未找到币别',
                  currencyCode,
                  '的有效发票汇率，使用默认汇率 1.0',
                );
                currentCurrencyExchangeRate = 1.0;
              }
            } catch (error) {
              console.error('获取币别汇率失败:', error);
              currentCurrencyExchangeRate = 1.0;
            }
          }

          // ✅ 新增：为当前币别获取对应的默认银行账户（必须在备注模板替换逻辑之前执行）
          let clientInvoiceBankIdForCurrency: string | undefined = undefined;
          let clientBankNameForCurrency: string = '';
          let clientBankAccountForCurrency: string = '';

          if (settlementId && currencyId) {
            try {
              const clientInvoiceInfoList = await getClientInvoiceInfoList({
                ClientId: settlementId,
              });

              // 找到默认的开票信息
              const defaultInvoiceInfo = clientInvoiceInfoList?.find(
                (info) => info.isDefault,
              );

              if (defaultInvoiceInfo && defaultInvoiceInfo.clientInvoiceBanks) {
                // 找到对应币别的默认银行账户
                const defaultBank =
                  defaultInvoiceInfo.clientInvoiceBanks
                    .filter((bank) => bank.currencyId === currencyId)
                    .find((bank) => bank.isDefault) ||
                  defaultInvoiceInfo.clientInvoiceBanks.filter(
                    (bank) => bank.currencyId === currencyId,
                  )[0];

                if (defaultBank) {
                  clientInvoiceBankIdForCurrency = defaultBank.id;
                  clientBankNameForCurrency = defaultBank.bankName || '';
                  clientBankAccountForCurrency = defaultBank.bankAccount || '';
                  console.log(
                    '✅ 为币别',
                    currencyCode,
                    '找到默认银行账户:',
                    defaultBank.bankName,
                  );
                }
              }
            } catch (error) {
              console.warn('获取客户开票信息失败，使用全局银行账户:', error);
              // 如果获取失败，回退到全局设置
              clientInvoiceBankIdForCurrency =
                formData.value.clientInvoiceBankId || undefined;
            }
          }

          // ✅ 新增：获取当前币别的默认备注模板并替换占位符
          let currencyRemark = '';
          try {
            const orgId = formData.value.orgId || getMyDefaultOrgId() || 0;
            if (orgId && currencyId) {
              const templates =
                await InvoiceRemarkTemplateApi.getPagedListAsync({
                  pageIndex: 1,
                  pageSize: 100,
                  orgId: orgId,
                  currencyId: currencyId,
                });

              const defaultTemplate = templates.items?.find((t) => t.default);
              if (defaultTemplate) {
                let templateContent = defaultTemplate.template || '';

                // ✅ 核心逻辑：收集当前币别下的真实数据用于替换占位符
                // 1. 收集委托编号和主提单号
                const commissionNums = new Set<string>();
                const mblNums = new Set<string>();
                fees.forEach((fee: any) => {
                  if (fee.transportOrder?.commissionNum) {
                    commissionNums.add(fee.transportOrder.commissionNum);
                  }
                  if (fee.transportOrder?.mblNum) {
                    mblNums.add(fee.transportOrder.mblNum);
                  }
                });

                // 2. 计算金额（原币和人民币）
                let totalOriginalAmount = 0;
                let totalRmbAmount = 0;
                fees.forEach((fee: any) => {
                  const appliedAmount =
                    fee.appliedAmount ||
                    fee.orderFee.remainingInvoiceAmount ||
                    0;
                  totalOriginalAmount += appliedAmount;
                  // 使用当前循环中已经获取到的 currentCurrencyExchangeRate
                  if (currencyId !== 1) {
                    totalRmbAmount +=
                      appliedAmount * currentCurrencyExchangeRate;
                  } else {
                    totalRmbAmount += appliedAmount;
                  }
                });

                // 3. 获取银行信息（直接使用上面循环开头获取到的变量）
                let orgBankName = '';
                let orgBankAccount = '';

                // 销方银行：优先查找与当前币别匹配的归属组织银行账户
                if (orgBankAccounts?.value) {
                  // 尝试找到与当前币别一致的销方银行账户
                  const matchedOrgBank = orgBankAccounts.value.find(
                    (b) => b.currencyId === currencyId,
                  );

                  // 如果找到了匹配的，或者用户在全局选择了某个账户（且该账户属于当前币别），则使用
                  if (matchedOrgBank) {
                    orgBankName = matchedOrgBank.bankName;
                    orgBankAccount = matchedOrgBank.bankAccount;
                  } else if (formData.value.orgBankAccountId) {
                    // 如果没有匹配币别的，但有全局选择，检查全局选择的是否有效
                    const selectedOrgBank = orgBankAccounts.value.find(
                      (b) => b.id === formData.value.orgBankAccountId,
                    );
                    if (selectedOrgBank) {
                      orgBankName = selectedOrgBank.bankName;
                      orgBankAccount = selectedOrgBank.bankAccount;
                    }
                  }
                }

                // 4. 执行占位符替换
                const replacements: Record<string, string> = {
                  '<委托编号>': Array.from(commissionNums).join('、'),
                  '<主提单号>': Array.from(mblNums).join('、'),
                  '[折算汇率]': String(currentCurrencyExchangeRate),
                  '[外币金额(总计)]': totalOriginalAmount.toFixed(2),
                  '[人民币金额(总计)]': totalRmbAmount.toFixed(2),
                  '[购方银行]': clientBankNameForCurrency,
                  '[购方账号]': clientBankAccountForCurrency,
                  '[销方银行]': orgBankName,
                  '[销方账号]': orgBankAccount,
                };

                for (const [placeholder, value] of Object.entries(
                  replacements,
                )) {
                  const regex = new RegExp(
                    placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
                    'g',
                  );
                  templateContent = templateContent.replace(regex, value);
                }

                currencyRemark = templateContent;
                console.log(
                  `✅ 为币别 ${currencyCode} 加载并替换了默认备注模板`,
                );
              } else {
                currencyRemark = formData.value.remark || '';
              }
            } else {
              currencyRemark = formData.value.remark || '';
            }
          } catch (error) {
            console.warn('获取或处理默认备注模板失败:', error);
            currencyRemark = formData.value.remark || '';
          }

          // 查找该币别的默认发票商品编码
          const defaultCodeInvoice = codeInvoiceList.value.find(
            (item) => item.isDefault && item.currency?.code === currencyCode,
          );

          if (!defaultCodeInvoice) {
            console.warn('⚠️ 未找到币别', currencyCode, '的默认商品编码');
            message.warning(
              `未找到${currencyCode}币别的默认商品编码，该币别将无法创建开票申请`,
            );
            continue;
          }

          console.log(
            '✅ 找到币别',
            currencyCode,
            '的默认商品编码:',
            defaultCodeInvoice.name,
          );

          // 计算该币别下所有费用的总金额（转换为人民币）
          let totalRmbAmount = 0;
          fees.forEach((fee: any) => {
            const appliedAmount =
              fee.appliedAmount || fee.orderFee.remainingInvoiceAmount || 0;
            const feeCurrencyId = fee.orderFee.currencyId;

            if (feeCurrencyId !== 1) {
              // 外币转人民币 - 使用当前币别的发票汇率
              const convertedAmount =
                appliedAmount * currentCurrencyExchangeRate;
              totalRmbAmount += convertedAmount;
            } else {
              // 人民币直接累加
              totalRmbAmount += appliedAmount;
            }
          });

          console.log(
            '📊 币别',
            currencyCode,
            '的商品明细总金额（人民币）:',
            totalRmbAmount.toFixed(2),
          );

          // 构建商品明细
          const taxRate = defaultCodeInvoice.taxRate || 0;
          const invoiceApplicationGoodsDtls: InvoiceApplicationAdminApi.InvoiceApplicationGoodsDtlAddDto[] =
            [
              {
                codeInvoiceId: defaultCodeInvoice.id,
                specification: defaultCodeInvoice.specification || '',
                unit: defaultCodeInvoice.unit || '票',
                quantity: 1,
                unitPrice: totalRmbAmount,
                amount: totalRmbAmount,
                noTaxAmount: totalRmbAmount / (1 + taxRate / 100),
                taxRate: taxRate,
                taxAmount:
                  (totalRmbAmount / (1 + taxRate / 100)) * (taxRate / 100),
                remark: '',
              },
            ];

          console.log('✅ 商品明细构建成功:', {
            codeInvoiceId: invoiceApplicationGoodsDtls[0]?.codeInvoiceId,
            amount: invoiceApplicationGoodsDtls[0]?.amount,
            taxRate: invoiceApplicationGoodsDtls[0]?.taxRate,
          });

          // 构建该币别的currencyGroup
          const currencyGroup: InvoiceApplicationAdminApi.InvoiceApplicationCurrencyGroupDto =
            {
              currencyId: currencyId,
              invoiceType: formData.value.invoiceType, // ✅ 传递发票类型
              orgBankAccountId: formData.value.orgBankAccountId || undefined, // ✅ 传递销售方银行ID
              clientInvoiceBankId: clientInvoiceBankIdForCurrency, // ✅ 使用币别对应的银行账户
              invoiceApplicationItems: fees.map((fee: any) => ({
                orderFeeId: fee.orderFee.id,
                appliedAmount:
                  fee.appliedAmount || fee.orderFee.remainingInvoiceAmount,
                remark: '',
              })),
              invoiceApplicationGoodsDtls: invoiceApplicationGoodsDtls, // ✅ 传递商品明细
              remark: currencyRemark, // ✅ 设置当前币别的备注（来自默认模板或全局输入）
            };

          currencyGroups.push(currencyGroup);
          console.log('✅ 币别', currencyCode, '的currencyGroup构建完成');
        }

        // ✅ 验证是否成功构建了currencyGroups
        if (currencyGroups.length === 0) {
          console.error('❌ 错误：没有成功构建任何币别的currencyGroup');
          message.error('无法构建开票申请数据，请检查费用币别和商品编码配置');
          return;
        }

        console.log(
          '✅ 成功构建',
          currencyGroups.length,
          '个币别的currencyGroup',
        );

        // ✅ 再次验证构建后的费用明细数量
        currencyGroups.forEach((group, index) => {
          console.log(`📊 currencyGroup[${index}] 详情:`, {
            currencyId: group.currencyId,
            invoiceType: group.invoiceType,
            itemCount: group.invoiceApplicationItems.length,
            goodsCount: group.invoiceApplicationGoodsDtls?.length || 0,
          });
        });

        const addData: InvoiceApplicationAdminApi.InvoiceApplicationBatchAddDto =
          {
            settlementId: settlementId,
            orgId: formData.value.orgId || getMyDefaultOrgId() || 0,
            require: formData.value.require, // ✅ 传递开票要求
            currencyGroups, // ✅ currencyGroups 内部已经包含了各自的 remark
          };

        console.log('📤 新增开票申请完整数据:', {
          settlementId: addData.settlementId,
          orgId: addData.orgId,
          require: addData.require,
          currencyGroups: currencyGroups.map((g) => ({
            currencyId: g.currencyId,
            invoiceType: g.invoiceType,
            orgBankAccountId: g.orgBankAccountId,
            clientInvoiceBankId: g.clientInvoiceBankId,
            itemCount: g.invoiceApplicationItems.length,
            goodsCount: g.invoiceApplicationGoodsDtls?.length || 0,
            remark: g.remark, // ✅ 打印每个币别的备注信息
          })),
        });

        const ids = await InvoiceApplicationAdminApi.add(addData);

        if (ids && ids.length > 0) {
          console.log(
            '✅ 开票申请创建成功，生成了',
            ids.length,
            '个申请单，IDs:',
            ids,
          );

          // 设置第一个申请单ID到表单，进入编辑模式
          const firstId = ids[0];
          formData.value.id = firstId;

          // ✅ 修改：触发回调，传递所有开票申请ID数组，由父组件决定如何打开多个tab
          if (onCreated) {
            onCreated(ids);
          }

          message.success(`成功创建 ${ids.length} 个开票申请单`);
        }
      } catch (error) {
        console.error('❌ 创建开票申请失败:', error);
        message.error('创建开票申请失败');
        return;
      }
    } else {
      // 编辑状态：调用addItems方法追加费用
      try {
        const addItemsData: InvoiceApplicationAdminApi.InvoiceApplicationAddItemsDto =
          {
            id: formData.value.id,
            invoiceApplicationItems: newFees.map((fee: any) => ({
              orderFeeId: fee.orderFee.id,
              appliedAmount:
                fee.appliedAmount || fee.orderFee.remainingInvoiceAmount,
              remark: '',
            })),
            // ✅ 关键修改：不传商品明细，表示不改商品（由后端保持原样）
            // 商品明细的金额会在后续通过 recalculateGoodsDetails 重新计算
            invoiceApplicationGoodsDtls: undefined,
          };

        await InvoiceApplicationAdminApi.addItems(addItemsData);
        console.log('✅ 费用明细添加成功');
        message.success(`成功添加 ${newFees.length} 条新费用`);

        // ✅ 关键修复：追加费用后重新加载详情，确保发票汇率等数据同步
        if (onRefresh) {
          console.log('🔄 追加费用后重新加载详情...');
          await onRefresh();
        }
      } catch (error) {
        console.error('❌ 添加费用明细失败:', error);
        message.error('添加费用明细失败');
        return;
      }
    }

    // ✅ 编辑状态下才需要在这里添加费用到表单
    // 新增状态下已经在前面调用过 addSelectedFeesToForm 了
    if (isEdit) {
      addSelectedFeesToForm(selectedFees);
    }

    // 自动加载当前币别对应的默认备注模板
    // 注意：新增状态下已经在前面调用过了，这里只在编辑状态下再次调用以更新数据
    if (loadDefaultRemarkTemplate && isEdit) {
      await loadDefaultRemarkTemplate();
    }

    // ✅ 关键修复：无论是新增还是编辑状态，都应该基于所有费用重新计算商品明细
    // 而不是累加新费用的金额
    if (goodsDetails.value.length === 0) {
      // 没有商品明细时，自动填充
      await autoFillGoodsDetails(
        isEdit
          ? (formData.value.invoiceApplicationItems || []).map((item: any) => {
              // 从 feeGroupsData 中找到对应的费用
              const allFees = flattenTreeData(feeGroupsData.value);
              const fee = allFees.find(
                (f: any) => f.orderFee?.id === item.orderFeeId,
              );
              return (
                fee || {
                  orderFee: item.orderFeeId,
                  appliedAmount: item.appliedAmount,
                }
              );
            })
          : newFees,
      );
    } else if (goodsDetails.value.length === 1) {
      // ✅ 关键修改：只有一行商品明细时，重新计算总金额（不是累加）
      await recalculateGoodsAmountFromAllFees();
    } else {
      message.warning(
        '当前存在多行商品明细，系统无法自动合并金额。建议：\n' +
          '1. 删除多余的商品明细，保留一行\n' +
          '2. 或手动调整各行的金额',
      );
    }
  }

  /**
   * 获取已添加的费用ID集合
   */
  function getAddedFeeIds(): Set<string> {
    const items = formData.value.invoiceApplicationItems || [];
    return new Set(items.map((item: any) => String(item.orderFeeId)));
  }

  return {
    handleFeeSelectionSave,
  };
}
