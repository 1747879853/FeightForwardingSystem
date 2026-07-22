<script lang="ts" setup>
import { computed, h, nextTick, ref, watch } from 'vue';
import dayjs from 'dayjs';

import {
  Button,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Space,
  Spin,
  Table,
} from 'ant-design-vue';

import { ClientSelect, CurrencySelect } from '#/adapter/component';
import { InvoiceIssueApi } from '#/api/Invoice/InvoiceIssue';
import { getSubmittedApplicationList } from '#/api/Invoice/InvoiceIssue';
import { InvoiceApplicationApi } from '#/api/Invoice/invoiceRequest';
import { getCurrencyDetail } from '#/api/system/base-data/currency-admin';
import { getExchangeRatePagedList } from '#/api/system/base-data/exchange-rate-admin';
import { getInvoiceTypeOptions } from '#/views/fee-management/invoice-application/data';

interface Props {
  visible: boolean;
  settlementId?: string; // 已选择的结算单位（固定）
  currencyId?: number; // 已选择的币别（固定）
  headerId?: string; // 固定的发票抬头ID
  addedAppIds?: string[]; // 已添加的申请ID列表
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  settlementId: '',
  currencyId: undefined,
  headerId: '',
  addedAppIds: () => [],
});

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (
    e: 'save',
    data: {
      selectedApplications: any[];
      settlementId: string;
      currencyId: number;
      headerId: string;
      invoiceExchangeRate?: number;
      applicationGroupsData?: any[];
    },
  ): void;
}>();

// 抽屉相关状态
const drawerVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
});

const feeDrawerLoading = ref(false);
const selectedSettlementId = ref<string>('');
const selectedCurrencyId = ref<number | undefined>();
const selectedHeaderId = ref<string>(''); // 选择的发票抬头ID
const selectedCurrencyCode = ref<string>('');

// 抽屉筛选条件
const keyWord = ref<string>(''); // 编号（申请单号）
const filterApplyTimeStart = ref<string>(''); // 申请日期起
const filterApplyTimeEnd = ref<string>(''); // 申请日期止
const filterHeader = ref<string>(''); // 发票抬头
const filterCurrencyId = ref<number | undefined>(undefined); // 发票币别
const filterApplyUserId = ref<number | undefined>(undefined); // 申请人

// ✅ 新增：用于 RangePicker 的日期范围状态
const filterApplyTimeRange = ref<[dayjs.Dayjs, dayjs.Dayjs] | undefined>(
  undefined,
);

// 申请分组数据
const applicationGroupsData = ref<any[]>([]);

// 选中的申请行 keys
const selectedAppRowKeys = ref<string[]>([]);

// 发票汇率
const invoiceExchangeRate = ref<number>(1.0);

// 驳回原因
const rejectReason = ref<string>('');

// ✅ 驳回确认对话框框状态
const rejectModalVisible = ref(false);
const rejectApplications = ref<any[]>([]);

/** 处理父级表格选择变化 */
function handleParentSelectionChange(selectedRowKeys: any[]) {
  selectedAppRowKeys.value = selectedRowKeys.map((key) => String(key));
}

/** 从选中的申请中更新币别 */
async function updateCurrencyFromSelectedApplications() {
  const allSelected = flattenTreeData(applicationGroupsData.value);
  const selectedApps = allSelected.filter((item: any) =>
    selectedAppRowKeys.value.includes(item.id),
  );

  if (selectedApps.length > 0) {
    const firstApp = selectedApps[0];
    const currencyId = firstApp.currencyId;

    if (currencyId && currencyId !== selectedCurrencyId.value) {
      selectedCurrencyId.value = currencyId;
      await loadDefaultExchangeRate(currencyId);
    }
  }
}

