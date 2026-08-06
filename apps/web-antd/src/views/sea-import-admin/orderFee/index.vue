<script lang="ts" setup>
import type { SeaImportAdminApi } from '#/api/sea-import/sea-import-admin';
import {
  getOrderFeePagedList,
  getOrderFeeCount,
} from '#/api/sea-import/order-fee-admin';
import dayjs from 'dayjs';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  getCurrencyEnumOptions,
  getCurrencyEnumSymbolOptions,
} from '#/views/sea-import-admin/orderFee/data';
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
import { getSeaImportDetail } from '#/api/sea-import/sea-import-admin';
import { UserAttribute } from '#/api/system/user-admin';
import { $t } from '#/locales';

import OrderFeeTable from './modules/order-fee-table-handsontable.vue';
import DisplayFieldsConfigModal, {
  type DisplayFieldConfig,
} from './modules/display-fields-config-modal.vue';
import { useDisplayFieldConfig } from './composables/use-display-field-config';
import { buildAttachmentUrl } from '#/utils';
// ✅ 新增：导入下拉框数据源管理
import { useDropdownSources } from './modules/composables/useDropdownSources';

defineOptions({
  name: 'OrderFee',
});

const emit = defineEmits<{
  (
    e: 'fee-count-change',
    payload: { recCount: number; payCount: number },
  ): void;
}>();

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
// ✅ 新增：客户数据加载状态
const clientsLoading = ref(false);

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

// ✅ 新增：使用下拉框数据源管理（用于加载客户数据）
const orderCtnList = ref<any[]>([]); // 临时空数组，仅用于初始化
const { allClientsByIndustry, loadAllClients } =
  useDropdownSources(orderCtnList);

// 所有可用的显示字段配置
const allDisplayFields: DisplayFieldConfig[] = [
  { key: 'mblNum', label: $t('seaImport.import.mblNum'), visible: true },
  {
    key: 'bookingNum',
    label: $t('seaImport.import.bookingNum'),
    visible: true,
  },
  {
    key: 'receivePortName',
    label: $t('seaImport.import.receivePortId'),
    visible: true,
  },
  { key: 'polName', label: $t('seaImport.import.polId'), visible: true },
  {
    key: 'poT1Name',
    label: $t('seaImport.import.poT1Id'),
    visible: true,
  },
  {
    key: 'poT2Name',
    label: $t('seaImport.import.poT2Id'),
    visible: true,
  },
  { key: 'podName', label: $t('seaImport.import.podId'), visible: true },
  {
    key: 'deliverPortName',
    label: $t('seaImport.import.deliverPortId'),
    visible: true,
  },
  {
    key: 'commissionNum',
    label: $t('seaImport.import.commissionNum'),
    visible: true,
  },
  { key: 'clientName', label: $t('seaImport.import.clientId'), visible: true },
  { key: 'teamName', label: $t('seaImport.import.teamId'), visible: true },
  { key: 'vessel', label: $t('seaImport.import.vessel'), visible: true },
  {
    key: 'innerVoyno',
    label: $t('seaImport.import.innerVoyno'),
    visible: true,
  },
  {
    key: 'carrierName',
    label: $t('seaImport.import.carrierId'),
    visible: true,
  },
  { key: 'etd', label: $t('seaImport.import.etd'), visible: true },
  { key: 'atd', label: $t('seaImport.import.atd'), visible: true },
  { key: 'eta', label: $t('seaImport.import.eta'), visible: true },
  { key: 'noPkgs', label: $t('seaImport.import.noPkgs'), visible: true },
  { key: 'kgs', label: $t('seaImport.import.kgs'), visible: true },
  { key: 'cbm', label: $t('seaImport.import.cbm'), visible: true },
  { key: 'goodsDes', label: $t('seaImport.import.goodsDes'), visible: true },
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
      case 'receivePortName':
        value = formValues.value?.receivePortRemark || '--';
        break;
      case 'polName':
        value = formValues.value?.polRemark || '--';
        break;
      case 'poT1Name':
        value = formValues.value?.poT1Remark || '--';
        break;
      case 'poT2Name':
        value = formValues.value?.poT2Remark || '--';
        break;
      case 'podName':
        value = formValues.value?.podRemark || '--';
        break;
      case 'deliverPortName':
        value = formValues.value?.deliverPortRemark || '--';
        break;
      case 'commissionNum':
        value = to.value?.commissionNum || '--';
        break;
      case 'clientName':
        value = to.value?.client?.name || '--';
        break;
      case 'teamName':
        value = to.value?.team?.name || '--';
        break;
      case 'vessel':
        value = formValues.value?.vessel || '--';
        break;
      case 'innerVoyno':
        value = formValues.value?.innerVoyno || '--';
        break;
      case 'carrierName':
        value =
          formValues.value?.carrier?.cnShortName ||
          formValues.value?.carrier?.cnName ||
          '--';
        break;
      case 'etd':
        value = formatNormalDate(to.value?.etd, 'YYYY-MM-DD');
        break;
      case 'atd':
        value = formatNormalDate(to.value?.atd, 'YYYY-MM-DD');
        break;
      case 'eta':
        value = formatNormalDate(to.value?.eta, 'YYYY-MM-DD');
        break;
      case 'noPkgs':
        value = to.value?.noPkgs ?? '--';
        break;
      case 'kgs':
        value = to.value?.kgs ?? '--';
        break;
      case 'cbm':
        value = to.value?.cbm ?? '--';
        break;
      case 'goodsDes':
        value = to.value?.goodsDes || '--';
        break;
      default:
        value = '--';
    }

    result.push({
      key: field.key,
      name: field.label,
      value: value === null || value === undefined || value === '' ? '--' : value,
    });
  });

  console.log('✅ displayList 生成完成，共', result.length, '个字段');
  return result;
});

