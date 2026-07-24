<script lang="ts" setup>
import { computed, h, ref } from 'vue';
import dayjs from 'dayjs';

import {
  Button,
  Input,
  message,
  Modal,
  Space,
  Table,
} from 'ant-design-vue';

import { IconifyIcon } from '@vben/icons';

interface Props {
  visible: boolean;
  applicationGroupsData?: any[]; // 申请组数据（与抽屉相同的数据结构）
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  applicationGroupsData: () => [],
});

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'delete-selected', selectedIds: string[]): void;
}>();

// 弹窗显示状态
const modalVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
});

// 搜索条件
const searchKeyword = ref<string>(''); // 搜索关键词（申请单号/委托编号/主提单号）

// 选中的行 keys
const selectedRowKeys = ref<string[]>([]);

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

/** 过滤后的数据 */
const filteredData = computed(() => {
  if (!searchKeyword.value) {
    return props.applicationGroupsData || [];
  }

  const keyword = searchKeyword.value.toLowerCase();

  // 递归过滤树状数据
  function filterTree(items: any[]): any[] {
    return items
      .map((item) => {
        // 检查父节点是否匹配
        const parentMatch =
          (item.applicationNo &&
            item.applicationNo.toLowerCase().includes(keyword)) ||
          (item.commissionNum &&
            item.commissionNum.toLowerCase().includes(keyword)) ||
          (item.mblNum && item.mblNum.toLowerCase().includes(keyword));

        // 过滤子节点
        let filteredChildren = item.invoiceApplicationItems || [];
        if (item.invoiceApplicationItems && item.invoiceApplicationItems.length > 0) {
          filteredChildren = item.invoiceApplicationItems.filter((child: any) => {
            return (
              (child.commissionNum &&
                child.commissionNum.toLowerCase().includes(keyword)) ||
              (child.mblNum && child.mblNum.toLowerCase().includes(keyword)) ||
              (child.hblNum && child.hblNum.toLowerCase().includes(keyword)) ||
              (child.clientName &&
                child.clientName.toLowerCase().includes(keyword)) ||
              (child.feeName && child.feeName.toLowerCase().includes(keyword))
            );
          });
        }

        // 如果父节点匹配或子节点有匹配项，则保留该节点
        if (parentMatch || filteredChildren.length > 0) {
          return {
            ...item,
            invoiceApplicationItems: filteredChildren,
          };
        }

        return null;
      })
      .filter(Boolean) as any[];
  }

  return filterTree(props.applicationGroupsData || []);
});

/** 获取所有选中的申请ID（包括父节点和子节点） */
function getSelectedApplicationIds(): string[] {
  const allItems = flattenTreeData(props.applicationGroupsData || []);
  const selectedIds: string[] = [];

  selectedRowKeys.value.forEach((key) => {
    const item = allItems.find((i) => i.id === key);
    if (item) {
      // 如果是父节点（一级），添加父节点ID
      if (!item.parentId) {
        selectedIds.push(String(item.id));
      } else {
        // 如果是子节点（二级），添加其父节点ID
        selectedIds.push(String(item.parentId));
      }
    }
  });

  // 去重
  return Array.from(new Set(selectedIds));
}

/** 删除选中的发票 */
function handleDeleteSelected() {
  const selectedIds = getSelectedApplicationIds();

  if (selectedIds.length === 0) {
    message.warning('请先选择要删除的发票');
    return;
  }

  Modal.confirm({
    title: '确认删除',
    content: `确定要删除选中的 ${selectedIds.length} 条发票吗？`,
    okText: '确定',
    cancelText: '取消',
    onOk: () => {
      emit('delete-selected', selectedIds);
      // 清空选中状态
      selectedRowKeys.value = [];
      message.success(`成功删除 ${selectedIds.length} 条发票`);
    },
  });
}

/** 重置搜索 */
function handleResetSearch() {
  searchKeyword.value = '';
  selectedRowKeys.value = [];
}

// 表格列定义（一级 - 开票申请）
const parentColumns = [
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
    title: '备注',
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
    minWidth: 180,
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
];

// 表格列定义（二级 - 费用明细）
const childColumns = [
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
];

/** 格式化发票类型显示 */
function getInvoiceTypeText(invoiceType: string | number): string {
  const typeMap: Record<string, string> = {
    p: '普通发票(电票)',
    c: '普通发票(纸票)',
    s: '专用发票',
  };
  return typeMap[String(invoiceType)] || String(invoiceType);
}
</script>

