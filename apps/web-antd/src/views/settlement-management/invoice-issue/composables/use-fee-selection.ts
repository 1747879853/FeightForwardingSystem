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
      const res = await addInvoiceIssue(submitData);
      const newId = res.id; // 保存新创建的发票ID
      message.success('发票创建成功');

      console.log('✅ 发票创建成功，ID:', res.id);

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
      // ✅ 编辑状态下，只处理新增的申请商品明细，避免重复添加
      console.log('✅ 编辑状态：只处理新增申请的商品明细，数量:', selectedApplications.length);

      // ✅ 使用合并逻辑处理新增申请的商品明细
      await mergeGoodsDetailsFromApplications(selectedApplications);

      // ✅ 更新 invoiceIssueItems，确保合计中的申请金额正确显示
      console.log('🔄 更新 invoiceIssueItems...');
      addSelectedApplicationsToForm(selectedApplications);
      console.log(
        '✅ invoiceIssueItems 已更新，当前数量:',
        formData.value.invoiceIssueItems?.length || 0,
      );

      // ✅ 合并申请组数据（包括已有的和新增的）
      if (selectedApplications.length > 0) {
        const existingAppIds = new Set<string>();
        applicationGroupsData.value.forEach((group: any) => {
          if (group.id) {
            existingAppIds.add(String(group.id));
          }
        });

        const newGroups = selectedApplications.filter((group: any) => {
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
        }
      }

      // 构建添加申请数据（包含合并后的商品明细）
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

      console.log('📤 发送添加申请请求:', {
        新增申请数量: selectedApplications.length,
        商品明细数量: goodsDetails.value.length,
        总金额: goodsDetails.value.reduce(
          (sum: number, item: any) => sum + (item.amount || 0),
          0,
        ).toFixed(2),
      });

      // 调用添加申请接口
      await addApplicationsToInvoiceIssue(addData);
      message.success('申请添加成功');

      console.log('✅ 申请添加成功');
    } catch (error) {
      console.error('❌ 添加申请失败:', error);
      message.error('添加申请失败');
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
