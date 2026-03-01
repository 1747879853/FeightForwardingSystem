<script lang="ts" setup>
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import dayjs from 'dayjs';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { IconifyIcon } from '@vben/icons';

import { Button, Card, message, Space, Spin } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  addSeaExport,
  editSeaExport,
  getSeaExportDetail,
} from '#/api/sea-export/sea-export-admin';
import { $t } from '#/locales';

import OrderCtnTable from './modules/order-ctn-table.vue';
import {
  useBasicInfoFormSchema,
  useCargoFormSchema,
  usePartyInfoFormSchema,
  usePortFormSchema,
  useShipmentFormSchema,
} from './data';

const route = useRoute();
const router = useRouter();

const editId = computed(() => {
  const id = route.params.id;
  return id ? Number(id) : undefined;
});

const isEdit = computed(() => !!editId.value);

const pageTitle = computed(() => {
  return isEdit.value
    ? $t('ui.actionTitle.edit', [$t('seaExport.export.name')])
    : $t('ui.actionTitle.create', [$t('seaExport.export.name')]);
});

const pageLoading = ref(false);
const submitting = ref(false);
const transportOrderId = ref<number | undefined>();

/** 左侧表单：相关方信息（发货人、收货人、通知人等） */
const [PartyInfoForm, partyInfoFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  schema: usePartyInfoFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'flex flex-col',
});

/** 右侧表单：基础信息 */
const [BasicInfoForm, basicInfoFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  schema: useBasicInfoFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-6 gap-x-4',
});

/** 右侧表单：船期信息 */
const [ShipmentForm, shipmentFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  schema: useShipmentFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-6 gap-x-4',
});

/** 右侧表单：港口信息 */
const [PortForm, portFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  schema: usePortFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-6 gap-x-4',
});

/** 右侧表单：箱型与货物（箱型由 OrderCtnTable 渲染 + 货物信息） */
const [CtnCargoForm, ctnCargoFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  schema: useCargoFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-6 gap-x-4',
});

/** 箱型箱量数据（由 OrderCtnTable 管理） */
const orderCtns = ref<SeaExportAdminApi.OrderCtnAddDto[]>([]);

/** DatePicker 需要的 dayjs 对象，API 返回的是字符串 */
const toDayjs = (val: string | null | undefined) =>
  val && dayjs(val).isValid() ? dayjs(val) : undefined;

/** 提交时 dayjs/日期 转回 ISO 字符串 */
const toDateString = (val: unknown) => {
  if (val == null) return undefined;
  const d = dayjs(val as string | Date);
  return d.isValid() ? d.toISOString() : undefined;
};

const flattenDetail = (
  detail: SeaExportAdminApi.SeaExportDto,
): Record<string, any> => {
  const to = detail.transportOrder;
  return {
    blType: detail.blType,
    billType: detail.billType,
    issueType: detail.issueType,
    vessel: detail.vessel,
    innerVoyno: detail.innerVoyno,
    carrierId: detail.carrierId,
    secondNotifierId: detail.secondNotifierId,
    secondNotifierContent: detail.secondNotifierContent,
    podAgentId: detail.podAgentId,
    podAgentContent: detail.podAgentContent,
    bookingAgentId: detail.bookingAgentId,
    shipAgentId: detail.shipAgentId,
    yardId: detail.yardId,
    noBillEnum: detail.noBillEnum,
    copyNoBillEnum: detail.copyNoBillEnum,
    goodsCompleteTime: toDayjs(detail.goodsCompleteTime),
    etd: toDayjs(detail.etd),
    eta: toDayjs(detail.eta),
    closingTime: toDayjs(detail.closingTime),
    closeVgmTime: toDayjs(detail.closeVgmTime),
    closeDocTime: toDayjs(detail.closeDocTime),
    closeManifestTime: toDayjs(detail.closeManifestTime),
    signingTime: toDayjs(detail.signingTime),
    sortId: detail.sortId,
    remark: detail.remark,
    commissionNum: to?.commissionNum,
    mblNum: to?.mblNum,
    bookingNum: to?.bookingNum,
    accountDate: toDayjs(to?.accountDate),
    settlementDate: toDayjs(to?.settlementDate),
    codeSourceId: to?.codeSourceId,
    isBusinessLocking: to?.isBusinessLocking,
    isFeeLocking: to?.isFeeLocking,
    codeFrtId: to?.codeFrtId,
    codeServiceId: to?.codeServiceId,
    tradeTermsType: to?.tradeTermsType,
    polId: to?.polId,
    podId: to?.podId,
    poT1Id: to?.poT1Id,
    poT2Id: to?.poT2Id,
    receivePortId: to?.receivePortId,
    deliverPortId: to?.deliverPortId,
    signingPortId: to?.signingPortId,
    clientId: to?.clientId,
    teamId: to?.teamId,
    custBrokerId: to?.custBrokerId,
    warehouseId: to?.warehouseId,
    insuranceId: to?.insuranceId,
    consigneeId: to?.consigneeId,
    consigneeContent: to?.consigneeContent,
    shipperId: to?.shipperId,
    shipperContent: to?.shipperContent,
    notifierId: to?.notifierId,
    notifierContent: to?.notifierContent,
    marks: to?.marks,
    noPkgs: to?.noPkgs,
    goodsDes: to?.goodsDes,
    kgs: to?.kgs,
    cbm: to?.cbm,
    internalRemark: to?.internalRemark,
    orderCodeGoodss: to?.orderCodeGoodss ?? [],
  };
};

