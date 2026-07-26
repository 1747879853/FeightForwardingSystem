import { computed, ref, watch } from 'vue';
import dayjs from 'dayjs';
import { useRoute } from 'vue-router';
import { useUserStore } from '@vben/stores';
import { InvoiceIssueApi } from '#/api/Invoice/InvoiceIssue';
import type { ClientInvoiceInfoAdminApi } from '#/api/sea-export/clinet-invoice-admin';
import type { CodeInvoiceAdminApi } from '#/api/system/base-data/code-invoice-admin';
import {
  getMyDefaultOrgId,
  getMyOrgCompanyNode,
} from '#/composables/use-my-org';

/**
 * 表单数据和基础状态管理
 */
export function useFormData() {
  const route = useRoute();
  const userStore = useUserStore();

  // 路由相关
  const editId = computed<string | undefined>(() => {
    const id = route.params.id;
    if (Array.isArray(id)) return id[0];
    return id ? String(id) : undefined;
  });

  const isEdit = computed(() => !!editId.value);

  // 加载状态
  const loading = ref(false);
  const submitLoading = ref(false);

  // 表单数据
  const formData = ref<any>({
    settlementId: '',
    settlementName: '', // ✅ 新增：结算单位名称
    orgId: 0,
    currencyId: null,
    invoiceType: 'p', // 默认普通发票-电票
    invoiceIssueType: InvoiceIssueApi.InvoiceIssueType.NuonuoInterface,
    require: '',
    remark: '',
    orgBankAccountId: '',
    clientInvoiceBankId: '',
    invoiceIssueItems: [],
    invoiceIssueGoodsDtls: [],
  });

  // 基础信息
  const invoiceIssueTime = ref(dayjs().format('YYYY-MM-DD'));
  const applicantName = ref('');
  const applicantCompany = ref<number>(0);
  const applicantCompanyName = ref('');
  const applicantTaxNumber = ref('');
  const applicantAddress = ref('');

  // 销售方银行账号列表
  const orgBankAccounts = ref<any[]>([]);

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

  // 商品明细表格数据
  const goodsDetails = ref<any[]>([]);

  // 申请分组数据（从抽屉中选择的数据）
  const applicationGroupsData = ref<any[]>([]);

  // 首次选择的发票抬头和币别（用于锁定）
  const fixedHeaderId = ref<string>('');
  const fixedCurrencyId = ref<number | undefined>(undefined);

  /**
   * 初始化申请人信息
   */
  function initApplicantInfo() {
    const userInfo = userStore.userInfo;
    if (userInfo) {
      applicantName.value = userInfo.realName || userInfo.username || '';
    }
    if (!formData.value.orgId) {
      formData.value.orgId = getMyDefaultOrgId() ?? 0;
    }
    applyOrgCompanyInfo();
  }

  /**
   * 根据归属组织填充开票公司信息
   */
  function applyOrgCompanyInfo() {
    const companyNode = getMyOrgCompanyNode(formData.value.orgId);
    if (companyNode) {
      applicantCompany.value = companyNode.id;
      applicantCompanyName.value = companyNode.displayName || '';
      applicantTaxNumber.value = companyNode.unifiedSocialCreditCode || '';
      applicantAddress.value =
        `${companyNode.invoiceAddress || ''} ${companyNode.invoiceTel || ''}`.trim();
      orgBankAccounts.value = Array.isArray(companyNode.orgBankAccounts)
        ? companyNode.orgBankAccounts
        : [];
    } else {
      applicantCompany.value = 0;
      applicantCompanyName.value = '';
      applicantTaxNumber.value = '';
      applicantAddress.value = '';
      orgBankAccounts.value = [];
    }
  }

  /**
   * 获取已添加的申请ID集合
   */
  function getAddedAppIds(): Set<string> {
    const items = formData.value.invoiceIssueItems || [];
    return new Set(items.map((item: any) => String(item.invoiceApplicationId)));
  }

  /**
   * 将已添加的申请ID转换为数组
   */
  function getAddedAppIdsArray(): string[] {
    return Array.from(getAddedAppIds());
  }

  /**
   * 将树状数据扁平化
   */
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

  // 监听归属组织变化
  watch(
    () => formData.value.orgId,
    () => {
      applyOrgCompanyInfo();
      // 如果币别已存在，立即更新银行选择
      if (formData.value.currencyId) {
        // 这里会在 use-invoice-info 中处理
      } else {
        formData.value.orgBankAccountId = undefined;
      }
    },
  );

  return {
    // 状态
    editId,
    isEdit,
    loading,
    submitLoading,
    formData,
    invoiceIssueTime,
    applicantName,
    applicantCompany,
    applicantCompanyName,
    applicantTaxNumber,
    applicantAddress,
    orgBankAccounts,
    clientInvoiceInfoList,
    selectedClientInvoiceInfo,
    codeInvoiceList,
    invoiceExchangeRate,
    goodsDetails,
    applicationGroupsData,
    fixedHeaderId,
    fixedCurrencyId,

    // 方法
    initApplicantInfo,
    applyOrgCompanyInfo,
    getAddedAppIds,
    getAddedAppIdsArray,
    flattenTreeData,
  };
}
