<script lang="ts" setup>
import type { SeaImportAdminApi } from '#/api/sea-import/sea-import-admin';

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

import * as feeConstants from '#/views/sea-import-admin/orderFee/data';
import { getSeaImportDetail } from '#/api/sea-import/sea-import-admin';

import { $t } from '#/locales';

import OrderFeeTable from '#/views/sea-import-admin/orderFee/modules/order-fee-table.vue';
import ChangeOrderTable from './table.vue';

import type { OrderFeeAdminApi } from '#/api/sea-import/order-fee-admin';
import type { ChangeOrderAdminApi } from '#/api/sea-import/change-order-admin';

import { EditAsync } from '#/api/sea-import/change-order-admin';

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
    name: $t('seaImport.import.mblNum'),
    value: to.value?.mblNum || '--',
  };
  displayList.value.push(mbl);
  let bookingNum = {
    name: $t('seaImport.import.bookingNum'),
    value: to.value?.bookingNum || '--',
  };
  displayList.value.push(bookingNum);
  let pol = {
    name: $t('seaImport.import.polName'),
    value: formValues.value?.polName || '--',
  };
  displayList.value.push(pol);
  let pod = {
    name: $t('seaImport.import.podName'),
    value: formValues.value?.podName || '--',
  };
  displayList.value.push(pod);
  let receivePort = {
    name: $t('seaImport.import.receivePortId'),
    value: formValues.value?.receivePortName || '--',
  };
  displayList.value.push(receivePort);
  let deliverPort = {
    name: $t('seaImport.import.deliverPortId'),
    value: formValues.value?.deliverPortName || '--',
  };
  displayList.value.push(deliverPort);
  let codeSource = {
    name: $t('seaImport.import.codeSourceId'),
    value: to.value?.codeSourceName || '--',
  };
  displayList.value.push(codeSource);
  let commissionNum = {
    name: $t('seaImport.import.commissionNum'),
    value: to.value?.commissionNum || '--',
  };
  displayList.value.push(commissionNum);
  let clientName = {
    name: $t('seaImport.import.clientId'),
    value: to.value?.clientName || '--',
  };
  displayList.value.push(clientName);
  let teamName = {
    name: $t('seaImport.import.teamId'),
    value: to.value?.teamName || '--',
  };
  displayList.value.push(teamName);
  let vessel = {
    name: $t('seaImport.import.vessel'),
    value: formValues.value?.vessel || '--',
  };
  displayList.value.push(vessel);
  let innerVoyno = {
    name: $t('seaImport.import.innerVoyno'),
    value: formValues.value?.innerVoyno || '--',
  };
  displayList.value.push(innerVoyno);
  let carrier = {
    name: $t('seaImport.import.carrierId'),
    value: formValues.value?.carrierName || '--',
  };
  displayList.value.push(carrier);
  let etd = {
    name: $t('seaImport.import.etd'),
    value: formatNormalDate(formValues.value?.etd) || '--',
  };
  displayList.value.push(etd);
  let eta = {
    name: $t('seaImport.import.eta'),
    value: formatNormalDate(formValues.value?.eta) || '--',
  };
  displayList.value.push(eta);
  let closingTime = {
    name: $t('seaImport.import.closingTime'),
    value: formatNormalDate(formValues.value?.closingTime) || '--',
  };
  displayList.value.push(closingTime);
  let closeVgmTime = {
    name: $t('seaImport.import.closeVgmTime'),
    value: formatNormalDate(formValues.value?.closeVgmTime) || '--',
  };
  displayList.value.push(closeVgmTime);
  let closeDocTime = {
    name: $t('seaImport.import.closeDocTime'),
    value: formatNormalDate(formValues.value?.closeDocTime) || '--',
  };
  displayList.value.push(closeDocTime);
  let closeManifestTime = {
    name: $t('seaImport.import.closeManifestTime'),
    value: formatNormalDate(formValues.value?.closeManifestTime) || '--',
  };
  displayList.value.push(closeManifestTime);
  let signingTime = {
    name: $t('seaImport.import.signingTime'),
    value: formatNormalDate(formValues.value?.signingTime) || '--',
  };
  displayList.value.push(signingTime);
  let codeServiceName = {
    name: $t('seaImport.import.codeServiceId'),
    value: formValues.value?.codeServiceName || '--',
  };
  displayList.value.push(codeServiceName);
  let codeFrtName = {
    name: $t('seaImport.import.codeFrtId'),
    value: formValues.value?.codeFrtName || '--',
  };
  displayList.value.push(codeFrtName);
  let noPkgs = {
    name: $t('seaImport.import.noPkgs'),
    value: to.value?.noPkgs || '--',
  };
  displayList.value.push(noPkgs);
  let kgs = {
    name: $t('seaImport.import.kgs'),
    value: to.value?.kgs || '--',
  };
  displayList.value.push(kgs);
  let cbm = {
    name: $t('seaImport.import.cbm'),
    value: to.value?.cbm || '--',
  };
  displayList.value.push(cbm);
  let goodsDes = {
    name: $t('seaImport.import.goodsDes'),
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
  console.log('curChangeOrder', changeOrder.value);
  PayOrderFeeRef.value.getTableDate(changeOrder.value.id);
  RecOrderFeeRef.value.getTableDate(changeOrder.value.id);
};

