<script lang="ts" setup>
import type { OrderFeeAdminApi } from '#/api/sea-import/order-fee-admin';
import type { SeaImportAdminApi } from '#/api/sea-import/sea-import-admin';

import { computed, onActivated, onMounted, provide, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';
import { Users } from '@vben/icons';

import dayjs from 'dayjs';

import { Button, Card, message, Space, Spin } from 'ant-design-vue';

import { EditAsync } from '#/api/sea-import/change-order-admin';
import { getSeaImportDetail } from '#/api/sea-import/sea-import-admin';
import { useKeepAliveRouteParamId } from '#/composables/use-keep-alive-route-param-id';
import { $t } from '#/locales';
import OrderFeeTable from '#/views/_shared/order-fee/modules/order-fee-table.vue';
import { seaImportAdapter } from '#/views/_shared/order-fee/adapter/sea-import';
import { ORDER_FEE_ADAPTER_KEY } from '#/views/_shared/order-fee/types';
import { bindOrderFeeDataI18n } from '#/views/_shared/order-fee/data';

import ChangeOrderTable from './table.vue';

defineOptions({ name: 'ChangeOrder' });

/** 编辑页保存成功后下发的最新详情：替换订单信息卡片数据 */
const props = defineProps<{
  latestDetail?: SeaImportAdminApi.SeaImportDto;
}>();

// 为共享费用表格提供海运进口适配器
provide(ORDER_FEE_ADAPTER_KEY, seaImportAdapter);

// setup 同步绑定模块级 i18n 前缀：子组件（费用表格）setup 阶段构建列定义，先于 onActivated
bindOrderFeeDataI18n('seaImport.import', 'seaImport');

// KeepAlive 多页共存时重新激活再次绑定，防页面级文案串页
onActivated(() => {
  bindOrderFeeDataI18n('seaImport.import', 'seaImport');
});

const editId = useKeepAliveRouteParamId();

const changeOrderTableRef = ref<any>(null);

const pageLoading = ref(false);
const transportOrderId = ref<string>();

/** ISO 字符串转展示格式 */
const formatNormalDate = (
  val: null | string | undefined,
  format = 'YYYY-MM-DD',
) => {
  if (!val) return '--';
  const d = dayjs(val);
  return d.isValid() ? d.format(format) : '--';
};

const detailData = ref<SeaImportAdminApi.SeaImportDto>();
const to = ref<SeaImportAdminApi.TransportOrderDto>();

/** 左侧概要：海运进口关注的字段 */
const displayList = computed(() => {
  const data = detailData.value;
  const order = to.value;
  const t = (key: string) => $t(`seaImport.import.${key}`);
  return [
    { name: t('commissionNum'), value: order?.commissionNum },
    { name: t('mblNum'), value: order?.mblNum },
    { name: t('clientId'), value: order?.client?.name },
    { name: t('teamId'), value: order?.team?.name },
    { name: t('vessel'), value: data?.vessel },
    { name: t('innerVoyno'), value: data?.innerVoyno },
    { name: t('carrierId'), value: data?.carrier?.cnShortName },
    { name: t('polId'), value: data?.pol?.portName },
    { name: t('podId'), value: data?.pod?.portName },
    { name: t('originCountryId'), value: data?.originCountry?.countryName },
    { name: t('arrivalDate'), value: formatNormalDate(order?.etd) },
    { name: t('invoiceNum'), value: data?.invoiceNum },
    { name: t('batchNum'), value: data?.batchNum },
    { name: t('totalCtn'), value: order?.totalCtn },
    { name: t('pkgs'), value: order?.pkgs },
    { name: t('kgs'), value: order?.kgs },
    { name: t('cbm'), value: order?.cbm },
    { name: t('goodsDes'), value: order?.goodsDes },
  ].map((item) => ({
    name: item.name,
    value:
      item.value === null || item.value === undefined || item.value === ''
        ? '--'
        : String(item.value),
  }));
});
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
    detailData.value = detail;
    to.value = detail.transportOrder;
  } finally {
    pageLoading.value = false;
  }
};

// 基础信息保存成功后，用最新详情整体替换（订单信息卡片联动）
watch(
  () => props.latestDetail,
  (detail) => {
    if (!detail) return;
    transportOrderId.value = detail.transportOrder?.id;
    detailData.value = detail;
    to.value = detail.transportOrder;
  },
);
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
            <div
              v-for="item in displayList"
              :key="item.name"
              class="flex flex-1 px-1 py-1"
            >
              <span class="flex w-[85px] shrink-0 text-gray-500">
                {{ `${item.name}：` }}
              </span>
              <span class="flex min-w-0 flex-1 break-all">{{
                item.value
              }}</span>
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
