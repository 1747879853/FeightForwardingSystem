<script lang="ts" setup>
import { ref, watch, computed } from 'vue';
import {
  Modal,
  Spin,
  Button,
  message,
  Input,
  Select,
  DatePicker,
  Checkbox,
} from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';
import dayjs from 'dayjs';
import { getBizTypeOptions } from '#/views/sea-export-admin/orderFee/data';
import { InvoiceApplicationAdminApi } from '#/api/settlement-management/invoice-application-admin';
import { NestedDataTable } from '#/components/nested-data-table';

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
  // ✅ 新增：invoiceApplicationItem 的 ID，用于删除操作
  invoiceApplicationItemId?: string;
}

const props = defineProps<{
  visible: boolean;
  loading: boolean;
  feeDetails: FeeDetailItem[];
  invoiceApplicationId?: string; // ✅ 新增：开票申请ID，用于删除操作
  invoiceExchangeRate?: number; // ✅ 新增：发票汇率，用于计算人民币金额
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  // ✅ 修改：传递 invoiceApplicationItemId 数组，而不是 fee.id
  (e: 'delete-fee', itemIds: string[]): void;
  // ✅ 新增：刷新事件，通知父组件重新加载数据
  (e: 'refresh'): void;
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

// 展开的行keys
const expandedRowKeys = ref<string[]>([]);

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
          const childCommissionNum =
            child.orderFee?.commissionNum?.toLowerCase() || '';
          const childMblNum = child.orderFee?.mblNum?.toLowerCase() || '';
          const childBookingNum =
            child.orderFee?.bookingNum?.toLowerCase() || '';

          return (
            childCommissionNum.includes(keyword) ||
            childMblNum.includes(keyword) ||
            childBookingNum.includes(keyword)
          );
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
}

/** 获取已选中的父节点keys */
function getParentSelectedKeys(): string[] {
  return Array.from(selectedParentIds.value);
}

/** 处理子表格选择变化 */
function handleChildSelectionChange(
  parentRecord: FeeDetailItem,
  selectedRowKeys: any[],
) {
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

  if (parentRecord.feeDetails) {
  }
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
async function handleBatchDelete() {
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
    onOk: async () => {
      // ✅ 收集所有要删除的 invoiceApplicationItemId
      const allItemIds: string[] = [];

      // 添加选中的子节点对应的 itemId
      selectedFeeIds.value.forEach((feeId) => {
        // 在所有父节点的 feeDetails 中查找对应的子节点
        filteredFeeDetails.value.forEach((parent) => {
          if (parent.feeDetails) {
            const child = parent.feeDetails.find((c) => c.id === feeId);
            if (child) {
            }
            if (child) {
              // ✅ 关键修复：必须使用 invoiceApplicationItemId 作为删除ID
              if (!child.invoiceApplicationItemId) {
                console.error('❌ 子节点缺少 invoiceApplicationItemId:', child);
                return;
              }
              allItemIds.push(child.invoiceApplicationItemId);
            } else {
              console.warn('⚠️ 未找到子节点');
            }
          }
        });
      });

      // 添加选中父节点下的所有费用对应的 itemId
      filteredFeeDetails.value.forEach((parent) => {
        if (selectedParentIds.value.has(parent.id) && parent.feeDetails) {
          parent.feeDetails.forEach((child) => {
            // ✅ 关键修复：必须使用 invoiceApplicationItemId 作为删除ID
            if (!child.invoiceApplicationItemId) {
              console.error('❌ 子节点缺少 invoiceApplicationItemId:', child);
              return;
            }
            allItemIds.push(child.invoiceApplicationItemId);
          });
        }
      });

      // ✅ 去重
      const uniqueItemIds = [...new Set(allItemIds)];

      if (uniqueItemIds.length === 0) {
        message.error('未找到可删除的费用');
        return;
      }

      // ✅ 关键修复：检查是否有开票申请ID
      if (!props.invoiceApplicationId) {
        message.error('开票申请ID不存在，无法删除费用');
        return;
      }

      try {
        // ✅ 调用删除API
        const removeData: InvoiceApplicationAdminApi.InvoiceApplicationRemoveItemsDto =
          {
            id: props.invoiceApplicationId,
            invoiceApplicationItemIds: uniqueItemIds,
            invoiceApplicationGoodsDtls: undefined,
          };

        await InvoiceApplicationAdminApi.removeItems(removeData);

        message.success(`成功删除 ${uniqueItemIds.length} 条费用`);

        // 清空选择状态
        selectedFeeIds.value.clear();
        selectedParentIds.value.clear();

        // ✅ 关键修复：等待删除完成后，再触发刷新事件
        emit('refresh');
      } catch (error) {
        console.error('❌ 删除费用明细失败:', error);
        message.error('删除费用明细失败');
      }
    },
  });
}

