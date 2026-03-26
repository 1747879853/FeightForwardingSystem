<script lang="ts" setup>
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import dayjs from 'dayjs';
import type { ExpenseSubmissionAdminApi } from '#/api/audit-approval/expense-admin';

import { computed, onMounted, ref, watch, h, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  Button,
  Space,
  Textarea,
  message,
  DropdownButton,
  MenuItem,
  Menu,
  Modal,
  Card,
} from 'ant-design-vue';

import * as feeConstants from '#/views/sea-export/sea-export-admin/data';
import * as submissionConstants from '#/views/audit-approval/data';
import {
  OrderFeeAuditAsync,
  OrderFeeRejectedAsync,
} from '#/api/audit-approval/expense-admin';
import {
  ArrowLeft,
  FileText,
  MapPin,
  Package,
  Save,
  Ship,
  Users,
} from '@vben/icons';

const dataSourceRec = ref<ExpenseSubmissionAdminApi.OrderFeeAndTaskDto[]>([]);
const dataSourcePay = ref<ExpenseSubmissionAdminApi.OrderFeeAndTaskDto[]>([]);

const dataSource = computed(() => [
  ...dataSourceRec.value,
  ...dataSourcePay.value,
]);

const totalFeeRec = computed(() => {
  console.log(dataSourceRec.value);
  return dataSourceRec.value.reduce((acc, cur) => acc + cur.amount, 0);
});

const selectedRecKeys = ref<(string | number)[]>([]);
const selectedPayKeys = ref<(string | number)[]>([]);

const selectedRowKeys = computed(() => [
  ...selectedRecKeys.value,
  ...selectedPayKeys.value,
]);

const childRecRef = ref<any>(null);
const childPayRef = ref<any>(null);

import { $t } from '#/locales';

import OrderFeeTable from '#/views/sea-export/sea-export-admin/orderFee/modules/all-order-fee-table.vue';

const props = defineProps<{
  orderName: string;
  transportOrderId: number;
  entityId: number;
  feeTableType: string;
}>();

const totalFee = (
  dataSource: ExpenseSubmissionAdminApi.OrderFeeAndTaskDto[],
) => {
  console.log('totalFee', dataSource);
};

const SubmittedOther = async (e: any) => {
  console.log('SubmittedOther', e);
  showConfirmWithRemark(true, e.key);
};
const showConfirmWithRemark = (approve: boolean = true, type: string = '') => {
  let modalRemark = '';
  // 创建弹窗实例
  const modal = Modal.confirm({
    title: approve
      ? $t('auditApproval.task.okPass')
      : $t('auditApproval.task.noPass'),
    content: () =>
      h('div', {}, [
        h(Textarea, {
          modelValue: modalRemark,
          onChange: (val: any) => {
            modalRemark = val.target?.value || val;
            console.log('Textarea changed:', modalRemark);
          },
          rows: 3,
          placeholder: $t('auditApproval.task.remarkPlaceholder'),
          maxlength: 100,
          style: 'margin-top: 8px;',
        }),
      ]),
    icon: null,
    width: 520,
    centered: true,
    okText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
    async onOk() {
      switch (type) {
        case 'all': {
          allPass(approve, modalRemark);
          break;
        }
        case 'selectPass': {
          selectPass(approve, modalRemark);
          break;
        }
        case 'recPass': {
          recPass(approve, modalRemark);
          break;
        }
        case 'payPass': {
          payPass(approve, modalRemark);
          break;
        }
      }
    },
    onCancel() {
      modalRemark = '';
    },
  });
};

