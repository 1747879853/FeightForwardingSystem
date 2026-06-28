<script lang="ts" setup>
import { watch } from 'vue';
import { Modal, Spin, Table } from 'ant-design-vue';

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
  children?: FeeChildItem[];
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
}>();

// 监听数据变化，打印调试信息
watch(
  () => props.feeDetails,
  (newVal) => {
    console.log('📊 FeeDetailModal 接收到数据:', newVal);
    console.log('📊 父节点数量:', newVal.length);
    newVal.forEach((detail, index) => {
      console.log(`📊 父节点 ${index + 1}:`, {
        id: detail.id,
        commissionNum: detail.commissionNum,
        childrenCount: detail.children?.length || 0,
      });
    });
  },
  { deep: true },
);

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
    minWidth: 180,
    align: 'right' as const,
  },
];

function handleClose() {
  emit('update:visible', false);
}
</script>

<template>
  <Modal
    :open="visible"
    title="费用明细"
    width="1000px"
    :footer="null"
    :body-style="{ padding: '16px' }"
    @cancel="handleClose"
  >
    <Spin :spinning="loading">
      <div style="border: 1px solid #d9d9d9; border-radius: 4px">
        <Table
          :columns="parentColumns"
          :data-source="feeDetails"
          :pagination="false"
          bordered
          size="small"
          :expandable="{
            defaultExpandAllRows: true,
            childrenColumnName: 'children',
          }"
          row-key="id"
          :scroll="{ y: 500 }"
        >
          <template #expandedRowRender="{ record }">
            <Table
              v-if="record.children && record.children.length > 0"
              :columns="childColumns"
              :data-source="record.children"
              :pagination="false"
              bordered
              size="small"
              row-key="id"
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