// 监听数据变化，自动应用筛选
watch(
  () => props.feeDetails,
  (newVal) => {
    // 数据变化时重新应用筛选
    filteredFeeDetails.value = [...newVal];

    // 默认展开所有行
    expandedRowKeys.value = newVal.map((item) => item.id);
  },
  { deep: true },
);

/** 获取业务类型选项 */
function getBizTypeLabel(value: string | number): string {
  const option = getBizTypeOptions().find((o: any) => o.value === value);
  return option ? option.label : '3';
}

/** 将原币金额转换为人民币 */
function convertToRMB(amount: number, currencyCode: string): number {
  // 如果已经是人民币，直接返回
  if (currencyCode === 'CNY' || currencyCode === 'RMB') {
    return amount;
  }

  // 使用发票汇率转换
  const rate = props.invoiceExchangeRate || 1.0;
  return Math.round(amount * rate * 100) / 100; // 保留两位小数
}

// 外层表格列定义（运输订单）
const outerColumns = [
  {
    title: '序号',
    dataIndex: 'seq',
    key: 'seq',
    width: 60,
    align: 'center' as const,
  },
  {
    title: '业务类型',
    dataIndex: 'bizType',
    key: 'bizType',
    width: 100,
  },
  {
    title: '委托编号',
    dataIndex: 'commissionNum',
    key: 'commissionNum',
    width: 140,
    ellipsis: true,
  },
  {
    title: '主提单号',
    dataIndex: 'mblNum',
    key: 'mblNum',
    width: 130,
    ellipsis: true,
  },
  {
    title: '订舱编号',
    dataIndex: 'bookingNum',
    key: 'bookingNum',
    width: 130,
    ellipsis: true,
  },
  {
    title: '委托单位',
    dataIndex: 'clientName',
    key: 'clientName',
    width: 140,
    ellipsis: true,
  },

  {
    title: '船公司',
    dataIndex: 'carrier',
    key: 'carrier',
    width: 170,
    ellipsis: true,
  },
  {
    title: '所属公司',
    dataIndex: 'company',
    key: 'company',
    width: 140,
    ellipsis: true,
  },
];

// 内层表格列定义（费用明细）
const innerColumns = [
  {
    title: '',
    dataIndex: 'seq',
    key: 'seq',
    width: 60,
    align: 'center' as const,
  },
  {
    title: '结算单位',
    dataIndex: 'settlementUnit',
    key: 'settlementUnit',
    width: 180,
    ellipsis: true,
  },
  {
    title: '收付类型',
    dataIndex: 'payReceiveType',
    key: 'payReceiveType',
    width: 80,
    align: 'center' as const,
  },
  {
    title: '费用名称',
    dataIndex: 'feeName',
    key: 'feeName',
    width: 200,
    ellipsis: true,
  },
  {
    title: '金额',
    dataIndex: 'amount',
    key: 'amount',
    width: 120,
    align: 'right' as const,
  },
  {
    title: '币别',
    dataIndex: 'currencyCode',
    key: 'currencyCode',
    width: 80,
    align: 'center' as const,
  },
  {
    title: '未开票金额',
    dataIndex: 'remainingInvoiceAmount',
    key: 'remainingInvoiceAmount',
    width: 120,
    align: 'right' as const,
  },
  {
    title: '本次开票金额',
    dataIndex: 'appliedAmount',
    key: 'appliedAmount',
    width: 150,
    align: 'right' as const,
  },
];

/** 判断父节点是否全选 */
function isParentChecked(parent: FeeDetailItem): boolean {
  if (!parent.feeDetails || parent.feeDetails.length === 0) return false;
  return parent.feeDetails.every((child) => selectedFeeIds.value.has(child.id));
}

/** 判断父节点是否半选 */
function isParentIndeterminate(parent: FeeDetailItem): boolean {
  if (!parent.feeDetails || parent.feeDetails.length === 0) return false;
  const count = parent.feeDetails.filter((child) =>
    selectedFeeIds.value.has(child.id),
  ).length;
  return count > 0 && count < parent.feeDetails.length;
}