/** 为 orderCtns 每项添加 _rowKey，供 Table 使用 */
const normalizeOrderCtnsWithRowKey = (
  items: SeaExportAdminApi.OrderCtnAddDto[] | undefined,
) => {
  if (!items?.length) return [];
  return items.map((item, i) => ({
    ...item,
    _rowKey: `ctn_${i}_${Date.now()}`,
  })) as any[];
};

const ORDER_CTN_API_KEYS: (keyof SeaExportAdminApi.OrderCtnAddDto)[] = [
  'ctnCodeId',
  'ctnNo',
  'sealNo',
  'pkgs',
  'codePackageId',
  'grossWeight',
  'tareWeight',
  'overLength',
  'overWidth',
  'overHeight',
  'volume',
  'codeGoodsId',
  'bookingNo',
  'remark',
];

/** 提交时移除 _rowKey 等非 API 字段，仅保留 OrderCtnAddDto 字段 */
const sanitizeOrderCtns = (
  items: any[] | undefined,
): SeaExportAdminApi.OrderCtnAddDto[] => {
  if (!items?.length) return [];
  return items.map((item) => {
    const dto: Record<string, any> = {};
    for (const key of ORDER_CTN_API_KEYS) {
      const val = item[key];
      if (val !== undefined && val !== null) {
        if (typeof val === 'string' && val === '') continue;
        dto[key] = val;
      }
    }
    return dto as SeaExportAdminApi.OrderCtnAddDto;
  });
};

const loadEditData = async () => {
  if (!editId.value) return;

  pageLoading.value = true;
  try {
    const detail = await getSeaExportDetail(editId.value);
    transportOrderId.value = detail.transportOrder?.id;
    const formValues = flattenDetail(detail);

    await Promise.all([
      partyInfoFormApi.setValues(formValues),
      basicInfoFormApi.setValues(formValues),
      shipmentFormApi.setValues(formValues),
      portFormApi.setValues(formValues),
      ctnCargoFormApi.setValues(formValues),
    ]);

    partyInfoFormApi.updateSchema([
      {
        fieldName: 'secondNotifierId',
        componentProps: {
          selectedItems: detail.secondNotifier ? [detail.secondNotifier] : [],
        },
      },
      {
        fieldName: 'podAgentId',
        componentProps: {
          selectedItems: detail.podAgent ? [detail.podAgent] : [],
        },
      },
    ]);

    shipmentFormApi.updateSchema([
      {
        fieldName: 'carrierId',
        componentProps: {
          selectedItems: detail.carrier ? [detail.carrier] : [],
        },
      },
      {
        fieldName: 'bookingAgentId',
        componentProps: {
          selectedItems: detail.bookingAgent ? [detail.bookingAgent] : [],
        },
      },
      {
        fieldName: 'shipAgentId',
        componentProps: {
          selectedItems: detail.shipAgent ? [detail.shipAgent] : [],
        },
      },
      {
        fieldName: 'yardId',
        componentProps: {
          selectedItems: detail.yard ? [detail.yard] : [],
        },
      },
    ]);

    orderCtns.value = normalizeOrderCtnsWithRowKey(
      detail.transportOrder?.orderCtns as any,
    );
  } finally {
    pageLoading.value = false;
  }
};