const [Form] = useVbenForm({
  schema: [
    {
      component: 'Input',
      fieldName: 'commissionNum',
      label: $t('seaImport.import.commissionNum'),
    },
    {
      component: 'Input',
      fieldName: 'mblNum',
      label: $t('seaImport.import.mblNum'),
    },
  ],
  showDefaultActions: false,
});

// 应收费用数量
const recCount = ref<number>(0);
// 应付费用数量
const payCount = ref<number>(0);

// 应收金额汇总
const recAmountMap = ref<Record<string, any>>({});
// 应付金额汇总
const payAmountMap = ref<Record<string, any>>({});

const recTableRef = ref();
const payTableRef = ref();

// 订单详情数据
const orderDetail = ref<SeaImportAdminApi.SeaImportDto | null>(null);

// 显示字段配置弹窗
const displayFieldsModalVisible = ref(false);

// 打开显示字段配置
const openDisplayFieldsConfig = () => {
  displayFieldsModalVisible.value = true;
};

// 处理显示字段配置确认
const handleDisplayFieldsConfirm = (config: DisplayFieldConfig[]) => {
  handleConfigConfirm(config);
};

// 加载海运进口详情
const loadSeaImportDetail = async () => {
  if (!editId.value) {
    console.warn('⚠️ [loadSeaImportDetail] 没有 editId');
    return;
  }

  try {
    console.log('🔄 [loadSeaImportDetail] 开始加载海运进口详情...');
    pageLoading.value = true;

    const detail = await getSeaImportDetail(editId.value);
    console.log('✅ [loadSeaImportDetail] 加载成功:', detail);

    orderDetail.value = detail;
    formValues.value = detail as any;
    to.value = detail.transportOrder as any;
    transportOrderId.value = detail.id;

    // 设置箱型列表
    if (detail.orderCtns && Array.isArray(detail.orderCtns)) {
      orderCtnList.value = detail.orderCtns.map((ctn: any) => ({
        ctnCodeId: ctn.ctnCodeId,
        ctnCodeName: ctn.ctnCodeName,
      }));
    }

    // ✅ 新增：一次性加载全部客户数据
    await loadAllClients();

    // 加载费用数量统计
    await loadFeeCount();

    console.log('✅ [loadSeaImportDetail] 数据加载完成');
  } catch (error) {
    console.error('❌ [loadSeaImportDetail] 加载失败:', error);
    message.error($t('common.loadFailed'));
  } finally {
    pageLoading.value = false;
  }
};

// 加载费用数量统计
const loadFeeCount = async () => {
  if (!transportOrderId.value) return;

  try {
    const countData = await getOrderFeeCount({
      transportOrderId: transportOrderId.value,
    });

    recCount.value = countData.receivableCount || 0;
    payCount.value = countData.payableCount || 0;

    // 通知父组件费用数量变化
    emit('fee-count-change', {
      recCount: recCount.value,
      payCount: payCount.value,
    });

    console.log('✅ [loadFeeCount] 费用数量:', {
      receivable: recCount.value,
      payable: payCount.value,
    });
  } catch (error) {
    console.error('❌ [loadFeeCount] 加载失败:', error);
  }
};