/** 切换父节点选择 */
function toggleParentCheck(parent: FeeDetailItem, checked: boolean) {
  if (checked) {
    selectedParentIds.value.add(parent.id);
    if (parent.feeDetails) {
      parent.feeDetails.forEach((child) => {
        selectedFeeIds.value.add(child.id);
      });
    }
  } else {
    selectedParentIds.value.delete(parent.id);
    if (parent.feeDetails) {
      parent.feeDetails.forEach((child) => {
        selectedFeeIds.value.delete(child.id);
      });
    }
  }
}

/** 切换子节点选择 */
function toggleChildCheck(child: FeeChildItem, checked: boolean) {
  if (checked) {
    selectedFeeIds.value.add(child.id);
  } else {
    selectedFeeIds.value.delete(child.id);
    // 如果取消选中了子节点，父节点也应该取消选中
    if (child.parentId) {
      selectedParentIds.value.delete(child.parentId);
    }
  }
}

/** 全选/取消全选 */
function toggleSelectAll(checked: boolean) {
  if (checked) {
    filteredFeeDetails.value.forEach((parent) => {
      selectedParentIds.value.add(parent.id);
      if (parent.feeDetails) {
        parent.feeDetails.forEach((child) => {
          selectedFeeIds.value.add(child.id);
        });
      }
    });
  } else {
    selectedParentIds.value.clear();
    selectedFeeIds.value.clear();
  }
}

/** 是否全选 */
const isAllSelected = computed(() => {
  if (filteredFeeDetails.value.length === 0) return false;
  return filteredFeeDetails.value.every((parent) => isParentChecked(parent));
});

/** 是否半选 */
const isIndeterminate = computed(() => {
  const totalChildren = filteredFeeDetails.value.reduce(
    (sum, p) => sum + (p.feeDetails?.length || 0),
    0,
  );
  const selectedCount = selectedFeeIds.value.size;
  return selectedCount > 0 && selectedCount < totalChildren;
});
</script>

<template>
  <Modal
    :open="visible"
    title="费用明细"
    width="1200px"
    :footer="null"
    class="fee-detail-manage-modal"
    :body-style="{ padding: '0' }"
    @cancel="handleClose"
  >
    <Spin :spinning="loading">
      <div class="fdm">
        <section class="fdm-section fdm-filters">
          <div class="fdm-filters__head">
            <span class="fdm-indicator" />
            <span class="fdm-filters__title">筛选条件</span>
          </div>
          <div class="fdm-filters__body">
            <div class="fdm-field">
              <span class="fdm-field__label">编号</span>
              <Input
                v-model:value="filterKeyword"
                placeholder="委托编号 / 主提单号 / 订舱编号"
                allow-clear
                class="fdm-field__control fdm-field__control--lg"
              />
            </div>
            <div class="fdm-field">
              <span class="fdm-field__label">业务类型</span>
              <Select
                v-model:value="filterBizType"
                placeholder="请选择"
                allow-clear
                class="fdm-field__control"
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
            <div class="fdm-field">
              <span class="fdm-field__label">委托编号</span>
              <Input
                v-model:value="filterCommissionNum"
                placeholder="请输入委托编号"
                allow-clear
                class="fdm-field__control"
              />
            </div>
            <div class="fdm-field">
              <span class="fdm-field__label">开船日期</span>
              <DatePicker.RangePicker
                v-model:value="filterEtdRange"
                class="fdm-field__control fdm-field__control--range"
                :placeholder="['开始日期', '结束日期']"
                value-format="YYYY-MM-DD"
              />
            </div>
            <div class="fdm-filters__actions">
              <Button type="primary" size="small" @click="handleFilter">
                查询
              </Button>
              <Button size="small" @click="handleResetFilter">重置</Button>
            </div>
          </div>
        </section>

        <section class="fdm-section fdm-table-panel">
          <div class="fdm-table-panel__head">
            <div class="fdm-table-panel__title-wrap">
              <span class="fdm-indicator" />
              <span class="fdm-table-panel__title">明细列表</span>
              <span class="fdm-count">{{ filteredFeeDetails.length }}</span>
            </div>
            <div class="fdm-table-panel__actions">
              <span
                v-if="selectedParentIds.size > 0 || selectedFeeIds.size > 0"
                class="fdm-selected-hint"
              >
                已选 {{ selectedParentIds.size }} 个订单，{{
                  selectedFeeIds.size
                }}
                条费用
              </span>
              <Button
                type="primary"
                danger
                size="small"
                :disabled="
                  selectedParentIds.size === 0 && selectedFeeIds.size === 0
                "
                @click="handleBatchDelete"
              >
                <template #icon>
                  <IconifyIcon icon="ant-design:delete-outlined" />
                </template>
                批量删除
              </Button>
            </div>
          </div>

          <div class="fdm-table-wrap">
            <NestedDataTable
              :columns="outerColumns"
              :data-source="filteredFeeDetails"
              :inner-columns="innerColumns"
              inner-data-key="feeDetails"
              inner-row-key="id"
              row-key="id"
              fill-height
              v-model:expanded-row-keys="expandedRowKeys"
            >
              <template #outerHeaderCell="{ column }">
                <template v-if="column.key === 'seq'">
                  <Checkbox
                    :checked="isAllSelected"
                    :indeterminate="isIndeterminate"
                    @change="(e: any) => toggleSelectAll(e.target.checked)"
                  />
                </template>
                <template v-else>
                  {{ column.title }}
                </template>
              </template>

              <template #outerBodyCell="{ column, record, index }">
                <template v-if="column.key === 'seq'">
                  <Checkbox
                    :checked="isParentChecked(record)"
                    :indeterminate="isParentIndeterminate(record)"
                    @change="
                      (e: any) => toggleParentCheck(record, e.target.checked)
                    "
                  />
                </template>
                <template v-else-if="column.dataIndex === 'bizType'">
                  {{ getBizTypeLabel(record.bizType) }}
                </template>
                <template v-else>
                  {{ record[column.dataIndex] }}
                </template>
              </template>

              <template #innerHeaderCell="{ column }">
                <template v-if="column.key === 'seq'">
                  {{ column.title }}
                </template>
                <template v-else>
                  {{ column.title }}
                </template>
              </template>

              <template #innerBodyCell="{ column, record, index }">
                <template v-if="column.key === 'seq'">
                  <Checkbox
                    :checked="selectedFeeIds.has(record.id)"
                    @change="
                      (e: any) => toggleChildCheck(record, e.target.checked)
                    "
                  />
                </template>
                <template v-else-if="column.dataIndex === 'appliedAmount'">
                  <span class="fdm-amount">
                    {{
                      convertToRMB(
                        record.appliedAmount || 0,
                        record.currencyCode || '',
                      ).toFixed(2)
                    }}
                  </span>
                </template>
                <template v-else>
                  {{ record[column.dataIndex] }}
                </template>
              </template>
            </NestedDataTable>
          </div>
        </section>
      </div>
    </Spin>
  </Modal>
