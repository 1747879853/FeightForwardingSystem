<script lang="ts" setup>
import { computed, h, nextTick, ref, watch } from 'vue';
import dayjs from 'dayjs';

import { IconifyIcon } from '@vben/icons';

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
import {
  InvoiceIssueApi,
  syncApplicationGoodsDtlByExchangeRate,
} from '#/api/Invoice/InvoiceIssue';
import { getSubmittedApplicationList } from '#/api/Invoice/InvoiceIssue';
import { InvoiceApplicationApi } from '#/api/Invoice/invoiceRequest';
import { getCurrencyDetail } from '#/api/system/base-data/currency-admin';
import { getExchangeRatePagedList } from '#/api/system/base-data/exchange-rate-admin';
import { useAntTableColumnResize } from '#/utils/table-column-resize';
import { getInvoiceTypeOptions } from '#/views/fee-management/invoice-application/data';

interface Props {
  visible: boolean;
  settlementId: string; // 已选择的结算单位（固定）
  settlementName?: string; // ✅ 新增：结算单位名称（用于回显）
  currencyId?: number; // 已选择的币别（固定）
  headerId?: string; // 固定的发票抬头ID
  headerName?: string; // ✅ 新增：发票抬头名称（用于回显）
  addedAppIds?: string[]; // 已添加的申请ID列表
  applicationGroupsData?: any[]; // ✅ 新增：申请分组数据（用于获取抬头名称）
  invoiceExchangeRate?: number; // ✅ 新增：外部传入的开票汇率（用于编辑态）
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  settlementId: '',
  settlementName: '',
  currencyId: undefined,
  headerId: '',
  invoiceExchangeRate: undefined, // ✅ 设置默认值
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

// ✅ 新增：标记是否已经选择了结算单位（用于控制禁用状态）
const isSettlementFixed = ref<boolean>(false);

// ✅ 新增：存储选中的结算单位对象（用于 ClientSelect 回显）
const selectedSettlementItems = ref<any[]>([]);

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

useAntTableColumnResize({
  containerSelector: '.invoice-issue-fee-selection-drawer',
  enabled: drawerVisible,
  dataVersion: applicationGroupsData,
});

// 选中的申请行 keys
const selectedAppRowKeys = ref<string[]>([]);

// 发票汇率
const invoiceExchangeRate = ref<number>(1.0);

// 驳回原因
const rejectReason = ref<string>('');

// ✅ 驳回确认对话框框状态
const rejectModalVisible = ref(false);
const rejectApplications = ref<any[]>([]);

/** 处理单个父级选择 */
function handleSingleParentSelect(record: any, selected: boolean) {
  const currentSelected = selectedAppRowKeys.value.filter(
    (key) => key !== String(record.id),
  );
  if (selected) {
    selectedAppRowKeys.value = [...currentSelected, String(record.id)];
  } else {
    selectedAppRowKeys.value = currentSelected;
  }
  updateCurrencyFromSelectedApplications();
}

/** 处理全选/取消全选 */
function handleSelectAll(selected: boolean, changeRows: any[]) {
  const otherKeys = selectedAppRowKeys.value.filter(
    (key) => !changeRows.some((r) => String(r.id) === key),
  );
  if (selected) {
    selectedAppRowKeys.value = [
      ...otherKeys,
      ...changeRows.map((r) => String(r.id)),
    ];
  } else {
    selectedAppRowKeys.value = otherKeys;
  }
  updateCurrencyFromSelectedApplications();
}

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
  // ✅ 只在非固定状态下才重置结算单位
  if (!isSettlementFixed.value) {
    selectedSettlementId.value = '';
  }
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

/** ✅ 处理结算单位选择变化 */
function handleSettlementChange(value: string) {
  console.log('🔄 结算单位变更:', value);
  selectedSettlementId.value = value;

  // ✅ 选择后立即固定，不允许再修改
  if (value) {
    isSettlementFixed.value = true;
    console.log('✅ 结算单位已固定，不可再编辑');

    // ✅ 清空之前的回显数据（用户新选择的值会在ClientSelect内部处理）
    selectedSettlementItems.value = [];

    // 清空之前的选择
    selectedAppRowKeys.value = [];

    // 重新加载数据
    loadApplicationGroupData();
  } else {
    // 清空时重置
    selectedSettlementItems.value = [];
    isSettlementFixed.value = false;
  }
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
async function handleOpenFeeDrawer() {
  console.log('📂 打开费用选择抽屉');
  console.log('  - settlementId:', props.settlementId);
  console.log('  - currencyId:', props.currencyId);
  console.log('  - headerId:', props.headerId);
  console.log('  - addedAppIds:', props.addedAppIds);
  console.log('  - invoiceExchangeRate (props):', props.invoiceExchangeRate);

  // ✅ 重置筛选条件
  keyWord.value = '';
  filterApplyTimeStart.value = '';
  filterApplyTimeEnd.value = '';
  filterApplyTimeRange.value = undefined;
  filterHeader.value = '';
  filterApplyUserId.value = undefined;

  // ✅ 设置已选择的值（用于显示）
  if (!props.settlementId && !props.currencyId && !props.headerId) {
    // 首次添加，清空所有选择，允许用户选择结算单位
    selectedSettlementId.value = '';
    selectedCurrencyId.value = undefined;
    selectedHeaderId.value = '';
    selectedSettlementItems.value = []; // ✅ 清空回显数据
    isSettlementFixed.value = false; // ✅ 重置固定状态
    selectedAppRowKeys.value = [];
    filterCurrencyId.value = undefined; // ✅ 首次添加时清空币别筛选

    // ✅ 首次添加时，如果传入了汇率值，则使用该值，否则保持默认值1.0
    if (props.invoiceExchangeRate !== undefined) {
      invoiceExchangeRate.value = props.invoiceExchangeRate;
      console.log('✅ 首次添加：使用传入的开票汇率', props.invoiceExchangeRate);
    }
  } else {
    // 非首次添加（编辑态），固定已有的值
    selectedSettlementId.value = props.settlementId;
    selectedCurrencyId.value = props.currencyId;
    selectedHeaderId.value = props.headerId || '';
    isSettlementFixed.value = true; // ✅ 设置为已固定

    // ✅ 关键修复：将 props.currencyId 赋值给 filterCurrencyId，使筛选项显示正确的币别
    filterCurrencyId.value = props.currencyId;
    console.log('✅ 编辑模式：设置发票币别筛选', filterCurrencyId.value);

    // ✅ 编辑模式：设置发票抬头筛选
    if (props.headerId && props.headerName) {
      // 优先使用传入的 headerName
      filterHeader.value = props.headerName;
      console.log('✅ 编辑模式：使用传入的发票抬头名称', filterHeader.value);
    } else if (
      props.headerId &&
      props.applicationGroupsData &&
      props.applicationGroupsData.length > 0
    ) {
      // 备用方案：从 applicationGroupsData 中获取抬头名称
      const firstApp = props.applicationGroupsData[0];
      const headerName =
        firstApp?.header || firstApp?.clientInvoiceInfo?.header || '';
      if (headerName) {
        filterHeader.value = headerName;
        console.log(
          '✅ 编辑模式：从 applicationGroupsData 获取发票抬头名称',
          filterHeader.value,
        );
      } else {
        console.warn(
          '⚠️ 编辑模式：无法从 applicationGroupsData 中获取抬头名称，将使用 headerId 进行筛选',
        );
        // 即使没有名称，也设置 selectedHeaderId，确保筛选正常工作
        selectedHeaderId.value = props.headerId;
      }
    } else if (props.headerId) {
      // 兜底方案：只有 headerId，没有名称
      console.warn(
        '⚠️ 编辑模式：缺少 headerName 和 applicationGroupsData，但 headerId 存在',
        {
          headerId: props.headerId,
          headerName: props.headerName,
          hasApplicationGroupsData: !!props.applicationGroupsData,
        },
      );
      // 设置 selectedHeaderId 确保筛选正常工作
      selectedHeaderId.value = props.headerId;
    } else {
      console.warn('⚠️ 编辑模式：完全没有抬头信息');
    }

    // ✅ 使用传入的 settlementName 构造回显数据（不需要调用API）
    if (props.settlementId && props.settlementName) {
      selectedSettlementItems.value = [
        {
          id: props.settlementId,
          name: props.settlementName,
        },
      ];
      console.log(
        '✅ 编辑模式：使用传入的结算单位名称',
        selectedSettlementItems.value,
      );
    } else if (props.settlementId) {
      // 如果没有名称，至少保证ID正确
      selectedSettlementItems.value = [
        {
          id: props.settlementId,
          name: props.settlementId,
        },
      ];
      console.warn('⚠️ 编辑模式：缺少 settlementName，仅显示ID');
    }

    // ✅ 编辑模式：使用传入的开票汇率作为默认值
    if (props.invoiceExchangeRate !== undefined) {
      invoiceExchangeRate.value = props.invoiceExchangeRate;
      console.log('✅ 编辑模式：使用传入的开票汇率', props.invoiceExchangeRate);
    } else if (props.currencyId && props.currencyId !== 1) {
      // 如果没有传入汇率值，但币别是外币，则加载默认汇率
      await loadDefaultExchangeRate(props.currencyId);
    }
  }

  drawerVisible.value = true;

  nextTick(() => {
    // ✅ 始终从接口加载数据（但不包含假删的数据）
    console.log('🔄 从接口加载申请数据...');
    loadApplicationGroupData();
  });
}

/** 保存费用选择 */
async function handleSaveFeeSelection() {
  // ✅ 校验0：确保已选择结算单位
  // if (!selectedSettlementId.value) {
  //   message.warning('请先选择结算单位');
  //   return;
  // }

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
      message.error('所选申请的发票抬头或币别不一致');
      console.error('❌ 校验失败，申请之间不一致:', inconsistentApps);
      return;
    }

    console.log('✅ 本次选择的申请之间一致性校验通过');
  }