const loadSeaImportData = async () => {
  if (!editId.value) return;

  //pageLoading.value = true;
  try {
    const detail = await getSeaImportDetail(editId.value);
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
const addRow = () => {
  if (changeOrderTableRef.value) {
    changeOrderTableRef.value.addRow();
  }
};
let RecFeeList = ref<OrderFeeAdminApi.OrderFeeEditDto[]>([]);
let PayFeeList = ref<OrderFeeAdminApi.OrderFeeEditDto[]>([]);

const syncFee = (obj: any) => {
  if (obj.type === 0) {
    RecFeeList.value = obj.orderFees;
  } else {
    PayFeeList.value = obj.orderFees;
  }
};
const removeSelectedRows = () => {
  if (changeOrderTableRef.value) {
    changeOrderTableRef.value.removeSelectedRows();
  }
};
onMounted(() => {
  loadSeaImportData();
});
</script>

<template>
  <Page auto-content-height>
    <Spin :spinning="pageLoading">
      <Card>
        <template #title>
          <div class="flex">
            <span class="mr-2 flex items-center">
              {{ $t('seaImport.import.changeOrder.title') }}
            </span>
            <Space>
              <Button type="primary" size="small" @click="addRow">
                {{ $t('common.create') }}
              </Button>
              <Button type="primary" size="small" @click="saveRow">
                {{ $t('common.save') }}
              </Button>
              <Button danger size="small" @click="removeSelectedRows">
                {{ $t('common.delete') }}
              </Button>
            </Space>
          </div>
        </template>
        <div class="flex gap-2">
          <div class="w-change-order-auto mx-2 flex flex-col gap-2">
            <div class="flex min-w-0 flex-1 flex-col gap-2">
              <Card>
                <ChangeOrderTable
                  ref="changeOrderTableRef"
                  @sync-table="setCurrentChangeOrder"
                />
              </Card>
            </div>
            <!--  -->
            <div class="w-change-order flex min-w-0 flex-1 flex-col gap-2">
              <div class="px-1">
                <div class="mt-4">
                  <OrderFeeTable
                    :type="0"
                    :mode="'changeOrder'"
                    ref="RecOrderFeeRef"
                    @sync-fee="syncFee"
                  />
                </div>
              </div>
              <div class="px-1">
                <div class="mt-4">
                  <OrderFeeTable
                    :type="1"
                    :mode="'changeOrder'"
                    ref="PayOrderFeeRef"
                    @sync-fee="syncFee"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- 垂直方向撑满 -->
          <Card class="flex w-[280px] shrink-0 flex-col">
            <template #title>
              <span class="flex items-center gap-2">
                <Users class="size-4" />
                {{ $t('seaImport.import.formCardInfo') }}
              </span>
            </template>
            <div class="flex flex-1 px-1 py-1" v-for="item in displayList">
              <span class="flex w-[85px]"> {{ `${item.name} : ` }}</span>
              <span class="flex w-[145px]">{{ item.value || '--' }}</span>
            </div>
          </Card>
        </div>
      </Card>
    </Spin>
  </Page>
</template>

<style scoped lang="scss">
.w-change-order-auto {
  width: 1100px;
}
</style>
