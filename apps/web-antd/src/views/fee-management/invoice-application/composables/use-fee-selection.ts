import { message } from 'ant-design-vue';
import type { Ref } from 'vue';
import { getMyDefaultOrgId } from '#/composables/use-my-org';
import { InvoiceApplicationAdminApi } from '#/api/settlement-management/invoice-application-admin';
import { getCurrencyDetail } from '#/api/system/base-data/currency-admin';

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
  loadDefaultRemarkTemplate?: () => Promise<void>,
  onCreated?: (id: string) => void, // ✅ 新增：创建成功后的回调
  onRefresh?: () => Promise<void>, // ✅ 新增：刷新数据的回调
) {
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
    const firstFee = selectedFees[0];
    if (firstFee?.transportOrder?.orgId) {
      formData.value.orgId = firstFee.transportOrder.orgId;
    } else if (!formData.value.orgId) {
      formData.value.orgId = getMyDefaultOrgId() ?? 0;
    }

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

        // ✅ 在新增前，先加载默认备注模板（如果备注为空）
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

        // ✅ 关键修改：在调用 add API 之前，先构建商品明细数据
        // 根据业务规范，新增开票申请时必须至少有一条商品明细
        let invoiceApplicationGoodsDtls: InvoiceApplicationAdminApi.InvoiceApplicationGoodsDtlAddDto[] =
          [];

        try {
          console.log('📦 开始构建商品明细数据...');

          // 确保发票商品编码列表已加载
          if (codeInvoiceList.value.length === 0) {
            console.log('🔄 发票商品编码列表为空，尝试重新加载...');
            await loadCodeInvoiceList();
          }

          // 获取当前发票币别
          const invoiceCurrencyId = formData.value.currencyId;
          if (!invoiceCurrencyId) {
            console.warn('⚠️ 未设置发票币别，无法自动构建商品明细');
          } else {
            // 获取币别详情
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
              console.error('❌ 获取币别详情失败:', error);
            }

            if (currencyCode) {
              // 查找默认的发票商品编码
              const defaultCodeInvoice = codeInvoiceList.value.find(
                (item) =>
                  item.isDefault && item.defaultCurrency === currencyCode,
              );

              if (defaultCodeInvoice) {
                console.log('✅ 找到默认商品编码:', defaultCodeInvoice.name);

                // 计算所有费用的总金额（转换为人民币）
                let totalRmbAmount = 0;
                newFees.forEach((fee: any) => {
                  const appliedAmount =
                    fee.appliedAmount ||
                    fee.orderFee.remainingInvoiceAmount ||
                    0;
                  const feeCurrencyId = fee.orderFee.currencyId;

                  if (feeCurrencyId !== 1) {
                    // 外币转人民币
                    const convertedAmount =
                      appliedAmount * (invoiceExchangeRate.value || 1);
                    totalRmbAmount += convertedAmount;
                  } else {
                    // 人民币直接累加
                    totalRmbAmount += appliedAmount;
                  }
                });

                console.log(
                  '📊 商品明细总金额（人民币）:',
                  totalRmbAmount.toFixed(2),
                );

                // 构建商品明细
                const taxRate = defaultCodeInvoice.taxRate || 0;
                invoiceApplicationGoodsDtls = [
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
              } else {
                console.warn('⚠️ 未找到默认商品编码，商品明细将为空');
              }
            }
          }
        } catch (error) {
          console.error('❌ 构建商品明细失败:', error);
          // 不阻断流程，继续执行
        }

        // ✅ 验证商品明细不为空（关键：必须至少有一条商品明细）
        if (invoiceApplicationGoodsDtls.length === 0) {
          console.error('❌ 错误：商品明细为空，无法创建开票申请');
          message.error('商品明细不能为空，请检查是否配置了默认商品编码');
          return;
        }

        console.log(
          '✅ 商品明细数量验证通过:',
          invoiceApplicationGoodsDtls.length,
        );

        // ✅ 构建按币别分组的数据，包含完整的购买方、销售方信息和发票类型
        const currencyGroups: InvoiceApplicationAdminApi.InvoiceApplicationCurrencyGroupDto[] =
          [
            {
              currencyId: currencyId,
              invoiceType: formData.value.invoiceType, // ✅ 传递发票类型
              orgBankAccountId: formData.value.orgBankAccountId || undefined, // ✅ 传递销售方银行ID
              clientInvoiceBankId:
                formData.value.clientInvoiceBankId || undefined, // ✅ 传递购买方银行ID
              invoiceApplicationItems: newFees.map((fee: any) => ({
                orderFeeId: fee.orderFee.id,
                appliedAmount:
                  fee.appliedAmount || fee.orderFee.remainingInvoiceAmount,
                remark: '',
              })),
              // ✅ 传递商品明细（不再为 undefined）
              invoiceApplicationGoodsDtls: invoiceApplicationGoodsDtls,
            },
          ];

        // ✅ 再次验证构建后的费用明细数量
        const firstGroup = currencyGroups[0];
        if (firstGroup && firstGroup.invoiceApplicationItems.length > 0) {
          console.log('📊 构建的 currencyGroups 详情:', {
            currencyId: firstGroup.currencyId,
            invoiceType: firstGroup.invoiceType,
            itemCount: firstGroup.invoiceApplicationItems.length,
            firstItem: firstGroup.invoiceApplicationItems[0],
          });
        }

        const addData: InvoiceApplicationAdminApi.InvoiceApplicationBatchAddDto =
          {
            settlementId: settlementId,
            orgId: formData.value.orgId || getMyDefaultOrgId() || 0,
            require: formData.value.require, // ✅ 传递开票要求
            remark: formData.value.remark, // ✅ 传递备注（可能已被默认模板填充）
            currencyGroups,
          };

        console.log('📤 新增开票申请完整数据:', {
          settlementId: addData.settlementId,
          orgId: addData.orgId,
          require: addData.require,
          remark: addData.remark,
          currencyGroups: currencyGroups.map((g) => ({
            currencyId: g.currencyId,
            invoiceType: g.invoiceType,
            orgBankAccountId: g.orgBankAccountId,
            clientInvoiceBankId: g.clientInvoiceBankId,
            itemCount: g.invoiceApplicationItems.length,
          })),
        });

        const ids = await InvoiceApplicationAdminApi.add(addData);

        if (ids && ids.length > 0) {
          const newId = ids[0];
          console.log('✅ 开票申请创建成功，ID:', newId);

          // 设置表单ID，进入编辑模式
          formData.value.id = newId;

          // 触发回调，通知父组件跳转到编辑页面
          if (onCreated && newId) {
            onCreated(newId);
          }

          message.success(`开票申请创建成功`);
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
            // 不传商品明细，表示不改商品
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

    // 添加费用到表单（用于前端显示）
    addSelectedFeesToForm(selectedFees);

    // 自动加载当前币别对应的默认备注模板
    if (loadDefaultRemarkTemplate) {
      await loadDefaultRemarkTemplate();
    }

    // 根据商品明细数量决定处理方式
    if (goodsDetails.value.length === 0) {
      await autoFillGoodsDetails(newFees);
    } else if (goodsDetails.value.length === 1) {
      await mergeAmountToExistingGoods(newFees);
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