  // ✅ 校验2：仅当 props.headerId 或 props.currencyId 有值时（即非首次添加），才需要与首次选择的一致性校验
  if (
    (props.headerId && props.headerId !== '') ||
    (props.currencyId !== undefined && props.currencyId !== null)
  ) {
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

  // ✅ 校验3：检查所有选中申请的发票状态（code）
  const needUpdateApps: any[] = []; // code=1，需要更新
  const cannotInvoiceApps: any[] = []; // code=2，不可开票

  selectedApplications.forEach((app: any) => {
    if (app.code === 1) {
      needUpdateApps.push({
        applicationNo: app.applicationNo,
        code: app.code,
      });
    } else if (app.code === 2) {
      cannotInvoiceApps.push({
        applicationNo: app.applicationNo,
        code: app.code,
      });
    }
  });

  // 如果存在需要更新或不可开票的申请，阻止保存并提示用户
  if (needUpdateApps.length > 0 || cannotInvoiceApps.length > 0) {
    const errorMessages: string[] = [];

    // 显示需要更新的申请
    if (needUpdateApps.length > 0) {
      errorMessages.push(`⚠️ 需要更新的申请（${needUpdateApps.length}个）：`);
      needUpdateApps.forEach((app) => {
        errorMessages.push(`• ${app.applicationNo}`);
      });
    }

    // 显示不可开票的申请
    if (cannotInvoiceApps.length > 0) {
      errorMessages.push(
        `❌ 不可开票的申请（${cannotInvoiceApps.length}个）：`,
      );
      cannotInvoiceApps.forEach((app) => {
        errorMessages.push(`• ${app.applicationNo}`);
      });
    }

    message.error({
      content: h('div', [
        h(
          'div',
          { style: 'font-weight: bold; margin-bottom: 12px; color: #ff4d4f;' },
          '所选申请中存在状态异常的申请，无法继续开票：',
        ),
        ...errorMessages.map((msg) =>
          h('div', { style: 'margin-left: 16px; margin-bottom: 4px;' }, msg),
        ),
        h(
          'div',
          {
            style:
              'margin-top: 12px; padding: 8px; background: #fffbe6; border: 1px solid #ffe58f; border-radius: 4px;',
          },
          [
            h(
              'div',
              { style: 'color: #faad14; font-weight: bold;' },
              '操作建议：',
            ),
            h(
              'div',
              { style: 'margin-top: 4px; color: #666;' },
              '1. 点击"发票更新"按钮修正需要更新的申请',
            ),
            h(
              'div',
              { style: 'margin-top: 4px; color: #666;' },
              '2. 对于不可开票的申请，请先驳回后重新处理',
            ),
          ],
        ),
      ]),
      duration: 8,
    });

    console.error('❌ 校验失败，存在状态异常的申请:', {
      needUpdateApps,
      cannotInvoiceApps,
    });
    return;
  }

  console.log('✅ 所有选中申请的发票状态校验通过');

  const firstApp = selectedApplications[0];
  // ✅ 使用用户选择的结算单位ID，而不是从申请中获取
  const settlementId = selectedSettlementId.value || firstApp.settlementId;
  const currencyId = firstApp.currencyId;
  const headerId = selectedHeaderId.value || firstApp.clientInvoiceBankId;

  // ✅ 优先使用用户手动输入的汇率，如果没有则使用申请中的默认汇率
  const appInvoiceExchangeRate =
    invoiceExchangeRate.value || firstApp.invoiceExchangeRate || 1.0;

  if (!settlementId) {
    message.warning('请先选择结算单位');
    return;
  }

  console.log('✅ FeeSelectionDrawerForIssue 准备保存数据:');
  console.log('  - 选中申请数量:', selectedApplications.length);
  console.log('  - 结算单位ID:', settlementId);
  console.log('  - 币别ID:', currencyId);
  console.log('  - 发票抬头ID:', headerId);
  console.log('  - 开票汇率（优先使用用户输入）:', appInvoiceExchangeRate);
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

    // ✅ 使用 selectedSettlementId 作为筛选条件（用户选择的结算单位）
    if (selectedSettlementId.value) {
      params.settlementId = selectedSettlementId.value;
    }

    // ❌ 删除：不再使用 selectedCurrencyId，因为它会被固定为首次选择的币别
    // if (selectedCurrencyId.value !== undefined) {
    //   params.currencyId = selectedCurrencyId.value;
    // }

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

    // ✅ 发票抬头：使用 filterHeader（用户手动输入的抬头名称），而不是 selectedHeaderId（银行ID）
    if (filterHeader.value) {
      params.header = filterHeader.value;
    }

    // ✅ 发票币别：只使用筛选条件的币别（filterCurrencyId），不使用固定的 selectedCurrencyId
    if (filterCurrencyId.value !== undefined) {
      params.currencyId = filterCurrencyId.value;
    }

    // 申请人
    if (filterApplyUserId.value !== undefined) {
      params.applyUserId = filterApplyUserId.value;
    }

    console.log('📥 查询参数:', {
      settlementId: params.settlementId,
      currencyId: params.currencyId,
      filterCurrencyId: filterCurrencyId.value,
      selectedCurrencyId: selectedCurrencyId.value,
    });

    const result = await getSubmittedApplicationList(params);

    console.log('📥 从接口加载的申请数据:', {
      接口返回数量: result?.length || 0,
    });

    // ✅ 详细检查接口返回的数据结构
    if (result && result.length > 0) {
      const firstApp = result[0]!;
      console.log('🔍 第一条申请的关键字段:', {
        id: firstApp.id,
        applicationNo: firstApp.applicationNo,
        companyName: firstApp.company?.name,
        header: firstApp.clientInvoiceInfo?.header,
        currencyCode: firstApp.currency?.code,
        totalAppliedAmount: firstApp.totalAppliedAmount,
        invoiceApplicationItems数量:
          firstApp.invoiceApplicationItems?.length || 0,
      });
    }

    // ✅ 转换为树状结构
    const treeData = transformToTreeData(result || []);

    console.log('✅ 接口数据转换完成:', {
      数量: treeData.length,
    });

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

  console.log('📊 transformToTreeData 被调用:', {
    总申请数量: applications.length,
  });

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
          //hblNum: '-', // 分提单号（需要从其他地方获取）
          clientName: item.orderFee?.transportOrder?.client?.name || '-', // 委托单位
          etd: (() => {
            const etdValue = item.orderFee?.transportOrder?.etd;
            if (!etdValue) return '-';
            try {
              return dayjs(etdValue).format('YYYY-MM-DD');
            } catch (error) {
              console.error('开船日期格式化失败:', error);
              return etdValue;
            }
          })(), // 开船日期（只保留年月日）
          feeName: item.orderFee?.feeCode?.cnName || '-', // 费用名称
          payReceiveType: item.orderFee?.paySide === 1 ? '应付' : '应收', // 收付
          currencyCode: item.orderFee?.currency?.code || '-', // 币别
          amount: item.orderFee?.amount || 0, // 金额
          exchangeRate: 1, // 汇率
          saleNames: item.orderFee?.transportOrder?.saleNames || '-', // 销售
          invoiceCurrencyCode: app.currency?.code || '-', // 发票币别
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
      // ✅ 使用后端返回的 company 对象作为所属公司名称
      companyName: app.company?.name || '-',
      orgId: app.orgId, // ✅ 归属组织ID
      applicationNo: app.applicationNo || '-', // 申请单号
      // ✅ 使用 clientInvoiceInfo.header 作为发票抬头
      header: app.clientInvoiceInfo?.header || '-',
      currencyCode: app.currency?.code || '-', // 币别
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
      code: app.code,
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
    dataIndex: 'code',
    key: 'code',
    width: 80,
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
    width: 80,
  },
  {
    title: '发票备注',
    dataIndex: 'remark',
    key: 'remark',
    width: 150,
    ellipsis: true,
  },
  {
    title: '申请人',
    dataIndex: 'applyUserName',
    key: 'applyUserName',
    minWidth: 100,
    ellipsis: true,
  },
  {
    title: '申请日期',
    dataIndex: 'applyTime',
    key: 'applyTime',
    width: 170,
    ellipsis: true,
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
    ellipsis: true,
  },
  {
    title: '开票汇率',
    dataIndex: 'invoiceExchangeRate',
    key: 'invoiceExchangeRate',
    width: 75,
    align: 'right' as const,
  },