const showRejectWithRemark = () => {
  let modalRemark = '';
  // 创建弹窗实例
  const modal = Modal.confirm({
    title: $t('auditApproval.task.okReject'),
    content: () =>
      h('div', {}, [
        h(Textarea, {
          modelValue: modalRemark,
          onChange: (val: any) => {
            modalRemark = val.target?.value || val;
            console.log('Textarea changed:', modalRemark);
          },
          rows: 3,
          placeholder: $t('auditApproval.task.remarkPlaceholder'),
          maxlength: 100,
          style: 'margin-top: 8px;',
        }),
      ]),
    icon: null,
    width: 520,
    centered: true,
    okText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
    async onOk() {
      await nextTick(); // 等待 Vue 响应式更新完成

      Rejected(modalRemark);
    },
    onCancel() {
      modalRemark = '';
    },
  });
};
// ... existing code ...
const Rejected = (modalRemark: string) => {
  if (!selectedRowKeys.value.length) return;
  const keysSet = new Set(selectedRowKeys.value);
  const list = (dataSource.value ?? []).filter((row) =>
    keysSet.has((row as any)._rowKey),
  );
  let OrderFeeRejectedAsyncDto: ExpenseSubmissionAdminApi.OrderFeeTaskRejectedDto =
    {
      remark: modalRemark,
      orderFeeIds: list.map((item) => item.id),
    };
  OrderFeeRejectedAsync(OrderFeeRejectedAsyncDto).then(() => {
    message.success({
      content: $t('ui.actionMessage.operationSuccess'),
      key: 'action_process_msg',
    });
    getTableDate();
  });
};
const OrderFeeAudit = (
  approve: boolean,
  modalRemark: string,
  ids: number[],
) => {
  let OrderFeeAuditDto: ExpenseSubmissionAdminApi.OrderFeeTaskAuditDto = {
    success: approve,
    remark: modalRemark,
    orderFeeIds: ids,
  };
  // console.log(OrderFeeAuditDto);
  OrderFeeAuditAsync(OrderFeeAuditDto).then(() => {
    message.success({
      content: $t('ui.actionMessage.operationSuccess'),
      key: 'action_process_msg',
    });
    getTableDate();
  });
};
const selectPass = (approve: boolean, modalRemark: string) => {
  if (!selectedRowKeys.value.length) return;
  const keysSet = new Set(selectedRowKeys.value);
  const list = (dataSource.value ?? []).filter((row) =>
    keysSet.has((row as any)._rowKey),
  );
  const ids = list.map((item) => item.id);
  OrderFeeAudit(approve, modalRemark, ids);
};

const allPass = (approve: boolean, modalRemark: string) => {
  const ids = (dataSource.value ?? []).map((item) => item.id);
  OrderFeeAudit(approve, modalRemark, ids);
};

const recPass = (approve: boolean, modalRemark: string) => {
  const ids = (dataSourceRec.value ?? []).map((item) => item.id);
  OrderFeeAudit(approve, modalRemark, ids);
};

const payPass = (approve: boolean, modalRemark: string) => {
  const ids = (dataSourcePay.value ?? []).map((item) => item.id);
  OrderFeeAudit(approve, modalRemark, ids);
};

const layout = computed(() => {
  return props.feeTableType;
});