const buildDto = (values: Record<string, any>) => {
  const seaExportFields: Record<string, any> = {
    blType: values.blType ?? undefined,
    billType: values.billType ?? undefined,
    issueType: values.issueType ?? undefined,
    vessel: values.vessel,
    innerVoyno: values.innerVoyno,
    carrierId: values.carrierId ?? undefined,
    secondNotifierId: values.secondNotifierId ?? undefined,
    secondNotifierContent: values.secondNotifierContent,
    podAgentId: values.podAgentId ?? undefined,
    podAgentContent: values.podAgentContent,
    bookingAgentId: values.bookingAgentId ?? undefined,
    shipAgentId: values.shipAgentId ?? undefined,
    yardId: values.yardId ?? undefined,
    noBillEnum: values.noBillEnum ?? undefined,
    copyNoBillEnum: values.copyNoBillEnum ?? undefined,
    goodsCompleteTime: toDateString(values.goodsCompleteTime),
    etd: toDateString(values.etd),
    eta: toDateString(values.eta),
    closingTime: toDateString(values.closingTime),
    closeVgmTime: toDateString(values.closeVgmTime),
    closeDocTime: toDateString(values.closeDocTime),
    closeManifestTime: toDateString(values.closeManifestTime),
    signingTime: toDateString(values.signingTime),
    sortId: values.sortId,
    remark: values.remark,
  };

  const transportOrderFields: Record<string, any> = {
    commissionNum: values.commissionNum,
    mblNum: values.mblNum,
    bookingNum: values.bookingNum,
    accountDate: toDateString(values.accountDate),
    settlementDate: toDateString(values.settlementDate),
    codeSourceId: values.codeSourceId ?? undefined,
    isBusinessLocking: values.isBusinessLocking ?? false,
    isFeeLocking: values.isFeeLocking ?? false,
    codeFrtId: values.codeFrtId ?? undefined,
    codeServiceId: values.codeServiceId ?? undefined,
    tradeTermsType: values.tradeTermsType ?? undefined,
    polId: values.polId ?? undefined,
    podId: values.podId ?? undefined,
    poT1Id: values.poT1Id ?? undefined,
    poT2Id: values.poT2Id ?? undefined,
    receivePortId: values.receivePortId ?? undefined,
    deliverPortId: values.deliverPortId ?? undefined,
    signingPortId: values.signingPortId ?? undefined,
    clientId: values.clientId,
    teamId: values.teamId ?? undefined,
    custBrokerId: values.custBrokerId ?? undefined,
    warehouseId: values.warehouseId ?? undefined,
    insuranceId: values.insuranceId ?? undefined,
    consigneeId: values.consigneeId ?? undefined,
    consigneeContent: values.consigneeContent,
    shipperId: values.shipperId ?? undefined,
    shipperContent: values.shipperContent,
    notifierId: values.notifierId ?? undefined,
    notifierContent: values.notifierContent,
    marks: values.marks,
    noPkgs: values.noPkgs,
    goodsDes: values.goodsDes,
    kgs: values.kgs,
    cbm: values.cbm,
    internalRemark: values.internalRemark,
    orderCodeGoodss: values.orderCodeGoodss ?? [],
    orderCtns: sanitizeOrderCtns(orderCtns.value),
  };

  if (isEdit.value && transportOrderId.value) {
    (transportOrderFields as any).id = transportOrderId.value;
  }

  return {
    ...seaExportFields,
    ...(isEdit.value && editId.value ? { id: editId.value } : {}),
    transportOrder: transportOrderFields,
  };
};

