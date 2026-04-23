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

const displayList = ref<any[]>([]);

const setDisplayList = () => {
  let mbl = {
    name: $t('seaExport.export.mblNum'),
    value: to.value?.mblNum || '--',
  };
  displayList.value.push(mbl);
  let bookingNum = {
    name: $t('seaExport.export.bookingNum'),
    value: to.value?.bookingNum || '--',
  };
  displayList.value.push(bookingNum);
  let pol = {
    name: $t('seaExport.export.polName'),
    value: formValues.value?.polName || '--',
  };
  displayList.value.push(pol);
  let pod = {
    name: $t('seaExport.export.podName'),
    value: formValues.value?.podName || '--',
  };
  displayList.value.push(pod);
  let receivePort = {
    name: $t('seaExport.export.receivePortId'),
    value: formValues.value?.receivePortName || '--',
  };
  displayList.value.push(receivePort);
  let deliverPort = {
    name: $t('seaExport.export.deliverPortId'),
    value: formValues.value?.deliverPortName || '--',
  };
  displayList.value.push(deliverPort);
  let codeSource = {
    name: $t('seaExport.export.codeSourceId'),
    value: to.value?.codeSourceName || '--',
  };
  displayList.value.push(codeSource);
  let commissionNum = {
    name: $t('seaExport.export.commissionNum'),
    value: to.value?.commissionNum || '--',
  };
  displayList.value.push(commissionNum);
  let clientName = {
    name: $t('seaExport.export.clientId'),
    value: to.value?.clientName || '--',
  };
  displayList.value.push(clientName);
  let teamName = {
    name: $t('seaExport.export.teamId'),
    value: to.value?.teamName || '--',
  };
  displayList.value.push(teamName);
  let vessel = {
    name: $t('seaExport.export.vessel'),
    value: formValues.value?.vessel || '--',
  };
  displayList.value.push(vessel);
  let innerVoyno = {
    name: $t('seaExport.export.innerVoyno'),
    value: formValues.value?.innerVoyno || '--',
  };
  displayList.value.push(innerVoyno);
  let carrier = {
    name: $t('seaExport.export.carrierId'),
    value: formValues.value?.carrierName || '--',
  };
  displayList.value.push(carrier);
  let etd = {
    name: $t('seaExport.export.etd'),
    value: formatNormalDate(formValues.value?.etd) || '--',
  };
  displayList.value.push(etd);
  let eta = {
    name: $t('seaExport.export.eta'),
    value: formatNormalDate(formValues.value?.eta) || '--',
  };
  displayList.value.push(eta);
  let closingTime = {
    name: $t('seaExport.export.closingTime'),
    value: formatNormalDate(formValues.value?.closingTime) || '--',
  };
  displayList.value.push(closingTime);
  let closeVgmTime = {
    name: $t('seaExport.export.closeVgmTime'),
    value: formatNormalDate(formValues.value?.closeVgmTime) || '--',
  };
  displayList.value.push(closeVgmTime);
  let closeDocTime = {
    name: $t('seaExport.export.closeDocTime'),
    value: formatNormalDate(formValues.value?.closeDocTime) || '--',
  };
  displayList.value.push(closeDocTime);
  let closeManifestTime = {
    name: $t('seaExport.export.closeManifestTime'),
    value: formatNormalDate(formValues.value?.closeManifestTime) || '--',
  };
  displayList.value.push(closeManifestTime);
  let signingTime = {
    name: $t('seaExport.export.signingTime'),
    value: formatNormalDate(formValues.value?.signingTime) || '--',
  };
  displayList.value.push(signingTime);
  let codeServiceName = {
    name: $t('seaExport.export.codeServiceId'),
    value: formValues.value?.codeServiceName || '--',
  };
  displayList.value.push(codeServiceName);
  let codeFrtName = {
    name: $t('seaExport.export.codeFrtId'),
    value: formValues.value?.codeFrtName || '--',
  };
  displayList.value.push(codeFrtName);
  let noPkgs = {
    name: $t('seaExport.export.noPkgs'),
    value: to.value?.noPkgs || '--',
  };
  displayList.value.push(noPkgs);
  let kgs = {
    name: $t('seaExport.export.kgs'),
    value: to.value?.kgs || '--',
  };
  displayList.value.push(kgs);
  let cbm = {
    name: $t('seaExport.export.cbm'),
    value: to.value?.cbm || '--',
  };
  displayList.value.push(cbm);
  let goodsDes = {
    name: $t('seaExport.export.goodsDes'),
    value: to.value?.goodsDes || '--',
  };
  displayList.value.push(goodsDes);
};
const changeOrder = ref<any>(null);

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
    setDisplayList();
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
    recAmountMap.value[item] = {
      totalRecAmount,
      totalRMBRecAmount,
      exchangeRate,
      currencyName,
      currencyId,
    };
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
    payAmountMap.value[item] = {
      totalPayAmount,
      totalRMBPayAmount,
      exchangeRate,
      currencyName,
      currencyId,
    };
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
            <span class="flex items-center gap-2">
              <Users class="size-4" />
              {{ $t('seaExport.export.formCardInfo') }}
            </span>
          </template>
          <div class="flex flex-1 px-1 py-1" v-for="item in displayList">
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
