<script lang="ts" setup>
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import dayjs from 'dayjs';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  ArrowLeft,
  FileText,
  MapPin,
  Package,
  Save,
  Ship,
  Users,
  Settings,
} from '@vben/icons';

import { Button, Card, message, Space, Spin } from 'ant-design-vue';

import * as feeConstants from '#/views/sea-export-admin/orderFee/data';
import { getSeaExportDetail } from '#/api/sea-export/sea-export-admin';
import { getOrderFeePagedList } from '#/api/sea-export/order-fee-admin';
import {
  getCurrencyEnumOptions,
  getCurrencyEnumSymbolOptions,
} from '#/views/sea-export-admin/orderFee/data';
import { $t } from '#/locales';

import OrderFeeTable from '#/views/sea-export-admin/orderFee/modules/order-fee-table.vue';
import ChangeOrderTable from './table.vue';
import DisplayFieldsConfigModal, {
  type DisplayFieldConfig,
} from '#/views/sea-export-admin/orderFee/modules/display-fields-config-modal.vue';
import { useDisplayFieldConfig } from '#/views/sea-export-admin/orderFee/composables/use-display-field-config';

import type { OrderFeeAdminApi } from '#/api/sea-export/order-fee-admin';

import { EditAsync, GetDetail } from '#/api/sea-export/change-order-admin';

defineOptions({
  name: 'ChangeOrder',
});

const route = useRoute();
const router = useRouter();

const editId = computed(() => {
  const id = route.params.id;
  return id ? String(id) : undefined;
});

// 创建 ref 引用
const changeOrderTableRef = ref(null);

const isEdit = computed(() => !!editId.value);

const pageLoading = ref(false);
const submitting = ref(false);
const transportOrderId = ref<string>();

/** 左侧表单：相关方信息（发货人、收货人、通知人等） */
// const [PartyInfoForm, partyInfoFormApi] = useVbenForm({
//   layout: 'vertical',
//   compact: true,
//   schema: usePartyInfoFormSchema(),
//   showDefaultActions: false,
//   wrapperClass: 'flex flex-col',
// });

/** DatePicker 需要的 dayjs 对象，API 返回的是字符串 */
const toDayjs = (val: string | null | undefined) =>
  val && dayjs(val).isValid() ? dayjs(val) : undefined;

/** 提交时 dayjs/日期 转回 ISO 字符串 */
const toDateString = (val: unknown) => {
  if (val == null) return undefined;
  const d = dayjs(val as string | Date);
  return d.isValid() ? d.toISOString() : undefined;
};
/** ISO 字符串转正常日期格式 */
const formatNormalDate = (
  val: string | null | undefined,
  format = 'YYYY-MM-DD HH:mm:ss',
) => {
  if (!val) return '--';
  const d = dayjs(val);
  return d.isValid() ? d.format(format) : '--';
};

const formValues = ref<Record<string, any>>();
const to = ref<Record<string, any>>();

// 所有可用的显示字段配置（与 orderFee 页面保持一致）
const allDisplayFields: DisplayFieldConfig[] = [
  { key: 'mblNum', label: $t('seaExport.export.mblNum'), visible: true },
  {
    key: 'bookingNum',
    label: $t('seaExport.export.bookingNum'),
    visible: true,
  },
  { key: 'polName', label: $t('seaExport.export.polName'), visible: true },
  { key: 'podName', label: $t('seaExport.export.podName'), visible: true },
  {
    key: 'receivePortName',
    label: $t('seaExport.export.receivePortId'),
    visible: true,
  },
  {
    key: 'deliverPortName',
    label: $t('seaExport.export.deliverPortId'),
    visible: true,
  },
  {
    key: 'codeSourceName',
    label: $t('seaExport.export.codeSourceId'),
    visible: true,
  },
  {
    key: 'commissionNum',
    label: $t('seaExport.export.commissionNum'),
    visible: true,
  },
  { key: 'clientName', label: $t('seaExport.export.clientId'), visible: true },
  { key: 'teamName', label: $t('seaExport.export.teamId'), visible: true },
  { key: 'vessel', label: $t('seaExport.export.vessel'), visible: true },
  {
    key: 'innerVoyno',
    label: $t('seaExport.export.innerVoyno'),
    visible: true,
  },
  {
    key: 'carrierName',
    label: $t('seaExport.export.carrierId'),
    visible: true,
  },
  { key: 'etd', label: $t('seaExport.export.etd'), visible: true },
  { key: 'eta', label: $t('seaExport.export.eta'), visible: true },
  {
    key: 'closingTime',
    label: $t('seaExport.export.closingTime'),
    visible: true,
  },
  {
    key: 'closeVgmTime',
    label: $t('seaExport.export.closeVgmTime'),
    visible: true,
  },
  {
    key: 'closeDocTime',
    label: $t('seaExport.export.closeDocTime'),
    visible: true,
  },
  {
    key: 'closeManifestTime',
    label: $t('seaExport.export.closeManifestTime'),
    visible: true,
  },
  {
    key: 'signingTime',
    label: $t('seaExport.export.signingTime'),
    visible: true,
  },
  {
    key: 'codeServiceName',
    label: $t('seaExport.export.codeServiceId'),
    visible: true,
  },
  {
    key: 'codeFrtName',
    label: $t('seaExport.export.codeFrtId'),
    visible: true,
  },
  { key: 'noPkgs', label: $t('seaExport.export.noPkgs'), visible: true },
  { key: 'kgs', label: $t('seaExport.export.kgs'), visible: true },
  { key: 'cbm', label: $t('seaExport.export.cbm'), visible: true },
  { key: 'goodsDes', label: $t('seaExport.export.goodsDes'), visible: true },
];

