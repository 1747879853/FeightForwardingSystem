<script lang="ts" setup>
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';
import { getOrderFeePagedList } from '#/api/sea-export/order-fee-admin';
import dayjs from 'dayjs';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  getCurrencyEnumOptions,
  getCurrencyEnumSymbolOptions,
} from '#/views/sea-export-admin/orderFee/data';
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

import { useVbenForm } from '#/adapter/form';
import { getSeaExportDetail } from '#/api/sea-export/sea-export-admin';
import { UserAttribute } from '#/api/system/user-admin';
import { $t } from '#/locales';

import OrderFeeTable from './modules/order-fee-table.vue';
import DisplayFieldsConfigModal, {
  type DisplayFieldConfig,
} from './modules/display-fields-config-modal.vue';
import { useDisplayFieldConfig } from './composables/use-display-field-config';

defineOptions({
  name: 'OrderFee',
});

const route = useRoute();
const router = useRouter();

const editId = computed<string | undefined>(() => {
  const id = route.params.id;
  if (Array.isArray(id)) return id[0];
  return id ? String(id) : undefined;
});

const isEdit = computed(() => !!editId.value);

const pageLoading = ref(false);
const submitting = ref(false);
const transportOrderId = ref<string>();

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

// 所有可用的显示字段配置
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

// 使用共享的显示字段配置管理
const { displayFieldConfig, handleConfigConfirm } = useDisplayFieldConfig(
  allDisplayFields,
  'order_fee_display_config',
);

// 监听 formValues 变化
watch(
  formValues,
  (newVal) => {
    console.log('\n📦 formValues 变化:', newVal ? '已加载' : '清空');
  },
  { deep: true },
);

// 监听 to 变化
watch(
  to,
  (newVal) => {
    console.log('\n🎯 to 变化:', newVal ? '已加载' : '清空');
  },
  { deep: true },
);

// 根据配置生成显示列表
const displayList = computed(() => {
  console.log('=== displayList 计算 ===');
  console.log('formValues.value:', formValues.value);
  console.log('to.value:', to.value);
  console.log('displayFieldConfig.length:', displayFieldConfig.value.length);
  console.log(
    '可见字段数:',
    displayFieldConfig.value.filter((f) => f.visible).length,
  );

  if (!formValues.value || !to.value) {
    console.warn('⚠️ 数据未加载完成，返回空列表');
    return [];
  }

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

  console.log('✅ displayList 生成完成:', result.length, '个可见字段');
  console.log(
    '字段列表:',
    result.map((r) => r.name),
  );
  return result;
});

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

// 配置弹窗引用
const configModalRef = ref<any>(null);

// 打开配置弹窗
const openConfigModal = () => {
  configModalRef.value?.open();
};

const loadSeaExportData = async () => {
  if (!editId.value) return;

  //pageLoading.value = true;
  try {
    const detail = await getSeaExportDetail(editId.value);
    transportOrderId.value = detail.transportOrder?.id;
    formValues.value = detail;
    to.value = detail.transportOrder;
    // console.log('detail', formValues.value);
  } finally {
    pageLoading.value = false;
  }
};

const getOrderFeeNumber = async () => {
  let params = {
    TransportOrderId: editId.value,
    PageIndex: 1,
    PageSize: 999,
  };
  const res = await getOrderFeePagedList(params);
  let dataSourceRec = res.items.filter((item) => item.paySide === 0);
  recAmountMap.value = {};
  const currencyIdList = dataSourceRec.map((item) => item.currencyId);
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
        totalRMBRecAmount,
        totalRecAmount,
        exchangeRate,
        currencyName,
        currencyId,
      };
    }
    //console.log('recAmountMap', recAmountMap);
  });
  let dataSourcePay = res.items.filter((item) => item.paySide === 1);
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
        totalRMBPayAmount,
        totalPayAmount,
        exchangeRate,
        currencyName,
        currencyId,
      };
    }
    // console.log('payAmountMap', payAmountMap);
  });
};

onMounted(() => {
  console.log('\n========== 页面挂载开始 ==========');
  console.log(
    'displayFieldConfig.value.length:',
    displayFieldConfig.value.length,
  );
  console.log(
    '可见字段数:',
    displayFieldConfig.value.filter((f) => f.visible).length,
  );
  console.log('formValues.value:', formValues.value ? '有值' : 'undefined');
  console.log('to.value:', to.value ? '有值' : 'undefined');

  loadSeaExportData();
  getOrderFeeNumber();

  console.log('========== 页面挂载结束 ==========\n');
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
        <div class="flex min-w-0 flex-1 flex-col gap-2">
          <OrderFeeTable
            :type="0"
            :rec-amount-map="recAmountMap"
            :pay-amount-map="payAmountMap"
          />
          <OrderFeeTable
            :type="1"
            :rec-amount-map="recAmountMap"
            :pay-amount-map="payAmountMap"
          />
          <div class="total-amount flex flex-wrap rounded-md px-4 py-1 shadow">
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
        </div>
      </div>
    </Spin>

    <!-- 显示字段配置弹窗 -->
    <DisplayFieldsConfigModal
      ref="configModalRef"
      :available-fields="displayFieldConfig"
      @confirm="handleConfigConfirm"
    />
  </Page>
</template>
