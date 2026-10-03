import { message, Modal } from 'ant-design-vue';
import { useRoute } from 'vue-router';
import { useTabs } from '@vben/hooks';
import {
  addInvoiceIssue,
  InvoiceIssueApi,
  addApplicationsToInvoiceIssue,
} from '#/api/Invoice/InvoiceIssue';
import dayjs from 'dayjs';
import { handleExchangeRateCheck } from './use-exchange-rate-check';
import { issueFieldVisible } from '../invoice-issue-field-visibility';
import {
  mergeNamedRecipients,
  splitNamedRecipients,
  toNamedRecipientInputs,
  validateNamedRecipientLists,
} from '#/views/_shared/named-mail-recipients/named-mail-recipients';

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
  reloadDetail?: () => Promise<void>,
) {
  const route = useRoute();
  const { closeTabByKey } = useTabs();

  function confirmOverwriteRecipients() {
    return new Promise<boolean>((resolve) => {
      Modal.confirm({
        title: '覆盖收件人？',
        content:
          '所选开票申请已变化。用申请上的收件人和抄送人覆盖当前列表，还是保留你改过的内容？',
        okText: '覆盖',
        cancelText: '保留当前',
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
  }

  /** 新建时把所选申请的收件人按类型+邮箱合并。已经改过列表时先询问。 */
  async function mergeApplicationRecipients(selectedApplications: any[]) {
    const merged = mergeNamedRecipients(
      selectedApplications.map((app) => app.invoiceApplicationMailRecipients),
    );
    if (formData.value.mailRecipientsTouched) {
      const overwrite = await confirmOverwriteRecipients();
      if (!overwrite) return;
    }
    const split = splitNamedRecipients(merged);
    formData.value.mailTo = split.to;
    formData.value.mailCc = split.cc;
    formData.value.mailRecipientsTouched = false;
  }

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

    // 设置结算单位
    formData.value.settlementId = settlementId;
    formData.value.currencyId = currencyId;

    // ✅ 从第一个申请中获取结算单位名称（所有申请的结算单位应该相同）
    if (
      selectedApplications.length > 0 &&
      selectedApplications[0].settlementName
    ) {
      formData.value.settlementName = selectedApplications[0].settlementName;
    }

    // 设置发票抬头
    if (headerId) {
      if (!fixedHeaderId.value) {
        fixedHeaderId.value = headerId;
        fixedCurrencyId.value = currencyId;
      }

      formData.value.clientInvoiceBankId = headerId;
    }

    // 设置发票汇率
    if (rate !== undefined) {
      invoiceExchangeRate.value = rate;
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
      } else {
      }
    }

    // 判断是否是首次添加费用
    const isFirstTimeAdd = goodsDetails.value.length === 0;

    // 过滤出真正的新申请
    const existingAppIds = getAddedAppIds();
    const newApplications = selectedApplications.filter((app: any) => {
      return !existingAppIds.has(String(app.id));
    });

    // 如果没有新申请，直接返回
    if (newApplications.length === 0) {
      message.warning('所选申请已全部添加，无新增申请');
      return;
    }

    // 如果是新增状态（还没有发票ID），先创建发票
    if (!isEdit.value || !editId.value) {
      await createInvoiceWithApplications(newApplications);
    } else {
      // 编辑状态，直接添加申请到现有发票
      await addApplicationsToExistingInvoice(newApplications);
    }
  }

  /**
   * 创建发票并添加申请（新增状态）
   */
  async function createInvoiceWithApplications(selectedApplications: any[]) {
    try {
      // 处理商品明细；无明细时中止创建，避免空商品落库
      await mergeGoodsDetailsFromApplications(selectedApplications);
      if (!goodsDetails.value.length) {
        message.warning('商品明细为空，无法创建发票开出');
        return;
      }

      // 构建备注信息（从选择的发票信息中获取，多条用----------------------------------------分隔）
      const remarks = selectedApplications
        .map((app: any) => app.remark || '')
        .filter(Boolean);
      const combinedRemark = remarks.join(
        '\n----------------------------------------\n',
      );

      const showMailRecipients = issueFieldVisible(
        'invoiceIssueMailRecipients',
        { isEdit: false, permissionRow: null },
      );
      if (showMailRecipients) {
        await mergeApplicationRecipients(selectedApplications);
        const recipientError = validateNamedRecipientLists(
          formData.value.mailTo,
          formData.value.mailCc,
        );
        if (recipientError) {
          message.warning(recipientError);
          return;
        }
      }

      // 构建提交数据
      const submitData: InvoiceIssueApi.InvoiceIssueAddDto = {
        orgId: formData.value.orgId,
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
          amount: Number(item.amount) || 0,
          noTaxAmount: Number(item.noTaxAmount) || 0,
          taxRate: item.taxRate,
          taxAmount: Number(item.taxAmount) || 0,
          remark: item.remark,
        })),
      };
      if (
        issueFieldVisible('invoiceIssueMailRecipients', {
          isEdit: false,
          permissionRow: null,
        })
      ) {
        submitData.invoiceIssueMailRecipients = toNamedRecipientInputs(
          formData.value.mailTo,
          formData.value.mailCc,
        );
      }

      const res = await addInvoiceIssue(submitData);
      const ok = await handleExchangeRateCheck(res);

      if (ok && res.id) {
        message.success('发票创建成功');
        const createTabKey = route.fullPath;
        await router.replace(
          `/settlement-management/invoice-issue/${res.id}/edit`,
        );
        await closeTabByKey(createTabKey);
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'NO_GOODS_TO_MERGE') {
        return;
      }
      // 业务错误由 requestClient 拦截器提示
      console.error('❌ 创建发票失败:', error);
      throw error;
    }
  }

  /**
   * 添加申请到现有发票（编辑状态）
   */
  async function addApplicationsToExistingInvoice(selectedApplications: any[]) {
    try {
      // 先合并商品明细（接口需要完整商品明细入参）
      await mergeGoodsDetailsFromApplications(selectedApplications);
      if (!goodsDetails.value.length) {
        message.warning('商品明细为空，无法添加开票申请');
        return;
      }

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

      const result = await addApplicationsToInvoiceIssue(addData);
      const ok = await handleExchangeRateCheck(result);

      if (!ok) {
        // 未落库：回滚本地合并结果
        if (reloadDetail) {
          await reloadDetail();
        }
        return;
      }

      addSelectedApplicationsToForm(selectedApplications);

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
        }
      }

      message.success('申请添加成功');
    } catch (error) {
      if (error instanceof Error && error.message === 'NO_GOODS_TO_MERGE') {
        return;
      }
      // 业务错误（如币别不一致）由 requestClient 拦截器原样提示
      console.error('❌ 添加申请失败:', error);
      if (reloadDetail) {
        await reloadDetail();
      }
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
