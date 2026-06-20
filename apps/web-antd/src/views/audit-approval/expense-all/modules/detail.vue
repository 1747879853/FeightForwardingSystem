<script lang="ts" setup>
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import dayjs from 'dayjs';
import type { ExpenseSubmissionAdminApi } from '#/api/audit-approval/expense-admin';
import type { CurrencyAdminApi } from '#/api/system/base-data/currency-admin';

import { computed, onMounted, ref, watch, h, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  getCurrencyEnumOptions,
  getCurrencyEnumSymbolOptions,
  getFeeStatusValueByLabel,
} from '#/views/sea-export-admin/orderFee/data';
import { getCurrencyPagedList } from '#/api/system/base-data/currency-admin';
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

import * as feeConstants from '#/views/sea-export-admin/data';
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
  return dataSourceRec.value.reduce((acc, cur) => acc + (cur.amount || 0), 0);
});

const selectedRecKeys = ref<(string | number)[]>([]);
const selectedPayKeys = ref<(string | number)[]>([]);

const selectedRowKeys = computed(() => [
  ...selectedRecKeys.value,
  ...selectedPayKeys.value,
]);

const childRecRef = ref<any>(null);
const childPayRef = ref<any>(null);

// 币别符号映射表（从API获取）
const currencySymbolMap = ref<Record<number, string>>({});

// 拖动相关状态
const topHeight = ref<number>(50); // 上半部分高度百分比（垂直布局）
const leftWidth = ref<number>(50); // 左半部分宽度百分比（水平布局）
const isDragging = ref<boolean>(false);
const dragDirection = ref<'vertical' | 'horizontal'>('vertical'); // 拖动方向