/** 加载默认汇率 */
async function loadDefaultExchangeRate(currencyId: number) {
  try {
    const now = dayjs();
    const currentDate = now.format('YYYY-MM-DD');

    const result = await getExchangeRatePagedList({
      CurrencyId: currencyId,
      PageIndex: 1,
      PageSize: 100,
    });

    if (result.items && result.items.length > 0) {
      const matchedRate = result.items.find((item: any) => {
        const startDate = item.startDate ? dayjs(item.startDate) : null;
        const endDate = item.endDate ? dayjs(item.endDate) : null;

        const isStartDateValid =
          !startDate || now.isAfter(startDate) || now.isSame(startDate);
        const isEndDateValid =
          !endDate || now.isBefore(endDate) || now.isSame(endDate);

        return isStartDateValid && isEndDateValid;
      });

      if (matchedRate) {
        const defaultRate = matchedRate.invoiceValue ?? 1.0;
        invoiceExchangeRate.value = defaultRate;
      } else {
        const firstRate = result.items[0];
        if (firstRate) {
          const defaultRate = firstRate.invoiceValue ?? 1.0;
          invoiceExchangeRate.value = defaultRate;
        } else {
          invoiceExchangeRate.value = 1.0;
        }
      }
    } else {
      invoiceExchangeRate.value = 1.0;
    }

    try {
      const currencyDetail = await getCurrencyDetail(currencyId);
      selectedCurrencyCode.value = currencyDetail.code || '';
    } catch (error) {
      console.error('获取币别详情失败:', error);
      selectedCurrencyCode.value = '';
    }
  } catch (error) {
    console.error('加载默认汇率失败:', error);
    invoiceExchangeRate.value = 1.0;
  }
}

/** 获取发票类型显示文本 */
function getInvoiceTypeText(invoiceType: string | number): string {
  const options = getInvoiceTypeOptions();
  const option = options.find((opt) => opt.value === invoiceType);
  return option ? option.label : '-';
}

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

/** 从表格获取选中的申请 */
function getSelectedApplicationsFromTable(): any[] {
  const allSelected = flattenTreeData(applicationGroupsData.value);
  const selectedApps = allSelected.filter((item: any) =>
    selectedAppRowKeys.value.includes(item.id),
  );

  return selectedApps;
}

/** 重置筛选条件 */
function handleResetFilter() {
  selectedSettlementId.value = '';
  selectedCurrencyId.value = undefined;
  selectedHeaderId.value = '';
  keyWord.value = '';
  filterApplyTimeStart.value = '';
  filterApplyTimeEnd.value = '';
  filterApplyTimeRange.value = undefined;
  filterHeader.value = '';
  filterCurrencyId.value = undefined;
  filterApplyUserId.value = undefined;
  selectedAppRowKeys.value = [];
  loadApplicationGroupData();
}

/** 处理日期范围变化 */
function handleApplyTimeRangeChange(
  dates: [dayjs.Dayjs, dayjs.Dayjs] | [string, string] | undefined,
) {
  if (dates && dates.length === 2) {
    const startDate = dates[0];
    const endDate = dates[1];

    // 处理 Dayjs 对象或字符串
    if (typeof startDate === 'string') {
      filterApplyTimeStart.value = startDate;
    } else {
      filterApplyTimeStart.value = startDate?.format('YYYY-MM-DD') || '';
    }

    if (typeof endDate === 'string') {
      filterApplyTimeEnd.value = endDate;
    } else {
      filterApplyTimeEnd.value = endDate?.format('YYYY-MM-DD') || '';
    }
  } else {
    filterApplyTimeStart.value = '';
    filterApplyTimeEnd.value = '';
  }
}

/** 打开费用选择抽屉 */
function handleOpenFeeDrawer() {
  if (!props.settlementId) {
    selectedSettlementId.value = '';
    selectedCurrencyId.value = undefined;
    selectedHeaderId.value = '';
    selectedAppRowKeys.value = [];
  } else {
    selectedSettlementId.value = props.settlementId;
    selectedCurrencyId.value = props.currencyId;
    selectedHeaderId.value = props.headerId || '';
  }

  drawerVisible.value = true;
  nextTick(() => {
    loadApplicationGroupData();
  });
}