const getTableDate = () => {
  if (childRecRef.value) {
    childRecRef.value.getTableDate();
  }
  if (childPayRef.value) {
    childPayRef.value.getTableDate();
  }
};
let recAmountMap: any = ref({} as any);
let payAmountMap: any = ref({} as any);
const totalAmount = computed(() => {
  const allKeys = new Set([
    ...Object.keys(recAmountMap.value),
    ...Object.keys(payAmountMap.value),
  ]);
  const total: any = {};

  allKeys.forEach((key) => {
    total[key] = {
      totalPayAmount: payAmountMap.value[key]?.totalPayAmount || 0,
      totalRecAmount: recAmountMap.value[key]?.totalRecAmount || 0,
      exchangeRate:
        (payAmountMap.value[key] || recAmountMap.value[key])?.exchangeRate || 1,
      currencyName:
        (payAmountMap.value[key] || recAmountMap.value[key])?.currencyName ||
        '人民币',
    };
  });
  // 转换为对象数组
  const totalList = Object.keys(total).map((key) => ({
    id: key,
    ...total[key],
  }));
  let list = [];
  console.log(totalList);
  let totalPay = 0;
  let totalRec = 0;

  totalList.forEach((item) => {
    let recName = `应收${item.currencyName}:`;
    let recColor = 'green';
    let recAmount = (item.totalRecAmount || 0).toFixed(2);
    list.push({
      name: recName,
      color: recColor,
      value: recAmount,
    });
    totalRec += recAmount * item.exchangeRate;

    let payName = `应付${item.currencyName}:`;
    let payColor = 'yellow';
    let payAmount = (item.totalPayAmount || 0).toFixed(2);
    list.push({
      name: payName,
      color: payColor,
      value: payAmount,
    });
    totalPay += payAmount * item.exchangeRate;

    let profitName = `${item.currencyName}利润:`;
    let profitColor = 'blue';
    let profitAmount = (recAmount - payAmount).toFixed(2);
    list.push({
      name: profitName,
      color: profitColor,
      value: profitAmount,
    });
  });
  list.push({
    name: '合计利润:',
    color: 'blue',
    value: (totalRec - totalPay).toFixed(2),
  });
  list.push({
    name: '利润率:',
    color: 'blue',
    value: totalRec
      ? (((totalRec - totalPay) / totalRec) * 100).toFixed(1) + '%'
      : '--',
  });
  console.log(list);
  return list;
});
const handleReceivableTableUpdate = (
  data: ExpenseSubmissionAdminApi.OrderFeeAndTaskDto[],
) => {
  dataSourceRec.value = data;

  recAmountMap.value = {};
  const currencyIdList = dataSourceRec.value.map((item) => item.currencyId);
  currencyIdList.forEach((item) => {
    let list = dataSourceRec.value.filter((item2) => item2.currencyId === item);
    let totalRecAmount = list.reduce((acc, cur) => {
      return acc + cur.amount;
    }, 0);
    let exchangeRate = list[0]?.exchangeRate;
    let currencyName = list[0]?.currencyName;
    recAmountMap.value[item] = {
      totalRecAmount,
      exchangeRate,
      currencyName,
    };
    console.log('recAmountMap', recAmountMap);
  });
};

const handlePayableTableUpdate = (
  data: ExpenseSubmissionAdminApi.OrderFeeAndTaskDto[],
) => {
  dataSourcePay.value = data;

  payAmountMap.value = {};
  const currencyIdList = dataSourcePay.value.map((item) => item.currencyId);
  currencyIdList.forEach((item) => {
    let list = dataSourcePay.value.filter((item2) => item2.currencyId === item);
    let totalPayAmount = list.reduce((acc, cur) => {
      return acc + cur.amount;
    }, 0);
    let exchangeRate = list[0]?.exchangeRate;
    let currencyName = list[0]?.currencyName;
    payAmountMap.value[item] = {
      totalPayAmount,
      exchangeRate,
      currencyName,
    };
    console.log('payAmountMap', payAmountMap);
  });
};

const handleReceivableTableSelect = (arr: (string | number)[]) => {
  selectedRecKeys.value = arr;
};
const handlePayableTableSelect = (arr: (string | number)[]) => {
  selectedPayKeys.value = arr;
};
</script>

