<script lang="ts" setup>
import { ref, watch } from 'vue';
import { Modal, Spin, Table, Button, message, Input, Select, DatePicker, Space } from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';
import dayjs from 'dayjs';
import { getBizTypeOptions } from '#/views/sea-export-admin/orderFee/data';

interface FeeDetailItem {
  id: string;
  parentId: string | null;
  transportOrder?: any;
  seaExport?: any;
  orderFees?: any[];
  commissionNum?: string;
  mblNum?: string;
  bookingNum?: string;
  clientName?: string;
  bizType?: string;
  carrier?: string;
  company?: string;
  feeDetails?: FeeChildItem[]; // ✅ 使用 feeDetails 而非 children，避免被 Table 识别为树形结构
}

interface FeeChildItem {
  id: string;
  parentId: string;
  orderFee?: any;
  appliedAmount?: number;
  settlementUnit?: string;
  payReceiveType?: string;
  feeName?: string;
  amount?: number;
  currencyCode?: string;
  remainingInvoiceAmount?: number;
}

const props = defineProps<{
  visible: boolean;
  loading: boolean;
  feeDetails: FeeDetailItem[];
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'delete-fee', feeIds: string[]): void; // ✅ 修改：支持批量删除，传入ID数组
}>();

// 筛选条件
const filterKeyword = ref<string>(''); // 编号（支持委托编号、主提单号、订舱编号）
const filterBizType = ref<string | undefined>(undefined); // 业务类型
const filterCommissionNum = ref<string>(''); // 委托编号
const filterEtdRange = ref<[dayjs.Dayjs, dayjs.Dayjs] | undefined>(undefined); // 开船日期范围

// 筛选后的数据
const filteredFeeDetails = ref<FeeDetailItem[]>([]);

// 选中的费用ID列表（子节点）
const selectedFeeIds = ref<Set<string>>(new Set());

// 选中的父节点ID列表（按票）
const selectedParentIds = ref<Set<string>>(new Set());

/** 应用筛选 */
function applyFilter() {
  if (!props.feeDetails || props.feeDetails.length === 0) {
    filteredFeeDetails.value = [];
    return;
  }

  let result = [...props.feeDetails];

  // 编号筛选（支持委托编号、主提单号、订舱编号）
  if (filterKeyword.value) {
    const keyword = filterKeyword.value.toLowerCase();
    result = result.filter((parent) => {
      const commissionNum = parent.commissionNum?.toLowerCase() || '';
      const mblNum = parent.mblNum?.toLowerCase() || '';
      const bookingNum = parent.bookingNum?.toLowerCase() || '';
      
      // 检查父节点是否匹配
      const parentMatch = 
        commissionNum.includes(keyword) ||
        mblNum.includes(keyword) ||
        bookingNum.includes(keyword);
      
      if (parentMatch) return true;
      
      // 检查子节点是否有匹配的（如果父节点不匹配，但子节点有匹配的费用，也保留该父节点）
      if (parent.feeDetails && parent.feeDetails.length > 0) {
        return parent.feeDetails.some((child) => {
          const childCommissionNum = child.orderFee?.commissionNum?.toLowerCase() || '';
          const childMblNum = child.orderFee?.mblNum?.toLowerCase() || '';
          const childBookingNum = child.orderFee?.bookingNum?.toLowerCase() || '';
          
          return childCommissionNum.includes(keyword) ||
                 childMblNum.includes(keyword) ||
                 childBookingNum.includes(keyword);
        });
      }
      
      return false;
    });
  }

  // 业务类型筛选
  if (filterBizType.value !== undefined && filterBizType.value !== '') {
    result = result.filter((parent) => {
      const bizTypeValue = parent.transportOrder?.bizType;
      return String(bizTypeValue) === String(filterBizType.value);
    });
  }

  // 委托编号筛选
  if (filterCommissionNum.value) {
    const commissionNum = filterCommissionNum.value.toLowerCase();
    result = result.filter((parent) => {
      const parentCommissionNum = parent.commissionNum?.toLowerCase() || '';
      return parentCommissionNum.includes(commissionNum);
    });
  }

  // 开船日期筛选
  if (filterEtdRange.value && filterEtdRange.value.length === 2) {
    const [etdStart, etdEnd] = filterEtdRange.value;
    
    result = result.filter((parent) => {
      const etd = parent.transportOrder?.etd;
      if (!etd) return false;
      
      const etdDate = dayjs(etd);
      
      if (etdStart && etdDate.isBefore(etdStart, 'day')) {
        return false;
      }
      
      if (etdEnd && etdDate.isAfter(etdEnd, 'day')) {
        return false;
      }
      
      return true;
    });
  }

  filteredFeeDetails.value = result;
  console.log('✅ 筛选结果:', filteredFeeDetails.value.length, '个订单组');
}