</template>

<style scoped>
.fdm {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 16px 20px;
  background: #f8fafc;
}

.fdm-section {
  overflow: hidden;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgb(15 23 42 / 4%);
}

.fdm-indicator {
  display: inline-block;
  flex-shrink: 0;
  width: 3px;
  height: 14px;
  background: hsl(var(--primary, 212 100% 45%));
  border-radius: 2px;
}

.fdm-filters__head {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 12px 14px 0;
}

.fdm-filters__title {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.fdm-filters__body {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 16px;
  align-items: flex-end;
  padding: 12px 14px 14px;
}

.fdm-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.fdm-field__label {
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
}

.fdm-field__control {
  width: 160px;
}

.fdm-field__control--lg {
  width: 220px;
}

.fdm-field__control--range {
  width: 240px;
}

.fdm-filters__actions {
  display: flex;
  gap: 8px;
  align-items: center;
  padding-bottom: 1px;
}

.fdm-table-panel__head {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid #f1f5f9;
}

.fdm-table-panel__title-wrap,
.fdm-table-panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.fdm-table-panel__title {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.fdm-count {
  min-width: 22px;
  padding: 0 7px;
  font-size: 12px;
  font-weight: 600;
  line-height: 20px;
  color: hsl(var(--primary, 212 100% 40%));
  text-align: center;
  background: hsl(var(--primary, 212 100% 45%) / 10%);
  border-radius: 999px;
}

.fdm-selected-hint {
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--primary, 212 100% 38%));
}

.fdm-table-wrap {
  padding: 0 4px 4px;
}

.fdm-amount {
  font-size: 14px;
  font-weight: 700;
  color: #ef4444;
}
</style>

<style>
.fee-detail-manage-modal .ant-modal-content {
  overflow: hidden;
  border-radius: 12px;
}

.fee-detail-manage-modal .ant-modal-header {
  padding: 14px 20px;
  margin: 0;
  border-bottom: 1px solid #f1f5f9;
}

.fee-detail-manage-modal .ant-modal-title {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
}
</style>