<template>
  <div class="flex items-stretch">
    <!--  -->
    <div class="flex min-w-0 flex-1 flex-col gap-2">
      <Card>
        <template #title>
          <div class="flex">
            <span class="mr-2 flex items-center gap-2">
              <Package class="size-4" />
              {{ $t('seaExport.export.orderFee.feeDetail') }}
            </span>
            <div class="my-1 flex items-center justify-between">
              <Space>
                <!-- <Button type="primary" size="small" :disabled="!selectedRowKeys.length"
                  @click="showConfirmWithRemark(true)">
                  {{ $t('auditApproval.Passed') }}
                </Button> -->
                <DropdownButton
                  @click="showConfirmWithRemark(true, 'all')"
                  size="small"
                  type="primary"
                >
                  {{ $t('auditApproval.task.allPass') }}
                  <template #overlay>
                    <Menu @click="SubmittedOther">
                      <MenuItem key="selectPass">
                        {{ $t('auditApproval.task.selectPass') }}
                      </MenuItem>
                      <MenuItem key="recPass">
                        {{ $t('auditApproval.task.recPass') }}
                      </MenuItem>
                      <MenuItem key="payPass">
                        {{ $t('auditApproval.task.payPass') }}
                      </MenuItem>
                    </Menu>
                  </template>
                </DropdownButton>
                <Button
                  class="yellow-btn"
                  size="small"
                  :disabled="!selectedRowKeys.length"
                  @click="showConfirmWithRemark(false, 'selectPass')"
                  >{{ $t('auditApproval.task.noPass') }}</Button
                >
                <Button
                  danger
                  size="small"
                  :disabled="!selectedRowKeys.length"
                  @click="showRejectWithRemark"
                >
                  {{ $t('auditApproval.task.passReject') }}
                </Button>
              </Space>
            </div>
            <div class="select-name flex flex-1 text-sm font-normal">
              {{ props.orderName }}
            </div>
          </div>
        </template>
        <div class="flex" :class="[layout === 'horizontal' ? '' : 'flex-col']">
          <div
            class="mt-1"
            :class="[layout === 'horizontal' ? 'mr-2 w-[49%]' : '']"
          >
            <OrderFeeTable
              @update-table-data="handleReceivableTableUpdate"
              @update-select-data="handleReceivableTableSelect"
              :transportOrderId="props.transportOrderId"
              :entityId="props.entityId"
              :type="0"
              ref="childRecRef"
            />
          </div>

          <div class="mt-1" :class="[layout === 'horizontal' ? 'w-[49%]' : '']">
            <OrderFeeTable
              @update-table-data="handlePayableTableUpdate"
              @update-select-data="handlePayableTableSelect"
              :transportOrderId="props.transportOrderId"
              :entityId="props.entityId"
              :type="1"
              ref="childpayRef"
            />
          </div>
        </div>
      </Card>
      <div class="total-amount flex rounded-md px-4 py-1 shadow">
        <div
          v-for="(item, index) in totalAmount"
          class="mr-4 flex"
          :key="item.name"
        >
          <span class="flex">{{ item.name }}</span>
          <span class="ml-2 flex font-medium" :class="item.color">{{
            item.value
          }}</span>
          <span class="split mx-4 flex" v-show="(index + 1) % 3 === 0">| </span>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped lang="scss">
.select-name {
  flex-direction: row-reverse;
}

.total-amount {
  background: #fff;

  .split {
    color: #33333345;
  }
}

.green {
  color: #00b96b;
}

.yellow {
  color: #ffc107;
}

.blue {
  color: #007bff;
}

:deep(.green-btn) {
  color: #fff;
  background-color: #00b96b !important;
  border-color: #00b96b !important;
}

/* 如果需要处理悬停状态 */
:deep(.green-btn:hover),
:deep(.green-btn:focus) {
  color: #fff;
  background-color: #009a55 !important;
  border-color: #009a55 !important;
}

:deep(.yellow-btn) {
  color: #fff;
  background-color: #ffc107 !important;
  border-color: #ffc107 !important;
}

/* 如果需要处理悬停状态 */
:deep(.yellow-btn:hover),
:deep(.yellow-btn:focus) {
  color: #fff;
  background-color: #ffc107 !important;
  border-color: #ffc107 !important;
}

/* 悬停状态 */
.green-dropdown-btn.ant-btn:hover,
.green-dropdown-btn.ant-btn:focus {
  color: #fff;
  background-color: #73d13d;
  border-color: #73d13d;
}

/* 激活/按下状态 */
.green-dropdown-btn.ant-btn:active {
  color: #fff;
  background-color: #389e0d;
  border-color: #389e0d;
}
</style>