/** 应用筛选 */
function handleFilter() {
  applyFilter();
  message.success(`筛选完成，共 ${filteredFeeDetails.value.length} 个订单组`);
}

/** 重置筛选 */
function handleResetFilter() {
  filterKeyword.value = '';
  filterBizType.value = undefined;
  filterCommissionNum.value = '';
  filterEtdRange.value = undefined;
  selectedFeeIds.value.clear();
  selectedParentIds.value.clear();
  filteredFeeDetails.value = [...props.feeDetails];
  message.info('已重置筛选条件');
}

function handleClose() {
  emit('update:visible', false);
  selectedFeeIds.value.clear();
  selectedParentIds.value.clear();
}

/** 处理父表格选择变化（按票选择） */
function handleParentSelectionChange(selectedRowKeys: any[]) {
  // 清空之前的父节点选择
  selectedParentIds.value.clear();
  
  // 添加新选中的父节点
  selectedRowKeys.forEach((key) => {
    selectedParentIds.value.add(String(key));
  });
  
  console.log('✅ 当前选中的父节点（票）ID列表:', Array.from(selectedParentIds.value));
}

/** 获取已选中的父节点keys */
function getParentSelectedKeys(): string[] {
  return Array.from(selectedParentIds.value);
}

/** 处理子表格选择变化 */
function handleChildSelectionChange(parentRecord: FeeDetailItem, selectedRowKeys: any[]) {
  // 清空当前父节点下所有子节点的选择
  if (parentRecord.feeDetails) {
    parentRecord.feeDetails.forEach((child) => {
      selectedFeeIds.value.delete(child.id);
    });
  }
  
  // 添加新选中的子节点
  selectedRowKeys.forEach((key) => {
    selectedFeeIds.value.add(String(key));
  });
  
  console.log('✅ 当前选中的费用ID列表:', Array.from(selectedFeeIds.value));
}

/** 获取已选中的子节点keys */
function getChildSelectedKeys(record: FeeDetailItem): string[] {
  if (!record.feeDetails) return [];
  return record.feeDetails
    .filter((child) => selectedFeeIds.value.has(child.id))
    .map((child) => child.id);
}

/** 全选/取消全选所有费用 */
function handleSelectAllFees() {
  if (selectedFeeIds.value.size > 0 || selectedParentIds.value.size > 0) {
    // 如果已有选中项，则取消全选
    selectedFeeIds.value.clear();
    selectedParentIds.value.clear();
  } else {
    // 否则全选所有父节点和子节点
    filteredFeeDetails.value.forEach((parent) => {
      selectedParentIds.value.add(parent.id);
      if (parent.feeDetails) {
        parent.feeDetails.forEach((child) => {
          selectedFeeIds.value.add(child.id);
        });
      }
    });
  }
}

/** 批量删除费用（支持按票和按费用） */
function handleBatchDelete() {
  const parentCount = selectedParentIds.value.size;
  const childCount = selectedFeeIds.value.size;
  
  if (parentCount === 0 && childCount === 0) {
    message.warning('请先选择要删除的费用或订单');
    return;
  }

  // 计算总共要删除的费用数量
  let totalFeeCount = childCount;
  
  // 如果选择了父节点（按票），需要计算这些票下的所有费用
  if (parentCount > 0) {
    filteredFeeDetails.value.forEach((parent) => {
      if (selectedParentIds.value.has(parent.id) && parent.feeDetails) {
        totalFeeCount += parent.feeDetails.length;
      }
    });
  }

  Modal.confirm({
    title: '确认删除',
    content: `确定要删除选中的 ${parentCount} 个订单和 ${childCount} 条费用，共计 ${totalFeeCount} 条费用吗？删除后将重新计算总金额。`,
    okText: '确定',
    cancelText: '取消',
    okType: 'danger',
    onOk: () => {
      // 收集所有要删除的费用ID
      const allFeeIds: string[] = [];
      
      // 添加选中的子节点费用ID
      allFeeIds.push(...Array.from(selectedFeeIds.value));
      
      // 添加选中父节点下的所有费用ID
      filteredFeeDetails.value.forEach((parent) => {
        if (selectedParentIds.value.has(parent.id) && parent.feeDetails) {
          parent.feeDetails.forEach((child) => {
            allFeeIds.push(child.id);
          });
        }
      });
      
      emit('delete-fee', allFeeIds);
      message.success(`成功删除 ${allFeeIds.length} 条费用`);
      
      // 清空选择状态
      selectedFeeIds.value.clear();
      selectedParentIds.value.clear();
    },
  });
}