/** 保存费用选择 */
async function handleSaveFeeSelection() {
  const selectedApplications = getSelectedApplicationsFromTable();

  if (selectedApplications.length === 0) {
    message.warning('请至少选择一个申请');
    return;
  }

  // ✅ 校验1：检查用户本次选择的多个申请之间，发票抬头和币别是否一致
  if (selectedApplications.length > 1) {
    const firstApp = selectedApplications[0];
    const expectedHeaderId = firstApp.clientInvoiceBankId;
    const expectedCurrencyId = firstApp.currencyId;

    const inconsistentApps: any[] = [];

    selectedApplications.forEach((app: any, index: number) => {
      if (index === 0) return; // 跳过第一个

      const reasons: string[] = [];

      // 检查发票抬头是否一致
      if (app.clientInvoiceBankId !== expectedHeaderId) {
        reasons.push(
          `发票抬头不一致（期望：${expectedHeaderId}，实际：${app.clientInvoiceBankId}）`,
        );
      }

      // 检查币别是否一致
      if (app.currencyId !== expectedCurrencyId) {
        reasons.push(
          `币别不一致（期望：${expectedCurrencyId}，实际：${app.currencyId}）`,
        );
      }

      if (reasons.length > 0) {
        inconsistentApps.push({
          applicationNo: app.applicationNo,
          reasons,
        });
      }
    });

    if (inconsistentApps.length > 0) {
      const errorMessages = inconsistentApps.map((app) => {
        return `• 申请单号 ${app.applicationNo}：${app.reasons.join('；')}`;
      });

      message.error({
        content: h('div', [
          h(
            'div',
            { style: 'font-weight: bold; margin-bottom: 8px;' },
            '所选申请的发票抬头或币别不一致：',
          ),
          ...errorMessages.map((msg) =>
            h('div', { style: 'margin-left: 16px; margin-bottom: 4px;' }, msg),
          ),
          h(
            'div',
            { style: 'margin-top: 8px; color: #ff4d4f;' },
            '请确保所有申请的发票抬头和币别保持一致。',
          ),
        ]),
        duration: 5,
      });
      console.error('❌ 校验失败，申请之间不一致:', inconsistentApps);
      return;
    }

    console.log('✅ 本次选择的申请之间一致性校验通过');
  }

  // ✅ 校验2：仅当 props.headerId 或 props.currencyId 有值时（即非首次添加），才需要与首次选择的一致性校验
  if (props.headerId !== '' || props.currencyId !== null) {
    // 收集不符合要求的申请
    const invalidApplications: any[] = [];

    selectedApplications.forEach((app: any) => {
      const reasons: string[] = [];

      // 校验发票抬头
      if (props.headerId && app.clientInvoiceBankId !== props.headerId) {
        reasons.push(
          `发票抬头不一致（期望：${props.headerId}，实际：${app.clientInvoiceBankId}）`,
        );
      }

      // 校验币别
      if (
        props.currencyId !== undefined &&
        app.currencyId !== props.currencyId
      ) {
        reasons.push(
          `币别不一致（期望：${props.currencyId}，实际：${app.currencyId}）`,
        );
      }

      if (reasons.length > 0) {
        invalidApplications.push({
          applicationNo: app.applicationNo,
          reasons,
        });
      }
    });

    // 如果有不符合要求的申请，阻止保存并提示用户
    if (invalidApplications.length > 0) {
      const errorMessages = invalidApplications.map((app) => {
        return `• 申请单号 ${app.applicationNo}：${app.reasons.join('；')}`;
      });

      message.error({
        content: h('div', [
          h(
            'div',
            { style: 'font-weight: bold; margin-bottom: 8px;' },
            '所选申请与首次选择不一致：',
          ),
          ...errorMessages.map((msg) =>
            h('div', { style: 'margin-left: 16px; margin-bottom: 4px;' }, msg),
          ),
          h(
            'div',
            { style: 'margin-top: 8px; color: #ff4d4f;' },
            '请确保所有申请的发票抬头和币别与首次选择的保持一致。',
          ),
        ]),
        duration: 5,
      });
      console.error('❌ 校验失败，与首次选择不一致:', invalidApplications);
      return;
    }
  } else {
    console.log('✅ 首次添加，跳过与历史数据的一致性校验');
  }

  const firstApp = selectedApplications[0];
  const settlementId = firstApp.settlementId;
  const currencyId = firstApp.currencyId;
  const headerId = selectedHeaderId.value || firstApp.clientInvoiceBankId;

  // ✅ 从第一个选中的开票申请中获取开票汇率
  const appInvoiceExchangeRate =
    firstApp.invoiceExchangeRate || invoiceExchangeRate.value;

  if (!settlementId) {
    message.warning('无法获取结算单位信息');
    return;
  }

  console.log('✅ FeeSelectionDrawerForIssue 准备保存数据:');
  console.log('  - 选中申请数量:', selectedApplications.length);
  console.log('  - 结算单位ID:', settlementId);
  console.log('  - 币别ID:', currencyId);
  console.log('  - 发票抬头ID:', headerId);
  console.log('  - 开票汇率（从申请获取）:', appInvoiceExchangeRate);
  console.log(
    '  - applicationGroupsData 数量:',
    applicationGroupsData.value.length,
  );

  emit('save', {
    selectedApplications,
    settlementId,
    currencyId,
    headerId,
    invoiceExchangeRate: appInvoiceExchangeRate, // ✅ 使用从申请中获取的汇率
    applicationGroupsData: applicationGroupsData.value,
  });

  drawerVisible.value = false;
}