// 使用共享的显示字段配置管理（共用同一份缓存）
const { displayFieldConfig, handleConfigConfirm } = useDisplayFieldConfig(
  allDisplayFields,
  'order_fee_display_config', // 使用相同的 storageKey，实现配置共享
);

const displayList = computed(() => {
  if (!formValues.value || !to.value) return [];

  const result: Array<{ key: string; name: string; value: any }> = [];

  displayFieldConfig.value.forEach((field) => {
    if (!field.visible) return;

    let value: any = '--';

    // 根据 key 获取对应的值
    switch (field.key) {
      case 'mblNum':
        value = to.value?.mblNum || '--';
        break;
      case 'bookingNum':
        value = to.value?.bookingNum || '--';
        break;
      case 'polName':
        value = formValues.value?.polName || '--';
        break;
      case 'podName':
        value = formValues.value?.podName || '--';
        break;
      case 'receivePortName':
        value = formValues.value?.receivePortName || '--';
        break;
      case 'deliverPortName':
        value = formValues.value?.deliverPortName || '--';
        break;
      case 'codeSourceName':
        value = to.value?.codeSourceName || '--';
        break;
      case 'commissionNum':
        value = to.value?.commissionNum || '--';
        break;
      case 'clientName':
        value = to.value?.clientName || '--';
        break;
      case 'teamName':
        value = to.value?.teamName || '--';
        break;
      case 'vessel':
        value = formValues.value?.vessel || '--';
        break;
      case 'innerVoyno':
        value = formValues.value?.innerVoyno || '--';
        break;
      case 'carrierName':
        value = formValues.value?.carrierName || '--';
        break;
      case 'etd':
        value = formatNormalDate(formValues.value?.etd);
        break;
      case 'eta':
        value = formatNormalDate(formValues.value?.eta);
        break;
      case 'closingTime':
        value = formatNormalDate(formValues.value?.closingTime);
        break;
      case 'closeVgmTime':
        value = formatNormalDate(formValues.value?.closeVgmTime);
        break;
      case 'closeDocTime':
        value = formatNormalDate(formValues.value?.closeDocTime);
        break;
      case 'closeManifestTime':
        value = formatNormalDate(formValues.value?.closeManifestTime);
        break;
      case 'signingTime':
        value = formatNormalDate(formValues.value?.signingTime);
        break;
      case 'codeServiceName':
        value = formValues.value?.codeServiceName || '--';
        break;
      case 'codeFrtName':
        value = formValues.value?.codeFrtName || '--';
        break;
      case 'noPkgs':
        value = to.value?.noPkgs || '--';
        break;
      case 'kgs':
        value = to.value?.kgs || '--';
        break;
      case 'cbm':
        value = to.value?.cbm || '--';
        break;
      case 'goodsDes':
        value = to.value?.goodsDes || '--';
        break;
    }

    result.push({
      key: field.key,
      name: field.label,
      value,
    });
  });

  return result;
});

const changeOrder = ref<any>(null);