// 开始垂直拖动（上下）
const startVerticalDrag = (e: MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  isDragging.value = true;
  dragDirection.value = 'vertical';

  const container = document.querySelector('.split-container') as HTMLElement;
  if (!container) return;

  const startY = e.clientY;
  const startHeight = topHeight.value;

  const onMouseMove = (moveEvent: MouseEvent) => {
    if (!isDragging.value) return;

    moveEvent.preventDefault();

    // 每次移动时重新获取容器高度，确保准确性
    const containerRect = container.getBoundingClientRect();
    const deltaY = moveEvent.clientY - startY;
    const containerHeight = containerRect.height;

    if (containerHeight === 0) return;

    const deltaPercent = (deltaY / containerHeight) * 100;

    // 限制拖动范围，最小10%，最大90%
    let newHeight = startHeight + deltaPercent;
    newHeight = Math.max(10, Math.min(90, newHeight));

    topHeight.value = newHeight;
  };

  const onMouseUp = () => {
    isDragging.value = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  document.body.style.cursor = 'row-resize';
  document.body.style.userSelect = 'none';
};

// 开始水平拖动（左右）
const startHorizontalDrag = (e: MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  isDragging.value = true;
  dragDirection.value = 'horizontal';

  const container = document.querySelector('.split-container') as HTMLElement;
  if (!container) return;

  const startX = e.clientX;
  const startWidth = leftWidth.value;

  const onMouseMove = (moveEvent: MouseEvent) => {
    if (!isDragging.value) return;

    moveEvent.preventDefault();

    // 每次移动时重新获取容器宽度，确保准确性
    const containerRect = container.getBoundingClientRect();
    const deltaX = moveEvent.clientX - startX;
    const containerWidth = containerRect.width;

    if (containerWidth === 0) return;

    const deltaPercent = (deltaX / containerWidth) * 100;

    // 限制拖动范围，最小10%，最大90%
    let newWidth = startWidth + deltaPercent;
    newWidth = Math.max(10, Math.min(90, newWidth));

    leftWidth.value = newWidth;
  };

  const onMouseUp = () => {
    isDragging.value = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
};

import { $t } from '#/locales';

import OrderFeeTable from '#/views/sea-export-admin/orderFee/modules/all-order-fee-table.vue';

const props = defineProps<{
  orderName: string;
  transportOrderId: string;
  entityId: string;
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
  if (approve) {
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

    return;
  }
  // 创建弹窗实例
  Modal.confirm({
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
  ids: string[],
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
  console.log('dataSource.value', dataSource.value);
  const ids = (dataSource.value ?? [])
    .filter(
      (item) =>
        item.feeStatus === getFeeStatusValueByLabel('Submit') ||
        item.feeStatus === getFeeStatusValueByLabel('RequestModification') ||
        item.feeStatus === getFeeStatusValueByLabel('RequestDeletion'),
    )
    .map((item) => item.id);
  if (!ids.length) {
    message.warning({
      content: $t('auditApproval.task.noPassSelect'),
      key: 'action_process_msg',
    });
    return;
  }
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
const transCurrencySymbol = (currencyId: number) => {
  // 优先从API获取的映射表中查找
  if (currencySymbolMap.value[currencyId]) {
    return currencySymbolMap.value[currencyId];
  }

  // 如果映射表中没有，则使用默认的硬编码选项
  const option = getCurrencyEnumSymbolOptions().find(
    (o) => o.value === currencyId,
  );
  return option ? option.label : currencyId;
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
      totalRMBPayAmount: payAmountMap.value[key]?.totalRMBPayAmount || 0,
      totalRMBRecAmount: recAmountMap.value[key]?.totalRMBRecAmount || 0,
      exchangeRate:
        (payAmountMap.value[key] || recAmountMap.value[key])?.exchangeRate || 1,
      currencyId:
        (payAmountMap.value[key] || recAmountMap.value[key])?.currencyId || 1,
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
      value: transCurrencySymbol(item.currencyId) + recAmount,
    });
    totalRec += item.totalRMBRecAmount;

    let payName = `应付${item.currencyName}:`;
    let payColor = 'yellow';
    let payAmount = (item.totalPayAmount || 0).toFixed(2);
    list.push({
      name: payName,
      color: payColor,
      value: transCurrencySymbol(item.currencyId) + payAmount,
    });
    totalPay += item.totalRMBPayAmount;

    let profitName = `${item.currencyName}利润:`;
    let profitColor = 'blue';
    let profitAmount = (recAmount - payAmount).toFixed(2);
    list.push({
      name: profitName,
      color: profitColor,
      value: transCurrencySymbol(item.currencyId) + profitAmount,
    });
  });
  list.push({
    name: '合计利润:',
    color: 'blue',
    value: transCurrencySymbol(1) + (totalRec - totalPay).toFixed(2),
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
    if (item === undefined || item === null) return;

    let list = dataSourceRec.value.filter((item2) => item2.currencyId === item);
    let totalRecAmount = list.reduce((acc, cur) => {
      return acc + (cur.amount || 0);
    }, 0);
    let totalRMBRecAmount = list.reduce((acc, cur) => {
      return acc + (cur.amount || 0) * (cur.exchangeRate || 1);
    }, 0);
    let exchangeRate = list[0]?.exchangeRate;
    let currencyName = list[0]?.currencyName;
    let currencyId = list[0]?.currencyId;
    recAmountMap.value[item] = {
      totalRecAmount,
      totalRMBRecAmount,
      exchangeRate,
      currencyName,
      currencyId,
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
    if (item === undefined || item === null) return;

    let list = dataSourcePay.value.filter((item2) => item2.currencyId === item);
    let totalPayAmount = list.reduce((acc, cur) => {
      return acc + (cur.amount || 0);
    }, 0);
    let totalRMBPayAmount = list.reduce((acc, cur) => {
      return acc + (cur.amount || 0) * (cur.exchangeRate || 1);
    }, 0);
    let exchangeRate = list[0]?.exchangeRate;
    let currencyName = list[0]?.currencyName;
    payAmountMap.value[item] = {
      totalPayAmount,
      totalRMBPayAmount,
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

/**
 * 加载所有币别并构建符号映射表
 */
const loadCurrencySymbols = async () => {
  try {
    // 获取所有币别（使用较大的pageSize确保获取全部）
    const result = await getCurrencyPagedList({
      PageIndex: 1,
      PageSize: 1000,
    });

    if (result && result.items) {
      // 构建币别ID到符号的映射
      const symbolMap: Record<number, string> = {};
      result.items.forEach((currency: CurrencyAdminApi.CurrencyDto) => {
        if (currency.id && currency.symbol) {
          symbolMap[currency.id] = currency.symbol;
        }
      });
      currencySymbolMap.value = symbolMap;
      console.log('✅ 已加载币别符号映射:', symbolMap);
    }
  } catch (error) {
    console.error('❌ 加载币别符号失败:', error);
    // 失败时使用默认的硬编码映射
    const defaultOptions = getCurrencyEnumSymbolOptions();
    const symbolMap: Record<number, string> = {};
    defaultOptions.forEach((opt) => {
      symbolMap[opt.value] = opt.label;
    });
    currencySymbolMap.value = symbolMap;
  }
};

// 必须显式暴露
defineExpose({
  getTableDate,
});

// 组件挂载时加载币别符号
onMounted(() => {
  loadCurrencySymbols();
});
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
        <div
          class="split-container"
          :class="[layout === 'horizontal' ? 'flex-row' : 'flex-col']"
        >
          <!-- 左侧/上侧区域 -->
          <div
            class="left-top-section mt-1"
            :style="{
              height: layout === 'horizontal' ? 'auto' : `${topHeight}%`,
              width: layout === 'horizontal' ? `${leftWidth}%` : 'auto',
              flex: layout === 'horizontal' ? 'none' : 'none',
            }"
            :class="[layout === 'horizontal' ? '' : '']"
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

          <!-- 垂直拖动分隔条（上下布局） -->
          <div
            v-if="layout !== 'horizontal'"
            class="drag-handle drag-handle-vertical"
            :class="{ dragging: isDragging && dragDirection === 'vertical' }"
            @mousedown="startVerticalDrag"
          >
            <div class="drag-line"></div>
          </div>

          <!-- 水平拖动分隔条（左右布局） -->
          <div
            v-if="layout === 'horizontal'"
            class="drag-handle drag-handle-horizontal"
            :class="{ dragging: isDragging && dragDirection === 'horizontal' }"
            @mousedown="startHorizontalDrag"
          >
            <div class="drag-line"></div>
          </div>

          <!-- 右侧/下侧区域 -->
          <div
            class="right-bottom-section mt-1"
            :style="{
              height: layout === 'horizontal' ? 'auto' : `${100 - topHeight}%`,
              width: layout === 'horizontal' ? `${100 - leftWidth}%` : 'auto',
              flex: layout === 'horizontal' ? 'none' : 'none',
            }"
            :class="[layout === 'horizontal' ? '' : '']"
          >
            <OrderFeeTable
              @update-table-data="handlePayableTableUpdate"
              @update-select-data="handlePayableTableSelect"
              :transportOrderId="props.transportOrderId"
              :entityId="props.entityId"
              :type="1"
              ref="childPayRef"
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
  display: flex;
  flex-wrap: wrap;
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

// 分隔容器
.split-container {
  position: relative;
  display: flex;

  &.flex-col {
    flex-direction: column;
    height: calc(100vh - 300px);
    min-height: 400px;
    max-height: calc(100vh - 200px);
  }

  &.flex-row {
    flex-direction: row;
    width: 100%;
  }

  .left-top-section,
  .right-bottom-section {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: all 0.1s ease-out;

    // 确保子组件能够填满父容器
    > * {
      flex: 1;
      min-width: 0;
      min-height: 0;
    }
  }
}

// 拖动分隔条通用样式
.drag-handle {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;

  &.dragging {
    .drag-line {
      background-color: #1890ff;
      box-shadow: 0 0 8px rgb(24 144 255 / 40%);
    }
  }

  &:hover .drag-line {
    background-color: #1890ff;
    box-shadow: 0 0 6px rgb(24 144 255 / 30%);
  }

  .drag-line {
    background-color: #d9d9d9;
    border-radius: 2px;
    transition: all 0.2s ease;
  }
}

// 垂直拖动分隔条（上下布局）
.drag-handle-vertical {
  height: 12px;
  margin: 4px 0;
  cursor: row-resize;

  &.dragging {
    cursor: row-resize;
  }

  .drag-line {
    width: 60px;
    height: 4px;
  }
}

// 水平拖动分隔条（左右布局）
.drag-handle-horizontal {
  width: 12px;
  margin: 0 4px;
  cursor: col-resize;

  &.dragging {
    cursor: col-resize;
  }

  .drag-line {
    width: 4px;
    height: 60px;
  }
}
</style>