/** 加载申请分组数据 */
async function loadApplicationGroupData() {
  feeDrawerLoading.value = true;
  try {
    const params: InvoiceIssueApi.InvoiceIssueApplicationQueryDto = {};

    if (selectedSettlementId.value) {
      params.settlementId = selectedSettlementId.value;
    }
    if (selectedCurrencyId.value !== undefined) {
      params.currencyId = selectedCurrencyId.value;
    }
    if (selectedHeaderId.value) {
      params.header = selectedHeaderId.value;
    }

    // 合并委托编号和主提单号到 keyword 参数
    if (keyWord.value) {
      params.applicationNo = keyWord.value;
    }

    // 申请日期范围
    if (filterApplyTimeStart.value) {
      params.applyTimeStart = filterApplyTimeStart.value;
    }
    if (filterApplyTimeEnd.value) {
      params.applyTimeEnd = filterApplyTimeEnd.value;
    }

    // 发票抬头
    if (filterHeader.value) {
      params.header = filterHeader.value;
    }

    // 发票币别
    if (filterCurrencyId.value !== undefined) {
      params.currencyId = filterCurrencyId.value;
    }

    // 申请人
    if (filterApplyUserId.value !== undefined) {
      params.applyUserId = filterApplyUserId.value;
    }

    const result = await getSubmittedApplicationList(params);

    // 转换为树状结构
    const treeData = transformToTreeData(result || []);
    applicationGroupsData.value = treeData;
  } catch (error) {
    console.error('❌ 加载申请数据失败:', error);
    message.error('加载申请数据失败');
  } finally {
    feeDrawerLoading.value = false;
  }
}

/** 获取已添加的申请ID列表 */
function getAddedAppIds(): Set<string> {
  // ✅ 从 props 中获取已添加的申请ID列表
  return new Set(props.addedAppIds || []);
}

