import { computed, ref, watch } from 'vue';
import dayjs from 'dayjs';
import { useRoute } from 'vue-router';
import { useUserStore } from '@vben/stores';
import { InvoiceApplicationApi } from '#/api/Invoice/invoiceRequest';
import type { ClientInvoiceInfoAdminApi } from '#/api/sea-export/clinet-invoice-admin';
import type { CodeInvoiceAdminApi } from '#/api/system/base-data/code-invoice-admin';
import { getMyDefaultOrgId, getMyOrgCompanyNode } from '#/composables/use-my-org';

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
  const isReadOnly = computed(() => route.path.includes('/view'));

  // 加载状态
  const loading = ref(false);
  const submitLoading = ref(false);

  // 表单数据
  const formData = ref<any>({
    settlementId: '',
    orgId: 0,
    currencyId: null,
    invoiceType: InvoiceApplicationApi.InvoiceType.NormalElectric,
    require: '',
    remark: '',
    orgBankAccountId: '',
    clientInvoiceBankId: '',
    invoiceApplicationItems: [],
    invoiceApplicationGoodsDtls: [],
  });

  // 基础信息
  const applicationDate = ref(dayjs().format('YYYY-MM-DD'));
  const applicantName = ref('');
  const applicantCompany = ref<number>(0);
  const applicantCompanyName = ref('');
  const applicantCompanyId = ref(0);
  const applicantTaxNumber = ref('');
  const applicantAddress = ref('');

  // 销售方银行账号列表
  const orgBankAccounts = ref<any[]>([]);

  // 客户开票信息
  const clientInvoiceInfoList = ref<ClientInvoiceInfoAdminApi.ClientInvoiceInfoDto[]>([]);
  const selectedClientInvoiceInfo = ref<ClientInvoiceInfoAdminApi.ClientInvoiceInfoDto>();

  // 发票商品编码列表
  const codeInvoiceList = ref<CodeInvoiceAdminApi.CodeInvoiceDto[]>([]);

  // 发票汇率
  const invoiceExchangeRate = ref<number>(1.0);

  // 商品明细表格数据
  const goodsDetails = ref<any[]>([]);

  // 费用分组数据（树状结构）
  const feeGroupsData = ref<any[]>([]);

  // 选中的费用行 keys
  const selectedFeeRowKeys = ref<string[]>([]);

  // 商品明细选中行
  const selectedGoodsRows = ref<string[]>([]);

  // 当前币别代码
  const selectedCurrencyCode = ref<string>('');

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
      applicantCompanyId.value = companyNode.id;
      applicantTaxNumber.value = companyNode.unifiedSocialCreditCode || '';
      applicantAddress.value = `${companyNode.invoiceAddress || ''} ${companyNode.invoiceTel || ''}`.trim();
      orgBankAccounts.value = Array.isArray(companyNode.orgBankAccounts)
        ? companyNode.orgBankAccounts
        : [];
    } else {
      applicantCompany.value = 0;
      applicantCompanyName.value = '';
      applicantCompanyId.value = 0;
      applicantTaxNumber.value = '';
      applicantAddress.value = '';
      orgBankAccounts.value = [];
    }
  }

  /**
   * 获取已添加的费用ID集合
   */
  function getAddedFeeIds(): Set<string> {
    const items = formData.value.invoiceApplicationItems || [];
    return new Set(items.map((item: any) => String(item.orderFeeId)));
  }

  /**
   * 将已添加的费用ID转换为数组
   */
  function getAddedFeeIdsArray(): string[] {
    return Array.from(getAddedFeeIds());
  }

  /**
   * 将树状数据扁平化
   */
  function flattenTreeData(data: any[]): any[] {
    const result: any[] = [];
    function flatten(items: any[]) {
      items.forEach((item) => {
        result.push(item);
        if (item.feeDetails && item.feeDetails.length > 0) {
          flatten(item.feeDetails);
        }
      });
    }
    flatten(data);
    return result;
  }

  /**
   * 获取子表格的选中 keys
   */
  function getChildSelectedKeys(record: any): string[] {
    if (!record.feeDetails) return [];
    return selectedFeeRowKeys.value.filter((key) =>
      record.feeDetails.some((child: any) => child.id === key),
    );
  }

  // 监听归属组织变化
  watch(
    () => formData.value.orgId,
    () => {
      applyOrgCompanyInfo();
    },
  );

  return {
    // 状态
    editId,
    isEdit,
    isReadOnly,
    loading,
    submitLoading,
    formData,
    applicationDate,
    applicantName,
    applicantCompany,
    applicantCompanyName,
    applicantCompanyId,
    applicantTaxNumber,
    applicantAddress,
    orgBankAccounts,
    clientInvoiceInfoList,
    selectedClientInvoiceInfo,
    codeInvoiceList,
    invoiceExchangeRate,
    goodsDetails,
    feeGroupsData,
    selectedFeeRowKeys,
    selectedGoodsRows,
    selectedCurrencyCode,

    // 方法
    initApplicantInfo,
    applyOrgCompanyInfo,
    getAddedFeeIds,
    getAddedFeeIdsArray,
    flattenTreeData,
    getChildSelectedKeys,
  };
}