// 监听数据变化，自动应用筛选
watch(
  () => props.feeDetails,
  (newVal) => {
    console.log(' FeeDetailModal 接收到数据:', newVal);
    console.log('📊 父节点数量:', newVal.length);
    newVal.forEach((detail, index) => {
      console.log(`📊 父节点 ${index + 1}:`, {
        id: detail.id,
        commissionNum: detail.commissionNum,
        childrenCount: detail.feeDetails?.length || 0, // ✅ 更新为 feeDetails
      });
    });
    
    // 数据变化时重新应用筛选
    filteredFeeDetails.value = [...newVal];
  },
  { deep: true },
);

/** 获取业务类型选项 */
function getBizTypeLabel(value: string | number): string {
  const option = getBizTypeOptions().find((o: any) => o.value === value);
  return option ? option.label : '-';
}

// 费用明细弹窗表格列定义（一级 - 运输订单）
const parentColumns = [
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
    title: '委托单位',
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
];

// 费用明细弹窗表格列定义（二级 - 费用明细）
const childColumns = [
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
    title: '本次开票金额',
    dataIndex: 'appliedAmount',
    key: 'appliedAmount',
    minWidth: 150,
    align: 'right' as const,
  },
];

</script>

<template>
  <Modal
    :open="visible"
    title="费用明细"
    width="1200px"
    :footer="null"
    :body-style="{ padding: '16px' }"
    @cancel="handleClose"
  >
    <Spin :spinning="loading">
      <!-- 筛选区域 -->
      <div style="margin-bottom: 16px; padding: 16px; background: #fafafa; border-radius: 4px">
        <Space wrap>
          <div>
            <span style="margin-right: 8px">编号：</span>
            <Input
              v-model:value="filterKeyword"
              placeholder="委托编号/主提单号/订舱编号"
              allow-clear
              style="width: 200px"
            />
          </div>
          <div>
            <span style="margin-right: 8px">业务类型：</span>
            <Select
              v-model:value="filterBizType"
              placeholder="请选择"
              allow-clear
              style="width: 150px"
            >
              <Select.Option
                v-for="option in getBizTypeOptions()"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </Select.Option>
            </Select>
          </div>
          <div>
            <span style="margin-right: 8px">委托编号：</span>
            <Input
              v-model:value="filterCommissionNum"
              placeholder="请输入委托编号"
              allow-clear
              style="width: 180px"
            />
          </div>
          <div>
            <span style="margin-right: 8px">开船日期：</span>
            <DatePicker.RangePicker
              v-model:value="filterEtdRange"
              style="width: 240px"
              :placeholder="['开始日期', '结束日期']"
              value-format="YYYY-MM-DD"
            />
          </div>
          <Button type="primary" @click="handleFilter">查询</Button>
          <Button @click="handleResetFilter">重置</Button>
        </Space>
      </div>

      <!-- 操作按钮区域 -->
      <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center">
        <div>
          <span style="color: #666; font-size: 13px">
            已选中 {{ selectedParentIds.size }} 个订单，{{ selectedFeeIds.size }} 条费用
          </span>
        </div>
        <Space>
          <Button 
            type="primary" 
            danger 
            :disabled="selectedParentIds.size === 0 && selectedFeeIds.size === 0"
            @click="handleBatchDelete"
          >
            <template #icon>
              <IconifyIcon icon="ant-design:delete-outlined" />
            </template>
            批量删除
          </Button>
        </Space>
      </div>

      <div style="border: 1px solid #d9d9d9; border-radius: 4px">
        <Table
          :columns="parentColumns"
          :data-source="filteredFeeDetails"
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
            selectedRowKeys: getParentSelectedKeys(),
            onChange: handleParentSelectionChange,
          }"
        >
          <template #expandedRowRender="{ record }">
            <Table
              v-if="record.feeDetails && record.feeDetails.length > 0"
              :columns="childColumns"
              :data-source="record.feeDetails"
              :pagination="false"
              bordered
              size="small"
              row-key="id"
              :row-selection="{
                type: 'checkbox',
                selectedRowKeys: getChildSelectedKeys(record),
                onChange: (selectedRowKeys) =>
                  handleChildSelectionChange(record, selectedRowKeys),
              }"
            >
              <template #bodyCell="{ column, record: childRecord }">
                <template v-if="column.dataIndex === 'appliedAmount'">
                  <span
                    style="font-size: 14px; font-weight: bold; color: #ff4d4f"
                  >
                    {{ childRecord.appliedAmount?.toFixed(2) || '0.00' }}
                    {{ childRecord.currencyCode }}
                  </span>
                </template>
              </template>
            </Table>
          </template>
        </Table>
      </div>
    </Spin>
  </Modal>
</template>