/** 将申请数据转换为树状结构 */
function transformToTreeData(
  applications: InvoiceIssueApi.InvoiceIssueApplicationDto[],
): any[] {
  const treeData: any[] = [];
  const addedAppIds = getAddedAppIds();

  applications.forEach((app) => {
    const childrenList: any[] = [];

    if (app.invoiceApplicationItems && app.invoiceApplicationItems.length > 0) {
      app.invoiceApplicationItems.forEach((item, index) => {
        const isAlreadyAdded = addedAppIds.has(String(app.id));

        const childNode: any = {
          id: item.id,
          parentId: app.id,
          orderFee: item.orderFee,
          appliedAmount: item.appliedAmount,
          checked: false,
          disabled: true, // ✅ 二级数据禁用选择，只做展示
          alreadyAdded: isAlreadyAdded,
          // 二级字段
          sequenceNumber: index + 1, // ✅ 序号从1开始
          commissionNum: item.orderFee?.transportOrder?.commissionNum || '-', // 委托编号
          mblNum: item.orderFee?.transportOrder?.mblNum || '-', // 主提单号
          hblNum: '-', // 分提单号（需要从其他地方获取）
          clientName: item.orderFee?.transportOrder?.clientName || '-', // 委托单位
          etd: item.orderFee?.transportOrder?.etd || '-', // 开船日期
          feeName: item.orderFee?.feeCodeName || '-', // 费用名称
          payReceiveType: item.orderFee?.paySide === 1 ? '应付' : '应收', // 收付
          currencyCode: item.orderFee?.currencyCode || '-', // 币别
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
      app.invoiceApplicationItems.forEach((item) => {
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

    console.log(
      '📋 申请',
      app.applicationNo,
      '提取的委托编号:',
      Array.from(commissionNums),
    );
    console.log(
      '📋 申请',
      app.applicationNo,
      '提取的主提单号:',
      Array.from(mblNums),
    );

    const parentNode: any = {
      id: app.id,
      parentId: null,
      // 一级字段
      // ✅ 使用后端返回的 companyName 作为所属公司名称
      companyName: app.companyName || '-',
      orgId: app.orgId, // ✅ 归属组织ID
      applicationNo: app.applicationNo || '-', // 申请单号
      // ✅ 使用 clientInvoiceInfo.header 作为发票抬头
      header: app.clientInvoiceInfo?.header || '-',
      currencyCode: app.currencyCode || '-', // 币别
      remark: app.remark || '-', // 备注
      applyUserName: app.applyUserName || '-', // 申请人
      applyTime: formattedApplyTime, // ✅ 格式化后的申请日期
      require: app.require || '-', // 开票要求
      invoiceRemark: '-', // 发票备注
      invoiceType: app.invoiceType || '-', // 发票类型
      // ✅ 开票汇率（从申请中获取）
      invoiceExchangeRate: app.invoiceExchangeRate || 1.0,
      // ✅ 删除了 pushEmail 字段
      totalAppliedAmount: app.totalAppliedAmount || 0, // 申请开票原币金额
      // ✅ 开票金额 = 开票原币金额 * 开票汇率
      invoiceAmount:
        (app.totalAppliedAmount || 0) * (app.invoiceExchangeRate || 1.0),
      checked: false,
      selectable: true, // ✅ 一级可选择
      invoiceApplicationItems: childrenList, // 使用 invoiceApplicationItems 作为子节点
      // ✅ 保留商品明细数据（用于合并商品明细）
      invoiceApplicationGoodsDtls: app.invoiceApplicationGoodsDtls || [],
      // ✅ 新增：委托编号和主提单号（从子节点提取，多个用、分隔）
      commissionNum: Array.from(commissionNums).join('、') || '-',
      mblNum: Array.from(mblNums).join('、') || '-',
      // 保留原始数据
      settlementId: app.settlementId,
      currencyId: app.currencyId,
      clientInvoiceBankId: app.clientInvoiceBankId,
      orgBankAccountId: app.orgBankAccountId,
      totalGoodsAmount: app.totalGoodsAmount,
      appliedAmountRmb: app.appliedAmountRmb,
      amountMatched: app.amountMatched,
      // ✅ 保留完整的 clientInvoiceInfo 对象（后续可能需要其他字段）
      clientInvoiceInfo: app.clientInvoiceInfo,
    };

    treeData.push(parentNode);
  });

  return treeData;
}

// 监听 props 变化
watch(
  () => props.settlementId,
  (newValue) => {
    if (newValue) {
      selectedSettlementId.value = newValue;
    }
  },
);

watch(
  () => props.currencyId,
  (newValue) => {
    if (newValue !== undefined) {
      selectedCurrencyId.value = newValue;
    }
  },
);

watch(
  () => props.headerId,
  (newValue) => {
    if (newValue) {
      selectedHeaderId.value = newValue;
    }
  },
);

// 申请表格列定义（一级 - 开票申请）
const appParentColumns = computed(() => [
  {
    title: '可开票',
    dataIndex: 'amountMatched',
    key: 'amountMatched',
    Width: 50,
    align: 'center' as const,
  },
  {
    title: '所属公司',
    dataIndex: 'companyName',
    key: 'companyName',
    minWidth: 200,
    ellipsis: true,
  },
  {
    title: '申请单号',
    dataIndex: 'applicationNo',
    key: 'applicationNo',
    minWidth: 180,
    ellipsis: true,
  },
  {
    title: '发票抬头',
    dataIndex: 'header',
    key: 'header',
    minWidth: 250,
    ellipsis: true,
  },
  {
    title: '币别',
    dataIndex: 'currencyCode',
    key: 'currencyCode',
    minWidth: 80,
  },
  {
    title: '发票备注',
    dataIndex: 'remark',
    key: 'remark',
    minWidth: 150,
    ellipsis: true,
  },
  {
    title: '申请人',
    dataIndex: 'applyUserName',
    key: 'applyUserName',
    minWidth: 100,
  },
  {
    title: '申请日期',
    dataIndex: 'applyTime',
    key: 'applyTime',
    minWidth: 280,
  },
  {
    title: '开票要求',
    dataIndex: 'require',
    key: 'require',
    minWidth: 150,
    ellipsis: true,
  },
  {
    title: '发票类型',
    dataIndex: 'invoiceType',
    key: 'invoiceType',
    minWidth: 160,
  },
  {
    title: '开票汇率',
    dataIndex: 'invoiceExchangeRate',
    key: 'invoiceExchangeRate',
    minWidth: 100,
    align: 'right' as const,
  },

  {
    title: '开票原币金额',
    dataIndex: 'totalAppliedAmount',
    key: 'totalAppliedAmount',
    minWidth: 140,
    align: 'right' as const,
  },
  {
    title: '开票金额',
    dataIndex: 'invoiceAmount',
    key: 'invoiceAmount',
    minWidth: 140,
    align: 'right' as const,
  },
]);

// 申请表格列定义（二级 - 费用明细）
const appChildColumns = computed(() => [
  {
    title: '序号',
    dataIndex: 'sequenceNumber',
    key: 'sequenceNumber',
    minWidth: 60,
    align: 'center' as const,
  },

  {
    title: '委托编号',
    dataIndex: 'commissionNum',
    key: 'commissionNum',
    minWidth: 140,
    ellipsis: true,
  },
  {
    title: '主提单号',
    dataIndex: 'mblNum',
    key: 'mblNum',
    minWidth: 140,
    ellipsis: true,
  },
  {
    title: '分提单号',
    dataIndex: 'hblNum',
    key: 'hblNum',
    minWidth: 140,
    ellipsis: true,
  },
  {
    title: '委托单位',
    dataIndex: 'clientName',
    key: 'clientName',
    minWidth: 180,
    ellipsis: true,
  },
  {
    title: '开船日期',
    dataIndex: 'etd',
    key: 'etd',
    minWidth: 120,
  },
  {
    title: '费用名称',
    dataIndex: 'feeName',
    key: 'feeName',
    minWidth: 200,
    ellipsis: true,
  },
  {
    title: '收付',
    dataIndex: 'payReceiveType',
    key: 'payReceiveType',
    minWidth: 80,
    align: 'center' as const,
  },
  {
    title: '币别',
    dataIndex: 'currencyCode',
    key: 'currencyCode',
    minWidth: 80,
    align: 'center' as const,
  },
  {
    title: '金额',
    dataIndex: 'amount',
    key: 'amount',
    minWidth: 120,
    align: 'right' as const,
  },
  {
    title: '汇率',
    dataIndex: 'exchangeRate',
    key: 'exchangeRate',
    minWidth: 80,
    align: 'right' as const,
  },
  {
    title: '销售',
    dataIndex: 'salesPerson',
    key: 'salesPerson',
    minWidth: 100,
  },
  {
    title: '发票币别',
    dataIndex: 'invoiceCurrencyCode',
    key: 'invoiceCurrencyCode',
    minWidth: 100,
    align: 'center' as const,
  },
  {
    title: '开票申请金额',
    dataIndex: 'appliedAmountOriginal',
    key: 'appliedAmountOriginal',
    minWidth: 140,
    align: 'right' as const,
  },
  {
    title: '结算金额',
    dataIndex: 'settlementAmount',
    key: 'settlementAmount',
    minWidth: 120,
    align: 'right' as const,
  },
]);

/** 批量驳回开票申请 */
async function handleBatchReject() {
  const selectedApplications = getSelectedApplicationsFromTable();

  if (selectedApplications.length === 0) {
    message.warning('请至少选择一个申请进行驳回');
    return;
  }

  // ✅ 保存选中的申请，并打开自定义 Modal
  rejectApplications.value = selectedApplications;
  rejectReason.value = '';
  rejectModalVisible.value = true;
}

/** 确认驳回 */
async function handleConfirmReject() {
  // 验证驳回原因
  if (!rejectReason.value || rejectReason.value.trim() === '') {
    message.error('请输入驳回原因');
    return;
  }

  try {
    feeDrawerLoading.value = true;

    // 批量驳回所有选中的申请
    const promises = rejectApplications.value.map((app: any) => {
      return InvoiceApplicationApi.auditAsync({
        id: app.id,
        rejectReason: rejectReason.value.trim(),
      });
    });

    await Promise.all(promises);

    message.success(`成功驳回 ${rejectApplications.value.length} 个开票申请`);

    // 关闭对话框
    rejectModalVisible.value = false;

    // 清空选择状态
    selectedAppRowKeys.value = [];

    // 重新加载数据
    await loadApplicationGroupData();
  } catch (error) {
    console.error('❌ 驳回开票申请失败:', error);
    message.error('驳回开票申请失败，请重试');
  } finally {
    feeDrawerLoading.value = false;
  }
}

/** 取消驳回 */
function handleCancelReject() {
  rejectModalVisible.value = false;
  rejectReason.value = '';
  rejectApplications.value = [];
}

// 暴露方法给父组件
defineExpose({
  handleOpenFeeDrawer,
  loadApplicationGroupData,
});
</script>

<template>
  <Drawer
    v-model:open="drawerVisible"
    title="选择已提交的开票申请"
    width="1600"
    :footer-style="{ textAlign: 'right' }"
  >
    <Spin :spinning="feeDrawerLoading">
      <!-- 筛选条件 -->
      <div
        style="
          padding: 10px 5px;
          margin-bottom: 16px;
          background: #fafafa;
          border: 1px solid #d9d9d9;
          border-radius: 4px;
        "
      >
        <div
          style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center"
        >
          <div
            style="display: flex; gap: 8px; align-items: center; width: 305px"
          >
            <span style="min-width: 70px; font-size: 14px; color: #333"
              >编号:</span
            >
            <Input
              v-model:value="keyWord"
              placeholder="请输入申请单号"
              style="flex: 1"
              allow-clear
            />
          </div>
          <div
            style="display: flex; gap: 8px; align-items: center; width: 305px"
          >
            <span style="min-width: 70px; font-size: 14px; color: #333"
              >申请日期:</span
            >
            <DatePicker.RangePicker
              v-model:value="filterApplyTimeRange"
              @update:value="handleApplyTimeRangeChange"
              style="flex: 1"
              format="YYYY-MM-DD"
              :placeholder="['开始日期', '结束日期']"
            />
          </div>
          <div
            style="display: flex; gap: 8px; align-items: center; width: 305px"
          >
            <span style="min-width: 70px; font-size: 14px; color: #333"
              >发票抬头:</span
            >
            <Input
              v-model:value="filterHeader"
              placeholder="请输入发票抬头"
              style="flex: 1"
              allow-clear
              :disabled="!!selectedHeaderId"
            />
          </div>
          <div
            style="display: flex; gap: 8px; align-items: center; width: 305px"
          >
            <span style="min-width: 70px; font-size: 14px; color: #333"
              >发票币别:</span
            >
            <CurrencySelect
              v-model:model-value="filterCurrencyId"
              placeholder="请选择发票币别"
              style="flex: 1"
              :disabled="!!selectedCurrencyId"
            />
          </div>
          <div
            style="display: flex; gap: 8px; align-items: center; width: 305px"
          >
            <span style="min-width: 70px; font-size: 14px; color: #333"
              >申请人:</span
            >
            <Input
              v-model:value="filterApplyUserId"
              placeholder="请输入申请人"
              style="flex: 1"
              allow-clear
            />
          </div>
          <div style="display: flex; flex: 1; justify-content: flex-end">
            <Button type="primary" @click="loadApplicationGroupData"
              >查询</Button
            >
          </div>
        </div>
      </div>

      <!-- 申请表格 -->
      <div style="border: 1px solid #d9d9d9; border-radius: 4px">
        <Table
          :columns="appParentColumns"
          :data-source="applicationGroupsData"
          :pagination="false"
          bordered
          size="small"
          :expandable="{
            defaultExpandAllRows: true,
          }"
          row-key="id"
          :scroll="{ y: 500 }"
          :row-selection="{
            type: 'checkbox',
            selectedRowKeys: selectedAppRowKeys,
            onChange: handleParentSelectionChange,
          }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'amountMatched'">
              <span
                :style="{
                  color: record.amountMatched ? '#52c41a' : '#ff4d4f',
                  fontWeight: 'bold',
                }"
              >
                {{ record.amountMatched ? '✓ 可开' : '✗ 不可开' }}
              </span>
            </template>
            <template v-else-if="column.key === 'invoiceType'">
              <span>{{ getInvoiceTypeText(record.invoiceType) }}</span>
            </template>
          </template>
          <template #expandedRowRender="{ record }">
            <Table
              v-if="
                record.invoiceApplicationItems &&
                record.invoiceApplicationItems.length > 0
              "
              :columns="appChildColumns"
              :data-source="record.invoiceApplicationItems"
              :pagination="false"
              bordered
              size="small"
              row-key="id"
            >
              <template #bodyCell="{ column, record: childRecord }">
                <template v-if="column.key === 'alreadyAdded'">
                  <span
                    v-if="childRecord.alreadyAdded"
                    style="font-size: 12px; color: #999"
                  >
                    ✓ 已添加
                  </span>
                </template>
              </template>
            </Table>
          </template>
        </Table>
      </div>
    </Spin>

    <template #footer>
      <div
        style="
          display: flex;
          gap: 8px;
          align-items: center;
          justify-content: space-between;
        "
      >
        <!-- 左侧：币别汇率转换 -->
        <div
          v-if="selectedCurrencyId && selectedCurrencyId !== 1"
          style="display: flex; gap: 8px; align-items: center"
        >
          <span style="font-size: 14px; color: #666"
            >币别汇率转换 ({{ selectedCurrencyCode || '外币' }}兑人民币)</span
          >
          <Form layout="inline" size="small">
            <Form.Item label="开票汇率">
              <InputNumber
                v-model:value="invoiceExchangeRate"
                :min="0"
                :precision="4"
                style="width: 150px"
                placeholder="请输入汇率"
                disabled
              />
            </Form.Item>
          </Form>
        </div>

        <!-- 占位元素，确保按钮始终在右侧 -->
        <div v-else style="flex: 1"></div>

        <!-- 右侧：操作按钮 -->
        <Space>
          <Button
            danger
            :disabled="selectedAppRowKeys.length === 0"
            @click="handleBatchReject"
          >
            驳回
          </Button>
          <Button @click="drawerVisible = false">取消</Button>
          <Button type="primary" @click="handleSaveFeeSelection">确定</Button>
        </Space>
      </div>
    </template>
  </Drawer>

  <!-- ✅ 驳回确认对话框框 -->
  <Modal
    v-model:open="rejectModalVisible"
    title="驳回开票申请"
    :ok-text="'确定驳回'"
    :cancel-text="'取消'"
    ok-type="danger"
    @ok="handleConfirmReject"
    @cancel="handleCancelReject"
  >
    <div>
      <p style="margin-bottom: 16px">
        确定要驳回选中的 {{ rejectApplications.length }} 个开票申请吗？
      </p>
      <div style="margin-top: 12px">
        <label style="display: block; margin-bottom: 8px; font-weight: bold">
          驳回原因（必填）：
        </label>
        <Input.TextArea
          v-model:value="rejectReason"
          placeholder="请输入驳回原因"
          :rows="4"
          allow-clear
        />
      </div>
    </div>
  </Modal>
</template>