<template>
  <Modal
    v-model:open="modalVisible"
    title="查看发票明细"
    width="1400"
    :footer="null"
    :body-style="{ padding: '16px', maxHeight: '70vh', overflow: 'auto' }"
  >
    <!-- 搜索和操作区 -->
    <div
      style="
        margin-bottom: 16px;
        padding: 12px;
        background: #fafafa;
        border: 1px solid #d9d9d9;
        border-radius: 4px;
      "
    >
      <div style="display: flex; justify-content: space-between; align-items: center">
        <Space>
          <div style="display: flex; gap: 8px; align-items: center">
            <span style="font-size: 14px; color: #333">搜索:</span>
            <Input
              v-model:value="searchKeyword"
              placeholder="申请单号/委托编号/主提单号"
              style="width: 300px"
              allow-clear
            />
          </div>
          <Button @click="handleResetSearch">
            <template #icon>
              <IconifyIcon icon="ant-design:reload-outlined" />
            </template>
            重置
          </Button>
        </Space>
        <Space>
          <Button
            danger
            :disabled="selectedRowKeys.length === 0"
            @click="handleDeleteSelected"
          >
            <template #icon>
              <IconifyIcon icon="ant-design:delete-outlined" />
            </template>
            删除选中 ({{ selectedRowKeys.length }})
          </Button>
        </Space>
      </div>
    </div>

    <!-- 空状态提示 -->
    <div
      v-if="!filteredData || filteredData.length === 0"
      style="text-align: center; padding: 40px; color: #999"
    >
      <IconifyIcon
        icon="ant-design:inbox-outlined"
        style="font-size: 48px; margin-bottom: 16px"
      />
      <div>暂无发票明细数据</div>
    </div>

    <!-- 树状表格 -->
    <Table
      v-else
      :columns="parentColumns"
      :data-source="filteredData"
      :pagination="false"
      bordered
      size="small"
      row-key="id"
      :row-selection="{
        selectedRowKeys: selectedRowKeys,
        onChange: (keys) => {
          selectedRowKeys = keys.map(String);
        },
        type: 'checkbox',
        preserveSelectedRowKeys: true,
      }"
      :scroll="{ x: 2000, y: 400 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'invoiceType'">
          {{ getInvoiceTypeText(record.invoiceType) }}
        </template>
        <template v-else-if="column.key === 'applyTime'">
          {{ record.applyTime || '-' }}
        </template>
        <template v-else-if="column.key === 'totalAppliedAmount'">
          {{ (record.totalAppliedAmount || 0).toFixed(2) }}
        </template>
        <template v-else-if="column.key === 'invoiceAmount'">
          {{ (record.invoiceAmount || 0).toFixed(2) }}
        </template>
        <template v-else-if="column.key === 'invoiceExchangeRate'">
          {{ record.invoiceExchangeRate || 1.0 }}
        </template>
      </template>

      <!-- 展开行模板（二级费用明细） -->
      <template #expandedRowRender="{ record }">
        <Table
          v-if="record.invoiceApplicationItems && record.invoiceApplicationItems.length > 0"
          :columns="childColumns"
          :data-source="record.invoiceApplicationItems"
          :pagination="false"
          bordered
          size="small"
          row-key="id"
          :show-header="true"
        >
          <template #bodyCell="{ column, record: childRecord }">
            <template v-if="column.key === 'payReceiveType'">
              {{ childRecord.payReceiveType || '-' }}
            </template>
            <template v-else-if="column.key === 'amount'">
              {{ (childRecord.amount || 0).toFixed(2) }}
            </template>
            <template v-else-if="column.key === 'appliedAmountOriginal'">
              {{ (childRecord.appliedAmountOriginal || 0).toFixed(2) }}
            </template>
            <template v-else-if="column.key === 'settlementAmount'">
              {{ (childRecord.settlementAmount || 0).toFixed(2) }}
            </template>
          </template>
        </Table>
        <div v-else style="padding: 20px; text-align: center; color: #999">
          暂无费用明细
        </div>
      </template>
    </Table>

    <!-- 底部统计信息 -->
    <div
      v-if="filteredData && filteredData.length > 0"
      style="
        margin-top: 16px;
        padding: 12px;
        background: rgb(24 144 255 / 5%);
        border-radius: 4px;
      "
    >
      <Space :size="24">
        <span style="font-weight: bold; color: #1890ff">统计信息</span>
        <span>发票数量: {{ filteredData.length }}</span>
        <span>
          开票总金额:
          {{
            filteredData
              .reduce((sum, item) => sum + (item.invoiceAmount || 0), 0)
              .toFixed(2)
          }}
        </span>
      </Space>
    </div>
  </Modal>
</template>
