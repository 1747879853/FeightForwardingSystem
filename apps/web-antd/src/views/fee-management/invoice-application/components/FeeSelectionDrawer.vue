<script lang="ts" setup>
import { computed, nextTick, ref, watch } from 'vue';
import dayjs from 'dayjs';

import {
  Button,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  message,
  Select,
  Space,
  Spin,
  Table,
} from 'ant-design-vue';

import { ClientSelect, CurrencySelect } from '#/adapter/component';
import { getBizTypeOptions } from '#/views/sea-export-admin/orderFee/data';
import { InvoiceApplicationApi } from '#/api/Invoice/invoiceRequest';
import { getCurrencyDetail } from '#/api/system/base-data/currency-admin';
import { getExchangeRatePagedList } from '#/api/system/base-data/exchange-rate-admin';

interface Props {
  visible: boolean;
  settlementId?: string; // 已选择的结算单位（固定）
  currencyId?: number; // 已选择的币别（固定）
  invoiceApplicationId?: string; // 发票申请ID（用于排除已关联的费用）
  addedFeeIds?: string[]; // ✅ 新增：已添加的费用ID列表
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  settlementId: '',
  currencyId: undefined,
  invoiceApplicationId: '',
  addedFeeIds: () => [], // ✅ 默认空数组
});

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (
    e: 'save',
    data: {
      selectedFees: any[];
      settlementId: string;
      currencyId: number;
      invoiceExchangeRate?: number;
      feeGroupsData?: any[]; // ✅ 新增：传递完整的费用分组数据
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
const selectedCurrencyCode = ref<string>('');

// 抽屉筛选条件
const keyWord = ref<string>('');
const filterMblNum = ref<string>('');
const filterClientId = ref<string>(''); // 新增：委托单位
const filterEtdStart = ref<string>(''); // 新增：开船日期起
const filterEtdEnd = ref<string>(''); // 新增：开船日期止
const filterPaySide = ref<number>(0); // 新增：收付类型，默认应收(0)

// ✅ 新增：用于 RangePicker 的日期范围状态
const filterEtdRange = ref<[dayjs.Dayjs, dayjs.Dayjs] | undefined>(undefined);

// 费用明细表格数据
const feeGroupsData = ref<any[]>([]);

// 选中的费用行 keys
const selectedFeeRowKeys = ref<string[]>([]);

// 发票汇率
const invoiceExchangeRate = ref<number>(1.0);

/** 获取子表格的选中 keys */
function getChildSelectedKeys(record: any): string[] {
  if (!record.feeDetails) return [];
  return selectedFeeRowKeys.value.filter((key) =>
    record.feeDetails.some((child: any) => child.id === key),
  );
}

/** 处理子表格选择变化 */
async function handleChildSelectionChange(
  record: any,
  selectedRowKeys: string[],
) {
  const currentSelected = selectedFeeRowKeys.value.filter(
    (key) =>
      !record.feeDetails ||
      !record.feeDetails.some((child: any) => child.id === key),
  );
  selectedFeeRowKeys.value = [...currentSelected, ...selectedRowKeys];

  await updateCurrencyFromSelectedFees();
}

/** 从选中的费用中更新币别 */
async function updateCurrencyFromSelectedFees() {
  const allSelected = flattenTreeData(feeGroupsData.value);
  const selectedFees = allSelected.filter(
    (item: any) => item.orderFee && selectedFeeRowKeys.value.includes(item.id),
  );

  if (selectedFees.length > 0) {
    const firstFee = selectedFees[0];
    const currencyId = firstFee.orderFee?.currencyId;

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

/** 将树状数据扁平化 */
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

/** 从表格获取选中的费用 */
function getSelectedFeesFromTable(): any[] {
  const allSelected = flattenTreeData(feeGroupsData.value);
  const selectedFees = allSelected.filter(
    (item: any) => item.orderFee && selectedFeeRowKeys.value.includes(item.id),
  );

  return selectedFees;
}

/** 重置筛选条件 */
function handleResetFilter() {
  selectedSettlementId.value = '';
  selectedCurrencyId.value = undefined;
  keyWord.value = '';
  filterMblNum.value = '';
  filterClientId.value = '';
  filterEtdStart.value = '';
  filterEtdEnd.value = '';
  filterEtdRange.value = undefined; // ✅ 重置日期范围
  filterPaySide.value = 0;
  selectedFeeRowKeys.value = [];
  loadFeeGroupData();
}

/** 处理日期范围变化 */
function handleEtdRangeChange(
  dates: [dayjs.Dayjs, dayjs.Dayjs] | [string, string] | undefined,
) {
  if (dates && dates.length === 2) {
    const startDate = dates[0];
    const endDate = dates[1];

    // 处理 Dayjs 对象或字符串
    if (typeof startDate === 'string') {
      filterEtdStart.value = startDate;
    } else {
      filterEtdStart.value = startDate?.format('YYYY-MM-DD') || '';
    }

    if (typeof endDate === 'string') {
      filterEtdEnd.value = endDate;
    } else {
      filterEtdEnd.value = endDate?.format('YYYY-MM-DD') || '';
    }
  } else {
    filterEtdStart.value = '';
    filterEtdEnd.value = '';
  }
}

/** 打开费用选择抽屉 */
function handleOpenFeeDrawer() {
  if (!props.settlementId) {
    selectedSettlementId.value = '';
    selectedCurrencyId.value = undefined;
    selectedFeeRowKeys.value = [];
  } else {
    selectedSettlementId.value = props.settlementId;
    selectedCurrencyId.value = props.currencyId;
  }

  drawerVisible.value = true;
  nextTick(() => {
    loadFeeGroupData();
  });
}

/** 保存费用选择 */
async function handleSaveFeeSelection() {
  const selectedFees = getSelectedFeesFromTable();

  if (selectedFees.length === 0) {
    message.warning('请至少选择一个费用');
    return;
  }

  const firstFee = selectedFees[0];
  const settlementId = firstFee.orderFee?.settlementId;

  if (!settlementId) {
    message.warning('无法获取结算单位信息');
    return;
  }

  console.log('✅ FeeSelectionDrawer 准备保存数据:');
  console.log('  - 选中费用数量:', selectedFees.length);
  console.log('  - 结算单位ID:', settlementId);
  console.log('  - 币别ID:', selectedCurrencyId.value);
  console.log('  - 汇率:', invoiceExchangeRate.value);
  console.log('  - feeGroupsData 数量:', feeGroupsData.value.length);

  emit('save', {
    selectedFees,
    settlementId,
    currencyId: selectedCurrencyId.value || 1,
    invoiceExchangeRate: invoiceExchangeRate.value,
    feeGroupsData: feeGroupsData.value, // ✅ 传递完整的费用分组数据
  });

  drawerVisible.value = false;
}

/** 加载费用分组数据 */
async function loadFeeGroupData() {
  feeDrawerLoading.value = true;
  try {
    const params: any = {
      pageIndex: 1,
      pageSize: 1000,
    };

    if (selectedSettlementId.value) {
      params.settlementId = selectedSettlementId.value;
    }
    if (selectedCurrencyId.value !== undefined) {
      params.currencyId = selectedCurrencyId.value;
    }

    // 合并委托编号和主提单号到 commissionNum 参数
    if (keyWord.value) {
      params.keyword = keyWord.value;
    }
    // 新增：委托单位
    if (filterClientId.value) {
      params.clientId = filterClientId.value;
    }

    // 新增：开船日期范围
    if (filterEtdStart.value) {
      params.etdStart = filterEtdStart.value;
    }
    if (filterEtdEnd.value) {
      params.etdEnd = filterEtdEnd.value;
    }

    // 新增：收付类型
    params.paySide = filterPaySide.value;

    if (props.invoiceApplicationId) {
      params.invoiceApplicationId = props.invoiceApplicationId;
    }

    const result = await InvoiceApplicationApi.getOrderFeeGroupAsync(params);

    const treeData = transformToTreeData(result.items || []);
    feeGroupsData.value = treeData;
  } catch (error) {
    console.error('❌ 加载费用数据失败:', error);
    message.error('加载费用数据失败');
  } finally {
    feeDrawerLoading.value = false;
  }
}

/** 获取已添加的费用ID列表 */
function getAddedFeeIds(): Set<string> {
  // ✅ 从 props 中获取已添加的费用ID列表
  return new Set(props.addedFeeIds || []);
}

/** 将费用数据转换为树状结构 */
function transformToTreeData(
  items: InvoiceApplicationApi.InvoiceApplicationFeeGroupOutputDto[],
): any[] {
  const treeData: any[] = [];
  const addedFeeIds = getAddedFeeIds();

  items.forEach((item, index) => {
    const childrenList: any[] = [];

    if (item.orderFees && item.orderFees.length > 0) {
      item.orderFees.forEach((fee, feeIndex) => {
        const isAlreadyAdded = addedFeeIds.has(String(fee.id));

        const childNode: any = {
          id: `child_${fee.id}`,
          parentId: `parent_${item.transportOrder.id}`,
          orderFee: fee,
          appliedAmount: fee.remainingInvoiceAmount,
          checked: false,
          disabled: isAlreadyAdded,
          alreadyAdded: isAlreadyAdded,
          settlementUnit: fee.settlementName || '-',
          payReceiveType: fee.paySide === 1 ? '应付' : '应收',
          feeName: fee.feeCodeName || '-',
          amount: fee.amount,
          currencyCode: fee.currencyCode || '-',
          remainingInvoiceAmount: fee.remainingInvoiceAmount,
          // ✅ 关键修复：在子节点中也保存委托编号和主提单号
          commissionNum: item.transportOrder.commissionNum,
          mblNum: item.transportOrder.mblNum || '-',
          bookingNum: item.transportOrder.bookingNum || '-',
          transportOrder: item.transportOrder, // ✅ 保存完整的 transportOrder 对象
        };

        childrenList.push(childNode);
      });
    }

    const parentNode: any = {
      id: `parent_${item.transportOrder.id}`,
      parentId: null,
      transportOrder: item.transportOrder,
      seaExport: item.seaExport,
      orderFees: item.orderFees,
      commissionNum: item.transportOrder.commissionNum,
      mblNum: item.transportOrder.mblNum || '-',
      bookingNum: item.transportOrder.bookingNum || '-',
      clientName: item.transportOrder.clientName,
      bizType:
        getBizTypeOptions().find(
          (o: any) => o.value === item.transportOrder?.bizType,
        )?.label || '-',
      carrier: item.seaExport?.carrierName || '-',
      company: item.transportOrder.orgs?.at(-1)?.name || '-',
      checked: false,
      feeDetails: childrenList, // ✅ 使用 feeDetails 而非 children，避免被 Table 识别为树形结构
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

// 费用表格列定义（一级 - 运输订单）
const feeParentColumns = computed(() => [
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
    title: '订舱编号',
    dataIndex: 'bookingNum',
    key: 'bookingNum',
    minWidth: 140,
    ellipsis: true,
  },
  {
    title: '结算单位',
    dataIndex: 'clientName',
    key: 'clientName',
    minWidth: 180,
    ellipsis: true,
  },
  {
    title: '业务类型',
    dataIndex: 'bizType',
    key: 'bizType',
    minWidth: 100,
  },
  {
    title: '船公司',
    dataIndex: 'carrier',
    key: 'carrier',
    minWidth: 120,
    ellipsis: true,
  },
  {
    title: '所属公司',
    dataIndex: 'company',
    key: 'company',
    minWidth: 150,
    ellipsis: true,
  },
]);

// 费用表格列定义（二级 - 费用明细）
const feeChildColumns = computed(() => [
  {
    title: '结算单位',
    dataIndex: 'settlementUnit',
    key: 'settlementUnit',
    minWidth: 180,
    ellipsis: true,
  },
  {
    title: '收付类型',
    dataIndex: 'payReceiveType',
    key: 'payReceiveType',
    minWidth: 80,
    align: 'center' as const,
  },
  {
    title: '费用名称',
    dataIndex: 'feeName',
    key: 'feeName',
    minWidth: 200,
    ellipsis: true,
  },
  {
    title: '金额',
    dataIndex: 'amount',
    key: 'amount',
    minWidth: 120,
    align: 'right' as const,
  },
  {
    title: '币别',
    dataIndex: 'currencyCode',
    key: 'currencyCode',
    minWidth: 80,
    align: 'center' as const,
  },
  {
    title: '未开票金额',
    dataIndex: 'remainingInvoiceAmount',
    key: 'remainingInvoiceAmount',
    minWidth: 120,
    align: 'right' as const,
  },
  {
    title: '本次申请金额',
    dataIndex: 'appliedAmount',
    key: 'appliedAmount',
    minWidth: 180,
    align: 'right' as const,
  },
]);

// 暴露方法给父组件
defineExpose({
  handleOpenFeeDrawer,
  loadFeeGroupData,
});
</script>

<template>
  <Drawer
    v-model:open="drawerVisible"
    title="选择剩余未开票费用"
    width="1000"
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
              placeholder="请输入委托编号或主提单号"
              style="flex: 1"
              allow-clear
            />
          </div>
          <div
            style="display: flex; gap: 8px; align-items: center; width: 305px"
          >
            <span style="min-width: 70px; font-size: 14px; color: #333"
              >委托单位:</span
            >
            <ClientSelect
              v-model:model-value="filterClientId"
              placeholder="请选择委托单位"
              style="flex: 1"
              allow-clear
            />
          </div>
          <div
            style="display: flex; gap: 8px; align-items: center; width: 305px"
          >
            <span style="min-width: 70px; font-size: 14px; color: #333"
              >开船日期:</span
            >
            <DatePicker.RangePicker
              v-model:value="filterEtdRange"
              @update:value="handleEtdRangeChange"
              style="flex: 1"
              format="YYYY-MM-DD"
              :placeholder="['开始日期', '结束日期']"
            />
          </div>
          <div
            style="display: flex; gap: 8px; align-items: center; width: 305px"
          >
            <span style="min-width: 70px; font-size: 14px; color: #333"
              >收付类型:</span
            >
            <Select
              v-model:value="filterPaySide"
              style="flex: 1"
              :options="[
                { label: '全部', value: null },
                { label: '应收', value: 0 },
                { label: '应付', value: 1 },
              ]"
              placeholder="请选择收付类型"
            />
          </div>
          <div
            style="display: flex; gap: 8px; align-items: center; width: 305px"
          >
            <span style="min-width: 70px; font-size: 14px; color: #333"
              >结算单位:</span
            >
            <ClientSelect
              :model-value="selectedSettlementId"
              placeholder="请选择结算单位"
              style="flex: 1"
              :disabled="!!settlementId"
              @update:model-value="(v) => (selectedSettlementId = v as string)"
            />
          </div>
          <div
            style="display: flex; gap: 8px; align-items: center; width: 305px"
          >
            <span style="min-width: 70px; font-size: 14px; color: #333"
              >币别:</span
            >
            <CurrencySelect
              :model-value="selectedCurrencyId"
              placeholder="请选择币别"
              style="flex: 1"
              :disabled="!!currencyId && !!settlementId"
              @update:model-value="(v) => (selectedCurrencyId = v as number)"
            />
          </div>
          <div style="display: flex; flex: 1; justify-content: flex-end">
            <Button type="primary" @click="loadFeeGroupData">查询</Button>
          </div>
        </div>
      </div>

      <!-- 费用表格 -->
      <div style="border: 1px solid #d9d9d9; border-radius: 4px">
        <Table
          :columns="feeParentColumns"
          :data-source="feeGroupsData"
          :pagination="false"
          bordered
          size="small"
          :expandable="{
            defaultExpandAllRows: true,
          }"
          row-key="id"
          :scroll="{ y: 500 }"
        >
          <template #expandedRowRender="{ record }">
            <Table
              v-if="record.feeDetails && record.feeDetails.length > 0"
              :columns="feeChildColumns"
              :data-source="record.feeDetails"
              :pagination="false"
              bordered
              size="small"
              row-key="id"
              :row-selection="{
                type: 'checkbox',
                selectedRowKeys: getChildSelectedKeys(record),
                getCheckboxProps: (childRecord) => ({
                  disabled: childRecord.disabled || childRecord.alreadyAdded,
                }),
                onChange: (selectedRowKeys) =>
                  handleChildSelectionChange(
                    record,
                    selectedRowKeys.map((key) => String(key)),
                  ),
              }"
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
                <template v-else-if="column.key === 'appliedAmount'">
                  <InputNumber
                    v-model:value="childRecord.appliedAmount"
                    :min="0"
                    :max="childRecord.remainingInvoiceAmount"
                    :precision="2"
                    style="width: 100%"
                    size="small"
                    :disabled="childRecord.alreadyAdded"
                  />
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
            <Form.Item label="发票汇率">
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
          <Button @click="drawerVisible = false">取消</Button>
          <Button type="primary" @click="handleSaveFeeSelection">确定</Button>
        </Space>
      </div>
    </template>
  </Drawer>
</template>