// 配置弹窗引用
const configModalRef = ref<any>(null);

// 打开配置弹窗
const openConfigModal = () => {
  configModalRef.value?.open();
};

const PayOrderFeeRef = ref<any>(null);
const RecOrderFeeRef = ref<any>(null);
const setCurrentChangeOrder = (curChangeOrder: any) => {
  if (curChangeOrder) {
    changeOrder.value = curChangeOrder;
  }
  getOrderFeeNumber();
  console.log('curChangeOrder', changeOrder.value);
  PayOrderFeeRef.value.getTableDate(changeOrder.value.id);
  RecOrderFeeRef.value.getTableDate(changeOrder.value.id);
};

const loadSeaExportData = async () => {
  if (!editId.value) return;

  //pageLoading.value = true;
  try {
    const detail = await getSeaExportDetail(editId.value);
    transportOrderId.value = detail.transportOrder?.id;
    formValues.value = detail;
    to.value = detail.transportOrder;
    console.log('detail', formValues.value);
  } finally {
    pageLoading.value = false;
  }
};
const saveRow = async () => {
  let data = {
    id: changeOrder.value.id,
    transportOrderId: transportOrderId.value || '',
    accountDate: formatNormalDate(changeOrder.value.accountDate) || '',
    reason: changeOrder.value.reason,
    remark: changeOrder.value.remark,
    orderFees: [
      ...RecFeeList.value.map((item) => {
        return {
          ...item,
          changeOrderId: changeOrder.value.id,
          paySide: 0,
        };
      }),
      ...PayFeeList.value.map((item) => {
        return {
          ...item,
          changeOrderId: changeOrder.value.id,
          paySide: 1,
        };
      }),
    ],
  };
  console.log('data', data);
  await EditAsync(data);
  message.success({
    content: $t('ui.actionMessage.operationSuccess'),
    key: 'action_process_msg',
  });
  setCurrentChangeOrder(null);
};

let RecFeeList = ref<OrderFeeAdminApi.OrderFeeEditDto[]>([]);
let PayFeeList = ref<OrderFeeAdminApi.OrderFeeEditDto[]>([]);

let recAmountMap: any = ref({} as any);
let payAmountMap: any = ref({} as any);