// 刷新费用表格
const refreshFeeTables = () => {
  recTableRef.value?.getTableDate();
  payTableRef.value?.getTableDate();
  loadFeeCount();
};

// 返回列表
const handleBack = () => {
  router.back();
};

onMounted(async () => {
  console.log('🚀 [OrderFee] 组件挂载');
  await loadSeaImportDetail();
});
</script>

<template>
  <Page auto-content-height>
    <template #title>
      <div class="flex items-center gap-2">
        <Button type="text" @click="handleBack">
          <ArrowLeft class="size-5" />
        </Button>
        <span>{{ $t('seaImport.import.orderFee') }}</span>
      </div>
    </template>

    <template #extra>
      <Space>
        <Button @click="openDisplayFieldsConfig">
          <Settings class="mr-1 size-4" />
          {{ $t('common.displayConfig') }}
        </Button>
      </Space>
    </template>

    <Spin :spinning="pageLoading || clientsLoading">
      <div class="mx-2 flex items-stretch gap-6">
        <!-- 左侧信息卡片 -->
        <Card class="flex w-[320px] shrink-0 flex-col">
          <template #title>
            <span class="flex items-center gap-2">
              <Users class="size-4" />
              {{ $t('common.basicInfo') }}
            </span>
          </template>

          <div class="flex-1 overflow-y-auto">
            <div class="space-y-2">
              <div
                v-for="item in displayList"
                :key="item.key"
                class="flex items-start justify-between py-1 text-sm"
              >
                <span class="shrink-0 text-gray-500">{{ item.name }}</span>
                <span class="ml-2 flex-1 truncate text-right font-medium">
                  {{ item.value }}
                </span>
              </div>
            </div>
          </div>
        </Card>

        <!-- 右侧费用表格 -->
        <Card class="flex-1">
          <template #title>
            <div class="flex items-center justify-between">
              <span class="flex items-center gap-2">
                <FileText class="size-4" />
                {{ $t('seaImport.import.orderFee') }}
              </span>
              <Space>
                <span class="text-sm text-gray-500">
                  {{ $t('seaExport.export.orderFee.receivableCharges') }}:
                  {{ recCount }}
                </span>
                <span class="text-sm text-gray-500">
                  {{ $t('seaExport.export.orderFee.payableCharges') }}:
                  {{ payCount }}
                </span>
              </Space>
            </div>
          </template>

          <div class="flex flex-col gap-4">
            <!-- 应收费用表格 -->
            <div>
              <h3 class="mb-2 text-base font-semibold">
                {{ $t('seaExport.export.orderFee.receivableCharges') }}
              </h3>
              <OrderFeeTable
                ref="recTableRef"
                :type="0"
                :edit-id="editId"
                :order-detail="orderDetail"
                :all-clients-by-industry="allClientsByIndustry"
                @sync-fee="refreshFeeTables"
                @update-amount="(data) => (recAmountMap = data)"
                @refresh-opposite-table="payTableRef?.getTableDate()"
              />
            </div>

            <!-- 应付费用表格 -->
            <div>
              <h3 class="mb-2 text-base font-semibold">
                {{ $t('seaExport.export.orderFee.payableCharges') }}
              </h3>
              <OrderFeeTable
                ref="payTableRef"
                :type="1"
                :edit-id="editId"
                :order-detail="orderDetail"
                :all-clients-by-industry="allClientsByIndustry"
                @sync-fee="refreshFeeTables"
                @update-amount="(data) => (payAmountMap = data)"
                @refresh-opposite-table="recTableRef?.getTableDate()"
              />
            </div>
          </div>
        </Card>
      </div>
    </Spin>

    <!-- 显示字段配置弹窗 -->
    <DisplayFieldsConfigModal
      v-model:visible="displayFieldsModalVisible"
      :fields="displayFieldConfig"
      @confirm="handleDisplayFieldsConfirm"
    />
  </Page>
</template>

<style scoped>
/* 自定义滚动条样式 */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f5f5f5;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #d9d9d9;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #bfbfbf;
}
</style>