  {
    title: '原币金额',
    dataIndex: 'totalAppliedAmount',
    key: 'totalAppliedAmount',
    width: 75,
    align: 'right' as const,
  },
  {
    title: '开票金额',
    dataIndex: 'invoiceAmount',
    key: 'invoiceAmount',
    width: 75,
    align: 'right' as const,
  },
]);

// 申请表格列定义（二级 - 费用明细）
const appChildColumns = computed(() => [
  {
    title: '序号',
    dataIndex: 'sequenceNumber',
    key: 'sequenceNumber',
    width: 60,
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
  // {
  //   title: '分提单号',
  //   dataIndex: 'hblNum',
  //   key: 'hblNum',
  //   width: 100,
  //   ellipsis: true,
  // },
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
    width: 100,
  },
  {
    title: '费用名称',
    dataIndex: 'feeName',
    key: 'feeName',
    width: 120,
    ellipsis: true,
  },
  {
    title: '收付',
    dataIndex: 'payReceiveType',
    key: 'payReceiveType',
    width: 60,
    align: 'center' as const,
  },
  // {
  //   title: '币别',
  //   dataIndex: 'currencyCode',
  //   key: 'currencyCode',
  //   width: 80,
  //   align: 'center' as const,
  // },
  {
    title: '金额',
    dataIndex: 'amount',
    key: 'amount',
    width: 80,
    align: 'right' as const,
  },
  {
    title: '汇率',
    dataIndex: 'exchangeRate',
    key: 'exchangeRate',
    width: 60,
    align: 'right' as const,
  },
  {
    title: '销售',
    dataIndex: 'saleNames',
    key: 'saleNames',
    width: 100,
    ellipsis: true,
  },
  {
    title: '发票币别',
    dataIndex: 'invoiceCurrencyCode',
    key: 'invoiceCurrencyCode',
    width: 75,
    align: 'center' as const,
  },
  {
    title: '申请金额',
    dataIndex: 'appliedAmountOriginal',
    key: 'appliedAmountOriginal',
    width: 75,
    align: 'right' as const,
  },
  {
    title: '结算金额',
    dataIndex: 'settlementAmount',
    key: 'settlementAmount',
    width: 75,
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

/** 发票更新 - 根据当前汇率修正选中申请的商品明细金额 */
async function handleUpdateInvoice() {
  const selectedIds = getSelectedApplicationsFromTable().map(
    (app: any) => app.id,
  );

  if (selectedIds.length === 0) {
    message.warning('请先选择要更新的发票');
    return;
  }

  Modal.confirm({
    title: '确认更新',
    content: `确定要根据当前汇率更新选中的 ${selectedIds.length} 条申请的商品明细金额吗？`,
    okText: '确定',
    cancelText: '取消',
    onOk: async () => {
      try {
        feeDrawerLoading.value = true;

        console.log('🔄 开始更新发票商品明细:', {
          更新的申请数量: selectedIds.length,
        });

        // ✅ 调用 syncApplicationGoodsDtlByExchangeRate 接口
        const result = await syncApplicationGoodsDtlByExchangeRate({
          invoiceApplicationIds: selectedIds,
        });

        console.log('✅ 发票更新成功:', {
          实际修正的申请数量: result.updatedApplicationIds?.length || 0,
          无需修正的申请数量: result.unchangedApplicationIds?.length || 0,
        });

        message.success(
          `已成功更新 ${result.updatedApplicationIds?.length || 0} 个申请的商品明细金额`,
        );

        // 清空选中状态
        selectedAppRowKeys.value = [];

        // ✅ 重新加载数据（会自动更新 applicationGroupsData）
        await loadApplicationGroupData();
      } catch (error) {
        console.error('❌ 发票更新失败:', error);
        message.error('发票更新失败，请重试');
      } finally {
        feeDrawerLoading.value = false;
      }
    },
  });
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
    <div class="invoice-issue-fee-selection-drawer">
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
            style="
              display: flex;
              flex-wrap: wrap;
              gap: 12px;
              align-items: center;
            "
          >
            <!-- ✅ 新增：结算单位选择 -->
            <div
              style="display: flex; gap: 8px; align-items: center; width: 305px"
            >
              <span style="min-width: 70px; font-size: 14px; color: #333"
                >结算单位:</span
              >
              <ClientSelect
                v-model:model-value="selectedSettlementId"
                :selected-items="selectedSettlementItems"
                placeholder="请选择结算单位"
                style="flex: 1"
                :disabled="isSettlementFixed"
                @change="handleSettlementChange"
              />
            </div>
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
                :disabled="
                  props.headerId !== undefined &&
                  props.headerId !== null &&
                  props.headerId !== ''
                "
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
                :disabled="
                  props.currencyId !== undefined && props.currencyId !== null
                "
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
            :scroll="{ y: 800 }"
            :row-selection="{
              type: 'checkbox',
              selectedRowKeys: selectedAppRowKeys,
              onChange: handleParentSelectionChange,
              onSelect: (record, selected) => {
                handleSingleParentSelect(record, selected);
              },
              onSelectAll: (selected, selectedRows, changeRows) => {
                handleSelectAll(selected, changeRows);
              },
            }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'code'">
                <span
                  :style="{
                    color:
                      record.code === 0
                        ? '#52c41a'
                        : record.code === 1
                          ? '#faad14'
                          : '#ff4d4f',
                    fontWeight: 'bold',
                  }"
                >
                  {{
                    record.code === 0
                      ? '✓ 可开票'
                      : record.code === 1
                        ? '⚠ 需更新'
                        : '✗ 不可开'
                  }}
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
    </div>

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
                disabled
                style="width: 150px"
                placeholder="请输入汇率"
              />
            </Form.Item>
          </Form>
        </div>

        <!-- 占位元素，确保按钮始终在右侧 -->
        <div v-else style="flex: 1"></div>

        <!-- 右侧：操作按钮 -->
        <Space>
          <Button
            type="primary"
            :disabled="selectedAppRowKeys.length === 0"
            @click="handleUpdateInvoice"
          >
            <template #icon>
              <IconifyIcon icon="ant-design:sync-outlined" />
            </template>
            发票更新 ({{ selectedAppRowKeys.length }})
          </Button>
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