const handleSubmit = async () => {
  const [partyResult, basicResult, shipmentResult, portResult, ctnCargoResult] =
    await Promise.all([
      partyInfoFormApi.validate(),
      basicInfoFormApi.validate(),
      shipmentFormApi.validate(),
      portFormApi.validate(),
      ctnCargoFormApi.validate(),
    ]);
  const allValid =
    partyResult.valid &&
    basicResult.valid &&
    shipmentResult.valid &&
    portResult.valid &&
    ctnCargoResult.valid;
  if (!allValid) {
    message.warning($t('ui.formRules.pleaseCompleteRequiredFields'));
    return;
  }

  submitting.value = true;
  const [partyValues, basicValues, shipmentValues, portValues, ctnCargoValues] =
    await Promise.all([
      partyInfoFormApi.getValues(),
      basicInfoFormApi.getValues(),
      shipmentFormApi.getValues(),
      portFormApi.getValues(),
      ctnCargoFormApi.getValues(),
    ]);
  const values = {
    ...partyValues,
    ...basicValues,
    ...shipmentValues,
    ...portValues,
    ...ctnCargoValues,
  };
  const dto = buildDto(values);

  try {
    if (isEdit.value) {
      await editSeaExport(dto as SeaExportAdminApi.SeaExportEditDto);
    } else {
      await addSeaExport(dto as SeaExportAdminApi.SeaExportAddDto);
    }

    message.success($t('ui.actionMessage.operationSuccess'));
    router.push('/sea-exports');
  } finally {
    submitting.value = false;
  }
};

const handleCancel = () => {
  router.push('/sea-exports');
};

const handleBack = () => {
  router.push('/sea-exports');
};

onMounted(() => {
  loadEditData();
});
</script>

<template>
  <Page auto-content-height>
    <template #title>
      <div class="mb-2 flex items-center gap-2">
        <Button
          type="text"
          class="flex items-center justify-center p-0"
          @click="handleBack"
        >
          <IconifyIcon icon="lucide:arrow-left" class="size-5" />
        </Button>
        <span class="text-lg font-semibold">{{ pageTitle }}</span>
      </div>
    </template>
    <template #extra>
      <Space>
        <Button @click="handleCancel">
          {{ $t('common.cancel') }}
        </Button>
        <Button type="primary" :loading="submitting" @click="handleSubmit">
          <IconifyIcon icon="lucide:save" class="mr-1 size-4" />
          {{ $t('common.save') }}
        </Button>
      </Space>
    </template>
    <Spin :spinning="pageLoading">
      <div class="mx-4 flex items-stretch gap-6">
        <!-- 左侧：相关方信息，垂直方向撑满 -->
        <Card class="flex w-[280px] shrink-0 flex-col">
          <template #title>
            <span class="flex items-center gap-2">
              <IconifyIcon icon="lucide:users" class="size-4" />
              {{ $t('seaExport.export.formCardPartyInfo') }}
            </span>
          </template>
          <div class="flex-1 px-1">
            <PartyInfoForm />
          </div>
        </Card>

        <!-- 右侧：基础信息、船期信息、港口与货物 -->
        <div class="flex min-w-0 flex-1 flex-col gap-2">
          <Card>
            <template #title>
              <span class="flex items-center gap-2">
                <IconifyIcon icon="lucide:file-text" class="size-4" />
                {{ $t('seaExport.export.formCardBasicInfo') }}
              </span>
            </template>
            <div class="px-1">
              <BasicInfoForm />
            </div>
          </Card>

          <Card>
            <template #title>
              <span class="flex items-center gap-2">
                <IconifyIcon icon="lucide:ship" class="size-4" />
                {{ $t('seaExport.export.formCardShipment') }}
              </span>
            </template>
            <div class="px-1">
              <ShipmentForm />
            </div>
          </Card>

          <Card>
            <template #title>
              <span class="flex items-center gap-2">
                <IconifyIcon icon="lucide:map-pin" class="size-4" />
                {{ $t('seaExport.export.formCardPort') }}
              </span>
            </template>
            <div class="px-1">
              <PortForm />
            </div>
          </Card>

          <Card>
            <template #title>
              <span class="flex items-center gap-2">
                <IconifyIcon icon="lucide:package" class="size-4" />
                {{ $t('seaExport.export.formCardCtnCargo') }}
              </span>
            </template>
            <div class="px-1">
              <CtnCargoForm />
              <div class="mt-4">
                <OrderCtnTable v-model="orderCtns" />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Spin>
  </Page>
</template>