const transCurrency = (currencyId: number) => {
  const option = getCurrencyEnumOptions().find((o) => o.value === currencyId);
  return option ? option.label : currencyId;
};
const transCurrencySymbol = (currencyId: number) => {
  const option = getCurrencyEnumSymbolOptions().find(
    (o) => o.value === currencyId,
  );
  return option ? option.label : currencyId;
};
const getOrderFeeNumber = async () => {
  const res = await GetDetail(changeOrder.value.id);
  let dataSourceRec = res.orderFees.filter((item) => item.paySide === 0);
  recAmountMap.value = {};
  const currencyIdList = dataSourceRec.map((item) => item.currencyId) || [];
  currencyIdList.forEach((item) => {
    let list = dataSourceRec.filter((item2) => item2.currencyId === item);
    let totalRecAmount = list.reduce((acc, cur) => {
      return acc + (cur.amount || 0);
    }, 0);
    let totalRMBRecAmount = list.reduce((acc, cur) => {
      return acc + (cur.amount || 0) * (cur.exchangeRate || 1);
    }, 0);
    let exchangeRate = list[0]?.exchangeRate;
    let currencyName = list[0]?.currencyName;
    let currencyId = list[0]?.currencyId;
    if (currencyId !== undefined) {
      recAmountMap.value[currencyId] = {
        totalRecAmount,
        totalRMBRecAmount,
        exchangeRate,
        currencyName,
        currencyId,
      };
    }
    console.log('recAmountMap', recAmountMap);
  });
  let dataSourcePay = res.orderFees.filter((item) => item.paySide === 1);
  payAmountMap.value = {};
  const currencyIdListPay = dataSourcePay.map((item) => item.currencyId);
  currencyIdListPay.forEach((item) => {
    let list = dataSourcePay.filter((item2) => item2.currencyId === item);
    let totalPayAmount = list.reduce((acc, cur) => {
      return acc + (cur.amount || 0);
    }, 0);
    let totalRMBPayAmount = list.reduce((acc, cur) => {
      return acc + (cur.amount || 0) * (cur.exchangeRate || 1);
    }, 0);
    let exchangeRate = list[0]?.exchangeRate;
    let currencyName = list[0]?.currencyName;
    let currencyId = list[0]?.currencyId;
    if (currencyId !== undefined) {
      payAmountMap.value[currencyId] = {
        totalPayAmount,
        totalRMBPayAmount,
        exchangeRate,
        currencyName,
        currencyId,
      };
    }
    console.log('payAmountMap', payAmountMap);
  });
};
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
  console.log('totalList', totalList);
  let totalPay = 0;
  let totalRec = 0;

  totalList.forEach((item) => {
    let recName = `应收${transCurrency(item.currencyId)}:`;
    let recColor = 'green';
    let recAmount = (item.totalRecAmount || 0).toFixed(2);
    list.push({
      name: recName,
      color: recColor,
      value: transCurrencySymbol(item.currencyId) + recAmount,
    });
    console.log('应收recAmount', item.totalRMBRecAmount);
    totalRec += item.totalRMBRecAmount;

    let payName = `应付${transCurrency(item.currencyId)}:`;
    let payColor = 'yellow';
    let payAmount = (item.totalPayAmount || 0).toFixed(2);
    list.push({
      name: payName,
      color: payColor,
      value: transCurrencySymbol(item.currencyId) + payAmount,
    });
    totalPay += item.totalRMBPayAmount;

    let profitName = `${transCurrency(item.currencyId)}利润:`;
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
const syncFee = (obj: any) => {
  if (obj.type === 0) {
    RecFeeList.value = obj.orderFees;
  } else {
    PayFeeList.value = obj.orderFees;
  }
};
onMounted(() => {
  loadSeaExportData();
});
</script>

<template>
  <Page auto-content-height>
    <Spin :spinning="pageLoading">
      <div class="mx-2 flex items-stretch gap-6">
        <!-- 垂直方向撑满 -->
        <Card class="flex w-[280px] shrink-0 flex-col">
          <template #title>
            <span class="flex items-center justify-between gap-2">
              <span class="flex items-center gap-2">
                <Users class="size-4" />
                {{ $t('seaExport.export.formCardInfo') }}
              </span>
              <Button
                type="text"
                size="small"
                @click="openConfigModal"
                class="text-gray-500 hover:text-blue-600"
              >
                <Settings class="size-4" />
              </Button>
            </span>
          </template>
          <div
            class="flex flex-1 px-1 py-1"
            v-for="item in displayList"
            :key="item.key"
          >
            <span class="flex w-[85px] font-semibold">
              {{ `${item.name} : ` }}</span
            >
            <span class="flex w-[145px]">{{ item.value || '--' }}</span>
          </div>
        </Card>
        <div class="w-change-order-auto flex min-w-0 flex-1 flex-col gap-2">
          <ChangeOrderTable
            ref="changeOrderTableRef"
            @sync-table="setCurrentChangeOrder"
            @save-change-order="saveRow"
          />

          <Card>
            <template #title>
              <div class="flex">
                <span class="mr-2 flex items-center gap-2">
                  <Package class="size-4" />
                  {{ $t('seaExport.export.orderFee.feeDetail') }}
                </span>
                <div class="select-name flex flex-1 text-sm font-normal">
                  {{
                    changeOrder ? '当前选中：' + changeOrder.accountDate : ''
                  }}
                </div>
              </div>
            </template>
            <OrderFeeTable
              :type="0"
              :mode="'changeOrder'"
              ref="RecOrderFeeRef"
              @sync-fee="syncFee"
            />
            <OrderFeeTable
              :type="1"
              :mode="'changeOrder'"
              ref="PayOrderFeeRef"
              @sync-fee="syncFee"
            />
            <div
              class="total-amount flex flex-wrap rounded-md px-4 py-1 shadow"
            >
              <div
                v-for="(item, index) in totalAmount"
                class="mr-4 flex"
                :key="item.name"
              >
                <span class="flex">{{ item.name }}</span>
                <span class="ml-2 flex font-medium" :class="item.color">{{
                  item.value
                }}</span>
                <span class="split mx-4 flex" v-show="(index + 1) % 3 === 0"
                  >|
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Spin>

    <!-- 显示字段配置弹窗（与 orderFee 页面共用） -->
    <DisplayFieldsConfigModal
      ref="configModalRef"
      :available-fields="displayFieldConfig"
      @confirm="handleConfigConfirm"
    />
  </Page>
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
</style>
